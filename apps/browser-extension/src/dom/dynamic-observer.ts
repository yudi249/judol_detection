const DEFAULT_DEBOUNCE_MS = 150;
const JUDOLLENS_SELECTOR =
  '.judollens-detected, .judollens-label, .judollens-unicode-span';

type TimerHandle = number | ReturnType<typeof setTimeout>;

export type DynamicContentObserverOptions = {
  root: ParentNode;
  onScan: (roots: ParentNode[]) => void | Promise<void>;
  debounceMs?: number;
  setTimer?: (callback: () => void, delay: number) => TimerHandle;
  clearTimer?: (timer: TimerHandle) => void;
};

export type DynamicContentObserver = {
  start: () => void;
  stop: () => void;
};

export function createDynamicContentObserver(
  options: DynamicContentObserverOptions,
): DynamicContentObserver {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  const pendingRoots: Element[] = [];
  let timer: TimerHandle | undefined;
  let observer: MutationObserver | undefined;
  let stopped = false;

  const queueRoot = (node: Node) => {
    const element = getScannableRoot(node);
    if (!element || isCoveredByExistingRoot(element, pendingRoots)) {
      return;
    }

    for (let index = pendingRoots.length - 1; index >= 0; index -= 1) {
      if (element.contains(pendingRoots[index])) {
        pendingRoots.splice(index, 1);
      }
    }

    pendingRoots.push(element);
  };

  const flush = () => {
    timer = undefined;
    if (stopped || pendingRoots.length === 0) {
      pendingRoots.length = 0;
      return;
    }

    const roots = pendingRoots.splice(0, pendingRoots.length);
    void options.onScan(roots);
  };

  const schedule = () => {
    if (timer) {
      clearTimer(timer);
    }
    timer = setTimer(flush, debounceMs);
  };

  return {
    start() {
      if (observer) {
        return;
      }

      stopped = false;
      observer = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            queueRoot(node);
          }
        }

        if (pendingRoots.length > 0) {
          schedule();
        }
      });
      observer.observe(options.root, {
        childList: true,
        subtree: true,
      });
    },
    stop() {
      stopped = true;
      observer?.disconnect();
      observer = undefined;
      pendingRoots.length = 0;

      if (timer) {
        clearTimer(timer);
        timer = undefined;
      }
    },
  };
}

function getScannableRoot(node: Node): Element | undefined {
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement ?? undefined;

  if (!element || isJudolLensOwnedElement(element) || !isVisibleElement(element)) {
    return undefined;
  }

  return element;
}

function isJudolLensOwnedElement(element: Element): boolean {
  return Boolean(
    element.matches('style[data-judollens-style]') ||
      element.matches(JUDOLLENS_SELECTOR) ||
      element.closest(JUDOLLENS_SELECTOR),
  );
}

function isVisibleElement(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    if (
      current.hasAttribute('hidden') ||
      current.getAttribute('aria-hidden') === 'true'
    ) {
      return false;
    }

    const style = window.getComputedStyle(current);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0'
    ) {
      return false;
    }

    current = current.parentElement;
  }

  return true;
}

function isCoveredByExistingRoot(
  element: Element,
  existingRoots: Element[],
): boolean {
  return existingRoots.some((root) => root === element || root.contains(element));
}
