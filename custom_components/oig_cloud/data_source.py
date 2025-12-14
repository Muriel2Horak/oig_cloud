from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any, Optional

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.debounce import Debouncer
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.util import dt as dt_util

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

DATA_SOURCE_CLOUD_ONLY = "cloud_only"
DATA_SOURCE_HYBRID = "hybrid"
DATA_SOURCE_LOCAL_ONLY = "local_only"

DEFAULT_DATA_SOURCE_MODE = DATA_SOURCE_CLOUD_ONLY
DEFAULT_PROXY_STALE_MINUTES = 10
DEFAULT_LOCAL_EVENT_DEBOUNCE_MS = 300

PROXY_LAST_DATA_ENTITY_ID = "sensor.oig_local_oig_proxy_proxy_status_last_data"


@dataclass(slots=True)
class DataSourceState:
    configured_mode: str
    effective_mode: str
    local_available: bool
    last_local_data: Optional[datetime]
    reason: str


def get_data_source_state(hass: HomeAssistant, entry_id: str) -> DataSourceState:
    entry_data = hass.data.get(DOMAIN, {}).get(entry_id, {})
    state = entry_data.get("data_source_state")
    if isinstance(state, DataSourceState):
        return state
    # Fallback for early startup
    return DataSourceState(
        configured_mode=DEFAULT_DATA_SOURCE_MODE,
        effective_mode=DEFAULT_DATA_SOURCE_MODE,
        local_available=False,
        last_local_data=None,
        reason="not_initialized",
    )


def get_effective_mode(hass: HomeAssistant, entry_id: str) -> str:
    return get_data_source_state(hass, entry_id).effective_mode


def get_configured_mode(entry: ConfigEntry) -> str:
    mode = entry.options.get("data_source_mode", DEFAULT_DATA_SOURCE_MODE)
    if mode == DATA_SOURCE_HYBRID:
        _LOGGER.debug("Data source mode 'hybrid' mapped to 'local_only' for compatibility")
        return DATA_SOURCE_LOCAL_ONLY
    return mode


def get_proxy_stale_minutes(entry: ConfigEntry) -> int:
    try:
        return int(entry.options.get("local_proxy_stale_minutes", DEFAULT_PROXY_STALE_MINUTES))
    except Exception:
        return DEFAULT_PROXY_STALE_MINUTES


def get_local_event_debounce_ms(entry: ConfigEntry) -> int:
    try:
        return int(entry.options.get("local_event_debounce_ms", DEFAULT_LOCAL_EVENT_DEBOUNCE_MS))
    except Exception:
        return DEFAULT_LOCAL_EVENT_DEBOUNCE_MS


def _parse_dt(value: Any) -> Optional[dt_util.dt.datetime]:
    if value in (None, "", "unknown", "unavailable"):
        return None
    if isinstance(value, dt_util.dt.datetime):
        return dt_util.as_utc(value) if value.tzinfo else value.replace(tzinfo=dt_util.UTC)
    if isinstance(value, str):
        dt = dt_util.parse_datetime(value)
        if dt is None:
            try:
                dt = dt_util.dt.datetime.fromisoformat(value)
            except Exception:
                return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=dt_util.UTC)
        return dt_util.as_utc(dt)
    return None


def init_data_source_state(hass: HomeAssistant, entry: ConfigEntry) -> DataSourceState:
    """Initialize (or refresh) data source state early during setup.

    This allows coordinators to respect local/hybrid mode before the controller is started.
    """
    configured = get_configured_mode(entry)
    stale_minutes = get_proxy_stale_minutes(entry)

    proxy_state = hass.states.get(PROXY_LAST_DATA_ENTITY_ID)
    last_dt = _parse_dt(proxy_state.state if proxy_state else None)
    now = dt_util.utcnow()

    local_available = False
    reason = "local_missing"
    if last_dt:
        age = (now - last_dt).total_seconds()
        if age <= stale_minutes * 60:
            local_available = True
            reason = "local_ok"
        else:
            reason = f"local_stale_{int(age)}s"

    if configured == DATA_SOURCE_CLOUD_ONLY:
        effective = DATA_SOURCE_CLOUD_ONLY
    else:
        effective = configured if local_available else DATA_SOURCE_CLOUD_ONLY

    state = DataSourceState(
        configured_mode=configured,
        effective_mode=effective,
        local_available=local_available,
        last_local_data=last_dt,
        reason=reason,
    )
    hass.data.setdefault(DOMAIN, {}).setdefault(entry.entry_id, {})["data_source_state"] = (
        state
    )
    return state


