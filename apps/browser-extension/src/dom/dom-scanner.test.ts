// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  createScanBatchRequest,
  detectPlatformFromUrl,
  scanVisibleTextCandidateRefs,
  scanVisibleTextCandidates,
} from './dom-scanner';

describe('content DOM scanner', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts visible text candidates without changing page markup', () => {
    document.body.innerHTML = `
      <main>
        <article data-post-id="a1">
          <p>bonus new member slot gacor malam ini</p>
        </article>
        <section>
          <p>jadwal praktikum kelas pagi tetap normal</p>
        </section>
      </main>
    `;
    const originalMarkup = document.body.innerHTML;

    const candidates = scanVisibleTextCandidates(document.body);

    expect(candidates.map((candidate) => candidate.text)).toEqual([
      'bonus new member slot gacor malam ini',
      'jadwal praktikum kelas pagi tetap normal',
    ]);
    expect(candidates[0]).toEqual(
      expect.objectContaining({
        id: 'scan-node-0',
        context: expect.objectContaining({
          kind: 'post',
          visible: true,
        }),
      }),
    );
    expect(candidates[0].context.selectorHint).toBe('article[data-post-id]');
    expect(document.body.innerHTML).toBe(originalMarkup);
  });

  it('skips unsafe, hidden, editable, short, and whitespace-only nodes', () => {
    document.body.innerHTML = `
      <p>valid komentar publik yang harus discan</p>
      <script>bonus slot gacor</script>
      <style>.x { color: red; }</style>
      <noscript>slot gacor</noscript>
      <template>slot gacor</template>
      <svg><text>slot gacor</text></svg>
      <canvas>slot gacor</canvas>
      <input value="slot gacor" />
      <textarea>slot gacor</textarea>
      <select><option>slot gacor</option></select>
      <button>slot gacor</button>
      <div contenteditable="true">slot gacor</div>
      <p hidden>slot gacor tersembunyi</p>
      <p style="display: none">slot gacor hidden display</p>
      <p>   </p>
      <p>ok</p>
    `;

    const candidates = scanVisibleTextCandidates(document.body, {
      minTextLength: 12,
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].text).toBe('valid komentar publik yang harus discan');
  });

  it('uses a processed node set to avoid repeated candidates', () => {
    document.body.innerHTML = `
      <div>
        <p>komentar pertama yang terlihat</p>
        <p>komentar kedua yang terlihat</p>
      </div>
    `;
    const processedNodes = new WeakSet<Node>();

    const firstScan = scanVisibleTextCandidates(document.body, {
      processedNodes,
    });
    const secondScan = scanVisibleTextCandidates(document.body, {
      processedNodes,
    });

    expect(firstScan.map((candidate) => candidate.id)).toEqual([
      'scan-node-0',
      'scan-node-1',
    ]);
    expect(secondScan).toEqual([]);
  });

  it('can return candidate refs for later overlay application without leaking DOM nodes into requests', () => {
    document.body.innerHTML = `
      <article data-post-id="a1">
        <p>bonus slot gacor malam ini</p>
      </article>
    `;

    const refs = scanVisibleTextCandidateRefs(document.body);
    const request = createScanBatchRequest(
      refs.map((ref) => ref.item),
      {
        url: 'http://localhost:5173/simulation',
        requestId: 'refs-scan',
        capturedAt: '2026-06-29T00:00:00.000Z',
      },
    );

    expect(refs).toHaveLength(1);
    expect(refs[0].textNode.textContent).toBe('bonus slot gacor malam ini');
    expect(request.items[0]).toEqual({
      id: 'scan-node-0',
      text: 'bonus slot gacor malam ini',
      context: {
        kind: 'post',
        selectorHint: 'article[data-post-id]',
        visible: true,
        languageHint: 'id',
      },
    });
    expect(request.items[0]).not.toHaveProperty('textNode');
  });
});

describe('scan batch request builder', () => {
  beforeEach(() => {
    document.body.innerHTML = '<p>bonus slot gacor malam ini</p>';
  });

  it('maps candidates into a typed prediction batch request', () => {
    const candidates = scanVisibleTextCandidates(document.body);

    const request = createScanBatchRequest(candidates, {
      url: 'https://www.youtube.com/watch?v=abc',
      pageTitle: 'Video Demo',
      capturedAt: '2026-06-29T00:00:00.000Z',
      requestId: 'scan-fixed',
      extensionVersion: '0.0.0-test',
      predictionMode: 'mock',
      threshold: 0.8,
    });

    expect(request).toEqual(
      expect.objectContaining({
        requestId: 'scan-fixed',
        source: {
          url: 'https://www.youtube.com/watch?v=abc',
          platform: 'youtube',
          pageTitle: 'Video Demo',
          capturedAt: '2026-06-29T00:00:00.000Z',
        },
        client: {
          extensionVersion: '0.0.0-test',
          predictionMode: 'mock',
          threshold: 0.8,
        },
      }),
    );
    expect(request.items).toEqual([
      {
        id: 'scan-node-0',
        text: 'bonus slot gacor malam ini',
        context: {
          kind: 'unknown',
          selectorHint: 'p',
          visible: true,
          languageHint: 'id',
        },
      },
    ]);
  });

  it('maps supported and unknown page URLs to platforms', () => {
    expect(detectPlatformFromUrl('https://www.youtube.com/watch?v=1')).toBe(
      'youtube',
    );
    expect(detectPlatformFromUrl('https://web.telegram.org/a/')).toBe(
      'telegram',
    );
    expect(detectPlatformFromUrl('https://x.com/search?q=slot')).toBe('x');
    expect(detectPlatformFromUrl('https://twitter.com/search?q=slot')).toBe(
      'x',
    );
    expect(detectPlatformFromUrl('http://localhost:5173/simulation')).toBe(
      'simulation',
    );
    expect(detectPlatformFromUrl('http://127.0.0.1:3000/demo')).toBe(
      'simulation',
    );
    expect(detectPlatformFromUrl('https://example.com/post')).toBe('unknown');
  });

  it('creates a valid empty batch request', () => {
    const request = createScanBatchRequest([], {
      url: 'https://example.com/post',
      pageTitle: 'Example',
      capturedAt: '2026-06-29T00:00:00.000Z',
      requestId: 'empty-scan',
    });

    expect(request.items).toEqual([]);
    expect(request.source.platform).toBe('unknown');
    expect(request.client.predictionMode).toBe('mock');
    expect(request.client.threshold).toBe(0.75);
  });
});
