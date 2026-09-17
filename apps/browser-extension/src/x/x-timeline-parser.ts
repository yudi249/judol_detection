export type TimelinePredictionItem = {
  id: string;
  text: string;
};

export function parseXTimelinePayload(payload: unknown): TimelinePredictionItem[] {
  const seenIds = new Set<string>();
  const items: TimelinePredictionItem[] = [];

  for (const instruction of getTimelineInstructions(payload)) {
    for (const itemContent of getItemContents(instruction)) {
      const item = parseTweetItem(itemContent);
      if (!item || seenIds.has(item.id)) {
        continue;
      }

      seenIds.add(item.id);
      items.push(item);
    }
  }

  return items;
}

function getTimelineInstructions(payload: unknown): Record<string, unknown>[] {
  const data = objectValue(payload, 'data');
  const roots = [
    objectValue(objectValue(objectValue(data, 'search_by_raw_query'), 'search_timeline'), 'timeline'),
    objectValue(objectValue(data, 'home'), 'home_timeline_urt'),
    objectValue(objectValue(objectValue(objectValue(data, 'user'), 'result'), 'timeline'), 'timeline'),
    objectValue(data, 'threaded_conversation_with_injections_v2'),
  ];

  return roots.flatMap((root) => (arrayValue(root, 'instructions') ?? [])
    .map(asObject)
    .filter((instruction): instruction is Record<string, unknown> => instruction !== undefined));
}

function getItemContents(instruction: Record<string, unknown>): Record<string, unknown>[] {
  const entries = [objectValue(instruction, 'entry'), ...(arrayValue(instruction, 'entries') ?? [])]
    .map(asObject)
    .filter((entry): entry is Record<string, unknown> => entry !== undefined);

  return entries.flatMap((entry) => {
    const content = objectValue(entry, 'content');
    const direct = objectValue(content, 'itemContent');
    const moduleItems = arrayValue(content, 'items') ?? [];
    const module = moduleItems
      .map((moduleItem) => objectValue(objectValue(moduleItem, 'item'), 'itemContent'))
      .filter((itemContent): itemContent is Record<string, unknown> => itemContent !== undefined);

    return direct ? [direct, ...module] : module;
  });
}

function parseTweetItem(itemContent: Record<string, unknown>): TimelinePredictionItem | undefined {
  const result = objectValue(objectValue(itemContent, 'tweet_results'), 'result');
  const tweet = objectValue(result, 'tweet') ?? result;
  const legacy = objectValue(tweet, 'legacy');
  const noteResult = objectValue(objectValue(objectValue(tweet, 'note_tweet'), 'note_tweet_results'), 'result');
  const id = stringValue(tweet, 'rest_id') ?? stringValue(legacy, 'id_str');
  const text = (stringValue(noteResult, 'text') ?? stringValue(legacy, 'full_text') ?? '').trim();

  return id && text ? { id, text } : undefined;
}

function arrayValue(value: unknown, key: string): unknown[] | undefined {
  const child = asObject(value)?.[key];
  return Array.isArray(child) ? child : undefined;
}

function objectValue(value: unknown, key: string): Record<string, unknown> | undefined {
  return asObject(value)?.[key] as Record<string, unknown> | undefined;
}

function stringValue(value: unknown, key: string): string | undefined {
  const child = asObject(value)?.[key];
  const trimmed = typeof child === 'string' ? child.trim() : '';
  return trimmed || undefined;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}
