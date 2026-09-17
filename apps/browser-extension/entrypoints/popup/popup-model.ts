import type {
  DetectionLog,
  ExtensionSettings,
  SessionStats,
} from '../../src/shared';

const INDONESIAN_NUMBER_FORMATTER = new Intl.NumberFormat('id-ID');

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
    protectionEnabled: boolean;
  };
  metrics: Array<{
    label: 'Dipindai' | 'Terdeteksi' | 'Unicode' | 'Terakhir';
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
  const protectionEnabled = settings.protectionEnabled;
  const recentLog = logs[0];

  return {
    status: buildStatus(settings, stats, recentLog),
    platformLabel: formatPlatform(stats.activePlatform),
    modeLabel: settings.predictionMode === 'api' ? 'Mode API' : 'Mode tiruan',
    controls: {
      protectionEnabled,
    },
    metrics: [
      { label: 'Dipindai', value: formatCount(stats.scannedCount), tone: 'scan' },
      {
        label: 'Terdeteksi',
        value: formatCount(stats.detectedCount),
        tone: 'detected',
      },
      {
        label: 'Unicode',
        value: formatCount(stats.unicodeSuspiciousCount),
        tone: 'unicode',
      },
      {
        label: 'Terakhir',
        value:
          stats.lastScanTimeMs === undefined ? '-' : `${stats.lastScanTimeMs} ms`,
        tone: 'neutral',
      },
    ],
    recentDetection: recentLog
      ? {
          kind: 'detected',
          riskLabel:
            recentLog.riskLevel === 'high'
              ? 'TINGGI'
              : recentLog.riskLevel === 'medium'
                ? 'SEDANG'
                : 'RENDAH',
          confidenceLabel: recentLog.confidence.toFixed(2),
          snippet: recentLog.snippet,
          matchedTerms: recentLog.matchedTerms,
          unicodeLabel: `${recentLog.unicodeAnalysis.suspiciousCount} bagian Unicode mencurigakan`,
        }
      : {
          kind: 'empty',
          title: 'Belum ada deteksi',
          description:
            'Popup akan menampilkan bukti terbaru setelah pemindai aktif.',
        },
  };
}

export function getProtectionPatch(
  enabled: boolean,
): Partial<ExtensionSettings> {
  return { protectionEnabled: enabled };
}

function buildStatus(
  settings: ExtensionSettings,
  stats: SessionStats,
  recentLog?: DetectionLog,
): PopupViewModel['status'] {
  if (stats.lastError || stats.protectionStatus === 'error') {
    return {
      kind: 'error',
      label: 'Galat',
      description: stats.lastError?.message ?? 'Status proteksi bermasalah',
    };
  }

  if (!settings.protectionEnabled || stats.protectionStatus === 'disabled') {
    return {
      kind: 'disabled',
      label: 'Nonaktif',
      description: 'Proteksi halaman dimatikan',
    };
  }

  if (stats.protectionStatus === 'unsupported') {
    return {
      kind: 'unsupported',
      label: 'Tidak didukung',
      description: 'Halaman ini belum termasuk cakupan pemindaian',
    };
  }

  if (recentLog && (recentLog.label === 'judol' || stats.detectedCount > 0)) {
    return {
      kind: 'detected',
      label: 'Terdeteksi',
      description: 'Bukti judol tersedia di penyimpanan',
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
    simulation: 'Halaman simulasi',
    unknown: 'Halaman tidak dikenal',
  };

  return labels[platform];
}

function formatCount(value: number): string {
  return INDONESIAN_NUMBER_FORMATTER.format(value);
}
