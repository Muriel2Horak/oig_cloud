"""Runtime orchestrator and domain boundary interfaces for boiler module."""

from __future__ import annotations

from collections.abc import Callable, Sequence
import logging
import math
import time
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta, time as datetime_time
from typing import Any, Optional, Protocol

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from ..const import (
    CONF_BOILER_ALT_COST_KWH,
    CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
    CONF_BOILER_CIRCULATION_ENABLED,
    CONF_BOILER_CIRCULATION_LEAD_MINUTES,
    CONF_BOILER_CIRCULATION_MAX_RUNS_PER_DAY,
    CONF_BOILER_CIRCULATION_MIN_GAP_MINUTES,
    CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
    CONF_BOILER_CIRCULATION_RUN_MINUTES,
    CONF_BOILER_COLD_INLET_TEMP_C,
    CONF_BOILER_CURRENT_POWER_ENTITY,
    CONF_BOILER_DEADLINE_TIME,
    CONF_BOILER_HAS_ALTERNATIVE_HEATING,
    CONF_BOILER_BATTERY_CYCLE_COST,
    CONF_BOILER_HOME5_MANEUVER_ENABLED,
    CONF_BOX_HAS_HOME56,
    CONF_BOILER_STRATIFICATION_MODE,
    CONF_BOILER_TARGET_TEMP_C,
    CONF_BOILER_MAX_TEMP_C,
    DEFAULT_BOILER_MAX_TEMP_C,
    CONF_BOILER_THERMAL_ARBITRAGE_ENABLED,
    CONF_BOILER_ALT_POWER_KW,
    CONF_BOILER_HEATER_POWER_KW_ENTITY,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    CONF_BOILER_TEMP_SENSOR_BOTTOM,
    CONF_BOILER_TEMP_SENSOR_TOP,
    CONF_BOILER_VOLUME_L,
    DEFAULT_BOILER_CIRCULATION_ENABLED,
    DEFAULT_BOILER_CIRCULATION_LEAD_MINUTES,
    DEFAULT_BOILER_CIRCULATION_MAX_RUNS_PER_DAY,
    DEFAULT_BOILER_CIRCULATION_MIN_GAP_MINUTES,
    DEFAULT_BOILER_CIRCULATION_RUN_MINUTES,
    DEFAULT_BOILER_COLD_INLET_TEMP_C,
    DEFAULT_BOILER_DEADLINE_TIME,
    DEFAULT_BOILER_BATTERY_CYCLE_COST,
    DEFAULT_BOILER_HOME5_MANEUVER_ENABLED,
    DEFAULT_BOX_HAS_HOME56,
    DEFAULT_BOILER_STRATIFICATION_MODE,
    DEFAULT_BOILER_TARGET_TEMP_C,
    DOMAIN,
    KEY_BOILER_RUNTIMES,
)
from .models import BoilerPlan, BoilerProfile, BoilerThermalTopology
from .classifier import (
    BoilerActivityClassifier,
    BoilerActivityDTO,
    BoilerReading,
    BoilerSourceHeaterSnapshot,
)
from .const import BATTERY_SOC_OVERFLOW_THRESHOLD
from .planner_contract import (
    BoilerBatterySignals,
    DemandTarget,
    LegionellaObligation,
    PlannerInput,
    PlannerReasonCode,
    resolve_alt_source_capability,
    validate_freshness,
)
from .demand_profiler import (
    MIN_CONFIDENCE_THRESHOLD,
    _get_day_category,
)
from .planner_core import PlanResult, plan_comfort_core
from .planner import plan_result_to_boiler_plan
from .actuator import ActuatorSerializerState

_LOGGER = logging.getLogger(__name__)

_UNSET = object()
_UNAVAILABLE_TEMPERATURE_STATES = {"unavailable", "unknown", ""}
_DEFAULT_HEATER_POWER_KW = 2.0
_TEMPERATURE_FRESHNESS = timedelta(minutes=15)
_REPLAN_COOLDOWN = timedelta(seconds=60)
_TEMPERATURE_REPLAN_DELTA_C = 0.5
_ACTIVITY_DEBOUNCE_SECONDS = 1.0
_ACTIVITY_SAMPLE_SECONDS = 60.0
_ACTIVITY_BUFFER_MAX = 60
# HA updates entity state only on CHANGE — an idle boiler temperature can sit
# unchanged for tens of minutes, which is perfectly healthy. "Stale" must mean
# "cannot be trusted", not "has not changed lately" (the 5-min window kept the
# UI permanently waving „Data mohou být zastaralá" at the user).
_ACTIVITY_TEMPERATURE_STALE_AFTER = timedelta(minutes=60)
_ACTIVITY_STALE_AFTER = timedelta(seconds=600)
_NORMALIZED_ACTIVITY_SOURCE_KEYS = frozenset({"fve", "overflow", "grid", "discharge", "alternative"})
_ACCEPTED_REPLAN_TRIGGERS = frozenset(
    {
        "slot_boundary",
        "price_update",
        "pv_update",
        "temperature_update",
        "override_expiry",
        "restart_restore",
    }
)
_FORCED_REPLAN_TRIGGERS = frozenset({"override_expiry", "restart_restore"})


def _normalize_deadline_time(value: Any, default: str) -> str:
    if isinstance(value, datetime_time):
        return value.strftime("%H:%M")
    if isinstance(value, str):
        parts = value.split(":")
        if len(parts) in (2, 3):
            try:
                hh, mm = int(parts[0]), int(parts[1])
                if 0 <= hh <= 23 and 0 <= mm <= 59:
                    return f"{hh:02d}:{mm:02d}"
            except ValueError:
                pass
    return default


class IBoilerReadModel(Protocol):
    def get_current_profile(self) -> Optional[BoilerProfile]: ...
    def get_current_plan(self) -> Optional[BoilerPlan]: ...
    async def async_ensure_profile(self) -> Optional[BoilerProfile]: ...


class IBoilerPlanner(Protocol):
    async def async_create_plan(
        self,
        profile: BoilerProfile,
        spot_prices: dict[datetime, float],
        overflow_windows: list[tuple[datetime, datetime]],
        deadline_time: str,
        planner_input: Optional[PlannerInput] = None,
    ) -> BoilerPlan: ...


class IBoilerActuator(Protocol):
    async def async_apply_plan(
        self,
        plan: Optional[BoilerPlan],
        profile: Optional[BoilerProfile],
        config: dict[str, Any],
        box_id: str,
        entry_id: str,
    ) -> None: ...

    async def async_cancel_plan(
        self,
        entry_id: str,
        clear_plan: bool = False,
    ) -> None: ...

    async def async_turn_on_entity(self, entity_id: str, is_heater: bool = False) -> None: ...

    async def async_turn_off_entity(self, entity_id: str, is_heater: bool = False) -> None: ...


@dataclass
class BoilerEnergyInput:
    """Single adapter output for all energy inputs consumed by the planner."""

    spot_prices: dict[datetime, float] = field(default_factory=dict)
    overflow_windows: list[tuple[datetime, datetime]] = field(default_factory=list)
    reason_codes: list[PlannerReasonCode] = field(default_factory=list)
    pv_forecast: float = 0.0
    pv_confidence: float = 0.0

    def __post_init__(self) -> None:
        self.reason_codes = _normalize_reason_list(self.reason_codes)


@dataclass(frozen=True)
class PlannerTemperatureState:
    """Resolved thermometer state for planner input assembly."""

    top_temp_c: Optional[float]
    bottom_temp_c: Optional[float]
    top_updated_at: Optional[datetime]
    reason_codes: list[PlannerReasonCode] = field(default_factory=list)
    safe_hold: bool = False


def resolve_temperature_state(
    *,
    hass: HomeAssistant,
    config: dict[str, Any],
    now: datetime,
) -> PlannerTemperatureState:
    """Resolve runtime thermometer state and Task 6a degraded reasons."""
    reasons: list[PlannerReasonCode] = []
    top_entity = config.get(CONF_BOILER_TEMP_SENSOR_TOP)
    bottom_entity = config.get(CONF_BOILER_TEMP_SENSOR_BOTTOM)
    top_state = _state_for_entity(hass, top_entity)
    top_temp = _temperature_from_state(top_state, top_entity)
    top_updated_at = _state_last_updated(top_state)
    if top_temp is None:
        _append_reason(reasons, PlannerReasonCode.TOP_SENSOR_UNAVAILABLE)
        return PlannerTemperatureState(
            top_temp_c=None,
            bottom_temp_c=None,
            top_updated_at=top_updated_at,
            reason_codes=reasons,
            safe_hold=True,
        )

    if (
        top_updated_at is not None
        and _datetime_age(now, top_updated_at) > _TEMPERATURE_FRESHNESS
    ):
        _append_reason(reasons, PlannerReasonCode.INPUT_STALE_TEMPERATURE)

    bottom_temp = None
    if bottom_entity:
        bottom_state = _state_for_entity(hass, bottom_entity)
        bottom_temp = _temperature_from_state(bottom_state, bottom_entity)
        if bottom_temp is None:
            _append_reason(
                reasons,
                PlannerReasonCode.BOTTOM_SENSOR_UNAVAILABLE_TOP_ONLY_DEGRADED,
            )

    return PlannerTemperatureState(
        top_temp_c=top_temp,
        bottom_temp_c=bottom_temp,
        top_updated_at=top_updated_at,
        reason_codes=reasons,
        safe_hold=False,
    )


def _state_for_entity(hass: HomeAssistant, entity_id: Optional[str]) -> Optional[Any]:
    if not entity_id or not hasattr(hass, "states"):
        return None
    states = hass.states
    if hasattr(states, "get"):
        return states.get(entity_id)
    return None


def _temperature_from_state(state: Optional[Any], entity_id: Optional[str]) -> Optional[float]:
    if state is None:
        return None
    raw_state = str(getattr(state, "state", "") or "").lower()
    if raw_state in _UNAVAILABLE_TEMPERATURE_STATES:
        return None
    from .thermal import validate_temperature_sensor

    return validate_temperature_sensor(state, entity_id or "temperature")


def _state_last_updated(state: Optional[Any]) -> Optional[datetime]:
    if state is None:
        return None
    value = getattr(state, "last_updated", None) or getattr(state, "last_changed", None)
    return value if isinstance(value, datetime) else None


def _datetime_age(now: datetime, updated_at: datetime) -> timedelta:
    """Return age while tolerating mixed naive/aware datetimes."""
    if now.tzinfo is not None and updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=now.tzinfo)
    elif now.tzinfo is None and updated_at.tzinfo is not None:
        now = now.replace(tzinfo=updated_at.tzinfo)
    return now - updated_at


class IBoilerEnergyInputAdapter(Protocol):
    async def async_get_energy_input(self) -> BoilerEnergyInput: ...


def _normalize_reason_list(
    values: Sequence[PlannerReasonCode | str],
) -> list[PlannerReasonCode]:
    result: list[PlannerReasonCode] = []
    for value in values:
        code = value if isinstance(value, PlannerReasonCode) else PlannerReasonCode(value)
        if code not in result:
            result.append(code)
    return result


def _append_reason(
    reasons: list[PlannerReasonCode],
    reason: PlannerReasonCode,
) -> None:
    if reason not in reasons:
        reasons.append(reason)


def _append_trigger_reason(
    reasons: list[PlannerReasonCode],
    trigger: str,
) -> None:
    if trigger == "override_expiry":
        _append_reason(reasons, PlannerReasonCode.OVERRIDE_EXPIRED)


def _append_unique_flag(flags: list[str], flag: str) -> None:
    if flag not in flags:
        flags.append(flag)


def _copy_activity_dto(
    activity: BoilerActivityDTO,
    *,
    stale_flags: Optional[list[str]] = None,
) -> BoilerActivityDTO:
    hint = activity.active_segment_hint
    copied_hint = dict(hint) if isinstance(hint, dict) else None
    return replace(
        activity,
        active_segment_hint=copied_hint,
        heater_states=dict(activity.heater_states),
        stale_flags=list(stale_flags if stale_flags is not None else activity.stale_flags),
    )


def _legacy_detect_energy_source_from_states(
    manual_mode_state: Any,
    current_cbb_state: Any,
) -> Any:
    from .models import EnergySource

    if manual_mode_state and getattr(manual_mode_state, "state", None) == "Zapnuto":
        return EnergySource.FVE
    if current_cbb_state:
        try:
            if float(getattr(current_cbb_state, "state", 0.0) or 0.0) > 0:
                return EnergySource.FVE
        except (TypeError, ValueError):
            pass
    return EnergySource.GRID


def _runtime_cached_energy_source_for_coordinator(coordinator: Any) -> Any | None:
    from .models import EnergySource

    hass = getattr(coordinator, "hass", None)
    entry_id = str(getattr(coordinator, "entry_id", "") or "")
    box_id = str(getattr(coordinator, "box_id", "") or "")
    if not hass or not entry_id or not box_id:
        return None
    runtime = get_boiler_runtime(hass, entry_id, box_id)
    if runtime is None:
        return None
    activity = runtime.current_activity
    if activity is None or activity.state == "unknown":
        return None
    if activity.source in ("fve", "overflow"):
        return EnergySource.FVE
    if activity.source == "grid":
        return EnergySource.GRID
    return None


class _CoordinatorReadModel:
    def __init__(self, coordinator: Any) -> None:
        self._coordinator = coordinator

    def get_current_profile(self) -> Optional[BoilerProfile]:
        return getattr(self._coordinator, "_current_profile", None)

    def get_current_plan(self) -> Optional[BoilerPlan]:
        return getattr(self._coordinator, "_current_plan", None)

    async def async_ensure_profile(self) -> Optional[BoilerProfile]:
        profile = self.get_current_profile()
        if not profile and hasattr(self._coordinator, "_update_profile"):
            await self._coordinator._update_profile()
            profile = self.get_current_profile()
        return profile


