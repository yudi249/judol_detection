from __future__ import annotations

from pathlib import Path

import pytest

from scripts.export_indobert_onnx import (
    action_for_probability,
    assess_decision_parity,
    load_source_artifact,
    require_empty_output_directory,
)


def test_action_for_probability_matches_api_thresholds() -> None:
    assert action_for_probability(0.64) == "none"
    assert action_for_probability(0.65) == "warn"
    assert action_for_probability(0.85) == "blur"


def test_assess_decision_parity_rejects_int8_label_change() -> None:
    report = assess_decision_parity(
        torch_probability=0.80,
        onnx_probability=0.80,
        int8_probability=0.20,
        threshold=0.75,
    )

    assert report["fp32_label_matches"] is True
    assert report["int8_label_matches"] is False
    assert report["int8_action_matches"] is False


def test_require_empty_output_directory_rejects_existing_content(tmp_path: Path) -> None:
    output_dir = tmp_path / "serving"
    output_dir.mkdir()
    (output_dir / "conversion-report.json").write_text("{}", encoding="utf-8")

    with pytest.raises(ValueError, match="must not already contain files"):
        require_empty_output_directory(output_dir)


def test_load_source_artifact_rejects_missing_manifest(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="model manifest file does not exist"):
        load_source_artifact(tmp_path)


def test_safe_parity_corpus_covers_judol_and_non_judol() -> None:
    from scripts.export_indobert_onnx import SAFE_PARITY_TEXTS

    assert len(SAFE_PARITY_TEXTS) >= 4
    assert any("slot" in text.lower() for text in SAFE_PARITY_TEXTS)
    assert any("cuaca" in text.lower() for text in SAFE_PARITY_TEXTS)
