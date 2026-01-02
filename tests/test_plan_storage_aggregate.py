from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.storage import plan_storage_aggregate as module


class DummyStore:
    def __init__(self, data=None):
        self._data = data or {}
        self.saved = None

    async def async_load(self):
        return self._data

    async def async_save(self, data):
        self.saved = data
        self._data = data


class DummySensor:
    def __init__(self, data=None):
        self._plans_store = DummyStore(data)


@pytest.mark.asyncio
async def test_aggregate_daily_saves_and_cleans(monkeypatch):
    sensor = DummySensor(
        {
            "detailed": {
                "2024-12-20": {"intervals": [{"net_cost": 1}]},
            }
        }
    )

    plan = {
        "intervals": [
            {"net_cost": 1.0, "solar_kwh": 0.1, "consumption_kwh": 0.2, "grid_import_kwh": 0.3, "grid_export_kwh": 0.0, "battery_soc": 50},
            {"net_cost": 2.0, "solar_kwh": 0.2, "consumption_kwh": 0.1, "grid_import_kwh": 0.0, "grid_export_kwh": 0.1, "battery_soc": 60},
        ]
    }

    async def fake_load(_sensor, _date):
        return plan

    monkeypatch.setattr(module, "load_plan_from_storage", fake_load)

    ok = await module.aggregate_daily(sensor, "2025-01-01")

    assert ok is True
    saved = sensor._plans_store.saved
    assert saved["daily"]["2025-01-01"]["planned"]["total_cost"] == 3.0
    assert "2024-12-20" not in saved.get("detailed", {})


@pytest.mark.asyncio
async def test_aggregate_weekly_success():
    sensor = DummySensor(
        {
            "daily": {
                "2025-01-01": {"planned": {"total_cost": 1, "total_solar": 1, "total_consumption": 1, "total_grid_import": 1, "total_grid_export": 0}},
                "2025-01-02": {"planned": {"total_cost": 2, "total_solar": 1, "total_consumption": 1, "total_grid_import": 1, "total_grid_export": 0}},
            }
        }
    )

    ok = await module.aggregate_weekly(sensor, "2025-W01", "2025-01-01", "2025-01-02")

    assert ok is True
    saved = sensor._plans_store.saved
    assert saved["weekly"]["2025-W01"]["days_count"] == 2


@pytest.mark.asyncio
async def test_aggregate_weekly_no_days():
    sensor = DummySensor({"daily": {}})
    ok = await module.aggregate_weekly(sensor, "2025-W01", "2025-01-01", "2025-01-02")
    assert ok is False
