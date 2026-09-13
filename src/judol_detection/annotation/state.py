"""Hashing, checkpoint, and cache state for resumable annotation runs."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import os
import tempfile
import time
from typing import Any

from .contracts import AnnotationLabel, AnnotationResult


class CheckpointMismatch(ValueError):
    """Raised when a checkpoint cannot safely be resumed."""


@dataclass(frozen=True)
class CheckpointRow:
    """Terminal result metadata for one source row."""

    label: AnnotationLabel
    status: str


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def hash_text(text: str) -> str:
    """Hash the exact cache key defined by the PRD."""
    return _sha256_bytes(text.strip().encode("utf-8"))


def hash_skill(path: Path) -> str:
    """Hash the complete skill file for reproducible resume checks."""
    return _sha256_bytes(path.read_bytes())


def build_input_fingerprint(path: Path, sheet_name: str, text_column: str) -> str:
    """Fingerprint workbook bytes and the selected logical input fields."""
    payload = b"\0".join(
        [path.read_bytes(), sheet_name.encode("utf-8"), text_column.encode("utf-8")]
    )
    return _sha256_bytes(payload)


class CheckpointStore:
    """Atomic JSON checkpoint containing hashes and terminal labels only."""

    def __init__(self, path: Path, data: dict[str, Any] | None = None) -> None:
        self.path = path
        self._data: dict[str, Any] = data or {
            "version": 1,
            "rows": {},
            "cache": {},
            "usage": {"estimated_tokens": 0, "actual_tokens": 0},
        }

    def initialize(
        self,
        *,
        input_fingerprint: str,
        skill_hash: str,
        sheet_name: str,
        text_column: str,
        model: str,
    ) -> None:
        """Create metadata for a new run."""
        self._data.update(
            {
                "input_fingerprint": input_fingerprint,
                "skill_hash": skill_hash,
                "sheet_name": sheet_name,
                "text_column": text_column,
                "model": model,
            }
        )
        self._write()

    @classmethod
    def load(cls, path: Path) -> "CheckpointStore":
        """Load an existing checkpoint."""
        return cls(path, json.loads(path.read_text(encoding="utf-8")))

    def validate_resume(
        self,
        *,
        input_fingerprint: str,
        skill_hash: str,
        sheet_name: str,
        text_column: str,
    ) -> None:
        """Reject resume when source or annotation instructions changed."""
        expected = {
            "input_fingerprint": input_fingerprint,
            "skill_hash": skill_hash,
            "sheet_name": sheet_name,
            "text_column": text_column,
        }
        for key, actual in expected.items():
            if self._data.get(key) != actual:
                raise CheckpointMismatch(f"checkpoint mismatch: {key}")

    def record_result(
        self,
        *,
        row_id: str,
        text: str,
        label: AnnotationLabel,
        status: str,
        estimated_tokens: int = 0,
        actual_tokens: int = 0,
        error: str | None = None,
    ) -> None:
        """Record a terminal row and its hash-only cache entry atomically."""
        text_hash = hash_text(text)
        row: dict[str, Any] = {
            "text_hash": text_hash,
            "label": label.value,
            "status": status,
        }
        if error:
            row["error"] = error[:200]
        self._data.setdefault("rows", {})[row_id] = row
        self._data.setdefault("cache", {})[text_hash] = label.value
        usage = self._data.setdefault("usage", {"estimated_tokens": 0, "actual_tokens": 0})
        usage["estimated_tokens"] += estimated_tokens
        usage["actual_tokens"] += actual_tokens
        self._write()

    def lookup_row(self, row_id: str) -> CheckpointRow | None:
        """Return a terminal row result, if present."""
        row = self._data.get("rows", {}).get(row_id)
        if not row:
            return None
        return CheckpointRow(label=AnnotationLabel(row["label"]), status=row["status"])

    def lookup_cache(self, text_hash: str) -> AnnotationLabel | None:
        """Return a cached terminal label for a text hash."""
        value = self._data.get("cache", {}).get(text_hash)
        return AnnotationLabel(value) if value else None

    def summary(self) -> dict[str, Any]:
        """Return checkpoint summary metadata for reporting."""
        return json.loads(json.dumps(self._data))

    def _write(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary_name = tempfile.mkstemp(
            prefix=f".{self.path.name}.", suffix=".tmp", dir=self.path.parent
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as temporary:
                json.dump(self._data, temporary, ensure_ascii=True, indent=2, sort_keys=True)
                temporary.flush()
                os.fsync(temporary.fileno())
            for attempt in range(8):
                try:
                    os.replace(temporary_name, self.path)
                    break
                except PermissionError:
                    if attempt == 7:
                        raise
                    time.sleep(0.25)
        finally:
            if os.path.exists(temporary_name):
                os.unlink(temporary_name)
