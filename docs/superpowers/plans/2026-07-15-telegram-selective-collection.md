# Telegram Selective Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace default all-history Telegram crawling with auditable discovery, targeted search, explicit full-history, and incremental collection modes.

**Architecture:** SQLite owns per-channel cursor and per-run channel audit data. The Telegram collector selects one retrieval strategy per mode while retaining shared candidate filtering, deduplication, FloodWait retry, and progress events.

**Tech Stack:** Python 3.12, SQLite, argparse, asyncio, Telethon, pytest.

---

### Task 1: Persist channel state and channel-run audit

**Files:**
- Modify: `src/judol_detection/collection/database.py`
- Modify: `src/judol_detection/collection/storage.py`
- Test: `tests/integration/test_collection_storage.py`

- [ ] Write failing storage tests for `get_telegram_channel_state`, `record_telegram_channel_result`, and advancing a cursor only after a completed traversal.
- [ ] Add `telegram_channel_state` and `telegram_channel_runs` tables, storage methods, and indexes keyed by public username/run ID.
- [ ] Run focused storage tests and confirm they pass.

### Task 2: Implement retrieval modes

**Files:**
- Modify: `src/judol_detection/collectors/telegram.py`
- Test: `tests/integration/test_telegram_snowball.py`

- [ ] Write fake-client tests proving discovery uses the bounded limit, targeted mode calls `iter_messages(search=query)` and unions message IDs, incremental mode passes `min_id`, and full-history accepts only explicit channels.
- [ ] Add a `TelegramCollectionMode` contract and mode-specific iterators; retain FloodWait retry and progress reporting.
- [ ] Record channel audit metrics and advance incremental cursor only when a channel completes successfully.
- [ ] Run collector integration tests and confirm they pass.

### Task 3: Expose reproducible CLI commands

**Files:**
- Modify: `scripts/collect_telegram.py`
- Create: `configs/telegram_target_queries.json`
- Test: `tests/unit/test_collect_telegram_cli.py`

- [ ] Write CLI parsing tests for `--mode`, repeatable `--target-query`, query files, discovery limits, selection thresholds, and explicit full-history channels.
- [ ] Add CLI options, persist effective mode/query/config in `collection_runs.config_json`, and reject unsafe ambiguous combinations.
- [ ] Run CLI tests and confirm they pass.

### Task 4: Document and verify

**Files:**
- Modify: `docs/collection/telegram-collector.md`
- Modify: `claude-progress.md`
- Modify: `feature_list.json`

- [ ] Document mode commands, operational sequence, query provenance, yield thresholds, and incremental behavior.
- [ ] Run `uv run --no-cache python -m pytest --basetemp=.pytest-telegram-selective-final` and `uv run --no-cache python main.py`.
- [ ] Record verification and migration notes for existing databases.
