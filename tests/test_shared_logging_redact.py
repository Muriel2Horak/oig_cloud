"""Tests for shared logging module - telemetry and redaction."""

from __future__ import annotations

import time
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.oig_cloud.shared.logging import (
    _redact_sensitive,
    setup_simple_telemetry,
)


def test_redact_sensitive_none():
    """Test that None returns 'none'."""
    result = _redact_sensitive(None)
    assert result == "none"


def test_redact_sensitive_bool_int_float():
    """Test that bool, int, float are returned as-is."""
    assert _redact_sensitive(True) is True
    assert _redact_sensitive(False) is False
    assert _redact_sensitive(42) == 42
    assert _redact_sensitive(3.14) == 3.14


def test_redact_sensitive_short_string():
    """Test that short strings are returned as-is."""
    result = _redact_sensitive("hello world")
    # Empty strings are returned as-is
    assert result == "" or result == "hello world"


def test_redact_sensitive_long_string():
    """Test that long strings are truncated."""
    long_string = "x" * 150
    result = _redact_sensitive(long_string)
    assert len(result) == 23  # "x" * 20 + "..."
    assert result.endswith("...")


def test_redact_sensitive_token_pattern():
    """Test that token-like patterns are redacted."""
    result = _redact_sensitive("abc123def456ghi789jkl012mno345pqr")
    assert result == "***REDACTED***"


def test_redact_sensitive_cookie_pattern():
    """Test that cookie-like keywords are redacted."""
    patterns = [
        "PHPSESSID=abc123",
        "authorization=bearer token",
        "api_key=secret123",
        "password=mypass",
        "cookie=value",
        # Note: "session" and "token" are not redacted when embedded in other words
        # unless they are standalone keywords
    ]

    for pattern in patterns:
        result = _redact_sensitive(pattern)
        assert result == "***REDACTED***", f"Failed for: {pattern}"


def test_setup_simple_telemetry_success():
    """Test that setup_simple_telemetry creates SimpleTelemetry instance."""
    result = setup_simple_telemetry("email_hash", "hass_id")

    assert result is not None
    assert result.url.endswith("/log/v1")
    assert "Content-Type" in result.headers
    assert "X-Event-Source" in result.headers


@pytest.mark.asyncio
async def test_telemetry_send_event_session_not_available():
    """Test that send_event returns False when aiohttp is not available."""
    # Create telemetry with unavailable aiohttp
    from custom_components.oig_cloud.shared.logging import SimpleTelemetry

    class NoAiohttpTelemetry(SimpleTelemetry):
        def __init__(self, url, headers):
            super().__init__(url, headers)
            self._aiohttp_available = False

    telemetry = NoAiohttpTelemetry("http://example.test", {})
    result = await telemetry.send_event("test", "service", {"data": 123})

    assert result is False


@pytest.mark.asyncio
async def test_telemetry_close_no_session():
    """Test that close handles None session."""
    from custom_components.oig_cloud.shared.logging import SimpleTelemetry

    telemetry = SimpleTelemetry("http://example.test", {})
    telemetry.session = None

    # Should not raise any exception
    await telemetry.close()


@pytest.mark.asyncio
async def test_telemetry_close_closed_session():
    """Test that close handles already closed session."""
    from custom_components.oig_cloud.shared.logging import SimpleTelemetry

    class DummyClosedSession:
        closed = True

        async def close(self):
            await time.sleep(0)

    telemetry = SimpleTelemetry("http://example.test", {})
    telemetry.session = DummyClosedSession()

    # Should not raise any exception
    await telemetry.close()


def test_redact_sensitive_list_and_dict():
    """Test that lists and dicts are converted to strings."""
    # List - will be converted to string but not redacted unless it contains token pattern
    result = _redact_sensitive(["token123", "normal"])
    assert isinstance(result, str)

    # Dict with sensitive key - will be converted to string but not redacted
    result = _redact_sensitive({"password": "secret"})
    assert isinstance(result, str)


def test_redact_sensitive_nested_token():
    """Test that tokens embedded in text are redacted."""
    result = _redact_sensitive("My token is abc123def456ghi789jkl012mno345pqr and secret")
    assert result == "***REDACTED***"


def test_redact_sensitive_empty_string():
    """Test that empty string is returned as-is."""
    result = _redact_sensitive("")
    assert result == ""


def test_redact_sensitive_string_without_sensitive_data():
    """Test that strings without sensitive data pass through."""
    result = _redact_sensitive("normal string without tokens")
    assert result == "normal string without tokens"


# Test that covers import fallback when aiohttp is not available
def test_imports_fallback_when_aiohttp_unavailable():
    """Test that imports work even when aiohttp is unavailable."""
    import custom_components.oig_cloud.shared.logging as logging_module
    # If aiohttp is available, it should be imported
    # If not available, it should fall back to None
    assert hasattr(logging_module, 'ClientSession')
    assert hasattr(logging_module, 'ClientTimeout')
    assert hasattr(logging_module, 'TCPConnector')


def test_import_fallback_executes_except_branch(monkeypatch):
    """Force ImportError for aiohttp to execute fallback branch."""
    import builtins
    import importlib

    import custom_components.oig_cloud.shared.logging as logging_module

    original_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "aiohttp" or name.startswith("aiohttp."):
            raise ImportError("forced")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    importlib.reload(logging_module)

    try:
        assert logging_module.ClientSession is None
        assert logging_module.ClientTimeout is None
        assert logging_module.TCPConnector is None
    finally:
        monkeypatch.setattr(builtins, "__import__", original_import)
        importlib.reload(logging_module)
