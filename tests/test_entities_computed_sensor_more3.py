from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.entities import computed_sensor as module
from custom_components.oig_cloud.entities.computed_sensor import OigCloudComputedSensor


class DummyStore:
    def __init__(self, payload=None):
        self._payload = payload
        self.saved = None

    async def async_load(self):
        return self._payload

    async def async_save(self, data):
        self.saved = data


class DummyHass:
    def __init__(self):
        self.states = {}


def _make_sensor(sensor_type="computed_batt_charge_energy_today"):
    coordinator = SimpleNamespace()
    sensor = OigCloudComputedSensor(coordinator, sensor_type)
    sensor._box_id = "test"
    sensor.hass = DummyHass()
    return sensor


def test_get_entity_number_variants():
    sensor = _make_sensor()
    sensor.hass.states["sensor.oig_123_x"] = SimpleNamespace(state="1.5")
    assert sensor._get_entity_number("sensor.oig_123_x") == 1.5

    sensor.hass.states["sensor.oig_123_y"] = SimpleNamespace(state="bad")
    assert sensor._get_entity_number("sensor.oig_123_y") is None


def test_get_oig_last_updated_handles_timezone():
    sensor = _make_sensor()
    sensor._box_id = "123"
    now = datetime.now(timezone.utc)
    sensor.hass.states["sensor.oig_123_test"] = SimpleNamespace(
        state="1", last_updated=now, last_changed=now
    )
    assert sensor._get_oig_last_updated("test") == now


@pytest.mark.asyncio
async def test_load_energy_from_storage_populates_defaults(monkeypatch):
    sensor = _make_sensor()
    module._energy_data_cache.pop(sensor._box_id, None)
    module._energy_cache_loaded.pop(sensor._box_id, None)
    store = DummyStore(payload={"energy": {"charge_today": "2"}})
    monkeypatch.setattr(sensor, "_get_energy_store", lambda: store)

    loaded = await sensor._load_energy_from_storage()
    assert loaded is True
    assert sensor._energy["charge_today"] == 2.0
    assert sensor._energy["charge_month"] == 0.0


@pytest.mark.asyncio
async def test_save_energy_to_storage_forced(monkeypatch):
    sensor = _make_sensor()
    store = DummyStore()
    monkeypatch.setattr(sensor, "_get_energy_store", lambda: store)
    sensor._energy["charge_today"] = 5.0

    await sensor._save_energy_to_storage(force=True)
    assert store.saved is not None
    assert store.saved["energy"]["charge_today"] == 5.0
