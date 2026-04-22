from __future__ import annotations

from datetime import datetime, timedelta
import logging
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import pytest

from custom_components.oig_cloud.api.oig_cloud_session_manager import (
    MIN_REQUEST_INTERVAL,
    SESSION_TTL,
    OigCloudSessionManager,
)
from custom_components.oig_cloud.const import DOMAIN
from custom_components.oig_cloud.lib.oig_cloud_client.api.oig_cloud_api import (
    OigCloudAuthError,
)


INSTALL_ID_HASH = (
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
)


class DummySession:
    def __init__(self, headers=None, connector_headers=None):
        self._default_headers = headers
        self._connector = (
            SimpleNamespace(_default_headers=connector_headers)
            if connector_headers is not None
            else None
        )
        self.closed = False

    async def close(self):
        self.closed = True


class DummyApi:
    def __init__(self):
        self._phpsessid = "abc123" * 5
        self._base_url = "https://example.test"
        self.authenticate = AsyncMock()
        self.get_stats = AsyncMock(return_value={"ok": True})
        self.get_extended_stats = AsyncMock(return_value={"ok": True})
        self.set_battery_working_mode = AsyncMock(return_value={"ok": True})
        self.set_grid_delivery = AsyncMock(return_value={"ok": True})
        self.set_boiler_mode = AsyncMock(return_value={"ok": True})
        self.format_battery = AsyncMock(return_value={"ok": True})
        self.set_battery_capacity = AsyncMock(return_value={"ok": True})
        self.set_box_mode = AsyncMock(return_value={"ok": True})
        self.set_grid_delivery_limit = AsyncMock(return_value=True)
        self.set_formating_mode = AsyncMock(return_value={"ok": True})

    def get_session(self):
        return DummySession(headers={"User-Agent": "test"})


class RecordingTelemetryEmitter:
    def __init__(self):
        self.cloud_events: list[dict[str, object]] = []

    async def emit_cloud_event(self, event: dict[str, object]) -> bool:
        self.cloud_events.append(dict(event))
        return True


class FailingTelemetryEmitter:
    def __init__(self, error_message: str):
        self.error_message = error_message

    async def emit_cloud_event(self, event: dict[str, object]) -> bool:
        raise RuntimeError(self.error_message)


def _make_telemetry_state() -> dict[str, Any]:
    return {
        "incident_dedupe": {},
        "cloud_context": {
            "device_id": "12345",
            "install_id_hash": INSTALL_ID_HASH,
        "integration_version": "2.3.35",
        },
    }


@pytest.mark.asyncio
async def test_log_api_session_info_variants(monkeypatch):
    api = DummyApi()
    manager = OigCloudSessionManager(api)

    session = DummySession(headers={"User-Agent": "test"})
    api.get_session = lambda: session
    await manager._log_api_session_info()
    assert session.closed is True

    session = DummySession(headers=None, connector_headers={"Accept": "json"})
    api.get_session = lambda: session
    await manager._log_api_session_info()
    assert session.closed is True

    session = DummySession(headers=None, connector_headers=None)
    api.get_session = lambda: session
    await manager._log_api_session_info()
    assert session.closed is True

    api.get_session = cast(Any, lambda: None)
    await manager._log_api_session_info()


def test_is_session_expired():
    api = DummyApi()
    manager = OigCloudSessionManager(api)
    assert manager._is_session_expired() is True


def test_api_property():
    api = DummyApi()
    manager = OigCloudSessionManager(api)
    assert manager.api is api

    manager._last_auth_time = datetime.now() - SESSION_TTL + timedelta(seconds=10)
    assert manager._is_session_expired() is False

    manager._last_auth_time = datetime.now() - SESSION_TTL - timedelta(seconds=1)
    assert manager._is_session_expired() is True


