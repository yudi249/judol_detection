import { describe, expect, it, vi } from 'vitest';
import type { PredictionBatchRequest, PredictionRequest } from '@/shared';
import { createJudolLensApiClient } from './judollens-api-client';

const request: PredictionBatchRequest = {
  requestId: 'req-1',
  source: {
    url: 'https://example.test/page',
    platform: 'simulation',
    pageTitle: 'Example page',
    capturedAt: '2026-09-14T00:00:00Z',
  },
  client: {
    extensionVersion: '0.1.0',
    predictionMode: 'api',
    threshold: 0.75,
  },
  items: [
    {
      id: 'item-1',
      text: 'bοnus',
      context: {
        kind: 'comment',
        selectorHint: '.comment',
        visible: true,
        languageHint: 'id',
      },
    },
  ],
};

const singleRequest: PredictionRequest = {
  requestId: request.requestId,
  source: request.source,
  client: request.client,
  item: request.items[0]!,
};

function validPredictionResponse(batch: boolean): Response {
  const result = {
    id: 'item-1',
    label: 'aman',
    confidence: 0.9,
    risk_level: 'low',
    action: 'allow',
    reasons: [],
    matched_terms: [],
    unicode_analysis: {
      has_suspicious_unicode: false,
      suspicious_count: 0,
      spans: [],
    },
    display: { snippet: 'safe', highlight_ranges: [] },
  };
  const body = {
    request_id: 'req-1',
    model: {
      name: 'clean',
      version: '0.1.0',
      architecture: 'indobert-base-p1',
      is_mock: false,
    },
    ...(batch
      ? {
          summary: {
            total_items: 1,
            judol_count: 0,
            unicode_suspicious_count: 0,
            processing_time_ms: 1,
          },
          results: [result],
          errors: [],
        }
      : { result, errors: [] }),
  };
  return new Response(JSON.stringify(body), { status: 200 });
}

describe('JudolLens API client', () => {
  it('maps every camelCase batch request field to wire casing and maps the response back', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          request_id: 'req-1',
          model: {
            name: 'clean',
            version: '0.1.0',
            architecture: 'indobert-base-p1',
            is_mock: false,
          },
          summary: {
            total_items: 1,
            judol_count: 1,
            unicode_suspicious_count: 1,
            processing_time_ms: 3,
          },
          results: [
            {
              id: 'item-1',
              label: 'judol',
              confidence: 0.9,
              risk_level: 'high',
              action: 'blur',
              reasons: [{ type: 'model_signal', value: 'indobert', weight: 0.9 }],
              matched_terms: [],
              unicode_analysis: {
                has_suspicious_unicode: true,
                suspicious_count: 1,
                spans: [
                  {
                    start: 1,
                    end: 2,
                    char: 'ο',
                    reason: 'homoglyph',
                    normalized_as: 'o',
                    unicode_name: 'GREEK SMALL LETTER OMICRON',
                  },
                ],
              },
              display: {
                snippet: 'bοnus',
                highlight_ranges: [
                  { start: 1, end: 2, kind: 'unicode_suspicious' },
                ],
              },
            },
          ],
          errors: [{ item_id: 'item-2', code: 'invalid', message: 'bad input' }],
        }),
        { status: 200 },
      ),
    );
    const client = createJudolLensApiClient(
      'http://127.0.0.1:8000',
      fetch as typeof globalThis.fetch,
    );

    const response = await client.predictBatch(request);

    const [httpRequest] = fetch.mock.calls[0] as [Request];
    expect(JSON.parse(await httpRequest.text())).toEqual({
      request_id: 'req-1',
      source: {
        url: 'https://example.test/page',
        platform: 'simulation',
        page_title: 'Example page',
        captured_at: '2026-09-14T00:00:00Z',
      },
      client: {
        extension_version: '0.1.0',
        prediction_mode: 'api',
        threshold: 0.75,
      },
      items: [
        {
          id: 'item-1',
          text: 'bοnus',
          context: {
            kind: 'comment',
            selector_hint: '.comment',
            visible: true,
            language_hint: 'id',
          },
        },
      ],
    });
    expect(response).toEqual({
      requestId: 'req-1',
      model: {
        name: 'clean',
        version: '0.1.0',
        architecture: 'indobert-base-p1',
        isMock: false,
      },
      summary: {
        totalItems: 1,
        judolCount: 1,
        unicodeSuspiciousCount: 1,
        processingTimeMs: 3,
      },
      results: [
        {
          id: 'item-1',
          label: 'judol',
          confidence: 0.9,
          riskLevel: 'high',
          action: 'blur',
          reasons: [{ type: 'model_signal', value: 'indobert', weight: 0.9 }],
          matchedTerms: [],
          unicodeAnalysis: {
            hasSuspiciousUnicode: true,
            suspiciousCount: 1,
            spans: [
              {
                start: 1,
                end: 2,
                char: 'ο',
                reason: 'homoglyph',
                normalizedAs: 'o',
                unicodeName: 'GREEK SMALL LETTER OMICRON',
              },
            ],
          },
          display: {
            snippet: 'bοnus',
            highlightRanges: [
              { start: 1, end: 2, kind: 'unicode_suspicious' },
            ],
          },
        },
      ],
      errors: [{ itemId: 'item-2', code: 'invalid', message: 'bad input' }],
    });
  });

  it('injects traceparent and baggage into both prediction endpoints', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(validPredictionResponse(true))
      .mockResolvedValueOnce(validPredictionResponse(false));
    const injectHeaders = vi.fn((headers: Headers) => {
      headers.set('traceparent', '00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01');
      headers.set('baggage', 'judollens.run_id=benchmark-safe');
    });
    const client = createJudolLensApiClient(
      'http://127.0.0.1:8000',
      fetch as typeof globalThis.fetch,
      { injectHeaders },
    );

    await client.predictBatch(request);
    await client.predictOne(singleRequest);

    expect(injectHeaders).toHaveBeenCalledTimes(2);
    for (const [httpRequest] of fetch.mock.calls as [Request][]) {
      expect(httpRequest.headers.get('traceparent')).toBe(
        '00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01',
      );
      expect(httpRequest.headers.get('baggage')).toBe(
        'judollens.run_id=benchmark-safe',
      );
    }
  });

  it('sends no propagation or raw request fields as headers when injection is disabled', async () => {
    const fetch = vi.fn().mockResolvedValue(validPredictionResponse(true));
    const client = createJudolLensApiClient(
      'http://127.0.0.1:8000',
      fetch as typeof globalThis.fetch,
      { injectHeaders: () => undefined },
    );

    await client.predictBatch(request);

    const [httpRequest] = fetch.mock.calls[0] as [Request];
    expect(httpRequest.headers.get('traceparent')).toBeNull();
    expect(httpRequest.headers.get('baggage')).toBeNull();
    const serializedHeaders = [...httpRequest.headers.entries()]
      .flat()
      .join('\n');
    for (const privateField of [
      request.requestId,
      request.source.url,
      request.source.pageTitle,
      request.items[0]!.id,
      request.items[0]!.text,
      request.items[0]!.context.selectorHint,
    ]) {
      expect(serializedHeaders).not.toContain(privateField);
    }
  });
});
