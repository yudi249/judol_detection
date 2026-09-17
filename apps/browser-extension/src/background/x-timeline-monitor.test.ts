import { describe, expect, it, vi } from 'vitest';

import { XTimelineMonitor } from './x-timeline-monitor';

type DebuggerTarget = { tabId: number };
type DebuggerEvent = (
  source: DebuggerTarget,
  method: string,
  params?: Record<string, unknown>,
) => void;

function createDebugger(
  body: string,
  {
    delayAttach = false,
    delayEnable = false,
    delayDetachEvent = false,
  }: { delayAttach?: boolean; delayEnable?: boolean; delayDetachEvent?: boolean } = {},
) {
  let eventListener: DebuggerEvent | undefined;
  let detachListener: ((source: DebuggerTarget, reason: string) => void) | undefined;
  const attachCallbacks: (() => void)[] = [];
  const enableCallbacks: (() => void)[] = [];
  const detachCallbacks: (() => void)[] = [];
  const commands: string[] = [];
  const emittedDetachReasons: string[] = [];
  const detachedTargets: DebuggerTarget[] = [];

  return {
    api: {
      runtime: {},
      attach: (_target: DebuggerTarget, _version: string, callback: () => void) => {
        attachCallbacks.push(callback);
        if (!delayAttach) {
          callback();
        }
      },
      detach: (target: DebuggerTarget, callback: () => void) => {
        detachedTargets.push(target);
        if (delayDetachEvent) {
          detachCallbacks.push(() => {
            emittedDetachReasons.push('canceled_by_user');
            detachListener?.(target, 'canceled_by_user');
          });
        }
        callback();
      },
      sendCommand: (
        _target: DebuggerTarget,
        method: string,
        _params: Record<string, unknown>,
        callback: (result?: unknown) => void,
      ) => {
        commands.push(method);
        if (method === 'Network.enable' && delayEnable) {
          enableCallbacks.push(callback);
          return;
        }
        callback(method === 'Network.getResponseBody' ? { body } : undefined);
      },
      onEvent: { addListener: (listener: DebuggerEvent) => { eventListener = listener; } },
      onDetach: {
        addListener: (listener: (source: DebuggerTarget, reason: string) => void) => {
          detachListener = listener;
        },
      },
    },
    commands,
    emittedDetachReasons,
    detachedTargets,
    emit: (method: string, params: Record<string, unknown>) =>
      eventListener?.({ tabId: 7 }, method, params),
    detach: (reason: string) => detachListener?.({ tabId: 7 }, reason),
    resolveAttach: () => attachCallbacks.shift()?.(),
    resolveEnable: () => enableCallbacks.shift()?.(),
    resolveDetach: () => detachCallbacks.shift()?.(),
  };
}

function timelineUrl(operation: string, host = 'x.com'): string {
  return `https://${host}/i/api/graphql/rotating/${operation}?variables=%7B%7D`;
}

const supportedOperations = [
  'HomeTimeline',
  'SearchTimeline',
  'UserOriginalsTimeline',
  'UserRepostsTimeline',
  'UserVideoTimeline',
  'UserPhotoTimeline',
  'UserRepliesTimeline',
  'TweetDetail',
] as const;

