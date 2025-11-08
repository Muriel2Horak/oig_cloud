"""Zjednodušený Battery Balancing Sensor - čistě plánovací vrstva.

PRINCIP:
- NEPOČÍTÁ fyziku (SoC, kWh) - to dělá battery_forecast._simulate_interval()
- NEPROFILUJE historii 7 dní
- Dělá JEN:
  1. Načte HYBRID timeline z battery_forecast
  2. Zkontroluje 3 scénáře: Natural → Forced → Opportunistic
  3. Vytvoří balancing_plan a pošle ho forecast senzoru

SCÉNÁŘE:
1. Natural: HYBRID timeline už obsahuje 3h@100% → aktualizovat last_balancing
2. Forced: days_since_last >= 7 → IHNED vytvořit plán (nejbližší 3h, locked)
3. Opportunistic: days < 7, zbývají ≤2 dny → najít levné okno (Δcost ≤ 50 Kč)
"""

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.util import dt as dt_util
from homeassistant.const import EntityCategory

from .const import DOMAIN, HOME_UPS, HOME_III

_LOGGER = logging.getLogger(__name__)

# Konstanty podle REFACTORING_IMPLEMENTATION_GUIDE.md
BALANCING_INTERVAL_DAYS = 7  # Min 1× za 7 dní
BALANCING_HOLDING_HOURS = 3  # 3h na ~100%
BALANCING_HOLDING_INTERVALS = BALANCING_HOLDING_HOURS * 4  # 12 intervalů
BALANCING_SOC_THRESHOLD = 0.99  # 99% považujeme za 100%
OPPORTUNISTIC_MAX_DELTA_COST = 50.0  # Max 50 Kč navíc
OPPORTUNISTIC_WINDOW_THRESHOLD_DAYS = 2  # Jen pokud zbývají ≤2 dny
OPPORTUNISTIC_MAX_WINDOWS = 5  # Max 5 kandidátních oken (nepřekombinovat!)


