from judol_detection.collectors.x_login import is_authenticated_x_page


def test_login_state_accepts_non_login_url() -> None:
    assert is_authenticated_x_page("https://x.com/home") is True


def test_login_state_rejects_login_flow_url() -> None:
    assert is_authenticated_x_page("https://x.com/i/flow/login") is False