@pytest.mark.asyncio
async def test_rate_limit(monkeypatch):
    api = DummyApi()
    manager = OigCloudSessionManager(api)
    manager._last_request_time = datetime.now()

    slept = {"seconds": 0}

    async def _sleep(seconds):
        slept["seconds"] = seconds

    monkeypatch.setattr("custom_components.oig_cloud.api.oig_cloud_session_manager.asyncio.sleep", _sleep)

    await manager._rate_limit()
    assert slept["seconds"] >= 0
    assert manager._last_request_time is not None


@pytest.mark.asyncio
async def test_call_with_retry_success(monkeypatch):
    api = DummyApi()
    manager = OigCloudSessionManager(api)
    manager._last_auth_time = datetime.now()

    await manager.get_stats()
    assert manager._stats["successful_requests"] == 1


@pytest.mark.asyncio
async def test_call_with_retry_auth_error(monkeypatch):
    api = DummyApi()
    manager = OigCloudSessionManager(api)

    async def _raise():
        raise OigCloudAuthError("nope")

    api.get_stats = cast(Any, _raise)

    async def _sleep(_seconds):
        return None

    monkeypatch.setattr("custom_components.oig_cloud.api.oig_cloud_session_manager.asyncio.sleep", _sleep)

    with pytest.raises(OigCloudAuthError):
        await manager.get_stats()

    assert manager._stats["retry_count"] >= 1
    assert manager._stats["failed_requests"] == 1


@pytest.mark.asyncio
async def test_call_with_retry_unexpected_error():
    api = DummyApi()
    manager = OigCloudSessionManager(api)

    async def _raise():
        raise RuntimeError("boom")

    api.get_stats = cast(Any, _raise)

    with pytest.raises(RuntimeError):
        await manager.get_stats()
    assert manager._stats["failed_requests"] == 1


def test_get_statistics_populates_rates():
    api = DummyApi()
    manager = OigCloudSessionManager(api)
    manager._stats["total_requests"] = 10
    manager._stats["successful_requests"] = 7
    manager._last_auth_time = datetime.now() - timedelta(minutes=5)

    stats = manager.get_statistics()
    assert stats["success_rate_percent"] == 70.0
    assert stats["current_session_age_minutes"] > 0


@pytest.mark.asyncio
async def test_log_api_session_info_with_errors(monkeypatch):
    class BrokenApi:
        def __getattr__(self, _name):
            raise RuntimeError("boom")

    manager = OigCloudSessionManager(BrokenApi())
    await manager._log_api_session_info()

    api = DummyApi()
    manager = OigCloudSessionManager(api)

    def _raise_session():
        raise RuntimeError("boom")

    api.get_session = cast(Any, _raise_session)
    await manager._log_api_session_info()


@pytest.mark.asyncio
async def test_ensure_auth_failure(monkeypatch):
    api = DummyApi()
    api.authenticate = AsyncMock(side_effect=RuntimeError("fail"))
    manager = OigCloudSessionManager(api)

    with pytest.raises(RuntimeError):
        await manager._ensure_auth()


@pytest.mark.asyncio
async def test_ensure_auth_success_updates_session(monkeypatch):
    api = DummyApi()
    manager = OigCloudSessionManager(api)
    assert manager._last_auth_time is None

    await manager._ensure_auth()

    assert manager._last_auth_time is not None
    api.authenticate.assert_awaited()


