"""Finding B — re-enabling a module doesn't recreate entities.

Root cause: HA's ConfigEntries.async_reload() aborts BEFORE calling
async_setup_entry whenever async_unload_entry raises or returns False
(homeassistant/config_entries.py: `if not unload_result: return unload_result`).
Several cleanup steps inside our own async_unload_entry could blow past their
`except Exception` guard (ServiceShield.cleanup() / OigCloudCoordinator.
async_shutdown() re-raise asyncio.CancelledError when they cancel their own
in-flight task and await it — CancelledError is BaseException, not Exception,
since Python 3.8), and the platform unload used to be an all-or-nothing
asyncio.gather() with no protection at all. Any of these aborted the reload
before setup ever ran, so a re-enabled module's entities never came back
without a full HA restart.

These tests pin the fix: a single failing/raising step during unload must
never stop async_unload_entry from returning True, and must never stop a
reload from reaching async_setup_entry again.
"""
from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest

import custom_components.oig_cloud as init_module
from custom_components.oig_cloud.const import DOMAIN


class DummyConfigEntries:
    def __init__(self, *, raise_platform: str | None = None, unload_ok: bool = True):
        self.updated = []
        self.reloaded = []
        self.forwarded = []
        self._raise_platform = raise_platform
        self._unload_ok = unload_ok
        self.unload_calls = []

    def async_update_entry(self, entry, options=None):
        entry.options = options or {}
        self.updated.append(entry)

    async def async_forward_entry_unload(self, entry, platform):
        self.unload_calls.append(platform)
        if platform == self._raise_platform:
            raise RuntimeError(f"boom unloading {platform}")
        return self._unload_ok

    async def async_forward_entry_setups(self, entry, platforms):
        self.forwarded.append((entry, platforms))

    async def async_reload(self, entry_id):
        self.reloaded.append(entry_id)


class DummyHass:
    def __init__(self, config_entries=None):
        self.data = {DOMAIN: {}}
        self.config_entries = config_entries or DummyConfigEntries()

    def async_create_task(self, coro):
        if hasattr(coro, "close"):
            coro.close()
        return object()


@pytest.mark.asyncio
async def test_async_unload_entry_survives_platform_unload_exception():
    """A single raising platform unload must not abort async_unload_entry."""
    config_entries = DummyConfigEntries(raise_platform="sensor")
    hass = DummyHass(config_entries)
    entry = SimpleNamespace(entry_id="entry1")
    hass.data[DOMAIN][entry.entry_id] = {}

    result = await init_module.async_unload_entry(hass, entry)

    assert result is True
    # both platforms were still attempted — the switch unload wasn't skipped
    # just because sensor blew up first.
    assert set(config_entries.unload_calls) == {"sensor", "switch"}


@pytest.mark.asyncio
async def test_async_unload_entry_survives_platform_unload_false():
    """A platform reporting unload failure (False, no exception) must not abort either."""
    config_entries = DummyConfigEntries(unload_ok=False)
    hass = DummyHass(config_entries)
    entry = SimpleNamespace(entry_id="entry1")
    hass.data[DOMAIN][entry.entry_id] = {}

    result = await init_module.async_unload_entry(hass, entry)

    assert result is True


@pytest.mark.asyncio
async def test_async_unload_entry_survives_cancelled_error_from_coordinator_shutdown():
    """A cancel-my-own-subtask CancelledError from async_shutdown() must not
    escape async_unload_entry — it is not the caller's task being cancelled."""
    hass = DummyHass()
    entry = SimpleNamespace(entry_id="entry1")

    class RaisesCancelledCoordinator:
        async def async_shutdown(self):
            raise asyncio.CancelledError()

    hass.data[DOMAIN][entry.entry_id] = {"coordinator": RaisesCancelledCoordinator()}

    result = await init_module.async_unload_entry(hass, entry)

    assert result is True


@pytest.mark.asyncio
async def test_reload_after_toggle_does_not_raise_for_partial_failure(monkeypatch):
    """End-to-end: async_reload_entry must still call async_setup_entry even
    when the unload step hit a raising platform — this is what lets a
    re-enabled module's entities come back without a full HA restart."""
    config_entries = DummyConfigEntries(raise_platform="switch")
    hass = DummyHass(config_entries)
    entry = SimpleNamespace(entry_id="entry1", hass=hass)
    hass.data[DOMAIN][entry.entry_id] = {}

    called = {"setup": 0}

    async def fake_setup(_hass, _entry):
        called["setup"] += 1
        return True

    monkeypatch.setattr(init_module, "async_setup_entry", fake_setup)

    # Exercise the REAL async_unload_entry (not a mock) so the fix in
    # __init__.py is what's actually under test.
    await init_module.async_reload_entry(entry)

    assert called["setup"] == 1, "setup must still run after a partial unload failure"
