import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ActivityIcon,
  AlertTriangleIcon,
  FileSearchIcon,
  FileTextIcon,
  Loader2Icon,
  SettingsIcon,
  ShieldCheckIcon,
  ShieldOffIcon,
  SparklesIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DetectionLog, ExtensionSettings, SessionStats } from '@/shared';
import {
  getDetectionLogs,
  getExtensionSettings,
  getSessionStats,
  updateExtensionSettings,
} from '@/storage';
import {
  buildPopupViewModel,
  getProtectionPatch,
  type PopupStatusKind,
} from './popup-model';

type PopupData = {
  settings: ExtensionSettings;
  stats: SessionStats;
  logs: DetectionLog[];
};

const statusTone: Record<PopupStatusKind, string> = {
  active: 'border-safe-green/40 bg-safe-green/10 text-green-200',
  detected: 'border-risk-red/45 bg-risk-red/15 text-red-100',
  disabled: 'border-muted-gray/40 bg-muted-gray/10 text-slate-300',
  unsupported: 'border-medium-orange/45 bg-medium-orange/15 text-orange-100',
  error: 'border-risk-red/45 bg-risk-red/15 text-red-100',
};

function App() {
  const [data, setData] = useState<PopupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadPopupData();
  }, []);

  const model = useMemo(() => {
    if (!data) {
      return null;
    }

    return buildPopupViewModel(data.settings, data.stats, data.logs);
  }, [data]);
  const recentLogCount = data?.logs.length ?? 0;

  async function loadPopupData() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [settings, stats, logs] = await Promise.all([
        getExtensionSettings(),
        getSessionStats(),
        getDetectionLogs(),
      ]);

      setData({ settings, stats, logs });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Storage popup tidak bisa dimuat.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function patchSettings(patch: Partial<ExtensionSettings>) {
    if (!data) {
      return;
    }

    const updated = await updateExtensionSettings(patch);
    setData({ ...data, settings: updated });
  }

  return (
    <TooltipProvider>
      <main className="dark min-h-screen w-[380px] bg-graphite-950 text-foreground">
        <section className="border-b border-white/10 bg-graphite-900 px-4 py-4">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-md border border-active-cyan/45 bg-active-cyan/10 text-active-cyan">
                <ShieldCheckIcon aria-hidden="true" className="size-4" />
              </div>
              <div>
                <h1 className="text-base font-semibold leading-none">JudolLens</h1>
                <p className="mt-1 text-xs text-muted-foreground">Dasbor perlindungan</p>
              </div>
            </div>

            <StatusBadge
              kind={model?.status.kind ?? 'disabled'}
              label={
                isLoading
                  ? 'Memuat'
                  : errorMessage
                    ? 'Galat'
                    : (model?.status.label ?? 'Tidak diketahui')
              }
            />
          </header>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{model?.platformLabel ?? 'Memuat halaman'}</span>
            <span className="text-active-cyan">{model?.modeLabel ?? '-'}</span>
          </div>
        </section>

        <section className="grid gap-4 p-4">
          {isLoading ? (
            <LoadingPanel />
          ) : errorMessage ? (
            <ErrorPanel message={errorMessage} onRetry={() => void loadPopupData()} />
          ) : model ? (
            <>
              <section className="grid gap-2">
                <SectionTitle>Perlindungan</SectionTitle>
                <ToggleRow
                  label="Aktifkan perlindungan"
                  description="Pindai dan sensor konten judol secara otomatis"
                  checked={model.controls.protectionEnabled}
                  onCheckedChange={(checked) =>
                    void patchSettings(getProtectionPatch(checked))
                  }
                />
              </section>

              <section className="grid gap-2">
                <SectionTitle>Bukti sesi</SectionTitle>
                <div className="grid grid-cols-4 gap-2">
                  {model.metrics.map((metric) => (
                    <MetricCard key={metric.label} metric={metric} />
                  ))}
                </div>
              </section>

              <section className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <SectionTitle>Deteksi terbaru</SectionTitle>
                  {model.recentDetection.kind === 'detected' ? (
                    <span className="text-xs text-muted-foreground">
                      1 dari {recentLogCount}
                    </span>
                  ) : null}
                </div>
                <RecentDetection model={model.recentDetection} />
              </section>

              <Separator className="bg-white/10" />

              <footer className="grid grid-cols-3 gap-2">
                <NavigationButton
                  icon={FileTextIcon}
                  label="Log"
                  onClick={() =>
                    void browser.tabs.create({
                      url: browser.runtime.getURL('/logs.html'),
                    })
                  }
                />
                <NavigationButton
                  icon={SettingsIcon}
                  label="Pengaturan"
                  onClick={() => void browser.runtime.openOptionsPage()}
                />
                <NavigationButton
                  icon={FileSearchIcon}
                  label="Analisis"
                  onClick={() =>
                    void browser.tabs.create({
                      url: browser.runtime.getURL('/manual-analysis.html'),
                    })
                  }
                />
              </footer>
            </>
          ) : null}
        </section>
      </main>
    </TooltipProvider>
  );
}

