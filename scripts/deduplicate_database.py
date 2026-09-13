"""Create a near-duplicate-cleaned copy of a collection SQLite database."""

from __future__ import annotations

import argparse
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from judol_detection.collection.deduplication import is_near_duplicate


@dataclass(frozen=True)
class CleanupStats:
    input_count: int
    removed_count: int
    output_count: int


def _read_document_count(database_path: Path) -> int:
    with sqlite3.connect(f"{database_path.as_uri()}?mode=ro", uri=True) as connection:
        return int(connection.execute("SELECT COUNT(*) FROM documents").fetchone()[0])


def deduplicate_database(
    input_path: Path,
    output_path: Path,
    *,
    threshold: float = 0.75,
) -> CleanupStats:
    """Copy a collection database and remove later near-duplicate documents."""
    input_path = input_path.resolve()
    output_path = output_path.resolve()
    if not input_path.is_file():
        raise FileNotFoundError(f"Input database does not exist: {input_path}")
    if input_path == output_path:
        raise ValueError("Input and output database paths must be different")
    if output_path.exists():
        raise FileExistsError(f"Output database already exists: {output_path}")
    if not 0 <= threshold <= 1:
        raise ValueError("threshold must be between 0 and 1")

    # Open the source read-only before copying so the source is never modified.
    output_path.parent.mkdir(parents=True, exist_ok=True)
    # Create one consistent snapshot first, including committed WAL pages.
    with sqlite3.connect(f"{input_path.as_uri()}?mode=ro", uri=True) as source, sqlite3.connect(output_path) as snapshot:
        source.backup(snapshot)
    with sqlite3.connect(output_path) as snapshot:
        documents = snapshot.execute(
            "SELECT document_id, text_raw FROM documents ORDER BY document_id"
        ).fetchall()
    retained: list[tuple[int, str]] = []
    duplicate_pairs: list[tuple[int, int]] = []
    for document_id, text_raw in documents:
        canonical = next(
            (
                canonical
                for canonical in retained
                if is_near_duplicate(text_raw, canonical[1], threshold=threshold)
            ),
            None,
        )
        if canonical is None:
            retained.append((document_id, text_raw))
        else:
            duplicate_pairs.append((document_id, canonical[0]))

    try:
        with sqlite3.connect(output_path) as connection:
            connection.execute("PRAGMA foreign_keys = ON")
            with connection:
                for duplicate_id, canonical_id in duplicate_pairs:
                    connection.execute(
                        "UPDATE annotations SET document_id = ? WHERE document_id = ?",
                        (canonical_id, duplicate_id),
                    )
                    connection.execute(
                        "DELETE FROM documents WHERE document_id = ?",
                        (duplicate_id,),
                    )
    except Exception:
        output_path.unlink(missing_ok=True)
        raise

    return CleanupStats(
        input_count=len(documents),
        removed_count=len(duplicate_pairs),
        output_count=len(retained),
    )


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Create a near-duplicate-cleaned copy of a collection SQLite database."
    )
    parser.add_argument("--database", type=Path, required=True, help="Input SQLite database")
    parser.add_argument("--output", type=Path, required=True, help="New SQLite database to create")
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.75,
        help="Jaccard threshold from 0 to 1 (default: 0.75)",
    )
    return parser


def main() -> None:
    args = _build_parser().parse_args()
    try:
        stats = deduplicate_database(args.database, args.output, threshold=args.threshold)
    except (FileExistsError, FileNotFoundError, ValueError, sqlite3.Error) as error:
        raise SystemExit(f"cleanup failed: {error}") from error
    print(f"input_documents={stats.input_count}")
    print(f"near_duplicates_removed={stats.removed_count}")
    print(f"output_documents={stats.output_count}")
    print(f"threshold={args.threshold}")
    print(f"output={args.output.resolve()}")


if __name__ == "__main__":
    main()
