export type YouTubeBrowsePredictionItem = {
  id: string;
  text: string;
};

export function parseYouTubeBrowsePayload(payload: unknown): YouTubeBrowsePredictionItem[] {
  const seenIds = new Set<string>();
  const items: YouTubeBrowsePredictionItem[] = [];

  for (const entry of getSelectedRichGridContents(payload)) {
    const lockup = objectValue(objectValue(objectValue(entry, 'richItemRenderer'), 'content'), 'lockupViewModel');
    const id = stringValue(lockup, 'contentId');
    const text = stringValue(objectValue(objectValue(lockup, 'metadata'), 'lockupMetadataViewModel')?.title, 'content');
    const contentType = stringValue(lockup, 'contentType');

    if (!id || !text || (contentType !== undefined && contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') || seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);
    items.push({ id, text });
  }

  return items;
}

function getSelectedRichGridContents(payload: unknown): unknown[] {
  const tabs = arrayValue(objectValue(objectValue(payload, 'contents'), 'twoColumnBrowseResultsRenderer'), 'tabs') ?? [];

  return tabs.flatMap((tab) => {
    const tabRenderer = objectValue(tab, 'tabRenderer');
    if (tabRenderer?.selected !== true) {
      return [];
    }

    return arrayValue(objectValue(objectValue(tabRenderer, 'content'), 'richGridRenderer'), 'contents') ?? [];
  });
}

function objectValue(value: unknown, key: string): Record<string, unknown> | undefined {
  const object = asObject(value);
  const child = object?.[key];
  return asObject(child);
}

function arrayValue(value: unknown, key: string): unknown[] | undefined {
  const child = asObject(value)?.[key];
  return Array.isArray(child) ? child : undefined;
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
