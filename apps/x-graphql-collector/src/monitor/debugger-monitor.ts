import { decodeSearchTimelineRequest, parseSearchTimelinePayload } from "../graphql/search-timeline-parser";
import type { SearchProduct } from "../graphql/models";
import { AutoScrollController, type ScrollMetrics } from "./auto-scroll-controller";
import type { ChromeApi, DebuggerTarget } from "../shared/chrome-api";
import { emptyMonitorState, MAX_ITEMS, readMonitorState, writeMonitorState, type MonitorState, type StorageArea } from "../storage/collector-storage";

type ResponseBody = { body?: string; base64Encoded?: boolean };

export class DebuggerMonitor {
  private state = emptyMonitorState();
  private activeTarget?: DebuggerTarget;
  private requestedQuery = "";
  private readonly autoScroll: AutoScrollController;
  private readonly pendingResponses = new Map<string, { query: string; status: number }>();

  constructor(
    private readonly api: ChromeApi,
    private readonly storage: StorageArea,
  ) {
    this.autoScroll = new AutoScrollController(
      () => this.evaluateScroll(),
      (autoScroll) => {
        this.state = this.withUpdate({ auto_scroll: autoScroll });
        void this.persist();
      },
    );
    api.debugger.onEvent.addListener((source, method, params) => {
      void this.handleEvent(source, method, params);
    });
    api.debugger.onDetach.addListener((source, reason) => {
      if (this.activeTarget?.tabId !== source.tabId) {
        return;
      }
      this.activeTarget = undefined;
      this.autoScroll.stop("debugger_detached");
      this.state = {
        ...this.state,
        status: "detached",
        auto_scroll: this.autoScroll.getState(),
        last_error: `Debugger detached: ${reason}`,
        updated_at: new Date().toISOString(),
      };
      void writeMonitorState(this.storage, this.state);
    });
  }

  async getState(): Promise<MonitorState> {
    this.state = await readMonitorState(this.storage);
    return this.state;
  }

  async start(tabId: number, query = "", searchProduct: SearchProduct = "Latest"): Promise<MonitorState> {
    await this.detachCurrent();
    this.requestedQuery = query.trim();
    this.state = {
      ...emptyMonitorState(),
      status: "attaching",
      tab_id: tabId,
      query: this.requestedQuery,
      search_product: searchProduct,
      started_at: new Date().toISOString(),
    };
    await this.persist();

    const target = { tabId };
    try {
      await this.attach(target);
      this.activeTarget = target;
      await this.sendCommand(target, "Network.enable", {});
      this.state = this.withUpdate({ status: "monitoring" });
      await this.persist();
      return this.state;
    } catch (error) {
      this.pendingResponses.clear();
      await this.detachCurrent();
      this.state = this.withUpdate({ status: "error", error_count: 1, last_error: messageOf(error) });
      await this.persist();
      throw error;
    }
  }

  async stop(): Promise<MonitorState> {
    this.autoScroll.stop("monitor_stop");
    this.pendingResponses.clear();
    await this.detachCurrent();
    this.state = this.withUpdate({ status: "stopped" });
    await this.persist();
    return this.state;
  }

  async clear(): Promise<MonitorState> {
    this.autoScroll.stop("clear");
    this.pendingResponses.clear();
    await this.detachCurrent();
    this.state = emptyMonitorState();
    await this.persist();
    return this.state;
  }

  startAutoScroll(): MonitorState {
    if (!this.activeTarget || this.state.status !== "monitoring") {
      throw new Error("Start monitoring an X tab before enabling auto-scroll.");
    }
    this.autoScroll.start();
    this.state = this.withUpdate({ auto_scroll: this.autoScroll.getState() });
    void this.persist();
    return this.state;
  }

  stopAutoScroll(): MonitorState {
    this.autoScroll.stop("user_stop");
    this.state = this.withUpdate({ auto_scroll: this.autoScroll.getState() });
    void this.persist();
    return this.state;
  }

  private async handleEvent(source: DebuggerTarget, method: string, params?: Record<string, unknown>): Promise<void> {
    if (this.activeTarget?.tabId !== source.tabId) {
      return;
    }
    if (method === "Network.loadingFinished") {
      await this.handleLoadingFinished(source, params);
      return;
    }
    if (method !== "Network.responseReceived") {
      return;
    }
    const response = asObject(params?.response);
    const responseUrl = typeof response?.url === "string" ? response.url : "";
    const request = decodeSearchTimelineRequest(responseUrl);
    if (!request.isSearchTimeline || request.product !== this.state.search_product) {
      this.state = this.withUpdate({ ignored_count: this.state.ignored_count + 1 });
      await this.persist();
      return;
    }
    if (this.requestedQuery && request.query !== this.requestedQuery) {
      this.state = this.withUpdate({ ignored_count: this.state.ignored_count + 1 });
      await this.persist();
      return;
    }

    const requestId = typeof params?.requestId === "string" ? params.requestId : "";
    const status = typeof response?.status === "number" ? response.status : 0;
    if (!requestId || status !== 200) {
      this.state = this.withUpdate({
        error_count: this.state.error_count + 1,
        last_error: `SearchTimeline response status ${status || "unknown"}`,
      });
      await this.persist();
      return;
    }

    this.pendingResponses.set(requestId, { query: request.query, status });
    return;
  }

