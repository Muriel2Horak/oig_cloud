"""Senzory pro spotové ceny elektřiny z OTE."""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union

from homeassistant.core import callback
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.util.dt import now as dt_now
from homeassistant.config_entries import ConfigEntry

from .oig_cloud_sensor import OigCloudSensor
from .api.ote_api import OteApi
from .sensors.SENSOR_TYPES_SPOT import SENSOR_TYPES_SPOT

_LOGGER = logging.getLogger(__name__)


class ExportPrice15MinSensor(OigCloudSensor, RestoreEntity):
    """Senzor pro výkupní cenu elektřiny s 15minutovým intervalem (BEZ DPH, BEZ distribuce)."""

    def __init__(
        self,
        coordinator: Any,
        entry: ConfigEntry,
        sensor_type: str,
        device_info: Dict[str, Any],
    ) -> None:
        """Initialize the export price sensor."""
        super().__init__(coordinator, sensor_type)

        self._sensor_type: str = sensor_type
        self._sensor_config: Dict[str, Any] = SENSOR_TYPES_SPOT.get(sensor_type, {})
        self._entry: ConfigEntry = entry
        self._analytics_device_info: Dict[str, Any] = device_info
        self._ote_api: OteApi = OteApi()

        self._spot_data_15min: Dict[str, Any] = {}
        self._last_update: Optional[datetime] = None
        self._track_time_interval_remove: Optional[Any] = None
        self._track_15min_remove: Optional[Any] = None

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA - nastavit tracking a stáhnout data."""
        await super().async_added_to_hass()

        _LOGGER.info(
            f"[{self.entity_id}] 15min export price sensor added to HA - starting data fetch"
        )

        # Obnovit data ze stavu
        await self._restore_data()

        # Nastavit pravidelné stahování (denně v 13:30)
        self._setup_daily_tracking()

        # Nastavit aktualizaci každých 15 minut
        self._setup_15min_tracking()

        # Okamžitě stáhnout aktuální data
        try:
            await self._fetch_spot_data_with_retry()
        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error in initial data fetch: {e}")

    async def _restore_data(self) -> None:
        """Obnovení dat z uloženého stavu."""
        old_state = await self.async_get_last_state()
        if old_state and old_state.attributes:
            try:
                if "last_update" in old_state.attributes:
                    self._last_update = datetime.fromisoformat(
                        old_state.attributes["last_update"]
                    )
                _LOGGER.info(f"[{self.entity_id}] Restored 15min export price data")
            except Exception as e:
                _LOGGER.error(f"[{self.entity_id}] Error restoring data: {e}")

    def _setup_daily_tracking(self) -> None:
        """Nastavení denního stahování dat v 13:30."""
        now = dt_now()
        current_minutes = now.hour * 60 + now.minute
        daily_update_time = 13 * 60 + 30  # 13:30

        if current_minutes > daily_update_time:
            self.hass.async_create_task(self._fetch_spot_data_with_retry())

        self._track_time_interval_remove = async_track_time_change(
            self.hass,
            self._fetch_spot_data_with_retry,
            hour=13,
            minute=30,
            second=0,
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
        _LOGGER.debug(f"[{self.entity_id}] Updating current 15min interval")
        self.async_write_ha_state()
        # Trigger coordinator refresh aby se aktualizovaly všechny závislé senzory
        await self.coordinator.async_request_refresh()

    async def async_will_remove_from_hass(self) -> None:
        """Cleanup při odstranění senzoru."""
        await super().async_will_remove_from_hass()

        if self._track_time_interval_remove:
            self._track_time_interval_remove()

        if self._track_15min_remove:
            self._track_15min_remove()

    async def _fetch_spot_data_with_retry(self, *_: Any) -> None:
        """Stažení 15min spotových cen s retry logikou."""
        max_retries: int = 6
        retry_delay: int = 600  # 10 minut

        for attempt in range(max_retries):
            try:
                _LOGGER.info(
                    f"[{self.entity_id}] Fetching 15min spot data - attempt {attempt + 1}/{max_retries}"
                )

                spot_data = await self._ote_api.get_spot_prices()

                if spot_data and "prices15m_czk_kwh" in spot_data:
                    self._spot_data_15min = spot_data
                    self._last_update = dt_now()

                    intervals_count = len(spot_data.get("prices15m_czk_kwh", {}))
                    _LOGGER.info(
                        f"[{self.entity_id}] 15min spot data successful - {intervals_count} intervals"
                    )

                    # Aktualizovat stav tohoto senzoru
                    self.async_write_ha_state()

                    # Trigger coordinator refresh pro všechny závislé senzory
                    await self.coordinator.async_request_refresh()

                    return

                else:
                    _LOGGER.warning(
                        f"[{self.entity_id}] No 15min data on attempt {attempt + 1}"
                    )

            except Exception as e:
                _LOGGER.error(
                    f"[{self.entity_id}] Error fetching 15min data on attempt {attempt + 1}: {e}"
                )

            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)

        _LOGGER.error(
            f"[{self.entity_id}] Failed to fetch 15min data after {max_retries} attempts"
        )

    def _get_current_interval_index(self, now: datetime) -> int:
        """Vrátí index 15min intervalu (0-95) pro daný čas."""
        return OteApi.get_current_15min_interval(now)

    def _calculate_export_price_15min(
        self, spot_price_czk: float, target_datetime: datetime
    ) -> float:
        """Vypočítat výkupní cenu BEZ distribuce a BEZ DPH.

        Výkupní cena = Spotová cena - Poplatek za prodej (% nebo fixní)
        """
        options = self._entry.options

        # Parametry z konfigurace
        pricing_model: str = options.get("export_pricing_model", "percentage")
        export_fee_percent: float = options.get("export_fee_percent", 15.0)
        export_fixed_fee_czk: float = options.get("export_fixed_fee_czk", 0.20)

        # Výpočet výkupní ceny
        if pricing_model == "percentage":
            # Dostaneme X% ze spotové ceny (obvykle 85-90%)
            # Např: 100% - 15% = 85% ze spotové ceny
            export_price = spot_price_czk * (1 - export_fee_percent / 100.0)
        else:  # fixed
            # Odečteme fixní poplatek
            export_price = spot_price_czk - export_fixed_fee_czk

        # ŽÁDNÉ DPH - jako neplatíme neplatíme DPH z výkupu
        # ŽÁDNÁ DISTRIBUCE - výkupní cena není zatížená distribucí

        return round(export_price, 2)

    @property
    def state(self) -> Optional[float]:
        """Aktuální výkupní cena pro 15min interval (BEZ DPH, BEZ distribuce)."""
        try:
            if not self._spot_data_15min:
                return None

            now = dt_now()
            interval_index = self._get_current_interval_index(now)

            # Získat raw spotovou cenu z dat (CZK/kWh z OTE)
            spot_price_czk = OteApi.get_15min_price_for_interval(
                interval_index, self._spot_data_15min, now.date()
            )

            if spot_price_czk is None:
                return None

            # Vypočítat výkupní cenu
            export_price = self._calculate_export_price_15min(spot_price_czk, now)

            return export_price

        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error getting state: {e}")
            return None

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Atributy s budoucími výkupními cenami."""
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

            # Ukládat pouze budoucí intervaly (včetně aktuálního)
            intervals_data = []

            for time_key, spot_price_czk in sorted(prices_15m.items()):
                try:
                    # OPRAVA: Parse datetime a přidat timezone info
                    dt_naive = datetime.fromisoformat(time_key)
                    dt = (
                        dt_naive.replace(tzinfo=now.tzinfo)
                        if dt_naive.tzinfo is None
                        else dt_naive
                    )

                    # Přeskočit uplynulé intervaly
                    if dt < now:
                        continue

                    # Vypočítat výkupní cenu pro tento interval
                    export_price = self._calculate_export_price_15min(
                        spot_price_czk, dt
                    )

                    interval_data = {
                        "date": dt.strftime("%Y-%m-%d"),
                        "time": dt.strftime("%H:%M"),
                        "price": export_price,  # Výkupní cena
                        "spot_price": round(
                            spot_price_czk, 2
                        ),  # Raw spotová cena pro porovnání
                    }

                    intervals_data.append(interval_data)

                except Exception as e:
                    _LOGGER.debug(f"Error processing interval {time_key}: {e}")
                    continue

            # Metadata
            next_interval = (current_interval_index + 1) % 96
            next_hour = next_interval // 4
            next_minute = (next_interval % 4) * 15
            next_update = now.replace(
                hour=next_hour, minute=next_minute, second=0, microsecond=0
            )
            if next_interval == 0:
                next_update += timedelta(days=1)

            # Rychlý přístup k aktuální a příští ceně
            current_price: Optional[float] = None
            next_price: Optional[float] = None
            if len(intervals_data) > 0:
                current_price = intervals_data[0]["price"]
                if len(intervals_data) > 1:
                    next_price = intervals_data[1]["price"]

            attrs = {
                "current_datetime": now.strftime("%Y-%m-%d %H:%M"),
                "source": "OTE_WSDL_API_QUARTER_HOUR",
                "interval_type": "QUARTER_HOUR",
                "current_interval": current_interval_index,
                "current_price": current_price,
                "next_price": next_price,
                "next_update": next_update.isoformat(),
                "intervals_count": len(intervals_data),
                "prices": intervals_data,
                "last_update": (
                    self._last_update.isoformat() if self._last_update else None
                ),
                "note": "Export prices WITHOUT VAT and WITHOUT distribution fees",
            }

        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error building attributes: {e}")

        return attrs

    @property
    def unique_id(self) -> str:
        """Jedinečné ID senzoru."""
        if self.coordinator.data:
            box_id = list(self.coordinator.data.keys())[0]
            return f"{box_id}_{self._sensor_type}"
        return f"export_price_{self._sensor_type}"

    @property
    def device_info(self) -> Dict[str, Any]:
        """Vrátit analytics device info."""
        return self._analytics_device_info

    @property
    def should_poll(self) -> bool:
        """Nepoužívat polling - máme vlastní scheduler."""
        return False


