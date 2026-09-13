import type {
  ParseSearchTimelineResult,
  SearchTimelineRequest,
  XCollectedItem,
} from './models';

const SEARCH_TIMELINE_PATH = /\/i\/api\/graphql\/[^/]+\/SearchTimeline(?:$|\?)/;

export function decodeSearchTimelineRequest(url: string): SearchTimelineRequest {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { isSearchTimeline: false, query: '' };
  }

  const isSearchTimeline =
    (parsed.hostname === 'x.com' || parsed.hostname.endsWith('.x.com')) &&
    SEARCH_TIMELINE_PATH.test(`${parsed.pathname}?${parsed.searchParams.toString()}`);
  if (!isSearchTimeline) {
    return { isSearchTimeline: false, query: '' };
  }

  const variables = parseJsonObject(parsed.searchParams.get('variables'));
  const query = typeof variables?.rawQuery === 'string' ? variables.rawQuery : '';
  const product = typeof variables?.product === 'string' ? variables.product : undefined;
  return { isSearchTimeline: true, query, product };
}

export function parseSearchTimelinePayload(
  payload: unknown,
  query: string,
): ParseSearchTimelineResult {
  const instructions = getInstructions(payload);
  const seenIds = new Set<string>();
  const items: XCollectedItem[] = [];

  for (const instruction of instructions) {
    const entries = arrayValue(instruction, 'entries');
    if (!Array.isArray(entries)) {
      continue;
    }
    for (const entry of entries) {
      const entryObject = asObject(entry);
      if (!entryObject || !String(entryObject.entryId ?? '').startsWith('tweet-')) {
        continue;
      }
      const content = objectValue(entryObject, 'content');
      const itemContent = objectValue(content, 'itemContent');
      const tweetResults = objectValue(itemContent, 'tweet_results');
      let result = objectValue(tweetResults, 'result');
      if (!result) {
        continue;
      }
      const nestedTweet = objectValue(result, 'tweet');
      if (nestedTweet) {
        result = nestedTweet;
      }

      const legacy = objectValue(result, 'legacy');
      const noteResults = objectValue(objectValue(result, 'note_tweet'), 'note_tweet_results');
      const noteResult = objectValue(noteResults, 'result');
      const postId = String(result.rest_id ?? legacy?.id_str ?? '');
      const noteText = typeof noteResult?.text === 'string' ? noteResult.text : '';
      const text = (noteText || String(legacy?.full_text ?? '')).trim();
      if (!postId || !text || seenIds.has(postId)) {
        continue;
      }

      seenIds.add(postId);
      items.push({
        source_item_id: postId,
        text_raw: text,
        source_url: `https://x.com/i/web/status/${postId}`,
        ...(typeof legacy?.created_at === 'string' ? { published_at: legacy.created_at } : {}),
      });
    }
  }

  return { items, query };
}

function getInstructions(payload: unknown): Record<string, unknown>[] {
  const data = objectValue(payload, 'data');
  const search = objectValue(data, 'search_by_raw_query');
  const timeline = objectValue(search, 'search_timeline');
  const timelineData = objectValue(timeline, 'timeline');
  const instructions = arrayValue(timelineData, 'instructions');
  return Array.isArray(instructions)
    ? instructions.map(asObject).filter((value): value is Record<string, unknown> => value !== null)
    : [];
}

function arrayValue(value: unknown, key: string): unknown[] | null {
  const object = asObject(value);
  const child = object?.[key];
  return Array.isArray(child) ? child : null;
}

function parseJsonObject(value: string | null): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  try {
    return asObject(JSON.parse(value));
  } catch {
    return null;
  }
}

function objectValue(value: unknown, key: string): Record<string, unknown> | null {
  const object = asObject(value);
  const child = object?.[key];
  return asObject(child);
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