function StatusBadge({
  kind,
  label,
}: {
  kind: PopupStatusKind;
  label: string;
}) {
  const Icon =
    kind === 'disabled'
      ? ShieldOffIcon
      : kind === 'error'
        ? AlertTriangleIcon
        : ShieldCheckIcon;

  return (
    <Badge className={`gap-1.5 border ${statusTone[kind]}`}>
      <Icon aria-hidden="true" className="size-3" />
      {label}
    </Badge>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-300">
      {children}
    </h2>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-white/10 bg-graphite-950/70 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-100">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        aria-label={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function MetricCard({
  metric,
}: {
  metric: {
    label: string;
    value: string;
    tone: 'scan' | 'detected' | 'unicode' | 'neutral';
  };
}) {
  const toneClass = {
    scan: 'text-active-cyan',
    detected: 'text-red-300',
    unicode: 'text-unicode-amber',
    neutral: 'text-slate-100',
  }[metric.tone];

  return (
    <div className="min-h-[66px] rounded-lg border border-white/10 bg-graphite-950/70 p-2">
      <p className={`text-lg font-bold tabular-nums ${toneClass}`}>
        {metric.value}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">{metric.label}</p>
    </div>
  );
}

function RecentDetection({
  model,
}: {
  model: ReturnType<typeof buildPopupViewModel>['recentDetection'];
}) {
  if (model.kind === 'empty') {
    return (
      <article className="rounded-lg border border-safe-green/25 bg-safe-green/10 p-3">
        <div className="flex items-center gap-2 text-green-100">
          <SparklesIcon aria-hidden="true" className="size-4" />
          <p className="text-sm font-semibold">{model.title}</p>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {model.description}
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-risk-red/30 bg-risk-red/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-bold">
          <Badge className="border border-risk-red/40 bg-risk-red/15 text-red-200">
            {model.riskLabel}
          </Badge>
          <span className="tabular-nums text-slate-300">
            {model.confidenceLabel}
          </span>
        </span>
        <Badge className="border border-unicode-amber/35 bg-unicode-amber/15 text-amber-100">
          {model.unicodeLabel}
        </Badge>
      </div>
      <p className="my-3 line-clamp-2 text-sm leading-5 text-slate-100">
        &quot;{model.snippet}&quot;
      </p>
      <div className="flex flex-wrap gap-1.5">
        {model.matchedTerms.slice(0, 4).map((term) => (
          <Badge
            key={term}
            className="border border-active-blue/30 bg-active-blue/15 text-blue-100"
          >
            {term}
          </Badge>
        ))}
      </div>
    </article>
  );
}

function NavigationButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof FileTextIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="w-full border-white/15 bg-white/5 text-slate-300"
          onClick={onClick}
          variant="outline"
        >
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Buka {label}</TooltipContent>
    </Tooltip>
  );
}

function LoadingPanel() {
  return (
    <div className="flex min-h-36 items-center justify-center gap-2 rounded-lg border border-white/10 bg-graphite-950/70 text-sm text-muted-foreground">
      <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
      Memuat penyimpanan JudolLens
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-risk-red/30 bg-risk-red/10 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangleIcon aria-hidden="true" className="mt-0.5 size-4 text-red-200" />
        <div>
          <p className="text-sm font-semibold text-red-100">
            Storage popup gagal dimuat
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
      <Button onClick={onRetry} size="sm" variant="secondary">
        <ActivityIcon aria-hidden="true" className="size-4" />
        Coba lagi
      </Button>
    </div>
  );
}

export default App;
