// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';

import { createYouTubeBrowseReconciler } from './youtube-browse-reconciler';

function result(id: string, action: 'blur' | 'hide' | 'warn' = 'blur') {
  return {
    id,
    label: 'judol' as const,
    confidence: 0.99,
    riskLevel: 'high' as const,
    action,
    reasons: [],
    matchedTerms: ['slot'],
    unicodeAnalysis: {
      hasSuspiciousUnicode: false,
      suspiciousCount: 0,
      spans: [],
    },
    display: { snippet: 'slot gacor', highlightRanges: [] },
  };
}

function videoCard(id: string): HTMLElement {
  const card = document.createElement('ytd-rich-item-renderer');
  const link = document.createElement('a');
  link.href = `https://www.youtube.com/watch?v=${id}`;
  card.append(link);
  return card;
}

function shortsCard(id: string): HTMLElement {
  const card = document.createElement('ytd-rich-item-renderer');
  const link = document.createElement('a');
  link.href = `https://www.youtube.com/shorts/${id}`;
  card.append(link);
  return card;
}

function cardWithWatchHref(href: string): HTMLElement {
  const card = document.createElement('ytd-rich-item-renderer');
  const link = document.createElement('a');
  link.href = href;
  card.append(link);
  return card;
}

describe('YouTube Browse reconciler', () => {
  beforeEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  it('changes only regular cards whose watch ID matches each keyed action', () => {
    const blur = videoCard('video-blur');
    const warn = videoCard('video-warn');
    const hide = videoCard('video-hide');
    const unrelated = videoCard('video-other');
    const short = shortsCard('video-blur');
    document.body.append(blur, warn, hide, unrelated, short);

    const reconciler = createYouTubeBrowseReconciler(document.body);
    reconciler.remember([
      result('video-blur', 'blur'),
      result('video-warn', 'warn'),
      result('video-hide', 'hide'),
    ]);

    expect(blur.querySelector(':scope > .judollens-youtube-overlay')).not.toBeNull();
    expect(warn.querySelector(':scope > .judollens-youtube-warning.judollens-label')).not.toBeNull();
    expect(hide.isConnected).toBe(false);
    expect(unrelated.querySelector('.judollens-youtube-overlay, .judollens-youtube-warning')).toBeNull();
    expect(short.isConnected).toBe(true);
    expect(short.querySelector('.judollens-youtube-overlay, .judollens-youtube-warning')).toBeNull();
  });

  it('reconciles a predicted video card mounted after the prediction arrives', async () => {
    const reconciler = createYouTubeBrowseReconciler(document.body);
    reconciler.start();
    reconciler.remember([result('video-later')]);
    const card = videoCard('video-later');

    document.body.append(card);
    await flush();

    expect(card.querySelector(':scope > .judollens-youtube-overlay')).not.toBeNull();
    reconciler.stop();
  });

  it('applies a repeated decision only once to the same card', () => {
    const card = videoCard('video-duplicate');
    document.body.append(card);
    const reconciler = createYouTubeBrowseReconciler(document.body);

    reconciler.remember([result('video-duplicate')]);
    reconciler.remember([result('video-duplicate')]);

    expect(card.querySelectorAll(':scope > .judollens-youtube-overlay')).toHaveLength(1);
  });

  it.each([
    'https://www.youtube.com/watch',
    'https://www.youtube.com/watch?v=',
    'https://www.youtube.com/watch?v=%20%20',
    'https://www.youtube.com/feed/subscriptions?v=video-valid',
  ])('does not match a missing or invalid watch video ID: %s', (href) => {
    const card = cardWithWatchHref(href);
    document.body.append(card);
    const reconciler = createYouTubeBrowseReconciler(document.body);

    reconciler.remember([result('video-valid')]);

    expect(card.querySelector('.judollens-youtube-overlay, .judollens-youtube-warning')).toBeNull();
    expect(card.isConnected).toBe(true);
  });

  it('continues reconciliation after a malformed card URL', () => {
    const malformed = cardWithWatchHref('http://[');
    const matching = videoCard('video-valid');
    document.body.append(malformed, matching);
    const reconciler = createYouTubeBrowseReconciler(document.body);

    reconciler.remember([result('video-valid')]);

    expect(matching.querySelector(':scope > .judollens-youtube-overlay')).not.toBeNull();
  });

  it('evicts the oldest result after one hundred video predictions', () => {
    const reconciler = createYouTubeBrowseReconciler(document.body);
    reconciler.remember(Array.from({ length: 101 }, (_, index) => result(`video-${index + 1}`)));
    const oldest = videoCard('video-1');
    const newest = videoCard('video-101');
    document.body.append(oldest, newest);

    reconciler.reconcile();

    expect(oldest.querySelector(':scope > .judollens-youtube-overlay')).toBeNull();
    expect(newest.querySelector(':scope > .judollens-youtube-overlay')).not.toBeNull();
  });
});

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
