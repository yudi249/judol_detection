import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MESSAGE_TYPES,
  type DetectionLog,
  type ExtensionStateResponseMessage,
  type Platform,
  type RiskLevel,
} from '@/shared';
import {
  FileTextIcon,
  FilterIcon,
  ListXIcon,
  SearchIcon,
  ShieldAlertIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  buildLogsViewModel,
  formatPlatform,
  type LogFilters,
} from './logs-model';

const defaultFilters: LogFilters = {
  query: '',
  platform: 'all',
  riskLevel: 'all',
  unicodeOnly: false,
};

function App() {
  const [logs, setLogs] = useState<DetectionLog[]>([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadLogs();
  }, []);

  const model = useMemo(
    () => buildLogsViewModel(logs, filters, selectedId),
    [filters, logs, selectedId],
  );

  async function loadLogs() {
    setIsLoading(true);
    const response = (await browser.runtime.sendMessage({
      type: MESSAGE_TYPES.getExtensionState,
    })) as ExtensionStateResponseMessage;
    setLogs(response.payload.recentLogs);
    setSelectedId(response.payload.recentLogs[0]?.id);
    setIsLoading(false);
  }

  async function clearLogs() {
    const response = (await browser.runtime.sendMessage({
      type: MESSAGE_TYPES.clearDetectionLogs,
    })) as ExtensionStateResponseMessage;
    setLogs(response.payload.recentLogs);
    setSelectedId(undefined);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-normal">
              JudolLens Logs
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Review bounded detection evidence for debugging and thesis evaluation.
            </p>
          </div>
          <Button onClick={() => void clearLogs()} variant="outline">
            <ListXIcon aria-hidden="true" className="size-4" />
            Clear logs
          </Button>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <SummaryCard label="Total logs" value={model.summary.totalLogs} />
          <SummaryCard label="High risk" value={model.summary.highRisk} />
          <SummaryCard label="Unicode" value={model.summary.unicodeSuspicious} />
          <SummaryCard label="Latest platform" value={model.summary.latestPlatform} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_160px]">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Search
                <div className="relative">
                  <SearchIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400"
                  />
                  <Input
                    aria-label="Search logs"
                    className="pl-9"
                    placeholder="snippet or term"
                    value={filters.query}
                    onChange={(event) =>
                      setFilters({ ...filters, query: event.target.value })
                    }
                  />
                </div>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Platform
                <Select
                  value={filters.platform}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      platform: value as LogFilters['platform'],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All</SelectItem>
                      {(['simulation', 'youtube', 'telegram', 'x', 'unknown'] as Platform[]).map(
                        (platform) => (
                          <SelectItem key={platform} value={platform}>
                            {formatPlatform(platform)}
                          </SelectItem>
                        ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Risk
                <Select
                  value={filters.riskLevel}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      riskLevel: value as RiskLevel | 'all',
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
              <div className="flex items-end">
                <label className="flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm font-medium text-slate-700">
                  Unicode only
                  <Switch
                    aria-label="Unicode only"
                    checked={filters.unicodeOnly}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, unicodeOnly: checked })
                    }
                  />
                </label>
              </div>
            </div>

            <Separator />

            {isLoading ? (
              <EmptyState text="Loading logs" />
            ) : model.rows.length === 0 ? (
              <EmptyState text="No detection logs match the current filters" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Unicode</TableHead>
                    <TableHead>Snippet</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {model.rows.map((row) => (
                    <TableRow
                      className="cursor-pointer"
                      data-state={row.id === model.selectedLog?.id ? 'selected' : undefined}
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <TableCell>{row.timeLabel}</TableCell>
                      <TableCell>{row.platformLabel}</TableCell>
                      <TableCell>{row.label}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.riskLabel}</Badge>
                      </TableCell>
                      <TableCell>{row.confidenceLabel}</TableCell>
                      <TableCell>{row.unicodeLabel}</TableCell>
                      <TableCell className="max-w-[320px] truncate">
                        {row.snippet}
                      </TableCell>
                      <TableCell>{row.actionLabel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DetailPanel log={model.selectedLog} />
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-44 items-center justify-center gap-2 rounded-lg border border-dashed bg-slate-50 text-sm text-slate-600">
      <FilterIcon aria-hidden="true" className="size-4" />
      {text}
    </div>
  );
}

function DetailPanel({ log }: { log?: DetectionLog }) {
  if (!log) {
    return (
      <aside className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <FileTextIcon aria-hidden="true" className="size-4" />
          <p className="text-sm">Select a log row to inspect evidence.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">
          Detail Panel
        </h2>
        <Badge variant="secondary">{log.riskLevel.toUpperCase()}</Badge>
      </div>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          Snippet
        </h3>
        <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-800">
          {log.snippet}
        </p>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          Matched terms
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {log.matchedTerms.map((term) => (
            <Badge key={term} variant="outline">
              {term}
            </Badge>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          Unicode evidence
        </h3>
        <div className="mt-2 flex flex-col gap-2">
          {log.unicodeAnalysis.spans.length === 0 ? (
            <p className="text-sm text-slate-600">No suspicious Unicode spans.</p>
          ) : (
            log.unicodeAnalysis.spans.map((span, index) => (
              <div
                className="rounded-md border bg-amber-50 p-2 text-sm"
                key={`${span.start}-${span.end}-${index}`}
              >
                <strong>{span.char}</strong>
                <span className="text-slate-600">
                  {' '}
                  {span.reason}
                  {span.normalizedAs ? ` -> ${span.normalizedAs}` : ''}
                </span>
                {span.unicodeName ? (
                  <p className="mt-1 text-xs text-slate-500">{span.unicodeName}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <Separator />

      <section className="grid gap-2 text-sm text-slate-700">
        <Meta label="Model" value={`${log.model.name} ${log.model.version}`} />
        <Meta label="Architecture" value={log.model.architecture} />
        <Meta label="Request" value={log.requestId ?? '-'} />
        <Meta label="Item" value={log.itemId ?? '-'} />
      </section>

      <div className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
        <ShieldAlertIcon aria-hidden="true" className="size-4" />
        Evidence is bounded; full page text is not stored.
      </div>
    </aside>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[220px] truncate font-medium">{value}</span>
    </div>
  );
}

export default App;
