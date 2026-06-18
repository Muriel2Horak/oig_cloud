"""Boiler actuator — schedule apply/cancel behind domain boundary."""

from __future__ import annotations

import asyncio
import enum
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Callable, Optional

from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from ..const import (
    CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
    CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    DOMAIN,
)
from .models import EnergySource
from .planner_contract import PlannerReasonCode

_LOGGER = logging.getLogger(__name__)

_STORAGE_VERSION = 1
_STORAGE_KEY = "boiler_schedule"
_SCHEDULE_SCHEMA_VERSION = 2

_MAX_QUEUE_SIZE = 32
_RATE_LIMIT_WINDOW_SECONDS = 300

_OVERRIDE_DEFAULT_TTL_MINUTES = 120
_OVERRIDE_MIN_TTL_MINUTES = 15
_OVERRIDE_MAX_TTL_MINUTES = 1440
_OVERRIDE_TTL_INCREMENT = 15
_OVERRIDE_CANONICAL_REASON_CODES = frozenset({
    PlannerReasonCode.OVERRIDE_ACTIVE.value,
})


class ActuatorCommandType(enum.Enum):
    APPLY = "apply"
    CANCEL = "cancel"
    OVERRIDE_CREATE = "override_create"
    OVERRIDE_CLEAR = "override_clear"
    CONFIG_UPDATE = "config_update"


class ActuatorCommandPriority(enum.Enum):
    REPLAN = 1
    CONFIG = 2
    SAFETY = 3


class SourceIntent(enum.Enum):
    PRIMARY = "primary"
    ALTERNATIVE = "alternative"
    NONE = "none"


class ActuatorSerializerState(enum.Enum):
    IDLE = "idle"
    RUNNING = "running"
    STOPPED = "stopped"
    DEGRADED = "degraded"


@dataclass
class ActuatorCommand:
    entry_id: str
    box_id: str
    command_type: ActuatorCommandType
    plan_version: int
    config_version: int
    priority: ActuatorCommandPriority
    source_intent: SourceIntent
    payload: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=dt_util.now)


class _ActuatorRateLimiter:
    def __init__(self, window_seconds: float = _RATE_LIMIT_WINDOW_SECONDS) -> None:
        self._window = timedelta(seconds=window_seconds)
        self._last: dict[str, tuple[bool, datetime]] = {}

    def can_transition(self, source: str, desired_state: bool, now: datetime | None = None) -> bool:
        if now is None:
            now = dt_util.now()
        last = self._last.get(source)
        if last is None:
            return True
        last_state, last_at = last
        if desired_state == last_state:
            return True
        if now - last_at < self._window:
            return False
        return True

    def record_transition(self, source: str, state: bool, now: datetime | None = None) -> None:
        if now is None:
            now = dt_util.now()
        self._last[source] = (state, now)


