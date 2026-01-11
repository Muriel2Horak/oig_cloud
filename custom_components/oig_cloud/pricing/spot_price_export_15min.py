"""Senzory pro spotové ceny elektřiny z OTE (export 15min)."""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from homeassistant.config_entries import ConfigEntry

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
        device_info: Dict[str, Any],
    ) -> None:
        super().__init__(coordinator, entry, sensor_type, device_info)

    async def _on_remove(self) -> None:
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

        if pricing_model == "percentage":
            export_price = spot_price_czk * (1 - export_fee_percent / 100.0)
        elif pricing_model == "fixed_prices":
            export_price = export_fixed_price
        else:
            export_price = spot_price_czk - export_fixed_fee_czk

        return round(export_price, 2)

    @property
    def state(self) -> Optional[float]:
        """Aktuální výkupní cena pro 15min interval (BEZ DPH, BEZ distribuce)."""
        return self._cached_state

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Cached attributes to avoid expensive work on every state update."""
        return self._cached_attributes

    @property
    def unique_id(self) -> str:
        """Jedinečné ID senzoru."""
        box_id = self._resolve_box_id()
        return f"oig_cloud_{box_id}_{self._sensor_type}"

    @property
    def device_info(self) -> Dict[str, Any]:
        """Vrátit analytics device info."""
        return self._analytics_device_info

    @property
    def should_poll(self) -> bool:
        """Nepoužívat polling - máme vlastní scheduler."""
        return False
