"""Senzory pro spotové ceny elektřiny z OTE (spot 15min)."""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from homeassistant.config_entries import ConfigEntry

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
        device_info: Dict[str, Any],
    ) -> None:
        super().__init__(coordinator, entry, sensor_type, device_info)
        self._data_hash: Optional[str] = None

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
        """Získat tarif (VT/NT) pro daný datetime - kopie z analytics sensoru."""
        dual_tariff_enabled = self._entry.options.get("dual_tariff_enabled", True)
        if not dual_tariff_enabled:
            return "VT"

        vt_hours = self._parse_tariff_times(
            self._entry.options.get("vt_hours", "")
        )
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

    def _calculate_final_price_15min(
        self, spot_price_czk: float, target_datetime: datetime
    ) -> float:
        """Vypočítat finální cenu včetně obchodních a distribučních poplatků a DPH."""
        options = self._entry.options

        pricing_model = options.get("spot_pricing_model", "percentage")
        positive_fee_percent = options.get("spot_positive_fee_percent", 15.0)
        negative_fee_percent = options.get("spot_negative_fee_percent", 9.0)
        fixed_fee_mwh = options.get("spot_fixed_fee_mwh", 0.0)
        distribution_fee_vt_kwh = options.get("distribution_fee_vt_kwh", 1.50)
        distribution_fee_nt_kwh = options.get("distribution_fee_nt_kwh", 1.20)
        vat_rate = options.get("vat_rate", 21.0)

        if pricing_model == "percentage":
            if spot_price_czk >= 0:
                commercial_price = spot_price_czk * (1 + positive_fee_percent / 100.0)
            else:
                commercial_price = spot_price_czk * (1 - negative_fee_percent / 100.0)
        elif pricing_model == "fixed_prices":
            fixed_price_vt = options.get("fixed_commercial_price_vt", 4.50)
            fixed_price_nt = options.get("fixed_commercial_price_nt", fixed_price_vt)
            current_tariff = self._get_tariff_for_datetime(target_datetime)
            commercial_price = (
                fixed_price_vt if current_tariff == "VT" else fixed_price_nt
            )
        else:
            fixed_fee_kwh = fixed_fee_mwh / 1000.0
            commercial_price = spot_price_czk + fixed_fee_kwh

        current_tariff = self._get_tariff_for_datetime(target_datetime)
        distribution_fee = (
            distribution_fee_vt_kwh
            if current_tariff == "VT"
            else distribution_fee_nt_kwh
        )

        price_without_vat = commercial_price + distribution_fee
        return round(price_without_vat * (1 + vat_rate / 100.0), 2)

    @property
    def state(self) -> Optional[float]:
        """Aktuální finální cena pro 15min interval včetně distribuce a DPH."""
        if self._cached_state is not None or self._cached_attributes:
            return self._cached_state
        return self._calculate_current_state()

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Cached attributes to avoid expensive work on every state update."""
        if self._cached_attributes:
            return self._cached_attributes
        return self._calculate_attributes()

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
