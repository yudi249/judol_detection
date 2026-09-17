"""Clean, reproducible training utilities for the local IndoBERT baseline."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import random
from typing import Literal
from uuid import uuid4

import pandas as pd

BASE_CHECKPOINT = "indobenchmark/indobert-base-p1"
BASE_CHECKPOINT_REVISION = "c2cd0b51ddce6580eb35263b39b0a1e5fb0a39e2"
LABEL_TO_ID = {"non_judol": 0, "judol": 1}
MAX_LENGTH = 128
PREPROCESSING_VERSION = "raw-text-v1-no-unicode-normalization"

SplitName = Literal["train", "validation", "test"]


@dataclass(frozen=True)
class TrainingExample:
    """One final human-annotated raw text example."""

    text: str
    label: int


@dataclass(frozen=True)
class SplitRow:
    """A raw example's immutable identity and assigned split."""

    id: str
    text: str
    label: int
    split: SplitName


@dataclass(frozen=True)
class SplitManifest:
    """A deterministic, label-stratified split with raw source texts intact."""

    rows: tuple[SplitRow, ...]

    @property
    def counts(self) -> dict[str, int]:
        return {name: sum(row.split == name for row in self.rows) for name in ("train", "validation", "test")}

    def write(self, path: Path) -> None:
        _atomic_json_write(path, {"seeded_split": [asdict(row) for row in self.rows], "counts": self.counts})


def load_final_annotations(path: Path) -> list[TrainingExample]:
    """Read only human-final labels and unmodified input text from a workbook."""

    if path.suffix.lower() != ".xlsx":
        raise ValueError("final annotation dataset must be an .xlsx workbook")
    frame = pd.read_excel(path, engine="openpyxl")
    missing = {"text_raw", "label_final"} - set(frame.columns)
    if missing:
        raise ValueError(f"final dataset missing required column(s): {', '.join(sorted(missing))}")

    examples: list[TrainingExample] = []
    for index, row in frame.loc[:, ["text_raw", "label_final"]].iterrows():
        text = row["text_raw"]
        label = row["label_final"]
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"blank text_raw at Excel row {index + 2}")
        if isinstance(label, bool) or label not in (0, 1):
            raise ValueError(f"label_final at Excel row {index + 2} must be 0 or 1")
        examples.append(TrainingExample(text=text, label=int(label)))
    return examples


def _duplicate_key(text: str) -> str:
    """Stable duplicate key; intentionally never used as model input."""

    return " ".join(text.split()).casefold()




def calculate_classification_metrics(
    logits: object, label_ids: object | None = None
) -> dict[str, float]:
    """Calculate binary classification metrics from model logits and label IDs."""

    if label_ids is None:
        label_ids = logits.label_ids  # type: ignore[union-attr]
        logits = logits.predictions  # type: ignore[union-attr]
    if isinstance(logits, tuple):
        logits = logits[0]

    predicted_labels = [max(range(len(row)), key=row.__getitem__) for row in logits]  # type: ignore[union-attr,arg-type]
    true_positives = sum(predicted == 1 and actual == 1 for predicted, actual in zip(predicted_labels, label_ids, strict=True))  # type: ignore[arg-type]
    false_positives = sum(predicted == 1 and actual != 1 for predicted, actual in zip(predicted_labels, label_ids, strict=True))  # type: ignore[arg-type]
    false_negatives = sum(predicted != 1 and actual == 1 for predicted, actual in zip(predicted_labels, label_ids, strict=True))  # type: ignore[arg-type]
    correct = sum(predicted == actual for predicted, actual in zip(predicted_labels, label_ids, strict=True))  # type: ignore[arg-type]
    total = len(predicted_labels)
    precision = true_positives / (true_positives + false_positives) if true_positives + false_positives else 0.0
    recall = true_positives / (true_positives + false_negatives) if true_positives + false_negatives else 0.0
    return {
        "accuracy": correct / total if total else 0.0,
        "precision": precision,
        "recall": recall,
        "f1": 2 * precision * recall / (precision + recall) if precision + recall else 0.0,
    }
def _stable_id(text: str, label: int) -> str:
    return hashlib.sha256(f"{label}\0{text}".encode("utf-8")).hexdigest()


def _allocate_group_counts(size: int) -> tuple[int, int, int]:
    """Allocate 80/10/10 deterministically while retaining every group intact."""

    train = round(size * 0.8)
    validation = round(size * 0.1)
    train = min(train, size)
    validation = min(validation, size - train)
    return train, validation, size - train - validation


