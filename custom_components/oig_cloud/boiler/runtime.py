"""Runtime orchestrator and domain boundary interfaces for boiler module."""

from __future__ import annotations

from collections.abc import Sequence
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
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

        result: dict[datetime, float] = {}
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
            return [], [PlannerReasonCode.INPUT_STALE_PV]

        raw_box_id = battery_data.get("box_id")
        if raw_box_id and self._box_id and str(raw_box_id) != self._box_id:
            return [], [PlannerReasonCode.INPUT_STALE_PV]

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
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return dt_util.parse_datetime(value)
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

    try:
        soc = float(raw_window.get("soc", 0.0) or 0.0)
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
        from .models import EnergySource

        if manual_mode_state and manual_mode_state.state == "Zapnuto":
            return EnergySource.FVE
        if current_cbb_state:
            try:
                if float(current_cbb_state.state) > 0:
                    return EnergySource.FVE
            except ValueError:
                pass
        return EnergySource.GRID

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