class _CoordinatorPlanner:
    def __init__(self, coordinator: Any) -> None:
        self._coordinator = coordinator

    async def async_create_plan(
        self,
        profile: BoilerProfile,
        spot_prices: dict[datetime, float],
        overflow_windows: list[tuple[datetime, datetime]],
        deadline_time: str,
        planner_input: Optional[PlannerInput] = None,
    ) -> BoilerPlan:
        return await self._coordinator.planner.async_create_plan(
            profile=profile,
            spot_prices=spot_prices,
            overflow_windows=overflow_windows,
            deadline_time=deadline_time,
            planner_input=planner_input,
        )


class _CoordinatorEnergyInputAdapter:
    def __init__(
        self,
        coordinator: Any,
        entry_id: str = "",
        box_id: str = "",
    ) -> None:
        self._coordinator = coordinator
        self._entry_id = entry_id or str(getattr(coordinator, "entry_id", "") or "")
        self._box_id = box_id or str(getattr(coordinator, "box_id", "") or "")

    async def async_get_energy_input(self) -> BoilerEnergyInput:
        reasons: list[PlannerReasonCode] = []

        try:
            spot_prices, price_reasons = self._read_spot_prices()
            for reason in price_reasons:
                _append_reason(reasons, reason)
        except Exception as err:
            _LOGGER.debug("Boiler price adapter failed: %s", err, exc_info=True)
            spot_prices = {}
            _append_reason(reasons, PlannerReasonCode.INPUT_ADAPTER_ERROR)
            _append_reason(reasons, PlannerReasonCode.INPUT_STALE_PRICE)

        try:
            overflow_windows, pv_reasons = self._read_overflow_windows()
            for reason in pv_reasons:
                _append_reason(reasons, reason)
        except Exception as err:
            _LOGGER.debug("Boiler PV adapter failed: %s", err, exc_info=True)
            overflow_windows = []
            _append_reason(reasons, PlannerReasonCode.INPUT_ADAPTER_ERROR)
            _append_reason(reasons, PlannerReasonCode.INPUT_STALE_PV)

        return BoilerEnergyInput(
            spot_prices=spot_prices,
            overflow_windows=overflow_windows,
            reason_codes=reasons,
        )

    async def get_spot_prices(self) -> dict[datetime, float]:
        """Backward-compatible adapter method for older tests/callers."""
        energy_input = await self.async_get_energy_input()
        return energy_input.spot_prices

    async def get_overflow_windows(self) -> list[tuple[datetime, datetime]]:
        """Backward-compatible adapter method for older tests/callers."""
        energy_input = await self.async_get_energy_input()
        return energy_input.overflow_windows

    def _read_spot_prices(
        self,
    ) -> tuple[dict[datetime, float], list[PlannerReasonCode]]:
        # Primary path: read from battery module's pre-derived spot price dict.
        battery_data = self._resolve_entry_battery_data()
        if isinstance(battery_data, dict):
            raw_prices = battery_data.get("spot_prices_czk_kwh")
            if isinstance(raw_prices, dict) and raw_prices:
                result: dict[datetime, float] = {}
                for ts_str, price in raw_prices.items():
                    dt_obj = _parse_adapter_datetime(ts_str)
                    if dt_obj is None:
                        continue
                    try:
                        result[dt_obj] = float(price)
                    except (TypeError, ValueError):
                        continue
                if result:
                    return result, []

        # Legacy fallback: user-configured HA spot-price sensor.
        from ..const import CONF_BOILER_SPOT_PRICE_SENSOR

        config = getattr(self._coordinator, "config", {}) or {}
        hass = getattr(self._coordinator, "hass", None)
        spot_sensor = config.get(CONF_BOILER_SPOT_PRICE_SENSOR)
        if not spot_sensor or not hass:
            return {}, [PlannerReasonCode.INPUT_STALE_PRICE]
        state = hass.states.get(spot_sensor)
        if not state:
            return {}, [PlannerReasonCode.INPUT_STALE_PRICE]
        prices_attr = getattr(state, "attributes", {}).get("prices", [])
        if not isinstance(prices_attr, list):
            return {}, [PlannerReasonCode.INPUT_STALE_PRICE]

        result = {}
        for entry in prices_attr:
            if not isinstance(entry, dict):
                continue
            dt_obj = _parse_adapter_datetime(entry.get("datetime"))
            price = entry.get("price")
            if not dt_obj or price is None:
                continue
            try:
                result[dt_obj] = float(price)
            except (TypeError, ValueError):
                continue
        reasons = [] if result else [PlannerReasonCode.INPUT_STALE_PRICE]
        return result, reasons

    def _read_overflow_windows(
        self,
    ) -> tuple[list[tuple[datetime, datetime]], list[PlannerReasonCode]]:
        battery_data = self._resolve_entry_battery_data()
        if not isinstance(battery_data, dict):
            # No battery forecast data at all — genuinely stale.
            return [], [PlannerReasonCode.INPUT_STALE_PV]

        raw_box_id = battery_data.get("box_id")
        if raw_box_id and self._box_id and str(raw_box_id) != self._box_id:
            return [], [PlannerReasonCode.INPUT_STALE_PV]

        # If the key is absent entirely, the battery sensor is running older
        # firmware that does not yet produce overflow_windows.  Treat this as a
        # graceful degraded mode: no overflow data but not INPUT_STALE_PV
        # (which would suppress the plan entirely).
        if "overflow_windows" not in battery_data:
            return [], []

        raw_windows = battery_data.get("overflow_windows")
        if not isinstance(raw_windows, list):
            return [], [PlannerReasonCode.INPUT_STALE_PV]

        # An EMPTY list is fresh, valid data: the battery pipeline ran and
        # predicts no overflow (e.g. night, battery far from full). That is
        # not staleness — flagging it as stale kept the plan degraded at
        # night even with perfectly fresh inputs.
        windows: list[tuple[datetime, datetime]] = []
        for raw_window in raw_windows:
            parsed = _parse_adapter_overflow_window(raw_window)
            if parsed:
                windows.append(parsed)

        # Stale only when entries existed but none could be parsed.
        reasons = (
            [PlannerReasonCode.INPUT_STALE_PV] if raw_windows and not windows else []
        )
        return windows, reasons

    def _resolve_entry_battery_data(self) -> Optional[dict[str, Any]]:
        hass = getattr(self._coordinator, "hass", None)
        hass_data = getattr(hass, "data", None)
        if not isinstance(hass_data, dict) or not self._entry_id:
            return None

        domain_data = hass_data.get(DOMAIN)
        if not isinstance(domain_data, dict):
            return None

        entry_data = domain_data.get(self._entry_id)
        if not isinstance(entry_data, dict):
            return None

        source = entry_data.get("coordinator")
        if source is None or not self._source_matches_box(source):
            return None

        battery_data = getattr(source, "battery_forecast_data", None)
        return battery_data if isinstance(battery_data, dict) else None

    def _source_matches_box(self, source: Any) -> bool:
        if not self._box_id:
            return True

        config_entry = getattr(source, "config_entry", None)
        for container_name in ("options", "data"):
            container = getattr(config_entry, container_name, None)
            if not isinstance(container, dict):
                continue
            candidate = container.get("box_id")
            if candidate and str(candidate) != self._box_id:
                return False
            if candidate:
                return True
        return True


def _parse_adapter_datetime(value: Any) -> Optional[datetime]:
    """Parse a datetime value and ensure it is tz-aware.

    OTE and the battery timeline produce naive ISO strings (e.g.
    ``"2026-06-10T08:15:00"`` without a UTC offset).  When those strings flow
    through as spot-price dict keys or overflow-window boundaries they must be
    tz-aware to be comparable with ``slot.start`` (always tz-aware) without
    raising a ``TypeError`` inside ``_overlap_fraction`` / dict lookups.

    Any naive datetime is coerced to the HA local timezone via
    ``dt_util.as_local()``.
    """
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return dt_util.as_local(value)
        return value
    if isinstance(value, str):
        parsed = dt_util.parse_datetime(value)
        if parsed is None:
            return None
        if parsed.tzinfo is None:
            return dt_util.as_local(parsed)
        return parsed
    return None


def _parse_adapter_overflow_window(
    raw_window: Any,
) -> Optional[tuple[datetime, datetime]]:
    if isinstance(raw_window, tuple) and len(raw_window) == 2:
        start, end = raw_window
        if isinstance(start, datetime) and isinstance(end, datetime):
            return start, end
        return None

    if not isinstance(raw_window, dict):
        return None

    # When the window was pre-derived by the battery pipeline (no 'soc' key),
    # trust it directly.  When 'soc' is present (legacy coordinator format),
    # still apply the overflow threshold guard.
    soc_raw = raw_window.get("soc")
    if soc_raw is not None:
        try:
            soc = float(soc_raw)
        except (TypeError, ValueError):
            soc = 0.0
        if soc < BATTERY_SOC_OVERFLOW_THRESHOLD:
            return None

    start = _parse_adapter_datetime(raw_window.get("start"))
    end = _parse_adapter_datetime(raw_window.get("end"))
    if start and end:
        return start, end
    return None


class _ThermalReadModel:
    def __init__(self, coordinator: Any) -> None:
        self._coordinator = coordinator

    async def read_temperatures(self) -> dict[str, Optional[float]]:
        from ..const import (
            CONF_BOILER_TEMP_SENSOR_BOTTOM,
            CONF_BOILER_TEMP_SENSOR_POSITION,
            CONF_BOILER_TEMP_SENSOR_TOP,
            CONF_BOILER_TWO_ZONE_SPLIT_RATIO,
            DEFAULT_BOILER_TEMP_SENSOR_POSITION,
            DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO,
        )
        from .utils import calculate_stratified_temp, validate_temperature_sensor

        config = getattr(self._coordinator, "config", {}) or {}
        hass = getattr(self._coordinator, "hass", None)
        top_sensor = config.get(CONF_BOILER_TEMP_SENSOR_TOP)
        bottom_sensor = config.get(CONF_BOILER_TEMP_SENSOR_BOTTOM)
        sensor_position = config.get(
            CONF_BOILER_TEMP_SENSOR_POSITION, DEFAULT_BOILER_TEMP_SENSOR_POSITION
        )
        temp_top = None
        temp_bottom = None
        if top_sensor and hass:
            state = hass.states.get(top_sensor)
            temp_top = validate_temperature_sensor(state, top_sensor)
        if bottom_sensor and hass:
            state = hass.states.get(bottom_sensor)
            temp_bottom = validate_temperature_sensor(state, bottom_sensor)
        temp_upper_zone = None
        temp_lower_zone = None
        if temp_top is not None and temp_bottom is None:
            split_ratio = config.get(
                CONF_BOILER_TWO_ZONE_SPLIT_RATIO, DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO
            )
            temp_upper_zone, temp_lower_zone = calculate_stratified_temp(
                measured_temp=temp_top,
                sensor_position=sensor_position,
                mode="two_zone",
                split_ratio=split_ratio,
            )
        elif temp_top is not None and temp_bottom is not None:
            temp_upper_zone = temp_top
            temp_lower_zone = temp_bottom
        return {
            "top": temp_top,
            "bottom": temp_bottom,
            "upper_zone": temp_upper_zone,
            "lower_zone": temp_lower_zone,
        }

    def read_temperatures_sync(self) -> dict[str, Optional[float]]:
        """Synchronous version of read_temperatures for test doubles."""
        from ..const import (
            CONF_BOILER_TEMP_SENSOR_BOTTOM,
            CONF_BOILER_TEMP_SENSOR_POSITION,
            CONF_BOILER_TEMP_SENSOR_TOP,
            CONF_BOILER_TWO_ZONE_SPLIT_RATIO,
            DEFAULT_BOILER_TEMP_SENSOR_POSITION,
            DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO,
        )
        from .utils import calculate_stratified_temp, validate_temperature_sensor

        config = getattr(self._coordinator, "config", {}) or {}
        hass = getattr(self._coordinator, "hass", None)
        top_sensor = config.get(CONF_BOILER_TEMP_SENSOR_TOP)
        bottom_sensor = config.get(CONF_BOILER_TEMP_SENSOR_BOTTOM)
        sensor_position = config.get(
            CONF_BOILER_TEMP_SENSOR_POSITION, DEFAULT_BOILER_TEMP_SENSOR_POSITION
        )
        temp_top = None
        temp_bottom = None
        if top_sensor and hass:
            state = hass.states.get(top_sensor) if hasattr(hass.states, "get") else None
            if state is None and hasattr(hass, "states_get"):
                state = hass.states_get(top_sensor)
            temp_top = validate_temperature_sensor(state, top_sensor)
        if bottom_sensor and hass:
            state = hass.states.get(bottom_sensor) if hasattr(hass.states, "get") else None
            if state is None and hasattr(hass, "states_get"):
                state = hass.states_get(bottom_sensor)
            temp_bottom = validate_temperature_sensor(state, bottom_sensor)
        temp_upper_zone = None
        temp_lower_zone = None
        if temp_top is not None and temp_bottom is None:
            split_ratio = config.get(
                CONF_BOILER_TWO_ZONE_SPLIT_RATIO, DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO
            )
            temp_upper_zone, temp_lower_zone = calculate_stratified_temp(
                measured_temp=temp_top,
                sensor_position=sensor_position,
                mode="two_zone",
                split_ratio=split_ratio,
            )
        elif temp_top is not None and temp_bottom is not None:
            temp_upper_zone = temp_top
            temp_lower_zone = temp_bottom
        return {
            "top": temp_top,
            "bottom": temp_bottom,
            "upper_zone": temp_upper_zone,
            "lower_zone": temp_lower_zone,
        }

    def calculate_energy_state(self, temperatures: dict[str, Optional[float]]) -> dict[str, float]:
        from ..const import CONF_BOILER_VOLUME_L
        from .utils import calculate_energy_to_heat

        config = getattr(self._coordinator, "config", {}) or {}
        volume_l = config.get(CONF_BOILER_VOLUME_L, 200.0)
        target_temp = config.get("boiler_target_temp_c", 60.0)
        temp_upper = temperatures.get("upper_zone")
        temp_lower = temperatures.get("lower_zone")
        energy_needed_kwh = 0.0
        avg_temp = None
        if temp_upper is not None and temp_lower is not None:
            avg_temp = (temp_upper + temp_lower) / 2.0
            energy_needed_kwh = calculate_energy_to_heat(
                volume_liters=volume_l,
                temp_current=avg_temp,
                temp_target=target_temp,
            )
        return {
            "avg_temp": avg_temp or 0.0,
            "energy_needed_kwh": energy_needed_kwh,
        }