def create_deterministic_split(examples: list[TrainingExample], seed: int = 42) -> SplitManifest:
    """Return a seeded stratified 80/10/10 split without altering raw strings."""

    if not examples:
        raise ValueError("cannot split an empty training dataset")

    groups_by_label: dict[int, dict[str, list[TrainingExample]]] = {0: {}, 1: {}}
    labels_by_duplicate_key: dict[str, int] = {}
    for example in examples:
        if example.label not in groups_by_label:
            raise ValueError("training labels must be 0 or 1")
        duplicate_key = _duplicate_key(example.text)
        previous_label = labels_by_duplicate_key.setdefault(duplicate_key, example.label)
        if previous_label != example.label:
            raise ValueError("conflicting labels for normalized duplicate training text")
        groups_by_label[example.label].setdefault(duplicate_key, []).append(example)

    assignment: dict[str, SplitName] = {}
    for label, groups in groups_by_label.items():
        ordered_keys = list(groups)
        random.Random(seed + label).shuffle(ordered_keys)
        ordered_keys.sort(key=lambda key: len(groups[key]), reverse=True)
        group_sizes = {key: len(groups[key]) for key in ordered_keys}
        total = sum(group_sizes.values())
        targets = dict(zip(("train", "validation", "test"), _allocate_group_counts(total), strict=True))
        assigned = {"train": 0, "validation": 0, "test": 0}
        for key in ordered_keys:
            size = group_sizes[key]
            split = min(
                ("train", "validation", "test"),
                key=lambda name: (assigned[name] >= targets[name], assigned[name] - targets[name], name),
            )
            assignment[key] = split  # type: ignore[assignment]
            assigned[split] += size

    rows = tuple(
        SplitRow(id=_stable_id(example.text, example.label), text=example.text, label=example.label, split=assignment[_duplicate_key(example.text)])
        for example in examples
    )
    return SplitManifest(rows=rows)


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build_model_manifest(
    dataset_path: Path,
    split_manifest_path: Path,
    validation_metrics: dict[str, float],
    *,
    model_name: str = "judollens-indobert-clean",
    model_version: str = "0.1.0",
    base_checkpoint_revision: str = BASE_CHECKPOINT_REVISION,
) -> dict[str, object]:
    """Build metadata tied exactly to the dataset and split artifact bytes."""

    return {
        "model_name": model_name,
        "model_version": model_version,
        "base_checkpoint": BASE_CHECKPOINT,
        "base_checkpoint_revision": base_checkpoint_revision,
        "label_to_id": LABEL_TO_ID,
        "max_length": MAX_LENGTH,
        "preprocessing_version": PREPROCESSING_VERSION,
        "training_dataset_sha256": _sha256_file(dataset_path),
        "split_manifest_sha256": _sha256_file(split_manifest_path),
        "validation_metrics": validation_metrics,
        "trained_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    }


def _atomic_json_write(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid4().hex}.tmp")
    try:
        temporary.write_text(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2), encoding="utf-8")
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()


def export_artifact(output_dir: Path, manifest: dict[str, object]) -> None:
    """Atomically write a manifest after model and tokenizer files are present."""

    if (output_dir / "model-manifest.json").exists():
        raise ValueError(f"refusing to overwrite model manifest: {output_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    _atomic_json_write(output_dir / "model-manifest.json", manifest)

def fine_tune_indobert(split: SplitManifest, output_dir: Path, seed: int = 42) -> dict[str, float]:
    """Train the actual local model; imports and checkpoint access happen only here."""

    allowed_existing = {"split-manifest.json"}
    if output_dir.exists() and {path.name for path in output_dir.iterdir()} - allowed_existing:
        raise ValueError(f"refusing to train into nonempty output directory: {output_dir}")
    import torch
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        DataCollatorWithPadding,
        Trainer,
        TrainingArguments,
    )
    torch.manual_seed(seed)
    tokenizer = AutoTokenizer.from_pretrained(BASE_CHECKPOINT, revision=BASE_CHECKPOINT_REVISION)
    model = AutoModelForSequenceClassification.from_pretrained(
        BASE_CHECKPOINT,
        revision=BASE_CHECKPOINT_REVISION,
        num_labels=2,
        label2id=LABEL_TO_ID,
        id2label={value: key for key, value in LABEL_TO_ID.items()},
    )

    class _Dataset(torch.utils.data.Dataset[dict[str, object]]):
        def __init__(self, rows: list[SplitRow]) -> None:
            self.rows = rows

        def __len__(self) -> int:
            return len(self.rows)

        def __getitem__(self, index: int) -> dict[str, object]:
            row = self.rows[index]
            return dict(tokenizer(row.text, truncation=True, max_length=MAX_LENGTH)) | {"labels": row.label}

    train_rows = [row for row in split.rows if row.split == "train"]
    validation_rows = [row for row in split.rows if row.split == "validation"]
    trainer = Trainer(
        model=model,
        args=TrainingArguments(output_dir=str(output_dir), seed=seed, report_to="none"),
        train_dataset=_Dataset(train_rows),
        eval_dataset=_Dataset(validation_rows),
        data_collator=DataCollatorWithPadding(tokenizer=tokenizer, padding=True),
        compute_metrics=calculate_classification_metrics
    )
    trainer.train()
    metrics = trainer.evaluate()
    output_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    return {name: float(metrics.get(f"eval_{name}", 0.0)) for name in ("f1", "precision", "recall", "accuracy")}
