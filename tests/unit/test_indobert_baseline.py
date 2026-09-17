import hashlib
import json
import subprocess
import sys
from types import ModuleType
from pathlib import Path

import pandas as pd
import pytest

import judol_detection.training.indobert_baseline as indobert_baseline
from judol_detection.training.indobert_baseline import (
    LABEL_TO_ID,
    TrainingExample,
    build_model_manifest,
    create_deterministic_split,
    export_artifact,
    load_final_annotations,
)


def test_load_final_annotations_uses_only_raw_text_and_final_human_label(tmp_path: Path) -> None:
    dataset = tmp_path / "dataset_final.xlsx"
    pd.DataFrame(
        {
            "text_raw": ["bοnus slot", "aman"],
            "label_final": [1, 0],
            "weak_label": [0, 1],
        }
    ).to_excel(dataset, index=False)

    examples = load_final_annotations(dataset)

    assert examples == [
        TrainingExample(text="bοnus slot", label=1),
        TrainingExample(text="aman", label=0),
    ]


@pytest.mark.parametrize(
    ("texts", "labels", "message"),
    [([""], [1], "blank"), (["valid"], [2], "label_final")],
)
def test_load_final_annotations_rejects_invalid_final_dataset(
    tmp_path: Path, texts: list[str], labels: list[int], message: str
) -> None:
    dataset = tmp_path / "dataset_final.xlsx"
    pd.DataFrame({"text_raw": texts, "label_final": labels}).to_excel(dataset, index=False)

    with pytest.raises(ValueError, match=message):
        load_final_annotations(dataset)




def test_create_deterministic_split_rejects_normalized_duplicates_with_conflicting_labels() -> None:
    examples = [
        TrainingExample(" BONUS  slot ", 1),
        TrainingExample("bonus slot", 0),
    ]

    with pytest.raises(ValueError, match="conflicting"):
        create_deterministic_split(examples)
def test_create_deterministic_split_groups_whitespace_case_duplicates_without_changing_raw_text() -> None:
    examples = [
        TrainingExample(" BONUS  slot ", 1),
        TrainingExample("bonus slot", 1),
        TrainingExample("promo-1", 1),
        TrainingExample("promo-2", 1),
        TrainingExample("promo-3", 1),
        TrainingExample("promo-4", 1),
        TrainingExample("promo-5", 1),
        TrainingExample("promo-6", 1),
        TrainingExample("promo-7", 1),
        TrainingExample("promo-8", 1),
        TrainingExample("aman-1", 0),
        TrainingExample("aman-2", 0),
        TrainingExample("aman-3", 0),
        TrainingExample("aman-4", 0),
        TrainingExample("aman-5", 0),
        TrainingExample("aman-6", 0),
        TrainingExample("aman-7", 0),
        TrainingExample("aman-8", 0),
        TrainingExample("aman-9", 0),
        TrainingExample("aman-10", 0),
    ]

    split = create_deterministic_split(examples, seed=42)

    assert split == create_deterministic_split(examples, seed=42)
    duplicate_splits = {row.split for row in split.rows if row.text.casefold().strip().replace("  ", " ") == "bonus slot"}
    assert len(duplicate_splits) == 1
    assert {row.text for row in split.rows if row.label == 1} >= {" BONUS  slot ", "bonus slot"}
    assert {row.split for row in split.rows} == {"train", "validation", "test"}
    assert split.counts == {"train": 16, "validation": 2, "test": 2}



def test_calculate_classification_metrics_handles_expected_scores_and_zero_division() -> None:
    metrics_helper = getattr(indobert_baseline, "calculate_classification_metrics", None)

    assert callable(metrics_helper)
    assert metrics_helper(
        [[3.0, 0.1], [0.2, 0.8], [0.7, 0.3], [0.6, 0.4]],
        [0, 1, 1, 0],
    ) == pytest.approx({"accuracy": 0.75, "precision": 1.0, "recall": 0.5, "f1": 2 / 3})
    assert metrics_helper([[3.0, 0.1], [2.0, 0.2]], [0, 0]) == {
        "accuracy": 1.0,
        "precision": 0.0,
        "recall": 0.0,
        "f1": 0.0,
    }


