"""Export a local JudolLens IndoBERT classifier to FP32 and dynamic-INT8 ONNX.

The command leaves its source artifact untouched and refuses a non-empty output
path. It emits conversion-report.json with numerical and decision parity evidence.
"""

from __future__ import annotations

import argparse
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
import sys
from typing import Any

import onnxruntime as ort
from onnxruntime.quantization import QuantType, quantize_dynamic
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
if str(REPOSITORY_ROOT) not in sys.path:
    sys.path.insert(0, str(REPOSITORY_ROOT))

from apps.api.app.services.model_manifest import ModelManifest, load_model_manifest

FP32_PROBABILITY_TOLERANCE = 1e-4
SAFE_PARITY_TEXTS = (
    "slot gacor bonus member baru daftar sekarang",
    "Cuaca pagi ini cerah dan saya akan berangkat kuliah.",
    "sⅼοt gɑcor bonus besar, daftar di https://example.invalid",
    "Rapat penelitian dijadwalkan pada hari Senin pukul sembilan.",
)


@dataclass(frozen=True)
class SourceArtifact:
    """The locally loaded source components used for one conversion."""

    directory: Path
    manifest: ModelManifest
    tokenizer: Any
    model: Any


def action_for_probability(probability: float) -> str:
    """Return the API action derived from an unrounded judol probability."""
    if probability >= 0.85:
        return "blur"
    if probability >= 0.65:
        return "warn"
    return "none"


def label_for_probability(probability: float, threshold: float) -> str:
    """Return the API label derived from an unrounded judol probability."""
    return "judol" if probability >= threshold else "non_judol"


def assess_decision_parity(
    *,
    torch_probability: float,
    onnx_probability: float,
    int8_probability: float,
    threshold: float,
) -> dict[str, bool | float]:
    """Compare FP32 and INT8 serving decisions to the PyTorch reference."""
    torch_label = label_for_probability(torch_probability, threshold)
    torch_action = action_for_probability(torch_probability)
    return {
        "fp32_probability_delta": abs(torch_probability - onnx_probability),
        "int8_probability_delta": abs(torch_probability - int8_probability),
        "fp32_label_matches": torch_label == label_for_probability(onnx_probability, threshold),
        "int8_label_matches": torch_label == label_for_probability(int8_probability, threshold),
        "fp32_action_matches": torch_action == action_for_probability(onnx_probability),
        "int8_action_matches": torch_action == action_for_probability(int8_probability),
    }


def require_empty_output_directory(output_dir: Path) -> None:
    """Reject output paths that could overwrite prior conversion evidence."""
    if output_dir.exists() and any(output_dir.iterdir()):
        raise ValueError(f"output directory must not already contain files: {output_dir}")


def load_source_artifact(source_dir: Path) -> SourceArtifact:
    """Load a manifest-valid local classifier without a network fallback."""
    source_dir = source_dir.resolve()
    manifest = load_model_manifest(source_dir / "model-manifest.json")
    tokenizer = AutoTokenizer.from_pretrained(source_dir, local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(source_dir, local_files_only=True)
    if model.config.label2id != manifest.label_to_id:
        raise ValueError("loaded model label2id does not match model manifest")
    model.eval()
    return SourceArtifact(source_dir, manifest, tokenizer, model)


def _copy_tokenizer_files(source_dir: Path, target_dir: Path) -> None:
    target_dir.mkdir(parents=True, exist_ok=True)
    for source_path in source_dir.iterdir():
        if source_path.is_file() and source_path.name != "model.safetensors":
            shutil.copy2(source_path, target_dir / source_path.name)


def _softmax_judol_probability(logits: Any) -> list[float]:
    tensor = torch.as_tensor(logits, dtype=torch.float32)
    return torch.softmax(tensor, dim=1)[:, 1].tolist()


class _ClassifierLogits(torch.nn.Module):
    """Adapt Hugging Face's structured output to an ONNX logits tensor."""

    def __init__(self, model: Any) -> None:
        super().__init__()
        self.model = model

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
        token_type_ids: torch.Tensor,
    ) -> torch.Tensor:
        return self.model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids,
        ).logits


def _onnx_inputs(session: ort.InferenceSession, encoded: dict[str, torch.Tensor]) -> dict[str, Any]:
    expected = {item.name for item in session.get_inputs()}
    missing = expected - set(encoded)
    if missing:
        raise ValueError(f"tokenizer did not produce ONNX input(s): {', '.join(sorted(missing))}")
    return {name: encoded[name].detach().cpu().numpy() for name in expected}


def _run_onnx(session: ort.InferenceSession, encoded: dict[str, torch.Tensor]) -> list[float]:
    outputs = session.run(None, _onnx_inputs(session, encoded))
    if len(outputs) != 1:
        raise ValueError("ONNX classifier must produce exactly one logits output")
    return _softmax_judol_probability(outputs[0])