class _EnergyStateAdapter:
    def __init__(self, coordinator: Any) -> None:
        self._coordinator = coordinator

    def _get_energy_states(
        self,
        manual_mode_entity: Optional[str],
        current_cbb_entity: Optional[str],
        day_energy_entity: Optional[str],
    ):
        hass = getattr(self._coordinator, "hass", None)
        if not hass:
            return None, None, None
        manual_mode_state = hass.states.get(manual_mode_entity) if manual_mode_entity else None
        current_cbb_state = hass.states.get(current_cbb_entity) if current_cbb_entity else None
        day_energy_state = hass.states.get(day_energy_entity) if day_energy_entity else None
        return manual_mode_state, current_cbb_state, day_energy_state

    def _detect_energy_source(self, manual_mode_state, current_cbb_state):
        cached_source = _runtime_cached_energy_source_for_coordinator(self._coordinator)
        if cached_source is not None:
            return cached_source
        return _legacy_detect_energy_source_from_states(
            manual_mode_state,
            current_cbb_state,
        )

    def _read_total_energy_kwh(self, day_energy_state) -> float:
        if not day_energy_state:
            return 0.0
        try:
            return float(day_energy_state.state) / 1000.0
        except ValueError:
            return 0.0

    def _read_alt_energy_kwh(self, alt_energy_sensor: Optional[str]) -> Optional[float]:
        if not alt_energy_sensor:
            return None
        hass = getattr(self._coordinator, "hass", None)
        if not hass:
            return None
        alt_state = hass.states.get(alt_energy_sensor)
        if not alt_state:
            return None
        try:
            alt_kwh = float(alt_state.state)
            if alt_state.attributes.get("unit_of_measurement") == "Wh":
                alt_kwh /= 1000.0
            return alt_kwh
        except ValueError:
            return None

    def track_energy_sources(self) -> dict[str, Any]:
        from ..const import CONF_BOILER_ALT_ENERGY_SENSOR
        from .utils import estimate_residual_energy

        manual_mode_entity = getattr(self._coordinator, "_oig_manual_mode_entity", None)
        current_cbb_entity = getattr(self._coordinator, "_oig_current_cbb_entity", None)
        day_energy_entity = getattr(self._coordinator, "_oig_day_energy_entity", None)
        config = getattr(self._coordinator, "config", {}) or {}
        alt_energy_sensor = config.get(CONF_BOILER_ALT_ENERGY_SENSOR)
        manual_mode_state, current_cbb_state, day_energy_state = self._get_energy_states(
            manual_mode_entity, current_cbb_entity, day_energy_entity
        )
        current_source = self._detect_energy_source(manual_mode_state, current_cbb_state)
        total_energy_kwh = self._read_total_energy_kwh(day_energy_state)
        fve_kwh = 0.0
        grid_kwh = 0.0
        alt_kwh = self._read_alt_energy_kwh(alt_energy_sensor)
        if alt_kwh is None:
            alt_kwh = estimate_residual_energy(total_energy_kwh, fve_kwh, grid_kwh)
        return {
            "current_source": current_source.value,
            "total_kwh": total_energy_kwh,
            "fve_kwh": fve_kwh,
            "grid_kwh": grid_kwh,
            "alt_kwh": alt_kwh,
        }


def _profile_reason_codes(profile: Any) -> list[PlannerReasonCode]:
    if getattr(profile, "category", None) != "bootstrap":
        return []
    return [
        PlannerReasonCode.INPUT_MISSING_RECORDER,
        PlannerReasonCode.BOOTSTRAP_PROFILE,
    ]


def _build_planner_topology(config: dict[str, Any]) -> BoilerThermalTopology:
    bottom_sensor = config.get(CONF_BOILER_TEMP_SENSOR_BOTTOM)
    temperature_topology = "top_bottom" if bottom_sensor else "top_only"
    placements = ["top", "bottom"] if bottom_sensor else ["top"]
    return BoilerThermalTopology(
        stratification_mode=config.get(
            CONF_BOILER_STRATIFICATION_MODE,
            DEFAULT_BOILER_STRATIFICATION_MODE,
        ),
        thermometer_placements=placements,
        temperature_topology=temperature_topology,
        tank_volume_l=_float_config(config, CONF_BOILER_VOLUME_L, 200.0),
        target_temp_c=_float_config(
            config,
            CONF_BOILER_TARGET_TEMP_C,
            DEFAULT_BOILER_TARGET_TEMP_C,
        ),
        cold_inlet_temp_c=_float_config(
            config,
            CONF_BOILER_COLD_INLET_TEMP_C,
            DEFAULT_BOILER_COLD_INLET_TEMP_C,
        ),
        heater_power_kw=_float_config(
            config,
            "boiler_heater_power_kw",
            _DEFAULT_HEATER_POWER_KW,
        ),
        # F3a: standing-loss coefficient is set to 0.0 until per-installation
        # calibration data is available.  The model default of 0.02 is
        # physically unrealistic (produces ~20 kWh/slot on a 100 l tank,
        # 40x the heater output) and would cause the JIT bias in
        # _combination_score to completely overwhelm real price differences.
        # A calibrated value must be ≤ 0.0003 kWh/(l·°C·h).
        standing_loss_coefficient=0.0,
        # Phase B: arbitrage over-heat ceiling (clamped to be ≥ target).
        max_temp_c=max(
            _float_config(config, CONF_BOILER_MAX_TEMP_C, DEFAULT_BOILER_MAX_TEMP_C),
            _float_config(config, CONF_BOILER_TARGET_TEMP_C, DEFAULT_BOILER_TARGET_TEMP_C),
        ),
    )


def _float_config(config: dict[str, Any], key: str, default: float) -> float:
    try:
        return float(config.get(key, default))
    except (TypeError, ValueError):
        return default


def planner_input_horizon_hours(config: dict[str, Any]) -> int:
    """Return the effective planner horizon hours from config."""
    from .planner_core import DEFAULT_HORIZON_HOURS
    return int(_float_config(config, "boiler_horizon_hours", DEFAULT_HORIZON_HOURS))


def _build_demand_targets(
    *,
    coordinator: Any,
    now: datetime,
    horizon_hours: int,
) -> list[DemandTarget]:
    """Derive demand targets from the F2 demand profiler on the coordinator.

    Returns [] when:
    - coordinator has no _demand_profiler (bootstrap install)
    - profiler confidence < MIN_CONFIDENCE_THRESHOLD
    - profiler level is 'bootstrap'
    - any unexpected error (defensive; zero regression for fresh installs)

    The safety-net deadline target is NOT included here — plan_comfort_core
    adds it internally from the topology and deadline_time.
    """
    try:
        demand_profiler = getattr(coordinator, "_demand_profiler", None)
        if demand_profiler is None:
            return []

        horizon_end = now + timedelta(hours=horizon_hours)
        targets: list[DemandTarget] = []

        for day_offset in range(2):  # today and tomorrow
            day_date = (now + timedelta(days=day_offset)).date()
            category = _get_day_category(now + timedelta(days=day_offset))
            demand_map = demand_profiler.get_demand_map(category)

            # Confidence / bootstrap gate.
            if demand_map.confidence < MIN_CONFIDENCE_THRESHOLD:
                continue
            if demand_map.meta.level == "bootstrap":
                continue

            day_label = "today" if day_offset == 0 else "tomorrow"

            for window in demand_map.windows:
                start_h = window.start_minute // 60
                start_m = window.start_minute % 60
                # Combine with the local date using now's timezone.
                try:
                    from datetime import time as _time
                    wall_time = _time(start_h, start_m)
                    target_start = datetime.combine(
                        day_date,
                        wall_time,
                        tzinfo=now.tzinfo,
                    )
                    # Advance through any DST gap (same helper as deadline).
                    from .planner_core import _advance_nonexistent_wall_time
                    target_start = _advance_nonexistent_wall_time(target_start)
                except Exception:
                    continue

                # Only include windows that are in the future and within horizon.
                if target_start <= now:
                    continue
                if target_start >= horizon_end:
                    continue

                targets.append(DemandTarget(
                    start=target_start,
                    required_kwh=window.p80_kwh,
                    label=f"{day_label}_{window.label}",
                ))

        return targets

    except Exception as exc:  # pragma: no cover
        _LOGGER.warning("_build_demand_targets failed (fallback to legacy): %s", exc)
        return []


# ---------------------------------------------------------------------------
# R9: Legionella last-event detection helper
# ---------------------------------------------------------------------------

_LEGIONELLA_CACHE_REFRESH_INTERVAL = timedelta(hours=6)


@dataclass
class _LegionellaCache:
    """In-memory cache for legionella detection result."""

    last_checked_at: Optional[datetime] = None
    # datetime of the most recent reading >= legionella_target_temp_c (or None)
    last_achieved_at: Optional[datetime] = None


async def _async_detect_last_legionella_event(
    hass: HomeAssistant,
    *,
    top_sensor_entity: str,
    legionella_target_temp_c: float,
    interval_days: int,
    now: datetime,
    cache: _LegionellaCache,
    current_top_temp_c: Optional[float] = None,
) -> Optional[datetime]:
    """Return the datetime of the most recent top-sensor reading >= legionella_target_temp_c.

    Caches the result for up to 6 h to avoid hammering the recorder.
    Short-circuits to now() when the current live temperature already satisfies
    the target (records the achievement in cache.last_achieved_at).

    Returns None when:
    - recorder is unavailable (caller should treat as unknown → no scheduling)
    - no qualifying reading found in the lookback window
    """
    # Short-circuit: if current temp >= target, record achievement and return now.
    if (
        current_top_temp_c is not None
        and current_top_temp_c >= legionella_target_temp_c
    ):
        cache.last_achieved_at = now
        cache.last_checked_at = now
        _LOGGER.debug(
            "Legionella: current top temp %.1f°C >= target %.1f°C — obligation satisfied",
            current_top_temp_c,
            legionella_target_temp_c,
        )
        return now

    # Cache freshness check: skip recorder scan if cache is recent.
    if (
        cache.last_checked_at is not None
        and _datetime_age(now, cache.last_checked_at) < _LEGIONELLA_CACHE_REFRESH_INTERVAL
    ):
        return cache.last_achieved_at

    # Recorder scan over the lookback window.
    lookback_days = max(interval_days + 1, 14)  # at least 14 days to catch slow cycles
    start_time = now - timedelta(days=lookback_days)
    last_event: Optional[datetime] = None

    try:
        from homeassistant.components.recorder.history import state_changes_during_period
        from homeassistant.helpers.recorder import get_instance

        instance = get_instance(hass)
        if instance is None:
            _LOGGER.debug(
                "Legionella detection: recorder not available for %s", top_sensor_entity
            )
            cache.last_checked_at = now
            return None

        temp_states = await instance.async_add_executor_job(
            state_changes_during_period,
            hass,
            start_time,
            now,
            top_sensor_entity,
        )
        records = temp_states.get(top_sensor_entity, [])
        for state in records:
            try:
                temp = float(state.state)
                ts = state.last_updated
                if temp >= legionella_target_temp_c:
                    if last_event is None or ts > last_event:
                        last_event = ts
            except (ValueError, AttributeError):
                continue

        _LOGGER.debug(
            "Legionella detection: scanned %d records for %s → last_event=%s",
            len(records),
            top_sensor_entity,
            last_event,
        )
    except Exception as err:
        _LOGGER.debug(
            "Legionella detection failed for %s (treating as unknown): %s",
            top_sensor_entity,
            err,
            exc_info=True,
        )
        cache.last_checked_at = now
        return None

    cache.last_checked_at = now
    cache.last_achieved_at = last_event
    return last_event


