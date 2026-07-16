"""SQLite schema and connection setup for local collection data."""

import sqlite3
from pathlib import Path

SCHEMA = """
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS collection_runs (
    run_id INTEGER PRIMARY KEY,
    platform TEXT NOT NULL,
    collector_name TEXT NOT NULL,
    seed_or_query TEXT NOT NULL,
    config_json TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed')),
    fetched_count INTEGER NOT NULL DEFAULT 0,
    inserted_count INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    error_summary TEXT
);
CREATE TABLE IF NOT EXISTS documents (
    document_id INTEGER PRIMARY KEY,
    run_id INTEGER NOT NULL REFERENCES collection_runs(run_id),
    platform TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_item_id_hash TEXT,
    source_url TEXT,
    published_at TEXT,
    collected_at TEXT NOT NULL,
    text_raw TEXT NOT NULL,
    text_normalized TEXT NOT NULL,
    text_hash_raw TEXT NOT NULL,
    text_hash_normalized TEXT NOT NULL UNIQUE,
    language_hint TEXT,
    unicode_obfuscation_flags TEXT NOT NULL,
    matched_keywords TEXT NOT NULL,
    weak_label INTEGER NOT NULL CHECK(weak_label IN (0, 1)),
    weak_label_reason TEXT NOT NULL,
    raw_payload_path TEXT
);
CREATE TABLE IF NOT EXISTS annotations (
    annotation_id INTEGER PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(document_id),
    label TEXT NOT NULL CHECK(label IN ('0', '1', 'uncertain')),
    annotator_id TEXT NOT NULL,
    label_source TEXT NOT NULL CHECK(label_source = 'human'),
    notes TEXT,
    annotated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS telegram_channel_state (
    username TEXT PRIMARY KEY,
    last_message_id INTEGER NOT NULL DEFAULT 0,
    last_collected_at TEXT,
    latest_yield REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS telegram_channel_runs (
    run_id INTEGER NOT NULL REFERENCES collection_runs(run_id),
    username TEXT NOT NULL,
    mode TEXT NOT NULL,
    query TEXT,
    messages_read INTEGER NOT NULL,
    inserted_count INTEGER NOT NULL,
    duplicate_count INTEGER NOT NULL,
    completed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS x_query_runs (
    run_id INTEGER NOT NULL REFERENCES collection_runs(run_id),
    query TEXT NOT NULL,
    scrolls INTEGER NOT NULL,
    responses_seen INTEGER NOT NULL,
    posts_observed INTEGER NOT NULL,
    inserted_count INTEGER NOT NULL,
    duplicate_count INTEGER NOT NULL,
    stop_reason TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    PRIMARY KEY (run_id, query)
);
"""


def connect(database_path: Path) -> sqlite3.Connection:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.executescript(SCHEMA)
    return connection
