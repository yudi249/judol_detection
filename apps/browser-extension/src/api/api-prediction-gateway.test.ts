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
