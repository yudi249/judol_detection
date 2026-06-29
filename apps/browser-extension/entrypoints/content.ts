import {
  createScanBatchMessage,
  createScanBatchRequest,
  scanVisibleTextCandidates,
} from '@/dom';

const processedNodes = new WeakSet<Node>();

export default defineContentScript({
  matches: [
    '*://*.youtube.com/*',
    'https://web.telegram.org/*',
    '*://x.com/*',
    '*://*.x.com/*',
    '*://twitter.com/*',
    '*://*.twitter.com/*',
    'http://localhost/*',
    'http://localhost:*/*',
    'http://127.0.0.1/*',
    'http://127.0.0.1:*/*',
  ],
  main(ctx) {
    const runInitialScan = async () => {
      if (ctx.isInvalid) {
        return;
      }

      const candidates = scanVisibleTextCandidates(document.body, {
        processedNodes,
      });
      const request = createScanBatchRequest(candidates, {
        url: location.href,
        pageTitle: document.title,
      });
      const message = createScanBatchMessage(request);

      try {
        await browser.runtime.sendMessage(message);
      } catch (error) {
        console.debug('JudolLens scan message is waiting for EXT-007.', error);
      }
    };

    if (document.readyState === 'loading') {
      ctx.addEventListener(document, 'DOMContentLoaded', () => {
        void runInitialScan();
      });
      return;
    }

    void runInitialScan();
  },
});
