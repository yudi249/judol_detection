import type { DetectionLog, Platform, RiskLevel } from '../../src/shared';

export type LogFilters = {
  query: string;
  platform: Platform | 'all';
  riskLevel: RiskLevel | 'all';
  unicodeOnly: boolean;
};

export type LogRow = {
  id: string;
  timeLabel: string;
  platformLabel: string;
  riskLabel: string;
  confidenceLabel: string;
  unicodeLabel: string;
  snippet: string;
  actionLabel: string;
};

export type LogsViewModel = {
  summary: {
    totalLogs: string;
    highRisk: string;
    unicodeSuspicious: string;
    latestPlatform: string;
  };
  rows: LogRow[];
  selectedLog?: DetectionLog;
  emptyState: boolean;
};

export function buildLogsViewModel(
  logs: DetectionLog[],
  filters: LogFilters,
  selectedId?: string,
): LogsViewModel {
  const filtered = filterLogs(logs, filters);
  const selectedLog =
    filtered.find((log) => log.id === selectedId) ?? filtered[0] ?? undefined;

  return {
    summary: {
      totalLogs: formatCount(logs.length),
      highRisk: formatCount(logs.filter((log) => log.riskLevel === 'high').length),
      unicodeSuspicious: formatCount(
        logs.filter((log) => log.unicodeAnalysis.hasSuspiciousUnicode).length,
      ),
      latestPlatform: logs[0] ? formatPlatform(logs[0].platform) : '-',
    },
    rows: filtered.map(toLogRow),
    selectedLog,
    emptyState: logs.length === 0,
  };
}

export function filterLogs(
  logs: DetectionLog[],
  filters: LogFilters,
): DetectionLog[] {
  const query = filters.query.trim().toLowerCase();

  return logs.filter((log) => {
    if (filters.platform !== 'all' && log.platform !== filters.platform) {
      return false;
    }
    if (filters.riskLevel !== 'all' && log.riskLevel !== filters.riskLevel) {
      return false;
    }
    if (filters.unicodeOnly && !log.unicodeAnalysis.hasSuspiciousUnicode) {
      return false;
    }
    if (!query) {
      return true;
    }

    const haystack = [
      log.snippet,
      ...log.matchedTerms,
      log.action,
      log.riskLevel,
      log.platform,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function formatConfidence(value: number): string {
  return value.toFixed(2);
}

export function formatPlatform(platform: Platform): string {
  const labels: Record<Platform, string> = {
    youtube: 'YouTube',
    telegram: 'Telegram Web',
    x: 'X/Twitter',
    simulation: 'Simulation',
    unknown: 'Unknown',
  };

  return labels[platform];
}

export function formatRisk(riskLevel: RiskLevel): string {
  return riskLevel.toUpperCase();
}

function toLogRow(log: DetectionLog): LogRow {
  return {
    id: log.id,
    timeLabel: formatTime(log.timestamp),
    platformLabel: formatPlatform(log.platform),
    riskLabel: formatRisk(log.riskLevel),
    confidenceLabel: formatConfidence(log.confidence),
    unicodeLabel: String(log.unicodeAnalysis.suspiciousCount),
    snippet: log.snippet,
    actionLabel: log.action.toUpperCase(),
  };
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
