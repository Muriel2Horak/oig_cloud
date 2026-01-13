"""Simplified Battery Balancing Sensor - reads data from BalancingManager.

This sensor only displays information, all planning logic is in BalancingManager.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)


class OigCloudBatteryBalancingSensor(RestoreEntity, CoordinatorEntity, SensorEntity):
    """Battery balancing status sensor - displays BalancingManager state."""

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

        # Box ID (stabilní: config entry → proxy → coordinator numeric keys)
        try:
            from .base_sensor import resolve_box_id

            self._box_id = resolve_box_id(coordinator)
        except Exception:
            self._box_id = "unknown"

        # Entity setup
        self._attr_unique_id = f"oig_cloud_{self._box_id}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        self._attr_icon = "mdi:battery-heart-variant"
        self._attr_native_unit_of_measurement = None
        self._attr_device_class = None
        self._attr_state_class = None
        self._attr_entity_category = EntityCategory.DIAGNOSTIC

        # Název senzoru
        from ..sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        sensor_config = SENSOR_TYPES_STATISTICS.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")
        self._attr_name = name_cs or name_en or sensor_type

        # Cached state
        self._last_balancing: Optional[datetime] = None
        self._days_since_last: int = 99
        self._status: str = "unknown"
        self._current_state: str = "standby"
        self._planned_window: Optional[Dict[str, Any]] = None
        self._last_planning_check: Optional[datetime] = None

        # Cost tracking
        self._cost_immediate: Optional[float] = None
        self._cost_selected: Optional[float] = None
        self._cost_savings: Optional[float] = None

        # Configuration parameters
        self._cycle_days: int = 7
        self._holding_hours: int = 3
        self._soc_threshold: int = 80

    def _get_balancing_manager(self) -> Optional[Any]:
        """Get BalancingManager from hass.data."""
        if not self._hass:
            return None

        try:
            entry_data = self._hass.data.get(DOMAIN, {}).get(
                self._config_entry.entry_id, {}
            )
            return entry_data.get("balancing_manager")
        except Exception as e:
            _LOGGER.debug(f"Could not get BalancingManager: {e}")
            return None

    def _update_from_manager(self) -> None:
        """Update sensor state from BalancingManager."""
        manager = self._get_balancing_manager()
        if not manager:
            # Keep last known state (RestoreEntity) if available.
            self._status = self._status or "unknown"
            return

        # Pull canonical state/attrs from manager API (avoids poking private fields).
        try:
            manager_attrs = manager.get_sensor_attributes()
        except Exception as err:
            _LOGGER.debug(
                "Balancing sensor: manager state read failed: %s", err, exc_info=True
            )
            self._status = "unknown"
            return

        self._apply_config_params(manager)
        self._apply_last_balancing(manager_attrs)
        self._apply_costs(manager_attrs)

        active_plan = getattr(manager, "get_active_plan", lambda: None)()
        self._planned_window = self._build_planned_window(active_plan)

        self._status = self._resolve_status(active_plan)
        self._apply_current_state(active_plan)

        # Last planning check
        self._last_planning_check = dt_util.now()

    def _apply_config_params(self, manager: Any) -> None:
        self._cycle_days = self._safe_get_int(manager, "_get_cycle_days", 7)
        self._holding_hours = self._safe_get_int(manager, "_get_holding_time_hours", 3)
        self._soc_threshold = self._safe_get_int(manager, "_get_soc_threshold", 80)

    @staticmethod
    def _safe_get_int(manager: Any, attr: str, fallback: int) -> int:
        try:
            return int(getattr(manager, attr)())
        except Exception:
            return fallback

    def _apply_last_balancing(self, manager_attrs: Dict[str, Any]) -> None:
        last_ts = manager_attrs.get("last_balancing_ts")
        self._last_balancing = (
            _parse_dt_local(last_ts) if isinstance(last_ts, str) else None
        )
        try:
            days_since_val = manager_attrs.get("days_since_last")
            self._days_since_last = (
                int(float(days_since_val)) if days_since_val is not None else 99
            )
        except Exception:
            self._days_since_last = 99

    def _apply_costs(self, manager_attrs: Dict[str, Any]) -> None:
        self._cost_immediate = manager_attrs.get("immediate_cost_czk")
        self._cost_selected = manager_attrs.get("selected_cost_czk")
        self._cost_savings = manager_attrs.get("cost_savings_czk")

    def _build_planned_window(self, active_plan: Any) -> Optional[Dict[str, Any]]:
        if not active_plan:
            return None
        holding_start = active_plan.holding_start
        holding_end = active_plan.holding_end
        intervals = [
            {"ts": i.ts, "mode": i.mode} for i in (active_plan.intervals or [])
        ]

        charging_intervals = self._collect_charging_intervals(
            intervals, holding_start
        )

        return {
            "mode": getattr(active_plan.mode, "value", str(active_plan.mode)).lower(),
            "priority": getattr(
                active_plan.priority, "value", str(active_plan.priority)
            ).lower(),
            "holding_start": holding_start,
            "holding_end": holding_end,
            "reason": active_plan.reason,
            "charging_intervals": charging_intervals,
            "intervals": intervals,
        }

    @staticmethod
    def _collect_charging_intervals(
        intervals: List[Dict[str, Any]], holding_start: Any
    ) -> List[Any]:
        charging_intervals: List[Any] = []
        try:
            holding_start_dt = _parse_dt_local(holding_start)
            if holding_start_dt:
                for it in intervals:
                    ts = _parse_dt_local(it["ts"])
                    if ts and ts < holding_start_dt:
                        charging_intervals.append(it["ts"])
        except Exception:
            return []
        return charging_intervals

    def _resolve_status(self, active_plan: Any) -> str:
        enabled = bool(self._config_entry.options.get("balancing_enabled", True))
        if not enabled:
            return "disabled"
        if active_plan:
            prio = (getattr(active_plan.priority, "value", "") or "").lower()
            mode = (getattr(active_plan.mode, "value", "") or "").lower()
            if prio == "critical" or mode == "forced":
                return "critical"
            if prio == "high":
                return "due_soon"
            return "ok"
        if self._days_since_last >= self._cycle_days:
            return "overdue"
        if self._days_since_last >= max(0, self._cycle_days - 2):
            return "due_soon"
        return "ok"

    def _apply_current_state(self, active_plan: Any) -> None:
        self._current_state = "standby"
        self._time_remaining = None
        if not active_plan:
            return
        now = dt_util.now()
        try:
            hs = _parse_dt_local(active_plan.holding_start)
            he = _parse_dt_local(active_plan.holding_end)
            if hs and he:
                if hs <= now < he:
                    self._current_state = "balancing"
                    remaining = he - now
                    self._time_remaining = _format_hhmm(remaining)
                elif now < hs:
                    in_interval = self._is_now_in_intervals(
                        now, active_plan.intervals or []
                    )
                    self._current_state = "charging" if in_interval else "planned"
                    remaining = hs - now
                    self._time_remaining = _format_hhmm(remaining)
                else:
                    self._current_state = "completed"
        except Exception:
            self._current_state = "standby"

    @staticmethod
    def _is_now_in_intervals(now: datetime, intervals: List[Any]) -> bool:
        for it in intervals:
            ts = _parse_dt_local(it.ts)
            if ts and ts <= now < (ts + timedelta(minutes=15)):
                return True
        return False

    @property
    def native_value(self) -> str:
        """Return the state of the sensor."""
        return self._status

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return sensor attributes."""
        attrs = {
            "last_balancing": (
                self._last_balancing.isoformat() if self._last_balancing else None
            ),
            "days_since_last": self._days_since_last,
            "status": self._status,
            "current_state": self._current_state,
            "time_remaining": getattr(self, "_time_remaining", None),
            "planned": self._planned_window,
            "last_planning_check": (
                self._last_planning_check.isoformat()
                if self._last_planning_check
                else None
            ),
            # Configuration
            "cycle_days": getattr(self, "_cycle_days", 7),
            "holding_hours": getattr(self, "_holding_hours", 3),
            "soc_threshold": getattr(self, "_soc_threshold", 80),
            # Cost tracking
            "cost_immediate_czk": getattr(self, "_cost_immediate", None),
            "cost_selected_czk": getattr(self, "_cost_selected", None),
            "cost_savings_czk": getattr(self, "_cost_savings", None),
        }
        return attrs

    @property
    def device_info(self) -> Dict[str, Any]:
        """Return device info."""
        return self._device_info

    def _handle_coordinator_update(self) -> None:
        """Handle updated data from the coordinator."""
        self._update_from_manager()
        super()._handle_coordinator_update()

    async def async_update(self) -> None:
        """Update sensor state."""
        self._update_from_manager()

    async def async_added_to_hass(self) -> None:
        """When entity is added to hass."""
        await super().async_added_to_hass()
        self._hass = self.hass

        # Restore previous attributes/state if available (helps during startup).
        try:
            old_state = await self.async_get_last_state()
            if old_state:
                self._status = old_state.state or self._status
                attrs = old_state.attributes or {}
                last = attrs.get("last_balancing")
                if isinstance(last, str):
                    dt = _parse_dt_local(last)
                    self._last_balancing = dt if dt else self._last_balancing
                if attrs.get("days_since_last") is not None:
                    try:
                        self._days_since_last = int(attrs.get("days_since_last"))
                    except Exception as err:
                        _LOGGER.debug("Failed to restore days_since_last: %s", err)
                self._planned_window = attrs.get("planned") or self._planned_window
                self._cost_immediate = attrs.get(
                    "cost_immediate_czk", self._cost_immediate
                )
                self._cost_selected = attrs.get(
                    "cost_selected_czk", self._cost_selected
                )
                self._cost_savings = attrs.get("cost_savings_czk", self._cost_savings)
        except Exception as err:
            _LOGGER.debug("Failed to restore balancing state: %s", err)

        # Initial update
        self._update_from_manager()


def _format_hhmm(delta: timedelta) -> str:
    total = int(max(0, delta.total_seconds()))
    h = total // 3600
    m = (total % 3600) // 60
    return f"{h:02d}:{m:02d}"


def _parse_dt_local(value: str) -> Optional[datetime]:
    dt = dt_util.parse_datetime(value)
    if dt is None:
        try:
            dt = datetime.fromisoformat(value)
        except Exception:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=dt_util.DEFAULT_TIME_ZONE)
    return dt_util.as_local(dt)
