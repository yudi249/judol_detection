from __future__ import annotations

from pathlib import Path

import pytest

from apps.api.app.config import ApiSettings, load_settings
from fastapi.testclient import TestClient
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import SpanKind

from apps.api.app.main import create_app
from apps.api.app.telemetry import create_telemetry


def test_telemetry_defaults_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("JUDOLLENS_TELEMETRY_ENABLED", raising=False)
    monkeypatch.delenv("JUDOLLENS_OTLP_ENDPOINT", raising=False)

    settings = load_settings()

    assert settings.telemetry_enabled is False
    assert settings.otlp_endpoint == "http://127.0.0.1:4318/v1/traces"


@pytest.mark.parametrize(
    "endpoint",
    [
        "https://collector.example/v1/traces",
        "http://127.0.0.1:4318/v1/metrics",
        "http://user:secret@127.0.0.1:4318/v1/traces",
    ],
)
def test_telemetry_rejects_non_loopback_or_non_trace_endpoint(endpoint: str) -> None:
    with pytest.raises(ValueError, match="loopback"):
        ApiSettings(
            artifact_dir=Path("unused"),
            telemetry_enabled=True,
            otlp_endpoint=endpoint,
        )


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("true", True), ("1", True), ("false", False), ("0", False)],
)
def test_telemetry_reads_strict_boolean_environment(
    monkeypatch: pytest.MonkeyPatch, raw: str, expected: bool
) -> None:
    monkeypatch.setenv("JUDOLLENS_TELEMETRY_ENABLED", raw)

    assert load_settings().telemetry_enabled is expected


def test_telemetry_rejects_ambiguous_boolean_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("JUDOLLENS_TELEMETRY_ENABLED", "yes")

    with pytest.raises(ValueError, match="true, false, 1, or 0"):
        load_settings()


def test_cors_preflight_allows_w3c_telemetry_headers(fake_service: object) -> None:
    app = create_app(
        settings=ApiSettings(
            artifact_dir=Path("unused"),
            cors_origins=("chrome-extension://judollens",),
        ),
        service_factory=lambda _, **__: fake_service,
    )

    with TestClient(app) as client:
        response = client.options(
            "/predict/batch",
            headers={
                "origin": "chrome-extension://judollens",
                "access-control-request-method": "POST",
                "access-control-request-headers": "content-type,traceparent,tracestate,baggage",
            },
        )

    assert response.status_code == 200
    allowed = {
        value.strip().lower()
        for value in response.headers["access-control-allow-headers"].split(",")
    }
    assert {"content-type", "traceparent", "tracestate", "baggage"} <= allowed


def _enabled_settings() -> ApiSettings:
    return ApiSettings(artifact_dir=Path("unused"), telemetry_enabled=True)


def test_disabled_telemetry_is_an_app_scoped_no_op() -> None:
    exporter_factory_called = False

    def exporter_factory(_: str) -> InMemorySpanExporter:
        nonlocal exporter_factory_called
        exporter_factory_called = True
        return InMemorySpanExporter()

    runtime = create_telemetry(
        ApiSettings(artifact_dir=Path("unused")),
        exporter_factory=exporter_factory,
    )

    assert runtime.enabled is False
    assert runtime.provider is None
    assert runtime.force_flush() is True
    runtime.shutdown()
    runtime.shutdown()
    assert exporter_factory_called is False


def test_enabled_telemetry_uses_api_resource_and_flushes_once() -> None:
    exporter = InMemorySpanExporter()
    runtime = create_telemetry(
        _enabled_settings(),
        exporter_factory=lambda _: exporter,
        span_processor_factory=SimpleSpanProcessor,
    )

    assert runtime.provider is not None
    assert runtime.provider.resource.attributes["service.name"] == "judollens-api"
    with runtime.tracer.start_as_current_span("proof"):
        pass

    assert runtime.force_flush() is True
    first_spans = exporter.get_finished_spans()
    runtime.shutdown()
    runtime.shutdown()

    assert [span.name for span in first_spans] == ["proof"]


def test_fastapi_continues_w3c_trace_and_allows_only_run_id_baggage(fake_service: object) -> None:
    exporter = InMemorySpanExporter()
    runtime = create_telemetry(
        _enabled_settings(),
        exporter_factory=lambda _: exporter,
        span_processor_factory=SimpleSpanProcessor,
    )
    app = create_app(
        settings=_enabled_settings(),
        service_factory=lambda _, **__: fake_service,
        telemetry_factory=lambda _: runtime,
    )

    with TestClient(app) as client:
        response = client.get(
            "/health",
            headers={
                "traceparent": "00-11111111111111111111111111111111-2222222222222222-01",
                "baggage": "judollens.run_id=benchmark-safe,private.secret=never-record",
            },
        )

    assert response.status_code == 200
    server_span = next(
        span for span in exporter.get_finished_spans() if span.kind is SpanKind.SERVER
    )
    assert format(server_span.context.trace_id, "032x") == "11111111111111111111111111111111"
    assert server_span.attributes["judollens.run_id"] == "benchmark-safe"
    assert "private.secret" not in server_span.attributes
    assert all("benchmark-safe" not in str(value) for key, value in server_span.attributes.items() if key != "judollens.run_id")


