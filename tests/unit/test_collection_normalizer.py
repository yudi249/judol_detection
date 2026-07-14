from judol_detection.collection.normalizer import normalize_document_text


def test_normalization_keeps_raw_text_and_flags_zero_width() -> None:
    result = normalize_document_text("SLOT\u200b MAXWIN")

    assert result.raw_text == "SLOT\u200b MAXWIN"
    assert result.normalized_text == "slot maxwin"
    assert result.unicode_flags == ("zero_width",)
    assert len(result.raw_hash) == 64
    assert len(result.normalized_hash) == 64


def test_normalization_collapses_whitespace_deterministically() -> None:
    assert normalize_document_text(" slot   gacor ").normalized_text == "slot gacor"