class SpotPrice15MinSensor(OigCloudSensor, RestoreEntity):
    """Senzor pro aktuální spotovou cenu s 15minutovým intervalem včetně finální ceny."""

    def __init__(
        self,
        coordinator: Any,
        entry: ConfigEntry,
        sensor_type: str,
        device_info: Dict[str, Any],
    ) -> None:
        # OPRAVA: Volat super().__init__() pouze s coordinator a sensor_type
        super().__init__(coordinator, sensor_type)

        self._sensor_type = sensor_type
        self._sensor_config = SENSOR_TYPES_SPOT.get(sensor_type, {})
        self._entry = entry
        # OPRAVA: Uložit device_info pro použití v property (ne _attr_device_info!)
        self._analytics_device_info = device_info
        self._ote_api = OteApi()

        self._spot_data_15min: Dict[str, Any] = {}
        self._last_update: Optional[datetime] = None
        self._track_time_interval_remove = None
        self._track_15min_remove = None

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA - nastavit tracking a stáhnout data."""
        await super().async_added_to_hass()

        _LOGGER.info(
            f"[{self.entity_id}] 15min spot price sensor added to HA - starting data fetch"
        )

        # Obnovit data ze stavu
        await self._restore_data()

        # Nastavit pravidelné stahování (denně v 13:30)
        self._setup_daily_tracking()

        # Nastavit aktualizaci každých 15 minut
        self._setup_15min_tracking()

        # Okamžitě stáhnout aktuální data
        try:
            await self._fetch_spot_data_with_retry()
        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error in initial data fetch: {e}")

    async def _restore_data(self) -> None:
        """Obnovení dat z uloženého stavu."""
        old_state = await self.async_get_last_state()
        if old_state and old_state.attributes:
            try:
                if "last_update" in old_state.attributes:
                    self._last_update = datetime.fromisoformat(
                        old_state.attributes["last_update"]
                    )
                _LOGGER.info(f"[{self.entity_id}] Restored 15min spot price data")
            except Exception as e:
                _LOGGER.error(f"[{self.entity_id}] Error restoring data: {e}")

    def _setup_daily_tracking(self) -> None:
        """Nastavení denního stahování dat v 13:30."""
        # Aktualizace jednou denně v 13:30 (po publikaci dat)
        now = dt_now()
        current_minutes = now.hour * 60 + now.minute
        daily_update_time = 13 * 60 + 30  # 13:30

        if current_minutes > daily_update_time:
            # Data pro dnešek už jsou k dispozici
            self.hass.async_create_task(self._fetch_spot_data_with_retry())

        # Nastavit denní aktualizaci v 13:30
        self._track_time_interval_remove = async_track_time_change(
            self.hass,
            self._fetch_spot_data_with_retry,
            hour=13,
            minute=30,
            second=0,
        )

    def _setup_15min_tracking(self) -> None:
        """Nastavení aktualizace každých 15 minut (00, 15, 30, 45)."""
        # Aktualizace každých 15 minut pro změnu aktuálního intervalu
        self._track_15min_remove = async_track_time_change(
            self.hass,
            self._update_current_interval,
            minute=[0, 15, 30, 45],
            second=5,  # 5 sekund po začátku intervalu
        )

    async def _update_current_interval(self, *_: Any) -> None:
        """Aktualizace stavu senzoru při změně 15min intervalu."""
        _LOGGER.debug(f"[{self.entity_id}] Updating current 15min interval")
        self.async_write_ha_state()
        # Trigger coordinator refresh aby se aktualizovaly všechny závislé senzory
        await self.coordinator.async_request_refresh()

    async def async_will_remove_from_hass(self) -> None:
        """Cleanup při odstranění senzoru."""
        await super().async_will_remove_from_hass()

        if self._track_time_interval_remove:
            self._track_time_interval_remove()

        if self._track_15min_remove:
            self._track_15min_remove()

    async def _fetch_spot_data_with_retry(self, *_: Any) -> None:
        """Stažení 15min spotových cen s retry logikou."""
        max_retries = 6
        retry_delay = 600  # 10 minut

        for attempt in range(max_retries):
            try:
                _LOGGER.info(
                    f"[{self.entity_id}] Fetching 15min spot data - attempt {attempt + 1}/{max_retries}"
                )

                spot_data = await self._ote_api.get_spot_prices()

                if spot_data and "prices15m_czk_kwh" in spot_data:
                    self._spot_data_15min = spot_data
                    self._last_update = dt_now()

                    intervals_count = len(spot_data.get("prices15m_czk_kwh", {}))
                    _LOGGER.info(
                        f"[{self.entity_id}] 15min spot data successful - {intervals_count} intervals"
                    )

                    # Aktualizovat stav tohoto senzoru
                    self.async_write_ha_state()

                    # Trigger coordinator refresh pro všechny závislé senzory
                    await self.coordinator.async_request_refresh()

                    return

                else:
                    _LOGGER.warning(
                        f"[{self.entity_id}] No 15min data on attempt {attempt + 1}"
                    )

            except Exception as e:
                _LOGGER.error(
                    f"[{self.entity_id}] Error fetching 15min data on attempt {attempt + 1}: {e}"
                )

            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)

        _LOGGER.error(
            f"[{self.entity_id}] Failed to fetch 15min data after {max_retries} attempts"
        )

    def _get_current_interval_index(self, now: datetime) -> int:
        """Vrátí index 15min intervalu (0-95) pro daný čas."""
        return OteApi.get_current_15min_interval(now)

    def _get_tariff_for_datetime(self, target_datetime: datetime) -> str:
        """Získat tarif (VT/NT) pro daný datetime - kopie z analytics sensoru."""
        dual_tariff_enabled = self._entry.options.get("dual_tariff_enabled", True)
        if not dual_tariff_enabled:
            return "VT"

        is_weekend = target_datetime.weekday() >= 5
        options = self._entry.options

        if is_weekend:
            nt_times = self._parse_tariff_times(
                options.get("tariff_nt_start_weekend", "0")
            )
            vt_times = self._parse_tariff_times(
                options.get("tariff_vt_start_weekend", "")
            )
        else:
            nt_times = self._parse_tariff_times(
                options.get("tariff_nt_start_weekday", "22,2")
            )
            vt_times = self._parse_tariff_times(
                options.get("tariff_vt_start_weekday", "6")
            )

        current_hour = target_datetime.hour
        last_tariff = "NT"
        last_hour = -1

        all_changes = []
        for hour in nt_times:
            all_changes.append((hour, "NT"))
        for hour in vt_times:
            all_changes.append((hour, "VT"))

        all_changes.sort(reverse=True)

        for hour, tariff in all_changes:
            if hour <= current_hour and hour > last_hour:
                last_tariff = tariff
                last_hour = hour

        return last_tariff

    def _parse_tariff_times(self, time_str: str) -> list[int]:
        """Parse tariff times string to list of hours."""
        if not time_str:
            return []
        try:
            return [int(x.strip()) for x in time_str.split(",") if x.strip()]
        except ValueError:
            return []

    def _calculate_final_price_15min(
        self, spot_price_czk: float, target_datetime: datetime
    ) -> float:
        """Vypočítat finální cenu včetně obchodních a distribučních poplatků a DPH."""
        options = self._entry.options

        # Parametry z konfigurace
        pricing_model = options.get("spot_pricing_model", "percentage")
        positive_fee_percent = options.get("spot_positive_fee_percent", 15.0)
        negative_fee_percent = options.get("spot_negative_fee_percent", 9.0)
        fixed_fee_mwh = options.get("spot_fixed_fee_mwh", 0.0)
        distribution_fee_vt_kwh = options.get("distribution_fee_vt_kwh", 1.50)
        distribution_fee_nt_kwh = options.get("distribution_fee_nt_kwh", 1.20)
        vat_rate = options.get("vat_rate", 21.0)
        dual_tariff_enabled = options.get("dual_tariff_enabled", True)

        # 1. Obchodní cena
        if pricing_model == "percentage":
            if spot_price_czk >= 0:
                commercial_price = spot_price_czk * (1 + positive_fee_percent / 100.0)
            else:
                commercial_price = spot_price_czk * (1 - negative_fee_percent / 100.0)
        else:  # fixed
            fixed_fee_kwh = fixed_fee_mwh / 1000.0
            commercial_price = spot_price_czk + fixed_fee_kwh

        # 2. Tarif pro distribuci
        current_tariff = self._get_tariff_for_datetime(target_datetime)

        # 3. Distribuční poplatek
        distribution_fee = (
            distribution_fee_vt_kwh
            if current_tariff == "VT"
            else distribution_fee_nt_kwh
        )

        # 4. Cena bez DPH
        price_without_vat = commercial_price + distribution_fee

        # 5. Finální cena s DPH
        return round(price_without_vat * (1 + vat_rate / 100.0), 2)

    @property
    def state(self) -> Optional[float]:
        """Aktuální finální cena pro 15min interval včetně distribuce a DPH."""
        try:
            if not self._spot_data_15min:
                return None

            now = dt_now()
            interval_index = self._get_current_interval_index(now)

            # Získat raw spotovou cenu z dat (CZK/kWh z OTE)
            spot_price_czk = OteApi.get_15min_price_for_interval(
                interval_index, self._spot_data_15min, now.date()
            )

            if spot_price_czk is None:
                return None

            # Vypočítat finální cenu včetně obchodní přirážky, distribuce a DPH
            final_price = self._calculate_final_price_15min(spot_price_czk, now)

            return final_price

        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error getting state: {e}")
            return None

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Všech 96 intervalů s finálními cenami a další metadata."""
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

            # OPRAVA: Ukládat pouze budoucí intervaly (včetně aktuálního)
            # Interval data - POUZE finální cena, tarif, datum a čas
            intervals_data = []

            for time_key, spot_price_czk in sorted(prices_15m.items()):
                try:
                    # Parse datetime z klíče
                    dt_naive = datetime.fromisoformat(time_key)
                    dt = (
                        dt_naive.replace(tzinfo=now.tzinfo)
                        if dt_naive.tzinfo is None
                        else dt_naive
                    )

                    # OPRAVA: Přeskočit uplynulé intervaly
                    if dt < now:
                        continue

                    # Vypočítat finální cenu pro tento interval
                    final_price = self._calculate_final_price_15min(spot_price_czk, dt)
                    tariff = self._get_tariff_for_datetime(dt)

                    # OPRAVA: Minimalistická data s datem
                    interval_data = {
                        "date": dt.strftime("%Y-%m-%d"),  # Datum pro rozlišení dnů
                        "time": dt.strftime("%H:%M"),  # HH:MM
                        "price": final_price,  # Finální cena
                        "tariff": tariff,  # VT/NT
                    }

                    intervals_data.append(interval_data)

                except Exception as e:
                    _LOGGER.debug(f"Error processing interval {time_key}: {e}")
                    continue

            # Metadata
            next_interval = (current_interval_index + 1) % 96
            next_hour = next_interval // 4
            next_minute = (next_interval % 4) * 15
            next_update = now.replace(
                hour=next_hour, minute=next_minute, second=0, microsecond=0
            )
            if next_interval == 0:
                next_update += timedelta(days=1)

            # OPRAVA: Přidat rychlý přístup k aktuální a příští ceně
            current_price = None
            next_price = None
            if len(intervals_data) > 0:
                current_price = intervals_data[0][
                    "price"
                ]  # První položka je vždy aktuální
                if len(intervals_data) > 1:
                    next_price = intervals_data[1]["price"]

            attrs = {
                "current_datetime": now.strftime("%Y-%m-%d %H:%M"),
                "source": "OTE_WSDL_API_QUARTER_HOUR",
                "interval_type": "QUARTER_HOUR",
                "current_interval": current_interval_index,
                "current_price": current_price,
                "next_price": next_price,
                "next_update": next_update.isoformat(),
                "current_tariff": self._get_tariff_for_datetime(now),
                "intervals_count": len(intervals_data),
                "prices": intervals_data,  # Pouze budoucí intervaly
                "last_update": (
                    self._last_update.isoformat() if self._last_update else None
                ),
            }

        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error building attributes: {e}")

        return attrs

    @property
    def unique_id(self) -> str:
        """Jedinečné ID senzoru."""
        if self.coordinator.data:
            box_id = list(self.coordinator.data.keys())[0]
            return f"{box_id}_{self._sensor_type}"
        return f"spot_price_{self._sensor_type}"

    @property
    def device_info(self) -> Dict[str, Any]:
        """Vrátit analytics device info místo vytváření nového zařízení."""
        return self._analytics_device_info

    @property
    def should_poll(self) -> bool:
        """Nepoužívat polling - máme vlastní scheduler."""
        return False


