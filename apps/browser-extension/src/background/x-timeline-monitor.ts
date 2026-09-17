import {
  parseXTimelinePayload,
  type TimelinePredictionItem,
} from '../x/x-timeline-parser';

const X_TIMELINE_OPERATIONS = Object.freeze({
  HomeTimeline: true,
  SearchTimeline: true,
  UserOriginalsTimeline: true,
  UserRepostsTimeline: true,
  UserVideoTimeline: true,
  UserPhotoTimeline: true,
  UserRepliesTimeline: true,
  TweetDetail: true,
} satisfies Record<string, true>);
const MAX_DISPATCHED_TWEETS_PER_TAB = 500;

type DebuggerTarget = { tabId: number };

type DebuggerApi = {
  attach: (target: DebuggerTarget, requiredVersion: string, callback: () => void) => void;
  detach: (target: DebuggerTarget, callback: () => void) => void;
  sendCommand: (
    target: DebuggerTarget,
    method: string,
    params: Record<string, unknown>,
    callback: (result?: unknown) => void,
  ) => void;
  onEvent: {
    addListener: (
      listener: (
        source: DebuggerTarget,
        method: string,
        params?: Record<string, unknown>,
      ) => void,
    ) => void;
  };
  onDetach: {
    addListener: (listener: (source: DebuggerTarget, reason: string) => void) => void;
  };
};

export type XTimelineMonitorApi = {
  runtime: { lastError?: { message?: string } };
  attach: DebuggerApi['attach'];
  detach: DebuggerApi['detach'];
  sendCommand: DebuggerApi['sendCommand'];
  onEvent: DebuggerApi['onEvent'];
  onDetach: DebuggerApi['onDetach'];
};

type ResponseBody = { body?: string; base64Encoded?: boolean };
type TabState = {
  target: DebuggerTarget;
  pendingRequestIds: Set<string>;
  dispatchedTweetIds: Set<string>;
};
type Initialization = {
  target: DebuggerTarget;
  cancelled: boolean;
  attached: boolean;
  detached: boolean;
  promise: Promise<void>;
};

export class XTimelineMonitor {
  private readonly tabs = new Map<number, TabState>();
  private readonly initializations = new Map<number, Initialization>();
  private readonly expectedDetachEvents = new Map<number, number>();

  constructor(
    private readonly api: XTimelineMonitorApi,
    private readonly onItems: (tabId: number, items: TimelinePredictionItem[]) => Promise<void>,
  ) {
    api.onEvent.addListener((source, method, params) => {
      void this.handleEvent(source, method, params);
    });
    api.onDetach.addListener((source, reason) => {
      if (reason === 'canceled_by_user' && this.consumeExpectedDetachEvent(source.tabId)) {
        return;
      }

      this.expectedDetachEvents.delete(source.tabId);
      const state = this.tabs.get(source.tabId);
      state?.pendingRequestIds.clear();
      this.tabs.delete(source.tabId);
      const initialization = this.initializations.get(source.tabId);
      if (initialization) {
        initialization.cancelled = true;
        initialization.detached = true;
        this.initializations.delete(source.tabId);
      }
    });
  }

  async subscribe(tabId: number): Promise<void> {
    if (this.tabs.has(tabId)) {
      return;
    }

    const pending = this.initializations.get(tabId);
    if (pending) {
      if (pending.cancelled) {
        await pending.promise;
        return this.subscribe(tabId);
      }
      return pending.promise;
    }

    const initialization: Initialization = {
      target: { tabId },
      cancelled: false,
      attached: false,
      detached: false,
      promise: Promise.resolve(),
    };
    this.initializations.set(tabId, initialization);
    const promise = this.initialize(tabId, initialization);
    initialization.promise = promise;
    return promise;
  }

  private async initialize(tabId: number, initialization: Initialization): Promise<void> {
    try {
      await this.attach(initialization.target);
      initialization.attached = true;
      if (initialization.cancelled) {
        if (!initialization.detached) {
          initialization.detached = true;
          await this.detachSafely(initialization.target);
        }
        return;
      }
      await this.sendCommand(initialization.target, 'Network.enable', {});
      if (
        initialization.cancelled ||
        this.initializations.get(tabId) !== initialization
      ) {
        if (!initialization.detached) {
          await this.detachSafely(initialization.target);
        }
        return;
      }
      this.tabs.set(tabId, {
        target: initialization.target,
        pendingRequestIds: new Set(),
        dispatchedTweetIds: new Set(),
      });
    } catch (error) {
      if (initialization.attached && !initialization.detached) {
        await this.detachSafely(initialization.target);
      }
      throw error;
    } finally {
      if (this.initializations.get(tabId) === initialization) {
        this.initializations.delete(tabId);
      }
    }
  }

