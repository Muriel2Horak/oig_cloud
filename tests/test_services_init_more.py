from __future__ import annotations

from types import SimpleNamespace

import pytest
import voluptuous as vol

from custom_components.oig_cloud import services as module
from custom_components.oig_cloud.const import DOMAIN


class DummyHass:
    def __init__(self):
        self.services = DummyServices()
        self.data = {}


class DummyServices:
    def __init__(self):
        self.registered = {}
        self.removed = set()

    def async_register(self, domain, name, handler, schema=None, supports_response=False):
        self.registered[(domain, name)] = handler
        return True

    def has_service(self, domain, name):
        return (domain, name) in self.registered

    def async_remove(self, domain, name):
        self.removed.add((domain, name))


@pytest.mark.asyncio
async def test_get_entry_solar_sensors_empty():
    entry_data = {}
    result = module._get_entry_solar_sensors(entry_data)
    assert result == []


@pytest.mark.asyncio
async def test_get_entry_solar_sensors_from_list():
    sensors = [SimpleNamespace(entity_id="sensor.test")]
    entry_data = {"solar_forecast_sensors": sensors}
    result = module._get_entry_solar_sensors(entry_data)
    assert len(result) == 1


@pytest.mark.asyncio
async def test_get_primary_solar_sensor_from_list():
    sensors = [
        SimpleNamespace(entity_id="sensor.other", _sensor_type="other"),
        SimpleNamespace(entity_id="sensor.forecast", _sensor_type="solar_forecast"),
    ]
    entry_data = {"solar_forecast_sensors": sensors}
    result = module._get_primary_solar_sensor(entry_data)
    assert result is not None


@pytest.mark.asyncio
async def test_update_solar_forecast_no_sensors(monkeypatch):
    hass = DummyHass()
    entry_id = "test"
    entry_data = {}

    async def _manual_update():
        return False

    solar_forecast = SimpleNamespace(async_manual_update=_manual_update)
    entry_data["solar_forecast"] = solar_forecast

    result = await module._update_solar_forecast_for_entry(entry_id, entry_data)
    assert result["status"] == "no_sensors"


@pytest.mark.asyncio
async def test_update_solar_forecast_skipped(monkeypatch):
    hass = DummyHass()
    entry_id = "test"
    entry_data = {}
    sensors = [SimpleNamespace(entity_id="sensor.forecast")]
    entry_data["solar_forecast_sensors"] = sensors

    async def _manual_update():
        return False

    solar_forecast = SimpleNamespace(async_manual_update=_manual_update, _sensor_type="solar_forecast")
    entry_data["solar_forecast"] = solar_forecast

    entity_ids = ["sensor.other"]
    result = await module._update_solar_forecast_for_entry(entry_id, entry_data, entity_ids)
    assert result["status"] == "skipped"


@pytest.mark.asyncio
async def test_update_solar_forecast_no_primary(monkeypatch):
    hass = DummyHass()
    entry_id = "test"
    entry_data = {}
    sensors = [SimpleNamespace(entity_id="sensor.other", _sensor_type="other")]
    entry_data["solar_forecast_sensors"] = sensors

    async def _update():
        pass

    solar_forecast = SimpleNamespace(async_update=_update, _sensor_type="solar_forecast")
    entry_data["solar_forecast"] = solar_forecast

    result = await module._update_solar_forecast_for_entry(entry_id, entry_data)
    assert result["status"] in ["no_primary", "error"]


@pytest.mark.asyncio
async def test_update_solar_forecast_manual_update_failed(monkeypatch):
    hass = DummyHass()
    entry_id = "test"
    entry_data = {}
    sensors = [SimpleNamespace(entity_id="sensor.forecast")]
    entry_data["solar_forecast_sensors"] = sensors

    async def _manual_update():
        return False

    async def _update():
        pass

    solar_forecast = SimpleNamespace(async_manual_update=_manual_update, async_update=_update, _sensor_type="solar_forecast")
    entry_data["solar_forecast"] = solar_forecast

    result = await module._update_solar_forecast_for_entry(entry_id, entry_data)
    assert result["status"] == "error"


@pytest.mark.asyncio
async def test_register_service_if_missing():
    hass = DummyHass()

    def _handler(_call):
        return None

    schema = vol.Schema({})
    result = module._register_service_if_missing(
        hass, "test_service", _handler, schema
    )
    assert result is True
    assert hass.services.has_service(DOMAIN, "test_service")

    result2 = module._register_service_if_missing(
        hass, "test_service", _handler, schema
    )
    assert result2 is False


@pytest.mark.asyncio
async def test_box_id_from_coordinator_empty_data():
    coordinator = SimpleNamespace(data={})
    result = module._box_id_from_coordinator(coordinator)
    assert result is None


@pytest.mark.asyncio
async def test_box_id_from_coordinator_exception():
    coordinator = SimpleNamespace()
    result = module._box_id_from_coordinator(coordinator)
    assert result is None


@pytest.mark.asyncio
async def test_strip_identifier_suffix():
    result = module._strip_identifier_suffix("123_shield")
    assert result == "123"
    result = module._strip_identifier_suffix("123_shield_analytics")
    assert result == "123"
