# Telegram Selective Collection Design

## Goal

Replace all-history snowball crawling as the default with a reproducible, selective strategy that improves candidate yield per Telegram request while preserving an auditable research trail.

## Modes

| Mode | Input and retrieval | Output/decision |
| --- | --- | --- |
| `discovery` | Seed channels; recent bounded window (default 200). | Per-channel yield statistics and a ranked shortlist. |
| `targeted` | Approved shortlist plus a configured set of promotion queries. | Union of Telegram server-side search results, deduplicated before storage. |
| `full-history` | Only explicitly selected high-yield channels. | Complete accessible history, used as a deliberate deep collection step. |
| `incremental` | Previously collected channels. | Messages newer than the stored channel cursor only. |

`discovery` is the default operational mode. `full-history` is never selected implicitly by snowball.

## Data model

Add a source-specific state table keyed by public Telegram username:

```text
telegram_channel_state(
  username PRIMARY KEY,
  last_message_id,
  last_collected_at,
  discovery_messages_read,
  discovery_candidates,
  discovery_unique_inserted,
  latest_yield,
  status
)
```

Add a per-run/per-channel audit table with the selected mode, messages read, candidate count, inserted count, duplicate count, query used, and error summary. This keeps source state separate from document storage and makes channel selection reproducible.

## Collection flow

1. Discovery reads only a bounded recent window, records yield (`unique inserted / messages read`), and may discover one-level candidate channels.
2. A shortlist is produced by a configurable minimum unique-candidate count and yield threshold; only its members can enter targeted or full-history collection.
3. Targeted mode calls Telethon `iter_messages(..., search=query)` once per query and channel. Results are unioned by message ID before shared candidate filtering and deduplication.
4. Incremental mode calls `iter_messages(..., min_id=last_message_id)` and advances the cursor only after a channel traversal completes.
5. Full-history mode remains explicit and retains the existing FloodWait wait-and-retry behavior.

## CLI and configuration

Add `--mode discovery|targeted|full-history|incremental`, `--target-query` (repeatable) and `--target-query-file`, `--discovery-limit`, `--min-yield`, `--min-unique-candidates`, and `--channel` for an explicit deep collection target. Persist all effective settings and query lists in `collection_runs.config_json`.

## Safeguards and verification

- Server-side search can miss obfuscated or query-free promotions, so discovery sampling remains the recall guardrail.
- No channel is promoted automatically to full-history; user selection is required.
- Progress reports include mode, query, cursor, and per-channel yield.
- Tests cover shortlist scoring, query-result union, no duplicate message-ID processing, cursor advancement only after successful completion, and `min_id` use in incremental mode.
