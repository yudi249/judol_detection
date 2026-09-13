"""Contracts for model responses and annotation labels."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
import json
from typing import Any


class AnnotationLabel(StrEnum):
    """Labels accepted from the annotation model."""

    PROMOSI_JUDOL = "promosi_judol"
    BUKAN_JUDOL = "bukan_judol"
    PERLU_REVIEW = "perlu_review"
    NOT_INDONESIAN = "not_indonesian"


@dataclass(frozen=True)
class AnnotationResult:
    """A validated annotation returned by the model."""

    label: AnnotationLabel


class InvalidAnnotationResponse(ValueError):
    """Raised when a model response violates the strict response contract."""


def build_response_format() -> dict[str, Any]:
    """Build the strict JSON Schema sent to the compatible endpoint."""
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "judol_annotation",
            "strict": True,
            "schema": {
                "type": "object",
                "additionalProperties": False,
                "required": ["label"],
                "properties": {
                    "label": {
                        "type": "string",
                        "enum": [label.value for label in AnnotationLabel],
                    }
                },
            },
        },
    }


def parse_annotation_response(payload: str) -> AnnotationResult:
    """Parse and validate an exact ``{"label": "..."}`` response."""
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise InvalidAnnotationResponse("response is not valid JSON") from exc

    if not isinstance(parsed, dict) or set(parsed) != {"label"}:
        raise InvalidAnnotationResponse("response must contain only the label field")

    value = parsed["label"]
    if not isinstance(value, str):
        raise InvalidAnnotationResponse("label must be a string")

    try:
        return AnnotationResult(label=AnnotationLabel(value))
    except ValueError as exc:
        raise InvalidAnnotationResponse("label is not an allowed annotation label") from exc
