import { handleJudolLensMessage } from '../src/background';
import { registerManualAnalysisContextMenu } from '../src/background/manual-context-menu';
import type { JudolLensRequestMessage } from '../src/shared';

export default defineBackground(() => {
  registerManualAnalysisContextMenu();

  browser.runtime.onMessage.addListener(
    (
      message: JudolLensRequestMessage,
      _sender,
      sendResponse: (response: unknown) => void,
    ) => {
      void handleJudolLensMessage(message)
        .then((response) => {
          sendResponse(response);
        })
        .catch((error) => {
          console.error('JudolLens background message failed.', error);
          sendResponse(undefined);
        });

      return true;
    },
  );
});