class OigCloudBatteryBalancingSensor(RestoreEntity, CoordinatorEntity, SensorEntity):
    """Zjednodušený sensor pro správu vyrovnání článků baterie."""

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
        hass: Optional[HomeAssistant] = None,
    ) -> None:
        """Initialize the battery balancing sensor."""
        super().__init__(coordinator)

        self._sensor_type = sensor_type
        self._config_entry = config_entry
        self._device_info = device_info
        self._hass: Optional[HomeAssistant] = hass or getattr(coordinator, "hass", None)

        # Box ID
        self._data_key = "unknown"
        if coordinator and coordinator.data and isinstance(coordinator.data, dict):
            self._data_key = list(coordinator.data.keys())[0]
            _LOGGER.debug(f"Battery balancing got box_id: {self._data_key}")

        # Entity setup
        self._box_id = self._data_key
        self._attr_unique_id = f"oig_cloud_{self._data_key}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_icon = "mdi:battery-heart-variant"
        self._attr_native_unit_of_measurement = None
        self._attr_device_class = None
        self._attr_state_class = None
        self._attr_entity_category = EntityCategory.DIAGNOSTIC

        # Název senzoru
        from .sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        sensor_config = SENSOR_TYPES_STATISTICS.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")
        self._attr_name = name_cs or name_en or sensor_type

        # ===== STAV SENZORU =====
        self._last_balancing: Optional[datetime] = None
        self._days_since_last: int = 99  # Vysoké číslo = neznámé
        self._status: str = "unknown"  # natural/opportunistic/forced/overdue/ok/error
        self._planned_window: Optional[Dict[str, Any]] = None
        self._current_state: str = "standby"  # charging/balancing/standby

        # Planning loop
        self._planning_task: Optional[Any] = None
        self._last_planning_check: Optional[datetime] = None

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA - načíst stav a spustit planning loop."""
        await super().async_added_to_hass()
        self._hass = self.hass

        # Restore state
        last_state = await self.async_get_last_state()
        if last_state and last_state.attributes:
            _LOGGER.info("Restoring balancing sensor state from last session")

            # Restore last_balancing
            if "last_balancing" in last_state.attributes:
                try:
                    self._last_balancing = dt_util.parse_datetime(
                        last_state.attributes["last_balancing"]
                    )
                    _LOGGER.debug(f"Restored last_balancing: {self._last_balancing}")
                except (ValueError, TypeError):
                    pass

            # Restore planned_window
            if "planned" in last_state.attributes:
                try:
                    self._planned_window = last_state.attributes["planned"]
                    _LOGGER.info(
                        f"Restored balancing plan: {self._planned_window.get('mode')} "
                        f"{self._planned_window.get('holding_start')} → {self._planned_window.get('holding_end')}"
                    )
                    # Propagovat do forecast
                    await self._propagate_plan_to_forecast(self._planned_window)
                except (ValueError, TypeError, KeyError) as e:
                    _LOGGER.error(f"Failed to restore planned_window: {e}")

        # Spustit planning loop (1× za hodinu)
        _LOGGER.info("Starting balancing planning loop (every 60 min)")
        self._planning_task = self.hass.async_create_background_task(
            self._planning_loop(), name="oig_cloud_balancing_planning_loop"
        )

    async def async_will_remove_from_hass(self) -> None:
        """Při odebrání z HA - zrušit planning task."""
        if self._planning_task and not self._planning_task.done():
            self._planning_task.cancel()
        await super().async_will_remove_from_hass()

    # =========================================================================
    # HLAVNÍ PLANNING LOOP
    # =========================================================================

    async def _planning_loop(self) -> None:
        """
        Planning loop - běží každých 60 minut.

        Proces:
        1. Načti HYBRID timeline z forecast
        2. Zkontroluj 3 scénáře (natural → forced → opportunistic)
        3. Aktualizuj stav a případně vytvoř plán
        """
        import asyncio

        try:
            _LOGGER.info("✅ Balancing planning loop started")

            while True:
                try:
                    _LOGGER.info("🔄 Planning loop iteration starting")

                    # 1. NAČÍST HYBRID TIMELINE Z FORECAST
                    forecast_sensor = self._get_forecast_sensor()
                    if not forecast_sensor:
                        _LOGGER.warning(
                            "⚠️ Forecast sensor not found, skipping iteration"
                        )
                        await asyncio.sleep(3600)
                        continue

                    # Počkat na forecast data
                    if not hasattr(forecast_sensor, "_hybrid_timeline"):
                        _LOGGER.debug(
                            "Waiting for forecast to calculate HYBRID timeline..."
                        )
                        await asyncio.sleep(60)
                        continue

                    hybrid_timeline = forecast_sensor._hybrid_timeline
                    if not hybrid_timeline:
                        _LOGGER.debug("HYBRID timeline not ready yet")
                        await asyncio.sleep(60)
                        continue

                    # 2. AKTUALIZOVAT days_since_last
                    self._update_days_since_last()

                    # 3. ZKONTROLOVAT 3 SCÉNÁŘE (priority order)

                    # 3a. NATURAL BALANCING
                    natural_detected = await self._check_natural_balancing(
                        hybrid_timeline
                    )
                    if natural_detected:
                        _LOGGER.info("✅ Natural balancing detected - no action needed")
                        self._status = "natural"
                        self._planned_window = None
                        self.async_write_ha_state()
                        await asyncio.sleep(3600)
                        continue

                    # 3b. FORCED BALANCING (priorita!)
                    if self._days_since_last >= BALANCING_INTERVAL_DAYS:
                        _LOGGER.warning(
                            f"🔴 FORCED balancing required! {self._days_since_last} days since last (max {BALANCING_INTERVAL_DAYS})"
                        )
                        forced_plan = await self._create_forced_balancing_plan(
                            forecast_sensor
                        )
                        if forced_plan:
                            self._planned_window = forced_plan
                            self._status = "forced"
                            await self._propagate_plan_to_forecast(forced_plan)
                            self.async_write_ha_state()
                            _LOGGER.error(
                                f"🔴 FORCED balancing plan created: "
                                f"{forced_plan['holding_start']} → {forced_plan['holding_end']} (LOCKED)"
                            )
                        await asyncio.sleep(3600)
                        continue

                    # 3c. OPPORTUNISTIC BALANCING
                    days_until_deadline = (
                        BALANCING_INTERVAL_DAYS - self._days_since_last
                    )
                    if days_until_deadline <= OPPORTUNISTIC_WINDOW_THRESHOLD_DAYS:
                        _LOGGER.info(
                            f"⚡ Opportunistic window open: {days_until_deadline} days until deadline"
                        )
                        opp_plan = await self._check_opportunistic_balancing(
                            hybrid_timeline, forecast_sensor
                        )
                        if opp_plan:
                            self._planned_window = opp_plan
                            self._status = "opportunistic"
                            await self._propagate_plan_to_forecast(opp_plan)
                            self.async_write_ha_state()
                            _LOGGER.info(
                                f"✅ Opportunistic balancing plan: "
                                f"{opp_plan['holding_start']} → {opp_plan['holding_end']} "
                                f"(Δcost={opp_plan.get('delta_cost_czk', 0):.2f} Kč)"
                            )
                        else:
                            _LOGGER.debug("No suitable opportunistic window found")
                            self._status = "ok"
                    else:
                        _LOGGER.debug(
                            f"Too early for opportunistic ({days_until_deadline} days until deadline)"
                        )
                        self._status = "ok"

                    # Update timestamp
                    self._last_planning_check = dt_util.now()
                    self.async_write_ha_state()

                    _LOGGER.info("✅ Planning loop iteration completed")

                except Exception as e:
                    _LOGGER.error(
                        f"❌ Planning loop iteration error: {e}", exc_info=True
                    )
                    self._status = "error"
                    self.async_write_ha_state()

                # Sleep 60 min
                await asyncio.sleep(3600)

        except asyncio.CancelledError:
            _LOGGER.info("Planning loop cancelled")
        except Exception as e:
            _LOGGER.error(f"Planning loop fatal error: {e}", exc_info=True)

    # =========================================================================
    # SCÉNÁŘ 1: NATURAL BALANCING
    # =========================================================================

    async def _check_natural_balancing(
        self, hybrid_timeline: List[Dict[str, Any]]
    ) -> bool:
        """
        Zkontrolovat zda HYBRID plán přirozeně dosahuje 100% SoC po dobu 3h.

        Args:
            hybrid_timeline: HYBRID timeline z forecast (192 bodů)

        Returns:
            True pokud nalezeno, False jinak
        """
        consecutive_full = 0
        window_start_idx = None

        for i, interval in enumerate(hybrid_timeline):
            soc_kwh = interval.get("battery_soc_kwh", 0)
            capacity_kwh = interval.get("capacity_kwh", 15.36)  # Default
            soc_pct = soc_kwh / capacity_kwh if capacity_kwh > 0 else 0

            if soc_pct >= BALANCING_SOC_THRESHOLD:
                if consecutive_full == 0:
                    window_start_idx = i
                consecutive_full += 1

                # Našli jsme 3h okno?
                if consecutive_full >= BALANCING_HOLDING_INTERVALS:
                    window_start = interval.get("timestamp")
                    if isinstance(window_start, str):
                        window_start = datetime.fromisoformat(window_start)

                    window_end = window_start + timedelta(hours=BALANCING_HOLDING_HOURS)

                    # Aktualizovat last_balancing
                    self._last_balancing = window_end
                    self._days_since_last = 0

                    _LOGGER.info(
                        f"✅ Natural balancing detected: "
                        f"{window_start.strftime('%Y-%m-%d %H:%M')} → "
                        f"{window_end.strftime('%H:%M')} "
                        f"(3h at ~100% SoC)"
                    )
                    return True
            else:
                consecutive_full = 0
                window_start_idx = None

        _LOGGER.debug("Natural balancing NOT found in HYBRID plan")
        return False

    # =========================================================================
    # SCÉNÁŘ 2: FORCED BALANCING
    # =========================================================================

    async def _create_forced_balancing_plan(
        self, forecast_sensor: Any
    ) -> Optional[Dict[str, Any]]:
        """
        Vytvořit forced balancing plán IHNED.

        KRITICKÉ:
        - Volá se POUZE pokud days_since_last >= 7!
        - "IHNED" = nejbližší možné 3h okno (rozumná heuristika)
        - NELZE odkládat kvůli ceně!

        Args:
            forecast_sensor: Battery forecast sensor

        Returns:
            Balancing plan dict nebo None
        """
        now = dt_util.now()

        # Heuristika: Pokud je před 18:00 → dnes večer 22:00
        #             Pokud je po 18:00 → co nejdřív (např. za 2h)
        if now.hour < 18:
            window_start = now.replace(hour=22, minute=0, second=0, microsecond=0)
            if now >= window_start:
                window_start += timedelta(days=1)
        else:
            window_start = now + timedelta(hours=2)
            window_start = window_start.replace(minute=0, second=0, microsecond=0)

        window_end = window_start + timedelta(hours=BALANCING_HOLDING_HOURS)

        _LOGGER.error(
            f"🔴 FORCED balancing IMMEDIATE! "
            f"Last: {self._days_since_last} days ago (MAX: {BALANCING_INTERVAL_DAYS}). "
            f"Planning: {window_start.strftime('%Y-%m-%d %H:%M')} → "
            f"{window_end.strftime('%H:%M')} (cannot delay!)"
        )

        # Vytvořit plán
        plan = {
            "mode": "forced",
            "holding_start": window_start.isoformat(),
            "holding_end": window_end.isoformat(),
            "reason": f"FORCED balancing - {self._days_since_last} days overdue (max {BALANCING_INTERVAL_DAYS})",
            "requester": "balancing",
            "status": "locked",  # LOCKED - nelze rušit!
            "priority": "critical",
            "target_mode": HOME_UPS,  # Nabíjení ze sítě pokud nutné
        }

        return plan

    # =========================================================================
    # SCÉNÁŘ 3: OPPORTUNISTIC BALANCING
    # =========================================================================

    async def _check_opportunistic_balancing(
        self, hybrid_timeline: List[Dict[str, Any]], forecast_sensor: Any
    ) -> Optional[Dict[str, Any]]:
        """
        Najít nejlevnější 3h okno pro balancování.

        KRITICKÉ - NEPŘEKOMBINOVAT:
        - Max 5 kandidátních oken
        - Jednoduchý Δcost výpočet
        - Threshold: ≤ 50 Kč

        Args:
            hybrid_timeline: HYBRID timeline
            forecast_sensor: Forecast sensor

        Returns:
            Balancing plan dict nebo None
        """
        now = dt_util.now()
        deadline = now + timedelta(days=BALANCING_INTERVAL_DAYS - self._days_since_last)

        # 1. Najít noční okna (22:00-06:00)
        night_windows = []

        for i in range(len(hybrid_timeline) - BALANCING_HOLDING_INTERVALS):
            interval_start = hybrid_timeline[i].get("timestamp")
            if isinstance(interval_start, str):
                interval_start = datetime.fromisoformat(interval_start)

            # Skip past nebo po deadline
            if interval_start < now or interval_start > deadline:
                continue

            # Jen noční hodiny
            if not (22 <= interval_start.hour or interval_start.hour < 6):
                continue

            # Průměrná cena okna
            avg_price = (
                sum(
                    hybrid_timeline[j].get("spot_price_czk", 0)
                    for j in range(i, i + BALANCING_HOLDING_INTERVALS)
                )
                / BALANCING_HOLDING_INTERVALS
            )

            night_windows.append(
                {
                    "start_idx": i,
                    "start": interval_start,
                    "avg_price": avg_price,
                }
            )

        if not night_windows:
            _LOGGER.debug("No night windows found for opportunistic balancing")
            return None

        # Vzít TOP 5 nejlevnějších (NEPŘEKOMBINOVAT!)
        night_windows.sort(key=lambda x: x["avg_price"])
        candidates = night_windows[:OPPORTUNISTIC_MAX_WINDOWS]

        # 2. Pro každé okno spočítat Δcost (JEDNODUŠE!)
        best_window = None
        best_delta_cost = float("inf")

        for candidate in candidates:
            i = candidate["start_idx"]

            # Baseline cost: HYBRID bez balancování
            baseline_cost = sum(
                hybrid_timeline[j].get("net_cost_czk", 0)
                for j in range(i, i + BALANCING_HOLDING_INTERVALS)
            )

            # Balancing cost: Držet 100% (HOME III + nabíjení pokud nutné)
            # ZJEDNODUŠENÍ: Předpokládáme že nabíjení již proběhlo dřív
            # a během holding jen vyvážíme (solar - load)
            balancing_cost = baseline_cost  # TODO: Upřesnit s pomocí forecast

            delta_cost = balancing_cost - baseline_cost

            if delta_cost < best_delta_cost:
                best_delta_cost = delta_cost
                best_window = candidate

        # 3. Zkontrolovat threshold
        if best_delta_cost > OPPORTUNISTIC_MAX_DELTA_COST:
            _LOGGER.info(
                f"Cheapest opportunistic window: +{best_delta_cost:.2f} Kč "
                f"(threshold: {OPPORTUNISTIC_MAX_DELTA_COST} Kč) - waiting"
            )
            return None

        # 4. Vytvořit plán
        window_end = best_window["start"] + timedelta(hours=BALANCING_HOLDING_HOURS)

        plan = {
            "mode": "opportunistic",
            "holding_start": best_window["start"].isoformat(),
            "holding_end": window_end.isoformat(),
            "reason": f"Opportunistic balancing - Δcost={best_delta_cost:.2f} Kč",
            "requester": "balancing",
            "status": "active",
            "priority": "normal",
            "target_mode": HOME_III,  # Holding s FVE
            "delta_cost_czk": best_delta_cost,
        }

        return plan

    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    def _get_forecast_sensor(self) -> Optional[Any]:
        """Najít battery forecast sensor."""
        if not self._hass:
            return None

        entity_id = f"sensor.oig_{self._box_id}_battery_forecast"
        state = self._hass.states.get(entity_id)
        if not state:
            return None

        # Získat entitu z entity registry
        from homeassistant.helpers import entity_registry as er

        ent_reg = er.async_get(self._hass)
        entity_entry = ent_reg.async_get(entity_id)
        if not entity_entry:
            return None

        # Najít platform
        platform = entity_entry.platform
        if platform != DOMAIN:
            return None

        # Získat entitu
        component = self._hass.data.get("entity_components", {}).get("sensor")
        if not component:
            return None

        return component.get_entity(entity_id)

    async def _propagate_plan_to_forecast(self, plan: Dict[str, Any]) -> None:
        """Poslat plán do forecast senzoru."""
        forecast_sensor = self._get_forecast_sensor()
        if not forecast_sensor:
            _LOGGER.error("❌ Forecast sensor not found, cannot propagate plan")
            return

        if hasattr(forecast_sensor, "handle_balancing_plan"):
            await forecast_sensor.handle_balancing_plan(plan)
            _LOGGER.info("✅ Balancing plan propagated to forecast")
        else:
            _LOGGER.error(
                "❌ Forecast sensor doesn't have handle_balancing_plan method"
            )

    def _update_days_since_last(self) -> None:
        """Aktualizovat days_since_last."""
        if not self._last_balancing:
            self._days_since_last = 99
            return

        now = dt_util.now()
        delta = now - self._last_balancing
        self._days_since_last = int(delta.total_seconds() / 86400)

    # =========================================================================
    # PROPERTIES
    # =========================================================================

    @property
    def native_value(self) -> str:
        """Return the state of the sensor."""
        return self._status

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return sensor attributes."""
        return {
            "last_balancing": (
                self._last_balancing.isoformat() if self._last_balancing else None
            ),
            "days_since_last": self._days_since_last,
            "status": self._status,
            "current_state": self._current_state,
            "planned": self._planned_window,
            "last_planning_check": (
                self._last_planning_check.isoformat()
                if self._last_planning_check
                else None
            ),
        }

    @property
    def device_info(self) -> Dict[str, Any]:
        """Return device info."""
        return self._device_info
