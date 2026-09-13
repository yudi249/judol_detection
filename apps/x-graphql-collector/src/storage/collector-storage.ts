import type { XCollectedItem } from '../graphql/models';
import {
  MAX_AUTO_SCROLL_STEPS,
  type AutoScrollState,
} from '../monitor/auto-scroll-controller';
import type { SearchProduct } from '../graphql/models';

export const STORAGE_KEY = 'x-graphql-collector:session';
export const MAX_ITEMS = 5000;

export type MonitorStatus = 'idle' | 'attaching' | 'monitoring' | 'stopped' | 'error' | 'detached';

export type MonitorState = {
  schema_version: 1;
  status: MonitorStatus;
  tab_id?: number;
  query: string;
  search_product: SearchProduct;
  started_at?: string;
  updated_at: string;
  response_count: number;
  item_count: number;
  ignored_count: number;
  error_count: number;
  last_error?: string;
  auto_scroll: AutoScrollState;
  items: XCollectedItem[];
};

export type StorageArea = {
  get: (keys?: string | string[]) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
};

export function emptyMonitorState(): MonitorState {
  return {
    schema_version: 1,
    status: 'idle',
    query: '',
    search_product: 'Latest',
    updated_at: new Date().toISOString(),
    response_count: 0,
    item_count: 0,
    ignored_count: 0,
    error_count: 0,
    auto_scroll: {
      status: 'idle',
      steps: 0,
      max_steps: MAX_AUTO_SCROLL_STEPS,
    },
    items: [],
  };
}

export async function readMonitorState(storage: StorageArea): Promise<MonitorState> {
  const stored = (await storage.get(STORAGE_KEY))[STORAGE_KEY];
  if (!stored || typeof stored !== 'object') {
    return emptyMonitorState();
  }
  return { ...emptyMonitorState(), ...(stored as Partial<MonitorState>) };
}

export async function writeMonitorState(storage: StorageArea, state: MonitorState): Promise<void> {
  await storage.set({
    [STORAGE_KEY]: {
      ...state,
      items: state.items.slice(0, MAX_ITEMS),
      item_count: Math.min(state.item_count, MAX_ITEMS),
    },
  });
}
