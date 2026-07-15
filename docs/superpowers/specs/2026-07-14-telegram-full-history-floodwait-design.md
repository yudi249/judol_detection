# Telegram Full-History and FloodWait Design

## Goal

Permit an explicit whole-history Telegram collection mode while safely respecting Telegram rate limits.

## CLI contract

`--max-messages-per-channel` accepts a positive integer or the case-insensitive literal `none`. Integer mode retains the existing bounded behavior; `none` is passed to Telethon as `limit=None`, which requests the accessible full channel history.

## FloodWait behavior

The collector catches Telethon's `FloodWaitError` at channel scope, awaits `asyncio.sleep(error.seconds)`, and retries that same channel. A retry can re-read some newest messages, but SQLite's source and normalized-text deduplication makes storage idempotent. Other channel-level failures remain skipped so the snowball can continue.

## Verification

Tests prove the CLI accepts `none` in dry-run mode and that one simulated `FloodWaitError` waits for the requested duration, retries the same channel, and stores the eventual message exactly once.
