import { describe, expect, it } from 'vitest';
import type { DetectionLog } from '../../src/shared';
import {
  buildLogsViewModel,
  filterLogs,
  formatConfidence,
  formatPlatform,
  formatRisk,
  type LogFilters,
} from './logs-model';

describe('logs model', () => {
  it('builds summaries and selects the newest log by default', () => {
    const logs = createLogs();
    const model = buildLogsViewModel(logs, emptyFilters());

    expect(model.summary).toEqual({
      totalLogs: '3',
      highRisk: '2',
      unicodeSuspicious: '1',
      latestPlatform: 'Simulation',
    });
    expect(model.rows).toHaveLength(3);
    expect(model.selectedLog?.id).toBe('log-newest');
    expect(model.emptyState).toBe(false);
  });

  it('filters by search, platform, risk, and Unicode presence', () => {
    const logs = createLogs();

    expect(filterLogs(logs, { ...emptyFilters(), query: 'praktikum' })).toHaveLength(1);
    expect(filterLogs(logs, { ...emptyFilters(), platform: 'telegram' })).toHaveLength(1);
    expect(filterLogs(logs, { ...emptyFilters(), riskLevel: 'medium' })).toHaveLength(1);
    expect(filterLogs(logs, { ...emptyFilters(), unicodeOnly: true })).toEqual([
      logs[0],
    ]);
  });

  it('formats table labels and empty states', () => {
    const model = buildLogsViewModel([], emptyFilters());

    expect(model.emptyState).toBe(true);
    expect(model.summary.totalLogs).toBe('0');
    expect(formatConfidence(0.943)).toBe('0.94');
    expect(formatPlatform('x')).toBe('X/Twitter');
    expect(formatRisk('high')).toBe('HIGH');
  });
});

function emptyFilters(): LogFilters {
  return {
    query: '',
    platform: 'all',
    riskLevel: 'all',
    unicodeOnly: false,
  };
}

function createLogs(): DetectionLog[] {
  return [
    {
      id: 'log-newest',
      timestamp: '2026-06-29T10:02:00.000Z',
      platform: 'simulation',
      snippet: 'bοnus slοt gacor deposit 10k',
      label: 'judol',
      confidence: 0.94,
      riskLevel: 'high',
      action: 'blur',
      matchedTerms: ['bonus', 'slot', 'gacor'],
      unicodeAnalysis: {
        hasSuspiciousUnicode: true,
        suspiciousCount: 4,
        spans: [
          {
            start: 1,
            end: 2,
            char: 'ο',
            reason: 'homoglyph',
            normalizedAs: 'o',
            unicodeName: 'GREEK SMALL LETTER OMICRON',
          },
        ],
      },
      model: {
        name: 'mock',
        version: '0.1.0',
        architecture: 'rule-based',
        isMock: true,
      },
      requestId: 'req-newest',
      itemId: 'item-newest',
    },
    {
      id: 'log-telegram',
      timestamp: '2026-06-29T10:01:00.000Z',
      platform: 'telegram',
      snippet: 'bonus slot gacor malam ini',
      label: 'judol',
      confidence: 0.88,
      riskLevel: 'high',
      action: 'blur',
      matchedTerms: ['bonus', 'slot'],
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
    },
    {
      id: 'log-medium',
      timestamp: '2026-06-29T10:00:00.000Z',
      platform: 'x',
      snippet: 'slot praktikum bukan promosi',
      label: 'judol',
      confidence: 0.7,
      riskLevel: 'medium',
      action: 'warn',
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
    },
  ];
}
