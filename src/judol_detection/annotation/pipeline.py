"""Concurrent, resumable annotation pipeline."""

from __future__ import annotations

from dataclasses import dataclass
import asyncio
from pathlib import Path
from typing import Callable, Protocol
import os

import pandas as pd

from .client import ClientResult, ProviderQuotaError, Usage
from .contracts import AnnotationLabel, AnnotationResult
from .excel import AnnotationSheet
from .quota import QuotaTracker, estimate_tokens
from .state import CheckpointStore, hash_text


class AnnotationProvider(Protocol):
    async def annotate(self, text: str) -> ClientResult:
        """Annotate one text."""


@dataclass(frozen=True)
class PipelineConfig:
    """Runtime controls for the annotation pipeline."""

    concurrency: int = 5
    retry_failures_as_review: bool = True
    enforce_quota: bool = True
    progress_every: int = 10
    progress_callback: Callable[["PipelineProgress"], None] | None = None

    def __post_init__(self) -> None:
        if self.concurrency < 1:
            raise ValueError("concurrency must be at least 1")
        if self.progress_every < 0:
            raise ValueError("progress_every cannot be negative")


@dataclass(frozen=True)
class PipelineProgress:
    """Snapshot of annotation progress without including raw text."""

    completed_rows: int
    total_rows: int
    api_requests: int
    cache_hits: int
    pending_rows: int
    retry_count: int
    error_count: int
    labels: dict[str, int]
    status: str = "running"


@dataclass(frozen=True)
class PipelineSummary:
    """Observable result of one pipeline run."""

    status: str
    total_rows: int
    api_requests: int
    cache_hits: int
    pending_rows: int
    retry_count: int
    error_count: int
    labels: dict[str, int]
    mode: str


