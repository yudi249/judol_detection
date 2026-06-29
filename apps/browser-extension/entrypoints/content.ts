import { runJudolLensScanOnce } from '@/dom';

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

      try {
        await runJudolLensScanOnce({
          root: document.body,
          url: location.href,
          pageTitle: document.title,
          processedNodes,
          sendMessage: (message) => browser.runtime.sendMessage(message),
        });
      } catch (error) {
        console.debug('JudolLens overlay scan failed safely.', error);
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
