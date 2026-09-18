import { mockModel, predictBatchWithMock, type PredictBatch } from '../predictor';
import {
  openManualAnalysisFromSelection,
  type ManualAnalysisSelectionInput,
} from './manual-context-menu';
import { selectPredictionGateway } from './api-predictor-selector';
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

type OpenManualAnalysis = (input: ManualAnalysisSelectionInput) => Promise<void>;

export type BackgroundCoordinatorDependencies = {
  storageArea?: StorageArea;
  mockPredictBatch?: PredictBatch;
  apiPredictBatch?: PredictBatch;
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
    case MESSAGE_TYPES.xTimelineItems:
      return handleXTimelineItems(message.payload, dependencies);
    case MESSAGE_TYPES.youtubeBrowseItems:
      return handleYouTubeBrowseItems(message.payload, dependencies);
    case MESSAGE_TYPES.xTimelineSubscribe:
    case MESSAGE_TYPES.xTimelineUnsubscribe:
      return undefined;
    default:
      return undefined;
}
}

async function handleXTimelineItems(
  payload: Extract<JudolLensRequestMessage, { type: typeof MESSAGE_TYPES.xTimelineItems }>['payload'],
  dependencies: BackgroundCoordinatorDependencies,
): Promise<JudolLensResponseMessage> {
  const response = await handleScanBatch(
    {
      requestId: `x-timeline-${Date.now().toString(36)}`,
      source: {
        url: payload.sourceUrl,
        platform: 'x',
        pageTitle: payload.pageTitle,
        capturedAt: new Date().toISOString(),
      },
      client: {
        extensionVersion: '0.0.0',
        predictionMode: 'mock',
        threshold: 0.75,
      },
      items: payload.items.map((item) => ({
        ...item,
        context: {
          kind: 'post',
          selectorHint: 'article[data-testid="tweet"]',
          visible: true,
          languageHint: 'id',
        },
      })),
    },
    dependencies,
  );
  const settings = await getExtensionSettings(dependencies.storageArea);

  return {
    type: MESSAGE_TYPES.xTimelinePredictions,
    payload: {
      ...response.payload,
      results: response.payload.results.map((result) => ({
        ...result,
        action: result.label === 'judol' ? settings.censorMode : result.action,
      })),
    },
  };
}

async function handleYouTubeBrowseItems(
  payload: Extract<
    JudolLensRequestMessage,
    { type: typeof MESSAGE_TYPES.youtubeBrowseItems }
  >['payload'],
  dependencies: BackgroundCoordinatorDependencies,
): Promise<JudolLensResponseMessage> {
  const response = await handleScanBatch(
    {
      requestId: `youtube-browse-${Date.now().toString(36)}`,
      source: {
        url: payload.sourceUrl,
        platform: 'youtube',
        pageTitle: payload.pageTitle,
        capturedAt: new Date().toISOString(),
      },
      client: {
        extensionVersion: '0.0.0',
        predictionMode: 'mock',
        threshold: 0.75,
      },
      items: payload.items.map((item) => ({
        ...item,
        context: {
          kind: 'title',
          selectorHint: 'ytd-rich-item-renderer',
          visible: true,
          languageHint: 'id',
        },
      })),
    },
    dependencies,
  );
  const settings = await getExtensionSettings(dependencies.storageArea);

  return {
    type: MESSAGE_TYPES.youtubeBrowsePredictions,
    payload: {
      ...response.payload,
      results: response.payload.results.map((result) => ({
        ...result,
        action: result.label === 'judol' ? settings.censorMode : result.action,
      })),
    },
  };
}

async function handleScanBatch(
  request: PredictionBatchRequest,
  dependencies: BackgroundCoordinatorDependencies,
): Promise<ScanBatchResponseMessage> {
  const storageArea = dependencies.storageArea;
  const mockPredictBatch = dependencies.mockPredictBatch ?? predictBatchWithMock;
  let predictionMode: 'mock' | 'api' =
    request.client.predictionMode === 'api' ? 'api' : 'mock';

  try {
    const settings = await getExtensionSettings(storageArea);
    predictionMode = settings.predictionMode;
    if (!settings.protectionEnabled) {
      return createDisabledScanResponse(request);
    }
    const effectiveRequest: PredictionBatchRequest = {
      ...request,
      client: {
        ...request.client,
        predictionMode: settings.predictionMode,
        threshold: settings.threshold,
      },
    };
    const response = await selectPredictionGateway(
      settings,
      mockPredictBatch,
      dependencies.apiPredictBatch ?? unavailableApiPredictBatch,
    )(effectiveRequest);

    const latestSettings = await getExtensionSettings(storageArea);
    if (!latestSettings.protectionEnabled) {
      return createDisabledScanResponse(request);
    }

    if (isTerminalApiFailure(settings.predictionMode, response)) {
      await updateStatsForTerminalApiFailure(effectiveRequest, response, storageArea);
      return {
        type: MESSAGE_TYPES.scanBatch,
        payload: response,
      };
    }

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
        predictionMode,
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

function createDisabledScanResponse(
  request: PredictionBatchRequest,
): ScanBatchResponseMessage {
  return {
    type: MESSAGE_TYPES.scanBatch,
    payload: {
      requestId: request.requestId,
      model: mockModel,
      summary: {
        totalItems: 0,
        judolCount: 0,
        unicodeSuspiciousCount: 0,
        processingTimeMs: 0,
      },
      results: [],
      errors: [],
    },
  };
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
  const response = await selectPredictionGateway(
    settings,
    dependencies.mockPredictBatch ?? predictBatchWithMock,
    dependencies.apiPredictBatch ?? unavailableApiPredictBatch,
  )(request);
  if (isTerminalApiFailure(request.client.predictionMode, response)) {
    const [error] = response.errors;
    if (!error) {
      throw new Error('API terminal failure requires a prediction error');
    }
    await updateStatsForTerminalApiFailure(request, response, storageArea);
    return {
      type: MESSAGE_TYPES.analyzeManualText,
      payload: {
        kind: 'error',
        error,
      },
    };
  }

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
      kind: 'success',
      state,
      result,
      model,
      requestId: request.requestId,
    },
  };
}

const unavailableApiPredictBatch: PredictBatch = async () => {
  throw new Error('API prediction gateway is unavailable');
};

function isTerminalApiFailure(
  predictionMode: PredictionBatchRequest['client']['predictionMode'],
  response: PredictionBatchResponse,
): boolean {
  return predictionMode === 'api' && response.errors.length > 0;
}

async function updateStatsForTerminalApiFailure(
  request: PredictionBatchRequest,
  response: PredictionBatchResponse,
  storageArea?: StorageArea,
): Promise<void> {
  const [error] = response.errors;
  if (!error) {
    throw new Error('API terminal failure requires a prediction error');
  }
  await updateSessionStats(
    {
      protectionStatus: 'error',
      activePlatform: request.source.platform,
      activeUrl: request.source.url,
      predictionMode: 'api',
      lastError: {
        code: error.code,
        message: error.message,
        occurredAt: new Date().toISOString(),
      },
    },
    storageArea,
  );
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
