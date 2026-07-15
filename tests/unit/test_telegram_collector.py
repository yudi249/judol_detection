from judol_detection.collectors.telegram import TelegramSnowballQueue, extract_public_channel_candidates


def test_extract_candidates_requires_evidence() -> None:
    text = "Daftar di https://t.me/SlotChannel atau @PromoSlot"
    assert extract_public_channel_candidates(text, has_evidence=False) == ()
    assert extract_public_channel_candidates(text, has_evidence=True) == ("promoslot", "slotchannel")


def test_queue_deduplicates_and_limits_depth() -> None:
    queue = TelegramSnowballQueue(max_channels=50)
    assert queue.enqueue("SeedChannel", depth=0, found_from=None, evidence="seed") is True
    assert queue.enqueue("seedchannel", depth=0, found_from=None, evidence="seed") is False
    assert queue.enqueue("too_deep", depth=2, found_from="seedchannel", evidence="keyword") is False
    item = queue.pop()
    assert item.username == "seedchannel"
    assert item.depth == 0
