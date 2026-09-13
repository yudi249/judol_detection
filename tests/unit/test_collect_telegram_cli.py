from pathlib import Path
import subprocess
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_dry_run_accepts_none_message_limit() -> None:
    result = subprocess.run(
        [
            sys.executable,
            "scripts/collect_telegram.py",
            "--seed",
            "seed",
            "--max-messages-per-channel",
            "none",
            "--dry-run",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "max_messages_per_channel=None" in result.stdout


def test_control_dry_run_reads_control_seeds() -> None:
    result = subprocess.run(
        [
            sys.executable,
            "scripts/collect_telegram.py",
            "--seed-file",
            "configs/telegram_control_seeds.json",
            "--sample-mode",
            "control",
            "--dry-run",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "sample_mode=control" in result.stdout
    assert "kompascom" in result.stdout


def test_control_seed_config_declares_control_mode_by_default() -> None:
    result = subprocess.run(
        [
            sys.executable,
            "scripts/collect_telegram.py",
            "--seed-file",
            "configs/telegram_control_seeds.json",
            "--dry-run",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "sample_mode=control" in result.stdout


def test_explicit_mode_override_keeps_seed_registry_operational() -> None:
    control_as_candidate = subprocess.run(
        [
            sys.executable,
            "scripts/collect_telegram.py",
            "--seed-file",
            "configs/telegram_control_seeds.json",
            "--sample-mode",
            "candidate",
            "--dry-run",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    candidate_as_control = subprocess.run(
        [
            sys.executable,
            "scripts/collect_telegram.py",
            "--seed-file",
            "configs/telegram_seeds.json",
            "--sample-mode",
            "control",
            "--dry-run",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert control_as_candidate.returncode == 0, control_as_candidate.stderr
    assert candidate_as_control.returncode == 0, candidate_as_control.stderr


def test_dry_run_accepts_per_channel_document_quota() -> None:
    result = subprocess.run(
        [
            sys.executable,
            "scripts/collect_telegram.py",
            "--seed",
            "seed",
            "--target-documents-per-channel",
            "100",
            "--dry-run",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "target_documents_per_channel=100" in result.stdout


def test_quota_rejects_explicit_message_limit() -> None:
    result = subprocess.run(
        [
            sys.executable,
            "scripts/collect_telegram.py",
            "--seed",
            "seed",
            "--target-documents-per-channel",
            "100",
            "--max-messages-per-channel",
            "200",
            "--dry-run",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode != 0
    assert "cannot be combined" in result.stderr
