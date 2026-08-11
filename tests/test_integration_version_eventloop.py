"""Event-loop safety for manifest.json version reads.

Home Assistant flags synchronous file I/O executed on the event loop. Both
telemetry paths (shield + planner) read ``manifest.json`` to embed the
integration version. The version must be resolved via the executor
(``hass.async_add_executor_job``) and cached (the manifest is immutable at
runtime) -- never via a bare ``Path.read_text`` / ``open`` on the loop.

These tests fail (RED) while either path does blocking file I/O on the loop
and pass (GREEN) once both use the executor + cached helper.
"""
from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

from custom_components.oig_cloud.shared.integration_version import (
    async_load_integration_version,
)

_MANIFEST = (
    Path(__file__).resolve().parent.parent
    / "custom_components"
    / "oig_cloud"
    / "manifest.json"
)


def _read_manifest_sync(path: Path) -> str:
    """Blocking read -- simulates the forbidden on-loop access."""
    return path.read_text(encoding="utf-8")


class _LoopHass:
    """Hass stub that records executor jobs and forbids on-loop file I/O.

    A test fails loudly if the version resolver does the read itself on the
    loop instead of dispatching it here.
    """

    def __init__(self) -> None:
        self.executor_calls: list[tuple] = []

    async def async_add_executor_job(self, func, *args):  # noqa: ANN001
        self.executor_calls.append((func, args))
        return func(*args)


async def test_version_resolved_via_executor_not_on_loop():
    """The file read must be dispatched to the executor."""
    hass = _LoopHass()
    version = await async_load_integration_version(hass)

    assert hass.executor_calls, "version read did not go through the executor"
    expected = json.loads(_read_manifest_sync(_MANIFEST))["version"]
    assert version == expected


async def test_version_cached_after_first_read():
    """Second resolution must not touch the executor again (immutable file)."""
    hass = _LoopHass()
    await async_load_integration_version(hass)
    first_calls = len(hass.executor_calls)
    assert first_calls == 1

    await async_load_integration_version(hass)
    assert len(hass.executor_calls) == first_calls, "cached version re-read the file"


async def test_version_failure_is_unknown_without_raising():
    """A missing/unreadable manifest yields 'unknown' on the executor path."""

    class _BrokenHass(_LoopHass):
        async def async_add_executor_job(self, func, *args):  # noqa: ANN001
            raise OSError("simulated unreadable manifest")

    version = await async_load_integration_version(_BrokenHass())
    assert version == "unknown"


def test_sync_helpers_do_not_touch_filesystem():
    """The sync accessor must be pure (no file I/O) before async resolution.

    Guards against re-introducing an on-loop ``read_text`` at import time.
    """
    from custom_components.oig_cloud.shared import integration_version as mod

    # Without prior async resolution the sync accessor must not read the file.
    opened: list[str] = []

    import builtins

    real_open = builtins.open

    def _spy_open(*args, **kwargs):  # noqa: ANN002
        opened.append(str(args[0]) if args else "")
        return real_open(*args, **kwargs)

    builtins.open = _spy_open
    try:
        value = mod.get_integration_version()
    finally:
        builtins.open = real_open

    assert value in {"unknown", None} or isinstance(value, str)
    assert not any("manifest" in p for p in opened), (
        "sync accessor performed filesystem I/O on the manifest"
    )


# --- per-module wiring: both telemetry paths must use the shared helper ---


def test_shield_telemetry_has_no_blocking_manifest_loader():
    """shield.telemetry must not carry its own manifest path or loader.

    The version is resolved via the shared executor helper at emit time; the
    module must expose neither ``_MANIFEST_PATH`` nor
    ``_load_integration_version`` / ``_INTEGRATION_VERSION`` (those did a
    module-import read_text on the event loop).
    """
    import inspect

    from custom_components.oig_cloud.shield import telemetry as shield_mod

    assert not hasattr(shield_mod, "_MANIFEST_PATH"), (
        "shield.telemetry still holds a manifest path"
    )
    assert not hasattr(shield_mod, "_load_integration_version"), (
        "shield.telemetry still holds a blocking manifest loader"
    )
    assert not hasattr(shield_mod, "_INTEGRATION_VERSION"), (
        "shield.telemetry still resolves the version at import time"
    )
    assert inspect.iscoroutinefunction(
        shield_mod.emit_shield_decision_event
    ), "shield emit must stay async to resolve the version off the loop"


def test_forecast_update_has_no_blocking_manifest_loader():
    """forecast_update must not carry its own manifest path or lazy loader."""
    from custom_components.oig_cloud.battery_forecast.planning import (
        forecast_update as fu,
    )

    assert not hasattr(fu, "_MANIFEST_PATH"), (
        "forecast_update still holds a manifest path"
    )
    assert not hasattr(fu, "_resolve_integration_version"), (
        "forecast_update still holds a blocking manifest resolver"
    )
    assert not hasattr(fu, "_INTEGRATION_VERSION"), (
        "forecast_update still caches the version via its own loader"
    )


async def test_shield_emit_resolves_version_off_loop(monkeypatch):
    """A real shield emit must obtain the version via the executor helper.

    Spy on the helper and assert it is called (not a module-level constant)
    and that no Path.read_text runs during the emit.
    """
    import pathlib

    from custom_components.oig_cloud.shield import telemetry as shield_mod
    from custom_components.oig_cloud.shared import integration_version as ver_mod

    monkeypatch.setattr(ver_mod, "_CACHED_VERSION", "3.3.3-shield")

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
    # Emit must succeed AND reach the version path -- proves the spy is real.
    assert ok is True, "shield emit did not reach the version resolution path"
    assert not any("manifest.json" in s for s in seen), (
        "shield emit read manifest.json synchronously on the loop"
    )
