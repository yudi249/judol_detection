# Telegram Full-History and FloodWait Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Telegram CLI request full history and wait/retry on Telegram FloodWait responses.

**Architecture:** The CLI converts `none` to Python `None` and passes the value to the reusable collector. The collector owns Telethon-specific FloodWait handling around a whole channel traversal; shared SQLite storage remains unchanged and protects retry idempotency.

**Tech Stack:** Python 3.12, argparse, asyncio, Telethon, pytest, SQLite.

---

### Task 1: Establish CLI and retry regressions

**Files:**
- Create: `tests/unit/test_collect_telegram_cli.py`
- Modify: `tests/integration/test_telegram_snowball.py`

- [x] Add a subprocess test that runs `scripts/collect_telegram.py --seed seed --max-messages-per-channel none --dry-run` and asserts exit code zero.
- [x] Add an async fake client that raises `FloodWaitError` once and yields a candidate message on its next traversal; patch collector sleep, then assert the same channel was called twice, the requested seconds were awaited, and one document was stored.
- [x] Run the two test files and confirm they fail before implementation.

### Task 2: Add parsing and FloodWait handling

**Files:**
- Modify: `scripts/collect_telegram.py`
- Modify: `src/judol_detection/collectors/telegram.py`

- [x] Parse a positive integer or `none` into `int | None`; display the selected limit in dry-run output and record it in the collection-run config.
- [x] Type collector limit as `int | None`; catch `FloodWaitError`, `await asyncio.sleep(error.seconds)`, and repeat the same `iter_messages` traversal.
- [x] Run focused tests and confirm they pass.

### Task 3: Update operational documentation and verify repository

**Files:**
- Modify: `docs/collection/telegram-collector.md`
- Modify: `claude-progress.md`
- Modify: `feature_list.json`

- [x] Document `--max-messages-per-channel none`, full-history risk, FloodWait wait-and-retry behavior, and safe commands.
- [x] Run `uv run --no-cache python -m pytest --basetemp=.pytest-telegram-full-history-final` and `uv run --no-cache python main.py`.
- [x] Record successful verification and the need to use a fresh database for a new collection strategy.
