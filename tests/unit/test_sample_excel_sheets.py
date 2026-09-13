from pathlib import Path
import csv

import openpyxl
import pytest

from scripts.sample_excel_sheets import main, sample_workbook


def create_workbook(path: Path) -> None:
    workbook = openpyxl.Workbook()
    large = workbook.active
    large.title = "large"
    large.append(["text", "value"])
    for index in range(405):
        large.append([f"large-{index}", index])

    small = workbook.create_sheet("small")
    small.append(["text", "value"])
    small.append(["small-0", 0])
    small.append([None, None])
    small.append(["small-1", 1])
    workbook.save(path)


def test_sample_workbook_limits_each_sheet_and_keeps_short_sheet(
    tmp_path: Path,
) -> None:
    workbook_path = tmp_path / "input.xlsx"
    create_workbook(workbook_path)

    rows, columns = sample_workbook(workbook_path, n_per_sheet=400, seed=42)

    assert len(rows) == 402
    assert columns == ["source_sheet", "text", "value"]
    assert sum(row["source_sheet"] == "large" for row in rows) == 400
    assert sum(row["source_sheet"] == "small" for row in rows) == 2
    assert {row["text"] for row in rows if row["source_sheet"] == "small"} == {
        "small-0",
        "small-1",
    }


def test_sample_workbook_is_reproducible_for_same_seed(tmp_path: Path) -> None:
    workbook_path = tmp_path / "input.xlsx"
    create_workbook(workbook_path)

    first = sample_workbook(workbook_path, n_per_sheet=20, seed=42)
    second = sample_workbook(workbook_path, n_per_sheet=20, seed=42)

    assert first == second


def test_sample_workbook_changes_large_sample_for_different_seed(
    tmp_path: Path,
) -> None:
    workbook_path = tmp_path / "input.xlsx"
    create_workbook(workbook_path)

    first_rows, _ = sample_workbook(workbook_path, n_per_sheet=20, seed=42)
    second_rows, _ = sample_workbook(workbook_path, n_per_sheet=20, seed=43)

    first_large = {
        row["text"] for row in first_rows if row["source_sheet"] == "large"
    }
    second_large = {
        row["text"] for row in second_rows if row["source_sheet"] == "large"
    }
    assert first_large != second_large


@pytest.mark.parametrize("n_per_sheet", [0, -1])
def test_sample_workbook_rejects_non_positive_quota(
    tmp_path: Path,
    n_per_sheet: int,
) -> None:
    workbook_path = tmp_path / "input.xlsx"
    create_workbook(workbook_path)

    with pytest.raises(ValueError, match="n_per_sheet must be at least 1"):
        sample_workbook(workbook_path, n_per_sheet=n_per_sheet)


def test_sample_workbook_rejects_negative_seed(tmp_path: Path) -> None:
    workbook_path = tmp_path / "input.xlsx"
    create_workbook(workbook_path)

    with pytest.raises(ValueError, match="seed must be non-negative"):
        sample_workbook(workbook_path, seed=-1)


def test_sample_workbook_rejects_source_sheet_header(tmp_path: Path) -> None:
    workbook_path = tmp_path / "input.xlsx"
    workbook = openpyxl.Workbook()
    worksheet = workbook.active
    worksheet.append(["source_sheet", "text"])
    worksheet.append(["original", "data"])
    workbook.save(workbook_path)

    with pytest.raises(ValueError, match="source_sheet is reserved"):
        sample_workbook(workbook_path)


def test_main_preserves_existing_output_when_sampling_fails(tmp_path: Path) -> None:
    workbook_path = tmp_path / "input.xlsx"
    output_path = tmp_path / "sample.csv"
    workbook = openpyxl.Workbook()
    worksheet = workbook.active
    worksheet.append(["source_sheet", "text"])
    worksheet.append(["original", "data"])
    workbook.save(workbook_path)
    output_path.write_text("old output\n", encoding="utf-8")

    with pytest.raises(ValueError, match="source_sheet is reserved"):
        main(["--input", str(workbook_path), "--output", str(output_path)])

    assert output_path.read_text(encoding="utf-8") == "old output\n"


def test_main_does_not_create_output_for_missing_input(tmp_path: Path) -> None:
    input_path = tmp_path / "missing.xlsx"
    output_path = tmp_path / "sample.csv"

    with pytest.raises(FileNotFoundError, match="input workbook does not exist"):
        main(["--input", str(input_path), "--output", str(output_path)])

    assert not output_path.exists()


def test_sample_workbook_unions_headers_and_preserves_unicode(tmp_path: Path) -> None:
    workbook_path = tmp_path / "input.xlsx"
    workbook = openpyxl.Workbook()
    first = workbook.active
    first.title = "promosi"
    first.append(["text", "label"])
    first.append(["daftar situs aman", "promosi_judol"])
    second = workbook.create_sheet("kontrol")
    second.append(["text", "source"])
    second.append(["situs normal", "berita"])
    workbook.save(workbook_path)

    rows, columns = sample_workbook(workbook_path, n_per_sheet=1, seed=42)

    assert columns == ["source_sheet", "text", "label", "source"]
    assert rows == [
        {
            "source_sheet": "promosi",
            "text": "daftar situs aman",
            "label": "promosi_judol",
        },
        {
            "source_sheet": "kontrol",
            "text": "situs normal",
            "source": "berita",
        },
    ]


def test_main_writes_combined_csv_with_sheet_provenance(tmp_path: Path) -> None:
    workbook_path = tmp_path / "input.xlsx"
    output_path = tmp_path / "nested" / "sample.csv"
    create_workbook(workbook_path)

    main(
        [
            "--input",
            str(workbook_path),
            "--output",
            str(output_path),
            "--n-per-sheet",
            "400",
            "--seed",
            "42",
        ]
    )

    with output_path.open(encoding="utf-8", newline="") as handle:
        records = list(csv.DictReader(handle))
    assert len(records) == 402
    assert list(records[0]) == ["source_sheet", "text", "value"]
    assert {record["source_sheet"] for record in records} == {"large", "small"}
