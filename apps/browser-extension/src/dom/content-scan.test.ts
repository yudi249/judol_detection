// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  MESSAGE_TYPES,
  defaultExtensionSettings,
  type ExtensionStateResponseMessage,
  type ScanBatchResponseMessage,
} from '../shared';
import {
  runJudolLensScanOnce,
  runJudolLensScanForRoots,
} from './content-scan';

describe('content scan integration flow', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('sends scan candidates to background and applies returned overlays', async () => {
    document.body.innerHTML =
      '<main><p>bonus slot gacor malam ini</p><p>jadwal praktikum aman</p></main>';
    const sentMessages: Array<{ type: string }> = [];

    const applied = await runJudolLensScanOnce({
      root: document.body,
      url: 'http://localhost:5173/fixture',
      pageTitle: 'Overlay Fixture',
      sendMessage: async (message) => {
        sentMessages.push(message);
        if (message.type === MESSAGE_TYPES.getExtensionState) {
          return createStateResponse();
        }

        return {
          type: MESSAGE_TYPES.scanBatch,
          payload: {
            requestId: message.payload.requestId,
            model: {
              name: 'mock',
              version: '0.1.0',
              architecture: 'rule-based',
              isMock: true,
            },
            summary: {
              totalItems: 2,
              judolCount: 1,
              unicodeSuspiciousCount: 0,
              processingTimeMs: 3,
            },
            results: [
              {
                id: 'scan-node-0',
                label: 'judol',
                confidence: 0.94,
                riskLevel: 'high',
                action: 'blur',
                reasons: [],
                matchedTerms: ['slot'],
                unicodeAnalysis: {
                  hasSuspiciousUnicode: false,
                  suspiciousCount: 0,
                  spans: [],
                },
                display: {
                  snippet: 'bonus slot gacor malam ini',
                  highlightRanges: [],
                },
              },
            ],
            errors: [],
          },
        } satisfies ScanBatchResponseMessage;
      },
    });

    expect(applied).toBe(1);
    expect(sentMessages.map((message) => message.type)).toEqual([
      MESSAGE_TYPES.getExtensionState,
      MESSAGE_TYPES.scanBatch,
    ]);
    expect(document.querySelector('.judollens-detected')?.textContent).toContain(
      'bonus slot gacor malam ini',
    );
    expect(document.querySelector('.judollens-label')?.textContent).toBe(
      'Terdeteksi JudolLens',
    );
  });

  it('scans dynamic roots without rescanning previously processed nodes', async () => {
    document.body.innerHTML =
      '<main><p>bonus slot awal sudah diproses</p></main>';
    const processedNodes = new WeakSet<Node>();

    await runJudolLensScanOnce({
      root: document.body,
      url: 'http://localhost:5173/fixture',
      processedNodes,
      sendMessage: async (message) => {
        if (message.type === MESSAGE_TYPES.getExtensionState) {
          return createStateResponse();
        }

        return createResponse(message.payload.requestId, [
          {
            id: 'scan-node-0',
            text: 'bonus slot awal sudah diproses',
          },
        ]);
      },
    });

    const dynamicPost = document.createElement('article');
    dynamicPost.dataset.postId = 'dynamic';
    dynamicPost.innerHTML = '<p>bonus new member slot gacor dinamis</p>';
    document.querySelector('main')?.append(dynamicPost);

    const sentTexts: string[] = [];
    const applied = await runJudolLensScanForRoots({
      roots: [dynamicPost],
      url: 'http://localhost:5173/fixture',
      processedNodes,
      sendMessage: async (message) => {
        if (message.type === MESSAGE_TYPES.getExtensionState) {
          return createStateResponse();
        }

        sentTexts.push(...message.payload.items.map((item) => item.text));
        return createResponse(message.payload.requestId, [
          {
            id: 'scan-node-0',
            text: 'bonus new member slot gacor dinamis',
          },
        ]);
      },
    });

    expect(applied).toBe(1);
    expect(sentTexts).toEqual(['bonus new member slot gacor dinamis']);
    expect(document.querySelectorAll('.judollens-detected')).toHaveLength(2);
  });

  it('skips automatic scan when the current platform is disabled in settings', async () => {
    document.body.innerHTML =
      '<main><p>bonus slot gacor malam ini</p></main>';
    const sentTypes: string[] = [];

    const applied = await runJudolLensScanOnce({
      root: document.body,
      url: 'http://localhost:5173/fixture',
      sendMessage: async (message) => {
        sentTypes.push(message.type);
        return createStateResponse({
          platformScope: {
            ...defaultExtensionSettings.platformScope,
            simulation: false,
          },
        });
      },
    });

    expect(applied).toBe(0);
    expect(sentTypes).toEqual([MESSAGE_TYPES.getExtensionState]);
    expect(document.querySelector('.judollens-detected')).toBeNull();
  });

  it('uses settings threshold and disables Unicode highlights from options', async () => {
    document.body.innerHTML = '<main><p>bÎ¿nus slÎ¿t gacor deposit 10k</p></main>';
    const sentThresholds: number[] = [];

    const applied = await runJudolLensScanOnce({
      root: document.body,
      url: 'http://localhost:5173/fixture',
      sendMessage: async (message) => {
        if (message.type === MESSAGE_TYPES.getExtensionState) {
          return createStateResponse({
            threshold: 0.1,
            highlightUnicode: false,
          });
        }

        sentThresholds.push(message.payload.client.threshold);
        return createResponse(message.payload.requestId, [
          {
            id: 'scan-node-0',
            text: 'bÎ¿nus slÎ¿t gacor deposit 10k',
          },
        ]);
      },
    });

    expect(applied).toBe(1);
    expect(sentThresholds).toEqual([0.1]);
    expect(document.querySelector('.judollens-detected')).not.toBeNull();
    expect(document.querySelector('.judollens-unicode-span')).toBeNull();
  });

  it('does not apply overlays when censor mode is none but still sends scan batch', async () => {
    document.body.innerHTML =
      '<main><p>bonus slot gacor malam ini</p></main>';
    const sentTypes: string[] = [];

    const applied = await runJudolLensScanOnce({
      root: document.body,
      url: 'http://localhost:5173/fixture',
      sendMessage: async (message) => {
        sentTypes.push(message.type);
        if (message.type === MESSAGE_TYPES.getExtensionState) {
          return createStateResponse({ censorMode: 'none' });
        }

        return createResponse(message.payload.requestId, [
          {
            id: 'scan-node-0',
            text: 'bonus slot gacor malam ini',
          },
        ]);
      },
    });

    expect(applied).toBe(0);
    expect(sentTypes).toEqual([
      MESSAGE_TYPES.getExtensionState,
      MESSAGE_TYPES.scanBatch,
    ]);
    expect(document.querySelector('.judollens-detected')).toBeNull();
  });
});

