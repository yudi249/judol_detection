import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Browser } from 'wxt/browser';
import {
  closeServer,
  launchExtensionContext,
  startStaticFileServer,
} from './test-utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '../../.output/chrome-mv3');
const fixturePath = path.resolve(__dirname, './fixtures/x-tweet-page.html');
const screenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-017-x-search-timeline.png',
);

test.describe('JudolLens X SearchTimeline delivery', () => {
  test('marks only the matching X card with a compact warning badge', async () => {
    const { context } = await launchExtensionContext(extensionPath, {
      hostResolverRules: 'MAP x.com 127.0.0.1',
    });
    const { server, url } = await startStaticFileServer(fixturePath);
    const xUrl = `http://x.com:${new URL(url).port}/${path.basename(fixturePath)}`;

    try {
      const page = await context.newPage();
      await page.goto(xUrl);

      const matchingTweet = page.locator('[data-testid="tweet"]');
      await expect(
        matchingTweet.locator(':scope > .judollens-tweet-warning.judollens-label'),
      ).toHaveCount(0);

      const worker = context.serviceWorkers()[0];
      await worker.evaluate(
        ({ sourceUrl }) =>
          new Promise<void>((resolve) => {
            const chromeApi = (globalThis as typeof globalThis & {
              chrome: {
                tabs: typeof Browser.tabs;
              };
            }).chrome;
            chromeApi.tabs.query({ url: sourceUrl }, ([tab]) => {
              if (tab?.id === undefined) {
                resolve();
                return;
              }
              chromeApi.tabs.sendMessage(
                tab.id,
                {
                  type: 'judollens:x-timeline-predictions',
                  payload: {
                    requestId: 'test-x-timeline-delivery',
                    model: {
                      name: 'mock-keyword-unicode',
                      version: '0.1.0',
                      architecture: 'rule-based',
                      isMock: true,
                    },
                    summary: {
                      totalItems: 1,
                      judolCount: 1,
                      unicodeSuspiciousCount: 0,
                      processingTimeMs: 1,
                    },
                    results: [
                      {
                        id: '2099429059063341169',
                        label: 'judol',
                        confidence: 0.99,
                        riskLevel: 'medium',
                        action: 'warn',
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
                      },
                    ],
                    errors: [],
                  },
                },
                () => resolve(),
              );
            });
          }),
        { sourceUrl: xUrl },
      );

      const warning = matchingTweet.locator(
        ':scope > .judollens-tweet-warning.judollens-label',
      );
      await expect(warning).toHaveCount(1);
      await expect(warning).toHaveText('Terdeteksi JudolLens');
      await expect(matchingTweet.locator(':scope > .judollens-tweet-overlay')).toHaveCount(0);
      await expect(matchingTweet).toHaveAttribute('data-judollens-tweet-warning', 'true');
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } finally {
      await context.close();
      await closeServer(server);
    }
  });
});
