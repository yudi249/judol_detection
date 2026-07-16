"""Collect newest-first YouTube search metadata through Data API v3."""
import argparse, json, os, sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"; sys.path.insert(0, str(SRC_DIR))
from judol_detection.collection.storage import CollectionStorage
from judol_detection.collectors.youtube_api import YouTubeDataApiCollector


def load_dotenv(path: Path) -> None:
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                key, value = line.split("=", 1); os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def main() -> None:
    load_dotenv(Path(".env")); parser = argparse.ArgumentParser()
    parser.add_argument("--query", action="append", default=[]); parser.add_argument("--query-file", type=Path)
    parser.add_argument("--max-pages", type=int, default=1); parser.add_argument("--published-after"); parser.add_argument("--published-before"); parser.add_argument("--region-code", default="ID")
    parser.add_argument("--database", type=Path, default=Path("data/interim/youtube_api.sqlite")); parser.add_argument("--raw-payload-dir", type=Path, default=Path("data/raw/youtube-api")); parser.add_argument("--candidate-only", action="store_true", default=True); parser.add_argument("--near-duplicate-threshold", type=float, default=0.85); parser.add_argument("--language-filter", choices=("off", "strict"), default="strict"); parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(); queries = list(args.query)
    if args.query_file:
        queries += [item["query"] for item in json.loads(args.query_file.read_text(encoding="utf-8"))["queries"] if item.get("enabled")]
    queries = tuple(dict.fromkeys(q.strip() for q in queries if q.strip()))
    if not queries: parser.error("provide --query or --query-file")
    if args.dry_run: print(f"dry-run: queries={list(queries)} max_pages={args.max_pages} order=date"); return
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key: raise SystemExit("Set YOUTUBE_API_KEY in the environment before collection.")
    storage = CollectionStorage(args.database, candidate_only=args.candidate_only, near_duplicate_threshold=args.near_duplicate_threshold, language_filter=args.language_filter); run_id = storage.start_run("youtube", "youtube_data_api", "|".join(queries), {"queries": queries, "max_pages": args.max_pages, "published_after": args.published_after, "published_before": args.published_before, "region_code": args.region_code, "language_filter": args.language_filter})
    args.raw_payload_dir.mkdir(parents=True, exist_ok=True)
    try:
        for query in queries:
            count = 0
            for document, item in YouTubeDataApiCollector(api_key).collect_query(query, max_pages=args.max_pages, published_after=args.published_after, published_before=args.published_before, region_code=args.region_code):
                path = args.raw_payload_dir / f"{document.source_item_id}.json"; path.write_text(json.dumps(item, ensure_ascii=False), encoding="utf-8")
                result = storage.store_document(run_id, document.__class__(**{**document.__dict__, "raw_payload_path": str(path)})); count += 1
                print(f'[LANGUAGE] video={document.source_item_id} hint={document.language_hint} reason={result.skip_reason}', flush=True)
            print(f'[YOUTUBE API] query="{query}" | result={count} | order=date', flush=True)
        storage.finish_run(run_id)
    except Exception as error: storage.fail_run(run_id, str(error)); raise

if __name__ == "__main__": main()
