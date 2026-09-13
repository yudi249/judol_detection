import pytest

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
    assert storage.get_run(run_id)["fetched_count"] == 2
    assert storage.get_run(run_id)["duplicate_count"] == 1


def test_control_sample_keeps_non_candidate_for_manual_annotation(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "control.sqlite", sample_mode="control")
    run_id = storage.start_run("fixture", "fixture_import", "control")

    result = storage.store_document(
        run_id,
        CollectedDocument("fixture", "manual_import", "Berita olahraga hari ini"),
    )

    assert result.inserted is True
    assert result.weak_label == 0
    assert storage.connection.execute("SELECT COUNT(*) FROM documents").fetchone()[0] == 1


def test_control_sample_skips_empty_document(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "control-empty.sqlite", sample_mode="control")
    run_id = storage.start_run("fixture", "fixture_import", "control")

    result = storage.store_document(
        run_id,
        CollectedDocument("fixture", "manual_import", "   "),
    )

    assert result.inserted is False
    assert result.skip_reason == "empty_text"


def test_candidate_sample_mode_skips_non_candidate_by_default(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "candidate.sqlite", sample_mode="candidate")
    run_id = storage.start_run("fixture", "fixture_import", "candidate")

    result = storage.store_document(
        run_id,
        CollectedDocument("fixture", "manual_import", "Berita olahraga hari ini"),
    )

    assert result.inserted is False
    assert result.skip_reason == "non_candidate"


def test_control_sample_preserves_keyword_evidence_for_hard_negative(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "hard-control.sqlite", sample_mode="control")
    run_id = storage.start_run("fixture", "fixture_import", "control")

    result = storage.store_document(
        run_id,
        CollectedDocument("fixture", "manual_import", "Berita penindakan judi online"),
    )
    row = storage.connection.execute(
        "SELECT weak_label, matched_keywords FROM documents"
    ).fetchone()

    assert result.inserted is True
    assert row["weak_label"] == 1
    assert "judi" in row["matched_keywords"]


def test_control_sample_type_is_stored_for_auditable_provenance(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "provenance.sqlite", sample_mode="control")
    run_id = storage.start_run("fixture", "fixture_import", "control")

    storage.store_document(
        run_id,
        CollectedDocument(
            "fixture",
            "manual_import",
            "Berita olahraga hari ini",
            sample_type="natural",
        ),
    )

    row = storage.connection.execute("SELECT sample_type FROM documents").fetchone()
    assert row["sample_type"] == "natural"


def test_duplicate_control_samples_merge_sample_type_provenance(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "provenance-merge.sqlite", sample_mode="control")
    run_id = storage.start_run("fixture", "fixture_import", "control")

    storage.store_document(
        run_id,
        CollectedDocument("fixture", "manual_import", "Teks netral", sample_type="natural"),
    )
    duplicate = storage.store_document(
        run_id,
        CollectedDocument("fixture", "manual_import", "Teks netral", sample_type="hard"),
    )

    row = storage.connection.execute("SELECT sample_type FROM documents").fetchone()
    assert duplicate.skip_reason == "exact_duplicate"
    assert row["sample_type"] == "natural|hard"


def test_near_duplicate_control_samples_merge_sample_type_provenance(tmp_path) -> None:
    storage = CollectionStorage(
        tmp_path / "near-provenance-merge.sqlite",
        sample_mode="control",
        near_duplicate_threshold=0.6,
    )
    run_id = storage.start_run("fixture", "fixture_import", "control")

    storage.store_document(
        run_id,
        CollectedDocument(
            "fixture",
            "manual_import",
            "Teks netral dengan konteks tambahan",
            sample_type="natural",
        ),
    )
    duplicate = storage.store_document(
        run_id,
        CollectedDocument(
            "fixture",
            "manual_import",
            "Teks netral dengan konteks berbeda",
            sample_type="hard",
        ),
    )

    row = storage.connection.execute("SELECT sample_type FROM documents").fetchone()
    assert duplicate.skip_reason == "near_duplicate"
    assert row["sample_type"] == "natural|hard"


def test_invalid_sample_type_is_rejected(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "invalid-provenance.sqlite")
    run_id = storage.start_run("fixture", "fixture_import", "sample")

    with pytest.raises(ValueError, match="sample_type"):
        storage.store_document(
            run_id,
            CollectedDocument("fixture", "manual_import", "Teks", sample_type="other"),
        )


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


def test_storage_skips_mathematical_bold_template_with_variable_tail(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "collection.sqlite", near_duplicate_threshold=0.95)
    run_id = storage.start_run("fixture", "fixture_import", "sample")
    core = (
        "SITUS GACOR TERPERCAYA DIJAMIN MAXWIN SITUS RESMI WD "
        "BERAPAPUN DI BAYAR LUNAS MEMBER BARU DI MANJA MEMBER LAMA "
        "DI JAGA MINIMAL DEPOSIT MINIMAL WITHDRAW BONUS NEW MEMBER "
        "ROLLINGAN SLOT ARCADE GAMES BONUS ROLLINGAN KHUSUS SLOT "
        "ROLLINGAN LIVE CASINO LIVE SLOT BONUS ROLLINGAN KHUSUS LIVE "
        "CASINO ROLLINGAN POKER BONUS ROLLINGAN KHUSUS POKER LINK EXCLUSIVE"
    )
    bold_core = "".join(
        chr(0x1D5D4 + ord(character) - ord("A")) if character.isupper() else character
        for character in core
    )

    assert storage.store_document(
        run_id,
        CollectedDocument("fixture", "manual_import", f"{bold_core} merry puputt bilqis cimo"),
    ).inserted
    result = storage.store_document(
        run_id,
        CollectedDocument("fixture", "manual_import", f"{bold_core} zara pika ayrinn tina"),
    )

    assert result.inserted is False
    assert result.skip_reason == "near_duplicate"
    assert storage.get_run(run_id)["duplicate_count"] == 1
