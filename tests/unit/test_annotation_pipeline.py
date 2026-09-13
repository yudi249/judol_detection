import asyncio
from pathlib import Path

import pandas as pd

from judol_detection.annotation.client import ClientResult, ProviderQuotaError, Usage
from judol_detection.annotation.contracts import AnnotationLabel, AnnotationResult
from judol_detection.annotation.excel import load_annotation_sheet
from judol_detection.annotation.pipeline import (
    AnnotationPipeline,
    PipelineConfig,
    PipelineProgress,
)
from judol_detection.annotation.quota import QuotaTracker
from judol_detection.annotation.state import CheckpointStore


class FakeClient:
    def __init__(self, labels: dict[str, AnnotationLabel], failures: set[str] | None = None) -> None:
        self.labels = labels
        self.failures = failures or set()
        self.calls: list[str] = []

    async def annotate(self, text: str) -> ClientResult:
        self.calls.append(text)
        await asyncio.sleep(0)
        if text in self.failures:
            raise RuntimeError("temporary provider failure")
        return ClientResult(
            result=AnnotationResult(self.labels[text]),
            usage=Usage(prompt_tokens=4, completion_tokens=2, total_tokens=6),
        )


class QuotaClient(FakeClient):
    async def annotate(self, text: str) -> ClientResult:
        self.calls.append(text)
        raise ProviderQuotaError("quota exhausted")


def make_sheet(tmp_path: Path, rows: list[dict[str, object]]) -> tuple[Path, object]:
    source = tmp_path / "input.xlsx"
    pd.DataFrame(rows).to_excel(source, index=False)
    return source, load_annotation_sheet(source, sheet_name=None, text_column="text_raw")


def make_checkpoint(tmp_path: Path) -> CheckpointStore:
    checkpoint = CheckpointStore(tmp_path / "checkpoint.json")
    checkpoint.initialize(
        input_fingerprint="input",
        skill_hash="skill",
        sheet_name="Sheet1",
        text_column="text_raw",
        model="model",
    )
    return checkpoint


def test_pipeline_groups_identical_texts_and_writes_atomic_output(tmp_path: Path) -> None:
    _, sheet = make_sheet(
        tmp_path,
        [
            {"text_raw": "promo", "source": "a"},
            {"text_raw": " promo ", "source": "b"},
            {"text_raw": "clean", "source": "c", "label": "bukan_judol"},
        ],
    )
    checkpoint = make_checkpoint(tmp_path)
    client = FakeClient(
        {"promo": AnnotationLabel.PROMOSI_JUDOL, " promo ": AnnotationLabel.PROMOSI_JUDOL}
    )
    output = tmp_path / "output.xlsx"

    summary = asyncio.run(
        AnnotationPipeline(
            client=client,
            checkpoint=checkpoint,
            quota=QuotaTracker(None),
            skill="skill",
            config=PipelineConfig(concurrency=2, retry_failures_as_review=True),
        ).run(sheet, output)
    )

    result = pd.read_excel(output)
    assert summary.status == "completed"
    assert len(client.calls) == 1
    assert result["label"].tolist() == ["promosi_judol", "promosi_judol", "bukan_judol"]
    assert result["source"].tolist() == ["a", "b", "c"]


def test_pipeline_reports_progress_at_configured_intervals(tmp_path: Path) -> None:
    _, sheet = make_sheet(
        tmp_path,
        [{"text_raw": f"text-{index}"} for index in range(5)],
    )
    checkpoint = make_checkpoint(tmp_path)
    events: list[PipelineProgress] = []
    client = FakeClient(
        {f"text-{index}": AnnotationLabel.BUKAN_JUDOL for index in range(5)}
    )

    summary = asyncio.run(
        AnnotationPipeline(
            client=client,
            checkpoint=checkpoint,
            quota=QuotaTracker(None),
            skill="skill",
            config=PipelineConfig(
                concurrency=2,
                progress_every=2,
                progress_callback=events.append,
            ),
        ).run(sheet, tmp_path / "output.xlsx")
    )

    assert summary.status == "completed"
    assert [event.completed_rows for event in events] == [2, 4, 5]
    assert events[-1].total_rows == 5
    assert events[-1].pending_rows == 0
    assert events[-1].api_requests == 5
    assert events[-1].labels["bukan_judol"] == 5


def test_pipeline_stops_queued_requests_after_provider_quota(tmp_path: Path) -> None:
    _, sheet = make_sheet(
        tmp_path,
        [{"text_raw": f"pending-{index}"} for index in range(3)],
    )
    checkpoint = make_checkpoint(tmp_path)
    client = QuotaClient({})

    summary = asyncio.run(
        AnnotationPipeline(
            client=client,
            checkpoint=checkpoint,
            quota=QuotaTracker(None),
            skill="skill",
            config=PipelineConfig(concurrency=1),
        ).run(sheet, tmp_path / "output.xlsx")
    )

    assert summary.status == "paused"
    assert len(client.calls) == 1
    assert summary.pending_rows == 3
    assert not (tmp_path / "output.xlsx").exists()


