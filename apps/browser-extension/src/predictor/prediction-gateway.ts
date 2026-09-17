import type { PredictionBatchRequest, PredictionBatchResponse } from '@/shared';
import { predictBatch } from './mock-predictor';

export type PredictBatch = (
  request: PredictionBatchRequest,
) => Promise<PredictionBatchResponse>;

export const predictBatchWithMock: PredictBatch = async (request) =>
  predictBatch(request);
