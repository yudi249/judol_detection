const LOOPBACK_HOSTS: Record<string, true> = {
  '127.0.0.1': true,
  localhost: true,
  '[::1]': true,
};

const INVALID_ENDPOINT_MESSAGE =
  'Endpoint OTLP harus berupa URL HTTP loopback /v1/traces.';

export function validateOtlpTraceEndpoint(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(INVALID_ENDPOINT_MESSAGE);
  }

  if (
    url.protocol !== 'http:' ||
    LOOPBACK_HOSTS[url.hostname] !== true ||
    url.pathname !== '/v1/traces' ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error(INVALID_ENDPOINT_MESSAGE);
  }

  return url.toString().replace(/\/$/, '');
}

export function createBenchmarkRunId(
  now = new Date(),
  uuid = crypto.randomUUID(),
): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('.000', '');
  return `benchmark-${stamp}-${uuid.replaceAll('-', '').slice(0, 8)}`;
}
