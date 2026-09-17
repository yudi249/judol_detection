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
const optionsScreenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-011-options-page.png',
);
const logsScreenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-011-log-review-page.png',
);

test.describe('JudolLens options and logs pages', () => {
  test('persists options settings through the background coordinator', async () => {
    const { context, extensionId } = await launchExtensionContext(extensionPath);

    try {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options.html`);

      await expect(
        page.getByRole('heading', { name: 'Pengaturan JudolLens' }),
      ).toBeVisible();

      const unicodeSwitch = page.getByRole('switch', {
        name: 'Sorot Unicode',
      });
      await expect(unicodeSwitch).toHaveAttribute('aria-checked', 'true');
      await unicodeSwitch.click();
      await expect(unicodeSwitch).toHaveAttribute('aria-checked', 'false');

      const thresholdInput = page.getByRole('spinbutton', {
        name: 'Persentase ambang',
      });
      await thresholdInput.fill('76');
      await expect(page.getByText(/Ambang 76%/)).toBeVisible();

      await page.reload();
      await expect(
        page.getByRole('heading', { name: 'Pengaturan JudolLens' }),
      ).toBeVisible();
      await expect(
        page.getByRole('switch', { name: 'Sorot Unicode' }),
      ).toHaveAttribute('aria-checked', 'false');
      await expect(page.getByText(/Ambang 76%/)).toBeVisible();
      await expect(
        page.getByRole('spinbutton', { name: 'Persentase ambang' }),
      ).toHaveValue('76');

      await page.screenshot({
        path: optionsScreenshotPath,
        fullPage: true,
      });
    } finally {
      await context.close();
    }
  });

  test('reviews, filters, and clears detection logs', async () => {
    const { context, extensionId } = await launchExtensionContext(extensionPath);
    const { server, url } = await startStaticFileServer(simulationPagePath);

    try {
      const targetPage = await context.newPage();
      await targetPage.goto(url);
      await expect(targetPage.locator('.judollens-detected')).toHaveCount(4);
      await targetPage
        .getByRole('button', { name: 'Tambah komentar dinamis' })
        .click();
      await expect(targetPage.locator('.judollens-detected')).toHaveCount(5);

      const logsPage = await context.newPage();
      await logsPage.goto(`chrome-extension://${extensionId}/logs.html`);

      await expect(
        logsPage.getByRole('heading', { name: 'Log JudolLens' }),
      ).toBeVisible();
      await expect(logsPage.getByText('Total log')).toBeVisible();
      await expect(logsPage.locator('tbody tr')).toHaveCount(5);
      await expect(logsPage.getByText('Panel detail')).toBeVisible();
      await expect(logsPage.getByText(/0\.1\.0/).first()).toBeVisible();

      await logsPage.screenshot({
        path: logsScreenshotPath,
        fullPage: true,
      });

      await logsPage.getByRole('textbox', { name: 'Cari log' }).fill('dinamis');
      await expect(logsPage.locator('tbody tr')).toHaveCount(1);

      await logsPage.getByRole('button', { name: 'Hapus log' }).click();
      await expect(logsPage.locator('tbody tr')).toHaveCount(0);
      await expect(
        logsPage.getByText('Tidak ada log deteksi yang cocok dengan filter saat ini'),
      ).toBeVisible();

      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/popup.html`);
      await expect(popup.getByText('Belum ada deteksi')).toBeVisible();
    } finally {
      await context.close();
      await closeServer(server);
    }
  });
});
