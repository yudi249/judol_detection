# JudolLens API

Run this only with a manifest-valid local artifact. The repository does not track
model binaries; `indobert-sampled-baseline-v0.1.0` is a local sampled-dataset
baseline for integration checks, not a final human-annotated model.

```powershell
uv run --no-cache python scripts/train_indobert_baseline.py --dataset data/annotation/dataset_final.xlsx --output models/checkpoints/indobert-clean-v0.1.0 --seed 42
$env:JUDOLLENS_MODEL_ARTIFACT = "models/checkpoints/indobert-clean-v0.1.0"
$env:JUDOLLENS_INFERENCE_RUNTIME = "pytorch"
$env:JUDOLLENS_CORS_ORIGINS = ""
uv run --no-cache uvicorn apps.api.app.main:app --host 127.0.0.1 --port 8000
```

For the converted serving artifact, set `JUDOLLENS_MODEL_ARTIFACT` to its
directory and set `JUDOLLENS_INFERENCE_RUNTIME` to `onnx-int8`. This runtime
loads only `tokenizer/`, `int8/model.int8.onnx`, `model-manifest.json`, and an
INT8-eligible `conversion-report.json`; it never falls back to PyTorch.

After the process is ready, verify `GET http://127.0.0.1:8000/health`.

The server accepts only the OpenAPI contract at `contracts/judollens-api.openapi.yaml`.
It logs no page text, URL, selector, or page title. Never set CORS to `*`.

The extension background service worker reaches this loopback API through the
manifest's explicit loopback `host_permissions`; it does not require CORS. Keep
`JUDOLLENS_CORS_ORIGINS` empty for that extension path. Configure an exact
origin only for a future ordinary web-page client; never set CORS to `*`.

## Optional local benchmark telemetry

Telemetry is disabled by default. Start the native Jaeger v2 process first using `docs/observability/jaeger-local.md`, then opt in explicitly:

```powershell
$env:JUDOLLENS_TELEMETRY_ENABLED = "true"
$env:JUDOLLENS_OTLP_ENDPOINT = "http://127.0.0.1:4318/v1/traces"
uv run --no-cache uvicorn apps.api.app.main:app --host 127.0.0.1 --port 8000
```

`JUDOLLENS_TELEMETRY_ENABLED` accepts only `true`, `false`, `1`, or `0`. The OTLP endpoint must use HTTP, a loopback host (`127.0.0.1`, `localhost`, or `::1`), the exact `/v1/traces` path, and no credentials, query, or fragment. When exact CORS origins are configured, the API allows the W3C `traceparent`, `tracestate`, and `baggage` headers in addition to `content-type`.

The server emits the same `server.tokenize`, `server.model_inference`, `server.postprocess`, and `server.response_projection` stages for PyTorch and ONNX. Attributes are restricted to opaque run/request IDs, platform/mode, aggregate character/token counts, model/runtime, result/error counts, and stable outcomes/status codes. Candidate text, snippets, URLs, page titles, selectors, DOM, request/response bodies, credentials, validation details, and exception messages are forbidden.

OTLP export is batched and fail-open: an unavailable collector does not change API prediction behavior. Jaeger provides local waterfall inspection and persistent 30-day Badger storage; statistically reportable latency percentiles require equivalent benchmark groups and a later export/analysis step.
