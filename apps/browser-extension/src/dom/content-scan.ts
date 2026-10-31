import {
  MESSAGE_TYPES,
  detectPlatformFromUrl,
  type ExtensionStateResponseMessage,
  type GetExtensionStateMessage,
  type Platform,
  type PredictionResult,
  type PredictionTraceCompleteMessage,
  type ScanBatchMessage,
  type ScanBatchResponseMessage,
} from '../shared';
import { applyPredictionOverlays } from './overlay';
import {
  createScanBatchMessage,
  createScanBatchRequest,
  scanTelegramMessageCandidateRefs,
  scanVisibleTextCandidateRefs,
  type ScanBatchPageContext,
  type ScanCandidateRef,
} from './dom-scanner';

const pendingNodes = new WeakSet<Node>();

export type CompletedPrediction = {
  result: PredictionResult;
  ref: ScanCandidateRef;
};

export type RunJudolLensScanOptions = {
  root: ParentNode;
  url: string;
  pageTitle?: string;
  processedNodes?: WeakSet<Node>;
  sendMessage: (
    message: ScanBatchMessage | GetExtensionStateMessage | PredictionTraceCompleteMessage,
  ) => Promise<unknown>;
  onPredictionResults?: (completed: CompletedPrediction[]) => void;
  now?: () => number;
  epochNow?: () => number;
  nextAnimationFrame?: () => Promise<void>;
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

  if (settings && (!settings.protectionEnabled || !isPlatformEnabled(platform, settings.platformScope))) {
    return 0;
  }

  const now = options.now ?? (() => performance.now());
  const scanStartedAt = now();
  const startedAtEpochMs = (options.epochNow ?? (() => Date.now()))();
  const candidateRefs = collectCandidateRefs(
    options.roots,
    options.processedNodes,
    platform === 'telegram',
  );
  const scanDurationMs = now() - scanStartedAt;
  for (const ref of candidateRefs) {
    for (const textNode of getRefTextNodes(ref)) {
      pendingNodes.add(textNode);
    }
  }

  if (candidateRefs.length === 0) {
    return 0;
  }

  try {
    const request = createScanBatchRequest(
      candidateRefs.map((ref) => ref.item),
      createPageContext(options, state),
    );
    const telemetry = settings?.benchmarkTelemetry.enabled
      ? {
          requestId: request.requestId,
          startedAtEpochMs,
          scanDurationMs,
          candidateCount: candidateRefs.length,
          totalCharacters: candidateRefs.reduce((total, ref) => total + ref.item.text.length, 0),
          maxCharacters: candidateRefs.reduce(
            (maximum, ref) => Math.max(maximum, ref.item.text.length),
            0,
          ),
        }
      : undefined;
    let response: ScanBatchResponseMessage | undefined;
    try {
      response = (await options.sendMessage({
        ...createScanBatchMessage(request),
        telemetry,
      })) as ScanBatchResponseMessage | undefined;
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        return 0;
      }

      throw error;
    }

    if (response?.type !== MESSAGE_TYPES.scanBatch) {
      return 0;
    }

    const overlayOptions = {
      autoBlur: settings?.autoBlur,
      censorMode: settings?.censorMode,
      highlightUnicode: settings?.highlightUnicode ?? true,
    };
    const refsById = new Map(candidateRefs.map((ref) => [ref.item.id, ref]));
    const completed = response.payload.results.flatMap((result) => {
      const ref = refsById.get(result.id);
      return ref
        ? [{ result: { ...result, action: resolveEffectiveAction(result, overlayOptions) }, ref }]
        : [];
    });
    options.onPredictionResults?.(completed);

    const overlayStartedAt = now();
    const applied = applyPredictionOverlays(
      response.payload.results,
      candidateRefs,
      overlayOptions,
    );
    const overlayDurationMs = now() - overlayStartedAt;
    for (const ref of candidateRefs) {
      for (const textNode of getRefTextNodes(ref)) {
        options.processedNodes?.add(textNode);
      }
    }

    if (telemetry) {
      const paintStartedAt = now();
      await (options.nextAnimationFrame ?? waitForNextAnimationFrame)();
      const completion: PredictionTraceCompleteMessage = {
        type: MESSAGE_TYPES.predictionTraceComplete,
        payload: {
          requestId: request.requestId,
          overlayDurationMs,
          nextPaintDurationMs: now() - paintStartedAt,
          completion: 'complete',
        },
      };
      void options.sendMessage(completion).catch(() => undefined);
    }
    return applied;
  } finally {
    for (const ref of candidateRefs) {
      for (const textNode of getRefTextNodes(ref)) {
        pendingNodes.delete(textNode);
      }
    }
  }
}

function getRefTextNodes(ref: ScanCandidateRef): Text[] {
  return ref.textNodes ?? [ref.textNode];
}


function collectCandidateRefs(
  roots: ParentNode[],
  processedNodes: WeakSet<Node> | undefined,
  isTelegram: boolean,
): ScanCandidateRef[] {
  const refs = roots.flatMap((root) => {
    const scanOptions = {
      processedNodes,
      pendingNodes,
      markProcessed: false,
    };
    return isTelegram
      ? scanTelegramMessageCandidateRefs(root, scanOptions)
      : scanVisibleTextCandidateRefs(root, scanOptions);
  });

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

function resolveEffectiveAction(
  result: PredictionResult,
  options: {
    autoBlur?: boolean;
    censorMode?: PredictionResult['action'];
  },
): PredictionResult['action'] {
  if (options.censorMode) {
    return options.censorMode;
  }

  return result.action === 'blur' && options.autoBlur === false
    ? 'warn'
    : result.action;
}

function isExtensionContextInvalidated(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes('extension context invalidated')
  );
}

function waitForNextAnimationFrame(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  requestAnimationFrame(() => resolve());
  return promise;
}
