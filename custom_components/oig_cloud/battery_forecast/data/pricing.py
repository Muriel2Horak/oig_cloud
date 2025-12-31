"""Spot/export price helpers for battery forecast."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from ..utils_common import get_tariff_for_datetime
from ...api.ote_api import OteApi
from ...const import OTE_SPOT_PRICE_CACHE_FILE

_LOGGER = logging.getLogger(__name__)


def calculate_final_spot_price(
    sensor: Any, raw_spot_price: float, target_datetime: datetime
) -> float:
    """Return final spot price including fees, distribution, and VAT."""
    config = (
        sensor._config_entry.options
        if sensor._config_entry.options
        else sensor._config_entry.data
    )

    pricing_model = config.get("spot_pricing_model", "percentage")
    positive_fee_percent = config.get("spot_positive_fee_percent", 15.0)
    negative_fee_percent = config.get("spot_negative_fee_percent", 9.0)
    fixed_fee_mwh = config.get("spot_fixed_fee_mwh", 0.0)
    distribution_fee_vt_kwh = config.get("distribution_fee_vt_kwh", 1.50)
    distribution_fee_nt_kwh = config.get("distribution_fee_nt_kwh", 1.20)
    vat_rate = config.get("vat_rate", 21.0)

    if pricing_model == "percentage":
        if raw_spot_price >= 0:
            commercial_price = raw_spot_price * (1 + positive_fee_percent / 100.0)
        else:
            commercial_price = raw_spot_price * (1 - negative_fee_percent / 100.0)
    else:
        fixed_fee_kwh = fixed_fee_mwh / 1000.0
        commercial_price = raw_spot_price + fixed_fee_kwh

    current_tariff = get_tariff_for_datetime(target_datetime, config)

    distribution_fee = (
        distribution_fee_vt_kwh
        if current_tariff == "VT"
        else distribution_fee_nt_kwh
    )

    price_without_vat = commercial_price + distribution_fee
    final_price = price_without_vat * (1 + vat_rate / 100.0)
    return round(final_price, 2)


async def get_spot_price_timeline(sensor: Any) -> List[Dict[str, Any]]:
    """Return 15-minute spot prices with fees applied."""
    if not sensor.coordinator:
        _LOGGER.warning("Coordinator not available in get_spot_price_timeline")
        spot_data = {}
    else:
        spot_data = sensor.coordinator.data.get("spot_prices", {})

    if not spot_data:
        spot_data = get_spot_data_from_price_sensor(sensor, price_type="spot") or {}

    if not spot_data and sensor._hass:
        spot_data = await get_spot_data_from_ote_cache(sensor) or {}

    if not spot_data:
        _LOGGER.warning("No spot price data available for forecast")
        return []

    raw_prices_dict = spot_data.get("prices15m_czk_kwh", {})

    if not raw_prices_dict:
        fallback = get_spot_data_from_price_sensor(sensor, price_type="spot") or {}
        if not fallback and sensor._hass:
            fallback = await get_spot_data_from_ote_cache(sensor) or {}
        raw_prices_dict = fallback.get("prices15m_czk_kwh", {}) if fallback else {}
        if not raw_prices_dict:
            _LOGGER.warning("No prices15m_czk_kwh in spot price data")
            return []

    timeline = []
    for timestamp_str, raw_spot_price in sorted(raw_prices_dict.items()):
        try:
            target_datetime = datetime.fromisoformat(timestamp_str)
            final_price = calculate_final_spot_price(sensor, raw_spot_price, target_datetime)
            timeline.append({"time": timestamp_str, "price": final_price})
        except ValueError:
            _LOGGER.warning("Invalid timestamp in spot prices: %s", timestamp_str)
            continue

    _LOGGER.info(
        "Loaded %s spot price points from coordinator (final price with fees)",
        len(timeline),
    )
    return timeline


async def get_export_price_timeline(sensor: Any) -> List[Dict[str, Any]]:
    """Return 15-minute export prices."""
    if not sensor.coordinator:
        _LOGGER.warning("Coordinator not available in get_export_price_timeline")
        spot_data = {}
    else:
        spot_data = sensor.coordinator.data.get("spot_prices", {})

    if not spot_data:
        spot_data = get_spot_data_from_price_sensor(sensor, price_type="export") or {}
    if not spot_data:
        spot_data = get_spot_data_from_price_sensor(sensor, price_type="spot") or {}
    if not spot_data and sensor._hass:
        spot_data = await get_spot_data_from_ote_cache(sensor) or {}

    if not spot_data:
        _LOGGER.warning("No spot price data available for export timeline")
        return []

    export_prices_dict = spot_data.get("export_prices15m_czk_kwh", {})

    if not export_prices_dict:
        _LOGGER.info("No direct export prices, calculating from spot prices")
        spot_prices_dict = spot_data.get("prices15m_czk_kwh", {})

        if not spot_prices_dict:
            fallback = get_spot_data_from_price_sensor(sensor, price_type="spot") or {}
            if not fallback and sensor._hass:
                fallback = await get_spot_data_from_ote_cache(sensor) or {}
            spot_prices_dict = (
                fallback.get("prices15m_czk_kwh", {})
                if isinstance(fallback, dict)
                else {}
            )
            if not spot_prices_dict:
                _LOGGER.warning("No prices15m_czk_kwh for export price calculation")
                return []

        config_entry = sensor.coordinator.config_entry if sensor.coordinator else None
        config = config_entry.options if config_entry else {}
        export_model = config.get("export_pricing_model", "percentage")
        export_fee = config.get("export_fee_percent", 15.0)

        export_prices_dict = {}
        for timestamp_str, spot_price in spot_prices_dict.items():
            if export_model == "percentage":
                export_price = spot_price * (1 - export_fee / 100)
            else:
                export_price = max(0, spot_price - export_fee)
            export_prices_dict[timestamp_str] = export_price

    timeline = []
    for timestamp_str, price in sorted(export_prices_dict.items()):
        try:
            datetime.fromisoformat(timestamp_str)
            timeline.append({"time": timestamp_str, "price": price})
        except ValueError:
            _LOGGER.warning("Invalid timestamp in export prices: %s", timestamp_str)
            continue

    _LOGGER.info("Loaded %s export price points from coordinator", len(timeline))
    return timeline


def get_spot_data_from_price_sensor(
    sensor: Any, *, price_type: str
) -> Optional[Dict[str, Any]]:
    """Read spot price data from the price sensor entity."""
    hass = sensor._hass
    if not hass:
        return None

    if price_type == "export":
        sensor_id = f"sensor.oig_{sensor._box_id}_export_price_current_15min"
    else:
        sensor_id = f"sensor.oig_{sensor._box_id}_spot_price_current_15min"

    try:
        component = None
        entity_components = hass.data.get("entity_components") if isinstance(hass.data, dict) else None
        if isinstance(entity_components, dict):
            component = entity_components.get("sensor")

        if component is None:
            component = hass.data.get("sensor") if isinstance(hass.data, dict) else None

        entity_obj = None
        if component is not None:
            get_entity = getattr(component, "get_entity", None)
            if callable(get_entity):
                entity_obj = get_entity(sensor_id)

        if entity_obj is None and component is not None:
            entities = getattr(component, "entities", None)
            if isinstance(entities, list):
                for ent in entities:
                    if getattr(ent, "entity_id", None) == sensor_id:
                        entity_obj = ent
                        break

        if entity_obj is None:
            return None

        spot_data = getattr(entity_obj, "_spot_data_15min", None)
        if isinstance(spot_data, dict) and spot_data:
            return spot_data
    except Exception as err:
        _LOGGER.debug("Failed to read spot data from %s: %s", sensor_id, err)

    return None


async def get_spot_data_from_ote_cache(sensor: Any) -> Optional[Dict[str, Any]]:
    """Load spot prices via OTE cache storage."""
    hass = sensor._hass
    if not hass:
        return None
    try:
        cache_path = hass.config.path(".storage", OTE_SPOT_PRICE_CACHE_FILE)
        ote = OteApi(cache_path=cache_path)
        try:
            await ote.async_load_cached_spot_prices()
            data = await ote.get_spot_prices()
            return data if isinstance(data, dict) and data else None
        finally:
            await ote.close()
    except Exception as err:
        _LOGGER.debug("Failed to load OTE spot prices from cache: %s", err)
        return None
