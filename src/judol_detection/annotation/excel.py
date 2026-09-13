"""Excel input loading and atomic annotation output helpers."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd


class InvalidRowIdentity(ValueError):
    """Raised when an existing row_id column is not usable."""


@dataclass(frozen=True)
class AnnotationSheet:
    """A selected workbook sheet prepared for annotation."""

    frame: pd.DataFrame
    sheet_name: str
    text_column: str
    row_ids: list[str]


def _is_missing(value: Any) -> bool:
    return value is None or bool(pd.isna(value))


def load_annotation_sheet(
    path: Path,
    *,
    sheet_name: str | None,
    text_column: str = "text_raw",
) -> AnnotationSheet:
    """Load one Excel sheet and validate its annotation identity columns."""
    if not path.exists():
        raise FileNotFoundError(path)
    if path.suffix.lower() != ".xlsx":
        raise ValueError("input must be an .xlsx workbook")

    workbook = pd.ExcelFile(path, engine="openpyxl")
    selected_sheet = sheet_name or workbook.sheet_names[0]
    if selected_sheet not in workbook.sheet_names:
        raise ValueError(f"sheet not found: {selected_sheet}")

    frame = pd.read_excel(workbook, sheet_name=selected_sheet, engine="openpyxl")
    if text_column not in frame.columns:
        raise ValueError(f"text column not found: {text_column}")

    if "row_id" in frame.columns:
        row_ids: list[str] = []
        for index, value in enumerate(frame["row_id"].tolist(), start=2):
            if _is_missing(value) or not str(value).strip():
                raise InvalidRowIdentity(f"row_id at Excel row {index} is empty")
            row_ids.append(str(value).strip())
        if len(set(row_ids)) != len(row_ids):
            raise InvalidRowIdentity("row_id values must be unique")
    else:
        row_ids = [f"{selected_sheet}:{index}" for index in range(2, len(frame) + 2)]

    return AnnotationSheet(
        frame=frame,
        sheet_name=selected_sheet,
        text_column=text_column,
        row_ids=row_ids,
    )
