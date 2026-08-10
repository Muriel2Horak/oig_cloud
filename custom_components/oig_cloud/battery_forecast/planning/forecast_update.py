"""Forecast update routine extracted from ha_sensor."""

from __future__ import annotations

import hashlib
import json
import logging
import math
from datetime import date, datetime
from pathlib import Path
from typing import Any, List, Optional

from homeassistant.util import dt as dt_util

from ...const import DOMAIN
from ...shared.cloud_contract import (
    DETAIL_ENUMS,
    build_failure_summary,
    build_producer_event,
    resolve_telemetry_device_id,
)
from ...shared.logging import resolve_no_telemetry
from ..data.adaptive_consumption import AdaptiveConsumptionHelper
from ..data.input import get_load_avg_for_timestamp, get_solar_for_timestamp
from ..economic_planner import (
    build_planner_decision_trace,
    plan_battery_schedule,
    simulate_home_i_detailed,
)
from ..economic_planner_types import DEFAULT_ROUND_TRIP_EFFICIENCY, PlannerInputs
from ..timeline.planner import (
    add_decision_reasons_to_timeline,
    attach_planner_reasons,
    build_planner_timeline,
)
from ..types import CBB_MODE_NAMES, MIN_MODE_DURATION
from . import auto_switch as auto_switch_module
from . import mode_guard as mode_guard_module

_LOGGER = logging.getLogger(__name__)
ISO_TZ_OFFSET = "+00:00"
MODE_GUARD_MINUTES = 60
# Hardware safety floor as a fraction of max capacity — fallback only, used
# when the box's live bat_min sensor (_resolve_proxy_bat_min_pct) is
# unavailable or implausible. Typically ~20% for CBB 3F Home Plus Premium.
_HW_MIN_FRACTION = 0.20
_MANIFEST_PATH = Path(__file__).resolve().parents[2] / "manifest.json"
_INTEGRATION_VERSION: str | None = None


def _build_planner_run_id(sensor: Any, bucket_start: datetime) -> str:
    box_id = str(getattr(sensor, "_box_id", "unknown") or "unknown").strip() or "unknown"
    return f"{box_id}:{bucket_start.isoformat()}"


def _planner_log_marker(level: str, correlation_id: str, run_id: str) -> str:
    return f"[OIG_CLOUD_{level}][component=planner][corr={correlation_id}][run={run_id}]"


def _resolve_planner_telemetry_emitter(sensor: Any) -> Any | None:
    entry = getattr(sensor, "_config_entry", None)
    entry_id = getattr(entry, "entry_id", None)
    if not entry_id:
        return None

    hass = getattr(sensor, "hass", None) or getattr(sensor, "_hass", None)
    hass_data = getattr(hass, "data", None)
    if not isinstance(hass_data, dict):
        return None

    entry_data = hass_data.get(DOMAIN, {}).get(entry_id, {})
    telemetry_state = entry_data.get("telemetry")
    if not isinstance(telemetry_state, dict):
        return None
    return telemetry_state.get("emitter")


def _resolve_install_id_hash(sensor: Any) -> str | None:
    hass = getattr(sensor, "hass", None) or getattr(sensor, "_hass", None)
    hass_data = getattr(hass, "data", None)
    if not isinstance(hass_data, dict):
        return None

    core_uuid = str(hass_data.get("core.uuid", "")).strip()
    if not core_uuid:
        return None
    return hashlib.sha256(core_uuid.encode("utf-8")).hexdigest()


def _resolve_integration_version() -> str:
    global _INTEGRATION_VERSION
    if _INTEGRATION_VERSION is not None:
        return _INTEGRATION_VERSION

    try:
        manifest = json.loads(_MANIFEST_PATH.read_text(encoding="utf-8"))
        _INTEGRATION_VERSION = str(manifest.get("version", "unknown"))
    except Exception:
        _INTEGRATION_VERSION = "unknown"
    return _INTEGRATION_VERSION


def _classify_planner_event_name(timeline: list[dict[str, Any]], mode_result: Any) -> str:
    if mode_result is None:
        return "planner_run_failed"
    if len(timeline) == 0:
        return "planner_run_empty"
    return "planner_run_completed"


def _normalize_planner_mode_name(mode: Any) -> str | None:
    raw_mode = CBB_MODE_NAMES.get(mode) if isinstance(mode, int) else mode
    if not isinstance(raw_mode, str):
        return None
    normalized = raw_mode.strip().upper().replace("_", " ")
    return " ".join(normalized.split()) or None


