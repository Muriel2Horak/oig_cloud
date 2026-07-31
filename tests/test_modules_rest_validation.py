"""Fix C: REST module_config POST must mirror the wizard's module dependency
matrix (live finding — REST accepted enable_battery_prediction=true with
enable_solar_forecast=false, a combination the onboarding wizard blocks)."""
from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.oig_cloud.api import ha_rest_api as api_module
from custom_components.oig_cloud.const import DOMAIN

_ADMIN_USER = SimpleNamespace(is_admin=True)


class DummyEntry:
    def __init__(self, entry_id: str = "entry1", options: dict[str, Any] | None = None) -> None:
        self.entry_id = entry_id
        self.domain = DOMAIN
        self.options = options or {}
        self.data: dict[str, Any] = {}


class DummyConfigEntries:
    def __init__(self, entries: list[Any]) -> None:
        self._entries = entries

    def async_entries(self, domain: str) -> list[Any]:
        return self._entries if domain == DOMAIN else []

    def async_update_entry(self, entry: Any, options: dict[str, Any] | None = None) -> None:
        entry.options = options or {}


class DummyHass:
    def __init__(self, entry: DummyEntry, box_id: str = "box1") -> None:
        self.config_entries = DummyConfigEntries([entry])
        self.data = {
            DOMAIN: {
                entry.entry_id: {
                    "coordinator": SimpleNamespace(data={box_id: {}}),
                }
            }
        }


class DummyJsonRequest:
    def __init__(self, hass: DummyHass, payload: dict[str, Any] | None = None) -> None:
        self.app = {"hass": hass}
        self._payload = payload or {}

    def get(self, key: str, default: Any = None) -> Any:
        if key == "hass_user":
            return _ADMIN_USER
        return default

    async def json(self) -> dict[str, Any]:
        return self._payload


def test_modules_post_battery_without_solar_returns_400() -> None:
    async def _run():
        entry = DummyEntry(options={"enable_extended_sensors": True})
        hass = DummyHass(entry)
        view = api_module.OIGCloudModuleConfigView()
        response = await view.post(
            DummyJsonRequest(
                hass,
                {
                    "section": "modules",
                    "values": {
                        "enable_battery_prediction": True,
                        "enable_solar_forecast": False,
                    },
                },
            ),
            "box1",
        )
        assert response.status == 400
        import json

        payload = json.loads(response.body)
        assert payload["error"] == "validation"
        assert payload["fields"]["enable_battery_prediction"] == "requires_solar_forecast"
        # Fail closed: nothing was persisted.
        assert "enable_battery_prediction" not in entry.options

    asyncio.run(_run())


def test_modules_post_battery_with_solar_accepted() -> None:
    async def _run():
        entry = DummyEntry(options={"enable_extended_sensors": True})
        hass = DummyHass(entry)
        view = api_module.OIGCloudModuleConfigView()
        response = await view.post(
            DummyJsonRequest(
                hass,
                {
                    "section": "modules",
                    "values": {
                        "enable_battery_prediction": True,
                        "enable_solar_forecast": True,
                    },
                },
            ),
            "box1",
        )
        assert response.status == 200
        assert entry.options["enable_battery_prediction"] is True
        assert entry.options["enable_solar_forecast"] is True

    asyncio.run(_run())


def test_modules_post_battery_without_extended_sensors_returns_400() -> None:
    async def _run():
        entry = DummyEntry(options={"enable_solar_forecast": True})
        hass = DummyHass(entry)
        view = api_module.OIGCloudModuleConfigView()
        response = await view.post(
            DummyJsonRequest(
                hass,
                {
                    "section": "modules",
                    "values": {
                        "enable_battery_prediction": True,
                        "enable_extended_sensors": False,
                    },
                },
            ),
            "box1",
        )
        assert response.status == 400
        import json

        payload = json.loads(response.body)
        assert payload["fields"]["enable_extended_sensors"] == "required_for_battery"
        assert "enable_battery_prediction" not in entry.options

    asyncio.run(_run())


def test_modules_post_dashboard_missing_required_returns_400() -> None:
    async def _run():
        # enable_dashboard lives in the "basic" section per config_registry,
        # but is already stored on the entry — a modules POST that leaves the
        # dashboard's other module requirements unmet must still be rejected.
        entry = DummyEntry(
            options={
                "enable_dashboard": True,
                "enable_statistics": True,
                "enable_solar_forecast": True,
                "enable_battery_prediction": True,
                "enable_pricing": True,
                "enable_extended_sensors": True,
            }
        )
        hass = DummyHass(entry)
        view = api_module.OIGCloudModuleConfigView()
        response = await view.post(
            DummyJsonRequest(
                hass,
                {
                    "section": "modules",
                    "values": {"enable_pricing": False},
                },
            ),
            "box1",
        )
        assert response.status == 400
        import json

        payload = json.loads(response.body)
        assert payload["fields"]["enable_dashboard"] == "dashboard_requires_all"
        # Fail closed: the rejected toggle was never persisted.
        assert entry.options["enable_pricing"] is True

    asyncio.run(_run())


def test_modules_post_valid_accepted() -> None:
    async def _run():
        entry = DummyEntry(options={})
        hass = DummyHass(entry)
        view = api_module.OIGCloudModuleConfigView()
        response = await view.post(
            DummyJsonRequest(
                hass,
                {
                    "section": "modules",
                    "values": {
                        "enable_solar_forecast": True,
                        "enable_pricing": True,
                        "enable_chmu_warnings": True,
                    },
                },
            ),
            "box1",
        )
        assert response.status == 200
        assert entry.options["enable_solar_forecast"] is True
        assert entry.options["enable_pricing"] is True
        assert entry.options["enable_chmu_warnings"] is True

    asyncio.run(_run())
