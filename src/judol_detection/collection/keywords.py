"""Paper-based tiered evidence rules for deterministic weak labels."""

import re

from .models import WeakLabelResult

STRONG_PHRASES = ("bonus deposit", "bonus new member", "slot gacor", "slot online", "togel online")
STRONG_TERMS = ("judi", "judol", "slot", "togel", "casino", "kasino", "gacor", "maxwin", "jackpot", "jepe", "freebet", "scatter", "pragmatic", "pg soft", "higgs domino")
SUPPORTING_TERMS = ("bonus", "deposit", "depo", "wd", "withdraw", "daftar", "claim", "link", "situs", "login", "member", "menang", "kemenangan", "untung", "cuan", "mahjong", "main", "gratis")
ACCESS_TERMS = {"deposit", "depo", "wd", "withdraw", "daftar", "claim", "link", "situs", "login", "member"}
_CONTACT_RE = re.compile(r"https?://|www\.|t\.me/|telegram|whatsapp|\bwa\b", re.IGNORECASE)


def _matches(text: str, terms: tuple[str, ...]) -> tuple[str, ...]:
    return tuple(sorted({term for term in terms if re.search(rf"(?<!\w){re.escape(term)}(?!\w)", text, re.IGNORECASE)}))


def classify_weak_label(text: str) -> WeakLabelResult:
    """Classify paper-backed strong, supporting, and contact evidence."""
    value = text or ""
    phrases = _matches(value, STRONG_PHRASES)
    strong = phrases or _matches(value, STRONG_TERMS)
    supporting = _matches(value, SUPPORTING_TERMS)
    matched = tuple(sorted(set(strong) | set(supporting)))
    if strong:
        return WeakLabelResult(1, matched, f"strong:{'|'.join(strong)}")
    if len(supporting) >= 2 and set(supporting) & ACCESS_TERMS:
        return WeakLabelResult(1, supporting, f"supporting:{'|'.join(supporting)}")
    if supporting and set(supporting) & ACCESS_TERMS and _CONTACT_RE.search(value):
        return WeakLabelResult(1, supporting, f"supporting:{'|'.join(supporting)}+contact")
    return WeakLabelResult(0, matched, "no_keyword_match")
