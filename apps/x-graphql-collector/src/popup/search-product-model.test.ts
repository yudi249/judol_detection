import { describe, expect, it } from 'vitest';
import type { SearchProduct } from '../graphql/models';
import {
  createSearchProductInputState,
  syncSearchProductFromMonitor,
  updateSearchProductInput,
} from './search-product-model';

describe('search product input synchronization', () => {
  it('does not replace a user-selected Top mode during polling', () => {
    const initial = createSearchProductInputState();
    const selected = updateSearchProductInput(initial, 'Top');

    expect(syncSearchProductFromMonitor(selected, 'Latest')).toEqual({
      value: 'Top',
      touched: true,
    });
  });

  it('hydrates an untouched dropdown from the active monitor mode', () => {
    const initial = createSearchProductInputState();

    expect(syncSearchProductFromMonitor(initial, 'Top' as SearchProduct)).toEqual({
      value: 'Top',
      touched: false,
    });
  });
});
