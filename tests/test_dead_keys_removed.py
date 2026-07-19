from __future__ import annotations

import copy
from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.oig_cloud import config_migration
from custom_components.oig_cloud.config import steps as steps_module
from custom_components.oig_cloud.config_migration import MIGRATION_VERSION
from custom_components.oig_cloud.const import (
    CONF_CHARGE_RATE_KW,
    CONF_PLANNING_MIN_PERCENT,
)


class _DummyConfigEntries:
    def __init__(self) -> None:
        self.updated: list[dict[str, Any]] = []

    def async_update_entry(self, entry: Any, *, options: dict[str, Any]) -> None:
        entry.options = options
        self.updated.append(copy.deepcopy(options))


class _DummyHass:
    def __init__(self) -> None:
        self.config_entries = _DummyConfigEntries()


class _Entry:
    def __init__(self, options: dict[str, Any]) -> None:
        self.entry_id = "entry-1"
        self.options = options


class _MemoryStore:
    def __init__(self) -> None:
        self.value: dict[str, Any] | None = None
        self.private: bool | None = None

    async def async_load(self) -> dict[str, Any] | None:
        return copy.deepcopy(self.value)

    async def async_save(self, payload: dict[str, Any]) -> None:
        self.value = copy.deepcopy(payload)


class _StoreFactory:
    def __init__(self) -> None:
        self.stores: dict[str, _MemoryStore] = {}

    def __call__(self, *_args: Any, **kwargs: Any) -> _MemoryStore:
        name = str(_args[2])
        store = self.stores.setdefault(name, _MemoryStore())
        store.private = bool(kwargs.get("private", False))
        return store

    def backup(self, entry_id: str = "entry-1") -> dict[str, Any] | None:
        store = self.stores.get(f"oig_cloud.migration_backup_{entry_id}")
        if store is None:
            return None
        return copy.deepcopy(store.value)


class _DummyConfigFlow(steps_module.ConfigFlow):
    def __init__(self) -> None:
        super().__init__()
        self.hass = SimpleNamespace()

    def async_create_entry(self, title: str, data: dict[str, Any], options: dict[str, Any]):
        return {"type": "create_entry", "title": title, "data": data, "options": options}

    def async_show_form(self, **kwargs: Any) -> dict[str, Any]:
        return {"type": "form", **kwargs}


def test_build_battery_options_removes_only_verified_dead_writes() -> None:
    payload = steps_module.ConfigFlow._build_battery_options(
        {
            CONF_PLANNING_MIN_PERCENT: 30.0,
            CONF_CHARGE_RATE_KW: 3.2,
            "min_capacity_percent": 25.0,
            "target_capacity_percent": 75.0,
            "home_charge_rate": 2.9,
            "max_ups_price_czk": 9.5,
            "disable_planning_min_guard": True,
            "price_hysteresis_czk": 0.05,
            "hw_min_hold_hours": 8.0,
        }
    )

    assert "disable_planning_min_guard" not in payload
    assert "price_hysteresis_czk" not in payload
    assert "hw_min_hold_hours" not in payload

    assert payload["min_capacity_percent"] == 25.0
    assert payload["target_capacity_percent"] == 75.0
    assert payload["home_charge_rate"] == 3.2
    assert payload["max_ups_price_czk"] == 9.5
    assert payload[CONF_PLANNING_MIN_PERCENT] == 30.0
    assert payload[CONF_CHARGE_RATE_KW] == 3.2


@pytest.mark.asyncio
async def test_quick_setup_no_longer_seeds_notifications_scan_interval(monkeypatch) -> None:
    async def _fake_validate_input(_hass: Any, _data: dict[str, Any]) -> dict[str, str]:
        return {"title": "OIG Cloud"}

    class _FakeOteApi:
        async def get_spot_prices(self) -> list[dict[str, float]]:
            return [{"price": 1.0}]

    from custom_components.oig_cloud.api import ote_api as ote_api_module

    monkeypatch.setattr(steps_module, "validate_input", _fake_validate_input)
    monkeypatch.setattr(ote_api_module, "OteApi", _FakeOteApi)

    flow = _DummyConfigFlow()
    result = await flow.async_step_quick_setup(
        {
            "username": "demo",
            "password": "pass",
            "live_data_enabled": True,
        }
    )

    assert result["type"] == "create_entry"
    assert "notifications_scan_interval" not in result["options"]


@pytest.mark.asyncio
async def test_dead_keys_filtered_on_read_with_one_release_backup(monkeypatch) -> None:
    stores = _StoreFactory()
    monkeypatch.setattr(config_migration, "Store", stores)

    hass = _DummyHass()
    entry = _Entry(
        {
            "disable_planning_min_guard": True,
            "price_hysteresis_czk": 0.05,
            "hw_min_hold_hours": 8.0,
            "notifications_scan_interval": 300,
            "min_capacity_percent": 25.0,
            "target_capacity_percent": 75.0,
            "home_charge_rate": 3.2,
            "max_ups_price_czk": 9.5,
        }
    )

    stripped = await config_migration.strip_dead_keys(hass, entry)
    backup = stores.backup()

    assert stripped is True
    assert "disable_planning_min_guard" not in entry.options
    assert "price_hysteresis_czk" not in entry.options
    assert "hw_min_hold_hours" not in entry.options
    assert "notifications_scan_interval" not in entry.options
    assert entry.options["min_capacity_percent"] == 25.0
    assert entry.options["target_capacity_percent"] == 75.0
    assert entry.options["home_charge_rate"] == 3.2
    assert entry.options["max_ups_price_czk"] == 9.5

    assert backup is not None
    assert backup["removed_keys"] == {
        "disable_planning_min_guard": True,
        "price_hysteresis_czk": 0.05,
        "hw_min_hold_hours": 8.0,
        "notifications_scan_interval": 300,
    }
    assert backup["backup_until_version"] == MIGRATION_VERSION + 1
    assert stores.stores["oig_cloud.migration_backup_entry-1"].private is True
