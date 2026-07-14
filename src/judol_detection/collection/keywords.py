"""Central baseline keyword rules for deterministic weak labels."""

import re

from .models import WeakLabelResult

KEYWORDS = ("bonus", "deposit", "freebet", "gacor", "judi", "maxwin", "slot", "togel")
_KEYWORD_RE = re.compile("|".join(re.escape(keyword) for keyword in KEYWORDS), re.IGNORECASE)


def classify_weak_label(text: str) -> WeakLabelResult:
    """Return a keyword-derived candidate label, not a final human label."""
    matched_keywords = tuple(sorted({match.group(0).lower() for match in _KEYWORD_RE.finditer(text or "")}))
    if matched_keywords:
        return WeakLabelResult(
            label=1,
            matched_keywords=matched_keywords,
            reason=f"keyword:{'|'.join(matched_keywords)}",
        )
    return WeakLabelResult(label=0, matched_keywords=(), reason="no_keyword_match")
