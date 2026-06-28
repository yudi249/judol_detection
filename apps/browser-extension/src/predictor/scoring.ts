import type {
  DetectionAction,
  DetectionReason,
  HighlightRange,
  JudolLabel,
  PredictionResult,
  RiskLevel,
} from '@/shared';
import { PHRASES, SCORING_WEIGHTS, STRONG_TERMS, WEAK_TERMS } from './dictionary';
import type { NormalizedText } from './unicode';

type TermMatch = {
  term: string;
  weight: number;
  start: number;
  end: number;
};

function clampScore(score: number): number {
  return Math.min(
    SCORING_WEIGHTS.max,
    Math.max(SCORING_WEIGHTS.min, Number(score.toFixed(2))),
  );
}

function findTermMatch(text: string, term: string): { start: number; end: number } | undefined {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|[^a-z0-9])(${escaped})(?=$|[^a-z0-9])`, 'i');
  const match = pattern.exec(text);

  if (!match || match.index < 0) {
    return undefined;
  }

  const prefixLength = match[1]?.length ?? 0;
  const start = match.index + prefixLength;

  return {
    start,
    end: start + term.length,
  };
}

function originalRangeFromNormalized(
  normalized: NormalizedText,
  start: number,
  end: number,
): HighlightRange | undefined {
  const originalStart = normalized.originalIndexByNormalizedIndex[start];
  const originalEndIndex = normalized.originalIndexByNormalizedIndex[end - 1];

  if (originalStart === undefined || originalEndIndex === undefined) {
    return undefined;
  }

  return {
    start: originalStart,
    end: originalEndIndex + 1,
    kind: 'matched_term',
  };
}

function uniqueMatches(
  normalizedText: string,
  terms: readonly string[],
  weight: number,
): TermMatch[] {
  const matches: TermMatch[] = [];

  for (const term of terms) {
    const match = findTermMatch(normalizedText, term);

    if (match) {
      matches.push({
        term,
        weight,
        ...match,
      });
    }
  }

  return matches;
}

export function scorePrediction(
  id: string,
  normalized: NormalizedText,
  threshold: number,
): PredictionResult {
  const strongMatches = uniqueMatches(
    normalized.normalizedText,
    STRONG_TERMS,
    SCORING_WEIGHTS.strongTerm,
  );
  const weakMatches = uniqueMatches(
    normalized.normalizedText,
    WEAK_TERMS,
    SCORING_WEIGHTS.weakTerm,
  );
  const phraseMatches = uniqueMatches(
    normalized.normalizedText,
    PHRASES,
    SCORING_WEIGHTS.phrase,
  );
  const allTermMatches = [...strongMatches, ...weakMatches];
  const matchedTerms = allTermMatches.map((match) => match.term);
  const reasons: DetectionReason[] = [
    ...allTermMatches.map((match) => ({
      type: 'keyword' as const,
      value: match.term,
      weight: match.weight,
    })),
    ...phraseMatches.map((match) => ({
      type: 'model_signal' as const,
      value: match.term,
      weight: match.weight,
    })),
  ];

  let confidence =
    SCORING_WEIGHTS.base +
    strongMatches.length * SCORING_WEIGHTS.strongTerm +
    weakMatches.length * SCORING_WEIGHTS.weakTerm +
    phraseMatches.length * SCORING_WEIGHTS.phrase;

  if (normalized.unicodeSpans.length > 0) {
    confidence += SCORING_WEIGHTS.unicodeAny;
    confidence +=
      Math.max(0, normalized.unicodeSpans.length - 1) *
      SCORING_WEIGHTS.unicodeAdditionalSpan;
    reasons.push({
      type: 'unicode',
      value: normalized.unicodeSpans[0].reason,
      weight: SCORING_WEIGHTS.unicodeAny,
    });
  }

  const clampedConfidence = clampScore(confidence);
  const label: JudolLabel =
    clampedConfidence >= threshold ? 'judol' : 'non_judol';
  const riskLevel: RiskLevel =
    clampedConfidence >= 0.85
      ? 'high'
      : clampedConfidence >= 0.65
        ? 'medium'
        : 'low';
  const action: DetectionAction =
    label === 'judol' && riskLevel === 'high'
      ? 'blur'
      : label === 'judol' && riskLevel === 'medium'
        ? 'warn'
        : 'none';
  const termHighlightRanges = [...allTermMatches, ...phraseMatches]
    .map((match) => originalRangeFromNormalized(normalized, match.start, match.end))
    .filter((range): range is HighlightRange => Boolean(range));
  const unicodeHighlightRanges: HighlightRange[] = normalized.unicodeSpans.map(
    (span) => ({
      start: span.start,
      end: span.end,
      kind: 'unicode_suspicious',
    }),
  );

  return {
    id,
    label,
    confidence: clampedConfidence,
    riskLevel,
    action,
    reasons,
    matchedTerms,
    unicodeAnalysis: {
      hasSuspiciousUnicode: normalized.unicodeSpans.length > 0,
      suspiciousCount: normalized.unicodeSpans.length,
      spans: normalized.unicodeSpans,
    },
    display: {
      snippet: normalized.originalText.slice(0, 240),
      highlightRanges: [...termHighlightRanges, ...unicodeHighlightRanges],
    },
  };
}
