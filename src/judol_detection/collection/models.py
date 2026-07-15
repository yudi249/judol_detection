"""Data contracts shared by source collectors and local storage."""

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class NormalizedText:
    raw_text: str
    normalized_text: str
    raw_hash: str
    normalized_hash: str
    unicode_flags: tuple[str, ...]


@dataclass(frozen=True)
class WeakLabelResult:
    label: int
    matched_keywords: tuple[str, ...]
    reason: str


@dataclass(frozen=True)
class CollectedDocument:
    platform: str
    source_type: str
    text_raw: str
    source_item_id: str | None = None
    source_url: str | None = None
    published_at: str | None = None
    language_hint: str | None = None
    raw_payload_path: str | None = None


@dataclass(frozen=True)
class StoredDocument:
    inserted: bool
    document_id: int | None
    weak_label: int
    skip_reason: str | None = None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