@pytest.mark.asyncio
async def test_auth_failure_emits_once_until_success_resets_dedupe(caplog):
    api = DummyApi()
    api.authenticate = AsyncMock(
        side_effect=[RuntimeError("fail-1"), RuntimeError("fail-2"), None, RuntimeError("fail-3")]
    )
    manager = OigCloudSessionManager(api)
    emitter = RecordingTelemetryEmitter()
    hass_data: dict[str, Any] = {
        DOMAIN: {
            "entry-1": {
                "telemetry": _make_telemetry_state(),
            }
        }
    }
    telemetry_state: dict[str, Any] = hass_data[DOMAIN]["entry-1"]["telemetry"]

    manager.bind_telemetry_emitter(emitter, telemetry_state)

    with pytest.raises(RuntimeError, match="fail-1"):
        await manager._ensure_auth()

    with pytest.raises(RuntimeError, match="fail-2"):
        await manager._ensure_auth()

    assert [event["event_name"] for event in emitter.cloud_events] == [
        "incident_auth_failed"
    ]
    assert emitter.cloud_events[0]["detail_incident_reason"] == "source_connection_error"
    dedupe_state = telemetry_state["incident_dedupe"]
    assert dedupe_state["incident_auth_failed"]["active"] is True
    assert dedupe_state["incident_auth_failed"]["transition_count"] == 1
    assert any(
        record.message.startswith("[OIG_CLOUD_ERROR][component=incident][corr=")
        and "[run=na]" in record.message
        for record in caplog.records
    )

    await manager._ensure_auth()

    assert dedupe_state["incident_auth_failed"]["active"] is False
    manager._last_auth_time = None

    with pytest.raises(RuntimeError, match="fail-3"):
        await manager._ensure_auth()

    assert [event["event_name"] for event in emitter.cloud_events] == [
        "incident_auth_failed",
        "incident_auth_failed",
    ]
    assert dedupe_state["incident_auth_failed"]["transition_count"] == 2
    assert "fail-1" not in caplog.text
    assert "fail-2" not in caplog.text
    assert "fail-3" not in caplog.text
    assert "error_class=RuntimeError" in caplog.text


@pytest.mark.asyncio
async def test_auth_failure_dedupe_state_is_entry_scoped():
    api_one = DummyApi()
    api_one.authenticate = AsyncMock(side_effect=RuntimeError("entry-one-fail"))
    manager_one = OigCloudSessionManager(api_one)
    emitter_one = RecordingTelemetryEmitter()

    api_two = DummyApi()
    api_two.authenticate = AsyncMock(side_effect=RuntimeError("entry-two-fail"))
    manager_two = OigCloudSessionManager(api_two)
    emitter_two = RecordingTelemetryEmitter()

    hass_data: dict[str, Any] = {
        DOMAIN: {
            "entry-1": {"telemetry": _make_telemetry_state()},
            "entry-2": {"telemetry": _make_telemetry_state()},
        }
    }

    manager_one.bind_telemetry_emitter(emitter_one, hass_data[DOMAIN]["entry-1"]["telemetry"])
    manager_two.bind_telemetry_emitter(emitter_two, hass_data[DOMAIN]["entry-2"]["telemetry"])

    with pytest.raises(RuntimeError, match="entry-one-fail"):
        await manager_one._ensure_auth()

    with pytest.raises(RuntimeError, match="entry-two-fail"):
        await manager_two._ensure_auth()

    with pytest.raises(RuntimeError, match="entry-one-fail"):
        await manager_one._ensure_auth()

    assert [event["event_name"] for event in emitter_one.cloud_events] == [
        "incident_auth_failed"
    ]
    assert [event["event_name"] for event in emitter_two.cloud_events] == [
        "incident_auth_failed"
    ]
    assert (
        hass_data[DOMAIN]["entry-1"]["telemetry"]["incident_dedupe"]
        is not hass_data[DOMAIN]["entry-2"]["telemetry"]["incident_dedupe"]
    )


