"""History helpers extracted from legacy battery forecast."""

from __future__ import annotations

import copy
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from homeassistant.util import dt as dt_util

from .types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_II,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
    CBB_MODE_NAMES,
    SERVICE_MODE_HOME_1,
    SERVICE_MODE_HOME_2,
    SERVICE_MODE_HOME_3,
    SERVICE_MODE_HOME_UPS,
)

DATETIME_FMT = "%Y-%m-%dT%H:%M:%S"
DATE_FMT = "%Y-%m-%d"

_LOGGER = logging.getLogger(__name__)


async def fetch_interval_from_history(  # noqa: C901
    sensor: Any, start_time: datetime, end_time: datetime
) -> Optional[Dict[str, Any]]:
    """Load actual data for a 15-min interval from HA history."""
    if not sensor._hass:  # pylint: disable=protected-access
        _LOGGER.debug("[fetch_interval_from_history] No _hass instance")
        return None

    log_rl = getattr(sensor, "_log_rate_limited", None)
    if log_rl:
        log_rl(
            "fetch_interval_range",
            "debug",
            "[fetch_interval_from_history] Fetching sample interval %s - %s",
            start_time,
            end_time,
            cooldown_s=900.0,
        )

    try:
        from homeassistant.components.recorder.history import get_significant_states

        box_id = sensor._box_id  # pylint: disable=protected-access
        entity_ids = [
            f"sensor.oig_{box_id}_ac_out_en_day",
            f"sensor.oig_{box_id}_ac_in_ac_ad",
            f"sensor.oig_{box_id}_ac_in_ac_pd",
            f"sensor.oig_{box_id}_dc_in_fv_ad",
            f"sensor.oig_{box_id}_batt_bat_c",
            f"sensor.oig_{box_id}_box_prms_mode",
            f"sensor.oig_{box_id}_spot_price_current_15min",
            f"sensor.oig_{box_id}_export_price_current_15min",
        ]

        states = await sensor._hass.async_add_executor_job(  # pylint: disable=protected-access
            get_significant_states,
            sensor._hass,
            start_time,
            end_time,
            entity_ids,
            None,
            True,
        )

        if not states:
            return None

        def get_delta(entity_id: str) -> float:
            entity_states = states.get(entity_id, [])
            if not entity_states:
                return 0.0

            start_utc = (
                start_time.astimezone(timezone.utc)
                if start_time.tzinfo
                else start_time
            )
            end_utc = (
                end_time.astimezone(timezone.utc) if end_time.tzinfo else end_time
            )

            interval_states = [
                s
                for s in entity_states
                if start_utc <= s.last_updated.astimezone(timezone.utc) <= end_utc
            ]

            if not interval_states:
                before_states = [
                    s
                    for s in entity_states
                    if s.last_updated.astimezone(timezone.utc) < start_utc
                ]
                after_states = [
                    s
                    for s in entity_states
                    if s.last_updated.astimezone(timezone.utc) > end_utc
                ]
                if before_states and after_states:
                    interval_states = [before_states[-1], after_states[0]]
                else:
                    return 0.0

            if len(interval_states) < 2:
                return 0.0

            try:
                start_val = float(interval_states[0].state)
                end_val = float(interval_states[-1].state)
                delta_wh = end_val - start_val
                if delta_wh < 0:
                    delta_wh = end_val
                return delta_wh / 1000.0
            except (ValueError, AttributeError):
                return 0.0

        def get_value_at_end(entity_id: str) -> Any:
            entity_states = states.get(entity_id, [])
            if not entity_states:
                return None

            end_utc = (
                end_time.astimezone(timezone.utc) if end_time.tzinfo else end_time
            )

            closest_state = min(
                entity_states,
                key=lambda s: abs(
                    (
                        s.last_updated.astimezone(timezone.utc) - end_utc
                    ).total_seconds()
                ),
            )

            try:
                return float(closest_state.state)
            except (ValueError, AttributeError):
                return None

        def get_last_value(entity_id: str) -> Any:
            entity_states = states.get(entity_id, [])
            if not entity_states:
                return None
            try:
                return float(entity_states[-1].state)
            except (ValueError, AttributeError):
                return None

        consumption_kwh = get_delta(f"sensor.oig_{box_id}_ac_out_en_day")
        grid_import_kwh = get_delta(f"sensor.oig_{box_id}_ac_in_ac_ad")
        grid_export_kwh = get_delta(f"sensor.oig_{box_id}_ac_in_ac_pd")
        solar_kwh = get_delta(f"sensor.oig_{box_id}_dc_in_fv_ad")

        battery_soc = get_value_at_end(f"sensor.oig_{box_id}_batt_bat_c")
        mode_raw = get_value_at_end(f"sensor.oig_{box_id}_box_prms_mode")

        battery_kwh = 0.0
        if battery_soc is not None:
            total_capacity = sensor._get_total_battery_capacity() or 0.0  # pylint: disable=protected-access
            if total_capacity > 0:
                battery_kwh = (battery_soc / 100.0) * total_capacity

        spot_price = (
            get_last_value(f"sensor.oig_{box_id}_spot_price_current_15min") or 0.0
        )
        export_price = (
            get_last_value(f"sensor.oig_{box_id}_export_price_current_15min") or 0.0
        )

        import_cost = grid_import_kwh * spot_price
        export_revenue = grid_export_kwh * export_price
        net_cost = import_cost - export_revenue

        mode = CBB_MODE_HOME_I
        if mode_raw is not None:
            mode_str = str(mode_raw).strip()
            if SERVICE_MODE_HOME_1 in mode_str or "HOME I" in mode_str:
                mode = CBB_MODE_HOME_I
            elif SERVICE_MODE_HOME_3 in mode_str or "HOME III" in mode_str:
                mode = CBB_MODE_HOME_III
            elif "UPS" in mode_str or SERVICE_MODE_HOME_UPS in mode_str:
                mode = CBB_MODE_HOME_UPS
            elif SERVICE_MODE_HOME_2 in mode_str or "HOME II" in mode_str:
                mode = CBB_MODE_HOME_II
            elif "HOME 5" in mode_str or "HOME 6" in mode_str:
                mode = CBB_MODE_HOME_I

        mode_name = CBB_MODE_NAMES.get(mode, "HOME I")

        result = {
            "battery_kwh": round(battery_kwh, 2),
            "battery_soc": round(battery_soc, 1) if battery_soc is not None else 0.0,
            "mode": mode,
            "mode_name": mode_name,
            "solar_kwh": round(solar_kwh, 3),
            "consumption_kwh": round(consumption_kwh, 3),
            "grid_import": round(grid_import_kwh, 3),
            "grid_export": round(grid_export_kwh, 3),
            "spot_price": round(spot_price, 2),
            "export_price": round(export_price, 2),
            "net_cost": round(net_cost, 2),
        }

        if log_rl:
            log_rl(
                "fetch_interval_sample",
                "debug",
                "[fetch_interval_from_history] sample %s -> soc=%s kwh=%.2f cons=%.3f net=%.2f",
                start_time.strftime("%Y-%m-%d %H:%M"),
                battery_soc,
                battery_kwh,
                result["consumption_kwh"],
                result["net_cost"],
                cooldown_s=900.0,
            )

        return result

    except Exception as err:
        _LOGGER.warning("Failed to fetch history for %s: %s", start_time, err)
        return None


