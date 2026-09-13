"""Conservative token estimation and total-quota tracking."""

from __future__ import annotations

import asyncio
import math


class QuotaExceeded(RuntimeError):
    """Raised when a new estimated request cannot fit the configured quota."""


def estimate_tokens(*parts: str, overhead_tokens: int = 32) -> int:
    """Estimate input and output tokens conservatively without a model tokenizer."""
    character_estimate = sum(max(1, math.ceil(len(part) / 4)) for part in parts)
    return character_estimate + overhead_tokens


class QuotaTracker:
    """Track cumulative reservations and usage for concurrent requests."""

    def __init__(self, max_total_tokens: int | None) -> None:
        if max_total_tokens is not None and max_total_tokens < 0:
            raise ValueError("max_total_tokens cannot be negative")
        self.max_total_tokens = max_total_tokens
        self.reserved_tokens = 0
        self.actual_tokens = 0
        self._lock = asyncio.Lock()

    def try_reserve(self, tokens: int) -> bool:
        """Synchronously reserve tokens for single-threaded preflight use."""
        if tokens < 0:
            raise ValueError("tokens cannot be negative")
        if self.max_total_tokens is not None and self.reserved_tokens + tokens > self.max_total_tokens:
            return False
        self.reserved_tokens += tokens
        return True

    async def reserve(self, tokens: int) -> bool:
        """Reserve tokens safely while tasks are running concurrently."""
        async with self._lock:
            return self.try_reserve(tokens)

    async def reserve_unlimited(self, tokens: int) -> None:
        """Record an estimate after the user explicitly accepted overage."""
        async with self._lock:
            if tokens < 0:
                raise ValueError("tokens cannot be negative")
            self.reserved_tokens += tokens

    def reserve_or_raise(self, tokens: int) -> None:
        """Reserve tokens or raise a quota exception."""
        if not self.try_reserve(tokens):
            raise QuotaExceeded("estimated token quota reached")

    def record_actual(self, tokens: int) -> None:
        """Record provider-reported usage and raise the conservative watermark."""
        if tokens < 0:
            raise ValueError("tokens cannot be negative")
        self.actual_tokens += tokens
        self.reserved_tokens = max(self.reserved_tokens, self.actual_tokens)
