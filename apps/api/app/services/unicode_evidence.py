"""Evidence-only scan for suspicious Unicode in original user text."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal
import unicodedata


UnicodeEvidenceReason = Literal[
    "homoglyph", "invisible", "symbol", "mixed_script", "unknown"
]

_HOMOGLYPHS = {
    "\u03bf": "o",  # GREEK SMALL LETTER OMICRON
    "\u039f": "o",  # GREEK CAPITAL LETTER OMICRON
    "\u0430": "a",  # CYRILLIC SMALL LETTER A
    "\u0435": "e",  # CYRILLIC SMALL LETTER IE
    "\u043e": "o",  # CYRILLIC SMALL LETTER O
    "\u0440": "p",  # CYRILLIC SMALL LETTER ER
    "\u0441": "c",  # CYRILLIC SMALL LETTER ES
    "\u0445": "x",  # CYRILLIC SMALL LETTER HA
    "\u0455": "s",  # CYRILLIC SMALL LETTER DZE
}
_INVISIBLE_CHARACTERS = frozenset({"\u200b", "\u200c", "\u200d", "\ufeff"})


@dataclass(frozen=True)
class UnicodeEvidenceSpan:
    """A suspicious character's location in the unmodified original string."""

    start: int
    end: int
    char: str
    reason: UnicodeEvidenceReason
    normalized_as: str | None = None
    unicode_name: str | None = None


@dataclass(frozen=True)
class UnicodeEvidence:
    """Static Unicode evidence derived without changing the input text."""

    has_suspicious_unicode: bool
    suspicious_count: int
    spans: list[UnicodeEvidenceSpan]


def analyze_unicode_evidence(text: str) -> UnicodeEvidence:
    """Return suspicious Unicode positions while preserving original text indexes."""

    spans: list[UnicodeEvidenceSpan] = []
    for index, char in enumerate(text):
        normalized_as = _HOMOGLYPHS.get(char)
        if normalized_as is not None:
            spans.append(
                UnicodeEvidenceSpan(
                    start=index,
                    end=index + 1,
                    char=char,
                    reason="homoglyph",
                    normalized_as=normalized_as,
                    unicode_name=unicodedata.name(char, "UNKNOWN"),
                )
            )
        elif char in _INVISIBLE_CHARACTERS:
            spans.append(
                UnicodeEvidenceSpan(
                    start=index,
                    end=index + 1,
                    char=char,
                    reason="invisible",
                    unicode_name=unicodedata.name(char, "UNKNOWN"),
                )
            )

    return UnicodeEvidence(
        has_suspicious_unicode=bool(spans),
        suspicious_count=len(spans),
        spans=spans,
    )
