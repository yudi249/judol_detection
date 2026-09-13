import sys
from contextlib import contextmanager
from pathlib import Path
from types import ModuleType


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_login_context_uses_camoufox_persistent_profile(monkeypatch, tmp_path) -> None:
    captured = {}
    preset = {"navigator": {"platform": "Win32"}}

    class FakeContext:
        pass

    class FakeCamoufox:
        def __init__(self, **kwargs):
            captured.update(kwargs)

        def __enter__(self):
            return FakeContext()

        def __exit__(self, *_args):
            return None

    camoufox_module = ModuleType("camoufox")
    sync_api_module = ModuleType("camoufox.sync_api")
    sync_api_module.Camoufox = FakeCamoufox
    monkeypatch.setitem(sys.modules, "camoufox", camoufox_module)
    monkeypatch.setitem(sys.modules, "camoufox.sync_api", sync_api_module)
    monkeypatch.setattr("scripts.login_x.camoufox_launch_options", lambda _path: {
        "persistent_context": True,
        "user_data_dir": str(tmp_path),
        "headless": False,
        "humanize": True,
        "os": "windows",
        "locale": "id-ID",
        "fingerprint_preset": preset,
    })

    sys.path.insert(0, str(PROJECT_ROOT))
    try:
        from scripts.login_x import open_login_context

        with open_login_context(tmp_path) as context:
            assert isinstance(context, FakeContext)
    finally:
        sys.path.remove(str(PROJECT_ROOT))

    assert captured == {
        "persistent_context": True,
        "user_data_dir": str(tmp_path),
        "headless": False,
        "humanize": True,
        "os": "windows",
        "locale": "id-ID",
        "fingerprint_preset": preset,
    }
