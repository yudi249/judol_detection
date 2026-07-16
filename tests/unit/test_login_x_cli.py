from pathlib import Path
import subprocess
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_login_x_help_describes_persistent_profile() -> None:
    result = subprocess.run(
        [sys.executable, "scripts/login_x.py", "--help"],
        cwd=PROJECT_ROOT, capture_output=True, text=True, check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "profile-dir" in result.stdout
