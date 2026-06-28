import { describe, expect, it } from 'vitest';
import type { PredictionBatchRequest, PredictionItem } from '@/shared';
import { mockModel, predictBatch, predictItem } from './mock-predictor';

function createItem(text: string, id = 'item-1'): PredictionItem {
  return {
    id,
    text,
    context: {
      kind: 'comment',
      visible: true,
      languageHint: 'id',
    },
  };
}

function createBatch(items: PredictionItem[]): PredictionBatchRequest {
  return {
    requestId: 'req-test-001',
    source: {
      platform: 'simulation',
      capturedAt: '2026-06-29T10:00:00+07:00',
    },
    client: {
      extensionVersion: '0.1.0',
      predictionMode: 'mock',
      threshold: 0.75,
    },
    items,
  };
}

describe('mock predictor', () => {
  it('classifies plain judol keyword and phrase evidence as high risk', () => {
    const result = predictItem(
      createItem('bonus new member slot gacor malam ini'),
      0.75,
    );

    expect(result.label).toBe('judol');
    expect(result.riskLevel).toBe('high');
    expect(result.action).toBe('blur');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result.matchedTerms).toEqual(
      expect.arrayContaining(['bonus', 'slot', 'gacor']),
    );
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'keyword', value: 'slot' }),
        expect.objectContaining({ type: 'keyword', value: 'gacor' }),
      ]),
    );
    expect(result.display.highlightRanges.length).toBeGreaterThan(0);
    expect(result.unicodeAnalysis.hasSuspiciousUnicode).toBe(false);
  });

  it('detects Unicode homoglyph obfuscation and preserves evidence spans', () => {
    const result = predictItem(createItem('b\u03BFnus sl\u03BFt gacor'), 0.75);

    expect(result.label).toBe('judol');
    expect(result.riskLevel).toBe('high');
    expect(result.action).toBe('blur');
    expect(result.matchedTerms).toEqual(
      expect.arrayContaining(['bonus', 'slot', 'gacor']),
    );
    expect(result.unicodeAnalysis.hasSuspiciousUnicode).toBe(true);
    expect(result.unicodeAnalysis.spans).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          char: '\u03BF',
          reason: 'homoglyph',
          normalizedAs: 'o',
        }),
      ]),
    );
    expect(result.display.highlightRanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'unicode_suspicious' }),
      ]),
    );
  });

  it('keeps a single benign keyword below the judol threshold', () => {
    const result = predictItem(
      createItem('slot waktu praktikum sudah penuh'),
      0.75,
    );

    expect(result.label).toBe('non_judol');
    expect(result.riskLevel).toBe('low');
    expect(result.action).toBe('none');
    expect(result.confidence).toBeLessThan(0.75);
    expect(result.matchedTerms).toEqual(['slot']);
  });

  it('counts repeated keywords only once', () => {
    const repeated = predictItem(createItem('slot slot slot'), 0.75);
    const single = predictItem(createItem('slot'), 0.75);

    expect(repeated.confidence).toBe(single.confidence);
    expect(repeated.matchedTerms).toEqual(['slot']);
  });

  it('returns API-compatible batch summary and preserves item ids', () => {
    const batch = predictBatch(
      createBatch([
        createItem('bonus new member slot gacor malam ini', 'plain'),
        createItem('slot waktu praktikum sudah penuh', 'clean'),
      ]),
    );

    expect(batch.requestId).toBe('req-test-001');
    expect(batch.model).toEqual(mockModel);
    expect(batch.summary.totalItems).toBe(2);
    expect(batch.summary.judolCount).toBe(1);
    expect(batch.summary.unicodeSuspiciousCount).toBe(0);
    expect(batch.summary.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(batch.results.map((result) => result.id)).toEqual([
      'plain',
      'clean',
    ]);
    expect(batch.errors).toEqual([]);
  });

  it('returns a safe non-judol result for empty text', () => {
    const result = predictItem(createItem(''), 0.75);

    expect(result.label).toBe('non_judol');
    expect(result.confidence).toBe(0.05);
    expect(result.action).toBe('none');
    expect(result.matchedTerms).toEqual([]);
    expect(result.display.snippet).toBe('');
  });
});
