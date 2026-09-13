import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { downloadCollectionJson } from '../../src/export/json-export';
import {
  createQueryInputState,
  syncQueryFromMonitor,
  updateQueryInput,
  type QueryInputState,
} from '../../src/popup/query-input-model';
import {
  createSearchProductInputState,
  syncSearchProductFromMonitor,
  updateSearchProductInput,
  type SearchProductInputState,
} from '../../src/popup/search-product-model';
import { getChromeApi } from '../../src/shared/chrome-api';
import type { CollectorRequest, CollectorResponse } from '../../src/shared/messages';
import type { SearchProduct } from '../../src/graphql/models';
import { emptyMonitorState, type MonitorState } from '../../src/storage/collector-storage';
import '../../src/styles.css';

const api = getChromeApi();

function App() {
  const [state, setState] = useState<MonitorState>(emptyMonitorState());
  const [queryInput, setQueryInput] = useState<QueryInputState>(createQueryInputState());
  const [searchProductInput, setSearchProductInput] = useState<SearchProductInputState>(
    createSearchProductInputState(),
  );
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const response = await send({ type: 'collector:get-state' });
    if (response?.state) {
      setState(response.state);
      setSearchProductInput((current) =>
        syncSearchProductFromMonitor(current, response.state.search_product),
      );
      setQueryInput((current) => syncQueryFromMonitor(current, response.state.query));
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 750);
    return () => window.clearInterval(timer);
  }, []);

  const start = async () => {
    setBusy(true);
    try {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      if (!tab.id || !isXTab(tab.url)) {
        throw new Error('Buka hasil pencarian X pada tab aktif terlebih dahulu.');
      }
      const response = await send({
        type: 'collector:start',
        tabId: tab.id,
        query: queryInput.value.trim() || undefined,
        searchProduct: searchProductInput.value,
      });
      if (!response?.ok) {
        throw new Error(response?.error ?? 'Gagal memulai monitoring.');
      }
      setState(response.state);
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', last_error: messageOf(error) }));
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    const response = await send({ type: 'collector:stop' });
    if (response?.state) setState(response.state);
    setBusy(false);
  };

  const startAutoScroll = async () => {
    setBusy(true);
    const response = await send({ type: 'collector:auto-scroll-start' });
    if (response?.state) {
      setState(response.state);
    }
    setBusy(false);
  };

  const stopAutoScroll = async () => {
    setBusy(true);
    const response = await send({ type: 'collector:auto-scroll-stop' });
    if (response?.state) {
      setState(response.state);
    }
    setBusy(false);
  };

  const clear = async () => {
    const response = await send({ type: 'collector:clear' });
    if (response?.state) setState(response.state);
  };

  return (
    <main className="panel">
      <header>
        <p className="eyebrow">RESEARCH TOOL</p>
        <h1>X GraphQL Collector</h1>
        <p className="muted">Hanya menyimpan field tweet yang diperlukan pipeline.</p>
      </header>

      <label className="field">
        Query opsional
        <input
          value={queryInput.value}
          onChange={(event) => setQueryInput((current) => updateQueryInput(current, event.target.value))}
          placeholder="situs slot gacor"
        />
      </label>

      <label className="field">
        Mode pencarian
        <select
          value={searchProductInput.value}
          disabled={busy || state.status === 'monitoring'}
          onChange={(event) =>
            setSearchProductInput((current) =>
              updateSearchProductInput(current, event.target.value as SearchProduct),
            )
          }
        >
          <option value="Latest">Terbaru (Latest)</option>
          <option value="Top">Populer (Top)</option>
        </select>
      </label>

      <section className="status-card">
        <div className={`status-dot status-${state.status}`} />
        <div>
          <strong>{statusLabel(state.status)}</strong>
          <span>{state.tab_id ? `Tab ${state.tab_id}` : 'Belum ada tab dipantau'}</span>
          <span>Filter: {searchProductLabel(state.search_product)}</span>
        </div>
      </section>

      <section className="metrics">
        <Metric label="Response" value={state.response_count} />
        <Metric label="Tweet baru" value={state.item_count} />
        <Metric label="Diabaikan" value={state.ignored_count} />
        <Metric label="Error" value={state.error_count} />
      </section>

      <section className="auto-scroll-card">
        <div>
          <strong>Auto-scroll</strong>
          <span>{autoScrollLabel(state.auto_scroll.status)}</span>
        </div>
        <div className="auto-scroll-progress">
          {state.auto_scroll.steps}/{state.auto_scroll.max_steps} langkah
          {state.auto_scroll.last_reason ? ` · ${state.auto_scroll.last_reason}` : ''}
        </div>
      </section>

      {state.last_error ? <p className="error">{state.last_error}</p> : null}

      <div className="actions">
        <button className="primary" disabled={busy || state.status === 'monitoring'} onClick={() => void start()}>
          Mulai monitor
        </button>
        <button disabled={busy || state.status !== 'monitoring'} onClick={() => void stop()}>
          Stop
        </button>
        <button
          className="primary"
          disabled={busy || state.status !== 'monitoring' || state.auto_scroll.status === 'running'}
          onClick={() => void startAutoScroll()}
        >
          Start Auto-scroll
        </button>
        <button
          disabled={busy || state.auto_scroll.status !== 'running'}
          onClick={() => void stopAutoScroll()}
        >
          Stop Auto-scroll
        </button>
        <button disabled={!state.item_count} onClick={() => downloadCollectionJson(state)}>
          Export JSON
        </button>
        <button className="quiet" onClick={() => void clear()}>
          Clear
        </button>
      </div>

      <p className="notice">Chrome akan menampilkan indikator debugger selama tab dipantau. Login X tetap dilakukan manual.</p>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span></div>;
}

async function send(message: CollectorRequest): Promise<CollectorResponse | undefined> {
  return (await api.runtime.sendMessage(message)) as CollectorResponse | undefined;
}

function isXTab(url = ''): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'x.com' || hostname.endsWith('.x.com');
  } catch {
    return false;
  }
}

function statusLabel(status: MonitorState['status']): string {
  return {
    idle: 'Siap',
    attaching: 'Menghubungkan debugger',
    monitoring: 'Monitoring aktif',
    stopped: 'Berhenti',
    error: 'Error',
    detached: 'Debugger terlepas',
  }[status];
}

function searchProductLabel(product: SearchProduct): string {
  return product === 'Top' ? 'Populer' : 'Terbaru';
}

function autoScrollLabel(status: MonitorState['auto_scroll']['status']): string {
  return {
    idle: 'Belum dimulai',
    running: 'Berjalan',
    stopped: 'Dihentikan',
    bottom: 'Mencapai bawah halaman',
    limit: 'Batas 500 langkah tercapai',
    error: 'Error',
  }[status];
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