def test_fine_tune_uses_dynamic_padding_and_metrics_callback_without_checkpoint_download(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    captured: dict[str, object] = {}

    class FakeTokenizer:
        @classmethod
        def from_pretrained(cls, checkpoint: str, **kwargs: object) -> "FakeTokenizer":
            captured["tokenizer_checkpoint"] = checkpoint
            captured["tokenizer_revision"] = kwargs["revision"]
            return cls()

        def __call__(self, text: str, **_: object) -> dict[str, list[int]]:
            token_count = len(text.split()) + 1
            return {"input_ids": list(range(token_count)), "attention_mask": [1] * token_count}

        def save_pretrained(self, output_dir: Path) -> None:
            captured["tokenizer_output_dir"] = output_dir

    class FakeModel:
        @classmethod
        def from_pretrained(cls, checkpoint: str, **kwargs: object) -> "FakeModel":
            captured["model_checkpoint"] = checkpoint
            captured["model_revision"] = kwargs["revision"]
            return cls()

        def save_pretrained(self, output_dir: Path) -> None:
            captured["model_output_dir"] = output_dir

    class RecordingDataCollator:
        def __init__(self, *, tokenizer: FakeTokenizer, padding: bool) -> None:
            captured["collator_tokenizer"] = tokenizer
            captured["collator_padding"] = padding

        def __call__(self, features: list[dict[str, object]]) -> dict[str, object]:
            captured["features"] = features
            max_length = max(len(feature["input_ids"]) for feature in features)  # type: ignore[arg-type]
            return {
                "input_ids": [
                    feature["input_ids"] + [0] * (max_length - len(feature["input_ids"]))  # type: ignore[operator,arg-type]
                    for feature in features
                ],
                "attention_mask": [
                    feature["attention_mask"] + [0] * (max_length - len(feature["attention_mask"]))  # type: ignore[operator,arg-type]
                    for feature in features
                ],
                "labels": [feature["labels"] for feature in features],
            }

    class FakeTrainingArguments:
        def __init__(self, **kwargs: object) -> None:
            captured["training_arguments"] = kwargs

    class FakeTrainer:
        def __init__(self, **kwargs: object) -> None:
            captured.update(kwargs)

        def train(self) -> None:
            return None

        def evaluate(self) -> dict[str, float]:
            return {"eval_accuracy": 0.75, "eval_precision": 1.0, "eval_recall": 0.5, "eval_f1": 2 / 3}

    transformers = ModuleType("transformers")
    transformers.AutoModelForSequenceClassification = FakeModel
    transformers.AutoTokenizer = FakeTokenizer
    transformers.DataCollatorWithPadding = RecordingDataCollator
    transformers.Trainer = FakeTrainer
    transformers.TrainingArguments = FakeTrainingArguments
    monkeypatch.setitem(sys.modules, "transformers", transformers)
    split = indobert_baseline.SplitManifest(
        rows=(
            indobert_baseline.SplitRow("one", "one", 0, "train"),
            indobert_baseline.SplitRow("three", "one two three", 1, "train"),
            indobert_baseline.SplitRow("validation", "validation", 0, "validation"),
        )
    )

    metrics = indobert_baseline.fine_tune_indobert(split, tmp_path / "model")

    collator = captured.get("data_collator")
    assert isinstance(collator, RecordingDataCollator)
    assert captured["collator_padding"] is True
    train_dataset = captured["train_dataset"]
    features = [train_dataset[index] for index in range(len(train_dataset))]  # type: ignore[arg-type,index]
    assert [len(feature["input_ids"]) for feature in features] == [2, 4]
    batch = collator(features)
    assert batch == {
        "input_ids": [[0, 1, 0, 0], [0, 1, 2, 3]],
        "attention_mask": [[1, 1, 0, 0], [1, 1, 1, 1]],
        "labels": [0, 1],
    }
    assert captured.get("compute_metrics") is getattr(indobert_baseline, "calculate_classification_metrics", None)
    assert metrics == pytest.approx({"accuracy": 0.75, "precision": 1.0, "recall": 0.5, "f1": 2 / 3})


def test_training_pins_the_checkpoint_revision_for_download_and_manifest(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    captured: dict[str, object] = {}

    class FakeTokenizer:
        @classmethod
        def from_pretrained(cls, checkpoint: str, **kwargs: object) -> "FakeTokenizer":
            captured["tokenizer_revision"] = kwargs["revision"]
            return cls()

        def __call__(self, _: str, **__: object) -> dict[str, list[int]]:
            return {"input_ids": [0], "attention_mask": [1]}

        def save_pretrained(self, _: Path) -> None:
            return None

    class FakeModel:
        @classmethod
        def from_pretrained(cls, checkpoint: str, **kwargs: object) -> "FakeModel":
            captured["model_revision"] = kwargs["revision"]
            return cls()

        def save_pretrained(self, _: Path) -> None:
            return None

    class FakeTrainingArguments:
        def __init__(self, **_: object) -> None:
            return None

    class FakeTrainer:
        def __init__(self, **_: object) -> None:
            return None

        def train(self) -> None:
            return None

        def evaluate(self) -> dict[str, float]:
            return {}

    class FakeCollator:
        def __init__(self, **_: object) -> None:
            return None

    transformers = ModuleType("transformers")
    transformers.AutoModelForSequenceClassification = FakeModel
    transformers.AutoTokenizer = FakeTokenizer
    transformers.DataCollatorWithPadding = FakeCollator
    transformers.Trainer = FakeTrainer
    transformers.TrainingArguments = FakeTrainingArguments
    monkeypatch.setitem(sys.modules, "transformers", transformers)

    split = indobert_baseline.SplitManifest(
        rows=(indobert_baseline.SplitRow("one", "one", 0, "train"),)
    )
    indobert_baseline.fine_tune_indobert(split, tmp_path / "model")

    assert captured["tokenizer_revision"] == indobert_baseline.BASE_CHECKPOINT_REVISION
    assert captured["model_revision"] == indobert_baseline.BASE_CHECKPOINT_REVISION

def test_build_manifest_hashes_exact_dataset_and_split_bytes_and_export_is_atomic(tmp_path: Path) -> None:
    dataset = tmp_path / "dataset_final.xlsx"
    split_manifest = tmp_path / "split.json"
    dataset.write_bytes(b"dataset bytes")
    split_manifest.write_bytes(b"split bytes")

    manifest = build_model_manifest(dataset, split_manifest, {"f1": 0.88})
    output_dir = tmp_path / "artifact"
    output_dir.mkdir()
    export_artifact(output_dir, manifest)

    exported = json.loads((output_dir / "model-manifest.json").read_text(encoding="utf-8"))
    assert manifest["base_checkpoint_revision"] == indobert_baseline.BASE_CHECKPOINT_REVISION
    assert exported["training_dataset_sha256"] == hashlib.sha256(b"dataset bytes").hexdigest()
    assert exported["split_manifest_sha256"] == hashlib.sha256(b"split bytes").hexdigest()
    assert exported["label_to_id"] == LABEL_TO_ID
    assert exported["preprocessing_version"] == "raw-text-v1-no-unicode-normalization"
    assert not list(output_dir.glob("*.tmp"))

def test_training_cli_imports_project_package_without_pythonpath() -> None:
    result = subprocess.run(
        [sys.executable, "scripts/train_indobert_baseline.py", "--help"],
        cwd=Path(__file__).resolve().parents[2],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "Train and export the clean local IndoBERT baseline artifact." in result.stdout
