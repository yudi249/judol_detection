import json
import sqlite3
from pathlib import Path

import pandas as pd
import pytest

from scripts.sample_balanced_dataset import (
    SourceSpec,
    build_balanced_sample,
    write_outputs,
)


def create_source_database(
    path: Path,
    rows: list[tuple[str, str]],
    *,
    reverse_insert_order: bool = False,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as connection:
        connection.executescript(
            """
            DROP TABLE IF EXISTS documents;
            DROP TABLE IF EXISTS annotations;
            CREATE TABLE documents (
                document_id INTEGER PRIMARY KEY,
                platform TEXT NOT NULL,
                source_type TEXT NOT NULL,
                text_raw TEXT NOT NULL,
                text_normalized TEXT NOT NULL,
                text_hash_normalized TEXT NOT NULL,
                weak_label INTEGER NOT NULL,
                run_id INTEGER NOT NULL,
                sample_type TEXT
            );
            CREATE TABLE annotations (
                annotation_id INTEGER PRIMARY KEY,
                document_id INTEGER NOT NULL,
                label TEXT NOT NULL,
                annotated_at TEXT NOT NULL
            );
            """
        )
        records = list(enumerate(rows, start=1))
        if reverse_insert_order:
            records.reverse()
        connection.executemany(
            """INSERT INTO documents
                (document_id, platform, source_type, text_raw, text_normalized,
                 text_hash_normalized, weak_label, run_id, sample_type)
                VALUES (?, 'fixture', 'fixture', ?, ?, ?, 0, 1, NULL)""",
            [(index, text, text.lower(), text_hash) for index, (text, text_hash) in records],
        )


def specs(tmp_path: Path) -> list[SourceSpec]:
    return [
        SourceSpec("x", "positive", tmp_path / "x-positive.sqlite"),
        SourceSpec("x", "negative", tmp_path / "x-negative.sqlite"),
        SourceSpec("youtube", "positive", tmp_path / "youtube-positive.sqlite"),
        SourceSpec("youtube", "negative", tmp_path / "youtube-negative.sqlite"),
        SourceSpec("telegram", "positive", tmp_path / "telegram-positive.sqlite"),
        SourceSpec("telegram", "negative", tmp_path / "telegram-negative.sqlite"),
    ]


def populate_sources(tmp_path: Path, count: int = 4) -> list[SourceSpec]:
    source_specs = specs(tmp_path)
    for index, spec in enumerate(source_specs):
        rows = [(f"{spec.platform}-{spec.pool_label}-{i}", f"{index}-{i}") for i in range(count)]
        create_source_database(spec.database, rows)
    return source_specs


def test_build_balanced_sample_returns_equal_six_strata(tmp_path: Path) -> None:
    source_specs = populate_sources(tmp_path)

    frame, manifest = build_balanced_sample(source_specs, quota=4, seed=42)

    assert len(frame) == 24
    assert frame.groupby(["platform", "pool_label"]).size().to_dict() == {
        ("telegram", "negative"): 4,
        ("telegram", "positive"): 4,
        ("x", "negative"): 4,
        ("x", "positive"): 4,
        ("youtube", "negative"): 4,
        ("youtube", "positive"): 4,
    }
    assert manifest["quota_per_stratum"] == 4
    assert manifest["seed"] == 42


def test_overlap_hash_is_excluded_from_both_pools(tmp_path: Path) -> None:
    source_specs = populate_sources(tmp_path, count=5)
    create_source_database(
        source_specs[1].database,
        [("shared", "0-0")]
        + [(f"x-negative-{i}", f"negative-only-{i}") for i in range(4)],
    )

    frame, manifest = build_balanced_sample(source_specs, quota=4, seed=42)

    assert manifest["conflict_hashes_removed"] == 1
    assert manifest["conflict_rows_removed"] == 2
    assert "0-0" not in set(frame["text_hash_normalized"])


def test_sampling_is_reproducible(tmp_path: Path) -> None:
    ordered_specs = populate_sources(tmp_path / "ordered", count=8)
    reordered_specs = specs(tmp_path / "reordered")
    for index, spec in enumerate(reordered_specs):
        rows = [(f"{spec.platform}-{spec.pool_label}-{i}", f"{index}-{i}") for i in range(8)]
        spec.database.parent.mkdir(parents=True, exist_ok=True)
        create_source_database(spec.database, rows, reverse_insert_order=True)

    first, _ = build_balanced_sample(ordered_specs, quota=4, seed=42)
    second, _ = build_balanced_sample(reordered_specs, quota=4, seed=42)

    assert first["text_hash_normalized"].tolist() == second["text_hash_normalized"].tolist()


def test_source_annotations_are_preserved_as_a_summary(tmp_path: Path) -> None:
    source_specs = populate_sources(tmp_path)
    with sqlite3.connect(source_specs[0].database) as connection:
        connection.executemany(
            "INSERT INTO annotations (document_id, label, annotated_at) VALUES (?, ?, ?)",
            [(1, "1", "2026-08-17T10:00:00Z"), (1, "0", "2026-08-17T11:00:00Z")],
        )

    frame, _ = build_balanced_sample(source_specs, quota=4, seed=42)

    row = frame.loc[
        (frame["platform"] == "x")
        & (frame["pool_label"] == "positive")
        & (frame["source_document_id"] == 1)
    ].iloc[0]
    assert row["source_annotation_count"] == 2
    assert json.loads(row["source_annotation_labels"]) == ["1", "0"]


def test_write_outputs_creates_sqlite_csv_parquet_and_manifest(tmp_path: Path) -> None:
    source_specs = populate_sources(tmp_path)
    frame, manifest = build_balanced_sample(source_specs, quota=4, seed=42)
    output_dir = tmp_path / "output"

    paths = write_outputs(frame, manifest, output_dir)

    assert all(path.exists() for path in paths.values())
    assert paths["sqlite"].name == "dataset_balanced_24.sqlite"
    assert pd.read_csv(paths["csv"]).shape[0] == 24
    assert json.loads(paths["manifest"].read_text(encoding="utf-8"))["selected_rows"] == 24
    with sqlite3.connect(paths["sqlite"]) as connection:
        assert connection.execute("SELECT COUNT(*) FROM documents").fetchone()[0] == 24
        assert connection.execute("SELECT COUNT(*) FROM sampling_manifest").fetchone()[0] == 1
        assert connection.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'annotations'"
        ).fetchone()[0] == 1