  async unsubscribe(tabId: number): Promise<void> {
    const initialization = this.initializations.get(tabId);
    if (initialization) {
      initialization.cancelled = true;
      if (initialization.attached && !initialization.detached) {
        initialization.detached = true;
        await this.detachSafely(initialization.target);
      }
      return;
    }

    const state = this.tabs.get(tabId);
    if (!state) {
      return;
    }

    this.tabs.delete(tabId);
    state.pendingRequestIds.clear();
    await this.detachSafely(state.target);
  }

  private async handleEvent(
    source: DebuggerTarget,
    method: string,
    params?: Record<string, unknown>,
  ): Promise<void> {
    const state = this.tabs.get(source.tabId);
    if (!state) {
      return;
    }

    if (method === 'Network.responseReceived') {
      this.handleResponseReceived(state, params);
      return;
    }

    if (method === 'Network.loadingFailed') {
      const requestId = typeof params?.requestId === 'string' ? params.requestId : '';
      state.pendingRequestIds.delete(requestId);
      return;
    }

    if (method === 'Network.loadingFinished') {
      await this.handleLoadingFinished(state, params);
    }
  }

  private handleResponseReceived(state: TabState, params?: Record<string, unknown>): void {
    const response = asObject(params?.response);
    const url = typeof response?.url === 'string' ? response.url : '';
    const status = typeof response?.status === 'number' ? response.status : 0;
    const requestId = typeof params?.requestId === 'string' ? params.requestId : '';

    if (!requestId || status !== 200 || !isXTimelineOperationUrl(url)) {
      return;
    }

    state.pendingRequestIds.add(requestId);
  }

  private async handleLoadingFinished(
    state: TabState,
    params?: Record<string, unknown>,
  ): Promise<void> {
    const requestId = typeof params?.requestId === 'string' ? params.requestId : '';
    if (!requestId || !state.pendingRequestIds.delete(requestId)) {
      return;
    }

    try {
      const response = await this.sendCommand<ResponseBody>(
        state.target,
        'Network.getResponseBody',
        { requestId },
      );
      if (this.tabs.get(state.target.tabId) !== state) {
        return;
      }

      const body = response.base64Encoded
        ? decodeBase64(response.body ?? '')
        : response.body ?? '';
      const items = parseXTimelinePayload(JSON.parse(body)).filter(
        (item) => !state.dispatchedTweetIds.has(item.id),
      );
      if (items.length === 0) {
        return;
      }

      for (const item of items) {
        rememberBounded(state.dispatchedTweetIds, item.id);
      }
      await this.onItems(state.target.tabId, items);
    } catch {
      // Supported X timeline capture is opportunistic. A later response can still be processed.
    }
  }

  private attach(target: DebuggerTarget): Promise<void> {
    return new Promise((resolve, reject) => {
      this.api.attach(target, '1.3', () => {
        const message = this.api.runtime.lastError?.message;
        message ? reject(new Error(message)) : resolve();
      });
    });
  }

  private async detachSafely(target: DebuggerTarget): Promise<void> {
    this.expectDetachEvent(target.tabId);
    try {
      await new Promise<void>((resolve, reject) => {
        this.api.detach(target, () => {
          const message = this.api.runtime.lastError?.message;
          message ? reject(new Error(message)) : resolve();
        });
      });
    } catch {
      this.forgetExpectedDetachEvent(target.tabId);
      // Chrome may have already detached because the tab navigated or closed.
    }
  }

  private expectDetachEvent(tabId: number): void {
    this.expectedDetachEvents.set(tabId, (this.expectedDetachEvents.get(tabId) ?? 0) + 1);
  }

  private consumeExpectedDetachEvent(tabId: number): boolean {
    const expected = this.expectedDetachEvents.get(tabId) ?? 0;
    if (expected === 0) {
      return false;
    }
    this.forgetExpectedDetachEvent(tabId);
    return true;
  }

  private forgetExpectedDetachEvent(tabId: number): void {
    const expected = this.expectedDetachEvents.get(tabId) ?? 0;
    if (expected <= 1) {
      this.expectedDetachEvents.delete(tabId);
      return;
    }
    this.expectedDetachEvents.set(tabId, expected - 1);
  }

  private sendCommand<T>(
    target: DebuggerTarget,
    method: string,
    params: Record<string, unknown>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.api.sendCommand(target, method, params, (result) => {
        const message = this.api.runtime.lastError?.message;
        message ? reject(new Error(message)) : resolve(result as T);
      });
    });
  }
}

function isXTimelineOperationUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const operation = parsed.pathname.split('/').filter(Boolean).at(-1);
    return Boolean(
      operation &&
        (parsed.hostname === 'x.com' || parsed.hostname.endsWith('.x.com')) &&
        Object.hasOwn(X_TIMELINE_OPERATIONS, operation),
    );
  } catch {
    return false;
  }
}

function rememberBounded(ids: Set<string>, id: string): void {
  ids.add(id);
  if (ids.size <= MAX_DISPATCHED_TWEETS_PER_TAB) {
    return;
  }
  const oldest = ids.values().next().value;
  if (oldest) {
    ids.delete(oldest);
  }
}

function decodeBase64(value: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(value), (char) => char.charCodeAt(0)));
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
