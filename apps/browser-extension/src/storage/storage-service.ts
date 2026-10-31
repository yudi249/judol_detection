import { storage } from 'wxt/utils/storage';
import {
  STORAGE_KEYS,
  defaultExtensionSettings,
  type DetectionLog,
  type ExtensionSettings,
  type ExtensionSettingsPatch,
  type ExtensionStorageSchema,
  type ManualAnalysisState,
  type SessionStats,
  type StorageKey,
} from '../shared';
import {
  createBenchmarkRunId,
  validateOtlpTraceEndpoint,
} from '../telemetry/telemetry-settings';

const MAX_LOG_SNIPPET_LENGTH = 240;
const MAX_MANUAL_INPUT_LENGTH = 2000;

export type StorageArea = {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export function toLocalStorageItemKey(key: StorageKey): `local:${StorageKey}` {
  return `local:${key}`;
}

export const extensionStorageArea: StorageArea = {
  getItem: <T>(key: string) => storage.getItem<T>(toLocalStorageItemKey(key as StorageKey)),
  setItem: <T>(key: string, value: T) =>
    storage.setItem(toLocalStorageItemKey(key as StorageKey), value),
  removeItem: (key: string) => storage.removeItem(toLocalStorageItemKey(key as StorageKey)),
};

export async function getExtensionSettings(
  area: StorageArea = extensionStorageArea,
): Promise<ExtensionSettings> {
  const stored = await area.getItem<ExtensionSettings>(STORAGE_KEYS.settings);

  return {
    ...defaultExtensionSettings,
    ...stored,
    platformScope: {
      ...defaultExtensionSettings.platformScope,
      ...stored?.platformScope,
    },
    benchmarkTelemetry: {
      ...defaultExtensionSettings.benchmarkTelemetry,
      ...stored?.benchmarkTelemetry,
    },
  };
}

export async function updateExtensionSettings(
  patch: ExtensionSettingsPatch,
  area: StorageArea = extensionStorageArea,
): Promise<ExtensionSettings> {
  const current = await getExtensionSettings(area);
  const benchmarkTelemetry = {
    ...current.benchmarkTelemetry,
    ...patch.benchmarkTelemetry,
  };

  benchmarkTelemetry.otlpEndpoint = validateOtlpTraceEndpoint(
    benchmarkTelemetry.otlpEndpoint,
  );
  if (benchmarkTelemetry.enabled && benchmarkTelemetry.runId === '') {
    benchmarkTelemetry.runId = createBenchmarkRunId();
  }

  const updated: ExtensionSettings = {
    ...current,
    ...patch,
    platformScope: {
      ...current.platformScope,
      ...patch.platformScope,
    },
    benchmarkTelemetry,
    schemaVersion: 1,
  };

  await area.setItem(STORAGE_KEYS.settings, updated);

  return updated;
}

export async function getSessionStats(
  area: StorageArea = extensionStorageArea,
): Promise<SessionStats> {
  const stored = await area.getItem<SessionStats>(STORAGE_KEYS.sessionStats);

  if (stored) {
    return stored;
  }

  const settings = await getExtensionSettings(area);
  const created = createDefaultSessionStats(settings.predictionMode);
  await area.setItem(STORAGE_KEYS.sessionStats, created);

  return created;
}

export async function updateSessionStats(
  patch: Partial<SessionStats>,
  area: StorageArea = extensionStorageArea,
): Promise<SessionStats> {
  const [current, settings] = await Promise.all([
    getSessionStats(area),
    getExtensionSettings(area),
  ]);
  const updated: SessionStats = {
    ...current,
    ...patch,
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
  };

  if (!settings.storeSourceUrl) {
    delete updated.activeUrl;
  }

  await area.setItem(STORAGE_KEYS.sessionStats, updated);

  return updated;
}

export async function getDetectionLogs(
  area: StorageArea = extensionStorageArea,
): Promise<DetectionLog[]> {
  return (await area.getItem<DetectionLog[]>(STORAGE_KEYS.detectionLogs)) ?? [];
}

export async function appendDetectionLogs(
  newLogs: DetectionLog[],
  area: StorageArea = extensionStorageArea,
): Promise<DetectionLog[]> {
  const [current, settings] = await Promise.all([
    getDetectionLogs(area),
    getExtensionSettings(area),
  ]);
  const sanitizedLogs = newLogs.map((log) => sanitizeDetectionLog(log, settings));
  const updated = [...sanitizedLogs.reverse(), ...current].slice(0, settings.maxLogs);

  await area.setItem(STORAGE_KEYS.detectionLogs, updated);

  return updated;
}

export async function clearDetectionLogs(
  area: StorageArea = extensionStorageArea,
): Promise<void> {
  await area.setItem<ExtensionStorageSchema[typeof STORAGE_KEYS.detectionLogs]>(
    STORAGE_KEYS.detectionLogs,
    [],
  );
}

export async function getManualAnalysisState(
  area: StorageArea = extensionStorageArea,
): Promise<ManualAnalysisState> {
  return (
    (await area.getItem<ManualAnalysisState>(STORAGE_KEYS.manualLastAnalysis)) ??
    createDefaultManualAnalysisState()
  );
}

export async function setManualAnalysisState(
  state: ManualAnalysisState,
  area: StorageArea = extensionStorageArea,
): Promise<ManualAnalysisState> {
  const settings = await getExtensionSettings(area);
  const sanitized: ManualAnalysisState = {
    ...state,
    schemaVersion: 1,
    inputText: boundText(state.inputText, MAX_MANUAL_INPUT_LENGTH),
  };

  if (!settings.storeSourceUrl) {
    delete sanitized.sourceUrl;
  }

  await area.setItem(STORAGE_KEYS.manualLastAnalysis, sanitized);

  return sanitized;
}

export async function clearManualAnalysisState(
  area: StorageArea = extensionStorageArea,
): Promise<void> {
  await area.setItem(STORAGE_KEYS.manualLastAnalysis, createDefaultManualAnalysisState());
}

function createDefaultSessionStats(
  predictionMode: ExtensionSettings['predictionMode'],
): SessionStats {
  const now = new Date().toISOString();

  return {
    schemaVersion: 1,
    sessionId: `session-${crypto.randomUUID()}`,
    startedAt: now,
    updatedAt: now,
    protectionStatus: 'active',
    activePlatform: 'unknown',
    predictionMode,
    scannedCount: 0,
    detectedCount: 0,
    unicodeSuspiciousCount: 0,
  };
}

function createDefaultManualAnalysisState(): ManualAnalysisState {
  return {
    schemaVersion: 1,
    inputText: '',
    sourcePlatform: 'unknown',
  };
}

function sanitizeDetectionLog(
  log: DetectionLog,
  settings: ExtensionSettings,
): DetectionLog {
  const sanitized: DetectionLog = {
    ...log,
    snippet: boundText(log.snippet, MAX_LOG_SNIPPET_LENGTH),
  };

  if (!settings.storeSourceUrl) {
    delete sanitized.sourceUrl;
  }

  return sanitized;
}

function boundText(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : text.slice(0, maxLength);
}
