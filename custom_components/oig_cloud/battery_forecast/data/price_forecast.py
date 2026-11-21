"""Spot price forecast beyond the published day-ahead horizon.

OTE publishes tomorrow's prices around 13:00, so in the morning the planner
sees only until midnight. A forecast (Energy Price Forecast EU, MIT licensed,
zone CZ: the ``raw_forecast`` attribute of its "Price forecast series" sensor,
a list of ``{"start", "end", "value"}`` in the sensor's unit) fills the slots
OTE has not published yet. They go through the same pricelist as published
prices (``pricing.price_formula``) and are marked ``estimated``.

``ForecastLedger`` keeps what the forecast said for slots not yet published
and, once OTE publishes them, scores it by how far ahead it was made: the
shadow mode that has to show the forecast is good enough before the planner
relies on it.

Pure: lists, dicts and datetimes.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta, tzinfo
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

from ...pricing.price_formula import export_price_15min, import_price_15min

SLOT = timedelta(minutes=15)
_TIME_FMT = "%Y-%m-%dT%H:%M:%S"
# Horizon buckets for scoring (hours ahead of the slot when it was forecast).
BUCKETS: Tuple[Tuple[int, int], ...] = ((0, 12), (12, 24), (24, 36), (36, 48), (48, 120))
# Open predictions kept for scoring: 120 h of quarter-hours, the longest
# horizon the forecast offers.
MAX_OPEN_PREDICTIONS = 480


def _parse_time(value: Any) -> Optional[datetime]:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else None


def _to_czk_per_kwh(value: float, unit: str, eur_czk: Optional[float]) -> Optional[float]:
    normalized = (unit or "").replace(" ", "").upper()
    if normalized in ("CZK/KWH", "KČ/KWH"):
        return value
    if normalized == "CZK/MWH":
        return value / 1000.0
    if normalized in ("EUR/KWH", "EUR/MWH"):
        if not eur_czk or eur_czk <= 0:
            return None
        per_kwh = value if normalized == "EUR/KWH" else value / 1000.0
        return per_kwh * eur_czk
    return None


def parse_forecast(
    entries: Any, unit: Optional[str], eur_czk: Optional[float]
) -> List[Tuple[datetime, float]]:
    """``(slot start, spot CZK/kWh)`` per quarter-hour; hourly entries spread."""
    result: List[Tuple[datetime, float]] = []
    for entry in entries if isinstance(entries, list) else []:
        if not isinstance(entry, Mapping):
            continue
        start, end = _parse_time(entry.get("start")), _parse_time(entry.get("end"))
        value = entry.get("value")
        if start is None or isinstance(value, bool) or not isinstance(value, (int, float)):
            continue
        if not math.isfinite(float(value)):
            continue
        czk = _to_czk_per_kwh(float(value), unit or "", eur_czk)
        if czk is None:
            continue
        span = (end - start) if end is not None and end > start else SLOT
        quarters = max(1, int(span / SLOT))
        for k in range(quarters):
            result.append((start + SLOT * k, czk))
    result.sort(key=lambda item: item[0])
    return result


def _local_key(when: datetime, tz: tzinfo) -> str:
    return when.astimezone(tz).strftime(_TIME_FMT)


def _parse_key(key: str, tz: tzinfo) -> Optional[datetime]:
    try:
        naive = datetime.strptime(str(key)[:19], _TIME_FMT)
    except ValueError:
        return None
    return naive.replace(tzinfo=tz)


def forecast_prices(
    parsed: Iterable[Tuple[datetime, float]], options: Mapping[str, Any], *, tz: tzinfo
) -> Dict[str, Tuple[float, float]]:
    """``{local time key: (import price, export price)}`` through the pricelist."""
    prices: Dict[str, Tuple[float, float]] = {}
    for start, spot in parsed:
        local = start.astimezone(tz)
        prices[_local_key(start, tz)] = (
            import_price_15min(spot, local, options),
            export_price_15min(spot, local, options),
        )
    return prices


def extend_with_forecast(
    spot_prices: Sequence[Dict[str, Any]],
    export_prices: Sequence[Dict[str, Any]],
    parsed: Iterable[Tuple[datetime, float]],
    options: Mapping[str, Any],
    *,
    tz: tzinfo,
    horizon_end: datetime,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], int]:
    """Published slots, then forecast slots after the last one, up to the end."""
    imports = list(spot_prices)
    exports = list(export_prices)
    last = _parse_key(imports[-1]["time"], tz) if imports else None
    added = 0
    for key, (import_price, export_price) in sorted(forecast_prices(parsed, options, tz=tz).items()):
        start = _parse_key(key, tz)
        if start is None or start >= horizon_end:
            continue
        if last is not None and start <= last:
            continue
        imports.append({"time": key, "price": import_price, "estimated": True})
        exports.append({"time": key, "price": export_price, "estimated": True})
        added += 1
    return imports, exports, added


def _bucket(hours_ahead: float) -> Optional[str]:
    for low, high in BUCKETS:
        if low <= hours_ahead < high:
            return f"{low}-{high}h"
    return None


class ForecastLedger:
    """Predictions for unpublished slots, scored once OTE publishes them."""

    def __init__(self, max_open: int = MAX_OPEN_PREDICTIONS) -> None:
        self._max_open = max_open
        # slot key -> bucket -> predicted import price
        self._open: Dict[str, Dict[str, float]] = {}
        # bucket -> [count, sum abs error, sum error]
        self._stats: Dict[str, List[float]] = {}

    def record(self, now: datetime, predictions: Mapping[str, float], *, tz: tzinfo) -> None:
        for key, price in predictions.items():
            start = _parse_key(key, tz)
            if start is None or start <= now:
                continue
            bucket = _bucket((start - now).total_seconds() / 3600.0)
            if bucket is None:
                continue
            self._open.setdefault(key, {})[bucket] = float(price)
        if len(self._open) > self._max_open:
            for key in sorted(self._open)[: len(self._open) - self._max_open]:
                del self._open[key]

    def settle(self, published: Iterable[Mapping[str, Any]]) -> int:
        settled = 0
        for point in published:
            if point.get("estimated"):
                continue
            key = str(point.get("time"))[:19]
            predicted = self._open.pop(key, None)
            actual = point.get("price")
            if predicted is None or not isinstance(actual, (int, float)):
                continue
            for bucket, value in predicted.items():
                row = self._stats.setdefault(bucket, [0.0, 0.0, 0.0])
                error = value - float(actual)
                row[0] += 1
                row[1] += abs(error)
                row[2] += error
            settled += 1
        return settled

    def open_count(self) -> int:
        return len(self._open)

    def summary(self) -> Dict[str, Dict[str, float]]:
        return {
            bucket: {
                "n": int(row[0]),
                "mae": round(row[1] / row[0], 3),
                "bias": round(row[2] / row[0], 3),
            }
            for bucket, row in sorted(self._stats.items())
            if row[0]
        }

    def as_dict(self) -> Dict[str, Any]:
        return {"open": self._open, "stats": self._stats}

    @classmethod
    def from_dict(cls, data: Any, max_open: int = MAX_OPEN_PREDICTIONS) -> "ForecastLedger":
        ledger = cls(max_open=max_open)
        if isinstance(data, Mapping):
            ledger._open = {
                str(k): {str(b): float(v) for b, v in (row or {}).items()}
                for k, row in (data.get("open") or {}).items()
                if isinstance(row, Mapping)
            }
            ledger._stats = {
                str(b): [float(x) for x in row][:3]
                for b, row in (data.get("stats") or {}).items()
                if isinstance(row, list) and len(row) >= 3
            }
        return ledger
