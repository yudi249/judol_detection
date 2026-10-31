import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MESSAGE_TYPES,
  STORAGE_KEYS,
  defaultExtensionSettings,
  type DetectionLog,
  type ExtensionStorageSchema,
  type ManualAnalysisState,
  type ManualAnalyzeResponseMessage,
  type ManualAnalyzeSuccessResponseMessage,
  type ManualAnalysisResponseMessage,
  type PredictionBatchRequest,
  type PredictionBatchResponse,
  type ScanBatchResponseMessage,
  type ScanBatchMessage,
  type SessionStats,
} from '../shared';
import { predictBatch as predictBatchWithMock } from '../predictor';
import type { StorageArea } from '../storage';
import { handleJudolLensMessage } from './background-coordinator';
import extensionConfig from '../../wxt.config';


class MemoryStorageArea implements StorageArea {
  private readonly values = new Map<string, unknown>();

  async getItem<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T | undefined) ?? null;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }

  peek<K extends keyof ExtensionStorageSchema>(
    key: K,
  ): ExtensionStorageSchema[K] | undefined {
    return this.values.get(key) as ExtensionStorageSchema[K] | undefined;
  }
}

function createBatchRequest(): PredictionBatchRequest {
  return {
    requestId: 'scan-request-1',
    source: {
      url: 'https://www.youtube.com/watch?v=demo',
      platform: 'youtube',
      pageTitle: 'Demo Video',
      capturedAt: '2026-06-29T00:00:00.000Z',
    },
    client: {
      extensionVersion: '0.0.0-test',
      predictionMode: 'mock',
      threshold: 0.75,
    },
    items: [
      {
        id: 'candidate-1',
        text: 'bonus new member slot gacor malam ini',
        context: {
          kind: 'comment',
          selectorHint: 'p',
          visible: true,
          languageHint: 'id',
        },
      },
      {
        id: 'candidate-2',
        text: 'slot waktu praktikum sudah penuh',
        context: {
          kind: 'comment',
          selectorHint: 'p',
          visible: true,
          languageHint: 'id',
        },
      },
    ],
  };
}

function createRecordingCoordinatorTelemetry() {
  const spans: string[] = [];
  const startPrediction = vi.fn(() => ({
    withSpan: async <T>(
      name: string,
      _attributes: Record<string, unknown>,
      operation: () => Promise<T>,
    ): Promise<T> => {
      spans.push(name);
      return operation();
    },
  }));
  const completePrediction = vi.fn();
  return {
    spans,
    startPrediction,
    completePrediction,
    telemetry: {
      startPrediction,
      completePrediction,
      withSpan: async <T>(
        name: string,
        _attributes: Record<string, unknown>,
        operation: () => Promise<T>,
      ): Promise<T> => {
        spans.push(name);
        return operation();
      },
    },
  };
}