async def update_actual_from_history(sensor: Any) -> None:
    """Load actual values from HA history for today."""
    now = dt_util.now()
    today_str = now.strftime(DATE_FMT)

    plan_storage = await sensor._load_plan_from_storage(today_str)  # pylint: disable=protected-access
    if not plan_storage:
        _LOGGER.debug("No plan in Storage for %s, skipping history update", today_str)
        return

    plan_data = {
        "date": today_str,
        "plan": plan_storage.get("intervals", []),
        "actual": [],
    }

    existing_actual: List[Dict[str, Any]] = []
    if sensor._daily_plan_state and sensor._daily_plan_state.get("date") == today_str:  # pylint: disable=protected-access
        existing_actual = copy.deepcopy(sensor._daily_plan_state.get("actual", []))  # pylint: disable=protected-access
        plan_data["actual"] = existing_actual
    else:
        existing_actual = plan_data.get("actual", [])

    _LOGGER.info("📊 Updating actual values from history for %s...", today_str)

    patched_existing: List[Dict[str, Any]] = []
    for interval in existing_actual:
        if interval.get("net_cost") is not None:
            patched_existing.append(interval)
            continue
        ts = interval.get("time")
        if not ts:
            patched_existing.append(interval)
            continue
        start_dt = dt_util.parse_datetime(ts)
        if start_dt is None:
            try:
                start_dt = datetime.fromisoformat(ts)
            except Exception:
                start_dt = None
        if start_dt is None:
            patched_existing.append(interval)
            continue
        if start_dt.tzinfo is None:
            start_dt = dt_util.as_local(start_dt)
        interval_end = start_dt + timedelta(minutes=15)
        historical_patch = await fetch_interval_from_history(
            sensor, start_dt, interval_end
        )
        if historical_patch:
            interval = {
                **interval,
                "net_cost": round(historical_patch.get("net_cost", 0), 2),
                "spot_price": round(historical_patch.get("spot_price", 0), 2),
                "export_price": round(historical_patch.get("export_price", 0), 2),
            }
        patched_existing.append(interval)
    existing_actual = patched_existing
    plan_data["actual"] = existing_actual

    existing_times = {interval.get("time") for interval in existing_actual}

    _LOGGER.debug("Found %s existing actual intervals", len(existing_actual))

    start_time = dt_util.start_of_local_day(now)
    current_time = start_time
    new_intervals = []

    while current_time <= now:
        interval_time_str = current_time.isoformat()

        if interval_time_str in existing_times:
            current_time += timedelta(minutes=15)
            continue

        actual_data = await fetch_interval_from_history(
            sensor, current_time, current_time + timedelta(minutes=15)
        )

        if actual_data:
            new_intervals.append(
                {
                    "time": interval_time_str,
                    "solar_kwh": round(actual_data.get("solar_kwh", 0), 4),
                    "consumption_kwh": round(actual_data.get("consumption_kwh", 0), 4),
                    "battery_soc": round(actual_data.get("battery_soc", 0), 2),
                    "battery_capacity_kwh": round(
                        actual_data.get("battery_capacity_kwh", 0), 2
                    ),
                    "grid_import_kwh": round(actual_data.get("grid_import", 0), 4),
                    "grid_export_kwh": round(actual_data.get("grid_export", 0), 4),
                    "net_cost": round(actual_data.get("net_cost", 0), 2),
                    "spot_price": round(actual_data.get("spot_price", 0), 2),
                    "export_price": round(actual_data.get("export_price", 0), 2),
                    "mode": actual_data.get("mode", 0),
                    "mode_name": actual_data.get("mode_name", "N/A"),
                }
            )

        current_time += timedelta(minutes=15)

    if new_intervals:
        plan_data["actual"] = existing_actual + new_intervals
        _LOGGER.info(
            "✅ Added %s new actual intervals (total: %s)",
            len(new_intervals),
            len(plan_data["actual"]),
        )
    else:
        _LOGGER.debug("No new actual intervals to add")

    if new_intervals:
        sensor._daily_plan_state = plan_data  # pylint: disable=protected-access
    else:
        _LOGGER.debug("No changes, skipping storage update")


