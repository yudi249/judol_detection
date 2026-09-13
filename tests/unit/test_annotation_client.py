import asyncio
import json

import httpx
import pytest

from judol_detection.annotation.client import (
    AnnotationClient,
    ConfigurationError,
    ProviderQuotaError,
    RetryableProviderError,
)


def test_client_sends_strict_chat_completion_payload() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": '{"label":"promosi_judol"}'}}],
                "usage": {"prompt_tokens": 10, "completion_tokens": 2, "total_tokens": 12},
            },
        )

    async def run() -> object:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            client = AnnotationClient(
                api_key="secret",
                base_url="https://example.test/v1",
                model="model-a",
                skill="instruksi",
                http_client=http_client,
                max_retries=0,
            )
            return await client.annotate("contoh teks")

    result = asyncio.run(run())
    body = json.loads(requests[0].content)
    assert result.result.label.value == "promosi_judol"
    assert result.usage.total_tokens == 12
    assert body["model"] == "model-a"
    assert body["temperature"] == 0
    assert body["messages"][0] == {"role": "system", "content": "instruksi"}
    assert body["messages"][1] == {"role": "user", "content": "contoh teks"}
    assert body["response_format"]["json_schema"]["strict"] is True


def test_client_retries_timeout_then_returns_success() -> None:
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(503)
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": '{"label":"bukan_judol"}'}}]},
        )

    async def run() -> object:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            client = AnnotationClient(
                api_key="secret",
                base_url="https://example.test/v1",
                model="model-a",
                skill="instruksi",
                http_client=http_client,
                max_retries=3,
                backoff_base_seconds=0,
            )
            return await client.annotate("teks")

    assert asyncio.run(run()).result.label.value == "bukan_judol"
    assert attempts == 2


def test_client_retries_invalid_model_response() -> None:
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            return httpx.Response(200, json={"choices": [{"message": {"content": "invalid"}}]})
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": '{"label":"perlu_review"}'}}]},
        )

    async def run() -> object:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            client = AnnotationClient(
                api_key="secret",
                base_url="https://example.test/v1",
                model="model-a",
                skill="instruksi",
                http_client=http_client,
                max_retries=2,
                backoff_base_seconds=0,
            )
            return await client.annotate("teks")

    assert asyncio.run(run()).result.label.value == "perlu_review"
    assert attempts == 3


def test_client_surfaces_provider_quota_error() -> None:
    async def run() -> None:
        transport = httpx.MockTransport(lambda request: httpx.Response(429, json={"error": {"code": "insufficient_quota"}}))
        async with httpx.AsyncClient(transport=transport) as http_client:
            client = AnnotationClient(
                api_key="secret",
                base_url="https://example.test/v1",
                model="model-a",
                skill="instruksi",
                http_client=http_client,
                max_retries=3,
                backoff_base_seconds=0,
            )
            with pytest.raises(ProviderQuotaError):
                await client.annotate("teks")

    asyncio.run(run())


def test_client_rejects_missing_configuration() -> None:
    with pytest.raises(ConfigurationError):
        AnnotationClient(api_key="", base_url="https://example.test", model="model", skill="x")


def test_client_maps_authentication_failure_to_configuration_error() -> None:
    async def run() -> None:
        transport = httpx.MockTransport(lambda request: httpx.Response(401))
        async with httpx.AsyncClient(transport=transport) as http_client:
            client = AnnotationClient(
                api_key="secret",
                base_url="https://example.test/v1",
                model="model-a",
                skill="instruksi",
                http_client=http_client,
                max_retries=0,
            )
            with pytest.raises(ConfigurationError):
                await client.annotate("teks")

    asyncio.run(run())


def test_client_maps_non_retryable_http_error_to_provider_response_error() -> None:
    async def run() -> None:
        transport = httpx.MockTransport(lambda request: httpx.Response(400))
        async with httpx.AsyncClient(transport=transport) as http_client:
            client = AnnotationClient(
                api_key="secret",
                base_url="https://example.test/v1",
                model="model-a",
                skill="instruksi",
                http_client=http_client,
                max_retries=0,
            )
            with pytest.raises(RuntimeError, match="HTTP 400"):
                await client.annotate("teks")

    asyncio.run(run())


def test_retryable_error_type_is_distinct() -> None:
    assert issubclass(RetryableProviderError, RuntimeError)
