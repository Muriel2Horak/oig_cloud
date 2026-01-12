"""Lifecycle helpers for battery forecast sensor."""

from __future__ import annotations

import asyncio
import copy
import json
import logging
from datetime import timedelta

from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from ..planning import auto_switch as auto_switch_module

_LOGGER = logging.getLogger(__name__)
DATE_FMT = "%Y-%m-%d"


async def async_added_to_hass(sensor) -> None:
    """Pri pridani do HA - restore persistent data."""
    await _ensure_storage_helpers(sensor)
    _maybe_start_auto_switch(sensor)
    await _restore_precomputed(sensor)

    last_state = await sensor.async_get_last_state()
    _restore_active_plan(sensor, last_state)
    _LOGGER.debug("Sensor initialized - storage plans will load on-demand via API")

    await _load_daily_archive(sensor)
    await _backfill_daily_archive(sensor)
    _restore_daily_plan_state(sensor, last_state)
    _LOGGER.debug("Historical data will load on-demand via API (not at startup)")

    _schedule_forecast_refresh(sensor)
    _subscribe_profiles(sensor)
    _schedule_initial_refresh(sensor)
    _schedule_aggregations(sensor)


async def _ensure_storage_helpers(sensor) -> None:
    if not sensor._plans_store and sensor._hass:
        sensor._plans_store = Store(
            sensor._hass,
            version=1,
            key=f"oig_cloud.battery_plans_{sensor._box_id}",
        )
        _LOGGER.info(
            " Retry: Initialized Storage Helper: oig_cloud.battery_plans_%s",
            sensor._box_id,
        )

    if not sensor._precomputed_store and sensor._hass:
        sensor._precomputed_store = Store(
            sensor._hass,
            version=1,
            key=f"oig_cloud.precomputed_data_{sensor._box_id}",
        )
        _LOGGER.info(
            " Retry: Initialized Precomputed Data Storage: oig_cloud.precomputed_data_%s",
            sensor._box_id,
        )


def _maybe_start_auto_switch(sensor) -> None:
    if not auto_switch_module.auto_mode_switch_enabled(sensor):
        return
    auto_switch_module.start_auto_switch_watchdog(sensor)
    if sensor._side_effects_enabled:
        sensor._create_task_threadsafe(
            auto_switch_module.update_auto_switch_schedule, sensor
        )


async def _restore_precomputed(sensor) -> None:
    if not sensor._precomputed_store:
        return
    try:
        precomputed = await sensor._precomputed_store.async_load() or {}
        timeline = precomputed.get("timeline_hybrid")
        last_update = precomputed.get("last_update")
        if isinstance(timeline, list) and timeline:
            sensor._timeline_data = timeline
            setattr(sensor, "_hybrid_timeline", copy.deepcopy(timeline))
            sensor._last_update = _parse_last_update(last_update)
            sensor._data_hash = sensor._calculate_data_hash(sensor._timeline_data)
            sensor.async_write_ha_state()
            _LOGGER.debug(
                "[BatteryForecast] Restored timeline from storage (%d points)",
                len(sensor._timeline_data),
            )
    except Exception as err:
        _LOGGER.debug("[BatteryForecast] Failed to restore precomputed data: %s", err)


def _parse_last_update(last_update: str | None):
    if isinstance(last_update, str) and last_update:
        try:
            parsed = dt_util.parse_datetime(last_update)
            return parsed or dt_util.dt.datetime.fromisoformat(last_update)
        except Exception:
            return dt_util.now()
    return dt_util.now()


def _restore_active_plan(sensor, last_state) -> None:
    if not last_state or not last_state.attributes:
        return
    if "active_plan_data" not in last_state.attributes:
        return
    try:
        plan_json = last_state.attributes.get("active_plan_data")
        if plan_json:
            sensor._active_charging_plan = json.loads(plan_json)
            sensor._plan_status = last_state.attributes.get("plan_status", "pending")
            if sensor._active_charging_plan:
                _LOGGER.info(
                    " Restored charging plan: requester=%s, status=%s",
                    sensor._active_charging_plan.get("requester", "unknown"),
                    sensor._plan_status,
                )
    except (json.decoder.JSONDecodeError, TypeError) as err:
        _LOGGER.warning("Failed to restore charging plan: %s", err)


async def _load_daily_archive(sensor) -> None:
    if not sensor._plans_store:
        return
    try:
        storage_data = await sensor._plans_store.async_load() or {}
        if "daily_archive" in storage_data:
            sensor._daily_plans_archive = storage_data["daily_archive"]
            _LOGGER.info(
                " Restored daily plans archive from storage: %s days",
                len(sensor._daily_plans_archive),
            )
        else:
            _LOGGER.info("No daily archive in storage - will backfill from history")
    except Exception as err:
        _LOGGER.warning("Failed to load daily plans archive from storage: %s", err)