def _normalize_planner_detail_reason(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower().replace("-", "_").replace(" ", "_")
    if normalized in DETAIL_ENUMS["detail_reason"]:
        return normalized
    return None


def _build_planner_summary_diagnostics(
    sensor: Any,
    timeline: list[dict[str, Any]],
    mode_result: dict[str, Any] | None,
) -> dict[str, Any]:
    charging_metrics = dict(getattr(sensor, "_charging_metrics", {}) or {})
    decision_trace = charging_metrics.get("planner_decision_trace")
    decision_count = len(decision_trace) if isinstance(decision_trace, list) else 0

    diagnostics: dict[str, Any] = {
        "metric_decisions_count": decision_count,
        "metric_guard_override_count": 0,
    }

    if mode_result is not None:
        _apply_mode_result_diagnostics(diagnostics, mode_result)
        _apply_decision_trace_diagnostics(diagnostics, decision_trace)
    else:
        _apply_planner_failure_diagnostics(diagnostics, charging_metrics)

    return diagnostics


def _apply_mode_result_diagnostics(
    diagnostics: dict[str, Any], mode_result: dict[str, Any]
) -> None:
    _set_float_diagnostic(diagnostics, mode_result, "planning_min_kwh", "metric_planning_min_kwh")
    _set_float_diagnostic(diagnostics, mode_result, "target_kwh", "metric_target_soc_kwh")

    infeasible = mode_result.get("infeasible")
    if isinstance(infeasible, bool):
        diagnostics["metric_infeasible"] = infeasible

    _apply_mode_count_diagnostics(diagnostics, mode_result.get("optimal_modes"))


def _set_float_diagnostic(
    diagnostics: dict[str, Any],
    source: dict[str, Any],
    source_key: str,
    target_key: str,
) -> None:
    value = source.get(source_key)
    if isinstance(value, (int, float)):
        diagnostics[target_key] = float(value)


def _apply_mode_count_diagnostics(
    diagnostics: dict[str, Any], optimal_modes: Any
) -> None:
    if not isinstance(optimal_modes, list):
        diagnostics["metric_home_i_count"] = 0
        diagnostics["metric_home_iii_count"] = 0
        diagnostics["metric_home_ups_count"] = 0
        return

    normalized_modes = [_normalize_planner_mode_name(mode) for mode in optimal_modes]
    diagnostics["metric_home_i_count"] = normalized_modes.count("HOME I")
    diagnostics["metric_home_iii_count"] = normalized_modes.count("HOME III")
    diagnostics["metric_home_ups_count"] = normalized_modes.count("HOME UPS")


def _apply_decision_trace_diagnostics(
    diagnostics: dict[str, Any], decision_trace: Any
) -> None:
    if not isinstance(decision_trace, list) or not decision_trace:
        return

    first_trace = decision_trace[0]
    strategy = first_trace.get("strategy")
    if isinstance(strategy, str):
        normalized_strategy = strategy.strip().upper()
        if normalized_strategy in DETAIL_ENUMS["detail_strategy"]:
            diagnostics["detail_strategy"] = normalized_strategy

    reason = _normalize_planner_detail_reason(first_trace.get("reason"))
    if reason is not None:
        diagnostics["detail_reason"] = reason


def _apply_planner_failure_diagnostics(
    diagnostics: dict[str, Any], charging_metrics: dict[str, Any]
) -> None:
    failure_class = charging_metrics.get("planner_failure_class")
    if isinstance(failure_class, str) and failure_class.strip():
        diagnostics["detail_failure_class"] = failure_class.strip()
        diagnostics["detail_failure_summary"] = build_failure_summary(
            failure_class.strip()
        )


async def _emit_planner_summary_event(
    sensor: Any,
    *,
    bucket_start: datetime,
    timeline: list[dict[str, Any]],
    mode_result: dict[str, Any] | None,
) -> None:
    entry = getattr(sensor, "_config_entry", None)
    if entry is None:
        return
    if resolve_no_telemetry(entry):
        return

    run_id = _build_planner_run_id(sensor, bucket_start)
    correlation_id = run_id
    warning_marker = _planner_log_marker("WARNING", correlation_id, run_id)

    emitter = _resolve_planner_telemetry_emitter(sensor)
    if emitter is None:
        return

    device_id = resolve_telemetry_device_id(entry)
    if device_id is None:
        _LOGGER.warning(
            "%s Planner telemetry skipped because device_id is unavailable",
            warning_marker,
        )
        return

    install_id_hash = _resolve_install_id_hash(sensor)
    if install_id_hash is None:
        _LOGGER.warning(
            "%s Planner telemetry skipped because install_id_hash is unavailable",
            warning_marker,
        )
        return

    try:
        event = build_producer_event(
            event_name=_classify_planner_event_name(timeline, mode_result),
            occurred_at=dt_util.now().isoformat(),
            device_id=device_id,
            install_id_hash=install_id_hash,
            integration_version=_resolve_integration_version(),
            run_id=run_id,
            correlation_id=correlation_id,
            diagnostics=_build_planner_summary_diagnostics(sensor, timeline, mode_result),
        )
        emit_result = await emitter.emit_cloud_event(event)
        if emit_result is False:
            _LOGGER.warning(
                "%s Planner telemetry was not delivered by the configured emitter",
                warning_marker,
            )
    except Exception as err:
        _LOGGER.warning(
            "%s Planner telemetry emission failed: %s",
            warning_marker,
            err,
            exc_info=True,
        )


def _resolve_proxy_bat_min_pct(sensor: Any) -> Optional[float]:
    """Read the BOX bat_min trigger (%) from the local-proxy sensor if available.

    Entity: ``sensor.oig_local_{box_id}_tbl_batt_prms_bat_min``. Cloud-only
    installs do not have it; callers use the configured fallback fraction
    (20 % by default). Returned
    as a plain float so the pure planning layer stays HA-agnostic.
    """
    try:
        box_id = getattr(sensor, "_box_id", None)
        if not box_id:
            return None
        hass = getattr(sensor, "hass", None) or getattr(sensor, "_hass", None)
        if hass is None:
            return None
        entity_id = f"sensor.oig_local_{box_id}_tbl_batt_prms_bat_min"
        state = hass.states.get(entity_id)
        if state is None or state.state in {"unknown", "unavailable", "", None}:
            return None
        value = float(state.state)
        if 0.0 < value < 100.0:
            return value
    except (TypeError, ValueError, AttributeError):
        pass
    return None


def _resolve_hw_min_kwh(
    sensor_min_kwh: Optional[float],
    max_capacity: float,
    *,
    fallback_fraction: Optional[float] = None,
    correlation_id: str | None = None,
    run_id: str | None = None,
) -> float:
    """Hardware minimum capacity (kWh): sensor > config > constant fallback.

    ``sensor_min_kwh`` is the box-reported bat_min trigger already converted
    to kWh (see ``_resolve_proxy_bat_min_pct``). Plausibility guards against
    sensor glitches (stuck at 0, or reporting >= max_capacity). The configured
    fraction is used only when the sensor is missing or implausible. Never
    raises — a missing/bad sensor or option must not crash planning.
    """
    if sensor_min_kwh is not None and 0 < sensor_min_kwh < max_capacity:
        return sensor_min_kwh

    try:
        configured_fraction = float(
            _HW_MIN_FRACTION if fallback_fraction is None else fallback_fraction
        )
    except (TypeError, ValueError):
        configured_fraction = _HW_MIN_FRACTION
    if not math.isfinite(configured_fraction) or not 0.0 < configured_fraction < 1.0:
        configured_fraction = _HW_MIN_FRACTION

    _LOGGER.warning(
        "%s hw_min sensor unavailable or implausible (value=%s, max_capacity=%.2f kWh); "
        "using %.0f%% fallback",
        _planner_log_marker("WARNING", correlation_id or "unknown", run_id or "unknown"),
        sensor_min_kwh,
        max_capacity,
        configured_fraction * 100.0,
    )
    return max_capacity * configured_fraction


# The BOX itself force-balances (uncontrolled grid charge to ~full) whenever
# the battery DWELLS at its bat_min trigger for ~1 h (user-observed). The plan
# must therefore never AIM at the trigger: the defended planning floor sits a
# safety margin above it, so the box logic simply never fires. The margin also
# absorbs the measured ~1 h sim-vs-reality drift toward the floor.
BOX_FLOOR_SAFETY_MARGIN_PCT = 2.0


def _derive_planning_min_percent(
    hw_min_percent: float,
    proxy_bat_min_pct: Optional[float],
    safety_margin_pct: float = BOX_FLOOR_SAFETY_MARGIN_PCT,
) -> float:
    """Planning floor = box trigger + safety margin (never below hw floor).

    Prevention by construction: the existing proactive floor defense
    (cheapest-window pre-charging) keeps the trajectory above this floor, so
    "drain to the box trigger and wait" can never appear in a plan. No box
    behavior emulation, no post-hoc plan patching.
    """
    trigger_pct = proxy_bat_min_pct if proxy_bat_min_pct is not None else hw_min_percent
    return max(hw_min_percent, trigger_pct + safety_margin_pct)


def _round_trip_to_directional(efficiency: float) -> float:
    """Convert round-trip efficiency to a single-direction factor."""
    try:
        eff_val = float(efficiency)
    except (TypeError, ValueError):
        return 0.0
    if eff_val <= 0:
        return 0.0
    if eff_val > 1.0:
        eff_val = 1.0
    return math.sqrt(eff_val)


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
    if (
        sensor._last_forecast_bucket == bucket_start
        and not getattr(sensor, "_profiles_dirty", False)
    ):
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
    prices: list[dict[str, Any]],
    current_interval_naive: datetime,
    label: str,
    sensor: Any,
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
    spot_prices = _filter_price_timeline(
        spot_prices, current_interval_naive, "spot", sensor
    )

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
    today: date,
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
            "[OIG_CLOUD_WARNING][component=planner][corr=na][run=na] "
            "Failed to get load for %s: %s",
            spot_price.get("time"),
            exc,
        )  # pragma: no cover
        load_forecast.append(0.125)  # pragma: no cover


