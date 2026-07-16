"""Safe parser for researcher-saved X response JavaScript files."""

import re
from pathlib import Path
from typing import Any

import json5


_DATA_ASSIGNMENT = re.compile(r"\s*data\s*=\s*(\[.*\])\s*;?\s*\Z", re.DOTALL)


def load_x_response_batches(path: Path) -> tuple[dict[str, Any], ...]:
    """Read JSON5 response batches from a `data = [...]` file without execution."""
    source = path.read_text(encoding="utf-8")
    match = _DATA_ASSIGNMENT.match(source)
    if match is None:
        raise ValueError(f"{path}: expected a data assignment")
    try:
        payload = json5.loads(match.group(1))
    except ValueError as error:
        raise ValueError(f"{path}: invalid JSON5: {error}") from error
    if not isinstance(payload, list) or not all(isinstance(item, dict) for item in payload):
        raise ValueError(f"{path}: data assignment must contain response objects")
    return tuple(payload)
