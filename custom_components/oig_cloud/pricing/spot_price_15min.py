"""Senzory pro spotové ceny elektřiny z OTE (spot 15min)."""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.device_registry import DeviceInfo

from ..battery_forecast.utils_common import get_tariff_for_datetime
from ..pricing.price_formula import import_price_15min
from ..pricing.spot_price_15min_base import BasePrice15MinSensor

_LOGGER = logging.getLogger(__name__)


class SpotPrice15MinSensor(BasePrice15MinSensor):
    """Senzor pro aktuální spotovou cenu s 15minutovým intervalem včetně finální ceny."""

    _log_label = "15min spot price"

    def __init__(
        self,
        coordinator: Any,
        entry: ConfigEntry,
        sensor_type: str,
        device_info: DeviceInfo,
    ) -> None:
        super().__init__(coordinator, entry, sensor_type, device_info)
        self._data_hash: Optional[str] = None

    @property
    def device_info(self) -> Any:
        return self._analytics_device_info

    def _calculate_interval_price(
        self, spot_price_czk: float, target_datetime: datetime
    ) -> float:
        return self._calculate_final_price_15min(spot_price_czk, target_datetime)

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
            "current_tariff": self._get_tariff_for_datetime(now),
            "intervals_count": len(future_prices),
            "last_update": (
                self._last_update.isoformat() if self._last_update else None
            ),
            "price_min": round(min(future_prices), 2) if future_prices else None,
            "price_max": round(max(future_prices), 2) if future_prices else None,
            "price_avg": (
                round(sum(future_prices) / len(future_prices), 2)
                if future_prices
                else None
            ),
            "currency": "CZK/kWh",
            "api_endpoint": (
                f"/api/oig_cloud/spot_prices/{self._resolve_box_id()}/intervals?type=spot"
            ),
            "api_note": "Full intervals data available via API endpoint (reduces sensor size by 95%)",
        }

    def _get_tariff_for_datetime(self, target_datetime: datetime) -> str:
        """Získat tarif (VT/NT) pro daný datetime."""
        return get_tariff_for_datetime(target_datetime, self._entry.options)

    def _calculate_final_price_15min(
        self, spot_price_czk: float, target_datetime: datetime
    ) -> float:
        """Vypočítat finální cenu včetně obchodních a distribučních poplatků a DPH."""
        return import_price_15min(spot_price_czk, target_datetime, self._entry.options)
