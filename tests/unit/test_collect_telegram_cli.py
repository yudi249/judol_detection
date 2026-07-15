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
