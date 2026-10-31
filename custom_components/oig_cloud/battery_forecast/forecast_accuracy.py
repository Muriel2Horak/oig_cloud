"""Historical solar forecast correction, learned from finished days.

The factor is the typical ratio of measured production to the raw forecast, so it
removes the forecast's systematic bias before planning. The same-day drift
correction then only handles what is left of today's error.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from statistics import median
from typing import Any, Dict, List

from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)

DATE_FMT = "%Y-%m-%d"

# A week of finished days, so a single sunny or overcast spell cannot set the factor.
MIN_DAYS_FOR_CORRECTION = 7

# Limits on the learned factor. Measured daily ratios stay well inside them; they
# only stop a run of bad readings from zeroing or doubling the forecast.
MAX_CORRECTION_FACTOR = 1.5
MIN_CORRECTION_FACTOR = 0.3

# Used until enough days are known. Measured on a real install over 15 days between
# 28. 9. and 28. 10. 2026: 158 kWh produced against 211 kWh forecast.
DEFAULT_CORRECTION_FACTOR = 0.75

# One month, so the factor follows the season rather than the whole year.
LOOKBACK_DAYS = 30

# Three lookback windows, enough to inspect how the factor developed.
RETENTION_DAYS = 90


def record_forecast_accuracy(
    storage_data: Dict[str, Any],
    date_str: str,
    forecast_kwh: float,
    actual_kwh: float,
) -> None:
    """Record forecast vs actual production of a finished day."""
    accuracy = storage_data.setdefault("forecast_accuracy", {})
    accuracy[date_str] = {
        "forecast_kwh": round(forecast_kwh, 2),
        "actual_kwh": round(actual_kwh, 2),
        "ratio": round(actual_kwh / forecast_kwh, 4),
        "recorded_at": dt_util.now().isoformat(),
    }

    cutoff = (dt_util.now().date() - timedelta(days=RETENTION_DAYS)).strftime(DATE_FMT)
    for old_date in [date for date in accuracy if date < cutoff]:
        del accuracy[old_date]


def compute_correction_factor(storage_data: Dict[str, Any]) -> float:
    """Multiplier for the raw forecast: below 1.0 when it tends to over-forecast."""
    accuracy = storage_data.get("forecast_accuracy") or {}
    cutoff = (dt_util.now().date() - timedelta(days=LOOKBACK_DAYS)).strftime(DATE_FMT)
    ratios = [
        entry["ratio"]
        for date, entry in accuracy.items()
        if date >= cutoff and entry.get("ratio")
    ]

    if len(ratios) < MIN_DAYS_FOR_CORRECTION:
        return DEFAULT_CORRECTION_FACTOR

    # Median, because one broken reading must not move the factor.
    return max(MIN_CORRECTION_FACTOR, min(MAX_CORRECTION_FACTOR, median(ratios)))


def apply_correction_to_forecast(
    solar_kwh_list: List[float],
    correction_factor: float,
) -> List[float]:
    """Scale every interval of the solar forecast."""
    return [kwh * correction_factor for kwh in solar_kwh_list]
