// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSelectionAnalyzeTrigger } from './selection-analyze-trigger';

describe('selection analyze trigger', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main><p>bonus new member slot gacor</p></main>';
  });

  it('shows a floating analyze button for selected text and calls analyze on click', async () => {
    const onAnalyze = vi.fn();
    const trigger = createSelectionAnalyzeTrigger({
      getSelectionInfo: () => ({
        text: 'bonus new member slot gacor',
        rect: {
          bottom: 120,
          left: 40,
          right: 180,
          top: 96,
        },
      }),
      onAnalyze,
    });

    trigger.start();
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    const button = document.querySelector<HTMLButtonElement>(
      '.judollens-selection-analyze-button',
    );
    expect(button?.textContent).toBe('Analisis dengan JudolLens');
    expect(button?.style.left).toBe('40px');
    expect(button?.style.top).toBe('128px');

    button?.click();

    expect(onAnalyze).toHaveBeenCalledWith('bonus new member slot gacor');
    trigger.stop();
  });

  it('hides the floating button when selection becomes empty', () => {
    const trigger = createSelectionAnalyzeTrigger({
      getSelectionInfo: () => undefined,
      onAnalyze: vi.fn(),
    });

    trigger.start();
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(
      document.querySelector('.judollens-selection-analyze-button'),
    ).toBeNull();
    trigger.stop();
  });

  it('removes listeners and button on stop', () => {
    const trigger = createSelectionAnalyzeTrigger({
      getSelectionInfo: () => ({
        text: 'bonus slot gacor',
        rect: {
          bottom: 20,
          left: 10,
          right: 80,
          top: 0,
        },
      }),
      onAnalyze: vi.fn(),
    });

    trigger.start();
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(document.querySelector('.judollens-selection-analyze-button')).not.toBeNull();

    trigger.stop();

    expect(document.querySelector('.judollens-selection-analyze-button')).toBeNull();
  });
});
