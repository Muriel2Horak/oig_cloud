"""The car's charging plan as a sensor.

State ``charge`` while the plan charges in the current slot, otherwise the
plan's status (``planned``, ``shortfall``, ``no_need``, ``unplugged``), so an
automation can switch the wallbox on ``charge``. The attributes carry the whole
plan, the predicted departure and the learned profile.
"""

from __future__ import annotations

from typing import Any, Optional

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from ..const import DOMAIN, SIGNAL_EV_PLAN_UPDATED

STATE_CHARGE = "charge"


class EvChargingPlanSensor(SensorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_icon = "mdi:ev-station"

    def __init__(self, runtime: Any, *, box_id: str) -> None:
        self._runtime = runtime
        self._attr_unique_id = f"oig_cloud_{box_id}_ev_charging_plan"
        self.entity_id = f"sensor.oig_{box_id}_ev_charging_plan"
        self._attr_name = "Plán nabíjení auta"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"{box_id}_ev")},
            name=f"OIG Elektroauto {box_id}",
            manufacturer="OIG",
            model="EV charging plan",
        )
        self._unsub: Any = None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._unsub = async_dispatcher_connect(
            self.hass,
            SIGNAL_EV_PLAN_UPDATED.format(entry_id=self._runtime.entry_id),
            self.async_write_ha_state,
        )

    async def async_will_remove_from_hass(self) -> None:
        if self._unsub is not None:
            self._unsub()
            self._unsub = None

    @property
    def native_value(self) -> Optional[str]:  # type: ignore[override]
        plan = self._runtime.last_plan
        if plan is None:
            return None
        return STATE_CHARGE if plan.charge_now else plan.status

    @property
    def extra_state_attributes(self) -> dict[str, Any]:  # type: ignore[override]
        plan = self._runtime.last_plan
        attrs = dict(self._runtime.as_dict())
        attrs["charge_now"] = bool(plan.charge_now) if plan is not None else False
        attrs["next_start"] = (
            plan.next_start.isoformat() if plan is not None and plan.next_start else None
        )
        return attrs
