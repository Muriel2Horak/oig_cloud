"""Startup in local mode must not publish stale cloud values before local data.

Regression (2026-11-05, box 2206237016): after each HA restart the integration
sensor ``box_prms_mode`` showed "Home UPS" for 5-7 s although the box was in
Home 1. At startup the proxy MQTT entities were not ready yet (they arrived about
7 s later), so the data source was evaluated as cloud and the background startup
fetched the cloud payload, whose box mode was stale. Local data overwrote it only
when the DataSourceController started.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

import custom_components.oig_cloud as init_module
from custom_components.oig_cloud.const import DOMAIN
from custom_components.oig_cloud.core.data_source import (
    DATA_SOURCE_CLOUD_ONLY,
    DATA_SOURCE_LOCAL_ONLY,
    DataSourceState,
)


def _state(effective: str, local_available: bool, configured: str = DATA_SOURCE_LOCAL_ONLY):
    return DataSourceState(
        configured_mode=configured,
        effective_mode=effective,
        local_available=local_available,
        last_local_data=None,
        reason="test",
    )


class _Coordinator:
    def __init__(self) -> None:
        self.refreshes = 0

    async def async_refresh(self) -> None:
        self.refreshes += 1


class _SessionManager:
    def __init__(self) -> None:
        self.auth_calls = 0
        self.api = SimpleNamespace()

    async def _ensure_auth(self) -> None:
        self.auth_calls += 1


@pytest.fixture
def startup(monkeypatch):
    hass = SimpleNamespace(data={DOMAIN: {"entry1": {}}})
    entry = SimpleNamespace(entry_id="entry1", options={"data_source_mode": "local_only"})
    coordinator = _Coordinator()
    session_manager = _SessionManager()
    controller_starts: list[Any] = []
    sleeps: list[float] = []
    polls: list[DataSourceState] = []

    async def _fake_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    async def _noop(*_args: Any, **_kwargs: Any) -> None:
        return None

    async def _start_controller(*_args: Any, **_kwargs: Any) -> Any:
        controller_starts.append(True)
        return SimpleNamespace()

    monkeypatch.setattr(init_module.asyncio, "sleep", _fake_sleep)
    monkeypatch.setattr(init_module, "_ensure_live_data_enabled", _noop)
    monkeypatch.setattr(init_module, "_init_notification_manager", _noop)
    monkeypatch.setattr(init_module, "_init_balancing_manager", _noop)
    monkeypatch.setattr(init_module, "_start_data_source_controller", _start_controller)

    def set_states(initial: DataSourceState, sequence: list[DataSourceState]) -> None:
        monkeypatch.setattr(init_module, "get_data_source_state", lambda _h, _e: initial)

        def _init_state(_hass: Any, _entry: Any) -> DataSourceState:
            state = sequence.pop(0) if len(sequence) > 1 else sequence[0]
            polls.append(state)
            return state

        monkeypatch.setattr(init_module, "init_data_source_state", _init_state)

    async def run() -> None:
        await init_module._complete_entry_startup(
            hass, entry, coordinator, session_manager, None, None, False
        )

    return SimpleNamespace(
        hass=hass,
        entry=entry,
        coordinator=coordinator,
        session_manager=session_manager,
        controller_starts=controller_starts,
        sleeps=sleeps,
        polls=polls,
        set_states=set_states,
        run=run,
    )


@pytest.mark.asyncio
async def test_local_mode_waits_for_proxy_instead_of_fetching_stale_cloud(startup):
    cloud = _state(DATA_SOURCE_CLOUD_ONLY, False)
    local = _state(DATA_SOURCE_LOCAL_ONLY, True)
    # Proxy entities are not ready at startup and appear on the third check.
    startup.set_states(cloud, [cloud, cloud, local])

    await startup.run()

    assert startup.coordinator.refreshes == 0, "stale cloud payload was published"
    assert startup.session_manager.auth_calls == 0
    assert startup.controller_starts == [True]
    assert len(startup.polls) == 3


@pytest.mark.asyncio
async def test_local_mode_falls_back_to_cloud_when_proxy_never_appears(startup):
    startup.entry.options["startup_grace_seconds"] = 5
    cloud = _state(DATA_SOURCE_CLOUD_ONLY, False)
    startup.set_states(cloud, [cloud])

    await startup.run()

    assert startup.coordinator.refreshes == 1
    assert startup.session_manager.auth_calls == 1
    assert startup.controller_starts == [True]
    # Bounded by the startup grace option: one check per second, never longer.
    assert sum(startup.sleeps) <= 5


@pytest.mark.asyncio
async def test_cloud_only_mode_refreshes_immediately_without_waiting(startup):
    startup.entry.options["data_source_mode"] = "cloud_only"
    cloud = _state(DATA_SOURCE_CLOUD_ONLY, False, configured=DATA_SOURCE_CLOUD_ONLY)
    startup.set_states(cloud, [cloud])

    await startup.run()

    assert startup.coordinator.refreshes == 1
    assert startup.polls == []
    assert startup.sleeps == []


@pytest.mark.asyncio
async def test_local_mode_with_proxy_ready_at_startup_does_not_wait(startup):
    local = _state(DATA_SOURCE_LOCAL_ONLY, True)
    startup.set_states(local, [local])

    await startup.run()

    assert startup.coordinator.refreshes == 0
    assert startup.polls == []
    assert startup.sleeps == []
