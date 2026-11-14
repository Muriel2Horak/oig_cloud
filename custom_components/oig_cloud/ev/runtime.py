"""The car on a live install: its entities, its learned profile, its last plan.

The planner itself runs inside the battery forecast cycle
(``battery_forecast.planning.flex_loads``); this object only supplies what the
car looks like right now (``build_request``) and keeps the plan the cycle
produced for the sensor.

The profile reads hourly statistics, which is database work: it runs as a
background task after setup and then once a day, never inside an entity's
``async_added_to_hass`` (see the start-up performance rule).
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Mapping, Optional

from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from ..const import (
    CONF_EV_CAPACITY_KWH,
    CONF_EV_CHARGE_LIMIT_ENTITY,
    CONF_EV_CHARGE_LIMIT_PCT,
    CONF_EV_CHARGER_POWER_ENTITY,
    CONF_EV_MAX_POWER_KW,
    CONF_EV_MIN_POWER_KW,
    CONF_EV_PHASES,
    CONF_EV_PLUGGED_ENTITY,
    CONF_EV_SOC_ENTITY,
    DEFAULT_EV_CAPACITY_KWH,
    DEFAULT_EV_CHARGE_LIMIT_PCT,
    DEFAULT_EV_MAX_POWER_KW,
    DEFAULT_EV_MIN_POWER_KW,
    DEFAULT_EV_PHASES,
    SIGNAL_EV_PLAN_UPDATED,
)
from ..shared.background import start_background
from .planner import EvPlan
from .profile import EvProfile, HourlySoc, NextNeed, build_ev_profile, estimate_capacity_kwh, next_need

_LOGGER = logging.getLogger(__name__)

# Eight weeks: long enough for every weekday to have several samples, short
# enough to follow a change of routine (the reference car's autumn use is
# half of its spring use).
PROFILE_HISTORY_DAYS = 56
PROFILE_REFRESH = timedelta(hours=24)
# A charger hour below this mean power did not really charge.
CHARGING_HOUR_MIN_KW = 0.3
_PLUGGED_STATES = {"on", "true", "connected", "plugged", "plugged_in", "home", "charging"}


def _float_state(hass: Any, entity_id: Optional[str]) -> Optional[float]:
    if not entity_id:
        return None
    state = hass.states.get(entity_id)
    if state is None:
        return None
    try:
        value = float(state.state)
    except (TypeError, ValueError):
        return None
    return value if value == value else None  # NaN guard


def _row_start(row: Mapping[str, Any]) -> Optional[datetime]:
    start = row.get("start")
    if isinstance(start, datetime):
        return dt_util.as_local(start)
    if isinstance(start, (int, float)):
        # Recorder returns seconds; the websocket API milliseconds.
        seconds = start / 1000.0 if start > 1e11 else float(start)
        return dt_util.as_local(dt_util.utc_from_timestamp(seconds))
    return None


def soc_rows_from_statistics(rows: Iterable[Mapping[str, Any]]) -> List[HourlySoc]:
    result: List[HourlySoc] = []
    for row in rows or []:
        start = _row_start(row)
        low, high = row.get("min"), row.get("max")
        if start is None or low is None or high is None:
            continue
        result.append(HourlySoc(start=start, min_pct=float(low), max_pct=float(high)))
    return result


def charge_kw_from_statistics(
    rows: Iterable[Mapping[str, Any]], *, unit: Optional[str]
) -> Dict[datetime, float]:
    scale = 0.001 if (unit or "").strip() == "W" else 1.0
    result: Dict[datetime, float] = {}
    for row in rows or []:
        start = _row_start(row)
        mean = row.get("mean")
        if start is None or mean is None:
            continue
        result[start] = float(mean) * scale
    return result


async def async_fetch_hourly_statistics(
    hass: Any, statistic_ids: set[str], start: datetime, end: datetime
) -> Mapping[str, List[Any]]:
    from homeassistant.components.recorder import get_instance
    from homeassistant.components.recorder.statistics import statistics_during_period

    def _read() -> Mapping[str, List[Any]]:
        return statistics_during_period(
            hass, start, end, statistic_ids, "hour", None, {"min", "max", "mean"}
        )

    return await get_instance(hass).async_add_executor_job(_read)


class EvRuntime:
    def __init__(self, hass: Any, entry_id: str, options: Mapping[str, Any]) -> None:
        self.hass = hass
        self.entry_id = entry_id
        self.options = dict(options)
        self.profile: Optional[EvProfile] = None
        self.learned_capacity_kwh: Optional[float] = None
        self.profile_updated_at: Optional[datetime] = None
        self.last_plan: Optional[EvPlan] = None
        self.last_need: Optional[NextNeed] = None
        self.last_request_issue: Optional[str] = None
        self._unsub: Any = None

    # ── lifecycle ────────────────────────────────────────────────────────
    async def async_start(self) -> None:
        start_background(self.hass, self.async_refresh_profile(), name="oig_cloud_ev_profile")
        self._unsub = async_track_time_interval(
            self.hass, self._async_periodic_refresh, PROFILE_REFRESH
        )

    async def async_stop(self) -> None:
        if self._unsub is not None:
            self._unsub()
            self._unsub = None

    async def _async_periodic_refresh(self, _now: Any = None) -> None:
        await self.async_refresh_profile()

    # ── profile ──────────────────────────────────────────────────────────
    async def async_refresh_profile(self, now: Optional[datetime] = None) -> None:
        soc_entity = self.options.get(CONF_EV_SOC_ENTITY)
        if not soc_entity:
            return
        now = now or dt_util.now()
        charger_entity = self.options.get(CONF_EV_CHARGER_POWER_ENTITY) or None
        ids = {soc_entity} | ({charger_entity} if charger_entity else set())
        try:
            stats = await async_fetch_hourly_statistics(
                self.hass, ids, now - timedelta(days=PROFILE_HISTORY_DAYS), now
            )
        except Exception as err:  # recorder missing or busy: keep the old profile
            _LOGGER.warning("EV profile: statistics not readable: %s", err)
            return
        rows = soc_rows_from_statistics(stats.get(soc_entity, []))
        charge_kw: Dict[datetime, float] = {}
        if charger_entity:
            state = self.hass.states.get(charger_entity)
            unit = state.attributes.get("unit_of_measurement") if state is not None else None
            charge_kw = charge_kw_from_statistics(stats.get(charger_entity, []), unit=unit)
        charging_hours = {h for h, kw in charge_kw.items() if kw > CHARGING_HOUR_MIN_KW}
        self.profile = build_ev_profile(rows, charging_hours=charging_hours)
        self.learned_capacity_kwh = estimate_capacity_kwh(rows, charge_kw) if charge_kw else None
        self.profile_updated_at = now
        _LOGGER.info(
            "EV profile rebuilt from %d hourly rows (%d days), capacity %s kWh",
            len(rows),
            self.profile.total_samples,
            None if self.learned_capacity_kwh is None else round(self.learned_capacity_kwh, 1),
        )

    def capacity_kwh(self) -> Optional[float]:
        configured = float(self.options.get(CONF_EV_CAPACITY_KWH, DEFAULT_EV_CAPACITY_KWH) or 0.0)
        if configured > 0:
            return configured
        return self.learned_capacity_kwh

    # ── what the car looks like now ──────────────────────────────────────
    def build_request(self, now: Optional[datetime] = None) -> Any:
        """An ``EvRequest`` for the coordinator, or None when the car is unknown."""
        from ..battery_forecast.planning.flex_loads import EvRequest

        now = now or dt_util.now()
        soc = _float_state(self.hass, self.options.get(CONF_EV_SOC_ENTITY))
        if soc is None:
            self.last_request_issue = "soc_unavailable"
            return None
        capacity = self.capacity_kwh()
        if not capacity:
            self.last_request_issue = "capacity_unknown"
            return None
        plugged_entity = self.options.get(CONF_EV_PLUGGED_ENTITY)
        plugged = True
        if plugged_entity:
            state = self.hass.states.get(plugged_entity)
            plugged = state is not None and str(state.state).lower() in _PLUGGED_STATES
        limit = _float_state(self.hass, self.options.get(CONF_EV_CHARGE_LIMIT_ENTITY))
        if limit is None or not 0 < limit <= 100:
            limit = float(self.options.get(CONF_EV_CHARGE_LIMIT_PCT, DEFAULT_EV_CHARGE_LIMIT_PCT))
        need = next_need(self.profile, now) if self.profile and self.profile.total_samples else None
        self.last_need = need
        self.last_request_issue = None
        return EvRequest(
            soc_pct=soc,
            capacity_kwh=float(capacity),
            charge_limit_pct=limit,
            max_power_kw=float(self.options.get(CONF_EV_MAX_POWER_KW, DEFAULT_EV_MAX_POWER_KW)),
            min_power_kw=float(self.options.get(CONF_EV_MIN_POWER_KW, DEFAULT_EV_MIN_POWER_KW)),
            need=need,
            plugged_in=plugged,
            phases=int(self.options.get(CONF_EV_PHASES, DEFAULT_EV_PHASES)),
        )

    def publish(self, plan: Optional[EvPlan]) -> None:
        self.last_plan = plan
        async_dispatcher_send(self.hass, SIGNAL_EV_PLAN_UPDATED.format(entry_id=self.entry_id))

    def as_dict(self) -> Dict[str, Any]:
        need = self.last_need
        return {
            "plan": self.last_plan.as_dict() if self.last_plan else None,
            "next_departure": need.deadline.isoformat() if need else None,
            "need_pct": round(need.need_pct, 1) if need else None,
            "capacity_kwh": None if self.capacity_kwh() is None else round(float(self.capacity_kwh() or 0), 1),
            "profile": self.profile.as_dict() if self.profile else None,
            "profile_updated_at": (
                self.profile_updated_at.isoformat() if self.profile_updated_at else None
            ),
            "issue": self.last_request_issue,
        }


def get_ev_runtime(hass: Any, entry_id: str) -> Optional[EvRuntime]:
    from ..const import DOMAIN, KEY_EV_RUNTIME

    entry_data = (getattr(hass, "data", {}) or {}).get(DOMAIN, {}).get(entry_id, {})
    runtime = entry_data.get(KEY_EV_RUNTIME) if isinstance(entry_data, dict) else None
    return runtime if isinstance(runtime, EvRuntime) else None
