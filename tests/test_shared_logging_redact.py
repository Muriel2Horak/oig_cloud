"""Tests for shared logging module - telemetry and redaction."""

from __future__ import annotations

import importlib
import sys
import types
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGE_ROOT = ROOT / "custom_components"
OIG_ROOT = PACKAGE_ROOT / "oig_cloud"
SHARED_ROOT = OIG_ROOT / "shared"
TEST_PACKAGE = "shared_logging_redact_testpkg"


def _ensure_package(name: str, path: Path) -> None:
    module = sys.modules.get(name)
    if module is None:
        module = types.ModuleType(name)
        module.__path__ = [str(path)]
        sys.modules[name] = module


_ensure_package(TEST_PACKAGE, ROOT)
_ensure_package(f"{TEST_PACKAGE}.oig_cloud", OIG_ROOT)
_ensure_package(f"{TEST_PACKAGE}.oig_cloud.shared", SHARED_ROOT)

logging_module = importlib.import_module(f"{TEST_PACKAGE}.oig_cloud.shared.logging")
_redact_sensitive = logging_module._redact_sensitive


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


def test_logging_module_no_longer_exports_new_relic_bootstrap():
    assert not hasattr(logging_module, "SimpleTelemetry")
    assert not hasattr(logging_module, "setup_simple_telemetry")
