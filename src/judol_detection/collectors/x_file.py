"""Safe parser for researcher-saved X response JavaScript files."""

import re
import json
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


def load_x_collection_export(path: Path) -> dict[str, Any]:
    """Read the normalized JSON envelope produced by the X browser extension."""
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError(f"{path}: invalid JSON: {error}") from error
    if not isinstance(payload, dict):
        raise ValueError(f"{path}: normalized export must be an object")
    if payload.get("schema_version") != 1:
        raise ValueError(f"{path}: unsupported or missing schema_version")
    if payload.get("source") != "x_search_timeline":
        raise ValueError(f"{path}: unsupported source")
    if not isinstance(payload.get("query"), str):
        raise ValueError(f"{path}: query must be a string")
    items = payload.get("items")
    if not isinstance(items, list) or not all(isinstance(item, dict) for item in items):
        raise ValueError(f"{path}: items must be an array of objects")
    for item in items:
        if not isinstance(item.get("source_item_id"), str) or not item["source_item_id"]:
            raise ValueError(f"{path}: every item needs source_item_id")
        if not isinstance(item.get("text_raw"), str) or not item["text_raw"].strip():
            raise ValueError(f"{path}: every item needs text_raw")
        if not isinstance(item.get("source_url"), str) or not item["source_url"]:
            raise ValueError(f"{path}: every item needs source_url")
    return payload
