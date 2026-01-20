"""Battery efficiency sensor extracted from legacy battery forecast."""

from __future__ import annotations

import inspect
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
                "effective_discharge_kwh": attrs.get(
                    "last_month_effective_discharge_kwh"
                ),
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

        charge_wh = self._get_sensor("computed_batt_charge_energy_month")
        discharge_wh = self._get_sensor("computed_batt_discharge_energy_month")
        if charge_wh is None or discharge_wh is None:
            return

        self._month_snapshot = {
            "month_key": current_key,
            "charge_wh": charge_wh,
            "discharge_wh": discharge_wh,
            "battery_start_kwh": None,
            "battery_end_kwh": None,
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
            if (
                self._last_month_key == prev_key and self._last_month_metrics
            ):  # pragma: no cover
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
        self._current_month_key = _month_key(now_local.year, now_local.month)

    def _update_current_month_metrics(self) -> None:
        now_local = dt_util.as_local(dt_util.utcnow())
        current_key = _month_key(now_local.year, now_local.month)
        if self._current_month_key != current_key:
            self._current_month_key = current_key

        charge_wh = self._get_sensor("computed_batt_charge_energy_month")
        discharge_wh = self._get_sensor("computed_batt_discharge_energy_month")
        self._last_update_iso = now_local.isoformat()

        if (
            charge_wh is not None
            and discharge_wh is not None
            and (
                self._month_snapshot is None
                or self._month_snapshot.get("month_key") == current_key
            )
        ):
            self._month_snapshot = {
                "month_key": current_key,
                "charge_wh": charge_wh,
                "discharge_wh": discharge_wh,
                "battery_start_kwh": None,
                "battery_end_kwh": None,
                "captured_at": now_local.isoformat(),
            }

        if charge_wh is None or discharge_wh is None:
            self._current_month_metrics = _empty_metrics(
                charge_wh, discharge_wh, None, None
            )
            self._current_month_status = "missing charge/discharge data"
            return

        metrics = _compute_metrics_from_wh(charge_wh, discharge_wh, None, None)
        self._current_month_metrics = metrics or _empty_metrics(
            charge_wh, discharge_wh, None, None
        )
        self._current_month_status = f"partial ({now_local.day} days)"

    def _publish_state(self) -> None:
        now_local = dt_util.as_local(dt_util.utcnow())
        prev_year, prev_month = _previous_month(now_local)
        prev_key = _month_key(prev_year, prev_month)

        last_metrics = (
            self._last_month_metrics if self._last_month_key == prev_key else None
        )
        current_metrics = self._current_month_metrics or {}

        self._attr_native_value = (
            last_metrics.get("efficiency_pct") if last_metrics else None
        )

        self._attr_extra_state_attributes = {
            # Last month (complete)
            "efficiency_last_month_pct": (
                last_metrics.get("efficiency_pct") if last_metrics else None
            ),
            "losses_last_month_kwh": (
                last_metrics.get("losses_kwh") if last_metrics else None
            ),
            "losses_last_month_pct": (
                last_metrics.get("losses_pct") if last_metrics else None
            ),
            "last_month_charge_kwh": (
                last_metrics.get("charge_kwh") if last_metrics else None
            ),
            "last_month_discharge_kwh": (
                last_metrics.get("discharge_kwh") if last_metrics else None
            ),
            "last_month_effective_discharge_kwh": (
                last_metrics.get("effective_discharge_kwh") if last_metrics else None
            ),
            "last_month_delta_kwh": (
                last_metrics.get("delta_kwh") if last_metrics else None
            ),
            "last_month_battery_start_kwh": (
                last_metrics.get("battery_start_kwh") if last_metrics else None
            ),
            "last_month_battery_end_kwh": (
                last_metrics.get("battery_end_kwh") if last_metrics else None
            ),
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
            "battery_kwh_month_start": None,
            "battery_kwh_now": None,
            # Metadata
            "last_update": self._last_update_iso,
            "calculation_method": "Discharge/charge ratio",
            "data_source": "snapshot + statistics",
            "formula": "discharge / charge * 100",
            "formula_losses": "max(charge - discharge, 0)",
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
    end_local = datetime(year, month, last_day, 23, 59, 0, tzinfo=tz)
    return start_local, end_local


async def _get_battery_start(
    hass: Any, start_utc: datetime, battery_sensor: str, _get_history
) -> Optional[float]:
    """Retrieve initial battery level."""
    try:
        battery_history = await hass.async_add_executor_job(
            _get_history,
            start_utc,
            start_utc + timedelta(minutes=1),
            [battery_sensor],
        )
        return _history_value(battery_history.get(battery_sensor))
    except Exception:
        return None


async def _fallback_to_statistics(
    hass: Any,
    start_utc: datetime,
    end_utc: datetime,
    charge_sensor: str,
    discharge_sensor: str,
    battery_sensor: str,
    charge_wh: Optional[float],
    discharge_wh: Optional[float],
    battery_start: Optional[float],
    battery_end: Optional[float],
) -> tuple[Optional[float], Optional[float], Optional[float], Optional[float]]:
    """Fallback to statistics if history values are missing."""
    if charge_wh is None or discharge_wh is None:
        stats_metrics = await _load_month_metrics_from_statistics(
            hass, start_utc, end_utc, charge_sensor, discharge_sensor, battery_sensor
        )
        if stats_metrics:
            charge_wh = stats_metrics.get("charge_wh", charge_wh)
            discharge_wh = stats_metrics.get("discharge_wh", discharge_wh)
            if battery_start is None:
                battery_start = stats_metrics.get("battery_start_kwh")
            if battery_end is None:
                battery_end = stats_metrics.get("battery_end_kwh")
    return charge_wh, discharge_wh, battery_start, battery_end


async def _load_month_metrics(
    hass: Any, box_id: str, year: int, month: int
) -> Optional[Dict[str, Any]]:
    """Compute efficiency metrics for a closed month using history snapshots."""
    try:
        from homeassistant.components.recorder.history import get_significant_states
    except ImportError:
        _LOGGER.warning("Recorder component not available")
        return None

    def _get_history(
        start_time: datetime,
        end_time: datetime,
        entity_ids: list[str],
    ) -> dict:
        """Compat wrapper to avoid passing deprecated filters argument."""
        params = inspect.signature(get_significant_states).parameters
        kwargs: dict[str, Any] = {}
        if "entity_ids" in params:
            kwargs["entity_ids"] = entity_ids
        if "filters" in params:
            kwargs["filters"] = None
        if "minimal_response" in params:
            kwargs["minimal_response"] = True
        if "compressed_state_format" in params:
            kwargs["compressed_state_format"] = False
        return get_significant_states(hass, start_time, end_time, **kwargs)

    start_local, end_local = _month_range_local(year, month)
    start_utc = dt_util.as_utc(start_local)
    end_utc = dt_util.as_utc(end_local)

    charge_sensor, discharge_sensor, battery_sensor = _monthly_sensor_ids(box_id)
    history = await hass.async_add_executor_job(
        _get_history,
        start_utc,
        end_utc,
        [charge_sensor, discharge_sensor, battery_sensor],
    )
    battery_start = await _get_battery_start(
        hass, start_utc, battery_sensor, _get_history
    )
    if not history:  # pragma: no cover
        history = {}

    charge_wh = _history_value(history.get(charge_sensor))
    discharge_wh = _history_value(history.get(discharge_sensor))
    battery_end = _history_value(history.get(battery_sensor))

    charge_wh, discharge_wh, battery_start, battery_end = await _fallback_to_statistics(
        hass,
        start_utc,
        end_utc,
        charge_sensor,
        discharge_sensor,
        battery_sensor,
        charge_wh,
        discharge_wh,
        battery_start,
        battery_end,
    )

    metrics = _compute_metrics_from_wh(
        charge_wh, discharge_wh, battery_start, battery_end
    )
    if not metrics:
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


async def _load_month_metrics_from_statistics(
    hass: Any,
    start_utc: datetime,
    end_utc: datetime,
    charge_sensor: str,
    discharge_sensor: str,
    battery_sensor: str,
) -> Optional[Dict[str, Optional[float]]]:
    try:
        from homeassistant.components.recorder.db_schema import (
            Statistics,
            StatisticsMeta,
        )
        from homeassistant.components.recorder.util import session_scope
    except ImportError:
        _LOGGER.warning("Recorder statistics not available")
        return None

    start_ts = dt_util.as_timestamp(start_utc)
    end_ts = dt_util.as_timestamp(end_utc)
    sensor_ids = {charge_sensor, discharge_sensor, battery_sensor}

    def _query_stats() -> Dict[str, Optional[float]]:
        try:
            with session_scope(hass=hass) as session:
                meta_rows = (
                    session.query(StatisticsMeta.statistic_id, StatisticsMeta.id)
                    .filter(StatisticsMeta.statistic_id.in_(sensor_ids))
                    .all()
                )
                meta_map = {row[0]: row[1] for row in meta_rows}

                def _last_row(stat_id: str) -> Optional[Any]:
                    meta_id = meta_map.get(stat_id)
                    if not meta_id:
                        return None
                    return (
                        session.query(Statistics)
                        .filter(
                            Statistics.metadata_id == meta_id,
                            Statistics.start_ts >= start_ts,
                            Statistics.start_ts < end_ts,
                        )
                        .order_by(Statistics.start_ts.desc())
                        .first()
                    )

                def _first_row(stat_id: str) -> Optional[Any]:
                    meta_id = meta_map.get(stat_id)
                    if not meta_id:
                        return None
                    return (
                        session.query(Statistics)
                        .filter(
                            Statistics.metadata_id == meta_id,
                            Statistics.start_ts >= start_ts,
                            Statistics.start_ts < end_ts,
                        )
                        .order_by(Statistics.start_ts.asc())
                        .first()
                    )

                result = {
                    "charge_wh": _stat_value(_last_row(charge_sensor), True),
                    "discharge_wh": _stat_value(_last_row(discharge_sensor), True),
                    "battery_start_kwh": _stat_value(_first_row(battery_sensor), False),
                    "battery_end_kwh": _stat_value(_last_row(battery_sensor), False),
                }
                _LOGGER.debug(
                    "Efficiency stats lookup %s: charge=%s discharge=%s",
                    start_utc.date(),
                    result["charge_wh"],
                    result["discharge_wh"],
                )
                return result
        except Exception as err:
            _LOGGER.warning("Efficiency stats query failed: %s", err)
            return {}

    stats = await hass.async_add_executor_job(_query_stats)
    if not stats or (
        stats.get("charge_wh") is None and stats.get("discharge_wh") is None
    ):
        return None
    return stats


def _monthly_sensor_ids(box_id: str) -> tuple[str, str, str]:
    charge_sensor = f"sensor.oig_{box_id}_computed_batt_charge_energy_month"
    discharge_sensor = f"sensor.oig_{box_id}_computed_batt_discharge_energy_month"
    battery_sensor = f"sensor.oig_{box_id}_remaining_usable_capacity"
    return charge_sensor, discharge_sensor, battery_sensor


def _history_value(states: Optional[list[Any]]) -> Optional[float]:
    if not states:
        return None
    last_state = states[-1]
    try:
        return float(last_state.state)
    except (ValueError, TypeError):
        return None


def _stat_value(
    item: Dict[str, Any], prefer_sum: bool
) -> Optional[float]:  # pragma: no cover
    keys = ("sum", "state", "max", "mean") if prefer_sum else ("state", "mean", "max")
    for key in keys:
        if isinstance(item, dict):
            value = item.get(key)
        else:
            value = getattr(item, key, None)
        if value is None:
            continue
        try:
            return float(value)
        except (ValueError, TypeError):
            continue
    return None


def _compute_metrics_from_wh(
    charge_wh: Optional[float],
    discharge_wh: Optional[float],
    battery_start_kwh: Optional[float],
    battery_end_kwh: Optional[float],
) -> Optional[Dict[str, float]]:
    if charge_wh is None or discharge_wh is None:
        return None

    charge_kwh = charge_wh / 1000
    discharge_kwh = discharge_wh / 1000
    if charge_kwh <= 0 or discharge_kwh <= 0:
        return None

    delta_kwh = None
    effective_discharge = discharge_kwh
    if battery_start_kwh is not None and battery_end_kwh is not None:
        delta_kwh = battery_end_kwh - battery_start_kwh
        effective_discharge = discharge_kwh - delta_kwh
        if effective_discharge <= 0:
            effective_discharge = discharge_kwh
            delta_kwh = None

    efficiency_raw = (effective_discharge / charge_kwh) * 100
    efficiency = min(efficiency_raw, 100.0)
    losses_kwh = max(charge_kwh - effective_discharge, 0.0)
    losses_pct = max(100.0 - efficiency, 0.0)
    return {
        "efficiency_pct": round(efficiency, 1),
        "losses_kwh": round(losses_kwh, 2),
        "losses_pct": round(losses_pct, 1),
        "charge_kwh": round(charge_kwh, 2),
        "discharge_kwh": round(discharge_kwh, 2),
        "effective_discharge_kwh": round(effective_discharge, 2),
        "delta_kwh": round(delta_kwh, 2) if delta_kwh is not None else None,
        "battery_start_kwh": (
            round(battery_start_kwh, 2) if battery_start_kwh is not None else None
        ),
        "battery_end_kwh": (
            round(battery_end_kwh, 2) if battery_end_kwh is not None else None
        ),
    }


def _empty_metrics(
    charge_wh: Optional[float],
    discharge_wh: Optional[float],
    battery_start_kwh: Optional[float],
    battery_end_kwh: Optional[float],
) -> Dict[str, Optional[float]]:
    charge_kwh = round(charge_wh / 1000, 2) if charge_wh is not None else None
    discharge_kwh = round(discharge_wh / 1000, 2) if discharge_wh is not None else None
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
    delta_kwh = metrics.get("delta_kwh")
    delta_label = f"{delta_kwh:.2f}" if delta_kwh is not None else "n/a"
    _LOGGER.info(
        "Loaded %s/%s from history: efficiency=%.1f%%, charge=%.2f kWh, "
        "discharge=%.2f kWh, delta=%s kWh",
        last_month,
        last_month_year,
        metrics["efficiency_pct"],
        metrics["charge_kwh"],
        metrics["discharge_kwh"],
        delta_label,
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
