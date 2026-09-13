"""Run a bounded public-channel Telegram snowball pilot."""
import argparse
import asyncio
import os
import json
from pathlib import Path
import sys
from telethon import TelegramClient

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from judol_detection.collection.storage import CollectionStorage
from judol_detection.collectors.telegram import TelegramSnowballCollector


def parse_message_limit(value: str) -> int | None:
    if value.strip().lower() == "none":
        return None
    try:
        limit = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("must be a positive integer or 'none'") from error
    if limit < 1:
        raise argparse.ArgumentTypeError("must be a positive integer or 'none'")
    return limit


def print_progress(event) -> None:
    prefix = f"[{event.processed_channels}/{event.max_channels}] @{event.username}"
    if event.stage == "channel_started":
        print(f"{prefix} mulai | antrean={event.queue_size}", flush=True)
    elif event.stage == "flood_wait":
        print(f"[FLOOD WAIT] {prefix} | menunggu {event.wait_seconds} detik, lalu mencoba ulang", flush=True)
    elif event.stage == "channel_failed":
        print(f"[GAGAL] {prefix} | {event.error_summary}", flush=True)
    elif event.stage == "query_started":
        label = f'query="{event.query}"' if event.query else "riwayat channel"
        total = event.available_total if event.available_total is not None else "tidak diketahui"
        print(f"{prefix} {label} | total hasil={total}", flush=True)
    else:
        quota = (
            f" | quota={event.inserted}/{event.target_documents_per_channel}"
            if event.target_documents_per_channel is not None
            else ""
        )
        print(
            f"{prefix} {event.stage} | dibaca={event.messages_read} | disimpan={event.inserted} "
            f"| non-kandidat={event.non_candidates} | duplikat={event.duplicates} | antrean={event.queue_size}{quota}",
            flush=True,
        )


def load_dotenv(path: Path) -> None:
    """Load missing environment variables from a local dotenv file."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

def main() -> None:
    load_dotenv(Path(".env"))
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", action="append", required=True)
    parser.add_argument("--seed-file", type=Path)
    parser.add_argument("--max-messages-per-channel", type=parse_message_limit, default=200)
    parser.add_argument("--target-documents-per-channel", type=int)
    parser.add_argument("--mode", choices=("discovery", "targeted", "full-history", "incremental"), default="discovery")
    parser.add_argument("--target-query", action="append", default=[])
    parser.add_argument("--max-channels", type=int, default=50)
    parser.add_argument("--database", type=Path)
    parser.add_argument("--candidate-only", action="store_true", default=True)
    parser.add_argument("--sample-mode", choices=("candidate", "control"))
    parser.add_argument("--near-duplicate-threshold", type=float, default=0.85)
    parser.add_argument("--progress-every", type=int, default=100)
    parser.add_argument("--dry-run", action="store_true")
    parser._actions[1].required = False
    args = parser.parse_args()
    explicit_message_limit = any(
        argument == "--max-messages-per-channel"
        or argument.startswith("--max-messages-per-channel=")
        for argument in sys.argv
    )
    if args.target_documents_per_channel is not None and args.target_documents_per_channel < 1:
        parser.error("--target-documents-per-channel must be positive")
    if args.target_documents_per_channel is not None and explicit_message_limit:
        parser.error("--target-documents-per-channel cannot be combined with --max-messages-per-channel")
    seeds = args.seed or []
    config_sample_mode = "candidate"
    sample_types = {}
    if args.seed_file:
        payload = json.loads(args.seed_file.read_text(encoding="utf-8"))
        config_sample_mode = payload.get("sample_mode", "candidate")
        sample_types = {item["username"].strip().lstrip("@").lower(): item["sample_type"] for item in payload.get("seeds", []) if item.get("enabled") and item.get("sample_type") in {"natural", "hard"}}
        seeds.extend(item["username"] for item in payload["seeds"] if item.get("enabled") and item.get("group") in {"candidate", "control"})
    sample_mode = args.sample_mode or config_sample_mode
    if config_sample_mode == "control" and args.seed_file:
        invalid = [item.get("username", "<missing>") for item in payload.get("seeds", []) if item.get("enabled") and item.get("sample_type") not in {"natural", "hard"}]
        if invalid:
            parser.error(f"control seed entries require sample_type natural|hard: {invalid}")
    if sample_mode not in {"candidate", "control"}:
        parser.error("seed registry sample_mode must be 'candidate' or 'control'")
    seeds = sorted({seed.strip().lstrip("@") for seed in seeds if seed.strip()})
    if not seeds:
        parser.error("provide --seed or --seed-file")
    database = args.database or Path(
        "data/interim/telegram_control.sqlite" if sample_mode == "control" else "data/interim/telegram_pilot.sqlite"
    )
    if args.mode == "targeted" and not args.target_query:
        parser.error("targeted mode requires --target-query")
    if args.mode == "full-history":
        args.max_messages_per_channel = None
    if args.target_documents_per_channel is not None:
        args.max_messages_per_channel = None
    if args.dry_run:
        print(
            f"dry-run: seeds={seeds} depth=1 max_channels={args.max_channels} "
            f"max_messages_per_channel={args.max_messages_per_channel} "
            f"target_documents_per_channel={args.target_documents_per_channel} sample_mode={sample_mode}"
        )
        return
    api_id, api_hash = os.getenv("TELEGRAM_API_ID"), os.getenv("TELEGRAM_API_HASH")
    if not api_id or not api_hash:
        raise SystemExit("Set TELEGRAM_API_ID and TELEGRAM_API_HASH in the environment before collection.")
    storage = CollectionStorage(
        database,
        candidate_only=args.candidate_only,
        near_duplicate_threshold=args.near_duplicate_threshold,
        sample_mode=sample_mode,
    )
    run_id = storage.start_run(
        "telegram",
        "telegram_snowball",
        "|".join(seeds),
        {
            "max_channels": args.max_channels,
            "max_messages_per_channel": args.max_messages_per_channel,
            "near_duplicate_threshold": args.near_duplicate_threshold,
            "mode": args.mode,
            "target_queries": args.target_query,
            "sample_mode": sample_mode,
            "target_documents_per_channel": args.target_documents_per_channel,
        },
    )
    async def run():
        async with TelegramClient(".telegram_pilot_session", int(api_id), api_hash) as client:
            await client.start()
            return await TelegramSnowballCollector(client, max_messages_per_channel=args.max_messages_per_channel, max_channels=args.max_channels).collect_async(
                seeds, storage, run_id, progress_every=args.progress_every, on_progress=print_progress,
                mode=args.mode,
                target_queries=tuple(args.target_query),
                sample_mode=sample_mode,
                sample_types=sample_types,
                target_documents_per_channel=args.target_documents_per_channel,
            )
    try:
        summary = asyncio.run(run()); storage.finish_run(run_id); print(summary)
    except Exception as error:
        storage.fail_run(run_id, str(error)); raise
if __name__ == "__main__": main()
