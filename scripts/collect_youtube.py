"""Collect candidate YouTube video metadata without downloading media."""
import argparse
import json
from dataclasses import replace
from pathlib import Path
import sys

import yt_dlp

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC_DIR))

from judol_detection.collection.storage import CollectionStorage
from judol_detection.collectors.youtube import QuietYtDlpLogger, YouTubeMetadataCollector, video_metadata_to_document


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", action="append", default=[])
    parser.add_argument("--query-file", type=Path)
    parser.add_argument("--search-limit", type=int, default=50)
    parser.add_argument("--database", type=Path)
    parser.add_argument("--raw-payload-dir", type=Path, default=Path("data/raw/youtube"))
    parser.add_argument("--candidate-only", action="store_true", default=True)
    parser.add_argument("--sample-mode", choices=("candidate", "control"))
    parser.add_argument("--near-duplicate-threshold", type=float, default=0.85)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    queries = list(args.query)
    config_sample_mode = "candidate"
    sample_types = {}
    if args.query_file:
        payload = json.loads(args.query_file.read_text(encoding="utf-8"))
        config_sample_mode = payload.get("sample_mode", "candidate")
        sample_types = {item["query"]: item["sample_type"] for item in payload.get("queries", []) if item.get("enabled") and item.get("sample_type") in {"natural", "hard"}}
        queries.extend(item["query"] for item in payload["queries"] if item.get("enabled"))
    sample_mode = args.sample_mode or config_sample_mode
    if config_sample_mode == "control":
        invalid = [item.get("query", "<missing>") for item in (payload.get("queries", []) if args.query_file else []) if item.get("enabled") and item.get("sample_type") not in {"natural", "hard"}]
        if invalid:
            parser.error(f"control query entries require sample_type natural|hard: {invalid}")
    if sample_mode not in {"candidate", "control"}:
        parser.error("query registry sample_mode must be 'candidate' or 'control'")
    queries = tuple(dict.fromkeys(query.strip() for query in queries if query.strip()))
    if not queries:
        parser.error("provide --query or --query-file")
    database = args.database or Path(
        "data/interim/youtube_control.sqlite" if sample_mode == "control" else "data/interim/youtube_pilot.sqlite"
    )
    if args.dry_run:
        print(f"dry-run: queries={list(queries)} search_limit={args.search_limit} sample_mode={sample_mode}")
        return
    storage = CollectionStorage(database, candidate_only=args.candidate_only, near_duplicate_threshold=args.near_duplicate_threshold, sample_mode=sample_mode)
    run_id = storage.start_run("youtube", "youtube_metadata", "|".join(queries), {"search_limit": args.search_limit, "queries": queries, "sample_mode": sample_mode})
    args.raw_payload_dir.mkdir(parents=True, exist_ok=True)
    options = {"quiet": True, "no_warnings": True, "logger": QuietYtDlpLogger(), "skip_download": True, "extract_flat": "in_playlist"}
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            collector = YouTubeMetadataCollector(ydl)
            def progress(stage, query, value):
                labels = {"query_started": "mencari", "query_results": "hasil pencarian", "video_enriched": "video unik diperkaya"}
                print(f'[YOUTUBE] query="{query}" | {labels[stage]}={value}', flush=True)

            for query, metadata in collector.collect_queries(queries, search_limit=args.search_limit, on_progress=progress):
                video_id = metadata["id"]
                payload_path = args.raw_payload_dir / f"{video_id}.json"
                payload_path.write_text(json.dumps(ydl.sanitize_info(metadata), ensure_ascii=False), encoding="utf-8")
                result = storage.store_document(
                    run_id,
                    replace(
                        video_metadata_to_document(metadata, raw_payload_path=str(payload_path)),
                        sample_type=sample_types.get(query),
                    ),
                )
                print(f'query="{query}" video={video_id} inserted={result.inserted} reason={result.skip_reason}', flush=True)
        storage.finish_run(run_id)
    except Exception as error:
        storage.fail_run(run_id, str(error))
        raise


if __name__ == "__main__":
    main()
