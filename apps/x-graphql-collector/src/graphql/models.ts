export type XCollectedItem = {
  source_item_id: string;
  text_raw: string;
  source_url: string;
  published_at?: string;
  language_hint?: string;
};

export type XCollectionBatch = {
  schema_version: 1;
  source: 'x_search_timeline';
  query: string;
  collected_at: string;
  items: XCollectedItem[];
};

export type SearchTimelineRequest = {
  isSearchTimeline: boolean;
  query: string;
  product?: string;
};

export type SearchProduct = 'Latest' | 'Top';

export type ParseSearchTimelineResult = {
  items: XCollectedItem[];
  query: string;
};
