"""Collect X Latest-search text through a persistent Camoufox profile."""

import argparse
import json
import sys
from dataclasses import replace
from pathlib import Path


SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from judol_detection.collection.storage import CollectionStorage
from judol_detection.collectors.x import XCamoufoxCollector


def enabled_queries(query_file: Path | None, direct_queries: list[str]) -> tuple[str, ...]:
    queries = list(direct_queries)
    if query_file is not None:
        payload = json.loads(query_file.read_text(encoding="utf-8"))
        queries.extend(item["query"] for item in payload["queries"] if item.get("enabled"))
    return tuple(dict.fromkeys(query.strip() for query in queries if query.strip()))


def config_sample_mode(query_file: Path | None) -> str:
    if query_file is None:
        return "candidate"
    payload = json.loads(query_file.read_text(encoding="utf-8"))
    mode = payload.get("sample_mode", "candidate")
    if mode not in {"candidate", "control"}:
        raise ValueError("query registry sample_mode must be 'candidate' or 'control'")
    return mode


def config_sample_types(query_file: Path | None) -> dict[str, str]:
    if query_file is None:
        return {}
    payload = json.loads(query_file.read_text(encoding="utf-8"))
    return {
        item["query"]: item["sample_type"]
        for item in payload.get("queries", [])
        if item.get("enabled") and item.get("sample_type") in {"natural", "hard"}
    }


def validate_control_sample_types(query_file: Path | None, sample_mode: str) -> None:
    if query_file is None or sample_mode != "control":
        return
    payload = json.loads(query_file.read_text(encoding="utf-8"))
    invalid = [
        item.get("query", "<missing>")
        for item in payload.get("queries", [])
        if item.get("enabled") and item.get("sample_type") not in {"natural", "hard"}
    ]
    if invalid:
        raise ValueError(f"control query entries require sample_type natural|hard: {invalid}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", action="append", default=[])
    parser.add_argument("--query-file", type=Path)
    parser.add_argument("--database", type=Path)
    parser.add_argument("--profile-dir", type=Path, default=Path("data/browser-profiles/x-research"))
    parser.add_argument("--candidate-only", action="store_true", default=True)
    parser.add_argument("--sample-mode", choices=("candidate", "control"))
    parser.add_argument("--near-duplicate-threshold", type=float, default=0.85)
    parser.add_argument("--language-filter", choices=("off", "strict"), default="strict")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    try:
        queries = enabled_queries(args.query_file, args.query)
        sample_mode = args.sample_mode or config_sample_mode(args.query_file)
        sample_types = config_sample_types(args.query_file)
        validate_control_sample_types(
            args.query_file,
            config_sample_mode(args.query_file),
        )
    except ValueError as error:
        parser.error(str(error))
    if not queries:
        parser.error("provide --query or --query-file")
    database = args.database or Path(
        "data/interim/x_control.sqlite" if sample_mode == "control" else "data/interim/x_camoufox_manual.sqlite"
    )
    if args.dry_run:
        print(
            f"dry-run: queries={list(queries)} mode=manual browser=camoufox "
            f"sample_mode={sample_mode} database={database} profile_dir={args.profile_dir}"
        )
        return

    storage = CollectionStorage(
        database,
        candidate_only=args.candidate_only,
        near_duplicate_threshold=args.near_duplicate_threshold,
        language_filter=args.language_filter,
        sample_mode=sample_mode,
    )
    run_id = storage.start_run(
        "x",
        "x_camoufox_manual",
        "|".join(queries),
        {
            "mode": "manual",
            "browser_backend": "camoufox",
            "queries": queries,
            "profile_dir": str(args.profile_dir),
            "candidate_only": args.candidate_only,
            "language_filter": args.language_filter,
            "sample_mode": sample_mode,
            "near_duplicate_threshold": args.near_duplicate_threshold,
        },
    )
    collector = XCamoufoxCollector()
    try:
        for query in queries:
            counts = {
                "inserted": 0,
                "duplicates": 0,
                "non_candidates": 0,
                "non_indonesian": 0,
            }

            def on_document(document) -> None:
                result = storage.store_document(
                    run_id,
                    replace(document, sample_type=sample_types.get(query)),
                )
                counts["inserted"] += int(result.inserted)
                counts["duplicates"] += int(
                    result.skip_reason in {"exact_duplicate", "near_duplicate"}
                )
                counts["non_candidates"] += int(result.skip_reason == "non_candidate")
                counts["non_indonesian"] += int(result.skip_reason == "non_indonesian")

            def progress(event) -> None:
                suffix = f" | stop={event.stop_reason}" if event.stop_reason else ""
                print(
                    f'[X] query="{event.query}" | responses={event.responses_seen} '
                    f"| observed={event.posts_observed} | parse_errors={event.parse_errors} "
                    f"| search_errors={event.search_errors} "
                    f"| last_error_status={event.last_search_error_status}{suffix}",
                    flush=True,
                )

            summary = collector.collect_query(
                profile_dir=args.profile_dir,
                query=query,
                on_document=on_document,
                on_progress=progress,
            )
            storage.record_x_query_result(
                run_id,
                query,
                scrolls=0,
                responses_seen=summary.responses_seen,
                posts_observed=summary.posts_observed,
                inserted_count=counts["inserted"],
                duplicate_count=counts["duplicates"],
                stop_reason=summary.stop_reason,
            )
            print(
                f'[X FINAL] query="{query}" | inserted={counts["inserted"]} '
                f'| non_candidate={counts["non_candidates"]} '
                f'| non_indonesian={counts["non_indonesian"]} '
                f'| duplicates={counts["duplicates"]} | responses={summary.responses_seen} '
                f'| observed={summary.posts_observed} | parse_errors={summary.parse_errors} '
                f'| search_errors={summary.search_errors} '
                f'| last_error_status={summary.last_search_error_status} '
                f"| stop={summary.stop_reason}",
                flush=True,
            )
        storage.finish_run(run_id)
    except Exception as error:
        storage.fail_run(run_id, str(error))
        raise


if __name__ == "__main__":
    main()
