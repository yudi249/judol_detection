import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  closeServer,
  launchExtensionContext,
  startStaticFileServer,
} from './test-utils';

declare const chrome: {
  runtime: {
    sendMessage: (
      message: Record<string, unknown>,
      callback: (response: unknown) => void,
    ) => void;
  };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '../../.output/chrome-mv3');
const simulationPagePath = path.resolve(
  __dirname,
  '../../simulation/index.html',
);
const screenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-014-options-live-settings.png',
);

const MESSAGE_TYPES = {
  getExtensionState: 'judollens:get-extension-state',
  updateSettings: 'judollens:update-settings',
  clearDetectionLogs: 'judollens:clear-detection-logs',
} as const;

const defaultSettings = {
  schemaVersion: 1,
  predictionMode: 'mock',
  apiEndpoint: 'http://localhost:8000',
  threshold: 0.75,
  censorMode: 'blur',
  autoBlur: true,
  highlightUnicode: true,
  platformScope: {
    youtube: true,
    telegram: true,
    x: true,
    simulation: true,
    otherSites: false,
  },
  maxLogs: 200,
  storeBoundedEvidence: true,
  storeSourceUrl: false,
};

test.describe('JudolLens options live settings', () => {
  test('applies options settings to simulation scanning, overlays, and logs', async () => {
    const { context, extensionId } = await launchExtensionContext(extensionPath);
    const { server, url } = await startStaticFileServer(simulationPagePath);

    try {
      const optionsPage = await context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      await expect(
        optionsPage.getByRole('heading', { name: 'JudolLens Options' }),
      ).toBeVisible();

      await resetExtensionState(optionsPage);
      await patchSettings(optionsPage, {
        platformScope: {
          ...defaultSettings.platformScope,
          simulation: false,
        },
      });
      const disabledSimulation = await context.newPage();
      await disabledSimulation.goto(url);
      await disabledSimulation.waitForTimeout(900);
      await expect(disabledSimulation.locator('.judollens-detected')).toHaveCount(0);
      await expect(await getLogCount(optionsPage)).toBe(0);
      await disabledSimulation.close();

      await resetExtensionState(optionsPage);
      await patchSettings(optionsPage, { threshold: 0.1 });
      const thresholdSimulation = await context.newPage();
      await thresholdSimulation.goto(url);
      await expect
        .poll(() => hasLogSnippet(optionsPage, 'Slot waktu praktikum'))
        .toBe(true);
      await thresholdSimulation.close();

      await resetExtensionState(optionsPage);
      await patchSettings(optionsPage, { highlightUnicode: false });
      const noUnicodeHighlight = await context.newPage();
      await noUnicodeHighlight.goto(url);
      await expect(noUnicodeHighlight.locator('.judollens-detected')).toHaveCount(4);
      await expect(
        noUnicodeHighlight.locator('[data-case-id="unicode-judol"] .judollens-unicode-span'),
      ).toHaveCount(0);
      await noUnicodeHighlight.close();

      await resetExtensionState(optionsPage);
      await patchSettings(optionsPage, { censorMode: 'warn' });
      const warnSimulation = await context.newPage();
      await warnSimulation.goto(url);
      await expect(warnSimulation.locator('.judollens-warning')).toHaveCount(4);
      await expect(warnSimulation.locator('.judollens-blur')).toHaveCount(0);
      await warnSimulation.screenshot({ path: screenshotPath, fullPage: true });
      await warnSimulation.close();

      await resetExtensionState(optionsPage);
      await patchSettings(optionsPage, { maxLogs: 2 });
      const maxLogsSimulation = await context.newPage();
      await maxLogsSimulation.goto(url);
      await expect.poll(() => getLogCount(optionsPage)).toBe(2);
      await maxLogsSimulation.close();

      await resetExtensionState(optionsPage);
      const sourceUrlOff = await context.newPage();
      await sourceUrlOff.goto(url);
      await expect.poll(() => getLogCount(optionsPage)).toBe(4);
      await expect(await everyLogHasSourceUrl(optionsPage)).toBe(false);
      await sourceUrlOff.close();

      await resetExtensionState(optionsPage);
      await patchSettings(optionsPage, { storeSourceUrl: true });
      const sourceUrlOn = await context.newPage();
      await sourceUrlOn.goto(url);
      await expect.poll(() => everyLogHasSourceUrl(optionsPage)).toBe(true);
      await sourceUrlOn.close();

      await resetExtensionState(optionsPage);
      await patchSettings(optionsPage, { storeBoundedEvidence: false });
      const noEvidenceLogs = await context.newPage();
      await noEvidenceLogs.goto(url);
      await expect(noEvidenceLogs.locator('.judollens-detected')).toHaveCount(4);
      await expect.poll(() => getScannedCount(optionsPage)).toBeGreaterThan(0);
      await expect(await getLogCount(optionsPage)).toBe(0);
      await noEvidenceLogs.close();

      await resetExtensionState(optionsPage);
    } finally {
      await context.close();
      await closeServer(server);
    }
  });
});

async function resetExtensionState(page: Page): Promise<void> {
  await patchSettings(page, defaultSettings);
  await sendExtensionMessage(page, { type: MESSAGE_TYPES.clearDetectionLogs });
}

async function patchSettings(
  page: Page,
  payload: Record<string, unknown>,
): Promise<void> {
  await sendExtensionMessage(page, {
    type: MESSAGE_TYPES.updateSettings,
    payload,
  });
}

async function getLogCount(page: Page): Promise<number> {
  const state = await getExtensionState(page);
  return state.payload.recentLogs.length;
}

async function getScannedCount(page: Page): Promise<number> {
  const state = await getExtensionState(page);
  return state.payload.stats.scannedCount;
}

async function hasLogSnippet(page: Page, snippet: string): Promise<boolean> {
  const state = await getExtensionState(page);
  return state.payload.recentLogs.some((log: { snippet: string }) =>
    log.snippet.includes(snippet),
  );
}

async function everyLogHasSourceUrl(page: Page): Promise<boolean> {
  const state = await getExtensionState(page);
  return (
    state.payload.recentLogs.length > 0 &&
    state.payload.recentLogs.every((log: { sourceUrl?: string }) =>
      Boolean(log.sourceUrl),
    )
  );
}

async function getExtensionState(page: Page): Promise<{
  payload: {
    stats: { scannedCount: number };
    recentLogs: Array<{ snippet: string; sourceUrl?: string }>;
  };
}> {
  return sendExtensionMessage(page, { type: MESSAGE_TYPES.getExtensionState });
}

async function sendExtensionMessage<T>(
  page: Page,
  message: Record<string, unknown>,
): Promise<T> {
  return page.evaluate(
    (runtimeMessage) =>
      new Promise<T>((resolve) => {
        chrome.runtime.sendMessage(runtimeMessage, (response) => {
          resolve(response as T);
        });
      }),
    message,
  );
}