async def _async_build_legionella_obligation(
    hass: HomeAssistant,
    *,
    config: dict[str, Any],
    now: datetime,
    current_top_temp_c: Optional[float],
    topology: Any,
    cache: _LegionellaCache,
) -> Optional[LegionellaObligation]:
    """Build a LegionellaObligation from config and recorder history.

    Returns None when the feature is disabled (interval_days == 0).
    Returns a not-overdue obligation when the last event is recent.
    Returns an overdue obligation when days_since >= interval_days.
    """
    from ..const import (
        CONF_BOILER_LEGIONELLA_INTERVAL_DAYS,
        CONF_BOILER_LEGIONELLA_TARGET_TEMP_C,
        DEFAULT_BOILER_LEGIONELLA_INTERVAL_DAYS,
        DEFAULT_BOILER_LEGIONELLA_TARGET_TEMP_C,
        CONF_BOILER_TEMP_SENSOR_TOP,
    )

    interval_days = int(
        config.get(CONF_BOILER_LEGIONELLA_INTERVAL_DAYS, DEFAULT_BOILER_LEGIONELLA_INTERVAL_DAYS)
    )
    if interval_days <= 0:
        return None  # feature disabled

    legionella_target = float(
        config.get(CONF_BOILER_LEGIONELLA_TARGET_TEMP_C, DEFAULT_BOILER_LEGIONELLA_TARGET_TEMP_C)
    )
    top_sensor = config.get(CONF_BOILER_TEMP_SENSOR_TOP)
    if not top_sensor:
        return None  # no sensor configured → cannot detect

    last_event = await _async_detect_last_legionella_event(
        hass,
        top_sensor_entity=top_sensor,
        legionella_target_temp_c=legionella_target,
        interval_days=interval_days,
        now=now,
        cache=cache,
        current_top_temp_c=current_top_temp_c,
    )

    days_since: Optional[int] = None
    overdue = False

    if last_event is None:
        # Recorder unavailable or no qualifying reading found.
        # Treat unknown → do NOT schedule to avoid false alarms.
        overdue = False
    else:
        age = _datetime_age(now, last_event)
        days_since = int(age.total_seconds() // 86400)
        overdue = days_since >= interval_days

    # Compute required kWh: energy to raise TOP zone (full tank as top-only
    # estimate with safety factor) from current_top_temp to legionella_target.
    required_kwh = 0.0
    if overdue and topology is not None and current_top_temp_c is not None:
        tank_volume = getattr(topology, "tank_volume_l", 200.0)
        from .thermal import calculate_energy_to_heat
        from .planner_core import TOP_ONLY_REQUIRED_ENERGY_SAFETY_FACTOR
        required_kwh = (
            calculate_energy_to_heat(
                volume_liters=tank_volume,
                temp_current=float(current_top_temp_c),
                temp_target=legionella_target,
            )
            * TOP_ONLY_REQUIRED_ENERGY_SAFETY_FACTOR
        )

    return LegionellaObligation(
        overdue=overdue,
        required_kwh=required_kwh,
        legionella_target_temp_c=legionella_target,
        days_since_last=days_since,
        interval_days=interval_days,
    )


# ---------------------------------------------------------------------------
# R5: Circulation pre-peak scheduling helpers
# ---------------------------------------------------------------------------

def _build_circulation_schedule(
    *,
    demand_targets: list[DemandTarget],
    now: datetime,
    config: dict[str, Any],
) -> list[tuple[datetime, datetime, str]]:
    """Build a circulation run schedule from the current demand targets.

    Returns an empty list when circulation is disabled (feature flag off) or
    when no demand targets are available.  Never raises.
    """
    from .circulation import build_circulation_runs

    enabled = bool(config.get(CONF_BOILER_CIRCULATION_ENABLED, DEFAULT_BOILER_CIRCULATION_ENABLED))
    if not enabled:
        return []

    lead_min = int(config.get(CONF_BOILER_CIRCULATION_LEAD_MINUTES, DEFAULT_BOILER_CIRCULATION_LEAD_MINUTES))
    run_min = int(config.get(CONF_BOILER_CIRCULATION_RUN_MINUTES, DEFAULT_BOILER_CIRCULATION_RUN_MINUTES))
    max_runs = int(config.get(CONF_BOILER_CIRCULATION_MAX_RUNS_PER_DAY, DEFAULT_BOILER_CIRCULATION_MAX_RUNS_PER_DAY))
    min_gap = int(config.get(CONF_BOILER_CIRCULATION_MIN_GAP_MINUTES, DEFAULT_BOILER_CIRCULATION_MIN_GAP_MINUTES))

    try:
        return build_circulation_runs(
            demand_targets,
            now,
            lead_min=lead_min,
            run_min=run_min,
            max_runs=max_runs,
            min_gap_min=min_gap,
        )
    except Exception as err:  # pragma: no cover
        _LOGGER.warning("Circulation schedule build failed: %s", err, exc_info=True)
        return []


async def _async_actuate_circulation_pump(
    hass: HomeAssistant,
    *,
    pump_entity: str,
    turn_on: bool,
) -> bool:
    """Call homeassistant switch turn_on / turn_off on the pump entity.

    Returns True on success, False when the entity is unavailable or call fails.
    Safety: never turns on when entity state is 'unavailable' or 'unknown'.
    """
    if not pump_entity:
        return False

    state = _state_for_entity(hass, pump_entity)
    entity_state_str = str(getattr(state, "state", "unavailable") or "unavailable").lower()

    if turn_on and entity_state_str in ("unavailable", "unknown", ""):
        _LOGGER.debug(
            "Circulation pump %s is %s — skipping turn_on",
            pump_entity,
            entity_state_str,
        )
        return False

    service = "turn_on" if turn_on else "turn_off"
    try:
        services = getattr(hass, "services", None)
        if services is None or not hasattr(services, "async_call"):
            return False
        await services.async_call(
            "switch",
            service,
            {"entity_id": pump_entity},
            blocking=False,
        )
        _LOGGER.debug(
            "Circulation pump %s: called switch.%s",
            pump_entity,
            service,
        )
        return True
    except Exception as err:
        _LOGGER.warning(
            "Circulation pump %s switch.%s failed: %s",
            pump_entity,
            service,
            err,
            exc_info=True,
        )
        return False


class BoilerRuntime:
    def __init__(
        self,
        hass: HomeAssistant,
        read_model: IBoilerReadModel,
        planner: IBoilerPlanner,
        actuator: IBoilerActuator,
        energy_adapter: IBoilerEnergyInputAdapter,
        coordinator: Any,
        box_id: str,
        entry_id: str,
        serializer: Any | None = None,
    ) -> None:
        self.hass = hass
        self.read_model = read_model
        self.planner = planner
        self.actuator = actuator
        self.energy_adapter = energy_adapter
        self.coordinator = coordinator
        self.box_id = box_id
        self.entry_id = entry_id
        self._serializer = serializer
        self._current_plan: Optional[BoilerPlan] | object = _UNSET
        self._last_replan_at: Optional[datetime] = None
        self._last_replan_temperature_c: Optional[float] = None
        self.last_plan_result: Optional[PlanResult] = None
        self._legionella_cache = _LegionellaCache()
        # R5: Circulation scheduling state
        self._circulation_runs: list[tuple[datetime, datetime, str]] = []
        self._circulation_pump_on: bool = False  # True = we turned the pump on
        # R3: Home 5 maneuver tracking — True when WE enabled Home 5 (non-interference)
        self._home5_engaged_by_planner: bool = False
        self.plan_result_handoff: list[PlanResult] = []
        self._activity_classifier = BoilerActivityClassifier()
        self._current_activity: Optional[BoilerActivityDTO] = None
        self._last_activity_reading: Optional[BoilerReading] = None
        self._last_classifier_stale_flags: list[str] = []
        self._timeline_buffer: list[dict[str, Any]] = []
        self._last_activity_snapshot_at: Optional[datetime] = None
        self._last_activity_event_at: Optional[datetime] = None
        self._last_classifier_monotonic: Optional[float] = None
        self._activity_listener_unsubs: list[Callable[[], None]] = []
        self._activity_entity_ids: set[str] = set()
        self._segment_derivation_flags: set[str] = set()
        # Task B: per-source daily energy attribution accumulators.
        # Keys: 'fve', 'grid', 'alternative'; values: cumulative kWh since midnight.
        # Reset when local date changes; re-seeded on restart from box day counter.
        self._daily_source_kwh: dict[str, float] = {"fve": 0.0, "grid": 0.0, "alternative": 0.0}
        # Parallel per-source COST accumulator (Kč since midnight). grid is
        # integrated as energy × the all-in spot price at that interval; fve is
        # free (0); gas/alt cost is computed at the DTO from the meter × config.
        self._daily_source_cost_czk: dict[str, float] = {"fve": 0.0, "grid": 0.0}
        self._daily_source_date: Optional[Any] = None  # date object of last accumulation day
        self._daily_source_last_update_at: Optional[datetime] = None
        self._daily_source_reseeded: bool = False  # guard: reseed runs at most once per day
        # Persistence so the daily attribution survives an HA restart/deploy
        # (otherwise a mid-day restart zeroes the day and the reseed leaves the
        # morning unattributed — the counter appears to "start counting now").
        self._daily_source_store: Optional[Any] = None
        self._daily_source_loaded: bool = False
        self._daily_source_loaded_from_store: bool = False
        self._daily_source_last_save_at: Optional[datetime] = None
        self._setup_activity_state_listeners()

    @property
    def current_activity(self) -> Optional[BoilerActivityDTO]:
        if self._current_activity is None:
            return None
        self._refresh_current_activity_stale_flags(dt_util.now())
        return _copy_activity_dto(self._current_activity)

    @property
    def timeline_buffer(self) -> list[dict[str, Any]]:
        return [dict(entry) for entry in self._timeline_buffer]

    def _setup_activity_state_listeners(self) -> None:
        self.unload_activity_listeners()
        self._activity_entity_ids = self._resolve_activity_entity_ids()
        if not self._activity_entity_ids:
            return
        bus = getattr(self.hass, "bus", None)
        async_listen = getattr(bus, "async_listen", None)
        if not callable(async_listen):
            return
        unsub = async_listen("state_changed", self._handle_activity_state_changed)
        if callable(unsub):
            self._activity_listener_unsubs.append(unsub)

    def unload_activity_listeners(self) -> None:
        for unsub in self._activity_listener_unsubs:
            try:
                unsub()
            except Exception as err:
                _LOGGER.warning(
                    "Boiler activity listener unsubscribe failed for %s/%s: %s",
                    self.entry_id,
                    self.box_id,
                    err,
                    exc_info=True,
                )
        self._activity_listener_unsubs.clear()

    async def async_unload(self) -> None:
        self.unload_activity_listeners()

    def _resolve_activity_entity_ids(self) -> set[str]:
        config = getattr(self.coordinator, "config", {}) or {}
        entity_ids: set[str] = set()
        for key in (
            CONF_BOILER_TEMP_SENSOR_TOP,
            CONF_BOILER_TEMP_SENSOR_BOTTOM,
            CONF_BOILER_HEATER_SWITCH_ENTITY,
            CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
            CONF_BOILER_HEATER_POWER_KW_ENTITY,
            CONF_BOILER_CURRENT_POWER_ENTITY,
        ):
            self._add_activity_entity_id(entity_ids, config.get(key))
        self._add_activity_entity_id(
            entity_ids,
            getattr(self.coordinator, "_oig_manual_mode_entity", None),
        )
        # Always include the auto-resolved CBB entity (may differ from CONF_BOILER_CURRENT_POWER_ENTITY)
        self._add_activity_entity_id(
            entity_ids,
            getattr(self.coordinator, "_oig_current_cbb_entity", None),
        )
        # Non-backup live power — the primary signal for the heating estimator.
        # Without it the activity would freeze whenever temps + cbb are static
        # (cbb is constant in manual mode while the thermostat does the cutting).
        box_id = getattr(self, "box_id", None)
        if box_id and box_id != "unknown":
            self._add_activity_entity_id(
                entity_ids, f"sensor.oig_{box_id}_actual_acinb_wtotal"
            )
        return entity_ids

    def _add_activity_entity_id(self, entity_ids: set[str], entity_id: Any) -> None:
        if isinstance(entity_id, str) and entity_id:
            entity_ids.add(entity_id)

    def _handle_activity_state_changed(self, event: Any) -> None:
        try:
            data = getattr(event, "data", {}) or {}
            entity_id = data.get("entity_id") if isinstance(data, dict) else None
            if entity_id not in self._activity_entity_ids:
                return

            event_timestamp = self._event_timestamp(event)
            if self._activity_snapshot_is_older(event_timestamp):
                return

            monotonic_now = self._activity_monotonic_time()
            if self._activity_event_is_debounced(monotonic_now):
                return

            self._update_activity_cache(
                event_timestamp=event_timestamp,
                changed_entity_id=entity_id,
            )
            self._last_classifier_monotonic = monotonic_now
        except Exception:
            _LOGGER.exception(
                "Boiler activity listener failed for %s/%s",
                self.entry_id,
                self.box_id,
            )

    def _activity_monotonic_time(self) -> float:
        loop = getattr(self.hass, "loop", None)
        loop_time = getattr(loop, "time", None)
        if callable(loop_time):
            return float(loop_time())
        return time.monotonic()

    def _activity_event_is_debounced(self, monotonic_now: float) -> bool:
        last = self._last_classifier_monotonic
        return last is not None and monotonic_now - last < _ACTIVITY_DEBOUNCE_SECONDS

    def _event_timestamp(self, event: Any) -> datetime:
        timestamp = getattr(event, "time_fired", None)
        return timestamp if isinstance(timestamp, datetime) else dt_util.now()

    def _activity_snapshot_is_older(self, event_timestamp: datetime) -> bool:
        last = self._last_activity_snapshot_at
        return last is not None and event_timestamp < last

    def _update_activity_cache(
        self,
        *,
        event_timestamp: datetime,
        changed_entity_id: Optional[str],
    ) -> None:
        top_temp = self._read_temperature_for_key(CONF_BOILER_TEMP_SENSOR_TOP)
        bottom_temp = self._read_temperature_for_key(CONF_BOILER_TEMP_SENSOR_BOTTOM)
        curr = BoilerReading(
            timestamp=event_timestamp,
            top_temp_c=top_temp,
            bottom_temp_c=bottom_temp,
            source_key=None,
        )
        overflow_avail = self._read_overflow_available(event_timestamp)
        # Real electric power: the box cbb_w reports the COMMANDED power and is
        # blind to the thermostat cutting the element. Recover the true power by
        # fusing it with the non-backup draw + temperature trend.
        commanded_w = self._read_cbb_power_w()
        actual_power_w, _heating_method = self._estimate_actual_power_w(
            commanded_w, curr
        )
        snapshot = BoilerSourceHeaterSnapshot(
            current_source=self._read_current_source_snapshot(),
            active_heaters=self._read_active_heater_states(),
            overflow_available=overflow_avail,
            power_kw=self._read_live_power_kw(),
            # Task A: power-first classification inputs (real power, not command)
            power_w=actual_power_w,
            box_boiler_mode=self._read_box_boiler_mode(),
            grid_import_w=self._read_grid_import_w(),
            pv_surplus_hint=overflow_avail,
            alt_heat_delta_kwh=self._read_alt_heat_delta_kwh(),
            # Explicit capability flag — without it the trend-based gas
            # detection never fires (see _snapshot_has_alternative).
            has_alternative=bool(
                (getattr(self.coordinator, "config", {}) or {}).get(
                    CONF_BOILER_HAS_ALTERNATIVE_HEATING, False
                )
            ),
        )
        activity = self._activity_classifier.classify(
            self._last_activity_reading,
            curr,
            snapshot,
        )
        self._last_activity_reading = curr
        self._last_activity_snapshot_at = event_timestamp
        self._last_activity_event_at = event_timestamp
        self._last_classifier_stale_flags = list(activity.stale_flags)
        flags = self._rebuilt_activity_stale_flags(
            now=event_timestamp,
            classifier_flags=activity.stale_flags,
        )
        self._current_activity = _copy_activity_dto(activity, stale_flags=flags)
        self._update_daily_source_accumulators(activity, snapshot, event_timestamp)
        self._record_timeline_entry(
            reading=curr,
            activity=activity,
            power_kw=snapshot.power_kw,
            changed_entity_id=changed_entity_id,
        )

    def _update_daily_source_accumulators(
        self,
        activity: BoilerActivityDTO,
        snapshot: BoilerSourceHeaterSnapshot,
        now: datetime,
    ) -> None:
        """Accumulate per-source electric energy into daily buckets.

        Driven by _update_activity_cache (which fires on every relevant state
        change).  The duration is computed from the wall-clock gap since the
        previous update; if no previous update exists the interval is 0.

        Midnight reset: when the local date changes the buckets are zeroed.
        The box day counter (total_kwh) is NOT re-seeded here — api_views
        handles that when it reads the result (re-seed on restart).
        """
        local_date = dt_util.now().date()

        # Midnight reset
        if self._daily_source_date is not None and local_date != self._daily_source_date:
            self._daily_source_kwh = {"fve": 0.0, "grid": 0.0, "alternative": 0.0}
            self._daily_source_cost_czk = {"fve": 0.0, "grid": 0.0}
            self._daily_source_reseeded = False  # allow reseed on new day
        self._daily_source_date = local_date

        prev_update = self._daily_source_last_update_at
        self._daily_source_last_update_at = now

        if prev_update is None:
            # First call — no interval to integrate yet
            return

        # Compute interval duration in hours
        try:
            delta = now - prev_update
            duration_h = max(0.0, delta.total_seconds() / 3600.0)
        except Exception:
            return

        # Only accumulate when the boiler is actively heating electrically
        state = getattr(activity, "state", None)
        if state not in ("charging_fve", "charging_overflow", "charging_grid"):
            return

        # Determine power in kW: prefer direct CBB sensor, fall back to legacy power_kw
        power_kw: Optional[float] = None
        power_w = getattr(snapshot, "power_w", None)
        if isinstance(power_w, (int, float)) and math.isfinite(power_w) and power_w > 0:
            power_kw = power_w / 1000.0
        elif snapshot.power_kw is not None and snapshot.power_kw > 0:
            power_kw = snapshot.power_kw

        if power_kw is None or power_kw <= 0:
            return

        energy_kwh = power_kw * duration_h
        source = getattr(activity, "source", None)
        if state in ("charging_fve", "charging_overflow") or source in ("fve", "overflow"):
            self._daily_source_kwh["fve"] = self._daily_source_kwh.get("fve", 0.0) + energy_kwh
            # Solar/overflow is free — no cost added.
        else:
            self._daily_source_kwh["grid"] = self._daily_source_kwh.get("grid", 0.0) + energy_kwh
            price = self._read_current_grid_price_czk()
            if price is not None:
                self._daily_source_cost_czk["grid"] = (
                    self._daily_source_cost_czk.get("grid", 0.0) + energy_kwh * price
                )

        # Persist (throttled) so the day's attribution survives a restart.
        self._schedule_daily_source_save()

    def _read_current_grid_price_czk(self) -> Optional[float]:
        """Current all-in grid price (Kč/kWh) for the active 15-min interval.

        Reads ``sensor.oig_{box}_spot_price_current_15min`` — the same all-in
        (spot+distribution+VAT) price the planner uses. None when unavailable.
        """
        box_id = getattr(self, "box_id", None)
        if not box_id or box_id == "unknown":
            return None
        state = _state_for_entity(self.hass, f"sensor.oig_{box_id}_spot_price_current_15min")
        if state is None:
            return None
        raw = str(getattr(state, "state", "") or "").strip().lower()
        if raw in _UNAVAILABLE_TEMPERATURE_STATES:
            return None
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return None
        return value if math.isfinite(value) else None

    def get_daily_source_cost_czk(self) -> dict[str, float]:
        """Return a snapshot of today's per-source cost accumulators (Kč)."""
        return dict(self._daily_source_cost_czk)

    def get_daily_source_kwh(self) -> dict[str, float]:
        """Return a snapshot of today's per-source energy accumulators."""
        return dict(self._daily_source_kwh)

    def _ensure_daily_source_store(self) -> Optional[Any]:
        if self._daily_source_store is None and self.hass is not None:
            try:
                from homeassistant.helpers.storage import Store

                key = f"oig_cloud.boiler_energy_{self.entry_id}_{self.box_id}"
                self._daily_source_store = Store(self.hass, 1, key)
            except Exception:  # pragma: no cover - defensive
                self._daily_source_store = None
        return self._daily_source_store

    async def async_load_daily_source(self) -> None:
        """Restore today's per-source energy accumulators after a restart.

        Only restores when the stored snapshot is for the current local day; a
        stale (previous-day) snapshot is ignored so midnight reset still applies.
        Marks the accumulators as reseeded so the restart re-seed does not also
        guess a split on top of the restored values.
        """
        if self._daily_source_loaded:
            return
        store = self._ensure_daily_source_store()
        if store is None:
            self._daily_source_loaded = True
            return
        try:
            data = await store.async_load()
        except Exception:  # pragma: no cover - defensive
            data = None
        try:
            if data:
                today = dt_util.now().date().isoformat()
                if data.get("date") == today:
                    kwh = data.get("kwh") or {}
                    cost = data.get("cost_czk") or {}
                    self._daily_source_kwh = {
                        "fve": float(kwh.get("fve", 0.0)),
                        "grid": float(kwh.get("grid", 0.0)),
                        "alternative": float(kwh.get("alternative", 0.0)),
                    }
                    self._daily_source_cost_czk = {
                        "fve": float(cost.get("fve", 0.0)),
                        "grid": float(cost.get("grid", 0.0)),
                    }
                    self._daily_source_date = dt_util.now().date()
                    self._daily_source_reseeded = True
                    self._daily_source_loaded_from_store = True
        except Exception:  # pragma: no cover - defensive
            pass
        finally:
            self._daily_source_loaded = True

    def seed_daily_source_from_state(self, source: str, kwh: float) -> None:
        """RestoreEntity fallback: seed a per-source bucket from a sensor's last
        HA state when the Store had no snapshot for today.

        Mirrors the battery computed sensors (Store primary + RestoreEntity
        fallback). The Store is authoritative: if it already restored today's
        data, this is a no-op. Otherwise the restored sensor value seeds the
        accumulator so the daily counter survives a restart even without a Store.
        """
        if self._daily_source_loaded_from_store:
            return
        if source not in ("fve", "grid", "alternative"):
            return
        try:
            value = float(kwh)
        except (TypeError, ValueError):
            return
        if value <= 0.0:
            return
        # Only seed if we don't already have a larger value (avoid clobbering a
        # fresher in-memory accumulation that started after restart).
        if value > self._daily_source_kwh.get(source, 0.0):
            self._daily_source_kwh[source] = value
        self._daily_source_date = dt_util.now().date()
        self._daily_source_reseeded = True

    def _schedule_daily_source_save(self) -> None:
        """Persist the daily accumulators (throttled to at most once per minute)."""
        store = self._ensure_daily_source_store()
        if store is None:
            return
        now = dt_util.now()
        last = self._daily_source_last_save_at
        if last is not None and (now - last).total_seconds() < 60.0:
            return
        self._daily_source_last_save_at = now
        payload = {
            "date": (
                self._daily_source_date.isoformat()
                if self._daily_source_date
                else now.date().isoformat()
            ),
            "kwh": dict(self._daily_source_kwh),
            "cost_czk": dict(self._daily_source_cost_czk),
        }
        try:
            if hasattr(self.hass, "async_create_task"):
                self.hass.async_create_task(store.async_save(payload))
        except Exception:  # pragma: no cover - defensive
            pass

    def reseed_daily_source_kwh(self, total_kwh: float) -> None:
        """Re-seed the fve+grid buckets once after HA restart.

        Called from api_views on every API read, but executes at most once per
        calendar day (guarded by _daily_source_reseeded).  The guard prevents
        the continuous-drip misattribution bug where each polling cycle would
        treat the incremental box-counter growth as 'current source' energy
        instead of letting the classifier accumulate it organically.

        On restart the accumulated totals are zero and the box day counter may
        already hold pre-restart energy.  We cannot know the true split, so we
        attribute the gap to 'grid' only when the boiler is actively drawing
        from the grid.  During standby or gas heating (most of the day) the gap
        is left unattributed (both fve and grid stay at zero) — this is
        conservative but honest: the UI shows 'unknown' rather than wrong data.
        """
        if self._daily_source_reseeded:
            return
        accum_total = self._daily_source_kwh.get("fve", 0.0) + self._daily_source_kwh.get("grid", 0.0)
        gap = total_kwh - accum_total
        if gap <= 0.001:
            # Accumulators already account for the day's energy — mark done.
            self._daily_source_reseeded = True
            return
        # Only attribute the gap when the boiler is actively heating electrically.
        # During standby / gas-heat we cannot know the pre-restart source split,
        # so we leave the gap unattributed rather than fabricate grid energy.
        activity = self._current_activity
        state = getattr(activity, "state", None) if activity is not None else None
        # Gate strictly on ACTIVE charging states. The legacy source snapshot
        # reports e.g. 'grid' even during standby (it is "last known source"),
        # so source-based fallbacks here would re-introduce the very
        # misattribution this guard exists to prevent.
        if state in ("charging_fve", "charging_overflow"):
            self._daily_source_kwh["fve"] = self._daily_source_kwh.get("fve", 0.0) + gap
        elif state == "charging_grid":
            self._daily_source_kwh["grid"] = self._daily_source_kwh.get("grid", 0.0) + gap
        # standby / charging_alt / unknown: leave gap unattributed (honest)
        self._daily_source_reseeded = True
        self._schedule_daily_source_save()

    def _read_temperature_for_key(self, key: str) -> Optional[float]:
        config = getattr(self.coordinator, "config", {}) or {}
        entity_id = config.get(key)
        return _temperature_from_state(_state_for_entity(self.hass, entity_id), entity_id)

    def _read_current_source_snapshot(self) -> Any:
        manual_state = _state_for_entity(
            self.hass,
            getattr(self.coordinator, "_oig_manual_mode_entity", None),
        )
        current_cbb_state = _state_for_entity(
            self.hass,
            getattr(self.coordinator, "_oig_current_cbb_entity", None),
        )
        return _legacy_detect_energy_source_from_states(manual_state, current_cbb_state)

    def _read_active_heater_states(self) -> dict[str, str]:
        config = getattr(self.coordinator, "config", {}) or {}
        heaters: dict[str, str] = {}
        for key in (
            CONF_BOILER_HEATER_SWITCH_ENTITY,
            CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
        ):
            entity_id = config.get(key)
            if not isinstance(entity_id, str) or not entity_id:
                continue
            state = _state_for_entity(self.hass, entity_id)
            heaters[entity_id] = str(getattr(state, "state", "unavailable") or "")
        return heaters

    def _read_overflow_available(self, now: datetime) -> Optional[bool]:
        try:
            plan = self.get_current_plan()
            if plan is None or not hasattr(plan, "get_current_slot"):
                return None
            slot = plan.get_current_slot(now)
            if slot is None:
                return None
            return bool(getattr(slot, "overflow_available", False))
        except Exception as err:
            _LOGGER.debug("Boiler overflow snapshot failed: %s", err, exc_info=True)
            return None

    def _read_live_power_kw(self) -> Optional[float]:
        config = getattr(self.coordinator, "config", {}) or {}
        entity_id = config.get(CONF_BOILER_HEATER_POWER_KW_ENTITY)
        if not isinstance(entity_id, str) or not entity_id:
            return None
        state = _state_for_entity(self.hass, entity_id)
        if state is None:
            return None
        raw = str(getattr(state, "state", "") or "").strip().lower()
        if raw in _UNAVAILABLE_TEMPERATURE_STATES:
            return None
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return None
        return value if math.isfinite(value) else None

    def _resolve_cbb_entity_id(self) -> Optional[str]:
        """Return the entity ID for the CBB→boiler power sensor.

        Checks CONF_BOILER_CURRENT_POWER_ENTITY from config first (explicit
        override); falls back to the auto-resolved coordinator entity which
        follows the standard sensor.oig_{box_id}_boiler_current_cbb_w naming.
        """
        config = getattr(self.coordinator, "config", {}) or {}
        override = config.get(CONF_BOILER_CURRENT_POWER_ENTITY)
        if isinstance(override, str) and override.strip():
            return override.strip()
        return getattr(self.coordinator, "_oig_current_cbb_entity", None)

    def _read_cbb_power_w(self) -> Optional[float]:
        """Read live CBB→boiler power in Watts.

        Uses CONF_BOILER_CURRENT_POWER_ENTITY when configured, otherwise
        auto-resolves sensor.oig_{box_id}_boiler_current_cbb_w via coordinator.
        This is the authoritative signal of electric heating.  Returns None when
        the sensor is absent (old installs without a current-power sensor).
        """
        entity_id = self._resolve_cbb_entity_id()
        if not isinstance(entity_id, str) or not entity_id:
            return None
        state = _state_for_entity(self.hass, entity_id)
        if state is None:
            return None
        raw = str(getattr(state, "state", "") or "").strip().lower()
        if raw in _UNAVAILABLE_TEMPERATURE_STATES:
            return None
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return None
        return value if math.isfinite(value) else None

    def _read_box_boiler_mode(self) -> Optional[str]:
        """Read normalised box boiler mode from sensor.oig_{box_id}_boiler_manual_mode.

        The OIG box reports 'CBB' (= surplus/auto mode) or manual-mode strings.
        Returns 'cbb' when CBB mode, 'manual' otherwise.  None = unavailable.
        """
        entity_id = getattr(self.coordinator, "_oig_manual_mode_entity", None)
        if not isinstance(entity_id, str) or not entity_id:
            return None
        state = _state_for_entity(self.hass, entity_id)
        if state is None:
            return None
        raw = str(getattr(state, "state", "") or "").strip()
        if not raw or raw.lower() in _UNAVAILABLE_TEMPERATURE_STATES:
            return None
        # The OIG box reports 'CBB' for the surplus/auto mode.
        if raw.upper() == "CBB":
            return "cbb"
        return "manual"

    def _read_grid_import_w(self) -> Optional[float]:
        """Read total household grid import in Watts.

        Uses sensor.oig_{box_id}_actual_aci_wtotal (sum of three phases).
        Falls back gracefully to None when the entity is absent or unavailable.

        This sensor is NOT configurable — it follows the standard OIG naming
        convention and is always present on active OIG installations.
        """
        box_id = getattr(self.coordinator, "box_id", None)
        if not box_id or box_id == "unknown":
            return None
        entity_id = f"sensor.oig_{box_id}_actual_aci_wtotal"
        state = _state_for_entity(self.hass, entity_id)
        if state is None:
            return None
        raw = str(getattr(state, "state", "") or "").strip().lower()
        if raw in _UNAVAILABLE_TEMPERATURE_STATES:
            return None
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return None
        return value if math.isfinite(value) else None

    def _read_nonbackup_power_w(self) -> Optional[float]:
        """Read live non-backup circuit power in Watts (actual_acinb_wtotal).

        The boiler sits on the non-backup circuit; its real draw is this value
        minus the learned other-loads baseline. Not configurable (standard OIG
        naming); None when absent/unavailable.
        """
        box_id = getattr(self, "box_id", None)
        if not box_id or box_id == "unknown":
            return None
        entity_id = f"sensor.oig_{box_id}_actual_acinb_wtotal"
        state = _state_for_entity(self.hass, entity_id)
        if state is None:
            return None
        raw = str(getattr(state, "state", "") or "").strip().lower()
        if raw in _UNAVAILABLE_TEMPERATURE_STATES:
            return None
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return None
        return value if math.isfinite(value) else None

    def _estimate_actual_power_w(
        self, commanded_w: Optional[float], curr: BoilerReading
    ) -> tuple[Optional[float], str]:
        """Estimate the boiler's REAL electric power (W), fusing the box command
        with the non-backup draw and the tank temperature trend.

        Returns (power_w, method). Returns (None, "legacy") when neither a CBB
        nor a non-backup signal exists, so the classifier keeps its switch-based
        fallback for old installs.
        """
        from ..const import CONF_BOILER_VOLUME_L
        from .heating_estimator import estimate_heating

        nb_w = self._read_nonbackup_power_w()
        if commanded_w is None and nb_w is None:
            return None, "legacy"

        # Temperature trend (°C/min) from the previous reading; the top sensor
        # tracks the thermostat zone best.
        trend: Optional[float] = None
        prev = self._last_activity_reading
        if (
            prev is not None
            and prev.top_temp_c is not None
            and curr.top_temp_c is not None
        ):
            try:
                dt_min = (curr.timestamp - prev.timestamp).total_seconds() / 60.0
                if dt_min > 0:
                    trend = (curr.top_temp_c - prev.top_temp_c) / dt_min
            except Exception:
                trend = None

        config = getattr(self.coordinator, "config", {}) or {}
        try:
            volume_l = float(config.get(CONF_BOILER_VOLUME_L, 200.0) or 200.0)
        except (TypeError, ValueError):
            volume_l = 200.0

        estimate = estimate_heating(
            commanded_w=commanded_w,
            nonbackup_total_w=nb_w,
            temp_trend_c_per_min=trend,
            volume_l=volume_l,
            baseline_w=getattr(self, "_boiler_other_load_baseline_w", None),
        )
        self._boiler_other_load_baseline_w = estimate.baseline_w
        self._last_heating_estimate = estimate
        return estimate.power_w, estimate.method

    def _read_alt_heat_delta_kwh(self) -> Optional[float]:
        """Read the gas/alt-heat meter delta since the previous classify call.

        Uses the configured ``boiler_alt_energy_sensor`` (e.g.
        ``sensor.termostat_energy_gas_hot_water`` — daily kWh counter).
        Returns positive delta when gas/heat-pump fired since the last call.
        Returns None when no sensor is configured.

        Implementation note: we track the last-seen value and return the
        difference.  The counter resets at midnight — that case produces a
        negative delta which is clamped to zero.
        """
        from ..const import CONF_BOILER_ALT_ENERGY_SENSOR
        config = getattr(self.coordinator, "config", {}) or {}
        entity_id = config.get(CONF_BOILER_ALT_ENERGY_SENSOR)
        if not isinstance(entity_id, str) or not entity_id:
            return None
        state = _state_for_entity(self.hass, entity_id)
        if state is None:
            return None
        raw = str(getattr(state, "state", "") or "").strip().lower()
        if raw in _UNAVAILABLE_TEMPERATURE_STATES:
            return None
        try:
            current_kwh = float(raw)
        except (TypeError, ValueError):
            return None
        if not math.isfinite(current_kwh):
            return None

        # Convert Wh to kWh if needed (unit attribute check)
        attrs = getattr(state, "attributes", {}) or {}
        if attrs.get("unit_of_measurement") == "Wh":
            current_kwh /= 1000.0

        prev_kwh = getattr(self, "_last_alt_heat_kwh", None)
        self._last_alt_heat_kwh: float = current_kwh
        if prev_kwh is None:
            return None
        delta = current_kwh - prev_kwh
        # Clamp midnight-reset negatives to zero
        return max(0.0, delta)

    def _record_timeline_entry(
        self,
        *,
        reading: BoilerReading,
        activity: BoilerActivityDTO,
        power_kw: Optional[float],
        changed_entity_id: Optional[str],
    ) -> None:
        source_key = self._timeline_source_key(activity)
        entry = {
            "timestamp": reading.timestamp,
            "top_temp_c": reading.top_temp_c,
            "bottom_temp_c": reading.bottom_temp_c,
            "source_key": source_key,
            "power_kw": power_kw,
            "activity_state": activity.state,
        }
        if self._timeline_buffer and self._timeline_buffer[-1]["timestamp"] == reading.timestamp:
            self._timeline_buffer[-1] = entry
            return

        if self._should_append_timeline_entry(entry):
            self._timeline_buffer.append(entry)
            if len(self._timeline_buffer) > _ACTIVITY_BUFFER_MAX:
                self._timeline_buffer = self._timeline_buffer[-_ACTIVITY_BUFFER_MAX:]
            return

        if changed_entity_id == self._configured_power_entity_id() and self._timeline_buffer:
            self._timeline_buffer[-1]["power_kw"] = power_kw

    def _timeline_source_key(self, activity: BoilerActivityDTO) -> Optional[str]:
        hint = activity.active_segment_hint
        if isinstance(hint, dict):
            key = hint.get("key")
            if key in _NORMALIZED_ACTIVITY_SOURCE_KEYS:
                return key
        return activity.source if activity.source in _NORMALIZED_ACTIVITY_SOURCE_KEYS else None

    def _should_append_timeline_entry(self, entry: dict[str, Any]) -> bool:
        if not self._timeline_buffer:
            return True
        previous = self._timeline_buffer[-1]
        if previous.get("source_key") != entry.get("source_key"):
            return True
        if previous.get("activity_state") != entry.get("activity_state"):
            return True
        elapsed = _datetime_age(entry["timestamp"], previous["timestamp"])
        return elapsed.total_seconds() >= _ACTIVITY_SAMPLE_SECONDS

    def _configured_power_entity_id(self) -> Optional[str]:
        config = getattr(self.coordinator, "config", {}) or {}
        entity_id = config.get(CONF_BOILER_HEATER_POWER_KW_ENTITY)
        return entity_id if isinstance(entity_id, str) and entity_id else None

    def _refresh_current_activity_stale_flags(self, now: datetime) -> None:
        if self._current_activity is None:
            return
        flags = self._rebuilt_activity_stale_flags(
            now=now,
            classifier_flags=self._last_classifier_stale_flags,
        )
        self._current_activity = _copy_activity_dto(
            self._current_activity,
            stale_flags=flags,
        )

    def _rebuilt_activity_stale_flags(
        self,
        *,
        now: datetime,
        classifier_flags: Sequence[str],
    ) -> list[str]:
        flags: list[str] = []
        for flag in classifier_flags:
            _append_unique_flag(flags, flag)
        for flag in self._elapsed_activity_flags(now):
            _append_unique_flag(flags, flag)
        for flag in sorted(self._segment_derivation_flags):
            _append_unique_flag(flags, flag)
        return flags

    def _elapsed_activity_flags(self, now: datetime) -> list[str]:
        flags: list[str] = []
        if self._temperature_state_is_stale(now):
            flags.append("temperature_stale")
        if self._source_state_is_stale(now):
            flags.append("source_stale")
        if self._activity_cache_is_stale(now):
            flags.append("activity_stale")
        return flags

    def _temperature_state_is_stale(self, now: datetime) -> bool:
        config = getattr(self.coordinator, "config", {}) or {}
        for key in (CONF_BOILER_TEMP_SENSOR_TOP, CONF_BOILER_TEMP_SENSOR_BOTTOM):
            entity_id = config.get(key)
            if not entity_id:
                continue
            state = _state_for_entity(self.hass, entity_id)
            updated_at = _state_last_updated(state)
            if updated_at and _datetime_age(now, updated_at) > _ACTIVITY_TEMPERATURE_STALE_AFTER:
                return True
        return False

    def _source_state_is_stale(self, now: datetime) -> bool:
        """Source entities push on change — a constant value is NOT stale.

        boiler_manual_mode reads "CBB" for days and cbb power sits at 0 W for
        hours; age-based staleness produced permanent false alarms. Stale only
        when no source entity provides a usable state.
        """
        found_any = False
        for entity_id in (
            getattr(self.coordinator, "_oig_manual_mode_entity", None),
            getattr(self.coordinator, "_oig_current_cbb_entity", None),
        ):
            state = _state_for_entity(self.hass, entity_id)
            if state is None:
                continue
            found_any = True
            raw = str(getattr(state, "state", "")).lower()
            if raw not in ("unknown", "unavailable", ""):
                return False
        if found_any:
            return True
        return self._activity_cache_is_stale(now)

    def _activity_cache_is_stale(self, now: datetime) -> bool:
        if self._last_activity_event_at is None:
            return False
        return _datetime_age(now, self._last_activity_event_at) > _ACTIVITY_STALE_AFTER

    @property
    def source_segments(self) -> list[dict[str, Any]]:
        segments = self._derive_source_segments()
        return self._compute_fill_percentages(segments)

    @property
    def sparklines(self) -> dict[str, list[float]]:
        return self._derive_sparklines()

    def _derive_source_segments(self) -> list[dict[str, Any]]:
        self._segment_derivation_flags.clear()
        buffer = self._timeline_buffer
        if not buffer:
            return []

        segments: list[dict[str, Any]] = []
        current_segment: dict[str, Any] | None = None

        for i in range(len(buffer)):
            entry = buffer[i]
            source_key = entry.get("source_key")
            timestamp = entry.get("timestamp")
            power_kw = entry.get("power_kw")

            if source_key is None or source_key == "unknown":
                if current_segment is not None:
                    current_segment["end"] = timestamp
                    current_segment["active"] = False
                    segments.append(current_segment)
                    current_segment = None
                continue

            if current_segment is None or current_segment["key"] != source_key:
                if current_segment is not None:
                    current_segment["end"] = timestamp
                    current_segment["active"] = False
                    segments.append(current_segment)
                current_segment = {
                    "key": source_key,
                    "start": timestamp,
                    "end": None,
                    "energy_kwh": 0.0,
                    "fill_pct": 0.0,
                    "active": True,
                }

            if i + 1 < len(buffer):
                next_entry = buffer[i + 1]
                duration_hours = self._duration_hours(timestamp, next_entry.get("timestamp"))
            elif current_segment is not None and current_segment["key"] == source_key:
                duration_hours = 0.0
            else:
                duration_hours = 0.0

            energy = self._compute_interval_energy(source_key, power_kw, duration_hours)
            if current_segment is not None:
                current_segment["energy_kwh"] += energy

        if current_segment is not None:
            segments.append(current_segment)

        return segments

    def _duration_hours(self, start: Any, end: Any) -> float:
        if start is None or end is None:
            return 0.0
        if not isinstance(start, datetime) or not isinstance(end, datetime):
            return 0.0
        delta = end - start
        return max(0.0, delta.total_seconds() / 3600.0)

    def _compute_interval_energy(
        self, source_key: str, power_kw: Optional[float], duration_hours: float
    ) -> float:
        if power_kw is None:
            return 0.0

        # Detect sign anomalies before the duration guard so single-entry buffers
        # (duration=0) still get flagged.
        if source_key == "discharge":
            # Strictly positive power during discharge is an anomaly; 0 W is
            # a normal idle reading, not a sign mismatch.
            if power_kw > 0:
                self._segment_derivation_flags.add("power_sign_mismatch_discharge")
                return 0.0
        else:
            if power_kw < 0:
                self._segment_derivation_flags.add("power_sign_mismatch_charge")
                return 0.0

        if duration_hours <= 0.0:
            return 0.0

        if source_key == "discharge":
            return abs(power_kw) * duration_hours
        else:
            return power_kw * duration_hours

    def _compute_fill_percentages(
        self, segments: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        if not segments:
            return []

        current_fill = 0.0
        activity = self._current_activity
        if activity is not None:
            current_fill = getattr(activity, "fill_level_pct", 0.0) or 0.0

        non_discharge_segments = [s for s in segments if s["key"] != "discharge"]
        total_non_discharge_energy = sum(s["energy_kwh"] for s in non_discharge_segments)

        if total_non_discharge_energy > 0.0:
            for segment in segments:
                if segment["key"] == "discharge":
                    segment["fill_pct"] = 0.0
                else:
                    segment["fill_pct"] = round(
                        (segment["energy_kwh"] / total_non_discharge_energy) * current_fill, 3
                    )
        elif non_discharge_segments:
            equal_fill = round(current_fill / len(non_discharge_segments), 3)
            for segment in segments:
                if segment["key"] != "discharge":
                    segment["fill_pct"] = equal_fill
                else:
                    segment["fill_pct"] = 0.0
        else:
            for segment in segments:
                segment["fill_pct"] = 0.0

        self._adjust_fill_invariant(segments, current_fill)
        return segments

    def _adjust_fill_invariant(
        self, segments: list[dict[str, Any]], target_fill: float
    ) -> None:
        for _ in range(3):
            non_discharge = [s for s in segments if s["key"] != "discharge"]
            if not non_discharge:
                break

            current_sum = sum(s["fill_pct"] for s in non_discharge)
            delta = round(target_fill - current_sum, 3)
            if abs(delta) < 0.001:
                break

            largest = max(non_discharge, key=lambda s: s["fill_pct"])
            largest["fill_pct"] = round(largest["fill_pct"] + delta, 3)

            clamped = False
            for segment in non_discharge:
                old_val = segment["fill_pct"]
                segment["fill_pct"] = max(0.0, min(target_fill, segment["fill_pct"]))
                if segment["fill_pct"] != old_val:
                    clamped = True

            if not clamped:
                break

    def _derive_sparklines(self) -> dict[str, list[float]]:
        buffer = self._timeline_buffer
        temps: list[float] = []
        powers: list[float] = []

        for entry in buffer:
            top_temp = entry.get("top_temp_c")
            if top_temp is not None and isinstance(top_temp, (int, float)):
                temps.append(float(top_temp))

            power = entry.get("power_kw")
            if power is not None and isinstance(power, (int, float)):
                powers.append(float(power))

        return {
            "temperature": temps[-20:] if len(temps) > 20 else temps,
            "power": powers[-20:] if len(powers) > 20 else powers,
        }

    def get_current_profile(self) -> Optional[BoilerProfile]:
        return self.read_model.get_current_profile()

    def get_current_plan(self) -> Optional[BoilerPlan]:
        if self._current_plan is not _UNSET:
            return self._current_plan  # type: ignore[return-value]
        return self.read_model.get_current_plan()

    async def async_ensure_profile(self) -> Optional[BoilerProfile]:
        return await self.read_model.async_ensure_profile()

    async def _async_read_energy_input(self) -> BoilerEnergyInput:
        try:
            return await self.energy_adapter.async_get_energy_input()
        except Exception as err:
            _LOGGER.error("Boiler energy input adapter failed: %s", err, exc_info=True)
            return BoilerEnergyInput(
                spot_prices={},
                overflow_windows=[],
                reason_codes=[
                    PlannerReasonCode.INPUT_ADAPTER_ERROR,
                    PlannerReasonCode.INPUT_STALE_PRICE,
                    PlannerReasonCode.INPUT_STALE_PV,
                ],
            )

    async def _async_build_planner_input(
        self,
        *,
        now: datetime,
        deadline_override: Optional[str] = None,
    ) -> Optional[PlannerInput]:
        profile = await self.async_ensure_profile()
        if not profile:
            return None

        energy_input = await self._async_read_energy_input()
        spot_prices = energy_input.spot_prices
        overflow_windows = energy_input.overflow_windows
        reason_codes = list(energy_input.reason_codes)
        for reason in _profile_reason_codes(profile):
            _append_reason(reason_codes, reason)

        config = getattr(self.coordinator, "config", {}) or {}
        temperature_state = resolve_temperature_state(
            hass=self.hass,
            config=config,
            now=now,
        )
        for reason in temperature_state.reason_codes:
            _append_reason(reason_codes, reason)
        if temperature_state.safe_hold and config.get(CONF_BOILER_TEMP_SENSOR_TOP):
            _LOGGER.warning(
                "Boiler planner safe-hold for %s/%s: %s",
                self.entry_id,
                self.box_id,
                PlannerReasonCode.TOP_SENSOR_UNAVAILABLE.value,
            )
            self._current_plan = None
            return None

        deadline = deadline_override or config.get(
            CONF_BOILER_DEADLINE_TIME, DEFAULT_BOILER_DEADLINE_TIME
        )
        deadline = _normalize_deadline_time(deadline, DEFAULT_BOILER_DEADLINE_TIME)
        has_alternative = config.get(CONF_BOILER_HAS_ALTERNATIVE_HEATING, False)
        alt_cost_kwh = config.get(CONF_BOILER_ALT_COST_KWH, 0.0)
        alt_switch = config.get(CONF_BOILER_ALT_HEATER_SWITCH_ENTITY)
        alt_capability = resolve_alt_source_capability(
            has_alternative=has_alternative,
            actuator_model="switch" if alt_switch else None,
            supported_models={"switch"},
        )
        # R3: pass battery_usable_kwh from battery forecast data if available.
        battery_raw: dict[str, Any] = {"overflow_windows": overflow_windows}
        battery_data = self.energy_adapter._resolve_entry_battery_data() if hasattr(
            self.energy_adapter, "_resolve_entry_battery_data"
        ) else None
        if isinstance(battery_data, dict) and "battery_usable_kwh" in battery_data:
            battery_raw["battery_usable_kwh"] = battery_data["battery_usable_kwh"]
        battery_signals = BoilerBatterySignals.from_raw(battery_raw)

        # R3/R7: home5_available requires BOTH box capability AND boiler opt-in flags.
        home5_available = bool(
            config.get(CONF_BOX_HAS_HOME56, DEFAULT_BOX_HAS_HOME56)
            and config.get(CONF_BOILER_HOME5_MANEUVER_ENABLED, DEFAULT_BOILER_HOME5_MANEUVER_ENABLED)
        )

        # F3a: derive demand_targets from coordinator._demand_profiler.
        # Falls back to [] (legacy single-deadline mode) when:
        # - demand profiler is absent (bootstrap install),
        # - confidence < MIN_CONFIDENCE_THRESHOLD (low-history path),
        # - any unexpected error (defensive; zero regression).
        demand_targets = _build_demand_targets(
            coordinator=self.coordinator,
            now=now,
            horizon_hours=planner_input_horizon_hours(config),
        )

        # R9: build legionella obligation from config + recorder history.
        # Runs only when CONF_BOILER_LEGIONELLA_INTERVAL_DAYS > 0 (default 7).
        topology_for_legionella = _build_planner_topology(config)
        legionella_obligation = await _async_build_legionella_obligation(
            self.hass,
            config=config,
            now=now,
            current_top_temp_c=temperature_state.top_temp_c,
            topology=topology_for_legionella,
            cache=self._legionella_cache,
        )

        # F5: read configured battery cycle cost (fallback to const default).
        battery_cycle_cost = float(
            config.get(CONF_BOILER_BATTERY_CYCLE_COST, DEFAULT_BOILER_BATTERY_CYCLE_COST)
        )

        planner_input = PlannerInput(
            entry_id=self.entry_id,
            box_id=self.box_id,
            profile=profile,
            spot_prices=spot_prices,
            overflow_windows=overflow_windows,
            deadline_time=deadline,
            topology=topology_for_legionella,
            current_top_temp_c=temperature_state.top_temp_c,
            current_bottom_temp_c=temperature_state.bottom_temp_c,
            temperature_updated_at=temperature_state.top_updated_at,
            alt_source_capability=alt_capability,
            alt_cost_kwh=alt_cost_kwh,
            pv_forecast=energy_input.pv_forecast,
            pv_confidence=energy_input.pv_confidence,
            battery_signals=battery_signals,
            reason_codes=reason_codes,
            demand_targets=demand_targets,
            legionella_obligation=legionella_obligation,
            home5_available=home5_available,
            battery_cycle_cost_czk_kwh=battery_cycle_cost,
            thermal_arbitrage_enabled=bool(
                config.get(CONF_BOILER_THERMAL_ARBITRAGE_ENABLED, False)
            ),
            alt_power_kw=_float_config(config, CONF_BOILER_ALT_POWER_KW, 0.0),
        )

        is_fresh, stale_reasons = validate_freshness(planner_input, now=now)
        if not is_fresh:
            for reason in stale_reasons:
                _append_reason(planner_input.reason_codes, reason)
                _LOGGER.debug("Boiler planner input stale: %s", reason.value)
        return planner_input

    async def async_request_replan(
        self,
        trigger: str,
        *,
        now: Optional[datetime] = None,
        temperature_c: Optional[float] = None,
        deadline_override: Optional[str] = None,
    ) -> Optional[PlanResult]:
        """Handle an accepted Task 6b replan trigger and hand off PlanResult."""
        if trigger not in _ACCEPTED_REPLAN_TRIGGERS:
            return self.last_plan_result
        if now is None:
            now = dt_util.now()
        if self._temperature_update_is_below_delta(trigger, temperature_c):
            return self.last_plan_result

        forced = trigger in _FORCED_REPLAN_TRIGGERS
        if self._replan_inside_cooldown(now, forced):
            return self._coalesced_plan_result()

        planner_input = await self._async_build_planner_input(
            now=now,
            deadline_override=deadline_override,
        )
        if planner_input is None:
            return None
        _append_trigger_reason(planner_input.reason_codes, trigger)

        result = plan_comfort_core(
            planner_input,
            now=now,
            previous_plan=self.last_plan_result,
        )
        self.last_plan_result = result
        self._current_plan = plan_result_to_boiler_plan(
            result,
            planner_input=planner_input,
        )
        self._last_replan_at = now
        if trigger == "temperature_update" and temperature_c is not None:
            self._last_replan_temperature_c = temperature_c
        await self._async_enqueue_plan_result(result)
        return result

    def _temperature_update_is_below_delta(
        self,
        trigger: str,
        temperature_c: Optional[float],
    ) -> bool:
        if trigger != "temperature_update" or temperature_c is None:
            return False
        previous = self._last_replan_temperature_c
        if previous is None:
            return False
        return abs(temperature_c - previous) < _TEMPERATURE_REPLAN_DELTA_C

    def _replan_inside_cooldown(self, now: datetime, forced: bool) -> bool:
        if forced or self._last_replan_at is None:
            return False
        return _datetime_age(now, self._last_replan_at) < _REPLAN_COOLDOWN

    def _coalesced_plan_result(self) -> Optional[PlanResult]:
        if self.last_plan_result is None:
            return None
        _append_reason(
            self.last_plan_result.reason_codes,
            PlannerReasonCode.REPLAN_COALESCED,
        )
        return self.last_plan_result

    async def _async_enqueue_plan_result(self, result: PlanResult) -> None:
        """Task 7a serializer seam: enqueue accepted PlanResult as actuator command."""
        self.plan_result_handoff.append(result)
        if self._serializer is None:
            return
        # H2: enqueue() raises if the serializer is not RUNNING/DEGRADED (e.g.
        # still starting up or already stopped during teardown). The handoff list
        # above is the durable record, so just skip enqueue rather than letting a
        # transient state abort the whole replan.
        from .actuator import ActuatorSerializerState

        if self._serializer.state not in (
            ActuatorSerializerState.RUNNING,
            ActuatorSerializerState.DEGRADED,
        ):
            return
        from .actuator import ActuatorCommand, ActuatorCommandPriority, ActuatorCommandType, SourceIntent

        source = result.selected_source
        source_intent = SourceIntent.PRIMARY
        if source is not None:
            source_intent = SourceIntent.ALTERNATIVE if source.value == "alternative" else SourceIntent.PRIMARY
        cmd = ActuatorCommand(
            entry_id=self.entry_id,
            box_id=self.box_id,
            command_type=ActuatorCommandType.APPLY,
            plan_version=getattr(result, "plan_version", 0) or 0,
            config_version=getattr(self.coordinator, "config_version", 0) or 0,
            priority=ActuatorCommandPriority.REPLAN,
            source_intent=source_intent,
            payload={"actuated_source": getattr(result, "actuated_source", None)},
        )
        await self._serializer.enqueue(cmd)

    def _last_plan_had_stale_inputs(self) -> bool:
        result = self.last_plan_result
        codes = getattr(result, "reason_codes", None) or []
        return (
            PlannerReasonCode.INPUT_STALE_PRICE in codes
            or PlannerReasonCode.INPUT_STALE_PV in codes
        )

    async def async_create_plan(
        self,
        force: bool = False,
        deadline_override: Optional[str] = None,
    ) -> Optional[BoilerPlan]:
        now = dt_util.now()
        plan = self.get_current_plan()
        if plan and not force and getattr(plan, "valid_until", now) > now:
            # A cached plan built with stale inputs (e.g. the startup race
            # where the boiler plans before the battery pipeline publishes
            # prices/overflow) must NOT be served for its whole 24h validity.
            # Rebuild on the coordinator cadence until inputs are fresh; if
            # they are still missing the rebuilt plan is equivalent.
            if not self._last_plan_had_stale_inputs():
                return plan

        profile = await self.async_ensure_profile()
        if not profile:
            return None

        planner_input = await self._async_build_planner_input(
            now=now,
            deadline_override=deadline_override,
        )
        if planner_input is None:
            return None

        try:
            result = plan_comfort_core(
                planner_input,
                now=now,
                previous_plan=self.last_plan_result,
            )
        except Exception as err:
            _LOGGER.error("Chyba při tvorbě plánu: %s", err)
            return None

        self.last_plan_result = result
        new_plan = plan_result_to_boiler_plan(
            result,
            planner_input=planner_input,
        )
        self._current_plan = new_plan

        # R5: rebuild circulation schedule from the same demand_targets used for planning.
        config = getattr(self.coordinator, "config", {}) or {}
        self._circulation_runs = _build_circulation_schedule(
            demand_targets=planner_input.demand_targets,
            now=now,
            config=config,
        )

        # R3: Home 5 maneuver actuation — tick on every plan cycle.
        await self._async_tick_home5_maneuver(now=now)

        return new_plan

    async def _async_tick_circulation_pump(self) -> None:
        """Called each 5-min coordinator cycle to actuate the circulation pump.

        Logic:
        - Feature disabled or no pump entity → always turn_off if we turned it on.
        - Inside a run window → turn_on (if not already on and entity available).
        - Outside all run windows → turn_off only if we turned it on (non-interference).
        - Pump entity unavailable → emit CIRCULATION_PUMP_UNAVAILABLE reason code;
          do not turn_on.
        """
        config = getattr(self.coordinator, "config", {}) or {}
        enabled = bool(config.get(CONF_BOILER_CIRCULATION_ENABLED, DEFAULT_BOILER_CIRCULATION_ENABLED))
        pump_entity = config.get(CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY)

        # Feature turned off mid-flight or pump entity removed: turn off pump if we turned it on.
        if not enabled or not pump_entity:
            if self._circulation_pump_on:
                if pump_entity:
                    await _async_actuate_circulation_pump(
                        self.hass,
                        pump_entity=pump_entity,
                        turn_on=False,
                    )
                else:
                    # pump_entity was removed from config while pump was running.
                    # We can't issue a service call without an entity — log the orphan.
                    _LOGGER.warning(
                        "Circulation pump entity removed while pump was ON for entry=%s box=%s; "
                        "pump may still be running — please turn it off manually.",
                        self.entry_id,
                        self.box_id,
                    )
                self._circulation_pump_on = False
            return

        # Check entity existence.
        state = _state_for_entity(self.hass, pump_entity)
        if state is None:
            # Entity not registered in HA yet — emit reason code.
            if self.last_plan_result is not None:
                _append_reason(
                    self.last_plan_result.reason_codes,
                    PlannerReasonCode.CIRCULATION_PUMP_UNAVAILABLE,
                )
            if self._circulation_pump_on:
                # We can't turn it off either, just reset our flag.
                self._circulation_pump_on = False
            return

        now = dt_util.now()
        inside_run = False
        for run_start, run_end, _label in self._circulation_runs:
            if run_start <= now < run_end:
                inside_run = True
                break

        if inside_run and not self._circulation_pump_on:
            success = await _async_actuate_circulation_pump(
                self.hass,
                pump_entity=pump_entity,
                turn_on=True,
            )
            if success:
                self._circulation_pump_on = True
        elif not inside_run and self._circulation_pump_on:
            await _async_actuate_circulation_pump(
                self.hass,
                pump_entity=pump_entity,
                turn_on=False,
            )
            self._circulation_pump_on = False

    def _is_home5_currently_set(self) -> bool:
        """Return True when the hardware home_grid_v bit is already ON.

        Reads box_prm2.app from coordinator data (same path as the service handler).
        Returns False when state is unknown (bit 0 is unset for raw values 0, 2, 4).
        """
        try:
            coordinator_data = getattr(self.coordinator, "data", None)
            if not isinstance(coordinator_data, dict):
                return False
            # Try direct box_prm2 key first (single-box layout).
            box_prm2 = coordinator_data.get("box_prm2")
            if isinstance(box_prm2, dict):
                raw = box_prm2.get("app")
                if isinstance(raw, str) and raw.isdigit():
                    raw = int(raw)
                if isinstance(raw, int):
                    return bool(raw & 1)  # bit 0 = home_grid_v
            # Multi-box layout: iterate device buckets.
            for device_data in coordinator_data.values():
                if not isinstance(device_data, dict):
                    continue
                box_prm2 = device_data.get("box_prm2")
                if not isinstance(box_prm2, dict):
                    continue
                raw = box_prm2.get("app")
                if isinstance(raw, str) and raw.isdigit():
                    raw = int(raw)
                if isinstance(raw, int):
                    return bool(raw & 1)
        except Exception:
            pass
        return False

    async def _async_tick_home5_maneuver(self, *, now: Optional[datetime] = None) -> None:
        """Actuate Home 5 (battery-discharge) bit based on current plan slot source.

        Non-interference rule: we only clear the bit if WE set it
        (_home5_engaged_by_planner). If the user manually enabled Home 5 before
        a battery slot starts, we skip ownership claim entirely.

        Safety: wraps the service call in try/except — service raises when box is
        in flexibilita mode (box_prm2.app == 4).  On turn-ON failure the flag is
        cleared; on turn-OFF failure the flag is kept so the next tick retries.
        """
        if now is None:
            now = dt_util.now()

        config = getattr(self.coordinator, "config", {}) or {}
        home5_feature_on = bool(
            config.get(CONF_BOX_HAS_HOME56, DEFAULT_BOX_HAS_HOME56)
            and config.get(CONF_BOILER_HOME5_MANEUVER_ENABLED, DEFAULT_BOILER_HOME5_MANEUVER_ENABLED)
        )

        # Feature turned off mid-flight: release the bit if we set it.
        if not home5_feature_on:
            if self._home5_engaged_by_planner:
                await self._async_set_home5_bit(False)
            return

        # Determine whether current plan slot is battery-sourced.
        current_slot_is_battery = False
        plan_result = self.last_plan_result
        if plan_result is not None:
            for slot in getattr(plan_result, "slots", []):
                if slot.start <= now < slot.end:
                    from .models import EnergySource
                    current_slot_is_battery = getattr(slot, "source", None) == EnergySource.BATTERY
                    break

        if current_slot_is_battery and not self._home5_engaged_by_planner:
            # Non-interference: if the user already has Home 5 active before the
            # battery slot starts, do NOT claim ownership — we would later turn it
            # off when the slot ends, violating the user's setting.
            if self._is_home5_currently_set():
                _LOGGER.debug(
                    "Home 5 maneuver: bit already set by user for entry=%s box=%s — "
                    "skipping ownership claim",
                    self.entry_id,
                    self.box_id,
                )
                return
            # Turn Home 5 ON — battery source slot, feature enabled.
            await self._async_set_home5_bit(True)
        elif not current_slot_is_battery and self._home5_engaged_by_planner:
            # Turn Home 5 OFF — no longer in a battery source slot.
            await self._async_set_home5_bit(False)

    async def _async_set_home5_bit(self, enable: bool) -> None:
        """Call oig_cloud.set_box_mode to toggle the Home 5 (home_grid_v) bit.

        Targets the correct box using device_id from the HA device registry so
        multi-entry installations always toggle the right inverter.

        On success, updates _home5_engaged_by_planner.
        On turn-ON failure: clears the flag (we don't own the bit).
        On turn-OFF failure: keeps _home5_engaged_by_planner=True so the next
          coordinator tick retries, preventing a permanently stuck Home 5 bit.
        """
        # Resolve device_id so the service targets our specific entry/box, not
        # whichever entry registered the service first (multi-entry safety).
        service_data: dict = {"home_grid_v": enable, "acknowledgement": True}
        try:
            from homeassistant.helpers import device_registry as dr
            _dr = dr.async_get(self.hass)
            _dev = _dr.async_get_device(identifiers={(DOMAIN, self.box_id)})
            if _dev is not None:
                service_data["device_id"] = _dev.id
        except Exception:
            pass  # device registry unavailable in tests — proceed without device_id

        try:
            await self.hass.services.async_call(
                "oig_cloud",
                "set_box_mode",
                service_data,
                blocking=True,
            )
            self._home5_engaged_by_planner = enable
            _LOGGER.debug(
                "Home 5 maneuver: home_grid_v=%s for entry=%s box=%s",
                enable,
                self.entry_id,
                self.box_id,
            )
        except Exception as err:
            _LOGGER.warning(
                "Home 5 maneuver: failed to set home_grid_v=%s for entry=%s box=%s: %s",
                enable,
                self.entry_id,
                self.box_id,
                err,
            )
            if enable:
                # Turn-ON failed: we don't own the bit, clear the flag.
                self._home5_engaged_by_planner = False
            # Turn-OFF failed (e.g. flexibilita mode active): keep
            # _home5_engaged_by_planner=True so next coordinator tick retries.
            # This prevents the bit from being permanently stuck when flexibilita
            # is later deactivated.

    async def async_apply_plan(self, entry_id: str) -> None:
        plan = self.get_current_plan()
        profile = self.get_current_profile()
        config = getattr(self.coordinator, "config", {}) or {}
        if self._serializer is not None and self._serializer.state == ActuatorSerializerState.RUNNING:
            from .actuator import ActuatorCommand, ActuatorCommandPriority, ActuatorCommandType, SourceIntent
            cmd = ActuatorCommand(
                entry_id=self.entry_id,
                box_id=self.box_id,
                command_type=ActuatorCommandType.APPLY,
                plan_version=0,
                config_version=0,
                priority=ActuatorCommandPriority.CONFIG,
                source_intent=SourceIntent.PRIMARY,
                payload={},
            )
            await self._serializer.enqueue(cmd)
            return
        await self.actuator.async_apply_plan(
            plan=plan,
            profile=profile,
            config=config,
            box_id=self.box_id,
            entry_id=entry_id,
        )

    async def async_cancel_plan(self, entry_id: str, clear_plan: bool = False) -> None:
        if self._serializer is not None and self._serializer.state == ActuatorSerializerState.RUNNING:
            from .actuator import ActuatorCommand, ActuatorCommandPriority, ActuatorCommandType, SourceIntent
            cmd = ActuatorCommand(
                entry_id=self.entry_id,
                box_id=self.box_id,
                command_type=ActuatorCommandType.CANCEL,
                plan_version=0,
                config_version=0,
                priority=ActuatorCommandPriority.SAFETY,
                source_intent=SourceIntent.NONE,
                payload={},
            )
            await self._serializer.enqueue(cmd)
        else:
            await self.actuator.async_cancel_plan(entry_id, clear_plan)
        if clear_plan:
            self._current_plan = None

    async def async_request_refresh(self) -> None:
        if hasattr(self.coordinator, "async_request_refresh"):
            await self.coordinator.async_request_refresh()


def create_boiler_runtime(
    hass: HomeAssistant,
    coordinator: Any,
    entry_id: str,
    box_id: str,
) -> BoilerRuntime:
    read_model = _CoordinatorReadModel(coordinator)
    planner = _CoordinatorPlanner(coordinator)
    energy_adapter = _CoordinatorEnergyInputAdapter(
        coordinator,
        entry_id=entry_id,
        box_id=box_id,
    )

    from .actuator import BoilerActuator, BoilerActuatorSerializer

    actuator = BoilerActuator(hass)
    serializer = BoilerActuatorSerializer(hass=hass, entry_id=entry_id, box_id=box_id)

    runtime = BoilerRuntime(
        hass=hass,
        read_model=read_model,
        planner=planner,
        actuator=actuator,
        energy_adapter=energy_adapter,
        coordinator=coordinator,
        box_id=box_id,
        entry_id=entry_id,
        serializer=serializer,
    )

    domain_data = hass.data.setdefault(DOMAIN, {})
    entry_data = domain_data.setdefault(entry_id, {})
    runtimes = entry_data.setdefault(KEY_BOILER_RUNTIMES, {})
    runtimes[box_id] = runtime

    # H2: actually start the actuator serializer so its consumer loop runs and
    # persisted override/config state is restored. start() is idempotent and
    # destroy_boiler_runtime() stops it on teardown.
    if hasattr(hass, "async_create_task"):
        hass.async_create_task(serializer.start())
        # Restore today's per-source energy attribution so a restart/deploy does
        # not zero the day's counter (it would otherwise "start counting now").
        hass.async_create_task(runtime.async_load_daily_source())

    return runtime


def _create_runtime_for_coordinator(
    hass: HomeAssistant,
    coordinator: Any,
    entry_id: str,
    box_id: str,
) -> BoilerRuntime:
    read_model = _CoordinatorReadModel(coordinator)
    planner = _CoordinatorPlanner(coordinator)
    energy_adapter = _CoordinatorEnergyInputAdapter(
        coordinator,
        entry_id=entry_id,
        box_id=box_id,
    )

    from .actuator import BoilerActuator, BoilerActuatorSerializer

    actuator = BoilerActuator(hass)
    serializer = BoilerActuatorSerializer(hass=hass, entry_id=entry_id, box_id=box_id)

    runtime = BoilerRuntime(
        hass=hass,
        read_model=read_model,
        planner=planner,
        actuator=actuator,
        energy_adapter=energy_adapter,
        coordinator=coordinator,
        box_id=box_id,
        entry_id=entry_id,
        serializer=serializer,
    )

    # H2: start the serializer for the lazily-created (service-call) runtime too.
    if hasattr(hass, "async_create_task"):
        hass.async_create_task(serializer.start())
        hass.async_create_task(runtime.async_load_daily_source())

    return runtime


def get_boiler_runtime(
    hass: HomeAssistant,
    entry_id: str,
    box_id: str,
) -> Optional[BoilerRuntime]:
    domain_data = hass.data.get(DOMAIN, {})
    entry_data = domain_data.get(entry_id)
    if not isinstance(entry_data, dict):
        return None
    runtimes = entry_data.get(KEY_BOILER_RUNTIMES)
    if not isinstance(runtimes, dict):
        return None
    return runtimes.get(box_id)


def destroy_boiler_runtime(
    hass: HomeAssistant,
    entry_id: str,
    box_id: str,
) -> None:
    domain_data = hass.data.get(DOMAIN, {})
    entry_data = domain_data.get(entry_id)
    if not isinstance(entry_data, dict):
        return
    runtimes = entry_data.get(KEY_BOILER_RUNTIMES)
    if isinstance(runtimes, dict):
        runtime = runtimes.pop(box_id, None)
        if runtime is not None:
            if hasattr(runtime, "unload_activity_listeners"):
                try:
                    runtime.unload_activity_listeners()
                except Exception as exc:
                    _LOGGER.warning(
                        "Error unloading activity listeners during runtime destroy: %s",
                        exc,
                    )
            if hasattr(runtime, "_serializer") and runtime._serializer is not None:
                try:
                    if hasattr(hass, "async_create_task"):
                        hass.async_create_task(runtime._serializer.stop())
                except Exception as exc:
                    _LOGGER.warning(
                        "Error stopping serializer during runtime destroy: %s", exc
                    )
            if hasattr(runtime, "actuator"):
                try:
                    if hasattr(hass, "async_create_task"):
                        hass.async_create_task(runtime.actuator.async_cancel_plan(entry_id))
                except Exception as exc:
                    _LOGGER.warning(
                        "Error cancelling plan during runtime destroy: %s", exc
                    )
            # R3/R5: release Home 5 bit and turn off circulation pump on unload
            # so hardware is not left in an active state after HA reload/restart.
            if hasattr(hass, "async_create_task"):
                if (
                    hasattr(runtime, "_home5_engaged_by_planner")
                    and runtime._home5_engaged_by_planner
                ):
                    try:
                        hass.async_create_task(runtime._async_set_home5_bit(False))
                    except Exception as exc:
                        _LOGGER.warning(
                            "Error releasing Home 5 bit during runtime destroy: %s", exc
                        )
                if (
                    hasattr(runtime, "_circulation_pump_on")
                    and runtime._circulation_pump_on
                    and hasattr(runtime, "_async_tick_circulation_pump")
                ):
                    try:
                        hass.async_create_task(runtime._async_tick_circulation_pump())
                    except Exception as exc:
                        _LOGGER.warning(
                            "Error turning off circulation pump during runtime destroy: %s", exc
                        )