class AnnotationPipeline:
    """Annotate a selected Excel sheet with bounded concurrency."""

    def __init__(
        self,
        *,
        client: AnnotationProvider,
        checkpoint: CheckpointStore,
        quota: QuotaTracker,
        skill: str,
        config: PipelineConfig | None = None,
    ) -> None:
        self.client = client
        self.checkpoint = checkpoint
        self.quota = quota
        self.skill = skill
        self.config = config or PipelineConfig()

    async def run(self, sheet: AnnotationSheet, output: Path) -> PipelineSummary:
        """Process rows and write output only if all rows reach terminal state."""
        frame = sheet.frame.copy(deep=True)
        if "label" not in frame.columns:
            frame["label"] = pd.NA

        api_requests = 0
        cache_hits = 0
        retry_count = 0
        error_count = 0
        empty_rows = 0
        pending: set[int] = set()
        groups: dict[str, list[int]] = {}
        completed_rows = 0
        total_rows = len(frame)
        reported_completed = 0
        progress_callback_enabled = True

        def report_progress(status: str = "running", *, force: bool = False) -> None:
            nonlocal reported_completed, progress_callback_enabled
            if self.config.progress_callback is None or not progress_callback_enabled:
                return
            should_report = force or (
                self.config.progress_every > 0
                and completed_rows - reported_completed >= self.config.progress_every
            )
            if not should_report:
                return
            reported_completed = completed_rows
            try:
                self.config.progress_callback(
                    PipelineProgress(
                        completed_rows=completed_rows,
                        total_rows=total_rows,
                        api_requests=api_requests,
                        cache_hits=cache_hits,
                        pending_rows=total_rows - completed_rows,
                        retry_count=retry_count,
                        error_count=error_count,
                        labels=_label_counts(frame),
                        status=status,
                    )
                )
            except Exception:
                progress_callback_enabled = False

        for index, row_id in enumerate(sheet.row_ids):
            existing = frame.iloc[index]["label"]
            if isinstance(existing, str) and existing in {label.value for label in AnnotationLabel}:
                completed_rows += 1
                report_progress()
                continue
            text_value = frame.iloc[index][sheet.text_column]
            if text_value is None or pd.isna(text_value) or not str(text_value).strip():
                empty_rows += 1
                frame.at[index, "label"] = AnnotationLabel.PERLU_REVIEW.value
                self.checkpoint.record_result(
                    row_id=row_id,
                    text="",
                    label=AnnotationLabel.PERLU_REVIEW,
                    status="empty",
                )
                completed_rows += 1
                report_progress()
                continue
            text = str(text_value)
            cached = self.checkpoint.lookup_cache(hash_text(text))
            if cached is not None:
                frame.at[index, "label"] = cached.value
                cache_hits += 1
                self.checkpoint.record_result(
                    row_id=row_id, text=text, label=cached, status="cache"
                )
                completed_rows += 1
                report_progress()
                continue
            key = text.strip()
            groups.setdefault(key, []).append(index)
            pending.add(index)

        semaphore = asyncio.Semaphore(self.config.concurrency)
        stop_event = asyncio.Event()
        paused = False
        lock = asyncio.Lock()

        async def process_group(text: str, indexes: list[int]) -> None:
            nonlocal api_requests, retry_count, error_count, paused, completed_rows
            if stop_event.is_set():
                return
            estimate = estimate_tokens(self.skill, text, '{"label":"perlu_review"}')
            if self.config.enforce_quota and not await self.quota.reserve(estimate):
                paused = True
                stop_event.set()
                return
            if not self.config.enforce_quota:
                await self.quota.reserve_unlimited(estimate)
            if stop_event.is_set():
                return
            try:
                async with semaphore:
                    if stop_event.is_set():
                        return
                    api_requests += 1
                    result = await self.client.annotate(text)
            except ProviderQuotaError:
                paused = True
                stop_event.set()
                return
            except Exception as exc:  # provider protocol failures become review rows
                error_count += 1
                if not self.config.retry_failures_as_review:
                    raise
                retry_count += 1
                result = ClientResult(
                    result=AnnotationResult(AnnotationLabel.PERLU_REVIEW),
                    usage=Usage(),
                )
                error_message = type(exc).__name__
            else:
                error_message = None

            self.quota.record_actual(result.usage.total_tokens)
            async with lock:
                label = result.result.label
                for index in indexes:
                    frame.at[index, "label"] = label.value
                    pending.discard(index)
                    self.checkpoint.record_result(
                        row_id=sheet.row_ids[index],
                        text=str(frame.iloc[index][sheet.text_column]),
                        label=label,
                        status="api" if error_message is None else "error",
                        estimated_tokens=estimate if index == indexes[0] else 0,
                        actual_tokens=result.usage.total_tokens if index == indexes[0] else 0,
                        error=error_message,
                    )
                    completed_rows += 1
                    report_progress()

        await asyncio.gather(*(process_group(text, indexes) for text, indexes in groups.items()))
        if paused:
            report_progress("paused", force=True)
            return PipelineSummary(
                status="paused",
                total_rows=len(frame),
                api_requests=api_requests,
                cache_hits=cache_hits,
                pending_rows=len(pending),
                retry_count=retry_count,
                error_count=error_count,
                labels=_label_counts(frame),
                mode="normal",
            )

        _write_atomic(frame, output, sheet.sheet_name)
        report_progress("completed", force=True)
        return PipelineSummary(
            status="completed",
            total_rows=len(frame),
            api_requests=api_requests,
            cache_hits=cache_hits,
            pending_rows=0,
            retry_count=retry_count,
            error_count=error_count,
            labels=_label_counts(frame),
            mode="cache-only" if not groups and empty_rows == 0 else "normal",
        )


def _write_atomic(frame: pd.DataFrame, output: Path, sheet_name: str) -> None:
    """Write an Excel workbook through a temporary sibling file."""
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(f".{output.name}.tmp")
    try:
        frame.to_excel(temporary, index=False, sheet_name=sheet_name, engine="openpyxl")
        os.replace(temporary, output)
    finally:
        if temporary.exists():
            temporary.unlink()


def _label_counts(frame: pd.DataFrame) -> dict[str, int]:
    """Count valid labels for the run summary."""
    counts = {label.value: 0 for label in AnnotationLabel}
    for value in frame.get("label", pd.Series(dtype=object)).tolist():
        if isinstance(value, str) and value in counts:
            counts[value] += 1
    return counts
