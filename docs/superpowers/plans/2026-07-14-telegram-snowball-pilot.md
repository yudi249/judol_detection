# Telegram Snowball Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bounded Telegram public-channel snowball collector that writes its pilot run to the shared SQLite collection foundation.

**Architecture:** `collectors/telegram.py` owns Telethon interaction and queue traversal; shared collection modules retain ownership of normalization, weak labels, and document storage. `scripts/collect_telegram.py` configures the run and never contains extraction or database logic.

**Tech Stack:** Python 3.12, Telethon, pytest, SQLite collection foundation.

---

### Task 1: Discovery evidence and bounded queue

**Files:** Create `src/judol_detection/collectors/telegram.py`; create `tests/unit/test_telegram_collector.py`.

- [ ] Write failing tests for `extract_public_channel_candidates(text, has_evidence)` that accept `t.me/channel` and `@channel` only when evidence is true; for `TelegramSnowballQueue(max_channels=50)` that deduplicates normalized usernames and refuses depth above 1; and for `message_to_collected_document` that maps a fake public message to `CollectedDocument(platform="telegram", source_type="public_channel_api", ...)`.
- [ ] Run `uv run --no-cache python -m pytest tests/unit/test_telegram_collector.py -q`; expect missing-module failure.
- [ ] Implement the three pure helpers and rerun until PASS. Do not import or connect Telethon in these tests.
- [ ] Commit: `git add src/judol_detection/collectors/telegram.py tests/unit/test_telegram_collector.py; git commit -m "feat: add Telegram snowball queue helpers"`.

### Task 2: Async collector with run provenance

**Files:** Modify `src/judol_detection/collectors/telegram.py`; create `tests/integration/test_telegram_snowball.py`.

- [ ] Write a fake async-client integration test: one depth-0 seed message with keyword and `t.me/next_channel` produces a depth-1 queue item, exactly two fake channels are visited, and documents are stored through `CollectionStorage` in a temporary SQLite database.
- [ ] Run the focused integration test; expect failure because `TelegramSnowballCollector` is absent.
- [ ] Implement `TelegramSnowballCollector.collect_async(seeds, storage, run_id)` with max depth 1 and max 50 processed channels. It must record discovery provenance, skip unavailable/private channels, catch `FloodWaitError` using its `seconds` delay, and continue after a channel-level error.
- [ ] Run unit plus integration tests; expected PASS.
- [ ] Commit: `git add src/judol_detection/collectors/telegram.py tests/integration/test_telegram_snowball.py; git commit -m "feat: add bounded Telegram snowball collector"`.

### Task 3: CLI, configuration, and dry run

**Files:** Create `scripts/collect_telegram.py`; modify `.env.example`, `docs/dataset.md`, `claude-progress.md`, `feature_list.json`.

- [ ] Write a CLI test proving `--dry-run` parses public seed usernames, creates no messages, and prints the selected depth and channel cap.
- [ ] Run it; expect failure because the script is absent.
- [ ] Implement `--seed`, `--max-messages-per-channel`, `--max-channels` defaulting to 50, `--dry-run`, and database default `data/interim/telegram_pilot.sqlite`. Read only `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` from `.env`/environment; do not log secrets.
- [ ] Verify with `uv run --no-cache python -m pytest`, then dry run with local seed values. Record results before any live collection.
- [ ] Update progress and feature state only after verification passes, then commit: `git commit -m "feat: add Telegram pilot collection CLI"`.

## Self-review

Tasks map directly to the approved depth-1, 50-channel, evidence-gated, provenance-recorded pilot. No private-channel access, depth above 1, or live data collection is included in automated tests.
