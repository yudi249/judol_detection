"""Annotate one Excel sheet with the Indonesian judol annotation agent."""

from __future__ import annotations

import argparse
import asyncio
from dataclasses import asdict
import json
import os
from pathlib import Path
import sys
from typing import Any

from dotenv import load_dotenv
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from judol_detection.annotation.client import AnnotationClient
from judol_detection.annotation.contracts import AnnotationLabel
from judol_detection.annotation.excel import load_annotation_sheet
from judol_detection.annotation.pipeline import (
    AnnotationPipeline,
    PipelineConfig,
    PipelineProgress,
    PipelineSummary,
)
from judol_detection.annotation.quota import QuotaTracker, estimate_tokens
from judol_detection.annotation.state import (
    CheckpointStore,
    build_input_fingerprint,
    hash_text,
    hash_skill,
)


DEFAULT_SKILL_PATH = PROJECT_ROOT / ".agents" / "skills" / "judol-annotation-agent" / "SKILL.md"


def build_parser() -> argparse.ArgumentParser:
    """Build the annotation CLI parser."""
    parser = argparse.ArgumentParser(description="Annotate Indonesian judol promotion text from Excel.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--allow-external-data", action="store_true")
    parser.add_argument("--sheet", default=None)
    parser.add_argument("--text-column", default="text_raw")
    parser.add_argument("--concurrency", type=int, default=5)
    parser.add_argument(
        "--progress-every",
        type=int,
        default=10,
        help="print progress after this many completed rows; 0 disables periodic logs",
    )
    parser.add_argument("--max-total-tokens", type=int, default=None)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--yes", action="store_true", help="accept preflight confirmation")
    parser.add_argument("--skill", type=Path, default=DEFAULT_SKILL_PATH)
    return parser


def _checkpoint_path(output_path: Path) -> Path:
    return output_path.with_suffix(".checkpoint.json")


def _run_summary_path(output_path: Path) -> Path:
    return output_path.with_suffix(".run.json")


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")


def _confirm(message: str, *, yes: bool) -> None:
    if yes:
        return
    try:
        answer = input(f"{message} [y/N] ").strip().lower()
    except (EOFError, OSError) as exc:
        raise RuntimeError("confirmation required; rerun with --yes") from exc
    if answer not in {"y", "yes"}:
        raise RuntimeError("operation cancelled by user")


def _estimate_pending_tokens(sheet: Any, checkpoint: CheckpointStore, skill: str) -> int:
    """Estimate unique uncached API work before the first request."""
    unique_texts: set[str] = set()
    for index in range(len(sheet.frame)):
        existing = sheet.frame.iloc[index].get("label")
        if isinstance(existing, str) and existing in {label.value for label in AnnotationLabel}:
            continue
        value = sheet.frame.iloc[index][sheet.text_column]
        if value is None or pd.isna(value) or not str(value).strip():
            continue
        text = str(value)
        if checkpoint.lookup_cache(hash_text(text)) is None:
            unique_texts.add(text.strip())
    return sum(estimate_tokens(skill, text, '{"label":"perlu_review"}') for text in unique_texts)


def _print_progress(progress: PipelineProgress) -> None:
    """Print counters only; never include source text or credentials."""
    percentage = (
        (100 * progress.completed_rows / progress.total_rows)
        if progress.total_rows
        else 100.0
    )
    labels = ", ".join(
        f"{label}={count}" for label, count in sorted(progress.labels.items()) if count
    ) or "none"
    print(
        f"Progress [{progress.status}]: {progress.completed_rows}/{progress.total_rows} "
        f"({percentage:.1f}%) | api={progress.api_requests} | cache={progress.cache_hits} "
        f"| pending={progress.pending_rows} | retry={progress.retry_count} "
        f"| error={progress.error_count} | labels={labels}",
        flush=True,
    )


