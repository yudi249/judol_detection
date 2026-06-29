import { MESSAGE_TYPES, type ScanBatchMessage, type ScanBatchResponseMessage } from '../shared';
import { applyPredictionOverlays } from './overlay';
import {
  createScanBatchMessage,
  createScanBatchRequest,
  scanVisibleTextCandidateRefs,
} from './dom-scanner';

export type RunJudolLensScanOptions = {
  root: ParentNode;
  url: string;
  pageTitle?: string;
  processedNodes?: WeakSet<Node>;
  sendMessage: (message: ScanBatchMessage) => Promise<unknown>;
};

export async function runJudolLensScanOnce(
  options: RunJudolLensScanOptions,
): Promise<number> {
  const candidateRefs = scanVisibleTextCandidateRefs(options.root, {
    processedNodes: options.processedNodes,
  });
  const request = createScanBatchRequest(
    candidateRefs.map((ref) => ref.item),
    {
      url: options.url,
      pageTitle: options.pageTitle,
    },
  );
  const response = (await options.sendMessage(
    createScanBatchMessage(request),
  )) as ScanBatchResponseMessage | undefined;

  if (response?.type !== MESSAGE_TYPES.scanBatch) {
    return 0;
  }

  return applyPredictionOverlays(response.payload.results, candidateRefs, {
    highlightUnicode: true,
  });
}