class BoilerActuatorSerializer:
    def __init__(
        self,
        entry_id: str,
        box_id: str,
        hass: HomeAssistant | None = None,
        store_factory: Any | None = None,
    ) -> None:
        self.entry_id = entry_id
        self.box_id = box_id
        self._hass = hass
        self._store_factory = store_factory
        self._queue: asyncio.Queue[ActuatorCommand] = asyncio.Queue(maxsize=_MAX_QUEUE_SIZE)
        self._state = ActuatorSerializerState.IDLE
        self._consumer_task: asyncio.Task[None] | None = None
        self._reason_codes: list[str] = []
        self._last_successful_state: dict[str, Any] = {}
        self._store: Any | None = None
        self._rate_limiter = _ActuatorRateLimiter()
        self._latest_plan_version = 0
        self._latest_config_version = 0
        self._last_actuated_source: str | None = None
        self._inject_consumer_exception = False
        self._simulate_primary_unavailable = False
        self._simulate_alternative_unavailable = False
        self._pause_consumer = False
        self._override_state: Optional[dict[str, Any]] = None

    @property
    def state(self) -> ActuatorSerializerState:
        return self._state

    @property
    def queue_size(self) -> int:
        return self._queue.qsize()

    @property
    def consumer_task(self) -> asyncio.Task[None] | None:
        return self._consumer_task

    @property
    def reason_codes(self) -> list[str]:
        return list(self._reason_codes)

    @property
    def last_successful_state(self) -> dict[str, Any]:
        return self._last_successful_state

    @property
    def storage_key(self) -> str:
        return f"boiler_serializer_{self.entry_id}_{self.box_id}"

    @property
    def last_actuated_source(self) -> str | None:
        return self._last_actuated_source

    @property
    def override_state(self) -> Optional[dict[str, Any]]:
        return self._override_state

    async def start(self) -> None:
        if self._state != ActuatorSerializerState.IDLE:
            return
        self._state = ActuatorSerializerState.RUNNING
        self._consumer_task = asyncio.create_task(self._consumer_loop())
        try:
            hass = self._resolve_hass()
            if self._store_factory is not None:
                store = self._store_factory(hass, _STORAGE_VERSION, self.storage_key)
            else:
                if hass is None:
                    raise RuntimeError("BoilerActuatorSerializer requires hass for Store persistence")
                store = Store(hass, _STORAGE_VERSION, self.storage_key)
            self._store = store
            loaded = await store.async_load()
            if loaded is not None:
                self._last_successful_state = loaded
                self._latest_plan_version = loaded.get("latest_plan_version", 0)
                self._latest_config_version = loaded.get("latest_config_version", 0)
                self._last_actuated_source = loaded.get("last_actuated_source")
                override = loaded.get("override")
                if override:
                    self._override_state = override
                    self._check_and_clear_expired_override()
        except Exception as exc:
            _LOGGER.warning("Boiler serializer store load failed for %s/%s: %s", self.entry_id, self.box_id, exc)
            self._reason_codes.append(PlannerReasonCode.STORAGE_WRITE_FAILED.value)

    async def stop(self) -> None:
        if self._state not in (ActuatorSerializerState.RUNNING, ActuatorSerializerState.DEGRADED):
            return
        self._state = ActuatorSerializerState.STOPPED
        await self._drain_non_critical()
        if self._consumer_task and not self._consumer_task.done():
            self._consumer_task.cancel()
            try:
                await self._consumer_task
            except asyncio.CancelledError:  # NOSONAR - we initiated this cancel; absorbing it is correct
                pass
        self._consumer_task = None

    async def enqueue(self, cmd: ActuatorCommand) -> bool:
        if self._state not in (ActuatorSerializerState.RUNNING, ActuatorSerializerState.DEGRADED):
            raise RuntimeError("Serializer not running")
        ok, _ = await self._try_enqueue(cmd)
        return ok

    async def enqueue_with_reason(self, cmd: ActuatorCommand) -> tuple[bool, str]:
        if self._state not in (ActuatorSerializerState.RUNNING, ActuatorSerializerState.DEGRADED):
            return False, "serializer not running"
        return await self._try_enqueue(cmd)

    async def _try_enqueue(self, cmd: ActuatorCommand) -> tuple[bool, str]:
        if cmd.plan_version < self._latest_plan_version:
            return False, "stale plan_version"
        if cmd.config_version < self._latest_config_version:
            return False, "stale config_version"
        if cmd.plan_version > self._latest_plan_version:
            self._latest_plan_version = cmd.plan_version
        if cmd.config_version > self._latest_config_version:
            self._latest_config_version = cmd.config_version
        if self._queue.full():
            if cmd.priority in (ActuatorCommandPriority.SAFETY, ActuatorCommandPriority.CONFIG):
                evicted = await self._evict_lowest_priority()
                if not evicted:
                    return False, "queue full, no replan to evict"
            else:
                return False, "queue full"
        await self._queue.put(cmd)
        return True, ""

    async def _evict_lowest_priority(self) -> bool:
        items = []
        while not self._queue.empty():
            items.append(self._queue.get_nowait())
        replans = [i for i in items if i.priority == ActuatorCommandPriority.REPLAN]
        if not replans:
            for i in items:
                await self._queue.put(i)
            return False
        replans.sort(key=lambda c: c.plan_version)
        to_remove = replans[0]
        kept = [i for i in items if i is not to_remove]
        for i in kept:
            await self._queue.put(i)
        return True

    async def _drain_non_critical(self) -> None:
        drained: list[ActuatorCommand] = []
        while not self._queue.empty():
            cmd = self._queue.get_nowait()
            if cmd.priority == ActuatorCommandPriority.REPLAN:
                continue
            drained.append(cmd)
        for cmd in drained:
            await self._queue.put(cmd)

    async def _consumer_loop(self) -> None:
        while self._state in (ActuatorSerializerState.RUNNING, ActuatorSerializerState.DEGRADED):
            if self._pause_consumer:
                await asyncio.sleep(0.05)
                continue
            try:
                cmd: ActuatorCommand = await asyncio.wait_for(self._queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                # Honour cooperative cancellation: re-raise so the task ends as
                # cancelled (stop() awaits and absorbs it). Nothing follows the
                # loop, so this is equivalent to the old break but Sonar-clean.
                raise
            if self._inject_consumer_exception:
                self._state = ActuatorSerializerState.DEGRADED
                self._reason_codes.append(PlannerReasonCode.ACTUATOR_SERIALIZER_ERROR.value)
                self._inject_consumer_exception = False
                continue
            try:
                await self._execute(cmd)
            except Exception as exc:
                _LOGGER.exception("Actuator serializer consumer error for %s/%s: %s", self.entry_id, self.box_id, exc)
                self._state = ActuatorSerializerState.DEGRADED
                self._reason_codes.append(PlannerReasonCode.ACTUATOR_SERIALIZER_ERROR.value)

    async def _execute(self, cmd: ActuatorCommand) -> None:
        self._check_and_clear_expired_override(cmd.created_at)
        if cmd.command_type == ActuatorCommandType.CONFIG_UPDATE:
            self._last_successful_state["config"] = cmd.payload.get("new_options", {})
            await self._persist_state()
            return
        if cmd.command_type == ActuatorCommandType.OVERRIDE_CREATE:
            await self._execute_override_create(cmd)
            return
        if cmd.command_type == ActuatorCommandType.OVERRIDE_CLEAR:
            await self._execute_override_clear(cmd)
            return
        if self._override_state is not None:
            if cmd.priority == ActuatorCommandPriority.REPLAN:
                self._reason_codes.append(PlannerReasonCode.OVERRIDE_ACTIVE.value)
                return
        alt_mode = cmd.payload.get("alt_mode", "disabled")
        if cmd.source_intent == SourceIntent.ALTERNATIVE and alt_mode == "benchmark_only":
            return
        if cmd.source_intent == SourceIntent.PRIMARY and self._simulate_primary_unavailable:
            self._reason_codes.append(PlannerReasonCode.PRIMARY_ACTUATOR_UNAVAILABLE.value)
            return
        if cmd.source_intent == SourceIntent.ALTERNATIVE and self._simulate_alternative_unavailable:
            self._reason_codes.append(PlannerReasonCode.ALTERNATIVE_ACTUATOR_UNAVAILABLE_BENCHMARK_ONLY.value)
            return
        desired_state = cmd.command_type == ActuatorCommandType.APPLY
        source_key = cmd.source_intent.value
        self._last_successful_state["desired_source"] = source_key
        self._last_successful_state["desired_state"] = desired_state
        await self._persist_state()
        if not self._rate_limiter.can_transition(source_key, desired_state, cmd.created_at):
            self._reason_codes.append(PlannerReasonCode.ACTUATOR_RATE_LIMITED.value)
            return
        self._rate_limiter.record_transition(source_key, desired_state, cmd.created_at)
        self._last_actuated_source = source_key
        await self._persist_state()

    async def _persist_state(self) -> None:
        if self._store is None:
            return
        try:
            state = dict(self._last_successful_state)
            state.update({
                "latest_plan_version": self._latest_plan_version,
                "latest_config_version": self._latest_config_version,
                "last_actuated_source": self._last_actuated_source,
                "reason_codes": self._reason_codes,
                "override": self._override_state,
            })
            await self._store.async_save(state)
            self._last_successful_state = state
        except Exception as exc:
            _LOGGER.warning("Boiler serializer store save failed for %s/%s: %s", self.entry_id, self.box_id, exc)
            self._reason_codes.append(PlannerReasonCode.STORAGE_WRITE_FAILED.value)

    def _resolve_hass(self) -> HomeAssistant | None:
        return self._hass

    async def _flush(self) -> None:
        while not self._queue.empty():
            cmd = self._queue.get_nowait()
            await self._execute(cmd)

    async def _execute_override_create(self, cmd: ActuatorCommand) -> None:
        payload = cmd.payload
        reason_code = payload.get("reason_code", "")
        ttl_minutes = payload.get("ttl_minutes", _OVERRIDE_DEFAULT_TTL_MINUTES)
        expires_at = dt_util.now() + timedelta(minutes=ttl_minutes)
        self._override_state = {
            "reason_code": reason_code,
            "ttl_minutes": ttl_minutes,
            "expires_at": expires_at.isoformat(),
            "created_at": dt_util.now().isoformat(),
        }
        if PlannerReasonCode.OVERRIDE_ACTIVE.value not in self._reason_codes:
            self._reason_codes.append(PlannerReasonCode.OVERRIDE_ACTIVE.value)
        await self._persist_state()

    async def _execute_override_clear(self, cmd: ActuatorCommand) -> None:
        if self._override_state is not None:
            self._override_state = None
            await self._persist_state()

    async def create_override(
        self, reason_code: str, ttl_minutes: Optional[int] = None
    ) -> tuple[bool, str]:
        if reason_code not in _OVERRIDE_CANONICAL_REASON_CODES:
            return False, f"invalid reason code: {reason_code}"
        if ttl_minutes is None:
            ttl_minutes = _OVERRIDE_DEFAULT_TTL_MINUTES
        if ttl_minutes < _OVERRIDE_MIN_TTL_MINUTES:
            return False, f"ttl below minimum {_OVERRIDE_MIN_TTL_MINUTES} minutes"
        if ttl_minutes > _OVERRIDE_MAX_TTL_MINUTES:
            return False, f"ttl above maximum {_OVERRIDE_MAX_TTL_MINUTES} minutes"
        if ttl_minutes % _OVERRIDE_TTL_INCREMENT != 0:
            return False, f"ttl must be in {_OVERRIDE_TTL_INCREMENT}-minute increments"
        cmd = ActuatorCommand(
            entry_id=self.entry_id,
            box_id=self.box_id,
            command_type=ActuatorCommandType.OVERRIDE_CREATE,
            plan_version=self._latest_plan_version,
            config_version=self._latest_config_version,
            priority=ActuatorCommandPriority.CONFIG,
            source_intent=SourceIntent.NONE,
            payload={"reason_code": reason_code, "ttl_minutes": ttl_minutes},
        )
        ok, reason = await self._try_enqueue(cmd)
        if not ok:
            return False, reason
        await self._flush()
        return True, ""

    async def clear_override(self) -> bool:
        cmd = ActuatorCommand(
            entry_id=self.entry_id,
            box_id=self.box_id,
            command_type=ActuatorCommandType.OVERRIDE_CLEAR,
            plan_version=self._latest_plan_version,
            config_version=self._latest_config_version,
            priority=ActuatorCommandPriority.CONFIG,
            source_intent=SourceIntent.NONE,
            payload={},
        )
        ok, reason = await self._try_enqueue(cmd)
        if not ok:
            return False
        await self._flush()
        return self._override_state is None

    def _is_override_expired(self, at_time: Optional[datetime] = None) -> bool:
        if self._override_state is None:
            return False
        if at_time is None:
            at_time = dt_util.now()
        expires_at_str = self._override_state.get("expires_at")
        if not expires_at_str:
            return True
        expires_at = dt_util.parse_datetime(expires_at_str)
        if expires_at is None:
            return True
        return at_time >= expires_at

    def _check_and_clear_expired_override(
        self, at_time: Optional[datetime] = None
    ) -> bool:
        if self._is_override_expired(at_time):
            if self._override_state is not None:
                self._override_state = None
                if PlannerReasonCode.OVERRIDE_EXPIRED.value not in self._reason_codes:
                    self._reason_codes.append(PlannerReasonCode.OVERRIDE_EXPIRED.value)
                return True
        return False

    async def recover_from_crash(self, now: Optional[datetime] = None) -> bool:
        state = self._last_successful_state
        desired_source = state.get("desired_source")
        desired_state = state.get("desired_state")
        if desired_source is None or desired_state is None:
            return False
        self._latest_plan_version = max(
            self._latest_plan_version, state.get("latest_plan_version", 0)
        )
        self._latest_config_version = max(
            self._latest_config_version, state.get("latest_config_version", 0)
        )
        if now is None:
            now = dt_util.now()
        if not self._rate_limiter.can_transition(desired_source, desired_state, now):
            self._reason_codes.append(PlannerReasonCode.ACTUATOR_RATE_LIMITED.value)
            return True
        self._rate_limiter.record_transition(desired_source, desired_state, now)
        self._last_actuated_source = desired_source
        await self._persist_state()
        return True


@dataclass
class BoilerSchedule:
    cancel_callbacks: list[Callable[[], None]]
    entities: set[str]
    created_at: datetime
    windows: dict[str, list[dict[str, datetime]]]
    pump_entity: Optional[str] = None
    pump_follower_enabled: bool = False


class BoilerActuator:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._reason_codes: list[str] = []
        self._active_heaters: set[str] = set()
        self._pump_entity: Optional[str] = None

    @property
    def reason_codes(self) -> list[str]:
        return list(self._reason_codes)

    def clear_reason_codes(self) -> None:
        self._reason_codes.clear()

    async def async_turn_on_entity(self, entity_id: str, is_heater: bool = False) -> None:
        await _async_switch_on(self.hass, entity_id)
        if is_heater:
            self._active_heaters.add(entity_id)
            if self._pump_entity:
                if _entity_exists(self.hass, self._pump_entity):
                    await _async_switch_on(self.hass, self._pump_entity)
                else:
                    self._reason_codes.append(PlannerReasonCode.CIRCULATION_PUMP_UNAVAILABLE.value)

    async def async_turn_off_entity(self, entity_id: str, is_heater: bool = False) -> None:
        await _async_switch_off(self.hass, entity_id)
        if is_heater:
            self._active_heaters.discard(entity_id)
            if self._pump_entity and not self._active_heaters:
                if _entity_exists(self.hass, self._pump_entity):
                    await _async_switch_off(self.hass, self._pump_entity)

    async def async_apply_plan(
        self,
        plan: Optional[Any],
        profile: Optional[Any],
        config: dict[str, Any],
        box_id: str,
        entry_id: str,
    ) -> None:
        self.clear_reason_codes()
        await self.async_cancel_plan(entry_id, clear_plan=False)

        if not plan or not getattr(plan, "slots", None):
            _LOGGER.warning("No boiler plan to apply for %s", entry_id)
            return

        main_switch = _resolve_wrapper_entity(box_id, "bojler_top")
        alt_switch = _resolve_wrapper_entity(box_id, "bojler_alt")
        pump_switch = _resolve_wrapper_entity(box_id, "bojler_cirkulace")

        has_main_config = bool(config.get(CONF_BOILER_HEATER_SWITCH_ENTITY))
        has_alt_config = bool(config.get(CONF_BOILER_ALT_HEATER_SWITCH_ENTITY))
        has_pump_config = bool(config.get(CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY))

        if not has_main_config:
            _LOGGER.error("Missing boiler heater switch configuration for %s", entry_id)
            return

        if not _entity_exists(self.hass, main_switch):
            _LOGGER.error("Boiler wrapper switch not available: %s", main_switch)
            return

        if has_alt_config and not _entity_exists(self.hass, alt_switch):
            _LOGGER.error("Boiler wrapper switch not available: %s", alt_switch)
            return

        if has_pump_config:
            self._pump_entity = pump_switch
            if not _entity_exists(self.hass, pump_switch):
                self._reason_codes.append(PlannerReasonCode.CIRCULATION_PUMP_UNAVAILABLE.value)
                _LOGGER.warning("Circulation pump unavailable for %s: %s", entry_id, pump_switch)
        else:
            self._pump_entity = None

        windows = _build_heating_windows(plan.slots, has_alt_config)
        schedule = BoilerSchedule(
            cancel_callbacks=[],
            entities=set(),
            created_at=dt_util.now(),
            windows={},
            pump_entity=pump_switch if has_pump_config else None,
            pump_follower_enabled=has_pump_config,
        )
        schedule_windows = schedule.windows

        active_heater_count = 0

        def _make_heater_callbacks(entity_id: str):
            async def _turn_on_heater(_: datetime) -> None:
                nonlocal active_heater_count
                await _async_switch_on(self.hass, entity_id)
                active_heater_count += 1
                if schedule.pump_follower_enabled and schedule.pump_entity:
                    if _entity_exists(self.hass, schedule.pump_entity):
                        await _async_switch_on(self.hass, schedule.pump_entity)

            async def _turn_off_heater(_: datetime) -> None:
                nonlocal active_heater_count
                await _async_switch_off(self.hass, entity_id)
                active_heater_count -= 1
                if schedule.pump_follower_enabled and schedule.pump_entity:
                    if active_heater_count <= 0 and _entity_exists(self.hass, schedule.pump_entity):
                        await _async_switch_off(self.hass, schedule.pump_entity)

            return _turn_on_heater, _turn_off_heater

        for window in windows.get("main", []):
            on_cb, off_cb = _make_heater_callbacks(main_switch)
            schedule.cancel_callbacks.extend(
                _schedule_switch_window(self.hass, main_switch, window, on_cb, off_cb)
            )
            schedule.entities.add(main_switch)
            schedule_windows.setdefault(main_switch, []).append(window)

        if has_alt_config:
            for window in windows.get("alt", []):
                on_cb, off_cb = _make_heater_callbacks(alt_switch)
                schedule.cancel_callbacks.extend(
                    _schedule_switch_window(self.hass, alt_switch, window, on_cb, off_cb)
                )
                schedule.entities.add(alt_switch)
                schedule_windows.setdefault(alt_switch, []).append(window)

        _store_schedule(self.hass, entry_id, schedule)
        await _persist_schedule(self.hass, entry_id, schedule)
        _LOGGER.info(
            "Boiler plan applied for %s (windows: main=%s, alt=%s, pump_follower=%s)",
            entry_id,
            len(windows.get("main", [])),
            len(windows.get("alt", [])),
            schedule.pump_follower_enabled,
        )

    async def async_cancel_plan(self, entry_id: str, clear_plan: bool = False) -> None:
        schedule = _pop_schedule(self.hass, entry_id)
        if schedule:
            for cancel in schedule.cancel_callbacks:
                cancel()
            for entity_id in schedule.entities:
                await _async_switch_off(self.hass, entity_id)
            if schedule.pump_follower_enabled and schedule.pump_entity:
                if _entity_exists(self.hass, schedule.pump_entity):
                    await _async_switch_off(self.hass, schedule.pump_entity)

        await _clear_persisted_schedule(self.hass, entry_id)
        if clear_plan:
            _LOGGER.info("Boiler plan cleared for %s", entry_id)


def _resolve_wrapper_entity(box_id: str, suffix: str) -> str:
    return f"switch.oig_{box_id}_{suffix}"


def _entity_exists(hass: HomeAssistant, entity_id: str) -> bool:
    return hass.states.get(entity_id) is not None


def _build_heating_windows(
    slots: list[Any], has_alt_config: bool
) -> dict[str, list[dict[str, datetime]]]:
    main_windows: list[dict[str, datetime]] = []
    alt_windows: list[dict[str, datetime]] = []

    for slot in slots:
        consumption = getattr(
            slot,
            "avg_consumption_kwh",
            getattr(slot, "heating_kwh", 0.0),
        )
        if consumption <= 0:
            continue
        source = getattr(
            slot,
            "recommended_source",
            getattr(slot, "source", EnergySource.GRID),
        )
        source_value = source.value if isinstance(source, EnergySource) else str(source)

        target = (
            "alt"
            if source_value == EnergySource.ALTERNATIVE.value and has_alt_config
            else "main"
        )
        windows = alt_windows if target == "alt" else main_windows
        _merge_window(windows, slot.start, slot.end)

    return {"main": main_windows, "alt": alt_windows}


def _merge_window(windows: list[dict[str, datetime]], start: datetime, end: datetime) -> None:
    if not windows:
        windows.append({"start": start, "end": end})
        return

    last = windows[-1]
    if start <= last["end"]:
        if end > last["end"]:
            last["end"] = end
    else:
        windows.append({"start": start, "end": end})


def _schedule_switch_window(
    hass: HomeAssistant,
    entity_id: Optional[str],
    window: dict[str, datetime],
    turn_on_callback: Any | None = None,
    turn_off_callback: Any | None = None,
) -> list[Callable[[], None]]:
    if not entity_id:
        return []

    start = window["start"]
    end = window["end"]
    now = dt_util.now()
    cancel_callbacks = []

    async def _default_turn_on(_: datetime) -> None:
        await _async_switch_on(hass, entity_id)

    async def _default_turn_off(_: datetime) -> None:
        await _async_switch_off(hass, entity_id)

    on_cb = turn_on_callback if turn_on_callback is not None else _default_turn_on
    off_cb = turn_off_callback if turn_off_callback is not None else _default_turn_off

    if end <= now:
        return []
    if start <= now < end:
        hass.async_create_task(on_cb(now))
        cancel_callbacks.append(async_track_point_in_time(hass, off_cb, end))
        return cancel_callbacks

    cancel_callbacks.append(async_track_point_in_time(hass, on_cb, start))
    cancel_callbacks.append(async_track_point_in_time(hass, off_cb, end))
    return cancel_callbacks


async def _async_switch_on(hass: HomeAssistant, entity_id: str) -> None:
    await hass.services.async_call(
        "switch", "turn_on", {"entity_id": entity_id}, blocking=False
    )


async def _async_switch_off(hass: HomeAssistant, entity_id: str) -> None:
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": entity_id}, blocking=False
    )


