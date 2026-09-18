import { describe, expect, it } from 'vitest';

import { parseYouTubeBrowsePayload } from './youtube-browse-parser';

type VideoOptions = {
  contentType?: string;
};

function video(id: string, title: string, options: VideoOptions = {}) {
  return {
    richItemRenderer: {
      content: {
        lockupViewModel: {
          contentId: id,
          ...(options.contentType === undefined
            ? { contentType: 'LOCKUP_CONTENT_TYPE_VIDEO' }
            : { contentType: options.contentType }),
          metadata: {
            lockupMetadataViewModel: {
              title: { content: title },
            },
          },
        },
      },
    },
  };
}

function home(contents: unknown[], selected = true) {
  return {
    contents: {
      twoColumnBrowseResultsRenderer: {
        tabs: [{
          tabRenderer: {
            selected,
            content: { richGridRenderer: { contents } },
          },
        }],
      },
    },
  };
}

describe('YouTube Browse parser', () => {
  it('returns trimmed regular Home videos once in rendered order', () => {
    expect(parseYouTubeBrowsePayload(home([
      video(' first-video ', '  Eps 1067  '),
      video('first-video', 'Duplicate title is ignored'),
      video('next-video', ' Video berikutnya '),
    ]))).toEqual([
      { id: 'first-video', text: 'Eps 1067' },
      { id: 'next-video', text: 'Video berikutnya' },
    ]);
  });

  it('ignores ads, Shorts, empty records, and explicitly non-video lockups', () => {
    expect(parseYouTubeBrowsePayload(home([
      { richItemRenderer: { content: { adSlotRenderer: {} } } },
      { richItemRenderer: { content: { shortsLockupViewModel: { entityId: 'shorts-1' } } } },
      video(' ', 'Missing ID'),
      video('valid-id', '  '),
      video('playlist-id', 'Playlist title', { contentType: 'LOCKUP_CONTENT_TYPE_PLAYLIST' }),
    ]))).toEqual([]);
  });

  it('ignores a rich grid under an unselected tab', () => {
    expect(parseYouTubeBrowsePayload(home([video('hidden-video', 'Not the Home tab')], false))).toEqual([]);
  });

  it('rejects invalid roots without searching arbitrary nested payloads', () => {
    expect(parseYouTubeBrowsePayload({
      contents: {},
      unrelated: home([video('must-not-parse', 'Arbitrary nested payload')]),
    })).toEqual([]);
  });
});
