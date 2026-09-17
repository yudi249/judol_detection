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
const fixturePath = path.resolve(__dirname, './fixtures/x-timeline-coverage-page.html');
const screenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-019-x-timeline-coverage.png',
);

const timelineResult = (
  id: string,
  action: 'blur' | 'warn' | 'hide',
  snippet: string,
) => ({
  id,
  label: 'judol' as const,
  confidence: 0.99,
  riskLevel: 'high' as const,
  action,
  reasons: [],
  matchedTerms: ['test'],
  unicodeAnalysis: {
    hasSuspiciousUnicode: false,
    suspiciousCount: 0,
    spans: [],
  },
  display: {
    snippet,
    highlightRanges: [],
  },
});

test.describe('JudolLens X timeline coverage', () => {
  test('applies each delivered censor action only to its matching X surface card', async () => {
    const { context } = await launchExtensionContext(extensionPath, {
      hostResolverRules: 'MAP x.com 127.0.0.1',
    });
    const { server, url } = await startStaticFileServer(fixturePath);
    const xUrl = `http://x.com:${new URL(url).port}/${path.basename(fixturePath)}`;

    try {
      const page = await context.newPage();
      await page.goto(xUrl);

      const home = page.locator('[data-testid="tweet"]', { has: page.locator('[data-surface="home"]') });
      const profile = page.locator('[data-testid="tweet"]', {
        has: page.locator('[data-surface="profile"]'),
      });
      const detail = page.locator('[data-testid="tweet"]', {
        has: page.locator('[data-surface="detail"]'),
      });
      const reply = page.locator('[data-testid="tweet"]', { has: page.locator('[data-surface="reply"]') });
      const unrelated = page.locator('[data-testid="tweet"]', {
        has: page.locator('[data-surface="unrelated"]'),
      });

      const worker = context.serviceWorkers()[0];
      await worker.evaluate(
        ({ sourceUrl, results }) =>
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
                    requestId: 'test-x-timeline-coverage',
                    model: {
                      name: 'mock-keyword-unicode',
                      version: '0.1.0',
                      architecture: 'rule-based',
                      isMock: true,
                    },
                    summary: {
                      totalItems: results.length,
                      judolCount: results.length,
                      unicodeSuspiciousCount: 0,
                      processingTimeMs: 1,
                    },
                    results,
                    errors: [],
                  },
                },
                () => resolve(),
              );
            });
          }),
        {
          sourceUrl: xUrl,
          results: [
            timelineResult('2099429059063341101', 'blur', 'Test-only home timeline card'),
            timelineResult('2099429059063341102', 'warn', 'Test-only profile timeline card'),
            timelineResult('2099429059063341103', 'hide', 'Test-only detail timeline card'),
            timelineResult('2099429059063341104', 'blur', 'Test-only reply timeline card'),
            timelineResult('2099429059063341199', 'warn', 'Test-only nonmatching timeline card'),
          ],
        },
      );

      await expect(home.locator(':scope > .judollens-tweet-overlay')).toHaveCount(1);
      await expect(profile.locator(':scope > .judollens-tweet-warning.judollens-label')).toHaveText(
        'Terdeteksi JudolLens',
      );
      await expect(detail).toHaveCount(0);
      await expect(reply.locator(':scope > .judollens-tweet-overlay')).toHaveCount(1);
      await expect(
        unrelated.locator('.judollens-tweet-overlay, .judollens-tweet-warning'),
      ).toHaveCount(0);

      await page.screenshot({ path: screenshotPath, fullPage: true });
    } finally {
      await context.close();
      await closeServer(server);
    }
  });
});
