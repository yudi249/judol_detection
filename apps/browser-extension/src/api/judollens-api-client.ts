import createClient from 'openapi-fetch';
import type { components, paths } from './generated/schema';
import type {
  DetectionReason,
  HighlightRange,
  PredictionBatchRequest,
  PredictionBatchResponse,
  PredictionClient,
  PredictionDisplay,
  PredictionError,
  PredictionItem,
  PredictionItemContext,
  PredictionModelInfo,
  PredictionRequest,
  PredictionResponse,
  PredictionResult,
  PredictionSource,
  PredictionSummary,
  UnicodeAnalysis,
  UnicodeSpan,
} from '@/shared';

type WireBatchRequest = components['schemas']['PredictionBatchRequest'];
type WireRequest = components['schemas']['PredictionRequest'];
type WireBatchResponse = components['schemas']['PredictionBatchResponse'];
type WireResponse = components['schemas']['PredictionResponse'];
type WireSource = components['schemas']['PredictionSource'];
type WireClient = components['schemas']['PredictionClient'];
type WireItem = components['schemas']['PredictionItem'];
type WireContext = components['schemas']['PredictionItemContext'];
type WireModel = components['schemas']['PredictionModelInfo'];
type WireResult = components['schemas']['PredictionResult'];
type WireSummary = components['schemas']['PredictionSummary'];
type WireError = components['schemas']['PredictionError'];
type WireReason = components['schemas']['DetectionReason'];
type WireUnicodeAnalysis = components['schemas']['UnicodeAnalysis'];
type WireUnicodeSpan = components['schemas']['UnicodeSpan'];
type WireDisplay = components['schemas']['PredictionDisplay'];
type WireHighlightRange = components['schemas']['HighlightRange'];

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type JudolLensApiClient = {
  predictBatch(request: PredictionBatchRequest): Promise<PredictionBatchResponse>;
  predictOne(request: PredictionRequest): Promise<PredictionResponse>;
};

export type JudolLensApiClientOptions = {
  injectHeaders?: (headers: Headers) => void;
};

export function createJudolLensApiClient(
  baseUrl: string,
  fetch = globalThis.fetch,
  options: JudolLensApiClientOptions = {},
): JudolLensApiClient {
  const client = createClient<paths>({ baseUrl, fetch });
  const requestHeaders = (): Headers => {
    const headers = new Headers();
    options.injectHeaders?.(headers);
    return headers;
  };

  return {
    async predictBatch(request) {
      const { data, error, response } = await client.POST('/predict/batch', {
        body: toWireBatchRequest(request),
        headers: requestHeaders(),
      });
      if (!response.ok || !data) {
        throw toApiError(error, response.status);
      }
      return fromWireBatchResponse(data);
    },
    async predictOne(request) {
      const { data, error, response } = await client.POST('/predict', {
        body: toWireRequest(request),
        headers: requestHeaders(),
      });
      if (!response.ok || !data) {
        throw toApiError(error, response.status);
      }
      return fromWireResponse(data);
    },
  };
}

function toWireBatchRequest(request: PredictionBatchRequest): WireBatchRequest {
  return {
    request_id: request.requestId,
    source: toWireSource(request.source),
    client: toWireClient(request.client),
    items: request.items.map(toWireItem),
  };
}

function toWireRequest(request: PredictionRequest): WireRequest {
  return {
    request_id: request.requestId,
    source: toWireSource(request.source),
    client: toWireClient(request.client),
    item: toWireItem(request.item),
  };
}

function toWireSource(source: PredictionSource): WireSource {
  return {
    ...(source.url === undefined ? {} : { url: source.url }),
    platform: source.platform,
    ...(source.pageTitle === undefined ? {} : { page_title: source.pageTitle }),
    captured_at: source.capturedAt,
  };
}

function toWireClient(client: PredictionClient): WireClient {
  return {
    extension_version: client.extensionVersion,
    prediction_mode: client.predictionMode,
    threshold: client.threshold,
  };
}

function toWireItem(item: PredictionItem): WireItem {
  return {
    id: item.id,
    text: item.text,
    context: toWireContext(item.context),
  };
}

function toWireContext(context: PredictionItemContext): WireContext {
  return {
    kind: context.kind,
    ...(context.selectorHint === undefined
      ? {}
      : { selector_hint: context.selectorHint }),
    visible: context.visible,
    ...(context.languageHint === undefined
      ? {}
      : { language_hint: context.languageHint }),
  };
}

function fromWireBatchResponse(response: WireBatchResponse): PredictionBatchResponse {
  return {
    requestId: response.request_id,
    model: fromWireModel(response.model),
    summary: fromWireSummary(response.summary),
    results: response.results.map(fromWireResult),
    errors: response.errors.map(fromWireError),
  };
}

function fromWireResponse(response: WireResponse): PredictionResponse {
  return {
    requestId: response.request_id,
    model: fromWireModel(response.model),
    result: fromWireResult(response.result),
    errors: response.errors.map(fromWireError),
  };
}

function fromWireModel(model: WireModel): PredictionModelInfo {
  return {
    name: model.name,
    version: model.version,
    architecture: model.architecture,
    isMock: model.is_mock,
  };
}

function fromWireSummary(summary: WireSummary): PredictionSummary {
  return {
    totalItems: summary.total_items,
    judolCount: summary.judol_count,
    unicodeSuspiciousCount: summary.unicode_suspicious_count,
    processingTimeMs: summary.processing_time_ms,
  };
}

function fromWireResult(result: WireResult): PredictionResult {
  return {
    id: result.id,
    label: result.label,
    confidence: result.confidence,
    riskLevel: result.risk_level,
    action: result.action,
    reasons: result.reasons.map(fromWireReason),
    matchedTerms: [...result.matched_terms],
    unicodeAnalysis: fromWireUnicodeAnalysis(result.unicode_analysis),
    display: fromWireDisplay(result.display),
  };
}

function fromWireReason(reason: WireReason): DetectionReason {
  return {
    type: reason.type,
    value: reason.value,
    weight: reason.weight,
  };
}

function fromWireUnicodeAnalysis(analysis: WireUnicodeAnalysis): UnicodeAnalysis {
  return {
    hasSuspiciousUnicode: analysis.has_suspicious_unicode,
    suspiciousCount: analysis.suspicious_count,
    spans: analysis.spans.map(fromWireUnicodeSpan),
  };
}

function fromWireUnicodeSpan(span: WireUnicodeSpan): UnicodeSpan {
  return {
    start: span.start,
    end: span.end,
    char: span.char,
    reason: span.reason,
    ...(span.normalized_as === undefined ? {} : { normalizedAs: span.normalized_as }),
    ...(span.unicode_name === undefined ? {} : { unicodeName: span.unicode_name }),
  };
}

function fromWireDisplay(display: WireDisplay): PredictionDisplay {
  return {
    snippet: display.snippet,
    highlightRanges: display.highlight_ranges.map(fromWireHighlightRange),
  };
}

function fromWireHighlightRange(range: WireHighlightRange): HighlightRange {
  return {
    start: range.start,
    end: range.end,
    kind: range.kind,
  };
}

function fromWireError(error: WireError): PredictionError {
  return {
    ...(error.item_id === undefined ? {} : { itemId: error.item_id }),
    code: error.code,
    message: error.message,
  };
}

function toApiError(error: unknown, status: number): ApiError {
  if (isProblem(error)) {
    return new ApiError(error.detail, status, error.code);
  }
  return new ApiError(`Prediction API request failed with status ${status}`, status);
}

function isProblem(value: unknown): value is { code: string; detail: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.code === 'string' && typeof record.detail === 'string';
}
