from pathlib import Path

from judol_detection.collection.storage import CollectionStorage
from judol_detection.collectors.x import XSearchTimelineParser
from judol_detection.collectors.x_file import load_x_response_batches


FIXTURE = Path(__file__).parents[1] / "fixtures" / "x_manual_response.js"


def test_manual_file_batch_stores_candidate_once(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "x.sqlite", candidate_only=True, language_filter="strict")
    run_id = storage.start_run("x", "x_manual_file_import", "x_manual_response")
    documents = XSearchTimelineParser().parse_response(
        load_x_response_batches(FIXTURE)[0],
        query="x_manual_response",
        source_type="x_search_timeline_manual_file",
    )

    result = storage.store_document(run_id, documents[0])

    assert result.inserted is True
    row = storage.connection.execute("SELECT source_type FROM documents").fetchone()
    assert row["source_type"] == "x_search_timeline_manual_file"
