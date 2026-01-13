from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Optional

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.debounce import Debouncer
from homeassistant.util import dt as dt_util

from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)

DATA_SOURCE_CLOUD_ONLY = "cloud_only"
DATA_SOURCE_HYBRID = "hybrid"
DATA_SOURCE_LOCAL_ONLY = "local_only"

DEFAULT_DATA_SOURCE_MODE = DATA_SOURCE_CLOUD_ONLY
DEFAULT_PROXY_STALE_MINUTES = 10
DEFAULT_LOCAL_EVENT_DEBOUNCE_MS = 300

# Fired on hass.bus when effective data source changes for a config entry.
# Payload: {"entry_id": str, "configured_mode": str, "effective_mode": str, "local_available": bool, "reason": str}
EVENT_DATA_SOURCE_CHANGED = "oig_cloud_data_source_changed"

PROXY_LAST_DATA_ENTITY_ID = "sensor.oig_local_oig_proxy_proxy_status_last_data"
PROXY_BOX_ID_ENTITY_ID = "sensor.oig_local_oig_proxy_proxy_status_box_device_id"

try:
    from homeassistant.helpers.event import (
        async_track_state_change_event as _async_track_state_change_event,
    )  # type: ignore
except Exception:  # pragma: no cover
    _async_track_state_change_event = None

try:
    from homeassistant.helpers.event import (
        async_track_time_interval as _async_track_time_interval,
    )  # type: ignore
except Exception:  # pragma: no cover
    _async_track_time_interval = None


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
        _LOGGER.debug(
            "Data source mode 'hybrid' mapped to 'local_only' for compatibility"
        )
        return DATA_SOURCE_LOCAL_ONLY
    return mode


def get_proxy_stale_minutes(entry: ConfigEntry) -> int:
    try:
        return int(
            entry.options.get("local_proxy_stale_minutes", DEFAULT_PROXY_STALE_MINUTES)
        )
    except Exception:
        return DEFAULT_PROXY_STALE_MINUTES


def get_local_event_debounce_ms(entry: ConfigEntry) -> int:
    try:
        return int(
            entry.options.get(
                "local_event_debounce_ms", DEFAULT_LOCAL_EVENT_DEBOUNCE_MS
            )
        )
    except Exception:
        return DEFAULT_LOCAL_EVENT_DEBOUNCE_MS


def _get_proxy_state(hass: HomeAssistant) -> tuple[Any, Optional[dt_util.dt.datetime]]:
    proxy_state = hass.states.get(PROXY_LAST_DATA_ENTITY_ID)
    proxy_last_dt = _parse_dt(proxy_state.state if proxy_state else None)
    if proxy_state and proxy_last_dt is None:
        _LOGGER.debug(
            "Proxy health parse failed for value=%s, attributes=%s",
            proxy_state.state,
            proxy_state.attributes,
        )
    return proxy_state, proxy_last_dt


def _get_proxy_entity_timestamp(proxy_state: Any) -> Optional[dt_util.dt.datetime]:
    if proxy_state is None:
        return None
    try:
        dt = proxy_state.last_updated or proxy_state.last_changed
        if dt is None:
            return None
        return dt_util.as_utc(dt) if dt.tzinfo else dt.replace(tzinfo=dt_util.UTC)
    except Exception:
        return None


def _get_expected_box_id(entry: ConfigEntry) -> Optional[str]:
    try:
        return _coerce_box_id(entry.options.get("box_id"))
    except Exception:
        return None


def _get_proxy_box_id(hass: HomeAssistant) -> Optional[str]:
    proxy_box_state = hass.states.get(PROXY_BOX_ID_ENTITY_ID)
    return _coerce_box_id(proxy_box_state.state if proxy_box_state else None)


def _determine_local_entities_dt(
    hass: HomeAssistant,
    box_id_for_scan: Optional[str],
    last_local_entity_update: Optional[dt_util.dt.datetime] = None,
) -> Optional[dt_util.dt.datetime]:
    if last_local_entity_update is not None:
        return last_local_entity_update
    if not box_id_for_scan:
        return None
    return _get_latest_local_entity_update(hass, box_id_for_scan)


