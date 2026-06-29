import { describe, expect, it } from 'vitest';
import { buildManualAnalysisStateFromSelection } from './manual-context-menu';

describe('manual analysis context menu helper', () => {
  it('builds manual state from selected text and tab metadata', () => {
    const state = buildManualAnalysisStateFromSelection({
      selectionText: 'bonus new member slot gacor',
      pageUrl: 'https://web.telegram.org/a/#demo',
    });

    expect(state).toEqual({
      schemaVersion: 1,
      inputText: 'bonus new member slot gacor',
      sourcePlatform: 'telegram',
      sourceUrl: 'https://web.telegram.org/a/#demo',
    });
  });

  it('falls back to empty unknown state when no text or URL is available', () => {
    const state = buildManualAnalysisStateFromSelection({});

    expect(state).toEqual({
      schemaVersion: 1,
      inputText: '',
      sourcePlatform: 'unknown',
    });
  });

  it('maps common supported URLs to manual analysis source platforms', () => {
    expect(
      buildManualAnalysisStateFromSelection({
        selectionText: 'demo',
        pageUrl: 'https://www.youtube.com/watch?v=1',
      }).sourcePlatform,
    ).toBe('youtube');
    expect(
      buildManualAnalysisStateFromSelection({
        selectionText: 'demo',
        pageUrl: 'https://x.com/search?q=slot',
      }).sourcePlatform,
    ).toBe('x');
    expect(
      buildManualAnalysisStateFromSelection({
        selectionText: 'demo',
        pageUrl: 'http://127.0.0.1:4173/',
      }).sourcePlatform,
    ).toBe('simulation');
    expect(
      buildManualAnalysisStateFromSelection({
        selectionText: 'demo',
        pageUrl: 'https://example.com/post',
      }).sourcePlatform,
    ).toBe('unknown');
  });
});
