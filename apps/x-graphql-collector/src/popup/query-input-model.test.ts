import { describe, expect, it } from 'vitest';
import {
  createQueryInputState,
  syncQueryFromMonitor,
  updateQueryInput,
} from './query-input-model';

describe('query input synchronization', () => {
  it('does not replace a query edited by the user during state polling', () => {
    const initial = createQueryInputState();
    const edited = updateQueryInput(initial, 'us deposit slot');

    expect(syncQueryFromMonitor(edited, 'bonus slot gacor')).toEqual(edited);
  });

  it('hydrates an untouched empty input from the active monitor query', () => {
    const initial = createQueryInputState();

    expect(syncQueryFromMonitor(initial, 'bonus slot gacor')).toEqual({
      value: 'bonus slot gacor',
      touched: false,
    });
  });
});