async def fetch_mode_history_from_recorder(
    sensor: Any, start_time: datetime, end_time: datetime
) -> List[Dict[str, Any]]:
    """Load historical modes from HA Recorder."""
    if not sensor._hass:  # pylint: disable=protected-access
        _LOGGER.warning("HASS not available, cannot fetch mode history")
        return []

    sensor_id = f"sensor.oig_{sensor._box_id}_box_prms_mode"  # pylint: disable=protected-access

    try:
        from homeassistant.components.recorder import history

        history_data = await sensor._hass.async_add_executor_job(  # pylint: disable=protected-access
            history.state_changes_during_period,
            sensor._hass,
            start_time,
            end_time,
            sensor_id,
        )

        if not history_data or sensor_id not in history_data:
            _LOGGER.debug(
                "No mode history found for %s between %s - %s",
                sensor_id,
                start_time,
                end_time,
            )
            return []

        states = history_data[sensor_id]
        if not states:
            return []

        mode_intervals = []
        for state in states:
            mode_name = state.state
            if mode_name in ["unavailable", "unknown", None]:
                continue

            mode_id = map_mode_name_to_id(mode_name)

            mode_intervals.append(
                {
                    "time": state.last_changed.isoformat(),
                    "mode_name": mode_name,
                    "mode": mode_id,
                }
            )

        _LOGGER.debug(
            "📊 Fetched %s mode changes from Recorder for %s (%s - %s)",
            len(mode_intervals),
            sensor_id,
            start_time.strftime("%Y-%m-%d %H:%M"),
            end_time.strftime("%Y-%m-%d %H:%M"),
        )

        return mode_intervals

    except ImportError:
        _LOGGER.error("Recorder component not available")
        return []
    except Exception as err:
        _LOGGER.error("Error fetching mode history from Recorder: %s", err)
        return []


