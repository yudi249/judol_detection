// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';

import { createXTimelineReconciler } from './x-timeline-reconciler';

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

type TweetSurface = 'home' | 'profile' | 'detail' | 'reply';

function tweet(id: string, surface: TweetSurface): HTMLElement {
  const article = document.createElement('article');
  article.dataset.testid = 'tweet';
  article.dataset.surface = surface;
  const link = document.createElement('a');
  link.href = `https://x.com/vciffie/status/${id}`;
  article.append(link);
  return article;
}

function tweetWithoutNumericStatus(surface: TweetSurface): HTMLElement {
  const article = document.createElement('article');
  article.dataset.testid = 'tweet';
  article.dataset.surface = surface;
  const link = document.createElement('a');
  link.href = 'https://x.com/vciffie/status/not-a-status-id';
  article.append(link);
  return article;
}
function tweetWithoutStatus(surface: TweetSurface): HTMLElement {
  const article = document.createElement('article');
  article.dataset.testid = 'tweet';
  article.dataset.surface = surface;
  return article;
}

describe('X timeline reconciler', () => {
  beforeEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  it('applies each prediction only to its status-matched card across X surfaces', () => {
    const home = tweet('1001', 'home');
    const profile = tweet('1002', 'profile');
    const detail = tweet('1003', 'detail');
    const reply = tweet('1004', 'reply');
    const nonmatching = tweet('1005', 'home');
    const missingStatus = tweetWithoutNumericStatus('reply');
    const withoutStatus = tweetWithoutStatus('detail');
    document.body.append(home, profile, detail, reply, nonmatching, missingStatus, withoutStatus);
    const reconciler = createXTimelineReconciler(document.body);

    reconciler.remember([
      result('1001', 'blur'),
      result('1002', 'warn'),
      result('1003', 'hide'),
      result('1004', 'blur'),
    ]);

    expect(home.querySelector(':scope > .judollens-tweet-overlay')).not.toBeNull();
    expect(profile.querySelector(':scope > .judollens-tweet-warning.judollens-label')).not.toBeNull();
    expect(detail.isConnected).toBe(false);
    expect(reply.querySelector(':scope > .judollens-tweet-overlay')).not.toBeNull();
    expect(nonmatching.querySelector('.judollens-tweet-overlay, .judollens-tweet-warning')).toBeNull();
    expect(nonmatching.isConnected).toBe(true);
    expect(missingStatus.querySelector('.judollens-tweet-overlay, .judollens-tweet-warning')).toBeNull();
    expect(missingStatus.isConnected).toBe(true);
    expect(withoutStatus.querySelector('.judollens-tweet-overlay, .judollens-tweet-warning')).toBeNull();
    expect(withoutStatus.isConnected).toBe(true);
  });

  it('blurs only the tweet card whose status ID matches a timeline prediction', () => {
    const matching = tweet('2099429059063341169', 'home');
    const other = tweet('1002', 'home');
    document.body.append(matching, other);
    const reconciler = createXTimelineReconciler(document.body);

    reconciler.remember([result('2099429059063341169')]);

    expect(matching.querySelector(':scope > .judollens-tweet-overlay')).not.toBeNull();
    expect(other.querySelector(':scope > .judollens-tweet-overlay')).toBeNull();
  });

  it('removes a matching tweet card when its prediction action is hide', () => {
    const matching = tweet('2099429059063341169', 'home');
    const other = tweet('1002', 'home');
    document.body.append(matching, other);
    const reconciler = createXTimelineReconciler(document.body);

    reconciler.remember([result('2099429059063341169', 'hide')]);

    expect(matching.isConnected).toBe(false);
    expect(other.isConnected).toBe(true);
  });

  it('marks only the matching tweet with a compact warning badge', () => {
    const matching = tweet('2099429059063341169', 'home');
    matching.append(document.createTextNode('bonus slot gacor'));
    const other = tweet('1002', 'home');
    document.body.append(matching, other);
    const reconciler = createXTimelineReconciler(document.body);

    reconciler.remember([result('2099429059063341169', 'warn')]);

    const warning = matching.querySelector(
      ':scope > .judollens-tweet-warning.judollens-label',
    );
    expect(warning?.textContent).toBe('Terdeteksi JudolLens');
    expect(warning?.children).toHaveLength(0);
    expect(matching.getAttribute('data-judollens-tweet-warning')).toBe('true');
    expect(matching.textContent).toContain('bonus slot gacor');
    expect(other.querySelector('.judollens-tweet-warning')).toBeNull();
  });

  it('reconciles a predicted tweet that X mounts after the prediction arrives', async () => {
    const reconciler = createXTimelineReconciler(document.body);
    reconciler.start();
    reconciler.remember([result('2099429059063341169')]);
    const matching = tweet('2099429059063341169', 'home');

    document.body.append(matching);
    await flush();

    expect(matching.querySelector(':scope > .judollens-tweet-overlay')).not.toBeNull();
    reconciler.stop();
  });

  it('evicts the oldest result after one hundred timeline predictions', () => {
    const reconciler = createXTimelineReconciler(document.body);
    reconciler.remember(Array.from({ length: 101 }, (_, index) => result(String(index + 1))));
    const oldest = tweet('1', 'home');
    const newest = tweet('101', 'home');
    document.body.append(oldest, newest);

    reconciler.reconcile();

    expect(oldest.querySelector(':scope > .judollens-tweet-overlay')).toBeNull();
    expect(newest.querySelector(':scope > .judollens-tweet-overlay')).not.toBeNull();
  });
});

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
