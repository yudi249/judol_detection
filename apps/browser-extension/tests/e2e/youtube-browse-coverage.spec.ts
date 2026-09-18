import { chromium, expect, test } from '@playwright/test';
import type { Browser } from 'wxt/browser';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { closeServer } from './test-utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '../../.output/chrome-mv3');
const fixturePath = path.resolve(__dirname, './fixtures/youtube-browse-home-page.html');
const screenshotPath = path.resolve(
  __dirname,
  '../../../../docs/extension/screenshots/ext-020-youtube-browse-home.png',
);

const TLS_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDG4UfU88qoemmY
vJ1bX/DTUusQzxDlfm0DKT8TKYdWs317R7G9XnInv+GS9gglp7kn+yhr4A/4RFlL
wew8WKWzhtl/GOLAamM3+s/Iyvxi5Q8o6AJP+I6qamK78lux3Xw31HwakRhId2pE
Pd+jtyrFtV57Vh+bDOE2f5r4UQz9Htctio+OHk2HTCwiQpThD0shIAwDGU0FwkNE
j4Mop5pSVF3V/iSLGO3nMUtyS1p7AIAmA9KusNfszRD5YXUxLMJ+APgBM1y62jOc
59eVtbsnodWfE0yiiComG2V3kIKWQfTj0n5Cq0d5D49/UdUpT7ryKBA65ph8qm+R
TnxpI3KxAgMBAAECggEASaeiUkhNvFLFq+biwjYIe0NAwnNllxDY76xFa2Pcdyw3
Y0Jcnb0OOxFxydsrjkKNLLT0NeuADprFlWyHAJx2FcRx5YPCaq+b+l39uSgQC9I4
aJZwUMzFjXCkC2ZJNljISeb8ZVxqKWBsb0SZAEl0Yk924+e0Adjlyai9rIxb6pvq
kYk0vkz4IPOoRelYuBD1SHnwyGTzLBSnDS4CSPPCpEWju6ISC8d2aw0xiZwChZbO
vukzrcwWF1MEVi6LTTz6QIRO2VJeFH3oHTw2AVuXSIIRmM9nLI4Y5jw/7HjsLjwa
ozX+CTI/ysoxQcyOQY7uwvXqRZRBh1ZReGZJNtNYrwKBgQD+UbHRf6MoQHp25ZkO
KdTNdiiIAcVF656vO7jHpTOzT2v3otR6opaQDEJ/EgZLRCaAgHObBeHLv+ygHDSd
2uUL5V/4Jp24dyFxSv/hdTdaAj++WRQOrrlrWoGBXfq6jGqpbDZusTUVRUe7cSgp
8kVRoZGAVfQZuXUHGJVcUxGfBwKBgQDIMciXapFVLEjHpuN6Ll6V4/kRks4tB7GJ
9qz1xwd1dU/brbr08u4QQ3NZ6budk3mTlODEPrs1jFhMnFIdnG13tStdwsQu0OXr
9EC0TNl7EKoaEdsw+sVxaULnxKC3psb8EvHACgk3Okh+ticCorCxN5rY3cDv80+5
y2wWF2c6hwKBgDNh3BRgvl0ukc+d2cuTxgvw+IVqHipfTYNIBLBJf2WWAVFaE6Xn
XZYi8/hqct0YGtNRoInMqW8aCrvalwLhq+84W6huXOVdJGOYbJRns1Q7KhfSNYw1
3v6CnbG+hB7WqeIrG+BHa1st0S1c0mmPKlQw2Y3dT+E2qB9T5zFtEx1XAoGBAKtR
jyuk0wJkh1P0Ca9Bh0gWc8sKKs52SwSZyKH71PI7lj+UiO2eBwR79Hb5gsjyr5QQ
T9khJexJUjcdf1g/yZ4ruBTg3CqEMn6d49FoAqVCOY9dwIpF0DmhrtPQfQks/BQz
0hZZgFF22xs0nmWu/C5sO2NjQf0V5yBEaRbuqDR5AoGAeY0rASOFcmQ9IjY7VGCF
HocbushWmaa5voR9T0LY+qxemwErJ5dF4ZCfdG8D/NN9tMosGrfcI1Y1lTmoG44q
hbaF29DOQqVcTLIT3Nb6QUCtXJRtag7v0vtu5H6Y46V3DLNw7Q6b1Dvkn2dR9zHC
+8ZjRZ5nJagIEJWdZBBxszs=
-----END PRIVATE KEY-----`;

const TLS_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDFTCCAf2gAwIBAgIUMDl191dSVK7jl7pjvCBnZqL7ls8wDQYJKoZIhvcNAQEL
BQAwGjEYMBYGA1UEAwwPd3d3LnlvdXR1YmUuY29tMB4XDTI2MDkxNzA4NTE0M1oX
DTM2MDkxNDA4NTE0M1owGjEYMBYGA1UEAwwPd3d3LnlvdXR1YmUuY29tMIIBIjAN
BgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxuFH1PPKqHppmLydW1/w01LrEM8Q
5X5tAyk/EymHVrN9e0exvV5yJ7/hkvYIJae5J/soa+AP+ERZS8HsPFils4bZfxji
wGpjN/rPyMr8YuUPKOgCT/iOqmpiu/Jbsd18N9R8GpEYSHdqRD3fo7cqxbVee1Yf
mwzhNn+a+FEM/R7XLYqPjh5Nh0wsIkKU4Q9LISAMAxlNBcJDRI+DKKeaUlRd1f4k
ixjt5zFLcktaewCAJgPSrrDX7M0Q+WF1MSzCfgD4ATNcutoznOfXlbW7J6HVnxNM
oogqJhtld5CClkH049J+QqtHeQ+Pf1HVKU+68igQOuaYfKpvkU58aSNysQIDAQAB
o1MwUTAdBgNVHQ4EFgQUzqYvYrr8raRCIJz0iqUVmBEV7YIwHwYDVR0jBBgwFoAU
zqYvYrr8raRCIJz0iqUVmBEV7YIwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0B
AQsFAAOCAQEAMOLbtZMp91Rjw0ciUqmTZj0TQK6IGVe0iZJnEZ9j9exezvlYZyGS
lWBSCPSqWxT2KBS0Eoh+AD+4R2hrCZTXUS+ppO+PRHT9KtlRU5hdoMe/zw9n11DI
I1nhMltpUDDiKm0WZO4nQHhbyBoFfUK6IYf4xhVhvfeguK+dtWVEXI9ckFqIuB83
TXRRVSNVPk9CYQzmsFR52xq+2CvItBgiBgepxnPd21xiZuKBxYkOcr96lDPbDqzV
ngVbHyhs1xe7hE+X+BPCdy09cuDcfizGR12N86LXHq4QelxHuSKAFlAqFR8hAI0z
WBeRN3Z8OL2XC3eanl5mfrw2UGGHCxffig==
-----END CERTIFICATE-----`;

