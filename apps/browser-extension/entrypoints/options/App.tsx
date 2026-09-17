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
  const [statusMessage, setStatusMessage] = useState('Memuat pengaturan');

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
    setStatusMessage('Pengaturan dimuat');
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
    setStatusMessage('Pengaturan disimpan');
  }

  if (isLoading || !data || !model) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-950">
        <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-lg border bg-white p-5 shadow-sm">
          <ActivityIcon aria-hidden="true" className="size-5 animate-spin" />
          <span>Memuat pengaturan JudolLens</span>
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
              Pengaturan JudolLens
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Atur perilaku perlindungan dan penyimpanan bukti riset.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{statusMessage}</Badge>
            <Button
              onClick={() => void patchSettings(buildResetSettingsPatch())}
              variant="outline"
            >
              <RotateCcwIcon aria-hidden="true" className="size-4" />
              Pulihkan bawaan
            </Button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="flex flex-col gap-5">
            <Panel title="Mode deteksi" icon={SettingsIcon}>
              <Field label="Mode prediksi">
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
                      <SelectItem value="mock">Tiruan</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Endpoint API">
                <Input
                  aria-label="API endpoint"
                  value={model.detectionMode.apiEndpoint}
                  onChange={(event) =>
                    void patchSettings({ apiEndpoint: event.target.value })
                  }
                />
              </Field>
              <Field label={`Ambang ${model.detectionMode.thresholdPercent}%`}>
                <div className="flex items-center gap-3">
                  <Slider
                    aria-label="Ambang keyakinan"
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
                    aria-label="Persentase ambang"
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
              <Field label="Mode sensor">
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
                      <SelectItem value="blur">Buram</SelectItem>
                      <SelectItem value="warn">Peringatan</SelectItem>
                      <SelectItem value="hide">Sembunyikan</SelectItem>
                      <SelectItem value="none">Tidak ada</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-600">
                Pemeriksaan kesehatan API tersedia pada tahap backend berikutnya.
              </div>
            </Panel>

            <Panel title="Perilaku perlindungan" icon={ShieldCheckIcon}>
              <SwitchRow
                checked={model.protection.autoBlur}
                label="Buram otomatis"
                onCheckedChange={(checked) =>
                  void patchSettings({ autoBlur: checked })
                }
              />
              <SwitchRow
                checked={model.protection.highlightUnicode}
                label="Sorot Unicode"
                onCheckedChange={(checked) =>
                  void patchSettings({ highlightUnicode: checked })
                }
              />
            </Panel>

            <Panel title="Cakupan platform" icon={ShieldCheckIcon}>
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
            <Panel title="Riset dan privasi" icon={SaveIcon}>
              <Field label="Jumlah log maksimum">
                <Input
                  aria-label="Jumlah log maksimum"
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
                label="Simpan bukti terbatas"
                onCheckedChange={(checked) =>
                  void patchSettings({ storeBoundedEvidence: checked })
                }
              />
              <SwitchRow
                checked={model.researchPrivacy.storeSourceUrl}
                label="Simpan URL sumber"
                onCheckedChange={(checked) =>
                  void patchSettings({ storeSourceUrl: checked })
                }
              />
            </Panel>

            <Panel title="Diagnostik" icon={ActivityIcon}>
              <Metric label="Platform aktif" value={model.diagnostics.activePlatformLabel} />
              <Metric label="Dipindai" value={model.diagnostics.scannedCountLabel} />
              <Metric label="Terdeteksi" value={model.diagnostics.detectedCountLabel} />
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
