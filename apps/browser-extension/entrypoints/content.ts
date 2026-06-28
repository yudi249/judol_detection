import type { PredictionBatchRequest, ScanBatchMessage } from '@/shared';

const contentTypeSmoke: {
  request?: PredictionBatchRequest;
  message?: ScanBatchMessage;
} = {};

export default defineContentScript({
  matches: ['*://*.google.com/*'],
  main() {
    void contentTypeSmoke;
    console.log('Hello content.');
  },
});
