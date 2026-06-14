"""Coordinator pro bojlerový modul."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from ..const import (
    CONF_BOILER_ALT_COST_KWH,
    CONF_BOILER_HAS_ALTERNATIVE_HEATING,
    CONF_BOILER_PLAN_SLOT_MINUTES,
    DEFAULT_BOILER_PLAN_SLOT_MINUTES,
)

# Backward-compat re-exports for tests that access these via coordinator module namespace  # noqa: E501
from ..const import (  # noqa: F401
    CONF_BOILER_ALT_ENERGY_SENSOR,
    CONF_BOILER_DEADLINE_TIME,
    CONF_BOILER_SPOT_PRICE_SENSOR,
    CONF_BOILER_TEMP_SENSOR_BOTTOM,
    CONF_BOILER_TEMP_SENSOR_POSITION,
    CONF_BOILER_TEMP_SENSOR_TOP,
    CONF_BOILER_TWO_ZONE_SPLIT_RATIO,
    DEFAULT_BOILER_DEADLINE_TIME,
)
from .demand_profiler import BoilerDemandProfilerAsync
from .models import BoilerPlan, BoilerProfile
from .planner import BoilerPlanner
from .profiler import BoilerProfiler
from .circulation import is_circulation_recommended
from .runtime import _EnergyStateAdapter, _ThermalReadModel

_LOGGER = logging.getLogger(__name__)

UPDATE_INTERVAL = timedelta(minutes=5)
PROFILE_UPDATE_INTERVAL = timedelta(hours=24)


class BoilerCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Coordinator pro bojlerový modul - update každých 5 minut."""

    def __init__(
        self,
        hass: HomeAssistant,
        config: dict[str, Any],
        entry_id: str = "",
    ) -> None:
        """
        Inicializace coordinatoru.

        Args:
            hass: Home Assistant instance
            config: Konfigurace z config_flow
            entry_id: Config entry ID pro runtime lookup
        """
        super().__init__(
            hass,
            _LOGGER,
            name="OIG Boiler",
            update_interval=UPDATE_INTERVAL,
        )

        self.config = config
        self.entry_id = entry_id
        self.box_id = self._resolve_box_id(config)
        self._last_profile_update: Optional[datetime] = None
        self._current_profile: Optional[BoilerProfile] = None
        self._current_plan: Optional[BoilerPlan] = None

        # Inicializace komponent
        self._oig_manual_mode_entity = self._build_oig_entity_id("boiler_manual_mode")
        self._oig_current_cbb_entity = self._build_oig_entity_id("boiler_current_cbb_w")
        self._oig_day_energy_entity = self._build_oig_entity_id("boiler_day_w")

        self.profiler = BoilerProfiler(
            hass=hass,
            energy_sensor=self._oig_day_energy_entity,  # OIG energy sensor (Wh)
            lookback_days=60,
        )

        self.planner = BoilerPlanner(
            hass=hass,
            slot_minutes=config.get(
                CONF_BOILER_PLAN_SLOT_MINUTES, DEFAULT_BOILER_PLAN_SLOT_MINUTES
            ),
            alt_cost_kwh=config.get(CONF_BOILER_ALT_COST_KWH, 0.0),
            has_alternative=config.get(CONF_BOILER_HAS_ALTERNATIVE_HEATING, False),
        )

        self._thermal_read_model = _ThermalReadModel(self)
        self._energy_state_adapter = _EnergyStateAdapter(self)

        # F2: Demand-map profiler — wired up so _read_demand_map_dto can find it
        _temp_sensor = config.get("boiler_temp_sensor_top")
        _heating_entity = config.get("boiler_heater_switch_entity")
        _volume_l = float(config.get("boiler_volume_l") or 200.0)
        _target_temp_c = float(config.get("boiler_target_temp_c") or 60.0)
        _cold_inlet_temp_c = float(config.get("boiler_cold_inlet_temp_c") or 10.0)
        # Calorimetric power proxy (F3b): non-backup circuit power is the
        # authority for actual electric heating, gated by commanded cbb_w. Lets
        # the demand profiler detect draws that happen *while* the boiler heats.
        _power_entity = (
            self._build_oig_entity_id("actual_acinb_wtotal")
            if self.box_id and self.box_id != "unknown"
            else None
        )
        _command_entity = (
            self._build_oig_entity_id("boiler_current_cbb_w")
            if self.box_id and self.box_id != "unknown"
            else None
        )
        if _temp_sensor:
            self._demand_profiler: Optional[BoilerDemandProfilerAsync] = BoilerDemandProfilerAsync(
                hass=hass,
                temp_sensor_entity=_temp_sensor,
                heating_entity=_heating_entity,
                volume_l=_volume_l,
                target_temp_c=_target_temp_c,
                cold_inlet_temp_c=_cold_inlet_temp_c,
                power_entity=_power_entity,
                command_entity=_command_entity,
            )
        else:
            self._demand_profiler = None

    async def _async_update_data(self) -> dict[str, Any]:
        """
        Update každých 5 minut.

        Returns:
            Data pro senzory
        """
        try:
            now = dt_util.now()

            # 1. Update profilu (1× denně)
            if self._should_update_profile(now):
                await self._update_profile()

            # 2. Načíst aktuální teploty
            temperatures = await self._thermal_read_model.read_temperatures()

            # 3. Vypočítat energetický stav
            energy_state = self._thermal_read_model.calculate_energy_state(temperatures)

            # 4. Trackování energie
            energy_tracking = self._energy_state_adapter.track_energy_sources()

            # 5. Update plánu přes runtime seam (pokud je profil dostupný)
            runtime = None
            if self._current_profile and self.entry_id:
                from .runtime import get_boiler_runtime

                runtime = get_boiler_runtime(self.hass, self.entry_id, self.box_id)
                if runtime:
                    await runtime.async_create_plan()
                    self._current_plan = runtime.get_current_plan()
                    # R5: tick circulation pump actuation each 5-min cycle
                    await runtime._async_tick_circulation_pump()
                    # R3: tick Home 5 maneuver actuation each 5-min cycle
                    # (async_create_plan may return early on cache hit, so we must
                    # tick independently to release the bit when a battery slot ends)
                    await runtime._async_tick_home5_maneuver()

            # 6. Aktuální slot a doporučení
            current_slot = None
            charging_recommended = False
            recommended_source = None

            if self._current_plan:
                current_slot = self._current_plan.get_current_slot(now)
                if current_slot:
                    charging_recommended = True
                    recommended_source = current_slot.recommended_source.value

            # Sestavit data
            data = {
                "temperatures": temperatures,
                "energy_state": energy_state,
                "energy_tracking": energy_tracking,
                "profile": self._current_profile,
                "plan": self._current_plan,
                "current_slot": current_slot,
                "charging_recommended": charging_recommended,
                "recommended_source": recommended_source,
                "circulation_recommended": is_circulation_recommended(
                    self._current_profile,
                    now,
                    schedule=(
                        runtime._circulation_runs
                        if runtime is not None
                        else ()
                    ),
                ),
                "last_update": now,
            }

            return data

        except Exception as err:
            _LOGGER.error("Chyba při update bojleru: %s", err, exc_info=True)
            raise UpdateFailed(f"Update selhal: {err}") from err

    def _should_update_profile(self, now: datetime) -> bool:
        """Kontrola, zda je potřeba aktualizovat profil."""
        if self._last_profile_update is None:
            return True

        time_since_update = now - self._last_profile_update
        return time_since_update >= PROFILE_UPDATE_INTERVAL

    async def _update_profile(self) -> None:
        """Aktualizuje profilování z SQL historie."""
        _LOGGER.info("Aktualizace profilů bojleru...")
        try:
            profiles = await self.profiler.async_update_profiles()

            # Vybrat profil pro aktuální čas
            now = dt_util.now()
            self._current_profile = self.profiler.get_profile_for_datetime(now)

            self._last_profile_update = now
            _LOGGER.info("Profily aktualizovány, celkem kategorií: %s", len(profiles))

        except Exception as err:
            _LOGGER.error("Chyba při aktualizaci profilů: %s", err)

        # F2: Update demand profiler on the same 24-hour cadence
        if self._demand_profiler is not None:
            await self._demand_profiler.async_update()

    async def _read_temperatures(self) -> dict[str, Optional[float]]:
        """Načte teploty z teploměrů."""
        return await self._thermal_read_model.read_temperatures()

    def _calculate_energy_state(
        self, temperatures: dict[str, Optional[float]]
    ) -> dict[str, float]:
        """Vypočítá energetický stav bojleru."""
        return self._thermal_read_model.calculate_energy_state(temperatures)

    async def _track_energy_sources(self) -> dict[str, Any]:
        """Trackuje energii z jednotlivých zdrojů."""
        return self._energy_state_adapter.track_energy_sources()

    def _resolve_box_id(self, config: dict[str, Any]) -> str:
        box_id = config.get("box_id")
        if isinstance(box_id, str) and box_id.isdigit():
            return box_id

        forced = getattr(self, "forced_box_id", None)
        if isinstance(forced, str) and forced.isdigit():
            return forced

        return "unknown"

    def _build_oig_entity_id(self, suffix: str) -> str:
        return f"sensor.oig_{self.box_id}_{suffix}"

    def _get_energy_states(
        self, manual_mode_entity: str, current_cbb_entity: str, day_energy_entity: str
    ):
        return self._energy_state_adapter._get_energy_states(
            manual_mode_entity, current_cbb_entity, day_energy_entity
        )

    def _detect_energy_source(self, manual_mode_state, current_cbb_state):
        return self._energy_state_adapter._detect_energy_source(
            manual_mode_state, current_cbb_state
        )

    def _read_total_energy_kwh(self, day_energy_state) -> float:
        return self._energy_state_adapter._read_total_energy_kwh(day_energy_state)

    def _read_alt_energy_kwh(self, alt_energy_sensor: Optional[str]) -> Optional[float]:
        return self._energy_state_adapter._read_alt_energy_kwh(alt_energy_sensor)

    async def async_shutdown(self) -> None:
        return None
