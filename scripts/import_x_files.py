"""Import researcher-saved X SearchTimeline response files into SQLite."""

import argparse
from dataclasses import replace
from pathlib import Path
import sys


SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from judol_detection.collection.storage import CollectionStorage
from judol_detection.collectors.x import XSearchTimelineParser
from judol_detection.collectors.x_file import load_x_response_batches


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import locally saved X SearchTimeline JavaScript response files."
    )
    parser.add_argument("--input", type=Path, action="append", required=True)
    parser.add_argument("--database", type=Path, default=Path("data/interim/x_manual_import.sqlite"))
    parser.add_argument("--candidate-only", action="store_true", default=True)
    parser.add_argument("--near-duplicate-threshold", type=float, default=0.85)
    parser.add_argument("--language-filter", choices=("off", "strict"), default="strict")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    inputs = tuple(dict.fromkeys(path.resolve() for path in args.input))
    loaded = [(path, load_x_response_batches(path)) for path in inputs]
    if args.dry_run:
        for path, batches in loaded:
            print(f"[X IMPORT DRY RUN] file={path.stem} | batches={len(batches)}")
        return

    storage = CollectionStorage(
        args.database,
        candidate_only=args.candidate_only,
        near_duplicate_threshold=args.near_duplicate_threshold,
        language_filter=args.language_filter,
    )
    run_id = storage.start_run(
        "x",
        "x_manual_file_import",
        "|".join(path.stem for path, _ in loaded),
        {
            "input_files": [str(path) for path, _ in loaded],
            "language_filter": args.language_filter,
            "near_duplicate_threshold": args.near_duplicate_threshold,
        },
    )
    parser_adapter = XSearchTimelineParser()
    try:
        for path, batches in loaded:
            parsed = inserted = non_candidates = non_indonesian = duplicates = 0
            for batch in batches:
                documents = parser_adapter.parse_response(
                    batch,
                    query=path.stem,
                    source_type="x_search_timeline_manual_file",
                )
                parsed += len(documents)
                for document in documents:
                    result = storage.store_document(run_id, replace(document, raw_payload_path=str(path)))
                    inserted += int(result.inserted)
                    non_candidates += int(result.skip_reason == "non_candidate")
                    non_indonesian += int(result.skip_reason == "non_indonesian")
                    duplicates += int(result.skip_reason in {"exact_duplicate", "near_duplicate"})
            print(
                f"[X IMPORT] file={path.stem} | batches={len(batches)} | parsed={parsed} "
                f"| inserted={inserted} | non_candidate={non_candidates} "
                f"| non_indonesian={non_indonesian} | duplicates={duplicates}",
                flush=True,
            )
        storage.finish_run(run_id)
    except Exception as error:
        storage.fail_run(run_id, str(error))
        raise


if __name__ == "__main__":
    main()
