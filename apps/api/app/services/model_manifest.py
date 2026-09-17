"""Immutable metadata contract for local IndoBERT model artifacts."""

from __future__ import annotations

from datetime import datetime
import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError


_BASE_CHECKPOINT = "indobenchmark/indobert-base-p1"
_LABEL_TO_ID = {"non_judol": 0, "judol": 1}
_PREPROCESSING_VERSION = "raw-text-v1-no-unicode-normalization"


class ModelManifest(BaseModel):
    """Validated, read-only metadata accompanying a locally trained model."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    model_name: str
    model_version: str
    base_checkpoint: str
    base_checkpoint_revision: str
    label_to_id: dict[str, int]
    max_length: int = Field(ge=1, le=512)
    preprocessing_version: Literal["raw-text-v1-no-unicode-normalization"]
    training_dataset_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    split_manifest_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    validation_metrics: dict[str, float]
    trained_at: datetime


def load_model_manifest(path: Path) -> ModelManifest:
    """Load a local artifact manifest after enforcing its fixed invariants."""

    try:
        serialized = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise ValueError(f"model manifest file does not exist: {path}") from exc
    except OSError as exc:
        raise ValueError(f"model manifest file cannot be read: {path}") from exc

    try:
        payload = json.loads(serialized)
    except json.JSONDecodeError as exc:
        raise ValueError("model manifest is not valid JSON") from exc

    if not isinstance(payload, dict):
        raise ValueError("model manifest JSON must be an object")

    unknown_fields = sorted(set(payload) - set(ModelManifest.model_fields))
    if unknown_fields:
        raise ValueError(
            f"model manifest contains unknown field(s): {', '.join(unknown_fields)}"
        )

    if payload.get("label_to_id") != _LABEL_TO_ID:
        raise ValueError("model manifest label_to_id must equal {'non_judol': 0, 'judol': 1}")

    if payload.get("base_checkpoint") != _BASE_CHECKPOINT:
        raise ValueError(f"model manifest base_checkpoint must equal {_BASE_CHECKPOINT!r}")

    if payload.get("preprocessing_version") != _PREPROCESSING_VERSION:
        raise ValueError(
            "model manifest preprocessing_version must equal "
            f"{_PREPROCESSING_VERSION!r}"
        )

    try:
        return ModelManifest.model_validate(payload)
    except ValidationError as exc:
        raise ValueError("model manifest violates its validation contract") from exc
