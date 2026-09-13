from pathlib import Path
import subprocess
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_youtube_control_dry_run_reads_negative_queries() -> None:
    result = subprocess.run(
        [
            sys.executable,
            "scripts/collect_youtube_api.py",
            "--query-file",
            "configs/youtube_negative_queries.json",
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
    assert "tutorial teknologi Indonesia" in result.stdout


def test_youtube_negative_config_declares_control_mode_by_default() -> None:
    result = subprocess.run(
        [
            sys.executable,
            "scripts/collect_youtube_api.py",
            "--query-file",
            "configs/youtube_negative_queries.json",
            "--dry-run",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "sample_mode=control" in result.stdout


def test_youtube_metadata_collector_accepts_negative_registry_by_default() -> None:
    result = subprocess.run(
        [
            sys.executable,
            "scripts/collect_youtube.py",
            "--query-file",
            "configs/youtube_negative_queries.json",
            "--dry-run",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "sample_mode=control" in result.stdout
