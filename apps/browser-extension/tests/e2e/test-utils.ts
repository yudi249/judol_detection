import { chromium, type BrowserContext } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type LaunchExtensionContextOptions = {
  hostResolverRules?: string;
};

export async function launchExtensionContext(
  extensionPath: string,
  options: LaunchExtensionContextOptions = {},
): Promise<{
  context: BrowserContext;
  extensionId: string;
}> {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      ...(options.hostResolverRules
        ? [`--host-resolver-rules=${options.hostResolverRules}`]
        : []),
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

export async function startStaticFileServer(filePath: string): Promise<{
  server: Server;
  url: string;
}> {
  const html = await readFile(filePath);
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(html);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to start static file server');
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}/${path.basename(filePath)}`,
  };
}

export async function closeServer(server: Server): Promise<void> {
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