def _export_fp32(source: SourceArtifact, output_dir: Path) -> Path:
    fp32_dir = output_dir / "fp32"
    fp32_dir.mkdir()
    model_path = fp32_dir / "model.onnx"
    example = source.tokenizer(
        list(SAFE_PARITY_TEXTS[:2]),
        truncation=True,
        max_length=source.manifest.max_length,
        padding=True,
        return_tensors="pt",
    )
    required_inputs = ("input_ids", "attention_mask", "token_type_ids")
    missing_inputs = [name for name in required_inputs if name not in example]
    if missing_inputs:
        raise ValueError(f"tokenizer lacks required IndoBERT inputs: {', '.join(missing_inputs)}")
    torch.onnx.export(
        _ClassifierLogits(source.model),
        tuple(example[name] for name in required_inputs),
        model_path,
        input_names=list(required_inputs),
        output_names=["logits"],
        opset_version=17,
        dynamo=False,
        dynamic_axes={
            **{name: {0: "batch", 1: "sequence"} for name in required_inputs},
            "logits": {0: "batch"},
        },
    )
    return model_path


def _write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _parity_report(
    source: SourceArtifact,
    fp32_path: Path,
    int8_path: Path,
    *,
    threshold: float,
) -> dict[str, object]:
    encoded = source.tokenizer(
        list(SAFE_PARITY_TEXTS),
        truncation=True,
        max_length=source.manifest.max_length,
        padding=True,
        return_tensors="pt",
    )
    with torch.inference_mode():
        torch_probabilities = _softmax_judol_probability(source.model(**encoded).logits)

    fp32_session = ort.InferenceSession(str(fp32_path), providers=["CPUExecutionProvider"])
    int8_session = ort.InferenceSession(str(int8_path), providers=["CPUExecutionProvider"])
    fp32_probabilities = _run_onnx(fp32_session, encoded)
    int8_probabilities = _run_onnx(int8_session, encoded)

    samples: list[dict[str, object]] = []
    for text, torch_probability, fp32_probability, int8_probability in zip(
        SAFE_PARITY_TEXTS,
        torch_probabilities,
        fp32_probabilities,
        int8_probabilities,
        strict=True,
    ):
        decisions = assess_decision_parity(
            torch_probability=torch_probability,
            onnx_probability=fp32_probability,
            int8_probability=int8_probability,
            threshold=threshold,
        )
        samples.append(
            {
                "text": text,
                "torch_probability": torch_probability,
                "fp32_probability": fp32_probability,
                "int8_probability": int8_probability,
                "torch_label": label_for_probability(torch_probability, threshold),
                "torch_action": action_for_probability(torch_probability),
                **decisions,
            }
        )

    fp32_deltas = [sample["fp32_probability_delta"] for sample in samples]
    int8_deltas = [sample["int8_probability_delta"] for sample in samples]
    fp32_eligible = all(
        sample["fp32_label_matches"]
        and sample["fp32_action_matches"]
        and sample["fp32_probability_delta"] <= FP32_PROBABILITY_TOLERANCE
        for sample in samples
    )
    int8_eligible = all(
        sample["int8_label_matches"] and sample["int8_action_matches"] for sample in samples
    )
    return {
        "converted_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source_artifact": str(source.directory),
        "max_length": source.manifest.max_length,
        "threshold": threshold,
        "fp32_probability_tolerance": FP32_PROBABILITY_TOLERANCE,
        "fp32_serving_eligible": fp32_eligible,
        "int8_serving_eligible": int8_eligible,
        "models": {
            "fp32_bytes": fp32_path.stat().st_size,
            "int8_bytes": int8_path.stat().st_size,
            "fp32_inputs": [item.name for item in fp32_session.get_inputs()],
            "int8_inputs": [item.name for item in int8_session.get_inputs()],
        },
        "max_probability_drift": {
            "fp32": max(fp32_deltas),
            "int8": max(int8_deltas),
        },
        "samples": samples,
    }


def convert(source_dir: Path, output_dir: Path, *, threshold: float) -> dict[str, object]:
    """Write FP32 and INT8 artifacts plus parity evidence; return the report."""
    if not 0 <= threshold <= 1:
        raise ValueError("threshold must be between 0 and 1")
    output_dir = output_dir.resolve()
    require_empty_output_directory(output_dir)
    source = load_source_artifact(source_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    fp32_path = _export_fp32(source, output_dir)
    int8_dir = output_dir / "int8"
    int8_dir.mkdir()
    int8_path = int8_dir / "model.int8.onnx"
    quantize_dynamic(
        str(fp32_path),
        str(int8_path),
        weight_type=QuantType.QInt8,
        per_channel=True,
        reduce_range=True,
    )
    _copy_tokenizer_files(source.directory, output_dir / "tokenizer")
    shutil.copy2(source.directory / "model-manifest.json", output_dir / "model-manifest.json")
    report = _parity_report(source, fp32_path, int8_path, threshold=threshold)
    _write_json(output_dir / "conversion-report.json", report)
    if not report["fp32_serving_eligible"]:
        raise ValueError("FP32 ONNX parity gate failed; inspect conversion-report.json")
    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--threshold", type=float, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report = convert(args.source, args.output, threshold=args.threshold)
    print(f"artifact={args.output}")
    print(f"fp32_serving_eligible={report['fp32_serving_eligible']}")
    print(f"int8_serving_eligible={report['int8_serving_eligible']}")


if __name__ == "__main__":
    main()
