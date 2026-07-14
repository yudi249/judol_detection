from judol_detection.collection.models import CollectedDocument
from judol_detection.collection.storage import CollectionStorage


def test_store_document_deduplicates_normalized_text(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "collection.sqlite")
    run_id = storage.start_run("fixture", "fixture_import", "sample")

    first = storage.store_document(
        run_id,
        CollectedDocument("fixture", "manual_import", "Slot  Gacor"),
    )
    duplicate = storage.store_document(
        run_id,
        CollectedDocument("fixture", "manual_import", "slot gacor"),
    )
    storage.finish_run(run_id)

    assert first.inserted is True
    assert first.weak_label == 1
    assert duplicate.inserted is False
    assert storage.get_run(run_id)["inserted_count"] == 1
    assert storage.get_run(run_id)["duplicate_count"] == 1
    assert storage.get_run(run_id)["status"] == "completed"


def test_failed_run_records_error_summary(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "collection.sqlite")
    run_id = storage.start_run("fixture", "fixture_import", "sample")

    storage.fail_run(run_id, "fixture transport failure")

    assert storage.get_run(run_id)["status"] == "failed"
    assert storage.get_run(run_id)["error_summary"] == "fixture transport failure"
