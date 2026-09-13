import { describe, expect, it } from 'vitest';
import fixture from '../../tests/fixtures/search-timeline-redacted.json';
import {
  decodeSearchTimelineRequest,
  parseSearchTimelinePayload,
} from './search-timeline-parser';

describe('SearchTimeline parser', () => {
  it('extracts only processing fields and prefers note tweet text', () => {
    const result = parseSearchTimelinePayload(fixture, 'situs slot gacor');

    expect(result).toEqual({
      query: 'situs slot gacor',
      items: [
        {
          source_item_id: '1001',
          text_raw: 'teks note tweet slot gacor',
          source_url: 'https://x.com/i/web/status/1001',
          published_at: 'Wed Jan 01 00:00:00 +0000 2025',
        },
        {
          source_item_id: '1002',
          text_raw: 'bonus deposit malam ini',
          source_url: 'https://x.com/i/web/status/1002',
        },
      ],
    });
    expect(result.items[0]).not.toHaveProperty('author');
    expect(result.items[0]).not.toHaveProperty('raw_payload');
  });

  it('deduplicates tweet IDs and ignores cursors and malformed entries', () => {
    const payload = {
      data: {
        search_by_raw_query: {
          search_timeline: {
            timeline: {
              instructions: [
                {
                  entries: [
                    { entryId: 'cursor-bottom-1' },
                    {
                      entryId: 'tweet-1001-copy',
                      content: {
                        itemContent: {
                          tweet_results: {
                            result: { rest_id: '1001', legacy: { full_text: 'duplicate' } },
                          },
                        },
                      },
                    },
                    { entryId: 'tweet-broken', content: {} },
                  ],
                },
              ],
            },
          },
        },
      },
    };

    expect(parseSearchTimelinePayload(payload, 'slot').items).toEqual([
      {
        source_item_id: '1001',
        text_raw: 'duplicate',
        source_url: 'https://x.com/i/web/status/1001',
      },
    ]);
  });

  it('decodes the query and recognizes SearchTimeline without hard-coding operation IDs', () => {
    const url =
      'https://x.com/i/api/graphql/another-operation/SearchTimeline?variables=' +
      encodeURIComponent(JSON.stringify({ rawQuery: 'slot', product: 'Latest' }));

    expect(decodeSearchTimelineRequest(url)).toEqual({
      isSearchTimeline: true,
      query: 'slot',
      product: 'Latest',
    });
    expect(decodeSearchTimelineRequest('https://x.com/i/api/graphql/Other?variables={}').isSearchTimeline).toBe(false);
  });
});
