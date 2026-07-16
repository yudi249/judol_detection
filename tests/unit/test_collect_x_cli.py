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
    assert "mode=latest" in result.stdout
    assert "situs slot gacor" in result.stdout


def test_x_cli_rejects_non_positive_max_posts() -> None:
    result = subprocess.run(
        [sys.executable, "scripts/collect_x.py", "--query", "slot", "--max-posts", "0", "--dry-run"],
        cwd=PROJECT_ROOT, capture_output=True, text=True, check=False,
    )

    assert result.returncode != 0
    assert "positive integer" in result.stderr


def test_x_dry_run_defaults_to_no_login_wait() -> None:
    result = subprocess.run(
        [sys.executable, "scripts/collect_x.py", "--query", "slot", "--dry-run"],
        cwd=PROJECT_ROOT, capture_output=True, text=True, check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "login_timeout_seconds=0" in result.stdout
