"""FastAPI factory for a locally loaded JudolLens inference service."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
import logging
import time
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import ApiSettings, load_settings
from .routers.health import router as health_router
from .routers.predictions import router as predictions_router
from .services.inference import load_inference_service
from .telemetry import (
    TelemetryRuntime,
    create_telemetry,
    record_safe_request_attributes,
    record_validation_failure,
    server_request_hook,
)

logger = logging.getLogger(__name__)


def create_app(
    settings: ApiSettings | None = None,
    service_factory: Callable[..., object] = load_inference_service,
    telemetry_factory: Callable[[ApiSettings], TelemetryRuntime] = create_telemetry,
) -> FastAPI:
    """Create an API that loads one local model artifact for its lifespan."""

    resolved_settings = settings or load_settings()
    telemetry = telemetry_factory(resolved_settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        try:
            app.state.inference_service = await asyncio.to_thread(
                service_factory,
                resolved_settings.artifact_dir,
                runtime=resolved_settings.inference_runtime,
                tracer=telemetry.tracer,
            )
            app.state.inference_semaphore = asyncio.Semaphore(resolved_settings.max_inference_queue)
            yield
        finally:
            telemetry.force_flush()
            telemetry.shutdown()

    app = FastAPI(title="JudolLens Prediction API", version="1.0.0", lifespan=lifespan)
    app.state.telemetry = telemetry
    if telemetry.enabled:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        FastAPIInstrumentor.instrument_app(
            app,
            tracer_provider=telemetry.provider,
            server_request_hook=server_request_hook,
            exclude_spans=["receive", "send"],
        )
    if resolved_settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(resolved_settings.cors_origins),
            allow_credentials=False,
            allow_methods=["GET", "POST"],
            allow_headers=["content-type", "traceparent", "tracestate", "baggage"],
        )

    @app.exception_handler(RequestValidationError)
    async def validation_problem(request: Request, _: RequestValidationError) -> JSONResponse:
        record_validation_failure()
        return JSONResponse(
            status_code=422,
            media_type="application/problem+json",
            content={
                "type": "/problems/validation_failed",
                "title": "Validation failed",
                "status": 422,
                "detail": "The request body does not satisfy the contract.",
                "instance": request.url.path,
                "code": "validation_failed",
            },
        )

    @app.middleware("http")
    async def log_request_metadata(request: Request, call_next: Callable[..., Any]) -> Any:
        started = time.perf_counter()
        response = await call_next(request)
        record_safe_request_attributes(request)
        logger.info(
            "API request method=%s path=%s status=%s elapsed_ms=%s request_id=%s result_count=%s model_version=%s",
            request.method,
            request.url.path,
            response.status_code,
            int((time.perf_counter() - started) * 1000),
            getattr(request.state, "request_id", None),
            getattr(request.state, "result_count", None),
            getattr(getattr(app.state, "inference_service", None), "manifest", None)
            and app.state.inference_service.manifest.model_version,
        )
        return response

    app.include_router(health_router)
    app.include_router(predictions_router)
    return app


app = create_app()
