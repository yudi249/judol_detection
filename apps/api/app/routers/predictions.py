"""Inference endpoints with bounded batch admission and safe domain projection."""

from __future__ import annotations

import asyncio
import time
from typing import cast

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ..contracts import (
    PredictionBatchRequest,
    PredictionBatchResponse,
    PredictionError,
    PredictionRequest,
    PredictionResponse,
    PredictionResult,
    PredictionSummary,
    model_info_from_manifest,
    prediction_result_from_inference,
)

router = APIRouter()


def problem_response(
    *, status: int, code: str, title: str, detail: str, request: Request
) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        media_type="application/problem+json",
        content={
            "type": f"/problems/{code}",
            "title": title,
            "status": status,
            "detail": detail,
            "instance": request.url.path,
            "code": code,
        },
    )


async def _try_acquire(semaphore: asyncio.Semaphore) -> bool:
    if semaphore.locked():
        return False
    await semaphore.acquire()
    return True


def _project_results(results: list[object], expected_ids: list[str]) -> tuple[list[PredictionResult], list[PredictionError]]:
    projected: list[PredictionResult] = []
    errors: list[PredictionError] = []
    for identifier, result in zip(expected_ids, results, strict=False):
        try:
            if getattr(result, "id", None) != identifier:
                raise ValueError("mismatched item ID")
            projected.append(prediction_result_from_inference(cast(object, result)))
        except (AttributeError, TypeError, ValueError):
            errors.append(
                PredictionError(
                    item_id=identifier,
                    code="item_projection_failed",
                    message="Unable to project inference result.",
                )
            )
    for identifier in expected_ids[len(results) :]:
        errors.append(
            PredictionError(
                item_id=identifier,
                code="item_prediction_missing",
                message="Inference did not return a result for this item.",
            )
        )
    return projected, errors


def _summary(results: list[PredictionResult], errors: list[PredictionError], elapsed_ms: int) -> PredictionSummary:
    return PredictionSummary(
        total_items=len(results) + len(errors),
        judol_count=sum(result.label == "judol" for result in results),
        unicode_suspicious_count=sum(
            result.unicode_analysis.has_suspicious_unicode for result in results
        ),
        processing_time_ms=elapsed_ms,
    )


@router.post("/predict", operation_id="predictOne", response_model=PredictionResponse)
async def predict_one(request: Request, payload: PredictionRequest) -> PredictionResponse | JSONResponse:
    service = request.app.state.inference_service
    try:
        results = await asyncio.to_thread(
            service.predict_items, [(payload.item.id, payload.item.text)], threshold=payload.client.threshold
        )
        result = prediction_result_from_inference(results[0])
    except Exception:
        return problem_response(
            status=503,
            code="model_unavailable",
            title="Model unavailable",
            detail="The local model could not complete inference.",
            request=request,
        )
    request.state.request_id = payload.request_id
    request.state.result_count = 1
    return PredictionResponse(
        request_id=payload.request_id,
        model=model_info_from_manifest(service.manifest),
        result=result,
        errors=[],
    )


@router.post("/predict/batch", operation_id="predictBatch", response_model=PredictionBatchResponse)
async def predict_batch(
    request: Request, payload: PredictionBatchRequest
) -> PredictionBatchResponse | JSONResponse:
    semaphore = request.app.state.inference_semaphore
    if not await _try_acquire(semaphore):
        return problem_response(
            status=429,
            code="inference_queue_saturated",
            title="Inference queue saturated",
            detail="The local inference queue cannot accept another batch.",
            request=request,
        )

    started = time.perf_counter()
    service = request.app.state.inference_service
    try:
        service_results = await asyncio.to_thread(
            service.predict_items,
            [(item.id, item.text) for item in payload.items],
            threshold=payload.client.threshold,
        )
    except Exception:
        return problem_response(
            status=503,
            code="model_unavailable",
            title="Model unavailable",
            detail="The local model could not complete inference.",
            request=request,
        )
    finally:
        semaphore.release()

    results, errors = _project_results(service_results, [item.id for item in payload.items])
    request.state.request_id = payload.request_id
    request.state.result_count = len(results)
    return PredictionBatchResponse(
        request_id=payload.request_id,
        model=model_info_from_manifest(service.manifest),
        summary=_summary(results, errors, int((time.perf_counter() - started) * 1000)),
        results=results,
        errors=errors,
    )
