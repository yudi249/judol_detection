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


def test_candidate_only_and_near_duplicates_are_skipped(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "collection.sqlite", candidate_only=True, near_duplicate_threshold=0.6)
    run_id = storage.start_run("fixture", "fixture_import", "sample")
    assert storage.store_document(run_id, CollectedDocument("fixture", "manual_import", "berita olahraga")).skip_reason == "non_candidate"
    assert storage.store_document(run_id, CollectedDocument("fixture", "manual_import", "slot gacor bonus deposit 100% https://a.test")).inserted
    assert storage.store_document(run_id, CollectedDocument("fixture", "manual_import", "slot gacor bonus depo 200% https://b.test")).skip_reason == "near_duplicate"


def test_storage_skips_promotion_contained_in_a_longer_template(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "collection.sqlite", near_duplicate_threshold=0.95)
    run_id = storage.start_run("fixture", "fixture_import", "sample")
    core_promotion = "slot gacor bonus deposit claim sekarang daftar member"

    assert storage.store_document(run_id, CollectedDocument("fixture", "manual_import", core_promotion)).inserted
    result = storage.store_document(
        run_id,
        CollectedDocument("fixture", "manual_import", f"{core_promotion} alfa bravo charlie delta echo foxtrot"),
    )

    assert result.inserted is False
    assert result.skip_reason == "near_duplicate"


def test_storage_skips_template_with_long_shared_prefix_and_variable_tail(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "collection.sqlite", near_duplicate_threshold=0.95)
    run_id = storage.start_run("fixture", "fixture_import", "sample")
    core = (
        "mimin rekomendasi situs paling gacor tahun ini wananda inasultan minimal "
        "deposit bisa cuan ratusan ribu jutaan bonus menarik daftar member sekarang"
    )

    assert storage.store_document(
        run_id,
        CollectedDocument("fixture", "manual_import", f"{core} ardi bima caca dino"),
    ).inserted
    result = storage.store_document(
        run_id,
        CollectedDocument("fixture", "manual_import", f"{core} kiki lina mario nanda"),
    )

    assert result.inserted is False
    assert result.skip_reason == "near_duplicate"
