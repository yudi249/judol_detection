"""Pydantic wire models mirroring the canonical snake_case OpenAPI contract."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import AnyUrl, BaseModel, ConfigDict, Field

from .services.inference import InferenceResult


StrictStr = Annotated[str, Field(min_length=1)]
Identifier = Annotated[str, Field(min_length=1, max_length=128)]
Text = Annotated[str, Field(min_length=1, max_length=512)]


class WireModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PredictionItemContext(WireModel):
    kind: Literal["comment", "post", "message", "title", "description", "unknown"]
    selector_hint: Annotated[str, Field(min_length=1, max_length=512)] | None = None
    visible: bool
    language_hint: Literal["id", "en", "unknown"] | None = None


class PredictionItem(WireModel):
    id: Identifier
    text: Text
    context: PredictionItemContext


class PredictionSource(WireModel):
    url: Annotated[AnyUrl, Field(max_length=2048)] | None = None
    platform: Literal["youtube", "telegram", "x", "simulation", "unknown"]
    page_title: Annotated[str, Field(min_length=1, max_length=512)] | None = None
    captured_at: datetime


class PredictionClient(WireModel):
    extension_version: Annotated[str, Field(min_length=1, max_length=128)]
    prediction_mode: Literal["mock", "api", "offline"]
    threshold: Annotated[float, Field(gt=0, le=1)]


class PredictionRequest(WireModel):
    request_id: Identifier
    source: PredictionSource
    client: PredictionClient
    item: PredictionItem


class PredictionBatchRequest(WireModel):
    request_id: Identifier
    source: PredictionSource
    client: PredictionClient
    items: Annotated[list[PredictionItem], Field(min_length=1, max_length=32)]


class PredictionModelInfo(WireModel):
    name: Annotated[str, Field(min_length=1, max_length=128)]
    version: Annotated[str, Field(min_length=1, max_length=128)]
    architecture: Annotated[str, Field(min_length=1, max_length=128)]
    is_mock: bool


class DetectionReason(WireModel):
    type: Literal["keyword", "unicode", "model_signal"]
    value: Annotated[str, Field(min_length=1, max_length=512)]
    weight: float


class UnicodeSpan(WireModel):
    start: Annotated[int, Field(ge=0)]
    end: Annotated[int, Field(ge=0)]
    char: Annotated[str, Field(min_length=1, max_length=1)]
    reason: Literal["homoglyph", "invisible", "symbol", "mixed_script", "unknown"]
    normalized_as: Annotated[str, Field(min_length=1, max_length=1)] | None = None
    unicode_name: Annotated[str, Field(min_length=1, max_length=256)] | None = None


class UnicodeAnalysis(WireModel):
    has_suspicious_unicode: bool
    suspicious_count: Annotated[int, Field(ge=0)]
    spans: list[UnicodeSpan]


class HighlightRange(WireModel):
    start: Annotated[int, Field(ge=0)]
    end: Annotated[int, Field(ge=0)]
    kind: Literal["matched_term", "unicode_suspicious"]


class PredictionDisplay(WireModel):
    snippet: Annotated[str, Field(max_length=512)]
    highlight_ranges: list[HighlightRange]


class PredictionResult(WireModel):
    id: Identifier
    label: Literal["judol", "non_judol"]
    confidence: Annotated[float, Field(ge=0, le=1)]
    risk_level: Literal["low", "medium", "high"]
    action: Literal["none", "warn", "blur", "hide"]
    reasons: list[DetectionReason]
    matched_terms: list[Annotated[str, Field(min_length=1, max_length=128)]]
    unicode_analysis: UnicodeAnalysis
    display: PredictionDisplay


class PredictionSummary(WireModel):
    total_items: Annotated[int, Field(ge=0)]
    judol_count: Annotated[int, Field(ge=0)]
    unicode_suspicious_count: Annotated[int, Field(ge=0)]
    processing_time_ms: Annotated[int, Field(ge=0)]


class PredictionError(WireModel):
    item_id: Identifier | None = None
    code: Annotated[str, Field(min_length=1, max_length=128)]
    message: Annotated[str, Field(min_length=1, max_length=512)]


class PredictionResponse(WireModel):
    request_id: Identifier
    model: PredictionModelInfo
    result: PredictionResult
    errors: list[PredictionError]


class PredictionBatchResponse(WireModel):
    request_id: Identifier
    model: PredictionModelInfo
    summary: PredictionSummary
    results: list[PredictionResult]
    errors: list[PredictionError]


class HealthResponse(WireModel):
    status: Literal["ready"]
    api_version: Annotated[str, Field(min_length=1, max_length=128)]
    model: PredictionModelInfo


class Problem(WireModel):
    type: str
    title: Annotated[str, Field(min_length=1, max_length=256)]
    status: Annotated[int, Field(ge=400, le=599)]
    detail: Annotated[str, Field(min_length=1, max_length=512)]
    instance: str
    code: Annotated[str, Field(min_length=1, max_length=128)]


def model_info_from_manifest(manifest: object) -> PredictionModelInfo:
    return PredictionModelInfo(
        name=manifest.model_name,
        version=manifest.model_version,
        architecture=manifest.base_checkpoint.rsplit("/", 1)[-1],
        is_mock=False,
    )


def prediction_result_from_inference(result: InferenceResult) -> PredictionResult:
    """Project a domain result once at the HTTP boundary."""

    return PredictionResult(
        id=result.id,
        label=result.label,
        confidence=result.confidence,
        risk_level=result.risk_level,
        action=result.action,
        reasons=[DetectionReason(type=reason.type, value=reason.value, weight=reason.weight) for reason in result.reasons],
        matched_terms=result.matched_terms,
        unicode_analysis=UnicodeAnalysis(
            has_suspicious_unicode=result.unicode_analysis.has_suspicious_unicode,
            suspicious_count=result.unicode_analysis.suspicious_count,
            spans=[
                UnicodeSpan(
                    start=span.start,
                    end=span.end,
                    char=span.char,
                    reason=span.reason,
                    normalized_as=span.normalized_as,
                    unicode_name=span.unicode_name,
                )
                for span in result.unicode_analysis.spans
            ],
        ),
        display=PredictionDisplay(
            snippet=result.display.snippet,
            highlight_ranges=[
                HighlightRange(start=span.start, end=span.end, kind=span.kind)
                for span in result.display.highlight_ranges
            ],
        ),
    )
