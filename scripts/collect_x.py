"""Collect bounded X Latest-search samples through a persistent browser profile."""

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path


SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from judol_detection.collection.storage import CollectionStorage
from judol_detection.collectors.x import XPlaywrightCollector


def positive_integer(value: str) -> int:
    try:
        number = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("must be a positive integer") from error
    if number < 1:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return number


def nonnegative_integer(value: str) -> int:
    try:
        number = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("must be zero or a positive integer") from error
    if number < 0:
        raise argparse.ArgumentTypeError("must be zero or a positive integer")
    return number


def enabled_queries(query_file: Path | None, direct_queries: list[str]) -> tuple[str, ...]:
    queries = list(direct_queries)
    if query_file is not None:
        payload = json.loads(query_file.read_text(encoding="utf-8"))
        queries.extend(item["query"] for item in payload["queries"] if item.get("enabled"))
    return tuple(dict.fromkeys(query.strip() for query in queries if query.strip()))


def query_slug(query: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", query.lower()).strip("-") or "query"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", action="append", default=[])
    parser.add_argument("--query-file", type=Path)
    parser.add_argument("--database", type=Path, default=Path("data/interim/x_latest_pilot.sqlite"))
    parser.add_argument("--profile-dir", type=Path, default=Path("data/browser-profiles/x-research"))
    parser.add_argument("--raw-payload-dir", type=Path, default=Path("data/raw/x"))
    parser.add_argument("--max-posts", type=positive_integer, default=100)
    parser.add_argument("--max-scrolls", type=positive_integer, default=30)
    parser.add_argument("--no-progress-limit", type=positive_integer, default=3)
    parser.add_argument("--scroll-interval-ms", type=positive_integer, default=1500)
    parser.add_argument(
        "--login-timeout-seconds",
        type=nonnegative_integer,
        default=0,
        help="normally 0; run scripts/login_x.py to prepare the persistent session",
    )
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--candidate-only", action="store_true", default=True)
    parser.add_argument("--near-duplicate-threshold", type=float, default=0.85)
    parser.add_argument("--language-filter", choices=("off", "strict"), default="strict")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    queries = enabled_queries(args.query_file, args.query)
    if not queries:
        parser.error("provide --query or --query-file")
    if args.dry_run:
        print(
            f"dry-run: queries={list(queries)} mode=latest max_posts={args.max_posts} "
            f"max_scrolls={args.max_scrolls} login_timeout_seconds={args.login_timeout_seconds} "
            f"database={args.database} profile_dir={args.profile_dir}"
        )
        return

    storage = CollectionStorage(
        args.database,
        candidate_only=args.candidate_only,
        near_duplicate_threshold=args.near_duplicate_threshold,
        language_filter=args.language_filter,
    )
    run_id = storage.start_run(
        "x",
        "x_playwright_search_timeline",
        "|".join(queries),
        {
            "mode": "latest",
            "queries": queries,
            "max_posts": args.max_posts,
            "max_scrolls": args.max_scrolls,
            "no_progress_limit": args.no_progress_limit,
            "scroll_interval_ms": args.scroll_interval_ms,
            "login_timeout_seconds": args.login_timeout_seconds,
            "headless": args.headless,
            "language_filter": args.language_filter,
            "near_duplicate_threshold": args.near_duplicate_threshold,
        },
    )
    collector = XPlaywrightCollector(
        max_posts=args.max_posts,
        max_scrolls=args.max_scrolls,
        no_progress_limit=args.no_progress_limit,
        scroll_interval_ms=args.scroll_interval_ms,
        login_timeout_seconds=args.login_timeout_seconds,
    )
    try:
        for query in queries:
            query_raw_dir = args.raw_payload_dir / str(run_id)
            query_raw_dir.mkdir(parents=True, exist_ok=True)

            def save_payload(payload: dict) -> str:
                serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
                digest = hashlib.sha256(serialized).hexdigest()[:16]
                path = query_raw_dir / f"{query_slug(query)}-{digest}.json"
                if not path.exists():
                    path.write_bytes(serialized)
                return str(path)

            def progress(event) -> None:
                suffix = f" | stop={event.stop_reason}" if event.stop_reason else ""
                print(
                    f'[X] query="{event.query}" | scroll={event.scrolls} | responses={event.responses_seen} '
                    f"| observed={event.posts_observed}{suffix}",
                    flush=True,
                )

            summary = collector.collect_query(
                profile_dir=args.profile_dir,
                query=query,
                headless=args.headless,
                on_progress=progress,
                on_payload=save_payload,
            )
            inserted = duplicates = non_candidates = non_indonesian = 0
            for document in summary.documents:
                result = storage.store_document(run_id, document)
                inserted += int(result.inserted)
                duplicates += int(result.skip_reason in {"exact_duplicate", "near_duplicate"})
                non_candidates += int(result.skip_reason == "non_candidate")
                non_indonesian += int(result.skip_reason == "non_indonesian")
            storage.record_x_query_result(
                run_id,
                query,
                scrolls=summary.scrolls,
                responses_seen=summary.responses_seen,
                posts_observed=len(summary.documents),
                inserted_count=inserted,
                duplicate_count=duplicates,
                stop_reason=summary.stop_reason,
            )
            print(
                f'[X FINAL] query="{query}" | inserted={inserted} | non_candidate={non_candidates} '
                f"| non_indonesian={non_indonesian} | duplicates={duplicates} | stop={summary.stop_reason}",
                flush=True,
            )
        storage.finish_run(run_id)
    except Exception as error:
        storage.fail_run(run_id, str(error))
        raise


if __name__ == "__main__":
    main()
