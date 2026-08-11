from __future__ import annotations

import asyncio
from datetime import timedelta
from types import SimpleNamespace

import aiohttp
import pytest

from custom_components.oig_cloud.entities import solar_forecast_sensor as module
from custom_components.oig_cloud.entities.solar_forecast_sensor import (
    OigCloudSolarForecastSensor,
)
from custom_components.oig_cloud.forecast.refresh_result import SolarFetchResult


class Coordinator:
    def __init__(self) -> None:
        self.forced_box_id = "scheduler-box"
        self.solar_forecast_data = {"old": True}

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class Entry:
    def __init__(self, options) -> None:
        self.options = options
        self.entry_id = None


class Response:
    def __init__(self, status: int, payload=None, text="unsafe-body-secret") -> None:
        self.status = status
        self.payload = payload
        self.body = text

    async def json(self):
        return self.payload

    async def text(self):
        return self.body

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_exc):
        return False


class Session:
    def __init__(self, responses) -> None:
        self.responses = list(responses)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_exc):
        return False

    def get(self, *_args, **_kwargs):
        response = self.responses.pop(0)
        if isinstance(response, BaseException):
            return RaisingContext(response)
        return response


class RaisingContext:
    def __init__(self, error: BaseException) -> None:
        self.error = error

    async def __aenter__(self):
        raise self.error

    async def __aexit__(self, *_exc):
        return False


def make_sensor(options) -> OigCloudSolarForecastSensor:
    sensor = OigCloudSolarForecastSensor(
        Coordinator(), "solar_forecast", Entry(options), {}
    )
    sensor.hass = SimpleNamespace(data={})
    sensor._last_forecast_data = {"old": True}
    sensor._last_api_call = 77.0
    sensor.async_write_ha_state = lambda: pytest.fail("fetch wrote HA state")

    async def fail_save():
        pytest.fail("fetch wrote storage")

    async def fail_broadcast():
        pytest.fail("fetch broadcast state")

    sensor._save_persistent_data = fail_save
    sensor._broadcast_forecast_data = fail_broadcast
    return sensor


def forecast_options() -> dict:
    return {
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_mode": "daily_optimized",
        "solar_forecast_api_key": "",
        "solar_forecast_latitude": 50.1,
        "solar_forecast_longitude": 14.2,
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_kwp": 5.5,
        "solar_forecast_string1_declination": 35,
        "solar_forecast_string1_azimuth": 138,
        "solar_forecast_string2_enabled": False,
    }


def solcast_options() -> dict:
    return {
        "solar_forecast_provider": "solcast",
        "solar_forecast_mode": "daily_optimized",
        "solcast_api_key": "api-secret",
        "solcast_site_id": "site-secret",
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_kwp": 5.5,
        "solar_forecast_string2_enabled": False,
    }


def assert_fetch_left_state_unchanged(sensor) -> None:
    assert sensor._last_forecast_data == {"old": True}
    assert sensor._last_api_call == 77.0
    assert sensor.coordinator.solar_forecast_data == {"old": True}


@pytest.mark.asyncio
async def test_forecast_solar_fetch_returns_candidate_without_side_effects(monkeypatch):
    today = module.dt_util.now().date()
    payload = {
        "result": {
            "watts": {f"{today.isoformat()}T10:00:00+00:00": 500.0},
            "watt_hours_day": {
                today.isoformat(): 1500.0,
                (today + timedelta(days=1)).isoformat(): 1700.0,
            },
        }
    }
    sensor = make_sensor(forecast_options())
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: Session([Response(200, payload)]))

    result = await sensor.async_fetch_forecast_data()

    assert isinstance(result, SolarFetchResult)
    assert result.accepted is True
    assert result.candidate["total_daily"] == {
        today.isoformat(): 1.5,
        (today + timedelta(days=1)).isoformat(): 1.7,
    }
    assert_fetch_left_state_unchanged(sensor)


