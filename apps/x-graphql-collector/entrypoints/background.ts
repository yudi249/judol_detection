import { DebuggerMonitor } from '../src/monitor/debugger-monitor';
import { getChromeApi } from '../src/shared/chrome-api';
import type { CollectorRequest } from '../src/shared/messages';

export default defineBackground(() => {
  const api = getChromeApi();
  const monitor = new DebuggerMonitor(api, api.storage.local);

  api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void handleMessage(monitor, message as CollectorRequest)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: messageOf(error), state: undefined }));
    return true;
  });
});

async function handleMessage(monitor: DebuggerMonitor, message: CollectorRequest) {
  switch (message.type) {
    case 'collector:start':
      return { ok: true, state: await monitor.start(message.tabId, message.query, message.searchProduct) };
    case 'collector:stop':
      return { ok: true, state: await monitor.stop() };
    case 'collector:auto-scroll-start':
      return { ok: true, state: monitor.startAutoScroll() };
    case 'collector:auto-scroll-stop':
      return { ok: true, state: monitor.stopAutoScroll() };
    case 'collector:get-state':
      return { ok: true, state: await monitor.getState() };
    case 'collector:clear':
      return { ok: true, state: await monitor.clear() };
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
