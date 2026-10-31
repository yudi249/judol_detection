"""App-scoped, privacy-safe OpenTelemetry setup for the JudolLens API."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
import logging
import re
from threading import Lock
from typing import Any, Protocol

from opentelemetry import baggage, trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, SpanExporter, SpanProcessor
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.baggage.propagation import W3CBaggagePropagator

from .config import ApiSettings

logger = logging.getLogger(__name__)
_RUN_ID = re.compile(r"benchmark-[A-Za-z0-9_-]{1,64}\Z")


class ProviderFactory(Protocol):
    def __call__(self, *, resource: Resource) -> TracerProvider: ...


@dataclass
class TelemetryRuntime:
    """Own the telemetry objects and terminate them at most once."""

    tracer: trace.Tracer
    provider: TracerProvider | None
    enabled: bool
    propagator: TextMapPropagator | None = None
    _flushed: bool = field(default=False, init=False, repr=False)
    _shutdown: bool = field(default=False, init=False, repr=False)
    _lock: Lock = field(default_factory=Lock, init=False, repr=False)

    def force_flush(self, timeout_millis: int = 2000) -> bool:
        with self._lock:
            if self.provider is None or self._flushed or self._shutdown:
                return True
            self._flushed = True
            try:
                return bool(self.provider.force_flush(timeout_millis))
            except Exception:
                logger.warning("Telemetry flush failed")
                return False

    def shutdown(self) -> None:
        with self._lock:
            if self.provider is None or self._shutdown:
                return
            self._shutdown = True
            try:
                self.provider.shutdown()
            except Exception:
                logger.warning("Telemetry shutdown failed")


def create_telemetry(
    settings: ApiSettings,
    *,
    exporter_factory: Callable[[str], SpanExporter] | None = None,
    span_processor_factory: Callable[[SpanExporter], SpanProcessor] = BatchSpanProcessor,
    provider_factory: ProviderFactory = TracerProvider,
) -> TelemetryRuntime:
    """Create an isolated provider only when telemetry is explicitly enabled."""

    if not settings.telemetry_enabled:
        return TelemetryRuntime(
            tracer=trace.NoOpTracerProvider().get_tracer("judollens-api"),
            provider=None,
            enabled=False,
        )

    factory = exporter_factory or (lambda endpoint: OTLPSpanExporter(endpoint=endpoint))
    exporter = factory(settings.otlp_endpoint)
    provider = provider_factory(
        resource=Resource.create({"service.name": "judollens-api"})
    )
    provider.add_span_processor(span_processor_factory(exporter))
    propagator = CompositePropagator(
        [TraceContextTextMapPropagator(), W3CBaggagePropagator()]
    )
    # ASGI instrumentation consults the propagation API at request entry. This
    # changes propagation only; the tracer provider remains strictly app-scoped.
    set_global_textmap(propagator)
    return TelemetryRuntime(
        tracer=provider.get_tracer("judollens-api"),
        provider=provider,
        enabled=True,
        propagator=propagator,
    )


def server_request_hook(span: trace.Span, scope: dict[str, Any]) -> None:
    """Attach the sole allowed baggage value and discard URL attributes."""

    if not span.is_recording():
        return
    attributes = getattr(span, "_attributes", None)
    if attributes is not None:
        for key in tuple(attributes):
            if "url" in key or key in {"http.target", "http.user_agent", "user_agent.original"}:
                attributes.pop(key, None)
    run_id = baggage.get_baggage("judollens.run_id")
    if isinstance(run_id, str) and _RUN_ID.fullmatch(run_id):
        span.set_attribute("judollens.run_id", run_id)


def record_validation_failure() -> None:
    """Mark a validation failure without retaining validation content."""

    span = trace.get_current_span()
    if span.is_recording():
        span.set_attribute("judollens.outcome", "validation_failed")
        span.set_attribute("http.response.status_code", 422)


def record_safe_request_attributes(request: Any) -> None:
    """Record bounded metadata populated only by a validated endpoint handler."""

    span = trace.get_current_span()
    result_count = getattr(request.state, "result_count", None)
    if span.is_recording() and isinstance(result_count, int) and result_count >= 0:
        span.set_attribute("judollens.result_count", result_count)
