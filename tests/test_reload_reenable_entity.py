"""Finding B — re-enabling a module doesn't recreate entities.

sensor.py's async_setup_entry() reads entry.options fresh every time it runs
and gates each optional sensor family (chmu_warnings, pricing, boiler, ...)
on the corresponding enable_* flag — nothing about entity creation depends on
prior state. So once the platform's async_setup_entry actually runs again
(guaranteed by the __init__.py unload fix in test_reload_partial_failure.py),
a module flipped back to True re-creates its entities on the very next call.

This test pins that half of the fix: simulate the toggle across two calls to
the SAME platform-level async_setup_entry (disabled -> enabled), the shape a
reload produces, and assert the entity comes back.
"""
from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.const import DOMAIN
from custom_components.oig_cloud import sensor as sensor_module


class DummyCoordinator:
    def __init__(self):
        self.data = {"123": {}}
        self.forced_box_id = "123"

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class DummyConfigEntries:
    def async_update_entry(self, entry, options=None):
        entry.options = options or {}


class DummyHass:
    def __init__(self, entry_id):
        self.data = {
            DOMAIN: {entry_id: {"coordinator": DummyCoordinator(), "statistics_enabled": True}}
        }
        self.config_entries = DummyConfigEntries()


class DummyEntry:
    def __init__(self, options):
        self.entry_id = "reenable_entry"
        self.options = options
        self.title = "OIG 123"


class ChmuMarkerSensor:
    """Stand-in for OigCloudChmuSensor — identifiable in the added list."""

    def __init__(self, *args, **kwargs):
        self.entity_id = "sensor.oig_123_chmu_marker"
        self.unique_id = "chmu_marker"
        self.device_info = {"identifiers": {("oig_cloud", "123")}}
        self._attr_has_entity_name = True


@pytest.mark.asyncio
async def test_reload_re_adds_entity_for_reenabled_flag(monkeypatch):
    chmu_types = {"chmu_one": {"sensor_type_category": "chmu_warnings"}}
    monkeypatch.setattr(sensor_module, "SENSOR_TYPES", {})
    monkeypatch.setattr(
        "custom_components.oig_cloud.sensors.SENSOR_TYPES_CHMU.SENSOR_TYPES_CHMU",
        chmu_types,
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.chmu_sensor.OigCloudChmuSensor",
        ChmuMarkerSensor,
    )

    entry = DummyEntry({"enable_chmu_warnings": False})
    hass = DummyHass(entry.entry_id)

    added_disabled: list = []
    await sensor_module.async_setup_entry(
        hass, entry, lambda entities, _update=False: added_disabled.extend(entities)
    )
    assert not any(isinstance(e, ChmuMarkerSensor) for e in added_disabled), (
        "chmu sensor must not exist while enable_chmu_warnings is False"
    )

    # Simulate what merge_entry_options + the reload path produce: the option
    # flips True and the platform's async_setup_entry runs again from scratch.
    entry.options = {"enable_chmu_warnings": True}

    added_reenabled: list = []
    await sensor_module.async_setup_entry(
        hass, entry, lambda entities, _update=False: added_reenabled.extend(entities)
    )

    assert any(isinstance(e, ChmuMarkerSensor) for e in added_reenabled), (
        "re-enabling the flag and re-running platform setup must recreate the entity"
    )
