import { describe, expect, it } from 'vitest';
import type { ChromeApi, DebuggerTarget } from '../shared/chrome-api';
import { DebuggerMonitor } from './debugger-monitor';
import type { StorageArea } from '../storage/collector-storage';

function createFakeChrome(body: string, failNetworkEnable = false) {
  let eventListener: ((source: DebuggerTarget, method: string, params?: Record<string, unknown>) => void) | undefined;
  let detachListener: ((source: DebuggerTarget, reason: string) => void) | undefined;
  const commands: string[] = [];
  const detachedTargets: DebuggerTarget[] = [];
  const runtime: ChromeApi["runtime"] = {
    onMessage: { addListener: () => undefined },
    sendMessage: async () => undefined,
  };
  const api = {
    runtime,
    tabs: { query: async () => [] },
    debugger: {
      attach: (_target: DebuggerTarget, _version: string, callback: () => void) => callback(),
      detach: (target: DebuggerTarget, callback: () => void) => {
        detachedTargets.push(target);
        callback();
      },
      sendCommand: (_target: DebuggerTarget, method: string, _params: Record<string, unknown> | undefined, callback: (result?: unknown) => void) => {
        commands.push(method);
        if (failNetworkEnable && method === "Network.enable") {
          runtime.lastError = { message: "Network.enable failed" };
          callback();
          runtime.lastError = undefined;
          return;
        }
        callback(method === "Network.getResponseBody" ? { body } : undefined);
      },
      onEvent: { addListener: (listener: typeof eventListener) => { eventListener = listener; } },
      onDetach: { addListener: (listener: typeof detachListener) => { detachListener = listener; } },
    },
    storage: { local: { get: async () => ({}), set: async () => undefined } },
  } as unknown as ChromeApi;
  return {
    api,
    emit: (method: string, params: Record<string, unknown>) => eventListener?.({ tabId: 7 }, method, params),
    commands,
    detachedTargets,
    detachListener,
  };
}

function createStorage(): StorageArea & { value?: Record<string, unknown> } {
  const storage: StorageArea & { value?: Record<string, unknown> } = {
    value: undefined,
    get: async () => (storage.value ?? {}),
    set: async (items) => { storage.value = items; },
  };
  return storage;
}

