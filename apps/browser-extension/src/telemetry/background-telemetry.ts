import {
  ROOT_CONTEXT,
  SpanStatusCode,
  propagation,
  trace,
  type Attributes,
  type Context,
  type Span,
  type Tracer,
} from '@opentelemetry/api';
import {
  CompositePropagator,
  ExportResultCode,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  type ReadableSpan,
  type SpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { validateOtlpTraceEndpoint } from './telemetry-settings';

const ROOT_TIMEOUT_MS = 30_000;
const MAX_PENDING_ROOTS = 128;
const INSTRUMENTATION_NAME = 'judollens.browser-extension';

export type BenchmarkTelemetrySettings = {
  enabled: boolean;
  otlpEndpoint: string;
  runId: string;
};

export type PredictionTraceStart = {
  requestId: string;
  startedAtEpochMs: number;
  scanDurationMs: number;
  candidateCount: number;
  totalCharacters: number;
  maxCharacters: number;
};

export type PredictionTraceComplete = {
  requestId: string;
  overlayDurationMs: number;
  nextPaintDurationMs: number;
  completion: 'complete';
};

export type TraceHandle = {
  context?: Context;
  withSpan<T>(
    name: string,
    attributes: Attributes,
    operation: () => Promise<T>,
  ): Promise<T>;
};

export type BackgroundTelemetry = {
  configure(settings: BenchmarkTelemetrySettings): Promise<void>;
  startPrediction(input: PredictionTraceStart): TraceHandle | undefined;
  completePrediction(input: PredictionTraceComplete): void;
  invalidatePrediction(requestId: string): void;
  withSpan<T>(
    name: string,
    attributes: Attributes,
    operation: () => Promise<T>,
  ): Promise<T>;
  injectApiHeaders(headers: Headers): void;
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
  status(): 'disabled' | 'ready' | 'export-failed';
};
type TimeoutHandle = ReturnType<typeof globalThis.setTimeout>;


export type BackgroundTelemetryOptions = {
  exporterFactory?: (endpoint: string) => SpanExporter;
  setTimeout?: (callback: () => void, delayMs: number) => TimeoutHandle;
  clearTimeout?: (timeoutId: TimeoutHandle) => void;
  now?: () => number;
};

type PendingRoot = {
  span: Span;
  context: Context;
  startedAt: number;
  timeoutId: TimeoutHandle;
};

type ActiveProvider = {
  key: string;
  provider: BasicTracerProvider;
  tracer: Tracer;
  runId: string;
};

type CompletionReason =
  | 'timeout'
  | 'invalidated'
  | 'overflow'
  | 'reconfigured'
  | 'shutdown';

const propagator = new CompositePropagator({
  propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
});

const headerSetter = {
  set(carrier: Headers, key: string, value: string) {
    carrier.set(key, value);
  },
};

export function createBackgroundTelemetry(
  options: BackgroundTelemetryOptions = {},
): BackgroundTelemetry & { pendingCount(): number } {
  const exporterFactory =
    options.exporterFactory ??
    ((endpoint: string) => new OTLPTraceExporter({ url: endpoint }));
  const scheduleTimeout: NonNullable<BackgroundTelemetryOptions['setTimeout']> =
    options.setTimeout ??
    ((callback, delayMs) => globalThis.setTimeout(callback, delayMs));
  const cancelTimeout: NonNullable<BackgroundTelemetryOptions['clearTimeout']> =
    options.clearTimeout ?? ((timeoutId) => globalThis.clearTimeout(timeoutId));
  const now = options.now ?? Date.now;
  const pending = new Map<string, PendingRoot>();
  const operationContexts: Context[] = [];
  let active: ActiveProvider | undefined;
  let currentStatus: 'disabled' | 'ready' | 'export-failed' = 'disabled';

  const markExportFailed = () => {
    if (active !== undefined) {
      currentStatus = 'export-failed';
    }
  };

  const wrapExporter = (exporter: SpanExporter): SpanExporter => ({
    export(spans: ReadableSpan[], callback) {
      try {
        exporter.export(spans, (result) => {
          if (result.code !== ExportResultCode.SUCCESS) {
            markExportFailed();
          }
          callback(result);
        });
      } catch (error) {
        markExportFailed();
        callback({
          code: ExportResultCode.FAILED,
          error: error instanceof Error ? error : undefined,
        });
      }
    },
    async forceFlush() {
      try {
        await exporter.forceFlush?.();
      } catch {
        markExportFailed();
      }
    },
    async shutdown() {
      try {
        await exporter.shutdown();
      } catch {
        markExportFailed();
      }
    },
  });

  const endPending = (
    requestId: string,
    completion: CompletionReason,
  ): void => {
    const entry = pending.get(requestId);
    if (entry === undefined) {
      return;
    }
    pending.delete(requestId);
    cancelTimeout(entry.timeoutId);
    entry.span.setAttribute('judollens.completion', completion);
    entry.span.end();
  };

  const endAllPending = (completion: CompletionReason): void => {
    for (const requestId of [...pending.keys()]) {
      endPending(requestId, completion);
    }
  };

  const parentContext = (): Context =>
    operationContexts.at(-1) ?? [...pending.values()].at(-1)?.context ?? ROOT_CONTEXT;

  const runWithSpan = async <T>(
    parent: Context,
    name: string,
    attributes: Attributes,
    operation: () => Promise<T>,
  ): Promise<T> => {
    if (active === undefined) {
      return operation();
    }
    const span = active.tracer.startSpan(name, { attributes }, parent);
    const spanContext = trace.setSpan(parent, span);
    operationContexts.push(spanContext);
    try {
      return await operation();
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      const index = operationContexts.lastIndexOf(spanContext);
      if (index >= 0) {
        operationContexts.splice(index, 1);
      }
      span.end();
    }
  };

  const stopProvider = async (completion: CompletionReason): Promise<void> => {
    const provider = active?.provider;
    endAllPending(completion);
    active = undefined;
    operationContexts.length = 0;
    if (provider !== undefined) {
      try {
        await provider.forceFlush();
      } catch {
        currentStatus = 'export-failed';
      }
      try {
        await provider.shutdown();
      } catch {
        currentStatus = 'export-failed';
      }
    }
  };

  const telemetry: BackgroundTelemetry & { pendingCount(): number } = {
    async configure(settings) {
      if (!settings.enabled) {
        if (active !== undefined) {
          await stopProvider('reconfigured');
        }
        currentStatus = 'disabled';
        return;
      }

      const endpoint = validateOtlpTraceEndpoint(settings.otlpEndpoint);
      const key = `${endpoint}\n${settings.runId}`;
      if (active?.key === key) {
        return;
      }
      if (active !== undefined) {
        await stopProvider('reconfigured');
      }

      try {
        const exporter = wrapExporter(exporterFactory(endpoint));
        const processor = new BatchSpanProcessor(exporter, {
          disableAutoFlushOnDocumentHide: true,
          maxQueueSize: 512,
          maxExportBatchSize: 128,
        });
        const provider = new BasicTracerProvider({
          resource: resourceFromAttributes({
            [ATTR_SERVICE_NAME]: INSTRUMENTATION_NAME,
            'judollens.run_id': settings.runId,
          }),
          spanProcessors: [processor],
        });
        active = {
          key,
          provider,
          tracer: provider.getTracer(INSTRUMENTATION_NAME),
          runId: settings.runId,
        };
        currentStatus = 'ready';
      } catch {
        active = undefined;
        currentStatus = 'export-failed';
      }
    },

    startPrediction(input) {
      if (active === undefined) {
        return undefined;
      }
      endPending(input.requestId, 'invalidated');
      if (pending.size >= MAX_PENDING_ROOTS) {
        const oldestRequestId = pending.keys().next().value as string | undefined;
        if (oldestRequestId !== undefined) {
          endPending(oldestRequestId, 'overflow');
        }
      }

      const span = active.tracer.startSpan('judollens.prediction', {
        startTime: input.startedAtEpochMs,
        attributes: {
          'judollens.run_id': active.runId,
          'judollens.request_id': input.requestId,
          'judollens.scan.duration_ms': input.scanDurationMs,
          'judollens.candidate_count': input.candidateCount,
          'judollens.total_characters': input.totalCharacters,
          'judollens.max_characters': input.maxCharacters,
        },
      });
      const rootContext = propagation.setBaggage(
        trace.setSpan(ROOT_CONTEXT, span),
        propagation.createBaggage({
          'judollens.run_id': { value: active.runId },
        }),
      );
      const timeoutId = scheduleTimeout(() => {
        endPending(input.requestId, 'timeout');
      }, ROOT_TIMEOUT_MS);
      pending.set(input.requestId, {
        span,
        context: rootContext,
        startedAt: now(),
        timeoutId,
      });

      return {
        context: rootContext,
        withSpan: <T>(
          name: string,
          attributes: Attributes,
          operation: () => Promise<T>,
        ) => runWithSpan(rootContext, name, attributes, operation),
      };
    },

    completePrediction(input) {
      const entry = pending.get(input.requestId);
      if (entry === undefined) {
        return;
      }
      pending.delete(input.requestId);
      cancelTimeout(entry.timeoutId);
      entry.span.setAttributes({
        'judollens.overlay.duration_ms': input.overlayDurationMs,
        'judollens.next_paint.duration_ms': input.nextPaintDurationMs,
        'judollens.completion': input.completion,
      });
      entry.span.end();
    },

    invalidatePrediction(requestId) {
      endPending(requestId, 'invalidated');
    },

    withSpan(name, attributes, operation) {
      return runWithSpan(parentContext(), name, attributes, operation);
    },

    injectApiHeaders(headers) {
      if (active === undefined) {
        return;
      }
      try {
        propagator.inject(parentContext(), headers, headerSetter);
      } catch {
        // Propagation is best-effort and must never affect prediction requests.
      }
    },

    async forceFlush() {
      try {
        await active?.provider.forceFlush();
      } catch {
        markExportFailed();
      }
    },

    async shutdown() {
      if (active !== undefined) {
        await stopProvider('shutdown');
      }
      currentStatus = 'disabled';
    },

    status() {
      return currentStatus;
    },

    pendingCount() {
      return pending.size;
    },
  };

  return telemetry;
}