@pytest.mark.asyncio
async def test_solcast_fetch_returns_candidate_without_side_effects(monkeypatch):
    today = module.dt_util.now().date()
    payload = {
        "forecasts": [
            {
                "period_end": f"{today.isoformat()}T10:00:00+00:00",
                "pv_estimate": 1.0,
                "period": "PT1H",
            },
            {
                "period_end": f"{(today + timedelta(days=1)).isoformat()}T10:00:00+00:00",
                "pv_estimate": 2.0,
                "period": "PT1H",
            },
        ]
    }
    sensor = make_sensor(solcast_options())
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: Session([Response(200, payload)]))

    result = await sensor._fetch_solcast_data(1000.0, solcast_options())

    assert isinstance(result, SolarFetchResult)
    assert result.accepted is True
    assert result.candidate["total_daily"] == {
        today.isoformat(): 1.0,
        (today + timedelta(days=1)).isoformat(): 2.0,
    }
    assert_fetch_left_state_unchanged(sensor)


@pytest.mark.parametrize(
    ("status", "code", "retryable"),
    [
        (400, "invalid_config", False),
        (401, "auth", False),
        (403, "forbidden", False),
        (404, "not_found", False),
        (422, "unprocessable", False),
        (429, "rate_limited", True),
        (500, "server_error", True),
        (503, "server_error", True),
    ],
)
@pytest.mark.asyncio
async def test_solcast_http_failures_are_classified_without_raw_body(
    monkeypatch, caplog, status, code, retryable
):
    sensor = make_sensor(solcast_options())
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: Session([Response(status)]))

    result = await sensor._fetch_solcast_data(1000.0, solcast_options())

    assert result.code == code
    assert result.retryable is retryable
    assert result.candidate is None
    assert "unsafe-body-secret" not in caplog.text
    assert_fetch_left_state_unchanged(sensor)


@pytest.mark.parametrize(
    ("error", "code", "retryable"),
    [
        (asyncio.TimeoutError("timeout-secret"), "timeout", True),
        (aiohttp.ClientConnectionError("connection-secret"), "connection", True),
    ],
)
@pytest.mark.asyncio
async def test_solcast_transport_failures_are_classified_without_exception_text(
    monkeypatch, caplog, error, code, retryable
):
    sensor = make_sensor(solcast_options())
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: Session([error]))

    result = await sensor._fetch_solcast_data(1000.0, solcast_options())

    assert result.code == code
    assert result.retryable is retryable
    assert "secret" not in caplog.text
    assert_fetch_left_state_unchanged(sensor)


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"error": "provider-body-secret"},
        {"forecasts": []},
        {"forecasts": [{"period_end": None, "pv_estimate": None}]},
    ],
)
@pytest.mark.asyncio
async def test_solcast_malformed_success_is_terminal_invalid_response(
    monkeypatch, caplog, payload
):
    sensor = make_sensor(solcast_options())
    monkeypatch.setattr(module.aiohttp, "ClientSession", lambda: Session([Response(200, payload)]))

    result = await sensor._fetch_solcast_data(1000.0, solcast_options())

    assert result.code == "invalid_response"
    assert result.retryable is False
    assert "provider-body-secret" not in caplog.text
    assert_fetch_left_state_unchanged(sensor)


@pytest.mark.asyncio
async def test_forecast_missing_enabled_string_data_is_invalid_response(monkeypatch):
    sensor = make_sensor(forecast_options())
    monkeypatch.setattr(
        module.aiohttp,
        "ClientSession",
        lambda: Session([Response(200, {"result": {"watts": {}, "watt_hours_day": {}}})]),
    )

    result = await sensor.async_fetch_forecast_data()

    assert result.code == "invalid_response"
    assert result.retryable is False
    assert_fetch_left_state_unchanged(sensor)


@pytest.mark.asyncio
async def test_provider_cancellation_propagates_without_side_effects(monkeypatch):
    sensor = make_sensor(solcast_options())
    monkeypatch.setattr(
        module.aiohttp,
        "ClientSession",
        lambda: Session([asyncio.CancelledError("cancel-secret")]),
    )

    with pytest.raises(asyncio.CancelledError):
        await sensor._fetch_solcast_data(1000.0, solcast_options())

    assert_fetch_left_state_unchanged(sensor)
