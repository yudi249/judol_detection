export type QueryInputState = {
  value: string;
  touched: boolean;
};

export function createQueryInputState(): QueryInputState {
  return { value: '', touched: false };
}

export function updateQueryInput(_state: QueryInputState, value: string): QueryInputState {
  return { value, touched: true };
}

export function syncQueryFromMonitor(
  state: QueryInputState,
  monitorQuery: string,
): QueryInputState {
  if (state.touched || state.value || !monitorQuery) {
    return state;
  }
  return { value: monitorQuery, touched: false };
}
