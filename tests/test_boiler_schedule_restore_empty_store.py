"""Boiler schedule restore must not warn when there is nothing stored.

`_restore_boiler_schedule()` warns about a "legacy unversioned" schedule whenever
the stored payload carries no schema marker. A fresh install (`Store.async_load()`
returns ``None``) and a wiped store (``{}``) both hit that branch, so every restart
without a persisted schedule produced a false operator warning.

The warning stays for a genuinely non-empty unversioned artifact -- that one really
is legacy data being skipped, and the operator must be told.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest

from custom_components.oig_cloud.boiler import actuator as actuator_mod
from custom_components.oig_cloud.const import DOMAIN

NOW = datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc)
_WARNING_FRAGMENT = "Skipping legacy unversioned boiler schedule restore"


class _DummyServices:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, Any, bool]] = []

    def has_service(self, *_args: Any) -> bool:
        return False

    async def async_call(self, domain, service, data, blocking=False):
        self.calls.append((domain, service, data, blocking))


class _DummyStates:
    def get(self, _entity_id: str) -> None:
        return None


class _DummyHass:
    def __init__(self) -> None:
        self.services = _DummyServices()
        self.states = _DummyStates()
        self.data: dict[str, Any] = {}

    def async_create_task(self, coro):
        return asyncio.create_task(coro)


class _RecordingStore:
    """Store double that records reads and writes.

    ``payload`` is returned verbatim by ``async_load()`` -- including ``None``,
    which is what Home Assistant's real Store returns when the file is absent.
    """

    def __init__(self, payload: Any) -> None:
        self._payload = payload
        self.loads = 0
        self.saves: list[Any] = []

    async def async_load(self) -> Any:
        self.loads += 1
        return self._payload

    async def async_save(self, data: Any) -> None:
        self.saves.append(data)
        self._payload = data


def _install_store(monkeypatch: pytest.MonkeyPatch, payload: Any) -> _RecordingStore:
    store = _RecordingStore(payload)
    monkeypatch.setattr(actuator_mod, "Store", lambda *_a, **_k: store)
    return store


def _freeze_time(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(actuator_mod.dt_util, "now", lambda: NOW)
    monkeypatch.setattr(
        actuator_mod.dt_util,
        "parse_datetime",
        lambda value: datetime.fromisoformat(value) if value else None,
    )


def _collect_scheduled(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, Any]]:
    scheduled: list[tuple[str, Any]] = []

    def _schedule(_hass, entity_id, window, *_a, **_k):
        scheduled.append((entity_id, window))
        return [lambda: None]

    monkeypatch.setattr(actuator_mod, "_schedule_switch_window", _schedule)
    return scheduled


def _restore_warnings(caplog: pytest.LogCaptureFixture) -> list[str]:
    return [
        record.getMessage()
        for record in caplog.records
        if record.levelno >= logging.WARNING and _WARNING_FRAGMENT in record.getMessage()
    ]


def _legacy_payload() -> dict[str, Any]:
    """Unversioned artifact with real content -- the genuine legacy case."""
    return {
        "entry1": {
            "created_at": NOW.isoformat(),
            "entities": ["switch.x"],
            "windows": [
                {
                    "entity_id": "switch.x",
                    "start": NOW.isoformat(),
                    "end": (NOW + timedelta(hours=1)).isoformat(),
                }
            ],
        }
    }


def _schema_two_payload() -> dict[str, Any]:
    return {
        "schema_version": actuator_mod._SCHEDULE_SCHEMA_VERSION,
        "entries": {
            "entry1": {
                "created_at": NOW.isoformat(),
                "entities": ["switch.x"],
                "windows": [
                    {
                        "entity_id": "switch.x",
                        "start": NOW.isoformat(),
                        "end": (NOW + timedelta(hours=1)).isoformat(),
                    }
                ],
            }
        },
    }


@pytest.mark.asyncio
async def test_absent_store_payload_does_not_warn(monkeypatch, caplog):
    """No storage file at all: nothing to restore, so nothing to warn about."""
    _freeze_time(monkeypatch)
    store = _install_store(monkeypatch, None)
    scheduled = _collect_scheduled(monkeypatch)
    caplog.set_level(logging.DEBUG)

    await actuator_mod._restore_boiler_schedule(_DummyHass(), "entry1")

    assert _restore_warnings(caplog) == []
    assert scheduled == []
    assert store.saves == []


@pytest.mark.asyncio
async def test_empty_store_payload_does_not_warn(monkeypatch, caplog):
    """Empty dict payload: same as absent -- an empty store is not legacy data."""
    _freeze_time(monkeypatch)
    store = _install_store(monkeypatch, {})
    scheduled = _collect_scheduled(monkeypatch)
    caplog.set_level(logging.DEBUG)

    await actuator_mod._restore_boiler_schedule(_DummyHass(), "entry1")

    assert _restore_warnings(caplog) == []
    assert scheduled == []
    assert store.saves == []


@pytest.mark.asyncio
async def test_non_empty_legacy_payload_still_warns_once(monkeypatch, caplog):
    """A real unversioned artifact is still skipped loudly, exactly once."""
    _freeze_time(monkeypatch)
    store = _install_store(monkeypatch, _legacy_payload())
    scheduled = _collect_scheduled(monkeypatch)
    hass = _DummyHass()
    caplog.set_level(logging.DEBUG)

    await actuator_mod._restore_boiler_schedule(hass, "entry1")

    assert len(_restore_warnings(caplog)) == 1
    assert scheduled == []
    assert store.saves == []
    assert DOMAIN not in hass.data


@pytest.mark.asyncio
async def test_schema_two_payload_restores_without_warning(monkeypatch, caplog):
    """Schema-2 restore behaviour is unchanged by the empty-payload guard."""
    _freeze_time(monkeypatch)
    store = _install_store(monkeypatch, _schema_two_payload())
    scheduled = _collect_scheduled(monkeypatch)
    hass = _DummyHass()
    caplog.set_level(logging.DEBUG)

    await actuator_mod._restore_boiler_schedule(hass, "entry1")

    assert _restore_warnings(caplog) == []
    assert [entity_id for entity_id, _window in scheduled] == ["switch.x"]
    assert store.saves == []
    assert hass.data[DOMAIN]["boiler_schedules"]["entry1"].entities == {"switch.x"}
