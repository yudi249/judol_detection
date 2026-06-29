// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import { MESSAGE_TYPES, type ScanBatchResponseMessage } from '../shared';
import { runJudolLensScanOnce } from './content-scan';

describe('content scan integration flow', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('sends scan candidates to background and applies returned overlays', async () => {
    document.body.innerHTML =
      '<main><p>bonus slot gacor malam ini</p><p>jadwal praktikum aman</p></main>';
    const sentMessages: unknown[] = [];

    const applied = await runJudolLensScanOnce({
      root: document.body,
      url: 'http://localhost:5173/fixture',
      pageTitle: 'Overlay Fixture',
      sendMessage: async (message) => {
        sentMessages.push(message);

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
    expect(sentMessages).toHaveLength(1);
    expect(document.querySelector('.judollens-detected')?.textContent).toContain(
      'bonus slot gacor malam ini',
    );
    expect(document.querySelector('.judollens-label')?.textContent).toBe(
      'Terdeteksi JudolLens',
    );
  });
});