function browseResult(id: string, action: 'blur' | 'warn' | 'hide') {
  return {
    id,
    label: 'judol' as const,
    confidence: 0.99,
    riskLevel: 'high' as const,
    action,
    reasons: [],
    matchedTerms: ['uji'],
    unicodeAnalysis: { hasSuspiciousUnicode: false, suspiciousCount: 0, spans: [] },
    display: { snippet: 'Kartu pengujian YouTube', highlightRanges: [] },
  };
}

test.describe('JudolLens YouTube Home Browse coverage', () => {
  test('applies each delivered censor action only to matching regular Home video cards', async () => {
    const html = await readFile(fixturePath);
    const server = createServer({ key: TLS_KEY, cert: TLS_CERTIFICATE }, (_request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(html);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Unable to start static HTTPS server');
    }

    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--ignore-certificate-errors',
        '--host-resolver-rules=MAP www.youtube.com 127.0.0.1',
      ],
    });

    try {
      let worker = context.serviceWorkers()[0];
      if (!worker) {
        worker = await context.waitForEvent('serviceworker');
      }
      const page = await context.newPage();
      const youtubeUrl = `https://www.youtube.com:${address.port}/`;
      await page.goto(youtubeUrl);

      const blur = page.locator('ytd-rich-item-renderer[data-surface="blur"]');
      const warn = page.locator('ytd-rich-item-renderer[data-surface="warn"]');
      const hide = page.locator('ytd-rich-item-renderer[data-surface="hide"]');
      const unrelated = page.locator('ytd-rich-item-renderer[data-surface="unrelated"]');
      const shorts = page.locator('ytd-rich-item-renderer[data-surface="shorts"]');

      const tabFound = await worker.evaluate(
        ({ sourceUrl, results }) =>
          new Promise<boolean>((resolve) => {
            const chromeApi = (globalThis as typeof globalThis & {
              chrome: { tabs: typeof Browser.tabs };
            }).chrome;
            chromeApi.tabs.query({ url: sourceUrl }, ([tab]) => {
              if (tab?.id === undefined) {
                resolve(false);
                return;
              }
              chromeApi.tabs.sendMessage(
                tab.id,
                {
                  type: 'judollens:youtube-browse-predictions',
                  payload: {
                    requestId: 'test-youtube-browse-coverage',
                    model: {
                      name: 'mock-keyword-unicode',
                      version: '0.1.0',
                      architecture: 'rule-based',
                      isMock: true,
                    },
                    summary: {
                      totalItems: results.length,
                      judolCount: results.length,
                      unicodeSuspiciousCount: 0,
                      processingTimeMs: 1,
                    },
                    results,
                    errors: [],
                  },
                },
                () => resolve(true),
              );
            });
          }),
        {
          sourceUrl: youtubeUrl,
          results: [
            browseResult('browse-blur', 'blur'),
            browseResult('browse-warn', 'warn'),
            browseResult('browse-hide', 'hide'),
            browseResult('browse-shorts', 'blur'),
          ],
        },
      );
      expect(tabFound).toBe(true);

      await expect(blur).toHaveAttribute('data-judollens-youtube-blur', 'true');
      await expect(blur.locator(':scope > .judollens-youtube-overlay')).toHaveCount(1);
      await expect(blur.locator('.judollens-content')).toHaveCount(0);
      await expect(warn).toHaveAttribute('data-judollens-youtube-warning', 'true');
      await expect(warn.locator(':scope > .judollens-youtube-warning.judollens-label')).toHaveText(
        'Terdeteksi JudolLens',
      );
      await expect(warn.locator('.judollens-content')).toHaveCount(0);
      await expect(hide).toHaveCount(0);
      await expect(unrelated.locator('.judollens-youtube-overlay, .judollens-youtube-warning')).toHaveCount(0);
      await expect(shorts.locator('.judollens-youtube-overlay, .judollens-youtube-warning')).toHaveCount(0);

      await page.screenshot({ path: screenshotPath, fullPage: true });
    } finally {
      await context.close();
      await closeServer(server);
    }
  });
});
