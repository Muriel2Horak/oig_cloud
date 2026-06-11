"""Plánovač ohřevu bojleru s optimalizací nákladů."""

import asyncio
import logging
from datetime import datetime
from typing import Any, Optional

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .const import BATTERY_SOC_OVERFLOW_THRESHOLD
from .models import (
    BoilerPlan,
    BoilerProfile,
    BoilerSlot,
    BoilerThermalTopology,
    EnergySource,
)
from .planner_contract import AlternativeSourceCapability, PlannerInput
from .planner_core import PlanResult, plan_comfort_core

_LOGGER = logging.getLogger(__name__)


def plan_result_to_boiler_plan(
    result: PlanResult,
    *,
    planner_input: Optional[PlannerInput] = None,
    profile: Optional[BoilerProfile] = None,
) -> BoilerPlan:
    """Adapt comfort-core PlanResult into legacy runtime/actuator BoilerPlan."""
    effective_profile = profile or (planner_input.profile if planner_input else None)
    slots = [
        BoilerSlot(
            start=slot.start,
            end=slot.end,
            avg_consumption_kwh=max(0.0, slot.heating_kwh),
            confidence=_slot_confidence(slot.start, effective_profile),
            recommended_source=_slot_source(slot.source, result),
            spot_price_kwh=_spot_price_for_slot(slot.start, planner_input),
            alt_price_kwh=_alt_price_for_slot(planner_input),
            overflow_available=(slot.pv_kwh or 0.0) > 0.0,
            heating_kwh=slot.heating_kwh,
            pv_kwh=slot.pv_kwh if slot.pv_kwh is not None else 0.0,
            grid_kwh=slot.grid_kwh if slot.grid_kwh is not None else 0.0,
            alt_kwh=slot.alt_kwh if slot.alt_kwh is not None else 0.0,
            estimated_cost_czk=slot.estimated_cost_czk,
            predicted_top_temp_c=(
                slot.predicted_top_temp_c
                if slot.predicted_top_temp_c is not None and slot.predicted_top_temp_c > 0.0
                else None
            ),
            comfort_satisfied=None,
            pv_share=(
                (slot.pv_kwh or 0.0) / slot.heating_kwh
                if slot.heating_kwh > 0
                else 0.0
            ),
            # R3/R9: propagate battery_kwh and purpose so canonical DTO can expose them
            battery_kwh=slot.battery_kwh if getattr(slot, "battery_kwh", None) is not None else 0.0,
            purpose=getattr(slot, "purpose", "comfort"),
        )
        for slot in result.slots
    ]
    return BoilerPlan(
        created_at=result.created_at,
        valid_until=result.valid_until,
        slots=slots,
        total_consumption_kwh=sum(slot.avg_consumption_kwh for slot in slots),
        estimated_cost_czk=result.estimated_cost_czk,
        fve_kwh=result.pv_kwh,
        grid_kwh=result.grid_kwh,
        alt_kwh=result.alt_kwh,
    )


def _slot_confidence(start: datetime, profile: Optional[BoilerProfile]) -> float:
    if profile is None:
        return 1.0
    try:
        _consumption, confidence = profile.get_consumption(start.hour)
        return confidence
    except Exception:
        return 0.0


def _slot_source(
    source: Optional[EnergySource],
    result: PlanResult,
) -> EnergySource:
    candidate = (
        source
        or result.actuated_source
        or result.selected_source
        or EnergySource.GRID
    )
    if isinstance(candidate, EnergySource):
        return candidate
    try:
        return EnergySource(str(candidate))
    except ValueError:
        return EnergySource.GRID


def _spot_price_for_slot(
    start: datetime,
    planner_input: Optional[PlannerInput],
) -> Optional[float]:
    if planner_input is None:
        return None
    if start in planner_input.spot_prices:
        return planner_input.spot_prices[start]
    hour_start = start.replace(minute=0, second=0, microsecond=0)
    return planner_input.spot_prices.get(hour_start)


