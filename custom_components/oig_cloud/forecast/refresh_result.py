"""Classified, secret-safe solar provider fetch outcomes."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Mapping

import aiohttp

RETRYABLE_CODES = frozenset(
    {"timeout", "connection", "rate_limited", "server_error"}
)
TERMINAL_CODES = frozenset(
    {
        "auth",
        "forbidden",
        "invalid_config",
        "not_found",
        "unprocessable",
        "invalid_response",
        "cancelled",
        "storage_failed",
        "superseded",
        "removed",
    }
)


@dataclass(frozen=True)
class SolarFetchResult:
    """Immutable fetch result without exceptions, bodies, URLs, or credentials."""

    accepted: bool
    retryable: bool
    code: str
    candidate: Mapping[str, Any] | None = None

    def __post_init__(self) -> None:
        if self.accepted:
            if self.retryable or self.code != "accepted":
                raise ValueError("accepted result has inconsistent classification")
            if not isinstance(self.candidate, Mapping) or not self.candidate:
                raise TypeError("accepted result requires a complete candidate mapping")
            return
        if self.candidate is not None:
            raise ValueError("failed result cannot carry a candidate")
        allowed = RETRYABLE_CODES if self.retryable else TERMINAL_CODES
        if self.code not in allowed:
            raise ValueError("unsupported safe result code")

    @classmethod
    def accept(cls, candidate: Mapping[str, Any] | None) -> SolarFetchResult:
        """Return an accepted candidate result."""
        return cls(True, False, "accepted", candidate)

    @classmethod
    def retry(cls, code: str) -> SolarFetchResult:
        """Return a retryable classified failure."""
        return cls(False, True, code)

    @classmethod
    def terminal(cls, code: str) -> SolarFetchResult:
        """Return a terminal classified failure."""
        return cls(False, False, code)


def classify_http_status(status: int) -> SolarFetchResult:
    """Classify a non-success HTTP status without retaining response content."""
    if status == 400:
        return SolarFetchResult.terminal("invalid_config")
    if status == 401:
        return SolarFetchResult.terminal("auth")
    if status == 403:
        return SolarFetchResult.terminal("forbidden")
    if status == 404:
        return SolarFetchResult.terminal("not_found")
    if status == 422:
        return SolarFetchResult.terminal("unprocessable")
    if status == 429:
        return SolarFetchResult.retry("rate_limited")
    if 500 <= status <= 599:
        return SolarFetchResult.retry("server_error")
    return SolarFetchResult.terminal("invalid_response")


def classify_provider_exception(error: BaseException) -> SolarFetchResult:
    """Classify a provider exception by type and discard its unsafe details."""
    if isinstance(error, asyncio.CancelledError):
        return SolarFetchResult.terminal("cancelled")
    if isinstance(error, (asyncio.TimeoutError, TimeoutError)):
        return SolarFetchResult.retry("timeout")
    if isinstance(error, aiohttp.ClientConnectionError):
        return SolarFetchResult.retry("connection")
    return SolarFetchResult.terminal("invalid_response")
