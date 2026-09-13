from pathlib import Path
import subprocess
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FIXTURE = PROJECT_ROOT / "tests" / "fixtures" / "x_manual_response.js"
EXTENSION_FIXTURE = PROJECT_ROOT / "tests" / "fixtures" / "x_extension_export.json"


def test_dry_run_reports_file_and_batch_count() -> None:
    result = subprocess.run(
        [sys.executable, "scripts/import_x_files.py", "--input", str(FIXTURE), "--dry-run"],
        cwd=PROJECT_ROOT, capture_output=True, text=True, check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "x_manual_response" in result.stdout
    assert "batches=2" in result.stdout


def test_imports_extension_normalized_json_into_sqlite(tmp_path) -> None:
    database = tmp_path / "x-extension.sqlite"
    result = subprocess.run(
        [
            sys.executable,
            "scripts/import_x_files.py",
            "--input",
            str(EXTENSION_FIXTURE),
            "--database",
            str(database),
            "--candidate-only",
            "--language-filter",
            "strict",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "source=x_graphql_extension_json" in result.stdout


def test_control_mode_imports_extension_items_without_keyword(tmp_path) -> None:
    database = tmp_path / "x-control.sqlite"
    result = subprocess.run(
        [
            sys.executable,
            "scripts/import_x_files.py",
            "--input",
            str(EXTENSION_FIXTURE),
            "--database",
            str(database),
            "--sample-mode",
            "control",
            "--language-filter",
            "strict",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "inserted=2" in result.stdout
    assert "non_candidate=0" in result.stdout

    import sqlite3

    with sqlite3.connect(database) as connection:
        rows = connection.execute(
            "SELECT text_raw, weak_label FROM documents ORDER BY text_raw"
        ).fetchall()

    assert len(rows) == 2
    assert any(row[1] == 0 for row in rows)
