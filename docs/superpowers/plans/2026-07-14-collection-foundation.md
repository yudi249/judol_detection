# Collection Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local reusable collection foundation with one SQLite database, keyword weak labels, normalized-text deduplication, run tracking, annotations, and CSV/Parquet export.

**Architecture:** Each source adapter yields a `CollectedDocument`. Shared collection modules normalize it, derive a weak label, and write it atomically to SQLite. Scripts orchestrate only collection or export.

**Tech Stack:** Python 3.12, sqlite3, hashlib, unicodedata, pandas, pyarrow, pytest.

---

## File map

- Create `src/judol_detection/collection/models.py`: contracts and UTC helper.
- Create `src/judol_detection/collection/normalizer.py`: normalization, Unicode flags, SHA-256.
- Create `src/judol_detection/collection/keywords.py`: central deterministic weak labeling.
- Create `src/judol_detection/collection/database.py`: SQLite connection and schema.
- Create `src/judol_detection/collection/storage.py`: run lifecycle, dedup, annotation, export query.
- Create `src/judol_detection/collection/__init__.py` and `src/judol_detection/collectors/__init__.py`.
- Create `src/judol_detection/collectors/base.py`: source adapter protocol only.
- Create `scripts/export_dataset.py`: CSV/Parquet CLI.
- Create unit and integration tests below; update `pyproject.toml`, `uv.lock`, `docs/dataset.md`, progress artifacts.

### Task 1: Establish tests and package boundary

**Files:** Modify `pyproject.toml`, `uv.lock`; create `tests/unit/test_collection_package.py`, package initializers.

- [ ] Add pytest with `uv add --dev pytest`.
- [ ] Write the failing import test:

```python
def test_collection_package_exports_public_contracts() -> None:
    from judol_detection.collection import CollectedDocument, CollectionStorage
    assert CollectedDocument.__name__ == "CollectedDocument"
    assert CollectionStorage.__name__ == "CollectionStorage"
```

- [ ] Run `uv run --no-cache python -m pytest tests/unit/test_collection_package.py -q` and confirm it fails because the package is absent.
- [ ] After Tasks 2–3 provide concrete symbols, create this initializer and re-run the test until it passes:

```python
"""Reusable local collection, labeling, and storage helpers."""
from .models import CollectedDocument
from .storage import CollectionStorage
__all__ = ["CollectedDocument", "CollectionStorage"]
```

- [ ] Commit: `git add pyproject.toml uv.lock src/judol_detection/collection tests/unit/test_collection_package.py; git commit -m "chore: add collection test foundation"`.

### Task 2: Implement normalization and keyword weak labeling

**Files:** Create `models.py`, `normalizer.py`, `keywords.py`, `tests/unit/test_collection_normalizer.py`, `tests/unit/test_collection_keywords.py`.

- [ ] Write these failing tests:

```python
from judol_detection.collection.normalizer import normalize_document_text
from judol_detection.collection.keywords import classify_weak_label


def test_normalization_keeps_raw_text_and_flags_zero_width() -> None:
    result = normalize_document_text("SLOT\u200b MAXWIN")
    assert result.raw_text == "SLOT\u200b MAXWIN"
    assert result.normalized_text == "slot maxwin"
    assert result.unicode_flags == ("zero_width",)
    assert len(result.normalized_hash) == 64


def test_keyword_match_is_positive_weak_label() -> None:
    result = classify_weak_label("Bonus deposit slot gacor")
    assert result.label == 1
    assert result.matched_keywords == ("bonus", "deposit", "gacor", "slot")
    assert result.reason == "keyword:bonus|deposit|gacor|slot"


def test_no_keyword_match_is_negative_weak_label() -> None:
    result = classify_weak_label("Berita olahraga hari ini")
    assert result.label == 0
    assert result.reason == "no_keyword_match"
```

- [ ] Run `uv run --no-cache python -m pytest tests/unit/test_collection_normalizer.py tests/unit/test_collection_keywords.py -q`; expect missing-module failures.
- [ ] Implement frozen dataclasses: `CollectedDocument(platform, source_type, text_raw, source_item_id=None, source_url=None, published_at=None, language_hint=None, raw_payload_path=None)`, `NormalizedText(raw_text, normalized_text, raw_hash, normalized_hash, unicode_flags)`, and `WeakLabelResult(label, matched_keywords, reason)`.
- [ ] Implement `normalize_document_text`: retain raw text; apply NFKC; remove zero-width characters while adding `zero_width`; collapse whitespace; lowercase; compute SHA-256 hashes.
- [ ] Implement `classify_weak_label` using exactly the initial ordered tuple `("bonus", "deposit", "freebet", "gacor", "judi", "maxwin", "slot", "togel")`; return sorted unique matches and label `1`, otherwise `0` with `no_keyword_match`.
- [ ] Re-run the focused tests; expected PASS.
- [ ] Commit: `git add src/judol_detection/collection/models.py src/judol_detection/collection/normalizer.py src/judol_detection/collection/keywords.py tests/unit/test_collection_normalizer.py tests/unit/test_collection_keywords.py; git commit -m "feat: add collection normalization and weak labels"`.

### Task 3: Implement SQLite run tracking and exact deduplication

**Files:** Create `database.py`, `storage.py`, `tests/integration/test_collection_storage.py`; modify collection initializer.

- [ ] Write the failing integration tests:

