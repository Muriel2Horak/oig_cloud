"""Adaptive solar forecast correction based on historical accuracy.

This module tracks forecast vs actual solar production and applies
a monthly correction factor to improve forecast accuracy.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)

DATE_FMT = "%Y-%m-%d"

# Minimum days of data before applying correction
MIN_DAYS_FOR_CORRECTION = 7

# Maximum correction factor (prevent over-correction)
MAX_CORRECTION_FACTOR = 1.5
MIN_CORRECTION_FACTOR = 0.3

# Default correction for new installations (conservative)
DEFAULT_CORRECTION_FACTOR = 0.75

# How many days of history to use for monthly bias
LOOKBACK_DAYS = 30


def record_forecast_accuracy(
    storage_data: Dict[str, Any],
    date_str: str,
    forecast_kwh: float,
    actual_kwh: float,
) -> None:
    """Record forecast vs actual for a given day."""
    if "forecast_accuracy" not in storage_data:
        storage_data["forecast_accuracy"] = {}

    accuracy = storage_data["forecast_accuracy"]

    if date_str not in accuracy:
        accuracy[date_str] = {}

    accuracy[date_str] = {
        "forecast_kwh": round(forecast_kwh, 2),
        "actual_kwh": round(actual_kwh, 2),
        "ratio": round(actual_kwh / forecast_kwh, 4) if forecast_kwh > 0 else None,
        "recorded_at": dt_util.now().isoformat(),
    }

    # Cleanup old entries (keep 90 days)
    cutoff = (dt_util.now().date() - timedelta(days=90)).strftime(DATE_FMT)
    old_dates = [d for d in accuracy if d < cutoff]
    for old_date in old_dates:
        del accuracy[old_date]


def compute_correction_factor(
    storage_data: Dict[str, Any],
    lookback_days: int = LOOKBACK_DAYS,
) -> float:
    """Compute correction factor from historical accuracy data.

    Returns a multiplier to apply to the Solcast forecast.
    - factor < 1.0: Solcast over-forecasts (multiply down)
    - factor > 1.0: Solcast under-forecasts (multiply up)
    - factor = 1.0: no correction needed
    """
    accuracy = storage_data.get("forecast_accuracy", {})
    if not accuracy:
        _LOGGER.debug(
            "[ForecastAccuracy] No historical data, using default factor %.2f",
            DEFAULT_CORRECTION_FACTOR,
        )
        return DEFAULT_CORRECTION_FACTOR

    cutoff = (dt_util.now().date() - timedelta(days=lookback_days)).strftime(DATE_FMT)
    recent = {
        date: entry
        for date, entry in accuracy.items()
        if date >= cutoff and entry.get("ratio") is not None
    }

    if len(recent) < MIN_DAYS_FOR_CORRECTION:
        _LOGGER.debug(
            "[ForecastAccuracy] Only %d days of data (need %d), using default factor %.2f",
            len(recent),
            MIN_DAYS_FOR_CORRECTION,
            DEFAULT_CORRECTION_FACTOR,
        )
        return DEFAULT_CORRECTION_FACTOR

    ratios = [entry["ratio"] for entry in recent.values() if entry["ratio"] > 0]

    if not ratios:
        return DEFAULT_CORRECTION_FACTOR

    # Use median ratio (more robust than mean against outliers)
    sorted_ratios = sorted(ratios)
    n = len(sorted_ratios)
    if n % 2 == 0:
        median_ratio = (sorted_ratios[n // 2 - 1] + sorted_ratios[n // 2]) / 2
    else:
        median_ratio = sorted_ratios[n // 2]

    # Clamp to prevent extreme corrections
    factor = max(MIN_CORRECTION_FACTOR, min(MAX_CORRECTION_FACTOR, median_ratio))

    _LOGGER.info(
        "[ForecastAccuracy] Computed correction factor: %.3f "
        "(from %d days, median ratio=%.3f, range=[%.3f, %.3f])",
        factor,
        len(ratios),
        median_ratio,
        min(ratios),
        max(ratios),
    )

    return factor


def compute_monthly_bias(
    storage_data: Dict[str, Any],
) -> Dict[str, float]:
    """Compute bias per month from historical data.

    Returns dict mapping month (MM) to average bias percentage.
    Positive = over-forecast, Negative = under-forecast.
    """
    accuracy = storage_data.get("forecast_accuracy", {})
    if not accuracy:
        return {}

    monthly: Dict[str, List[float]] = {}
    for date, entry in accuracy.items():
        if entry.get("ratio") is None:
            continue
        month = date[5:7]  # Extract MM
        ratio = entry["ratio"]
        if ratio > 0:
            bias_pct = (1.0 - ratio) * 100  # Convert ratio to bias %
            if month not in monthly:
                monthly[month] = []
            monthly[month].append(bias_pct)

    result = {}
    for month, biases in monthly.items():
        if len(biases) >= 3:  # Need at least 3 days for reliable estimate
            result[month] = round(sum(biases) / len(biases), 1)

    return result


def apply_correction_to_forecast(
    solar_kwh_list: List[float],
    correction_factor: float,
) -> List[float]:
    """Apply correction factor to solar forecast list."""
    if correction_factor == 1.0:
        return solar_kwh_list

    corrected = [kwh * correction_factor for kwh in solar_kwh_list]

    _LOGGER.debug(
        "[ForecastAccuracy] Applied correction factor %.3f to %d intervals "
        "(original total=%.1f kWh, corrected total=%.1f kWh)",
        correction_factor,
        len(solar_kwh_list),
        sum(solar_kwh_list),
        sum(corrected),
    )

    return corrected
