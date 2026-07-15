from judol_detection.collection.keywords import classify_weak_label


def test_keyword_match_is_a_positive_weak_label() -> None:
    result = classify_weak_label("Bonus deposit slot gacor")

    assert result.label == 1
    assert "bonus deposit" in result.matched_keywords
    assert "slot gacor" in result.matched_keywords
    assert result.reason == "strong:bonus deposit|slot gacor"


def test_no_keyword_match_is_a_negative_weak_label() -> None:
    result = classify_weak_label("Berita olahraga hari ini")

    assert result.label == 0
    assert result.matched_keywords == ()
    assert result.reason == "no_keyword_match"


def test_supporting_term_alone_is_not_positive() -> None:
    assert classify_weak_label("bonus akhir tahun").label == 0
    assert classify_weak_label("untung investasi").label == 0


def test_phrase_and_contact_evidence_make_candidate_positive() -> None:
    assert classify_weak_label("bonus deposit untuk member").reason == "strong:bonus deposit"
    assert classify_weak_label("deposit https://contoh.test").reason == "supporting:deposit+contact"
