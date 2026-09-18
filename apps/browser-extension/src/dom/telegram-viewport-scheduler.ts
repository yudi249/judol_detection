export type TelegramViewportSchedulerOptions = {
  root: HTMLElement;
  scrollContainer: HTMLElement;
  onScan: (roots: ParentNode[]) => Promise<void> | void;
  intersectionObserverFactory?: (
    callback: IntersectionObserverCallback,
    options: IntersectionObserverInit,
  ) => IntersectionObserver;
  mutationObserverFactory?: (callback: MutationCallback) => MutationObserver;
  addScrollListener?: (listener: EventListener) => void;
  removeScrollListener?: (listener: EventListener) => void;
  getScrollTop?: () => number;
  queueInitialBubbles?: boolean;
};

export type TelegramViewportScheduler = {
  start: () => void;
  stop: () => void;
};

import { detectPlatformFromUrl } from '../shared';

const BUBBLE_SELECTOR = '.bubble';
const MAX_BATCH_SIZE = 12;
const SCROLL_DEADBAND_PX = 8;

type ScrollDirection = 'down' | 'up' | 'idle';

function isScrollable(element: HTMLElement): boolean {
  const overflowY = getComputedStyle(element).overflowY;
  return (
    (overflowY === 'auto' || overflowY === 'scroll') &&
    element.scrollHeight > element.clientHeight
  );
}

/** Returns the scrollable ancestor shared by the largest number of rendered bubbles. */
export function resolveTelegramScrollContainer(root: HTMLElement): HTMLElement | null {
  const counts = new Map<HTMLElement, number>();

  for (const bubble of root.querySelectorAll<HTMLElement>(BUBBLE_SELECTOR)) {
    let ancestor = bubble.parentElement;
    while (ancestor && root.contains(ancestor)) {
      if (isScrollable(ancestor)) {
        counts.set(ancestor, (counts.get(ancestor) ?? 0) + 1);
        break;
      }
      if (ancestor === root) {
        break;
      }
      ancestor = ancestor.parentElement;
    }
  }

  let resolved: HTMLElement | null = null;
  let greatestCount = 0;
  for (const [candidate, count] of counts) {
    if (count > greatestCount) {
      resolved = candidate;
      greatestCount = count;
    }
  }
  return resolved;
}

export function shouldUseTelegramViewportPrefetch(url: string): boolean {
  return detectPlatformFromUrl(url) === 'telegram';
}

export function canStartTelegramViewportPrefetch(
  scrollContainer: HTMLElement | null | undefined,
  intersectionObserverAvailable: boolean,
): scrollContainer is HTMLElement {
  return scrollContainer !== null && scrollContainer !== undefined && intersectionObserverAvailable;
}