def _parse_dt(value: Any) -> Optional[dt_util.dt.datetime]:
    if value in (None, "", "unknown", "unavailable"):
        return None
    if isinstance(value, (int, float)):
        return _parse_timestamp(value)
    if isinstance(value, dt_util.dt.datetime):
        return _normalize_datetime(value)
    if isinstance(value, str):
        return _parse_datetime_str(value)
    return None


def _parse_timestamp(value: float | int) -> Optional[dt_util.dt.datetime]:
    try:
        ts = float(value)
    except (TypeError, ValueError):  # pragma: no cover
        return None  # pragma: no cover
    if ts > 1_000_000_000_000:  # ms epoch
        ts = ts / 1000.0
    try:
        return dt_util.dt.datetime.fromtimestamp(ts, tz=dt_util.UTC)
    except Exception:
        return None


def _normalize_datetime(value: dt_util.dt.datetime) -> dt_util.dt.datetime:
    return dt_util.as_utc(value) if value.tzinfo else value.replace(tzinfo=dt_util.UTC)


def _parse_datetime_str(value: str) -> Optional[dt_util.dt.datetime]:
    value = value.strip()
    if value.isdigit():
        try:
            return _parse_timestamp(float(value))
        except Exception as err:  # pragma: no cover
            _LOGGER.debug(
                "Failed to parse numeric timestamp '%s': %s", value, err
            )  # pragma: no cover
            return None  # pragma: no cover
    dt = dt_util.parse_datetime(value)
    if dt is None:
        try:
            dt = dt_util.dt.datetime.fromisoformat(value)
        except Exception:
            return None
    if dt.tzinfo is None:
        # Proxy často posílá lokální čas bez timezone → interpretuj jako lokální TZ HA, ne UTC.
        dt = dt.replace(tzinfo=dt_util.DEFAULT_TIME_ZONE)
    return dt_util.as_utc(dt)


def _coerce_box_id(value: Any) -> Optional[str]:
    if value in (None, "", "unknown", "unavailable"):
        return None
    if isinstance(value, int):
        return _coerce_box_id_int(value)
    if isinstance(value, float):
        return _coerce_box_id_float(value)
    if isinstance(value, str):
        return _coerce_box_id_str(value)
    return None


def _coerce_box_id_int(value: int) -> Optional[str]:
    return str(value) if value > 0 else None


def _coerce_box_id_float(value: float) -> Optional[str]:
    try:
        as_int = int(value)
        return str(as_int) if as_int > 0 else None
    except Exception:
        return None


def _coerce_box_id_str(value: str) -> Optional[str]:
    s = value.strip()
    if s.isdigit():
        return s
    try:
        m = re.search(r"(\d{6,})", s)
    except Exception:
        return None
    return m.group(1) if m else None


def _get_latest_local_entity_update(
    hass: HomeAssistant, box_id: str
) -> Optional[dt_util.dt.datetime]:
    """Return the most recent update timestamp among local telemetry entities for a box."""
    if not (isinstance(box_id, str) and box_id.isdigit()):
        return None
    try:
        latest: Optional[dt_util.dt.datetime] = None
        for st in _iter_local_entities(hass, box_id):
            dt_utc = _extract_state_timestamp(st)
            if dt_utc is None:
                continue
            latest = dt_utc if latest is None else max(latest, dt_utc)
        return latest
    except Exception:
        return None


def _iter_local_entities(hass: HomeAssistant, box_id: str):
    for domain in ("sensor", "binary_sensor"):
        prefix = f"{domain}.oig_local_{box_id}_"
        for st in hass.states.async_all(domain):
            if st.entity_id.startswith(prefix):
                yield st


def _extract_state_timestamp(state: Any) -> Optional[dt_util.dt.datetime]:
    if state.state in (None, "", "unknown", "unavailable"):
        return None
    dt = state.last_updated or state.last_changed
    if dt is None:
        return None
    return dt_util.as_utc(dt) if dt.tzinfo else dt.replace(tzinfo=dt_util.UTC)


def _pick_latest_source(
    proxy_last_dt: Optional[dt_util.dt.datetime],
    proxy_entity_dt: Optional[dt_util.dt.datetime],
    local_entities_dt: Optional[dt_util.dt.datetime],
) -> tuple[str, Optional[dt_util.dt.datetime]]:
    candidates: list[tuple[str, dt_util.dt.datetime]] = []
    if proxy_last_dt:
        candidates.append(("proxy_last_data", proxy_last_dt))
    if proxy_entity_dt:
        candidates.append(("proxy_entity_updated", proxy_entity_dt))
    if local_entities_dt:
        candidates.append(("local_entities", local_entities_dt))
    if not candidates:
        return "none", None
    source, last_dt = max(candidates, key=lambda item: item[1])
    return source, last_dt


