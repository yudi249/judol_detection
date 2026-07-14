"""Deterministic text normalization for collection-time matching."""

import hashlib
import re
import unicodedata

from .models import NormalizedText

_ZERO_WIDTH_RE = re.compile(r"[\u200b\u200c\u200d\ufeff]")
_WHITESPACE_RE = re.compile(r"\s+")


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def normalize_document_text(text: str) -> NormalizedText:
    """Preserve raw input while producing a stable matching representation."""
    raw_text = text or ""
    normalized_text = unicodedata.normalize("NFKC", raw_text)
    flags: list[str] = []
    if _ZERO_WIDTH_RE.search(normalized_text):
        flags.append("zero_width")
        normalized_text = _ZERO_WIDTH_RE.sub("", normalized_text)
    normalized_text = _WHITESPACE_RE.sub(" ", normalized_text).strip().lower()
    return NormalizedText(
        raw_text=raw_text,
        normalized_text=normalized_text,
        raw_hash=_sha256(raw_text),
        normalized_hash=_sha256(normalized_text),
        unicode_flags=tuple(flags),
    )
