import { expect, test, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeServer, launchExtensionContext, startStaticFileServer } from './test-utils';

declare const chrome: {
  runtime: {
    sendMessage: <T>(message: Record<string, unknown>, callback: (response: T) => void) => void;
  };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '../../.output/chrome-mv3');
const overlayFixturePath = path.resolve(__dirname, './fixtures/overlay-page.html');
const screenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-018-api-mode-onnx-int8.png',
);
const artifactPath = path.resolve(
  __dirname,
  '../../../../models/serving/indobert-sampled-baseline-v0.1.0-onnx',
);
const repositoryPath = path.resolve(__dirname, '../../../..');
const MESSAGE_TYPES = {
  getExtensionState: 'judollens:get-extension-state',
  updateSettings: 'judollens:update-settings',
  clearDetectionLogs: 'judollens:clear-detection-logs',
} as const;

const apiSettings = {
  schemaVersion: 1,
  predictionMode: 'api',
  apiEndpoint: '',
  threshold: 0.33,
  censorMode: 'blur',
  autoBlur: true,
  highlightUnicode: true,
  platformScope: { youtube: true, telegram: true, x: true, simulation: true, otherSites: false },
  maxLogs: 200,
  storeBoundedEvidence: true,
  storeSourceUrl: false,
};

test.describe('JudolLens ONNX INT8 API mode', () => {
  test.setTimeout(180_000);
  test('uses the real loopback server for a content overlay and persisted model evidence', async () => {
    const api = await startOnnxApi();
    const { context, extensionId } = await launchExtensionContext(extensionPath);
    const fixture = await startStaticFileServer(overlayFixturePath);

    try {
      const optionsPage = await context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      await sendExtensionMessage(optionsPage, {
        type: MESSAGE_TYPES.updateSettings,
        payload: { ...apiSettings, apiEndpoint: api.endpoint },
      });
      await sendExtensionMessage(optionsPage, { type: MESSAGE_TYPES.clearDetectionLogs });

      const page = await context.newPage();
      await page.goto(fixture.url);

      await expect(page.locator('.judollens-detected')).toHaveCount(2, { timeout: 30_000 });
      const logs = await getDetectionLogs(optionsPage);
      expect(logs).toHaveLength(2);
      expect(logs[0]?.model).toEqual({
        name: 'judollens-indobert-sampled-baseline',
        version: '0.1.0',
        architecture: 'indobert-base-p1',
        isMock: false,
      });
      const state = await getExtensionState(optionsPage);
      expect(state.payload.stats.lastScanTimeMs).toBeGreaterThan(0);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } finally {
      await context.close();
      await stopProcess(api.process);
    }
  });
});

type LocalApi = {
  endpoint: string;
  process: ChildProcess;
};

async function startOnnxApi(): Promise<LocalApi> {
  const port = await reservePort();
  const endpoint = `http://127.0.0.1:${port}`;
  const process = spawn(
    path.resolve(repositoryPath, '.venv', 'Scripts', 'uvicorn.exe'),
    ['apps.api.app.main:app', '--host', '127.0.0.1', '--port', String(port)],
    {
      cwd: repositoryPath,
      env: {
        ...globalThis.process.env,
        JUDOLLENS_MODEL_ARTIFACT: artifactPath,
        JUDOLLENS_INFERENCE_RUNTIME: 'onnx-int8',
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  );
  let stderr = '';
  process.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(`ONNX API exited during startup: ${stderr}`);
    }
    try {
      const response = await fetch(`${endpoint}/health`);
      if (response.ok) {
        return { endpoint, process };
      }
    } catch {
      // The process has not bound the loopback port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await stopProcess(process);
  throw new Error(`ONNX API did not become ready: ${stderr}`);
}

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to reserve a loopback port for the ONNX API');
  }
  server.close();
  await once(server, 'close');
  return address.port;
}

async function stopProcess(process: ChildProcess): Promise<void> {
  if (process.exitCode !== null || process.pid === undefined) {
    return;
  }
  const taskkill = spawn('taskkill', ['/pid', String(process.pid), '/T', '/F'], {
    stdio: 'ignore',
  });
  await once(taskkill, 'exit');
}

type DetectionLog = {
  model: { name: string; version: string; architecture: string; isMock: boolean };
};

async function getExtensionState(page: Page): Promise<{ payload: { stats: { lastScanTimeMs?: number } } }> {
  return sendExtensionMessage(page, { type: MESSAGE_TYPES.getExtensionState });
}

async function getDetectionLogs(page: Page): Promise<DetectionLog[]> {
  const state = await sendExtensionMessage<{ payload: { recentLogs: DetectionLog[] } }>(page, {
    type: MESSAGE_TYPES.getExtensionState,
  });
  return state.payload.recentLogs;
}

async function sendExtensionMessage<T>(page: Page, message: Record<string, unknown>): Promise<T> {
  return page.evaluate(
    (runtimeMessage) => new Promise<T>((resolve) => chrome.runtime.sendMessage(runtimeMessage, resolve)),
    message,
  );
}
