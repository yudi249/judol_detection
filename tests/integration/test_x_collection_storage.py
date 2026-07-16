from judol_detection.collection.storage import CollectionStorage


def test_storage_records_x_query_run_summary(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "x.sqlite")
    run_id = storage.start_run("x", "x_playwright_search_timeline", "slot")

    storage.record_x_query_result(
        run_id, "slot", scrolls=3, responses_seen=2, posts_observed=20,
        inserted_count=4, duplicate_count=6, stop_reason="max_posts",
    )

    row = storage.connection.execute("SELECT * FROM x_query_runs WHERE run_id = ?", (run_id,)).fetchone()
    assert dict(row)["query"] == "slot"
    assert dict(row)["stop_reason"] == "max_posts"
