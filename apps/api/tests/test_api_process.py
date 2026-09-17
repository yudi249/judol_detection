from __future__ import annotations

import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time

import httpx
from onnxruntime.quantization import QuantType, quantize_dynamic
import torch
from transformers import AutoModelForSequenceClassification, BertConfig, BertForSequenceClassification, BertTokenizerFast

from scripts.export_indobert_onnx import _ClassifierLogits


def _create_local_artifact(path: Path) -> None:
    path.mkdir()
    (path / "vocab.txt").write_text(
        "[PAD]\n[UNK]\n[CLS]\n[SEP]\n[MASK]\nbonus\nslot\n",
        encoding="utf-8",
    )
    BertTokenizerFast(vocab_file=str(path / "vocab.txt")).save_pretrained(path)
    model = BertForSequenceClassification(
        BertConfig(
            vocab_size=7,
            hidden_size=16,
            num_hidden_layers=1,
            num_attention_heads=2,
            intermediate_size=32,
            num_labels=2,
            label2id={"non_judol": 0, "judol": 1},
            id2label={0: "non_judol", 1: "judol"},
        )
    )
    model.save_pretrained(path)
    (path / "model-manifest.json").write_text(
        json.dumps(
            {
                "model_name": "judollens-indobert-clean",
                "model_version": "0.1.0",
                "base_checkpoint": "indobenchmark/indobert-base-p1",
                "base_checkpoint_revision": "main",
                "label_to_id": {"non_judol": 0, "judol": 1},
                "max_length": 128,
                "preprocessing_version": "raw-text-v1-no-unicode-normalization",
                "training_dataset_sha256": "a" * 64,
                "split_manifest_sha256": "b" * 64,
                "validation_metrics": {"f1": 0.9},
                "trained_at": "2026-09-14T00:00:00Z",
            }
        ),
        encoding="utf-8",
    )


def _create_local_onnx_artifact(source: Path, serving: Path) -> None:
    tokenizer = BertTokenizerFast.from_pretrained(source, local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(source, local_files_only=True)
    encoded = tokenizer(
        ["bonus slot"], truncation=True, max_length=128, padding=True, return_tensors="pt"
    )
    serving.mkdir()
    (serving / "tokenizer").mkdir()
    for source_file in source.iterdir():
        if source_file.is_file():
            (serving / "tokenizer" / source_file.name).write_bytes(source_file.read_bytes())
    (serving / "model-manifest.json").write_bytes((source / "model-manifest.json").read_bytes())
    (serving / "conversion-report.json").write_text(
        json.dumps({"int8_serving_eligible": True}), encoding="utf-8"
    )
    (serving / "fp32").mkdir()
    (serving / "int8").mkdir()
    fp32_path = serving / "fp32" / "model.onnx"
    torch.onnx.export(
        _ClassifierLogits(model),
        tuple(encoded[name] for name in ("input_ids", "attention_mask", "token_type_ids")),
        fp32_path,
        input_names=["input_ids", "attention_mask", "token_type_ids"],
        output_names=["logits"],
        opset_version=17,
        dynamic_axes={
            "input_ids": {0: "batch", 1: "sequence"},
            "attention_mask": {0: "batch", 1: "sequence"},
            "token_type_ids": {0: "batch", 1: "sequence"},
            "logits": {0: "batch"},
        },
        dynamo=False,
    )
    quantize_dynamic(
        str(fp32_path),
        str(serving / "int8" / "model.int8.onnx"),
        weight_type=QuantType.QInt8,
        per_channel=True,
        reduce_range=True,
    )


def test_uvicorn_serves_local_artifact_without_network(tmp_path: Path) -> None:
    artifact = tmp_path / "artifact"
    _create_local_artifact(artifact)
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    environment = os.environ | {"JUDOLLENS_MODEL_ARTIFACT": str(artifact)}
    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "apps.api.app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
        ],
        cwd=Path.cwd(),
        env=environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            try:
                health = httpx.get(f"http://127.0.0.1:{port}/health", timeout=1)
            except httpx.HTTPError:
                time.sleep(0.1)
                continue
            assert health.status_code == 200
            assert health.json()["model"]["is_mock"] is False
            break
        else:
            process.terminate()
            stdout, stderr = process.communicate(timeout=10)
            raise AssertionError(f"uvicorn did not become ready:\n{stdout}\n{stderr}")

        response = httpx.post(
            f"http://127.0.0.1:{port}/predict",
            json={
                "request_id": "process-1",
                "source": {"platform": "simulation", "captured_at": "2026-09-14T00:00:00Z"},
                "client": {"extension_version": "0.1.0", "prediction_mode": "api", "threshold": 0.75},
                "item": {"id": "item-1", "text": "bonus slot", "context": {"kind": "post", "visible": True}},
            },
            timeout=5,
        )
        assert response.status_code == 200
        assert response.json()["result"]["id"] == "item-1"
    finally:
        if process.poll() is None:
            process.terminate()
        process.communicate(timeout=10)


def test_uvicorn_serves_onnx_int8_artifact_without_pytorch_fallback(tmp_path: Path) -> None:
    source_artifact = tmp_path / "source-artifact"
    serving_artifact = tmp_path / "serving-artifact"
    _create_local_artifact(source_artifact)
    _create_local_onnx_artifact(source_artifact, serving_artifact)
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    environment = os.environ | {
        "JUDOLLENS_MODEL_ARTIFACT": str(serving_artifact),
        "JUDOLLENS_INFERENCE_RUNTIME": "onnx-int8",
    }
    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "apps.api.app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
        ],
        cwd=Path.cwd(),
        env=environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            try:
                health = httpx.get(f"http://127.0.0.1:{port}/health", timeout=1)
            except httpx.HTTPError:
                time.sleep(0.1)
                continue
            assert health.status_code == 200
            assert health.json()["model"]["is_mock"] is False
            break
        else:
            process.terminate()
            stdout, stderr = process.communicate(timeout=10)
            raise AssertionError(f"ONNX Uvicorn did not become ready:\n{stdout}\n{stderr}")

        response = httpx.post(
            f"http://127.0.0.1:{port}/predict/batch",
            json={
                "request_id": "onnx-process-1",
                "source": {"platform": "simulation", "captured_at": "2026-09-14T00:00:00Z"},
                "client": {"extension_version": "0.1.0", "prediction_mode": "api", "threshold": 0.75},
                "items": [
                    {"id": "first", "text": "bonus slot", "context": {"kind": "post", "visible": True}},
                    {"id": "second", "text": "ordinary text", "context": {"kind": "post", "visible": True}},
                ],
            },
            timeout=10,
        )
        assert response.status_code == 200
        assert [result["id"] for result in response.json()["results"]] == ["first", "second"]
    finally:
        if process.poll() is None:
            process.terminate()
        process.communicate(timeout=10)
