"""Evaluation-mode local IndoBERT inference over unmodified user text."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Literal

import onnxruntime as ort
import torch
import transformers
from opentelemetry import trace
from opentelemetry.trace import Tracer


from .model_manifest import ModelManifest, load_model_manifest
from .unicode_evidence import UnicodeEvidence, analyze_unicode_evidence


@dataclass(frozen=True)
class DetectionReason:
    type: Literal["keyword", "unicode", "model_signal"]
    value: str
    weight: float


@dataclass(frozen=True)
class HighlightRange:
    start: int
    end: int
    kind: Literal["matched_term", "unicode_suspicious"]


@dataclass(frozen=True)
class PredictionDisplay:
    snippet: str
    highlight_ranges: list[HighlightRange]


@dataclass(frozen=True)
class InferenceResult:
    id: str
    label: Literal["judol", "non_judol"]
    confidence: float
    risk_level: Literal["low", "medium", "high"]
    action: Literal["none", "warn", "blur"]
    reasons: list[DetectionReason]
    matched_terms: list[str]
    unicode_analysis: UnicodeEvidence
    display: PredictionDisplay


class LoadedIndoBertInferenceService:
    """A fully loaded local artifact, with no request-time model loading."""

    def __init__(
        self,
        *,
        tokenizer: object,
        model: object,
        manifest: ModelManifest,
        tracer: Tracer | None = None,
    ) -> None:
        self.tokenizer = tokenizer
        self.model = model
        self.manifest = manifest
        self.tracer = tracer or trace.NoOpTracer()
        self.runtime = "pytorch"

    @classmethod
    def load(
        cls, artifact_dir: Path, *, tracer: Tracer | None = None
    ) -> "LoadedIndoBertInferenceService":
        manifest = load_model_manifest(artifact_dir / "model-manifest.json")
        tokenizer = transformers.AutoTokenizer.from_pretrained(artifact_dir, local_files_only=True)
        model = transformers.AutoModelForSequenceClassification.from_pretrained(
            artifact_dir, local_files_only=True
        )
        if getattr(getattr(model, "config", None), "label2id", None) != manifest.label_to_id:
            raise ValueError("loaded model label2id does not match model manifest")
        model.eval()
        return cls(tokenizer=tokenizer, model=model, manifest=manifest, tracer=tracer)

    def predict_items(
        self, items: list[tuple[str, str]], *, threshold: float
    ) -> list[InferenceResult]:
        if not 0 <= threshold <= 1:
            raise ValueError("threshold must be between 0 and 1")
        if not items:
            return []

        _, texts = zip(*items, strict=True)
        with self.tracer.start_as_current_span("server.tokenize", record_exception=False) as span:
            encoded = self.tokenizer(
                list(texts),
                truncation=True,
                max_length=self.manifest.max_length,
                padding=True,
                return_tensors="pt",
            )
            _set_token_aggregates(span, encoded["attention_mask"], len(items))
        with self.tracer.start_as_current_span("server.model_inference", record_exception=False):
            with torch.inference_mode():
                output = self.model(**encoded)
                confidences = torch.softmax(output.logits, dim=1)[:, 1].tolist()
        with self.tracer.start_as_current_span("server.postprocess", record_exception=False):
            return _project_predictions(items, confidences, threshold)


class OnnxIndoBertInferenceService:
    """A manifest-validated INT8 ONNX artifact loaded once for CPU inference."""

    def __init__(
        self,
        *,
        tokenizer: object,
        session: object,
        manifest: ModelManifest,
        tracer: Tracer | None = None,
    ) -> None:
        self.tokenizer = tokenizer
        self.session = session
        self.manifest = manifest
        self.tracer = tracer or trace.NoOpTracer()
        self.runtime = "onnx-int8"

    @classmethod
    def load(
        cls, artifact_dir: Path, *, tracer: Tracer | None = None
    ) -> "OnnxIndoBertInferenceService":
        manifest = load_model_manifest(artifact_dir / "model-manifest.json")
        report_path = artifact_dir / "conversion-report.json"
        try:
            report = json.loads(report_path.read_text(encoding="utf-8"))
        except FileNotFoundError as exc:
            raise ValueError(f"ONNX conversion report file does not exist: {report_path}") from exc
        except (OSError, json.JSONDecodeError) as exc:
            raise ValueError("ONNX conversion report cannot be read") from exc
        if not isinstance(report, dict) or report.get("int8_serving_eligible") is not True:
            raise ValueError("ONNX INT8 artifact is not serving-eligible")
        tokenizer_path = artifact_dir / "tokenizer"
        model_path = artifact_dir / "int8" / "model.int8.onnx"
        tokenizer = transformers.AutoTokenizer.from_pretrained(tokenizer_path, local_files_only=True)
        if not model_path.is_file():
            raise ValueError(f"ONNX INT8 model file does not exist: {model_path}")
        session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        expected_inputs = {input_.name for input_ in session.get_inputs()}
        if expected_inputs != {"input_ids", "attention_mask", "token_type_ids"}:
            raise ValueError("ONNX INT8 model inputs do not match the IndoBERT serving contract")
        return cls(tokenizer=tokenizer, session=session, manifest=manifest, tracer=tracer)

    def predict_items(
        self, items: list[tuple[str, str]], *, threshold: float
    ) -> list[InferenceResult]:
        if not 0 <= threshold <= 1:
            raise ValueError("threshold must be between 0 and 1")
        if not items:
            return []

        _, texts = zip(*items, strict=True)
        with self.tracer.start_as_current_span("server.tokenize", record_exception=False) as span:
            encoded = self.tokenizer(
                list(texts),
                truncation=True,
                max_length=self.manifest.max_length,
                padding=True,
                return_tensors="pt",
            )
            _set_token_aggregates(span, encoded["attention_mask"], len(items))
        expected_inputs = {input_.name for input_ in self.session.get_inputs()}
        if set(encoded) != expected_inputs:
            raise ValueError("tokenizer output does not match the ONNX INT8 model inputs")
        with self.tracer.start_as_current_span("server.model_inference", record_exception=False):
            outputs = self.session.run(
                None,
                {name: encoded[name].detach().cpu().numpy() for name in expected_inputs},
            )
            if len(outputs) != 1:
                raise ValueError("ONNX INT8 model must produce exactly one logits output")
            confidences = torch.softmax(torch.as_tensor(outputs[0]), dim=1)[:, 1].tolist()
        with self.tracer.start_as_current_span("server.postprocess", record_exception=False):
            return _project_predictions(items, confidences, threshold)


def _set_token_aggregates(span: trace.Span, attention_mask: object, batch_size: int) -> None:
    token_counts = attention_mask.sum(dim=1)
    span.set_attribute("judollens.batch_size", batch_size)
    span.set_attribute("judollens.total_tokens", int(token_counts.sum().item()))
    span.set_attribute("judollens.max_tokens", int(token_counts.max().item()))


def _project_predictions(
    items: list[tuple[str, str]], confidences: list[float], threshold: float
) -> list[InferenceResult]:
    results: list[InferenceResult] = []
    for (identifier, text), confidence in zip(items, confidences, strict=True):
        probability = float(confidence)
        evidence = analyze_unicode_evidence(text)
        if probability >= 0.85:
            risk_level: Literal["low", "medium", "high"] = "high"
            action: Literal["none", "warn", "blur"] = "blur"
        elif probability >= 0.65:
            risk_level = "medium"
            action = "warn"
        else:
            risk_level = "low"
            action = "none"
        results.append(
            InferenceResult(
                id=identifier,
                label="judol" if probability >= threshold else "non_judol",
                confidence=probability,
                risk_level=risk_level,
                action=action,
                reasons=[DetectionReason("model_signal", "indobert_probability", probability)],
                matched_terms=[],
                unicode_analysis=evidence,
                display=PredictionDisplay(
                    snippet=text[:240],
                    highlight_ranges=[
                        HighlightRange(span.start, span.end, "unicode_suspicious")
                        for span in evidence.spans
                    ],
                ),
            )
        )
    return results


def load_inference_service(
    artifact_dir: Path,
    *,
    runtime: Literal["pytorch", "onnx-int8"] | str,
    tracer: Tracer | None = None,
) -> LoadedIndoBertInferenceService | OnnxIndoBertInferenceService:
    """Load exactly the configured runtime; never silently fall back."""
    if runtime == "pytorch":
        return LoadedIndoBertInferenceService.load(artifact_dir, tracer=tracer)
    if runtime == "onnx-int8":
        return OnnxIndoBertInferenceService.load(artifact_dir, tracer=tracer)
    raise ValueError("inference runtime must be 'pytorch' or 'onnx-int8'")
