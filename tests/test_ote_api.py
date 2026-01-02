from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest

import custom_components.oig_cloud.api.ote_api as ote_module
from custom_components.oig_cloud.api.ote_api import OteApi


def test_get_current_15min_interval():
    ts = datetime(2025, 1, 1, 10, 31, 0)
    assert OteApi.get_current_15min_interval(ts) == 42


def test_get_15min_price_for_interval():
    spot_data = {
        "prices15m_czk_kwh": {
            "2025-01-01T10:30:00": 3.5,
        }
    }
    price = OteApi.get_15min_price_for_interval(
        42, spot_data, target_date=date(2025, 1, 1)
    )
    assert price == 3.5


def test_parse_period_interval_dst_suffix():
    api = OteApi()
    dt_utc = api._parse_period_interval(date(2025, 10, 26), "02b:00-02b:15")
    assert dt_utc.minute == 1


def test_aggregate_quarter_to_hour():
    api = OteApi()
    base = datetime(2025, 1, 1, 0, 0, tzinfo=timezone.utc)
    qh_map = {
        base: Decimal("1"),
        base + timedelta(minutes=15): Decimal("2"),
        base + timedelta(minutes=30): Decimal("3"),
        base + timedelta(minutes=45): Decimal("4"),
    }
    result = api._aggregate_quarter_to_hour(qh_map)
    assert result[base] == Decimal("2.5")


def test_is_cache_valid_requires_tomorrow_after_13(monkeypatch):
    class FixedDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2025, 1, 1, 14, 0, 0, tzinfo=tz)

    monkeypatch.setattr(ote_module, "datetime", FixedDateTime)
    api = OteApi()
    api._cache_time = FixedDateTime.now(api.timezone)
    api._last_data = {
        "prices_czk_kwh": {"2025-01-01T10:00:00": 1.0},
    }
    assert api._is_cache_valid() is False

    api._last_data["prices_czk_kwh"]["2025-01-02T10:00:00"] = 1.1
    assert api._is_cache_valid() is True


@pytest.mark.asyncio
async def test_format_spot_data_includes_15m_prices():
    api = OteApi()
    today = datetime(2025, 1, 1, 0, 0, tzinfo=api.utc)
    tomorrow = today + timedelta(days=1)
    hourly_czk = {today: 1.0, tomorrow: 2.0}
    hourly_eur = {today: Decimal("0.1"), tomorrow: Decimal("0.2")}
    qh_rates_czk = {today: 1.0}
    qh_rates_eur = {today: Decimal("0.1")}

    data = await api._format_spot_data(
        hourly_czk,
        hourly_eur,
        eur_czk_rate=25.0,
        reference_date=today,
        qh_rates_czk=qh_rates_czk,
        qh_rates_eur=qh_rates_eur,
    )

    assert data["prices_czk_kwh"]
    assert data["prices15m_czk_kwh"]
    assert data["today_stats"]["min_czk"] == 1.0
