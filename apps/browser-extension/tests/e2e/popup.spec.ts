import { expect, test, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '../../.output/chrome-mv3');
const popupScreenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-005-popup-control-center.png',
);

async function launchExtensionContext(): Promise<{
  context: BrowserContext;
  extensionId: string;
}> {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }

  return {
    context,
    extensionId: new URL(serviceWorker.url()).host,
  };
}

test.describe('JudolLens popup extension', () => {
  test('renders the storage-backed popup and persists the protection toggle', async () => {
    const { context, extensionId } = await launchExtensionContext();

    try {
      const page = await context.newPage();

      await page.goto(`chrome-extension://${extensionId}/popup.html`);

      await expect(page.getByRole('heading', { name: 'JudolLens' })).toBeVisible();
      await expect(page.getByText('Storage-backed MVP')).toBeVisible();
      await expect(page.getByText('Session Evidence')).toBeVisible();
      await expect(page.getByText('Belum ada deteksi')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Logs' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Options' })).toBeDisabled();

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
});
