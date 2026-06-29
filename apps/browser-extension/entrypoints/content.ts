import {
  createDynamicContentObserver,
  runJudolLensScanForRoots,
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
    const runScanForRoots = async (roots: ParentNode[]) => {
      if (ctx.isInvalid) {
        return;
      }

      try {
        await runJudolLensScanForRoots({
          roots,
          url: location.href,
          pageTitle: document.title,
          processedNodes,
          sendMessage: (message) => browser.runtime.sendMessage(message),
        });
      } catch (error) {
        console.debug('JudolLens overlay scan failed safely.', error);
      }
    };

    const startScanning = async () => {
      await runScanForRoots([document.body]);

      if (ctx.isInvalid) {
        return;
      }

      const observer = createDynamicContentObserver({
        root: document.body,
        onScan: runScanForRoots,
        setTimer: (callback, delay) => ctx.setTimeout(callback, delay),
      });
      observer.start();

      ctx.addEventListener(window, 'pagehide', () => {
        observer.stop();
      });
    };

    if (document.readyState === 'loading') {
      ctx.addEventListener(document, 'DOMContentLoaded', () => {
        void startScanning();
      });
      return;
    }

    void startScanning();
  },
});
