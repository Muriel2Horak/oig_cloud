"""Senzory pro spotové ceny elektřiny z OTE (export 15min)."""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.device_registry import DeviceInfo

from ..pricing.spot_price_15min_base import BasePrice15MinSensor

_LOGGER = logging.getLogger(__name__)


class ExportPrice15MinSensor(BasePrice15MinSensor):
    """Senzor pro výkupní cenu elektřiny s 15minutovým intervalem (BEZ DPH, BEZ distribuce)."""

    _log_label = "15min export price"

    def __init__(
        self,
        coordinator: Any,
        entry: ConfigEntry,
        sensor_type: str,
        device_info: DeviceInfo,
    ) -> None:
        super().__init__(coordinator, entry, sensor_type, device_info)

    @property
    def device_info(self) -> Any:
        return self._analytics_device_info

    async def _on_remove_hook(self) -> None:
        await self._ote_api.close()

    def _calculate_interval_price(
        self, spot_price_czk: float, target_datetime: datetime
    ) -> float:
        return self._calculate_export_price_15min(spot_price_czk, target_datetime)

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
        return {
            "current_datetime": now.strftime("%Y-%m-%d %H:%M"),
            "source": "OTE_WSDL_API_QUARTER_HOUR",
            "interval_type": "QUARTER_HOUR",
            "current_interval": current_interval,
            "current_price": current_price,
            "next_price": next_price,
            "next_update": next_update.isoformat(),
            "intervals_count": len(future_prices),
            "last_update": (
                self._last_update.isoformat() if self._last_update else None
            ),
            "note": "Export prices WITHOUT VAT and WITHOUT distribution fees",
            "price_min": round(min(future_prices), 2) if future_prices else None,
            "price_max": round(max(future_prices), 2) if future_prices else None,
            "price_avg": (
                round(sum(future_prices) / len(future_prices), 2)
                if future_prices
                else None
            ),
            "currency": "CZK/kWh",
            "api_endpoint": (
                f"/api/oig_cloud/spot_prices/{self._resolve_box_id()}/intervals?type=export"
            ),
            "api_note": "Full intervals data available via API endpoint (reduces sensor size by 95%)",
        }

    def _calculate_export_price_15min(
        self, spot_price_czk: float, target_datetime: datetime
    ) -> float:
        """Vypočítat výkupní cenu BEZ distribuce a BEZ DPH.

        Výkupní cena = Spotová cena - Poplatek za prodej (% nebo fixní)
        """
        options = self._entry.options

        pricing_model: str = options.get("export_pricing_model", "percentage")
        export_fee_percent: float = options.get("export_fee_percent", 15.0)
        export_fixed_fee_czk: float = options.get("export_fixed_fee_czk", 0.20)
        export_fixed_price: float = options.get("export_fixed_price", 2.50)
        export_fee_percent_nt: float = options.get(
            "export_fee_percent_nt", export_fee_percent
        )
        export_fixed_fee_czk_nt: float = options.get(
            "export_fixed_fee_czk_nt", export_fixed_fee_czk
        )

        current_tariff = self._get_tariff_for_datetime(target_datetime)

        if pricing_model == "percentage":
            fee_percent = (
                export_fee_percent_nt
                if current_tariff == "NT"
                else export_fee_percent
            )
            export_price = spot_price_czk * (1 - fee_percent / 100.0)
        elif pricing_model == "fixed_prices":
            export_price = export_fixed_price
        else:
            fixed_fee = (
                export_fixed_fee_czk_nt
                if current_tariff == "NT"
                else export_fixed_fee_czk
            )
            export_price = spot_price_czk - fixed_fee

        return round(export_price, 2)

    def _get_tariff_for_datetime(self, target_datetime: datetime) -> str:
        """Get tariff (VT/NT) for a given datetime - mirrors SpotPrice15MinSensor."""
        dual_tariff_enabled = self._entry.options.get("dual_tariff_enabled", True)
        if not dual_tariff_enabled:
            return "VT"

        vt_hours = self._parse_tariff_times(self._entry.options.get("vt_hours", ""))
        if not vt_hours:
            return "VT"

        hour = target_datetime.hour
        return "VT" if hour in vt_hours else "NT"

    def _parse_tariff_times(self, time_str: str) -> list[int]:
        """Parse tariff times string to list of hours."""
        if not time_str:
            return []
        try:
            return [int(x.strip()) for x in time_str.split(",") if x.strip()]
        except ValueError:
            return []