const timelineBody = JSON.stringify({
  data: {
    search_by_raw_query: {
      search_timeline: {
        timeline: {
          instructions: [
            {
              entries: [
                {
                  entryId: 'tweet-2099429059063341169',
                  content: {
                    itemContent: {
                      tweet_results: {
                        result: {
                          rest_id: '2099429059063341169',
                          legacy: { full_text: 'slot gacor hari ini' },
                        },
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    },
  },
});

describe('X timeline monitor', () => {
  it.each(supportedOperations)(
    'captures a successful %s response for a subscribed tab',
    async (operation) => {
      const fake = createDebugger(timelineBody);
      const onItems = vi.fn(() => Promise.resolve());
      const monitor = new XTimelineMonitor(fake.api, onItems);

      await monitor.subscribe(7);
      fake.emit('Network.responseReceived', {
        requestId: `request-${operation}`,
        response: { status: 200, url: timelineUrl(operation) },
      });
      fake.emit('Network.loadingFinished', { requestId: `request-${operation}` });
      await flush();

      expect(fake.commands).toContain('Network.getResponseBody');
      expect(onItems).toHaveBeenCalledWith(7, [
        { id: '2099429059063341169', text: 'slot gacor hari ini' },
      ]);
    },
  );

  it('deduplicates a matching tweet ID across HomeTimeline and TweetDetail', async () => {
    const fake = createDebugger(timelineBody);
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new XTimelineMonitor(fake.api, onItems);

    await monitor.subscribe(7);
    for (const [requestId, operation] of [
      ['home', 'HomeTimeline'],
      ['detail', 'TweetDetail'],
    ]) {
      fake.emit('Network.responseReceived', {
        requestId,
        response: { status: 200, url: timelineUrl(operation) },
      });
      fake.emit('Network.loadingFinished', { requestId });
      await flush();
    }

    expect(onItems).toHaveBeenCalledTimes(1);
    expect(onItems).toHaveBeenCalledWith(7, [
      { id: '2099429059063341169', text: 'slot gacor hari ini' },
    ]);
  });

  it('accepts x.com subdomains and rejects unsupported hosts, operations, and statuses', async () => {
    const fake = createDebugger(timelineBody);
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new XTimelineMonitor(fake.api, onItems);

    await monitor.subscribe(7);
    fake.emit('Network.responseReceived', {
      requestId: 'subdomain',
      response: { status: 200, url: timelineUrl('HomeTimeline', 'api.x.com') },
    });
    fake.emit('Network.loadingFinished', { requestId: 'subdomain' });
    await flush();

    fake.emit('Network.responseReceived', {
      requestId: 'other',
      response: { status: 200, url: timelineUrl('Other') },
    });
    fake.emit('Network.responseReceived', {
      requestId: 'inherited-operation',
      response: { status: 200, url: timelineUrl('toString') },
    });
    fake.emit('Network.responseReceived', {
      requestId: 'wrong-host',
      response: { status: 200, url: timelineUrl('HomeTimeline', 'not-x.com') },
    });
    fake.emit('Network.responseReceived', {
      requestId: 'failure',
      response: { status: 503, url: timelineUrl('HomeTimeline') },
    });
    for (const requestId of ['other', 'inherited-operation', 'wrong-host', 'failure']) {
      fake.emit('Network.loadingFinished', { requestId });
    }
    await flush();

    expect(fake.commands.filter((method) => method === 'Network.getResponseBody')).toHaveLength(1);
    expect(onItems).toHaveBeenCalledTimes(1);
  });

  it('forgets a failed supported response before its request ID is reused', async () => {
    const fake = createDebugger(timelineBody);
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new XTimelineMonitor(fake.api, onItems);

    await monitor.subscribe(7);
    fake.emit('Network.responseReceived', {
      requestId: 'reused',
      response: { status: 200, url: timelineUrl('HomeTimeline') },
    });
    fake.emit('Network.loadingFailed', { requestId: 'reused' });
    fake.emit('Network.responseReceived', {
      requestId: 'reused',
      response: { status: 503, url: timelineUrl('HomeTimeline') },
    });
    fake.emit('Network.loadingFinished', { requestId: 'reused' });
    await flush();

    expect(fake.commands).not.toContain('Network.getResponseBody');
    expect(onItems).not.toHaveBeenCalled();
  });

  it('detaches and makes late response completion inert after unsubscribe', async () => {
    const fake = createDebugger(timelineBody);
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new XTimelineMonitor(fake.api, onItems);

    await monitor.subscribe(7);
    fake.emit('Network.responseReceived', {
      requestId: 'pending',
      response: { status: 200, url: timelineUrl('SearchTimeline') },
    });
    await monitor.unsubscribe(7);
    fake.emit('Network.loadingFinished', { requestId: 'pending' });
    await flush();

    expect(fake.detachedTargets).toEqual([{ tabId: 7 }]);
    expect(fake.commands).not.toContain('Network.getResponseBody');
    expect(onItems).not.toHaveBeenCalled();
  });

  it('keeps setup completion inert when unsubscribed before attach resolves', async () => {
    const fake = createDebugger(timelineBody, { delayAttach: true, delayEnable: true });
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new XTimelineMonitor(fake.api, onItems);

    const subscription = monitor.subscribe(7);
    await monitor.unsubscribe(7);
    fake.resolveAttach();
    await flush();
    fake.resolveEnable();
    await subscription;
    fake.emit('Network.responseReceived', {
      requestId: 'cancelled-setup',
      response: { status: 200, url: timelineUrl('HomeTimeline') },
    });
    fake.emit('Network.loadingFinished', { requestId: 'cancelled-setup' });
    await flush();

    expect(fake.detachedTargets).toEqual([{ tabId: 7 }]);
    expect(fake.commands).not.toContain('Network.getResponseBody');
    expect(onItems).not.toHaveBeenCalled();
  });

  it('queues a replacement after cancellation releases the obsolete attachment', async () => {
    const fake = createDebugger(timelineBody, { delayAttach: true });
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new XTimelineMonitor(fake.api, onItems);

    const obsoleteSubscription = monitor.subscribe(7);
    await monitor.unsubscribe(7);
    const replacementSubscription = monitor.subscribe(7);

    fake.resolveAttach();
    await obsoleteSubscription;
    fake.resolveAttach();
    await replacementSubscription;

    fake.emit('Network.responseReceived', {
      requestId: 'replacement',
      response: { status: 200, url: timelineUrl('HomeTimeline') },
    });
    fake.emit('Network.loadingFinished', { requestId: 'replacement' });
    await flush();

    expect(fake.detachedTargets).toEqual([{ tabId: 7 }]);
    expect(fake.commands.filter((method) => method === 'Network.getResponseBody')).toHaveLength(1);
    expect(onItems).toHaveBeenCalledOnce();
    expect(onItems).toHaveBeenCalledWith(7, [
      { id: '2099429059063341169', text: 'slot gacor hari ini' },
    ]);
  });

  it('keeps a replacement active when the obsolete explicit detach arrives late', async () => {
    const fake = createDebugger(timelineBody, { delayAttach: true, delayDetachEvent: true });
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new XTimelineMonitor(fake.api, onItems);

    const obsoleteSubscription = monitor.subscribe(7);
    await monitor.unsubscribe(7);
    const replacementSubscription = monitor.subscribe(7);

    fake.resolveAttach();
    await obsoleteSubscription;
    fake.resolveAttach();
    await replacementSubscription;
    fake.resolveDetach();

    fake.emit('Network.responseReceived', {
      requestId: 'replacement-after-late-detach',
      response: { status: 200, url: timelineUrl('HomeTimeline') },
    });
    fake.emit('Network.loadingFinished', { requestId: 'replacement-after-late-detach' });
    await flush();

    expect(fake.detachedTargets).toEqual([{ tabId: 7 }]);
    expect(fake.commands.filter((method) => method === 'Network.getResponseBody')).toHaveLength(1);
    expect(fake.emittedDetachReasons).toEqual(['canceled_by_user']);
    expect(onItems).toHaveBeenCalledOnce();
    expect(onItems).toHaveBeenCalledWith(7, [
      { id: '2099429059063341169', text: 'slot gacor hari ini' },
    ]);
  });

  it('detaches immediately when unsubscribed during Network.enable', async () => {
    const fake = createDebugger(timelineBody, { delayEnable: true });
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new XTimelineMonitor(fake.api, onItems);

    const subscription = monitor.subscribe(7);
    await flush();
    await monitor.unsubscribe(7);

    expect(fake.detachedTargets).toEqual([{ tabId: 7 }]);

    fake.resolveEnable();
    await subscription;
    fake.emit('Network.responseReceived', {
      requestId: 'cancelled-enable',
      response: { status: 200, url: timelineUrl('HomeTimeline') },
    });
    fake.emit('Network.loadingFinished', { requestId: 'cancelled-enable' });
    await flush();

    expect(fake.detachedTargets).toEqual([{ tabId: 7 }]);
    expect(fake.commands).not.toContain('Network.getResponseBody');
    expect(onItems).not.toHaveBeenCalled();
  });

  it('cancels initialization when Chrome detaches before Network.enable completes', async () => {
    const fake = createDebugger(timelineBody, { delayEnable: true });
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new XTimelineMonitor(fake.api, onItems);

    const subscription = monitor.subscribe(7);
    await flush();
    fake.detach('target_closed');
    fake.resolveEnable();
    await subscription;

    fake.emit('Network.responseReceived', {
      requestId: 'detached-during-initialization',
      response: { status: 200, url: timelineUrl('HomeTimeline') },
    });
    fake.emit('Network.loadingFinished', { requestId: 'detached-during-initialization' });
    await flush();

    expect(fake.detachedTargets).toEqual([]);
    expect(fake.commands).not.toContain('Network.getResponseBody');
    expect(onItems).not.toHaveBeenCalled();
  });

  it('clears tracked IDs when Chrome detaches during delayed body retrieval', async () => {
    const fake = createDebugger(timelineBody);
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new XTimelineMonitor(fake.api, onItems);
    const sendCommand = fake.api.sendCommand;
    let resolveBody: ((result?: unknown) => void) | undefined;
    fake.api.sendCommand = (_target, method, _params, callback) => {
      fake.commands.push(method);
      if (method === 'Network.getResponseBody') {
        resolveBody = callback;
        return;
      }
      callback();
    };

    await monitor.subscribe(7);
    fake.emit('Network.responseReceived', {
      requestId: 'reused-after-detach',
      response: { status: 200, url: timelineUrl('HomeTimeline') },
    });
    fake.emit('Network.responseReceived', {
      requestId: 'delayed-body',
      response: { status: 200, url: timelineUrl('SearchTimeline') },
    });
    fake.emit('Network.loadingFinished', { requestId: 'delayed-body' });
    await flush();

    const stalePendingRequestIds = pendingRequestIdsFor(monitor, 7);
    expect(resolveBody).toBeTypeOf('function');
    expect(stalePendingRequestIds).toEqual(new Set(['reused-after-detach']));

    fake.detach('target_closed');
    resolveBody?.({ body: timelineBody });
    await flush();

    expect(stalePendingRequestIds).toEqual(new Set());
    expect(onItems).not.toHaveBeenCalled();
    fake.api.sendCommand = sendCommand;

    await monitor.subscribe(7);
    fake.emit('Network.responseReceived', {
      requestId: 'reused-after-detach',
      response: { status: 200, url: timelineUrl('HomeTimeline') },
    });
    fake.emit('Network.loadingFinished', { requestId: 'reused-after-detach' });
    await flush();

    expect(onItems).toHaveBeenCalledWith(7, [
      { id: '2099429059063341169', text: 'slot gacor hari ini' },
    ]);
  });

  it('forgets a tab after Chrome detaches the debugger', async () => {
    const fake = createDebugger(timelineBody);
    const monitor = new XTimelineMonitor(fake.api, vi.fn(() => Promise.resolve()));

    await monitor.subscribe(7);
    fake.detach('target_closed');
    await monitor.unsubscribe(7);

    expect(fake.detachedTargets).toEqual([]);
  });
});

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function pendingRequestIdsFor(monitor: unknown, tabId: number): Set<string> | undefined {
  if (!monitor || typeof monitor !== 'object' || !('tabs' in monitor)) {
    return undefined;
  }
  const tabs = monitor.tabs;
  if (!(tabs instanceof Map)) {
    return undefined;
  }
  const state = tabs.get(tabId);
  if (!state || typeof state !== 'object' || !('pendingRequestIds' in state)) {
    return undefined;
  }
  const pendingRequestIds = state.pendingRequestIds;
  return pendingRequestIds instanceof Set ? pendingRequestIds : undefined;
}
