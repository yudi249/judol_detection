import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  vi.stubGlobal('defineContentScript', () => undefined);
});

vi.mock('@/dom', () => ({}));
vi.mock('@/shared', () => ({}));
vi.mock('wxt/browser', () => ({ browser: {} }));

import {
  getYouTubePageModeTransition,
  isYouTubeHomeUrl,
  waitForContentAnimationFrame,
} from '../../entrypoints/content';
import { registerRuntimeMessageListenerSafely, sendRuntimeMessageSafely } from './content-runtime';

describe('YouTube Home URL routing', () => {
  it('recognizes only HTTPS YouTube root paths as Home', () => {
    expect(isYouTubeHomeUrl('https://youtube.com')).toBe(true);
    expect(isYouTubeHomeUrl('https://www.youtube.com/')).toBe(true);
    expect(isYouTubeHomeUrl('https://m.youtube.com/?persist_app=1')).toBe(true);
    expect(isYouTubeHomeUrl('http://youtube.com/')).toBe(false);
    expect(isYouTubeHomeUrl('https://youtube.com/feed/subscriptions')).toBe(false);
    expect(isYouTubeHomeUrl('https://youtu.be/')).toBe(false);
  });

  it('switches from browse reconciliation to generic scanning after navigating Home to watch', () => {
    expect(
      getYouTubePageModeTransition('https://www.youtube.com/', 'https://www.youtube.com/watch?v=abc'),
    ).toEqual({ from: 'browse', to: 'generic' });
  });

  it('switches from generic scanning to browse reconciliation after navigating watch to Home', () => {
    expect(
      getYouTubePageModeTransition('https://www.youtube.com/watch?v=abc', 'https://www.youtube.com/'),
    ).toEqual({ from: 'generic', to: 'browse' });
  });

  it('does not restart the current lifecycle for a same-mode navigation', () => {
    expect(
      getYouTubePageModeTransition(
        'https://www.youtube.com/watch?v=abc',
        'https://www.youtube.com/results?search_query=judol',
      ),
    ).toBeNull();
  });
});

describe('content timing', () => {
  it('waits for exactly one animation frame callback', async () => {
    let callback: FrameRequestCallback | undefined;
    const requestFrame = vi.fn((next: FrameRequestCallback) => {
      callback = next;
      return 1;
    });
    const frame = waitForContentAnimationFrame(requestFrame);

    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(callback).toBeDefined();
    callback?.(16);
    await expect(frame).resolves.toBeUndefined();
    expect(requestFrame).toHaveBeenCalledTimes(1);
  });
});
describe('content runtime messaging', () => {
  it('sends an arbitrary YouTube subscribe message through the generic helper', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const message = { type: 'judollens:youtube-browse-subscribe' } as const;

    await expect(
      sendRuntimeMessageSafely({ isInvalid: false }, sendMessage, message),
    ).resolves.toBeUndefined();

    expect(sendMessage).toHaveBeenCalledWith(message);
  });
  it('abandons a message when its extension context is invalidated', async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValue(new Error('Extension context invalidated.'));

    await expect(
      sendRuntimeMessageSafely(
        { isInvalid: false },
        sendMessage,
        { type: 'judollens:x-timeline-subscribe' },
      ),
    ).resolves.toBeUndefined();
  });

  it('does not read WXT isInvalid after the runtime accessor has become stale', async () => {
    const sendMessage = vi.fn();
    const context = Object.defineProperty({}, 'isInvalid', {
      get() {
        throw new Error('Extension context invalidated.');
      },
    });

    await expect(
      sendRuntimeMessageSafely(
        context as { isInvalid: boolean },
        sendMessage,
        { type: 'judollens:x-timeline-subscribe' },
      ),
    ).resolves.toBeUndefined();

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('does not register a runtime listener after its extension context is invalidated', () => {
    const registerListener = vi.fn(() => {
      throw new Error('Extension context invalidated.');
    });

    expect(
      registerRuntimeMessageListenerSafely(
        { isInvalid: false },
        registerListener,
      ),
    ).toBeUndefined();
  });

  it('preserves stale context accessor errors unrelated to invalidation', async () => {
    const context = Object.defineProperty({}, 'isInvalid', {
      get() {
        throw new Error('Unexpected context accessor failure');
      },
    });

    await expect(
      sendRuntimeMessageSafely(
        context as { isInvalid: boolean },
        vi.fn(),
        { type: 'judollens:x-timeline-subscribe' },
      ),
    ).rejects.toThrow('Unexpected context accessor failure');
  });

  it('does not send a message from an already invalidated context', async () => {
    const sendMessage = vi.fn();

    await expect(
      sendRuntimeMessageSafely(
        { isInvalid: true },
        sendMessage,
        { type: 'judollens:x-timeline-subscribe' },
      ),
    ).resolves.toBeUndefined();

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('discards a response when the context invalidates while awaiting it', async () => {
    const context = { isInvalid: false };
    const sendMessage = vi.fn().mockImplementation(async () => {
      context.isInvalid = true;
      return 'late-response';
    });

    await expect(
      sendRuntimeMessageSafely(
        context,
        sendMessage,
        { type: 'judollens:x-timeline-subscribe' },
      ),
    ).resolves.toBeUndefined();
  });

  it('preserves runtime failures unrelated to context invalidation', async () => {
    const sendMessage = vi.fn().mockRejectedValue(new Error('No receiving end'));

    await expect(
      sendRuntimeMessageSafely(
        { isInvalid: false },
        sendMessage,
        { type: 'judollens:x-timeline-subscribe' },
      ),
    ).rejects.toThrow('No receiving end');
  });
});