export function createTelegramViewportScheduler(
  options: TelegramViewportSchedulerOptions,
): TelegramViewportScheduler {
  const {
    root,
    scrollContainer,
    onScan,
    intersectionObserverFactory = (callback, observerOptions) =>
      new IntersectionObserver(callback, observerOptions),
    mutationObserverFactory = (callback) => new MutationObserver(callback),
    getScrollTop = () => scrollContainer.scrollTop,
  } = options;
  const pending = new Set<HTMLElement>();
  let observed = new WeakSet<HTMLElement>();
  let direction: ScrollDirection = 'down';
  let lastScrollTop = getScrollTop();
  let scanning = false;
  let started = false;
  let intersectionObserver: IntersectionObserver | undefined;
  let mutationObserver: MutationObserver | undefined;

  const isLiveBubble = (bubble: HTMLElement): boolean =>
    root.isConnected && bubble.isConnected && root.contains(bubble);

  const compareDocumentOrder = (left: HTMLElement, right: HTMLElement): number => {
    if (left === right) {
      return 0;
    }
    return left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1;
  };

  const priority = (bubble: HTMLElement): number => {
    const bubbleRect = bubble.getBoundingClientRect();
    const viewport = scrollContainer.getBoundingClientRect();
    if (bubbleRect.bottom > viewport.top && bubbleRect.top < viewport.bottom) {
      return 0;
    }

    const isAbove = bubbleRect.bottom <= viewport.top;
    if (direction === 'idle') {
      return 1;
    }
    const directional = direction === 'up' ? isAbove : !isAbove;
    return directional ? 1 : 2;
  };

  const drain = (): void => {
    if (scanning || !started || !root.isConnected) {
      return;
    }

    const candidates = [...pending]
      .filter(isLiveBubble)
      .sort((left, right) => priority(left) - priority(right) || compareDocumentOrder(left, right));
    const highestPriority = priority(candidates[0] ?? scrollContainer);
    const batch = candidates
      .filter((bubble) => priority(bubble) === highestPriority)
      .slice(0, MAX_BATCH_SIZE);

    for (const bubble of batch) {
      pending.delete(bubble);
    }
    for (const bubble of pending) {
      if (!isLiveBubble(bubble)) {
        pending.delete(bubble);
      }
    }
    if (batch.length === 0) {
      return;
    }

    scanning = true;
    let scan: Promise<void>;
    try {
      scan = Promise.resolve(onScan(batch));
    } catch {
      scan = Promise.resolve();
    }
    scan.finally(() => {
      scanning = false;
      if (started) {
        drain();
      }
    });
  };

  const observeBubbles = (): void => {
    if (!started || !intersectionObserver) {
      return;
    }
    for (const bubble of root.querySelectorAll<HTMLElement>(BUBBLE_SELECTOR)) {
      if (!observed.has(bubble)) {
        observed.add(bubble);
        intersectionObserver.observe(bubble);
      }
    }
  };

  const queueInitiallyRenderedBubbles = (): void => {
    const viewport = scrollContainer.getBoundingClientRect();
    const prefetchTop = viewport.top - scrollContainer.clientHeight;
    const prefetchBottom = viewport.bottom + scrollContainer.clientHeight;
    for (const bubble of root.querySelectorAll<HTMLElement>(BUBBLE_SELECTOR)) {
      const bubbleRect = bubble.getBoundingClientRect();
      if (bubbleRect.bottom > prefetchTop && bubbleRect.top < prefetchBottom) {
        pending.add(bubble);
      }
    }
  };

  const onIntersect: IntersectionObserverCallback = (entries) => {
    if (!started || !root.isConnected) {
      return;
    }
    for (const entry of entries) {
      if (entry.isIntersecting && entry.target instanceof HTMLElement) {
        pending.add(entry.target);
      }
    }
    drain();
  };

  const onScroll: EventListener = () => {
    const nextScrollTop = getScrollTop();
    const delta = nextScrollTop - lastScrollTop;
    lastScrollTop = nextScrollTop;
    direction =
      Math.abs(delta) < SCROLL_DEADBAND_PX ? 'idle' : delta > 0 ? 'down' : 'up';
  };

  return {
    start(): void {
      if (started || !root.isConnected) {
        return;
      }
      started = true;
      observed = new WeakSet<HTMLElement>();
      lastScrollTop = getScrollTop();
      const prefetchMargin = `${scrollContainer.clientHeight}px 0px ${scrollContainer.clientHeight}px 0px`;
      intersectionObserver = intersectionObserverFactory(onIntersect, {
        root: scrollContainer,
        rootMargin: prefetchMargin,
        threshold: 0,
      });
      mutationObserver = mutationObserverFactory(observeBubbles);
      mutationObserver.observe(root, { childList: true, subtree: true });
      observeBubbles();
      if (options.queueInitialBubbles) {
        queueInitiallyRenderedBubbles();
        drain();
      }
      if (options.addScrollListener) {
        options.addScrollListener(onScroll);
      } else {
        scrollContainer.addEventListener('scroll', onScroll);
      }
    },

    stop(): void {
      if (!started) {
        return;
      }
      started = false;
      pending.clear();
      intersectionObserver?.disconnect();
      mutationObserver?.disconnect();
      if (options.removeScrollListener) {
        options.removeScrollListener(onScroll);
      } else {
        scrollContainer.removeEventListener('scroll', onScroll);
      }
    },
  };
}
