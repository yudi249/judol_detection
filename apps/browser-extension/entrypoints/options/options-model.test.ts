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

    const model = buildOptionsViewModel(settings, createStats(), 'disabled');

    expect(model.detectionMode.predictionMode).toBe('api');
    expect(model.detectionMode.thresholdPercent).toBe(82);
    expect(model.researchPrivacy.maxLogs).toBe(75);
    expect(model.platforms).toContainEqual({
      key: 'telegram',
      label: 'Telegram Web',
      enabled: false,
    });
    expect(model.diagnostics).toMatchObject({
      activePlatformLabel: 'Halaman simulasi',
      scannedCountLabel: '12',
      detectedCountLabel: '3',
      unicodeCountLabel: '2',
      currentModeLabel: 'Mode API',
      lastErrorLabel: 'Tidak ada galat terbaru',
    });
    expect(model.benchmarkTelemetry).toEqual({
      enabled: false,
      otlpEndpoint: 'http://127.0.0.1:4318/v1/traces',
      runId: '',
      statusLabel: 'Telemetry benchmark nonaktif',
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

  it('builds a reset patch with telemetry disabled and fresh nested values', () => {
    const reset = buildResetSettingsPatch();

    expect(reset).toEqual(defaultExtensionSettings);
    expect(reset.benchmarkTelemetry.enabled).toBe(false);
    expect(reset.benchmarkTelemetry).not.toBe(
      defaultExtensionSettings.benchmarkTelemetry,
    );
  });

  it('describes active benchmark telemetry in Indonesian', () => {
    const model = buildOptionsViewModel(
      {
        ...defaultExtensionSettings,
        benchmarkTelemetry: {
          enabled: true,
          otlpEndpoint: 'http://localhost:4318/v1/traces',
          runId: 'benchmark-test',
        },
      },
      createStats(),
      'ready',
    );

    expect(model.benchmarkTelemetry).toEqual({
      enabled: true,
      otlpEndpoint: 'http://localhost:4318/v1/traces',
      runId: 'benchmark-test',
      statusLabel: 'Telemetry benchmark siap',
    });
  });

  it('describes exporter failure in Indonesian', () => {
    const model = buildOptionsViewModel(
      {
        ...defaultExtensionSettings,
        benchmarkTelemetry: {
          ...defaultExtensionSettings.benchmarkTelemetry,
          enabled: true,
        },
      },
      createStats(),
      'export-failed',
    );

    expect(model.benchmarkTelemetry.statusLabel).toBe(
      'Ekspor telemetry benchmark gagal',
    );
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