async def _maybe_apply_consumption_boost(
    adaptive_helper: AdaptiveConsumptionHelper,
    adaptive_profiles: dict[str, Any] | None,
    load_forecast: list[float],
) -> None:
    # Profile-based reality ratio (needs a learned daily profile)…
    profile_ratio = None
    if adaptive_profiles:
        profile_ratio = await adaptive_helper.calculate_recent_consumption_ratio(
            adaptive_profiles
        )
    # …and a profile-independent observed ratio (today's real consumption rate
    # vs the near-term forecast). The observed signal is the safety net: without
    # it, a missing or optimistic profile silently suppressed the boost, so the
    # planner kept planning zero grid import and never pre-charged for the
    # evening (the box would coast to empty on a hot day — see field reports).
    observed_ratio = await adaptive_helper.calculate_observed_consumption_ratio(
        load_forecast
    )

    # Use the STRONGER upward signal: under-predicting consumption is the costly
    # failure (no pre-charge → expensive evening import), so we never let a
    # benign profile ratio mask a real overrun. The down-correction (cooler than
    # predicted → avoid over-charging) still applies when only the profile ratio
    # is available.
    candidates = [r for r in (profile_ratio, observed_ratio) if r]
    if not candidates:
        return
    recent_ratio = max(candidates)

    if recent_ratio > 1.1 or recent_ratio < 0.9:
        adaptive_helper.apply_consumption_boost_to_forecast(load_forecast, recent_ratio)


