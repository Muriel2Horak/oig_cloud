"""Event-loop safety and failure hygiene for the manifest version resolver.

``manifest.json`` carries the integration version that both telemetry paths
(shield + planner) embed in cloud events. Reading it is blocking filesystem
I/O, so Home Assistant's blocking-call detector flags it if it happens on the
event loop.

The contract this module pins:

* every filesystem touch -- including resolving the manifest path -- happens
  inside the executor, never at import time and never on the loop;
* concurrent first callers share a single read;
* only a successful read is cached, so a transient failure recovers;
* a failure is logged by exception class / reason code only. The manifest path
  is absolute and the exception text is attacker-influenced in principle, so
  neither may reach the log, and no traceback is attached.
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from custom_components.oig_cloud.shared import integration_version as version_module
from custom_components.oig_cloud.shared.integration_version import (
    async_load_integration_version,
)

_MANIFEST = (
    Path(__file__).resolve().parent.parent
    / "custom_components"
    / "oig_cloud"
    / "manifest.json"
)
_EXPECTED_VERSION = json.loads(_MANIFEST.read_text(encoding="utf-8"))["version"]

# A failure whose text carries everything that must never be logged: a bearer
# token, the absolute manifest path, a config entry id and a box id.
_SECRET_FAILURE_TEXT = (
    "token=sk-live-DEADBEEF while reading "
    "/config/custom_components/oig_cloud/manifest.json "
    "entry_id=abc123entry box_id=2206237016"
)
_SECRETS = (
    "sk-live-DEADBEEF",
    "/config/custom_components",
    "manifest.json",
    "abc123entry",
    "2206237016",
)


class _LoopHass:
    """hass stub that records executor jobs and yields to the loop like the real one."""

    def __init__(self) -> None:
        self.executor_calls: list[tuple] = []

    async def async_add_executor_job(self, func, *args):  # noqa: ANN001
        self.executor_calls.append((func, args))
        # The real executor always yields control; without this a "single
        # flight" bug would be invisible because no other task could interleave.
        await asyncio.sleep(0)
        return func(*args)


class _FailingOnceHass(_LoopHass):
    """Fails the first executor dispatch, then behaves normally."""

    def __init__(self, error: BaseException) -> None:
        super().__init__()
        self._error = error
        self.attempts = 0

    async def async_add_executor_job(self, func, *args):  # noqa: ANN001
        self.attempts += 1
        await asyncio.sleep(0)
        if self.attempts == 1:
            raise self._error
        self.executor_calls.append((func, args))
        return func(*args)


# ---------------------------------------------------------------------------
# Executor dispatch and caching
# ---------------------------------------------------------------------------


async def test_version_is_resolved_through_the_executor():
    hass = _LoopHass()
    assert await async_load_integration_version(hass) == _EXPECTED_VERSION
    assert len(hass.executor_calls) == 1


async def test_version_is_cached_after_a_successful_read():
    hass = _LoopHass()
    await async_load_integration_version(hass)
    await async_load_integration_version(hass)
    assert len(hass.executor_calls) == 1, "cached version re-read the manifest"


async def test_concurrent_first_callers_share_one_read():
    """Three simultaneous cold callers must produce exactly one read."""
    hass = _LoopHass()
    results = await asyncio.gather(
        *(async_load_integration_version(hass) for _ in range(3))
    )
    assert results == [_EXPECTED_VERSION] * 3
    assert len(hass.executor_calls) == 1, (
        f"concurrent cold callers each read the manifest: {len(hass.executor_calls)}"
    )


async def test_transient_failure_is_not_cached_and_recovers():
    """A failed read must leave the cache empty so the next call can succeed."""
    hass = _FailingOnceHass(OSError(_SECRET_FAILURE_TEXT))

    first = await async_load_integration_version(hass)
    assert first == "unknown"
    assert version_module._CACHED_VERSION is None, (
        "a failed read poisoned the cache; the version can never recover"
    )

    second = await async_load_integration_version(hass)
    assert second == _EXPECTED_VERSION
    assert hass.attempts == 2


async def test_read_failure_is_not_cached_either():
    """Failure inside the executor job (not the dispatch) must not cache."""
    calls = {"n": 0}

    def _boom() -> str:
        calls["n"] += 1
        raise OSError(_SECRET_FAILURE_TEXT)

    class _Hass(_LoopHass):
        async def async_add_executor_job(self, func, *args):  # noqa: ANN001
            await asyncio.sleep(0)
            return _boom()

    assert await async_load_integration_version(_Hass()) == "unknown"
    assert version_module._CACHED_VERSION is None
    assert calls["n"] == 1


# ---------------------------------------------------------------------------
# Failure hygiene: class-only logging, no loop-level fallout
# ---------------------------------------------------------------------------


async def test_failure_logs_exception_class_only(caplog):
    caplog.set_level(logging.DEBUG, logger=version_module.__name__)
    hass = _FailingOnceHass(PermissionError(_SECRET_FAILURE_TEXT))

    assert await async_load_integration_version(hass) == "unknown"

    records = [rec for rec in caplog.records if rec.name == version_module.__name__]
    assert records, "the failure was not logged at all"
    for record in records:
        message = record.getMessage()
        assert "PermissionError" in message, (
            f"failure log does not name the exception class: {message}"
        )
        for secret in _SECRETS:
            assert secret not in message, f"log leaked {secret!r}: {message}"
        assert record.exc_info is None, "failure log attached a traceback"


async def test_failure_does_not_reach_the_loop_exception_handler(recwarn):
    """No orphan task, no un-retrieved exception, no ResourceWarning."""
    loop = asyncio.get_running_loop()
    previous = loop.get_exception_handler()
    reported: list[dict] = []
    loop.set_exception_handler(lambda _loop, context: reported.append(context))
    try:
        hass = _FailingOnceHass(OSError(_SECRET_FAILURE_TEXT))
        assert await async_load_integration_version(hass) == "unknown"
        assert await async_load_integration_version(hass) == _EXPECTED_VERSION
        await asyncio.sleep(0)
    finally:
        loop.set_exception_handler(previous)

    assert not reported, f"loop exception handler was invoked: {reported}"
    assert not [w for w in recwarn if issubclass(w.category, ResourceWarning)]


# ---------------------------------------------------------------------------
# No import-time filesystem work, no dead sync accessor
# ---------------------------------------------------------------------------


def test_module_import_touches_no_filesystem(monkeypatch):
    """Re-importing the module must not resolve or read the manifest.

    ``Path.resolve()`` is a syscall (it walks and readlink()s every component),
    so an import-time path resolution is blocking I/O on whatever loop happens
    to import the module -- exactly the defect being fixed.
    """
    import importlib

    touched: list[str] = []

    monkeypatch.setattr(
        Path, "resolve", lambda self, *a, **k: touched.append(f"resolve:{self}") or self
    )
    monkeypatch.setattr(
        Path,
        "read_text",
        lambda self, *a, **k: touched.append(f"read_text:{self}") or "{}",
    )

    importlib.reload(version_module)

    assert not touched, f"module import performed filesystem work: {touched}"


def test_unused_sync_accessor_is_gone():
    """A sync accessor with no production caller is dead weight and a trap.

    It reads as a safe "give me the version" API while silently returning
    ``None`` until some other code path has resolved it.
    """
    assert not hasattr(version_module, "get_integration_version")


# ---------------------------------------------------------------------------
# Both telemetry paths use the shared helper
# ---------------------------------------------------------------------------


def test_shield_telemetry_has_no_blocking_manifest_loader():
    import inspect

    from custom_components.oig_cloud.shield import telemetry as shield_mod

    assert not hasattr(shield_mod, "_MANIFEST_PATH")
    assert not hasattr(shield_mod, "_load_integration_version")
    assert not hasattr(shield_mod, "_INTEGRATION_VERSION")
    assert inspect.iscoroutinefunction(shield_mod.emit_shield_decision_event)


def test_forecast_update_has_no_blocking_manifest_loader():
    from custom_components.oig_cloud.battery_forecast.planning import (
        forecast_update as fu,
    )

    assert not hasattr(fu, "_MANIFEST_PATH")
    assert not hasattr(fu, "_resolve_integration_version")
    assert not hasattr(fu, "_INTEGRATION_VERSION")


async def test_shield_emit_resolves_version_off_loop(monkeypatch):
    """A real shield emit obtains the version without reading on the loop."""
    import pathlib

    from custom_components.oig_cloud.shield import telemetry as shield_mod

    monkeypatch.setattr(version_module, "_CACHED_VERSION", "3.3.3-shield")

    seen: list[str] = []
    real_read_text = pathlib.Path.read_text

    def _spy_read_text(self, *args, **kwargs):  # noqa: ANN001
        seen.append(str(self))
        return real_read_text(self, *args, **kwargs)

    monkeypatch.setattr(pathlib.Path, "read_text", _spy_read_text)

    class _Hass:
        data = {"core.uuid": "core-uuid"}

        async def async_add_executor_job(self, func, *args):  # noqa: ANN001
            return func(*args)

    shield = SimpleNamespace(
        hass=_Hass(),
        entry=SimpleNamespace(entry_id="e1", data={}, options={"box_id": "123456"}),
        queue=[],
        _telemetry_emitter=AsyncMock(emit_cloud_event=AsyncMock(return_value=True)),
    )
    ok = await shield_mod.emit_shield_decision_event(
        shield,
        event_name="shield_call_blocked",
        service_name="oig_cloud.set_box_mode",
        correlation_id="c1",
        expected_entities={"sensor.oig_x": "on"},
    )
    assert ok is True, "shield emit did not reach the version resolution path"
    assert not any("manifest.json" in s for s in seen), (
        "shield emit read manifest.json synchronously on the loop"
    )


@pytest.mark.parametrize("bad_version", ["", "   ", None])
async def test_missing_manifest_version_is_not_cached(monkeypatch, bad_version):
    """A manifest without a usable version is a failure, not a cacheable value."""
    payload = json.dumps({} if bad_version is None else {"version": bad_version})
    monkeypatch.setattr(Path, "read_text", lambda self, *a, **k: payload)

    hass = _LoopHass()
    assert await async_load_integration_version(hass) == "unknown"
    assert version_module._CACHED_VERSION is None
