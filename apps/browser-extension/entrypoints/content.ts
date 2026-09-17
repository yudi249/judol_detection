import {
  createDynamicContentObserver,
  createSelectionAnalyzeTrigger,
  createXTimelineReconciler,
  runJudolLensScanForRoots,
  isContentContextInvalid,
  registerRuntimeMessageListenerSafely,
  sendRuntimeMessageSafely,
} from '@/dom';
import { detectPlatformFromUrl, MESSAGE_TYPES, type XTimelinePredictionsMessage } from '@/shared';

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
    'http://127.0.0.1/*',
  ],
  main(ctx) {
    const isXPage = detectPlatformFromUrl(location.href) === 'x';
    let cleanup: (() => void) | undefined;
    ctx.onInvalidated(() => cleanup?.());
    const runScanForRoots = async (roots: ParentNode[]) => {
      if (isContentContextInvalid(ctx)) {
        return;
      }

      try {
        await runJudolLensScanForRoots({
          roots,
          url: location.href,
          pageTitle: document.title,
          processedNodes,
          sendMessage: (message) =>
            sendRuntimeMessageSafely(ctx, (runtimeMessage) => browser.runtime.sendMessage(runtimeMessage), message),
          onPredictionResults: undefined,
        });
      } catch (error) {
        console.debug('JudolLens overlay scan failed safely.', error);
        if (isXPage) {
          throw error;
        }
      }
    };

    const startScanning = async () => {
      let stopPageScanning: () => void;
      if (isXPage) {
        const reconciler = createXTimelineReconciler(document.body);
        const receiveTimelinePredictions = (message: unknown) => {
          const timelineMessage = message as XTimelinePredictionsMessage;
          if (timelineMessage?.type === MESSAGE_TYPES.xTimelinePredictions) {
            reconciler.remember(timelineMessage.payload.results);
          }
        };
        registerRuntimeMessageListenerSafely(ctx, () =>
          browser.runtime.onMessage.addListener(receiveTimelinePredictions),
        );
        reconciler.start();
        await sendRuntimeMessageSafely(
          ctx,
          (message) => browser.runtime.sendMessage(message),
          { type: MESSAGE_TYPES.xTimelineSubscribe },
        );
        stopPageScanning = () => {
          browser.runtime.onMessage.removeListener(receiveTimelinePredictions);
          reconciler.stop();
          void sendRuntimeMessageSafely(
            ctx,
            (message) => browser.runtime.sendMessage(message),
            { type: MESSAGE_TYPES.xTimelineUnsubscribe },
          );
        };
      } else {
        await runScanForRoots([document.body]);

        if (isContentContextInvalid(ctx)) {
          return;
        }

        const observer = createDynamicContentObserver({
          root: document.body,
          onScan: runScanForRoots,
          setTimer: (callback, delay) => ctx.setTimeout(callback, delay),
        });
        observer.start();
        stopPageScanning = observer.stop;
      }

      if (isContentContextInvalid(ctx)) {
        stopPageScanning();
        return;
      }

      const selectionTrigger = createSelectionAnalyzeTrigger({
        onAnalyze: (inputText) =>
          sendRuntimeMessageSafely(
            ctx,
            (message) => browser.runtime.sendMessage(message),
            {
              type: MESSAGE_TYPES.openManualAnalysis,
              payload: {
                inputText,
                sourceUrl: location.href,
              },
            },
          ),
      });
      selectionTrigger.start();

      cleanup = () => {
        stopPageScanning();
        selectionTrigger.stop();
      };

      ctx.addEventListener(window, 'pagehide', cleanup);
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
