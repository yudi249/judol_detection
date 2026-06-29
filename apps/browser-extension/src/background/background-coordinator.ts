import { predictBatch as predictBatchWithMock } from '../predictor';
import {
  MESSAGE_TYPES,
  type DetectionLog,
  type ExtensionStateResponseMessage,
  type JudolLensRequestMessage,
  type JudolLensResponseMessage,
  type PredictionBatchRequest,
  type PredictionBatchResponse,
  type PredictionResult,
  type ScanBatchResponseMessage,
} from '../shared';
import {
  appendDetectionLogs,
  clearDetectionLogs,
  getDetectionLogs,
  getExtensionSettings,
  getSessionStats,
  updateExtensionSettings,
  updateSessionStats,
  type StorageArea,
} from '../storage';

type PredictBatch = (request: PredictionBatchRequest) => PredictionBatchResponse;

export type BackgroundCoordinatorDependencies = {
  storageArea?: StorageArea;
  predictBatch?: PredictBatch;
};

export async function handleJudolLensMessage(
  message: JudolLensRequestMessage,
  dependencies: BackgroundCoordinatorDependencies = {},
): Promise<JudolLensResponseMessage | undefined> {
  switch (message.type) {
    case MESSAGE_TYPES.scanBatch:
      return handleScanBatch(message.payload, dependencies);
    case MESSAGE_TYPES.getExtensionState:
      return getExtensionState(dependencies.storageArea);
    case MESSAGE_TYPES.updateSettings:
      await updateExtensionSettings(message.payload, dependencies.storageArea);
      return getExtensionState(dependencies.storageArea);
    case MESSAGE_TYPES.clearDetectionLogs:
      await clearDetectionLogs(dependencies.storageArea);
      return getExtensionState(dependencies.storageArea);
    case MESSAGE_TYPES.saveManualAnalysis:
      return undefined;
    default:
      return undefined;
  }
}

async function handleScanBatch(
  request: PredictionBatchRequest,
  dependencies: BackgroundCoordinatorDependencies,
): Promise<ScanBatchResponseMessage> {
  const storageArea = dependencies.storageArea;
  const predictBatch = dependencies.predictBatch ?? predictBatchWithMock;

  try {
    const response = predictBatch(request);

    await Promise.all([
      updateStatsFromResponse(request, response, storageArea),
      appendDetectionLogs(createDetectionLogs(request, response), storageArea),
    ]);

    return {
      type: MESSAGE_TYPES.scanBatch,
      payload: response,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const occurredAt = new Date().toISOString();
    const errorResponse: PredictionBatchResponse = {
      requestId: request.requestId,
      model: {
        name: 'background-coordinator',
        version: '0.1.0',
        architecture: 'message-handler',
        isMock: true,
      },
      summary: {
        totalItems: request.items.length,
        judolCount: 0,
        unicodeSuspiciousCount: 0,
        processingTimeMs: 0,
      },
      results: [],
      errors: [
        {
          code: 'background_prediction_failed',
          message,
        },
      ],
    };

    await updateSessionStats(
      {
        protectionStatus: 'error',
        activePlatform: request.source.platform,
        activeUrl: request.source.url,
        predictionMode: request.client.predictionMode === 'api' ? 'api' : 'mock',
        lastError: {
          code: 'background_prediction_failed',
          message,
          occurredAt,
        },
      },
      storageArea,
    );

    return {
      type: MESSAGE_TYPES.scanBatch,
      payload: errorResponse,
    };
  }
}

async function getExtensionState(
  storageArea?: StorageArea,
): Promise<ExtensionStateResponseMessage> {
  const [settings, stats, recentLogs] = await Promise.all([
    getExtensionSettings(storageArea),
    getSessionStats(storageArea),
    getDetectionLogs(storageArea),
  ]);

  return {
    type: MESSAGE_TYPES.getExtensionState,
    payload: {
      settings,
      stats,
      recentLogs,
    },
  };
}

async function updateStatsFromResponse(
  request: PredictionBatchRequest,
  response: PredictionBatchResponse,
  storageArea?: StorageArea,
): Promise<void> {
  const current = await getSessionStats(storageArea);

  await updateSessionStats(
    {
      protectionStatus: 'active',
      activePlatform: request.source.platform,
      activeUrl: request.source.url,
      predictionMode: request.client.predictionMode === 'api' ? 'api' : 'mock',
      scannedCount: current.scannedCount + response.summary.totalItems,
      detectedCount: current.detectedCount + response.summary.judolCount,
      unicodeSuspiciousCount:
        current.unicodeSuspiciousCount + response.summary.unicodeSuspiciousCount,
      lastScanTimeMs: response.summary.processingTimeMs,
      lastError: undefined,
    },
    storageArea,
  );
}

function createDetectionLogs(
  request: PredictionBatchRequest,
  response: PredictionBatchResponse,
): DetectionLog[] {
  return response.results
    .filter((result) => result.label === 'judol')
    .map((result) => createDetectionLog(request, response, result));
}

function createDetectionLog(
  request: PredictionBatchRequest,
  response: PredictionBatchResponse,
  result: PredictionResult,
): DetectionLog {
  return {
    id: `${request.requestId}:${result.id}`,
    timestamp: request.source.capturedAt,
    platform: request.source.platform,
    sourceUrl: request.source.url,
    snippet: result.display.snippet,
    label: result.label,
    confidence: result.confidence,
    riskLevel: result.riskLevel,
    action: result.action,
    matchedTerms: result.matchedTerms,
    unicodeAnalysis: result.unicodeAnalysis,
    model: response.model,
    requestId: request.requestId,
    itemId: result.id,
  };
}
