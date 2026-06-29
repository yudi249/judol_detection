import { describe, expect, it } from 'vitest';
import {
  defaultExtensionSettings,
  type ExtensionSettings,
  type SessionStats,
} from '../../src/shared';
import {
  buildOptionsViewModel,
  buildResetSettingsPatch,
  createMaxLogsPatch,
  createThresholdPatch,
} from './options-model';

describe('options model', () => {
  it('builds form state and diagnostics from settings and stats', () => {
    const settings: ExtensionSettings = {
      ...defaultExtensionSettings,
      predictionMode: 'api',
      threshold: 0.82,
      maxLogs: 75,
      platformScope: {
        ...defaultExtensionSettings.platformScope,
        telegram: false,
      },
    };

    const model = buildOptionsViewModel(settings, createStats());

    expect(model.detectionMode.predictionMode).toBe('api');
    expect(model.detectionMode.thresholdPercent).toBe(82);
    expect(model.researchPrivacy.maxLogs).toBe(75);
    expect(model.platforms).toContainEqual({
      key: 'telegram',
      label: 'Telegram Web',
      enabled: false,
    });
    expect(model.diagnostics).toMatchObject({
      activePlatformLabel: 'Simulation',
      scannedCountLabel: '12',
      detectedCountLabel: '3',
      unicodeCountLabel: '2',
      currentModeLabel: 'API mode',
      lastErrorLabel: 'No recent error',
    });
  });

  it('creates bounded settings patches for numeric controls', () => {
    expect(createThresholdPatch(91)).toEqual({ threshold: 0.91 });
    expect(createThresholdPatch(8)).toEqual({ threshold: 0.1 });
    expect(createThresholdPatch(120)).toEqual({ threshold: 0.99 });
    expect(createMaxLogsPatch('500')).toEqual({ maxLogs: 500 });
    expect(createMaxLogsPatch('4')).toEqual({ maxLogs: 10 });
    expect(createMaxLogsPatch('1200')).toEqual({ maxLogs: 1000 });
  });

  it('builds a reset patch from default settings', () => {
    expect(buildResetSettingsPatch()).toEqual(defaultExtensionSettings);
  });
});

function createStats(): SessionStats {
  return {
    schemaVersion: 1,
    sessionId: 'session-test',
    startedAt: '2026-06-29T10:00:00.000Z',
    updatedAt: '2026-06-29T10:01:00.000Z',
    protectionStatus: 'active',
    activePlatform: 'simulation',
    predictionMode: 'api',
    scannedCount: 12,
    detectedCount: 3,
    unicodeSuspiciousCount: 2,
  };
}