def test_completed_progress_is_emitted_after_output_write(tmp_path: Path) -> None:
    _, sheet = make_sheet(tmp_path, [{"text_raw": "done"}])
    checkpoint = make_checkpoint(tmp_path)
    output = tmp_path / "output.xlsx"
    observed_output_exists: list[bool] = []

    def observe(progress: PipelineProgress) -> None:
        if progress.status == "completed":
            observed_output_exists.append(output.exists())

    asyncio.run(
        AnnotationPipeline(
            client=FakeClient({"done": AnnotationLabel.BUKAN_JUDOL}),
            checkpoint=checkpoint,
            quota=QuotaTracker(None),
            skill="skill",
            config=PipelineConfig(progress_callback=observe),
        ).run(sheet, output)
    )

    assert observed_output_exists == [True]


def test_progress_callback_failure_does_not_abort_annotation(tmp_path: Path) -> None:
    _, sheet = make_sheet(tmp_path, [{"text_raw": "done"}])
    checkpoint = make_checkpoint(tmp_path)
    output = tmp_path / "output.xlsx"

    def broken_callback(progress: PipelineProgress) -> None:
        raise RuntimeError("progress sink unavailable")

    summary = asyncio.run(
        AnnotationPipeline(
            client=FakeClient({"done": AnnotationLabel.BUKAN_JUDOL}),
            checkpoint=checkpoint,
            quota=QuotaTracker(None),
            skill="skill",
            config=PipelineConfig(progress_callback=broken_callback),
        ).run(sheet, output)
    )

    assert summary.status == "completed"
    assert output.exists()


def test_pipeline_marks_terminal_failures_for_review(tmp_path: Path) -> None:
    _, sheet = make_sheet(tmp_path, [{"text_raw": "broken"}])
    checkpoint = make_checkpoint(tmp_path)
    output = tmp_path / "output.xlsx"

    summary = asyncio.run(
        AnnotationPipeline(
            client=FakeClient({}, failures={"broken"}),
            checkpoint=checkpoint,
            quota=QuotaTracker(None),
            skill="skill",
            config=PipelineConfig(concurrency=1, retry_failures_as_review=True),
        ).run(sheet, output)
    )

    assert summary.status == "completed"
    assert pd.read_excel(output)["label"].tolist() == ["perlu_review"]


def test_pipeline_pauses_on_provider_quota_without_writing_output(tmp_path: Path) -> None:
    _, sheet = make_sheet(tmp_path, [{"text_raw": "pending"}])
    checkpoint = make_checkpoint(tmp_path)
    output = tmp_path / "output.xlsx"

    summary = asyncio.run(
        AnnotationPipeline(
            client=QuotaClient({}),
            checkpoint=checkpoint,
            quota=QuotaTracker(None),
            skill="skill",
            config=PipelineConfig(concurrency=1),
        ).run(sheet, output)
    )

    assert summary.status == "paused"
    assert summary.pending_rows == 1
    assert not output.exists()


def test_pipeline_restores_terminal_checkpoint_rows_without_api_calls(tmp_path: Path) -> None:
    _, sheet = make_sheet(
        tmp_path,
        [{"text_raw": "already done"}, {"text_raw": "new"}],
    )
    checkpoint = make_checkpoint(tmp_path)
    checkpoint.record_result(
        row_id=sheet.row_ids[0],
        text="already done",
        label=AnnotationLabel.BUKAN_JUDOL,
        status="api",
    )
    client = FakeClient({"new": AnnotationLabel.PROMOSI_JUDOL})
    output = tmp_path / "output.xlsx"

    asyncio.run(
        AnnotationPipeline(
            client=client,
            checkpoint=checkpoint,
            quota=QuotaTracker(None),
            skill="skill",
            config=PipelineConfig(concurrency=1),
        ).run(sheet, output)
    )

    assert client.calls == ["new"]
    assert pd.read_excel(output)["label"].tolist() == ["bukan_judol", "promosi_judol"]


def test_pipeline_accepts_not_indonesian_as_terminal_label(tmp_path: Path) -> None:
    _, sheet = make_sheet(tmp_path, [{"text_raw": "English text"}])
    checkpoint = make_checkpoint(tmp_path)
    client = FakeClient({"English text": AnnotationLabel.NOT_INDONESIAN})
    output = tmp_path / "output.xlsx"

    summary = asyncio.run(
        AnnotationPipeline(
            client=client,
            checkpoint=checkpoint,
            quota=QuotaTracker(None),
            skill="skill",
            config=PipelineConfig(concurrency=1),
        ).run(sheet, output)
    )

    assert summary.labels["not_indonesian"] == 1
    assert pd.read_excel(output)["label"].tolist() == ["not_indonesian"]