class SpotPriceSensor(OigCloudSensor, RestoreEntity):
    """Senzor pro spotové ceny elektřiny."""

    def __init__(self, coordinator: Any, sensor_type: str) -> None:
        super().__init__(coordinator, sensor_type)

        self._sensor_type = sensor_type
        self._sensor_config = SENSOR_TYPES_SPOT.get(sensor_type, {})
        self._ote_api = OteApi()

        self._spot_data: Dict[str, Any] = {}
        self._last_update: Optional[datetime] = None
        self._track_time_interval_remove = None

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle updated data from the coordinator."""
        # OPRAVA: Číst spot price data z coordinatoru
        if self.coordinator.data and "spot_prices" in self.coordinator.data:
            self._spot_data = self.coordinator.data["spot_prices"]
            self._last_update = dt_now()
            _LOGGER.debug(
                f"[{self.entity_id}] Updated spot price data from coordinator: "
                f"{self._spot_data.get('hours_count', 0)} hours"
            )
        super()._handle_coordinator_update()

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA - nastavit tracking a stáhnout data."""
        await super().async_added_to_hass()

        _LOGGER.info(
            f"[{self.entity_id}] Spot price sensor {self._sensor_type} added to HA - starting data fetch"
        )

        # Obnovit data ze stavu
        await self._restore_data()

        # Nastavit pravidelné stahování
        self._setup_time_tracking()

        # Okamžitě stáhnout aktuální data
        try:
            await self._fetch_spot_data_with_retry()
        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error in initial data fetch: {e}")

    async def _restore_data(self) -> None:
        """Obnovení dat z uloženého stavu."""
        old_state = await self.async_get_last_state()
        if old_state and old_state.attributes:
            try:
                if "last_update" in old_state.attributes:
                    self._last_update = datetime.fromisoformat(
                        old_state.attributes["last_update"]
                    )
                _LOGGER.info(f"[{self.entity_id}] Restored spot price data")
            except Exception as e:
                _LOGGER.error(f"[{self.entity_id}] Error restoring data: {e}")

    def _setup_time_tracking(self) -> None:
        """Nastavení pravidelného stahování dat - jednou denně po 13:00 s retry logikou."""
        # Aktualizace jednou denně v 13:30 (po publikaci dat)
        daily_update_time = 13 * 60 + 30  # 13:30 v minutách

        # Pokud je aktuální čas po 13:30, stáhneme data hned
        now = dt_now()
        current_minutes = now.hour * 60 + now.minute

        if current_minutes > daily_update_time:
            # Data pro dnešek už jsou k dispozici
            self.hass.async_create_task(self._fetch_spot_data_with_retry())

        # Nastavit denní aktualizaci v 13:30
        self._track_time_interval_remove = async_track_time_change(
            self.hass,
            self._fetch_spot_data_with_retry,
            hour=13,
            minute=30,
            second=0,
        )

    async def async_will_remove_from_hass(self) -> None:
        """Cleanup při odstranění senzoru."""
        await super().async_will_remove_from_hass()

        if self._track_time_interval_remove:
            self._track_time_interval_remove()

        await self._ote_api.close()

    async def _fetch_spot_data_with_retry(self, *_: Any) -> None:
        """Stažení spotových cen s retry logikou pokud data nejsou dostupná."""
        max_retries = 6  # Celkem 6 pokusů = 1 hodina (každých 10 minut)
        retry_delay = 600  # 10 minut v sekundách

        for attempt in range(max_retries):
            try:
                _LOGGER.info(
                    f"[{self.entity_id}] Fetching spot data - attempt {attempt + 1}/{max_retries}"
                )

                # Stáhnout spotové ceny
                spot_data = await self._ote_api.get_spot_prices()

                if spot_data and self._validate_spot_data(spot_data):
                    # Data jsou kompletní
                    self._spot_data = spot_data
                    self._last_update = dt_now()

                    hours_count = spot_data.get("hours_count", 0)
                    tomorrow_available = bool(spot_data.get("tomorrow_stats"))
                    _LOGGER.info(
                        f"[{self.entity_id}] Spot data successful - {hours_count} hours, tomorrow: {'yes' if tomorrow_available else 'no'}"
                    )

                    # Aktualizovat stav senzoru
                    self.async_write_ha_state()
                    return  # Úspěch - ukončit retry

                else:
                    _LOGGER.warning(
                        f"[{self.entity_id}] Incomplete spot data received on attempt {attempt + 1}"
                    )

            except Exception as e:
                _LOGGER.error(
                    f"[{self.entity_id}] Error fetching spot data on attempt {attempt + 1}: {e}"
                )

            # Pokud není poslední pokus, počkat před dalším
            if attempt < max_retries - 1:
                _LOGGER.info(
                    f"[{self.entity_id}] Retrying in {retry_delay // 60} minutes..."
                )
                await asyncio.sleep(retry_delay)

        # Všechny pokusy selhaly
        _LOGGER.error(
            f"[{self.entity_id}] Failed to fetch spot data after {max_retries} attempts"
        )

    def _validate_spot_data(self, data: Dict[str, Any]) -> bool:
        """Validace že data jsou kompletní a použitelná."""
        if not data:
            return False

        prices = data.get("prices_czk_kwh", {})
        if not prices:
            return False

        # Kontrola že máme alespoň nějaká data pro dnes
        today = dt_now().date()
        today_str = today.strftime("%Y-%m-%d")

        today_hours = [k for k in prices.keys() if k.startswith(today_str)]

        # Měli bychom mít alespoň 12 hodin dat (polovina dne)
        if len(today_hours) < 12:
            _LOGGER.debug(
                f"[{self.entity_id}] Insufficient data - only {len(today_hours)} hours for today"
            )
            return False

        # Kontrola že ceny nejsou nulové
        valid_prices = [v for v in prices.values() if v is not None and v > 0]
        if len(valid_prices) < len(today_hours) * 0.8:  # 80% cen musí být validních
            _LOGGER.debug(f"[{self.entity_id}] Too many invalid prices")
            return False

        return True

    # Legacy metoda - přesměrování na novou retry logiku
    async def _fetch_spot_data(self, *_: Any) -> None:
        """Legacy metoda - přesměrování na novou retry logiku."""
        await self._fetch_spot_data_with_retry()

    @property
    def name(self) -> str:
        """Jméno senzoru."""
        if self.coordinator.data:
            box_id = list(self.coordinator.data.keys())[0]
            return f"OIG {box_id} {self._sensor_config.get('name', self._sensor_type)}"
        return f"OIG {self._sensor_config.get('name', self._sensor_type)}"

    @property
    def icon(self) -> str:
        """Ikona senzoru."""
        return self._sensor_config.get("icon", "mdi:flash")

    @property
    def unit_of_measurement(self) -> Optional[str]:
        """Jednotka měření."""
        return self._sensor_config.get("unit_of_measurement")

    @property
    def device_class(self) -> Optional[str]:
        """Třída zařízení."""
        return self._sensor_config.get("device_class")

    @property
    def state_class(self) -> Optional[str]:
        """Třída stavu."""
        return self._sensor_config.get("state_class")

    @property
    def state(self) -> Optional[Union[float, int]]:
        """Hlavní stav senzoru - aktuální spotová cena."""
        try:
            if self._sensor_type == "spot_price_current_czk_kwh":
                return self._get_current_price_czk_kwh()
            elif self._sensor_type == "spot_price_current_eur_mwh":
                return self._get_current_price_eur_mwh()
            elif self._sensor_type == "spot_price_tomorrow_avg":
                return self._get_tomorrow_average()
            elif self._sensor_type == "spot_price_today_min":
                return self._get_today_min()
            elif self._sensor_type == "spot_price_today_max":
                return self._get_today_max()
            elif self._sensor_type == "spot_price_today_avg":
                return self._get_today_average()
            elif self._sensor_type == "spot_price_hourly_all":
                return self._get_current_price_czk_kwh()
        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error getting state: {e}")
            return None

        return None

    def _get_current_price_czk_kwh(self) -> Optional[float]:
        """Získání aktuální ceny v CZK/kWh."""
        if not self._spot_data or "prices_czk_kwh" not in self._spot_data:
            return None

        now = dt_now()
        current_hour_key = f"{now.strftime('%Y-%m-%d')}T{now.hour:02d}:00:00"

        return self._spot_data["prices_czk_kwh"].get(current_hour_key)

    def _get_current_price_eur_mwh(self) -> Optional[float]:
        """Získání aktuální ceny v EUR/MWh."""
        if not self._spot_data or "prices_eur_mwh" not in self._spot_data:
            return None

        now = dt_now()
        current_hour_key = f"{now.strftime('%Y-%m-%d')}T{now.hour:02d}:00:00"

        return self._spot_data["prices_eur_mwh"].get(current_hour_key)

    def _get_tomorrow_average(self) -> Optional[float]:
        """Získání průměrné ceny pro zítřek."""
        if (
            self._spot_data
            and "tomorrow_stats" in self._spot_data
            and self._spot_data["tomorrow_stats"]
        ):
            return self._spot_data["tomorrow_stats"].get("avg_czk")
        return None

    def _get_today_average(self) -> Optional[float]:
        """Průměrná cena dnes."""
        if self._spot_data and "today_stats" in self._spot_data:
            return self._spot_data["today_stats"].get("avg_czk")
        return None

    def _get_today_min(self) -> Optional[float]:
        """Minimální cena dnes."""
        if self._spot_data and "today_stats" in self._spot_data:
            return self._spot_data["today_stats"].get("min_czk")
        return None

    def _get_today_max(self) -> Optional[float]:
        """Maximální cena dnes."""
        if self._spot_data and "today_stats" in self._spot_data:
            return self._spot_data["today_stats"].get("max_czk")
        return None

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Dodatečné atributy senzoru."""
        attrs = {}

        if self._sensor_type == "spot_price_current_czk_kwh":
            # Aktuální cena + denní přehled
            if self._spot_data:
                attrs.update(
                    {
                        "today_avg_czk_kwh": self._get_today_average(),
                        "today_min_czk_kwh": self._get_today_min(),
                        "today_max_czk_kwh": self._get_today_max(),
                        "tomorrow_avg_czk_kwh": self._get_tomorrow_average(),
                    }
                )

                # Hodinové ceny pro dnes a zítřek
                attrs.update(self._get_hourly_prices())

        elif self._sensor_type == "spot_price_hourly_all":
            # Všechny dostupné hodinové ceny
            if self._spot_data:
                attrs.update(
                    {
                        "today_avg_czk_kwh": self._get_today_average(),
                        "today_min_czk_kwh": self._get_today_min(),
                        "today_max_czk_kwh": self._get_today_max(),
                        "tomorrow_avg_czk_kwh": self._get_tomorrow_average(),
                        "total_hours_available": len(
                            self._spot_data.get("prices_czk_kwh", {})
                        ),
                    }
                )

                # Všechny hodinové ceny zaokrouhlené na 2 desetinná místa
                attrs.update(self._get_all_hourly_prices())

        # Společné atributy
        attrs.update(
            {
                "last_update": (
                    self._last_update.isoformat() if self._last_update else None
                ),
                "source": "spotovaelektrina.cz",
            }
        )

        return attrs

    def _get_hourly_prices(self) -> Dict[str, Any]:
        """Hodinové ceny - jen dnes/zítřek pro UI."""
        if not self._spot_data or "prices_czk_kwh" not in self._spot_data:
            return {}

        # Jen základní data pro UI grafy
        now = dt_now()
        today_str = now.strftime("%Y-%m-%d")
        tomorrow_str = (now + timedelta(days=1)).strftime("%Y-%m-%d")

        today_prices = {}
        tomorrow_prices = {}

        for time_key, price in self._spot_data["prices_czk_kwh"].items():
            if time_key.startswith(today_str):
                hour = time_key[11:16]  # HH:MM
                today_prices[hour] = round(price, 3)
            elif time_key.startswith(tomorrow_str) and len(tomorrow_prices) < 24:
                hour = time_key[11:16]  # HH:MM
                tomorrow_prices[hour] = round(price, 3)

        return {
            "today_prices": today_prices,
            "tomorrow_prices": tomorrow_prices,
            "next_hour_price": self._get_next_hour_price(),
        }

    def _get_next_hour_price(self) -> Optional[float]:
        """Cena v příští hodině pro rychlé rozhodování."""
        if not self._spot_data or "prices_czk_kwh" not in self._spot_data:
            return None

        now = dt_now()
        next_hour = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        next_hour_key = next_hour.strftime("%Y-%m-%dT%H:00:00")

        return self._spot_data["prices_czk_kwh"].get(next_hour_key)

    def _get_all_hourly_prices(self) -> Dict[str, Any]:
        """Pouze základní statistiky - necháme historii na recorder."""
        if not self._spot_data or "prices_czk_kwh" not in self._spot_data:
            return {}

        prices = list(self._spot_data["prices_czk_kwh"].values())

        if not prices:
            return {}

        return {
            "price_summary": {
                "min": round(min(prices), 3),
                "max": round(max(prices), 3),
                "avg": round(sum(prices) / len(prices), 3),
                "current": self._get_current_price_czk_kwh(),
                "next": self._get_next_hour_price(),
            },
            "data_info": {
                "hours_available": len(prices),
                "last_update": (
                    self._last_update.isoformat() if self._last_update else None
                ),
                "coverage": "today + tomorrow" if len(prices) > 24 else "today only",
            },
        }

    @property
    def unique_id(self) -> str:
        """Jedinečné ID senzoru."""
        if self.coordinator.data:
            box_id = list(self.coordinator.data.keys())[0]
            return f"{box_id}_{self._sensor_type}"
        return f"spot_price_{self._sensor_type}"

    @property
    def device_info(self) -> Dict[str, Any]:
        """Informace o zařízení."""
        if self.coordinator.data:
            box_id = list(self.coordinator.data.keys())[0]
            return {
                "identifiers": {("oig_cloud", f"{box_id}_spot_prices")},
                "name": f"OIG {box_id} Spot Prices",
                "manufacturer": "OIG",
                "model": "Spot Price Analytics",
                "via_device": ("oig_cloud", box_id),
            }
        return {
            "identifiers": {("oig_cloud", "spot_prices")},
            "name": "OIG Spot Prices",
            "manufacturer": "OIG",
            "model": "Spot Price Analytics",
        }

    @property
    def should_poll(self) -> bool:
        """Nepoužívat polling - máme vlastní scheduler."""
        return False

    async def async_update(self) -> None:
        """Update senzoru."""
        self.async_write_ha_state()
