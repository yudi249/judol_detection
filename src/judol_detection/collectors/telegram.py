"""Bounded discovery helpers for public Telegram channel pilots."""

import asyncio
from dataclasses import dataclass
import re
from typing import Callable

from telethon.errors import FloodWaitError

from judol_detection.collection.models import CollectedDocument
from judol_detection.collection.normalizer import normalize_document_text
from judol_detection.collection.keywords import classify_weak_label

_LINK_RE = re.compile(r"(?:https?://)?t\.me/([A-Za-z0-9_]{5,32})", re.IGNORECASE)
_MENTION_RE = re.compile(r"(?<!\w)@([A-Za-z0-9_]{5,32})")


def extract_public_channel_candidates(text: str, *, has_evidence: bool) -> tuple[str, ...]:
    """Extract public-channel hints only from evidence-bearing messages."""
    if not has_evidence:
        return ()
    candidates = {match.group(1).lower() for match in _LINK_RE.finditer(text or "")}
    candidates.update(match.group(1).lower() for match in _MENTION_RE.finditer(text or ""))
    return tuple(sorted(candidates))


@dataclass(frozen=True)
class QueueItem:
    username: str
    depth: int
    found_from: str | None
    evidence: str


class TelegramSnowballQueue:
    """In-memory FIFO queue constrained to the approved pilot scope."""

    def __init__(self, max_channels: int = 50) -> None:
        self.max_channels = max_channels
        self._items: list[QueueItem] = []
        self._known: set[str] = set()

    def enqueue(self, username: str, *, depth: int, found_from: str | None, evidence: str) -> bool:
        normalized = username.strip().lstrip("@").lower()
        if not normalized or depth > 1 or normalized in self._known:
            return False
        self._known.add(normalized)
        self._items.append(QueueItem(normalized, depth, found_from, evidence))
        return True

    def pop(self) -> QueueItem:
        return self._items.pop(0)

    def __bool__(self) -> bool:
        return bool(self._items)

    def __len__(self) -> int:
        return len(self._items)


@dataclass(frozen=True)
class TelegramCollectionSummary:
    processed_channels: int
    stored_documents: int


@dataclass(frozen=True)
class TelegramCollectionProgress:
    stage: str
    processed_channels: int
    max_channels: int
    username: str
    messages_read: int
    inserted: int
    non_candidates: int
    duplicates: int
    queue_size: int
    wait_seconds: int | None = None
    error_summary: str | None = None
    query: str | None = None
    available_total: int | None = None


class TelegramSnowballCollector:
    def __init__(self, client, *, max_messages_per_channel: int | None = 200, max_channels: int = 50) -> None:
        self.client = client
        self.max_messages_per_channel = max_messages_per_channel
        self.max_channels = max_channels

    async def collect_async(
        self,
        seeds: list[str],
        storage,
        run_id: int,
        *,
        progress_every: int = 100,
        on_progress: Callable[[TelegramCollectionProgress], None] | None = None,
        mode: str = "discovery",
        target_queries: tuple[str, ...] = (),
    ) -> TelegramCollectionSummary:
        if progress_every < 1:
            raise ValueError("progress_every must be at least 1")

        def emit(stage: str, *, wait_seconds: int | None = None, error_summary: str | None = None, query: str | None = None, available_total: int | None = None) -> None:
            if on_progress is not None:
                on_progress(
                    TelegramCollectionProgress(
                        stage, processed, self.max_channels, item.username, messages_read,
                        inserted, non_candidates, duplicates, len(queue), wait_seconds, error_summary, query, available_total,
                    )
                )

        queue = TelegramSnowballQueue(self.max_channels)
        for seed in seeds:
            queue.enqueue(seed, depth=0, found_from=None, evidence="seed")
        processed = stored = 0
        while queue and processed < self.max_channels:
            item = queue.pop()
            processed += 1
            messages_read = inserted = non_candidates = duplicates = 0
            newest_message_id = 0
            emit("channel_started")
            state = storage.get_telegram_channel_state(item.username)
            if mode == "targeted":
                requests = [{"limit": self.max_messages_per_channel, "search": query} for query in target_queries]
            elif mode == "incremental":
                requests = [{"limit": self.max_messages_per_channel, "min_id": state["last_message_id"]}]
            else:
                requests = [{"limit": self.max_messages_per_channel}]
            while True:
                try:
                    seen_ids: set[int] = set()
                    for request in requests:
                     iterator = self.client.iter_messages(item.username, **request)
                     current_query = request.get("search")
                     emit("query_started", query=current_query, available_total=getattr(iterator, "total", None))
                     async for message in iterator:
                        if getattr(message, "id", 0) in seen_ids:
                            continue
                        seen_ids.add(getattr(message, "id", 0))
                        text = getattr(message, "message", "") or ""
                        normalized = normalize_document_text(text)
                        weak = classify_weak_label(normalized.normalized_text)
                        result = storage.store_document(run_id, CollectedDocument("telegram", "public_channel_api", text, source_item_id=f"{item.username}:{getattr(message, 'id', '')}"))
                        stored += int(result.inserted)
                        messages_read += 1
                        newest_message_id = max(newest_message_id, getattr(message, "id", 0))
                        inserted += int(result.inserted)
                        non_candidates += int(result.skip_reason == "non_candidate")
                        duplicates += int(result.skip_reason in {"exact_duplicate", "near_duplicate"})
                        evidence = bool(weak.matched_keywords or normalized.unicode_flags or "t.me/" in text.lower())
                        for candidate in extract_public_channel_candidates(text, has_evidence=evidence):
                            queue.enqueue(candidate, depth=item.depth + 1, found_from=item.username, evidence=weak.reason)
                        if messages_read % progress_every == 0:
                            emit("checkpoint")
                    storage.record_telegram_channel_result(run_id, item.username, mode, query=None, messages_read=messages_read, inserted_count=inserted, duplicate_count=duplicates, last_message_id=newest_message_id)
                    emit("channel_completed")
                    break
                except FloodWaitError as error:
                    emit("flood_wait", wait_seconds=error.seconds)
                    await asyncio.sleep(error.seconds)
                except Exception as error:
                    emit("channel_failed", error_summary=str(error))
                    break
        return TelegramCollectionSummary(processed, stored)
