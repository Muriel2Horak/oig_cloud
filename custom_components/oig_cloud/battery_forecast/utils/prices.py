"""Spot price utility functions.

Provides helper functions for working with spot prices and finding
optimal charging intervals.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

_LOGGER = logging.getLogger(__name__)


def get_price_for_timestamp(
    timestamp: datetime,
    spot_prices: List[Dict[str, Any]],
) -> Optional[float]:
    """Get spot price for a given timestamp.

    Args:
        timestamp: Timestamp to look up price for
        spot_prices: List of spot price dicts with 'time' and 'price' keys

    Returns:
        Price in CZK/kWh or None if not found
    """
    if not spot_prices:
        return None

    for sp in spot_prices:
        try:
            sp_time = datetime.fromisoformat(sp["time"])
            # Handle timezone comparison
            if sp_time.tzinfo is None and timestamp.tzinfo is not None:
                sp_time = sp_time.replace(tzinfo=timestamp.tzinfo)
            elif sp_time.tzinfo is not None and timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=sp_time.tzinfo)

            if sp_time == timestamp:
                return sp.get("price")
        except (ValueError, KeyError, TypeError):
            continue

    return None


def find_cheap_intervals(
    spot_prices: List[Dict[str, Any]],
    max_count: int = 20,
    before_deadline: Optional[datetime] = None,
    exclude_indices: Optional[set] = None,
) -> List[Dict[str, Any]]:
    """Find cheapest intervals from spot prices.

    Args:
        spot_prices: List of spot price dicts
        max_count: Maximum number of intervals to return
        before_deadline: Only include intervals before this time
        exclude_indices: Set of indices to exclude

    Returns:
        List of dicts with index, time, and price sorted by price
    """
    if not spot_prices:
        return []

    exclude_indices = exclude_indices or set()
    candidates = []

    for i, sp in enumerate(spot_prices):
        if i in exclude_indices:
            continue

        try:
            sp_time = datetime.fromisoformat(sp["time"])

            if before_deadline:
                # Handle timezone
                if sp_time.tzinfo is None and before_deadline.tzinfo is not None:
                    sp_time = sp_time.replace(tzinfo=before_deadline.tzinfo)
                if sp_time >= before_deadline:
                    continue

            candidates.append(
                {
                    "index": i,
                    "time": sp["time"],
                    "price": sp.get("price", 0),
                }
            )
        except (ValueError, KeyError, TypeError):
            continue

    # Sort by price ascending
    candidates.sort(key=lambda x: x["price"])

    return candidates[:max_count]


def find_expensive_intervals(
    spot_prices: List[Dict[str, Any]],
    max_count: int = 10,
    threshold_percentile: float = 0.75,
) -> List[Dict[str, Any]]:
    """Find most expensive intervals (for battery discharge).

    Args:
        spot_prices: List of spot price dicts
        max_count: Maximum number of intervals to return
        threshold_percentile: Only include intervals above this percentile

    Returns:
        List of dicts with index, time, and price sorted by price desc
    """
    if not spot_prices:
        return []

    prices = [sp.get("price", 0) for sp in spot_prices]
    if not prices:
        return []

    # Calculate threshold
    sorted_prices = sorted(prices)
    threshold_idx = int(len(sorted_prices) * threshold_percentile)
    threshold = (
        sorted_prices[threshold_idx] if threshold_idx < len(sorted_prices) else 0
    )

    candidates = []
    for i, sp in enumerate(spot_prices):
        price = sp.get("price", 0)
        if price >= threshold:
            candidates.append(
                {
                    "index": i,
                    "time": sp["time"],
                    "price": price,
                }
            )

    # Sort by price descending
    candidates.sort(key=lambda x: x["price"], reverse=True)

    return candidates[:max_count]


def calculate_average_price(
    spot_prices: List[Dict[str, Any]],
    start_idx: int = 0,
    end_idx: Optional[int] = None,
) -> float:
    """Calculate average spot price over a range.

    Args:
        spot_prices: List of spot price dicts
        start_idx: Start index (inclusive)
        end_idx: End index (exclusive), None for all

    Returns:
        Average price in CZK/kWh
    """
    if not spot_prices:
        return 0.0

    end_idx = end_idx or len(spot_prices)
    prices = [sp.get("price", 0) for sp in spot_prices[start_idx:end_idx]]

    if not prices:
        return 0.0

    return sum(prices) / len(prices)


def classify_price_level(
    price: float,
    avg_price: float,
    cheap_threshold: float = 0.7,
    expensive_threshold: float = 1.3,
) -> str:
    """Classify price as low/medium/high relative to average.

    Args:
        price: Current price
        avg_price: Average price for comparison
        cheap_threshold: Price below avg*threshold is "low"
        expensive_threshold: Price above avg*threshold is "high"

    Returns:
        "low", "medium", or "high"
    """
    if avg_price <= 0:
        return "medium"

    ratio = price / avg_price

    if ratio <= cheap_threshold:
        return "low"
    elif ratio >= expensive_threshold:
        return "high"
    else:
        return "medium"


def find_cheap_window(
    spot_prices: List[Dict[str, Any]],
    window_hours: float,
    start_from: Optional[datetime] = None,
    end_before: Optional[datetime] = None,
) -> Tuple[Optional[int], Optional[int], float]:
    """Find cheapest continuous window of given length.

    Args:
        spot_prices: List of spot price dicts
        window_hours: Length of window in hours
        start_from: Only consider windows starting from this time
        end_before: Only consider windows ending before this time

    Returns:
        Tuple of (start_index, end_index, total_cost)
        Returns (None, None, inf) if no valid window found
    """
    if not spot_prices:
        return None, None, float("inf")

    intervals_needed = int(window_hours * 4)  # 4 intervals per hour
    if intervals_needed > len(spot_prices):
        return None, None, float("inf")

    best_start = None
    best_cost = float("inf")

    for start_idx in range(len(spot_prices) - intervals_needed + 1):
        # Check time constraints
        try:
            start_time = datetime.fromisoformat(spot_prices[start_idx]["time"])
            end_time = datetime.fromisoformat(
                spot_prices[start_idx + intervals_needed - 1]["time"]
            )

            if start_from:
                if start_time.tzinfo is None and start_from.tzinfo is not None:
                    start_time = start_time.replace(tzinfo=start_from.tzinfo)
                if start_time < start_from:
                    continue

            if end_before:
                if end_time.tzinfo is None and end_before.tzinfo is not None:
                    end_time = end_time.replace(tzinfo=end_before.tzinfo)
                if end_time >= end_before:
                    continue
        except (ValueError, KeyError):
            continue

        # Calculate window cost
        window_cost = sum(
            sp.get("price", 0)
            for sp in spot_prices[start_idx : start_idx + intervals_needed]
        )

        if window_cost < best_cost:
            best_cost = window_cost
            best_start = start_idx

    if best_start is None:
        return None, None, float("inf")

    return best_start, best_start + intervals_needed, best_cost


def get_price_statistics(
    spot_prices: List[Dict[str, Any]],
) -> Dict[str, float]:
    """Calculate price statistics.

    Args:
        spot_prices: List of spot price dicts

    Returns:
        Dict with min, max, avg, median prices
    """
    prices = [sp.get("price", 0) for sp in spot_prices if sp.get("price") is not None]

    if not prices:
        return {"min": 0, "max": 0, "avg": 0, "median": 0}

    sorted_prices = sorted(prices)
    n = len(sorted_prices)

    return {
        "min": sorted_prices[0],
        "max": sorted_prices[-1],
        "avg": sum(prices) / n,
        "median": (
            sorted_prices[n // 2]
            if n % 2
            else (sorted_prices[n // 2 - 1] + sorted_prices[n // 2]) / 2
        ),
    }
