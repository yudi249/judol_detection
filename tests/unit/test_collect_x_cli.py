from pathlib import Path
import subprocess
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_x_dry_run_reads_enabled_queries() -> None:
    result = subprocess.run(
        [sys.executable, "scripts/collect_x.py", "--query-file", "configs/x_queries.json", "--dry-run"],
        cwd=PROJECT_ROOT, capture_output=True, text=True, check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "mode=manual" in result.stdout
    assert "browser=camoufox" in result.stdout
    assert "situs slot gacor" in result.stdout


def test_x_cli_rejects_missing_query() -> None:
    result = subprocess.run(
        [sys.executable, "scripts/collect_x.py", "--dry-run"],
        cwd=PROJECT_ROOT, capture_output=True, text=True, check=False,
    )

    assert result.returncode != 0
    assert "provide --query or --query-file" in result.stderr


def test_x_dry_run_uses_persistent_profile() -> None:
    result = subprocess.run(
        [sys.executable, "scripts/collect_x.py", "--query", "slot", "--dry-run"],
        cwd=PROJECT_ROOT, capture_output=True, text=True, check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "profile_dir=data\\browser-profiles\\x-research" in result.stdout


def test_x_control_dry_run_reads_negative_queries() -> None:
    result = subprocess.run(
        [
            sys.executable,
            "scripts/collect_x.py",
            "--query-file",
            "configs/x_negative_queries.json",
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
    assert "slot waktu" in result.stdout


def test_x_negative_config_declares_control_mode_by_default() -> None:
    result = subprocess.run(
        [
            sys.executable,
            "scripts/collect_x.py",
            "--query-file",
            "configs/x_negative_queries.json",
            "--dry-run",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "sample_mode=control" in result.stdout
