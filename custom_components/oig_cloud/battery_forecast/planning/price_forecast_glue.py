"""The spot price forecast in the planner cycle: shadow scoring or use.

Reads the forecast sensor chosen in ``price_forecast_entity`` (Energy Price
Forecast EU's "Price forecast series"). In every mode but ``off`` it records
what the forecast says about slots OTE has not published yet and scores
earlier predictions against the prices OTE did publish. Only in ``on`` does
the planner get the forecast slots, marked ``estimated``, up to 48 hours.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from ...const import (
    CONF_PRICE_FORECAST_ENTITY,
    CONF_PRICE_FORECAST_MODE,
    DEFAULT_PRICE_FORECAST_MODE,
)
from ..data.price_forecast import (
    ForecastLedger,
    extend_with_forecast,
    forecast_prices,
    parse_forecast,
)

_LOGGER = logging.getLogger(__name__)

# The free forecast reaches 48 hours; the planner's DP is sized for that.
FORECAST_HORIZON = timedelta(hours=48)
# The ledger changes every cycle; write it at most every five minutes.
LEDGER_SAVE_DELAY_S = 300


def _float_state(hass: Any, entity_id: str) -> Optional[float]:
    state = hass.states.get(entity_id)
    try:
        return float(state.state) if state is not None else None
    except (TypeError, ValueError):
        return None


async def _ledger(sensor: Any, hass: Any) -> Tuple[ForecastLedger, Any]:
    ledger = getattr(sensor, "_price_forecast_ledger", None)
    store = getattr(sensor, "_price_forecast_store", None)
    if ledger is None or store is None:
        store = Store(hass, version=1, key=f"oig_cloud.price_forecast_{sensor._box_id}")
        try:
            data = await store.async_load()
        except Exception as err:  # unreadable store: start a fresh ledger
            _LOGGER.debug("Price forecast ledger not loaded: %s", err)
            data = None
        ledger = ForecastLedger.from_dict(data)
        sensor._price_forecast_ledger = ledger
        sensor._price_forecast_store = store
    return ledger, store


async def async_apply_price_forecast(
    sensor: Any,
    spot_prices: List[Dict[str, Any]],
    export_prices: List[Dict[str, Any]],
    *,
    now: Optional[datetime] = None,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    options = dict(getattr(getattr(sensor, "_config_entry", None), "options", None) or {})
    entity_id = options.get(CONF_PRICE_FORECAST_ENTITY) or ""
    mode = str(options.get(CONF_PRICE_FORECAST_MODE, DEFAULT_PRICE_FORECAST_MODE))
    if not entity_id or mode == "off":
        return spot_prices, export_prices
    hass = getattr(sensor, "hass", None) or getattr(sensor, "_hass", None)
    now = now or dt_util.now()
    tz = dt_util.get_default_time_zone()
    summary: Dict[str, Any] = {"mode": mode, "entity": entity_id, "forecast_slots": 0, "used_slots": 0}
    sensor._price_forecast_summary = summary

    state = hass.states.get(entity_id) if hass is not None else None
    if state is None or state.state in ("unavailable", "unknown"):
        summary["issue"] = "entity_unavailable"
        return spot_prices, export_prices

    parsed = parse_forecast(
        state.attributes.get("raw_forecast"),
        state.attributes.get("unit_of_measurement"),
        _float_state(hass, f"sensor.oig_{sensor._box_id}_eur_czk_exchange_rate"),
    )
    published = {str(point.get("time"))[:19] for point in spot_prices}
    predictions = {
        key: prices[0]
        for key, prices in forecast_prices(parsed, options, tz=tz).items()
        if key not in published
    }
    summary["forecast_slots"] = len(predictions)

    ledger, store = await _ledger(sensor, hass)
    ledger.settle(spot_prices)
    ledger.record(now, predictions, tz=tz)
    store.async_delay_save(ledger.as_dict, LEDGER_SAVE_DELAY_S)
    summary["open_predictions"] = ledger.open_count()
    summary["accuracy"] = ledger.summary()

    if mode != "on" or not parsed:
        return spot_prices, export_prices
    extended_spot, extended_export, added = extend_with_forecast(
        spot_prices, export_prices, parsed, options, tz=tz, horizon_end=now + FORECAST_HORIZON
    )
    summary["used_slots"] = added
    return extended_spot, extended_export
