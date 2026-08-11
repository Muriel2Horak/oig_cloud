from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
)


PRAGUE = ZoneInfo("Europe/Prague")


class Coordinator:
    forced_box_id = "wall-clock-ha"

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class Entry:
    entry_id = "entry-wall-clock-ha"

    def __init__(self, mode="daily_optimized"):
        self.options = {
            "solar_forecast_mode": mode,
            "solar_forecast_provider": "forecast_solar",
            "solar_forecast_string1_enabled": True,
            "solar_forecast_string1_kwp": 5.0,
            "solar_forecast_string2_enabled": False,
            "solar_forecast_string2_kwp": 0.0,
        }


def make_sensor(hass, *, sensor_type="solar_forecast"):
    sensor = OigCloudSolarForecastSensor(Coordinator(), sensor_type, Entry(), {})
    sensor.hass = hass
    return sensor


@pytest.mark.asyncio
async def test_real_ha_time_helper_setup_1042_fires_local_noon_without_catchup(
    hass, freezer
):
    await hass.config.async_set_time_zone("Europe/Prague")
    freezer.move_to("2026-08-11 08:42:00+00:00")
    sensor = make_sensor(hass)
    dispatched = []

    async def record(scheduled_local):
        dispatched.append(scheduled_local)

    sensor._async_start_scheduled_occurrence = record
    sensor._register_refresh_schedule()
    try:
        async_fire_time_changed(hass, datetime(2026, 8, 11, 10, 43, tzinfo=PRAGUE))
        await hass.async_block_till_done()
        assert dispatched == []

        async_fire_time_changed(hass, datetime(2026, 8, 11, 12, 0, tzinfo=PRAGUE))
        await hass.async_block_till_done()
        assert dispatched == [datetime(2026, 8, 11, 12, 0, tzinfo=PRAGUE)]
    finally:
        if sensor._update_interval_remover is not None:
            sensor._update_interval_remover()
        await hass.config.async_set_time_zone("UTC")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "target",
    [
        datetime(2026, 3, 29, 6, 0, tzinfo=PRAGUE),
        datetime(2026, 10, 25, 6, 0, tzinfo=PRAGUE),
    ],
)
async def test_real_ha_time_helper_preserves_prague_wall_clock_across_dst(
    hass, freezer, target
):
    await hass.config.async_set_time_zone("Europe/Prague")
    freezer.move_to(target.astimezone(timezone.utc) - timedelta(minutes=1))
    sensor = make_sensor(hass)
    dispatched = []

    async def record(scheduled_local):
        dispatched.append(scheduled_local)

    sensor._async_start_scheduled_occurrence = record
    sensor._register_refresh_schedule()
    try:
        async_fire_time_changed(hass, target)
        await hass.async_block_till_done()
        assert dispatched == [target]
    finally:
        if sensor._update_interval_remover is not None:
            sensor._update_interval_remover()
        await hass.config.async_set_time_zone("UTC")


@pytest.mark.asyncio
async def test_wall_clock_jitter_maps_to_one_canonical_occurrence(hass):
    await hass.config.async_set_time_zone("Europe/Prague")
    sensor = make_sensor(hass)
    attempts = []

    async def run_attempt(**kwargs):
        attempts.append(kwargs)

    sensor._async_run_scheduled_attempt = run_attempt
    try:
        await sensor._wall_clock_update(
            datetime(2026, 8, 11, 12, 0, 1, 100, tzinfo=PRAGUE)
        )
        await sensor._wall_clock_update(
            datetime(2026, 8, 11, 12, 0, 59, 900, tzinfo=PRAGUE)
        )

        assert len(attempts) == 1
        assert attempts[0]["scheduled_local"] == datetime(
            2026, 8, 11, 12, 0, tzinfo=PRAGUE
        )
    finally:
        await hass.config.async_set_time_zone("UTC")


@pytest.mark.asyncio
async def test_real_ha_time_helper_secondary_sensor_has_no_subscription(hass, freezer):
    await hass.config.async_set_time_zone("Europe/Prague")
    freezer.move_to("2026-08-11 08:42:00+00:00")
    sensor = make_sensor(hass, sensor_type="solar_forecast_string1")
    dispatched = []

    async def record(scheduled_local):
        dispatched.append(scheduled_local)

    sensor._async_start_scheduled_occurrence = record
    sensor._register_refresh_schedule()
    try:
        async_fire_time_changed(hass, datetime(2026, 8, 11, 12, 0, tzinfo=PRAGUE))
        await hass.async_block_till_done()
        assert dispatched == []
        assert sensor._update_interval_remover is None
    finally:
        await hass.config.async_set_time_zone("UTC")
