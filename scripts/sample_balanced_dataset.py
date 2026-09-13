"""Create a reproducible platform/collection-pool balanced dataset sample."""

from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
import json
from pathlib import Path
import sqlite3
from typing import Any

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class SourceSpec:
    """One canonical source database and its collection-pool label."""

    platform: str
    pool_label: str
    database: Path


DEFAULT_SOURCES = (
    SourceSpec("x", "positive", Path("data/interim/x.sqlite")),
    SourceSpec("x", "negative", Path("data/interim/x_negative.sqlite")),
    SourceSpec("youtube", "positive", Path("data/interim/youtube_api_user_run.sqlite")),
    SourceSpec("youtube", "negative", Path("data/interim/youtube_negative_control.sqlite")),
    SourceSpec("telegram", "positive", Path("data/interim/telegram_full_history.sqlite")),
    SourceSpec("telegram", "negative", Path("data/interim/telegram_negative.sqlite")),
)


def _latest_annotations(connection: sqlite3.Connection) -> pd.DataFrame:
    """Summarize source annotations without treating one row as ground truth."""
    columns = {
        row[1] for row in connection.execute("PRAGMA table_info(annotations)")
    }
    if not {"annotation_id", "document_id", "label"}.issubset(columns):
        return pd.DataFrame(
            columns=["document_id", "source_annotation_count", "source_annotation_labels"]
        )
    try:
        annotations = pd.read_sql_query(
            "SELECT document_id, label FROM annotations ORDER BY annotation_id",
            connection,
        )
    except sqlite3.OperationalError:
        return pd.DataFrame(
            columns=["document_id", "source_annotation_count", "source_annotation_labels"]
        )
    if annotations.empty:
        return pd.DataFrame(
            columns=["document_id", "source_annotation_count", "source_annotation_labels"]
        )
    return (
        annotations.groupby("document_id", sort=True)
        .agg(
            source_annotation_count=("label", "size"),
            source_annotation_labels=(
                "label",
                lambda labels: json.dumps(labels.tolist(), ensure_ascii=False),
            ),
        )
        .reset_index()
    )


def _resolve_path(path: Path) -> Path:
    return path if path.is_absolute() else PROJECT_ROOT / path