def _read_boiler_grid_load_overlay(sensor: Any) -> dict[datetime, float]:
    """Return {slot_start: boiler_load_kwh} from the boiler runtime's last plan.

    Reads boiler runtime via hass.data boundary (same pattern as F1 battery→boiler
    signal, reversed).  Returns {} silently on any error or when the boiler
    module is not configured — this is always a soft dependency.

    One-cycle lag: the boiler plan is from the *previous* planner cycle.  The
    first battery forecast after a new plan will see zero boiler load; this is
    intentional and documented in the design.

    Included: grid_kwh (normal grid heating) AND battery_kwh (R3 Home 5 maneuver
    — battery is behind the inverter, so boiler battery load is a real inverter
    discharge load that must be accounted for in the battery sim).
    Excluded: pv_kwh (FVE overflow) — the battery sim already accounts for PV
    export; adding it would double-count and inflate the charging target.

    Note: adaptive_profiles already capture historical boiler grid consumption.
    The overlay intentionally adds PLANNED future load on top; this over-estimates
    total draw by up to one boiler heating cycle worth of kWh in steady-state,
    causing modest over-charging (self-limiting at battery max capacity).
    Accepted trade-off per R6 design.
    """
    try:
        hass = getattr(sensor, "hass", None) or getattr(sensor, "_hass", None)
        if hass is None:
            return {}

        hass_data = getattr(hass, "data", None)
        if not isinstance(hass_data, dict):
            return {}

        from ...const import DOMAIN, KEY_BOILER_RUNTIMES

        runtimes_by_entry: dict[str, Any] = {}
        for entry_id, entry_data in hass_data.get(DOMAIN, {}).items():
            if not isinstance(entry_data, dict):
                continue
            runtimes = entry_data.get(KEY_BOILER_RUNTIMES, {})
            if isinstance(runtimes, dict):
                runtimes_by_entry.update(runtimes)

        overlay: dict[datetime, float] = {}
        for _key, runtime in runtimes_by_entry.items():
            plan_result = getattr(runtime, "last_plan_result", None)
            if plan_result is None:
                continue
            for slot in getattr(plan_result, "slots", []):
                # Include grid_kwh + battery_kwh; exclude pv_kwh.
                grid_kwh = getattr(slot, "grid_kwh", 0.0)
                battery_kwh = getattr(slot, "battery_kwh", 0.0)
                load_kwh = (grid_kwh or 0.0) + (battery_kwh or 0.0)
                if load_kwh <= 0.0:
                    continue
                slot_start = slot.start
                # Normalise to tz-aware local time for key matching with the
                # spot_prices timestamps (which are parsed as local-aware by
                # _append_load_for_price).
                if slot_start.tzinfo is None:
                    slot_start = dt_util.as_local(slot_start)
                overlay[slot_start] = overlay.get(slot_start, 0.0) + load_kwh

        return overlay

    except Exception as exc:
        _LOGGER.debug("_read_boiler_grid_load_overlay skipped: %s", exc)
        return {}


def _apply_boiler_grid_load_overlay(
    sensor: Any,
    spot_prices: list[dict[str, Any]],
    load_forecast: list[float],
) -> None:
    """Add boiler planned grid-heating kWh into the load forecast in place.

    Matches boiler slot timestamps against spot_price[i]["time"] by converting
    both sides to tz-aware local datetimes.  Unmatched slots are silently
    ignored (they may be outside the planning horizon).
    """
    overlay = _read_boiler_grid_load_overlay(sensor)
    if not overlay:
        return

    for i, sp in enumerate(spot_prices):
        if i >= len(load_forecast):
            break
        try:
            ts = datetime.fromisoformat(sp["time"])
            if ts.tzinfo is None:
                ts = dt_util.as_local(ts)
            boiler_kwh = overlay.get(ts, 0.0)
            if boiler_kwh > 0.0:
                load_forecast[i] += boiler_kwh
        except Exception:
            pass  # Defensive; never crash the forecast pipeline.


def _resolve_load_kwh(
    sensor: Any,
    timestamp: datetime,
    adaptive_profiles: dict[str, Any] | None,
    load_avg_sensors: Any,
    *,
    today: date,
) -> float:
    if not adaptive_profiles:
        return get_load_avg_for_timestamp(
            timestamp,
            load_avg_sensors,
            state=sensor,
        )

    profile = _select_adaptive_profile(adaptive_profiles, timestamp, today)
    if not profile:
        return get_load_avg_for_timestamp(
            timestamp,
            load_avg_sensors,
            state=sensor,
        )

    hourly_kwh = _hourly_kwh_from_profile(sensor, profile, timestamp)
    if hourly_kwh is None:
        return get_load_avg_for_timestamp(
            timestamp,
            load_avg_sensors,
            state=sensor,
        )
    return hourly_kwh / 4.0


def _select_adaptive_profile(
    adaptive_profiles: dict[str, Any],
    timestamp: datetime,
    today: date,
) -> dict[str, Any] | None:
    today_profile = adaptive_profiles.get("today_profile")
    tomorrow_profile = adaptive_profiles.get("tomorrow_profile")
    if timestamp.date() == today:
        return today_profile or tomorrow_profile
    return tomorrow_profile or today_profile


def _profile_has_hourly_series(profile: Any) -> bool:
    if not isinstance(profile, dict):
        return False
    hourly_consumption = profile.get("hourly_consumption")
    return isinstance(hourly_consumption, (list, dict)) and bool(hourly_consumption)


def _profile_avg_kwh_h(profile: Any) -> float | None:
    if not isinstance(profile, dict) or "avg_kwh_h" not in profile:
        return None
    value = profile.get("avg_kwh_h")
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _has_usable_adaptive_profiles(adaptive_profiles: Any) -> bool:
    if not isinstance(adaptive_profiles, dict):
        return False
    for profile_key in ("today_profile", "tomorrow_profile"):
        profile = adaptive_profiles.get(profile_key)
        if _profile_has_hourly_series(profile) or _profile_avg_kwh_h(profile) is not None:
            return True
    return False


def _hourly_kwh_from_profile(
    sensor: Any, profile: dict[str, Any], timestamp: datetime
) -> float | None:
    hour = timestamp.hour
    start_hour = profile.get("start_hour", 0)
    index = hour - start_hour
    hourly_consumption = profile.get("hourly_consumption")
    if isinstance(hourly_consumption, list) and 0 <= index < len(hourly_consumption):
        return float(hourly_consumption[index])
    if isinstance(hourly_consumption, dict):
        value = hourly_consumption.get(hour)
        if value is None:
            value = hourly_consumption.get(index)
        if value is not None:
            try:
                return float(value)
            except (TypeError, ValueError):
                pass

    avg_kwh_h = _profile_avg_kwh_h(profile)
    if avg_kwh_h is not None:
        sensor._log_rate_limited(
            "adaptive_profile_oob",
            "debug",
            "Adaptive profile hour out of range: hour=%s start=%s len=%s (using avg)",
            hour,
            start_hour,
            len(hourly_consumption) if isinstance(hourly_consumption, (list, dict)) else 0,
            cooldown_s=900.0,
        )
        return avg_kwh_h

    sensor._log_rate_limited(
        "adaptive_profile_missing_data",
        "debug",
        "Adaptive profile missing usable data: hour=%s start=%s (falling back to load_avg)",
        hour,
        start_hour,
        cooldown_s=900.0,
    )
    return None


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


