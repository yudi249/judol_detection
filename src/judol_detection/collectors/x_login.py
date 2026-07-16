"""Researcher-managed X persistent-profile login helpers."""


def is_authenticated_x_page(url: str) -> bool:
    """Return whether an X URL is outside the interactive login flow."""
    return "x.com" in url and "/i/flow/login" not in url
