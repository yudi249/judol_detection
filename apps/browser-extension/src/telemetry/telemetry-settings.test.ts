import { describe, expect, it } from 'vitest';

import {
  createBenchmarkRunId,
  validateOtlpTraceEndpoint,
} from './telemetry-settings';

describe('benchmark telemetry settings', () => {
  it.each([
    'http://127.0.0.1:4318/v1/traces',
    'http://localhost:4318/v1/traces',
    'http://[::1]:4318/v1/traces',
  ])('accepts loopback OTLP endpoint %s', (value) => {
    expect(validateOtlpTraceEndpoint(value)).toBe(value);
  });

  it.each([
    'https://collector.example/v1/traces',
    'http://127.0.0.1:4318/v1/metrics',
    'http://user:secret@127.0.0.1:4318/v1/traces',
  ])('rejects unsafe OTLP endpoint %s', (value) => {
    expect(() => validateOtlpTraceEndpoint(value)).toThrow(
      'Endpoint OTLP harus berupa URL HTTP loopback /v1/traces.',
    );
  });

  it('creates deterministic opaque benchmark run IDs from injected inputs', () => {
    expect(
      createBenchmarkRunId(
        new Date('2026-09-22T10:11:12.000Z'),
        '12345678-1234-1234-1234-123456789abc',
      ),
    ).toBe('benchmark-20260922T101112Z-12345678');
  });
});
