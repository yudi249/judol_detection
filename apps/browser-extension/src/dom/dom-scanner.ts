import {
  MESSAGE_TYPES,
  detectPlatformFromUrl,
  type PredictionBatchRequest,
  type PredictionItem,
  type PredictionItemContext,
  type ScanBatchMessage,
} from '../shared';

export { detectPlatformFromUrl } from '../shared';

const DEFAULT_MIN_TEXT_LENGTH = 8;
const DEFAULT_MAX_TEXT_LENGTH = 500;
const EXTENSION_VERSION = '0.0.0';

const SKIPPED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'SVG',
  'CANVAS',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'BUTTON',
]);

export type ScanCandidate = PredictionItem;

export type ScanCandidateRef = {
  item: ScanCandidate;
  textNode: Text;
};

export type ScanVisibleTextOptions = {
  minTextLength?: number;
  maxTextLength?: number;
  processedNodes?: WeakSet<Node>;
  pendingNodes?: WeakSet<Node>;
  markProcessed?: boolean;
};

export type ScanBatchPageContext = {
  url: string;
  pageTitle?: string;
  capturedAt?: string;
  requestId?: string;
  extensionVersion?: string;
  predictionMode?: 'mock' | 'api';
  threshold?: number;
};

let requestSequence = 0;

export function scanVisibleTextCandidates(
  root: ParentNode,
  options: ScanVisibleTextOptions = {},
): ScanCandidate[] {
  return scanVisibleTextCandidateRefs(root, options).map((ref) => ref.item);
}

export function scanVisibleTextCandidateRefs(
  root: ParentNode,
  options: ScanVisibleTextOptions = {},
): ScanCandidateRef[] {
  const minTextLength = options.minTextLength ?? DEFAULT_MIN_TEXT_LENGTH;
  const maxTextLength = options.maxTextLength ?? DEFAULT_MAX_TEXT_LENGTH;
  const processedNodes = options.processedNodes;
  const refs: ScanCandidateRef[] = [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (processedNodes?.has(node) || options.pendingNodes?.has(node)) {
        return NodeFilter.FILTER_REJECT;
      }

      const text = normalizeText(node.textContent ?? '');
      if (text.length < minTextLength) {
        return NodeFilter.FILTER_REJECT;
      }

      if (!node.parentElement || shouldSkipElement(node.parentElement)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode();
  while (node) {
    const parentElement = node.parentElement;
    if (parentElement) {
      const text = normalizeText(node.textContent ?? '').slice(
        0,
        maxTextLength,
      );
      refs.push({
        item: {
          id: `scan-node-${refs.length}`,
          text,
          context: buildCandidateContext(parentElement),
        },
        textNode: node as Text,
      });
      if (options.markProcessed ?? true) {
        processedNodes?.add(node);
      }
    }

    node = walker.nextNode();
  }

  return refs;
}

export function createScanBatchRequest(
  candidates: ScanCandidate[],
  pageContext: ScanBatchPageContext,
): PredictionBatchRequest {
  const capturedAt = pageContext.capturedAt ?? new Date().toISOString();

  return {
    requestId: pageContext.requestId ?? createRequestId(),
    source: {
      url: pageContext.url,
      platform: detectPlatformFromUrl(pageContext.url),
      pageTitle: pageContext.pageTitle,
      capturedAt,
    },
    client: {
      extensionVersion: pageContext.extensionVersion ?? EXTENSION_VERSION,
      predictionMode: pageContext.predictionMode ?? 'mock',
      threshold: pageContext.threshold ?? 0.75,
    },
    items: candidates,
  };
}

export function createScanBatchMessage(
  request: PredictionBatchRequest,
): ScanBatchMessage {
  return {
    type: MESSAGE_TYPES.scanBatch,
    payload: request,
  };
}

function createRequestId(): string {
  requestSequence += 1;
  return `scan-${Date.now().toString(36)}-${requestSequence}`;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function shouldSkipElement(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    if (SKIPPED_TAGS.has(current.tagName)) {
      return true;
    }

    if (
      current.hasAttribute('hidden') ||
      current.getAttribute('aria-hidden') === 'true' ||
      current.getAttribute('contenteditable') === 'true' ||
      current.getAttribute('contenteditable') === ''
    ) {
      return true;
    }

    const style = window.getComputedStyle(current);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0'
    ) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

function buildCandidateContext(element: Element): PredictionItemContext {
  return {
    kind: inferContextKind(element),
    selectorHint: buildSelectorHint(element),
    visible: true,
    languageHint: 'id',
  };
}

function inferContextKind(element: Element): PredictionItemContext['kind'] {
  if (element.closest('article, [data-post-id], [data-testid*="post"]')) {
    return 'post';
  }
  if (element.closest('[data-comment-id], [data-testid*="comment"]')) {
    return 'comment';
  }
  if (element.closest('[data-message-id], [class*="message"]')) {
    return 'message';
  }
  if (/^H[1-6]$/.test(element.tagName)) {
    return 'title';
  }

  return 'unknown';
}

function buildSelectorHint(element: Element): string {
  const postContainer = element.closest('article[data-post-id]');
  if (postContainer) {
    return 'article[data-post-id]';
  }

  if (element.id) {
    return `${element.tagName.toLowerCase()}#${element.id}`;
  }

  const testId = element.getAttribute('data-testid');
  if (testId) {
    return `${element.tagName.toLowerCase()}[data-testid="${testId}"]`;
  }

  return element.tagName.toLowerCase();
}
