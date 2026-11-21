"""Spot price forecast beyond the published day-ahead horizon."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from custom_components.oig_cloud.battery_forecast.data.price_forecast import (
    ForecastLedger,
    extend_with_forecast,
    parse_forecast,
)
from custom_components.oig_cloud.pricing.price_formula import (
    export_price_15min,
    import_price_15min,
)

TZ = ZoneInfo("Europe/Prague")
OPTIONS = {
    "spot_pricing_model": "percentage",
    "spot_positive_fee_percent": 15.0,
    "distribution_fee_vt_kwh": 1.5,
    "distribution_fee_nt_kwh": 1.2,
    "vat_rate": 21.0,
    "export_pricing_model": "percentage",
    "export_fee_percent": 15.0,
}


def _entry(start: datetime, minutes: int, value: float):
    return {
        "start": start.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        "end": (start + timedelta(minutes=minutes)).astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        "value": value,
    }


T0 = datetime(2026, 11, 17, 0, 0, tzinfo=TZ)


def test_quarter_hour_entries_in_czk_per_kwh_pass_through():
    parsed = parse_forecast([_entry(T0, 15, 3.2), _entry(T0 + timedelta(minutes=15), 15, 3.4)], "CZK/kWh", None)
    assert parsed == [(T0, pytest.approx(3.2)), (T0 + timedelta(minutes=15), pytest.approx(3.4))]


def test_hourly_entries_spread_over_four_quarters():
    parsed = parse_forecast([_entry(T0, 60, 3.0)], "CZK/kWh", None)
    assert [p[0] for p in parsed] == [T0 + timedelta(minutes=15 * i) for i in range(4)]


@pytest.mark.parametrize(
    "unit, value, rate, expected",
    [
        ("EUR/kWh", 0.12, 24.5, 2.94),
        ("EUR/MWh", 120.0, 24.5, 2.94),
        ("CZK/MWh", 2940.0, None, 2.94),
    ],
)
def test_units_convert_to_czk_per_kwh(unit, value, rate, expected):
    parsed = parse_forecast([_entry(T0, 15, value)], unit, rate)
    assert parsed[0][1] == pytest.approx(expected)


def test_euro_without_a_rate_or_an_unknown_unit_gives_nothing():
    assert parse_forecast([_entry(T0, 15, 0.12)], "EUR/kWh", None) == []
    assert parse_forecast([_entry(T0, 15, 0.12)], "ct/kWh", 24.5) == []


def test_broken_entries_are_skipped():
    entries = [{"start": "nope", "end": "x", "value": 1}, {"start": None}, _entry(T0, 15, float("nan")), _entry(T0, 15, 3.0)]
    assert len(parse_forecast(entries, "CZK/kWh", None)) == 1


def _known(start: datetime, n: int, price: float = 6.0):
    return [{"time": (start + timedelta(minutes=15 * i)).strftime("%Y-%m-%dT%H:%M:%S"), "price": price} for i in range(n)]


def test_forecast_extends_the_timeline_after_the_last_published_slot():
    known_import = _known(T0 - timedelta(hours=1), 4)
    known_export = _known(T0 - timedelta(hours=1), 4, 2.0)
    parsed = [(T0 - timedelta(minutes=15), 9.9)] + [(T0 + timedelta(minutes=15 * i), 3.0) for i in range(8)]

    imp, exp, added = extend_with_forecast(
        known_import, known_export, parsed, OPTIONS, tz=TZ, horizon_end=T0 + timedelta(hours=1)
    )

    assert added == 4  # only after the last published slot, up to the horizon end
    assert imp[:4] == known_import
    new = imp[4:]
    assert [e["time"] for e in new] == [(T0 + timedelta(minutes=15 * i)).strftime("%Y-%m-%dT%H:%M:%S") for i in range(4)]
    assert all(e["estimated"] for e in new)
    # Through the same pricelist as the published prices.
    assert new[0]["price"] == import_price_15min(3.0, T0, OPTIONS)
    assert exp[4]["price"] == export_price_15min(3.0, T0, OPTIONS)
    assert exp[4]["estimated"] is True


def test_no_forecast_leaves_the_timeline_alone():
    known = _known(T0, 2)
    imp, exp, added = extend_with_forecast(known, list(known), [], OPTIONS, tz=TZ, horizon_end=T0 + timedelta(days=2))
    assert imp == known and added == 0


def test_ledger_scores_predictions_by_how_far_ahead_they_were():
    ledger = ForecastLedger()
    target = "2026-11-17T18:00:00"
    ledger.record(datetime(2026, 11, 16, 8, 0, tzinfo=TZ), {target: 8.0}, tz=TZ)   # 34 h ahead
    ledger.record(datetime(2026, 11, 17, 10, 0, tzinfo=TZ), {target: 9.0}, tz=TZ)  # 8 h ahead
    ledger.settle([{"time": target, "price": 10.0}])

    summary = ledger.summary()
    assert summary["24-36h"]["n"] == 1 and summary["24-36h"]["mae"] == pytest.approx(2.0)
    assert summary["0-12h"]["mae"] == pytest.approx(1.0)
    assert summary["0-12h"]["bias"] == pytest.approx(-1.0)
    # Settled slots leave the open predictions.
    assert ledger.open_count() == 0


def test_ledger_round_trips_through_storage_and_stays_bounded():
    ledger = ForecastLedger(max_open=3)
    now = datetime(2026, 11, 16, 8, 0, tzinfo=TZ)
    ledger.record(now, {f"2026-11-17T0{i}:00:00": 5.0 for i in range(6)}, tz=TZ)
    assert ledger.open_count() == 3
    copy = ForecastLedger.from_dict(ledger.as_dict())
    assert copy.open_count() == 3
