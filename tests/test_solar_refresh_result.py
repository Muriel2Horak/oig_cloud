from __future__ import annotations

import asyncio

import aiohttp
import pytest

from custom_components.oig_cloud.forecast.refresh_result import (
    SolarCandidateContext,
    SolarFetchResult,
    classify_http_status,
    classify_provider_exception,
)


@pytest.mark.parametrize(
    ("factory", "code", "accepted", "retryable", "has_candidate"),
    [
        (lambda: SolarFetchResult.accept({"response_time": "2026-08-11T06:00:00"}), "accepted", True, False, True),
        (lambda: SolarFetchResult.retry("timeout"), "timeout", False, True, False),
        (lambda: SolarFetchResult.retry("connection"), "connection", False, True, False),
        (lambda: SolarFetchResult.retry("rate_limited"), "rate_limited", False, True, False),
        (lambda: SolarFetchResult.retry("server_error"), "server_error", False, True, False),
        (lambda: SolarFetchResult.terminal("auth"), "auth", False, False, False),
        (lambda: SolarFetchResult.terminal("forbidden"), "forbidden", False, False, False),
        (lambda: SolarFetchResult.terminal("invalid_config"), "invalid_config", False, False, False),
        (lambda: SolarFetchResult.terminal("not_found"), "not_found", False, False, False),
        (lambda: SolarFetchResult.terminal("unprocessable"), "unprocessable", False, False, False),
        (lambda: SolarFetchResult.terminal("invalid_response"), "invalid_response", False, False, False),
        (lambda: SolarFetchResult.terminal("cancelled"), "cancelled", False, False, False),
    ],
)
def test_result_factories_expose_only_classified_outcome(
    factory, code, accepted, retryable, has_candidate
):
    result = factory()

    assert result.code == code
    assert result.accepted is accepted
    assert result.retryable is retryable
    assert (result.candidate is not None) is has_candidate
    assert set(vars(result)) == {
        "accepted",
        "retryable",
        "code",
        "candidate",
        "context",
    }


def test_retryable_result_retains_immutable_request_context():
    context = SolarCandidateContext(
        entry_id="entry-a",
        provider="forecast_solar",
        config_fingerprint="a" * 64,
        credential_revision=3,
        request_id="request:7",
        occurrence_id="occurrence-a",
        occurrence_generation=4,
        lifecycle_generation=2,
        request_sequence=7,
    )

    result = SolarFetchResult.retry("timeout").with_context(context)

    assert result.context is context
    assert result.candidate is None
    assert "secret" not in repr(result)


@pytest.mark.parametrize(
    ("status", "code", "retryable"),
    [
        (400, "invalid_config", False),
        (401, "auth", False),
        (403, "forbidden", False),
        (404, "not_found", False),
        (422, "unprocessable", False),
        (429, "rate_limited", True),
        (500, "server_error", True),
        (503, "server_error", True),
        (418, "invalid_response", False),
    ],
)
def test_http_status_classification_is_bounded(status, code, retryable):
    result = classify_http_status(status)

    assert result.code == code
    assert result.retryable is retryable
    assert result.accepted is False
    assert result.candidate is None


@pytest.mark.parametrize(
    ("error", "code", "retryable"),
    [
        (asyncio.TimeoutError("credential=secret"), "timeout", True),
        (aiohttp.ClientConnectionError("token=secret"), "connection", True),
        (asyncio.CancelledError("api_key=secret"), "cancelled", False),
        (ValueError("response body secret"), "invalid_response", False),
    ],
)
def test_exception_classification_never_carries_raw_exception(error, code, retryable):
    result = classify_provider_exception(error)

    assert result.code == code
    assert result.retryable is retryable
    assert "secret" not in repr(result)
    assert "token" not in repr(result)
    assert "api_key" not in repr(result)


@pytest.mark.parametrize(
    "factory",
    [
        lambda: SolarFetchResult.accept(None),
        lambda: SolarFetchResult.retry("auth"),
        lambda: SolarFetchResult.terminal("timeout"),
        lambda: SolarFetchResult.terminal("raw provider body"),
    ],
)
def test_invalid_result_combinations_fail_closed(factory):
    with pytest.raises((TypeError, ValueError)):
        factory()


def test_result_is_immutable():
    result = SolarFetchResult.retry("timeout")

    with pytest.raises((AttributeError, TypeError)):
        result.code = "auth"
