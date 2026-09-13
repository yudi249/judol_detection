import json

from judol_detection.collectors.x_camoufox import camoufox_launch_options


def test_camoufox_options_persist_one_fingerprint_preset(tmp_path, monkeypatch) -> None:
    preset = {"navigator": {"platform": "Win32"}}
    monkeypatch.setattr(
        "camoufox.fingerprints.get_random_preset",
        lambda os=None, ff_version=None: preset,
    )

    first = camoufox_launch_options(tmp_path)
    second = camoufox_launch_options(tmp_path)

    assert first["persistent_context"] is True
    assert first["user_data_dir"] == str(tmp_path)
    assert first["headless"] is False
    assert first["humanize"] is True
    assert first["os"] == "windows"
    assert first["locale"] == "id-ID"
    assert first["fingerprint_preset"] == preset
    assert second["fingerprint_preset"] == preset
    assert json.loads((tmp_path / ".camoufox-fingerprint.json").read_text()) == preset


def test_camoufox_options_drops_unsupported_webgl_pair(tmp_path, monkeypatch) -> None:
    preset = {
        "navigator": {"platform": "Win32"},
        "webgl": {
            "unmaskedVendor": "Google Inc. (Intel)",
            "unmaskedRenderer": "unsupported renderer",
        },
    }
    path = tmp_path / ".camoufox-fingerprint.json"
    path.write_text(json.dumps(preset), encoding="utf-8")
    monkeypatch.setattr(
        "camoufox.webgl.sample_webgl",
        lambda *_args: (_ for _ in ()).throw(ValueError("unsupported WebGL pair")),
    )

    options = camoufox_launch_options(tmp_path)
    saved = json.loads(path.read_text(encoding="utf-8"))

    assert "webgl" not in options["fingerprint_preset"]
    assert "webgl" not in saved
    assert options["fingerprint_preset"]["navigator"]["platform"] == "Win32"
