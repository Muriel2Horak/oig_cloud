"""Coordinator pro bojlerovy modul."""

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from ..const import (
    CONF_BOILER_ALT_COST_KWH,
    CONF_BOILER_ALT_ENERGY_SENSOR,
    CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
    CONF_BOILER_DEADLINE_TIME,
    CONF_BOILER_HAS_ALTERNATIVE_HEATING,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    CONF_BOILER_PLAN_SLOT_MINUTES,
    CONF_BOILER_PLANNING_HORIZON_HOURS,
    CONF_BOILER_SPOT_PRICE_SENSOR,
    CONF_BOILER_STRATIFICATION_MODE,
    CONF_BOILER_TARGET_TEMP_C,
    CONF_BOILER_TEMP_SENSOR_BOTTOM,
    CONF_BOILER_TEMP_SENSOR_POSITION,
    CONF_BOILER_TEMP_SENSOR_TOP,
    CONF_BOILER_TWO_ZONE_SPLIT_RATIO,
    CONF_BOILER_VOLUME_L,
    DEFAULT_BOILER_DEADLINE_TIME,
    DEFAULT_BOILER_PLAN_SLOT_MINUTES,
    DEFAULT_BOILER_PLANNING_HORIZON_HOURS,
    DEFAULT_BOILER_TARGET_TEMP_C,
    DEFAULT_BOILER_TEMP_SENSOR_POSITION,
    DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO,
)
from .models import BoilerPlan, BoilerProfile, EnergySource
from .planner import BoilerPlanner
from .profiler import BoilerProfiler
from .circulation import is_circulation_recommended
from .utils import (
    calculate_energy_to_heat,
    calculate_stratified_temp,
    estimate_residual_energy,
    validate_temperature_sensor,
)

_LOGGER = logging.getLogger(__name__)

UPDATE_INTERVAL = timedelta(minutes=5)
PROFILE_UPDATE_INTERVAL = timedelta(hours=24)


class BoilerCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Coordinator pro bojlerovy modul - update kazdych 5 minut."""

    def __init__(
        self,
        hass: HomeAssistant,
        config: dict[str, Any],
    ) -> None:
        """
        Inicializace coordinatoru.

        Args:
            hass: Home Assistant instance
            config: Konfigurace z config_flow
        """
        super().__init__(
            hass,
            _LOGGER,
            name="OIG Boiler",
            update_interval=UPDATE_INTERVAL,
        )

        self.config = config
        self.box_id = self._resolve_box_id(config)
        self._last_profile_update: Optional[datetime] = None
        self._current_profile: Optional[BoilerProfile] = None
        self._current_plan: Optional[BoilerPlan] = None

        # Heater switch state tracking
        self._heater_switch_entity: Optional[str] = config.get(CONF_BOILER_HEATER_SWITCH_ENTITY)
        self._heater_last_state: Optional[bool] = None

        # Inicializace komponent
        self._oig_manual_mode_entity = self._build_oig_entity_id("boiler_manual_mode")
        self._oig_current_cbb_entity = self._build_oig_entity_id("boiler_current_cbb_w")
        self._oig_day_energy_entity = self._build_oig_entity_id("boiler_day_w")

        self.profiler = BoilerProfiler(
            hass=hass,
            energy_sensor=self._oig_day_energy_entity,
            lookback_days=60,
        )

        self.planner = BoilerPlanner(
            hass=hass,
            slot_minutes=config.get(
                CONF_BOILER_PLAN_SLOT_MINUTES, DEFAULT_BOILER_PLAN_SLOT_MINUTES
            ),
            alt_cost_kwh=config.get(CONF_BOILER_ALT_COST_KWH, 0.0),
            has_alternative=config.get(CONF_BOILER_HAS_ALTERNATIVE_HEATING, False),
            planning_horizon_hours=config.get(
                CONF_BOILER_PLANNING_HORIZON_HOURS, DEFAULT_BOILER_PLANNING_HORIZON_HOURS
            ),
        )

    async def _async_update_data(self) -> dict[str, Any]:
        """
        Update kazdych 5 minut.

        Returns:
            Data pro senzory
        """
        try:
            now = dt_util.now()

            # 1. Update profilu (1x denne)
            if self._should_update_profile(now):
                await self._update_profile()

            # 2. Nacist aktualni teploty
            temperatures = await self._read_temperatures()

            # 3. Vypocitat energeticky stav
            energy_state = self._calculate_energy_state(temperatures)

            # 4. Trackovani energie
            energy_tracking = await self._track_energy_sources()

            # 5. Update planu (pokud je profil dostupny)
            if self._current_profile:
                await self._update_plan()

            # 6. Rízení cirkulacního cerpadla podle profilu spotreby
            await self._control_circulation_pump(now)

            # 7. Rízení topneho telesa podle planu a teploty
            await self._control_heater_switch(now, temperatures)

            # 8. Aktualní slot a doporucení
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
                    self._current_profile, now
                ),
                "last_update": now,
            }

            return data

        except Exception as err:
            _LOGGER.error("Chyba pri update bojleru: %s", err, exc_info=True)
            raise UpdateFailed(f"Update selhal: {err}") from err

    def _should_update_profile(self, now: datetime) -> bool:
        """Kontrola, zda je potreba aktualizovat profil."""
        if self._last_profile_update is None:
            return True

        time_since_update = now - self._last_profile_update
        return time_since_update >= PROFILE_UPDATE_INTERVAL

    async def _update_profile(self) -> None:
        """Aktualizuje profilovani z SQL historie."""
        _LOGGER.info("Aktualizace profilu bojleru...")
        try:
            profiles = await self.profiler.async_update_profiles()

            # Vybrat profil pro aktualni cas
            now = dt_util.now()
            self._current_profile = self.profiler.get_profile_for_datetime(now)

            self._last_profile_update = now
            _LOGGER.info("Profily aktualizovany, celkem kategorii: %s", len(profiles))

        except Exception as err:
            _LOGGER.error("Chyba pri aktualizaci profilu: %s", err)

    async def _read_temperatures(self) -> dict[str, Optional[float]]:
        """Nacte teploty z teplomeru."""
        config = self.config

        top_sensor = config.get(CONF_BOILER_TEMP_SENSOR_TOP)
        bottom_sensor = config.get(CONF_BOILER_TEMP_SENSOR_BOTTOM)
        sensor_position = config.get(
            CONF_BOILER_TEMP_SENSOR_POSITION, DEFAULT_BOILER_TEMP_SENSOR_POSITION
        )

        temp_top = None
        temp_bottom = None

        # Horni senzor
        if top_sensor:
            state = self.hass.states.get(top_sensor)
            temp_top = validate_temperature_sensor(state, top_sensor)

        # Dolni senzor
        if bottom_sensor:
            state = self.hass.states.get(bottom_sensor)
            temp_bottom = validate_temperature_sensor(state, bottom_sensor)

        # Stratifikace pokud jen jeden senzor
        temp_upper_zone = None
        temp_lower_zone = None

        if temp_top is not None and temp_bottom is None:
            # Extrapolace z horniho
            split_ratio = config.get(
                CONF_BOILER_TWO_ZONE_SPLIT_RATIO, DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO
            )
            stratification_mode = config.get(CONF_BOILER_STRATIFICATION_MODE, "two_zone")
            temp_upper_zone, temp_lower_zone = calculate_stratified_temp(
                measured_temp=temp_top,
                sensor_position=sensor_position,
                mode=stratification_mode,
                split_ratio=split_ratio,
            )
        elif temp_top is not None and temp_bottom is not None:
            # Dva senzory - pouzit primo
            temp_upper_zone = temp_top
            temp_lower_zone = temp_bottom

        return {
            "top": temp_top,
            "bottom": temp_bottom,
            "upper_zone": temp_upper_zone,
            "lower_zone": temp_lower_zone,
        }

    def _calculate_energy_state(
        self, temperatures: dict[str, Optional[float]]
    ) -> dict[str, float]:
        """Vypocita energeticky stav bojleru."""
        volume_l = self.config.get(CONF_BOILER_VOLUME_L, 200.0)
        target_temp = self.config.get("boiler_target_temp_c", 60.0)

        temp_upper = temperatures.get("upper_zone")
        temp_lower = temperatures.get("lower_zone")

        energy_needed_kwh = 0.0
        avg_temp = None

        if temp_upper is not None and temp_lower is not None:
            avg_temp = (temp_upper + temp_lower) / 2.0

            # Energie potrebna k ohrevu
            energy_needed_kwh = calculate_energy_to_heat(
                volume_liters=volume_l,
                temp_current=avg_temp,
                temp_target=target_temp,
            )

        return {
            "avg_temp": avg_temp or 0.0,
            "energy_needed_kwh": energy_needed_kwh,
        }

    async def _track_energy_sources(self) -> dict[str, float]:
        """Trackuje energii z jednotlivych zdroju."""
        # OIG senzory
        manual_mode_entity = self._oig_manual_mode_entity
        current_cbb_entity = self._oig_current_cbb_entity
        day_energy_entity = self._oig_day_energy_entity

        # User alternativni senzor
        alt_energy_sensor = self.config.get(CONF_BOILER_ALT_ENERGY_SENSOR)

        manual_mode_state, current_cbb_state, day_energy_state = self._get_energy_states(
            manual_mode_entity, current_cbb_entity, day_energy_entity
        )
        current_source = self._detect_energy_source(
            manual_mode_state, current_cbb_state
        )
        total_energy_kwh = self._read_total_energy_kwh(day_energy_state)

        # FVE a Grid energie (placeholder - potreba trackovani v case)
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

    def _resolve_box_id(self, config: dict[str, Any]) -> str:
        box_id = config.get("box_id")
        if isinstance(box_id, str) and box_id.isdigit():
            return box_id

        forced = getattr(self, "forced_box_id", None)
        if isinstance(forced, str) and forced.isdigit():
            return forced

        inferred = self._infer_box_id_from_states()
        if inferred:
            return inferred

        return "unknown"

    def _infer_box_id_from_states(self) -> Optional[str]:
        entity_ids = []
        try:
            entity_ids = self.hass.states.async_entity_ids("sensor")
        except AttributeError:
            entity_ids = []

        for entity_id in entity_ids:
            if "_boiler_day_w" not in entity_id:
                continue
            parts = entity_id.split("_")
            if len(parts) < 3:
                continue
            if parts[1] == "oig" and parts[2].isdigit():
                return parts[2]
        return None

    def _build_oig_entity_id(self, suffix: str) -> str:
        if self.box_id != "unknown":
            return f"sensor.oig_{self.box_id}_{suffix}"
        return f"sensor.oig_2206237016_{suffix}"

    def _get_energy_states(
        self, manual_mode_entity: str, current_cbb_entity: str, day_energy_entity: str
    ):
        manual_mode_state = self.hass.states.get(manual_mode_entity)
        current_cbb_state = self.hass.states.get(current_cbb_entity)
        day_energy_state = self.hass.states.get(day_energy_entity)
        return manual_mode_state, current_cbb_state, day_energy_state

    def _detect_energy_source(self, manual_mode_state, current_cbb_state) -> EnergySource:
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
        alt_state = self.hass.states.get(alt_energy_sensor)
        if not alt_state:
            return None
        try:
            alt_kwh = float(alt_state.state)
            if alt_state.attributes.get("unit_of_measurement") == "Wh":
                alt_kwh /= 1000.0
            return alt_kwh
        except ValueError:
            return None

    async def _update_plan(self) -> None:
        """Aktualizuje plan ohrevu."""
        if not self._current_profile:
            return

        try:
            # Nacist spotove ceny
            spot_prices = await self._get_spot_prices()

            # Nacist overflow okna z battery_forecast
            overflow_windows = await self._get_overflow_windows()

            # Deadline
            deadline_time = self.config.get(
                CONF_BOILER_DEADLINE_TIME, DEFAULT_BOILER_DEADLINE_TIME
            )

            # Vytvorit plan
            self._current_plan = await self.planner.async_create_plan(
                profile=self._current_profile,
                spot_prices=spot_prices,
                overflow_windows=overflow_windows,
                deadline_time=deadline_time,
            )

        except Exception as err:
            _LOGGER.error("Chyba pri tvorbe planu: %s", err)

    async def _get_spot_prices(self) -> dict[datetime, float]:
        """Nacte spotove ceny ze senzoru."""
        spot_sensor = self.config.get(CONF_BOILER_SPOT_PRICE_SENSOR)
        if not spot_sensor:
            return {}

        state = self.hass.states.get(spot_sensor)
        if not state:
            return {}

        # Ocekavame atribut 'prices' jako list [{datetime, price}, ...]
        prices_attr = state.attributes.get("prices", [])

        result = {}
        for entry in prices_attr:
            if isinstance(entry, dict):
                dt_str = entry.get("datetime")
                price = entry.get("price")

                if dt_str and price is not None:
                    dt_obj = dt_util.parse_datetime(dt_str)
                    if dt_obj:
                        result[dt_obj] = float(price)

        return result

    async def _get_overflow_windows(self) -> list[tuple[datetime, datetime]]:
        """Nacte overflow okna z battery_forecast coordinatoru."""
        # Pokus o ziskani dat z battery_forecast coordinatoru
        battery_coordinator = self.hass.data.get("oig_cloud", {}).get(
            "battery_forecast_coordinator"
        )

        if not battery_coordinator:
            _LOGGER.debug("Battery forecast coordinator neni dostupny")
            return []

        battery_data = battery_coordinator.data
        return await self.planner.async_get_overflow_windows(battery_data)

    async def _control_circulation_pump(self, now: datetime) -> None:
        """
        Ridi cirkulacni cerpadlo podle profilu spotreby.
        Zapne behem spickovych hodin, vypne mimo ne.
        """
        pump_entity = self.config.get(CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY)
        if not pump_entity:
            return

        if not self._current_profile:
            _LOGGER.debug("Cirkulacni cerpadlo: neni dostupny profil")
            return

        hourly_avg = getattr(self._current_profile, "hourly_avg", None)
        if not hourly_avg:
            _LOGGER.debug("Cirkulacni cerpadlo: profil nema hourly_avg data")
            return

        from .circulation import _pick_peak_hours

        peak_hours = _pick_peak_hours(hourly_avg)
        current_hour = now.hour
        is_peak = current_hour in peak_hours

        if is_peak:
            await self._turn_on_circulation_pump(pump_entity)
        else:
            await self._turn_off_circulation_pump(pump_entity)

    async def _turn_on_circulation_pump(self, pump_entity: str) -> None:
        """Zapne cirkulacni cerpadlo."""
        try:
            await self.hass.services.async_call(
                "switch", "turn_on", {"entity_id": pump_entity}, blocking=False
            )
            _LOGGER.debug("Cirkulacni cerpadlo zapnuto (peak hour): %s", pump_entity)
        except Exception as err:
            _LOGGER.error("Chyba pri zapinani cirkulacniho cerpadla: %s", err)

    async def _turn_off_circulation_pump(self, pump_entity: str) -> None:
        """Vypne cirkulacni cerpadlo."""
        try:
            await self.hass.services.async_call(
                "switch", "turn_off", {"entity_id": pump_entity}, blocking=False
            )
            _LOGGER.debug("Cirkulacni cerpadlo vypnuto (off-peak): %s", pump_entity)
        except Exception as err:
            _LOGGER.error("Chyba pri vypinani cirkulacniho cerpadla: %s", err)

    async def _control_heater_switch(
        self, now: datetime, temperatures: dict[str, Optional[float]]
    ) -> None:
        """
        Ridi topne teleso podle planu a teploty.
        Zapne kdyz: aktivni slot v planu AND teplota < cilova - hysteresis
        Vypne kdyz: zadny aktivni slot OR teplota >= cilova
        """
        if not self._heater_switch_entity:
            _LOGGER.debug("Topne teleso: neni nakonfigurovano")
            return

        # Ziskat aktualni slot
        current_slot = None
        if self._current_plan:
            current_slot = self._current_plan.get_current_slot(now)

        # Ziskat aktualni teplotu (prumer horni a dolni zony)
        avg_temp = temperatures.get("avg_temp")
        if avg_temp is None:
            temp_upper = temperatures.get("upper_zone")
            temp_lower = temperatures.get("lower_zone")
            if temp_upper is not None and temp_lower is not None:
                avg_temp = (temp_upper + temp_lower) / 2.0
            elif temp_upper is not None:
                avg_temp = temp_upper
            elif temp_lower is not None:
                avg_temp = temp_lower

        if avg_temp is None:
            _LOGGER.debug("Topne teleso: neni dostupna teplota")
            return

        # Ziskat cilovou teplotu a hysteresis
        target_temp = self.config.get(CONF_BOILER_TARGET_TEMP_C, DEFAULT_BOILER_TARGET_TEMP_C)
        hysteresis = 2.0  # °C hysteresis

        # Logika rizeni
        should_be_on = False
        if current_slot:
            # Je aktivni slot - zapnout pokud teplota < cilova - hysteresis
            if avg_temp < (target_temp - hysteresis):
                should_be_on = True
                _LOGGER.debug(
                    "Topne teleso: zapnout (slot aktivni, teplota %.1fC < cil %.1fC - hysteresis %.1fC)",
                    avg_temp, target_temp, hysteresis
                )
            elif avg_temp >= target_temp:
                should_be_on = False
                _LOGGER.debug(
                    "Topne teleso: vypnout (teplota %.1fC >= cil %.1fC)",
                    avg_temp, target_temp
                )
            else:
                # V hysteresis - ponechat stavajici stav
                should_be_on = self._heater_last_state if self._heater_last_state is not None else False
                _LOGGER.debug(
                    "Topne teleso: ponechat stav (teplota %.1fC v hysteresis, cil %.1fC)",
                    avg_temp, target_temp
                )
        else:
            # Neni aktivni slot - vypnout
            should_be_on = False
            _LOGGER.debug("Topne teleso: vypnout (zadny aktivni slot)")

        # Provedeni akce pouze pri zmene stavu
        if should_be_on != self._heater_last_state:
            if should_be_on:
                await self._turn_on_heater()
            else:
                await self._turn_off_heater()
            self._heater_last_state = should_be_on
        else:
            _LOGGER.debug("Topne teleso: stav beze zmeny (%s)", "ON" if should_be_on else "OFF")

    async def _turn_on_heater(self) -> None:
        """Zapne topne teleso."""
        if not self._heater_switch_entity:
            return
        try:
            await self.hass.services.async_call(
                "switch", "turn_on", {"entity_id": self._heater_switch_entity}, blocking=False
            )
            _LOGGER.info("Topne teleso zapnuto: %s", self._heater_switch_entity)
        except Exception as err:
            _LOGGER.error("Chyba pri zapinani topneho telesa: %s", err)

    async def _turn_off_heater(self) -> None:
        """Vypne topne teleso."""
        if not self._heater_switch_entity:
            return
        try:
            await self.hass.services.async_call(
                "switch", "turn_off", {"entity_id": self._heater_switch_entity}, blocking=False
            )
            _LOGGER.info("Topne teleso vypnuto: %s", self._heater_switch_entity)
        except Exception as err:
            _LOGGER.error("Chyba pri vypinani topneho telesa: %s", err)
