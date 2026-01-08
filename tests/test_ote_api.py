from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest

import custom_components.oig_cloud.api.ote_api as ote_module
from custom_components.oig_cloud.api.ote_api import CnbRate, OTEFault, OteApi, UpdateFailed


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


def test_dam_period_query():
    api = OteApi()
    query = api._dam_period_query(date(2025, 1, 1), date(2025, 1, 2), 1, 2)
    assert "<pub:StartPeriod>1</pub:StartPeriod>" in query
    assert "<pub:EndPeriod>2</pub:EndPeriod>" in query


def test_parse_soap_response_fault():
    api = OteApi()
    soap = (
        f"<soapenv:Envelope xmlns:soapenv=\"{ote_module.SOAPENV}\">"
        "<soapenv:Body><soapenv:Fault><faultstring>oops</faultstring></soapenv:Fault></soapenv:Body>"
        "</soapenv:Envelope>"
    )
    with pytest.raises(OTEFault):
        api._parse_soap_response(soap)


def test_parse_soap_response_invalid():
    api = OteApi()
    with pytest.raises(UpdateFailed):
        api._parse_soap_response("bad xml")


def test_parse_soap_response_portal_unavailable():
    api = OteApi()
    with pytest.raises(UpdateFailed):
        api._parse_soap_response("Application is not available")


@pytest.mark.asyncio
async def test_get_dam_period_prices_parses(monkeypatch):
    api = OteApi()
    xml = f"""
    <Envelope xmlns="{ote_module.SOAPENV}">
      <Body>
        <Item xmlns="{ote_module.NAMESPACE}">
          <Date>2025-01-01</Date>
          <PeriodInterval>00:00-00:15</PeriodInterval>
          <PeriodResolution>PT15M</PeriodResolution>
          <Price>10</Price>
        </Item>
        <Item xmlns="{ote_module.NAMESPACE}">
          <Date>2025-01-01</Date>
          <PeriodInterval>00:00-00:15</PeriodInterval>
          <PeriodResolution>PT60M</PeriodResolution>
          <Price>10</Price>
        </Item>
      </Body>
    </Envelope>
    """

    async def fake_download(*_args, **_kwargs):
        return xml

    monkeypatch.setattr(api, "_download_soap", fake_download)
    result = await api._get_dam_period_prices(date(2025, 1, 1), date(2025, 1, 1))
    assert result


@pytest.mark.asyncio
async def test_cnb_rate_get_day_rates(monkeypatch):
    rate = CnbRate()

    async def fake_download(day):
        return {
            "rates": [
                {"currencyCode": "EUR", "rate": 25.0},
            ]
        }

    monkeypatch.setattr(rate, "download_rates", fake_download)
    rates = await rate.get_day_rates(date(2025, 1, 1))
    assert rates["EUR"] == 25


@pytest.mark.asyncio
async def test_cnb_rate_get_current_rates_cache(monkeypatch):
    rate = CnbRate()
    today = datetime.now(timezone.utc).date()
    rate._rates = {"EUR": Decimal("25")}
    rate._last_checked_date = today
    rates = await rate.get_current_rates()
    assert rates["EUR"] == Decimal("25")


@pytest.mark.asyncio
async def test_get_cnb_exchange_rate(monkeypatch):
    api = OteApi()

    async def fake_rates():
        return {"EUR": Decimal("25")}

    monkeypatch.setattr(api._cnb_rate, "get_current_rates", fake_rates)
    rate = await api.get_cnb_exchange_rate()
    assert rate == 25.0

    async def fake_empty():
        return {}

    api._rate_cache_time = None
    monkeypatch.setattr(api._cnb_rate, "get_current_rates", fake_empty)
    assert await api.get_cnb_exchange_rate() is None


@pytest.mark.asyncio
async def test_get_spot_prices_uses_cache(monkeypatch):
    class FixedDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2025, 1, 1, 12, 0, 0, tzinfo=tz)

    monkeypatch.setattr(ote_module, "datetime", FixedDateTime)
    api = OteApi()
    api._cache_time = FixedDateTime.now(api.timezone)
    api._last_data = {"prices_czk_kwh": {"2025-01-01T10:00:00": 1.0}}
    result = await api.get_spot_prices()
    assert result == api._last_data


@pytest.mark.asyncio
async def test_get_spot_prices_fetch_and_fallback(monkeypatch):
    api = OteApi()

    async def fake_rate():
        return None

    async def fake_qh(*_args, **_kwargs):
        return {}

    monkeypatch.setattr(api, "get_cnb_exchange_rate", fake_rate)
    monkeypatch.setattr(api, "_get_dam_period_prices", fake_qh)
    result = await api.get_spot_prices()
    assert result == {}


@pytest.mark.asyncio
async def test_format_spot_data_empty():
    api = OteApi()
    data = await api._format_spot_data({}, {}, 25.0, datetime.now(api.utc))
    assert data == {}
