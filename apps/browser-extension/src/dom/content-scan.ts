import { MESSAGE_TYPES, type ScanBatchMessage, type ScanBatchResponseMessage } from '../shared';
import { applyPredictionOverlays } from './overlay';
import {
  createScanBatchMessage,
  createScanBatchRequest,
  scanVisibleTextCandidateRefs,
  type ScanBatchPageContext,
  type ScanCandidateRef,
} from './dom-scanner';

export type RunJudolLensScanOptions = {
  root: ParentNode;
  url: string;
  pageTitle?: string;
  processedNodes?: WeakSet<Node>;
  sendMessage: (message: ScanBatchMessage) => Promise<unknown>;
};

export type RunJudolLensScanForRootsOptions = Omit<
  RunJudolLensScanOptions,
  'root'
> & {
  roots: ParentNode[];
};

export async function runJudolLensScanOnce(
  options: RunJudolLensScanOptions,
): Promise<number> {
  return runJudolLensScanForRoots({
    ...options,
    roots: [options.root],
  });
}

export async function runJudolLensScanForRoots(
  options: RunJudolLensScanForRootsOptions,
): Promise<number> {
  const candidateRefs = collectCandidateRefs(
    options.roots,
    options.processedNodes,
  );
  const request = createScanBatchRequest(
    candidateRefs.map((ref) => ref.item),
    createPageContext(options),
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

function collectCandidateRefs(
  roots: ParentNode[],
  processedNodes?: WeakSet<Node>,
): ScanCandidateRef[] {
  const refs = roots.flatMap((root) =>
    scanVisibleTextCandidateRefs(root, {
      processedNodes,
    }),
  );

  return refs.map((ref, index) => ({
    ...ref,
    item: {
      ...ref.item,
      id: `scan-node-${index}`,
    },
  }));
}

function createPageContext(
  options: RunJudolLensScanForRootsOptions,
): ScanBatchPageContext {
  return {
    url: options.url,
    pageTitle: options.pageTitle,
  };
}
