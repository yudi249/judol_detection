import { describe, expect, it, vi } from 'vitest';

import { registerRuntimeMessageListenerSafely, sendRuntimeMessageSafely } from './content-runtime';

describe('content runtime messaging', () => {
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
