import type { DetectionAction, PredictionResult } from '../shared';
import {
  applyCachedYouTubeVideoCensor,
  type CachedYouTubeVideoCensor,
} from './overlay';

const YOUTUBE_CARD_SELECTOR = 'ytd-rich-item-renderer';
const MAX_CACHED_VIDEOS = 100;

type CachedAction = Extract<DetectionAction, 'blur' | 'hide' | 'warn'>;

export type YouTubeBrowseReconciler = {
  start: () => void;
  stop: () => void;
  remember: (results: PredictionResult[]) => void;
  reconcile: () => void;
};

export function createYouTubeBrowseReconciler(root: ParentNode): YouTubeBrowseReconciler {
  const censorByVideoId = new Map<string, CachedYouTubeVideoCensor>();
  let observer: MutationObserver | undefined;

  const reconcile = () => {
    for (const card of root.querySelectorAll<HTMLElement>(YOUTUBE_CARD_SELECTOR)) {
      const videoId = getYouTubeWatchId(card);
      const cached = videoId ? censorByVideoId.get(videoId) : undefined;
      if (cached) {
        applyCachedYouTubeVideoCensor(card, cached);
      }
    }
  };

  return {
    start() {
      if (!observer && typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(reconcile);
        observer.observe(root, { childList: true, subtree: true });
      }
      reconcile();
    },
    stop() {
      observer?.disconnect();
      observer = undefined;
    },
    remember(results) {
      for (const result of results) {
        if (result.label !== 'judol' || !isCachedAction(result.action)) {
          continue;
        }

        censorByVideoId.delete(result.id);
        censorByVideoId.set(result.id, {
          id: result.id,
          riskLevel: result.riskLevel,
          action: result.action,
        });
        while (censorByVideoId.size > MAX_CACHED_VIDEOS) {
          const oldest = censorByVideoId.keys().next().value;
          if (!oldest) {
            break;
          }
          censorByVideoId.delete(oldest);
        }
      }
      reconcile();
    },
    reconcile,
  };
}

function isCachedAction(action: DetectionAction): action is CachedAction {
  return action === 'blur' || action === 'hide' || action === 'warn';
}
function getYouTubeWatchId(card: HTMLElement): string | undefined {
  const anchor = card.querySelector<HTMLAnchorElement>('a[href]');
  if (!anchor) {
    return undefined;
  }

  try {
    const url = new URL(anchor.href, window.location.href);
    return url.pathname === '/watch' ? url.searchParams.get('v')?.trim() || undefined : undefined;
  } catch {
    return undefined;
  }
}
