"""Final import and export price of one 15-minute slot from the spot price.

One formula for every place that turns a spot price into what the household
pays or earns: the published-price sensors and the price forecast
(battery_forecast/data/price_forecast.py).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Mapping

from ..battery_forecast.utils_common import get_tariff_for_datetime


def import_price_15min(
    spot_price_czk: float, target_datetime: datetime, options: Mapping[str, Any]
) -> float:
    """Vypočítat finální cenu včetně obchodních a distribučních poplatků a DPH."""

    pricing_model = options.get("spot_pricing_model", "percentage")
    positive_fee_percent = options.get("spot_positive_fee_percent", 15.0)
    negative_fee_percent = options.get("spot_negative_fee_percent", 9.0)
    fixed_fee_mwh = options.get("spot_fixed_fee_mwh", 0.0)
    positive_fee_percent_nt = options.get(
        "spot_positive_fee_percent_nt", positive_fee_percent
    )
    negative_fee_percent_nt = options.get(
        "spot_negative_fee_percent_nt", negative_fee_percent
    )
    fixed_fee_mwh_nt = options.get("spot_fixed_fee_mwh_nt", fixed_fee_mwh)
    distribution_fee_vt_kwh = options.get("distribution_fee_vt_kwh", 1.50)
    distribution_fee_nt_kwh = options.get("distribution_fee_nt_kwh", 1.20)
    vat_rate = options.get("vat_rate", 21.0)

    current_tariff = get_tariff_for_datetime(target_datetime, options)

    if pricing_model == "percentage":
        if spot_price_czk >= 0:
            fee_percent = (
                positive_fee_percent_nt
                if current_tariff == "NT"
                else positive_fee_percent
            )
            commercial_price = spot_price_czk * (1 + fee_percent / 100.0)
        else:
            fee_percent = (
                negative_fee_percent_nt
                if current_tariff == "NT"
                else negative_fee_percent
            )
            commercial_price = spot_price_czk * (1 - fee_percent / 100.0)
    elif pricing_model == "fixed_prices":
        fixed_price_vt = options.get("fixed_commercial_price_vt", 4.50)
        fixed_price_nt = options.get("fixed_commercial_price_nt", fixed_price_vt)
        commercial_price = (
            fixed_price_vt if current_tariff == "VT" else fixed_price_nt
        )
    else:
        fee_mwh = (
            fixed_fee_mwh_nt if current_tariff == "NT" else fixed_fee_mwh
        )
        fixed_fee_kwh = fee_mwh / 1000.0
        commercial_price = spot_price_czk + fixed_fee_kwh

    distribution_fee = (
        distribution_fee_vt_kwh
        if current_tariff == "VT"
        else distribution_fee_nt_kwh
    )

    price_without_vat = commercial_price + distribution_fee
    return round(price_without_vat * (1 + vat_rate / 100.0), 2)


def export_price_15min(
    spot_price_czk: float, target_datetime: datetime, options: Mapping[str, Any]
) -> float:
    """Vypočítat výkupní cenu BEZ distribuce a BEZ DPH.

    Výkupní cena = Spotová cena - Poplatek za prodej (% nebo fixní)
    """

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

    current_tariff = get_tariff_for_datetime(target_datetime, options)

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
