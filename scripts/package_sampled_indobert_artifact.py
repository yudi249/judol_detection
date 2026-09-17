"""Package a sampled notebook IndoBERT output as a local FastAPI artifact."""

from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory
from typing import Any

from safetensors import safe_open


_API_LABEL_TO_ID = {"non_judol": 0, "judol": 1}
_PREPROCESSING_VERSION = "raw-text-v1-no-unicode-normalization"
_REQUIRED_MODEL_FILES = ("config.json", "tokenizer.json", "tokenizer_config.json", "model.safetensors")
_REQUIRED_SOURCE_FILES = (
    "baseline_split_manifest.csv",
    "indobert_experiment_config.json",
    "indobert_validation_metrics.json",
)


def _load_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ValueError(f"required file does not exist: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"JSON file is invalid: {path}") from exc
    if not isinstance(payload, dict):
        raise ValueError(f"JSON object required: {path}")
    return payload


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _load_split_rows(path: Path) -> list[dict[str, object]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        required_columns = {"row_id", "text_raw", "target", "split"}
        if reader.fieldnames is None or required_columns - set(reader.fieldnames):
            raise ValueError(f"source split manifest lacks required columns: {path}")
        rows: list[dict[str, object]] = []
        for row in reader:
            split = row["split"]
            if split not in {"train", "validation", "test"}:
                raise ValueError(f"invalid source split {split!r}")
            try:
                label = int(row["target"])
            except ValueError as exc:
                raise ValueError(f"invalid source target {row['target']!r}") from exc
            if label not in {0, 1}:
                raise ValueError(f"source target must be 0 or 1: {label}")
            text = row["text_raw"]
            if not text:
                raise ValueError("source split manifest contains blank text_raw")
            rows.append({"id": row["row_id"], "text": text, "label": label, "split": split})
    if not rows:
        raise ValueError("source split manifest is empty")
    return rows


def _validate_source_model(model_dir: Path) -> None:
    missing_files = [name for name in _REQUIRED_MODEL_FILES if not (model_dir / name).is_file()]
    if missing_files:
        raise ValueError(f"source model lacks required file(s): {', '.join(missing_files)}")
    with safe_open(model_dir / "model.safetensors", framework="pt") as archive:
        if archive.get_tensor("classifier.weight").shape[0] != 2:
            raise ValueError("source classifier must have exactly two output labels")
        if archive.get_tensor("classifier.bias").shape != (2,):
            raise ValueError("source classifier bias must have shape (2,)")


def _write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def package_sampled_indobert_artifact(source_dir: Path, dataset_path: Path, output_dir: Path) -> None:
    """Create a manifest-validated API artifact without changing trained weights."""
    source_dir = source_dir.resolve()
    dataset_path = dataset_path.resolve()
    output_dir = output_dir.resolve()
    model_dir = source_dir / "indobert_baseline_model"

    if not dataset_path.is_file():
        raise ValueError(f"dataset does not exist: {dataset_path}")
    for name in _REQUIRED_SOURCE_FILES:
        if not (source_dir / name).is_file():
            raise ValueError(f"source output lacks required file: {source_dir / name}")
    if output_dir.exists():
        raise ValueError(f"refusing to overwrite artifact directory: {output_dir}")

    _validate_source_model(model_dir)
    experiment = _load_json(source_dir / "indobert_experiment_config.json")
    validation_metrics = _load_json(source_dir / "indobert_validation_metrics.json")
    base_checkpoint = experiment.get("model_name")
    base_checkpoint_revision = experiment.get("model_revision")
    max_length = experiment.get("max_length")
    if base_checkpoint != "indobenchmark/indobert-base-p1":
        raise ValueError("source experiment has an unexpected base checkpoint")
    if not isinstance(base_checkpoint_revision, str) or not base_checkpoint_revision:
        raise ValueError("source experiment lacks model_revision")
    if not isinstance(max_length, int) or not 1 <= max_length <= 512:
        raise ValueError("source experiment max_length must be an integer in [1, 512]")
    if not all(isinstance(value, int | float) for value in validation_metrics.values()):
        raise ValueError("source validation metrics must be numeric")

    split_rows = _load_split_rows(source_dir / "baseline_split_manifest.csv")
    counts = {name: sum(row["split"] == name for row in split_rows) for name in ("train", "validation", "test")}
    packaged_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    output_dir.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix=f".{output_dir.name}.", dir=output_dir.parent) as temporary_directory:
        temporary_output = Path(temporary_directory)
        for name in _REQUIRED_MODEL_FILES:
            shutil.copy2(model_dir / name, temporary_output / name)

        config = _load_json(temporary_output / "config.json")
        config.update(
            {
                "_num_labels": 2,
                "num_labels": 2,
                "label2id": _API_LABEL_TO_ID,
                "id2label": {str(identifier): label for label, identifier in _API_LABEL_TO_ID.items()},
            }
        )
        _write_json(temporary_output / "config.json", config)

        split_path = temporary_output / "split-manifest.json"
        _write_json(split_path, {"seeded_split": split_rows, "counts": counts})
        provenance = {
            "artifact_kind": "sampled_notebook_baseline",
            "source_dataset": dataset_path.name,
            "source_model_output": source_dir.name,
            "source_model_safetensors_sha256": _sha256(model_dir / "model.safetensors"),
            "packaged_at": packaged_at,
        }
        _write_json(temporary_output / "artifact-provenance.json", provenance)
        manifest = {
            "model_name": "judollens-indobert-sampled-baseline",
            "model_version": "0.1.0",
            "base_checkpoint": base_checkpoint,
            "base_checkpoint_revision": base_checkpoint_revision,
            "label_to_id": _API_LABEL_TO_ID,
            "max_length": max_length,
            "preprocessing_version": _PREPROCESSING_VERSION,
            "training_dataset_sha256": _sha256(dataset_path),
            "split_manifest_sha256": _sha256(split_path),
            "validation_metrics": validation_metrics,
            "trained_at": packaged_at,
        }
        _write_json(temporary_output / "model-manifest.json", manifest)
        temporary_output.replace(output_dir)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    package_sampled_indobert_artifact(args.source, args.dataset, args.output)
    print(f"artifact={args.output}")


if __name__ == "__main__":
    main()
