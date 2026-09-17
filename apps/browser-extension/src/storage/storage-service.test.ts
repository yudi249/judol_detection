import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEYS,
  defaultExtensionSettings,
  type DetectionLog,
  type ExtensionStorageSchema,
} from '../shared';
import {
  appendDetectionLogs,
  clearDetectionLogs,
  clearManualAnalysisState,
  getDetectionLogs,
  getExtensionSettings,
  getManualAnalysisState,
  getSessionStats,
  setManualAnalysisState,
  updateExtensionSettings,
  updateSessionStats,
  type StorageArea,
} from './storage-service';

class MemoryStorageArea implements StorageArea {
  private readonly values = new Map<string, unknown>();

  async getItem<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T | undefined) ?? null;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }

  peek<K extends keyof ExtensionStorageSchema>(
    key: K,
  ): ExtensionStorageSchema[K] | undefined {
    return this.values.get(key) as ExtensionStorageSchema[K] | undefined;
  }
}

function createLog(id: string, snippet = `snippet ${id}`): DetectionLog {
  return {
    id,
    timestamp: `2026-06-29T10:00:0${id}Z`,
    platform: 'simulation',
    sourceUrl: `https://example.test/${id}`,
    snippet,
    label: 'judol',
    confidence: 0.91,
    riskLevel: 'high',
    action: 'blur',
    matchedTerms: ['slot'],
    unicodeAnalysis: {
      hasSuspiciousUnicode: false,
      suspiciousCount: 0,
      spans: [],
    },
    model: {
      name: 'mock',
      version: '0.1.0',
      architecture: 'rule-based',
      isMock: true,
    },
  };
}

describe('extension storage service', () => {
  it('reads default settings when storage is empty and persists merged updates', async () => {
    const area = new MemoryStorageArea();

    await expect(getExtensionSettings(area)).resolves.toEqual(
      defaultExtensionSettings,
    );

    const updated = await updateExtensionSettings(
      { autoBlur: false, threshold: 0.8 },
      area,
    );

    expect(updated).toEqual({
      ...defaultExtensionSettings,
      autoBlur: false,
      threshold: 0.8,
    });
    expect(area.peek(STORAGE_KEYS.settings)).toEqual(updated);
  });
  it('retains a persisted master protection setting when merging updates', async () => {
    const area = new MemoryStorageArea();

    const updated = await updateExtensionSettings(
      { protectionEnabled: false },
      area,
    );

    expect(updated.protectionEnabled).toBe(false);
    await expect(getExtensionSettings(area)).resolves.toMatchObject({
      protectionEnabled: false,
    });
  });

  it('creates session stats defaults and omits activeUrl when source URL storage is disabled', async () => {
    const area = new MemoryStorageArea();
    await updateExtensionSettings({ predictionMode: 'api' }, area);

    const initial = await getSessionStats(area);

    expect(initial).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        protectionStatus: 'active',
        activePlatform: 'unknown',
        predictionMode: 'api',
        scannedCount: 0,
        detectedCount: 0,
        unicodeSuspiciousCount: 0,
      }),
    );
    expect(initial.sessionId).toMatch(/^session-/);
    expect(initial.activeUrl).toBeUndefined();

    const updated = await updateSessionStats(
      { activePlatform: 'simulation', activeUrl: 'https://example.test/feed' },
      area,
    );

    expect(updated.activePlatform).toBe('simulation');
    expect(updated.activeUrl).toBeUndefined();
    expect(area.peek(STORAGE_KEYS.sessionStats)?.activeUrl).toBeUndefined();
  });

  it('stores newest detection logs first, bounds snippets, trims maxLogs, and respects sourceUrl privacy', async () => {
    const area = new MemoryStorageArea();
    await updateExtensionSettings({ maxLogs: 2, storeSourceUrl: false }, area);

    const longSnippet = 'x'.repeat(300);
    const logs = await appendDetectionLogs(
      [createLog('1', longSnippet), createLog('2'), createLog('3')],
      area,
    );

    expect(logs.map((log) => log.id)).toEqual(['3', '2']);
    expect(logs.every((log) => log.sourceUrl === undefined)).toBe(true);
    expect(logs.find((log) => log.id === '1')).toBeUndefined();

    await appendDetectionLogs([createLog('4', longSnippet)], area);
    const stored = await getDetectionLogs(area);

    expect(stored.map((log) => log.id)).toEqual(['4', '3']);
    expect(stored[0].snippet).toHaveLength(240);
    expect(stored[0].sourceUrl).toBeUndefined();
  });

  it('clears detection logs', async () => {
    const area = new MemoryStorageArea();

    await appendDetectionLogs([createLog('1')], area);
    await clearDetectionLogs(area);

    await expect(getDetectionLogs(area)).resolves.toEqual([]);
  });

  it('limits manual analysis text, applies source URL privacy, and clears state', async () => {
    const area = new MemoryStorageArea();
    const inputText = 'a'.repeat(2500);

    const saved = await setManualAnalysisState(
      {
        schemaVersion: 1,
        inputText,
        sourcePlatform: 'simulation',
        sourceUrl: 'https://example.test/manual',
      },
      area,
    );

    expect(saved.inputText).toHaveLength(2000);
    expect(saved.sourceUrl).toBeUndefined();

    await clearManualAnalysisState(area);

    await expect(getManualAnalysisState(area)).resolves.toEqual({
      schemaVersion: 1,
      inputText: '',
      sourcePlatform: 'unknown',
    });
  });
});
