import {
  defaultExtensionSettings,
  type ExtensionSettings,
  type PlatformScope,
  type SessionStats,
} from '../../src/shared';

export type PlatformOption = {
  key: keyof PlatformScope;
  label: string;
  enabled: boolean;
};

export type OptionsViewModel = {
  detectionMode: {
    predictionMode: ExtensionSettings['predictionMode'];
    apiEndpoint: string;
    thresholdPercent: number;
    censorMode: ExtensionSettings['censorMode'];
  };
  protection: {
    autoBlur: boolean;
    highlightUnicode: boolean;
  };
  platforms: PlatformOption[];
  researchPrivacy: {
    maxLogs: number;
    storeBoundedEvidence: boolean;
    storeSourceUrl: boolean;
  };
  diagnostics: {
    activePlatformLabel: string;
    scannedCountLabel: string;
    detectedCountLabel: string;
    unicodeCountLabel: string;
    currentModeLabel: string;
    lastErrorLabel: string;
  };
};

const PLATFORM_LABELS: Record<keyof PlatformScope, string> = {
  youtube: 'YouTube',
  telegram: 'Telegram Web',
  x: 'X/Twitter',
  simulation: 'Simulation',
  otherSites: 'Other sites',
};

const SESSION_PLATFORM_LABELS: Record<SessionStats['activePlatform'], string> = {
  youtube: 'YouTube',
  telegram: 'Telegram Web',
  x: 'X/Twitter',
  simulation: 'Simulation',
  unknown: 'Unknown page',
};

export function buildOptionsViewModel(
  settings: ExtensionSettings,
  stats: SessionStats,
): OptionsViewModel {
  return {
    detectionMode: {
      predictionMode: settings.predictionMode,
      apiEndpoint: settings.apiEndpoint,
      thresholdPercent: Math.round(settings.threshold * 100),
      censorMode: settings.censorMode,
    },
    protection: {
      autoBlur: settings.autoBlur,
      highlightUnicode: settings.highlightUnicode,
    },
    platforms: (Object.keys(PLATFORM_LABELS) as Array<keyof PlatformScope>).map(
      (key) => ({
        key,
        label: PLATFORM_LABELS[key],
        enabled: settings.platformScope[key],
      }),
    ),
    researchPrivacy: {
      maxLogs: settings.maxLogs,
      storeBoundedEvidence: settings.storeBoundedEvidence,
      storeSourceUrl: settings.storeSourceUrl,
    },
    diagnostics: {
      activePlatformLabel: SESSION_PLATFORM_LABELS[stats.activePlatform],
      scannedCountLabel: formatCount(stats.scannedCount),
      detectedCountLabel: formatCount(stats.detectedCount),
      unicodeCountLabel: formatCount(stats.unicodeSuspiciousCount),
      currentModeLabel: `${formatPredictionMode(settings.predictionMode)} mode`,
      lastErrorLabel: stats.lastError?.message ?? 'No recent error',
    },
  };
}

export function createThresholdPatch(percent: number): Partial<ExtensionSettings> {
  return {
    threshold: clamp(Math.round(percent), 10, 99) / 100,
  };
}

export function createMaxLogsPatch(value: string): Partial<ExtensionSettings> {
  const parsed = Number.parseInt(value, 10);
  return {
    maxLogs: clamp(Number.isNaN(parsed) ? defaultExtensionSettings.maxLogs : parsed, 10, 1000),
  };
}

export function buildResetSettingsPatch(): ExtensionSettings {
  return {
    ...defaultExtensionSettings,
    platformScope: {
      ...defaultExtensionSettings.platformScope,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatPredictionMode(value: ExtensionSettings['predictionMode']): string {
  return value === 'api' ? 'API' : 'Mock';
}
