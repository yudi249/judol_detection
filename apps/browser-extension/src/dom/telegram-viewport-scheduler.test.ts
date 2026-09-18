// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTelegramViewportScheduler,
  resolveTelegramScrollContainer,
  canStartTelegramViewportPrefetch,
  shouldUseTelegramViewportPrefetch,
} from './telegram-viewport-scheduler';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

type FakeIntersectionObserver = {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  emit: (entries: FakeIntersectionEntry[]) => void;
  options: IntersectionObserverInit;
};

type FakeMutationObserver = {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  emitAdded: (node: Node) => void;
};

type FakeIntersectionEntry = Pick<
  IntersectionObserverEntry,
  'isIntersecting' | 'target'
>;

type RenderedReader = {
  root: HTMLElement;
  reader: HTMLElement;
  bubbles: HTMLElement[];
};

function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve'];
  let reject!: Deferred<T>['reject'];
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function renderTelegramReader(bubbleCount = 0): RenderedReader {
  const root = document.createElement('main');
  const reader = document.createElement('section');
  reader.style.overflowY = 'auto';
  Object.defineProperties(reader, {
    clientHeight: { configurable: true, value: 100 },
    scrollHeight: { configurable: true, value: 500 },
  });
  stubRect(reader, { top: 100, bottom: 200 });

  const bubbles = Array.from({ length: bubbleCount }, (_, index) => {
    const bubble = document.createElement('article');
    bubble.className = 'bubble';
    bubble.dataset.index = String(index);
    reader.append(bubble);
    return bubble;
  });

  root.append(reader);
  document.body.append(root);
  return { root, reader, bubbles };
}

function createBubble(index: number): HTMLElement {
  const bubble = document.createElement('article');
  bubble.className = 'bubble';
  bubble.dataset.index = String(index);
  return bubble;
}

function stubRect(
  element: HTMLElement,
  { top, bottom }: { top: number; bottom: number },
): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({
        top,
        bottom,
        left: 0,
        right: 100,
        width: 100,
        height: bottom - top,
        x: 0,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect,
  });
}

function entryFor(element: HTMLElement): FakeIntersectionEntry {
  return { isIntersecting: true, target: element };
}

function createIntersectionObserverFactory(): {
  factory: (
    callback: IntersectionObserverCallback,
    options: IntersectionObserverInit,
  ) => IntersectionObserver;
  observer: FakeIntersectionObserver;
  observers: FakeIntersectionObserver[];
} {
  const observers: FakeIntersectionObserver[] = [];
  const createObserver = (
    callback: IntersectionObserverCallback,
    options: IntersectionObserverInit,
  ): FakeIntersectionObserver => {
    const observer: FakeIntersectionObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
      options,
      emit(entries) {
        callback(entries as IntersectionObserverEntry[], observer as unknown as IntersectionObserver);
      },
    };
    observers.push(observer);
    return observer;
  };
  const initialObserver: FakeIntersectionObserver = {
    observe: vi.fn(),
    disconnect: vi.fn(),
    options: {},
    emit() {
      throw new Error('IntersectionObserver has not been created.');
    },
  };
  observers.push(initialObserver);
  let factoryCalls = 0;

  return {
    factory(callback, options) {
      if (factoryCalls++ === 0) {
        initialObserver.options = options;
        initialObserver.emit = (entries) => {
          callback(entries as IntersectionObserverEntry[], initialObserver as unknown as IntersectionObserver);
        };
        return initialObserver as unknown as IntersectionObserver;
      }
      return createObserver(callback, options) as unknown as IntersectionObserver;
    },
    observer: initialObserver,
    observers,
  };
}

