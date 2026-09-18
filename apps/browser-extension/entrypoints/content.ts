import {
  canStartTelegramViewportPrefetch,
  createDynamicContentObserver,
  createSelectionAnalyzeTrigger,
  createTelegramViewportScheduler,
  createXTimelineReconciler,
  createYouTubeBrowseReconciler,
  isContentContextInvalid,
  registerRuntimeMessageListenerSafely,
  resolveTelegramScrollContainer,
  runJudolLensScanForRoots,
  sendRuntimeMessageSafely,
  shouldUseTelegramViewportPrefetch,
} from '@/dom';
import {
  detectPlatformFromUrl,
  MESSAGE_TYPES,
  type XTimelinePredictionsMessage,
  type YouTubeBrowsePredictionsMessage,
} from '@/shared';

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
    const isYouTubePage = detectPlatformFromUrl(location.href) === 'youtube';
    const isTelegramPage = shouldUseTelegramViewportPrefetch(location.href);
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

    const startSelectionAnalysis = () => {
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
      return selectionTrigger.stop;
    };

    if (isYouTubePage) {
      let currentUrl = location.href;
      let stopPageScanning: (() => void) | undefined;
      let lifecycleId = 0;

      const stopYouTubePageScanning = () => {
        lifecycleId += 1;
        stopPageScanning?.();
        stopPageScanning = undefined;
      };

      const startYouTubePageScanning = async (mode: YouTubePageMode) => {
        const currentLifecycleId = ++lifecycleId;
        if (mode === 'browse') {
          const reconciler = createYouTubeBrowseReconciler(document.body);
          const receiveBrowsePredictions = (message: unknown) => {
            const browseMessage = message as YouTubeBrowsePredictionsMessage;
            if (browseMessage?.type === MESSAGE_TYPES.youtubeBrowsePredictions) {
              reconciler.remember(browseMessage.payload.results);
            }
          };
          registerRuntimeMessageListenerSafely(ctx, () =>
            browser.runtime.onMessage.addListener(receiveBrowsePredictions),
          );
          reconciler.start();
          const stop = () => {
            browser.runtime.onMessage.removeListener(receiveBrowsePredictions);
            reconciler.stop();
            void sendRuntimeMessageSafely(
              ctx,
              (message) => browser.runtime.sendMessage(message),
              { type: MESSAGE_TYPES.youtubeBrowseUnsubscribe },
            );
          };

          if (lifecycleId !== currentLifecycleId || isContentContextInvalid(ctx)) {
            stop();
            return;
          }

          stopPageScanning = stop;
          await sendRuntimeMessageSafely(
            ctx,
            (message) => browser.runtime.sendMessage(message),
            { type: MESSAGE_TYPES.youtubeBrowseSubscribe },
          );
          return;
        }

        await runScanForRoots([document.body]);
        if (lifecycleId !== currentLifecycleId || isContentContextInvalid(ctx)) {
          return;
        }

        const observer = createDynamicContentObserver({
          root: document.body,
          onScan: runScanForRoots,
          setTimer: (callback, delay) => ctx.setTimeout(callback, delay),
        });
        observer.start();
        stopPageScanning = observer.stop;
      };

      const handleYouTubeNavigation = () => {
        const transition = getYouTubePageModeTransition(currentUrl, location.href);
        currentUrl = location.href;
        if (!transition) {
          return;
        }

        stopYouTubePageScanning();
        void startYouTubePageScanning(transition.to);
      };

      const startYouTubeLifecycle = () => {
        const stopSelectionAnalysis = startSelectionAnalysis();
        cleanup = () => {
          stopYouTubePageScanning();
          stopSelectionAnalysis();
        };
        ctx.addEventListener(document, 'yt-navigate-finish', handleYouTubeNavigation);
        ctx.addEventListener(window, 'pagehide', cleanup);
        void startYouTubePageScanning(getYouTubePageMode(location.href));
      };

      if (document.readyState === 'loading') {
        ctx.addEventListener(document, 'DOMContentLoaded', startYouTubeLifecycle);
      } else {
        startYouTubeLifecycle();
      }

      return;
    }
    const startGenericPageScanning = async (): Promise<(() => void) | undefined> => {
      await runScanForRoots([document.body]);
      if (isContentContextInvalid(ctx)) {
        return undefined;
      }
      const observer = createDynamicContentObserver({
        root: document.body,
        onScan: runScanForRoots,
        setTimer: (callback, delay) => ctx.setTimeout(callback, delay),
      });
      observer.start();
      return observer.stop;
    };

    const startTelegramPageScanning = async (): Promise<(() => void) | undefined> => {
      const scrollContainer = resolveTelegramScrollContainer(document.body);
      if (!canStartTelegramViewportPrefetch(
        scrollContainer,
        typeof IntersectionObserver !== 'undefined',
      )) {
        return startGenericPageScanning();
      }
      const scheduler = createTelegramViewportScheduler({
        root: document.body,
        scrollContainer,
        onScan: runScanForRoots,
        queueInitialBubbles: true,
        addScrollListener: (listener) =>
          scrollContainer.addEventListener('scroll', listener, { passive: true }),
        removeScrollListener: (listener) => scrollContainer.removeEventListener('scroll', listener),
      });
      scheduler.start();
      return scheduler.stop;
    };

    const startScanning = async () => {
      let stopPageScanning: (() => void) | undefined;
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
        stopPageScanning = isTelegramPage
          ? await startTelegramPageScanning()
          : await startGenericPageScanning();
        if (!stopPageScanning) {
          return;
        }
      }

      if (isContentContextInvalid(ctx)) {
        stopPageScanning?.();
        return;
      }

      const stopSelectionAnalysis = startSelectionAnalysis();

      cleanup = () => {
        stopPageScanning?.();
        stopSelectionAnalysis();
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

export function isYouTubeHomeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'youtube.com' || parsed.hostname.endsWith('.youtube.com')) &&
      parsed.pathname === '/'
    );
  } catch {
    return false;
  }
}

export type YouTubePageMode = 'browse' | 'generic';

export function getYouTubePageMode(url: string): YouTubePageMode {
  return isYouTubeHomeUrl(url) ? 'browse' : 'generic';
}

export function getYouTubePageModeTransition(
  previousUrl: string,
  currentUrl: string,
): { from: YouTubePageMode; to: YouTubePageMode } | null {
  const from = getYouTubePageMode(previousUrl);
  const to = getYouTubePageMode(currentUrl);
  return from === to ? null : { from, to };
}
