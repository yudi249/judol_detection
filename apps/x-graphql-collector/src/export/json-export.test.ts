import { describe, expect, it } from 'vitest';
import { buildCollectionExport } from './json-export';
import { emptyMonitorState } from '../storage/collector-storage';

describe('JSON export', () => {
  it('exports the normalized pipeline fields without response or auth material', () => {
    const state = {
      ...emptyMonitorState(),
      query: 'slot',
      updated_at: '2026-08-16T00:00:00.000Z',
      items: [{
        source_item_id: '1',
        text_raw: 'slot gacor',
        source_url: 'https://x.com/i/web/status/1',
      }],
      item_count: 1,
    };

    expect(buildCollectionExport(state)).toEqual({
      schema_version: 1,
      source: 'x_search_timeline',
      query: 'slot',
      collected_at: '2026-08-16T00:00:00.000Z',
      items: state.items,
    });
    expect(JSON.stringify(buildCollectionExport(state))).not.toMatch(/cookie|authorization|bearer|raw_payload/i);
  });
});
