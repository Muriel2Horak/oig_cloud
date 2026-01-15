"""Battery efficiency sensor extracted from legacy battery forecast."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, TYPE_CHECKING

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)

if TYPE_CHECKING:  # pragma: no cover
    from ...core.coordinator import OigCloudCoordinator


class OigCloudBatteryEfficiencySensor(CoordinatorEntity, SensorEntity):
    """
    Battery round-trip efficiency calculator.

    State = Last COMPLETE month efficiency (%)
    Attributes = Current month (partial) efficiency and metrics

    Formula:
    efficiency = (effective_discharge / charge) * 100
    where: effective_discharge = discharge - (battery_end - battery_start)
    """

    def __init__(
        self,
        coordinator: OigCloudCoordinator,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
        hass: Optional[HomeAssistant] = None,
    ) -> None:
        """Initialize the battery efficiency sensor."""
        CoordinatorEntity.__init__(self, coordinator)

        self._sensor_type = sensor_type
        self._config_entry = config_entry
        self._hass: Optional[HomeAssistant] = hass or getattr(coordinator, "hass", None)

        # Stabilní box_id resolution (config entry → proxy → coordinator numeric keys)
        try:
            from ...entities.base_sensor import resolve_box_id

            self._box_id = resolve_box_id(coordinator)
        except Exception:
            self._box_id = "unknown"

        # Set device info early - type: ignore because DeviceInfo is a TypedDict
        self._attr_device_info = device_info  # type: ignore[assignment]

        # Entity setup
        self._attr_unique_id = f"oig_cloud_{self._box_id}_battery_efficiency"
        self.entity_id = f"sensor.oig_{self._box_id}_battery_efficiency"
        self._attr_icon = "mdi:battery-sync"
        self._attr_native_unit_of_measurement = "%"
        self._attr_device_class = None
        self._attr_state_class = SensorStateClass.MEASUREMENT

        # Načíst název ze sensor types
        from ...sensors.SENSOR_TYPES_STATISTICS import SENSOR_TYPES_STATISTICS

        sensor_config = SENSOR_TYPES_STATISTICS.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")
        self._attr_name = name_cs or name_en or "Efektivita baterie (měsíc)"

        # Cached metrics (in-memory only)
        self._last_month_metrics: Optional[Dict[str, Any]] = None
        self._last_month_key: Optional[str] = None
        self._current_month_metrics: Dict[str, Optional[float]] = {}
        self._current_month_status: str = "unavailable"
        self._current_month_start_kwh: Optional[float] = None
        self._current_month_key: Optional[str] = None
        self._month_snapshot: Optional[Dict[str, Any]] = None
        self._last_update_iso: Optional[str] = None
        self._history_refresh_inflight = False

        self._attr_extra_state_attributes = {}

    async def async_added_to_hass(self) -> None:
        """Register periodic refresh and do initial calculation."""
        await CoordinatorEntity.async_added_to_hass(self)
        self._hass = self.hass

        self._restore_from_state()

        async_track_time_change(
            self.hass, self._scheduled_snapshot, hour=23, minute=55, second=0
        )
        async_track_time_change(
            self.hass, self._scheduled_finalize, hour=0, minute=10, second=0
        )

        now_local = dt_util.as_local(dt_util.utcnow())
        await self._finalize_last_month(now_local, force=True)
        self._update_current_month_metrics()
        self._publish_state()

    def _handle_coordinator_update(self) -> None:
        """Update current month metrics on coordinator updates."""
        self._update_current_month_metrics()
        self._publish_state()

    def _restore_from_state(self) -> None:
        state = self.hass.states.get(self.entity_id)
        if not state or not state.attributes:
            return

        attrs = state.attributes
        last_year = attrs.get("last_month_year")
        last_month = attrs.get("last_month_month")
        if last_year and last_month:
            self._last_month_metrics = {
                "year": last_year,
                "month": last_month,
                "efficiency_pct": attrs.get("efficiency_last_month_pct"),
                "losses_kwh": attrs.get("losses_last_month_kwh"),
                "losses_pct": attrs.get("losses_last_month_pct"),
                "charge_kwh": attrs.get("last_month_charge_kwh"),
                "discharge_kwh": attrs.get("last_month_discharge_kwh"),
                "effective_discharge_kwh": attrs.get("last_month_effective_discharge_kwh"),
                "delta_kwh": attrs.get("last_month_delta_kwh"),
                "battery_start_kwh": attrs.get("last_month_battery_start_kwh"),
                "battery_end_kwh": attrs.get("last_month_battery_end_kwh"),
            }
            self._last_month_key = _month_key(last_year, last_month)

        self._current_month_start_kwh = attrs.get("battery_kwh_month_start")
        self._current_month_key = attrs.get("_current_month_key")
        self._month_snapshot = attrs.get("_month_snapshot")

    async def _scheduled_snapshot(self, now: datetime) -> None:
        now_local = dt_util.as_local(now)
        self._capture_month_snapshot(now_local)
        self._update_current_month_metrics()
        self._publish_state()

    async def _scheduled_finalize(self, now: datetime) -> None:
        now_local = dt_util.as_local(now)
        await self._finalize_last_month(now_local, force=False)
        self._update_current_month_metrics()
        self._publish_state()

    def _capture_month_snapshot(self, now_local: datetime) -> None:
        current_key = _month_key(now_local.year, now_local.month)
        if self._current_month_key != current_key:
            self._current_month_key = current_key
            battery_now = self._get_sensor("remaining_usable_capacity")
            if battery_now is not None:
                self._current_month_start_kwh = battery_now

        charge_wh = self._get_sensor("computed_batt_charge_energy_month")
        discharge_wh = self._get_sensor("computed_batt_discharge_energy_month")
        battery_now = self._get_sensor("remaining_usable_capacity")
        if (
            charge_wh is None
            or discharge_wh is None
            or battery_now is None
            or self._current_month_start_kwh is None
        ):
            return

        self._month_snapshot = {
            "month_key": current_key,
            "charge_wh": charge_wh,
            "discharge_wh": discharge_wh,
            "battery_start_kwh": self._current_month_start_kwh,
            "battery_end_kwh": battery_now,
            "captured_at": now_local.isoformat(),
        }

    async def _finalize_last_month(self, now_local: datetime, force: bool) -> None:
        prev_year, prev_month = _previous_month(now_local)
        prev_key = _month_key(prev_year, prev_month)

        if self._last_month_key == prev_key and self._last_month_metrics and not force:
            return

        metrics = self._get_snapshot_metrics(prev_key, prev_year, prev_month)
        if metrics is None:
            metrics = await self._load_last_month_metrics(prev_year, prev_month)

        if metrics:
            self._last_month_metrics = metrics
            self._last_month_key = prev_key
        else:
            if self._last_month_key == prev_key and self._last_month_metrics:
                _LOGGER.warning(
                    "Keeping last month efficiency for %s/%s from stored state (history missing)",
                    prev_month,
                    prev_year,
                )
            else:
                self._reset_last_month_metrics(prev_key)

        if now_local.day == 1:
            self._rollover_month(now_local, prev_key)

    def _get_snapshot_metrics(
        self, prev_key: str, prev_year: int, prev_month: int
    ) -> Optional[Dict[str, Any]]:
        snapshot = self._month_snapshot
        if not snapshot or snapshot.get("month_key") != prev_key:
            return None

        metrics = _compute_metrics_from_wh(
            snapshot.get("charge_wh"),
            snapshot.get("discharge_wh"),
            snapshot.get("battery_start_kwh"),
            snapshot.get("battery_end_kwh"),
        )
        if metrics is None:
            return None

        metrics["year"] = prev_year
        metrics["month"] = prev_month
        return metrics

    async def _load_last_month_metrics(
        self, prev_year: int, prev_month: int
    ) -> Optional[Dict[str, Any]]:
        if self._history_refresh_inflight:
            return None

        self._history_refresh_inflight = True
        try:
            return await _load_month_metrics(
                self.hass, self._box_id, prev_year, prev_month
            )
        finally:
            self._history_refresh_inflight = False

    def _reset_last_month_metrics(self, prev_key: str) -> None:
        if self._last_month_key == prev_key:
            return
        self._last_month_metrics = None
        self._last_month_key = None

    def _rollover_month(self, now_local: datetime, prev_key: str) -> None:
        if self._month_snapshot and self._month_snapshot.get("month_key") == prev_key:
            self._month_snapshot = None

        battery_now = self._get_sensor("remaining_usable_capacity")
        if battery_now is not None:
            self._current_month_start_kwh = battery_now
        self._current_month_key = _month_key(now_local.year, now_local.month)

    def _update_current_month_metrics(self) -> None:
        now_local = dt_util.as_local(dt_util.utcnow())
        current_key = _month_key(now_local.year, now_local.month)
        if self._current_month_key != current_key:
            self._current_month_key = current_key
            battery_now = self._get_sensor("remaining_usable_capacity")
            if battery_now is not None:
                self._current_month_start_kwh = battery_now

        charge_wh = self._get_sensor("computed_batt_charge_energy_month")
        discharge_wh = self._get_sensor("computed_batt_discharge_energy_month")
        battery_now = self._get_sensor("remaining_usable_capacity")
        self._last_update_iso = now_local.isoformat()

        if (
            charge_wh is not None
            and discharge_wh is not None
            and battery_now is not None
            and self._current_month_start_kwh is not None
            and (
                self._month_snapshot is None
                or self._month_snapshot.get("month_key") == current_key
            )
        ):
            self._month_snapshot = {
                "month_key": current_key,
                "charge_wh": charge_wh,
                "discharge_wh": discharge_wh,
                "battery_start_kwh": self._current_month_start_kwh,
                "battery_end_kwh": battery_now,
                "captured_at": now_local.isoformat(),
            }

        if charge_wh is None or discharge_wh is None:
            self._current_month_metrics = _empty_metrics(
                charge_wh, discharge_wh, self._current_month_start_kwh, battery_now
            )
            self._current_month_status = "missing charge/discharge data"
            return

        if self._current_month_start_kwh is None or battery_now is None:
            self._current_month_metrics = _empty_metrics(
                charge_wh, discharge_wh, self._current_month_start_kwh, battery_now
            )
            self._current_month_status = "missing month start"
            return

        metrics = _compute_metrics_from_wh(
            charge_wh, discharge_wh, self._current_month_start_kwh, battery_now
        )
        self._current_month_metrics = metrics or _empty_metrics(
            charge_wh, discharge_wh, self._current_month_start_kwh, battery_now
        )
        self._current_month_status = f"partial ({now_local.day} days)"

    def _publish_state(self) -> None:
        now_local = dt_util.as_local(dt_util.utcnow())
        prev_year, prev_month = _previous_month(now_local)
        prev_key = _month_key(prev_year, prev_month)

        last_metrics = (
            self._last_month_metrics
            if self._last_month_key == prev_key
            else None
        )
        current_metrics = self._current_month_metrics or {}

        self._attr_native_value = (
            last_metrics.get("efficiency_pct") if last_metrics else None
        )

        self._attr_extra_state_attributes = {
            # Last month (complete)
            "efficiency_last_month_pct": last_metrics.get("efficiency_pct")
            if last_metrics
            else None,
            "losses_last_month_kwh": last_metrics.get("losses_kwh")
            if last_metrics
            else None,
            "losses_last_month_pct": last_metrics.get("losses_pct")
            if last_metrics
            else None,
            "last_month_charge_kwh": last_metrics.get("charge_kwh")
            if last_metrics
            else None,
            "last_month_discharge_kwh": last_metrics.get("discharge_kwh")
            if last_metrics
            else None,
            "last_month_effective_discharge_kwh": last_metrics.get(
                "effective_discharge_kwh"
            )
            if last_metrics
            else None,
            "last_month_delta_kwh": last_metrics.get("delta_kwh")
            if last_metrics
            else None,
            "last_month_battery_start_kwh": last_metrics.get("battery_start_kwh")
            if last_metrics
            else None,
            "last_month_battery_end_kwh": last_metrics.get("battery_end_kwh")
            if last_metrics
            else None,
            "last_month_status": "complete" if last_metrics else "unavailable",
            "last_month_year": last_metrics.get("year") if last_metrics else None,
            "last_month_month": last_metrics.get("month") if last_metrics else None,
            # Current month (partial)
            "efficiency_current_month_pct": current_metrics.get("efficiency_pct"),
            "losses_current_month_kwh": current_metrics.get("losses_kwh"),
            "losses_current_month_pct": current_metrics.get("losses_pct"),
            "current_month_charge_kwh": current_metrics.get("charge_kwh"),
            "current_month_discharge_kwh": current_metrics.get("discharge_kwh"),
            "current_month_delta_kwh": current_metrics.get("delta_kwh"),
            "current_month_days": now_local.day,
            "current_month_status": self._current_month_status,
            # Battery tracking
            "battery_kwh_month_start": self._current_month_start_kwh,
            "battery_kwh_now": current_metrics.get("battery_end_kwh"),
            # Metadata
            "last_update": self._last_update_iso,
            "calculation_method": "Energy balance with SoC correction",
            "data_source": "snapshot + recorder fallback",
            "formula": "(discharge - ΔE_battery) / charge * 100",
            "formula_losses": "charge - (discharge - ΔE_battery)",
            # Internal (for restore)
            "_current_month_key": self._current_month_key,
            "_month_snapshot": self._month_snapshot,
        }

        self.async_write_ha_state()

    def _get_sensor(self, sensor_type: str) -> Optional[float]:
        """Get numeric value from existing sensor."""
        if not self._hass:
            return None

        sensor_id = f"sensor.oig_{self._box_id}_{sensor_type}"
        state = self._hass.states.get(sensor_id)
        if not state or state.state in ["unknown", "unavailable"]:
            return None

        try:
            return float(state.state)
        except (ValueError, TypeError):
            return None


def _previous_month(now: datetime) -> tuple[int, int]:
    if now.month == 1:
        return now.year - 1, 12
    return now.year, now.month - 1


def _month_key(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def _month_range_local(year: int, month: int) -> tuple[datetime, datetime]:
    import calendar

    tz = dt_util.DEFAULT_TIME_ZONE
    last_day = calendar.monthrange(year, month)[1]
    start_local = datetime(year, month, 1, 0, 0, 0, tzinfo=tz)
    end_local = datetime(year, month, last_day, 23, 59, 59, tzinfo=tz)
    return start_local, end_local


async def _load_month_metrics(
    hass: Any, box_id: str, year: int, month: int
) -> Optional[Dict[str, Any]]:
    """Compute efficiency metrics for a closed month using recorder history."""
    try:
        from homeassistant.components.recorder.history import get_significant_states
        from homeassistant.components.recorder.statistics import (
            statistics_during_period,
        )
    except ImportError:
        _LOGGER.warning("Recorder component not available")
        return None

    start_local, end_local = _month_range_local(year, month)
    start_utc = dt_util.as_utc(start_local)
    end_utc = dt_util.as_utc(end_local)

    charge_sensor, discharge_sensor, battery_sensor = _monthly_sensor_ids(box_id)

    # Pull a wide window to ensure we capture values around month boundaries.
    history = await _load_history_states(
        hass,
        get_significant_states,
        start_utc - timedelta(days=1),
        end_utc,
        [charge_sensor, discharge_sensor, battery_sensor],
    )

    charge_start = _extract_first_numeric(history, charge_sensor)
    charge_end = _extract_latest_numeric(history, charge_sensor)
    discharge_start = _extract_first_numeric(history, discharge_sensor)
    discharge_end = _extract_latest_numeric(history, discharge_sensor)
    battery_start = _extract_first_numeric(history, battery_sensor)
    battery_end = _extract_latest_numeric(history, battery_sensor)

    if (
        charge_start is None
        or charge_end is None
        or discharge_start is None
        or discharge_end is None
        or battery_start is None
        or battery_end is None
    ):
        stats = await _load_statistics(
            hass,
            statistics_during_period,
            start_utc,
            end_utc,
            [charge_sensor, discharge_sensor, battery_sensor],
        )
        if stats:
            charge_sum = _last_stat_sum(stats, charge_sensor)
            discharge_sum = _last_stat_sum(stats, discharge_sensor)
            battery_start, battery_end = _extract_stats_bounds(
                stats, battery_sensor, prefer_sum=False
            )
            charge_start_stats, charge_end_stats = _extract_stats_bounds(
                stats, charge_sensor, prefer_sum=False
            )
            discharge_start_stats, discharge_end_stats = _extract_stats_bounds(
                stats, discharge_sensor, prefer_sum=False
            )

            charge_bounds = _resolve_month_delta(
                charge_start_stats, charge_end_stats, "charge", month, year
            )
            discharge_bounds = _resolve_month_delta(
                discharge_start_stats, discharge_end_stats, "discharge", month, year
            )
            if charge_sum is not None and discharge_sum is not None:
                charge_start = None
                charge_end = charge_sum
                discharge_start = None
                discharge_end = discharge_sum
            elif charge_bounds is not None and discharge_bounds is not None:
                charge_start = None
                charge_end = charge_bounds
                discharge_start = None
                discharge_end = discharge_bounds

    charge_wh = _resolve_month_delta(charge_start, charge_end, "charge", month, year)
    discharge_wh = _resolve_month_delta(
        discharge_start, discharge_end, "discharge", month, year
    )

    metrics = _compute_metrics_from_wh(
        charge_wh, discharge_wh, battery_start, battery_end
    )
    if not metrics or not _is_efficiency_plausible(metrics.get("efficiency_pct")):
        if metrics and not _is_efficiency_plausible(metrics.get("efficiency_pct")):
            _LOGGER.warning(
                "Implausible efficiency for %s/%s: %.1f%% (charge=%.2f kWh, discharge=%.2f kWh, delta=%.2f kWh)",
                month,
                year,
                metrics.get("efficiency_pct") or -1,
                metrics.get("charge_kwh") or 0,
                metrics.get("discharge_kwh") or 0,
                metrics.get("delta_kwh") or 0,
            )
        _log_last_month_failure(
            month,
            year,
            charge_wh,
            discharge_wh,
            battery_start,
            battery_end,
        )
        return None

    metrics["year"] = year
    metrics["month"] = month
    _log_last_month_success(month, year, metrics)
    return metrics


def _monthly_sensor_ids(box_id: str) -> tuple[str, str, str]:
    charge_sensor = f"sensor.oig_{box_id}_computed_batt_charge_energy_month"
    discharge_sensor = f"sensor.oig_{box_id}_computed_batt_discharge_energy_month"
    battery_sensor = f"sensor.oig_{box_id}_remaining_usable_capacity"
    return charge_sensor, discharge_sensor, battery_sensor


async def _load_history_states(
    hass: Any,
    history_fn: Any,
    start_time: datetime,
    end_time: datetime,
    entity_ids: list[str],
) -> Optional[Dict[str, Any]]:
    return await hass.async_add_executor_job(
        history_fn,
        hass,
        start_time,
        end_time,
        entity_ids,
    )


async def _load_statistics(
    hass: Any,
    stats_fn: Any,
    start_time: datetime,
    end_time: datetime,
    entity_ids: list[str],
) -> Optional[Dict[str, Any]]:
    try:
        return await hass.async_add_executor_job(
            stats_fn,
            hass,
            start_time,
            end_time,
            set(entity_ids),
            "day",
            None,
            {"mean", "max", "sum", "state"},
        )
    except Exception as exc:  # pragma: no cover - recorder can fail early
        _LOGGER.warning("Failed to load statistics: %s", exc)
        return None


def _extract_stats_bounds(
    stats: Optional[Dict[str, Any]],
    entity_id: str,
    prefer_sum: bool,
) -> tuple[Optional[float], Optional[float]]:
    if not stats or entity_id not in stats or not stats[entity_id]:
        return None, None
    items = stats[entity_id]
    first_value = _extract_stat_value(items, prefer_sum, forward=True)
    last_value = _extract_stat_value(items, prefer_sum, forward=False)
    return first_value, last_value


def _extract_stat_value(
    items: list[Dict[str, Any]],
    prefer_sum: bool,
    forward: bool,
) -> Optional[float]:
    keys = ("sum", "state", "max", "mean") if prefer_sum else ("state", "mean", "max", "sum")
    iterable = items if forward else reversed(items)
    for item in iterable:
        for key in keys:
            value = item.get(key)
            if value is None:
                continue
            try:
                return float(value)
            except (ValueError, TypeError):
                continue
    return None


def _last_stat_sum(
    stats: Optional[Dict[str, Any]],
    entity_id: str,
) -> Optional[float]:
    if not stats or entity_id not in stats or not stats[entity_id]:
        return None
    value = _extract_stat_value(stats[entity_id], prefer_sum=True, forward=False)
    if value is not None:
        return value
    return _extract_stat_value(stats[entity_id], prefer_sum=False, forward=False)


def _is_efficiency_plausible(value: Optional[float]) -> bool:
    if value is None:
        return False
    return 50.0 <= value <= 110.0


def _extract_latest_numeric(
    history: Optional[Dict[str, Any]], entity_id: str
) -> Optional[float]:
    if not history or entity_id not in history or not history[entity_id]:
        return None
    for item in reversed(history[entity_id]):
        state_value = item.get("state") if isinstance(item, dict) else item.state
        if state_value in ["unknown", "unavailable", None]:
            continue
        try:
            return float(state_value)
        except (ValueError, TypeError):
            continue
    return None


def _extract_first_numeric(
    history: Optional[Dict[str, Any]], entity_id: str
) -> Optional[float]:
    if not history or entity_id not in history or not history[entity_id]:
        return None
    for item in history[entity_id]:
        state_value = item.get("state") if isinstance(item, dict) else item.state
        if state_value in ["unknown", "unavailable", None]:
            continue
        try:
            return float(state_value)
        except (ValueError, TypeError):
            continue
    return None


def _resolve_month_delta(
    start_value: Optional[float],
    end_value: Optional[float],
    label: str,
    month: int,
    year: int,
) -> Optional[float]:
    if end_value is None:
        return None
    if start_value is None:
        return end_value
    delta = end_value - start_value
    if delta < 0:
        _LOGGER.info(
            "Detected %s reset for %s/%s: start=%s end=%s, using end as total",
            label,
            month,
            year,
            start_value,
            end_value,
        )
        return end_value
    return delta


async def _load_battery_start(
    hass: Any, history_fn: Any, battery_sensor: str, start_time: datetime
) -> Optional[float]:
    history_start = await hass.async_add_executor_job(
        history_fn,
        hass,
        start_time,
        start_time + timedelta(hours=1),
        [battery_sensor],
    )
    return _extract_first_numeric(history_start, battery_sensor) or _extract_latest_numeric(
        history_start, battery_sensor
    )


def _compute_metrics_from_wh(
    charge_wh: Optional[float],
    discharge_wh: Optional[float],
    battery_start_kwh: Optional[float],
    battery_end_kwh: Optional[float],
) -> Optional[Dict[str, float]]:
    if (
        charge_wh is None
        or discharge_wh is None
        or battery_start_kwh is None
        or battery_end_kwh is None
    ):
        return None

    charge_kwh = charge_wh / 1000
    discharge_kwh = discharge_wh / 1000
    delta_kwh = battery_end_kwh - battery_start_kwh

    effective_discharge = discharge_kwh - delta_kwh
    if charge_kwh <= 0 or effective_discharge <= 0:
        return None

    efficiency = (effective_discharge / charge_kwh) * 100
    losses_kwh = charge_kwh - effective_discharge
    losses_pct = (losses_kwh / charge_kwh) * 100
    return {
        "efficiency_pct": round(efficiency, 1),
        "losses_kwh": round(losses_kwh, 2),
        "losses_pct": round(losses_pct, 1),
        "charge_kwh": round(charge_kwh, 2),
        "discharge_kwh": round(discharge_kwh, 2),
        "effective_discharge_kwh": round(effective_discharge, 2),
        "delta_kwh": round(delta_kwh, 2),
        "battery_start_kwh": round(battery_start_kwh, 2),
        "battery_end_kwh": round(battery_end_kwh, 2),
    }


def _empty_metrics(
    charge_wh: Optional[float],
    discharge_wh: Optional[float],
    battery_start_kwh: Optional[float],
    battery_end_kwh: Optional[float],
) -> Dict[str, Optional[float]]:
    charge_kwh = round(charge_wh / 1000, 2) if charge_wh is not None else None
    discharge_kwh = (
        round(discharge_wh / 1000, 2) if discharge_wh is not None else None
    )
    return {
        "efficiency_pct": None,
        "losses_kwh": None,
        "losses_pct": None,
        "charge_kwh": charge_kwh,
        "discharge_kwh": discharge_kwh,
        "effective_discharge_kwh": None,
        "delta_kwh": (
            round(battery_end_kwh - battery_start_kwh, 2)
            if battery_start_kwh is not None and battery_end_kwh is not None
            else None
        ),
        "battery_start_kwh": (
            round(battery_start_kwh, 2) if battery_start_kwh is not None else None
        ),
        "battery_end_kwh": (
            round(battery_end_kwh, 2) if battery_end_kwh is not None else None
        ),
    }


def _log_last_month_success(
    last_month: int, last_month_year: int, metrics: Dict[str, float]
) -> None:
    _LOGGER.info(
        "Loaded %s/%s from history: efficiency=%.1f%%, charge=%.2f kWh, "
        "discharge=%.2f kWh, delta=%.2f kWh",
        last_month,
        last_month_year,
        metrics["efficiency_pct"],
        metrics["charge_kwh"],
        metrics["discharge_kwh"],
        metrics["delta_kwh"],
    )


def _log_last_month_failure(
    last_month: int,
    last_month_year: int,
    charge_wh: Optional[float],
    discharge_wh: Optional[float],
    battery_start: Optional[float],
    battery_end: Optional[float],
) -> None:
    _LOGGER.warning(
        "Incomplete data for %s/%s: charge=%s, discharge=%s, "
        "battery_start=%s, battery_end=%s",
        last_month,
        last_month_year,
        charge_wh,
        discharge_wh,
        battery_start,
        battery_end,
    )
