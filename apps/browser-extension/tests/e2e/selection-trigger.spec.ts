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
const overlayFixturePath = path.resolve(
  __dirname,
  './fixtures/overlay-page.html',
);
const selectionScreenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-013-selection-floating-trigger.png',
);

test.describe('JudolLens selection floating trigger', () => {
  test('shows analyze button after text selection and opens manual analysis', async () => {
    const { context } = await launchExtensionContext(extensionPath);
    const { server, url } = await startStaticFileServer(overlayFixturePath);

    try {
      const page = await context.newPage();
      await page.goto(url);
      await expect(page.locator('.judollens-detected')).toHaveCount(2);

      await page.evaluate(() => {
        const paragraph = document.querySelector(
          'article[data-post-id="clean"] p',
        );
        if (!paragraph?.firstChild) {
          throw new Error('Clean paragraph not found');
        }

        const range = document.createRange();
        range.selectNodeContents(paragraph.firstChild);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      });

      const analyzeButton = page.getByRole('button', {
        name: 'Analyze with JudolLens',
      });
      await expect(analyzeButton).toBeVisible();
      await page.screenshot({
        path: selectionScreenshotPath,
        fullPage: true,
      });

      const manualPagePromise = context.waitForEvent('page');
      await analyzeButton.click();
      const manualPage = await manualPagePromise;

      await expect(manualPage).toHaveURL(/manual-analysis\.html$/);
      await expect(
        manualPage.getByRole('textbox', { name: 'Manual analysis text' }),
      ).toHaveValue('Besok kita bahas tugas kuliah jam 9 ya.');
    } finally {
      await context.close();
      await closeServer(server);
    }
  });
});
