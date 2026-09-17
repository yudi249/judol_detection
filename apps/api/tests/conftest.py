from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from apps.api.app.services.inference import (
    DetectionReason,
    HighlightRange,
    InferenceResult,
    PredictionDisplay,
)
from apps.api.app.services.model_manifest import ModelManifest
from apps.api.app.services.unicode_evidence import UnicodeEvidence


class FakeInferenceService:
    def __init__(self) -> None:
        self.manifest = ModelManifest(
            model_name="judollens-indobert-clean",
            model_version="0.1.0",
            base_checkpoint="indobenchmark/indobert-base-p1",
            base_checkpoint_revision="main",
            label_to_id={"non_judol": 0, "judol": 1},
            max_length=128,
            preprocessing_version="raw-text-v1-no-unicode-normalization",
            training_dataset_sha256="a" * 64,
            split_manifest_sha256="b" * 64,
            validation_metrics={"f1": 0.9},
            trained_at=datetime(2026, 9, 14, tzinfo=timezone.utc),
        )
        self.received: list[tuple[list[tuple[str, str]], float]] = []
        self.raise_error = False

    def predict_items(
        self, items: list[tuple[str, str]], *, threshold: float
    ) -> list[InferenceResult]:
        self.received.append((items, threshold))
        if self.raise_error:
            raise RuntimeError("unavailable")
        return [self.result(identifier, text) for identifier, text in items]

    @staticmethod
    def result(identifier: str, text: str) -> InferenceResult:
        return InferenceResult(
            id=identifier,
            label="judol",
            confidence=0.9,
            risk_level="high",
            action="blur",
            reasons=[DetectionReason("model_signal", "indobert_probability", 0.9)],
            matched_terms=[],
            unicode_analysis=UnicodeEvidence(False, 0, []),
            display=PredictionDisplay(text[:240], [HighlightRange(0, 1, "matched_term")]),
        )


@pytest.fixture
def fake_service() -> FakeInferenceService:
    return FakeInferenceService()


@pytest.fixture
def client(fake_service: FakeInferenceService) -> TestClient:
    from apps.api.app.config import ApiSettings
    from apps.api.app.main import create_app

    app = create_app(
        settings=ApiSettings(artifact_dir=Path("unused")),
        service_factory=lambda _, **__: fake_service,
    )
    with TestClient(app) as test_client:
        yield test_client
