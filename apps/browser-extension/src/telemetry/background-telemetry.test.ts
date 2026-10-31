import type { Attributes } from '@opentelemetry/api';
import { ExportResultCode } from '@opentelemetry/core';
import type {
  ReadableSpan,
  SpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { describe, expect, it, vi } from 'vitest';
import {
  createBackgroundTelemetry,
  type BackgroundTelemetryOptions,
  type PredictionTraceComplete,
  type PredictionTraceStart,
} from './background-telemetry';

const disabledSettings = {
  enabled: false,
  otlpEndpoint: 'http://127.0.0.1:4318/v1/traces',
  runId: '',
};
const enabledSettings = {
  ...disabledSettings,
  enabled: true,
  runId: 'benchmark-safe',
};
const traceStart: PredictionTraceStart = {
  requestId: 'request-1',
  startedAtEpochMs: 1_700_000_000_000,
  scanDurationMs: 12,
  candidateCount: 4,
  totalCharacters: 120,
  maxCharacters: 50,
};
const traceComplete: PredictionTraceComplete = {
  requestId: traceStart.requestId,
  overlayDurationMs: 7,
  nextPaintDurationMs: 3,
  completion: 'complete',
};

type ExportCallback = Parameters<SpanExporter['export']>[1];
type RecordingExporter = {
  exporter: SpanExporter;
  exported: ReadableSpan[];
  span(name: string): ReadableSpan | undefined;
  shutdownCount(): number;
};


function createRecordingExporter(fail = false): RecordingExporter {
  const exported: ReadableSpan[] = [];
  let shutdownCount = 0;
  const exporter: SpanExporter = {
    export(spans: ReadableSpan[], callback: ExportCallback) {
      exported.push(...spans);
      callback(
        fail
          ? { code: ExportResultCode.FAILED, error: new Error('collector unavailable') }
          : { code: ExportResultCode.SUCCESS },
      );
    },
    async shutdown() {
      shutdownCount += 1;
    },
  };
  return {
    exporter,
    exported,
    span(name: string) {
      return exported.find((span) => span.name === name);
    },
    shutdownCount: () => shutdownCount,
  };
}

function createHarness(options: Partial<BackgroundTelemetryOptions> = {}) {
  const exporters: RecordingExporter[] = [];
  const telemetry = createBackgroundTelemetry({
    exporterFactory: () => {
      const recording = createRecordingExporter();
      exporters.push(recording);
      return recording.exporter;
    },
    ...options,
  });
  return { telemetry, exporters };
}

function allSerializedTelemetry(exported: ReadableSpan[]): string {
  return JSON.stringify(
    exported.map((span) => ({
      name: span.name,
      attributes: span.attributes,
      events: span.events,
    })),
  );
}

describe('background telemetry', () => {
  it('constructs no exporter and is a no-op while disabled', async () => {
    const exporterFactory = vi.fn(() => createRecordingExporter().exporter);
    const telemetry = createBackgroundTelemetry({ exporterFactory });

    await telemetry.configure(disabledSettings);

    expect(telemetry.startPrediction(traceStart)).toBeUndefined();
    await expect(
      telemetry.withSpan('client.disabled', {}, async () => 'result'),
    ).resolves.toBe('result');
    expect(exporterFactory).not.toHaveBeenCalled();
    expect(telemetry.status()).toBe('disabled');
  });

  it('reports ready after enabled configuration', async () => {
    const { telemetry } = createHarness();

    await telemetry.configure(enabledSettings);

    expect(telemetry.status()).toBe('ready');
    await telemetry.shutdown();
  });

  it('ends and removes a root on completion', async () => {
    const { telemetry, exporters } = createHarness();
    await telemetry.configure(enabledSettings);

    const handle = telemetry.startPrediction(traceStart);
    telemetry.completePrediction(traceComplete);
    await telemetry.forceFlush();

    expect(handle).toBeDefined();
    expect(telemetry.pendingCount()).toBe(0);
    expect(exporters[0].span('judollens.prediction')?.attributes).toMatchObject({
      'judollens.run_id': 'benchmark-safe',
      'judollens.request_id': 'request-1',
      'judollens.scan.duration_ms': 12,
      'judollens.candidate_count': 4,
      'judollens.total_characters': 120,
      'judollens.max_characters': 50,
      'judollens.overlay.duration_ms': 7,
      'judollens.next_paint.duration_ms': 3,
      'judollens.completion': 'complete',
    });
  });

  it('ends a pending root at its injected 30-second deadline', async () => {
    const timers = new Map<number, () => void>();
    let nextTimerId = 1;
    const { telemetry, exporters } = createHarness({
      setTimeout: (callback, delayMs) => {
        expect(delayMs).toBe(30_000);
        const timerId = nextTimerId;
        nextTimerId += 1;
        timers.set(timerId, callback);
        return timerId as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: (timerId) => {
        timers.delete(timerId as unknown as number);
      },
    });
    await telemetry.configure(enabledSettings);
    telemetry.startPrediction(traceStart);

    expect(timers.size).toBe(1);
    timers.values().next().value?.();
    await telemetry.forceFlush();

    expect(telemetry.pendingCount()).toBe(0);
    expect(timers.size).toBe(0);
    expect(
      exporters[0].span('judollens.prediction')?.attributes[
        'judollens.completion'
      ],
    ).toBe('timeout');
  });

  it('ends a pending root when invalidated', async () => {
    const { telemetry, exporters } = createHarness();
    await telemetry.configure(enabledSettings);
    telemetry.startPrediction(traceStart);

    telemetry.invalidatePrediction(traceStart.requestId);
    await telemetry.forceFlush();

    expect(telemetry.pendingCount()).toBe(0);
    expect(
      exporters[0].span('judollens.prediction')?.attributes[
        'judollens.completion'
      ],
    ).toBe('invalidated');
  });

  it('evicts and ends the oldest root when a 129th root starts', async () => {
    const { telemetry, exporters } = createHarness();
    await telemetry.configure(enabledSettings);
    for (let index = 0; index < 129; index += 1) {
      telemetry.startPrediction({ ...traceStart, requestId: `request-${index}` });
    }
    await telemetry.forceFlush();

    expect(telemetry.pendingCount()).toBe(128);
    const overflow = exporters[0].exported.find(
      (span) =>
        span.attributes['judollens.request_id'] === 'request-0' &&
        span.attributes['judollens.completion'] === 'overflow',
    );
    expect(overflow).toBeDefined();
    await telemetry.shutdown();
  });

  it('reuses an unchanged provider and replaces it after endpoint or run change', async () => {
    const { telemetry, exporters } = createHarness();
    await telemetry.configure(enabledSettings);
    telemetry.startPrediction(traceStart);
    await telemetry.configure({ ...enabledSettings });
    expect(exporters).toHaveLength(1);
    expect(telemetry.pendingCount()).toBe(1);

    await telemetry.configure({ ...enabledSettings, runId: 'benchmark-next' });

    expect(exporters).toHaveLength(2);
    expect(exporters[0].shutdownCount()).toBe(1);
    expect(exporters[0].span('judollens.prediction')?.attributes).toMatchObject({
      'judollens.completion': 'reconfigured',
    });
    expect(telemetry.pendingCount()).toBe(0);
    await telemetry.shutdown();
  });

  it('fails open and reports export failure without changing operation results', async () => {
    const recording = createRecordingExporter(true);
    const telemetry = createBackgroundTelemetry({
      exporterFactory: () => recording.exporter,
    });
    await telemetry.configure(enabledSettings);
    telemetry.startPrediction(traceStart);
    const result = await telemetry.withSpan(
      'client.background_prediction',
      {},
      async () => 'prediction-result',
    );
    telemetry.completePrediction(traceComplete);

    await expect(telemetry.forceFlush()).resolves.toBeUndefined();
    expect(result).toBe('prediction-result');
    expect(telemetry.status()).toBe('export-failed');
    await expect(telemetry.shutdown()).resolves.toBeUndefined();
  });

  it('recovers from export failure after endpoint or run reconfiguration', async () => {
    const exporters = [createRecordingExporter(true), createRecordingExporter()];
    const telemetry = createBackgroundTelemetry({
      exporterFactory: () => exporters.shift()!.exporter,
    });
    await telemetry.configure(enabledSettings);
    telemetry.startPrediction(traceStart);
    telemetry.completePrediction(traceComplete);
    await telemetry.forceFlush();
    expect(telemetry.status()).toBe('export-failed');

    await telemetry.configure({
      ...enabledSettings,
      otlpEndpoint: 'http://localhost:4318/v1/traces',
      runId: 'benchmark-recovered',
    });

    expect(telemetry.status()).toBe('ready');
    await telemetry.shutdown();
  });

  it('injects W3C trace context and only allow-listed run baggage', async () => {
    const { telemetry } = createHarness();
    await telemetry.configure(enabledSettings);
    telemetry.startPrediction(traceStart);
    const headers = new Headers();

    telemetry.injectApiHeaders(headers);

    expect(headers.get('traceparent')).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/,
    );
    expect(headers.get('baggage')).toBe('judollens.run_id=benchmark-safe');
    await telemetry.shutdown();
  });

  it('creates child spans under the pending prediction root', async () => {
    const { telemetry, exporters } = createHarness();
    await telemetry.configure(enabledSettings);
    const root = telemetry.startPrediction(traceStart);

    await root?.withSpan(
      'client.background_prediction',
      { 'judollens.item_count': 4 },
      async () => undefined,
    );
    telemetry.completePrediction(traceComplete);
    await telemetry.forceFlush();

    const child = exporters[0].span('client.background_prediction');
    const rootSpan = exporters[0].span('judollens.prediction');
    expect(child?.spanContext().traceId).toBe(rootSpan?.spanContext().traceId);
    expect(child?.parentSpanContext?.spanId).toBe(rootSpan?.spanContext().spanId);
  });

  it('keeps private request data structurally absent from exported telemetry', async () => {
    const privateSentinels = [
      'PRIVATE-TEXT',
      'https://private.example/path',
      'PRIVATE-DOM',
      'PRIVATE-BODY',
    ];
    const startWithUnacceptedPrivateFields = {
      ...traceStart,
      text: privateSentinels[0],
      url: privateSentinels[1],
      dom: privateSentinels[2],
      requestBody: privateSentinels[3],
    } as PredictionTraceStart;
    const { telemetry, exporters } = createHarness();
    await telemetry.configure(enabledSettings);

    telemetry.startPrediction(startWithUnacceptedPrivateFields);
    telemetry.completePrediction(traceComplete);
    await telemetry.forceFlush();

    const serialized = allSerializedTelemetry(exporters[0].exported);
    for (const sentinel of privateSentinels) {
      expect(serialized).not.toContain(sentinel);
    }
    await telemetry.shutdown();
  });

  it('ends pending roots and disables tracing during shutdown', async () => {
    const { telemetry, exporters } = createHarness();
    await telemetry.configure(enabledSettings);
    telemetry.startPrediction(traceStart);

    await telemetry.shutdown();

    expect(exporters[0].span('judollens.prediction')?.attributes).toMatchObject({
      'judollens.completion': 'shutdown',
    });
    expect(telemetry.pendingCount()).toBe(0);
    expect(telemetry.status()).toBe('disabled');
    expect(telemetry.startPrediction(traceStart)).toBeUndefined();
  });

  it('does not swallow application errors raised inside child spans', async () => {
    const { telemetry } = createHarness();
    await telemetry.configure(enabledSettings);
    telemetry.startPrediction(traceStart);
    const applicationError = new Error('prediction failed');

    await expect(
      telemetry.withSpan('client.background_prediction', {} as Attributes, async () => {
        throw applicationError;
      }),
    ).rejects.toBe(applicationError);
    await telemetry.shutdown();
  });
});
