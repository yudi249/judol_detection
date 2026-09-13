"""Reusable near-duplicate comparison for collected text."""

import re
import unicodedata
from urllib.parse import urlsplit

from .keywords import classify_weak_label

_URL = re.compile(
    r"https?://\S+|www\.\S+|(?<![\w.])t\x00*\.\x00*m\x00*e\x00*/\S+",
    re.IGNORECASE,
)
_MENTION = re.compile(r"@[A-Za-z0-9_]+")
_NUMBER = re.compile(r"\b\d+(?:[.,]\d+)?%?\b")
_TOKEN = re.compile(r"[a-z]{3,}")
DEFAULT_CONTAINMENT_THRESHOLD = 0.90
DEFAULT_SHARED_PREFIX_MINIMUM_TOKENS = 20
DEFAULT_SHARED_PREFIX_RATIO = 0.80
DEFAULT_SHARED_URL_PREFIX_MINIMUM_TOKENS = 8
_PROMOTIONAL_STRONG_TERMS = frozenset(
    {
        "slot gacor",
        "slot online",
        "togel online",
        "casino online",
        "gacor",
        "maxwin",
        "jackpot",
        "freebet",
        "scatter",
        "pragmatic",
        "pg soft",
        "higgs domino",
        "jepe",
    }
)


def _canonical_urls(text: str) -> frozenset[str]:
    value = unicodedata.normalize("NFKC", text or "")
    value = "".join(
        "\x00" if unicodedata.category(character) == "Cf" else character
        for character in value
    )
    urls: set[str] = set()
    for match in _URL.findall(value):
        candidate = match.replace("\x00", "").rstrip(".,;:!?)]}")
        if candidate.lower().startswith("t.me/"):
            candidate = f"https://{candidate}"
        elif candidate.lower().startswith("www."):
            candidate = f"https://{candidate}"
        try:
            parsed = urlsplit(candidate)
            port = parsed.port
        except ValueError:
            continue
        if not parsed.hostname:
            continue
        host = parsed.hostname.lower()
        if ":" in host:
            host = f"[{host}]"
        host = f"{host}:{port}" if port is not None else host
        path = parsed.path.rstrip("/")
        urls.add(f"{host}{path}?{parsed.query}" if parsed.query else f"{host}{path}")
    return frozenset(urls)


def _has_promotion_evidence(text: str) -> bool:
    value = unicodedata.normalize("NFKC", text or "")
    value = "".join(" " if unicodedata.category(character) == "Cf" else character for character in value)
    result = classify_weak_label(value)
    return result.label == 1 and bool(set(result.matched_keywords) & _PROMOTIONAL_STRONG_TERMS)


def canonicalize_for_deduplication(text: str) -> str:
    value = unicodedata.normalize("NFKC", text or "").lower()
    value = "".join(
        "\x00" if unicodedata.category(character) == "Cf" else character
        for character in value
    )
    value = _URL.sub(" ", value)
    value = _MENTION.sub(" ", value)
    value = _NUMBER.sub(" ", value)
    value = value.replace("\x00", " ")
    return " ".join(_TOKEN.findall(value))


def jaccard_similarity(left: str, right: str) -> float:
    left_tokens, right_tokens = set(left.split()), set(right.split())
    if not left_tokens and not right_tokens:
        return 1.0
    return len(left_tokens & right_tokens) / len(left_tokens | right_tokens)


def containment_similarity(left: str, right: str) -> float:
    """Return how fully the shorter canonical token set occurs in the other."""
    left_tokens, right_tokens = set(canonicalize_for_deduplication(left).split()), set(canonicalize_for_deduplication(right).split())
    if not left_tokens and not right_tokens:
        return 1.0
    if not left_tokens or not right_tokens:
        return 0.0
    return len(left_tokens & right_tokens) / min(len(left_tokens), len(right_tokens))


def shared_prefix_similarity(left: str, right: str) -> tuple[int, float]:
    """Return matching canonical tokens from the start and their shorter-text ratio."""
    left_tokens = canonicalize_for_deduplication(left).split()
    right_tokens = canonicalize_for_deduplication(right).split()
    if not left_tokens or not right_tokens:
        return 0, 0.0
    shared_tokens = 0
    for left_token, right_token in zip(left_tokens, right_tokens):
        if left_token != right_token:
            break
        shared_tokens += 1
    return shared_tokens, shared_tokens / min(len(left_tokens), len(right_tokens))


def is_near_duplicate(
    left: str,
    right: str,
    *,
    threshold: float = 0.85,
    containment_threshold: float = DEFAULT_CONTAINMENT_THRESHOLD,
    shared_prefix_minimum_tokens: int = DEFAULT_SHARED_PREFIX_MINIMUM_TOKENS,
    shared_prefix_ratio: float = DEFAULT_SHARED_PREFIX_RATIO,
) -> bool:
    canonical_left = canonicalize_for_deduplication(left)
    canonical_right = canonicalize_for_deduplication(right)
    if not canonical_left or not canonical_right:
        return False
    shared_prefix_tokens, prefix_ratio = shared_prefix_similarity(left, right)
    shared_promotion_url = bool(_canonical_urls(left) & _canonical_urls(right)) and _has_promotion_evidence(left) and _has_promotion_evidence(right)
    return (
        jaccard_similarity(canonical_left, canonical_right) >= threshold
        or containment_similarity(left, right) >= containment_threshold
        or (
            shared_prefix_tokens >= shared_prefix_minimum_tokens
            and prefix_ratio >= shared_prefix_ratio
        )
        or (
            shared_promotion_url
            and shared_prefix_tokens >= DEFAULT_SHARED_URL_PREFIX_MINIMUM_TOKENS
        )
    )
