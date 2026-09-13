"""Transactional local storage for collection runs and documents."""

import hashlib
import json
from pathlib import Path

from .database import connect
from .keywords import classify_weak_label
from .models import CollectedDocument, StoredDocument, utc_now_iso
from .normalizer import normalize_document_text
from .deduplication import is_near_duplicate


def _merge_sample_types(existing: str | None, incoming: str) -> str:
    values = {
        value
        for value in (existing or "").split("|")
        if value
    }
    values.add(incoming)
    return "|".join(value for value in ("natural", "hard") if value in values)


class CollectionStorage:
    def __init__(
        self,
        database_path: Path,
        *,
        candidate_only: bool = False,
        near_duplicate_threshold: float | None = None,
        language_filter: str = "off",
        sample_mode: str | None = None,
    ) -> None:
        if language_filter not in {"off", "strict"}:
            raise ValueError("language_filter must be 'off' or 'strict'")
        if sample_mode not in {None, "candidate", "control"}:
            raise ValueError("sample_mode must be 'candidate', 'control', or None")
        self.connection = connect(database_path)
        self.sample_mode = sample_mode
        self.candidate_only = sample_mode == "candidate" or (candidate_only and sample_mode != "control")
        self.near_duplicate_threshold = near_duplicate_threshold
        self.language_filter = language_filter

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
        if document.sample_type not in {None, "natural", "hard"}:
            raise ValueError("sample_type must be 'natural', 'hard', or None")
        if self.language_filter == "strict" and document.language_hint == "non_id":
            return StoredDocument(False, None, 0, "non_indonesian")
        normalized = normalize_document_text(document.text_raw)
        if not normalized.normalized_text:
            return StoredDocument(False, None, 0, "empty_text")
        weak_label = classify_weak_label(normalized.normalized_text)
        if self.candidate_only and weak_label.label == 0:
            return StoredDocument(False, None, weak_label.label, "non_candidate")
        if self.near_duplicate_threshold is not None:
            existing = self.connection.execute(
                "SELECT document_id, text_raw, sample_type FROM documents"
            ).fetchall()
            for row in existing:
                if is_near_duplicate(
                    document.text_raw,
                    row["text_raw"],
                    threshold=self.near_duplicate_threshold,
                ):
                    if document.sample_type is not None:
                        with self.connection:
                            self.connection.execute(
                                "UPDATE documents SET sample_type = ? WHERE document_id = ?",
                                (_merge_sample_types(row["sample_type"], document.sample_type), row["document_id"]),
                            )
                    with self.connection:
                        self.connection.execute(
                            "UPDATE collection_runs SET fetched_count = fetched_count + 1, duplicate_count = duplicate_count + 1 WHERE run_id = ?",
                            (run_id,),
                        )
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
                    weak_label_reason, raw_payload_path, sample_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    run_id, document.platform, document.source_type, source_item_id_hash,
                    document.source_url, document.published_at, utc_now_iso(), normalized.raw_text,
                    normalized.normalized_text, normalized.raw_hash, normalized.normalized_hash,
                    document.language_hint, "|".join(normalized.unicode_flags),
                    "|".join(weak_label.matched_keywords), weak_label.label, weak_label.reason,
                    document.raw_payload_path,
                    document.sample_type,
                ),
            )
            if cursor.rowcount:
                self.connection.execute(
                    "UPDATE collection_runs SET fetched_count = fetched_count + 1, inserted_count = inserted_count + 1 WHERE run_id = ?",
                    (run_id,),
                )
                return StoredDocument(True, int(cursor.lastrowid), weak_label.label)
            if document.sample_type is not None:
                existing_row = self.connection.execute(
                    "SELECT sample_type FROM documents WHERE text_hash_normalized = ?",
                    (normalized.normalized_hash,),
                ).fetchone()
                if existing_row is not None:
                    self.connection.execute(
                        "UPDATE documents SET sample_type = ? WHERE text_hash_normalized = ?",
                        (_merge_sample_types(existing_row["sample_type"], document.sample_type), normalized.normalized_hash),
                    )
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

    def record_x_query_result(
        self,
        run_id: int,
        query: str,
        *,
        scrolls: int,
        responses_seen: int,
        posts_observed: int,
        inserted_count: int,
        duplicate_count: int,
        stop_reason: str,
    ) -> None:
        with self.connection:
            self.connection.execute(
                """INSERT INTO x_query_runs (
                    run_id, query, scrolls, responses_seen, posts_observed,
                    inserted_count, duplicate_count, stop_reason, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    run_id, query, scrolls, responses_seen, posts_observed,
                    inserted_count, duplicate_count, stop_reason, utc_now_iso(),
                ),
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
