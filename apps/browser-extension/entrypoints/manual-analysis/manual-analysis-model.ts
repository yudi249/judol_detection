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
      ? 'Jalankan analisis untuk memeriksa teks ini.'
      : 'Tempel atau pilih teks untuk dianalisis.',
    sourcePlatform: formatPlatform(state.sourcePlatform),
    analyzedAt: state.analyzedAt
      ? new Date(state.analyzedAt).toLocaleString('id-ID')
      : '-',
    result: result
      ? {
          label: formatLabel(result.label),
          confidence: formatManualConfidence(result.confidence),
          risk: formatManualRisk(result.riskLevel),
          action: formatAction(result.action),
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
  const labels: Record<RiskLevel, string> = {
    high: 'TINGGI',
    medium: 'SEDANG',
    low: 'RENDAH',
  };

  return labels[risk];
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
  const typeLabels: Record<DetectionReason['type'], string> = {
    keyword: 'Kata kunci',
    unicode: 'Unicode',
    model_signal: 'Sinyal model',
  };

  return {
    label: `${typeLabels[reason.type]}: ${reason.value}`,
    weight: reason.weight.toFixed(2),
  };
}

function formatPlatform(platform: ManualAnalysisState['sourcePlatform']): string {
  const labels: Record<ManualAnalysisState['sourcePlatform'], string> = {
    youtube: 'YouTube',
    telegram: 'Telegram Web',
    x: 'X/Twitter',
    simulation: 'Halaman simulasi',
    unknown: 'Tidak dikenal',
  };

  return labels[platform];
}

function formatLabel(label: 'judol' | 'non_judol'): string {
  return label === 'judol' ? 'JUDOL' : 'BUKAN JUDOL';
}

function formatAction(action: 'blur' | 'warn' | 'hide' | 'none'): string {
  const labels = {
    blur: 'Buram',
    warn: 'Peringatan',
    hide: 'Sembunyikan',
    none: 'Tidak ada',
  } as const;

  return labels[action];
}
