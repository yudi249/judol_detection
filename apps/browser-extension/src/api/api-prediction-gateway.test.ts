import { describe, expect, it, vi } from 'vitest';
import type { PredictionBatchRequest, PredictionBatchResponse } from '@/shared';
import { ApiError, ApiPredictionGateway } from './api-prediction-gateway';

function requestWithItems(count: number): PredictionBatchRequest {
  return {
    requestId: 'request-1',
    source: { platform: 'simulation', capturedAt: '2026-09-14T00:00:00Z' },
    client: { extensionVersion: '0.1.0', predictionMode: 'api', threshold: 0.75 },
    items: Array.from({ length: count }, (_, index) => ({
      id: String(index),
      text: `text ${index}`,
      context: { kind: 'comment', visible: true },
    })),
  };
}

function successfulResponse(request: PredictionBatchRequest): PredictionBatchResponse {
  return {
    requestId: request.requestId,
    model: { name: 'clean', version: '0.1.0', architecture: 'indobert', isMock: false },
    summary: {
      totalItems: request.items.length,
      judolCount: 0,
      unicodeSuspiciousCount: 0,
      processingTimeMs: request.items.length,
    },
    results: request.items.map((item) => ({
      id: item.id,
      label: 'judol' as const,
      confidence: 0.9,
      riskLevel: 'high' as const,
      action: 'blur' as const,
      reasons: [],
      matchedTerms: [],
      unicodeAnalysis: { hasSuspiciousUnicode: false, suspiciousCount: 0, spans: [] },
      display: { snippet: item.text, highlightRanges: [] },
    })),
    errors: [],
  };
}

type RecordedSpan = {
  name: string;
  attributes: Record<string, unknown>;
};

function createRecordingTelemetry() {
  const spans: RecordedSpan[] = [];
  return {
    spans,
    telemetry: {
      withSpan: async <T>(
        name: string,
        attributes: Record<string, unknown>,
        operation: () => Promise<T>,
      ): Promise<T> => {
        spans.push({ name, attributes });
        return operation();
      },
    },
  };
}

