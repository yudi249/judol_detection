import asyncio

import pytest

from judol_detection.annotation.quota import QuotaExceeded, QuotaTracker, estimate_tokens


def test_estimate_tokens_includes_input_and_output() -> None:
    estimate = estimate_tokens("abcd", "efgh", "{\"label\":\"x\"}")

    assert estimate >= 3


def test_quota_tracker_reserves_without_exceeding_total() -> None:
    tracker = QuotaTracker(max_total_tokens=10)

    assert tracker.try_reserve(6) is True
    assert tracker.try_reserve(5) is False
    tracker.record_actual(4)
    assert tracker.actual_tokens == 4
    assert tracker.reserved_tokens == 6


def test_quota_tracker_without_limit_allows_reservations() -> None:
    tracker = QuotaTracker(max_total_tokens=None)

    assert tracker.try_reserve(1_000_000) is True
    assert tracker.reserved_tokens == 1_000_000


def test_quota_tracker_reservations_are_safe_for_concurrent_tasks() -> None:
    tracker = QuotaTracker(max_total_tokens=10)

    async def reserve_both() -> list[bool]:
        return list(await asyncio.gather(*(tracker.reserve(6) for _ in range(2))))

    results = asyncio.run(reserve_both())

    assert results.count(True) == 1
    assert results.count(False) == 1


def test_quota_tracker_raises_when_requested() -> None:
    tracker = QuotaTracker(max_total_tokens=2)
    tracker.reserve_or_raise(2)

    with pytest.raises(QuotaExceeded):
        tracker.reserve_or_raise(1)


def test_actual_usage_raises_reservation_watermark() -> None:
    tracker = QuotaTracker(max_total_tokens=10)
    tracker.try_reserve(4)
    tracker.record_actual(8)

    assert tracker.actual_tokens == 8
    assert tracker.reserved_tokens == 8
    assert tracker.try_reserve(3) is False
