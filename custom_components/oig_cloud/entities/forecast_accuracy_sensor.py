"""Publishes how well the battery forecast actually predicted the day.

Until this existed there was no number to point at: a change to the planner
could be better or worse and nobody could tell, and the question "does an AI
revision layer earn its keep?" had no way of being answered. State is the
7-day consumption MAPE; the attributes carry the breakdown — per plan version,
against the naive baseline, and in Kč.

Everything is read from the daily archive written after midnight, so this
sensor is cheap: one Store load per update, no Recorder queries.
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Any, Dict, List, Optional, cast

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from ..battery_forecast import accuracy as accuracy_module

_LOGGER = logging.getLogger(__name__)

#: Days shown individually in the attributes. Longer than that is what the
#: rolling windows are for.
DETAIL_DAYS = 7
STORAGE_VERSION = 1


class OigCloudForecastAccuracySensor(SensorEntity):
    """Forecast accuracy over the last 7 and 30 days."""

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
        hass: Optional[HomeAssistant] = None,
    ) -> None:
        super().__init__()

        self._sensor_type = sensor_type
        self._config_entry = config_entry
        self._attr_device_info = cast(Optional[DeviceInfo], device_info)
        self._hass: Optional[HomeAssistant] = hass or getattr(coordinator, "hass", None)

        try:
            from .base_sensor import resolve_box_id

            self._box_id = resolve_box_id(coordinator)
        except Exception:  # pragma: no cover - defensive, matches sibling sensors
            self._box_id = "unknown"

        self._attr_unique_id = f"oig_cloud_{self._box_id}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_icon = "mdi:target-variant"
        self._attr_native_unit_of_measurement = "%"
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_entity_category = EntityCategory.DIAGNOSTIC

        from ..sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        sensor_config = SENSOR_TYPES_STATISTICS.get(sensor_type, {})
        self._attr_name = (
            sensor_config.get("name_cs") or sensor_config.get("name") or sensor_type
        )

        self._plans_store: Optional[Any] = None
        self._today_provider = lambda: dt_util.now().date()
        self._attr_native_value: Optional[float] = None
        self._attr_extra_state_attributes: Dict[str, Any] = _empty_attributes()

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._hass = self.hass
        if self._plans_store is None and self.hass:
            self._plans_store = Store(
                self.hass,
                STORAGE_VERSION,
                f"oig_cloud.battery_plans_{self._box_id}",
            )

    async def async_update(self) -> None:
        archive = await self._load_archive()
        today: date = self._today_provider()

        self._attr_extra_state_attributes = _build_attributes(archive, today)
        self._attr_native_value = self._attr_extra_state_attributes["last_7_days"][
            "consumption_mape_pct"
        ]

    async def _load_archive(self) -> Dict[str, Dict[str, Any]]:
        if not self._plans_store:
            return {}
        try:
            data = await self._plans_store.async_load() or {}
        except Exception as err:
            _LOGGER.warning(
                "[OIG_CLOUD_WARNING][component=planner][corr=na][run=na] "
                "Could not read plans store for forecast accuracy: %s",
                err,
            )
            return {}
        return data.get("daily_archive") or {}


def _empty_attributes() -> Dict[str, Any]:
    empty = {
        "days": 0,
        "consumption_mape_pct": None,
        "consumption_bias_pct": None,
        "solar_bias_pct": None,
        "cost_delta_czk": None,
    }
    return {"last_7_days": dict(empty), "last_30_days": dict(empty), "days": []}


def _build_attributes(
    archive: Dict[str, Dict[str, Any]], today: date
) -> Dict[str, Any]:
    if not archive:
        return _empty_attributes()

    return {
        "last_7_days": accuracy_module.rolling_summary(archive, 7, today),
        "last_30_days": accuracy_module.rolling_summary(archive, 30, today),
        "days": _recent_day_reports(archive, today),
    }


def _recent_day_reports(
    archive: Dict[str, Dict[str, Any]], today: date
) -> List[Dict[str, Any]]:
    """Per-day detail, newest first, each scored against the naive baseline."""
    reports: List[Dict[str, Any]] = []
    for date_str in sorted(archive, reverse=True)[:DETAIL_DAYS]:
        day = accuracy_module.parse_date(date_str)
        naive = accuracy_module.naive_forecast(archive, day) if day else []
        reports.append(accuracy_module.day_report(archive[date_str], naive=naive))
    return reports
