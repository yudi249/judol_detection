"""Async OpenAI-compatible Chat Completions client."""

from __future__ import annotations

from dataclasses import dataclass
import asyncio
from typing import Any

import httpx

from .contracts import AnnotationResult, build_response_format, parse_annotation_response


class ConfigurationError(ValueError):
    """Raised when provider configuration is incomplete."""


class RetryableProviderError(RuntimeError):
    """Raised for temporary provider failures."""


class ProviderQuotaError(RuntimeError):
    """Raised when the provider reports exhausted quota or balance."""


class ProviderResponseError(RuntimeError):
    """Raised when a successful HTTP response has an invalid shape."""


class NonRetryableProviderError(RuntimeError):
    """Raised when the provider returns a permanent request error."""


@dataclass(frozen=True)
class Usage:
    """Provider-reported token usage."""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass(frozen=True)
class ClientResult:
    """Validated annotation and optional usage data."""

    result: AnnotationResult
    usage: Usage


class AnnotationClient:
    """Call an OpenAI-compatible Chat Completions endpoint."""

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        model: str,
        skill: str,
        http_client: httpx.AsyncClient | None = None,
        timeout_seconds: float = 60.0,
        max_retries: int = 3,
        backoff_base_seconds: float = 0.5,
    ) -> None:
        if not api_key or not base_url or not model or not skill:
            raise ConfigurationError("api_key, base_url, model, and skill are required")
        if max_retries < 0:
            raise ValueError("max_retries cannot be negative")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.skill = skill
        self.http_client = http_client
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.backoff_base_seconds = backoff_base_seconds

    async def annotate(self, text: str) -> ClientResult:
        """Annotate one text with bounded retries."""
        payload = {
            "model": self.model,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": self.skill},
                {"role": "user", "content": text},
            ],
            "response_format": build_response_format(),
        }
        owns_client = self.http_client is None
        client = self.http_client or httpx.AsyncClient(timeout=self.timeout_seconds)
        try:
            for attempt in range(self.max_retries + 1):
                try:
                    return await self._request(client, payload)
                except (
                    ProviderQuotaError,
                    ConfigurationError,
                    NonRetryableProviderError,
                ):
                    raise
                except (
                    httpx.TimeoutException,
                    httpx.TransportError,
                    RetryableProviderError,
                    ProviderResponseError,
                ) as exc:
                    if attempt >= self.max_retries:
                        raise RetryableProviderError("provider retry limit reached") from exc
                    await asyncio.sleep(self.backoff_base_seconds * (2**attempt))
                    if isinstance(exc, RetryableProviderError):
                        continue
                except httpx.HTTPStatusError as exc:
                    if exc.response.status_code in {429, 500, 502, 503, 504}:
                        if attempt >= self.max_retries:
                            raise RetryableProviderError("provider retry limit reached") from exc
                        await asyncio.sleep(self.backoff_base_seconds * (2**attempt))
                        continue
                    raise
            raise RetryableProviderError("provider retry limit reached")
        finally:
            if owns_client:
                await client.aclose()

    async def _request(self, client: httpx.AsyncClient, payload: dict[str, Any]) -> ClientResult:
        response = await client.post(
            f"{self.base_url}/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json=payload,
        )
        if response.status_code == 429:
            try:
                error_body = response.json()
            except ValueError:
                error_body = {}
            code = str(error_body.get("error", {}).get("code", ""))
            if "quota" in code or "insufficient" in code or "billing" in code:
                raise ProviderQuotaError("provider quota or balance is unavailable")
        if response.status_code in {401, 403}:
            raise ConfigurationError("provider rejected the API credentials")
        if response.status_code in {429, 500, 502, 503, 504}:
            response.raise_for_status()
            raise RetryableProviderError(f"provider returned HTTP {response.status_code}")
        if response.is_error:
            raise NonRetryableProviderError(f"provider returned HTTP {response.status_code}")
        try:
            body = response.json()
            content = body["choices"][0]["message"]["content"]
            parsed = parse_annotation_response(content)
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise ProviderResponseError("provider response shape is invalid") from exc
        usage_data = body.get("usage", {})
        usage = Usage(
            prompt_tokens=int(usage_data.get("prompt_tokens", 0)),
            completion_tokens=int(usage_data.get("completion_tokens", 0)),
            total_tokens=int(usage_data.get("total_tokens", 0)),
        )
        return ClientResult(result=parsed, usage=usage)