async def _backfill_daily_archive(sensor) -> None:
    if not sensor._plans_store or len(sensor._daily_plans_archive) >= 3:
        return
    try:
        _LOGGER.info(" Backfilling daily plans archive from storage...")
        await sensor._backfill_daily_archive_from_storage()
    except Exception as err:
        _LOGGER.warning("Failed to backfill daily archive: %s", err)


def _restore_daily_plan_state(sensor, last_state) -> None:
    if not last_state or not last_state.attributes:
        return
    if "daily_plan_state" not in last_state.attributes:
        return
    try:
        daily_plan_json = last_state.attributes.get("daily_plan_state")
        if daily_plan_json:
            sensor._daily_plan_state = json.loads(daily_plan_json)
            actual_count = len(sensor._daily_plan_state.get("actual", []))
            _LOGGER.info(
                " Restored daily plan state: date=%s, actual=%s",
                sensor._daily_plan_state.get("date"),
                actual_count,
            )
    except (json.decoder.JSONDecodeError, TypeError) as err:
        _LOGGER.warning("Failed to restore daily plan state: %s", err)


def _schedule_forecast_refresh(sensor) -> None:
    from homeassistant.helpers.event import async_track_time_change

    async def _forecast_refresh_job(now):
        _LOGGER.info(" Forecast refresh triggered at %s", now.strftime("%H:%M"))
        try:
            await sensor.async_update()
        except Exception as err:
            _LOGGER.error("Forecast refresh failed: %s", err, exc_info=True)

    for minute in [0, 15, 30, 45]:
        async_track_time_change(
            sensor.hass,
            _forecast_refresh_job,
            minute=minute,
            second=30,
        )
    _LOGGER.info(" Scheduled forecast refresh every 15 minutes")


def _subscribe_profiles(sensor) -> None:
    from homeassistant.helpers.dispatcher import async_dispatcher_connect

    async def _on_profiles_updated():
        await asyncio.sleep(0)
        sensor._profiles_dirty = True
        sensor._log_rate_limited(
            "profiles_updated_deferred",
            "info",
            " profiles_updated received - deferring forecast refresh to next 15-min tick",
            cooldown_s=300.0,
        )

    signal_name = f"oig_cloud_{sensor._box_id}_profiles_updated"
    _LOGGER.debug(" Subscribing to signal: %s", signal_name)
    async_dispatcher_connect(sensor.hass, signal_name, _on_profiles_updated)


def _schedule_initial_refresh(sensor) -> None:
    from homeassistant.helpers.dispatcher import async_dispatcher_connect

    async def _delayed_initial_refresh():
        _LOGGER.info(" Waiting for AdaptiveLoadProfiles to complete (max 60s)...")
        profiles_ready = False

        async def _mark_ready():
            nonlocal profiles_ready
            await asyncio.sleep(0)
            profiles_ready = True

        temp_unsub = async_dispatcher_connect(
            sensor.hass, f"oig_cloud_{sensor._box_id}_profiles_updated", _mark_ready
        )

        try:
            for _ in range(60):
                if profiles_ready:
                    _LOGGER.info(" Profiles ready - starting initial forecast")
                    break
                await asyncio.sleep(1)
            else:
                _LOGGER.info("Profiles not ready after 60s - starting forecast anyway")

            await sensor.async_update()
            _LOGGER.info(" Initial forecast completed")
        except Exception as err:
            _LOGGER.error("Initial forecast failed: %s", err, exc_info=True)
        finally:
            temp_unsub()

    sensor.hass.async_create_task(_delayed_initial_refresh())


def _schedule_aggregations(sensor) -> None:
    from homeassistant.helpers.event import async_track_time_change

    async def _daily_aggregation_job(now):
        yesterday = (now.date() - timedelta(days=1)).strftime(DATE_FMT)
        _LOGGER.info(" Daily aggregation job triggered for %s", yesterday)
        await sensor._aggregate_daily(yesterday)

    async def _weekly_aggregation_job(now):
        if now.weekday() != 6:
            return
        year, week_num, _ = now.isocalendar()
        week_str = f"{year}-W{week_num:02d}"
        end_date = now.date().strftime(DATE_FMT)
        start_date = (now.date() - timedelta(days=6)).strftime(DATE_FMT)
        _LOGGER.info(" Weekly aggregation job triggered for %s", week_str)
        await sensor._aggregate_weekly(week_str, start_date, end_date)

    async_track_time_change(
        sensor.hass, _daily_aggregation_job, hour=0, minute=5, second=0
    )
    _LOGGER.debug(" Scheduled daily aggregation at 00:05")

    async_track_time_change(
        sensor.hass, _weekly_aggregation_job, hour=23, minute=55, second=0
    )
    _LOGGER.debug(" Scheduled weekly aggregation at Sunday 23:55")
