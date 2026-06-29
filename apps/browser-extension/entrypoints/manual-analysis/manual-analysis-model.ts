import type {
  DetectionReason,
  ManualAnalysisState,
  RiskLevel,
  UnicodeSpan,
} from '../../src/shared';

export type ManualAnalysisViewModel = {
  inputText: string;
  hasResult: boolean;
  canAnalyze: boolean;
  canSave: boolean;
  emptyMessage: string;
  sourcePlatform: string;
  analyzedAt: string;
  result?: {
    label: string;
    confidence: string;
    risk: string;
    action: string;
    matchedTerms: string[];
    unicodeRows: UnicodeEvidenceRow[];
    reasonRows: ReasonRow[];
    snippet: string;
    modelLabel: string;
    requestId: string;
  };
};

export type UnicodeEvidenceRow = {
  char: string;
  normalizedAs: string;
  reason: string;
  unicodeName: string;
};

export type ReasonRow = {
  label: string;
  weight: string;
};

export function buildManualAnalysisViewModel(
  state: ManualAnalysisState,
): ManualAnalysisViewModel {
  const inputText = state.inputText;
  const result = state.result;

  return {
    inputText,
    hasResult: Boolean(result),
    canAnalyze: inputText.trim().length > 0,
    canSave: Boolean(result),
    emptyMessage: inputText.trim()
      ? 'Run analysis to inspect this text.'
      : 'Paste or select text to analyze.',
    sourcePlatform: formatPlatform(state.sourcePlatform),
    analyzedAt: state.analyzedAt
      ? new Date(state.analyzedAt).toLocaleString()
      : '-',
    result: result
      ? {
          label: result.label.toUpperCase(),
          confidence: formatManualConfidence(result.confidence),
          risk: formatManualRisk(result.riskLevel),
          action: result.action,
          matchedTerms: result.matchedTerms,
          unicodeRows: result.unicodeAnalysis.spans.map(formatUnicodeSpan),
          reasonRows: result.reasons.map(formatReason),
          snippet: result.display.snippet,
          modelLabel: state.model
            ? `${state.model.name} ${state.model.version}`
            : '-',
          requestId: state.requestId ?? '-',
        }
      : undefined,
  };
}

export function formatManualConfidence(confidence: number): string {
  return confidence.toFixed(2);
}

export function formatManualRisk(risk: RiskLevel): string {
  return risk.toUpperCase();
}

function formatUnicodeSpan(span: UnicodeSpan): UnicodeEvidenceRow {
  return {
    char: span.char,
    normalizedAs: span.normalizedAs ?? '-',
    reason: span.reason,
    unicodeName: span.unicodeName ?? '-',
  };
}

function formatReason(reason: DetectionReason): ReasonRow {
  return {
    label: `${reason.type}: ${reason.value}`,
    weight: reason.weight.toFixed(2),
  };
}

function formatPlatform(platform: ManualAnalysisState['sourcePlatform']): string {
  const labels: Record<ManualAnalysisState['sourcePlatform'], string> = {
    youtube: 'YouTube',
    telegram: 'Telegram Web',
    x: 'X/Twitter',
    simulation: 'Simulation',
    unknown: 'Unknown',
  };

  return labels[platform];
}
