# Telegram Scraping Pilot Plan

Last updated: 2026-07-09

This note defines the Telegram collection strategy for JudolLens. The goal is
to collect auditable public-channel text for manual annotation, especially
positive judol candidates that are difficult to find in recent YouTube comments.

## Recommended Method

Use a seed-based snowball crawl over public Telegram channels:

- Start from explicit public judol channel seeds.
- Collect recent text messages with Telethon.
- Discover new public channels from `t.me/...`, `telegram.me/...`, username
  mentions inside already suspicious messages, and forwarded channel metadata.
- Keep negative/control seeds from Indonesian news or education channels.
- Export both raw data and annotation queue rows.

This is intentionally not a keyword-only collection. Keywords are evidence
flags, while `label` remains `perlu_review` until human annotation.

## Why Telegram After YouTube

The YouTube pilot showed that explicit judol video metadata is easy to discover,
but comments from current videos may contain very few judol promotions. Telegram
channels are more likely to contain direct promotional text, links, bonus claims,
contact evidence, and obfuscation patterns.

## Stable Output Fields

The notebook should preserve these columns for downstream research:

- `platform`, `source_type`, `source_seed`, `source_group`
- `channel_username`, `channel_title`, `message_id`, `message_date`
- `raw_text`, `matched_keywords`
- `candidate_flag_keyword`, `candidate_flag_contact`,
  `candidate_flag_unicode`, `unicode_obfuscation_flags`
- `label`, `label_source`, `paper_basis`, `found_from`, `collected_at`

## Ethics and Safety Boundaries

Only public channels should be collected. Do not collect private chats, private
groups, media files, phone numbers, or raw Telegram account identifiers. Channel
IDs are hashed in the notebook output; labels are assigned manually after export.

## Current Notebook

Implementation lives in `notebooks/telegram_snowball_scraper.ipynb`. Credentials
must be stored in `.env` as `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`; the
Telethon session file is local-only and ignored by Git.
