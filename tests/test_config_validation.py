from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.config import validation as validation_module
from custom_components.oig_cloud.config.validation import InvalidAuth, LiveDataNotEnabled
from custom_components.oig_cloud.const import CONF_PASSWORD, CONF_USERNAME


class DummyApi:
    def __init__(self, *_args, **_kwargs):
        self._auth_ok = True
        self._stats = {"box": {"actual": {}}}

    async def authenticate(self):
        return self._auth_ok

    async def get_stats(self):
        return self._stats


@pytest.mark.asyncio
async def test_validate_input_invalid_auth(monkeypatch):
    api = DummyApi()
    api._auth_ok = False
    monkeypatch.setattr(validation_module, "OigCloudApi", lambda *_a, **_k: api)

    with pytest.raises(InvalidAuth):
        await validation_module.validate_input(
            SimpleNamespace(), {CONF_USERNAME: "u", CONF_PASSWORD: "p"}
        )


@pytest.mark.asyncio
async def test_validate_input_live_data_missing(monkeypatch):
    api = DummyApi()
    api._stats = {"box": {}}
    monkeypatch.setattr(validation_module, "OigCloudApi", lambda *_a, **_k: api)

    with pytest.raises(LiveDataNotEnabled):
        await validation_module.validate_input(
            SimpleNamespace(), {CONF_USERNAME: "u", CONF_PASSWORD: "p"}
        )


@pytest.mark.asyncio
async def test_validate_input_success(monkeypatch):
    api = DummyApi()
    monkeypatch.setattr(validation_module, "OigCloudApi", lambda *_a, **_k: api)

    result = await validation_module.validate_input(
        SimpleNamespace(), {CONF_USERNAME: "u", CONF_PASSWORD: "p"}
    )

    assert result["title"]


class DummyResponse:
    def __init__(self, status: int):
        self.status = status

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def text(self):
        return "error"


class DummySession:
    def __init__(self, status: int):
        self._status = status

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    def get(self, *_args, **_kwargs):
        return DummyResponse(self._status)


@pytest.mark.asyncio
async def test_validate_solar_forecast_api_key_ok(monkeypatch):
    monkeypatch.setattr(
        validation_module.aiohttp, "ClientSession", lambda: DummySession(200)
    )

    assert await validation_module.validate_solar_forecast_api_key("token") is True


@pytest.mark.asyncio
async def test_validate_solar_forecast_api_key_unauthorized(monkeypatch):
    monkeypatch.setattr(
        validation_module.aiohttp, "ClientSession", lambda: DummySession(401)
    )

    assert await validation_module.validate_solar_forecast_api_key("token") is False
