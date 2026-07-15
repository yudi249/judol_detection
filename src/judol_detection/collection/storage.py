"""Transactional local storage for collection runs and documents."""

import hashlib
import json
from pathlib import Path

from .database import connect
from .keywords import classify_weak_label
from .models import CollectedDocument, StoredDocument, utc_now_iso
from .normalizer import normalize_document_text
from .deduplication import is_near_duplicate


class CollectionStorage:
    def __init__(self, database_path: Path, *, candidate_only: bool = False, near_duplicate_threshold: float | None = None) -> None:
        self.connection = connect(database_path)
        self.candidate_only = candidate_only
        self.near_duplicate_threshold = near_duplicate_threshold

    def start_run(self, platform: str, collector_name: str, seed_or_query: str, config: dict | None = None) -> int:
        cursor = self.connection.execute(
            """INSERT INTO collection_runs (
                platform, collector_name, seed_or_query, config_json, started_at, status
            ) VALUES (?, ?, ?, ?, ?, 'running')""",
            (platform, collector_name, seed_or_query, json.dumps(config or {}, sort_keys=True), utc_now_iso()),
        )
        self.connection.commit()
        return int(cursor.lastrowid)

    def store_document(self, run_id: int, document: CollectedDocument) -> StoredDocument:
        normalized = normalize_document_text(document.text_raw)
        weak_label = classify_weak_label(normalized.normalized_text)
        if self.candidate_only and weak_label.label == 0:
            return StoredDocument(False, None, weak_label.label, "non_candidate")
        if self.near_duplicate_threshold is not None:
            existing = self.connection.execute("SELECT text_raw FROM documents").fetchall()
            if any(is_near_duplicate(document.text_raw, row["text_raw"], threshold=self.near_duplicate_threshold) for row in existing):
                return StoredDocument(False, None, weak_label.label, "near_duplicate")
        source_item_id_hash = (
            hashlib.sha256(document.source_item_id.encode("utf-8")).hexdigest()
            if document.source_item_id
            else None
        )
        with self.connection:
            cursor = self.connection.execute(
                """INSERT OR IGNORE INTO documents (
                    run_id, platform, source_type, source_item_id_hash, source_url, published_at,
                    collected_at, text_raw, text_normalized, text_hash_raw, text_hash_normalized,
                    language_hint, unicode_obfuscation_flags, matched_keywords, weak_label,
                    weak_label_reason, raw_payload_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    run_id, document.platform, document.source_type, source_item_id_hash,
                    document.source_url, document.published_at, utc_now_iso(), normalized.raw_text,
                    normalized.normalized_text, normalized.raw_hash, normalized.normalized_hash,
                    document.language_hint, "|".join(normalized.unicode_flags),
                    "|".join(weak_label.matched_keywords), weak_label.label, weak_label.reason,
                    document.raw_payload_path,
                ),
            )
            if cursor.rowcount:
                self.connection.execute(
                    "UPDATE collection_runs SET fetched_count = fetched_count + 1, inserted_count = inserted_count + 1 WHERE run_id = ?",
                    (run_id,),
                )
                return StoredDocument(True, int(cursor.lastrowid), weak_label.label)
            self.connection.execute(
                "UPDATE collection_runs SET fetched_count = fetched_count + 1, duplicate_count = duplicate_count + 1 WHERE run_id = ?",
                (run_id,),
            )
        return StoredDocument(False, None, weak_label.label, "exact_duplicate")

    def finish_run(self, run_id: int) -> None:
        self._set_run_status(run_id, "completed", None)

    def fail_run(self, run_id: int, error_summary: str) -> None:
        self._set_run_status(run_id, "failed", error_summary)

    def _set_run_status(self, run_id: int, status: str, error_summary: str | None) -> None:
        with self.connection:
            self.connection.execute(
                "UPDATE collection_runs SET status = ?, finished_at = ?, error_summary = ? WHERE run_id = ?",
                (status, utc_now_iso(), error_summary, run_id),
            )

    def get_run(self, run_id: int) -> dict[str, object]:
        row = self.connection.execute("SELECT * FROM collection_runs WHERE run_id = ?", (run_id,)).fetchone()
        if row is None:
            raise KeyError(f"Unknown collection run: {run_id}")
        return dict(row)

    def get_telegram_channel_state(self, username: str) -> dict[str, object]:
        row = self.connection.execute("SELECT * FROM telegram_channel_state WHERE username = ?", (username.lower(),)).fetchone()
        return dict(row) if row else {"username": username.lower(), "last_message_id": 0, "latest_yield": 0.0}

    def record_telegram_channel_result(self, run_id: int, username: str, mode: str, *, query: str | None, messages_read: int, inserted_count: int, duplicate_count: int, last_message_id: int) -> None:
        username = username.lower()
        yield_value = inserted_count / messages_read if messages_read else 0.0
        with self.connection:
            self.connection.execute(
                "INSERT INTO telegram_channel_state(username,last_message_id,last_collected_at,latest_yield) VALUES(?,?,?,?) ON CONFLICT(username) DO UPDATE SET last_message_id=MAX(last_message_id, excluded.last_message_id),last_collected_at=excluded.last_collected_at,latest_yield=excluded.latest_yield",
                (username, last_message_id, utc_now_iso(), yield_value),
            )
            self.connection.execute(
                "INSERT INTO telegram_channel_runs VALUES(?,?,?,?,?,?,?,?)",
                (run_id, username, mode, query, messages_read, inserted_count, duplicate_count, utc_now_iso()),
            )

    def add_annotation(self, document_id: int | None, label: str, annotator_id: str, notes: str | None = None) -> None:
        if document_id is None:
            raise ValueError("A stored document ID is required for annotation")
        if label not in {"0", "1", "uncertain"}:
            raise ValueError("Annotation label must be '0', '1', or 'uncertain'")
        with self.connection:
            self.connection.execute(
                """INSERT INTO annotations (
                    document_id, label, annotator_id, label_source, notes, annotated_at
                ) VALUES (?, ?, ?, 'human', ?, ?)""",
                (document_id, label, annotator_id, notes, utc_now_iso()),
            )

    def list_export_rows(self) -> list[dict[str, object]]:
        rows = self.connection.execute(
            """SELECT documents.*, latest.label AS final_label,
                      latest.annotator_id AS final_annotator_id,
                      latest.notes AS final_annotation_notes,
                      latest.annotated_at AS final_annotated_at
               FROM documents
               LEFT JOIN annotations AS latest ON latest.annotation_id = (
                   SELECT annotation_id FROM annotations
                   WHERE annotations.document_id = documents.document_id
                   ORDER BY annotated_at DESC, annotation_id DESC LIMIT 1
               )
               ORDER BY documents.document_id"""
        ).fetchall()
        return [dict(row) for row in rows]
