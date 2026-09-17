from apps.api.app.services.unicode_evidence import UnicodeEvidenceSpan, analyze_unicode_evidence


def test_unicode_evidence_reports_original_offsets_without_normalizing_text() -> None:
    evidence = analyze_unicode_evidence("bοnus slοt")

    assert evidence.has_suspicious_unicode is True
    assert [span.normalized_as for span in evidence.spans] == ["o", "o"]
    assert [(span.start, span.end) for span in evidence.spans] == [(1, 2), (8, 9)]
    assert [span.char for span in evidence.spans] == ["ο", "ο"]


def test_ascii_text_has_no_unicode_evidence() -> None:
    evidence = analyze_unicode_evidence("bonus slot")

    assert evidence.has_suspicious_unicode is False
    assert evidence.suspicious_count == 0
    assert evidence.spans == []


def test_unicode_evidence_reports_supported_cyrillic_lookalikes() -> None:
    evidence = analyze_unicode_evidence("аерсхѕ")

    assert [span.normalized_as for span in evidence.spans] == ["a", "e", "p", "c", "x", "s"]
    assert [span.unicode_name for span in evidence.spans] == [
        "CYRILLIC SMALL LETTER A",
        "CYRILLIC SMALL LETTER IE",
        "CYRILLIC SMALL LETTER ER",
        "CYRILLIC SMALL LETTER ES",
        "CYRILLIC SMALL LETTER HA",
        "CYRILLIC SMALL LETTER DZE",
    ]


def test_invisible_zero_width_character_preserves_exact_original_span() -> None:
    text = "slot\u200bbonus"

    evidence = analyze_unicode_evidence(text)

    assert evidence.spans == [
        UnicodeEvidenceSpan(
            start=4,
            end=5,
            char="\u200b",
            reason="invisible",
            unicode_name="ZERO WIDTH SPACE",
        )
    ]
