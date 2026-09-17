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
const simulationPagePath = path.resolve(
  __dirname,
  '../../simulation/index.html',
);
const simulationScreenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-010-simulation-page.png',
);

test.describe('JudolLens simulation page', () => {
  test('drives the MVP flow on a local target page', async () => {
    const { context } = await launchExtensionContext(extensionPath);
    const { server, url } = await startStaticFileServer(simulationPagePath);

    try {
      const page = await context.newPage();

      await page.goto(url);

      await expect(
        page.getByRole('heading', { name: 'Simulasi JudolLens' }),
      ).toBeVisible();
      await expect(page.locator('.judollens-detected')).toHaveCount(4);
      await expect(page.locator('[data-case-id="clean"] .judollens-detected')).toHaveCount(0);
      await expect(page.locator('[data-case-id="false-positive"] .judollens-detected')).toHaveCount(0);
      await expect(page.locator('[data-case-id="plain-judol"] .judollens-detected')).toHaveCount(1);
      await expect(page.locator('[data-case-id="unicode-judol"] .judollens-detected')).toHaveCount(1);
      await expect(page.locator('.judollens-unicode-span')).toHaveCount(10);

      await page
        .getByRole('button', { name: 'Tambah komentar dinamis' })
        .click();

      await expect(page.locator('.judollens-detected')).toHaveCount(5);
      await expect(page.locator('[data-case-id="dynamic"] .judollens-detected')).toHaveCount(1);

      await page.screenshot({
        path: simulationScreenshotPath,
        fullPage: true,
      });
    } finally {
      await context.close();
      await closeServer(server);
    }
  });
});
