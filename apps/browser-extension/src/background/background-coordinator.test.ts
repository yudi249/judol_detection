import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MESSAGE_TYPES,
  STORAGE_KEYS,
  defaultExtensionSettings,
  type DetectionLog,
  type ExtensionStorageSchema,
  type ManualAnalysisState,
  type ManualAnalyzeResponseMessage,
  type ManualAnalysisResponseMessage,
  type PredictionBatchRequest,
  type ScanBatchResponseMessage,
  type ScanBatchMessage,
  type SessionStats,
} from '../shared';
import type { StorageArea } from '../storage';
import { handleJudolLensMessage } from './background-coordinator';

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
      predictBatch: () => {
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
    )) as ManualAnalyzeResponseMessage;

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
    )) as ManualAnalyzeResponseMessage;
    const cleanResponse = (await handleJudolLensMessage(
      {
        type: MESSAGE_TYPES.analyzeManualText,
        payload: {
          inputText: 'slot waktu praktikum sudah penuh',
          sourcePlatform: 'simulation',
        },
      },
      { storageArea: area },
    )) as ManualAnalyzeResponseMessage;

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
});
