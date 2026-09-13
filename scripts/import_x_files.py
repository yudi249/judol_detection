"""Import researcher-saved X SearchTimeline response files into SQLite."""

import argparse
from dataclasses import replace
from pathlib import Path
import sys


SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from judol_detection.collection.storage import CollectionStorage
from judol_detection.collection.language import detect_indonesian_language
from judol_detection.collection.models import CollectedDocument
from judol_detection.collectors.x import XSearchTimelineParser
from judol_detection.collectors.x_file import load_x_collection_export, load_x_response_batches


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import locally saved X SearchTimeline JavaScript response files."
    )
    parser.add_argument("--input", type=Path, action="append", required=True)
    parser.add_argument("--database", type=Path, default=Path("data/interim/x_manual_import.sqlite"))
    parser.add_argument("--candidate-only", action="store_true", default=True)
    parser.add_argument("--sample-mode", choices=("candidate", "control"), default="candidate")
    parser.add_argument("--near-duplicate-threshold", type=float, default=0.85)
    parser.add_argument("--language-filter", choices=("off", "strict"), default="strict")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    inputs = tuple(dict.fromkeys(path.resolve() for path in args.input))
    loaded = []
    for path in inputs:
        if path.suffix.lower() == ".json":
            loaded.append((path, "normalized", load_x_collection_export(path)))
        else:
            loaded.append((path, "graphql", load_x_response_batches(path)))
    if args.dry_run:
        for path, kind, payload in loaded:
            count = len(payload["items"]) if kind == "normalized" else len(payload)
            unit = "items" if kind == "normalized" else "batches"
            print(f"[X IMPORT DRY RUN] file={path.stem} | source={kind} | {unit}={count}")
        return

    storage = CollectionStorage(
        args.database,
        candidate_only=args.candidate_only,
        near_duplicate_threshold=args.near_duplicate_threshold,
        language_filter=args.language_filter,
        sample_mode=args.sample_mode,
    )
    run_id = storage.start_run(
        "x",
        "x_manual_file_import",
        "|".join(
            payload["query"] if kind == "normalized" else path.stem
            for path, kind, payload in loaded
        ),
        {
            "input_files": [str(path) for path, _, _ in loaded],
            "language_filter": args.language_filter,
            "near_duplicate_threshold": args.near_duplicate_threshold,
            "sample_mode": args.sample_mode,
        },
    )
    parser_adapter = XSearchTimelineParser()
    try:
        for path, kind, payload in loaded:
            parsed = inserted = non_candidates = non_indonesian = duplicates = 0
            if kind == "normalized":
                export = payload
                documents = normalized_documents(export)
                source_type = "x_graphql_extension_json"
            else:
                documents = tuple(
                    document
                    for batch in payload
                    for document in parser_adapter.parse_response(
                        batch,
                        query=path.stem,
                        source_type="x_search_timeline_manual_file",
                    )
                )
                source_type = "x_search_timeline_manual_file"
            parsed += len(documents)
            for document in documents:
                result = storage.store_document(
                    run_id,
                    replace(
                        document,
                        raw_payload_path=str(path),
                        source_type=source_type,
                    ),
                )
                inserted += int(result.inserted)
                non_candidates += int(result.skip_reason == "non_candidate")
                non_indonesian += int(result.skip_reason == "non_indonesian")
                duplicates += int(result.skip_reason in {"exact_duplicate", "near_duplicate"})
            print(
                f"[X IMPORT] file={path.stem} | source={source_type} | parsed={parsed} "
                f"| inserted={inserted} | non_candidate={non_candidates} "
                f"| non_indonesian={non_indonesian} | duplicates={duplicates}",
                flush=True,
            )
        storage.finish_run(run_id)
    except Exception as error:
        storage.fail_run(run_id, str(error))
        raise


def normalized_documents(export: dict) -> tuple[CollectedDocument, ...]:
    """Convert extension records to the shared document contract."""
    documents = []
    seen_ids = set()
    for item in export["items"]:
        source_item_id = item["source_item_id"]
        if source_item_id in seen_ids:
            continue
        seen_ids.add(source_item_id)
        language = detect_indonesian_language(item["text_raw"])
        documents.append(
            CollectedDocument(
                platform="x",
                source_type="x_graphql_extension_json",
                text_raw=item["text_raw"].strip(),
                source_item_id=source_item_id,
                source_url=item["source_url"],
                published_at=item.get("published_at"),
                language_hint=language.language_hint,
            )
        )
    return tuple(documents)


if __name__ == "__main__":
    main()
