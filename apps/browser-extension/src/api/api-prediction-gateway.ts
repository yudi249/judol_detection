import type {
  PredictionBatchRequest,
  PredictionBatchResponse,
  PredictionError,
  PredictionItem,
  PredictionSummary,
} from '@/shared';
import type { PredictBatch } from '../predictor/prediction-gateway';
import {
  ApiError,
  createJudolLensApiClient,
  type JudolLensApiClient,
} from './judollens-api-client';

const MAX_API_ITEMS = 4;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [250, 500, 1000] as const;

export { ApiError } from './judollens-api-client';

export type Sleep = (milliseconds: number) => Promise<void>;

type ApiPredictionGatewayOptions = {
  predictBatch: PredictBatch;
  maxItems?: number;
  maxAttempts?: number;
  sleep?: Sleep;
};

export class ApiPredictionGateway {
  readonly #predict: PredictBatch;
  readonly #maxItems: number;
  readonly #maxAttempts: number;
  readonly #sleep: Sleep;
  #queue: Promise<void> = Promise.resolve();

  constructor({
    predictBatch,
    maxItems = MAX_API_ITEMS,
    maxAttempts = MAX_ATTEMPTS,
    sleep = defaultSleep,
  }: ApiPredictionGatewayOptions) {
    if (maxItems !== MAX_API_ITEMS) {
      throw new Error(`maxItems must be ${MAX_API_ITEMS}`);
    }
    if (maxAttempts !== MAX_ATTEMPTS) {
      throw new Error(`maxAttempts must be ${MAX_ATTEMPTS}`);
    }
    this.#predict = predictBatch;
    this.#maxItems = maxItems;
    this.#maxAttempts = maxAttempts;
    this.#sleep = sleep;
  }

  async predictBatch(request: PredictionBatchRequest): Promise<PredictionBatchResponse> {
    if (request.items.length === 0) {
      throw new Error('Prediction batch must contain at least one item');
    }

    const chunks = toChunks(request.items, this.#maxItems);
    const responses = await Promise.all(
      chunks.map((items, index) =>
        this.#enqueue(() =>
          this.#predictChunk({
            ...request,
            requestId: `${request.requestId}:chunk:${index}`,
            items,
          }),
        ),
      ),
    );
    return combineResponses(request, responses);
  }

  #enqueue(operation: () => Promise<PredictionBatchResponse>): Promise<PredictionBatchResponse> {
    const next = this.#queue.then(operation, operation);
    this.#queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async #predictChunk(request: PredictionBatchRequest): Promise<PredictionBatchResponse> {
    for (let retry = 0; retry <= this.#maxAttempts; retry += 1) {
      try {
        return await this.#predict(request);
      } catch (error) {
        if (!shouldRetry(error) || retry === this.#maxAttempts) {
          return failedResponse(request, error);
        }
        await this.#sleep(RETRY_DELAYS_MS[retry]);
      }
    }
    return failedResponse(request, new Error('Prediction request exhausted retries'));
  }
}

export function createApiPredictionGateway(
  apiEndpoint: string,
  dependencies: { client?: JudolLensApiClient; sleep?: Sleep } = {},
): ApiPredictionGateway {
  const client = dependencies.client ?? createJudolLensApiClient(apiEndpoint);
  return new ApiPredictionGateway({
    predictBatch: client.predictBatch,
    sleep: dependencies.sleep,
  });
}

function toChunks(items: PredictionItem[], maxItems: number): PredictionItem[][] {
  const chunks: PredictionItem[][] = [];
  for (let start = 0; start < items.length; start += maxItems) {
    chunks.push(items.slice(start, start + maxItems));
  }
  return chunks;
}

function combineResponses(
  request: PredictionBatchRequest,
  responses: PredictionBatchResponse[],
): PredictionBatchResponse {
  const resultsById = new Map(
    responses.flatMap((response) => response.results.map((result) => [result.id, result])),
  );
  const results = request.items.flatMap((item) => {
    const result = resultsById.get(item.id);
    return result === undefined ? [] : [result];
  });
  const errors = responses.flatMap((response) => response.errors);
  const summary = responses.reduce<PredictionSummary>(
    (total, response) => ({
      totalItems: total.totalItems + response.summary.totalItems,
      judolCount: total.judolCount + response.summary.judolCount,
      unicodeSuspiciousCount:
        total.unicodeSuspiciousCount + response.summary.unicodeSuspiciousCount,
      processingTimeMs: total.processingTimeMs + response.summary.processingTimeMs,
    }),
    {
      totalItems: 0,
      judolCount: 0,
      unicodeSuspiciousCount: 0,
      processingTimeMs: 0,
    },
  );
  return {
    requestId: request.requestId,
    model: responses[0]?.model ?? {
      name: 'api-unavailable',
      version: 'unknown',
      architecture: 'unknown',
      isMock: false,
    },
    summary,
    results,
    errors,
  };
}

function failedResponse(
  request: PredictionBatchRequest,
  error: unknown,
): PredictionBatchResponse {
  const message = error instanceof Error ? error.message : 'Prediction API request failed';
  const errors: PredictionError[] = request.items.map((item) => ({
    itemId: item.id,
    code: 'api_prediction_failed',
    message,
  }));
  return {
    requestId: request.requestId,
    model: {
      name: 'api-unavailable',
      version: 'unknown',
      architecture: 'unknown',
      isMock: false,
    },
    summary: {
      totalItems: request.items.length,
      judolCount: 0,
      unicodeSuspiciousCount: 0,
      processingTimeMs: 0,
    },
    results: [],
    errors,
  };
}

function shouldRetry(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 429 || error.status === 503);
}

function defaultSleep(milliseconds: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, milliseconds);
  return promise;
}
