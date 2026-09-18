import { describe, expect, it, vi } from 'vitest';

import { YouTubeBrowseMonitor } from './youtube-browse-monitor';

type DebuggerTarget = { tabId: number };
type DebuggerEvent = (
  source: DebuggerTarget,
  method: string,
  params?: Record<string, unknown>,
) => void;
type ResponseBody = { body?: string; base64Encoded?: boolean };

type FakeOptions = {
  delayAttach?: boolean;
  delayEnable?: boolean;
  delayDetachEvent?: boolean;
  delayBody?: boolean;
};

function createDebugger(
  bodies: Record<string, ResponseBody>,
  {
    delayAttach = false,
    delayEnable = false,
    delayDetachEvent = false,
    delayBody = false,
  }: FakeOptions = {},
) {
  let eventListener: DebuggerEvent | undefined;
  let detachListener: ((source: DebuggerTarget, reason: string) => void) | undefined;
  const attachCallbacks: (() => void)[] = [];
  const enableCallbacks: (() => void)[] = [];
  const detachCallbacks: (() => void)[] = [];
  const bodyCallbacks: ((result?: unknown) => void)[] = [];
  const commands: { method: string; params: Record<string, unknown> }[] = [];
  const detachedTargets: DebuggerTarget[] = [];
  const emittedDetachReasons: string[] = [];

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
        params: Record<string, unknown>,
        callback: (result?: unknown) => void,
      ) => {
        commands.push({ method, params });
        if (method === 'Network.enable' && delayEnable) {
          enableCallbacks.push(callback);
          return;
        }
        if (method === 'Network.getResponseBody') {
          const body = bodies[String(params.requestId)] ?? {};
          if (delayBody) {
            bodyCallbacks.push(() => callback(body));
            return;
          }
          callback(body);
          return;
        }
        callback();
      },
      onEvent: { addListener: (listener: DebuggerEvent) => { eventListener = listener; } },
      onDetach: {
        addListener: (listener: (source: DebuggerTarget, reason: string) => void) => {
          detachListener = listener;
        },
      },
    },
    commands,
    detachedTargets,
    emittedDetachReasons,
    emit: (method: string, params: Record<string, unknown>) =>
      eventListener?.({ tabId: 7 }, method, params),
    detach: (reason: string) => detachListener?.({ tabId: 7 }, reason),
    resolveAttach: () => attachCallbacks.shift()?.(),
    resolveEnable: () => enableCallbacks.shift()?.(),
    resolveDetach: () => detachCallbacks.shift()?.(),
    resolveBody: () => bodyCallbacks.shift()?.(),
  };
}

function browseUrl(host = 'www.youtube.com', pathname = '/youtubei/v1/browse'): string {
  return `https://${host}${pathname}`;
}

function browsePayload(...items: { id: string; text: string }[]): string {
  return JSON.stringify({
    contents: {
      twoColumnBrowseResultsRenderer: {
        tabs: [{
          tabRenderer: {
            selected: true,
            content: {
              richGridRenderer: {
                contents: items.map(({ id, text }) => ({
                  richItemRenderer: {
                    content: {
                      lockupViewModel: {
                        contentId: id,
                        contentType: 'LOCKUP_CONTENT_TYPE_VIDEO',
                        metadata: { lockupMetadataViewModel: { title: { content: text } } },
                      },
                    },
                  },
                })),
              },
            },
          },
        }],
      },
    },
  });
}

function responseReceived(requestId: string, url = browseUrl(), status = 200): Record<string, unknown> {
  return { requestId, response: { status, url } };
}

function responseBodyCommands(fake: { commands: { method: string; params: Record<string, unknown> }[] }) {
  return fake.commands.filter(({ method }) => method === 'Network.getResponseBody');
}

