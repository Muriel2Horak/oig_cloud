"""Shared base for 15-minute spot price sensors."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any, Dict, Optional

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.event import async_track_time_change
from homeassistant.util.dt import now as dt_now

from ..api.ote_api import OteApi
from ..entities.base_sensor import OigCloudSensor
from ..sensors.SENSOR_TYPES_SPOT import SENSOR_TYPES_SPOT
from .spot_price_shared import (
    DAILY_FETCH_HOUR,
    DAILY_FETCH_MINUTE,
    _ote_cache_path,
    _resolve_box_id_from_coordinator,
    get_retry_delay_seconds,
    schedule_daily_fetch,
    schedule_retry_task,
)

_LOGGER = logging.getLogger(__name__)

if TYPE_CHECKING:

    class RestoreEntityBase:
        async def async_get_last_state(self) -> Any: ...

else:
    from homeassistant.helpers.restore_state import RestoreEntity as RestoreEntityBase


class BasePrice15MinSensor(OigCloudSensor, RestoreEntityBase):
    """Base sensor for 15-minute spot/export pricing sensors."""

    _log_label: str = "15min price"
    _attr_should_poll = False

    def __getattribute__(self, name: str) -> Any:
        if name == "state":
            cached_state = object.__getattribute__(self, "_cached_state")
            spot_data = object.__getattribute__(self, "_spot_data_15min")
            if cached_state is None:
                object.__getattribute__(self, "_refresh_cached_state_and_attributes")()
                cached_state = object.__getattribute__(self, "_cached_state")
            elif spot_data:
                object.__getattribute__(self, "_refresh_cached_state_and_attributes")()
                cached_state = object.__getattribute__(self, "_cached_state")
            return cached_state
        if name == "extra_state_attributes":
            cached_attrs = object.__getattribute__(self, "_cached_attributes")
            spot_data = object.__getattribute__(self, "_spot_data_15min")
            if not cached_attrs and spot_data:
                object.__getattribute__(self, "_refresh_cached_state_and_attributes")()
                cached_attrs = object.__getattribute__(self, "_cached_attributes")
            elif not cached_attrs and object.__getattribute__(self, "_cached_state") is None:
                object.__getattribute__(self, "_refresh_cached_state_and_attributes")()
                cached_attrs = object.__getattribute__(self, "_cached_attributes")
            return cached_attrs
        return super().__getattribute__(name)

    def __init__(
        self,
        coordinator: Any,
        entry: ConfigEntry,
        sensor_type: str,
        device_info: DeviceInfo,
    ) -> None:
        super().__init__(coordinator, sensor_type)

        self._sensor_type: str = sensor_type
        self._sensor_config: Dict[str, Any] = SENSOR_TYPES_SPOT.get(sensor_type, {})
        self._entry: ConfigEntry = entry
        self._analytics_device_info: DeviceInfo = device_info
        cache_path = _ote_cache_path(coordinator.hass)
        self._ote_api: OteApi = OteApi(cache_path=cache_path)

        self._spot_data_15min: Dict[str, Any] = {}
        self._last_update: Optional[datetime] = None
        self._track_time_interval_remove: Optional[Any] = None
        self._track_15min_remove: Optional[Any] = None
        self._retry_remove: Optional[Any] = None
        self._retry_attempt: int = 0
        self._cached_state: Optional[float] = None
        self._cached_attributes: Dict[str, Any] = {}

        box_id = self._resolve_box_id()
        base = self._sensor_config.get("name", self._sensor_type)
        self._attr_name = f"OIG {box_id} {base}" if box_id != "unknown" else f"OIG {base}"
        self._attr_icon = self._sensor_config.get("icon", "mdi:flash")
        self._attr_native_unit_of_measurement = self._sensor_config.get(
            "unit_of_measurement"
        )
        self._attr_device_class = self._sensor_config.get("device_class")
        self._attr_state_class = self._sensor_config.get("state_class")
        self._attr_unique_id = f"oig_cloud_{box_id}_{self._sensor_type}"
        self._attr_device_info = device_info

        self._refresh_cached_state_and_attributes()

    def _resolve_box_id(self) -> str:
        box_id = _resolve_box_id_from_coordinator(self.coordinator)
        if box_id != "unknown":
            return box_id
        info = getattr(self, "_analytics_device_info", None)
        if isinstance(info, dict):
            identifiers = info.get("identifiers")
            if isinstance(identifiers, set):
                for ident in identifiers:
                    if (
                        isinstance(ident, tuple)
                        and len(ident) >= 2
                        and isinstance(ident[1], str)
                    ):
                        return ident[1]
        return box_id

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA - nastavit tracking a stáhnout data."""
        await super().async_added_to_hass()
        self._setup_daily_tracking()
        self._setup_15min_tracking()

        if not hasattr(self.hass, "loop_thread_id"):
            await self._async_initialize_after_add()
            return

        startup_task = self.hass.async_create_task(self._async_initialize_after_add())
        if startup_task is None:
            await self._async_initialize_after_add()
        elif asyncio.iscoroutine(startup_task):
            await startup_task

    async def _async_initialize_after_add(self) -> None:
        await self._ote_api.async_load_cached_spot_prices()

        _LOGGER.info(
            "[%s] %s sensor added to HA - starting data fetch",
            self.entity_id,
            self._log_label,
        )

        await self._restore_data()

        now = dt_now()
        current_minutes = now.hour * 60 + now.minute
        daily_update_time = DAILY_FETCH_HOUR * 60 + DAILY_FETCH_MINUTE

        if current_minutes < daily_update_time:
            try:
                await self._fetch_spot_data_with_retry()
            except Exception as e:  # pragma: no cover - safety net
                _LOGGER.error("[%s] Error in initial data fetch: %s", self.entity_id, e)

        self._refresh_cached_state_and_attributes()
        if hasattr(self.hass, "loop_thread_id"):
            self.async_write_ha_state()

    async def _restore_data(self) -> None:
        """Obnovení dat z uloženého stavu."""
        old_state = await self.async_get_last_state()
        if old_state and old_state.attributes:
            try:
                if "last_update" in old_state.attributes:
                    self._last_update = datetime.fromisoformat(
                        old_state.attributes["last_update"]
                    )
                _LOGGER.info("[%s] Restored %s data", self.entity_id, self._log_label)
            except Exception as e:
                _LOGGER.error("[%s] Error restoring data: %s", self.entity_id, e)

    @callback
    def _handle_coordinator_update(self) -> None:
        """Sync 15min spot data z coordinatoru."""
        try:
            if self.coordinator.data and "spot_prices" in self.coordinator.data:
                spot_data = self.coordinator.data["spot_prices"]
                if spot_data:
                    self._spot_data_15min = spot_data
                    self._last_update = dt_now()
                    self._refresh_cached_state_and_attributes()
                    intervals = len(spot_data.get("prices15m_czk_kwh", {}))
                    _LOGGER.debug(
                        "[%s] Synced %s from coordinator (%s intervals)",
                        self.entity_id,
                        self._log_label,
                        intervals,
                    )
        except Exception as err:
            _LOGGER.debug(
                "[%s] Failed to sync %s from coordinator: %s",
                self.entity_id,
                self._log_label,
                err,
            )

        super()._handle_coordinator_update()

    def _setup_daily_tracking(self) -> None:
        """Nastavení denního stahování dat ve 13:00 s retry."""
        self._track_time_interval_remove = schedule_daily_fetch(
            self.hass, self._fetch_spot_data_with_retry
        )

    def _setup_15min_tracking(self) -> None:
        """Nastavení aktualizace každých 15 minut (00, 15, 30, 45)."""
        self._track_15min_remove = async_track_time_change(
            self.hass,
            self._update_current_interval,
            minute=[0, 15, 30, 45],
            second=5,
        )

    async def _update_current_interval(self, *_: Any) -> None:
        """Aktualizace stavu senzoru při změně 15min intervalu."""
        _LOGGER.debug("[%s] Updating current 15min interval", self.entity_id)
        self._refresh_cached_state_and_attributes()
        self.async_write_ha_state()
        if self.hass and self.coordinator:
            self.hass.async_create_task(self.coordinator.async_request_refresh())

    async def async_will_remove_from_hass(self) -> None:
        """Cleanup při odstranění senzoru."""
        await super().async_will_remove_from_hass()
        if self._track_time_interval_remove:
            self._track_time_interval_remove()
        if self._track_15min_remove:
            self._track_15min_remove()
        self._cancel_retry_timer()
        await self._on_remove_hook()

    async def _on_remove_hook(self) -> None:
        """Optional hook for subclasses."""

    async def _fetch_spot_data_with_retry(self, *_: Any) -> None:
        """Jednorázový fetch + plánování dalších pokusů až do úspěchu."""
        success = await self._do_fetch_15min_data()
        if success:
            self._retry_attempt = 0
            self._cancel_retry_timer()
        else:
            self._schedule_retry(self._do_fetch_15min_data)

    async def _do_fetch_15min_data(self) -> bool:
        """Stáhne data, vrátí True při úspěchu, jinak False."""
        try:
            _LOGGER.info(
                "[%s] Fetching %s - attempt %s",
                self.entity_id,
                self._log_label,
                self._retry_attempt + 1,
            )

            spot_data = await self._ote_api.get_spot_prices()

            if spot_data and "prices15m_czk_kwh" in spot_data:
                self._spot_data_15min = spot_data
                self._last_update = dt_now()
                self._refresh_cached_state_and_attributes()

                intervals_count = len(spot_data.get("prices15m_czk_kwh", {}))
                _LOGGER.info(
                    "[%s] %s successful - %s intervals",
                    self.entity_id,
                    self._log_label,
                    intervals_count,
                )

                self.async_write_ha_state()
                await self.coordinator.async_request_refresh()

                if self._ote_api._is_cache_valid():
                    return True
                _LOGGER.info(
                    "[%s] Data received but incomplete, will retry",
                    self.entity_id,
                )
                return False

            _LOGGER.warning(
                "[%s] No %s on attempt %s",
                self.entity_id,
                self._log_label,
                self._retry_attempt + 1,
            )
        except Exception as e:  # pragma: no cover - safety net
            _LOGGER.error(
                "[%s] Error fetching %s on attempt %s: %s",
                self.entity_id,
                self._log_label,
                self._retry_attempt + 1,
                e,
            )

        return False

    def _schedule_retry(self, fetch_coro) -> None:
        """Naplánuje další pokus podle retry schématu."""
        delay = get_retry_delay_seconds(self._retry_attempt)
        self._retry_attempt += 1
        _LOGGER.info(
            "[%s] Retrying in %s minutes (attempt %s)",
            self.entity_id,
            delay // 60,
            self._retry_attempt,
        )

        self._cancel_retry_timer()
        self._retry_remove = schedule_retry_task(
            self.hass, fetch_coro, delay, _LOGGER, self.entity_id
        )

    def _cancel_retry_timer(self) -> None:
        """Zruší naplánovaný retry task, pokud existuje."""
        if self._retry_remove:
            if not self._retry_remove.done():
                self._retry_remove.cancel()
            self._retry_remove = None

    def _get_current_interval_index(self, now: datetime) -> int:
        """Vrátí index 15min intervalu (0-95) pro daný čas."""
        return OteApi.get_current_15min_interval(now)

    def _refresh_cached_state_and_attributes(self) -> None:
        """Recompute cached state/attributes to avoid heavy work in properties."""
        self._cached_state = self._calculate_current_state()
        self._cached_attributes = self._calculate_attributes()
        self._attr_native_value = self._cached_state
        self._attr_extra_state_attributes = self._cached_attributes

    def _calculate_current_state(self) -> Optional[float]:
        """Compute current price for the active 15min interval."""
        try:
            if not self._spot_data_15min:
                return None

            now = dt_now()
            interval_index = self._get_current_interval_index(now)

            spot_price_czk = OteApi.get_15min_price_for_interval(
                interval_index, self._spot_data_15min, now.date()
            )
            if spot_price_czk is None:
                return None

            return self._calculate_interval_price(spot_price_czk, now)

        except Exception as e:  # pragma: no cover - safety net
            _LOGGER.error("[%s] Error computing state: %s", self.entity_id, e)
            return None

    def _calculate_attributes(self) -> Dict[str, Any]:
        """Compute attributes summary for 15min prices."""
        attrs: Dict[str, Any] = {}

        try:
            if (
                not self._spot_data_15min
                or "prices15m_czk_kwh" not in self._spot_data_15min
            ):
                return attrs

            now = dt_now()
            current_interval_index = self._get_current_interval_index(now)
            prices_15m = self._spot_data_15min["prices15m_czk_kwh"]

            future_prices = []
            current_price: Optional[float] = None
            next_price: Optional[float] = None

            for time_key, spot_price_czk in sorted(prices_15m.items()):
                dt_naive = datetime.fromisoformat(time_key)
                dt = (
                    dt_naive.replace(tzinfo=now.tzinfo)
                    if dt_naive.tzinfo is None
                    else dt_naive
                )
                interval_end = dt + timedelta(minutes=15)
                if interval_end <= now:
                    continue

                price_value = self._calculate_interval_price(spot_price_czk, dt)
                future_prices.append(price_value)

                if current_price is None:
                    current_price = price_value
                elif next_price is None:
                    next_price = price_value

            next_interval = (current_interval_index + 1) % 96
            next_hour = next_interval // 4
            next_minute = (next_interval % 4) * 15
            next_update = now.replace(
                hour=next_hour, minute=next_minute, second=0, microsecond=0
            )
            if next_interval == 0:
                next_update = next_update + timedelta(days=1)

            attrs = self._build_attributes(
                now=now,
                current_interval=current_interval_index,
                current_price=current_price,
                next_price=next_price,
                next_update=next_update,
                future_prices=future_prices,
            )
        except Exception as e:  # pragma: no cover - safety net
            _LOGGER.error("[%s] Error building attributes: %s", self.entity_id, e)

        return attrs

    def _build_attributes(
        self,
        *,
        now: datetime,
        current_interval: int,
        current_price: Optional[float],
        next_price: Optional[float],
        next_update: datetime,
        future_prices: list[float],
    ) -> Dict[str, Any]:
        """Subclasses provide their attribute payload."""
        return {}

    def _calculate_interval_price(self, spot_price_czk: float, target_datetime: datetime) -> float:
        """Subclasses provide pricing calculation."""
        raise NotImplementedError
