import type { DetectionAction, PredictionResult, RiskLevel } from '../shared';
import { applyCachedTweetCensor } from './overlay';
const X_STATUS_ID_PATTERN = /\/status\/(\d+)(?:[/?#]|$)/;

const X_TWEET_SELECTOR = 'article[data-testid="tweet"]';
const MAX_CACHED_TWEETS = 100;

type CachedTweetCensor = {
  id: string;
  riskLevel: RiskLevel;
  action: Extract<DetectionAction, 'blur' | 'hide' | 'warn'>;
};

export type XTimelineReconciler = {
  start: () => void;
  stop: () => void;
  remember: (results: PredictionResult[]) => void;
  reconcile: () => void;
};

export function createXTimelineReconciler(root: ParentNode): XTimelineReconciler {
  const censorByTweetId = new Map<string, CachedTweetCensor>();
  let observer: MutationObserver | undefined;

  const reconcile = () => {
    for (const tweet of root.querySelectorAll<HTMLElement>(X_TWEET_SELECTOR)) {
      const tweetId = getXStatusId(tweet);
      const result = tweetId ? censorByTweetId.get(tweetId) : undefined;
      if (result) {
        applyCachedTweetCensor(tweet, result);
      }
    }
  };

  return {
    start() {
      if (observer || typeof MutationObserver === 'undefined') {
        return;
      }

      observer = new MutationObserver(() => reconcile());
      observer.observe(root, { childList: true, subtree: true });
      reconcile();
    },
    stop() {
      observer?.disconnect();
      observer = undefined;
    },
    remember(results) {
      for (const result of results) {
        if (
          result.label !== 'judol' ||
          (result.action !== 'blur' &&
            result.action !== 'hide' &&
            result.action !== 'warn')
        ) {
          continue;
        }

        censorByTweetId.delete(result.id);
        censorByTweetId.set(result.id, {
          id: result.id,
          riskLevel: result.riskLevel,
          action: result.action,
        });
        while (censorByTweetId.size > MAX_CACHED_TWEETS) {
          const oldest = censorByTweetId.keys().next().value;
          if (!oldest) {
            break;
          }
          censorByTweetId.delete(oldest);
        }
      }
      reconcile();
    },
    reconcile,
  };
}

function getXStatusId(tweet: HTMLElement): string | undefined {
  const href = tweet.querySelector<HTMLAnchorElement>('a[href*="/status/"]')?.href;
  return href?.match(X_STATUS_ID_PATTERN)?.[1];
}
