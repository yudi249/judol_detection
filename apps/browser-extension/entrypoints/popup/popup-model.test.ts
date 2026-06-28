import { describe, expect, it } from 'vitest';
import {
  defaultExtensionSettings,
  type DetectionLog,
  type ExtensionSettings,
  type SessionStats,
} from '../../src/shared';
import {
  buildPopupViewModel,
  getPageProtectionPatch,
} from './popup-model';

function createStats(patch: Partial<SessionStats> = {}): SessionStats {
  return {
    schemaVersion: 1,
    sessionId: 'session-test',
    startedAt: '2026-06-29T00:00:00.000Z',
    updatedAt: '2026-06-29T00:00:01.000Z',
    protectionStatus: 'active',
    activePlatform: 'unknown',
    predictionMode: 'mock',
    scannedCount: 0,
    detectedCount: 0,
    unicodeSuspiciousCount: 0,
    ...patch,
  };
}

function createLog(patch: Partial<DetectionLog> = {}): DetectionLog {
  return {
    id: 'log-1',
    timestamp: '2026-06-29T00:00:02.000Z',
    platform: 'simulation',
    snippet: 'b\u03BFnus sl\u03BFt gacor malam ini',
    label: 'judol',
    confidence: 0.94,
    riskLevel: 'high',
    action: 'blur',
    matchedTerms: ['bonus', 'slot', 'gacor'],
    unicodeAnalysis: {
      hasSuspiciousUnicode: true,
      suspiciousCount: 2,
      spans: [
        {
          start: 1,
          end: 2,
          char: '\u03BF',
          reason: 'homoglyph',
          normalizedAs: 'o',
        },
      ],
    },
    model: {
      name: 'judollens-mock',
      version: '0.1.0',
      architecture: 'rule-based',
      isMock: true,
    },
    ...patch,
  };
}

describe('popup view model', () => {
  it('builds the default active clean state from settings, stats, and empty logs', () => {
    const model = buildPopupViewModel(
      defaultExtensionSettings,
      createStats(),
      [],
    );

    expect(model.status).toEqual({
      kind: 'active',
      label: 'Aktif',
      description: 'Proteksi halaman aktif',
    });
    expect(model.platformLabel).toBe('Unknown page');
    expect(model.modeLabel).toBe('Mock mode');
    expect(model.controls.pageProtectionEnabled).toBe(true);
    expect(model.controls.autoBlurEnabled).toBe(true);
    expect(model.controls.unicodeHighlightEnabled).toBe(true);
    expect(model.metrics).toEqual([
      { label: 'Scanned', value: '0', tone: 'scan' },
      { label: 'Detected', value: '0', tone: 'detected' },
      { label: 'Unicode', value: '0', tone: 'unicode' },
      { label: 'Last', value: '-', tone: 'neutral' },
    ]);
    expect(model.recentDetection).toEqual({
      kind: 'empty',
      title: 'Belum ada deteksi',
      description: 'Popup akan menampilkan evidence terbaru setelah scanner aktif.',
    });
  });

  it('formats the newest high-risk recent detection with confidence and Unicode evidence', () => {
    const model = buildPopupViewModel(
      defaultExtensionSettings,
      createStats({
        activePlatform: 'simulation',
        scannedCount: 128,
        detectedCount: 7,
        unicodeSuspiciousCount: 3,
        lastScanTimeMs: 18,
      }),
      [createLog()],
    );

    expect(model.status.kind).toBe('detected');
    expect(model.platformLabel).toBe('Simulation');
    expect(model.metrics.map((metric) => metric.value)).toEqual([
      '128',
      '7',
      '3',
      '18 ms',
    ]);
    expect(model.recentDetection).toEqual({
      kind: 'detected',
      riskLabel: 'HIGH',
      confidenceLabel: '0.94',
      snippet: 'b\u03BFnus sl\u03BFt gacor malam ini',
      matchedTerms: ['bonus', 'slot', 'gacor'],
      unicodeLabel: '2 Unicode spans',
    });
  });

  it('marks popup disabled when censor mode is none', () => {
    const settings: ExtensionSettings = {
      ...defaultExtensionSettings,
      censorMode: 'none',
      autoBlur: false,
    };

    const model = buildPopupViewModel(settings, createStats(), []);

    expect(model.status.kind).toBe('disabled');
    expect(model.status.label).toBe('Nonaktif');
    expect(model.controls.pageProtectionEnabled).toBe(false);
    expect(model.controls.autoBlurEnabled).toBe(false);
  });

  it('surfaces a compact error state from session stats', () => {
    const model = buildPopupViewModel(
      defaultExtensionSettings,
      createStats({
        protectionStatus: 'error',
        lastError: {
          code: 'api_unreachable',
          message: 'API tidak bisa dihubungi',
          occurredAt: '2026-06-29T00:00:03.000Z',
        },
      }),
      [],
    );

    expect(model.status).toEqual({
      kind: 'error',
      label: 'Error',
      description: 'API tidak bisa dihubungi',
    });
  });

  it('maps page protection toggle to the storage settings patch', () => {
    expect(getPageProtectionPatch(false)).toEqual({
      censorMode: 'none',
      autoBlur: false,
    });
    expect(getPageProtectionPatch(true)).toEqual({
      censorMode: 'blur',
      autoBlur: true,
    });
  });
});
