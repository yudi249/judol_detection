// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDynamicContentObserver } from './dynamic-observer';

describe('dynamic content observer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls the scan callback once after a new visible node is added', async () => {
    const scan = vi.fn();
    const observer = createDynamicContentObserver({
      root: document.body,
      onScan: scan,
    });

    observer.start();
    document.body.append(createPost('bonus slot gacor baru'));
    await Promise.resolve();

    expect(scan).not.toHaveBeenCalled();
    vi.advanceTimersByTime(149);
    expect(scan).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(scan).toHaveBeenCalledTimes(1);
    expect(scan.mock.calls[0][0]).toHaveLength(1);
    expect((scan.mock.calls[0][0][0] as HTMLElement).textContent).toContain(
      'bonus slot gacor baru',
    );
  });

  it('batches multiple quickly inserted nodes into one debounced scan', async () => {
    const scan = vi.fn();
    const observer = createDynamicContentObserver({
      root: document.body,
      onScan: scan,
      debounceMs: 150,
    });

    observer.start();
    document.body.append(createPost('bonus slot pertama'));
    document.body.append(createPost('bonus slot kedua'));
    await Promise.resolve();

    vi.advanceTimersByTime(150);

    expect(scan).toHaveBeenCalledTimes(1);
    expect(scan.mock.calls[0][0]).toHaveLength(2);
  });

  it('ignores JudolLens overlay nodes so the observer does not rescan its own UI', async () => {
    const scan = vi.fn();
    const observer = createDynamicContentObserver({
      root: document.body,
      onScan: scan,
    });

    observer.start();
    const overlay = document.createElement('span');
    overlay.className = 'judollens-detected';
    overlay.textContent = 'Terdeteksi JudolLens';
    document.body.append(overlay);
    await Promise.resolve();
    vi.advanceTimersByTime(150);

    expect(scan).not.toHaveBeenCalled();
  });

  it('stop disconnects the observer and prevents pending scans', async () => {
    const scan = vi.fn();
    const observer = createDynamicContentObserver({
      root: document.body,
      onScan: scan,
    });

    observer.start();
    document.body.append(createPost('bonus slot pending'));
    await Promise.resolve();
    observer.stop();
    vi.advanceTimersByTime(150);

    document.body.append(createPost('bonus slot after stop'));
    await Promise.resolve();
    vi.advanceTimersByTime(150);

    expect(scan).not.toHaveBeenCalled();
  });
});

function createPost(text: string): HTMLElement {
  const article = document.createElement('article');
  article.dataset.postId = crypto.randomUUID();
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  article.append(paragraph);
  return article;
}
