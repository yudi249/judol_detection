import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  MESSAGE_TYPES,
  type ManualAnalysisResponseMessage,
  type ManualAnalysisState,
  type ManualAnalyzeResponseMessage,
  type SaveManualAnalysisResponseMessage,
} from '@/shared';
import {
  ClipboardCheckIcon,
  FileSearchIcon,
  Loader2Icon,
  SaveIcon,
  ShieldAlertIcon,
  SparklesIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { buildManualAnalysisViewModel } from './manual-analysis-model';

function App() {
  const [state, setState] = useState<ManualAnalysisState>({
    schemaVersion: 1,
    inputText: '',
    sourcePlatform: 'unknown',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Loading manual analysis');

  useEffect(() => {
    void loadManualAnalysis();
  }, []);

  const model = useMemo(() => buildManualAnalysisViewModel(state), [state]);

  async function loadManualAnalysis() {
    setIsLoading(true);
    const response = (await browser.runtime.sendMessage({
      type: MESSAGE_TYPES.getManualAnalysis,
    })) as ManualAnalysisResponseMessage;
    setState(response.payload.state);
    setStatusMessage('Manual analysis loaded');
    setIsLoading(false);
  }

  async function analyzeText() {
    if (!model.canAnalyze) {
      return;
    }

    setIsAnalyzing(true);
    const response = (await browser.runtime.sendMessage({
      type: MESSAGE_TYPES.analyzeManualText,
      payload: {
        inputText: state.inputText,
        sourcePlatform: state.sourcePlatform,
        sourceUrl: state.sourceUrl,
      },
    })) as ManualAnalyzeResponseMessage;
    setState(response.payload.state);
    setStatusMessage('Analysis complete');
    setIsAnalyzing(false);
  }

  async function saveToLogs() {
    if (!state.result) {
      return;
    }

    setIsSaving(true);
    const response = (await browser.runtime.sendMessage({
      type: MESSAGE_TYPES.saveManualAnalysis,
      payload: {
        state,
        result: state.result,
      },
    })) as SaveManualAnalysisResponseMessage;
    setState(response.payload.state);
    setStatusMessage('Saved to logs');
    setIsSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-normal">
              JudolLens Manual Analysis
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Inspect selected or pasted text with matched terms and Unicode evidence.
            </p>
          </div>
          <Badge variant="secondary">{statusMessage}</Badge>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <div className="flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileSearchIcon aria-hidden="true" className="size-4 text-slate-500" />
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">
                  Input
                </h2>
              </div>
              <Badge variant="outline">{model.sourcePlatform}</Badge>
            </div>

            <Textarea
              aria-label="Manual analysis text"
              className="min-h-56 resize-y"
              disabled={isLoading}
              placeholder="Paste suspicious text or use the JudolLens context menu from a page selection."
              value={state.inputText}
              onChange={(event) =>
                setState({
                  ...state,
                  inputText: event.target.value,
                  result: undefined,
                  analyzedAt: undefined,
                })
              }
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={!model.canAnalyze || isAnalyzing}
                onClick={() => void analyzeText()}
              >
                {isAnalyzing ? (
                  <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <SparklesIcon aria-hidden="true" className="size-4" />
                )}
                Analyze
              </Button>
              <Button
                disabled={!model.canSave || isSaving}
                onClick={() => void saveToLogs()}
                variant="outline"
              >
                {isSaving ? (
                  <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <SaveIcon aria-hidden="true" className="size-4" />
                )}
                Save to logs
              </Button>
            </div>

            <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-600">
              Manual logs can store judol and non-judol results for thesis evidence.
            </div>
          </div>

          <ResultPanel model={model} />
        </section>
      </div>
    </main>
  );
}

function ResultPanel({
  model,
}: {
  model: ReturnType<typeof buildManualAnalysisViewModel>;
}) {
  if (!model.result) {
    return (
      <aside className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <ClipboardCheckIcon aria-hidden="true" className="size-4" />
          <p className="text-sm">{model.emptyMessage}</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">
          Result
        </h2>
        <Badge variant="secondary">{model.result.risk}</Badge>
      </div>

      <section className="grid grid-cols-2 gap-3">
        <Metric label="Label" value={model.result.label} />
        <Metric label="Confidence" value={model.result.confidence} />
        <Metric label="Action" value={model.result.action} />
        <Metric label="Analyzed" value={model.analyzedAt} />
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          Snippet
        </h3>
        <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-800">
          {model.result.snippet}
        </p>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          Matched terms
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {model.result.matchedTerms.length === 0 ? (
            <span className="text-sm text-slate-600">No matched terms.</span>
          ) : (
            model.result.matchedTerms.map((term) => (
              <Badge key={term} variant="outline">
                {term}
              </Badge>
            ))
          )}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          Unicode breakdown
        </h3>
        {model.result.unicodeRows.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            No suspicious Unicode spans.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Char</TableHead>
                <TableHead>Normalized</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {model.result.unicodeRows.map((row, index) => (
                <TableRow key={`${row.char}-${index}`}>
                  <TableCell>{row.char}</TableCell>
                  <TableCell>{row.normalizedAs}</TableCell>
                  <TableCell>{row.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          Reasons
        </h3>
        <div className="mt-2 flex flex-col gap-2">
          {model.result.reasonRows.map((reason) => (
            <div
              className="flex items-center justify-between gap-3 rounded-md border bg-slate-50 px-3 py-2 text-sm"
              key={reason.label}
            >
              <span>{reason.label}</span>
              <span className="font-medium">{reason.weight}</span>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="grid gap-2 text-sm text-slate-700">
        <Meta label="Model" value={model.result.modelLabel} />
        <Meta label="Request" value={model.result.requestId} />
      </section>

      <div className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
        <ShieldAlertIcon aria-hidden="true" className="size-4" />
        Copy result JSON is intentionally deferred after MVP 2.
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[260px] truncate font-medium">{value}</span>
    </div>
  );
}

export default App;
