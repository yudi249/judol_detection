import type { ExtensionSettings, PredictionBatchResponse } from '@/shared';
import type { StorageArea } from '@/storage';

const backgroundTypeSmoke: {
  settings?: ExtensionSettings;
  response?: PredictionBatchResponse;
  storage?: StorageArea;
} = {};

export default defineBackground(() => {
  void backgroundTypeSmoke;
  console.log('Hello background!', { id: browser.runtime.id });
});