describe('background prediction coordinator', () => {
  let area: MemoryStorageArea;

  beforeEach(async () => {
    area = new MemoryStorageArea();
    await area.setItem(STORAGE_KEYS.settings, defaultExtensionSettings);
  });

  it('handles scan batches by predicting, updating stats, and appending detection logs', async () => {
    const message: ScanBatchMessage = {
      type: MESSAGE_TYPES.scanBatch,
      payload: createBatchRequest(),
    };

    const response = (await handleJudolLensMessage(message, {
      storageArea: area,
    })) as ScanBatchResponseMessage;

    expect(response).toEqual(
      expect.objectContaining({
        type: MESSAGE_TYPES.scanBatch,
        payload: expect.objectContaining({
          requestId: 'scan-request-1',
          summary: expect.objectContaining({
            totalItems: 2,
            judolCount: 1,
          }),
        }),
      }),
    );
    expect(response?.payload.results.map((result) => result.id)).toEqual([
      'candidate-1',
      'candidate-2',
    ]);

    const stats = area.peek(STORAGE_KEYS.sessionStats) as SessionStats;
    expect(stats).toEqual(
      expect.objectContaining({
        protectionStatus: 'active',
        activePlatform: 'youtube',
        predictionMode: 'mock',
        scannedCount: 2,
        detectedCount: 1,
        unicodeSuspiciousCount: 0,
      }),
    );
    expect(stats).not.toHaveProperty('activeUrl');
    expect(stats.lastScanTimeMs).toEqual(expect.any(Number));

    const logs = area.peek(STORAGE_KEYS.detectionLogs) as DetectionLog[];
    expect(logs).toHaveLength(1);
    expect(logs[0]).toEqual(
      expect.objectContaining({
        id: 'scan-request-1:candidate-1',
        platform: 'youtube',
        snippet: 'bonus new member slot gacor malam ini',
        label: 'judol',
        confidence: expect.any(Number),
        riskLevel: 'high',
        action: 'blur',
        matchedTerms: expect.arrayContaining(['slot']),
        requestId: 'scan-request-1',
        itemId: 'candidate-1',
      }),
    );
    expect(logs[0]).not.toHaveProperty('sourceUrl');
  });

  it('traces one scan root, background prediction, storage writes, and matching completion', async () => {
    const recording = createRecordingCoordinatorTelemetry();
    const request = createBatchRequest();
    const telemetryStart = {
      requestId: request.requestId,
      startedAtEpochMs: 100,
      scanDurationMs: 4,
      candidateCount: 2,
      totalCharacters: 75,
      maxCharacters: 39,
    };

    const response = await handleJudolLensMessage(
      { type: MESSAGE_TYPES.scanBatch, payload: request, telemetry: telemetryStart },
      { storageArea: area, telemetry: recording.telemetry },
    );
    await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.predictionTraceComplete,
        payload: {
          requestId: request.requestId,
          overlayDurationMs: 3,
          nextPaintDurationMs: 8,
          completion: 'complete',
        },
      },
      { telemetry: recording.telemetry },
    );

    expect(response?.type).toBe(MESSAGE_TYPES.scanBatch);
    expect(recording.startPrediction).toHaveBeenCalledOnce();
    expect(recording.startPrediction).toHaveBeenCalledWith(telemetryStart);
    expect(recording.spans).toEqual([
      'client.background_prediction',
      'client.storage_update',
    ]);
    expect(recording.completePrediction).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: request.requestId }),
    );
  });

  it('keeps prediction behavior unchanged when telemetry throws', async () => {
    const request = createBatchRequest();
    const baseline = (await handleJudolLensMessage(
      { type: MESSAGE_TYPES.scanBatch, payload: request },
      { storageArea: area },
    )) as ScanBatchResponseMessage;
    const secondArea = new MemoryStorageArea();
    await secondArea.setItem(STORAGE_KEYS.settings, defaultExtensionSettings);
    const throwingTelemetry = {
      startPrediction: () => {
        throw new Error('telemetry unavailable');
      },
      completePrediction: () => {
        throw new Error('telemetry unavailable');
      },
      withSpan: async () => {
        throw new Error('telemetry unavailable');
      },
    };

    const traced = (await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.scanBatch,
        payload: request,
        telemetry: {
          requestId: request.requestId,
          startedAtEpochMs: 100,
          scanDurationMs: 4,
          candidateCount: 2,
          totalCharacters: 75,
          maxCharacters: 39,
        },
      },
      { storageArea: secondArea, telemetry: throwingTelemetry },
    )) as ScanBatchResponseMessage;

    expect(traced).toEqual({
      ...baseline,
      payload: {
        ...baseline?.payload,
        summary: {
          ...baseline?.payload.summary,
          processingTimeMs: traced?.payload.summary.processingTimeMs,
        },
      },
    });
    expect(secondArea.peek(STORAGE_KEYS.sessionStats)).toMatchObject({
      protectionStatus: 'active',
      scannedCount: 2,
    });
  });

  it('does not invoke the predictor or persist scan state while master protection is disabled', async () => {
    await area.setItem(STORAGE_KEYS.settings, {
      ...defaultExtensionSettings,
      protectionEnabled: false,
    });
    const mockPredictBatch = vi.fn();

    const response = (await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.scanBatch,
        payload: createBatchRequest(),
      },
      { storageArea: area, mockPredictBatch },
    )) as ScanBatchResponseMessage;

    expect(mockPredictBatch).not.toHaveBeenCalled();
    expect(response.payload.results).toEqual([]);
    expect(response.payload.summary).toEqual({
      totalItems: 0,
      judolCount: 0,
      unicodeSuspiciousCount: 0,
      processingTimeMs: 0,
    });
    expect(area.peek(STORAGE_KEYS.sessionStats)).toBeUndefined();
    expect(area.peek(STORAGE_KEYS.detectionLogs)).toBeUndefined();
  });

  it('discards an in-flight automatic scan when protection is disabled before persistence', async () => {
    let resolvePrediction:
      | ((value: PredictionBatchResponse) => void)
      | undefined;
    const prediction = new Promise<PredictionBatchResponse>((resolve) => {
      resolvePrediction = resolve;
    });

    const responsePromise = handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.scanBatch,
        payload: createBatchRequest(),
      },
      { storageArea: area, mockPredictBatch: () => prediction },
    );
    await area.setItem(STORAGE_KEYS.settings, {
      ...defaultExtensionSettings,
      protectionEnabled: false,
    });
    resolvePrediction?.(await predictBatchWithMock(createBatchRequest()));

    const response = (await responsePromise) as ScanBatchResponseMessage;

    expect(response.payload.results).toEqual([]);
    expect(area.peek(STORAGE_KEYS.sessionStats)).toBeUndefined();
    expect(area.peek(STORAGE_KEYS.detectionLogs)).toBeUndefined();
  });

  it('uses stored threshold instead of the content script request threshold', async () => {
    await area.setItem(STORAGE_KEYS.settings, {
      ...defaultExtensionSettings,
      threshold: 0.1,
    });

    const message: ScanBatchMessage = {
      type: MESSAGE_TYPES.scanBatch,
      payload: {
        ...createBatchRequest(),
        client: {
          ...createBatchRequest().client,
          threshold: 0.75,
        },
        items: [
          {
            id: 'false-positive-trap',
            text: 'slot waktu praktikum sudah penuh',
            context: {
              kind: 'post',
              visible: true,
              languageHint: 'id',
            },
          },
        ],
      },
    };

    const response = (await handleJudolLensMessage(message, {
      storageArea: area,
    })) as ScanBatchResponseMessage;

    expect(response.payload.results[0]).toEqual(
      expect.objectContaining({
        id: 'false-positive-trap',
        label: 'judol',
      }),
    );
    expect(response.payload.summary.judolCount).toBe(1);

    const stats = area.peek(STORAGE_KEYS.sessionStats) as SessionStats;
    expect(stats.detectedCount).toBe(1);
  });

  it('updates scan stats but does not append logs when bounded evidence storage is disabled', async () => {
    await area.setItem(STORAGE_KEYS.settings, {
      ...defaultExtensionSettings,
      storeBoundedEvidence: false,
    });

    const response = (await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.scanBatch,
        payload: createBatchRequest(),
      },
      { storageArea: area },
    )) as ScanBatchResponseMessage;

    expect(response.payload.summary.judolCount).toBe(1);

    const stats = area.peek(STORAGE_KEYS.sessionStats) as SessionStats;
    expect(stats.scannedCount).toBe(2);
    expect(stats.detectedCount).toBe(1);
    expect(area.peek(STORAGE_KEYS.detectionLogs)).toBeUndefined();
  });

  it('accumulates session stats across scan batches', async () => {
    const firstMessage: ScanBatchMessage = {
      type: MESSAGE_TYPES.scanBatch,
      payload: createBatchRequest(),
    };
    const secondMessage: ScanBatchMessage = {
      type: MESSAGE_TYPES.scanBatch,
      payload: {
        ...createBatchRequest(),
        requestId: 'scan-request-2',
        items: [
          {
            id: 'candidate-3',
            text: 'normal tanpa promosi mencurigakan',
            context: {
              kind: 'post',
              visible: true,
              languageHint: 'id',
            },
          },
        ],
      },
    };

    await handleJudolLensMessage(firstMessage, { storageArea: area });
    await handleJudolLensMessage(secondMessage, { storageArea: area });

    const stats = area.peek(STORAGE_KEYS.sessionStats) as SessionStats;
    expect(stats.scannedCount).toBe(3);
    expect(stats.detectedCount).toBe(1);
  });

  it('records coordinator errors in session stats and returns an error batch response', async () => {
    const message: ScanBatchMessage = {
      type: MESSAGE_TYPES.scanBatch,
      payload: createBatchRequest(),
    };

    const response = await handleJudolLensMessage(message, {
      storageArea: area,
      mockPredictBatch: async () => {
        throw new Error('predictor exploded');
      },
    });

    expect(response).toEqual(
      expect.objectContaining({
        type: MESSAGE_TYPES.scanBatch,
        payload: expect.objectContaining({
          requestId: 'scan-request-1',
          results: [],
          errors: [
            {
              code: 'background_prediction_failed',
              message: 'predictor exploded',
            },
          ],
        }),
      }),
    );

    const stats = area.peek(STORAGE_KEYS.sessionStats) as SessionStats;
    expect(stats.protectionStatus).toBe('error');
    expect(stats.lastError).toEqual(
      expect.objectContaining({
        code: 'background_prediction_failed',
        message: 'predictor exploded',
      }),
    );
  });
  it('records an API terminal error without persisting clean results, stats, or detection logs', async () => {
    await area.setItem(STORAGE_KEYS.settings, {
      ...defaultExtensionSettings,
      predictionMode: 'api',
    });
    const apiPredictBatch = vi.fn().mockResolvedValue({
      requestId: 'scan-request-1',
      model: {
        name: 'api',
        version: '0.1.0',
        architecture: 'indobert-base-p1',
        isMock: false,
      },
      summary: {
        totalItems: 2,
        judolCount: 0,
        unicodeSuspiciousCount: 0,
        processingTimeMs: 0,
      },
      results: [],
      errors: [
        {
          code: 'api_prediction_failed',
          message: 'service unavailable',
        },
      ],
    });

    const response = (await handleJudolLensMessage(
      { type: MESSAGE_TYPES.scanBatch, payload: createBatchRequest() },
      { storageArea: area, apiPredictBatch },
    )) as ScanBatchResponseMessage;

    expect(response.payload.results).toEqual([]);
    expect(apiPredictBatch).toHaveBeenCalledOnce();
    expect(area.peek(STORAGE_KEYS.sessionStats)).toEqual(
      expect.objectContaining({
        protectionStatus: 'error',
        predictionMode: 'api',
        lastError: expect.objectContaining({
          code: 'api_prediction_failed',
          message: 'service unavailable',
        }),
      }),
    );
    expect(area.peek(STORAGE_KEYS.detectionLogs)).toBeUndefined();
  });

  it('does not persist successful chunk results after a partial terminal API failure', async () => {
    await area.setItem(STORAGE_KEYS.settings, {
      ...defaultExtensionSettings,
      predictionMode: 'api',
    });
    const request = {
      ...createBatchRequest(),
      items: Array.from({ length: 5 }, (_, index) => ({
        id: `candidate-${index}`,
        text: 'bonus new member slot gacor malam ini',
        context: { kind: 'comment' as const, visible: true },
      })),
    };
    const successfulResponse = await predictBatchWithMock(request);
    const apiPredictBatch = vi.fn().mockResolvedValue({
      ...successfulResponse,
      results: successfulResponse.results.slice(0, 4),
      errors: [
        {
          itemId: 'candidate-4',
          code: 'api_prediction_failed',
          message: 'service unavailable',
        },
      ],
    });

    const response = (await handleJudolLensMessage(
      { type: MESSAGE_TYPES.scanBatch, payload: request },
      { storageArea: area, apiPredictBatch },
    )) as ScanBatchResponseMessage;

    expect(response.payload.results).toHaveLength(4);
    expect(response.payload.errors).toEqual([
      expect.objectContaining({ itemId: 'candidate-4', code: 'api_prediction_failed' }),
    ]);
    expect(area.peek(STORAGE_KEYS.sessionStats)).toEqual(
      expect.objectContaining({
        protectionStatus: 'error',
        predictionMode: 'api',
        lastError: expect.objectContaining({ code: 'api_prediction_failed' }),
      }),
    );
    expect(area.peek(STORAGE_KEYS.detectionLogs)).toBeUndefined();
  });
  it('declares only explicit loopback host permissions for the local API', () => {
    const manifest = extensionConfig.manifest as { host_permissions?: string[] };
    expect(manifest.host_permissions).toEqual([
      'http://localhost/*',
      'http://127.0.0.1/*',
      'http://[::1]/*',
    ]);
  });

  it('emits only valid Chrome match patterns for content scripts', () => {
    const manifestPath = resolve(
      import.meta.dirname,
      '../../.output/chrome-mv3/manifest.json',
    );
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      content_scripts?: Array<{ matches?: string[] }>;
    };
    const matches = manifest.content_scripts?.flatMap((script) => script.matches ?? []) ?? [];

    expect(matches).not.toHaveLength(0);
    expect(
      matches.every((pattern) => {
        const match = /^(?:\*|http|https|file|ftp):\/\/([^/]+)(\/.*)$/.exec(pattern);
        return match !== null && !match[1]?.includes(':');
      }),
    ).toBe(true);
  });

  it('emits the default locale catalog required by the manifest', () => {
    const manifest = extensionConfig.manifest as { default_locale?: string };
    const locale = manifest.default_locale;

    expect(locale).toBe('id');
    expect(
      existsSync(
        resolve(import.meta.dirname, `../../.output/chrome-mv3/_locales/${locale}/messages.json`),
      ),
    ).toBe(true);
  });

  it('returns a structured manual API error without persisting a missing result', async () => {
    await area.setItem(STORAGE_KEYS.settings, {
      ...defaultExtensionSettings,
      predictionMode: 'api',
    });
    const apiPredictBatch = vi.fn().mockResolvedValue({
      requestId: 'manual-request-1',
      model: {
        name: 'api',
        version: '0.1.0',
        architecture: 'indobert-base-p1',
        isMock: false,
      },
      summary: {
        totalItems: 1,
        judolCount: 0,
        unicodeSuspiciousCount: 0,
        processingTimeMs: 0,
      },
      results: [],
      errors: [
        {
          code: 'api_prediction_failed',
          message: 'service unavailable',
        },
      ],
    });

    const response = (await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.analyzeManualText,
        payload: { inputText: 'bonus slot gacor', sourcePlatform: 'simulation' },
      },
      { storageArea: area, apiPredictBatch },
    )) as ManualAnalyzeResponseMessage;

    expect(response.payload.kind).toBe('error');
    if (response.payload.kind !== 'error') {
      throw new Error('Expected terminal API failure to return a manual analysis error');
    }

    expect(response).toEqual({
      type: MESSAGE_TYPES.analyzeManualText,
      payload: {
        kind: 'error',
        error: {
          code: 'api_prediction_failed',
          message: 'service unavailable',
        },
      },
    });
    expect(area.peek(STORAGE_KEYS.manualLastAnalysis)).toBeUndefined();
    expect(area.peek(STORAGE_KEYS.sessionStats)).toEqual(
      expect.objectContaining({
        protectionStatus: 'error',
        predictionMode: 'api',
        lastError: expect.objectContaining({ code: 'api_prediction_failed' }),
      }),
    );
  });


  it('awaits API manual analysis and persists the non-mock returned model', async () => {
    await area.setItem(STORAGE_KEYS.settings, {
      ...defaultExtensionSettings,
      predictionMode: 'api',
      threshold: 0.63,
    });
    const mockResponse = predictBatchWithMock({
      ...createBatchRequest(),
      items: [
        {
          id: 'manual-item',
          text: 'bonus slot gacor',
          context: { kind: 'unknown', visible: true, languageHint: 'id' },
        },
      ],
    });
    const apiPredictBatch = vi.fn().mockResolvedValue({
      ...mockResponse,
      model: {
        name: 'clean-indobert',
        version: '0.1.0',
        architecture: 'indobert-base-p1',
        isMock: false,
      },
    });

    const response = (await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.analyzeManualText,
        payload: { inputText: 'bonus slot gacor', sourcePlatform: 'simulation' },
      },
      { storageArea: area, apiPredictBatch },
    )) as ManualAnalyzeSuccessResponseMessage;

    expect(apiPredictBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        client: expect.objectContaining({ predictionMode: 'api', threshold: 0.63 }),
      }),
    );
    expect(response.payload.model.isMock).toBe(false);
    expect(area.peek(STORAGE_KEYS.manualLastAnalysis)).toEqual(
      expect.objectContaining({
        requestId: response.payload.requestId,
        model: expect.objectContaining({ isMock: false }),
      }),
    );
  });

  it('analyzes manual text and persists the latest manual analysis state', async () => {
    const response = (await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.analyzeManualText,
        payload: {
          inputText: 'bοnus slοt gacor deposit 10k',
          sourcePlatform: 'simulation',
          sourceUrl: 'http://127.0.0.1:4173/',
        },
      },
      { storageArea: area },
    )) as ManualAnalyzeSuccessResponseMessage;

    expect(response.type).toBe(MESSAGE_TYPES.analyzeManualText);
    expect(response.payload.result).toEqual(
      expect.objectContaining({
        id: 'manual-item',
        label: 'judol',
        riskLevel: 'high',
      }),
    );

    const state = area.peek(STORAGE_KEYS.manualLastAnalysis) as ManualAnalysisState;
    expect(state).toEqual(
      expect.objectContaining({
        inputText: 'bοnus slοt gacor deposit 10k',
        sourcePlatform: 'simulation',
        result: expect.objectContaining({
          label: 'judol',
        }),
      }),
    );
    expect(state).not.toHaveProperty('sourceUrl');
  });

  it('returns the latest manual analysis state', async () => {
    await area.setItem<ManualAnalysisState>(STORAGE_KEYS.manualLastAnalysis, {
      schemaVersion: 1,
      inputText: 'bonus slot gacor',
      sourcePlatform: 'telegram',
    });

    const response = (await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.getManualAnalysis,
      },
      { storageArea: area },
    )) as ManualAnalysisResponseMessage;

    expect(response).toEqual({
      type: MESSAGE_TYPES.getManualAnalysis,
      payload: {
        state: {
          schemaVersion: 1,
          inputText: 'bonus slot gacor',
          sourcePlatform: 'telegram',
        },
      },
    });
  });

  it('saves manual analysis and appends judol and non-judol logs', async () => {
    const judolResponse = (await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.analyzeManualText,
        payload: {
          inputText: 'bonus new member slot gacor',
          sourcePlatform: 'simulation',
        },
      },
      { storageArea: area },
    )) as ManualAnalyzeSuccessResponseMessage;
    const cleanResponse = (await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.analyzeManualText,
        payload: {
          inputText: 'slot waktu praktikum sudah penuh',
          sourcePlatform: 'simulation',
        },
      },
      { storageArea: area },
    )) as ManualAnalyzeSuccessResponseMessage;

    await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.saveManualAnalysis,
        payload: {
          state: judolResponse.payload.state,
          result: judolResponse.payload.result,
        },
      },
      { storageArea: area },
    );
    await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.saveManualAnalysis,
        payload: {
          state: cleanResponse.payload.state,
          result: cleanResponse.payload.result,
        },
      },
      { storageArea: area },
    );

    const logs = area.peek(STORAGE_KEYS.detectionLogs) as DetectionLog[];
    expect(logs).toHaveLength(2);
    expect(logs.map((log) => log.label)).toEqual(['non_judol', 'judol']);
    expect(logs[0]).toEqual(
      expect.objectContaining({
        id: expect.stringMatching(/^manual-.+:manual-item$/),
        platform: 'simulation',
        snippet: 'slot waktu praktikum sudah penuh',
        riskLevel: 'low',
        action: 'none',
        requestId: expect.stringContaining('manual-'),
        itemId: 'manual-item',
      }),
    );
    expect(logs[0]).not.toHaveProperty('sourceUrl');
  });

  it('delegates selected text opening to the manual analysis opener', async () => {
    const openManualAnalysis = vi.fn().mockResolvedValue(undefined);

    await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.openManualAnalysis,
        payload: {
          inputText: 'bonus slot gacor dari selection',
          sourceUrl: 'https://web.telegram.org/a/#chat',
        },
      },
      {
        storageArea: area,
        openManualAnalysis,
      },
    );

    expect(openManualAnalysis).toHaveBeenCalledWith({
      selectionText: 'bonus slot gacor dari selection',
      pageUrl: 'https://web.telegram.org/a/#chat',
    });
  });
  it('predicts captured X timeline items through the generic batch contract', async () => {
    const response = await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.xTimelineItems,
        payload: {
          sourceUrl: 'https://x.com/search?q=slot',
          pageTitle: 'X search',
          items: [{ id: '2099429059063341169', text: 'bonus slot gacor' }],
        },
      },
      { storageArea: area },
    );

    expect(response).toEqual({
      type: MESSAGE_TYPES.xTimelinePredictions,
      payload: expect.objectContaining({
        results: [expect.objectContaining({ id: '2099429059063341169', label: 'judol' })],
        summary: expect.objectContaining({ totalItems: 1, judolCount: 1 }),
      }),
    });
    expect((area.peek(STORAGE_KEYS.sessionStats) as SessionStats).activePlatform).toBe('x');
  });

  it('returns hide actions for captured X posts when censor mode is hide', async () => {
    await area.setItem(STORAGE_KEYS.settings, {
      ...defaultExtensionSettings,
      censorMode: 'hide',
    });

    const response = await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.xTimelineItems,
        payload: {
          sourceUrl: 'https://x.com/search?q=slot',
          items: [{ id: '2099429059063341169', text: 'bonus slot gacor' }],
        },
      },
      { storageArea: area },
    );

    expect(response).toEqual(
      expect.objectContaining({
        type: MESSAGE_TYPES.xTimelinePredictions,
        payload: expect.objectContaining({
          results: [expect.objectContaining({ action: 'hide' })],
        }),
      }),
    );
  });

  it('keeps the generic API prediction mode for captured X timeline items', async () => {
    const apiPredictBatch = vi.fn(async (request: PredictionBatchRequest) =>
      predictBatchWithMock(request),
    );

    await area.setItem(STORAGE_KEYS.settings, {
      ...defaultExtensionSettings,
      predictionMode: 'api',
    });
    await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.xTimelineItems,
        payload: {
          sourceUrl: 'https://x.com/search?q=slot',
          items: [{ id: '2099429059063341169', text: 'bonus slot gacor' }],
        },
      },
      { storageArea: area, apiPredictBatch },
    );

    expect(apiPredictBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({ platform: 'x' }),
        items: [
          expect.objectContaining({
            id: '2099429059063341169',
            context: expect.objectContaining({ kind: 'post' }),
          }),
        ],
      }),
    );
  });

  it('routes YouTube browse items through the generic batch contract with title context and overrides only positive actions', async () => {
    await area.setItem(STORAGE_KEYS.settings, {
      ...defaultExtensionSettings,
      censorMode: 'hide',
    });
    const mockPredictBatch = vi.fn(async (request: PredictionBatchRequest) =>
      predictBatchWithMock(request),
    );

    const response = await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.youtubeBrowseItems,
        payload: {
          sourceUrl: 'https://www.youtube.com/',
          pageTitle: 'YouTube Home',
          items: [
            { id: 'browse-judol', text: 'bonus slot gacor' },
            { id: 'browse-normal', text: 'slot waktu praktikum sudah penuh' },
          ],
        },
      },
      { storageArea: area, mockPredictBatch },
    );

    expect(mockPredictBatch).toHaveBeenCalledWith({
      requestId: expect.stringMatching(/^youtube-browse-/),
      source: {
        url: 'https://www.youtube.com/',
        platform: 'youtube',
        pageTitle: 'YouTube Home',
        capturedAt: expect.any(String),
      },
      client: {
        extensionVersion: '0.0.0',
        predictionMode: 'mock',
        threshold: 0.75,
      },
      items: [
        {
          id: 'browse-judol',
          text: 'bonus slot gacor',
          context: {
            kind: 'title',
            selectorHint: 'ytd-rich-item-renderer',
            visible: true,
            languageHint: 'id',
          },
        },
        {
          id: 'browse-normal',
          text: 'slot waktu praktikum sudah penuh',
          context: {
            kind: 'title',
            selectorHint: 'ytd-rich-item-renderer',
            visible: true,
            languageHint: 'id',
          },
        },
      ],
    });
    expect(response).toEqual(
      expect.objectContaining({
        type: MESSAGE_TYPES.youtubeBrowsePredictions,
        payload: expect.objectContaining({
          results: [
            expect.objectContaining({ id: 'browse-judol', label: 'judol', action: 'hide' }),
            expect.objectContaining({ id: 'browse-normal', label: 'non_judol', action: 'none' }),
          ],
        }),
      }),
    );
  });

  it('does not persist normal detection logs for terminal API errors from YouTube browse items', async () => {
    await area.setItem(STORAGE_KEYS.settings, {
      ...defaultExtensionSettings,
      predictionMode: 'api',
    });
    const apiPredictBatch = vi.fn().mockResolvedValue({
      requestId: 'youtube-api-failure',
      model: {
        name: 'api',
        version: '0.1.0',
        architecture: 'indobert-base-p1',
        isMock: false,
      },
      summary: {
        totalItems: 1,
        judolCount: 1,
        unicodeSuspiciousCount: 0,
        processingTimeMs: 0,
      },
      results: [
        {
          id: 'browse-judol',
          label: 'judol',
          confidence: 0.99,
          riskLevel: 'high',
          action: 'blur',
          reasons: [],
          matchedTerms: ['slot'],
          unicodeAnalysis: {
            hasSuspiciousUnicode: false,
            suspiciousCount: 0,
            spans: [],
          },
          display: { snippet: 'bonus slot gacor', highlightRanges: [] },
        },
      ],
      errors: [{ code: 'api_prediction_failed', message: 'service unavailable' }],
    });

    const response = await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.youtubeBrowseItems,
        payload: {
          sourceUrl: 'https://www.youtube.com/',
          items: [{ id: 'browse-judol', text: 'bonus slot gacor' }],
        },
      },
      { storageArea: area, apiPredictBatch },
    );

    expect(response).toEqual(
      expect.objectContaining({
        type: MESSAGE_TYPES.youtubeBrowsePredictions,
        payload: expect.objectContaining({
          results: [expect.objectContaining({ id: 'browse-judol', action: 'blur' })],
          errors: [expect.objectContaining({ code: 'api_prediction_failed' })],
        }),
      }),
    );
    expect(area.peek(STORAGE_KEYS.detectionLogs)).toBeUndefined();
  });
});
