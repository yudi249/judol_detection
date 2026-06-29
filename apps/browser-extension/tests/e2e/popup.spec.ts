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
const popupScreenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-005-popup-control-center.png',
);
const overlayScreenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-008-on-page-overlay.png',
);
const dynamicOverlayScreenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-009-dynamic-overlay.png',
);

test.describe('JudolLens popup extension', () => {
  test('renders the storage-backed popup and persists the protection toggle', async () => {
    const { context, extensionId } = await launchExtensionContext(extensionPath);

    try {
      const page = await context.newPage();

      await page.goto(`chrome-extension://${extensionId}/popup.html`);

      await expect(page.getByRole('heading', { name: 'JudolLens' })).toBeVisible();
      await expect(page.getByText('Storage-backed MVP')).toBeVisible();
      await expect(page.getByText('Session Evidence')).toBeVisible();
      await expect(page.getByText('Belum ada deteksi')).toBeVisible();
      const logsButton = page.getByRole('button', { name: 'Logs' });
      const optionsButton = page.getByRole('button', { name: 'Options' });
      const analyzeButton = page.getByRole('button', { name: 'Analyze' });
      await expect(logsButton).toBeEnabled();
      await expect(optionsButton).toBeEnabled();
      await expect(analyzeButton).toBeEnabled();

      const logsPagePromise = context.waitForEvent('page');
      await logsButton.click();
      const logsPage = await logsPagePromise;
      await expect(logsPage).toHaveURL(/logs\.html$/);
      await logsPage.close();

      const optionsPagePromise = context.waitForEvent('page');
      await optionsButton.click();
      const optionsPage = await optionsPagePromise;
      await expect(optionsPage).toHaveURL(/options\.html$/);
      await optionsPage.close();

      const analyzePagePromise = context.waitForEvent('page');
      await analyzeButton.click();
      const analyzePage = await analyzePagePromise;
      await expect(analyzePage).toHaveURL(/manual-analysis\.html$/);
      await analyzePage.close();

      const protection = page.getByRole('switch', { name: 'Proteksi halaman' });
      await expect(protection).toHaveAttribute('aria-checked', 'true');

      await protection.click();
      await expect(protection).toHaveAttribute('aria-checked', 'false');

      await protection.click();
      await expect(protection).toHaveAttribute('aria-checked', 'true');

      await page.screenshot({
        path: popupScreenshotPath,
        fullPage: true,
      });
    } finally {
      await context.close();
    }
  });

  test('applies on-page overlay to detected fixture content', async () => {
    const { context } = await launchExtensionContext(extensionPath);
    const { server, url } = await startStaticFileServer(overlayFixturePath);

    try {
      const page = await context.newPage();

      await page.goto(url);

      await expect(page.locator('.judollens-detected')).toHaveCount(2);
      await expect(page.locator('.judollens-label').first()).toHaveText(
        'Terdeteksi JudolLens',
      );
      await expect(page.locator('.judollens-unicode-span')).toHaveCount(4);
      await expect(page.getByText('Besok kita bahas tugas kuliah')).toBeVisible();

      await page.screenshot({
        path: overlayScreenshotPath,
        fullPage: true,
      });
    } finally {
      await context.close();
      await closeServer(server);
    }
  });

  test('applies overlay to dynamically inserted fixture content', async () => {
    const { context } = await launchExtensionContext(extensionPath);
    const { server, url } = await startStaticFileServer(overlayFixturePath);

    try {
      const page = await context.newPage();

      await page.goto(url);

      await expect(page.locator('.judollens-detected')).toHaveCount(2);

      await page
        .getByRole('button', { name: 'Tambah komentar dinamis' })
        .click();

      await expect(page.locator('.judollens-detected')).toHaveCount(3);
      await expect(
        page.locator('.author', { hasText: 'Komentar Dinamis' }),
      ).toBeVisible();
      await expect(
        page.locator('.judollens-detected').filter({
          hasText: 'bonus new member slot gacor dinamis',
        }),
      ).toHaveCount(1);

      await page.screenshot({
        path: dynamicOverlayScreenshotPath,
        fullPage: true,
      });
    } finally {
      await context.close();
      await closeServer(server);
    }
  });
});