async def _get_recent_solar_ratio(
    sensor: Any, solar_forecast: Any, hours: int = 2
) -> Optional[float]:
    """Actual solar produced over the last N hours vs what the forecast predicted
    for the same window. >1 = sunnier than forecast, <1 = cloudier. None on any
    data gap (caller then skips the correction)."""
    from datetime import timedelta

    try:
        from homeassistant.components.recorder.history import get_significant_states
        from homeassistant.helpers.recorder import get_instance

        from ..data.history import _calc_delta_kwh

        box_id = sensor._box_id  # pylint: disable=protected-access
        now = dt_util.now()
        start = now - timedelta(hours=hours)
        eid = f"sensor.oig_{box_id}_dc_in_fv_ad"

        instance = get_instance(sensor._hass)  # pylint: disable=protected-access
        states = await instance.async_add_executor_job(
            get_significant_states, sensor._hass, start, now, [eid], None, True
        )
        series = states.get(eid, []) if states else []
        actual_kwh = _calc_delta_kwh(series, start, now)
        if not actual_kwh or actual_kwh <= 0:
            return None

        forecast_kwh = 0.0
        for k in range(hours * 4):
            ts = dt_util.as_local(start + timedelta(minutes=15 * k))
            forecast_kwh += get_solar_for_timestamp(
                ts, solar_forecast, log_rate_limited=sensor._log_rate_limited
            )
        if forecast_kwh <= 0:
            return None

        ratio = actual_kwh / forecast_kwh
        _LOGGER.debug(
            "[SolarForecast] Recent solar ratio (last %dh): actual=%.2f kWh, "
            "forecast=%.2f kWh → %.2fx",
            hours,
            actual_kwh,
            forecast_kwh,
            ratio,
        )
        return ratio
    except Exception as err:  # pragma: no cover - recorder/runtime guard
        _LOGGER.debug("Solar ratio calculation failed: %s", err)
        return None


async def _maybe_apply_solar_correction(
    sensor: Any,
    adaptive_helper: AdaptiveConsumptionHelper,
    solar_forecast: Any,
    solar_kwh_list: list[float],
) -> None:
    """Damp same-day solar drift into the forward solar list (dead band 0.85–1.15),
    mirroring the consumption boost. Prevents an under-forecast (sunnier than
    Solcast) from forcing unnecessary grid-charging, and lets a cloudier-than-
    forecast day pull in protective charging earlier."""
    ratio = await _get_recent_solar_ratio(sensor, solar_forecast)
    if ratio and (ratio > 1.15 or ratio < 0.85):
        adaptive_helper.apply_solar_correction_to_forecast(solar_kwh_list, ratio)


def _interval_day_indices(
    spot_prices: list[dict[str, Any]],
) -> Optional[List[int]]:
    """0-based day index (0=first day, 1=next, …) per interval from the price
    timestamps. Returns None on any parse failure so the planner falls back to a
    whole-horizon percentile."""
    days: List[int] = []
    first_date: Optional[date] = None
    for point in spot_prices:
        ts = point.get("time")
        if not ts:
            return None
        try:
            point_date = datetime.fromisoformat(str(ts).replace("Z", "+00:00")).date()
        except (ValueError, TypeError):
            return None
        if first_date is None:
            first_date = point_date
        days.append((point_date - first_date).days)
    return days or None


