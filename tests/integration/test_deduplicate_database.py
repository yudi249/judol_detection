import sqlite3

import pytest

from judol_detection.collection.models import CollectedDocument
from judol_detection.collection.storage import CollectionStorage
from scripts.deduplicate_database import deduplicate_database


def _make_database(path) -> tuple[int, int]:
    storage = CollectionStorage(path)
    run_id = storage.start_run("telegram", "fixture", "seed")
    first = storage.store_document(
        run_id,
        CollectedDocument("telegram", "fixture", "slot gacor bonus deposit sekarang"),
    )
    duplicate = storage.store_document(
        run_id,
        CollectedDocument("telegram", "fixture", "slot gacor bonus deposit besok"),
    )
    storage.store_document(
        run_id,
        CollectedDocument("telegram", "fixture", "berita ekonomi nasional hari ini"),
    )
    assert first.document_id is not None
    assert duplicate.document_id is not None
    storage.add_annotation(duplicate.document_id, "1", "annotator-1", "keep evidence")
    storage.finish_run(run_id)
    storage.connection.close()
    return first.document_id, duplicate.document_id


def test_cleanup_creates_copy_removes_near_duplicates_and_reassigns_annotations(tmp_path) -> None:
    source = tmp_path / "telegram.sqlite"
    output = tmp_path / "telegram_dedup.sqlite"
    canonical_id, duplicate_id = _make_database(source)

    stats = deduplicate_database(source, output, threshold=0.60)

    assert stats.input_count == 3
    assert stats.removed_count == 1
    assert stats.output_count == 2
    with sqlite3.connect(source) as connection:
        assert connection.execute("SELECT COUNT(*) FROM documents").fetchone()[0] == 3
        assert connection.execute("SELECT document_id FROM annotations").fetchone()[0] == duplicate_id
    with sqlite3.connect(output) as connection:
        assert connection.execute("SELECT COUNT(*) FROM documents").fetchone()[0] == 2
        assert connection.execute("SELECT document_id FROM annotations").fetchone()[0] == canonical_id
        assert connection.execute("SELECT COUNT(*) FROM collection_runs").fetchone()[0] == 1


def test_cleanup_removes_short_same_url_template_variants(tmp_path) -> None:
    source = tmp_path / "telegram.sqlite"
    output = tmp_path / "telegram_dedup.sqlite"
    storage = CollectionStorage(source)
    run_id = storage.start_run("telegram", "fixture", "seed")
    prefix = "jam segini dyon lagi gacor gacor nya link gacor"
    first = storage.store_document(
        run_id,
        CollectedDocument(
            "telegram",
            "fixture",
            f"{prefix} https://app.byn88link.org/neweravip wrongside lia dela beerus ayara",
        ),
    )
    duplicate = storage.store_document(
        run_id,
        CollectedDocument(
            "telegram",
            "fixture",
            f"{prefix} https://app.byn88link.org/neweravip balqis almaira tania farah",
        ),
    )
    storage.finish_run(run_id)
    storage.connection.close()

    assert first.inserted is True
    assert duplicate.inserted is True

    stats = deduplicate_database(source, output, threshold=0.85)

    assert stats.input_count == 2
    assert stats.removed_count == 1
    assert stats.output_count == 1


def test_cleanup_preserves_distinct_messages_with_shared_generic_url(tmp_path) -> None:
    source = tmp_path / "telegram.sqlite"
    output = tmp_path / "telegram_dedup.sqlite"
    storage = CollectionStorage(source)
    run_id = storage.start_run("telegram", "fixture", "seed")
    prefix = "pemerintah mengumumkan kebijakan baru untuk masyarakat melalui siaran"
    storage.store_document(
        run_id,
        CollectedDocument("telegram", "fixture", f"{prefix} https://news.example/article alpha"),
    )
    storage.store_document(
        run_id,
        CollectedDocument("telegram", "fixture", f"{prefix} https://news.example/article beta"),
    )
    storage.finish_run(run_id)
    storage.connection.close()

    stats = deduplicate_database(source, output, threshold=0.99)

    assert stats.input_count == 2
    assert stats.removed_count == 0
    assert stats.output_count == 2


def test_cleanup_snapshots_wal_database_before_removing_duplicates(tmp_path) -> None:
    source = tmp_path / "telegram.sqlite"
    output = tmp_path / "telegram_dedup.sqlite"
    storage = CollectionStorage(source)
    storage.connection.execute("PRAGMA journal_mode = WAL")
    run_id = storage.start_run("telegram", "fixture", "seed")
    storage.store_document(
        run_id,
        CollectedDocument("telegram", "fixture", "slot gacor bonus deposit alpha"),
    )
    storage.store_document(
        run_id,
        CollectedDocument("telegram", "fixture", "berita ekonomi nasional beta"),
    )
    storage.finish_run(run_id)
    assert source.with_name(f"{source.name}-wal").exists()

    stats = deduplicate_database(source, output, threshold=0.99)

    assert stats.input_count == 2
    assert stats.removed_count == 0
    assert stats.output_count == 2
    with sqlite3.connect(output) as connection:
        assert connection.execute("SELECT COUNT(*) FROM documents").fetchone()[0] == 2
    storage.connection.close()


def test_cleanup_rejects_same_input_and_output_path(tmp_path) -> None:
    source = tmp_path / "telegram.sqlite"
    _make_database(source)

    with pytest.raises(ValueError, match="different"):
        deduplicate_database(source, source, threshold=0.75)
