"""Integration of economic planner with Home Assistant coordinator.

This module provides the bridge between the economic planner algorithm
and Home Assistant's coordinator pattern.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from ..const import (
    CONF_CHARGE_RATE_KW,
    DOMAIN,
    CONF_PLANNING_MIN_PERCENT,
    DEFAULT_CHARGE_RATE_KW,
    DEFAULT_PLANNING_MIN_PERCENT,
)
from ..sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS
from .data.input import get_load_avg_for_timestamp
from .economic_planner import plan_battery_schedule
from .economic_planner_types import PlannerInputs
from .types import CBBMode

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry

_LOGGER = logging.getLogger(__name__)
_FORECAST_INTERVALS = 96
_DEFAULT_SOLAR_KWH_15MIN = 0.0
_DEFAULT_LOAD_KWH_15MIN = 0.5
_DEFAULT_PRICE_CZK_KWH = 5.0


def _state_float(hass: HomeAssistant, entity_id: str) -> float | None:
    state = hass.states.get(entity_id)
    if not state:
        return None
    raw = str(state.state).strip().lower()
    if raw in {"unknown", "unavailable", "none", ""}:
        return None
    try:
        return float(state.state)
    except (TypeError, ValueError):
        return None


def _safe_parse_iso(ts_str: str) -> datetime | None:
    try:
        return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    except ValueError:
        return None


def _pad_or_trim(values: list[float], *, length: int, fill: float) -> list[float]:
    if len(values) >= length:
        return values[:length]
    if not values:
        return [fill] * length
    return values + [values[-1]] * (length - len(values))


def _sorted_dict_values(data: dict[str, Any]) -> list[float]:
    parsed: list[tuple[datetime, float]] = []
    for ts_str, value in data.items():
        dt_value = _safe_parse_iso(str(ts_str))
        if dt_value is None:
            continue
        try:
            parsed.append((dt_value, float(value)))
        except (TypeError, ValueError):
            continue
    parsed.sort(key=lambda item: item[0])
    return [max(0.0, item[1]) for item in parsed]


def _quarter_hour_from_hourly_kw(hourly_kw: dict[str, Any]) -> list[float]:
    hourly_values_kw = _sorted_dict_values(hourly_kw)
    quarter_hour_kwh: list[float] = []
    for kw in hourly_values_kw:
        quarter_hour_kwh.extend([kw / 4.0] * 4)
    return quarter_hour_kwh


def _get_solar_candidates(box_id: str) -> list[str]:
    """Build list of solar forecast sensor candidates."""
    candidates = []
    if box_id:
        candidates.extend([
            f"sensor.oig_{box_id}_solar_forecast",
            f"sensor.oig_{box_id}_solar_forecast_string1",
        ])
    candidates.append("sensor.solcast_forecast")
    return candidates


def _try_load_solar_from_entity(hass: HomeAssistant, entity_id: str) -> list[float] | None:
    """Try to load solar forecast from a single entity."""
    state = hass.states.get(entity_id)
    if not state or not state.attributes:
        return None

    attrs = state.attributes
    today_hourly = attrs.get("today_hourly_total_kw")
    tomorrow_hourly = attrs.get("tomorrow_hourly_total_kw")

    if not isinstance(today_hourly, dict) and not isinstance(tomorrow_hourly, dict):
        return None

    today_series = _quarter_hour_from_hourly_kw(today_hourly) if isinstance(today_hourly, dict) else []
    tomorrow_series = _quarter_hour_from_hourly_kw(tomorrow_hourly) if isinstance(tomorrow_hourly, dict) else []
    merged = today_series + tomorrow_series

    if not merged:
        return None

    _LOGGER.debug("Solar forecast loaded from %s (%d points)", entity_id, len(merged))
    return _pad_or_trim(merged, length=_FORECAST_INTERVALS, fill=_DEFAULT_SOLAR_KWH_15MIN)


def fetch_solar_forecast(hass: HomeAssistant, box_id: str) -> list[float]:
    """Fetch solar forecast from available sensors."""
    candidates = _get_solar_candidates(box_id)

    for entity_id in candidates:
        result = _try_load_solar_from_entity(hass, entity_id)
        if result is not None:
            return result

    _LOGGER.warning(
        "Solar forecast sensor unavailable for box_id=%s, using fallback defaults",
        box_id or "default",
    )
    return [_DEFAULT_SOLAR_KWH_15MIN] * _FORECAST_INTERVALS


def _collect_load_avg_sensors(hass: HomeAssistant, box_id: str) -> dict[str, Any]:
    load_sensors: dict[str, Any] = {}
    for sensor_type, config in SENSOR_TYPES_STATISTICS.items():
        if not sensor_type.startswith("load_avg_"):
            continue
        if "time_range" not in config or "day_type" not in config:
            continue

        if box_id:
            entity_id = f"sensor.oig_{box_id}_{sensor_type}"
        else:
            entity_id = f"sensor.{sensor_type}"

        value = _state_float(hass, entity_id)
        if value is None:
            continue

        load_sensors[entity_id] = {
            "value": value,
            "time_range": config["time_range"],
            "day_type": config["day_type"],
        }

    return load_sensors


def fetch_load_forecast(hass: HomeAssistant, box_id: str) -> list[float]:
    load_avg_sensors = _collect_load_avg_sensors(hass, box_id)
    if not load_avg_sensors:
        _LOGGER.warning(
            "No load_avg sensors available for box_id=%s, using fallback defaults",
            box_id or "default",
        )
        return [_DEFAULT_LOAD_KWH_15MIN] * _FORECAST_INTERVALS

    now = dt_util.now()
    start = now.replace(minute=(now.minute // 15) * 15, second=0, microsecond=0)
    forecast: list[float] = []
    for i in range(_FORECAST_INTERVALS):
        ts = start + timedelta(minutes=15 * i)
        kwh_15min = get_load_avg_for_timestamp(ts, load_avg_sensors)
        forecast.append(max(0.0, float(kwh_15min)))

    _LOGGER.debug(
        "Load forecast calculated from %d load_avg sensors",
        len(load_avg_sensors),
    )
    return _pad_or_trim(
        forecast,
        length=_FORECAST_INTERVALS,
        fill=_DEFAULT_LOAD_KWH_15MIN,
    )


def _prices_from_coordinator(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
) -> list[float]:
    try:
        domain_data = hass.data.get(DOMAIN, {})
        entry_data = domain_data.get(config_entry.entry_id, {})
        coordinator = entry_data.get("coordinator")
        data = getattr(coordinator, "data", None) if coordinator else None
        spot_data = data.get("spot_prices", {}) if isinstance(data, dict) else {}
        prices15m = (
            spot_data.get("prices15m_czk_kwh", {})
            if isinstance(spot_data, dict)
            else {}
        )
        if not isinstance(prices15m, dict) or not prices15m:
            return []

        prices = _sorted_dict_values(prices15m)
        if prices:
            _LOGGER.debug(
                "Prices loaded from coordinator spot cache (%d points)",
                len(prices),
            )
        return prices
    except Exception as err:
        _LOGGER.debug("Failed to read prices from coordinator cache: %s", err)
        return []


def fetch_prices(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    box_id: str,
) -> list[float]:
    prices = _prices_from_coordinator(hass, config_entry)
    if prices:
        return _pad_or_trim(
            prices,
            length=_FORECAST_INTERVALS,
            fill=_DEFAULT_PRICE_CZK_KWH,
        )

    sensor_candidates = []
    if box_id:
        sensor_candidates.append(f"sensor.oig_{box_id}_spot_price_current_15min")
    sensor_candidates.append("sensor.spot_price_current_15min")

    for entity_id in sensor_candidates:
        current_price = _state_float(hass, entity_id)
        if current_price is None:
            continue
        _LOGGER.warning(
            "Using flat spot price from %s because interval prices are unavailable",
            entity_id,
        )
        return [max(0.0, current_price)] * _FORECAST_INTERVALS

    _LOGGER.warning(
        "Spot prices unavailable for box_id=%s, using fallback defaults",
        box_id or "default",
    )
    return [_DEFAULT_PRICE_CZK_KWH] * _FORECAST_INTERVALS


def load_planner_inputs(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
) -> PlannerInputs:
    """Load dynamic inputs from Home Assistant sensors and config.

    Args:
        hass: Home Assistant instance
        config_entry: Configuration entry with planner settings

    Returns:
        PlannerInputs populated with current sensor values

    Raises:
        ValueError: If required sensors are unavailable
    """
    # Get box_id from config
    box_id = config_entry.data.get("box_id", "")

    # Sensor entity IDs
    soc_sensor = f"sensor.oig_{box_id}_battery_level" if box_id else "sensor.battery_level"
    capacity_sensor = f"sensor.oig_{box_id}_installed_battery_capacity_kwh" if box_id else "sensor.installed_battery_capacity_kwh"
    hw_min_sensor = f"sensor.oig_{box_id}_batt_bat_min" if box_id else "sensor.batt_bat_min"

    # Read current values from sensors
    soc_state = hass.states.get(soc_sensor)
    capacity_state = hass.states.get(capacity_sensor)
    hw_min_state = hass.states.get(hw_min_sensor)

    if not soc_state or not capacity_state:
        raise ValueError(f"Required sensors unavailable: {soc_sensor}, {capacity_sensor}")

    # Parse values
    current_soc_kwh = float(soc_state.state) if soc_state else 5.0
    max_capacity_kwh = float(capacity_state.state) if capacity_state else 10.24
    hw_min_kwh = float(hw_min_state.state) if hw_min_state else (max_capacity_kwh * 0.20)

    # Get config values
    planning_min_percent = config_entry.options.get(
        CONF_PLANNING_MIN_PERCENT,
        config_entry.data.get(CONF_PLANNING_MIN_PERCENT, DEFAULT_PLANNING_MIN_PERCENT)
    )
    charge_rate_kw = config_entry.options.get(
        CONF_CHARGE_RATE_KW,
        config_entry.data.get(CONF_CHARGE_RATE_KW, DEFAULT_CHARGE_RATE_KW)
    )

    # Validate planning_min >= HW min
    hw_min_percent = (hw_min_kwh / max_capacity_kwh) * 100
    if planning_min_percent < hw_min_percent:
        _LOGGER.warning(
            "Planning min %.1f%% is below HW min %.1f%%, adjusting to %.1f%%",
            planning_min_percent, hw_min_percent, hw_min_percent
        )
        planning_min_percent = hw_min_percent

    intervals = [{"index": i} for i in range(_FORECAST_INTERVALS)]
    solar_forecast = fetch_solar_forecast(hass, box_id)
    load_forecast = fetch_load_forecast(hass, box_id)
    prices = fetch_prices(hass, config_entry, box_id)

    return PlannerInputs(
        current_soc_kwh=current_soc_kwh,
        max_capacity_kwh=max_capacity_kwh,
        hw_min_kwh=hw_min_kwh,
        planning_min_percent=planning_min_percent,
        charge_rate_kw=charge_rate_kw,
        intervals=intervals,
        prices=prices,
        solar_forecast=solar_forecast,
        load_forecast=load_forecast,
    )


def _mode_to_name(mode: int) -> str:
    """Convert mode value to name."""
    if mode == CBBMode.HOME_I.value:
        return "HOME_I"
    elif mode == CBBMode.HOME_III.value:
        return "HOME_III"
    elif mode == CBBMode.HOME_UPS.value:
        return "HOME_UPS"
    else:
        return f"UNKNOWN({mode})"


def run_economic_planning(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
) -> dict[str, Any]:
    """Run economic planning and return results.

    Args:
        hass: Home Assistant instance
        config_entry: Configuration entry

    Returns:
        Dictionary with planning results including modes and decisions
    """
    try:
        inputs = load_planner_inputs(hass, config_entry)
        result = plan_battery_schedule(inputs)

        for decision in result.decisions:
            _LOGGER.info(
                "Economic decision at interval %d: %s (cost: %.2f Kč)",
                decision.moment.interval,
                decision.strategy,
                decision.cost
            )

        mode_names = [_mode_to_name(mode) for mode in result.modes]

        return {
            "success": True,
            "modes": result.modes,
            "mode_names": mode_names,
            "total_cost": result.total_cost,
            "decisions_count": len(result.decisions),
            "states": result.states,
        }

    except Exception as e:
        _LOGGER.error("Economic planning failed: %s", e)
        return {
            "success": False,
            "error": str(e),
        }


def apply_economic_plan(
    modes: list[int],
) -> None:
    """Apply economic plan modes to battery box."""
    _LOGGER.info("Economic plan generated with %d intervals", len(modes))

    # Count mode distribution
    home_i_count = sum(1 for m in modes if m == CBBMode.HOME_I.value)
    home_iii_count = sum(1 for m in modes if m == CBBMode.HOME_III.value)
    home_ups_count = sum(1 for m in modes if m == CBBMode.HOME_UPS.value)

    _LOGGER.info(
        "Mode distribution: HOME_I=%d, HOME_III=%d, HOME_UPS=%d",
        home_i_count, home_iii_count, home_ups_count
    )
