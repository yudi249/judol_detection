from pathlib import Path

import yaml

CONTRACT = Path("contracts/judollens-api.openapi.yaml")


def test_openapi_contract_declares_required_realtime_endpoints() -> None:
    document = yaml.safe_load(CONTRACT.read_text(encoding="utf-8"))

    assert document["openapi"] == "3.1.0"
    assert set(document["paths"]) == {"/health", "/predict", "/predict/batch"}
    assert document["paths"]["/predict/batch"]["post"]["operationId"] == "predictBatch"


def test_batch_contract_enforces_initial_realtime_limits() -> None:
    document = yaml.safe_load(CONTRACT.read_text(encoding="utf-8"))
    schemas = document["components"]["schemas"]

    assert schemas["PredictionBatchRequest"]["properties"]["items"]["maxItems"] == 32
    assert schemas["PredictionItem"]["properties"]["text"]["maxLength"] == 512
