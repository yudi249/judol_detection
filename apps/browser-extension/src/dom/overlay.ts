import type { DetectionAction, PredictionResult, RiskLevel, UnicodeSpan } from '../shared';
import type { ScanCandidateRef } from './dom-scanner';

const STYLE_ATTRIBUTE = 'data-judollens-style';
const OVERLAY_ATTRIBUTE = 'data-judollens-overlay';
const LABEL_TEXT = 'Terdeteksi JudolLens';

export type ApplyPredictionOverlayOptions = {
  autoBlur?: boolean;
  censorMode?: DetectionAction;
  highlightUnicode?: boolean;
};

export function applyPredictionOverlays(
  results: PredictionResult[],
  candidateRefs: ScanCandidateRef[],
  options: ApplyPredictionOverlayOptions = {},
): number {
  ensureJudolLensOverlayStyles();

  const highlightUnicode = options.highlightUnicode ?? true;
  const refsById = new Map(candidateRefs.map((ref) => [ref.item.id, ref]));
  const appliedTargets = new Set<HTMLElement>();
  let appliedCount = 0;

  for (const result of results) {
    const action = resolveOverlayAction(result, options);
    if (result.label !== 'judol' || action === 'none') {
      continue;
    }

    const ref = refsById.get(result.id);
    if (!ref || !ref.textNode.parentElement) {
      continue;
    }

    const target = resolveOverlayTarget(ref, action);
    const tweetCensorTarget = isTweetCensorTarget(target, action);
    if (
      (tweetCensorTarget &&
        (appliedTargets.has(target) || isAlreadyOverlayedTarget(target))) ||
      (!tweetCensorTarget && isTextNodeAlreadyOverlayed(ref.textNode))
    ) {
      continue;
    }

    if (tweetCensorTarget) {
      applyTweetCensor(target, result, action);
    } else {
      const wrapper = createDetectionWrapper(result, action);
      appendTextWithUnicodeHighlights(
        wrapper,
        ref.textNode.data,
        highlightUnicode ? result.unicodeAnalysis.spans : [],
      );
      wrapper.append(createLabel());
      ref.textNode.replaceWith(wrapper);
    }
    if (tweetCensorTarget) {
      appliedTargets.add(target);
    }
    appliedCount += 1;
  }

  return appliedCount;
}

export type CachedTweetCensor = {
  id: string;
  riskLevel: RiskLevel;
  action: Extract<DetectionAction, 'blur' | 'hide' | 'warn'>;
};

export function applyCachedTweetCensor(
  tweet: HTMLElement,
  result: CachedTweetCensor,
): boolean {
  if (
    !tweet.matches('[data-testid="tweet"]') ||
    isAlreadyOverlayedTarget(tweet)
  ) {
    return false;
  }

  applyTweetCensor(tweet, result, result.action);
  return true;
}

export function ensureJudolLensOverlayStyles(): void {
  if (document.head.querySelector(`style[${STYLE_ATTRIBUTE}]`)) {
    return;
  }

  const style = document.createElement('style');
  style.setAttribute(STYLE_ATTRIBUTE, 'true');
  style.textContent = `
.judollens-detected {
  border-radius: 6px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  display: inline;
  line-height: inherit;
  padding: 0 2px;
  position: relative;
}
.judollens-blur {
  background: rgba(239, 68, 68, 0.12);
  outline: 1px solid rgba(239, 68, 68, 0.42);
}
.judollens-blur .judollens-content {
  filter: blur(3px);
  user-select: none;
}
[data-judollens-tweet-blur] {
  position: relative;
}
.judollens-tweet-overlay {
  background: rgba(239, 68, 68, 0.12);
  border-radius: inherit;
  inset: 0;
  outline: 1px solid rgba(239, 68, 68, 0.42);
  pointer-events: none;
  position: absolute;
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
}
.judollens-tweet-overlay .judollens-label {
  bottom: 8px;
  position: absolute;
  right: 8px;
  z-index: 1;
}
[data-judollens-tweet-warning] {
  position: relative;
}
.judollens-tweet-warning.judollens-label {
  margin-left: 0;
  pointer-events: none;
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 1;
}

.judollens-warning {
  background: rgba(245, 158, 11, 0.14);
  outline: 1px solid rgba(245, 158, 11, 0.5);
}
.judollens-hide {
  background: rgba(15, 23, 42, 0.92);
  outline: 1px solid rgba(239, 68, 68, 0.55);
}
.judollens-hide .judollens-content {
  color: transparent;
  text-shadow: none;
  user-select: none;
}
.judollens-unicode-span {
  background: rgba(245, 158, 11, 0.36);
  border-bottom: 2px solid #f59e0b;
  border-radius: 3px;
  padding: 0 1px;
}
.judollens-label {
  background: #0b1117;
  border: 1px solid rgba(239, 68, 68, 0.55);
  border-radius: 999px;
  color: #fff;
  display: inline-block;
  font: 600 11px/1.2 "Segoe UI", system-ui, sans-serif;
  letter-spacing: 0;
  margin-left: 6px;
  padding: 2px 6px;
  vertical-align: middle;
}
`;
  document.head.append(style);
}

