import type {
  DetectionLog,
  ExtensionSettings,
  SessionStats,
} from '../../src/shared';

export type PopupStatusKind =
  | 'active'
  | 'detected'
  | 'disabled'
  | 'unsupported'
  | 'error';

export type PopupViewModel = {
  status: {
    kind: PopupStatusKind;
    label: string;
    description: string;
  };
  platformLabel: string;
  modeLabel: string;
  controls: {
    pageProtectionEnabled: boolean;
    autoBlurEnabled: boolean;
    unicodeHighlightEnabled: boolean;
  };
  metrics: Array<{
    label: 'Scanned' | 'Detected' | 'Unicode' | 'Last';
    value: string;
    tone: 'scan' | 'detected' | 'unicode' | 'neutral';
  }>;
  recentDetection:
    | {
        kind: 'empty';
        title: string;
        description: string;
      }
    | {
        kind: 'detected';
        riskLabel: string;
        confidenceLabel: string;
        snippet: string;
        matchedTerms: string[];
        unicodeLabel: string;
      };
};

export function buildPopupViewModel(
  settings: ExtensionSettings,
  stats: SessionStats,
  logs: DetectionLog[],
): PopupViewModel {
  const pageProtectionEnabled = settings.censorMode !== 'none';
  const recentLog = logs[0];

  return {
    status: buildStatus(settings, stats, recentLog),
    platformLabel: formatPlatform(stats.activePlatform),
    modeLabel: `${capitalize(settings.predictionMode)} mode`,
    controls: {
      pageProtectionEnabled,
      autoBlurEnabled: settings.autoBlur,
      unicodeHighlightEnabled: settings.highlightUnicode,
    },
    metrics: [
      { label: 'Scanned', value: formatCount(stats.scannedCount), tone: 'scan' },
      {
        label: 'Detected',
        value: formatCount(stats.detectedCount),
        tone: 'detected',
      },
      {
        label: 'Unicode',
        value: formatCount(stats.unicodeSuspiciousCount),
        tone: 'unicode',
      },
      {
        label: 'Last',
        value:
          stats.lastScanTimeMs === undefined ? '-' : `${stats.lastScanTimeMs} ms`,
        tone: 'neutral',
      },
    ],
    recentDetection: recentLog
      ? {
          kind: 'detected',
          riskLabel: recentLog.riskLevel.toUpperCase(),
          confidenceLabel: recentLog.confidence.toFixed(2),
          snippet: recentLog.snippet,
          matchedTerms: recentLog.matchedTerms,
          unicodeLabel: `${recentLog.unicodeAnalysis.suspiciousCount} Unicode spans`,
        }
      : {
          kind: 'empty',
          title: 'Belum ada deteksi',
          description:
            'Popup akan menampilkan evidence terbaru setelah scanner aktif.',
        },
  };
}

export function getPageProtectionPatch(enabled: boolean): Partial<ExtensionSettings> {
  return enabled
    ? { censorMode: 'blur', autoBlur: true }
    : { censorMode: 'none', autoBlur: false };
}

function buildStatus(
  settings: ExtensionSettings,
  stats: SessionStats,
  recentLog?: DetectionLog,
): PopupViewModel['status'] {
  if (stats.lastError || stats.protectionStatus === 'error') {
    return {
      kind: 'error',
      label: 'Error',
      description: stats.lastError?.message ?? 'Status proteksi bermasalah',
    };
  }

  if (settings.censorMode === 'none' || stats.protectionStatus === 'disabled') {
    return {
      kind: 'disabled',
      label: 'Nonaktif',
      description: 'Proteksi halaman dimatikan',
    };
  }

  if (stats.protectionStatus === 'unsupported') {
    return {
      kind: 'unsupported',
      label: 'Unsupported',
      description: 'Halaman ini belum masuk scope scanning',
    };
  }

  if (recentLog && (recentLog.label === 'judol' || stats.detectedCount > 0)) {
    return {
      kind: 'detected',
      label: 'Terdeteksi',
      description: 'Evidence judol tersedia di storage',
    };
  }

  return {
    kind: 'active',
    label: 'Aktif',
    description: 'Proteksi halaman aktif',
  };
}

function formatPlatform(platform: SessionStats['activePlatform']): string {
  const labels: Record<SessionStats['activePlatform'], string> = {
    youtube: 'YouTube',
    telegram: 'Telegram Web',
    x: 'X/Twitter',
    simulation: 'Simulation',
    unknown: 'Unknown page',
  };

  return labels[platform];
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