function createMutationObserverFactory(): {
  factory: (callback: MutationCallback) => MutationObserver;
  observer: FakeMutationObserver;
} {
  let callback: MutationCallback | undefined;
  const observer: FakeMutationObserver = {
    observe: vi.fn(),
    disconnect: vi.fn(),
    emitAdded(node) {
      callback?.([{ addedNodes: [node] } as unknown as MutationRecord], observer as unknown as MutationObserver);
    },
  };
  return {
    factory(callbackArgument) {
      callback = callbackArgument;
      return observer as unknown as MutationObserver;
    },
    observer,
  };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('Telegram viewport scheduler', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('resolves the scrollable bubble ancestor used by the most rendered bubbles', () => {
    const root = document.createElement('main');
    const commonReader = document.createElement('section');
    commonReader.style.overflowY = 'scroll';
    Object.defineProperties(commonReader, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 500 },
    });
    const otherReader = document.createElement('section');
    otherReader.style.overflowY = 'auto';
    Object.defineProperties(otherReader, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 500 },
    });


    commonReader.append(createBubble(0), createBubble(1));
    otherReader.append(createBubble(2));
    root.append(commonReader, otherReader);
    document.body.append(root);

    expect(resolveTelegramScrollContainer(root)).toBe(commonReader);
  });

  it('limits viewport prefetch policy to Telegram Web URLs', () => {
    expect(shouldUseTelegramViewportPrefetch('https://web.telegram.org/k/')).toBe(true);
    expect(shouldUseTelegramViewportPrefetch('https://x.com/home')).toBe(false);
    expect(shouldUseTelegramViewportPrefetch('https://www.youtube.com/')).toBe(false);
    expect(shouldUseTelegramViewportPrefetch('http://127.0.0.1:4173/')).toBe(false);
    expect(shouldUseTelegramViewportPrefetch('not a URL')).toBe(false);
  });

  it('requires both a resolved reader and IntersectionObserver support', () => {
    const { reader } = renderTelegramReader();
    expect(canStartTelegramViewportPrefetch(reader, true)).toBe(true);
    expect(canStartTelegramViewportPrefetch(undefined, true)).toBe(false);
    expect(canStartTelegramViewportPrefetch(reader, false)).toBe(false);
  });

  it('scans initially rendered visible bubbles without waiting for an intersection callback', () => {
    const { root, reader, bubbles } = renderTelegramReader(3);
    const [above, visible, below] = bubbles;
    stubRect(above, { top: 20, bottom: 80 });
    stubRect(visible, { top: 120, bottom: 180 });
    stubRect(below, { top: 220, bottom: 280 });
    const scan = vi.fn<(roots: ParentNode[]) => Promise<void>>().mockResolvedValue();
    const { factory } = createIntersectionObserverFactory();
    const { factory: mutationObserverFactory } = createMutationObserverFactory();

    createTelegramViewportScheduler({
      root,
      queueInitialBubbles: true,
      scrollContainer: reader,
      onScan: scan,
      intersectionObserverFactory: factory,
      mutationObserverFactory,
    }).start();

    expect(scan).toHaveBeenCalledWith([visible]);
  });

  it('scans visible bubbles before directional and opposite prefetch bubbles', async () => {
    const { root, reader, bubbles } = renderTelegramReader(3);
    const [above, visible, below] = bubbles;
    stubRect(above, { top: 20, bottom: 80 });
    stubRect(visible, { top: 120, bottom: 180 });
    stubRect(below, { top: 220, bottom: 280 });
    const firstScan = deferred<void>();
    const secondScan = deferred<void>();
    const thirdScan = deferred<void>();
    const scan = vi
      .fn<(roots: ParentNode[]) => Promise<void>>()
      .mockReturnValueOnce(firstScan.promise)
      .mockReturnValueOnce(secondScan.promise)
      .mockReturnValueOnce(thirdScan.promise);

    const { factory, observer } = createIntersectionObserverFactory();
    const { factory: mutationObserverFactory } = createMutationObserverFactory();

    const scheduler = createTelegramViewportScheduler({
      root,
      scrollContainer: reader,
      onScan: scan,
      intersectionObserverFactory: factory,
      mutationObserverFactory,
    });

    scheduler.start();

    expect(observer.options.rootMargin).toBe('100px 0px 100px 0px');
    observer.emit([entryFor(below), entryFor(visible), entryFor(above)]);

    expect(scan).toHaveBeenCalledWith([visible]);

    firstScan.resolve();
    await flushPromises();

    expect(scan).toHaveBeenLastCalledWith([below]);
    secondScan.resolve();
    await flushPromises();
    expect(scan).toHaveBeenLastCalledWith([above]);
    thirdScan.resolve();
  });

  it('prioritizes below-reader work while scrolling down and above-reader work after reversal', async () => {
    const { root, reader, bubbles } = renderTelegramReader(2);
    const [above, below] = bubbles;
    stubRect(above, { top: 20, bottom: 80 });
    stubRect(below, { top: 220, bottom: 280 });
    const firstScan = deferred<void>();
    const secondScan = deferred<void>();
    const scan = vi
      .fn<(roots: ParentNode[]) => Promise<void>>()
      .mockReturnValueOnce(firstScan.promise)
      .mockReturnValueOnce(secondScan.promise);
    const { factory, observer } = createIntersectionObserverFactory();
    const { factory: mutationObserverFactory } = createMutationObserverFactory();
    let scrollTop = 0;
    let scrollListener: EventListener | undefined;

    const scheduler = createTelegramViewportScheduler({
      root,
      scrollContainer: reader,
      onScan: scan,
      intersectionObserverFactory: factory,
      mutationObserverFactory,
      addScrollListener(listener) {
        scrollListener = listener;
      },
      removeScrollListener: vi.fn(),
      getScrollTop: () => scrollTop,
    });

    scheduler.start();
    scrollTop = 120;
    scrollListener?.(new Event('scroll'));
    observer.emit([entryFor(above), entryFor(below)]);

    expect(scan).toHaveBeenCalledWith([below]);

    firstScan.resolve();
    await flushPromises();
    scrollTop = 0;
    scrollListener?.(new Event('scroll'));

    expect(scan).toHaveBeenLastCalledWith([above]);
    secondScan.resolve();
  });

  it('uses document order for equal-priority idle prefetch work and limits a batch to twelve roots', async () => {
    const { root, reader } = renderTelegramReader();
    const bubbles = Array.from({ length: 13 }, (_, index) => {
      const bubble = createBubble(index);
      stubRect(bubble, { top: 220 + index * 10, bottom: 228 + index * 10 });
      reader.append(bubble);
      return bubble;
    });
    const firstScan = deferred<void>();
    const secondScan = deferred<void>();
    const scan = vi
      .fn<(roots: ParentNode[]) => Promise<void>>()
      .mockReturnValueOnce(firstScan.promise)
      .mockReturnValueOnce(secondScan.promise);
    const { factory, observer } = createIntersectionObserverFactory();
    const { factory: mutationObserverFactory } = createMutationObserverFactory();

    const scheduler = createTelegramViewportScheduler({
      root,
      scrollContainer: reader,
      onScan: scan,
      intersectionObserverFactory: factory,
      mutationObserverFactory,
    });

    scheduler.start();
    observer.emit(bubbles.toReversed().map(entryFor));

    expect(scan).toHaveBeenCalledWith(bubbles.slice(0, 12));

    firstScan.resolve();
    await flushPromises();

    expect(scan).toHaveBeenLastCalledWith([bubbles[12]]);
    secondScan.resolve();
  });

  it('drains one asynchronous scan at a time before starting the next batch', async () => {
    const { root, reader, bubbles } = renderTelegramReader(2);
    const [first, second] = bubbles;
    stubRect(first, { top: 120, bottom: 180 });
    stubRect(second, { top: 220, bottom: 280 });
    const firstScan = deferred<void>();
    const secondScan = deferred<void>();
    const scan = vi
      .fn<(roots: ParentNode[]) => Promise<void>>()
      .mockReturnValueOnce(firstScan.promise)
      .mockReturnValueOnce(secondScan.promise);
    const { factory, observer } = createIntersectionObserverFactory();
    const { factory: mutationObserverFactory } = createMutationObserverFactory();

    const scheduler = createTelegramViewportScheduler({
      root,
      scrollContainer: reader,
      onScan: scan,
      intersectionObserverFactory: factory,
      mutationObserverFactory,
    });

    scheduler.start();
    observer.emit([entryFor(first)]);
    observer.emit([entryFor(second)]);

    expect(scan).toHaveBeenCalledTimes(1);
    expect(scan).toHaveBeenCalledWith([first]);

    firstScan.resolve();
    await flushPromises();

    expect(scan).toHaveBeenCalledTimes(2);
    expect(scan).toHaveBeenLastCalledWith([second]);
    secondScan.resolve();
  });

  it('keeps prefetch ordering idle for scroll changes smaller than eight pixels', async () => {
    const { root, reader, bubbles } = renderTelegramReader(2);
    const [above, below] = bubbles;
    stubRect(above, { top: 20, bottom: 80 });
    stubRect(below, { top: 220, bottom: 280 });
    const scan = vi.fn<(roots: ParentNode[]) => Promise<void>>(() => Promise.resolve());
    const { factory, observer } = createIntersectionObserverFactory();
    const { factory: mutationObserverFactory } = createMutationObserverFactory();
    let scrollTop = 0;
    let scrollListener: EventListener | undefined;

    const scheduler = createTelegramViewportScheduler({
      root,
      scrollContainer: reader,
      onScan: scan,
      intersectionObserverFactory: factory,
      mutationObserverFactory,
      addScrollListener(listener) {
        scrollListener = listener;
      },
      removeScrollListener: vi.fn(),
      getScrollTop: () => scrollTop,
    });

    scheduler.start();
    scrollTop = 7;
    scrollListener?.(new Event('scroll'));
    observer.emit([entryFor(below), entryFor(above)]);

    expect(scan).toHaveBeenCalledWith([above, below]);
    await flushPromises();
  });

  it('re-observes existing bubbles with a fresh observer after restart', async () => {
    const { root, reader, bubbles } = renderTelegramReader(1);
    const [bubble] = bubbles;
    stubRect(bubble, { top: 120, bottom: 180 });
    const scan = vi.fn<(roots: ParentNode[]) => Promise<void>>(() => Promise.resolve());
    const { factory, observer, observers } = createIntersectionObserverFactory();
    const { factory: mutationObserverFactory } = createMutationObserverFactory();

    const scheduler = createTelegramViewportScheduler({
      root,
      scrollContainer: reader,
      onScan: scan,
      intersectionObserverFactory: factory,
      mutationObserverFactory,
    });

    scheduler.start();
    scheduler.stop();
    scheduler.start();
    const freshObserver = observers[1]!;

    expect(observer.observe).toHaveBeenCalledWith(bubble);
    expect(freshObserver.observe).toHaveBeenCalledWith(bubble);

    freshObserver.emit([entryFor(bubble)]);
    await flushPromises();

    expect(scan).toHaveBeenCalledWith([bubble]);
  });

  it('continues with later admitted roots after a synchronous scan failure', async () => {
    const { root, reader, bubbles } = renderTelegramReader(2);
    const [failingBubble, laterBubble] = bubbles;
    stubRect(failingBubble, { top: 120, bottom: 180 });
    stubRect(laterBubble, { top: 220, bottom: 280 });
    const scan = vi
      .fn<(roots: ParentNode[]) => Promise<void> | void>()
      .mockImplementationOnce(() => {
        throw new Error('scan failed synchronously');
      })
      .mockResolvedValueOnce();
    const { factory, observer } = createIntersectionObserverFactory();
    const { factory: mutationObserverFactory } = createMutationObserverFactory();

    const scheduler = createTelegramViewportScheduler({
      root,
      scrollContainer: reader,
      onScan: scan,
      intersectionObserverFactory: factory,
      mutationObserverFactory,
    });

    scheduler.start();

    try {
      observer.emit([entryFor(failingBubble)]);
    } catch {
    }
    observer.emit([entryFor(laterBubble)]);
    await flushPromises();

    expect(scan).toHaveBeenCalledWith([failingBubble]);
    expect(scan).toHaveBeenLastCalledWith([laterBubble]);
  });

  it('ignores retained intersection callbacks emitted after stop', async () => {
    const { root, reader, bubbles } = renderTelegramReader(1);
    const [bubble] = bubbles;
    stubRect(bubble, { top: 120, bottom: 180 });
    const scan = vi.fn<(roots: ParentNode[]) => Promise<void>>(() => Promise.resolve());
    const { factory, observer } = createIntersectionObserverFactory();
    const { factory: mutationObserverFactory } = createMutationObserverFactory();
    const scheduler = createTelegramViewportScheduler({
      root,
      scrollContainer: reader,
      onScan: scan,
      intersectionObserverFactory: factory,
      mutationObserverFactory,
    });
    scheduler.start();
    scheduler.stop();
    observer.emit([entryFor(bubble)]);
    await flushPromises();
    expect(scan).not.toHaveBeenCalled();
  });
  it('registers added bubbles and scans each admitted bubble only once', async () => {
    const { root, reader } = renderTelegramReader();
    const bubble = createBubble(0);
    stubRect(bubble, { top: 220, bottom: 280 });
    const scan = vi.fn<(roots: ParentNode[]) => Promise<void>>(() => Promise.resolve());
    const { factory, observer } = createIntersectionObserverFactory();
    const { factory: mutationObserverFactory, observer: mutationObserver } =
      createMutationObserverFactory();
    const scheduler = createTelegramViewportScheduler({
      root,
      scrollContainer: reader,
      onScan: scan,
      intersectionObserverFactory: factory,
      mutationObserverFactory,
    });

    scheduler.start();
    reader.append(bubble);
    mutationObserver.emitAdded(bubble);

    expect(observer.observe).toHaveBeenCalledWith(bubble);
    expect(scan).not.toHaveBeenCalled();

    observer.emit([entryFor(bubble), entryFor(bubble)]);
    await flushPromises();

    expect(scan).toHaveBeenCalledTimes(1);
    expect(scan).toHaveBeenCalledWith([bubble]);
  });

  it('discards a queued bubble detached before its batch begins', async () => {
    const { root, reader, bubbles } = renderTelegramReader(2);
    const [activeBubble, queuedBubble] = bubbles;
    stubRect(activeBubble, { top: 120, bottom: 180 });
    stubRect(queuedBubble, { top: 220, bottom: 280 });
    const activeScan = deferred<void>();
    const scan = vi
      .fn<(roots: ParentNode[]) => Promise<void>>()
      .mockReturnValueOnce(activeScan.promise)
      .mockResolvedValueOnce();
    const { factory, observer } = createIntersectionObserverFactory();
    const { factory: mutationObserverFactory } = createMutationObserverFactory();
    const scheduler = createTelegramViewportScheduler({
      root,
      scrollContainer: reader,
      onScan: scan,
      intersectionObserverFactory: factory,
      mutationObserverFactory,
    });

    scheduler.start();
    observer.emit([entryFor(activeBubble), entryFor(queuedBubble)]);
    queuedBubble.remove();
    activeScan.resolve();
    await flushPromises();

    expect(scan).toHaveBeenCalledTimes(1);
    expect(scan).toHaveBeenCalledWith([activeBubble]);
  });

  it('cleans up observers and the passive listener after stop', () => {
    const { root, reader, bubbles } = renderTelegramReader(1);
    const [bubble] = bubbles;
    const removeScrollListener = vi.fn();
    const { factory, observer } = createIntersectionObserverFactory();
    const { factory: mutationObserverFactory, observer: mutationObserver } =
      createMutationObserverFactory();
    const scheduler = createTelegramViewportScheduler({
      root,
      scrollContainer: reader,
      onScan: vi.fn(),
      intersectionObserverFactory: factory,
      mutationObserverFactory,
      addScrollListener: vi.fn(),
      removeScrollListener,
    });

    scheduler.start();
    scheduler.stop();
    observer.emit([entryFor(bubble)]);
    mutationObserver.emitAdded(createBubble(1));

    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(mutationObserver.disconnect).toHaveBeenCalledOnce();
    expect(removeScrollListener).toHaveBeenCalledOnce();
  });
});
