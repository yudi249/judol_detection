"""Prepare a local persistent Camoufox profile for researcher-managed X login."""

import argparse
import sys
from contextlib import contextmanager
from pathlib import Path


SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from judol_detection.collectors.x_login import is_authenticated_x_page
from judol_detection.collectors.x_camoufox import camoufox_launch_options


@contextmanager
def open_login_context(profile_dir: Path):
    from camoufox.sync_api import Camoufox

    with Camoufox(**camoufox_launch_options(profile_dir)) as context:
        yield context


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Open the persistent Camoufox profile for manual X login."
    )
    parser.add_argument(
        "--profile-dir",
        type=Path,
        default=Path("data/browser-profiles/x-research"),
        help="persistent local Camoufox profile directory",
    )
    args = parser.parse_args()

    with open_login_context(args.profile_dir) as context:
        page = context.pages[0] if context.pages else context.new_page()
        page.goto("https://x.com/home", wait_until="domcontentloaded")
        input("Selesaikan login X di browser, lalu tekan Enter di terminal ini: ")
        if not is_authenticated_x_page(page.url):
            raise SystemExit(
                "Login belum terdeteksi. Selesaikan login terlebih dahulu, lalu jalankan login_x.py lagi."
            )
        print(
            f"Sesi X tersimpan lokal di {args.profile_dir}. "
            "Jalankan collect_x.py setelah browser tertutup."
        )


if __name__ == "__main__":
    main()
