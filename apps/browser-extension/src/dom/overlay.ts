import type { PredictionResult, UnicodeSpan } from '../shared';
import type { ScanCandidateRef } from './dom-scanner';

const STYLE_ATTRIBUTE = 'data-judollens-style';
const OVERLAY_ATTRIBUTE = 'data-judollens-overlay';
const LABEL_TEXT = 'Terdeteksi JudolLens';

export type ApplyPredictionOverlayOptions = {
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
  let appliedCount = 0;

  for (const result of results) {
    if (result.label !== 'judol' || result.action === 'none') {
      continue;
    }

    const ref = refsById.get(result.id);
    if (!ref || !ref.textNode.parentNode || isAlreadyOverlayed(ref.textNode)) {
      continue;
    }

    const wrapper = createDetectionWrapper(result);
    appendTextWithUnicodeHighlights(
      wrapper,
      ref.textNode.data,
      highlightUnicode ? result.unicodeAnalysis.spans : [],
    );
    wrapper.append(createLabel());
    ref.textNode.replaceWith(wrapper);
    appliedCount += 1;
  }

  return appliedCount;
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
.judollens-warning {
  background: rgba(245, 158, 11, 0.14);
  outline: 1px solid rgba(245, 158, 11, 0.5);
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

function createDetectionWrapper(result: PredictionResult): HTMLSpanElement {
  const wrapper = document.createElement('span');
  wrapper.classList.add('judollens-detected');
  wrapper.classList.add(
    result.action === 'blur' ? 'judollens-blur' : 'judollens-warning',
  );
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

function isAlreadyOverlayed(textNode: Text): boolean {
  return Boolean(textNode.parentElement?.closest(`[${OVERLAY_ATTRIBUTE}]`));
}
