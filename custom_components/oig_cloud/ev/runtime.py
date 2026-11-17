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
import math
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional

from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from ..const import (
    CONF_EV_CAPACITY_KWH,
    CONF_EV_CHARGE_LIMIT_ENTITY,
    CONF_EV_CHARGE_LIMIT_PCT,
    CONF_EV_CHARGER_POWER_ENTITY,
    CONF_EV_HOLIDAYS,
    CONF_EV_MAX_POWER_KW,
    CONF_EV_MIN_POWER_KW,
    CONF_EV_PHASES,
    CONF_EV_PLUGGED_ENTITY,
    CONF_EV_SOC_ENTITY,
    CONF_EV_RAISE_LIMIT_FOR_TRIP,
    CONF_EV_SET_CAR_LIMIT,
    CONF_EV_TARGET_LIMIT_PCT,
    CONF_EV_TARGET_MODE,
    CONF_EV_TRIP_DEPARTURE,
    DEFAULT_EV_CAPACITY_KWH,
    DEFAULT_EV_CHARGE_LIMIT_PCT,
    DEFAULT_EV_MAX_POWER_KW,
    DEFAULT_EV_MIN_POWER_KW,
    DEFAULT_EV_PHASES,
    DEFAULT_EV_HOLIDAYS,
    DEFAULT_EV_RAISE_LIMIT_FOR_TRIP,
    DEFAULT_EV_SET_CAR_LIMIT,
    DEFAULT_EV_TARGET_LIMIT_PCT,
    DEFAULT_EV_TARGET_MODE,
    DEFAULT_EV_TRIP_DEPARTURE,
    SIGNAL_EV_PLAN_UPDATED,
)
from ..shared.background import start_background
from .calendar import (
    DayOverride,
    EvCalendarData,
    EvDay,
    _parse_time,
    need_for,
    next_departure_day,
    upcoming_days,
)
from .charge_override import MODE_NOW, ChargeOverride, make_override, override_need
from .planner import EvPlan
from .profile import EvProfile, HourlySoc, NextNeed, build_ev_profile, estimate_capacity_kwh

_LOGGER = logging.getLogger(__name__)

# Twelve weeks: backtest 5-11/2026 on the reference car, departures earlier
# than planned 19/103 drive days with 12 weeks against 26 with 8 and 35 with
# 4 (the shorter windows follow noise, not a change of routine).
PROFILE_HISTORY_DAYS = 84
PROFILE_REFRESH = timedelta(hours=24)
# A charger hour below this mean power did not really charge.
CHARGING_HOUR_MIN_KW = 0.3
_PLUGGED_STATES = {"on", "true", "connected", "plugged", "plugged_in", "home", "charging"}
STORE_VERSION = 1


