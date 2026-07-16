from pathlib import Path
import subprocess
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FIXTURE = PROJECT_ROOT / "tests" / "fixtures" / "x_manual_response.js"


def test_dry_run_reports_file_and_batch_count() -> None:
    result = subprocess.run(
        [sys.executable, "scripts/import_x_files.py", "--input", str(FIXTURE), "--dry-run"],
        cwd=PROJECT_ROOT, capture_output=True, text=True, check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "x_manual_response" in result.stdout
    assert "batches=2" in result.stdout
