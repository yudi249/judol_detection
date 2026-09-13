from judol_detection.collection.deduplication import (
    canonicalize_for_deduplication,
    containment_similarity,
    is_near_duplicate,
    shared_prefix_similarity,
)


def test_canonicalization_removes_variable_promotion_parts() -> None:
    assert canonicalize_for_deduplication("DAFTAR @admin slot gacor 100% https://a.test") == "daftar slot gacor"


def test_near_duplicate_uses_jaccard_threshold() -> None:
    assert is_near_duplicate("daftar slot gacor bonus deposit", "daftar slot gacor bonus depo", threshold=0.6)
    assert not is_near_duplicate("daftar slot gacor", "berita ekonomi hari ini", threshold=0.85)


def test_containment_catches_shared_promotion_with_different_tail() -> None:
    left = "promo slot gacor bonus deposit claim sekarang daftar member"
    right = f"{left} alfa bravo charlie delta echo foxtrot golf hotel"

    assert containment_similarity(left, right) >= 0.90
    assert is_near_duplicate(left, right, threshold=0.95)


def test_shared_prefix_catches_template_with_variable_username_tail() -> None:
    core = (
        "mimin rekomendasi situs paling gacor tahun ini wananda inasultan minimal "
        "deposit bisa cuan ratusan ribu jutaan bonus menarik daftar member sekarang"
    )
    left = f"{core} ardi bima caca dino"
    right = f"{core} kiki lina mario nanda"

    assert shared_prefix_similarity(left, right) == (21, 21 / 25)
    assert is_near_duplicate(left, right, threshold=0.95)


def test_same_promotion_url_catches_short_template_with_variable_tail() -> None:
    prefix = "jam segini dyon lagi gacor gacor nya link gacor"
    left = f"{prefix} https://app.byn88link.org/neweravip wrongside lia dela beerus ayara"
    right = f"{prefix} https://app.byn88link.org/neweravip balqis almaira tania farah"

    assert shared_prefix_similarity(left, right)[0] == 9
    assert is_near_duplicate(left, right, threshold=0.95)


def test_shared_generic_url_does_not_catch_unrelated_boilerplate() -> None:
    prefix = "pemerintah mengumumkan kebijakan baru untuk masyarakat melalui siaran"
    left = f"{prefix} https://news.example/article alpha"
    right = f"{prefix} https://news.example/article beta"

    assert shared_prefix_similarity(left, right)[0] >= 8
    assert not is_near_duplicate(left, right, threshold=0.99)


def test_same_promotion_url_normalizes_scheme_and_trailing_slash() -> None:
    prefix = "situs slot gacor resmi link daftar member sekarang"
    left = f"{prefix} https://Promo.example/path alpha"
    right = f"{prefix} http://promo.example/path/ beta"

    assert is_near_duplicate(left, right, threshold=0.99)


def test_distinct_promotion_url_ports_are_not_near_duplicate() -> None:
    prefix = "situs slot gacor resmi link daftar member sekarang"
    left = f"{prefix} https://promo.example:8443/path alpha"
    right = f"{prefix} https://promo.example:9443/path beta"

    assert not is_near_duplicate(left, right, threshold=0.99)


def test_malformed_url_does_not_abort_deduplication() -> None:
    left = "promo slot gacor https://[ alpha"
    right = "promo slot gacor https://[ beta"

    assert not is_near_duplicate(left, right, threshold=0.99)


def test_same_url_without_template_prefix_is_not_near_duplicate() -> None:
    left = "berita ekonomi terbaru https://app.byn88link.org/neweravip"
    right = "cara login akun https://app.byn88link.org/neweravip"

    assert not is_near_duplicate(left, right)


def test_generic_judi_news_url_does_not_trigger_promotion_url_rule() -> None:
    prefix = "berita judi online melalui situs resmi link informasi masyarakat"
    left = f"{prefix} https://news.example/article alpha laporan kebijakan publik"
    right = f"{prefix} https://news.example/article beta arsip konferensi nasional"

    assert not is_near_duplicate(left, right, threshold=0.99)


def test_shared_prefix_normalizes_mathematical_bold_template() -> None:
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
    left = f"{bold_core} merry puputt bilqis cimo"
    right = f"{bold_core} zara pika ayrinn tina"

    assert canonicalize_for_deduplication(left).startswith("situs gacor terpercaya")
    assert is_near_duplicate(left, right, threshold=0.95)


def test_url_only_variants_are_not_near_duplicates() -> None:
    assert not is_near_duplicate(
        "https://owlmemberclickhere.com/first",
        "https://owlmemberclickhere.com/second",
    )
    assert not is_near_duplicate("t.me/owlmember/1", "t.me/owlmember/2")
    assert not is_near_duplicate("t.me/owl\u200bmember/1", "t.me/owl\u200bmember/2")
    assert not is_near_duplicate("t.\u200bme/owlmember/1", "t.\u200bme/owlmember/2")
    assert not is_near_duplicate("t\u200b.me/owlmember/1", "t\u200b.me/owlmember/2")
    assert not is_near_duplicate("t.m\u200be/owlmember/1", "t.m\u200be/owlmember/2")
    assert not is_near_duplicate("t.me\u200b/owlmember/1", "t.me\u200b/owlmember/2")


def test_format_characters_preserve_word_boundaries_for_matching() -> None:
    assert canonicalize_for_deduplication("SITUS\u200bGACOR") == "situs gacor"
    assert is_near_duplicate("SITUS\u200bGACOR bonus deposit", "SITUS GACOR bonus deposit")
