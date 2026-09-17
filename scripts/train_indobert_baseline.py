"""Train and export the clean local IndoBERT baseline artifact."""

from __future__ import annotations
import argparse
from pathlib import Path
import sys

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from judol_detection.training.indobert_baseline import (
    build_model_manifest,
    create_deterministic_split,
    export_artifact,
    fine_tune_indobert,
    load_final_annotations,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.output.exists() and any(args.output.iterdir()):
        raise SystemExit(f"refusing to write into nonempty output directory: {args.output}")

    split = create_deterministic_split(load_final_annotations(args.dataset), seed=args.seed)
    args.output.mkdir(parents=True, exist_ok=True)
    split_path = args.output / "split-manifest.json"
    split.write(split_path)
    metrics = fine_tune_indobert(split, args.output, seed=args.seed)
    manifest = build_model_manifest(args.dataset, split_path, metrics)
    export_artifact(args.output, manifest)
    print(f"artifact={args.output}")
    print(f"split_counts={split.counts}")
    print(f"validation_metrics={metrics}")


if __name__ == "__main__":
    main()
