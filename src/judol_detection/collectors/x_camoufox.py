"""Shared Camoufox launch configuration for the X research profile."""

import json
from pathlib import Path
from typing import Any


FINGERPRINT_FILE = ".camoufox-fingerprint.json"


def camoufox_launch_options(profile_dir: Path) -> dict[str, Any]:
    """Return one stable, local fingerprint configuration for a profile."""
    profile_dir.mkdir(parents=True, exist_ok=True)
    fingerprint_path = profile_dir / FINGERPRINT_FILE
    if fingerprint_path.exists():
        fingerprint = json.loads(fingerprint_path.read_text(encoding="utf-8"))
    else:
        from camoufox.fingerprints import get_random_preset

        fingerprint = get_random_preset(os="windows")
        if fingerprint is None:
            raise RuntimeError("Camoufox did not provide a Windows fingerprint preset")
        fingerprint_path.write_text(
            json.dumps(fingerprint, ensure_ascii=False, sort_keys=True, indent=2),
            encoding="utf-8",
        )
    fingerprint = _drop_unsupported_webgl(fingerprint, fingerprint_path)
    return {
        "persistent_context": True,
        "user_data_dir": str(profile_dir),
        "headless": False,
        "humanize": True,
        "os": "windows",
        "locale": "id-ID",
        "fingerprint_preset": fingerprint,
    }


def _drop_unsupported_webgl(fingerprint: dict[str, Any], path: Path) -> dict[str, Any]:
    """Keep the preset usable when Camoufox's WebGL database has changed."""
    webgl = fingerprint.get("webgl")
    if not isinstance(webgl, dict):
        return fingerprint
    vendor = webgl.get("unmaskedVendor")
    renderer = webgl.get("unmaskedRenderer")
    if not vendor or not renderer:
        return fingerprint
    try:
        from camoufox.webgl import sample_webgl

        sample_webgl("win", vendor, renderer)
    except (ImportError, ValueError):
        cleaned = {key: value for key, value in fingerprint.items() if key != "webgl"}
        path.write_text(
            json.dumps(cleaned, ensure_ascii=False, sort_keys=True, indent=2),
            encoding="utf-8",
        )
        return cleaned
    return fingerprint
