import {
  MESSAGE_TYPES,
  detectPlatformFromUrl,
  type ExtensionStateResponseMessage,
  type GetExtensionStateMessage,
  type Platform,
  type ScanBatchMessage,
  type ScanBatchResponseMessage,
} from '../shared';
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
  sendMessage: (
    message: ScanBatchMessage | GetExtensionStateMessage,
  ) => Promise<unknown>;
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
  const state = (await options.sendMessage({
    type: MESSAGE_TYPES.getExtensionState,
  })) as ExtensionStateResponseMessage | undefined;
  const settings = state?.payload.settings;
  const platform = detectPlatformFromUrl(options.url);

  if (settings && !isPlatformEnabled(platform, settings.platformScope)) {
    return 0;
  }

  const candidateRefs = collectCandidateRefs(
    options.roots,
    options.processedNodes,
  );
  const request = createScanBatchRequest(
    candidateRefs.map((ref) => ref.item),
    createPageContext(options, state),
  );
  const response = (await options.sendMessage(
    createScanBatchMessage(request),
  )) as ScanBatchResponseMessage | undefined;

  if (response?.type !== MESSAGE_TYPES.scanBatch) {
    return 0;
  }

  return applyPredictionOverlays(response.payload.results, candidateRefs, {
    autoBlur: settings?.autoBlur,
    censorMode: settings?.censorMode,
    highlightUnicode: settings?.highlightUnicode ?? true,
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
  state?: ExtensionStateResponseMessage,
): ScanBatchPageContext {
  return {
    url: options.url,
    pageTitle: options.pageTitle,
    predictionMode: state?.payload.settings.predictionMode,
    threshold: state?.payload.settings.threshold,
  };
}

function isPlatformEnabled(
  platform: Platform,
  scope: ExtensionStateResponseMessage['payload']['settings']['platformScope'],
): boolean {
  if (platform === 'unknown') {
    return scope.otherSites;
  }

  return scope[platform];
}
