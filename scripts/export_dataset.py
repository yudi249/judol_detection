"""Export collection records from SQLite to analysis-friendly files."""

import argparse
from dataclasses import dataclass
from pathlib import Path
import sys

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from judol_detection.collection.storage import CollectionStorage


@dataclass(frozen=True)
class ExportPaths:
    csv_path: Path
    parquet_path: Path


def export_documents(database_path: Path, output_dir: Path) -> ExportPaths:
    """Write all documents plus their latest human annotation to CSV and Parquet."""
    output_dir.mkdir(parents=True, exist_ok=True)
    rows = CollectionStorage(database_path).list_export_rows()
    frame = pd.DataFrame(rows)
    csv_path = output_dir / "documents.csv"
    parquet_path = output_dir / "documents.parquet"
    frame.to_csv(csv_path, index=False)
    frame.to_parquet(parquet_path, index=False)
    return ExportPaths(csv_path=csv_path, parquet_path=parquet_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export collection SQLite records.")
    parser.add_argument("--database", type=Path, default=Path("data/interim/collection.sqlite"))
    parser.add_argument("--output-dir", type=Path, default=Path("data/interim/exports"))
    args = parser.parse_args()
    paths = export_documents(args.database, args.output_dir)
    print(f"CSV: {paths.csv_path}")
    print(f"Parquet: {paths.parquet_path}")


if __name__ == "__main__":
    main()
