from judol_detection.collection.models import CollectedDocument
from judol_detection.collection.storage import CollectionStorage


def test_storage_records_x_query_run_summary(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "x.sqlite")
    run_id = storage.start_run("x", "x_camoufox_manual", "slot")

    storage.record_x_query_result(
        run_id, "slot", scrolls=3, responses_seen=2, posts_observed=20,
        inserted_count=4, duplicate_count=6, stop_reason="manual_stop",
    )

    row = storage.connection.execute("SELECT * FROM x_query_runs WHERE run_id = ?", (run_id,)).fetchone()
    assert dict(row)["query"] == "slot"
    assert dict(row)["stop_reason"] == "manual_stop"


def test_manual_x_documents_are_stored_incrementally(tmp_path) -> None:
    storage = CollectionStorage(
        tmp_path / "x.sqlite",
        candidate_only=True,
        language_filter="strict",
    )
    run_id = storage.start_run(
        "x", "x_camoufox_manual", "slot", {"mode": "manual", "browser_backend": "camoufox"}
    )

    result = storage.store_document(
        run_id,
        CollectedDocument(
            platform="x",
            source_type="x_search_timeline_latest",
            text_raw="slot gacor bonus deposit",
            source_item_id="123",
        ),
    )

    assert result.inserted is True
    row = storage.connection.execute("SELECT text_raw FROM documents").fetchone()
    assert row["text_raw"] == "slot gacor bonus deposit"