def _store_schedule(hass: HomeAssistant, entry_id: str, schedule: BoilerSchedule) -> None:
    schedules = hass.data.setdefault(DOMAIN, {}).setdefault("boiler_schedules", {})
    schedules[entry_id] = schedule


def _pop_schedule(hass: HomeAssistant, entry_id: str) -> Optional[BoilerSchedule]:
    schedules = hass.data.setdefault(DOMAIN, {}).setdefault("boiler_schedules", {})
    return schedules.pop(entry_id, None)


def clear_in_memory_schedule_without_switching(
    hass: HomeAssistant, entry_id: str
) -> bool:
    """Cancel future schedule callbacks without changing physical outputs."""
    schedule = _pop_schedule(hass, entry_id)
    if schedule is None:
        return False
    for cancel in schedule.cancel_callbacks:
        cancel()
    return True


def _schedule_store_entries(raw: dict[str, Any]) -> dict[str, dict[str, Any]]:
    if raw.get("schema_version") == _SCHEDULE_SCHEMA_VERSION:
        entries = raw.get("entries", {})
        return dict(entries) if isinstance(entries, dict) else {}
    return dict(raw)


def _versioned_schedule_payload(
    entries: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    return {"schema_version": _SCHEDULE_SCHEMA_VERSION, "entries": entries}


async def _persist_schedule(
    hass: HomeAssistant, entry_id: str, schedule: BoilerSchedule
) -> None:
    store: Store[dict[str, dict[str, Any]]] = Store(hass, _STORAGE_VERSION, _STORAGE_KEY)
    raw: dict[str, Any] = await store.async_load() or {}
    existing = _schedule_store_entries(raw)
    serialized: dict[str, Any] = {
        "schema_version": _SCHEDULE_SCHEMA_VERSION,
        "created_at": schedule.created_at.isoformat(),
        "entities": sorted(schedule.entities),
        "windows": [],
    }

    windows_by_entity = schedule.windows or {}
    for entity_id in schedule.entities:
        for window in windows_by_entity.get(entity_id, []):
            serialized["windows"].append(
                {
                    "entity_id": entity_id,
                    "start": window["start"].isoformat(),
                    "end": window["end"].isoformat(),
                }
            )

    existing[entry_id] = serialized
    await store.async_save(_versioned_schedule_payload(existing))


async def _clear_persisted_schedule(hass: HomeAssistant, entry_id: str) -> None:
    store: Store[dict[str, dict[str, Any]]] = Store(hass, _STORAGE_VERSION, _STORAGE_KEY)
    raw: dict[str, Any] = await store.async_load() or {}
    existing = _schedule_store_entries(raw)
    if entry_id in existing:
        existing.pop(entry_id, None)
        await store.async_save(_versioned_schedule_payload(existing))


async def _restore_boiler_schedule(hass: HomeAssistant, entry_id: str) -> None:
    store: Store[dict[str, dict[str, Any]]] = Store(hass, _STORAGE_VERSION, _STORAGE_KEY)
    raw: dict[str, Any] = await store.async_load() or {}
    if raw.get("schema_version") != _SCHEDULE_SCHEMA_VERSION:
        _LOGGER.warning(
            "Skipping legacy unversioned boiler schedule restore for %s", entry_id
        )
        return
    existing = _schedule_store_entries(raw)
    data = existing.get(entry_id)
    if not data:
        return

    now = dt_util.now()
    schedule = BoilerSchedule(
        cancel_callbacks=[],
        entities=set(),
        created_at=now,
        windows={},
    )

    schedule_windows = schedule.windows

    for window in data.get("windows", []):
        try:
            entity_id = window.get("entity_id")
            start = dt_util.parse_datetime(window.get("start"))
            end = dt_util.parse_datetime(window.get("end"))
            if not entity_id or not start or not end:
                continue
            if end <= now:
                continue
            schedule.entities.add(entity_id)
            schedule_windows.setdefault(entity_id, []).append(
                {"start": start, "end": end}
            )
            schedule.cancel_callbacks.extend(
                _schedule_switch_window(hass, entity_id, {"start": start, "end": end})
            )
        except Exception:
            continue

    if schedule.entities:
        _store_schedule(hass, entry_id, schedule)