class DataSourceController:
    """Controls effective data source mode based on local proxy health."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, coordinator: Any) -> None:
        self.hass = hass
        self.entry = entry
        self.coordinator = coordinator

        self._unsubs: list[callable] = []
        self._debouncer = Debouncer(
            hass,
            _LOGGER,
            cooldown=get_local_event_debounce_ms(entry) / 1000,
            immediate=False,
            function=self._poke_coordinator,
        )

    async def async_start(self) -> None:
        self._update_state(force=True)

        # Watch proxy last_data changes
        self._unsubs.append(
            async_track_state_change_event(
                self.hass, [PROXY_LAST_DATA_ENTITY_ID], self._on_proxy_change
            )
        )

        # Periodic HC: detect stale even without state changes
        self._unsubs.append(
            async_track_time_interval(self.hass, self._on_periodic, timedelta(minutes=1))
        )

        # Local telemetry events (5s updates) – just poke coordinator listeners
        self._unsubs.append(
            self.hass.bus.async_listen("state_changed", self._on_any_state_change)
        )

        _LOGGER.info(
            "DataSourceController started: mode=%s stale=%smin",
            get_configured_mode(self.entry),
            get_proxy_stale_minutes(self.entry),
        )

    async def async_stop(self) -> None:
        for unsub in self._unsubs:
            try:
                unsub()
            except Exception:
                pass
        self._unsubs.clear()

    @callback
    def _on_proxy_change(self, _event: Any) -> None:
        _, mode_changed = self._update_state()
        if mode_changed:
            self._on_effective_mode_changed()

    @callback
    def _on_periodic(self, _now: Any) -> None:
        _, mode_changed = self._update_state()
        if mode_changed:
            self._on_effective_mode_changed()

    @callback
    def _on_any_state_change(self, event: Any) -> None:
        # Only relevant while using local data
        entry_id = self.entry.entry_id
        state = get_data_source_state(self.hass, entry_id)
        if state.effective_mode == DATA_SOURCE_CLOUD_ONLY:
            return

        entity_id = event.data.get("entity_id")
        if not isinstance(entity_id, str):
            return
        if not entity_id.startswith("sensor.oig_local_"):
            return

        # Poke coordinator listeners; sensors will re-evaluate state from local entities.
        self._schedule_debounced_poke()

    @callback
    def _schedule_debounced_poke(self) -> None:
        try:
            self.hass.async_create_task(self._debouncer.async_call())
        except Exception:
            pass

    @callback
    def _update_state(self, force: bool = False) -> tuple[bool, bool]:
        entry_id = self.entry.entry_id
        configured = get_configured_mode(self.entry)
        stale_minutes = get_proxy_stale_minutes(self.entry)

        proxy_state = self.hass.states.get(PROXY_LAST_DATA_ENTITY_ID)
        if proxy_state is None:
            _LOGGER.debug("Proxy health entity not found")
        last_dt = _parse_dt(proxy_state.state if proxy_state else None)
        if proxy_state and last_dt is None:
            _LOGGER.debug(
                "Proxy health parse failed for value=%s, attributes=%s",
                proxy_state.state,
                proxy_state.attributes,
            )
        now = dt_util.utcnow()

        local_available = False
        reason = "local_missing"
        if last_dt:
            age = (now - last_dt).total_seconds()
            if age <= stale_minutes * 60:
                local_available = True
                reason = "local_ok"
            else:
                reason = f"local_stale_{int(age)}s"

        if configured == DATA_SOURCE_CLOUD_ONLY:
            effective = DATA_SOURCE_CLOUD_ONLY
        else:
            effective = configured if local_available else DATA_SOURCE_CLOUD_ONLY

        prev = get_data_source_state(self.hass, entry_id)
        changed = force or (
            prev.configured_mode != configured
            or prev.effective_mode != effective
            or prev.local_available != local_available
            or prev.last_local_data != last_dt
        )
        mode_changed = force or (
            prev.configured_mode != configured
            or prev.effective_mode != effective
            or prev.local_available != local_available
        )

        if changed:
            new_state = DataSourceState(
                configured_mode=configured,
                effective_mode=effective,
                local_available=local_available,
                last_local_data=last_dt,
                reason=reason,
            )
            self.hass.data.setdefault(DOMAIN, {}).setdefault(entry_id, {})[
                "data_source_state"
            ] = new_state
        return changed, mode_changed

    @callback
    def _on_effective_mode_changed(self) -> None:
        state = get_data_source_state(self.hass, self.entry.entry_id)
        _LOGGER.warning(
            "Data source mode switch: configured=%s effective=%s local_ok=%s (%s)",
            state.configured_mode,
            state.effective_mode,
            state.local_available,
            state.reason,
        )
        if state.effective_mode == DATA_SOURCE_CLOUD_ONLY:
            # Ensure cloud data is fresh when falling back
            try:
                self.hass.async_create_task(self.coordinator.async_request_refresh())
            except Exception:
                pass
        else:
            # Re-evaluate sensors immediately when returning to local mode
            self._schedule_debounced_poke()

    async def _poke_coordinator(self) -> None:
        try:
            if self.coordinator and getattr(self.coordinator, "data", None) is not None:
                self.coordinator.async_set_updated_data(self.coordinator.data)
        except Exception:
            pass
