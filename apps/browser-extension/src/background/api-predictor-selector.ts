import type { PredictBatch } from '../predictor';
import type { ExtensionSettings } from '@/shared';

export function selectPredictionGateway(
  settings: ExtensionSettings,
  mockPredictBatch: PredictBatch,
  apiPredictBatch: PredictBatch,
): PredictBatch {
  return settings.predictionMode === 'api' ? apiPredictBatch : mockPredictBatch;
}
