from judol_detection.collection.keywords import classify_weak_label


def test_keyword_match_is_a_positive_weak_label() -> None:
    result = classify_weak_label("Bonus deposit slot gacor")

    assert result.label == 1
    assert result.matched_keywords == ("bonus", "deposit", "gacor", "slot")
    assert result.reason == "keyword:bonus|deposit|gacor|slot"


def test_no_keyword_match_is_a_negative_weak_label() -> None:
    result = classify_weak_label("Berita olahraga hari ini")

    assert result.label == 0
    assert result.matched_keywords == ()
    assert result.reason == "no_keyword_match"
