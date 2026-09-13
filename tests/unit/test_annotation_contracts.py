import json

import pytest

from judol_detection.annotation.contracts import (
    AnnotationLabel,
    InvalidAnnotationResponse,
    build_response_format,
    parse_annotation_response,
)


def test_parse_annotation_response_accepts_only_the_strict_label_object() -> None:
    result = parse_annotation_response('{"label":"promosi_judol"}')

    assert result.label is AnnotationLabel.PROMOSI_JUDOL


@pytest.mark.parametrize(
    "payload",
    [
        "Label: promosi_judol",
        '{"label":"unknown"}',
        '{"label":"promosi_judol","reason":"extra"}',
        '{"label": "promosi_judol"',
    ],
)
def test_parse_annotation_response_rejects_non_strict_payloads(payload: str) -> None:
    with pytest.raises(InvalidAnnotationResponse):
        parse_annotation_response(payload)


def test_response_format_contains_only_the_four_allowed_labels() -> None:
    schema = build_response_format()

    assert schema["type"] == "json_schema"
    nested = schema["json_schema"]["schema"]
    assert nested["additionalProperties"] is False
    assert nested["properties"]["label"]["enum"] == [
        "promosi_judol",
        "bukan_judol",
        "perlu_review",
        "not_indonesian",
    ]
    json.dumps(schema)
