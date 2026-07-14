from judol_detection.collection.models import CollectedDocument
from judol_detection.collection.storage import CollectionStorage
from scripts.export_dataset import export_documents
import subprocess
import sys


def test_annotation_history_and_csv_parquet_export(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "collection.sqlite")
    run_id = storage.start_run("fixture", "fixture_import", "sample")
    stored = storage.store_document(
        run_id,
        CollectedDocument("fixture", "manual_import", "slot gacor"),
    )
    storage.add_annotation(stored.document_id, "1", "annotator_a", "explicit promotion")

    paths = export_documents(tmp_path / "collection.sqlite", tmp_path / "exports")

    assert paths.csv_path.exists()
    assert paths.parquet_path.exists()
    assert "weak_label" in paths.csv_path.read_text(encoding="utf-8").splitlines()[0]


def test_export_script_runs_directly_from_project_root(tmp_path) -> None:
    result = subprocess.run(
        [
            sys.executable,
            "scripts/export_dataset.py",
            "--database",
            str(tmp_path / "collection.sqlite"),
            "--output-dir",
            str(tmp_path / "exports"),
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert "CSV:" in result.stdout
