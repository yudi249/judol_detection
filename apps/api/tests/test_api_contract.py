from __future__ import annotations

from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

from apps.api.app.services.inference import InferenceResult


def batch_payload(items: list[dict[str, object]]) -> dict[str, object]:
    return {
        "request_id": "req-1",
        "source": {"platform": "simulation", "captured_at": "2026-09-14T00:00:00Z"},
        "client": {"extension_version": "0.1.0", "prediction_mode": "api", "threshold": 0.75},
        "items": items,
    }


def item(identifier: str, text: str = "bonus slot") -> dict[str, object]:
    return {"id": identifier, "text": text, "context": {"kind": "post", "visible": True}}


def test_health_reports_loaded_model(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ready"
    assert response.json()["model"]["is_mock"] is False


def test_batch_preserves_request_and_item_ids(client: TestClient) -> None:
    response = client.post("/predict/batch", json=batch_payload([item("a"), item("b")]))

    assert response.status_code == 200
    assert response.json()["request_id"] == "req-1"
    assert [result["id"] for result in response.json()["results"]] == ["a", "b"]


def test_batch_rejects_thirty_three_items(client: TestClient) -> None:
    response = client.post("/predict/batch", json=batch_payload([item(str(index)) for index in range(33)]))

    assert response.status_code == 422


def test_batch_rejects_item_text_over_512_characters(client: TestClient) -> None:
    response = client.post("/predict/batch", json=batch_payload([item("too-long", "x" * 513)]))

    assert response.status_code == 422


def test_batch_rejects_malformed_source_url(client: TestClient) -> None:
    payload = batch_payload([item("a")])
    payload["source"] = {
        **payload["source"],  # type: ignore[dict-item]
        "url": "not a URI",
    }

    response = client.post("/predict/batch", json=payload)

    assert response.status_code == 422


def test_fastapi_schema_marks_source_url_as_a_uri(client: TestClient) -> None:
    schema = client.app.openapi()
    source_schema = schema["components"]["schemas"]["PredictionSource"]
    url_schema = source_schema["properties"]["url"]["anyOf"][0]

    assert url_schema["format"] == "uri"
    assert url_schema["maxLength"] == 2048

def test_batch_returns_queue_saturated_problem_without_waiting(
    client: TestClient,
) -> None:
    import apps.api.app.main as main

    client.app.state.inference_semaphore = main.asyncio.Semaphore(0)

    response = client.post("/predict/batch", json=batch_payload([item("a")]))

    assert response.status_code == 429
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "inference_queue_saturated"


def test_inference_exception_returns_model_unavailable_problem(
    client: TestClient, fake_service: object
) -> None:
    fake_service.raise_error = True  # type: ignore[attr-defined]

    response = client.post(
        "/predict",
        json={
            "request_id": "req-1",
            "source": {"platform": "simulation", "captured_at": "2026-09-14T00:00:00Z"},
            "client": {"extension_version": "0.1.0", "prediction_mode": "api", "threshold": 0.75},
            "item": item("a"),
        },
    )

    assert response.status_code == 503
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "model_unavailable"


def test_batch_projects_item_errors_without_losing_successes(
    client: TestClient, fake_service: object, monkeypatch: pytest.MonkeyPatch
) -> None:
    def selectively_invalid(items: list[tuple[str, str]], *, threshold: float) -> list[InferenceResult]:
        return [fake_service.result("good", "bonus slot"), object()]  # type: ignore[attr-defined]

    monkeypatch.setattr(fake_service, "predict_items", selectively_invalid)

    response = client.post("/predict/batch", json=batch_payload([item("good"), item("bad")]))

    assert response.status_code == 200
    assert [result["id"] for result in response.json()["results"]] == ["good"]
    assert response.json()["errors"] == [{"item_id": "bad", "code": "item_projection_failed", "message": "Unable to project inference result."}]
    assert response.json()["summary"]["total_items"] == 2


def test_cors_configuration_rejects_wildcard(monkeypatch: pytest.MonkeyPatch) -> None:
    from apps.api.app.config import load_settings

    monkeypatch.setenv("JUDOLLENS_CORS_ORIGINS", "*")

    with pytest.raises(ValueError, match="wildcard"):
        load_settings()


def test_fastapi_schema_matches_canonical_supported_contract(client: TestClient) -> None:
    contract = yaml.safe_load(Path("contracts/judollens-api.openapi.yaml").read_text(encoding="utf-8"))
    schema = client.app.openapi()

    assert set(schema["paths"]) == set(contract["paths"])
    for path, methods in contract["paths"].items():
        for method, expected in methods.items():
            actual = schema["paths"][path][method]
            assert actual["operationId"] == expected["operationId"]

    batch_schema = schema["components"]["schemas"]["PredictionBatchRequest"]
    item_schema = schema["components"]["schemas"]["PredictionItem"]
    assert batch_schema["properties"]["items"]["maxItems"] == 32
    assert item_schema["properties"]["text"]["maxLength"] == 512


def test_fastapi_schema_references_canonical_request_and_success_models(
    client: TestClient,
) -> None:
    contract = yaml.safe_load(Path("contracts/judollens-api.openapi.yaml").read_text(encoding="utf-8"))
    schema = client.app.openapi()

    for path, request_schema, response_schema in (
        ("/predict", "PredictionRequest", "PredictionResponse"),
        ("/predict/batch", "PredictionBatchRequest", "PredictionBatchResponse"),
    ):
        expected_request = contract["paths"][path]["post"]["requestBody"]["content"]["application/json"]["schema"]["$ref"]
        expected_response = contract["paths"][path]["post"]["responses"]["200"]["$ref"]
        actual = schema["paths"][path]["post"]
        assert actual["requestBody"]["content"]["application/json"]["schema"]["$ref"] == f"#/components/schemas/{request_schema}"
        assert actual["responses"]["200"]["content"]["application/json"]["schema"]["$ref"] == f"#/components/schemas/{response_schema}"
        assert expected_request == f"#/components/schemas/{request_schema}"
        assert expected_response == f"#/components/responses/{response_schema}"