@pytest.mark.asyncio
async def test_retry_exhaustion_emits_once_until_success_resets_dedupe(
    monkeypatch, caplog
):
    api = DummyApi()
    manager = OigCloudSessionManager(api)
    emitter = RecordingTelemetryEmitter()
    telemetry_state = _make_telemetry_state()
    manager.bind_telemetry_emitter(emitter, telemetry_state)

    async def _noop():
        return None

    async def _sleep(_seconds):
        return None

    monkeypatch.setattr(manager, "_ensure_auth", _noop)
    monkeypatch.setattr(manager, "_rate_limit", _noop)
    monkeypatch.setattr(
        "custom_components.oig_cloud.api.oig_cloud_session_manager.asyncio.sleep", _sleep
    )

    async def always_fail_auth():
        raise OigCloudAuthError("expired")

    async def succeed():
        return {"ok": True}

    with pytest.raises(OigCloudAuthError, match="expired"):
        await manager._call_with_retry(always_fail_auth)

    with pytest.raises(OigCloudAuthError, match="expired"):
        await manager._call_with_retry(always_fail_auth)

    assert [event["event_name"] for event in emitter.cloud_events] == [
        "incident_retry_exhausted"
    ]
    assert emitter.cloud_events[0]["detail_incident_reason"] == "retry_limit_reached"
    dedupe_state = telemetry_state["incident_dedupe"]
    assert dedupe_state["incident_retry_exhausted"]["active"] is True
    assert dedupe_state["incident_retry_exhausted"]["transition_count"] == 1
    assert any(
        record.message.startswith("[OIG_CLOUD_WARNING][component=incident][corr=")
        and "[run=na]" in record.message
        for record in caplog.records
    )
    assert any(
        record.message.startswith("[OIG_CLOUD_ERROR][component=incident][corr=")
        and "[run=na]" in record.message
        for record in caplog.records
    )

    assert await manager._call_with_retry(succeed) == {"ok": True}
    assert dedupe_state["incident_retry_exhausted"]["active"] is False

    with pytest.raises(OigCloudAuthError, match="expired"):
        await manager._call_with_retry(always_fail_auth)

    assert [event["event_name"] for event in emitter.cloud_events] == [
        "incident_retry_exhausted",
        "incident_retry_exhausted",
    ]
    assert dedupe_state["incident_retry_exhausted"]["transition_count"] == 2
    assert "expired" not in caplog.text
    assert "error_class=OigCloudAuthError" in caplog.text


@pytest.mark.asyncio
async def test_incident_emitter_failure_logs_canonical_warning_without_secret_text(
    caplog,
):
    api = DummyApi()
    api.authenticate = AsyncMock(side_effect=RuntimeError("auth-secret-token"))
    manager = OigCloudSessionManager(api)
    manager.bind_telemetry_emitter(
        FailingTelemetryEmitter("broker-secret-token"),
        _make_telemetry_state(),
    )

    with caplog.at_level(logging.WARNING):
        with pytest.raises(RuntimeError, match="auth-secret-token"):
            await manager._ensure_auth()

    assert "auth-secret-token" not in caplog.text
    assert "broker-secret-token" not in caplog.text
    assert any(
        record.message.startswith("[OIG_CLOUD_WARNING][component=incident][corr=")
        and "[run=na]" in record.message
        and "incident telemetry dispatch failed" in record.message.lower()
        for record in caplog.records
    )


@pytest.mark.asyncio
async def test_ensure_auth_skips_when_session_valid(monkeypatch):
    api = DummyApi()
    manager = OigCloudSessionManager(api)
    manager._last_auth_time = datetime.now()

    await manager._ensure_auth()

    api.authenticate.assert_not_awaited()


@pytest.mark.asyncio
async def test_wrapper_methods_cover_args(monkeypatch):
    api = DummyApi()
    manager = OigCloudSessionManager(api)
    manager._last_auth_time = datetime.now()

    async def _noop():
        return None

    monkeypatch.setattr(manager, "_ensure_auth", _noop)
    monkeypatch.setattr(manager, "_rate_limit", _noop)

    await manager.get_extended_stats("batt", "2025-01-01", "2025-01-02")
    await manager.set_battery_working_mode("123", "1", "a", "b")
    await manager.set_grid_delivery(1)
    await manager.set_boiler_mode(1)
    await manager.format_battery(1)
    await manager.set_battery_capacity(10.0)
    await manager.set_box_mode("1")
    await manager.set_grid_delivery_limit(5)
    await manager.set_formating_mode("x")


@pytest.mark.asyncio
async def test_close_resets_state():
    api = DummyApi()
    manager = OigCloudSessionManager(api)
    manager._last_auth_time = datetime.now()
    manager._last_request_time = datetime.now()
    manager._stats["total_requests"] = 1

    await manager.close()

    assert manager._last_auth_time is None
    assert manager._last_request_time is None
