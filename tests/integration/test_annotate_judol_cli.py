import asyncio
import json
from pathlib import Path
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pandas as pd

from judol_detection.annotation.client import ClientResult, Usage
from judol_detection.annotation.contracts import AnnotationLabel, AnnotationResult
from scripts.annotate_judol import annotate_workbook, build_parser


class FakeClient:
    async def annotate(self, text: str) -> ClientResult:
        label = (
            AnnotationLabel.PROMOSI_JUDOL
            if "slot" in text
            else AnnotationLabel.BUKAN_JUDOL
        )
        return ClientResult(AnnotationResult(label), Usage(total_tokens=5))


def test_cli_parser_exposes_excel_and_resume_controls() -> None:
    parser = build_parser()
    args = parser.parse_args(
        [
            "--input",
            "input.xlsx",
            "--output",
            "output.xlsx",
            "--allow-external-data",
            "--resume",
            "--concurrency",
            "2",
            "--progress-every",
            "3",
        ]
    )

    assert args.input == Path("input.xlsx")
    assert args.output == Path("output.xlsx")
    assert args.allow_external_data is True
    assert args.resume is True
    assert args.concurrency == 2
    assert args.progress_every == 3


def test_annotate_workbook_writes_labeled_output_and_summary(tmp_path: Path) -> None:
    source = tmp_path / "input.xlsx"
    output = tmp_path / "output.xlsx"
    pd.DataFrame({"text_raw": ["slot gacor", "berita biasa"]}).to_excel(
        source, index=False
    )

    summary = annotate_workbook(
        input_path=source,
        output_path=output,
        client=FakeClient(),
        skill="skill",
        skill_hash="skill-hash",
        max_total_tokens=None,
        concurrency=2,
        allow_external_data=True,
        yes=True,
    )

    assert summary.status == "completed"
    assert summary.labels == {
        "promosi_judol": 1,
        "bukan_judol": 1,
        "perlu_review": 0,
        "not_indonesian": 0,
    }
    assert summary.mode == "normal"
    assert pd.read_excel(output)["label"].tolist() == [
        "promosi_judol",
        "bukan_judol",
    ]
    assert output.with_suffix(".checkpoint.json").exists()
    assert output.with_suffix(".run.json").exists()


def test_existing_not_indonesian_label_is_not_sent_to_api(tmp_path: Path) -> None:
    source = tmp_path / "input.xlsx"
    output = tmp_path / "output.xlsx"
    pd.DataFrame(
        {"text_raw": ["English text", "slot gacor"], "label": ["not_indonesian", ""]}
    ).to_excel(source, index=False)
    client = FakeClient()

    summary = annotate_workbook(
        input_path=source,
        output_path=output,
        client=client,
        skill="skill",
        skill_hash="skill-hash",
        allow_external_data=True,
        yes=True,
    )

    assert summary.status == "completed"
    assert pd.read_excel(output)["label"].tolist() == [
        "not_indonesian",
        "promosi_judol",
    ]


def test_annotate_workbook_requires_confirmation_when_estimate_exceeds_quota(tmp_path: Path) -> None:
    source = tmp_path / "input.xlsx"
    output = tmp_path / "output.xlsx"
    pd.DataFrame({"text_raw": ["slot gacor"]}).to_excel(source, index=False)

    try:
        annotate_workbook(
            input_path=source,
            output_path=output,
            client=FakeClient(),
            skill="long skill",
            skill_hash="skill-hash",
            max_total_tokens=1,
            concurrency=1,
            allow_external_data=True,
            yes=False,
        )
    except RuntimeError as exc:
        assert "confirmation" in str(exc)
    else:
        raise AssertionError("expected quota confirmation")


def test_annotate_workbook_continues_after_explicit_quota_confirmation(tmp_path: Path) -> None:
    source = tmp_path / "input.xlsx"
    output = tmp_path / "output.xlsx"
    pd.DataFrame({"text_raw": ["slot gacor"]}).to_excel(source, index=False)

    summary = annotate_workbook(
        input_path=source,
        output_path=output,
        client=FakeClient(),
        skill="long skill",
        skill_hash="skill-hash",
        max_total_tokens=1,
        concurrency=1,
        allow_external_data=True,
        yes=True,
    )

    assert summary.status == "completed"
    assert output.exists()


def test_cli_uses_openai_compatible_http_endpoint_end_to_end(
    tmp_path: Path, monkeypatch: object
) -> None:
    class Handler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:  # noqa: N802 - stdlib handler protocol
            length = int(self.headers["Content-Length"] or 0)
            payload = json.loads(self.rfile.read(length))
            text = payload["messages"][1]["content"]
            label = "promosi_judol" if "slot" in text else "bukan_judol"
            body = json.dumps(
                {
                    "choices": [{"message": {"content": json.dumps({"label": label})}}],
                    "usage": {"prompt_tokens": 10, "completion_tokens": 2, "total_tokens": 12},
                }
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format: str, *args: object) -> None:
            return

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        source = tmp_path / "input.xlsx"
        output = tmp_path / "output.xlsx"
        pd.DataFrame({"text_raw": ["slot gacor", "berita biasa"]}).to_excel(
            source, index=False
        )
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        monkeypatch.setenv("OPENAI_BASE_URL", f"http://127.0.0.1:{server.server_port}/v1")
        monkeypatch.setenv("OPENAI_MODEL", "test-model")

        summary = annotate_workbook(
            input_path=source,
            output_path=output,
            skill="skill",
            skill_hash="skill-hash",
            allow_external_data=True,
            yes=True,
        )

        assert summary.status == "completed"
        assert pd.read_excel(output)["label"].tolist() == [
            "promosi_judol",
            "bukan_judol",
        ]
    finally:
        server.shutdown()
        thread.join(timeout=5)