describe('DebuggerMonitor', () => {
  it('reads a Latest SearchTimeline body after loadingFinished and stores normalized items', async () => {
    const payload = JSON.stringify({
      data: {
        search_by_raw_query: {
          search_timeline: {
            timeline: {
              instructions: [{
                entries: [{
                  entryId: 'tweet-1',
                  content: { itemContent: { tweet_results: { result: {
                    rest_id: '1', legacy: { full_text: 'slot gacor' },
                  } } } },
                }],
              }],
            },
          },
        },
      },
    });
    const fake = createFakeChrome(payload);
    const monitor = new DebuggerMonitor(fake.api, createStorage());

    await monitor.start(7, 'slot');
    fake.emit('Network.responseReceived', {
      requestId: 'request-1',
      response: {
        status: 200,
        url: `https://x.com/i/api/graphql/rotating/SearchTimeline?variables=${encodeURIComponent(JSON.stringify({ rawQuery: 'slot', product: 'Latest' }))}`,
      },
    });
    expect(fake.commands).not.toContain('Network.getResponseBody');

    fake.emit('Network.loadingFinished', { requestId: 'request-1' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const state = await monitor.getState();
    expect(fake.commands).toContain('Network.getResponseBody');
    expect(state.response_count).toBe(1);
    expect(state.items).toEqual([{
      source_item_id: '1',
      text_raw: 'slot gacor',
      source_url: 'https://x.com/i/web/status/1',
    }]);
  });

  it('ignores non-Latest SearchTimeline responses', async () => {
    const fake = createFakeChrome('{}');
    const monitor = new DebuggerMonitor(fake.api, createStorage());
    await monitor.start(7);

    fake.emit('Network.responseReceived', {
      requestId: 'request-top',
      response: {
        status: 200,
        url: `https://x.com/i/api/graphql/rotating/SearchTimeline?variables=${encodeURIComponent(JSON.stringify({ rawQuery: 'slot', product: 'Top' }))}`,
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const state = await monitor.getState();
    expect(state.ignored_count).toBe(1);
    expect(state.response_count).toBe(0);
  });

  it('accepts only the selected SearchTimeline product', async () => {
    const fake = createFakeChrome('{}');
    const monitor = new DebuggerMonitor(fake.api, createStorage());
    await monitor.start(7, 'slot', 'Top');

    const makeUrl = (product: string) =>
      `https://x.com/i/api/graphql/rotating/SearchTimeline?variables=${encodeURIComponent(JSON.stringify({ rawQuery: 'slot', product }))}`;

    fake.emit('Network.responseReceived', {
      requestId: 'request-latest',
      response: { status: 200, url: makeUrl('Latest') },
    });
    fake.emit('Network.responseReceived', {
      requestId: 'request-top',
      response: { status: 200, url: makeUrl('Top') },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const state = await monitor.getState();
    expect(state.search_product).toBe('Top');
    expect(state.ignored_count).toBe(1);
    expect(state.response_count).toBe(0);
  });

  it('records non-200 SearchTimeline responses without requesting a response body', async () => {
    const fake = createFakeChrome('{}');
    const monitor = new DebuggerMonitor(fake.api, createStorage());
    await monitor.start(7);

    fake.emit('Network.responseReceived', {
      requestId: 'request-404',
      response: {
        status: 404,
        url: `https://x.com/i/api/graphql/rotating/SearchTimeline?variables=${encodeURIComponent(JSON.stringify({ rawQuery: 'slot', product: 'Latest' }))}`,
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const state = await monitor.getState();
    expect(state.error_count).toBe(1);
    expect(state.last_error).toContain('404');
    expect(fake.commands).not.toContain('Network.getResponseBody');
  });

  it('deduplicates the same tweet across multiple SearchTimeline responses', async () => {
    const payload = JSON.stringify({
      data: { search_by_raw_query: { search_timeline: { timeline: { instructions: [{ entries: [{
        entryId: 'tweet-1',
        content: { itemContent: { tweet_results: { result: { rest_id: '1', legacy: { full_text: 'slot gacor' } } } } },
      }] }] } } } },
    });
    const fake = createFakeChrome(payload);
    const monitor = new DebuggerMonitor(fake.api, createStorage());
    await monitor.start(7);
    const url = `https://x.com/i/api/graphql/rotating/SearchTimeline?variables=${encodeURIComponent(JSON.stringify({ rawQuery: 'slot', product: 'Latest' }))}`;

    for (const requestId of ['request-1', 'request-2']) {
      fake.emit('Network.responseReceived', { requestId, response: { status: 200, url } });
      fake.emit('Network.loadingFinished', { requestId });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const state = await monitor.getState();
    expect(state.response_count).toBe(2);
    expect(state.item_count).toBe(1);
  });

  it("clearing detaches the debugger and discards pending response bodies", async () => {
    const fake = createFakeChrome(JSON.stringify({ data: {} }));
    const monitor = new DebuggerMonitor(fake.api, createStorage());
    await monitor.start(7, "slot");

    fake.emit("Network.responseReceived", {
      requestId: "pending-request",
      response: {
        status: 200,
        url: `https://x.com/i/api/graphql/rotating/SearchTimeline?variables=${encodeURIComponent(JSON.stringify({ rawQuery: "slot", product: "Latest" }))}`,
      },
    });
    await monitor.clear();
    fake.emit("Network.loadingFinished", { requestId: "pending-request" });

    expect(fake.detachedTargets).toEqual([{ tabId: 7 }]);
    expect(fake.commands).not.toContain("Network.getResponseBody");
    expect((await monitor.getState()).items).toEqual([]);
  });

  it("detaches when Network.enable fails after attaching", async () => {
    const fake = createFakeChrome("{}", true);
    const monitor = new DebuggerMonitor(fake.api, createStorage());

    await expect(monitor.start(7)).rejects.toThrow("Network.enable failed");

    expect(fake.detachedTargets).toEqual([{ tabId: 7 }]);
  });
});
