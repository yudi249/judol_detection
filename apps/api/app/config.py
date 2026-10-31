"""Explicit local-only configuration for the JudolLens API."""

from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

_CANONICAL_MAX_BATCH_ITEMS = 32
_CANONICAL_MAX_ITEM_CHARACTERS = 512


@dataclass(frozen=True)
class ApiSettings:
    host: str = "127.0.0.1"
    port: int = 8000
    artifact_dir: Path = Path("models/checkpoints/indobert-clean-v0.1.0")
    inference_runtime: Literal["pytorch", "onnx-int8"] = "pytorch"
    cors_origins: tuple[str, ...] = ()
    max_batch_items: int = _CANONICAL_MAX_BATCH_ITEMS
    max_item_characters: int = _CANONICAL_MAX_ITEM_CHARACTERS
    max_inference_queue: int = 1
    telemetry_enabled: bool = False
    otlp_endpoint: str = "http://127.0.0.1:4318/v1/traces"

    def __post_init__(self) -> None:
        if self.host not in {"127.0.0.1", "::1", "localhost"}:
            raise ValueError("API host must be a loopback address")
        if not 1 <= self.port <= 65535:
            raise ValueError("API port must be between 1 and 65535")
        if "*" in self.cors_origins:
            raise ValueError("wildcard CORS origins are not permitted")
        if any(not origin or origin != origin.strip() for origin in self.cors_origins):
            raise ValueError("CORS origins must be non-empty exact origins")
        if self.max_batch_items != _CANONICAL_MAX_BATCH_ITEMS:
            raise ValueError("max_batch_items must equal the canonical limit of 32")
        if self.max_item_characters != _CANONICAL_MAX_ITEM_CHARACTERS:
            raise ValueError("max_item_characters must equal the canonical limit of 512")
        if self.max_inference_queue < 1:
            raise ValueError("max_inference_queue must be at least 1")
        if self.inference_runtime not in {"pytorch", "onnx-int8"}:
            raise ValueError("inference_runtime must be 'pytorch' or 'onnx-int8'")
        endpoint = urlsplit(self.otlp_endpoint)
        if (
            endpoint.scheme != "http"
            or endpoint.hostname not in {"127.0.0.1", "::1", "localhost"}
            or endpoint.path != "/v1/traces"
            or endpoint.username is not None
            or endpoint.password is not None
            or endpoint.query
            or endpoint.fragment
        ):
            raise ValueError(
                "OTLP endpoint must be a loopback HTTP URL ending in /v1/traces"
            )


def _optional_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer") from exc

def _optional_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    if value in {"true", "1"}:
        return True
    if value in {"false", "0"}:
        return False
    raise ValueError(f"{name} must be true, false, 1, or 0")


def load_settings() -> ApiSettings:
    """Load only explicit environment overrides; browser access is opt-in."""

    origins_raw = os.getenv("JUDOLLENS_CORS_ORIGINS", "")
    origins = () if not origins_raw else tuple(origins_raw.split(","))
    return ApiSettings(
        artifact_dir=Path(os.getenv("JUDOLLENS_MODEL_ARTIFACT", ApiSettings.artifact_dir)),
        inference_runtime=os.getenv("JUDOLLENS_INFERENCE_RUNTIME", "pytorch"),
        cors_origins=origins,
        max_batch_items=_optional_int("JUDOLLENS_MAX_BATCH_ITEMS", _CANONICAL_MAX_BATCH_ITEMS),
        max_item_characters=_optional_int(
            "JUDOLLENS_MAX_ITEM_CHARACTERS", _CANONICAL_MAX_ITEM_CHARACTERS
        ),
        max_inference_queue=_optional_int("JUDOLLENS_MAX_INFERENCE_QUEUE", 1),
        telemetry_enabled=_optional_bool("JUDOLLENS_TELEMETRY_ENABLED", False),
        otlp_endpoint=os.getenv(
            "JUDOLLENS_OTLP_ENDPOINT", "http://127.0.0.1:4318/v1/traces"
        ),
    )
