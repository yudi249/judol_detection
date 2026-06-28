import type { ExtensionSettings, PredictionBatchResponse } from '@/shared';

const backgroundTypeSmoke: {
  settings?: ExtensionSettings;
  response?: PredictionBatchResponse;
} = {};

export default defineBackground(() => {
  void backgroundTypeSmoke;
  console.log('Hello background!', { id: browser.runtime.id });
});
