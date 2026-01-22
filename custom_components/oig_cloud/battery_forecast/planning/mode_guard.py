"""Mode guard helpers extracted from the battery forecast sensor."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Tuple

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from ..physics import simulate_interval
from ..utils_common import format_time_label, parse_timeline_timestamp

_LOGGER = logging.getLogger(__name__)

GetCurrentMode = Callable[[], int]


def enforce_min_mode_duration(
    modes: List[int],
    *,
    mode_names: Dict[int, str],
    min_mode_duration: Dict[str, int],
    logger: logging.Logger = _LOGGER,
) -> List[int]:
    """Enforce minimum duration of each mode in the plan.

    For short blocks that don't meet minimum duration:
    - HOME UPS (mode 3) blocks are EXTENDED forward (we want to charge more)
    - Other modes are REPLACED by adjacent mode (merged with neighbor)
    """
    if not modes:
        return modes

    result = modes.copy()
    n = len(result)
    i = 0
    violations_fixed = 0

    # HOME UPS mode code
    HOME_UPS_MODE = 3

    while i < n:
        current_mode = result[i]
        mode_name = mode_names.get(current_mode, f"Mode {current_mode}")

        block_start = i
        block_end = _find_block_end(result, block_start, current_mode)
        block_length = block_end - block_start

        min_duration = min_mode_duration.get(mode_name, 1)

        if block_length < min_duration:
            violations_fixed += 1
            intervals_needed = min_duration - block_length

            # For HOME UPS: extend forward (charge longer)
            if current_mode == HOME_UPS_MODE:
                new_end = min(block_end + intervals_needed, n)
                for idx in range(block_end, new_end):
                    result[idx] = current_mode
                logger.debug(
                    "[MIN_DURATION] Extended UPS block @ %s: %s → %s intervals",
                    block_start,
                    block_length,
                    new_end - block_start,
                )
                i = new_end
            else:
                # For other modes: replace with adjacent mode
                replacement_mode = _pick_replacement_mode(
                    result, block_start, block_end
                )
                _apply_replacement(result, block_start, block_end, replacement_mode)
                logger.debug(
                    "[MIN_DURATION] Fixed violation: %s block @ %s "
                    "(length %s < min %s) → %s",
                    mode_name,
                    block_start,
                    block_length,
                    min_duration,
                    mode_names.get(replacement_mode, "unknown"),
                )
                i = block_start
        else:
            i = block_end

    if violations_fixed > 0:
        logger.info("✅ MIN_MODE_DURATION: Fixed %s violations", violations_fixed)

    return result


def _find_block_end(modes: List[int], start: int, mode: int) -> int:
    end = start
    while end < len(modes) and modes[end] == mode:
        end += 1
    return end


def _pick_replacement_mode(modes: List[int], start: int, end: int) -> int:
    if start == 0:
        return modes[end] if end < len(modes) else modes[start]
    return modes[start - 1]


def _apply_replacement(
    modes: List[int], start: int, end: int, replacement_mode: int
) -> None:
    for idx in range(start, min(end, len(modes))):
        modes[idx] = replacement_mode


def get_mode_guard_context(
    *,
    hass: Optional[HomeAssistant],
    box_id: str,
    mode_guard_minutes: int,
    get_current_mode: GetCurrentMode,
) -> Tuple[Optional[int], Optional[datetime]]:
    """Get current mode and guard window end timestamp."""
    if not hass or mode_guard_minutes <= 0:
        return None, None

    sensor_id = f"sensor.oig_{box_id}_box_prms_mode"
    state = hass.states.get(sensor_id)
    if not state or state.state in ["unknown", "unavailable", None]:
        return None, None

    current_mode = get_current_mode()
    last_changed = getattr(state, "last_changed", None)
    if not isinstance(last_changed, datetime):
        return current_mode, None

    if last_changed.tzinfo is None:
        last_changed = dt_util.as_local(last_changed)

    guard_until = last_changed + timedelta(minutes=mode_guard_minutes)
    if guard_until <= dt_util.now():
        return current_mode, None

    return current_mode, guard_until


def build_plan_lock(
    *,
    now: datetime,
    spot_prices: List[Dict[str, Any]],
    modes: List[int],
    mode_guard_minutes: int,
    plan_lock_until: Optional[datetime],
    plan_lock_modes: Optional[Dict[str, int]],
) -> Tuple[Optional[datetime], Dict[str, int]]:
    """Build or reuse lock map for the guard window."""
    if mode_guard_minutes <= 0:
        return None, {}

    lock_until = plan_lock_until
    lock_modes = plan_lock_modes or {}
    if isinstance(lock_until, datetime) and now < lock_until and lock_modes:
        return lock_until, lock_modes

    lock_until = now + timedelta(minutes=mode_guard_minutes)
    lock_modes = {}
    for i, sp in enumerate(spot_prices):
        if i >= len(modes):
            break
        ts_value = sp.get("time")
        start_dt = parse_timeline_timestamp(str(ts_value or ""))
        if not start_dt:
            start_dt = now + timedelta(minutes=15 * i)
        if start_dt >= lock_until:
            break
        if ts_value:
            lock_modes[str(ts_value)] = modes[i]

    return lock_until, lock_modes


def apply_mode_guard(
    *,
    modes: List[int],
    spot_prices: List[Dict[str, Any]],
    solar_kwh_list: List[float],
    load_forecast: List[float],
    current_capacity: float,
    max_capacity: float,
    hw_min_capacity: float,
    efficiency: float,
    home_charge_rate_kw: float,
    planning_min_kwh: float,
    lock_modes: Dict[str, int],
    guard_until: Optional[datetime],
    log_rate_limited: Optional[Callable[..., None]] = None,
) -> Tuple[List[int], List[Dict[str, Any]], Optional[datetime]]:
    """Apply guard window lock to the planned modes."""
    if not modes or not guard_until or not lock_modes:
        return modes, [], None

    now = dt_util.now()
    guarded_modes = list(modes)
    overrides: List[Dict[str, Any]] = []
    soc = current_capacity
    charge_rate_kwh_15min = home_charge_rate_kw / 4.0

    for i, planned_mode in enumerate(modes):
        if i >= len(spot_prices):
            break
        guard_ctx = _resolve_guard_context(spot_prices, i, now, guard_until, lock_modes)
        if guard_ctx is None:
            break
        _, locked_mode = guard_ctx

        forced_mode, next_soc, override = _apply_guard_interval(
            idx=i,
            planned_mode=planned_mode,
            locked_mode=locked_mode,
            soc=soc,
            solar_kwh_list=solar_kwh_list,
            load_forecast=load_forecast,
            max_capacity=max_capacity,
            hw_min_capacity=hw_min_capacity,
            efficiency=efficiency,
            charge_rate_kwh_15min=charge_rate_kwh_15min,
            planning_min_kwh=planning_min_kwh,
        )
        if override:
            overrides.append(override)
        if planned_mode != forced_mode:
            guarded_modes[i] = forced_mode

        soc = next_soc

    _log_guard_summary(overrides, guard_until, log_rate_limited)

    return guarded_modes, overrides, guard_until


def _apply_guard_interval(
    *,
    idx: int,
    planned_mode: int,
    locked_mode: Optional[int],
    soc: float,
    solar_kwh_list: List[float],
    load_forecast: List[float],
    max_capacity: float,
    hw_min_capacity: float,
    efficiency: float,
    charge_rate_kwh_15min: float,
    planning_min_kwh: float,
) -> tuple[int, float, Optional[Dict[str, Any]]]:
    solar_kwh, load_kwh = _resolve_interval_loads(idx, solar_kwh_list, load_forecast)
    forced_mode = locked_mode if locked_mode is not None else planned_mode
    next_soc = _simulate_guard_interval(
        forced_mode,
        solar_kwh,
        load_kwh,
        soc,
        max_capacity,
        hw_min_capacity,
        efficiency,
        charge_rate_kwh_15min,
    )

    if next_soc < planning_min_kwh:
        forced_mode = planned_mode
        next_soc = _simulate_guard_interval(
            forced_mode,
            solar_kwh,
            load_kwh,
            soc,
            max_capacity,
            hw_min_capacity,
            efficiency,
            charge_rate_kwh_15min,
        )
        return (
            forced_mode,
            next_soc,
            {
                "idx": idx,
                "type": "guard_exception_soc",
                "planned_mode": planned_mode,
                "forced_mode": planned_mode,
            },
        )

    if planned_mode != forced_mode:
        return (
            forced_mode,
            next_soc,
            {
                "idx": idx,
                "type": "guard_locked_plan",
                "planned_mode": planned_mode,
                "forced_mode": forced_mode,
            },
        )
    return forced_mode, next_soc, None


def _log_guard_summary(
    overrides: List[Dict[str, Any]],
    guard_until: Optional[datetime],
    log_rate_limited: Optional[Callable[..., None]],
) -> None:
    if not overrides or not guard_until:
        return
    if log_rate_limited:
        log_rate_limited(
            "mode_guard_applied",
            "info",
            "🛡️ Guard aktivní: zamknuto %s intervalů (do %s)",
            len(overrides),
            guard_until.isoformat(),
            cooldown_s=900.0,
        )
    else:
        _LOGGER.info(
            "🛡️ Guard aktivní: zamknuto %s intervalů (do %s)",
            len(overrides),
            guard_until.isoformat(),
        )


def _resolve_guard_context(
    spot_prices: List[Dict[str, Any]],
    idx: int,
    now: datetime,
    guard_until: datetime,
    lock_modes: Dict[str, int],
) -> Optional[tuple[Any, Optional[int]]]:
    ts_value = spot_prices[idx].get("time")
    start_dt = parse_timeline_timestamp(str(ts_value or ""))
    if not start_dt:
        start_dt = now + timedelta(minutes=15 * idx)
    if start_dt >= guard_until:
        return None
    return ts_value, lock_modes.get(str(ts_value or ""))


def _resolve_interval_loads(
    idx: int, solar_kwh_list: List[float], load_forecast: List[float]
) -> tuple[float, float]:
    solar_kwh = solar_kwh_list[idx] if idx < len(solar_kwh_list) else 0.0
    load_kwh = load_forecast[idx] if idx < len(load_forecast) else 0.125
    return solar_kwh, load_kwh


def _simulate_guard_interval(
    mode: int,
    solar_kwh: float,
    load_kwh: float,
    soc: float,
    max_capacity: float,
    hw_min_capacity: float,
    efficiency: float,
    charge_rate_kwh_15min: float,
) -> float:
    res = simulate_interval(
        mode=mode,
        solar_kwh=solar_kwh,
        load_kwh=load_kwh,
        battery_soc_kwh=soc,
        capacity_kwh=max_capacity,
        hw_min_capacity_kwh=hw_min_capacity,
        charge_efficiency=efficiency,
        discharge_efficiency=efficiency,
        home_charge_rate_kwh_15min=charge_rate_kwh_15min,
    )
    return res.new_soc_kwh


def apply_guard_reasons_to_timeline(
    timeline: List[Dict[str, Any]],
    overrides: List[Dict[str, Any]],
    guard_until: Optional[datetime],
    current_mode: Optional[int],
    *,
    mode_names: Dict[int, str],
) -> None:
    """Inject guard reasons into timeline entries."""
    if not timeline or not overrides:
        return

    current_mode_name = (
        mode_names.get(current_mode, "HOME I") if current_mode is not None else ""
    )
    guard_until_str = guard_until.isoformat() if guard_until else None

    for override in overrides:
        idx = override.get("idx")
        if idx is None or idx >= len(timeline):
            continue

        entry = timeline[idx]
        planned_mode = override.get("planned_mode")
        forced_mode = override.get("forced_mode")
        override_type = override.get("type")

        planned_name = mode_names.get(planned_mode, "HOME I")
        forced_name = mode_names.get(forced_mode, planned_name)
        reason = _build_guard_reason(
            override_type,
            planned_name,
            forced_name,
            guard_until_str,
        )

        _append_guard_reason(entry, reason)

        if current_mode_name:
            entry["guard_current_mode"] = current_mode_name


def _build_guard_reason(
    override_type: Optional[str],
    planned_name: str,
    forced_name: str,
    guard_until_str: Optional[str],
) -> str:
    if override_type == "guard_exception_soc":
        return (
            "Výjimka guardu: SoC pod plánovacím minimem – "
            f"povolujeme změnu na {planned_name}."
        )
    if override_type == "guard_locked_plan":
        guard_until_label = format_time_label(guard_until_str)
        if guard_until_label != "--:--":
            return (
                "Stabilizace: držíme potvrzený plán "
                f"{forced_name} do {guard_until_label}."
            )
        return f"Stabilizace: držíme potvrzený plán {forced_name}."
    return "Stabilizace: držíme potvrzený plán."


def _append_guard_reason(entry: Dict[str, Any], reason: str) -> None:
    if entry.get("planner_reason"):
        entry["planner_reason"] += f"\n{reason}"
    else:
        entry["planner_reason"] = reason

    if entry.get("reason"):
        entry["reason"] = reason

    entry["guard_reason"] = reason
