import json
from pathlib import Path

import pytest

from apps.api.app.services.model_manifest import ModelManifest, load_model_manifest


def valid_manifest() -> dict[str, object]:
    return {
        "model_name": "judollens-indobert-clean",
        "model_version": "0.1.0",
        "base_checkpoint": "indobenchmark/indobert-base-p1",
        "base_checkpoint_revision": "main",
        "label_to_id": {"non_judol": 0, "judol": 1},
        "max_length": 128,
        "preprocessing_version": "raw-text-v1-no-unicode-normalization",
        "training_dataset_sha256": "a" * 64,
        "split_manifest_sha256": "b" * 64,
        "validation_metrics": {"f1": 0.9},
        "trained_at": "2026-09-14T00:00:00Z",
    }


def write_manifest(tmp_path: Path, payload: dict[str, object]) -> Path:
    path = tmp_path / "model-manifest.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def test_load_model_manifest_accepts_clean_indobert_baseline(tmp_path: Path) -> None:
    manifest = load_model_manifest(write_manifest(tmp_path, valid_manifest()))

    assert isinstance(manifest, ModelManifest)
    assert manifest.label_to_id == {"non_judol": 0, "judol": 1}


def test_load_model_manifest_rejects_changed_binary_label_mapping(tmp_path: Path) -> None:
    payload = valid_manifest()
    payload["label_to_id"] = {"judol": 0, "non_judol": 1}

    with pytest.raises(ValueError, match="label_to_id"):
        load_model_manifest(write_manifest(tmp_path, payload))


def test_load_model_manifest_rejects_unknown_fields(tmp_path: Path) -> None:
    payload = valid_manifest()
    payload["unexpected"] = "field"

    with pytest.raises(ValueError, match="unknown field"):
        load_model_manifest(write_manifest(tmp_path, payload))


@pytest.mark.parametrize(
    ("field", "value", "invariant"),
    [
        ("base_checkpoint", "another/checkpoint", "base_checkpoint"),
        ("preprocessing_version", "normalized-text-v1", "preprocessing_version"),
    ],
)
def test_load_model_manifest_rejects_fixed_contract_violations(
    tmp_path: Path, field: str, value: str, invariant: str
) -> None:
    payload = valid_manifest()
    payload[field] = value

    with pytest.raises(ValueError, match=invariant):
        load_model_manifest(write_manifest(tmp_path, payload))


def test_load_model_manifest_rejects_missing_file(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="does not exist"):
        load_model_manifest(tmp_path / "missing.json")


def test_load_model_manifest_rejects_invalid_json(tmp_path: Path) -> None:
    path = tmp_path / "model-manifest.json"
    path.write_text("{", encoding="utf-8")

    with pytest.raises(ValueError, match="valid JSON"):
        load_model_manifest(path)
