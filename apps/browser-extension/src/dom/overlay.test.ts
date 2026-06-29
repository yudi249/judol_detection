// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import type { PredictionResult } from '../shared';
import {
  applyPredictionOverlays,
  ensureJudolLensOverlayStyles,
} from './overlay';

function createResult(
  patch: Partial<PredictionResult> = {},
): PredictionResult {
  return {
    id: 'candidate-1',
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
    ...patch,
  };
}

function getTextNode(): Text {
  const node = document.querySelector('[data-target]')?.firstChild;
  if (!(node instanceof Text)) {
    throw new Error('Missing text node');
  }
  return node;
}

describe('JudolLens page overlay', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('wraps a high-risk detection with blur class and label without removing original text', () => {
    document.body.innerHTML =
      '<p data-target>bonus slot gacor malam ini</p>';
    const textNode = getTextNode();

    const applied = applyPredictionOverlays(
      [createResult()],
      [{ item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post', visible: true } }, textNode }],
    );

    expect(applied).toBe(1);
    expect(document.body.textContent).toContain('bonus slot gacor malam ini');
    expect(document.body.textContent).toContain('Terdeteksi JudolLens');
    expect(
      document
        .querySelector('.judollens-detected')
        ?.classList.contains('judollens-blur'),
    ).toBe(true);
    expect(document.querySelector('.judollens-label')?.textContent).toBe(
      'Terdeteksi JudolLens',
    );
  });

  it('uses warning class for warn actions and leaves text readable', () => {
    document.body.innerHTML =
      '<p data-target>bonus slot gacor malam ini</p>';
    const textNode = getTextNode();

    applyPredictionOverlays(
      [createResult({ action: 'warn', riskLevel: 'medium', confidence: 0.7 })],
      [{ item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post', visible: true } }, textNode }],
    );

    const wrapper = document.querySelector('.judollens-detected');
    expect(wrapper?.classList.contains('judollens-warning')).toBe(true);
    expect(wrapper?.classList.contains('judollens-blur')).toBe(false);
    expect(wrapper?.textContent).toContain('bonus slot gacor malam ini');
  });

  it('does not modify DOM for clean results or action none', () => {
    document.body.innerHTML =
      '<p data-target>slot waktu praktikum sudah penuh</p>';
    const original = document.body.innerHTML;
    const textNode = getTextNode();

    const applied = applyPredictionOverlays(
      [
        createResult({
          label: 'non_judol',
          action: 'none',
          riskLevel: 'low',
          confidence: 0.3,
        }),
      ],
      [{ item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post', visible: true } }, textNode }],
    );

    expect(applied).toBe(0);
    expect(document.body.innerHTML).toBe(original);
  });

  it('wraps suspicious Unicode spans when highlightUnicode is enabled', () => {
    document.body.innerHTML = '<p data-target>bοnus slοt gacor</p>';
    const textNode = getTextNode();

    applyPredictionOverlays(
      [
        createResult({
          unicodeAnalysis: {
            hasSuspiciousUnicode: true,
            suspiciousCount: 2,
            spans: [
              {
                start: 1,
                end: 2,
                char: 'ο',
                reason: 'homoglyph',
                normalizedAs: 'o',
              },
              {
                start: 8,
                end: 9,
                char: 'ο',
                reason: 'homoglyph',
                normalizedAs: 'o',
              },
            ],
          },
        }),
      ],
      [{ item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post', visible: true } }, textNode }],
      { highlightUnicode: true },
    );

    const unicodeSpans = document.querySelectorAll('.judollens-unicode-span');
    expect(unicodeSpans).toHaveLength(2);
    expect(unicodeSpans[0].textContent).toBe('ο');
  });

  it('does not create nested duplicate overlays on repeated apply', () => {
    document.body.innerHTML =
      '<p data-target>bonus slot gacor malam ini</p>';
    const textNode = getTextNode();
    const refs = [
      { item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post' as const, visible: true } }, textNode },
    ];

    applyPredictionOverlays([createResult()], refs);
    applyPredictionOverlays([createResult()], refs);

    expect(document.querySelectorAll('.judollens-detected')).toHaveLength(1);
    expect(document.querySelectorAll('.judollens-label')).toHaveLength(1);
  });

  it('injects scoped overlay styles only once', () => {
    ensureJudolLensOverlayStyles();
    ensureJudolLensOverlayStyles();

    expect(document.querySelectorAll('style[data-judollens-style]')).toHaveLength(
      1,
    );
  });
});