def test_app_lifespan_flushes_and_shuts_down_telemetry_once(fake_service: object) -> None:
    class RecordingRuntime:
        enabled = False
        provider = None
        tracer = create_telemetry(ApiSettings(artifact_dir=Path("unused"))).tracer

        def __init__(self) -> None:
            self.flushes = 0
            self.shutdowns = 0

        def force_flush(self, timeout_millis: int = 2000) -> bool:
            self.flushes += 1
            return True

        def shutdown(self) -> None:
            self.shutdowns += 1

    runtime = RecordingRuntime()
    app = create_app(
        settings=ApiSettings(artifact_dir=Path("unused")),
        service_factory=lambda _, **__: fake_service,
        telemetry_factory=lambda _: runtime,
    )

    with TestClient(app):
        assert app.state.telemetry is runtime

    assert runtime.flushes == 1
    assert runtime.shutdowns == 1

def _batch_payload(text: str = "PRIVATE candidate https://secret.example/path") -> dict[str, object]:
    return {
        "request_id": "req-private-1",
        "source": {"platform": "simulation", "captured_at": "2026-09-14T00:00:00Z"},
        "client": {"extension_version": "0.1.0", "prediction_mode": "api", "threshold": 0.75},
        "items": [
            {"id": "item-1", "text": text, "context": {"kind": "post", "visible": True}}
        ],
    }


def _telemetry_app(fake_service: object) -> tuple[object, InMemorySpanExporter]:
    exporter = InMemorySpanExporter()
    runtime = create_telemetry(
        _enabled_settings(),
        exporter_factory=lambda _: exporter,
        span_processor_factory=SimpleSpanProcessor,
    )
    app = create_app(
        settings=_enabled_settings(),
        service_factory=lambda _, **__: fake_service,
        telemetry_factory=lambda _: runtime,
    )
    return app, exporter


def test_prediction_route_traces_private_response_projection_and_safe_aggregates(
    fake_service: object,
) -> None:
    app, exporter = _telemetry_app(fake_service)

    with TestClient(app) as client:
        response = client.post("/predict/batch", json=_batch_payload())

    assert response.status_code == 200
    spans = exporter.get_finished_spans()
    assert [span.name for span in spans].count("server.response_projection") == 1
    server_span = next(span for span in spans if span.kind is SpanKind.SERVER)
    attributes = dict(server_span.attributes or {})
    assert attributes["judollens.request_id"] == "req-private-1"
    assert attributes["judollens.platform"] == "simulation"
    assert attributes["judollens.prediction_mode"] == "api"
    assert attributes["judollens.item_count"] == 1
    assert attributes["judollens.total_characters"] == 45
    assert attributes["judollens.max_characters"] == 45
    assert attributes["judollens.model_name"] == "judollens-indobert-clean"
    assert attributes["judollens.model_version"] == "0.1.0"
    assert attributes["judollens.runtime"] == "unknown"
    assert attributes["judollens.result_count"] == 1
    assert attributes["judollens.error_count"] == 0
    assert attributes["judollens.outcome"] == "success"
    assert attributes["http.response.status_code"] == 200
    serialized = repr([(span.name, dict(span.attributes or {}), list(span.events)) for span in spans])
    assert "PRIVATE candidate" not in serialized
    assert "secret.example" not in serialized


@pytest.mark.parametrize(
    ("case", "expected_status", "expected_outcome", "expected_code"),
    [
        ("validation", 422, "validation_failed", None),
        ("saturated", 429, "rejected", "inference_queue_saturated"),
        ("unavailable", 503, "unavailable", "model_unavailable"),
    ],
)
def test_prediction_failures_record_only_stable_status_and_outcome(
    fake_service: object,
    case: str,
    expected_status: int,
    expected_outcome: str,
    expected_code: str | None,
) -> None:
    import asyncio

    app, exporter = _telemetry_app(fake_service)
    with TestClient(app) as client:
        if case == "validation":
            payload = _batch_payload("x" * 513)
        else:
            payload = _batch_payload()
        if case == "saturated":
            app.state.inference_semaphore = asyncio.Semaphore(0)
        elif case == "unavailable":
            fake_service.raise_error = True  # type: ignore[attr-defined]
        response = client.post("/predict/batch", json=payload)

    assert response.status_code == expected_status
    server_span = next(span for span in exporter.get_finished_spans() if span.kind is SpanKind.SERVER)
    attributes = dict(server_span.attributes or {})
    assert attributes["http.response.status_code"] == expected_status
    assert attributes["judollens.outcome"] == expected_outcome
    if expected_code is not None:
        assert attributes["judollens.problem_code"] == expected_code
    serialized = repr(
        [
            (span.name, dict(span.attributes or {}), list(span.events))
            for span in exporter.get_finished_spans()
        ]
    )
    assert "PRIVATE candidate" not in serialized
    assert "secret.example" not in serialized
    assert "ensure this value" not in serialized