  private async handleLoadingFinished(source: DebuggerTarget, params?: Record<string, unknown>): Promise<void> {
    if (this.activeTarget?.tabId !== source.tabId) {
      return;
    }
    const requestId = typeof params?.requestId === "string" ? params.requestId : "";
    const pending = this.pendingResponses.get(requestId);
    if (!pending || !this.activeTarget) {
      return;
    }
    this.pendingResponses.delete(requestId);

    try {
      const body = await this.sendCommand<ResponseBody>(this.activeTarget, "Network.getResponseBody", { requestId });
      const text = body.base64Encoded ? decodeBase64(body.body ?? "") : (body.body ?? "");
      const parsed = parseSearchTimelinePayload(JSON.parse(text), pending.query);
      const items = mergeItems(this.state.items, parsed.items);
      this.state = this.withUpdate({
        query: this.state.query || parsed.query,
        response_count: this.state.response_count + 1,
        item_count: items.length,
        items,
      });
    } catch (error) {
      this.state = this.withUpdate({
        error_count: this.state.error_count + 1,
        last_error: `SearchTimeline body parse failed: ${messageOf(error)}`,
      });
    }
    await this.persist();
  }

  private withUpdate(update: Partial<MonitorState>): MonitorState {
    return { ...this.state, ...update, updated_at: new Date().toISOString() };
  }

  private async persist(): Promise<void> {
    await writeMonitorState(this.storage, this.state);
  }

  private async detachCurrent(): Promise<void> {
    if (!this.activeTarget) {
      return;
    }
    const target = this.activeTarget;
    this.activeTarget = undefined;
    this.autoScroll.stop("debugger_detached");
    try {
      await this.detach(target);
    } catch {
      // The target may already have been closed or detached by Chrome.
    }
  }

  private attach(target: DebuggerTarget): Promise<void> {
    return new Promise((resolve, reject) => {
      this.api.debugger.attach(target, "1.3", () => {
        const error = this.api.runtime.lastError?.message;
        error ? reject(new Error(error)) : resolve();
      });
    });
  }

  private detach(target: DebuggerTarget): Promise<void> {
    return new Promise((resolve, reject) => {
      this.api.debugger.detach(target, () => {
        const error = this.api.runtime.lastError?.message;
        error ? reject(new Error(error)) : resolve();
      });
    });
  }

  private sendCommand<T>(target: DebuggerTarget, method: string, params: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.api.debugger.sendCommand(target, method, params, (result) => {
        const error = this.api.runtime.lastError?.message;
        error ? reject(new Error(error)) : resolve(result as T);
      });
    });
  }

  private async evaluateScroll(): Promise<ScrollMetrics> {
    if (!this.activeTarget) {
      throw new Error("Debugger target is not attached.");
    }
    const result = await this.sendCommand<{ result?: { value?: ScrollMetrics } }>(this.activeTarget, "Runtime.evaluate", {
      expression: `(() => {
          const viewport = window.innerHeight || 0;
          const height = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0);
          const maxY = Math.max(height - viewport, 0);
          const nextY = maxY;
          window.scrollTo({ top: nextY, left: 0, behavior: 'auto' });
          return { y: window.scrollY, height, viewport };
        })()`,
      returnByValue: true,
      awaitPromise: false,
    });
    const value = result.result?.value;
    if (!value || !Number.isFinite(value.y) || !Number.isFinite(value.height) || !Number.isFinite(value.viewport)) {
      throw new Error("Scroll metrics were unavailable.");
    }
    return value;
  }
}

function mergeItems(existing: MonitorState["items"], incoming: MonitorState["items"]): MonitorState["items"] {
  const byId = new Map(existing.map((item) => [item.source_item_id, item]));
  for (const item of incoming) {
    if (!byId.has(item.source_item_id)) {
      byId.set(item.source_item_id, item);
    }
  }
  return Array.from(byId.values()).slice(0, MAX_ITEMS);
}

function decodeBase64(value: string): string {
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
