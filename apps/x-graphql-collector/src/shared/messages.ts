import type { MonitorState } from '../storage/collector-storage';
import type { SearchProduct } from '../graphql/models';

export type CollectorRequest =
  | { type: 'collector:start'; tabId: number; query?: string; searchProduct?: SearchProduct }
  | { type: 'collector:stop' }
  | { type: 'collector:auto-scroll-start' }
  | { type: 'collector:auto-scroll-stop' }
  | { type: 'collector:get-state' }
  | { type: 'collector:clear' };

export type CollectorResponse = {
  ok: boolean;
  state: MonitorState;
  error?: string;
};
