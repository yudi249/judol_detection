"""Shared protocol for source-specific collection adapters."""

from collections.abc import Iterable
from typing import Protocol

from judol_detection.collection.models import CollectedDocument


class Collector(Protocol):
    name: str
    platform: str

    def collect(self, seed_or_query: str) -> Iterable[CollectedDocument]:
        """Yield source records mapped to the common collection contract."""