```python
from judol_detection.collection.models import CollectedDocument
from judol_detection.collection.storage import CollectionStorage


def test_store_document_deduplicates_normalized_text(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "collection.sqlite")
    run_id = storage.start_run("fixture", "fixture_import", "sample")
    first = storage.store_document(run_id, CollectedDocument("fixture", "manual_import", "Slot  Gacor"))
    duplicate = storage.store_document(run_id, CollectedDocument("fixture", "manual_import", "slot gacor"))
    storage.finish_run(run_id)
    assert first.inserted is True
    assert first.weak_label == 1
    assert duplicate.inserted is False
    assert storage.get_run(run_id)["inserted_count"] == 1
    assert storage.get_run(run_id)["duplicate_count"] == 1


def test_failed_run_records_error_summary(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "collection.sqlite")
    run_id = storage.start_run("fixture", "fixture_import", "sample")
    storage.fail_run(run_id, "fixture transport failure")
    assert storage.get_run(run_id)["status"] == "failed"
    assert storage.get_run(run_id)["error_summary"] == "fixture transport failure"
```

- [ ] Run `uv run --no-cache python -m pytest tests/integration/test_collection_storage.py -q`; expect failure.
- [ ] In `database.py`, create parents, enable foreign keys, use `sqlite3.Row`, and initialize exactly three tables: `collection_runs`, `documents`, `annotations`. The `documents.text_hash_normalized` column must be `UNIQUE`; runs must support statuses `running`, `completed`, and `failed`; annotation labels must accept `0`, `1`, and `uncertain`.
- [ ] Implement `CollectionStorage.start_run`, `store_document`, `finish_run`, `fail_run`, and `get_run`. `store_document` must normalize and weak-label; hash optional source IDs; use one transaction; increment exactly one of `inserted_count` and `duplicate_count`; return `StoredDocument(inserted, document_id, weak_label)`.
- [ ] Run `uv run --no-cache python -m pytest tests/unit/test_collection_package.py tests/unit/test_collection_normalizer.py tests/unit/test_collection_keywords.py tests/integration/test_collection_storage.py -q`; expected PASS.
- [ ] Commit: `git add src/judol_detection/collection tests/integration/test_collection_storage.py; git commit -m "feat: add SQLite collection storage"`.

### Task 4: Add annotation history, export, and source-adapter boundary

**Files:** Create `collectors/base.py`, `scripts/export_dataset.py`, `tests/unit/test_collection_export.py`; modify `storage.py`, `docs/dataset.md`.

- [ ] Write the failing test:

```python
from judol_detection.collection.models import CollectedDocument
from judol_detection.collection.storage import CollectionStorage
from scripts.export_dataset import export_documents


def test_annotation_history_and_csv_parquet_export(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "collection.sqlite")
    run_id = storage.start_run("fixture", "fixture_import", "sample")
    stored = storage.store_document(run_id, CollectedDocument("fixture", "manual_import", "slot gacor"))
    storage.add_annotation(stored.document_id, "1", "annotator_a", "explicit promotion")
    paths = export_documents(tmp_path / "collection.sqlite", tmp_path / "exports")
    assert paths.csv_path.exists()
    assert paths.parquet_path.exists()
    assert "weak_label" in paths.csv_path.read_text(encoding="utf-8").splitlines()[0]
```

- [ ] Run `uv run --no-cache python -m pytest tests/unit/test_collection_export.py -q`; expect failure.
- [ ] Add a `Collector` protocol with `name`, `platform`, and `collect(seed_or_query) -> Iterable[CollectedDocument]`. Do not add a network collector in this feature.
- [ ] Add `CollectionStorage.add_annotation` and read-only `list_export_rows`. The export rows must preserve `weak_label`, then left-join only the newest human annotation; it must never overwrite original documents.
- [ ] Implement `export_documents(database_path, output_dir)` with pandas, write `documents.csv` and `documents.parquet`, return a frozen `ExportPaths`, and add `argparse` options `--database` plus `--output-dir` using the agreed defaults.
- [ ] Update `docs/dataset.md` to say SQLite is the operational source of truth and `weak_label` is not a final human label.
- [ ] Run full verification:

```powershell
uv run --no-cache python -m pytest
uv run --no-cache python scripts/export_dataset.py --database .\tmp-export\collection.sqlite --output-dir .\tmp-export\exports
uv run --no-cache python main.py
```

- [ ] Expected: all tests pass; exporter creates CSV and Parquet; main still prints the readiness message.
- [ ] Commit: `git add src/judol_detection/collectors/base.py scripts/export_dataset.py src/judol_detection/collection/storage.py tests/unit/test_collection_export.py docs/dataset.md; git commit -m "feat: add collection export workflow"`.

### Task 5: Record verified project state

**Files:** Modify `feature_list.json`, `claude-progress.md`, `session-handoff.md`.

- [ ] Add a collection-foundation feature as `passing` only after Task 4 succeeds; preserve browser-extension feature states.
- [ ] Record all verification commands, the SQLite path, weak-label caveat, and next action: select a permitted first source adapter.
- [ ] Run `Get-Content feature_list.json -Raw | ConvertFrom-Json | Out-Null`, `git diff --check`, and `git status --short`; expected valid JSON and no whitespace errors.
- [ ] Commit: `git add feature_list.json claude-progress.md session-handoff.md; git commit -m "docs: record collection foundation verification"`.

## Plan self-review

- The plan covers the approved folder layout, three-table database, normalization, keyword labels, exact deduplication, run lifecycle, annotation history, export, and reusable collector boundary.
- Network collection is deliberately excluded; the foundation is entirely local and testable.
- All verification is deterministic and must pass before the feature is recorded as complete.