def map_mode_name_to_id(mode_name: str) -> int:
    """Map mode name (from sensor state) to mode ID."""
    mode_mapping = {
        SERVICE_MODE_HOME_1: CBB_MODE_HOME_I,
        SERVICE_MODE_HOME_2: CBB_MODE_HOME_II,
        SERVICE_MODE_HOME_3: CBB_MODE_HOME_III,
        SERVICE_MODE_HOME_UPS: CBB_MODE_HOME_UPS,
        "Home 5": CBB_MODE_HOME_I,
        "Home 6": CBB_MODE_HOME_I,
    }

    normalized = str(mode_name or "").strip()
    if not normalized:
        return CBB_MODE_HOME_I
    if normalized.lower() in {"unknown", "neznámý", "neznamy"}:
        return CBB_MODE_HOME_I

    mode_id = mode_mapping.get(normalized)
    if mode_id is None:
        _LOGGER.warning(
            "Unknown mode name '%s', using fallback mode ID 0 (HOME I)", mode_name
        )
        return CBB_MODE_HOME_I

    return mode_id


async def build_historical_modes_lookup(
    sensor: Any,
    *,
    day_start: datetime,
    fetch_end: datetime,
    date_str: str,
    source: str,
) -> Dict[str, Dict[str, Any]]:
    """Load historical mode changes from Recorder and expand to 15-min intervals."""
    if not sensor._hass:  # pylint: disable=protected-access
        return {}

    mode_history = await fetch_mode_history_from_recorder(sensor, day_start, fetch_end)

    mode_changes: list[dict[str, Any]] = []
    for mode_entry in mode_history:
        time_key = mode_entry.get("time", "")
        if not time_key:
            continue
        try:
            dt = datetime.fromisoformat(time_key)
            if dt.tzinfo is None:
                dt = dt_util.as_local(dt)
            mode_changes.append(
                {
                    "time": dt,
                    "mode": mode_entry.get("mode"),
                    "mode_name": mode_entry.get("mode_name"),
                }
            )
        except Exception:  # nosec B112
            continue

    mode_changes.sort(key=lambda x: x["time"])

    historical_modes_lookup: Dict[str, Dict[str, Any]] = {}
    interval_time = day_start
    while interval_time <= fetch_end:
        active_mode = None
        for change in mode_changes:
            if change["time"] <= interval_time:
                active_mode = change
            else:
                break

        if active_mode:
            interval_time_str = interval_time.strftime(DATETIME_FMT)
            historical_modes_lookup[interval_time_str] = {
                "time": interval_time_str,
                "mode": active_mode["mode"],
                "mode_name": active_mode["mode_name"],
            }

        interval_time += timedelta(minutes=15)

    _LOGGER.debug(
        "📊 Loaded %s historical mode intervals from Recorder for %s (%s) "
        "(expanded from %s changes)",
        len(historical_modes_lookup),
        date_str,
        source,
        len(mode_changes),
    )
    return historical_modes_lookup
