from pathlib import Path

import pytest

from judol_detection.collectors.x_file import load_x_collection_export, load_x_response_batches


FIXTURE = Path(__file__).parents[1] / "fixtures" / "x_manual_response.js"


def test_loads_json5_assignment_batches() -> None:
    batches = load_x_response_batches(FIXTURE)

    assert len(batches) == 2
    assert batches[0]["data"]["search_by_raw_query"]


def test_rejects_file_without_data_assignment(tmp_path) -> None:
    path = tmp_path / "invalid.js"
    path.write_text("const value = 1;", encoding="utf-8")

    with pytest.raises(ValueError, match="data assignment"):
        load_x_response_batches(path)


def test_loads_extension_normalized_json_export() -> None:
    path = Path(__file__).parents[1] / "fixtures" / "x_extension_export.json"

    export = load_x_collection_export(path)

    assert export["query"] == "slot gacor"
    assert export["items"][0]["source_item_id"] == "9001"


def test_rejects_extension_export_with_unexpected_shape(tmp_path) -> None:
    path = tmp_path / "invalid.json"
    path.write_text('{"items": []}', encoding="utf-8")

    with pytest.raises(ValueError, match="schema_version"):
        load_x_collection_export(path)