def annotate_workbook(
    *,
    input_path: Path,
    output_path: Path,
    client: Any | None = None,
    skill: str | None = None,
    skill_hash: str | None = None,
    skill_path: Path | None = None,
    max_total_tokens: int | None = None,
    concurrency: int = 5,
    progress_every: int = 10,
    allow_external_data: bool = False,
    yes: bool = False,
    resume: bool = False,
    force: bool = False,
    sheet_name: str | None = None,
    text_column: str = "text_raw",
) -> PipelineSummary:
    """Run one annotation job; dependency injection keeps tests offline."""
    if not allow_external_data and client is None:
        raise RuntimeError("pass --allow-external-data before sending text externally")
    if output_path.exists() and not force:
        raise FileExistsError(f"output already exists: {output_path}; use --force to replace it")

    selected_skill_path = skill_path or DEFAULT_SKILL_PATH
    loaded_skill = skill if skill is not None else selected_skill_path.read_text(encoding="utf-8")
    loaded_skill_hash = skill_hash or (
        hash_skill(selected_skill_path) if skill_path is not None or skill is None else "injected-skill"
    )
    sheet = load_annotation_sheet(input_path, sheet_name=sheet_name, text_column=text_column)
    input_fingerprint = build_input_fingerprint(input_path, sheet.sheet_name, text_column)
    checkpoint_path = _checkpoint_path(output_path)

    if resume:
        if not checkpoint_path.exists():
            raise FileNotFoundError(f"checkpoint not found: {checkpoint_path}")
        checkpoint = CheckpointStore.load(checkpoint_path)
        checkpoint.validate_resume(
            input_fingerprint=input_fingerprint,
            skill_hash=loaded_skill_hash,
            sheet_name=sheet.sheet_name,
            text_column=text_column,
        )
    else:
        checkpoint = CheckpointStore(checkpoint_path)
        checkpoint.initialize(
            input_fingerprint=input_fingerprint,
            skill_hash=loaded_skill_hash,
            sheet_name=sheet.sheet_name,
            text_column=text_column,
            model="injected" if client is not None else "configured",
        )

    if client is None:
        api_key = os.getenv("OPENAI_API_KEY", "")
        base_url = os.getenv("OPENAI_BASE_URL", "")
        model = os.getenv("OPENAI_MODEL", "")
        client = AnnotationClient(
            api_key=api_key,
            base_url=base_url,
            model=model,
            skill=loaded_skill,
        )

    estimated_tokens = _estimate_pending_tokens(sheet, checkpoint, loaded_skill)
    print(f"Estimasi token input + output: {estimated_tokens}")
    enforce_quota = True
    if max_total_tokens is not None and estimated_tokens > max_total_tokens:
        _confirm(
            f"Estimasi {estimated_tokens} token melebihi batas {max_total_tokens} token. Lanjutkan?",
            yes=yes,
        )
        enforce_quota = False
    if allow_external_data:
        print("Peringatan: teks Excel akan dikirim ke endpoint OpenAI-compatible eksternal.")
    else:
        _confirm(
            "Teks dari Excel akan dikirim ke endpoint OpenAI-compatible eksternal.",
            yes=yes,
        )
    quota = QuotaTracker(max_total_tokens=max_total_tokens)
    summary = asyncio.run(
        AnnotationPipeline(
            client=client,
            checkpoint=checkpoint,
            quota=quota,
            skill=loaded_skill,
            config=PipelineConfig(
                concurrency=concurrency,
                enforce_quota=enforce_quota,
                progress_every=progress_every,
                progress_callback=_print_progress,
            ),
        ).run(sheet, output_path)
    )
    report = asdict(summary) | {
        "estimated_tokens": quota.reserved_tokens,
        "actual_tokens": quota.actual_tokens,
        "skill_hash": loaded_skill_hash,
        "model": "injected" if client is not None else "configured",
    }
    _write_json(_run_summary_path(output_path), report)
    return summary


def main(argv: list[str] | None = None) -> int:
    """Run the CLI and return a process exit code."""
    load_dotenv()
    args = build_parser().parse_args(argv)
    try:
        summary = annotate_workbook(
            input_path=args.input,
            output_path=args.output,
            max_total_tokens=args.max_total_tokens,
            concurrency=args.concurrency,
            progress_every=args.progress_every,
            allow_external_data=args.allow_external_data,
            yes=args.yes,
            resume=args.resume,
            force=args.force,
            sheet_name=args.sheet,
            text_column=args.text_column,
            skill_path=args.skill,
        )
    except (FileNotFoundError, FileExistsError, ValueError, RuntimeError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(asdict(summary), ensure_ascii=True))
    return 0 if summary.status == "completed" else 3


if __name__ == "__main__":
    raise SystemExit(main())
