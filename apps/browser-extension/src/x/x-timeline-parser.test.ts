import { describe, expect, it } from 'vitest';

import { parseXTimelinePayload } from './x-timeline-parser';

type TweetOptions = {
  legacyId?: string;
  noteText?: string;
  wrapped?: boolean;
};

function tweetItemContent(id: string, fullText: string, options: TweetOptions = {}) {
  const tweet = {
    ...(id ? { rest_id: id } : {}),
    legacy: {
      ...(options.legacyId ? { id_str: options.legacyId } : {}),
      full_text: fullText,
    },
    ...(options.noteText
      ? { note_tweet: { note_tweet_results: { result: { text: options.noteText } } } }
      : {}),
  };

  return {
    tweet_results: {
      result: options.wrapped ? { tweet } : tweet,
    },
  };
}

function directEntry(itemContent: object) {
  return { content: { itemContent } };
}

function moduleEntry(...itemContents: object[]) {
  return {
    content: {
      items: itemContents.map((itemContent) => ({ item: { itemContent } })),
    },
  };
}

function searchPayload(...entries: object[]) {
  return {
    data: {
      search_by_raw_query: {
        search_timeline: { timeline: { instructions: [{ entries }] } },
      },
    },
  };
}

function homePayload(entry: object) {
  return {
    data: {
      home: { home_timeline_urt: { instructions: [{ entry }] } },
    },
  };
}

function profilePayload(...entries: object[]) {
  return {
    data: {
      user: { result: { timeline: { timeline: { instructions: [{ entries }] } } } },
    },
  };
}

function detailPayload(...entries: object[]) {
  return {
    data: {
      threaded_conversation_with_injections_v2: { instructions: [{ entries }] },
    },
  };
}

describe('X timeline prediction parser', () => {
  it('normalizes every allow-listed root and direct or module item path in response order', () => {
    const home = homePayload(directEntry(tweetItemContent('home-1', ' bonus slot gacor ')));
    const profile = profilePayload(
      directEntry(tweetItemContent('pinned-1', 'tweet disematkan')),
      directEntry(tweetItemContent('profile-1', 'tweet profil')),
    );
    const photoGrid = profilePayload(moduleEntry(tweetItemContent('photo-1', 'caption media grid')));
    const detail = detailPayload(
      directEntry(tweetItemContent('detail-1', 'target tweet')),
      moduleEntry(tweetItemContent('reply-1', 'thread reply')),
    );

    expect(parseXTimelinePayload(searchPayload(directEntry(tweetItemContent('search-1', 'search result'))))).toEqual([
      { id: 'search-1', text: 'search result' },
    ]);
    expect(parseXTimelinePayload(home)).toEqual([{ id: 'home-1', text: 'bonus slot gacor' }]);
    expect(parseXTimelinePayload(profile)).toEqual([
      { id: 'pinned-1', text: 'tweet disematkan' },
      { id: 'profile-1', text: 'tweet profil' },
    ]);
    expect(parseXTimelinePayload(photoGrid)).toEqual([{ id: 'photo-1', text: 'caption media grid' }]);
    expect(parseXTimelinePayload(detail)).toEqual([
      { id: 'detail-1', text: 'target tweet' },
      { id: 'reply-1', text: 'thread reply' },
    ]);
  });

  it('prefers canonical IDs and note text while retaining the first valid duplicate', () => {
    const payload = searchPayload(
      directEntry(tweetItemContent('canonical-1', 'legacy loses to note', {
        legacyId: 'legacy-1',
        noteText: ' catatan lengkap slot gacor ',
        wrapped: true,
      })),
      directEntry(tweetItemContent('canonical-1', 'duplicate must not replace the original')),
      directEntry(tweetItemContent('', 'fallback identifier', { legacyId: 'legacy-only' })),
    );

    expect(parseXTimelinePayload(payload)).toEqual([
      { id: 'canonical-1', text: 'catatan lengkap slot gacor' },
      { id: 'legacy-only', text: 'fallback identifier' },
    ]);
  });
  it('falls back from blank canonical IDs and skips blank identifier candidates', () => {
    const payload = searchPayload(
      directEntry(tweetItemContent('   ', 'fallback identifier', { legacyId: ' legacy-valid ' })),
      directEntry(tweetItemContent('\t', 'blank identifiers', { legacyId: '  ' })),
    );

    expect(parseXTimelinePayload(payload)).toEqual([
      { id: 'legacy-valid', text: 'fallback identifier' },
    ]);
  });


  it('skips empty, cursor, non-tweet module, and non-allow-listed values', () => {
    const emptyUserVideoTimeline = profilePayload({ content: { value: 'UserVideoTimeline' } });
    const invalidSearch = searchPayload(
      { entryId: 'cursor-bottom-1' },
      moduleEntry({ value: 'module without tweet_results' }),
      directEntry(tweetItemContent('empty-text', '   ')),
    );
    const arbitraryNestedTweet = {
      data: {
        unrelated: {
          entry: directEntry(tweetItemContent('must-not-parse', 'arbitrary nested payload')),
        },
      },
    };

    expect(parseXTimelinePayload(emptyUserVideoTimeline)).toEqual([]);
    expect(parseXTimelinePayload(invalidSearch)).toEqual([]);
    expect(parseXTimelinePayload(arbitraryNestedTweet)).toEqual([]);
    expect(parseXTimelinePayload({ data: {} })).toEqual([]);
  });
});
