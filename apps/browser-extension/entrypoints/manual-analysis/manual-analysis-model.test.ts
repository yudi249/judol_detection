import { describe, expect, it } from 'vitest';
import type { ManualAnalysisState, PredictionResult } from '../../src/shared';
import {
  buildManualAnalysisViewModel,
  formatManualConfidence,
  formatManualRisk,
} from './manual-analysis-model';

function createResult(
  patch: Partial<PredictionResult> = {},
): PredictionResult {
  return {
    id: 'manual-item',
    label: 'judol',
    confidence: 0.94,
    riskLevel: 'high',
    action: 'blur',
    reasons: [
      {
        type: 'keyword',
        value: 'slot',
        weight: 0.25,
      },
      {
        type: 'unicode',
        value: 'homoglyph',
        weight: 0.12,
      },
    ],
    matchedTerms: ['bonus', 'slot', 'gacor'],
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
          unicodeName: 'GREEK SMALL LETTER OMICRON',
        },
      ],
    },
    display: {
      snippet: 'bοnus slοt gacor deposit 10k',
      highlightRanges: [],
    },
    ...patch,
  };
}

function createState(
  patch: Partial<ManualAnalysisState> = {},
): ManualAnalysisState {
  return {
    schemaVersion: 1,
    inputText: '',
    sourcePlatform: 'unknown',
    ...patch,
  };
}

describe('manual analysis model', () => {
  it('builds an empty state before any analysis is run', () => {
    const model = buildManualAnalysisViewModel(createState());

    expect(model.inputText).toBe('');
    expect(model.hasResult).toBe(false);
    expect(model.canAnalyze).toBe(false);
    expect(model.canSave).toBe(false);
    expect(model.emptyMessage).toBe('Paste or select text to analyze.');
  });

  it('formats a high-risk judol result with Unicode evidence', () => {
    const model = buildManualAnalysisViewModel(
      createState({
        inputText: 'bοnus slοt gacor deposit 10k',
        sourcePlatform: 'simulation',
        analyzedAt: '2026-06-29T12:00:00.000Z',
        result: createResult(),
      }),
    );

    expect(model.hasResult).toBe(true);
    expect(model.canAnalyze).toBe(true);
    expect(model.canSave).toBe(true);
    expect(model.result?.label).toBe('JUDOL');
    expect(model.result?.confidence).toBe('0.94');
    expect(model.result?.risk).toBe('HIGH');
    expect(model.result?.action).toBe('blur');
    expect(model.result?.matchedTerms).toEqual(['bonus', 'slot', 'gacor']);
    expect(model.result?.unicodeRows).toEqual([
      {
        char: 'ο',
        normalizedAs: 'o',
        reason: 'homoglyph',
        unicodeName: 'GREEK SMALL LETTER OMICRON',
      },
    ]);
    expect(model.result?.reasonRows.map((reason) => reason.label)).toEqual([
      'keyword: slot',
      'unicode: homoglyph',
    ]);
  });

  it('keeps clean non-judol results saveable for research evidence', () => {
    const model = buildManualAnalysisViewModel(
      createState({
        inputText: 'slot waktu praktikum sudah penuh',
        result: createResult({
          label: 'non_judol',
          confidence: 0.17,
          riskLevel: 'low',
          action: 'none',
          matchedTerms: ['slot'],
          unicodeAnalysis: {
            hasSuspiciousUnicode: false,
            suspiciousCount: 0,
            spans: [],
          },
        }),
      }),
    );

    expect(model.result?.label).toBe('NON_JUDOL');
    expect(model.result?.risk).toBe('LOW');
    expect(model.canSave).toBe(true);
  });

  it('formats confidence and risk labels consistently', () => {
    expect(formatManualConfidence(0.8)).toBe('0.80');
    expect(formatManualConfidence(1)).toBe('1.00');
    expect(formatManualRisk('medium')).toBe('MEDIUM');
  });
});
