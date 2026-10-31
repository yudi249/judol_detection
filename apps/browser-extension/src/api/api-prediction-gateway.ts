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

export type GatewayTelemetry = {
  withSpan<T>(
    name: string,
    attributes: Record<string, string | number | boolean>,
    operation: () => Promise<T>,
  ): Promise<T>;
  injectApiHeaders?(headers: Headers): void;
};

const disabledGatewayTelemetry: GatewayTelemetry = {
  withSpan: (_name, _attributes, operation) => operation(),
};

export type ApiPredictionGatewayOptions = {
  predictBatch: PredictBatch;
  maxItems?: number;
  maxAttempts?: number;
  sleep?: Sleep;
  telemetry?: GatewayTelemetry;
  now?: () => number;
};

export class ApiPredictionGateway {
  readonly #predict: PredictBatch;
  readonly #maxItems: number;
  readonly #maxAttempts: number;
  readonly #sleep: Sleep;
  readonly #telemetry: GatewayTelemetry;
  readonly #now: () => number;
  #queue: Promise<void> = Promise.resolve();

  constructor({
    predictBatch,
    maxItems = MAX_API_ITEMS,
    maxAttempts = MAX_ATTEMPTS,
    sleep = defaultSleep,
    telemetry = disabledGatewayTelemetry,
    now = performance.now.bind(performance),
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
    this.#telemetry = telemetry;
    this.#now = now;
  }

  async predictBatch(request: PredictionBatchRequest): Promise<PredictionBatchResponse> {
    if (request.items.length === 0) {
      throw new Error('Prediction batch must contain at least one item');
    }

    const chunks = toChunks(request.items, this.#maxItems);
    const responses = await Promise.all(
      chunks.map((items, index) => {
        const chunkRequest = {
          ...request,
          requestId: `${request.requestId}:chunk:${index}`,
          items,
        };
        return this.#enqueue(request.requestId, chunkRequest.requestId, () =>
          this.#withSpan(
            'client.api_chunk',
            {
              'judollens.request_id': request.requestId,
              'judollens.chunk_request_id': chunkRequest.requestId,
              'judollens.chunk.index': index,
            },
            () => this.#predictChunk(request.requestId, chunkRequest),
          ),
        );
      }),
    );
    return combineResponses(request, responses);
  }

  #enqueue(
    requestId: string,
    chunkRequestId: string,
    operation: () => Promise<PredictionBatchResponse>,
  ): Promise<PredictionBatchResponse> {
    const enqueuedAt = this.#now();
    const execute = () =>
      this.#withSpan(
        'client.gateway_queue',
        {
          'judollens.request_id': requestId,
          'judollens.chunk_request_id': chunkRequestId,
          'judollens.queue_wait_ms': Math.max(0, this.#now() - enqueuedAt),
        },
        operation,
      );
    const next = this.#queue.then(execute, execute);
    this.#queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async #predictChunk(
    originalRequestId: string,
    request: PredictionBatchRequest,
  ): Promise<PredictionBatchResponse> {
    for (let retry = 0; retry <= this.#maxAttempts; retry += 1) {
      try {
        return await this.#withSpan(
          'client.http_attempt',
          {
            'judollens.request_id': originalRequestId,
            'judollens.chunk_request_id': request.requestId,
            'judollens.retry.index': retry,
          },
          () => this.#predict(request),
        );
      } catch (error) {
        if (!shouldRetry(error) || retry === this.#maxAttempts) {
          return failedResponse(request, error);
        }
        await this.#sleep(RETRY_DELAYS_MS[retry]);
      }
    }
    return failedResponse(request, new Error('Prediction request exhausted retries'));
  }

  #withSpan<T>(
    name: string,
    attributes: Record<string, string | number | boolean>,
    operation: () => Promise<T>,
  ): Promise<T> {
    let operationPromise: Promise<T> | undefined;
    const runOperation = () => {
      operationPromise ??= operation();
      return operationPromise;
    };
    try {
      return Promise.resolve(this.#telemetry.withSpan(name, attributes, runOperation)).catch(
        () => operationPromise ?? runOperation(),
      );
    } catch {
      return operationPromise ?? runOperation();
    }
  }
}

export function createApiPredictionGateway(
  apiEndpoint: string,
  dependencies: {
    client?: JudolLensApiClient;
    sleep?: Sleep;
    telemetry?: GatewayTelemetry;
  } = {},
): ApiPredictionGateway {
  const client =
    dependencies.client ??
    createJudolLensApiClient(apiEndpoint, globalThis.fetch, {
      injectHeaders: (headers) => dependencies.telemetry?.injectApiHeaders?.(headers),
    });
  return new ApiPredictionGateway({
    predictBatch: client.predictBatch,
    sleep: dependencies.sleep,
    telemetry: dependencies.telemetry,
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
