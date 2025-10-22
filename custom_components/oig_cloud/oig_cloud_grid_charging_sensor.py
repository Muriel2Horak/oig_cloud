"""Grid Charging Planned Sensor pro OIG Cloud integraci."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.typing import StateType

_LOGGER = logging.getLogger(__name__)


class GridChargingPlannedSensor(BinarySensorEntity):
    """Binary sensor indikující plánované nabíjení baterie ze sítě."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        box_id: str,
        device_name: str,
    ) -> None:
        """Inicializace sensoru."""
        self._hass = hass
        self._entry = entry
        self._box_id = box_id
        self._device_name = device_name
        self._attr_name = f"OIG {box_id} Grid Charging Planned"
        self._attr_unique_id = f"oig_{box_id}_grid_charging_planned"
        self._attr_device_class = BinarySensorDeviceClass.POWER
        self._attr_is_on = False
        self._charging_intervals: list[dict[str, Any]] = []
        self._total_energy_kwh = 0.0
        self._total_cost_czk = 0.0

    @property
    def device_info(self) -> DeviceInfo:
        """Informace o zařízení."""
        return DeviceInfo(
            identifiers={(self._entry.domain, self._box_id)},
            name=self._device_name,
            manufacturer="OTE/ČEPS",
            model="OIG Cloud Integration",
        )

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Atributy sensoru."""
        return {
            "charging_intervals": self._charging_intervals,
            "total_energy_kwh": round(self._total_energy_kwh, 2),
            "total_cost_czk": round(self._total_cost_czk, 2),
            "interval_count": len(self._charging_intervals),
        }

    async def async_update(self) -> None:
        """Aktualizace stavu sensoru."""
        # Načíst battery forecast sensor
        battery_forecast_id = f"sensor.oig_{self._box_id}_battery_forecast"
        spot_price_id = f"sensor.oig_{self._box_id}_spot_price_current_15min"

        battery_state = self._hass.states.get(battery_forecast_id)
        spot_price_state = self._hass.states.get(spot_price_id)

        if not battery_state or not battery_state.attributes:
            _LOGGER.warning(f"Battery forecast sensor {battery_forecast_id} not found")
            self._attr_is_on = False
            self._charging_intervals = []
            self._total_energy_kwh = 0.0
            self._total_cost_czk = 0.0
            return

        # Načíst timeline data
        timeline_data = battery_state.attributes.get("timeline_data", [])
        if not timeline_data:
            self._attr_is_on = False
            self._charging_intervals = []
            self._total_energy_kwh = 0.0
            self._total_cost_czk = 0.0
            return

        # Extrahovat intervaly s plánovaným nabíjením ze sítě
        charging_intervals = []
        total_energy = 0.0
        total_cost = 0.0
        now = datetime.now()

        for point in timeline_data:
            grid_charge_kwh = point.get("grid_charge_kwh", 0)
            if grid_charge_kwh > 0:
                timestamp_str = point.get("timestamp", "")
                try:
                    timestamp = datetime.fromisoformat(timestamp_str)
                    # Pouze budoucí intervaly
                    if timestamp > now:
                        spot_price_czk = point.get("spot_price_czk", 0)
                        cost_czk = grid_charge_kwh * spot_price_czk

                        charging_intervals.append(
                            {
                                "timestamp": timestamp_str,
                                "energy_kwh": round(grid_charge_kwh, 3),
                                "spot_price_czk": round(spot_price_czk, 2),
                                "cost_czk": round(cost_czk, 2),
                            }
                        )

                        total_energy += grid_charge_kwh
                        total_cost += cost_czk
                except (ValueError, TypeError) as e:
                    _LOGGER.warning(
                        f"Invalid timestamp in timeline: {timestamp_str}, error: {e}"
                    )
                    continue

        # Nastavit stav: ON pokud existují plánované intervaly
        self._attr_is_on = len(charging_intervals) > 0
        self._charging_intervals = charging_intervals
        self._total_energy_kwh = total_energy
        self._total_cost_czk = total_cost

        _LOGGER.debug(
            f"Grid charging planned: {self._attr_is_on}, "
            f"intervals: {len(charging_intervals)}, "
            f"total energy: {total_energy:.2f} kWh, "
            f"total cost: {total_cost:.2f} Kč"
        )


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Nastavení binary sensoru z config entry."""
    box_id = entry.data.get("box_id")
    device_name = entry.data.get(CONF_NAME, f"OIG {box_id}")

    if not box_id:
        _LOGGER.error("No box_id found in config entry")
        return

    async_add_entities(
        [GridChargingPlannedSensor(hass, entry, box_id, device_name)],
        update_before_add=True,
    )
