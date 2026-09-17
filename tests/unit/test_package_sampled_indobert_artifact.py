import csv
import hashlib
import json
from pathlib import Path

import torch
from safetensors.torch import save_file

from scripts.package_sampled_indobert_artifact import package_sampled_indobert_artifact


def test_package_sampled_indobert_artifact_exports_api_compatible_local_model(tmp_path: Path) -> None:
    dataset = tmp_path / "dataset_sampled.xlsx"
    dataset.write_bytes(b"sampled dataset")

    source_dir = tmp_path / "source"
    source_model_dir = source_dir / "indobert_baseline_model"
    source_model_dir.mkdir(parents=True)
    (source_model_dir / "config.json").write_text(
        json.dumps({"architectures": ["BertForSequenceClassification"], "_num_labels": 5}),
        encoding="utf-8",
    )
    (source_model_dir / "tokenizer.json").write_text("{}", encoding="utf-8")
    (source_model_dir / "tokenizer_config.json").write_text("{}", encoding="utf-8")
    save_file(
        {
            "classifier.weight": torch.zeros((2, 768)),
            "classifier.bias": torch.zeros(2),
        },
        source_model_dir / "model.safetensors",
    )
    with (source_dir / "baseline_split_manifest.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["row_id", "text_raw", "target", "split"])
        writer.writeheader()
        writer.writerows(
            [
                {"row_id": "one", "text_raw": "aman", "target": "0", "split": "train"},
                {"row_id": "two", "text_raw": "bonus slot", "target": "1", "split": "validation"},
            ]
        )
    (source_dir / "indobert_experiment_config.json").write_text(
        json.dumps(
            {
                "model_name": "indobenchmark/indobert-base-p1",
                "model_revision": "c2cd0b51ddce6580eb35263b39b0a1e5fb0a39e2",
                "max_length": 256,
            }
        ),
        encoding="utf-8",
    )
    (source_dir / "indobert_validation_metrics.json").write_text(
        json.dumps({"positive_f1": 0.98}), encoding="utf-8"
    )

    output_dir = tmp_path / "artifact"
    package_sampled_indobert_artifact(source_dir, dataset, output_dir)

    config = json.loads((output_dir / "config.json").read_text(encoding="utf-8"))
    manifest = json.loads((output_dir / "model-manifest.json").read_text(encoding="utf-8"))
    split = json.loads((output_dir / "split-manifest.json").read_text(encoding="utf-8"))
    provenance = json.loads((output_dir / "artifact-provenance.json").read_text(encoding="utf-8"))

    assert (output_dir / "model.safetensors").read_bytes() == (source_model_dir / "model.safetensors").read_bytes()
    assert config["label2id"] == {"non_judol": 0, "judol": 1}
    assert config["id2label"] == {"0": "non_judol", "1": "judol"}
    assert config["_num_labels"] == 2
    assert manifest == {
        "model_name": "judollens-indobert-sampled-baseline",
        "model_version": "0.1.0",
        "base_checkpoint": "indobenchmark/indobert-base-p1",
        "base_checkpoint_revision": "c2cd0b51ddce6580eb35263b39b0a1e5fb0a39e2",
        "label_to_id": {"non_judol": 0, "judol": 1},
        "max_length": 256,
        "preprocessing_version": "raw-text-v1-no-unicode-normalization",
        "training_dataset_sha256": hashlib.sha256(b"sampled dataset").hexdigest(),
        "split_manifest_sha256": hashlib.sha256(
            (output_dir / "split-manifest.json").read_bytes()
        ).hexdigest(),
        "validation_metrics": {"positive_f1": 0.98},
        "trained_at": provenance["packaged_at"],
    }
    assert split["counts"] == {"train": 1, "validation": 1, "test": 0}
    assert split["seeded_split"] == [
        {"id": "one", "text": "aman", "label": 0, "split": "train"},
        {"id": "two", "text": "bonus slot", "label": 1, "split": "validation"},
    ]
    assert provenance["source_dataset"] == "dataset_sampled.xlsx"
    assert provenance["source_model_output"] == "source"
