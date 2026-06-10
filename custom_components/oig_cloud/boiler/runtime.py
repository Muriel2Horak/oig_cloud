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
    CONF_BOILER_COLD_INLET_TEMP_C,
    CONF_BOILER_DEADLINE_TIME,
    CONF_BOILER_HAS_ALTERNATIVE_HEATING,
    CONF_BOILER_STRATIFICATION_MODE,
    CONF_BOILER_TARGET_TEMP_C,
    CONF_BOILER_HEATER_POWER_KW_ENTITY,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    CONF_BOILER_TEMP_SENSOR_BOTTOM,
    CONF_BOILER_TEMP_SENSOR_TOP,
    CONF_BOILER_VOLUME_L,
    DEFAULT_BOILER_COLD_INLET_TEMP_C,
    DEFAULT_BOILER_DEADLINE_TIME,
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
    PlannerInput,
    PlannerReasonCode,
    resolve_alt_source_capability,
    validate_freshness,
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
_ACTIVITY_TEMPERATURE_STALE_AFTER = timedelta(seconds=300)
_ACTIVITY_SOURCE_STALE_AFTER = timedelta(seconds=600)
_ACTIVITY_STALE_AFTER = timedelta(seconds=600)
_NORMALIZED_ACTIVITY_SOURCE_KEYS = frozenset({"fve", "overflow", "grid", "discharge"})
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
        if not isinstance(raw_windows, list) or not raw_windows:
            return [], [PlannerReasonCode.INPUT_STALE_PV]

        windows: list[tuple[datetime, datetime]] = []
        for raw_window in raw_windows:
            parsed = _parse_adapter_overflow_window(raw_window)
            if parsed:
                windows.append(parsed)

        reasons = [] if windows else [PlannerReasonCode.INPUT_STALE_PV]
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
        standing_loss_coefficient=0.0,
    )


def _float_config(config: dict[str, Any], key: str, default: float) -> float:
    try:
        return float(config.get(key, default))
    except (TypeError, ValueError):
        return default


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
        ):
            self._add_activity_entity_id(entity_ids, config.get(key))
        self._add_activity_entity_id(
            entity_ids,
            getattr(self.coordinator, "_oig_manual_mode_entity", None),
        )
        self._add_activity_entity_id(
            entity_ids,
            getattr(self.coordinator, "_oig_current_cbb_entity", None),
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
        snapshot = BoilerSourceHeaterSnapshot(
            current_source=self._read_current_source_snapshot(),
            active_heaters=self._read_active_heater_states(),
            overflow_available=self._read_overflow_available(event_timestamp),
            power_kw=self._read_live_power_kw(),
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
        self._record_timeline_entry(
            reading=curr,
            activity=activity,
            power_kw=snapshot.power_kw,
            changed_entity_id=changed_entity_id,
        )

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
        found_source_state = False
        for entity_id in (
            getattr(self.coordinator, "_oig_manual_mode_entity", None),
            getattr(self.coordinator, "_oig_current_cbb_entity", None),
        ):
            state = _state_for_entity(self.hass, entity_id)
            updated_at = _state_last_updated(state)
            if updated_at is None:
                continue
            found_source_state = True
            if _datetime_age(now, updated_at) > _ACTIVITY_SOURCE_STALE_AFTER:
                return True
        return not found_source_state and self._activity_cache_is_stale(now)

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
            if power_kw >= 0:
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
        battery_signals = BoilerBatterySignals.from_raw(
            {"overflow_windows": overflow_windows}
        )

        planner_input = PlannerInput(
            entry_id=self.entry_id,
            box_id=self.box_id,
            profile=profile,
            spot_prices=spot_prices,
            overflow_windows=overflow_windows,
            deadline_time=deadline,
            topology=_build_planner_topology(config),
            current_top_temp_c=temperature_state.top_temp_c,
            current_bottom_temp_c=temperature_state.bottom_temp_c,
            temperature_updated_at=temperature_state.top_updated_at,
            alt_source_capability=alt_capability,
            alt_cost_kwh=alt_cost_kwh,
            pv_forecast=energy_input.pv_forecast,
            pv_confidence=energy_input.pv_confidence,
            battery_signals=battery_signals,
            reason_codes=reason_codes,
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

    async def async_create_plan(
        self,
        force: bool = False,
        deadline_override: Optional[str] = None,
    ) -> Optional[BoilerPlan]:
        now = dt_util.now()
        plan = self.get_current_plan()
        if plan and not force and getattr(plan, "valid_until", now) > now:
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

        return new_plan

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

    return BoilerRuntime(
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
