"""Prepare a local persistent Chromium profile for researcher-managed X login."""

import argparse
import sys
from pathlib import Path


SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from judol_detection.collectors.x_login import is_authenticated_x_page


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Open the persistent X research profile for manual login."
    )
    parser.add_argument(
        "--profile-dir",
        type=Path,
        default=Path("data/browser-profiles/x-research"),
        help="persistent local Chromium profile directory",
    )
    args = parser.parse_args()

    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            str(args.profile_dir), headless=False
        )
        try:
            page = context.pages[0] if context.pages else context.new_page()
            page.goto("https://x.com/home", wait_until="domcontentloaded")
            input("Selesaikan login X di browser, lalu tekan Enter di terminal ini: ")
            if not is_authenticated_x_page(page.url):
                raise SystemExit(
                    "Login belum terdeteksi. Selesaikan login terlebih dahulu, lalu jalankan login_x.py lagi."
                )
            print(f"Sesi X tersimpan lokal di {args.profile_dir}. Jalankan collect_x.py setelah browser tertutup.")
        finally:
            context.close()


if __name__ == "__main__":
    main()