describe('API prediction gateway', () => {
  it('serializes 19 items as ordered four-item API requests and preserves source result order', async () => {
    const activeCalls: number[] = [];
    let maximumConcurrentCalls = 0;
    const predictBatch = vi.fn(async (request: PredictionBatchRequest) => {
      activeCalls.push(request.items.length);
      maximumConcurrentCalls = Math.max(maximumConcurrentCalls, activeCalls.length);
      await Promise.resolve();
      activeCalls.pop();
      return successfulResponse(request);
    });
    const gateway = new ApiPredictionGateway({ predictBatch });

    const response = await gateway.predictBatch(requestWithItems(19));

    expect(predictBatch).toHaveBeenCalledTimes(5);
    expect(predictBatch.mock.calls.map(([request]) => request.items.length)).toEqual([4, 4, 4, 4, 3]);
    expect(predictBatch.mock.calls.map(([request]) => request.requestId)).toEqual([
      'request-1:chunk:0',
      'request-1:chunk:1',
      'request-1:chunk:2',
      'request-1:chunk:3',
      'request-1:chunk:4',
    ]);
    expect(maximumConcurrentCalls).toBe(1);
    expect(response.results.map((result) => result.id)).toEqual(
      Array.from({ length: 19 }, (_, index) => String(index)),
    );
    expect(response.summary).toEqual({
      totalItems: 19,
      judolCount: 0,
      unicodeSuspiciousCount: 0,
      processingTimeMs: 19,
    });
  });

  it('traces serialized queue wait, chunks, and attempts without request content', async () => {
    const recording = createRecordingTelemetry();
    let now = 100;
    const predictBatch = vi.fn(async (request: PredictionBatchRequest) => {
      now += 5;
      return successfulResponse(request);
    });
    const gateway = new ApiPredictionGateway({
      predictBatch,
      telemetry: recording.telemetry,
      now: () => now,
    });

    await gateway.predictBatch(requestWithItems(9));

    expect(recording.spans.filter(({ name }) => name === 'client.gateway_queue')).toEqual([
      expect.objectContaining({ attributes: expect.objectContaining({ 'judollens.queue_wait_ms': 0 }) }),
      expect.objectContaining({ attributes: expect.objectContaining({ 'judollens.queue_wait_ms': 5 }) }),
      expect.objectContaining({ attributes: expect.objectContaining({ 'judollens.queue_wait_ms': 10 }) }),
    ]);
    expect(
      recording.spans
        .filter(({ name }) => name === 'client.api_chunk')
        .map(({ attributes }) => attributes['judollens.chunk.index']),
    ).toEqual([0, 1, 2]);
    expect(recording.spans.filter(({ name }) => name === 'client.http_attempt')).toHaveLength(3);
    expect(JSON.stringify(recording.spans)).not.toContain('text 0');
  });

  it('traces retry indexes with stable original and chunk request IDs', async () => {
    const recording = createRecordingTelemetry();
    const original = requestWithItems(1);
    const predictBatch = vi
      .fn<(...args: [PredictionBatchRequest]) => Promise<PredictionBatchResponse>>()
      .mockRejectedValueOnce(new ApiError('private failure detail', 503, 'model_unavailable'))
      .mockResolvedValueOnce(successfulResponse({ ...original, requestId: 'request-1:chunk:0' }));
    const gateway = new ApiPredictionGateway({
      predictBatch,
      sleep: vi.fn().mockResolvedValue(undefined),
      telemetry: recording.telemetry,
    });

    await gateway.predictBatch(original);

    expect(
      recording.spans
        .filter(({ name }) => name === 'client.http_attempt')
        .map(({ attributes }) => attributes),
    ).toEqual([
      expect.objectContaining({
        'judollens.request_id': 'request-1',
        'judollens.chunk_request_id': 'request-1:chunk:0',
        'judollens.retry.index': 0,
      }),
      expect.objectContaining({
        'judollens.request_id': 'request-1',
        'judollens.chunk_request_id': 'request-1:chunk:0',
        'judollens.retry.index': 1,
      }),
    ]);
    expect(JSON.stringify(recording.spans)).not.toContain('private failure detail');
  });

  it('retries only 429 and 503 with the exact injected delay schedule', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const predictBatch = vi
      .fn<(...args: [PredictionBatchRequest]) => Promise<PredictionBatchResponse>>()
      .mockRejectedValueOnce(new ApiError('busy', 429, 'inference_queue_saturated'))
      .mockRejectedValueOnce(new ApiError('unavailable', 503, 'model_unavailable'))
      .mockRejectedValueOnce(new ApiError('still unavailable', 503, 'model_unavailable'))
      .mockResolvedValueOnce(successfulResponse(requestWithItems(1)));
    const gateway = new ApiPredictionGateway({ predictBatch, sleep });

    await gateway.predictBatch(requestWithItems(1));

    expect(predictBatch).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenNthCalledWith(1, 250);
    expect(sleep).toHaveBeenNthCalledWith(2, 500);
    expect(sleep).toHaveBeenNthCalledWith(3, 1000);
  });

  it('returns per-item terminal errors without synthesizing clean predictions after a non-retryable failure', async () => {
    const sleep = vi.fn();
    const predictBatch = vi.fn().mockRejectedValue(new ApiError('invalid request', 422, 'validation_error'));
    const gateway = new ApiPredictionGateway({ predictBatch, sleep });

    const response = await gateway.predictBatch(requestWithItems(2));

    expect(predictBatch).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(response.results).toEqual([]);
    expect(response.errors).toEqual([
      { itemId: '0', code: 'api_prediction_failed', message: 'invalid request' },
      { itemId: '1', code: 'api_prediction_failed', message: 'invalid request' },
    ]);
    expect(response.summary).toEqual({
      totalItems: 2,
      judolCount: 0,
      unicodeSuspiciousCount: 0,
      processingTimeMs: 0,
    });
  });
});