function createResponse(
  requestId: string,
  results: Array<{ id: string; text: string }>,
): ScanBatchResponseMessage {
  return {
    type: MESSAGE_TYPES.scanBatch,
    payload: {
      requestId,
      model: {
        name: 'mock',
        version: '0.1.0',
        architecture: 'rule-based',
        isMock: true,
      },
      summary: {
        totalItems: results.length,
        judolCount: results.length,
        unicodeSuspiciousCount: 0,
        processingTimeMs: 3,
      },
      results: results.map((result) => ({
        id: result.id,
        label: 'judol',
        confidence: 0.94,
        riskLevel: 'high',
        action: 'blur',
        reasons: [],
        matchedTerms: ['slot'],
        unicodeAnalysis: {
          hasSuspiciousUnicode: false,
          suspiciousCount: 0,
          spans: [],
        },
        display: {
          snippet: result.text,
          highlightRanges: [],
        },
      })),
      errors: [],
    },
  };
}

function createStateResponse(
  settingsPatch: Partial<typeof defaultExtensionSettings> = {},
): ExtensionStateResponseMessage {
  return {
    type: MESSAGE_TYPES.getExtensionState,
    payload: {
      settings: {
        ...defaultExtensionSettings,
        ...settingsPatch,
        platformScope: {
          ...defaultExtensionSettings.platformScope,
          ...settingsPatch.platformScope,
        },
      },
      stats: {
        schemaVersion: 1,
        sessionId: 'session-test',
        startedAt: '2026-06-29T00:00:00.000Z',
        updatedAt: '2026-06-29T00:00:00.000Z',
        protectionStatus: 'active',
        activePlatform: 'simulation',
        predictionMode: 'mock',
        scannedCount: 0,
        detectedCount: 0,
        unicodeSuspiciousCount: 0,
      },
      recentLogs: [],
    },
  };
}
