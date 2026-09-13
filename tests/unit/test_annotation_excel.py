from pathlib import Path

import pandas as pd
import pytest

from judol_detection.annotation.excel import (
    InvalidRowIdentity,
    load_annotation_sheet,
)


def test_load_annotation_sheet_creates_stable_ids_and_preserves_valid_labels(
    tmp_path: Path,
) -> None:
    source = tmp_path / "input.xlsx"
    pd.DataFrame(
        {
            "text_raw": ["promo", "clean", "empty"],
            "label": ["promosi_judol", "", None],
        }
    ).to_excel(source, index=False, sheet_name="Sheet1")

    loaded = load_annotation_sheet(source, sheet_name=None, text_column="text_raw")

    assert loaded.sheet_name == "Sheet1"
    assert loaded.row_ids == ["Sheet1:2", "Sheet1:3", "Sheet1:4"]
    assert loaded.frame.loc[0, "label"] == "promosi_judol"
    assert pd.isna(loaded.frame.loc[1, "label"])
    assert pd.isna(loaded.frame.loc[2, "label"])


def test_load_annotation_sheet_rejects_empty_or_duplicate_row_ids(tmp_path: Path) -> None:
    source = tmp_path / "input.xlsx"
    pd.DataFrame(
        {"row_id": ["a", "a"], "text_raw": ["one", "two"]}
    ).to_excel(source, index=False)

    with pytest.raises(InvalidRowIdentity, match="unique"):
        load_annotation_sheet(source, sheet_name=None, text_column="text_raw")


def test_load_annotation_sheet_rejects_missing_text_column(tmp_path: Path) -> None:
    source = tmp_path / "input.xlsx"
    pd.DataFrame({"message": ["one"]}).to_excel(source, index=False)

    with pytest.raises(ValueError, match="text_raw"):
        load_annotation_sheet(source, sheet_name=None, text_column="text_raw")