def _run_planner(
    sensor: Any,
    spot_prices: list[dict[str, Any]],
    export_prices: list[dict[str, Any]],
    load_forecast: list[float],
    solar_kwh_list: list[float],
    current_capacity: float,
    max_capacity: float,
    *,
    run_id: str | None = None,
    correlation_id: str | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any] | None, list[dict[str, Any]]]:
    try:
        max_intervals = 36 * 4
        if len(spot_prices) > max_intervals:
            spot_prices = spot_prices[:max_intervals]
            export_prices = export_prices[:max_intervals]
            load_forecast = load_forecast[:max_intervals]
            solar_kwh_list = solar_kwh_list[:max_intervals]

        opts = sensor._config_entry.options if sensor._config_entry else {}
        # NOTE: the `battery_efficiency` sensor measures DC/coulombic efficiency
        # (~99%) from the battery's own charge/discharge energy counters — it is
        # NOT the AC round-trip (grid -> house) the planner economics need, which
        # also pays the inverter conversion losses both ways (~84% total). Use the
        # planner's AC round-trip constant consistently for the η-gate, the
        # displayed timeline and the mode guard so they all agree with the cost
        # simulation (_simulate_interval). The DC sensor stays a battery-health
        # metric only.
        directional_efficiency = _round_trip_to_directional(
            DEFAULT_ROUND_TRIP_EFFICIENCY
        )
        home_charge_rate_kw = float(opts.get("home_charge_rate", 2.8))
        # Sensor-first: the box's own bat_min trigger (%) is the true hardware
        # floor. Converted to kWh and validated for plausibility; falls back
        # to the configured fallback fraction (20% by default) when the sensor
        # is unavailable/implausible (see _resolve_hw_min_kwh). Reused below for
        # planning_min_percent, so the sensor is read once, not twice.
        proxy_bat_min_pct = _resolve_proxy_bat_min_pct(sensor)
        sensor_min_kwh = (
            max_capacity * proxy_bat_min_pct / 100.0
            if proxy_bat_min_pct is not None
            else None
        )
        hw_min_kwh = _resolve_hw_min_kwh(
            sensor_min_kwh,
            max_capacity,
            fallback_fraction=opts.get("hw_min_fraction", _HW_MIN_FRACTION),
            correlation_id=correlation_id,
            run_id=run_id,
        )
        hw_min_percent = (hw_min_kwh / max_capacity) * 100.0 if max_capacity > 0 else 20.0
        # Floor defense protects the hardware safety minimum PLUS a small
        # margin above the BOX bat_min trigger: dwelling at the trigger makes
        # the box force-balance from grid uncontrolled, so the plan must never
        # aim at it (see _derive_planning_min_percent). Any reserve above this
        # floor is still built purely by cost-gated displacement — no fixed
        # backup that forces uneconomic grid charging. The legacy
        # `min_capacity_percent` option no longer raises this floor.
        planning_min_percent = _derive_planning_min_percent(
            hw_min_percent,
            proxy_bat_min_pct,
            safety_margin_pct=float(
                opts.get("box_floor_safety_margin_pct", BOX_FLOOR_SAFETY_MARGIN_PCT)
            ),
        )

        # Comfort SoC target: keep a buffer well above the hard floor so the BOX
        # never force-charges to ~80% at any price when the battery dwells near
        # bat_min. Maintained ONLY from cheap windows (never expensive grid);
        # configurable %, default 50. 0 disables it.
        comfort_pct = float(opts.get("battery_comfort_soc_percent", 50.0))
        comfort_pct = max(0.0, min(95.0, comfort_pct))
        comfort_soc_kwh = max_capacity * (comfort_pct / 100.0)

        # Per-interval day index (0=today, 1=tomorrow, …) from price timestamps,
        # so the expensive-price percentile is computed per day, not blended
        # across a cheap day + an expensive day.
        interval_days = _interval_day_indices(spot_prices)

        planner_inputs = PlannerInputs(
            current_soc_kwh=current_capacity,
            max_capacity_kwh=max_capacity,
            hw_min_kwh=hw_min_kwh,
            planning_min_percent=planning_min_percent,
            charge_rate_kw=home_charge_rate_kw,
            intervals=[{"index": i} for i in range(len(spot_prices))],
            prices=[float(point.get("price", 0.0) or 0.0) for point in spot_prices],
            solar_forecast=list(solar_kwh_list),
            load_forecast=list(load_forecast),
            expensive_percentile=float(opts.get("expensive_percentile", 0.70)),
            # round_trip_efficiency defaults to the AC round-trip constant
            # (DEFAULT_ROUND_TRIP_EFFICIENCY), matching _simulate_interval — see
            # the directional_efficiency note above.
            interval_days=interval_days,
            comfort_soc_kwh=comfort_soc_kwh,
        )

        result = plan_battery_schedule(planner_inputs)
        charging_metrics = dict(getattr(sensor, "_charging_metrics", {}) or {})
        charging_metrics.pop("planner_failure_class", None)
        charging_metrics["planner_decision_trace"] = build_planner_decision_trace(
            result.decisions, planner_inputs
        )
        sensor._charging_metrics = charging_metrics

        planning_min_kwh = planner_inputs.planning_min_kwh
        lock_until, lock_modes = mode_guard_module.build_plan_lock(
            now=dt_util.now(),
            spot_prices=spot_prices,
            modes=result.modes,
            mode_guard_minutes=int(opts.get("mode_guard_minutes", MODE_GUARD_MINUTES)),
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
                efficiency=directional_efficiency,
                home_charge_rate_kw=home_charge_rate_kw,
                planning_min_kwh=planning_min_kwh,
                lock_modes=lock_modes,
                guard_until=lock_until,
                log_rate_limited=sensor._log_rate_limited,
            )
        )
        # Enforce minimum mode duration after guard (prevents short UPS blocks)
        guarded_modes = mode_guard_module.enforce_min_mode_duration(
            guarded_modes,
            mode_names=CBB_MODE_NAMES,
            min_mode_duration=MIN_MODE_DURATION,
            logger=_LOGGER,
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
            efficiency=directional_efficiency,
            home_charge_rate_kw=home_charge_rate_kw,
            log_rate_limited=sensor._log_rate_limited,
        )
        attach_planner_reasons(timeline, result.decisions)
        add_decision_reasons_to_timeline(
            timeline,
            current_capacity=current_capacity,
            max_capacity=max_capacity,
            min_capacity=planning_min_kwh,
            efficiency=directional_efficiency,
        )
        mode_guard_module.apply_guard_reasons_to_timeline(
            timeline,
            guard_overrides,
            guard_until,
            None,
            mode_names=CBB_MODE_NAMES,
        )
        mode_recommendations = sensor._create_mode_recommendations(
            timeline, hours_ahead=48
        )
        # Real cost + savings vs the do-nothing (all HOME I) baseline over the
        # planning horizon. These feed the Ceny "savings vs Home 1" tile, which
        # previously always read missing keys and showed 0.
        plan_total_cost = float(getattr(result, "total_cost", 0.0) or 0.0)
        try:
            baseline_total_cost = sum(
                state.cost_czk for state in simulate_home_i_detailed(planner_inputs)
            )
        except Exception:  # pragma: no cover - defensive
            baseline_total_cost = plan_total_cost
        savings_vs_home_i = baseline_total_cost - plan_total_cost
        mode_result = {
            "optimal_timeline": timeline,
            "optimal_modes": guarded_modes,
            "planner": "economic_planner",
            "total_cost": round(plan_total_cost, 2),
            "total_cost_48h": round(plan_total_cost, 2),
            "total_savings_48h": round(savings_vs_home_i, 2),
            "planning_min_kwh": planning_min_kwh,
            "target_kwh": planning_min_kwh,
            # Emergent dynamic reserve: the peak SoC the plan deliberately builds
            # (via cheap grid pre-charging) to bridge upcoming expensive/low-PV
            # windows — higher than the static floor when displacement kicks in.
            "dynamic_reserve_kwh": round(
                max(
                    (s.soc_kwh for s in (getattr(result, "states", None) or [])),
                    default=planning_min_kwh,
                ),
                3,
            ),
            "infeasible": False,
            "infeasible_reason": None,
        }
        return timeline, mode_result, mode_recommendations
    except Exception as err:
        charging_metrics = dict(getattr(sensor, "_charging_metrics", {}) or {})
        charging_metrics["planner_failure_class"] = err.__class__.__name__
        charging_metrics["planner_decision_trace"] = []
        sensor._charging_metrics = charging_metrics
        if run_id is not None and correlation_id is not None:
            _LOGGER.error(
                "%s Planner failed: %s",
                _planner_log_marker("ERROR", correlation_id, run_id),
                err,
                exc_info=True,
            )
        else:
            _LOGGER.error(
                "[OIG_CLOUD_ERROR][component=planner][corr=na][run=na] "
                "Planner failed: %s",
                err,
                exc_info=True,
            )
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


