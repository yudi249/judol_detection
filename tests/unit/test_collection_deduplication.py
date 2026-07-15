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