def _portable_path(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def _load_source(spec: SourceSpec) -> tuple[pd.DataFrame, dict[str, int]]:
    database = _resolve_path(spec.database)
    if not database.exists():
        raise FileNotFoundError(f"Source database does not exist: {database}")

    with sqlite3.connect(database) as connection:
        frame = pd.read_sql_query("SELECT * FROM documents ORDER BY document_id", connection)
        annotations = _latest_annotations(connection)

    if "text_hash_normalized" not in frame.columns:
        raise ValueError(f"Missing text_hash_normalized in {database}")
    if "document_id" not in frame.columns:
        raise ValueError(f"Missing document_id in {database}")

    if not annotations.empty:
        frame = frame.merge(annotations, on="document_id", how="left")
    else:
        frame["source_annotation_count"] = 0
        frame["source_annotation_labels"] = pd.NA

    raw_count = len(frame)
    frame = frame.dropna(subset=["text_hash_normalized"])
    frame = frame.drop_duplicates(subset=["text_hash_normalized"], keep="first")
    frame["platform"] = spec.platform
    frame["pool_label"] = spec.pool_label
    frame["source_database"] = _portable_path(database)
    frame["source_document_id"] = frame["document_id"]
    frame["source_run_id"] = frame["run_id"] if "run_id" in frame else pd.NA
    frame["source_document_key"] = frame.apply(
        lambda row: f"{spec.platform}:{spec.pool_label}:{row['source_database']}:{row['document_id']}",
        axis=1,
    )
    return frame, {"raw": raw_count, "unique_in_source": len(frame)}


def _int_counts(frame: pd.DataFrame, columns: list[str]) -> dict[str, int]:
    return {
        "|".join(str(value) for value in values): int(len(group))
        for values, group in frame.groupby(columns, dropna=False, sort=True)
    }


def build_balanced_sample(
    sources: tuple[SourceSpec, ...] | list[SourceSpec],
    *,
    quota: int = 384,
    seed: int = 42,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Build equal samples for every platform and collection-pool stratum."""
    if quota < 1:
        raise ValueError("quota must be at least 1")
    if seed < 0:
        raise ValueError("seed must be non-negative")
    strata = [(spec.platform, spec.pool_label) for spec in sources]
    if len(strata) != len(set(strata)):
        raise ValueError("sources must contain at most one database per platform/pool stratum")
    expected_pairs = {
        (platform, pool)
        for platform in ("x", "youtube", "telegram")
        for pool in ("positive", "negative")
    }
    if set(strata) != expected_pairs:
        raise ValueError(f"sources must contain exactly these strata: {sorted(expected_pairs)}")

    loaded: list[pd.DataFrame] = []
    source_stats: dict[str, dict[str, int]] = {}
    for spec in sources:
        frame, stats = _load_source(spec)
        loaded.append(frame)
        source_stats[f"{spec.platform}:{spec.pool_label}"] = stats

    combined = pd.concat(loaded, ignore_index=True)
    conflict_groups = (
        combined.groupby(["platform", "text_hash_normalized"], sort=True)["pool_label"]
        .nunique()
    )
    conflict_index = conflict_groups[conflict_groups > 1].index
    conflict_keys = {
        (str(platform), str(text_hash))
        for platform, text_hash in conflict_index.tolist()
    }
    conflict_mask = combined.apply(
        lambda row: (row["platform"], row["text_hash_normalized"]) in conflict_keys,
        axis=1,
    )
    filtered = combined.loc[~conflict_mask].copy()
    available = _int_counts(filtered, ["platform", "pool_label"])
    expected_strata = {
        f"{platform}|{pool}"
        for platform in ("x", "youtube", "telegram")
        for pool in ("positive", "negative")
    }
    insufficient = {
        key: count
        for key, count in available.items()
        if key in expected_strata and count < quota
    }
    missing = sorted(expected_strata - set(available))
    if insufficient or missing:
        details = {**insufficient, **{key: 0 for key in missing}}
        raise ValueError(f"not enough rows for quota={quota}: {details}")

    selected_frames: list[pd.DataFrame] = []
    for platform in ("x", "youtube", "telegram"):
        for pool_label in ("positive", "negative"):
            subset = filtered[
                (filtered["platform"] == platform)
                & (filtered["pool_label"] == pool_label)
            ]
            selected_frames.append(subset.sample(n=quota, random_state=seed))

    selected = pd.concat(selected_frames, ignore_index=True)
    selected = selected.sort_values(
        ["platform", "pool_label", "source_document_key"], kind="mergesort"
    ).reset_index(drop=True)
    selected.insert(0, "selected_id", range(1, len(selected) + 1))
    manifest: dict[str, Any] = {
        "seed": seed,
        "quota_per_stratum": quota,
        "selected_rows": len(selected),
        "selected_by_stratum": _int_counts(selected, ["platform", "pool_label"]),
        "available_after_conflict_removal": available,
        "conflict_hashes_removed": len(conflict_keys),
        "conflict_rows_removed": int(conflict_mask.sum()),
        "source_stats": source_stats,
        "sources": [
            asdict(spec) | {"database": _portable_path(_resolve_path(spec.database))}
            for spec in sources
        ],
        "selected_documents": selected[
            [
                "selected_id",
                "platform",
                "pool_label",
                "source_database",
                "source_document_id",
                "text_hash_normalized",
                "source_document_key",
            ]
        ].to_dict(orient="records"),
    }
    return selected, manifest


def write_outputs(
    frame: pd.DataFrame,
    manifest: dict[str, Any],
    output_dir: Path,
) -> dict[str, Path]:
    """Write the selected frame and manifest to analysis-friendly formats."""
    output_dir.mkdir(parents=True, exist_ok=True)
    basename = f"dataset_balanced_{manifest['selected_rows']}"
    paths = {
        "sqlite": output_dir / f"{basename}.sqlite",
        "csv": output_dir / f"{basename}.csv",
        "parquet": output_dir / f"{basename}.parquet",
        "manifest": output_dir / f"{basename}_manifest.json",
    }
    frame.to_csv(paths["csv"], index=False)
    frame.to_parquet(paths["parquet"], index=False)
    with sqlite3.connect(paths["sqlite"]) as connection:
        frame.to_sql("documents", connection, if_exists="replace", index=False)
        connection.execute("DROP TABLE IF EXISTS sampling_manifest")
        connection.execute(
            "CREATE TABLE sampling_manifest (manifest_json TEXT NOT NULL)"
        )
        connection.execute(
            "INSERT INTO sampling_manifest (manifest_json) VALUES (?)",
            (json.dumps(manifest, ensure_ascii=False, sort_keys=True),),
        )
        connection.execute("DROP TABLE IF EXISTS annotations")
        connection.execute(
            """
            CREATE TABLE annotations (
                annotation_id INTEGER PRIMARY KEY,
                document_id INTEGER NOT NULL,
                label TEXT NOT NULL CHECK(label IN ('0', '1', 'uncertain')),
                annotator_id TEXT NOT NULL,
                label_source TEXT NOT NULL CHECK(label_source = 'human'),
                notes TEXT,
                annotated_at TEXT NOT NULL
            )
            """
        )
        connection.commit()
    paths["manifest"].write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False, sort_keys=True),
        encoding="utf-8",
    )
    return paths


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quota", type=int, default=384)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("data/processed"),
    )
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    selected, manifest = build_balanced_sample(
        DEFAULT_SOURCES,
        quota=args.quota,
        seed=args.seed,
    )
    if args.dry_run:
        print(json.dumps(manifest, indent=2, ensure_ascii=False, sort_keys=True))
        return
    output_dir = _resolve_path(args.output_dir)
    paths = write_outputs(selected, manifest, output_dir)
    for name, path in paths.items():
        print(f"{name.upper()}: {path}")
    print(f"SELECTED: {len(selected)}")


if __name__ == "__main__":
    main()
