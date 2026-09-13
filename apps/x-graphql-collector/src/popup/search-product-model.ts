import type { SearchProduct } from '../graphql/models';

export type SearchProductInputState = {
  value: SearchProduct;
  touched: boolean;
};

export function createSearchProductInputState(): SearchProductInputState {
  return { value: 'Latest', touched: false };
}

export function updateSearchProductInput(
  _state: SearchProductInputState,
  value: SearchProduct,
): SearchProductInputState {
  return { value, touched: true };
}

export function syncSearchProductFromMonitor(
  state: SearchProductInputState,
  monitorProduct: SearchProduct,
): SearchProductInputState {
  if (state.touched) {
    return state;
  }
  return { value: monitorProduct, touched: false };
}
