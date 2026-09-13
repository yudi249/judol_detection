"""Sample rows from every Excel sheet into one combined CSV."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
import random
import tempfile
from typing import Any, Sequence

import openpyxl


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = Path("data/processed/dataset.xlsx")
DEFAULT_OUTPUT = Path("data/processed/dataset_sampled_2384.csv")


def _resolve_path(path: Path) -> Path:
    """Resolve relative CLI paths from the repository root."""
    return path if path.is_absolute() else PROJECT_ROOT / path


def _is_non_empty_row(values: tuple[Any, ...]) -> bool:
    """Return whether a row contains at least one cell value."""
    return any(value is not None for value in values)


def _header_names(values: tuple[Any, ...]) -> list[str]:
    """Convert the first worksheet row into stable CSV column names."""
    names: list[str] = []
    for index, value in enumerate(values, start=1):
        name = str(value).strip() if value is not None else ""
        names.append(name or f"column_{index}")
    if len(names) != len(set(names)):
        raise ValueError("worksheet headers must be unique")
    return names


def sample_workbook(
    input_path: Path,
    *,
    n_per_sheet: int = 400,
    seed: int = 42,
) -> tuple[list[dict[str, Any]], list[str]]:
    """Sample up to ``n_per_sheet`` non-empty rows from every worksheet.

    Args:
        input_path: Excel workbook to read.
        n_per_sheet: Maximum number of data rows selected per sheet.
        seed: Non-negative seed for reproducible sampling.

    Returns:
        A tuple containing sampled row mappings and output column names. The
        first output column is always ``source_sheet``.

    Raises:
        FileNotFoundError: If ``input_path`` does not exist.
        ValueError: If sampling parameters or worksheet headers are invalid.
    """
    if n_per_sheet < 1:
        raise ValueError("n_per_sheet must be at least 1")
    if seed < 0:
        raise ValueError("seed must be non-negative")
    if not input_path.exists():
        raise FileNotFoundError(f"input workbook does not exist: {input_path}")

    workbook = openpyxl.load_workbook(input_path, read_only=True, data_only=True)
    rng = random.Random(seed)
    rows: list[dict[str, Any]] = []
    column_names: list[str] = []

    try:
        for worksheet in workbook.worksheets:
            iterator = worksheet.iter_rows(values_only=True)
            try:
                raw_header = tuple(next(iterator))
            except StopIteration:
                continue
            headers = _header_names(raw_header)
            if "source_sheet" in headers:
                raise ValueError("source_sheet is reserved for sheet provenance")
            for header in headers:
                if header not in column_names:
                    column_names.append(header)

            data_rows = [
                tuple(values)
                for values in iterator
                if _is_non_empty_row(tuple(values))
            ]
            selected_rows = rng.sample(data_rows, k=min(n_per_sheet, len(data_rows)))
            for values in selected_rows:
                row = {
                    header: values[index] if index < len(values) else None
                    for index, header in enumerate(headers)
                }
                row["source_sheet"] = worksheet.title
                rows.append(row)
    finally:
        workbook.close()

    return rows, ["source_sheet", *column_names]


def write_csv(
    rows: list[dict[str, Any]],
    columns: list[str],
    output_path: Path,
) -> None:
    """Write sampled rows to a UTF-8 CSV using an atomic replacement."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="",
            dir=output_path.parent,
            prefix=f".{output_path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            writer = csv.DictWriter(
                temporary_file,
                fieldnames=columns,
                extrasaction="ignore",
            )
            writer.writeheader()
            writer.writerows(rows)
        temporary_path.replace(output_path)
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()


def _parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--n-per-sheet", type=int, default=400)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> None:
    """Sample the workbook and write the combined CSV."""
    args = _parse_args(argv)
    input_path = _resolve_path(args.input)
    output_path = _resolve_path(args.output)
    rows, columns = sample_workbook(
        input_path,
        n_per_sheet=args.n_per_sheet,
        seed=args.seed,
    )
    write_csv(rows, columns, output_path)
    print(f"OUTPUT: {output_path}")
    print(f"SAMPLED: {len(rows)}")


if __name__ == "__main__":
    main()
