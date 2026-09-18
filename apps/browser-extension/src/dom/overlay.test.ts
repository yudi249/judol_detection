// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import type { PredictionResult } from '../shared';
import {
  applyCachedTweetCensor,
  applyCachedYouTubeVideoCensor,
  applyPredictionOverlays,
  ensureJudolLensOverlayStyles,
} from './overlay';

function createResult(
  patch: Partial<PredictionResult> = {},
): PredictionResult {
  return {
    id: 'candidate-1',
    label: 'judol',
    confidence: 0.94,
    riskLevel: 'high',
    action: 'blur',
    reasons: [],
    matchedTerms: ['slot'],
    unicodeAnalysis: {
      hasSuspiciousUnicode: false,
      suspiciousCount: 0,
      spans: [],
    },
    display: {
      snippet: 'bonus slot gacor malam ini',
      highlightRanges: [],
    },
    ...patch,
  };
}

function getTextNode(): Text {
  const node = document.querySelector('[data-target]')?.firstChild;
  if (!(node instanceof Text)) {
    throw new Error('Missing text node');
  }
  return node;
}

describe('JudolLens page overlay', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('wraps a high-risk detection with blur class and label without removing original text', () => {
    document.body.innerHTML =
      '<p data-target>bonus slot gacor malam ini</p>';
    const textNode = getTextNode();

    const applied = applyPredictionOverlays(
      [createResult()],
      [{ item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post', visible: true } }, textNode }],
    );

    expect(applied).toBe(1);
    expect(document.body.textContent).toContain('bonus slot gacor malam ini');
    expect(document.body.textContent).toContain('Terdeteksi JudolLens');
    expect(
      document
        .querySelector('.judollens-detected')
        ?.classList.contains('judollens-blur'),
    ).toBe(true);
    expect(document.querySelector('.judollens-label')?.textContent).toBe(
      'Terdeteksi JudolLens',
    );
  });

  it('uses warning class for warn actions and leaves text readable', () => {
    document.body.innerHTML =
      '<p data-target>bonus slot gacor malam ini</p>';
    const textNode = getTextNode();

    applyPredictionOverlays(
      [createResult({ action: 'warn', riskLevel: 'medium', confidence: 0.7 })],
      [{ item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post', visible: true } }, textNode }],
    );

    const wrapper = document.querySelector('.judollens-detected');
    expect(wrapper?.classList.contains('judollens-warning')).toBe(true);
    expect(wrapper?.classList.contains('judollens-blur')).toBe(false);
    expect(wrapper?.textContent).toContain('bonus slot gacor malam ini');
  });

  it('forces warning overlay when censor mode is warn', () => {
    document.body.innerHTML =
      '<p data-target>bonus slot gacor malam ini</p>';
    const textNode = getTextNode();

    applyPredictionOverlays(
      [createResult({ action: 'blur', riskLevel: 'high' })],
      [{ item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post', visible: true } }, textNode }],
      { censorMode: 'warn' },
    );

    const wrapper = document.querySelector('.judollens-detected');
    expect(wrapper?.classList.contains('judollens-warning')).toBe(true);
    expect(wrapper?.classList.contains('judollens-blur')).toBe(false);
  });

  it('supports hide mode while keeping the JudolLens label visible', () => {
    document.body.innerHTML =
      '<p data-target>bonus slot gacor malam ini</p>';
    const textNode = getTextNode();

    applyPredictionOverlays(
      [createResult({ action: 'blur', riskLevel: 'high' })],
      [{ item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post', visible: true } }, textNode }],
      { censorMode: 'hide' },
    );

    const wrapper = document.querySelector('.judollens-detected');
    expect(wrapper?.classList.contains('judollens-hide')).toBe(true);
    expect(document.querySelector('.judollens-label')?.textContent).toBe(
      'Terdeteksi JudolLens',
    );
  });

  it('downgrades high-risk blur to warning when auto blur is disabled', () => {
    document.body.innerHTML =
      '<p data-target>bonus slot gacor malam ini</p>';
    const textNode = getTextNode();

    applyPredictionOverlays(
      [createResult({ action: 'blur', riskLevel: 'high' })],
      [{ item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post', visible: true } }, textNode }],
      { autoBlur: false },
    );

    const wrapper = document.querySelector('.judollens-detected');
    expect(wrapper?.classList.contains('judollens-warning')).toBe(true);
    expect(wrapper?.classList.contains('judollens-blur')).toBe(false);
  });

  it('does not apply overlays when censor mode is none', () => {
    document.body.innerHTML =
      '<p data-target>bonus slot gacor malam ini</p>';
    const original = document.body.innerHTML;
    const textNode = getTextNode();

    const applied = applyPredictionOverlays(
      [createResult({ action: 'blur', riskLevel: 'high' })],
      [{ item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post', visible: true } }, textNode }],
      { censorMode: 'none' },
    );

    expect(applied).toBe(0);
    expect(document.body.innerHTML).toBe(original);
  });

  it('does not wrap suspicious Unicode spans when highlightUnicode is disabled', () => {
    document.body.innerHTML = '<p data-target>bÎ¿nus slÎ¿t gacor</p>';
    const textNode = getTextNode();

    applyPredictionOverlays(
      [
        createResult({
          unicodeAnalysis: {
            hasSuspiciousUnicode: true,
            suspiciousCount: 1,
            spans: [
              {
                start: 1,
                end: 2,
                char: 'Î¿',
                reason: 'homoglyph',
                normalizedAs: 'o',
              },
            ],
          },
        }),
      ],
      [{ item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post', visible: true } }, textNode }],
      { highlightUnicode: false },
    );

    expect(document.querySelector('.judollens-detected')).not.toBeNull();
    expect(document.querySelector('.judollens-unicode-span')).toBeNull();
  });

  it('does not modify DOM for clean results or action none', () => {
    document.body.innerHTML =
      '<p data-target>slot waktu praktikum sudah penuh</p>';
    const original = document.body.innerHTML;
    const textNode = getTextNode();

    const applied = applyPredictionOverlays(
      [
        createResult({
          label: 'non_judol',
          action: 'none',
          riskLevel: 'low',
          confidence: 0.3,
        }),
      ],
      [{ item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post', visible: true } }, textNode }],
    );

    expect(applied).toBe(0);
    expect(document.body.innerHTML).toBe(original);
  });

  it('wraps suspicious Unicode spans when highlightUnicode is enabled', () => {
    document.body.innerHTML = '<p data-target>bοnus slοt gacor</p>';
    const textNode = getTextNode();

    applyPredictionOverlays(
      [
        createResult({
          unicodeAnalysis: {
            hasSuspiciousUnicode: true,
            suspiciousCount: 2,
            spans: [
              {
                start: 1,
                end: 2,
                char: 'ο',
                reason: 'homoglyph',
                normalizedAs: 'o',
              },
              {
                start: 8,
                end: 9,
                char: 'ο',
                reason: 'homoglyph',
                normalizedAs: 'o',
              },
            ],
          },
        }),
      ],
      [{ item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post', visible: true } }, textNode }],
      { highlightUnicode: true },
    );

    const unicodeSpans = document.querySelectorAll('.judollens-unicode-span');
    expect(unicodeSpans).toHaveLength(2);
    expect(unicodeSpans[0].textContent).toBe('ο');
  });

  it('does not create nested duplicate overlays on repeated apply', () => {
    document.body.innerHTML =
      '<p data-target>bonus slot gacor malam ini</p>';
    const textNode = getTextNode();
    const refs = [
      { item: { id: 'candidate-1', text: textNode.textContent ?? '', context: { kind: 'post' as const, visible: true } }, textNode },
    ];

    applyPredictionOverlays([createResult()], refs);
    applyPredictionOverlays([createResult()], refs);

    expect(document.querySelectorAll('.judollens-detected')).toHaveLength(1);
    expect(document.querySelectorAll('.judollens-label')).toHaveLength(1);
  });

  it('blurs one X tweet once when multiple tweet text candidates are detected', () => {
    document.body.innerHTML = `
      <div data-testid="cellInnerDiv">
        <article data-testid="tweet">
          <div data-testid="tweetText"><span>bonus slot gacor malam ini</span></div>
          <div data-testid="tweetText"><span>daftar deposit sekarang</span></div>
        </article>
      </div>
    `;
    const tweet = document.querySelector<HTMLElement>('[data-testid="tweet"]');
    const textNodes = Array.from(
      document.querySelectorAll('[data-testid="tweetText"] span'),
      (element) => element.firstChild,
    ).filter((node): node is Text => node instanceof Text);

    if (!tweet || textNodes.length !== 2) {
      throw new Error('Missing X tweet fixture');
    }

    const applied = applyPredictionOverlays(
      [
        createResult({ id: 'candidate-1' }),
        createResult({ id: 'candidate-2' }),
      ],
      textNodes.map((textNode, index) => ({
        item: {
          id: `candidate-${index + 1}`,
          text: textNode.data,
          context: { kind: 'post' as const, visible: true },
        },
        textNode,
      })),
    );

    expect(applied).toBe(1);
    expect(tweet.getAttribute('data-judollens-tweet-blur')).toBe('true');
    expect(tweet.querySelector(':scope > .judollens-tweet-overlay')).not.toBeNull();
    expect(tweet.textContent).toContain('bonus slot gacor malam ini');
    expect(tweet.textContent).toContain('daftar deposit sekarang');
    expect(tweet.querySelector('.judollens-content')).toBeNull();
    expect(tweet.classList.contains('judollens-detected')).toBe(false);
    expect(document.querySelectorAll('.judollens-label')).toHaveLength(1);
  });

  it('blurs an entire YouTube video card when generic scanning detects its title', () => {
    document.body.innerHTML = `
      <ytd-rich-item-renderer>
        <a href="/watch?v=NHiWdNf9aUg"><img alt="Thumbnail" /></a>
        <div id="content"><h3><a href="/watch?v=NHiWdNf9aUg"><span>slot gacor hari ini</span></a></h3></div>
      </ytd-rich-item-renderer>
    `;
    const card = document.querySelector<HTMLElement>('ytd-rich-item-renderer');
    const textNode = card?.querySelector('h3 span')?.firstChild;
    if (!card || !(textNode instanceof Text)) {
      throw new Error('Missing YouTube card title fixture');
    }

    const applied = applyPredictionOverlays(
      [createResult()],
      [{ item: { id: 'candidate-1', text: textNode.data, context: { kind: 'post', visible: true } }, textNode }],
    );

    expect(applied).toBe(1);
    expect(card.getAttribute('data-judollens-youtube-blur')).toBe('true');
    expect(card.querySelector(':scope > .judollens-youtube-overlay')).not.toBeNull();
    expect(card.querySelector('.judollens-content')).toBeNull();
  });
  it.each([
    ['warn', 'data-judollens-youtube-warning', '.judollens-youtube-warning'],
    ['hide', 'data-judollens-youtube-hide', null],
  ] as const)('applies generic YouTube %s to the entire video card', (action, attribute, selector) => {
    document.body.innerHTML = `
      <ytd-rich-item-renderer>
        <a href="/watch?v=NHiWdNf9aUg"><img alt="Thumbnail" /></a>
        <div id="content"><h3><a href="/watch?v=NHiWdNf9aUg"><span>slot gacor hari ini</span></a></h3></div>
      </ytd-rich-item-renderer>
    `;
    const card = document.querySelector<HTMLElement>('ytd-rich-item-renderer');
    const textNode = card?.querySelector('h3 span')?.firstChild;
    if (!card || !(textNode instanceof Text)) {
      throw new Error('Missing YouTube card title fixture');
    }

    applyPredictionOverlays(
      [createResult({ action })],
      [{ item: { id: 'candidate-1', text: textNode.data, context: { kind: 'post', visible: true } }, textNode }],
    );

    expect(card.getAttribute(attribute)).toBe(action === 'hide' ? 'candidate-1' : 'true');
    if (selector) {
      expect(card.querySelector(`:scope > ${selector}`)).not.toBeNull();
    }
    expect(card.isConnected).toBe(action !== 'hide');
    expect(card.querySelector('.judollens-content')).toBeNull();
  });

  it.each([
    ['blur', 'data-judollens-telegram-blur', '.judollens-telegram-overlay'],
    ['warn', 'data-judollens-telegram-warning', '.judollens-telegram-warning'],
    ['hide', 'data-judollens-telegram-hide', null],
  ] as const)('applies Telegram %s to the bubble content wrapper', (action, attribute, selector) => {
    document.body.innerHTML = `
      <article class="bubble">
        <div class="bubble-content-wrapper">
          <span class="translatable-message">bonus slot gacor malam ini</span>
        </div>
      </article>
    `;
    const wrapper = document.querySelector<HTMLElement>('.bubble-content-wrapper');
    const textNode = wrapper?.querySelector('.translatable-message')?.firstChild;
    if (!wrapper || !(textNode instanceof Text)) {
      throw new Error('Missing Telegram message fixture');
    }

    const applied = applyPredictionOverlays(
      [createResult({ action })],
      [{ item: { id: 'candidate-1', text: textNode.data, context: { kind: 'message', visible: true } }, textNode }],
    );

    expect(applied).toBe(1);
    expect(wrapper.getAttribute(attribute)).toBe(action === 'hide' ? 'candidate-1' : 'true');
    expect(wrapper.isConnected).toBe(action !== 'hide');
    if (selector) {
      expect(wrapper.querySelector(`:scope > ${selector}`)).not.toBeNull();
    }
    expect(wrapper.querySelector('.judollens-content')).toBeNull();
  });
  it('applies one final cached blur to an X tweet', () => {
    document.body.innerHTML = '<article data-testid="tweet"><p>bonus slot gacor</p></article>';
    const tweet = document.querySelector<HTMLElement>('[data-testid="tweet"]');
    if (!tweet) {
      throw new Error('Missing X tweet fixture');
    }

    const result = { id: 'candidate-1', riskLevel: 'high' as const, action: 'blur' as const };
    expect(applyCachedTweetCensor(tweet, result)).toBe(true);
    expect(applyCachedTweetCensor(tweet, result)).toBe(false);
    expect(tweet.querySelectorAll(':scope > .judollens-tweet-overlay')).toHaveLength(1);
    expect(tweet.getAttribute('data-judollens-tweet-blur')).toBe('true');
  });

  it('applies one final cached blur to a YouTube Home card', () => {
    document.body.innerHTML = '<ytd-rich-item-renderer><p>bonus slot gacor</p></ytd-rich-item-renderer>';
    const card = document.querySelector<HTMLElement>('ytd-rich-item-renderer');
    if (!card) {
      throw new Error('Missing YouTube card fixture');
    }

    const result = { id: 'video-1', riskLevel: 'high' as const, action: 'blur' as const };
    expect(applyCachedYouTubeVideoCensor(card, result)).toBe(true);
    expect(applyCachedYouTubeVideoCensor(card, result)).toBe(false);
    expect(card.querySelectorAll(':scope > .judollens-youtube-overlay')).toHaveLength(1);
    expect(card.getAttribute('data-judollens-youtube-blur')).toBe('true');
  });

 it('censors independent direct text nodes in one non-X parent', () => {
  document.body.innerHTML = '<p>bonus slot gacor <strong>aman</strong> deposit member</p>';
  const textNodes = Array.from(document.querySelector('p')!.childNodes).filter(
   (node): node is Text => node.nodeType === Node.TEXT_NODE,
  );

  const applied = applyPredictionOverlays(
   [createResult({ id: 'first' }), createResult({ id: 'second' })],
   textNodes.map((textNode, index) => ({
    item: { id: index === 0 ? 'first' : 'second', text: textNode.data, context: { kind: 'post', visible: true } },
    textNode,
   })),
  );

  expect(applied).toBe(2);
  expect(document.querySelectorAll('.judollens-detected')).toHaveLength(2);
 });

  it('injects scoped overlay styles only once', () => {
    ensureJudolLensOverlayStyles();
    ensureJudolLensOverlayStyles();

    expect(document.querySelectorAll('style[data-judollens-style]')).toHaveLength(
      1,
    );
  });
});
