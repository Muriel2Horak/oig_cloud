"""Planner recommended mode sensor extracted from legacy battery forecast."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from ...const import DOMAIN

_LOGGER = logging.getLogger(__name__)
HOME_1_LABEL = "Home 1"
HOME_2_LABEL = "Home 2"
HOME_3_LABEL = "Home 3"
MIN_RECOMMENDED_INTERVAL_MINUTES = 30
MODE_LABEL_HOME_UPS = "Home UPS"


def _normalize_mode_from_name(mode_name: Optional[str]) -> Optional[str]:
    if not mode_name:
        return None
    stripped = str(mode_name).strip()
    upper = stripped.upper()
    label_map = {
        "HOME I": HOME_1_LABEL,
        "HOME II": HOME_2_LABEL,
        "HOME III": HOME_3_LABEL,
        "HOME UPS": MODE_LABEL_HOME_UPS,
    }
    if stripped in label_map.values():
        return stripped
    if upper in label_map:
        return label_map[upper]
    if upper.startswith("HOME "):
        suffix = upper.replace("HOME ", "").strip()
        digit_map = {
            "1": HOME_1_LABEL,
            "2": HOME_2_LABEL,
            "3": HOME_3_LABEL,
        }
        if suffix in digit_map:
            return digit_map[suffix]
    for key, label in label_map.items():
        if key in upper:
            return label  # pragma: no cover
    if "UPS" in upper:
        return MODE_LABEL_HOME_UPS  # pragma: no cover
    return None


def _normalize_mode_from_code(mode_code: Optional[int]) -> Optional[str]:
    if not isinstance(mode_code, int):
        return None
    code_map = {
        0: HOME_1_LABEL,
        1: HOME_2_LABEL,
        2: HOME_3_LABEL,
        3: MODE_LABEL_HOME_UPS,
    }
    return code_map.get(mode_code)


def _build_precomputed_payload(precomputed: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    timeline = precomputed.get("timeline") or precomputed.get("timeline_hybrid")
    if not isinstance(timeline, list) or not timeline:
        return None
    detail_tabs = precomputed.get("detail_tabs") or precomputed.get("detail_tabs_hybrid")
    return {
        "timeline_data": timeline,
        "calculation_time": precomputed.get("last_update"),
        "detail_tabs": detail_tabs if isinstance(detail_tabs, dict) else None,
    }


class OigCloudPlannerRecommendedModeSensor(
    RestoreEntity, CoordinatorEntity, SensorEntity
):
    """Text sensor exposing the planner's recommended mode for the current interval."""

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: Dict[str, Any],
        hass: Optional[HomeAssistant] = None,
    ) -> None:
        super().__init__(coordinator)
        self._sensor_type = sensor_type
        self._config_entry = config_entry
        self._hass: Optional[HomeAssistant] = hass or getattr(coordinator, "hass", None)
        self._attr_device_info = device_info

        from ...sensor_types import SENSOR_TYPES

        self._config = SENSOR_TYPES.get(sensor_type, {})

        try:
            from ...entities.base_sensor import resolve_box_id

            self._box_id = resolve_box_id(coordinator)
        except Exception:
            self._box_id = "unknown"

        self._precomputed_store: Optional[Store] = None
        self._precomputed_payload: Optional[Dict[str, Any]] = None
        if self._hass:
            self._precomputed_store = Store(
                self._hass,
                version=1,
                key=f"oig_cloud.precomputed_data_{self._box_id}",
            )

        self._attr_unique_id = f"oig_cloud_{self._box_id}_{sensor_type}"
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"

        name_cs = self._config.get("name_cs")
        name_en = self._config.get("name")
        self._attr_name = name_cs or name_en or sensor_type
        self._attr_icon = self._config.get("icon", "mdi:robot")
        self._attr_native_unit_of_measurement = None
        self._attr_device_class = None
        self._attr_state_class = None

        entity_category = self._config.get("entity_category")
        if entity_category:
            self._attr_entity_category = EntityCategory(entity_category)

        self._attr_native_value: Optional[str] = None
        self._attr_extra_state_attributes: Dict[str, Any] = {}
        self._last_signature: Optional[str] = None
        self._unsubs: list[callable] = []

    async def _async_refresh_precomputed_payload(self) -> None:
        precomputed = await self._load_precomputed()
        if not precomputed:
            return
        payload = _build_precomputed_payload(precomputed)
        if payload:
            self._precomputed_payload = payload

    async def _load_precomputed(self) -> Optional[Dict[str, Any]]:
        if not self._precomputed_store:
            return None
        try:
            precomputed = await self._precomputed_store.async_load()
        except Exception:
            return None
        if not isinstance(precomputed, dict):
            return None
        return precomputed

    def _get_forecast_payload(self) -> Optional[Dict[str, Any]]:
        # Prefer precomputed payload to stay aligned with detail_tabs output.
        if isinstance(self._precomputed_payload, dict):
            return self._precomputed_payload
        data = getattr(self.coordinator, "battery_forecast_data", None)
        if isinstance(data, dict) and isinstance(data.get("timeline_data"), list):
            return data
        return None

    def _parse_local_start(self, ts: Any) -> Optional[datetime]:
        if not ts:
            return None
        try:
            dt_obj = dt_util.parse_datetime(str(ts)) or datetime.fromisoformat(str(ts))
        except Exception:
            return None
        if dt_obj.tzinfo is None:
            return dt_obj.replace(tzinfo=dt_util.DEFAULT_TIME_ZONE)
        return dt_util.as_local(dt_obj)

    def _parse_interval_time(
        self, ts: Any, date_hint: Optional[str] = None
    ) -> Optional[datetime]:
        if not ts:
            return None
        ts_str = str(ts)
        if "T" not in ts_str and date_hint:
            ts_str = f"{date_hint}T{ts_str}:00"
        return self._parse_local_start(ts_str)

    def _normalize_mode_label(
        self, mode_name: Optional[str], mode_code: Optional[int]
    ) -> Optional[str]:
        label = _normalize_mode_from_name(mode_name)
        if label:
            return label
        return _normalize_mode_from_code(mode_code)

    def _planned_mode_from_interval(
        self, interval: Dict[str, Any]
    ) -> tuple[Optional[str], Optional[int]]:
        planned = interval.get("planned") or {}
        mode_label = self._normalize_mode_label(
            planned.get("mode_name"), planned.get("mode")
        )
        mode_code = planned.get("mode") if isinstance(planned.get("mode"), int) else None
        return mode_label, mode_code

    def _mode_from_interval(
        self, interval: Dict[str, Any]
    ) -> tuple[Optional[str], Optional[int]]:
        mode_label = self._normalize_mode_label(
            interval.get("mode_name"), interval.get("mode")
        )
        mode_code = interval.get("mode") if isinstance(interval.get("mode"), int) else None
        return mode_label, mode_code

    def _parse_interval_start(
        self, item: Dict[str, Any], date_hint: Optional[str], *, planned: bool
    ) -> Optional[datetime]:
        time_value = item.get("time") or item.get("timestamp")
        if planned:
            return self._parse_interval_time(time_value, date_hint)
        return self._parse_local_start(time_value)

    def _find_current_interval(
        self,
        intervals: list[Dict[str, Any]],
        now: datetime,
        date_hint: Optional[str],
        *,
        planned: bool,
    ) -> tuple[Optional[int], Optional[datetime], Optional[str], Optional[int]]:
        current_idx: Optional[int] = None
        current_mode: Optional[str] = None
        current_mode_code: Optional[int] = None
        current_start: Optional[datetime] = None

        for i, item in enumerate(intervals):
            start = self._parse_interval_start(item, date_hint, planned=planned)
            if not start:
                continue

            mode_label, mode_code = self._interval_mode(item, planned=planned)
            if planned and not mode_label:
                continue

            match, current_idx, current_start, current_mode, current_mode_code = (
                self._update_current_candidate(
                    now=now,
                    index=i,
                    start=start,
                    mode_label=mode_label,
                    mode_code=mode_code,
                    current_idx=current_idx,
                    current_start=current_start,
                    current_mode=current_mode,
                    current_mode_code=current_mode_code,
                )
            )
            if match:
                return current_idx, current_start, current_mode, current_mode_code
            if start > now and current_idx is not None:
                break

        return current_idx, current_start, current_mode, current_mode_code

    def _interval_mode(
        self, item: Dict[str, Any], *, planned: bool
    ) -> tuple[Optional[str], Optional[int]]:
        return (
            self._planned_mode_from_interval(item)
            if planned
            else self._mode_from_interval(item)
        )

    def _update_current_candidate(
        self,
        *,
        now: datetime,
        index: int,
        start: datetime,
        mode_label: Optional[str],
        mode_code: Optional[int],
        current_idx: Optional[int],
        current_start: Optional[datetime],
        current_mode: Optional[str],
        current_mode_code: Optional[int],
    ) -> tuple[
        bool,
        Optional[int],
        Optional[datetime],
        Optional[str],
        Optional[int],
    ]:
        end = start + timedelta(minutes=15)
        if start <= now < end:
            return True, index, start, mode_label, mode_code
        if start <= now:
            return False, index, start, mode_label, mode_code
        return False, current_idx, current_start, current_mode, current_mode_code

    def _find_next_change(
        self,
        intervals: list[Dict[str, Any]],
        current_idx: int,
        current_mode: str,
        current_start: datetime,
        date_hint: Optional[str],
        *,
        planned: bool,
    ) -> tuple[Optional[datetime], Optional[str], Optional[int]]:
        for item in intervals[current_idx + 1 :]:
            start = self._parse_interval_start(item, date_hint, planned=planned)
            if not start:
                continue
            if not self._interval_after_min_gap(start, current_start):
                continue
            mode_label, mode_code = (
                self._planned_mode_from_interval(item)
                if planned
                else self._mode_from_interval(item)
            )
            if mode_label and mode_label != current_mode:
                return start, mode_label, mode_code
        return None, None, None

    @staticmethod
    def _interval_after_min_gap(start: datetime, current_start: datetime) -> bool:
        return start >= current_start + timedelta(minutes=MIN_RECOMMENDED_INTERVAL_MINUTES)

    def _get_auto_switch_lead_seconds(
        self, from_mode: Optional[str], to_mode: Optional[str]
    ) -> float:
        fallback = 180.0
        if self._config_entry and self._config_entry.options:
            fallback = float(
                self._config_entry.options.get(
                    "auto_mode_switch_lead_seconds",
                    self._config_entry.options.get(
                        "autonomy_switch_lead_seconds", 180.0
                    ),
                )
            )
        if not from_mode or not to_mode or not self._hass or not self._config_entry:
            return fallback
        try:
            entry = self._hass.data.get(DOMAIN, {}).get(self._config_entry.entry_id, {})
            service_shield = entry.get("service_shield")
            mode_tracker = getattr(service_shield, "mode_tracker", None)
            if not mode_tracker:
                return fallback
            offset_seconds = mode_tracker.get_offset_for_scenario(from_mode, to_mode)
            if offset_seconds is None or offset_seconds <= 0:
                return fallback
            return float(offset_seconds)
        except Exception:
            return fallback

    def _compute_state_and_attrs(self) -> tuple[Optional[str], Dict[str, Any], str]:
        """Compute recommended mode + attributes and return signature for change detection."""
        attrs: Dict[str, Any] = {}
        payload = self._get_forecast_payload() or {}
        detail_intervals, detail_date, timeline = self._extract_payload_intervals(payload)
        attrs["last_update"] = payload.get("calculation_time")

        source_intervals, planned_detail = self._resolve_source_intervals(
            detail_intervals, timeline
        )
        attrs["points_count"] = (
            len(source_intervals) if isinstance(source_intervals, list) else 0
        )

        if not isinstance(source_intervals, list) or not source_intervals:
            sig = json.dumps({"v": None, "a": attrs}, sort_keys=True, default=str)
            return None, attrs, sig

        now = dt_util.now()
        current_idx, current_start, current_mode, current_mode_code = (
            self._resolve_current_interval(
                source_intervals=source_intervals,
                detail_intervals=detail_intervals or [],
                detail_date=detail_date,
                now=now,
                planned_detail=planned_detail,
                timeline=timeline,
            )
        )

        attrs["recommended_interval_start"] = (
            current_start.isoformat() if isinstance(current_start, datetime) else None
        )

        next_change_at, next_mode, next_mode_code = self._compute_next_change(
            source_intervals=source_intervals,
            detail_intervals=detail_intervals or [],
            detail_date=detail_date,
            planned_detail=planned_detail,
            current_idx=current_idx,
            current_mode=current_mode,
            current_start=current_start,
        )

        attrs["next_mode_change_at"] = (
            next_change_at.isoformat() if next_change_at else None
        )
        attrs["next_mode"] = next_mode
        attrs["next_mode_code"] = next_mode_code

        effective_mode = current_mode
        effective_mode_code = current_mode_code
        lead_seconds: Optional[float] = 0.0
        effective_from: Optional[datetime] = None
        if next_change_at and next_mode and current_mode:
            lead_seconds = self._get_auto_switch_lead_seconds(current_mode, next_mode)
            if lead_seconds and lead_seconds > 0:
                effective_from = next_change_at - timedelta(seconds=lead_seconds)
            else:
                lead_seconds = 0.0

        attrs["planned_interval_mode"] = current_mode
        attrs["planned_interval_mode_code"] = current_mode_code
        attrs["recommended_mode"] = effective_mode
        attrs["recommended_mode_code"] = effective_mode_code
        attrs["recommended_effective_from"] = (
            effective_from.isoformat() if effective_from else None
        )
        attrs["auto_switch_lead_seconds"] = lead_seconds

        sig = self._build_signature(
            effective_mode,
            effective_mode_code,
            current_mode,
            current_mode_code,
            attrs,
            next_mode,
            next_mode_code,
            lead_seconds,
        )
        return effective_mode, attrs, sig

    def _compute_next_change(
        self,
        *,
        source_intervals: list[Dict[str, Any]],
        detail_intervals: list[Dict[str, Any]],
        detail_date: Optional[str],
        planned_detail: bool,
        current_idx: Optional[int],
        current_mode: Optional[str],
        current_start: Optional[datetime],
    ) -> tuple[Optional[datetime], Optional[str], Optional[int]]:
        if (
            current_idx is None
            or not current_mode
            or not isinstance(current_start, datetime)
        ):
            return None, None, None  # pragma: no cover

        return self._resolve_next_change(
            source_intervals=source_intervals,
            detail_intervals=detail_intervals,
            detail_date=detail_date,
            planned_detail=planned_detail,
            current_idx=current_idx,
            current_mode=current_mode,
            current_start=current_start,
        )

    def _build_signature(
        self,
        effective_mode: Optional[str],
        effective_mode_code: Optional[int],
        current_mode: Optional[str],
        current_mode_code: Optional[int],
        attrs: Dict[str, Any],
        next_mode: Optional[str],
        next_mode_code: Optional[int],
        lead_seconds: Optional[float],
    ) -> str:
        payload = {
            "v": effective_mode,
            "c": effective_mode_code,
            "cv": current_mode,
            "cc": current_mode_code,
            "s": attrs.get("recommended_interval_start"),
            "n": attrs.get("next_mode_change_at"),
            "nv": next_mode,
            "nc": next_mode_code,
            "ef": attrs.get("recommended_effective_from"),
            "ls": lead_seconds,
            "lu": attrs.get("last_update"),
            "pc": attrs.get("points_count"),
        }
        return json.dumps(payload, sort_keys=True, default=str)

    def _extract_payload_intervals(
        self, payload: Dict[str, Any]
    ) -> tuple[Optional[list[Dict[str, Any]]], Optional[str], Any]:
        detail_tabs = (
            payload.get("detail_tabs")
            if isinstance(payload.get("detail_tabs"), dict)
            else None
        )
        timeline = payload.get("timeline_data")
        detail_intervals: Optional[list[Dict[str, Any]]] = None
        detail_date: Optional[str] = None
        if isinstance(detail_tabs, dict):
            today_tab = detail_tabs.get("today") or {}
            if isinstance(today_tab, dict):
                detail_intervals = today_tab.get("intervals")
                detail_date = today_tab.get("date")
        return detail_intervals, detail_date, timeline

    def _resolve_source_intervals(
        self,
        detail_intervals: Optional[list[Dict[str, Any]]],
        timeline: Any,
    ) -> tuple[Any, bool]:
        planned_detail = bool(detail_intervals and isinstance(detail_intervals, list))
        if planned_detail:
            return detail_intervals, True
        return timeline, False

    def _resolve_current_interval(
        self,
        *,
        source_intervals: list[Dict[str, Any]],
        detail_intervals: list[Dict[str, Any]],
        detail_date: Optional[str],
        now: datetime,
        planned_detail: bool,
        timeline: Any,
    ) -> tuple[Optional[int], Optional[datetime], Optional[str], Optional[int]]:
        if planned_detail:
            current_idx, current_start, current_mode, current_mode_code = (
                self._find_current_interval(
                    detail_intervals,
                    now,
                    detail_date,
                    planned=True,
                )
            )
            if current_mode is None and isinstance(timeline, list):
                return self._find_current_interval(
                    timeline,
                    now,
                    detail_date,
                    planned=False,
                )
            return current_idx, current_start, current_mode, current_mode_code

        return self._find_current_interval(
            source_intervals,
            now,
            None,
            planned=False,
        )

    def _resolve_next_change(
        self,
        *,
        source_intervals: list[Dict[str, Any]],
        detail_intervals: list[Dict[str, Any]],
        detail_date: Optional[str],
        planned_detail: bool,
        current_idx: int,
        current_mode: str,
        current_start: datetime,
    ) -> tuple[Optional[datetime], Optional[str], Optional[int]]:
        if planned_detail:
            return self._find_next_change(
                detail_intervals,
                current_idx,
                current_mode,
                current_start,
                detail_date,
                planned=True,
            )

        return self._find_next_change(
            source_intervals,
            current_idx,
            current_mode,
            current_start,
            None,
            planned=False,
        )

    async def _async_recompute(self) -> None:
        try:
            await self._async_refresh_precomputed_payload()
            value, attrs, sig = self._compute_state_and_attrs()
            if sig == self._last_signature:
                return
            self._last_signature = sig
            self._attr_native_value = value
            self._attr_extra_state_attributes = attrs
            if self.hass:
                self.async_write_ha_state()
        except Exception:
            return

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if not self._precomputed_store and self.hass:
            self._precomputed_store = Store(
                self.hass,
                version=1,
                key=f"oig_cloud.precomputed_data_{self._box_id}",
            )

        from homeassistant.helpers.dispatcher import async_dispatcher_connect
        from homeassistant.helpers.event import async_track_time_change

        signal_name = f"oig_cloud_{self._box_id}_forecast_updated"

        async def _on_forecast_updated() -> None:
            await asyncio.sleep(0)
            await self._async_recompute()

        try:
            self._unsubs.append(
                async_dispatcher_connect(self.hass, signal_name, _on_forecast_updated)
            )
        except Exception:  # nosec B110
            pass

        async def _on_tick(_now: datetime) -> None:
            await asyncio.sleep(0)
            self.hass.async_create_task(self._async_recompute())

        try:
            for minute in [0, 15, 30, 45]:
                self._unsubs.append(
                    async_track_time_change(
                        self.hass, _on_tick, minute=minute, second=2
                    )
                )
        except Exception:  # nosec B110
            pass

        await self._async_recompute()

    async def async_will_remove_from_hass(self) -> None:
        for unsub in getattr(self, "_unsubs", []) or []:
            try:
                unsub()
            except Exception:  # nosec B110
                pass
        self._unsubs = []
        await super().async_will_remove_from_hass()

    @property
    def available(self) -> bool:
        return bool(self._attr_extra_state_attributes.get("points_count"))

    @property
    def native_value(self) -> Optional[str]:
        return self._attr_native_value

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        return dict(self._attr_extra_state_attributes)

    def _handle_coordinator_update(self) -> None:
        return
