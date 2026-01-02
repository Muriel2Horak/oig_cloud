from __future__ import annotations

import json
import sys
from types import SimpleNamespace

import pytest


class DummySpan:
    def __enter__(self):
        return self

    def __exit__(self, *_args, **_kwargs):
        return False


class DummyTracer:
    def start_as_current_span(self, *_args, **_kwargs):
        return DummySpan()


sys.modules.setdefault(
    "opentelemetry",
    SimpleNamespace(trace=SimpleNamespace(get_tracer=lambda *_a, **_k: DummyTracer())),
)

from custom_components.oig_cloud import services as services_module
from custom_components.oig_cloud.const import DOMAIN


class DummyStore:
    saved = None
    data = None

    def __init__(self, hass, version, key):
        self.hass = hass
        self.version = version
        self.key = key

    async def async_save(self, data):
        DummyStore.saved = data

    async def async_load(self):
        return DummyStore.data


class DummyServices:
    def __init__(self):
        self.registered = {}

    def has_service(self, domain, service):
        return (domain, service) in self.registered

    def async_register(self, domain, service, handler, schema=None, supports_response=False):
        self.registered[(domain, service)] = handler


class DummyHass:
    def __init__(self):
        self.services = DummyServices()
        self.data = {}
        self.config_entries = SimpleNamespace(async_get_entry=lambda _eid: None)


class DummyServiceCall:
    def __init__(self, data=None):
        self.data = data or {}


class DummySolarForecast:
    def __init__(self):
        self.updated = False

    async def async_update(self):
        self.updated = True


@pytest.mark.asyncio
async def test_async_setup_services_dashboard_tiles(monkeypatch):
    hass = DummyHass()
    hass.data[DOMAIN] = {
        "entry1": {"coordinator": SimpleNamespace(solar_forecast=DummySolarForecast())}
    }

    monkeypatch.setattr(
        "homeassistant.helpers.storage.Store", DummyStore
    )

    await services_module.async_setup_services(hass)

    save_handler = hass.services.registered[(DOMAIN, "save_dashboard_tiles")]
    get_handler = hass.services.registered[(DOMAIN, "get_dashboard_tiles")]

    config = {"tiles_left": [], "tiles_right": [], "version": 1}
    await save_handler(DummyServiceCall({"config": json.dumps(config)}))

    DummyStore.data = DummyStore.saved
    response = await get_handler(DummyServiceCall())

    assert response["config"]["version"] == 1


@pytest.mark.asyncio
async def test_async_setup_services_update_solar(monkeypatch):
    hass = DummyHass()
    forecast = DummySolarForecast()
    hass.data[DOMAIN] = {"entry1": {"coordinator": SimpleNamespace(solar_forecast=forecast)}}

    await services_module.async_setup_services(hass)

    update_handler = hass.services.registered[(DOMAIN, "update_solar_forecast")]
    await update_handler(DummyServiceCall())

    assert forecast.updated is True


@pytest.mark.asyncio
async def test_async_setup_services_check_balancing_no_entries():
    hass = DummyHass()
    hass.data[DOMAIN] = {}

    await services_module.async_setup_services(hass)

    check_handler = hass.services.registered[(DOMAIN, "check_balancing")]
    response = await check_handler(DummyServiceCall())

    assert response["processed_entries"] == 0
    assert response["results"] == []


@pytest.mark.asyncio
async def test_async_setup_services_save_tiles_invalid_json(monkeypatch):
    hass = DummyHass()
    hass.data[DOMAIN] = {}

    monkeypatch.setattr(
        "homeassistant.helpers.storage.Store", DummyStore
    )
    DummyStore.saved = None

    await services_module.async_setup_services(hass)

    save_handler = hass.services.registered[(DOMAIN, "save_dashboard_tiles")]
    await save_handler(DummyServiceCall({"config": "{invalid"}))

    assert DummyStore.saved is None
