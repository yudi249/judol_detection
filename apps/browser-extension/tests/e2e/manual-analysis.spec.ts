import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchExtensionContext } from './test-utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '../../.output/chrome-mv3');
const manualScreenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-012-manual-analysis-page.png',
);

test.describe('JudolLens manual analysis page', () => {
  test('analyzes pasted text, saves evidence, and shows manual logs', async () => {
    const { context, extensionId } = await launchExtensionContext(extensionPath);

    try {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/manual-analysis.html`);

      await expect(
        page.getByRole('heading', { name: 'JudolLens Manual Analysis' }),
      ).toBeVisible();

      await page
        .getByRole('textbox', { name: 'Manual analysis text' })
        .fill('b\u03bfnus sl\u03bft gacor deposit 10k');
      await page.getByRole('button', { name: 'Analyze' }).click();

      await expect(page.getByText('JUDOL', { exact: true })).toBeVisible();
      await expect(page.getByText('HIGH', { exact: true })).toBeVisible();
      await expect(page.getByText('homoglyph').first()).toBeVisible();
      await expect(page.getByText('mock-keyword-unicode 0.1.0')).toBeVisible();

      await page.screenshot({
        path: manualScreenshotPath,
        fullPage: true,
      });

      await page.getByRole('button', { name: 'Save to logs' }).click();
      await expect(page.getByText('Saved to logs')).toBeVisible();

      await page
        .getByRole('textbox', { name: 'Manual analysis text' })
        .fill('slot waktu praktikum sudah penuh');
      await page.getByRole('button', { name: 'Analyze' }).click();
      await expect(page.getByText('NON_JUDOL', { exact: true })).toBeVisible();
      await expect(page.getByText('LOW', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Save to logs' }).click();
      await expect(page.getByText('Saved to logs')).toBeVisible();

      const logsPage = await context.newPage();
      await logsPage.goto(`chrome-extension://${extensionId}/logs.html`);
      await expect(
        logsPage.getByRole('heading', { name: 'JudolLens Logs' }),
      ).toBeVisible();
      await expect(logsPage.locator('tbody tr')).toHaveCount(2);
      await expect(logsPage.getByText('NON_JUDOL')).toBeVisible();
      await expect(
        logsPage.getByRole('cell', {
          name: 'slot waktu praktikum sudah penuh',
        }),
      ).toBeVisible();

      await logsPage
        .getByRole('textbox', { name: 'Search logs' })
        .fill('praktikum');
      await expect(logsPage.locator('tbody tr')).toHaveCount(1);
      await expect(logsPage.getByText('NONE')).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
