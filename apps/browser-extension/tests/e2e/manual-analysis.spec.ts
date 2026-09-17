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
        page.getByRole('heading', { name: 'Analisis Manual JudolLens' }),
      ).toBeVisible();

      await page
        .getByRole('textbox', { name: 'Teks analisis manual' })
        .fill('b\u03bfnus sl\u03bft gacor deposit 10k');
      await page.getByRole('button', { name: 'Analisis' }).click();

      await expect(page.getByText('JUDOL', { exact: true })).toBeVisible();
      await expect(page.getByText('TINGGI', { exact: true })).toBeVisible();
      await expect(page.getByText('homoglyph').first()).toBeVisible();
      await expect(page.getByText('mock-keyword-unicode 0.1.0')).toBeVisible();

      await page.screenshot({
        path: manualScreenshotPath,
        fullPage: true,
      });

      await page.getByRole('button', { name: 'Simpan ke log' }).click();
      await expect(page.getByText('Disimpan ke log')).toBeVisible();

      await page
        .getByRole('textbox', { name: 'Teks analisis manual' })
        .fill('slot waktu praktikum sudah penuh');
      await page.getByRole('button', { name: 'Analisis' }).click();
      await expect(page.getByText('BUKAN JUDOL', { exact: true })).toBeVisible();
      await expect(page.getByText('RENDAH', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Simpan ke log' }).click();
      await expect(page.getByText('Disimpan ke log')).toBeVisible();

      const logsPage = await context.newPage();
      await logsPage.goto(`chrome-extension://${extensionId}/logs.html`);
      await expect(
        logsPage.getByRole('heading', { name: 'Log JudolLens' }),
      ).toBeVisible();
      await expect(logsPage.locator('tbody tr')).toHaveCount(2);
      await expect(logsPage.getByText('BUKAN JUDOL')).toBeVisible();
      await expect(
        logsPage.getByRole('cell', {
          name: 'slot waktu praktikum sudah penuh',
        }),
      ).toBeVisible();

      await logsPage
        .getByRole('textbox', { name: 'Cari log' })
        .fill('praktikum');
      await expect(logsPage.locator('tbody tr')).toHaveCount(1);
      await expect(logsPage.getByText('Tidak ada')).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