def _normalize_ts_to_aware(ts_str: str) -> str:
    """Parse an ISO timestamp string and return a tz-aware ISO string.

    OTE produces naive strings such as ``"2026-06-10T08:15:00"``.  These must be
    normalized to tz-aware local time before being stored as keys in the
    ``spot_prices_czk_kwh`` dict so that boiler runtime can compare them against
    tz-aware ``slot.start`` values without a silent mismatch (naive != aware dict
    lookup would always miss).
    """
    dt = datetime.fromisoformat(ts_str)
    if dt.tzinfo is None:
        dt = dt_util.as_local(dt)
    return dt.isoformat()


def _derive_spot_prices_czk_kwh(
    timeline_data: list[dict[str, Any]],
) -> dict[str, float]:
    """Build {ISO-timestamp: price} dict from planner timeline for boiler consumption.

    Timestamps are normalized to tz-aware local time so that boiler runtime can
    compare them directly against tz-aware ``slot.start`` keys without a silent
    mismatch (naive != aware).
    """
    result: dict[str, float] = {}
    for entry in timeline_data:
        ts_str = entry.get("time") or entry.get("timestamp")
        price = entry.get("spot_price")
        if ts_str and price is not None:
            try:
                ts_aware = _normalize_ts_to_aware(str(ts_str))
                result[ts_aware] = float(price)
            except (TypeError, ValueError):
                continue
    return result


def _derive_overflow_windows(
    timeline_data: list[dict[str, Any]],
    max_capacity_kwh: Optional[float],
) -> list[dict[str, str]]:
    """Derive overflow windows from timeline: contiguous slots where solar > load AND battery full.

    Each window is a dict with 'start' and 'end' ISO-string keys.  Both values
    are normalized to tz-aware local time so that boiler planner_core can
    compare them with tz-aware ``slot.start`` / ``slot.end`` values without a
    ``TypeError`` in ``_overlap_fraction``.

    The 15-min slot interval length is inferred from consecutive timestamps;
    defaults to 15 minutes when only a single entry is present.
    """
    from datetime import timedelta as _timedelta

    if not timeline_data:
        return []

    # Determine slot duration from first two timestamps (default 15 min).
    slot_minutes = 15
    if len(timeline_data) >= 2:
        try:
            t0 = datetime.fromisoformat(
                str(timeline_data[0].get("time") or timeline_data[0].get("timestamp") or "")
            )
            t1 = datetime.fromisoformat(
                str(timeline_data[1].get("time") or timeline_data[1].get("timestamp") or "")
            )
            diff = int((t1 - t0).total_seconds() / 60)
            if diff > 0:
                slot_minutes = diff
        except Exception:
            pass

    _OVERFLOW_SOC_FRAC = 0.98  # treat battery as "full" at ≥98 % of max

    windows: list[dict[str, str]] = []
    run_start: Optional[str] = None
    run_last: Optional[str] = None  # start of the last overflow slot in the current run

    def _close_run(start: str, last: str) -> dict[str, str]:
        """Return a window dict with tz-aware ISO strings; end = last-slot-start + slot_minutes."""
        try:
            last_dt = datetime.fromisoformat(last)
            if last_dt.tzinfo is None:
                last_dt = dt_util.as_local(last_dt)
            end_str = (last_dt + _timedelta(minutes=slot_minutes)).isoformat()
        except Exception:
            end_str = last
        # Normalize start to tz-aware as well.
        try:
            start_dt = datetime.fromisoformat(start)
            if start_dt.tzinfo is None:
                start_dt = dt_util.as_local(start_dt)
            start_norm = start_dt.isoformat()
        except Exception:
            start_norm = start
        return {"start": start_norm, "end": end_str}

    for entry in timeline_data:
        ts_str = entry.get("time") or entry.get("timestamp")
        if not ts_str:
            if run_start is not None and run_last is not None:
                windows.append(_close_run(run_start, run_last))
                run_start = None
                run_last = None
            continue

        solar = float(entry.get("solar_kwh", 0.0) or 0.0)
        load = float(entry.get("load_kwh", 0.0) or 0.0)
        soc = float(entry.get("battery_capacity_kwh", 0.0) or 0.0)

        is_overflow = solar > load
        if max_capacity_kwh and max_capacity_kwh > 0:
            is_overflow = is_overflow and (soc >= max_capacity_kwh * _OVERFLOW_SOC_FRAC)

        if is_overflow:
            if run_start is None:
                run_start = str(ts_str)
            run_last = str(ts_str)
        else:
            if run_start is not None and run_last is not None:
                windows.append(_close_run(run_start, run_last))
                run_start = None
                run_last = None

    # Close any trailing run.
    if run_start is not None and run_last is not None:
        windows.append(_close_run(run_start, run_last))

    return windows