def _alt_price_for_slot(planner_input: Optional[PlannerInput]) -> Optional[float]:
    if planner_input is None:
        return None
    if planner_input.alt_source_capability == AlternativeSourceCapability.DISABLED:
        return None
    if planner_input.alt_cost_kwh <= 0:
        return None
    return planner_input.alt_cost_kwh


class BoilerPlanner:
    """Plánovač ohřevu s optimalizací nákladů."""

    def __init__(
        self,
        hass: HomeAssistant,
        slot_minutes: int = 15,
        alt_cost_kwh: float = 0.0,
        has_alternative: bool = False,
    ) -> None:
        """
        Inicializace plánovače.

        Args:
            hass: Home Assistant instance
            slot_minutes: Délka slotu v minutách (15)
            alt_cost_kwh: Cena alternativního zdroje [Kč/kWh]
            has_alternative: Je k dispozici alternativní zdroj?
        """
        self.hass = hass
        self.slot_minutes = slot_minutes
        self.alt_cost_kwh = alt_cost_kwh
        self.has_alternative = has_alternative
        self.last_core_result: Optional[PlanResult] = None

    async def async_create_plan_result(
        self,
        planner_input: PlannerInput,
        *,
        now: Optional[datetime] = None,
        previous_plan: Optional[PlanResult] = None,
    ) -> PlanResult:
        """Create the Task 6a explicit comfort-core planner result."""
        await asyncio.sleep(0)
        self.last_core_result = plan_comfort_core(
            planner_input,
            now=now,
            previous_plan=previous_plan,
        )
        return self.last_core_result

    async def async_create_plan(
        self,
        profile: Optional[BoilerProfile] = None,
        spot_prices: Optional[dict[datetime, float]] = None,
        overflow_windows: Optional[list[tuple[datetime, datetime]]] = None,
        deadline_time: str = "06:00",
        planner_input: Optional[PlannerInput] = None,
    ) -> BoilerPlan:
        """
        Vytvoří plán na 24 hodin s optimalizací nákladů.

        Args:
            profile: Profil spotřeby
            spot_prices: Spotové ceny {datetime: Kč/kWh}
            overflow_windows: FVE overflow okna [(start, end), ...]
            deadline_time: Čas do kdy má být ohřev hotový (HH:MM)
            planner_input: Canonical planner input DTO (Task 4 contract)

        Returns:
            BoilerPlan s doporučenými zdroji
        """
        await asyncio.sleep(0)
        if planner_input is None:
            planner_input = self._legacy_planner_input(
                profile=profile,
                spot_prices=spot_prices,
                overflow_windows=overflow_windows,
                deadline_time=deadline_time,
            )

        self.last_core_result = plan_comfort_core(planner_input)
        plan = plan_result_to_boiler_plan(
            self.last_core_result,
            planner_input=planner_input,
        )

        _LOGGER.info(
            "Comfort-core plán vytvořen: %s slotů, %.2f kWh celkem, %.2f Kč odhadovaná cena",
            len(plan.slots),
            plan.total_consumption_kwh,
            plan.estimated_cost_czk,
        )

        return plan

    def _legacy_planner_input(
        self,
        *,
        profile: Optional[BoilerProfile],
        spot_prices: Optional[dict[datetime, float]],
        overflow_windows: Optional[list[tuple[datetime, datetime]]],
        deadline_time: str,
    ) -> PlannerInput:
        """Build a minimal comfort-core DTO for legacy direct planner callers."""
        if profile is None:
            raise ValueError("profile is required")
        return PlannerInput(
            entry_id="legacy_boiler_planner",
            box_id="legacy_boiler",
            profile=profile,
            spot_prices=spot_prices or {},
            overflow_windows=overflow_windows or [],
            deadline_time=deadline_time,
            topology=BoilerThermalTopology(
                stratification_mode="two_zone",
                thermometer_placements=["top"],
                temperature_topology="top_only",
                tank_volume_l=100.0,
                target_temp_c=50.0,
                cold_inlet_temp_c=10.0,
                heater_power_kw=max(0.1, 60.0 / max(1, self.slot_minutes)),
                standing_loss_coefficient=0.0,
            ),
            current_top_temp_c=45.0,
            current_bottom_temp_c=None,
            temperature_updated_at=dt_util.now(),
            alt_source_capability=(
                AlternativeSourceCapability.CONTROLLABLE
                if self.has_alternative
                else AlternativeSourceCapability.DISABLED
            ),
            alt_cost_kwh=self.alt_cost_kwh,
        )

    def _is_in_overflow_window(
        self,
        start: datetime,
        end: datetime,
        overflow_windows: list[tuple[datetime, datetime]],
    ) -> bool:
        """Kontrola, zda je slot v overflow okně."""
        for window_start, window_end in overflow_windows:
            # Překryv: slot začíná před koncem okna a končí po začátku okna
            if start < window_end and end > window_start:
                return True
        return False

    def _get_spot_price(
        self,
        time: datetime,
        spot_prices: dict[datetime, float],
    ) -> Optional[float]:
        """
        Získá spotovou cenu pro daný čas (s interpolací).

        Args:
            time: Časový okamžik
            spot_prices: Dostupné ceny {datetime: Kč/kWh}

        Returns:
            Cena nebo None
        """
        # Přímý match
        if time in spot_prices:
            return spot_prices[time]

        # Interpolace - najít nejbližší záznam
        hour_start = time.replace(minute=0, second=0, microsecond=0)
        if hour_start in spot_prices:
            return spot_prices[hour_start]

        # Fallback - průměr za den
        if spot_prices:
            return sum(spot_prices.values()) / len(spot_prices)

        return None

    # PV-first thresholds (consistent with Task 7's should_defer_for_pv)
    PV_FORECAST_MIN_KWH = 0.5
    PV_CONFIDENCE_MIN = 0.3

    def _recommend_source(
        self,
        overflow_available: bool,
        spot_price: Optional[float],
        alt_price: float,
        pv_forecast: float = 0.0,
        pv_confidence: float = 0.0,
    ) -> EnergySource:
        """
        Doporučí zdroj podle priority a ceny.

        Priorita:
        1. FVE overflow (zdarma) - pokud dostupné
        2. PV-first: Pokud je očekávána FVE produkce, odložit nabíjení
        3. Grid vs Alternative - podle ceny

        Args:
            overflow_available: Je FVE overflow k dispozici?
            spot_price: Spotová cena ze sítě [Kč/kWh]
            alt_price: Cena alternativního zdroje [Kč/kWh]
            pv_forecast: Predikovaná FVE produkce [kWh] (default 0.0)
            pv_confidence: Confidence predikce (0.0-1.0, default 0.0)

        Returns:
            Doporučený zdroj
        """
        # Priorita 1: FVE overflow (0 Kč)
        if overflow_available:
            _LOGGER.debug(
                "Boiler source: FVE (overflow available), reason=overflow"
            )
            return EnergySource.FVE

        # Priorita 2: PV-first policy
        # When PV forecast shows expected production AND confidence is sufficient,
        # defer to PV instead of choosing expensive grid
        if (
            pv_forecast >= self.PV_FORECAST_MIN_KWH
            and pv_confidence >= self.PV_CONFIDENCE_MIN
        ):
            _LOGGER.debug(
                "Boiler source: FVE (PV-first defer), "
                "pv_forecast=%.2f kWh, pv_confidence=%.2f, reason=pv_first_defer",
                pv_forecast,
                pv_confidence,
            )
            return EnergySource.FVE

        # Priorita 3: Porovnat Grid vs Alternative
        if not self.has_alternative:
            _LOGGER.debug(
                "Boiler source: GRID (no alternative), reason=no_alternative"
            )
            return EnergySource.GRID

        if spot_price is None:
            # Bez spotové ceny - použít alternativu pokud dostupná
            if alt_price > 0:
                _LOGGER.debug(
                    "Boiler source: ALTERNATIVE (no spot price), reason=no_spot_price"
                )
                return EnergySource.ALTERNATIVE
            _LOGGER.debug(
                "Boiler source: GRID (no spot price, no alt), reason=fallback"
            )
            return EnergySource.GRID

        # Porovnat ceny
        if alt_price > 0 and alt_price < spot_price:
            _LOGGER.debug(
                "Boiler source: ALTERNATIVE (cheaper), alt=%.2f < spot=%.2f CZK/kWh, reason=alt_cheaper",
                alt_price,
                spot_price,
            )
            return EnergySource.ALTERNATIVE

        _LOGGER.debug(
            "Boiler source: GRID (fallback), spot=%.2f CZK/kWh, reason=grid_fallback",
            spot_price if spot_price else 0.0,
        )
        return EnergySource.GRID

    def _calculate_plan_totals(self, plan: BoilerPlan) -> None:
        """
        Vypočítá agregované hodnoty plánu.

        Args:
            plan: Plán k aktualizaci (in-place)
        """
        total_consumption = 0.0
        total_cost = 0.0
        fve_kwh = 0.0
        grid_kwh = 0.0
        alt_kwh = 0.0

        for slot in plan.slots:
            consumption = slot.avg_consumption_kwh
            total_consumption += consumption

            if slot.recommended_source == EnergySource.FVE:
                fve_kwh += consumption
                # FVE je zdarma
            elif slot.recommended_source == EnergySource.GRID:
                grid_kwh += consumption
                if slot.spot_price_kwh is not None:
                    total_cost += consumption * slot.spot_price_kwh
            elif slot.recommended_source == EnergySource.ALTERNATIVE:
                alt_kwh += consumption
                if slot.alt_price_kwh is not None:
                    total_cost += consumption * slot.alt_price_kwh
            elif slot.recommended_source == EnergySource.BATTERY:
                # R3: Battery-sourced slots discharge the home battery.
                # Cost is already accounted for in planner_core via BATTERY_CYCLE_COST.
                # For the legacy totals, count battery under alt_kwh (non-grid) so that
                # fve_kwh + grid_kwh + alt_kwh == total_consumption_kwh.
                alt_kwh += consumption

        plan.total_consumption_kwh = total_consumption
        plan.estimated_cost_czk = total_cost
        plan.fve_kwh = fve_kwh
        plan.grid_kwh = grid_kwh
        plan.alt_kwh = alt_kwh

    async def async_get_overflow_windows(
        self,
        battery_forecast_data: Optional[dict],
    ) -> list[tuple[datetime, datetime]]:
        """
        Extrahuje overflow okna z battery_forecast.

        Args:
            battery_forecast_data: Data z battery_forecast coordinatoru

        Returns:
            List [(start, end)] datetime dvojic
        """
        await asyncio.sleep(0)
        if not battery_forecast_data:
            _LOGGER.debug("Battery forecast data nejsou dostupná")
            return []

        overflow_windows = battery_forecast_data.get("overflow_windows", [])

        # Filtrovat okna s SOC >= 100%
        filtered_windows: list[tuple[datetime, datetime]] = []
        for window in overflow_windows:
            parsed = self._parse_overflow_window(window)
            if parsed:
                filtered_windows.append(parsed)

        _LOGGER.debug("Nalezeno %s overflow oken (SOC >= 100%%)", len(filtered_windows))
        return filtered_windows

    @staticmethod
    def _parse_overflow_window(
        window: dict[str, Any]
    ) -> Optional[tuple[datetime, datetime]]:
        soc = window.get("soc", 0.0)
        if soc < BATTERY_SOC_OVERFLOW_THRESHOLD:
            return None
        start = _parse_window_datetime(window.get("start"))
        end = _parse_window_datetime(window.get("end"))
        if start and end:
            return start, end
        return None


def _parse_window_datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return dt_util.parse_datetime(value)
    return None
