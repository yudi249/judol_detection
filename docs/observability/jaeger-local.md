# Local Jaeger benchmark tracing on Windows

This setup runs the official Jaeger v2 Windows binary directly, without Docker. All OTLP, query, and health listeners bind to `127.0.0.1`; they are not exposed to the local network. Trace data is stored in the repository-local Badger database for 30 days.

## Install Jaeger v2

1. Open the official [Jaeger download page](https://www.jaegertracing.io/download/) and follow its link to the official [GitHub releases](https://github.com/jaegertracing/jaeger/releases/).
2. Download a Jaeger v2 Windows AMD64 release archive and its checksum. Verify the archive using the checksum published for that exact release.
3. Extract `jaeger.exe` into `observability\jaeger\jaeger.exe`.

The binary is intentionally not committed, and this repository does not download it automatically. Jaeger v2 configuration uses the OpenTelemetry Collector format; see the official [configuration documentation](https://www.jaegertracing.io/docs/latest/deployment/configuration/) and [Badger configuration example](https://github.com/jaegertracing/jaeger/blob/main/cmd/jaeger/config-badger.yaml).

## Start Jaeger first

Run the following command from the repository root. The working directory matters because the Badger paths in the configuration are repository-relative.

```powershell
.\observability\jaeger\jaeger.exe --config .\observability\jaeger\jaeger-v2.yaml
```

Wait until both local endpoints respond before starting a benchmark:

- health: <http://127.0.0.1:13133/status>
- query UI: <http://127.0.0.1:16686>
- OTLP/HTTP traces: `http://127.0.0.1:4318/v1/traces`
- OTLP/gRPC: `127.0.0.1:4317`

Run exactly one Jaeger process against this data directory. Badger takes an exclusive directory lock, so a second process cannot share the same `observability\jaeger\data` backend.

## Start the benchmark stack in order

Use this order so neither producer exports spans before its receiver is ready:

1. **Jaeger:** start it as shown above and verify the health endpoint.
2. **API:** in another PowerShell session, configure the desired model artifact and runtime, then enable loopback OTLP export and start the API:

   ```powershell
   $env:JUDOLLENS_MODEL_ARTIFACT = "models/checkpoints/indobert-sampled-baseline-onnx-int8-v0.1.0"
   $env:JUDOLLENS_INFERENCE_RUNTIME = "onnx-int8"
   $env:JUDOLLENS_TELEMETRY_ENABLED = "true"
   $env:JUDOLLENS_OTLP_ENDPOINT = "http://127.0.0.1:4318/v1/traces"
   uv run --no-cache uvicorn apps.api.app.main:app --host 127.0.0.1 --port 8000
   ```

3. **Extension:** load or reload the built extension only after the API is ready. In its Options page, enable benchmark telemetry, keep the OTLP endpoint at `http://127.0.0.1:4318/v1/traces`, and set or generate the benchmark run ID. Then exercise the prediction flow and inspect the trace in the Jaeger UI.

Telemetry is opt-in. Do not enable it for ordinary browsing. The instrumentation is designed not to record text, URLs, DOM, request or response bodies, credentials, or other page content; still use only controlled benchmark fixtures when collecting traces.

## Retention and cleanup

The `local_badger` backend is non-ephemeral and keeps spans for `720h` (30 days). Traces survive normal Jaeger restarts and expire according to that retention setting.

To remove all locally retained traces:

1. Stop Jaeger and wait for the process to exit. Never delete Badger files while Jaeger is running.
2. Delete `observability\jaeger\data`.
3. Start Jaeger again; it recreates the database directories.

Both `observability/jaeger/data/` and `observability/jaeger/jaeger.exe` are ignored by Git.
