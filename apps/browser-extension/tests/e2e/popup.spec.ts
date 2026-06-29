import { expect, test, chromium, type BrowserContext } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function startOverlayFixtureServer(): Promise<{
  server: Server;
  url: string;
}> {
  const html = await readFile(overlayFixturePath);
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(html);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to start overlay fixture server');
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}/overlay-page.html`,
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

  test('applies on-page overlay to detected fixture content', async () => {
    const { context } = await launchExtensionContext();
    const { server, url } = await startOverlayFixtureServer();

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
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  });

  test('applies overlay to dynamically inserted fixture content', async () => {
    const { context } = await launchExtensionContext();
    const { server, url } = await startOverlayFixtureServer();

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
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  });
});
