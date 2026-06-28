import type {
  PredictionBatchRequest,
  PredictionBatchResponse,
  PredictionItem,
  PredictionModelInfo,
  PredictionResult,
} from '@/shared';
import { scorePrediction } from './scoring';
import { normalizeForPrediction } from './unicode';

export const mockModel: PredictionModelInfo = {
  name: 'mock-keyword-unicode',
  version: '0.1.0',
  architecture: 'rule-based',
  isMock: true,
};

export function predictItem(
  item: PredictionItem,
  threshold = 0.75,
): PredictionResult {
  const normalized = normalizeForPrediction(item.text);

  return scorePrediction(item.id, normalized, threshold);
}

export function predictBatch(
  request: PredictionBatchRequest,
): PredictionBatchResponse {
  const startedAt = performance.now();
  const results = request.items.map((item) =>
    predictItem(item, request.client.threshold),
  );
  const processingTimeMs = Math.max(0, Math.round(performance.now() - startedAt));

  return {
    requestId: request.requestId,
    model: mockModel,
    summary: {
      totalItems: request.items.length,
      judolCount: results.filter((result) => result.label === 'judol').length,
      unicodeSuspiciousCount: results.filter(
        (result) => result.unicodeAnalysis.hasSuspiciousUnicode,
      ).length,
      processingTimeMs,
    },
    results,
    errors: [],
  };
}
