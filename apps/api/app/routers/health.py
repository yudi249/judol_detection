"""Readiness endpoint for the loaded local inference artifact."""

from fastapi import APIRouter, Request

from ..contracts import HealthResponse, model_info_from_manifest

router = APIRouter()


@router.get("/health", operation_id="getHealth", response_model=HealthResponse)
def get_health(request: Request) -> HealthResponse:
    service = request.app.state.inference_service
    return HealthResponse(
        status="ready",
        api_version="1.0.0",
        model=model_info_from_manifest(service.manifest),
    )