def _evaluate_local_freshness(
    *,
    last_dt: Optional[dt_util.dt.datetime],
    now: dt_util.dt.datetime,
    stale_minutes: int,
    source: str,
) -> tuple[bool, str]:
    if not last_dt:
        return False, "local_missing"
    age = (now - last_dt).total_seconds()
    if age <= stale_minutes * 60:
        return True, f"local_ok_{source}"
    return False, f"local_stale_{int(age)}s_{source}"


def _validate_expected_box_id(
    *,
    local_available: bool,
    expected_box_id: Optional[str],
    proxy_box_id: Optional[str],
    local_entities_dt: Optional[dt_util.dt.datetime],
) -> tuple[bool, Optional[str]]:
    if not local_available or not expected_box_id:
        return local_available, None
    # Extra safety: if proxy reports a box_id, it must match the configured one.
    if proxy_box_id is None:
        # Proxy box id sensor missing/unparseable; allow only if we can confirm local entities
        # exist for the configured box id.
        if local_entities_dt is None:
            return False, "proxy_box_id_missing"
        return True, None
    if proxy_box_id != expected_box_id:
        return False, "proxy_box_id_mismatch"
    return True, None


def _effective_mode(configured: str, local_available: bool) -> str:
    if configured == DATA_SOURCE_CLOUD_ONLY:
        return DATA_SOURCE_CLOUD_ONLY
    return configured if local_available else DATA_SOURCE_CLOUD_ONLY


def _evaluate_local_state(
    *,
    configured: str,
    expected_box_id: Optional[str],
    proxy_box_id: Optional[str],
    proxy_last_dt: Optional[dt_util.dt.datetime],
    proxy_entity_dt: Optional[dt_util.dt.datetime],
    local_entities_dt: Optional[dt_util.dt.datetime],
    now: dt_util.dt.datetime,
    stale_minutes: int,
) -> tuple[bool, Optional[dt_util.dt.datetime], str, str]:
    source, last_dt = _pick_latest_source(
        proxy_last_dt, proxy_entity_dt, local_entities_dt
    )
    local_available, reason = _evaluate_local_freshness(
        last_dt=last_dt,
        now=now,
        stale_minutes=stale_minutes,
        source=source,
    )
    local_available, override_reason = _validate_expected_box_id(
        local_available=local_available,
        expected_box_id=expected_box_id,
        proxy_box_id=proxy_box_id,
        local_entities_dt=local_entities_dt,
    )
    if override_reason:
        reason = override_reason
    effective = _effective_mode(configured, local_available)
    return local_available, last_dt, reason, effective


def init_data_source_state(hass: HomeAssistant, entry: ConfigEntry) -> DataSourceState:
    """Initialize (or refresh) data source state early during setup.

    This allows coordinators to respect local/hybrid mode before the controller is started.
    """
    configured = get_configured_mode(entry)
    stale_minutes = get_proxy_stale_minutes(entry)
    expected_box_id = _get_expected_box_id(entry)

    proxy_state, proxy_last_dt = _get_proxy_state(hass)
    proxy_entity_dt = _get_proxy_entity_timestamp(proxy_state)
    proxy_box_id = _get_proxy_box_id(hass)

    box_id_for_scan = expected_box_id or proxy_box_id
    local_entities_dt = _determine_local_entities_dt(hass, box_id_for_scan)

    now = dt_util.utcnow()
    local_available, last_dt, reason, effective = _evaluate_local_state(
        configured=configured,
        expected_box_id=expected_box_id,
        proxy_box_id=proxy_box_id,
        proxy_last_dt=proxy_last_dt,
        proxy_entity_dt=proxy_entity_dt,
        local_entities_dt=local_entities_dt,
        now=now,
        stale_minutes=stale_minutes,
    )

    state = DataSourceState(
        configured_mode=configured,
        effective_mode=effective,
        local_available=local_available,
        last_local_data=last_dt,
        reason=reason,
    )
    hass.data.setdefault(DOMAIN, {}).setdefault(entry.entry_id, {})[
        "data_source_state"
    ] = state
    return state


