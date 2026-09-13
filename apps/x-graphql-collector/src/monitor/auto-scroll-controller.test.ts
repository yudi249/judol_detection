import { describe, expect, it, vi } from 'vitest';
import {
  AutoScrollController,
  MAX_AUTO_SCROLL_STEPS,
  type ScrollMetrics,
} from './auto-scroll-controller';

function metrics(y: number, height = 3000, viewport = 1000): ScrollMetrics {
  return { y, height, viewport };
}

describe('AutoScrollController', () => {
  it('scrolls repeatedly while the page moves and stops explicitly', async () => {
    vi.useFakeTimers();
    const evaluate = vi.fn<() => Promise<ScrollMetrics>>()
      .mockResolvedValueOnce(metrics(0))
      .mockResolvedValueOnce(metrics(700))
      .mockResolvedValueOnce(metrics(1400));
    const onState = vi.fn();
    const controller = new AutoScrollController(evaluate, onState, { intervalMs: 100 });

    controller.start();
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();
    controller.stop('user_stop');

    expect(evaluate).toHaveBeenCalledTimes(3);
    expect(onState.mock.lastCall?.[0]).toMatchObject({ status: 'stopped', last_reason: 'user_stop' });
    vi.useRealTimers();
  });

  it('keeps checking after the current bottom so infinite scroll can add content', async () => {
    vi.useFakeTimers();
    const evaluate = vi.fn<() => Promise<ScrollMetrics>>()
      .mockResolvedValueOnce(metrics(2000, 3000, 1000))
      .mockResolvedValueOnce(metrics(3000, 4000, 1000))
      .mockResolvedValue(metrics(3000, 4000, 1000));
    const onState = vi.fn();
    const controller = new AutoScrollController(evaluate, onState, { intervalMs: 100 });

    controller.start();
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();

    expect(evaluate).toHaveBeenCalledTimes(5);
    expect(onState.mock.lastCall?.[0]).toMatchObject({ status: 'bottom', last_reason: 'page_bottom' });
    vi.useRealTimers();
  });

  it('stops after three consecutive no-progress checks', async () => {
    vi.useFakeTimers();
    const evaluate = vi.fn<() => Promise<ScrollMetrics>>().mockResolvedValue(metrics(100));
    const onState = vi.fn();
    const controller = new AutoScrollController(evaluate, onState, { intervalMs: 100 });

    controller.start();
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();

    expect(onState.mock.lastCall?.[0]).toMatchObject({ status: 'stopped', last_reason: 'no_progress' });
    vi.useRealTimers();
  });

  it('stops at the maximum step limit', async () => {
    vi.useFakeTimers();
    let y = 0;
    const evaluate = vi.fn<() => Promise<ScrollMetrics>>()
      .mockImplementation(async () => {
        y += 700;
        return metrics(y, Number.MAX_SAFE_INTEGER, 1000);
      });
    const onState = vi.fn();
    const controller = new AutoScrollController(evaluate, onState, { intervalMs: 1 });

    controller.start();
    for (let index = 0; index < MAX_AUTO_SCROLL_STEPS; index += 1) {
      await vi.runOnlyPendingTimersAsync();
    }

    expect(onState.mock.lastCall?.[0]).toMatchObject({ status: 'limit', steps: MAX_AUTO_SCROLL_STEPS, last_reason: 'max_steps' });
    vi.useRealTimers();
  });

  it('records evaluator failure and stops', async () => {
    vi.useFakeTimers();
    const evaluate = vi.fn<() => Promise<ScrollMetrics>>().mockRejectedValue(new Error('target closed'));
    const onState = vi.fn();
    const controller = new AutoScrollController(evaluate, onState, { intervalMs: 100 });

    controller.start();
    await vi.runOnlyPendingTimersAsync();

    expect(onState.mock.lastCall?.[0]).toMatchObject({ status: 'error', last_reason: 'target closed' });
    vi.useRealTimers();
  });
});
