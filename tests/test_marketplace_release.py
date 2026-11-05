"""Release Marketplace records of other repositories that claim our domain.

HA 2026.11 replaced HACS with the built-in Marketplace and took over its
records. Most users once installed psimsa/oig_cloud and later switched to
Muriel2Horak/oig_cloud, so both records are marked installed for the domain
oig_cloud. The Marketplace then refuses every install or update with "The
oig_cloud directory belongs to psimsa/oig_cloud", and uninstalling the old
record would delete the shared folder. The running code is ours, so the other
record only has to stop claiming the folder; nothing on disk is touched.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.oig_cloud.shared import marketplace_release as mr


def _repo(full_name: str, domain: str = "oig_cloud", category: str = "integration"):
    return SimpleNamespace(
        data=SimpleNamespace(
            id="658267172",
            full_name=full_name,
            domain=domain,
            category=category,
            installed=True,
            installed_version="v2.0.6-pre.12",
            installed_commit="bfecefb",
        ),
        installing=False,
        async_remove_entity_device=AsyncMock(),
        async_dispatch_changed=MagicMock(),
    )


def _hass(*repos):
    manager = SimpleNamespace(
        repositories=SimpleNamespace(list_installed=list(repos)),
        data=SimpleNamespace(async_write=AsyncMock()),
    )
    entry = SimpleNamespace(runtime_data=manager)
    hass = SimpleNamespace(
        config_entries=SimpleNamespace(async_entries=lambda domain: [entry] if domain == "marketplace" else []),
    )
    return hass, manager


@pytest.mark.asyncio
async def test_releases_the_old_psimsa_record() -> None:
    psimsa = _repo("psimsa/oig_cloud")
    hass, manager = _hass(psimsa)

    released = await mr.async_release_foreign_records(hass)

    assert released == ["psimsa/oig_cloud"]
    assert psimsa.data.installed is False
    assert psimsa.data.installed_version is None
    assert psimsa.data.installed_commit is None
    psimsa.async_remove_entity_device.assert_awaited_once()
    psimsa.async_dispatch_changed.assert_called_once_with("uninstall")
    manager.data.async_write.assert_awaited_once()


@pytest.mark.asyncio
async def test_keeps_our_own_record() -> None:
    ours = _repo("Muriel2Horak/oig_cloud")
    hass, manager = _hass(ours)

    assert await mr.async_release_foreign_records(hass) == []
    assert ours.data.installed is True
    manager.data.async_write.assert_not_awaited()


@pytest.mark.asyncio
async def test_leaves_other_integrations_alone() -> None:
    other = _repo("someone/grocy", domain="grocy")
    dashboard = _repo("someone/oig_card", category="plugin")
    hass, _ = _hass(other, dashboard)

    assert await mr.async_release_foreign_records(hass) == []
    assert other.data.installed is True
    assert dashboard.data.installed is True


@pytest.mark.asyncio
async def test_skips_a_record_that_is_installing() -> None:
    psimsa = _repo("psimsa/oig_cloud")
    psimsa.installing = True
    hass, _ = _hass(psimsa)

    assert await mr.async_release_foreign_records(hass) == []
    assert psimsa.data.installed is True


@pytest.mark.asyncio
async def test_without_marketplace_does_nothing() -> None:
    hass = SimpleNamespace(config_entries=SimpleNamespace(async_entries=lambda _domain: []))

    assert await mr.async_release_foreign_records(hass) == []


@pytest.mark.asyncio
async def test_an_unexpected_marketplace_shape_never_raises() -> None:
    entry = SimpleNamespace(runtime_data=SimpleNamespace(repositories=None))
    hass = SimpleNamespace(config_entries=SimpleNamespace(async_entries=lambda _domain: [entry]))

    assert await mr.async_release_foreign_records(hass) == []


@pytest.mark.asyncio
async def test_a_failing_write_never_raises() -> None:
    psimsa = _repo("psimsa/oig_cloud")
    hass, manager = _hass(psimsa)
    manager.data.async_write = AsyncMock(side_effect=RuntimeError("disk full"))

    assert await mr.async_release_foreign_records(hass) == ["psimsa/oig_cloud"]


def test_schedules_once_after_start(monkeypatch) -> None:
    started = []
    hass = SimpleNamespace(
        data={},
        is_running=False,
        bus=SimpleNamespace(async_listen_once=lambda event, cb: started.append((event, cb))),
    )

    mr.async_schedule_release(hass)
    mr.async_schedule_release(hass)

    assert len(started) == 1
    assert started[0][0] == "homeassistant_started"
    # A plain function listener runs in an executor thread, where the task it
    # starts is destroyed while pending (seen live on HA 2026.11).
    assert getattr(started[0][1], "_hass_callback", False) is True


def test_runs_now_when_already_running(monkeypatch) -> None:
    calls = []
    monkeypatch.setattr(mr, "start_background", lambda hass, coro, name: (calls.append(name), coro.close()))
    hass = SimpleNamespace(data={}, is_running=True, bus=SimpleNamespace(async_listen_once=None))

    mr.async_schedule_release(hass)

    assert calls == ["oig_cloud_marketplace_release"]