describe('YouTube browse monitor', () => {
  it('captures parsed video items from a successful YouTube browse response', async () => {
    const fake = createDebugger({ browse: { body: browsePayload({ id: 'video-1', text: 'slot gacor' }) } });
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new YouTubeBrowseMonitor(fake.api, onItems);

    await monitor.subscribe(7);
    fake.emit('Network.responseReceived', responseReceived('browse', browseUrl('music.youtube.com')));
    fake.emit('Network.loadingFinished', { requestId: 'browse' });
    await flush();

    expect(responseBodyCommands(fake)).toEqual([{ method: 'Network.getResponseBody', params: { requestId: 'browse' } }]);
    expect(onItems).toHaveBeenCalledWith(7, [{ id: 'video-1', text: 'slot gacor' }]);
  });

  it('does not read bodies from unsupported URLs or non-200 responses', async () => {
    const fake = createDebugger({ accepted: { body: browsePayload({ id: 'video-1', text: 'accepted' }) } });
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new YouTubeBrowseMonitor(fake.api, onItems);

    await monitor.subscribe(7);
    const unsupportedResponses: [string, string, number][] = [
      ['wrong-host', browseUrl('not-youtube.com'), 200],
      ['wrong-path', browseUrl('www.youtube.com', '/youtubei/v1/next'), 200],
      ['path-suffix', browseUrl('www.youtube.com', '/youtubei/v1/browse/extra'), 200],
      ['status', browseUrl(), 503],
      ['invalid-url', 'not a url', 200],
    ];
    for (const [requestId, url, status] of unsupportedResponses) {
      fake.emit('Network.responseReceived', responseReceived(requestId, url, status));
      fake.emit('Network.loadingFinished', { requestId });
    }
    fake.emit('Network.responseReceived', responseReceived('accepted', browseUrl('youtube.com')));
    fake.emit('Network.loadingFinished', { requestId: 'accepted' });
    await flush();

    expect(responseBodyCommands(fake)).toHaveLength(1);
    expect(onItems).toHaveBeenCalledWith(7, [{ id: 'video-1', text: 'accepted' }]);
  });

  it('does not read a body from an HTTP YouTube browse URL', async () => {
    const fake = createDebugger({ insecure: { body: browsePayload({ id: 'video-1', text: 'insecure' }) } });
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new YouTubeBrowseMonitor(fake.api, onItems);

    await monitor.subscribe(7);
    fake.emit(
      'Network.responseReceived',
      responseReceived('insecure', 'http://www.youtube.com/youtubei/v1/browse'),
    );
    fake.emit('Network.loadingFinished', { requestId: 'insecure' });
    await flush();

    expect(responseBodyCommands(fake)).toEqual([]);
    expect(onItems).not.toHaveBeenCalled();
  });

  it('decodes base64 browse bodies before parsing', async () => {
    const body = browsePayload({ id: 'video-encoded', text: 'encoded result' });
    const fake = createDebugger({ encoded: { body: btoa(body), base64Encoded: true } });
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new YouTubeBrowseMonitor(fake.api, onItems);

    await monitor.subscribe(7);
    fake.emit('Network.responseReceived', responseReceived('encoded'));
    fake.emit('Network.loadingFinished', { requestId: 'encoded' });
    await flush();

    expect(onItems).toHaveBeenCalledWith(7, [{ id: 'video-encoded', text: 'encoded result' }]);
  });

  it('recovers after a malformed body and processes a later valid response', async () => {
    const fake = createDebugger({
      malformed: { body: '{not json' },
      valid: { body: browsePayload({ id: 'video-valid', text: 'later result' }) },
    });
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new YouTubeBrowseMonitor(fake.api, onItems);

    await monitor.subscribe(7);
    for (const requestId of ['malformed', 'valid']) {
      fake.emit('Network.responseReceived', responseReceived(requestId));
      fake.emit('Network.loadingFinished', { requestId });
      await flush();
    }

    expect(responseBodyCommands(fake)).toHaveLength(2);
    expect(onItems).toHaveBeenCalledTimes(1);
    expect(onItems).toHaveBeenCalledWith(7, [{ id: 'video-valid', text: 'later result' }]);
  });

  it('deduplicates response IDs per tab while preserving bounded insertion order', async () => {
    const bodies: Record<string, ResponseBody> = {};
    for (let index = 0; index <= 500; index += 1) {
      bodies[`response-${index}`] = { body: browsePayload({ id: `video-${index}`, text: `text ${index}` }) };
    }
    bodies.repeated = { body: browsePayload({ id: 'video-500', text: 'repeat' }) };
    bodies.evicted = { body: browsePayload({ id: 'video-0', text: 'reintroduced' }) };
    const fake = createDebugger(bodies);
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new YouTubeBrowseMonitor(fake.api, onItems);

    await monitor.subscribe(7);
    for (let index = 0; index <= 500; index += 1) {
      const requestId = `response-${index}`;
      fake.emit('Network.responseReceived', responseReceived(requestId));
      fake.emit('Network.loadingFinished', { requestId });
    }
    fake.emit('Network.responseReceived', responseReceived('repeated'));
    fake.emit('Network.loadingFinished', { requestId: 'repeated' });
    fake.emit('Network.responseReceived', responseReceived('evicted'));
    fake.emit('Network.loadingFinished', { requestId: 'evicted' });
    await flush();

    expect(onItems).toHaveBeenCalledTimes(502);
    expect(onItems).toHaveBeenLastCalledWith(7, [{ id: 'video-0', text: 'reintroduced' }]);
  });

  it('forgets a failed supported response before its request ID is reused', async () => {
    const fake = createDebugger({ reused: { body: browsePayload({ id: 'video-1', text: 'should not read' }) } });
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new YouTubeBrowseMonitor(fake.api, onItems);

    await monitor.subscribe(7);
    fake.emit('Network.responseReceived', responseReceived('reused'));
    fake.emit('Network.loadingFailed', { requestId: 'reused' });
    fake.emit('Network.responseReceived', responseReceived('reused', browseUrl(), 503));
    fake.emit('Network.loadingFinished', { requestId: 'reused' });
    await flush();

    expect(responseBodyCommands(fake)).toEqual([]);
    expect(onItems).not.toHaveBeenCalled();
  });

  it('makes a pending response inert after unsubscribe', async () => {
    const fake = createDebugger({ pending: { body: browsePayload({ id: 'video-1', text: 'late' }) } });
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new YouTubeBrowseMonitor(fake.api, onItems);

    await monitor.subscribe(7);
    fake.emit('Network.responseReceived', responseReceived('pending'));
    await monitor.unsubscribe(7);
    fake.emit('Network.loadingFinished', { requestId: 'pending' });
    await flush();

    expect(fake.detachedTargets).toEqual([{ tabId: 7 }]);
    expect(responseBodyCommands(fake)).toEqual([]);
    expect(onItems).not.toHaveBeenCalled();
  });

  it('clears delayed retrieval state after an external detach', async () => {
    const fake = createDebugger(
      { delayed: { body: browsePayload({ id: 'video-1', text: 'late' }) } },
      { delayBody: true },
    );
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new YouTubeBrowseMonitor(fake.api, onItems);

    await monitor.subscribe(7);
    fake.emit('Network.responseReceived', responseReceived('delayed'));
    fake.emit('Network.loadingFinished', { requestId: 'delayed' });
    await flush();
    fake.detach('target_closed');
    fake.resolveBody();
    await flush();

    expect(onItems).not.toHaveBeenCalled();
    await monitor.unsubscribe(7);
    expect(fake.detachedTargets).toEqual([]);
  });

  it('cancels setup cleanly when unsubscribed while attach is pending', async () => {
    const fake = createDebugger({}, { delayAttach: true });
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new YouTubeBrowseMonitor(fake.api, onItems);

    const subscription = monitor.subscribe(7);
    await monitor.unsubscribe(7);
    fake.resolveAttach();
    await subscription;

    expect(fake.detachedTargets).toEqual([{ tabId: 7 }]);
    expect(onItems).not.toHaveBeenCalled();
  });

  it('cancels setup cleanly when unsubscribed while Network.enable is pending', async () => {
    const fake = createDebugger({}, { delayEnable: true });
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new YouTubeBrowseMonitor(fake.api, onItems);

    const subscription = monitor.subscribe(7);
    await flush();
    await monitor.unsubscribe(7);
    fake.resolveEnable();
    await subscription;

    expect(fake.detachedTargets).toEqual([{ tabId: 7 }]);
    expect(onItems).not.toHaveBeenCalled();
  });

  it('clears a replacement after its external cancellation despite a delayed explicit detach', async () => {
    const fake = createDebugger(
      { replacement: { body: browsePayload({ id: 'video-1', text: 'should not read' }) } },
      { delayDetachEvent: true },
    );
    const onItems = vi.fn(() => Promise.resolve());
    const monitor = new YouTubeBrowseMonitor(fake.api, onItems);

    await monitor.subscribe(7);
    await monitor.unsubscribe(7);
    await monitor.subscribe(7);
    fake.detach('canceled_by_user');
    fake.resolveDetach();
    fake.emit('Network.responseReceived', responseReceived('replacement'));
    fake.emit('Network.loadingFinished', { requestId: 'replacement' });
    await flush();

    expect(fake.detachedTargets).toEqual([{ tabId: 7 }]);
    expect(fake.emittedDetachReasons).toEqual(['canceled_by_user']);
    expect(responseBodyCommands(fake)).toEqual([]);
    expect(onItems).not.toHaveBeenCalled();
  });
});

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