def _save_forecast_to_coordinator(sensor: Any) -> None:
    if hasattr(sensor.coordinator, "battery_forecast_data"):
        timeline_data: list[dict[str, Any]] = sensor._timeline_data or []

        # Derive boiler-consumable price dict and overflow windows from the
        # planner timeline so the boiler module does not need to iterate
        # timeline_data itself.
        spot_prices_czk_kwh = _derive_spot_prices_czk_kwh(timeline_data)
        max_cap = None
        try:
            max_cap = sensor._get_max_battery_capacity()
        except Exception:
            pass
        overflow_windows = _derive_overflow_windows(timeline_data, max_cap)

        # R3: derive battery_usable_kwh = max(0, current − min_capacity).
        # Published so the boiler planner can use it for Home 5 maneuver sizing.
        battery_usable_kwh: Optional[float] = None
        current_cap: Optional[float] = None
        try:
            current_cap = sensor._get_current_battery_capacity()
            min_cap = sensor._get_min_battery_capacity()
            if current_cap is not None and min_cap is not None:
                battery_usable_kwh = max(0.0, float(current_cap) - float(min_cap))
        except Exception:
            pass  # defensive: leave None so boiler skips maneuver

        forecast_data: dict[str, Any] = {
            "timeline_data": timeline_data,
            "calculation_time": sensor._last_update.isoformat(),
            "data_source": "simplified_calculation",
            "current_battery_kwh": (
                round(float(current_cap), 2)
                if current_cap is not None
                else (
                    timeline_data[0].get("battery_capacity_kwh", 0)
                    if timeline_data
                    else 0
                )
            ),
            "mode_recommendations": sensor._mode_recommendations or [],
            # Boiler integration: pre-derived keys so boiler runtime never
            # needs to inspect timeline_data directly.
            "spot_prices_czk_kwh": spot_prices_czk_kwh,
            "overflow_windows": overflow_windows,
        }
        if battery_usable_kwh is not None:
            forecast_data["battery_usable_kwh"] = battery_usable_kwh
        # Propagate decision_trace from charging metrics if present (backward compatible)
        if hasattr(sensor, "_charging_metrics") and sensor._charging_metrics:
            decision_trace = sensor._charging_metrics.get("decision_trace")
            if decision_trace is not None:
                forecast_data["decision_trace"] = decision_trace
            planner_decision_trace = sensor._charging_metrics.get("planner_decision_trace")
            if planner_decision_trace is not None:
                forecast_data["planner_decision_trace"] = planner_decision_trace
        sensor.coordinator.battery_forecast_data = forecast_data
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


async def _prepare_forecast_inputs(sensor: Any, bucket_start: datetime) -> Optional[
    tuple[
        float,
        float,
        float,
        list[dict[str, Any]],
        list[dict[str, Any]],
        Any,
        Any,
        AdaptiveConsumptionHelper,
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
        _LOGGER.warning(
            "[OIG_CLOUD_WARNING][component=planner][corr=na][run=na] "
            "No spot prices available - forecast will use fallback prices"
        )

    load_forecast = await _build_load_forecast(
        sensor,
        spot_prices,
        adaptive_helper,
        adaptive_profiles,
        load_avg_sensors,
    )

    # R6: overlay boiler planned grid load (one-cycle lag — the boiler runtime
    # must have a plan_result from the previous cycle for this to take effect).
    # Overflow-sourced heating is excluded: it consumes PV surplus, not grid
    # load, and the battery sim already models export; adding it would double-
    # count and artificially inflate the charging target.
    _apply_boiler_grid_load_overlay(sensor, spot_prices, load_forecast)

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
    mark_bucket_done = False
    used_adaptive_profiles = False
    try:
        now_aware = dt_util.now()
        bucket_start = _bucket_start(now_aware)

        # Enforce single in-flight computation.
        if _should_skip_bucket(sensor, bucket_start):
            return

        planner_run_id = _build_planner_run_id(sensor, bucket_start)

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
        used_adaptive_profiles = _has_usable_adaptive_profiles(adaptive_profiles)

        # ONE PLANNER: single planning pipeline.

        # PHASE 2.8 + REFACTORING: Get target from new getter
        _resolve_target_and_soc(sensor, current_capacity, max_capacity, min_capacity)

        # Build load forecast list (kWh/15min for each interval)
        solar_kwh_list = _build_solar_kwh_list(sensor, spot_prices, solar_forecast)
        # Same-day reality correction: damp solar drift (sunnier/cloudier than
        # forecast) into the near-term solar list before planning.
        await _maybe_apply_solar_correction(
            sensor, adaptive_helper, solar_forecast, solar_kwh_list
        )
        timeline, mode_result, recommendations = _run_planner(
            sensor,
            spot_prices,
            export_prices,
            load_forecast,
            solar_kwh_list,
            current_capacity,
            max_capacity,
            run_id=planner_run_id,
            correlation_id=planner_run_id,
        )
        # M4: only mark the bucket complete once the planner actually produced a
        # timeline. A failed/empty run leaves the bucket open so the next tick
        # retries instead of silently skipping until the next 15-min boundary.
        mark_bucket_done = bool(timeline)
        await _emit_planner_summary_event(
            sensor,
            bucket_start=bucket_start,
            timeline=timeline,
            mode_result=mode_result,
        )
        _apply_planner_results(sensor, timeline, mode_result, recommendations)

        # PHASE 2.9: Fix daily plan at midnight for tracking (AFTER _timeline_data is set)
        await sensor._maybe_fix_daily_plan()

        _post_update_housekeeping(sensor, adaptive_profiles, adaptive_helper)

        # Notify dependent sensors (BatteryBalancing) that forecast is ready
        _dispatch_forecast_updated(sensor)

    except Exception as err:
        _LOGGER.error(
            "[OIG_CLOUD_ERROR][component=planner][corr=na][run=na] "
            "Error updating battery forecast: %s",
            err,
            exc_info=True,
        )
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
                if sensor._timeline_data and (
                    not getattr(sensor, "_profiles_dirty", False)
                    or used_adaptive_profiles
                ):
                    sensor._profiles_dirty = False
        except Exception:  # pragma: no cover
            pass  # nosec B110 pragma: no cover
        sensor._forecast_in_progress = False