def _make_store(hass: Any, entry_id: str) -> Any:
    from homeassistant.helpers.storage import Store

    return Store(hass, STORE_VERSION, f"oig_cloud.ev_{entry_id}")


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
    return None if math.isnan(value) else value


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
        self.calendar = EvCalendarData()
        self.charge_override: Optional[ChargeOverride] = None
        self.next_day: Optional[EvDay] = None
        self.last_plugged: Optional[bool] = None
        # Set by the forecast cycle: asks it to plan again soon.
        self.request_replan: Optional[Callable[[], None]] = None
        # Controller state that must survive a restart (the limit to restore).
        self.control_state: Dict[str, Any] = {}
        self.controller: Any = None
        self._store: Any = None
        self._unsub_plug: Any = None
        self._unsub: Any = None

    # ── lifecycle ────────────────────────────────────────────────────────
    async def async_start(self) -> None:
        from .control import EvController

        start_background(self.hass, self.async_load(), name="oig_cloud_ev_store")
        start_background(self.hass, self.async_refresh_profile(), name="oig_cloud_ev_profile")
        self._unsub = async_track_time_interval(
            self.hass, self._async_periodic_refresh, PROFILE_REFRESH
        )
        self.controller = EvController(self)
        self.controller.start()
        plugged_entity = self.options.get(CONF_EV_PLUGGED_ENTITY)
        if plugged_entity:
            from homeassistant.helpers.event import async_track_state_change_event

            # Plugging in or out changes the plan at once, not at the next slot.
            self._unsub_plug = async_track_state_change_event(
                self.hass, [plugged_entity], self._on_plug_change
            )

    async def async_stop(self) -> None:
        if self._unsub is not None:
            self._unsub()
            self._unsub = None
        if self._unsub_plug is not None:
            self._unsub_plug()
            self._unsub_plug = None
        if self.controller is not None:
            await self.controller.async_stop()
            self.controller = None

    def _on_plug_change(self, _event: Any = None) -> None:
        self._replan()

    async def _async_periodic_refresh(self, _now: Any = None) -> None:
        await self.async_refresh_profile()

    # ── options (live: calendar and control options need no reload) ─────
    def live_options(self) -> Dict[str, Any]:
        entries = getattr(self.hass, "config_entries", None)
        entry = None
        if entries is not None and hasattr(entries, "async_get_entry"):
            try:
                entry = entries.async_get_entry(self.entry_id)
            except Exception:  # pragma: no cover - test doubles
                entry = None
        options = getattr(entry, "options", None)
        merged = dict(self.options)
        if isinstance(options, Mapping):
            merged.update(options)
        return merged

    def _trip_departure(self) -> Any:
        from datetime import time

        raw = self.live_options().get(CONF_EV_TRIP_DEPARTURE, DEFAULT_EV_TRIP_DEPARTURE)
        return _parse_time(raw) or time(7, 0)

    def _holidays(self) -> bool:
        return bool(self.live_options().get(CONF_EV_HOLIDAYS, DEFAULT_EV_HOLIDAYS))

    # ── persistence (calendar + one-off choice) ──────────────────────────
    async def async_load(self, now: Optional[datetime] = None) -> None:
        if self._store is None:
            self._store = _make_store(self.hass, self.entry_id)
        try:
            raw = await self._store.async_load()
        except Exception as err:  # corrupt file: start empty
            _LOGGER.warning("EV calendar not readable: %s", err)
            raw = None
        raw = raw if isinstance(raw, dict) else {}
        self.calendar = EvCalendarData.from_dict(raw.get("calendar"))
        self.charge_override = ChargeOverride.from_dict(raw.get("charge_override"))
        control = raw.get("control")
        self.control_state = dict(control) if isinstance(control, dict) else {}
        self.calendar.prune((now or dt_util.now()).date())

    async def async_save(self) -> None:
        if self._store is None:
            self._store = _make_store(self.hass, self.entry_id)
        data = {
            "calendar": self.calendar.as_dict(),
            "charge_override": self.charge_override.as_dict() if self.charge_override else None,
            "control": dict(self.control_state),
        }
        await self._store.async_save(data)

    def _replan(self) -> None:
        hook = self.request_replan
        if hook is not None:
            try:
                hook()
            except Exception as err:  # never break the caller over a replan
                _LOGGER.debug("EV replan request failed: %s", err)

    async def async_set_charge_mode(
        self, mode: str, *, by: Optional[datetime] = None, now: Optional[datetime] = None
    ) -> Optional[ChargeOverride]:
        now = now or dt_util.now()
        day = self.resolve_next_day(now)
        self.charge_override = make_override(
            mode, now, by=by, departure=day.departure if day else None
        )
        await self.async_save()
        self._replan()
        return self.charge_override

    async def async_set_day(self, day: Any, override: DayOverride) -> None:
        self.calendar.set_day(day, override)
        await self.async_save()
        self._replan()

    async def async_add_vacation(self, start: Any, end: Any) -> bool:
        ok = self.calendar.add_vacation(start, end)
        if ok:
            await self.async_save()
            self._replan()
        return ok

    async def async_remove_vacation(self, start: Any, end: Any) -> None:
        self.calendar.remove_vacation(start, end)
        await self.async_save()
        self._replan()

    # ── calendar ─────────────────────────────────────────────────────────
    def resolve_next_day(self, now: Optional[datetime] = None) -> Optional[EvDay]:
        now = now or dt_util.now()
        if not self.profile or not self.profile.total_samples:
            profile = None
        else:
            profile = self.profile
        return next_departure_day(
            profile,
            now,
            self.calendar,
            trip_departure=self._trip_departure(),
            holidays_enabled=self._holidays(),
        )

    def days(self, now: Optional[datetime] = None, count: int = 14) -> List[EvDay]:
        now = now or dt_util.now()
        return upcoming_days(
            self.profile,
            now,
            self.calendar,
            days=count,
            trip_departure=self._trip_departure(),
            holidays_enabled=self._holidays(),
        )

    def user_target_limit(self) -> float:
        """The user's charge target in %, 0 when the car's own limit applies."""
        try:
            target = float(self.live_options().get(CONF_EV_TARGET_LIMIT_PCT, DEFAULT_EV_TARGET_LIMIT_PCT) or 0)
        except (TypeError, ValueError):
            return 0.0
        return target if 0 < target <= 100 else 0.0

    def set_car_limit(self) -> bool:
        return bool(self.live_options().get(CONF_EV_SET_CAR_LIMIT, DEFAULT_EV_SET_CAR_LIMIT))

    def raise_limit_for_trip(self) -> bool:
        return bool(
            self.live_options().get(CONF_EV_RAISE_LIMIT_FOR_TRIP, DEFAULT_EV_RAISE_LIMIT_FOR_TRIP)
        )

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
        car_limit = _float_state(self.hass, self.options.get(CONF_EV_CHARGE_LIMIT_ENTITY))
        limit = car_limit if car_limit is not None and 0 < car_limit <= 100 else float(
            self.options.get(CONF_EV_CHARGE_LIMIT_PCT, DEFAULT_EV_CHARGE_LIMIT_PCT)
        )
        target = self.user_target_limit()
        if target:
            # The user's target. The car still stops at its own limit unless
            # the integration may write the target into the car.
            known_car_limit = car_limit is not None and 0 < car_limit <= 100
            limit = target if self.set_car_limit() or not known_car_limit else min(target, limit)
        max_power = float(self.options.get(CONF_EV_MAX_POWER_KW, DEFAULT_EV_MAX_POWER_KW))
        target_mode = str(self.options.get(CONF_EV_TARGET_MODE, DEFAULT_EV_TARGET_MODE))

        # Unplugging ends "charge now"; a chosen time that passed ends "charge by".
        override = self.charge_override
        unplugged_now = self.last_plugged is True and not plugged
        if override is not None and (
            not override.active(now) or (override.mode == MODE_NOW and unplugged_now)
        ):
            self.charge_override = override = None
            start_background(self.hass, self.async_save(), name="oig_cloud_ev_store_save")
        self.last_plugged = plugged

        day = self.resolve_next_day(now)
        self.next_day = day
        need: Optional[NextNeed]
        if override is not None:
            need = override_need(
                override, now, soc_pct=soc, limit_pct=limit,
                capacity_kwh=float(capacity), max_power_kw=max_power,
            )
            target_mode = "limit"
        else:
            need = need_for(day)
            if day is not None and day.full_charge:
                # A trip: charge to the limit, or to 100 % when the integration
                # may raise the car's limit for it.
                target_mode = "limit"
                if self.raise_limit_for_trip():
                    limit = 100.0
        self.last_need = need
        self.last_request_issue = None
        return EvRequest(
            soc_pct=soc,
            capacity_kwh=float(capacity),
            charge_limit_pct=limit,
            max_power_kw=max_power,
            min_power_kw=float(self.options.get(CONF_EV_MIN_POWER_KW, DEFAULT_EV_MIN_POWER_KW)),
            need=need,
            plugged_in=plugged,
            phases=int(self.options.get(CONF_EV_PHASES, DEFAULT_EV_PHASES)),
            target_mode=target_mode,
        )

    def publish(self, plan: Optional[EvPlan]) -> None:
        self.last_plan = plan
        async_dispatcher_send(self.hass, SIGNAL_EV_PLAN_UPDATED.format(entry_id=self.entry_id))
        if self.controller is not None:
            start_background(self.hass, self.controller.async_apply(), name="oig_cloud_ev_control")

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
            "next_day": self.next_day.as_dict() if self.next_day else None,
            "charge_override": self.charge_override.as_dict() if self.charge_override else None,
            "vacations": self.calendar.as_dict()["vacations"],
            "control": self.controller.as_dict() if self.controller is not None else None,
        }


def get_ev_runtime(hass: Any, entry_id: str) -> Optional[EvRuntime]:
    from ..const import DOMAIN, KEY_EV_RUNTIME

    entry_data = (getattr(hass, "data", {}) or {}).get(DOMAIN, {}).get(entry_id, {})
    runtime = entry_data.get(KEY_EV_RUNTIME) if isinstance(entry_data, dict) else None
    return runtime if isinstance(runtime, EvRuntime) else None