function resolveOverlayAction(
  result: PredictionResult,
  options: ApplyPredictionOverlayOptions,
): DetectionAction {
  if (options.censorMode) {
    return options.censorMode;
  }

  if (result.action === 'blur' && options.autoBlur === false) {
    return 'warn';
  }

  return result.action;
}

function createDetectionWrapper(
  result: PredictionResult,
  action: DetectionAction,
): HTMLSpanElement {
  const wrapper = document.createElement('span');
  wrapper.classList.add('judollens-detected');
  if (action === 'hide') {
    wrapper.classList.add('judollens-hide');
  } else {
    wrapper.classList.add(
      action === 'blur' ? 'judollens-blur' : 'judollens-warning',
    );
  }
  wrapper.setAttribute(OVERLAY_ATTRIBUTE, result.id);
  wrapper.setAttribute('data-judollens-risk', result.riskLevel);
  return wrapper;
}

function appendTextWithUnicodeHighlights(
  wrapper: HTMLElement,
  text: string,
  spans: UnicodeSpan[],
): void {
  const content = document.createElement('span');
  content.className = 'judollens-content';
  const sortedSpans = [...spans]
    .filter((span) => span.start >= 0 && span.end > span.start)
    .sort((a, b) => a.start - b.start);
  let cursor = 0;

  for (const span of sortedSpans) {
    const start = Math.min(span.start, text.length);
    const end = Math.min(span.end, text.length);
    if (start < cursor || start >= end) {
      continue;
    }

    if (start > cursor) {
      content.append(document.createTextNode(text.slice(cursor, start)));
    }

    const mark = document.createElement('span');
    mark.className = 'judollens-unicode-span';
    mark.title = span.normalizedAs
      ? `${span.reason}: ${span.char} -> ${span.normalizedAs}`
      : span.reason;
    mark.textContent = text.slice(start, end);
    content.append(mark);
    cursor = end;
  }

  if (cursor < text.length) {
    content.append(document.createTextNode(text.slice(cursor)));
  }

  wrapper.append(content);
}

function createLabel(): HTMLSpanElement {
  const label = document.createElement('span');
  label.className = 'judollens-label';
  label.textContent = LABEL_TEXT;
  return label;
}

function resolveOverlayTarget(
  ref: ScanCandidateRef,
  action: DetectionAction,
): HTMLElement {
  if (action === 'blur' || action === 'hide') {
    const tweet = ref.textNode.parentElement?.closest<HTMLElement>(
      '[data-testid="tweet"]',
    );
    if (tweet) {
      return tweet;
    }
  }

  return ref.textNode.parentElement!;
}

function isTweetCensorTarget(
  target: HTMLElement,
  action: DetectionAction,
): boolean {
  return (
    (action === 'blur' || action === 'hide') &&
    target.matches('[data-testid="tweet"]')
  );
}

function applyTweetCensor(
  target: HTMLElement,
  result: Pick<PredictionResult, 'id' | 'riskLevel'>,
  action: DetectionAction,
): void {
  if (action === 'hide') {
    target.setAttribute('data-judollens-tweet-hide', result.id);
    target.remove();
    return;
  }

  if (action === 'warn') {
    ensureJudolLensOverlayStyles();
    const badge = createLabel();
    badge.classList.add('judollens-tweet-warning');
    target.setAttribute('data-judollens-tweet-warning', 'true');
    badge.setAttribute(OVERLAY_ATTRIBUTE, result.id);
    badge.setAttribute('data-judollens-risk', result.riskLevel);
    target.append(badge);
    return;
  }

  if (action !== 'blur') {
    return;
  }

  ensureJudolLensOverlayStyles();
  const overlay = document.createElement('span');
  overlay.classList.add(
    'judollens-detected',
    'judollens-blur',
    'judollens-tweet-overlay',
  );
  target.setAttribute('data-judollens-tweet-blur', 'true');
  overlay.setAttribute(OVERLAY_ATTRIBUTE, result.id);
  overlay.setAttribute('data-judollens-risk', result.riskLevel);
  overlay.append(createLabel());
  target.append(overlay);
}

function isAlreadyOverlayedTarget(target: HTMLElement): boolean {
  return Boolean(target.querySelector(`:scope > [${OVERLAY_ATTRIBUTE}]`));
}

function isTextNodeAlreadyOverlayed(textNode: Text): boolean {
  return textNode.parentElement?.closest(`[${OVERLAY_ATTRIBUTE}]`) !== null;
}
