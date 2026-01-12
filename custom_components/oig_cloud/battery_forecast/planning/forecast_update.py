"""Forecast update routine extracted from ha_sensor."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, List, Optional

from homeassistant.util import dt as dt_util

from ...const import DOMAIN
from ..config import HybridConfig, SimulatorConfig
from ..data.adaptive_consumption import AdaptiveConsumptionHelper
from ..data.input import get_load_avg_for_timestamp, get_solar_for_timestamp
from ..strategy import HybridStrategy
from ..timeline.planner import (
    add_decision_reasons_to_timeline,
    attach_planner_reasons,
    build_planner_timeline,
)
from ..types import CBB_MODE_NAMES
from . import auto_switch as auto_switch_module
from . import mode_guard as mode_guard_module

_LOGGER = logging.getLogger(__name__)
ISO_TZ_OFFSET = "+00:00"
MODE_GUARD_MINUTES = 60


def _bucket_start(now_aware: datetime) -> datetime:
    bucket_minute = (now_aware.minute // 15) * 15
    return now_aware.replace(minute=bucket_minute, second=0, microsecond=0)


def _should_skip_bucket(sensor: Any, bucket_start: datetime) -> bool:
    if sensor._forecast_in_progress:
        sensor._log_rate_limited(
            "forecast_in_progress",
            "debug",
            "Forecast computation already in progress - skipping",
            cooldown_s=60.0,
        )
        return True
    if sensor._last_forecast_bucket == bucket_start:
        return True
    return False


def _ensure_capacity(sensor: Any) -> tuple[float, float, float] | None:
    current_capacity = sensor._get_current_battery_capacity()
    max_capacity = sensor._get_max_battery_capacity()
    min_capacity = sensor._get_min_battery_capacity()
    if current_capacity is None or max_capacity is None or min_capacity is None:
        sensor._log_rate_limited(
            "forecast_missing_capacity",
            "debug",
            "Forecast prerequisites not ready (current=%s max=%s min=%s); retrying shortly",
            current_capacity,
            max_capacity,
            min_capacity,
            cooldown_s=120.0,
        )
        sensor._schedule_forecast_retry(10.0)
        return None
    return current_capacity, max_capacity, min_capacity


def _filter_price_timeline(
    prices: list[dict[str, Any]], current_interval_naive: datetime, label: str, sensor: Any
) -> list[dict[str, Any]]:
    filtered = [
        item
        for item in prices
        if datetime.fromisoformat(item["time"]) >= current_interval_naive
    ]
    if len(filtered) < len(prices):
        sensor._log_rate_limited(
            f"forecast_{label}_filtered",
            "debug",
            "Filtered %s prices: %s -> %s (removed %s past intervals)",
            label,
            len(prices),
            len(filtered),
            len(prices) - len(filtered),
            cooldown_s=600.0,
        )
    return filtered


async def _fetch_prices(
    sensor: Any, current_interval_naive: datetime
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    sensor._log_rate_limited(
        "forecast_spot_fetch",
        "debug",
        "Calling _get_spot_price_timeline()",
        cooldown_s=600.0,
    )
    spot_prices = await sensor._get_spot_price_timeline()
    sensor._log_rate_limited(
        "forecast_spot_fetch_done",
        "debug",
        "_get_spot_price_timeline() returned %s prices",
        len(spot_prices),
        cooldown_s=600.0,
    )
    sensor._log_rate_limited(
        "forecast_spot_filter",
        "debug",
        "Filtering timeline from current interval: %s",
        current_interval_naive.isoformat(),
        cooldown_s=600.0,
    )
    spot_prices = _filter_price_timeline(spot_prices, current_interval_naive, "spot", sensor)

    sensor._log_rate_limited(
        "forecast_export_fetch",
        "debug",
        "Calling _get_export_price_timeline()",
        cooldown_s=600.0,
    )
    export_prices = await sensor._get_export_price_timeline()
    sensor._log_rate_limited(
        "forecast_export_fetch_done",
        "debug",
        "_get_export_price_timeline() returned %s prices",
        len(export_prices),
        cooldown_s=600.0,
    )
    export_prices = _filter_price_timeline(
        export_prices, current_interval_naive, "export", sensor
    )
    return spot_prices, export_prices


async def _build_load_forecast(
    sensor: Any,
    spot_prices: list[dict[str, Any]],
    adaptive_helper: AdaptiveConsumptionHelper,
    adaptive_profiles: dict[str, Any] | None,
    load_avg_sensors: Any,
) -> list[float]:
    load_forecast: list[float] = []
    today = dt_util.now().date()
    for sp in spot_prices:
        _append_load_for_price(
            sensor,
            sp,
            adaptive_profiles=adaptive_profiles,
            load_avg_sensors=load_avg_sensors,
            today=today,
            load_forecast=load_forecast,
        )

    await _maybe_apply_consumption_boost(
        adaptive_helper, adaptive_profiles, load_forecast
    )
    return load_forecast


def _append_load_for_price(
    sensor: Any,
    spot_price: dict[str, Any],
    *,
    adaptive_profiles: dict[str, Any] | None,
    load_avg_sensors: Any,
    today: datetime.date,
    load_forecast: list[float],
) -> None:
    try:
        timestamp = datetime.fromisoformat(spot_price["time"])
        if timestamp.tzinfo is None:
            timestamp = dt_util.as_local(timestamp)

        load_kwh = _resolve_load_kwh(
            sensor,
            timestamp,
            adaptive_profiles,
            load_avg_sensors,
            today=today,
        )

        load_forecast.append(load_kwh)
    except Exception as exc:  # pragma: no cover
        _LOGGER.warning(
            "Failed to get load for %s: %s", spot_price.get("time"), exc
        )  # pragma: no cover
        load_forecast.append(0.125)  # pragma: no cover


async def _maybe_apply_consumption_boost(
    adaptive_helper: AdaptiveConsumptionHelper,
    adaptive_profiles: dict[str, Any] | None,
    load_forecast: list[float],
) -> None:
    if not adaptive_profiles:
        return
    recent_ratio = await adaptive_helper.calculate_recent_consumption_ratio(
        adaptive_profiles
    )
    if recent_ratio and recent_ratio > 1.1:
        adaptive_helper.apply_consumption_boost_to_forecast(load_forecast, recent_ratio)


def _resolve_load_kwh(
    sensor: Any,
    timestamp: datetime,
    adaptive_profiles: dict[str, Any] | None,
    load_avg_sensors: Any,
    *,
    today: datetime.date,
) -> float:
    if not adaptive_profiles:
        return get_load_avg_for_timestamp(
            timestamp,
            load_avg_sensors,
            state=sensor,
        )

    profile = _select_adaptive_profile(adaptive_profiles, timestamp, today)
    hourly_kwh = _hourly_kwh_from_profile(sensor, profile, timestamp)
    return hourly_kwh / 4.0


def _select_adaptive_profile(
    adaptive_profiles: dict[str, Any],
    timestamp: datetime,
    today: datetime.date,
) -> dict[str, Any]:
    if timestamp.date() == today:
        return adaptive_profiles["today_profile"]
    return adaptive_profiles.get("tomorrow_profile", adaptive_profiles["today_profile"])


def _hourly_kwh_from_profile(
    sensor: Any, profile: dict[str, Any], timestamp: datetime
) -> float:
    hour = timestamp.hour
    start_hour = profile.get("start_hour", 0)
    index = hour - start_hour
    hourly_consumption = profile.get("hourly_consumption", []) or []
    if 0 <= index < len(hourly_consumption):
        return hourly_consumption[index]

    sensor._log_rate_limited(
        "adaptive_profile_oob",
        "debug",
        "Adaptive profile hour out of range: hour=%s start=%s len=%s (using avg)",
        hour,
        start_hour,
        len(hourly_consumption),
        cooldown_s=900.0,
    )
    return profile.get("avg_kwh_h", 0.5)


def _build_solar_kwh_list(
    sensor: Any, spot_prices: list[dict[str, Any]], solar_forecast: Any
) -> list[float]:
    solar_kwh_list: List[float] = []
    for sp in spot_prices:
        try:
            ts = datetime.fromisoformat(sp.get("time", ""))
            if ts.tzinfo is None:
                ts = dt_util.as_local(ts)
            solar_kwh_list.append(
                get_solar_for_timestamp(
                    ts,
                    solar_forecast,
                    log_rate_limited=sensor._log_rate_limited,
                )
            )
        except Exception:
            solar_kwh_list.append(0.0)
    return solar_kwh_list


def _get_active_balancing_plan(sensor: Any) -> Any:
    try:
        entry_id = sensor._config_entry.entry_id if sensor._config_entry else None
        if (
            entry_id
            and DOMAIN in sensor._hass.data
            and entry_id in sensor._hass.data[DOMAIN]
        ):
            balancing_manager = sensor._hass.data[DOMAIN][entry_id].get(
                "balancing_manager"
            )
            if balancing_manager:
                return balancing_manager.get_active_plan()
    except Exception as err:
        _LOGGER.debug("Could not load BalancingManager plan: %s", err)
    return None


def _build_export_price_values(
    spot_prices: list[dict[str, Any]],
    export_prices: list[dict[str, Any]],
) -> list[float]:
    export_price_values: List[float] = []
    for i in range(len(spot_prices)):
        if i < len(export_prices):
            export_price_values.append(
                float(export_prices[i].get("price", 0.0) or 0.0)
            )
        else:
            export_price_values.append(0.0)
    return export_price_values


def _run_planner(
    sensor: Any,
    spot_prices: list[dict[str, Any]],
    export_prices: list[dict[str, Any]],
    load_forecast: list[float],
    solar_kwh_list: list[float],
    current_capacity: float,
    max_capacity: float,
) -> tuple[list[dict[str, Any]], dict[str, Any] | None, list[dict[str, Any]]]:
    try:
        active_balancing_plan = _get_active_balancing_plan(sensor)
        max_intervals = 36 * 4
        if len(spot_prices) > max_intervals:
            spot_prices = spot_prices[:max_intervals]
            export_prices = export_prices[:max_intervals]
            load_forecast = load_forecast[:max_intervals]
            solar_kwh_list = solar_kwh_list[:max_intervals]

        balancing_plan = sensor._build_strategy_balancing_plan(
            spot_prices, active_balancing_plan
        )
        opts = sensor._config_entry.options if sensor._config_entry else {}
        max_ups_price_czk = float(opts.get("max_ups_price_czk", 10.0))
        efficiency = float(sensor._get_battery_efficiency())
        home_charge_rate_kw = float(opts.get("home_charge_rate", 2.8))
        sim_config = SimulatorConfig(
            max_capacity_kwh=max_capacity,
            min_capacity_kwh=max_capacity * 0.20,
            charge_rate_kw=home_charge_rate_kw,
            dc_dc_efficiency=efficiency,
            dc_ac_efficiency=efficiency,
            ac_dc_efficiency=efficiency,
        )
        disable_planning_min_guard = bool(
            opts.get("disable_planning_min_guard", False)
        )
        planning_min_percent = float(opts.get("min_capacity_percent", 33.0))
        if disable_planning_min_guard:
            planning_min_percent = 0.0
        hybrid_config = HybridConfig(
            planning_min_percent=planning_min_percent,
            target_percent=float(opts.get("target_capacity_percent", 80.0)),
            max_ups_price_czk=max_ups_price_czk,
        )
        export_price_values = _build_export_price_values(spot_prices, export_prices)

        strategy = HybridStrategy(hybrid_config, sim_config)
        result = strategy.optimize(
            initial_battery_kwh=current_capacity,
            spot_prices=spot_prices,
            solar_forecast=solar_kwh_list,
            consumption_forecast=load_forecast,
            balancing_plan=balancing_plan,
            export_prices=export_price_values,
        )

        hw_min_kwh = max_capacity * 0.20
        planning_min_kwh = hybrid_config.planning_min_kwh(max_capacity)
        lock_until, lock_modes = mode_guard_module.build_plan_lock(
            now=dt_util.now(),
            spot_prices=spot_prices,
            modes=result.modes,
            mode_guard_minutes=MODE_GUARD_MINUTES,
            plan_lock_until=sensor._plan_lock_until,
            plan_lock_modes=sensor._plan_lock_modes,
        )
        sensor._plan_lock_until = lock_until
        sensor._plan_lock_modes = lock_modes
        guarded_modes, guard_overrides, guard_until = (
            mode_guard_module.apply_mode_guard(
                modes=result.modes,
                spot_prices=spot_prices,
                solar_kwh_list=solar_kwh_list,
                load_forecast=load_forecast,
                current_capacity=current_capacity,
                max_capacity=max_capacity,
                hw_min_capacity=hw_min_kwh,
                efficiency=efficiency,
                home_charge_rate_kw=home_charge_rate_kw,
                planning_min_kwh=planning_min_kwh,
                lock_modes=lock_modes,
                guard_until=lock_until,
                log_rate_limited=sensor._log_rate_limited,
            )
        )
        timeline = build_planner_timeline(
            modes=guarded_modes,
            spot_prices=spot_prices,
            export_prices=export_prices,
            solar_forecast=sensor._get_solar_forecast(),
            load_forecast=load_forecast,
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            hw_min_capacity=hw_min_kwh,
            efficiency=efficiency,
            home_charge_rate_kw=home_charge_rate_kw,
            log_rate_limited=sensor._log_rate_limited,
        )
        attach_planner_reasons(timeline, result.decisions)
        add_decision_reasons_to_timeline(
            timeline,
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            min_capacity=planning_min_kwh,
            efficiency=float(efficiency),
        )
        mode_guard_module.apply_guard_reasons_to_timeline(
            timeline,
            guard_overrides,
            guard_until,
            None,
            mode_names=CBB_MODE_NAMES,
        )
        mode_recommendations = sensor._create_mode_recommendations(timeline, hours_ahead=48)
        mode_result = {
            "optimal_timeline": timeline,
            "optimal_modes": guarded_modes,
            "planner": "planner",
            "planning_min_kwh": planning_min_kwh,
            "target_kwh": hybrid_config.target_kwh(max_capacity),
            "infeasible": result.infeasible,
            "infeasible_reason": result.infeasible_reason,
        }
        return timeline, mode_result, mode_recommendations
    except Exception as err:
        _LOGGER.error("Planner failed: %s", err, exc_info=True)
        return [], None, []


def _update_timeline_hash(sensor: Any, timeline: list[dict[str, Any]]) -> None:
    new_hash = sensor._calculate_data_hash(timeline)
    if new_hash != sensor._data_hash:
        _LOGGER.debug(
            "Timeline data changed: %s -> %s",
            sensor._data_hash[:8] if sensor._data_hash else "none",
            new_hash[:8],
        )
        sensor._data_hash = new_hash
    else:
        _LOGGER.debug("Timeline data unchanged (same hash)")


def _save_forecast_to_coordinator(sensor: Any) -> None:
    if hasattr(sensor.coordinator, "battery_forecast_data"):
        sensor.coordinator.battery_forecast_data = {
            "timeline_data": sensor._timeline_data,
            "calculation_time": sensor._last_update.isoformat(),
            "data_source": "simplified_calculation",
            "current_battery_kwh": (
                sensor._timeline_data[0].get("battery_capacity_kwh", 0)
                if sensor._timeline_data
                else 0
            ),
            "mode_recommendations": sensor._mode_recommendations or [],
        }
        _LOGGER.info(
            " Battery forecast data saved to coordinator - grid_charging_planned will update"
        )


def _dispatch_forecast_updated(sensor: Any) -> None:
    from homeassistant.helpers.dispatcher import async_dispatcher_send

    if not sensor.hass:
        _LOGGER.debug("Forecast updated signal skipped (sensor not in HA yet)")
        return

    signal_name = f"oig_cloud_{sensor._box_id}_forecast_updated"
    _LOGGER.debug(" Sending signal: %s", signal_name)
    async_dispatcher_send(sensor.hass, signal_name)


def _resolve_target_and_soc(
    sensor: Any,
    current_capacity: float,
    max_capacity: float,
    min_capacity: float,
) -> tuple[float, Optional[float]]:
    target_capacity = sensor._get_target_battery_capacity()
    current_soc_percent = sensor._get_current_battery_soc_percent()

    if target_capacity is None:
        target_capacity = max_capacity
    if current_soc_percent is None and max_capacity > 0:
        current_soc_percent = (current_capacity / max_capacity) * 100.0

    sensor._log_rate_limited(
        "battery_state_summary",
        "debug",
        "Battery state: current=%.2f kWh (%.1f%%), total=%.2f kWh, min=%.2f kWh, target=%.2f kWh",
        current_capacity,
        float(current_soc_percent or 0.0),
        max_capacity,
        min_capacity,
        target_capacity,
        cooldown_s=600.0,
    )
    return target_capacity, current_soc_percent


def _update_consumption_summary(
    sensor: Any, adaptive_profiles: Any, adaptive_helper: AdaptiveConsumptionHelper
) -> None:
    if adaptive_profiles and isinstance(adaptive_profiles, dict):
        sensor._consumption_summary = adaptive_helper.calculate_consumption_summary(
            adaptive_profiles
        )
    else:
        sensor._consumption_summary = {}


def _schedule_auto_switch(sensor: Any) -> None:
    if sensor._side_effects_enabled:
        sensor._create_task_threadsafe(
            auto_switch_module.update_auto_switch_schedule, sensor
        )


def _maybe_write_state(sensor: Any) -> None:
    if not sensor.hass:
        _LOGGER.debug("Sensor not yet added to HA, skipping state write")
        return
    sensor._log_rate_limited(
        "write_state_consumption_summary",
        "debug",
        " Writing HA state with consumption_summary: %s",
        sensor._consumption_summary,
        cooldown_s=900.0,
    )
    sensor.async_write_ha_state()


def _schedule_precompute(sensor: Any) -> None:
    if not sensor.hass:
        _LOGGER.debug("Precompute skipped (sensor not in HA yet)")
        return
    hash_changed = sensor._data_hash != sensor._last_precompute_hash
    sensor._schedule_precompute(
        force=sensor._last_precompute_at is None or hash_changed
    )


def _apply_planner_results(
    sensor: Any,
    timeline: list[dict[str, Any]],
    mode_result: Any,
    recommendations: Any,
) -> None:
    sensor._timeline_data = timeline
    sensor._hybrid_timeline = timeline
    sensor._mode_optimization_result = mode_result
    sensor._mode_recommendations = recommendations
    sensor._baseline_timeline = []
    _update_timeline_hash(sensor, sensor._timeline_data)
    sensor._last_update = datetime.now()
    _LOGGER.debug(
        "Battery forecast updated: %s timeline points",
        len(sensor._timeline_data),
    )


def _maybe_mark_first_update(sensor: Any) -> None:
    if sensor._first_update:
        sensor._first_update = False


def _maybe_update_history_stub() -> None:
    # Placeholder for historical updates (kept for future re-enable).
    return


def _post_update_housekeeping(
    sensor: Any, adaptive_profiles: Any, adaptive_helper: AdaptiveConsumptionHelper
) -> None:
    _update_consumption_summary(sensor, adaptive_profiles, adaptive_helper)
    _maybe_mark_first_update(sensor)
    _save_forecast_to_coordinator(sensor)
    _schedule_auto_switch(sensor)

    now = dt_util.now()
    if now.minute in [0, 15, 30, 45]:
        _maybe_update_history_stub()

    _maybe_write_state(sensor)
    _schedule_precompute(sensor)


async def _prepare_forecast_inputs(
    sensor: Any, bucket_start: datetime
) -> Optional[
    tuple[
        float,
        float,
        float,
        list[dict[str, Any]],
        list[dict[str, Any]],
        Any,
        Any,
        AdaptiveConsumptionHelper,
        Any,
        list[float],
    ]
]:
    capacity = _ensure_capacity(sensor)
    if not capacity:
        return None
    current_capacity, max_capacity, min_capacity = capacity

    _LOGGER.debug(
        "Battery capacities: current=%.2f kWh, max=%.2f kWh, min=%.2f kWh",
        current_capacity,
        max_capacity,
        min_capacity,
    )

    current_interval_naive = bucket_start.replace(tzinfo=None)
    spot_prices, export_prices = await _fetch_prices(sensor, current_interval_naive)

    solar_forecast = sensor._get_solar_forecast()
    load_avg_sensors = sensor._get_load_avg_sensors()

    adaptive_helper = AdaptiveConsumptionHelper(
        sensor.hass or sensor._hass,
        sensor._box_id,
        ISO_TZ_OFFSET,
    )
    adaptive_profiles = await adaptive_helper.get_adaptive_load_prediction()

    if not spot_prices:
        _LOGGER.warning("No spot prices available - forecast will use fallback prices")

    load_forecast = await _build_load_forecast(
        sensor,
        spot_prices,
        adaptive_helper,
        adaptive_profiles,
        load_avg_sensors,
    )

    return (
        current_capacity,
        max_capacity,
        min_capacity,
        spot_prices,
        export_prices,
        solar_forecast,
        adaptive_profiles,
        adaptive_helper,
        load_forecast,
    )


async def async_update(sensor: Any) -> None:  # noqa: C901
    """Update sensor data."""

    try:
        mark_bucket_done = False
        now_aware = dt_util.now()
        bucket_start = _bucket_start(now_aware)

        # Enforce single in-flight computation.
        if _should_skip_bucket(sensor, bucket_start):
            return

        sensor._forecast_in_progress = True

        # Ziskat vsechna potrebna data
        sensor._log_rate_limited(
            "forecast_update_tick",
            "debug",
            "Battery forecast async_update() tick",
            cooldown_s=300.0,
        )
        prepared = await _prepare_forecast_inputs(sensor, bucket_start)
        if not prepared:
            return
        (
            current_capacity,
            max_capacity,
            min_capacity,
            spot_prices,
            export_prices,
            solar_forecast,
            adaptive_profiles,
            adaptive_helper,
            load_forecast,
        ) = prepared
        mark_bucket_done = True

        # ONE PLANNER: single planning pipeline.

        # PHASE 2.8 + REFACTORING: Get target from new getter
        _resolve_target_and_soc(
            sensor, current_capacity, max_capacity, min_capacity
        )

        # Build load forecast list (kWh/15min for each interval)
        # PLANNER: build plan timeline with HybridStrategy.
        solar_kwh_list = _build_solar_kwh_list(sensor, spot_prices, solar_forecast)
        timeline, mode_result, recommendations = _run_planner(
            sensor,
            spot_prices,
            export_prices,
            load_forecast,
            solar_kwh_list,
            current_capacity,
            max_capacity,
        )
        _apply_planner_results(sensor, timeline, mode_result, recommendations)

        # PHASE 2.9: Fix daily plan at midnight for tracking (AFTER _timeline_data is set)
        await sensor._maybe_fix_daily_plan()

        _post_update_housekeeping(sensor, adaptive_profiles, adaptive_helper)

        # Notify dependent sensors (BatteryBalancing) that forecast is ready
        _dispatch_forecast_updated(sensor)

    except Exception as err:
        _LOGGER.error("Error updating battery forecast: %s", err, exc_info=True)
    finally:
        # Mark bucket complete only if prerequisites were ready.
        try:
            if mark_bucket_done:
                now_done = dt_util.now()
                done_bucket_minute = (now_done.minute // 15) * 15
                sensor._last_forecast_bucket = now_done.replace(
                    minute=done_bucket_minute, second=0, microsecond=0
                )
                # We intentionally keep profiles dirty until a successful compute; if async_update
                # failed, the next tick will retry.
                if sensor._timeline_data:
                    sensor._profiles_dirty = False
        except Exception:  # pragma: no cover
            pass  # nosec B110 pragma: no cover
        sensor._forecast_in_progress = False
