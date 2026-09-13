"""Exercise automatic switching through real HA timers, state, and services."""

from __future__ import annotations

from datetime import datetime, timedelta
from functools import partial
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pytest
from homeassistant.core import Context, ServiceCall
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.oig_cloud.battery_forecast.planning import auto_switch
from custom_components.oig_cloud.battery_forecast.task_utils import create_task_threadsafe
from custom_components.oig_cloud.const import CONF_AUTO_MODE_SWITCH, DOMAIN


@pytest.mark.asyncio
async def test_real_ha_timers_retry_guarded_charge_and_preserve_confirmed_ups_dwell(
    hass, freezer
):
    """Guard expiry recovers a valid charge window and protects delayed confirmation."""
    await hass.config.async_set_time_zone("Europe/Prague")
    start = datetime(2026, 9, 13, 12, 0, tzinfo=ZoneInfo("Europe/Prague"))
    entity_id = "sensor.oig_123_box_prms_mode"
    calls: list[tuple[datetime, str, bool]] = []

    async def record_hardware_request(call: ServiceCall) -> None:
        # This local service is the only hardware boundary; nothing contacts a box.
        calls.append((dt_util.now(), call.data["mode"], call.data["acknowledgement"]))

    async def advance_to(moment: datetime) -> None:
        freezer.move_to(moment)
        async_fire_time_changed(hass, moment)
        await hass.async_block_till_done(wait_background_tasks=True)

    freezer.move_to(start - timedelta(minutes=25))
    hass.states.async_set(entity_id, "HOME I", context=Context(user_id="manual-user"))
    await hass.async_block_till_done()
    freezer.move_to(start)
    hass.services.async_register(DOMAIN, "set_box_mode", record_hardware_request)

    sensor = SimpleNamespace(
        _hass=hass,
        _config_entry=SimpleNamespace(
            entry_id="auto-switch-acceptance",
            options={CONF_AUTO_MODE_SWITCH: True},
            data={},
        ),
        _box_id="123",
        _side_effects_enabled=True,
        _last_auto_switch_request=None,
        _auto_switch_handles=[],
        _auto_switch_retry_unsub=None,
        _auto_switch_watchdog_unsub=None,
        _auto_switch_watchdog_interval=timedelta(seconds=30),
        _auto_switch_ready_at=None,
        _timeline_data=[
            {"time": start.isoformat(), "mode_name": "HOME UPS"},
            {
                "time": (start + timedelta(minutes=30)).isoformat(),
                "mode_name": "HOME I",
            },
        ],
    )
    sensor._create_task_threadsafe = partial(create_task_threadsafe, sensor)

    try:
        await auto_switch.update_auto_switch_schedule(sensor)
        await hass.async_block_till_done(wait_background_tasks=True)
        assert calls == []
        assert sensor._auto_switch_retry_unsub is not None

        # Exercise the periodic watchdog before the five-minute guard expires.
        await advance_to(start + timedelta(seconds=30))
        await advance_to(start + timedelta(minutes=4, seconds=59))
        assert calls == []

        # The guard-expiry timer dispatches the real refresh, while UPS is valid.
        requested_at = start + timedelta(minutes=5)
        await advance_to(requested_at)
        assert calls == [(requested_at, "Home UPS", True)]
        assert sensor._auto_switch_retry_unsub is None
        assert hass.states.get(entity_id).state == "HOME I"

        # The box reports its physical mode 75 seconds after the service request.
        confirmed_at = requested_at + timedelta(seconds=75)
        freezer.move_to(confirmed_at)
        hass.states.async_set(entity_id, "HOME UPS")
        async_fire_time_changed(hass, confirmed_at)
        await hass.async_block_till_done(wait_background_tasks=True)
        assert hass.states.get(entity_id).last_changed == confirmed_at

        # The scheduled exit at 12:30 cannot shorten the actual UPS dwell.
        await advance_to(start + timedelta(minutes=29, seconds=59))
        await advance_to(start + timedelta(minutes=30))
        assert calls == [(requested_at, "Home UPS", True)]
        assert sensor._auto_switch_retry_unsub is not None

        eligible_exit = confirmed_at + timedelta(minutes=30)
        await advance_to(eligible_exit - timedelta(seconds=1))
        assert calls == [(requested_at, "Home UPS", True)]
        await advance_to(eligible_exit)
        assert calls == [
            (requested_at, "Home UPS", True),
            (eligible_exit, "Home 1", True),
        ]
        assert sensor._auto_switch_retry_unsub is None
    finally:
        auto_switch.cancel_auto_switch_schedule(sensor)
        auto_switch.stop_auto_switch_watchdog(sensor)
        await hass.async_block_till_done(wait_background_tasks=True)
        hass.services.async_remove(DOMAIN, "set_box_mode")
        hass.states.async_remove(entity_id)
        await hass.config.async_set_time_zone("UTC")
