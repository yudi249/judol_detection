import { mockModel, predictBatch as predictBatchWithMock } from '../predictor';
import {
  openManualAnalysisFromSelection,
  type ManualAnalysisSelectionInput,
} from './manual-context-menu';
import {
  MESSAGE_TYPES,
  type DetectionLog,
  type ExtensionStateResponseMessage,
  type JudolLensRequestMessage,
  type JudolLensResponseMessage,
  type ManualAnalysisResponseMessage,
  type ManualAnalyzeResponseMessage,
  type PredictionBatchRequest,
  type PredictionBatchResponse,
  type PredictionResult,
  type SaveManualAnalysisResponseMessage,
  type ScanBatchResponseMessage,
} from '../shared';
import {
  appendDetectionLogs,
  clearDetectionLogs,
  getDetectionLogs,
  getExtensionSettings,
  getManualAnalysisState,
  getSessionStats,
  setManualAnalysisState,
  updateExtensionSettings,
  updateSessionStats,
  type StorageArea,
} from '../storage';

type PredictBatch = (request: PredictionBatchRequest) => PredictionBatchResponse;
type OpenManualAnalysis = (input: ManualAnalysisSelectionInput) => Promise<void>;

export type BackgroundCoordinatorDependencies = {
  storageArea?: StorageArea;
  predictBatch?: PredictBatch;
  openManualAnalysis?: OpenManualAnalysis;
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
    case MESSAGE_TYPES.getManualAnalysis:
      return getManualAnalysis(dependencies.storageArea);
    case MESSAGE_TYPES.analyzeManualText:
      return analyzeManualText(message.payload, dependencies);
    case MESSAGE_TYPES.openManualAnalysis:
      await (dependencies.openManualAnalysis ?? openManualAnalysisFromSelection)({
        selectionText: message.payload.inputText,
        pageUrl: message.payload.sourceUrl,
      });
      return undefined;
    case MESSAGE_TYPES.saveManualAnalysis:
      return saveManualAnalysis(
        message.payload.state,
        message.payload.result,
        dependencies.storageArea,
      );
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
    const settings = await getExtensionSettings(storageArea);
    const effectiveRequest: PredictionBatchRequest = {
      ...request,
      client: {
        ...request.client,
        predictionMode: settings.predictionMode,
        threshold: settings.threshold,
      },
    };
    const response = predictBatch(effectiveRequest);

    const writes: Array<Promise<unknown>> = [
      updateStatsFromResponse(effectiveRequest, response, storageArea),
    ];
    if (settings.storeBoundedEvidence) {
      writes.push(
        appendDetectionLogs(
          createDetectionLogs(effectiveRequest, response),
          storageArea,
        ),
      );
    }
    await Promise.all(writes);

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

async function getManualAnalysis(
  storageArea?: StorageArea,
): Promise<ManualAnalysisResponseMessage> {
  return {
    type: MESSAGE_TYPES.getManualAnalysis,
    payload: {
      state: await getManualAnalysisState(storageArea),
    },
  };
}

async function analyzeManualText(
  payload: {
    inputText: string;
    sourcePlatform?: PredictionBatchRequest['source']['platform'];
    sourceUrl?: string;
  },
  dependencies: BackgroundCoordinatorDependencies,
): Promise<ManualAnalyzeResponseMessage> {
  const storageArea = dependencies.storageArea;
  const predictBatch = dependencies.predictBatch ?? predictBatchWithMock;
  const settings = await getExtensionSettings(storageArea);
  const capturedAt = new Date().toISOString();
  const request: PredictionBatchRequest = {
    requestId: `manual-${Date.now().toString(36)}`,
    source: {
      url: payload.sourceUrl,
      platform: payload.sourcePlatform ?? 'unknown',
      capturedAt,
    },
    client: {
      extensionVersion: '0.0.0',
      predictionMode: settings.predictionMode,
      threshold: settings.threshold,
    },
    items: [
      {
        id: 'manual-item',
        text: payload.inputText,
        context: {
          kind: 'unknown',
          visible: true,
          languageHint: 'id',
        },
      },
    ],
  };
  const response = predictBatch(request);
  const result = response.results[0];
  const model = response.model;
  const state = await setManualAnalysisState(
    {
      schemaVersion: 1,
      inputText: payload.inputText,
      sourcePlatform: request.source.platform,
      sourceUrl: payload.sourceUrl,
      analyzedAt: capturedAt,
      result,
      model,
      requestId: request.requestId,
    },
    storageArea,
  );

  return {
    type: MESSAGE_TYPES.analyzeManualText,
    payload: {
      state,
      result,
      model,
      requestId: request.requestId,
    },
  };
}

async function saveManualAnalysis(
  state: Awaited<ReturnType<typeof getManualAnalysisState>>,
  result: PredictionResult,
  storageArea?: StorageArea,
): Promise<SaveManualAnalysisResponseMessage> {
  const savedState = await setManualAnalysisState(
    {
      ...state,
      result,
      analyzedAt: state.analyzedAt ?? new Date().toISOString(),
    },
    storageArea,
  );
  await appendDetectionLogs([createManualDetectionLog(savedState, result)], storageArea);

  return {
    type: MESSAGE_TYPES.saveManualAnalysis,
    payload: {
      state: savedState,
    },
  };
}

function createManualDetectionLog(
  state: Awaited<ReturnType<typeof getManualAnalysisState>>,
  result: PredictionResult,
): DetectionLog {
  const timestamp = state.analyzedAt ?? new Date().toISOString();
  const requestId = state.requestId ?? `manual-${Date.now().toString(36)}`;

  return {
    id: `${requestId}:${result.id}`,
    timestamp,
    platform: state.sourcePlatform,
    sourceUrl: state.sourceUrl,
    snippet: result.display.snippet,
    label: result.label,
    confidence: result.confidence,
    riskLevel: result.riskLevel,
    action: result.action,
    matchedTerms: result.matchedTerms,
    unicodeAnalysis: result.unicodeAnalysis,
    model: state.model ?? mockModel,
    requestId,
    itemId: result.id,
  };
}
