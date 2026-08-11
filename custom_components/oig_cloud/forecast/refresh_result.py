"""Classified, secret-safe solar provider fetch outcomes."""

from __future__ import annotations

import asyncio
import copy
from dataclasses import dataclass
from typing import Any, Iterator, Mapping

import aiohttp

RETRYABLE_CODES = frozenset({"timeout", "connection", "rate_limited", "server_error"})
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
class SolarCandidateContext:
    """Immutable identity captured before provider I/O."""

    entry_id: str
    provider: str
    config_fingerprint: str
    credential_revision: int
    request_id: str
    occurrence_id: str | None
    occurrence_generation: int
    lifecycle_generation: int
    request_sequence: int

    def provenance(self) -> dict[str, Any]:
        """Return the non-secret cache provenance captured for this request."""
        return {
            "entry_id": self.entry_id,
            "provider": self.provider,
            "config_fingerprint": self.config_fingerprint,
            "credential_revision": self.credential_revision,
        }


@dataclass(frozen=True)
class SolarCandidate(Mapping[str, Any]):
    """Provider snapshot bound to the immutable request that produced it."""

    forecast_data: Mapping[str, Any]
    context: SolarCandidateContext

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "forecast_data",
            copy.deepcopy(dict(self.forecast_data)),
        )

    def __getitem__(self, key: str) -> Any:
        return self.forecast_data[key]

    def __iter__(self) -> Iterator[str]:
        return iter(self.forecast_data)

    def __len__(self) -> int:
        return len(self.forecast_data)


@dataclass(frozen=True)
class SolarFetchResult:
    """Immutable fetch result without exceptions, bodies, URLs, or credentials."""

    accepted: bool
    retryable: bool
    code: str
    candidate: Mapping[str, Any] | None = None
    context: SolarCandidateContext | None = None

    def __post_init__(self) -> None:
        if self.accepted:
            if self.retryable or self.code != "accepted":
                raise ValueError("accepted result has inconsistent classification")
            if not isinstance(self.candidate, Mapping) or not self.candidate:
                raise TypeError("accepted result requires a complete candidate mapping")
            if isinstance(self.candidate, SolarCandidate):
                candidate_context = self.candidate.context
                if self.context is not None and self.context != candidate_context:
                    raise ValueError("candidate and result contexts differ")
                object.__setattr__(self, "context", candidate_context)
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

    def with_context(self, context: SolarCandidateContext) -> SolarFetchResult:
        """Bind a classified result to its immutable pre-I/O identity."""
        if self.context is not None:
            return self
        if self.accepted and self.candidate is not None:
            return SolarFetchResult.accept(SolarCandidate(self.candidate, context))
        return SolarFetchResult(
            self.accepted,
            self.retryable,
            self.code,
            self.candidate,
            context,
        )


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
