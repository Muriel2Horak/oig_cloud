"""Battery Helper Sensors - čtou data z battery_forecast a zobrazují je jako samostatné senzory."""

import logging
from typing import Any, Dict, Optional
from datetime import datetime

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.entity import EntityCategory
from homeassistant.core import HomeAssistant, callback, State
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.event import async_track_state_change_event

_LOGGER = logging.getLogger(__name__)


class OigCloudBatteryHelperSensor(SensorEntity):
    """Helper senzor který čte data z battery_forecast senzoru."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        sensor_type: str,
        config: Dict[str, Any],
        device_info: Dict[str, Any],
        inverter_sn: str,
    ) -> None:
        """Initialize the helper sensor."""
        self.hass = hass
        self._entry = entry
        self._sensor_type = sensor_type
        self._config = config
        self._device_info = device_info
        self._inverter_sn = inverter_sn

        self._attr_name = config.get("name")
        self._attr_unique_id = f"{inverter_sn}_{sensor_type}"
        self._attr_icon = config.get("icon")
        self._attr_native_unit_of_measurement = config.get("unit")
        self._attr_device_class = config.get("device_class")
        self._attr_state_class = config.get("state_class")
        self._attr_entity_category = config.get("entity_category")

        self._attr_native_value: Optional[Any] = None
        self._attr_extra_state_attributes: Dict[str, Any] = {}

        _LOGGER.debug(f"🔋 Created battery helper sensor: {sensor_type}")

    @property
    def device_info(self) -> Dict[str, Any]:
        """Return device info."""
        return self._device_info

    async def async_added_to_hass(self) -> None:
        """When entity is added to hass."""
        await super().async_added_to_hass()

        # Najít battery_forecast senzor
        battery_forecast_entity_id = f"sensor.{self._inverter_sn}_battery_forecast"

        # Poslouchat změny battery_forecast senzoru
        @callback
        def battery_forecast_changed(event: Any) -> None:
            """Handle battery forecast sensor changes."""
            new_state = event.data.get("new_state")
            if new_state is None:
                return

            self._update_from_battery_forecast(new_state)
            self.async_write_ha_state()

        # Zaregistrovat listener
        self.async_on_remove(
            async_track_state_change_event(
                self.hass, battery_forecast_entity_id, battery_forecast_changed
            )
        )

        # Okamžitě načíst aktuální stav
        current_state = self.hass.states.get(battery_forecast_entity_id)
        if current_state:
            self._update_from_battery_forecast(current_state)

    def _update_from_battery_forecast(self, battery_forecast_state: State) -> None:
        """Update this sensor from battery_forecast state."""
        if battery_forecast_state is None or not hasattr(
            battery_forecast_state, "attributes"
        ):
            return

        attrs = battery_forecast_state.attributes

        # Mapování sensor_type na atribut v battery_forecast
        if self._sensor_type == "should_charge_battery_now":
            self._attr_native_value = attrs.get("should_charge_now", "NE")
            self._attr_extra_state_attributes = {
                "next_charging_start": attrs.get("next_charging_start"),
                "next_charging_end": attrs.get("next_charging_end"),
                "reason": attrs.get("charging_reason", "N/A"),
            }

        elif self._sensor_type == "charging_hours_today":
            charging_hours = attrs.get("charging_hours_today", [])
            self._attr_native_value = len(charging_hours)
            self._attr_extra_state_attributes = {
                "hours": charging_hours,
                "description": f"{len(charging_hours)} hodin nabíjení dnes",
            }

        elif self._sensor_type == "charging_hours_tomorrow":
            charging_hours = attrs.get("charging_hours_tomorrow", [])
            self._attr_native_value = len(charging_hours)
            self._attr_extra_state_attributes = {
                "hours": charging_hours,
                "description": f"{len(charging_hours)} hodin nabíjení zítra",
            }

        elif self._sensor_type == "next_charging_time":
            self._attr_native_value = attrs.get("next_charging_start")
            self._attr_extra_state_attributes = {
                "charging_end": attrs.get("next_charging_end"),
                "duration_hours": attrs.get("next_charging_duration_hours"),
            }

        elif self._sensor_type == "battery_charging_state":
            self._attr_native_value = attrs.get("charging_state", "idle")
            self._attr_extra_state_attributes = {
                "description": attrs.get("charging_state_description"),
            }

        elif self._sensor_type == "charging_cost_today":
            self._attr_native_value = attrs.get("charging_cost_today", 0)
            self._attr_extra_state_attributes = {
                "kwh_charged": attrs.get("kwh_charged_today", 0),
                "avg_price": attrs.get("avg_charging_price_today"),
            }

        elif self._sensor_type == "charging_cost_tomorrow_planned":
            self._attr_native_value = attrs.get("charging_cost_tomorrow_planned", 0)
            self._attr_extra_state_attributes = {
                "kwh_planned": attrs.get("kwh_planned_tomorrow", 0),
                "avg_price_planned": attrs.get("avg_price_planned_tomorrow"),
            }

        elif self._sensor_type == "charging_savings_vs_peak":
            self._attr_native_value = attrs.get("savings_vs_peak", 0)
            self._attr_extra_state_attributes = {
                "peak_cost_alternative": attrs.get("peak_cost_alternative"),
                "actual_cost": attrs.get("actual_charging_cost"),
            }

        elif self._sensor_type == "charging_avg_price":
            self._attr_native_value = attrs.get("avg_charging_price_today", 0)

        elif self._sensor_type == "peak_hours_today_count":
            peak_hours = attrs.get("peak_hours_today", [])
            self._attr_native_value = len(peak_hours)
            self._attr_extra_state_attributes = {"hours": peak_hours}

        elif self._sensor_type == "off_peak_hours_today_count":
            off_peak_hours = attrs.get("off_peak_hours_today", [])
            self._attr_native_value = len(off_peak_hours)
            self._attr_extra_state_attributes = {"hours": off_peak_hours}

        elif self._sensor_type == "cheapest_price_today":
            self._attr_native_value = attrs.get("cheapest_price_today", 0)
            self._attr_extra_state_attributes = {
                "time": attrs.get("cheapest_price_time"),
            }

        elif self._sensor_type == "highest_price_today":
            self._attr_native_value = attrs.get("highest_price_today", 0)
            self._attr_extra_state_attributes = {
                "time": attrs.get("highest_price_time"),
            }

        elif self._sensor_type == "battery_timeline_chart_data":
            self._attr_native_value = "OK"
            self._attr_extra_state_attributes = {
                "timeline": attrs.get("timeline", []),
                "chart_ready": True,
            }

        elif self._sensor_type == "battery_forecast_min":
            self._attr_native_value = attrs.get("min_capacity", 0)
            self._attr_extra_state_attributes = {
                "time": attrs.get("min_capacity_time"),
                "soc_percent": attrs.get("min_capacity_soc"),
            }

        elif self._sensor_type == "battery_forecast_max":
            self._attr_native_value = attrs.get("max_capacity", 0)
            self._attr_extra_state_attributes = {
                "time": attrs.get("max_capacity_time"),
                "soc_percent": attrs.get("max_capacity_soc"),
            }

        elif self._sensor_type == "battery_forecast_tomorrow_6am":
            self._attr_native_value = attrs.get("tomorrow_6am_capacity", 0)
            self._attr_extra_state_attributes = {
                "soc_percent": attrs.get("tomorrow_6am_soc"),
            }

        elif self._sensor_type == "energy_balance_today":
            self._attr_native_value = attrs.get("energy_balance_today", 0)
            self._attr_extra_state_attributes = {
                "fve_production": attrs.get("fve_production_today"),
                "consumption": attrs.get("consumption_today"),
                "battery_charging": attrs.get("battery_charging_today"),
            }

        elif self._sensor_type == "battery_forecast_accuracy":
            self._attr_native_value = attrs.get("forecast_accuracy", 0)
            self._attr_extra_state_attributes = {
                "last_calculated": attrs.get("accuracy_last_calculated"),
            }

        elif self._sensor_type == "charging_savings_month":
            self._attr_native_value = attrs.get("monthly_savings", 0)
            self._attr_extra_state_attributes = {
                "month": attrs.get("current_month"),
                "days_in_month": attrs.get("days_counted"),
            }

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return extra state attributes."""
        return self._attr_extra_state_attributes

    @property
    def available(self) -> bool:
        """Return True if entity is available."""
        battery_forecast_entity_id = f"sensor.{self._inverter_sn}_battery_forecast"
        battery_state = self.hass.states.get(battery_forecast_entity_id)
        return battery_state is not None and battery_state.state not in [
            "unavailable",
            "unknown",
        ]