class DataSourceController:
    """Controls effective data source mode based on local proxy health."""

    _LOCAL_ENTITY_RE = re.compile(r"^(?:sensor|binary_sensor)\.oig_local_(\d+)_")

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        coordinator: Any,
        telemetry_store: Optional[Any] = None,
    ) -> None:
        self.hass = hass
        self.entry = entry
        self.coordinator = coordinator
        self.telemetry_store = telemetry_store

        self._unsubs: list[callable] = []
        self._last_local_entity_update: Optional[dt_util.dt.datetime] = None
        self._pending_local_entities: set[str] = set()
        self._debouncer = Debouncer(
            hass,
            _LOGGER,
            cooldown=get_local_event_debounce_ms(entry) / 1000,
            immediate=False,
            function=self._handle_local_event,
        )

    async def async_start(self) -> None:
        await asyncio.sleep(0)
        self._update_state(force=True)

        # Seed coordinator payload from existing local states (only in configured local/hybrid mode).
        try:
            if (
                get_configured_mode(self.entry) != DATA_SOURCE_CLOUD_ONLY
                and self.telemetry_store
            ):
                did_seed = self.telemetry_store.seed_from_existing_local_states()
                if did_seed and getattr(
                    self.coordinator, "async_set_updated_data", None
                ):
                    snap = self.telemetry_store.get_snapshot()
                    self.coordinator.async_set_updated_data(snap.payload)
        except Exception as err:
            _LOGGER.debug("Failed to seed local telemetry snapshot: %s", err)

        # Watch proxy last_data changes
        if _async_track_state_change_event is not None:
            self._unsubs.append(
                _async_track_state_change_event(
                    self.hass, [PROXY_LAST_DATA_ENTITY_ID], self._on_proxy_change
                )
            )
        else:
            # Compatibility for older/stubbed HA helpers used in unit tests.
            @callback
            def _on_state_changed(event: Any) -> None:
                if event.data.get("entity_id") == PROXY_LAST_DATA_ENTITY_ID:
                    self._on_proxy_change(event)

            self._unsubs.append(
                self.hass.bus.async_listen("state_changed", _on_state_changed)
            )

        # Periodic HC: detect stale even without state changes
        if _async_track_time_interval is not None:
            self._unsubs.append(
                _async_track_time_interval(
                    self.hass, self._on_periodic, timedelta(minutes=1)
                )
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
        await asyncio.sleep(0)
        for unsub in self._unsubs:
            try:
                unsub()
            except Exception as err:
                _LOGGER.debug("Failed to unsubscribe data source listener: %s", err)
        self._unsubs.clear()

    @callback
    def _on_proxy_change(self, _event: Any) -> None:
        self._refresh_mode()

    @callback
    def _on_periodic(self, _now: Any) -> None:
        self._refresh_mode()

    @callback
    def _refresh_mode(self) -> None:
        _, mode_changed = self._update_state()
        if mode_changed:
            self._on_effective_mode_changed()

    @callback
    def _on_any_state_change(self, event: Any) -> None:
        # Ignore local events unless user configured local/hybrid mode.
        if get_configured_mode(self.entry) == DATA_SOURCE_CLOUD_ONLY:
            return

        # Ignore local events while effective mode is cloud fallback (no mixing).
        try:
            state = get_data_source_state(self.hass, self.entry.entry_id)
            if state.effective_mode == DATA_SOURCE_CLOUD_ONLY:
                return
        except Exception as err:
            _LOGGER.debug("Failed to read data source state: %s", err)

        entity_id = event.data.get("entity_id")
        if not isinstance(entity_id, str):
            return
        if not (
            entity_id.startswith("sensor.oig_local_")
            or entity_id.startswith("binary_sensor.oig_local_")
        ):
            return

        # Ensure the local update belongs to this entry's box_id (prevents cross-device wiring).
        m = self._LOCAL_ENTITY_RE.match(entity_id)
        if not m:
            return
        event_box_id = m.group(1)

        expected_box_id = _get_expected_box_id(self.entry)

        if expected_box_id and event_box_id != expected_box_id:
            return

        # If box_id isn't configured yet, fall back to proxy-reported box_id (if available).
        if expected_box_id is None:
            proxy_box_id = _get_proxy_box_id(self.hass)
            if proxy_box_id and event_box_id != proxy_box_id:
                return

        # Remember the latest local telemetry activity timestamp.
        try:
            self._last_local_entity_update = dt_util.as_utc(event.time_fired)
        except Exception:
            self._last_local_entity_update = dt_util.utcnow()

        # Track changed entities and apply mapping to coordinator payload (debounced).
        self._pending_local_entities.add(entity_id)
        self._schedule_debounced_poke()

    @callback
    def _schedule_debounced_poke(self) -> None:
        try:
            self.hass.async_create_task(self._debouncer.async_call())
        except Exception as err:
            _LOGGER.debug("Failed to schedule local telemetry debounce: %s", err)

    async def _handle_local_event(self) -> None:
        """Debounced handler for local telemetry changes.

        - Updates DataSourceState (may switch effective mode)
        - Applies local mapping into coordinator.data (cloud-shaped payload)
        """
        await asyncio.sleep(0)
        try:
            _, mode_changed = self._update_state()
            if mode_changed:
                self._on_effective_mode_changed()
            # Only apply local mapping when effective mode is local.
            state = get_data_source_state(self.hass, self.entry.entry_id)
            if state.effective_mode != DATA_SOURCE_CLOUD_ONLY and self.telemetry_store:
                pending = list(self._pending_local_entities)
                self._pending_local_entities.clear()
                if pending:
                    changed = self.telemetry_store.apply_local_events(pending)
                    if changed and getattr(
                        self.coordinator, "async_set_updated_data", None
                    ):
                        snap = self.telemetry_store.get_snapshot()
                        self.coordinator.async_set_updated_data(snap.payload)
        except Exception as err:
            _LOGGER.debug("Failed to handle local telemetry event: %s", err)

    @callback
    def _update_state(self, force: bool = False) -> tuple[bool, bool]:
        entry_id = self.entry.entry_id
        configured = get_configured_mode(self.entry)
        stale_minutes = get_proxy_stale_minutes(self.entry)

        proxy_state, proxy_last_dt = _get_proxy_state(self.hass)
        if proxy_state is None:
            _LOGGER.debug("Proxy health entity not found")
        proxy_entity_dt = _get_proxy_entity_timestamp(proxy_state)
        now = dt_util.utcnow()

        expected_box_id = _get_expected_box_id(self.entry)
        proxy_box_id = _get_proxy_box_id(self.hass)

        box_id_for_scan = expected_box_id or proxy_box_id
        local_entities_dt = _determine_local_entities_dt(
            self.hass, box_id_for_scan, self._last_local_entity_update
        )

        local_available, last_dt, reason, effective = _evaluate_local_state(
            configured=configured,
            expected_box_id=expected_box_id,
            proxy_box_id=proxy_box_id,
            proxy_last_dt=proxy_last_dt,
            proxy_entity_dt=proxy_entity_dt,
            local_entities_dt=local_entities_dt,
            now=now,
            stale_minutes=stale_minutes,
        )

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
        _LOGGER.info(
            "Data source mode switch: configured=%s effective=%s local_ok=%s (%s)",
            state.configured_mode,
            state.effective_mode,
            state.local_available,
            state.reason,
        )

        # Notify entities so UI can re-render immediately (per-entity listeners).
        try:
            self.hass.bus.async_fire(
                EVENT_DATA_SOURCE_CHANGED,
                {
                    "entry_id": self.entry.entry_id,
                    "configured_mode": state.configured_mode,
                    "effective_mode": state.effective_mode,
                    "local_available": state.local_available,
                    "reason": state.reason,
                },
            )
        except Exception as err:
            _LOGGER.debug("Failed to fire data source change event: %s", err)

        if state.effective_mode == DATA_SOURCE_CLOUD_ONLY:
            # Ensure cloud data is fresh when falling back
            try:
                self.hass.async_create_task(self.coordinator.async_request_refresh())
            except Exception as err:
                _LOGGER.debug("Failed to schedule coordinator refresh: %s", err)

    async def _poke_coordinator(self) -> None:
        await asyncio.sleep(0)
        try:
            if self.coordinator and getattr(self.coordinator, "data", None) is not None:
                self.coordinator.async_set_updated_data(self.coordinator.data)
        except Exception as err:
            _LOGGER.debug("Failed to poke coordinator: %s", err)
