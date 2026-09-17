from datetime import datetime, timezone
from pathlib import Path

import pytest
import torch

from apps.api.app.services.inference import LoadedIndoBertInferenceService
from apps.api.app.services.model_manifest import ModelManifest


class RecordingTokenizer:
    def __init__(self) -> None:
        self.received: list[str] = []

    def __call__(self, texts: list[str], **kwargs: object) -> dict[str, torch.Tensor]:
        self.received.extend(texts)
        assert kwargs == {"truncation": True, "max_length": 128, "padding": True, "return_tensors": "pt"}
        return {"input_ids": torch.tensor([[1, 2]] * len(texts))}


class FixedModel:
    def __init__(self, logits: list[list[float]]) -> None:
        self.logits = logits
        self.eval_calls = 0
        self.config = type("Config", (), {"label2id": {"non_judol": 0, "judol": 1}})()

    def eval(self) -> "FixedModel":
        self.eval_calls += 1
        return self

    def __call__(self, **_: object) -> object:
        return type("Output", (), {"logits": torch.tensor(self.logits)})()


def manifest() -> ModelManifest:
    return ModelManifest(
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


def test_service_passes_raw_unicode_text_to_tokenizer_and_returns_evidence_ranges() -> None:
    tokenizer = RecordingTokenizer()
    service = LoadedIndoBertInferenceService(
        tokenizer=tokenizer,
        model=FixedModel([[0.0, 2.0]]),
        manifest=manifest(),
    )

    result = service.predict_items([("node-1", "bοnus slοt")], threshold=0.75)[0]

    assert tokenizer.received == ["bοnus slοt"]
    assert result.id == "node-1"
    assert result.label == "judol"
    assert result.matched_terms == []
    assert result.reasons == [
        type(result.reasons[0])("model_signal", "indobert_probability", result.confidence)
    ]
    assert [(span.start, span.end) for span in result.display.highlight_ranges] == [(1, 2), (8, 9)]
    assert result.display.snippet == "bοnus slοt"


def test_service_projects_confidence_threshold_risk_and_action_in_item_order() -> None:
    service = LoadedIndoBertInferenceService(
        tokenizer=RecordingTokenizer(),
        model=FixedModel([[0.0, 3.0], [0.0, 1.0], [3.0, 0.0]]),
        manifest=manifest(),
    )

    results = service.predict_items(
        [("high", "a"), ("medium", "b"), ("low", "c")], threshold=0.7
    )

    assert [(result.id, result.label, result.risk_level, result.action) for result in results] == [
        ("high", "judol", "high", "blur"),
        ("medium", "judol", "medium", "warn"),
        ("low", "non_judol", "low", "none"),
    ]
    assert results[0].confidence > 0.85
    assert 0.65 <= results[1].confidence < 0.85
    assert results[2].confidence < 0.5


def test_loader_uses_local_files_only_validates_mapping_and_evaluates_once(monkeypatch, tmp_path: Path) -> None:
    loaded_manifest = manifest()
    tokenizer = RecordingTokenizer()
    model = FixedModel([[0.0, 1.0]])
    calls: list[tuple[str, Path, dict[str, bool]]] = []

    monkeypatch.setattr("apps.api.app.services.inference.load_model_manifest", lambda _: loaded_manifest)
    monkeypatch.setattr(
        "transformers.AutoTokenizer.from_pretrained",
        lambda path, **kwargs: calls.append(("tokenizer", path, kwargs)) or tokenizer,
    )
    monkeypatch.setattr(
        "transformers.AutoModelForSequenceClassification.from_pretrained",
        lambda path, **kwargs: calls.append(("model", path, kwargs)) or model,
    )

    service = LoadedIndoBertInferenceService.load(tmp_path)

    assert service.model is model
    assert calls == [
        ("tokenizer", tmp_path, {"local_files_only": True}),
        ("model", tmp_path, {"local_files_only": True}),
    ]
    assert model.eval_calls == 1


class OnnxRecordingTokenizer(RecordingTokenizer):
    def __call__(self, texts: list[str], **kwargs: object) -> dict[str, torch.Tensor]:
        encoded = super().__call__(texts, **kwargs)
        encoded["attention_mask"] = torch.tensor([[1, 1]] * len(texts))
        encoded["token_type_ids"] = torch.tensor([[0, 0]] * len(texts))
        return encoded


class FixedOnnxSession:
    def __init__(self, logits: list[list[float]]) -> None:
        self.logits = logits
        self.received: list[dict[str, object]] = []

    def get_inputs(self) -> list[object]:
        return [type("Input", (), {"name": name})() for name in ("input_ids", "attention_mask", "token_type_ids")]

    def run(self, _: object, inputs: dict[str, object]) -> list[object]:
        self.received.append(inputs)
        return [torch.tensor(self.logits).numpy()]


def test_onnx_service_preserves_pytorch_results_for_same_logits() -> None:
    from apps.api.app.services.inference import OnnxIndoBertInferenceService

    logits = [[0.0, 3.0], [3.0, 0.0]]
    torch_service = LoadedIndoBertInferenceService(
        tokenizer=OnnxRecordingTokenizer(), model=FixedModel(logits), manifest=manifest()
    )
    tokenizer = OnnxRecordingTokenizer()
    session = FixedOnnxSession(logits)
    onnx_service = OnnxIndoBertInferenceService(
        tokenizer=tokenizer, session=session, manifest=manifest()
    )
    items = [("unicode", "bοnus slοt"), ("ordinary", "rapat penelitian")]

    assert onnx_service.predict_items(items, threshold=0.75) == torch_service.predict_items(
        items, threshold=0.75
    )
    assert tokenizer.received == ["bοnus slοt", "rapat penelitian"]
    assert set(session.received[0]) == {"input_ids", "attention_mask", "token_type_ids"}


def test_runtime_dispatcher_selects_only_explicit_onnx_int8(monkeypatch, tmp_path: Path) -> None:
    from apps.api.app.services.inference import load_inference_service

    selected: list[tuple[str, Path]] = []
    monkeypatch.setattr(
        LoadedIndoBertInferenceService,
        "load",
        classmethod(lambda _, path: selected.append(("pytorch", path)) or object()),
    )
    monkeypatch.setattr(
        "apps.api.app.services.inference.OnnxIndoBertInferenceService.load",
        classmethod(lambda _, path: selected.append(("onnx-int8", path)) or object()),
    )

    load_inference_service(tmp_path, runtime="onnx-int8")

    assert selected == [("onnx-int8", tmp_path)]


def test_runtime_dispatcher_rejects_unknown_runtime(tmp_path: Path) -> None:
    from apps.api.app.services.inference import load_inference_service

    with pytest.raises(ValueError, match="inference runtime"):
        load_inference_service(tmp_path, runtime="unsupported")


def test_load_settings_reads_explicit_onnx_int8_runtime(monkeypatch) -> None:
    from apps.api.app.config import load_settings

    monkeypatch.setenv("JUDOLLENS_INFERENCE_RUNTIME", "onnx-int8")

    assert load_settings().inference_runtime == "onnx-int8"


def test_load_settings_rejects_unknown_inference_runtime(monkeypatch) -> None:
    from apps.api.app.config import load_settings

    monkeypatch.setenv("JUDOLLENS_INFERENCE_RUNTIME", "unsupported")

    with pytest.raises(ValueError, match="inference_runtime"):
        load_settings()
