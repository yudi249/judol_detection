import json
from pathlib import Path
from unittest.mock import patch

import pytest

from judol_detection.annotation.contracts import AnnotationLabel
from judol_detection.annotation.state import (
    CheckpointMismatch,
    CheckpointStore,
    build_input_fingerprint,
    hash_text,
    hash_skill,
)


def test_checkpoint_retries_transient_windows_replace_error(
    tmp_path: Path,
) -> None:
    checkpoint_path = tmp_path / "run.checkpoint.json"
    store = CheckpointStore(checkpoint_path)
    replace_calls = 0
    real_replace = __import__("os").replace

    def replace_with_one_transient_failure(source: str, destination: Path) -> None:
        nonlocal replace_calls
        replace_calls += 1
        if replace_calls == 1:
            raise PermissionError(5, "Access is denied")
        real_replace(source, destination)

    with patch("judol_detection.annotation.state.os.replace", replace_with_one_transient_failure):
        store.initialize(
            input_fingerprint="input-hash",
            skill_hash="skill-hash",
            sheet_name="Sheet1",
            text_column="text_raw",
            model="test-model",
        )

    assert replace_calls == 2
    assert checkpoint_path.exists()


def test_hash_text_uses_only_stripped_text() -> None:
    assert hash_text("  Slot Gacor  ") == hash_text("Slot Gacor")
    assert hash_text("Slot Gacor") != hash_text("slot gacor")
    assert hash_text("slot  gacor") != hash_text("slot gacor")


def test_checkpoint_round_trip_stores_hashes_but_not_raw_text(tmp_path: Path) -> None:
    checkpoint_path = tmp_path / "run.checkpoint.json"
    store = CheckpointStore(checkpoint_path)
    store.initialize(
        input_fingerprint="input-hash",
        skill_hash="skill-hash",
        sheet_name="Sheet1",
        text_column="text_raw",
        model="test-model",
    )
    store.record_result(
        row_id="Sheet1:2",
        text="secret raw text",
        label=AnnotationLabel.PROMOSI_JUDOL,
        status="api",
    )

    loaded = CheckpointStore.load(checkpoint_path)
    raw = checkpoint_path.read_text(encoding="utf-8")

    assert loaded.lookup_row("Sheet1:2").label is AnnotationLabel.PROMOSI_JUDOL
    assert loaded.lookup_cache(hash_text("secret raw text")) == AnnotationLabel.PROMOSI_JUDOL
    assert "secret raw text" not in raw
    json.loads(raw)


def test_checkpoint_caches_not_indonesian_as_terminal_label(tmp_path: Path) -> None:
    checkpoint_path = tmp_path / "run.checkpoint.json"
    store = CheckpointStore(checkpoint_path)
    store.initialize(
        input_fingerprint="input-hash",
        skill_hash="skill-hash",
        sheet_name="Sheet1",
        text_column="text_raw",
        model="test-model",
    )
    store.record_result(
        row_id="Sheet1:2",
        text="English text",
        label=AnnotationLabel.NOT_INDONESIAN,
        status="api",
    )

    assert store.lookup_cache(hash_text("English text")) is AnnotationLabel.NOT_INDONESIAN


def test_checkpoint_rejects_input_or_skill_mismatch(tmp_path: Path) -> None:
    checkpoint_path = tmp_path / "run.checkpoint.json"
    store = CheckpointStore(checkpoint_path)
    store.initialize(
        input_fingerprint="input-hash",
        skill_hash="skill-hash",
        sheet_name="Sheet1",
        text_column="text_raw",
        model="test-model",
    )

    with pytest.raises(CheckpointMismatch):
        store.validate_resume(
            input_fingerprint="changed",
            skill_hash="skill-hash",
            sheet_name="Sheet1",
            text_column="text_raw",
        )
    with pytest.raises(CheckpointMismatch):
        store.validate_resume(
            input_fingerprint="input-hash",
            skill_hash="changed",
            sheet_name="Sheet1",
            text_column="text_raw",
        )


def test_input_fingerprint_changes_when_workbook_bytes_change(tmp_path: Path) -> None:
    source = tmp_path / "input.xlsx"
    source.write_bytes(b"first")
    first = build_input_fingerprint(source, "Sheet1", "text_raw")
    source.write_bytes(b"second")

    assert first != build_input_fingerprint(source, "Sheet1", "text_raw")
    assert first != build_input_fingerprint(source, "Other", "text_raw")


def test_hash_skill_is_stable_for_same_content(tmp_path: Path) -> None:
    skill = tmp_path / "SKILL.md"
    skill.write_text("aturan", encoding="utf-8")

    assert hash_skill(skill) == hash_skill(skill)
