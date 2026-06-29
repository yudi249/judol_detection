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
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  defaultExtensionSettings,
  MESSAGE_TYPES,
  type ExtensionSettings,
  type ExtensionStateResponseMessage,
  type SessionStats,
} from '@/shared';
import {
  ActivityIcon,
  RotateCcwIcon,
  SaveIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  buildOptionsViewModel,
  buildResetSettingsPatch,
  createMaxLogsPatch,
  createThresholdPatch,
} from './options-model';

type OptionsData = {
  settings: ExtensionSettings;
  stats: SessionStats;
};

function App() {
  const [data, setData] = useState<OptionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Loading options');

  useEffect(() => {
    void loadState();
  }, []);

  const model = useMemo(() => {
    if (!data) {
      return null;
    }

    return buildOptionsViewModel(data.settings, data.stats);
  }, [data]);

  async function loadState() {
    setIsLoading(true);
    const response = (await browser.runtime.sendMessage({
      type: MESSAGE_TYPES.getExtensionState,
    })) as ExtensionStateResponseMessage;

    setData({
      settings: response.payload.settings,
      stats: response.payload.stats,
    });
    setStatusMessage('Options loaded');
    setIsLoading(false);
  }

  async function patchSettings(patch: Partial<ExtensionSettings>) {
    const response = (await browser.runtime.sendMessage({
      type: MESSAGE_TYPES.updateSettings,
      payload: patch,
    })) as ExtensionStateResponseMessage;

    setData({
      settings: response.payload.settings,
      stats: response.payload.stats,
    });
    setStatusMessage('Settings saved');
  }

  if (isLoading || !data || !model) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-950">
        <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-lg border bg-white p-5 shadow-sm">
          <ActivityIcon aria-hidden="true" className="size-5 animate-spin" />
          <span>Loading JudolLens options</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-normal">
              JudolLens Options
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Configure protection behavior and research evidence storage.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{statusMessage}</Badge>
            <Button
              onClick={() => void patchSettings(buildResetSettingsPatch())}
              variant="outline"
            >
              <RotateCcwIcon aria-hidden="true" className="size-4" />
              Reset defaults
            </Button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="flex flex-col gap-5">
            <Panel title="Detection Mode" icon={SettingsIcon}>
              <Field label="Prediction mode">
                <Select
                  value={model.detectionMode.predictionMode}
                  onValueChange={(value) =>
                    void patchSettings({
                      predictionMode: value as ExtensionSettings['predictionMode'],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="mock">Mock</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="API endpoint">
                <Input
                  aria-label="API endpoint"
                  value={model.detectionMode.apiEndpoint}
                  onChange={(event) =>
                    void patchSettings({ apiEndpoint: event.target.value })
                  }
                />
              </Field>
              <Field label={`Threshold ${model.detectionMode.thresholdPercent}%`}>
                <div className="flex items-center gap-3">
                  <Slider
                    aria-label="Confidence threshold"
                    className="flex-1"
                    max={99}
                    min={10}
                    step={1}
                    value={[model.detectionMode.thresholdPercent]}
                    onValueChange={([value]) =>
                      void patchSettings(createThresholdPatch(value))
                    }
                  />
                  <Input
                    aria-label="Threshold percent"
                    className="w-24"
                    max={99}
                    min={10}
                    type="number"
                    value={model.detectionMode.thresholdPercent}
                    onChange={(event) =>
                      void patchSettings(
                        createThresholdPatch(Number(event.target.value)),
                      )
                    }
                  />
                </div>
              </Field>
              <Field label="Censor mode">
                <Select
                  value={model.detectionMode.censorMode}
                  onValueChange={(value) =>
                    void patchSettings({
                      censorMode: value as ExtensionSettings['censorMode'],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="blur">Blur</SelectItem>
                      <SelectItem value="warn">Warn</SelectItem>
                      <SelectItem value="hide">Hide</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-600">
                API health check coming in a later backend milestone.
              </div>
            </Panel>

            <Panel title="Protection Behavior" icon={ShieldCheckIcon}>
              <SwitchRow
                checked={model.protection.autoBlur}
                label="Auto blur"
                onCheckedChange={(checked) =>
                  void patchSettings({ autoBlur: checked })
                }
              />
              <SwitchRow
                checked={model.protection.highlightUnicode}
                label="Highlight Unicode"
                onCheckedChange={(checked) =>
                  void patchSettings({ highlightUnicode: checked })
                }
              />
            </Panel>

            <Panel title="Platform Scope" icon={ShieldCheckIcon}>
              {model.platforms.map((platform) => (
                <SwitchRow
                  checked={platform.enabled}
                  key={platform.key}
                  label={platform.label}
                  onCheckedChange={(checked) =>
                    void patchSettings({
                      platformScope: {
                        ...data.settings.platformScope,
                        [platform.key]: checked,
                      },
                    })
                  }
                />
              ))}
            </Panel>
          </div>

          <aside className="flex flex-col gap-5">
            <Panel title="Research & Privacy" icon={SaveIcon}>
              <Field label="Max logs">
                <Input
                  aria-label="Max logs"
                  min={10}
                  max={1000}
                  type="number"
                  value={model.researchPrivacy.maxLogs}
                  onChange={(event) =>
                    void patchSettings(createMaxLogsPatch(event.target.value))
                  }
                />
              </Field>
              <SwitchRow
                checked={model.researchPrivacy.storeBoundedEvidence}
                label="Store bounded evidence"
                onCheckedChange={(checked) =>
                  void patchSettings({ storeBoundedEvidence: checked })
                }
              />
              <SwitchRow
                checked={model.researchPrivacy.storeSourceUrl}
                label="Store source URL"
                onCheckedChange={(checked) =>
                  void patchSettings({ storeSourceUrl: checked })
                }
              />
            </Panel>

            <Panel title="Diagnostics" icon={ActivityIcon}>
              <Metric label="Active platform" value={model.diagnostics.activePlatformLabel} />
              <Metric label="Scanned" value={model.diagnostics.scannedCountLabel} />
              <Metric label="Detected" value={model.diagnostics.detectedCountLabel} />
              <Metric label="Unicode" value={model.diagnostics.unicodeCountLabel} />
              <Metric label="Mode" value={model.diagnostics.currentModeLabel} />
              <Separator />
              <p className="text-sm text-slate-600">
                {model.diagnostics.lastErrorLabel}
              </p>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Panel({
  children,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  icon: typeof SettingsIcon;
  title: string;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="size-4 text-slate-500" />
        <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function SwitchRow({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border bg-slate-50 px-3 py-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <Switch
        aria-label={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}

export default App;
