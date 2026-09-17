import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  closeServer,
  launchExtensionContext,
  startStaticFileServer,
} from './test-utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '../../.output/chrome-mv3');
const tweetFixturePath = path.resolve(__dirname, './fixtures/x-tweet-page.html');
const tweetScreenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-015-x-tweet-overlay.png',
);

test.describe('JudolLens X tweet overlay', () => {
  test('covers one detected tweet with one full-size blur overlay', async () => {
    const { context } = await launchExtensionContext(extensionPath);
    const { server, url } = await startStaticFileServer(tweetFixturePath);

    try {
      const page = await context.newPage();
      await page.goto(url);

      const tweet = page.locator('[data-testid="tweet"]');
      const overlay = tweet.locator(':scope > .judollens-tweet-overlay');
      const label = overlay.locator('.judollens-label');

      await expect(overlay).toHaveCount(1);
      await expect(tweet).toHaveAttribute('data-judollens-tweet-blur', 'true');
      await expect(label).toHaveText('Terdeteksi JudolLens');
      await expect(label).toBeVisible();
      await expect(overlay).toHaveCSS('backdrop-filter', 'blur(3px)');

      const [tweetBox, overlayBox] = await Promise.all([
        tweet.boundingBox(),
        overlay.boundingBox(),
      ]);
      expect(tweetBox).not.toBeNull();
      expect(overlayBox).not.toBeNull();
      expect(Math.abs((overlayBox?.x ?? 0) - (tweetBox?.x ?? 0))).toBeLessThan(2);
      expect(Math.abs((overlayBox?.y ?? 0) - (tweetBox?.y ?? 0))).toBeLessThan(2);
      expect(Math.abs((overlayBox?.width ?? 0) - (tweetBox?.width ?? 0))).toBeLessThan(2);
      expect(Math.abs((overlayBox?.height ?? 0) - (tweetBox?.height ?? 0))).toBeLessThan(2);

      await page.screenshot({ path: tweetScreenshotPath, fullPage: true });
    } finally {
      await context.close();
      await closeServer(server);
    }
  });
});
