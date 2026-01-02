from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

import custom_components.oig_cloud as init_module


class DummyConfigEntries:
    def __init__(self):
        self.updated = None

    def async_update_entry(self, entry, options=None):
        entry.options = options or {}
        self.updated = entry


class DummyHass:
    def __init__(self):
        self.config_entries = DummyConfigEntries()
        self.states = SimpleNamespace(get=lambda _eid: None)


def test_read_manifest_file():
    manifest_path = Path(__file__).resolve().parents[1] / "custom_components" / "oig_cloud" / "manifest.json"
    content = init_module._read_manifest_file(str(manifest_path))
    assert "\"domain\"" in content


def test_ensure_data_source_option_defaults():
    hass = DummyHass()
    entry = SimpleNamespace(options={})
    init_module._ensure_data_source_option_defaults(hass, entry)

    assert entry.options.get("data_source_mode") is not None
    assert entry.options.get("local_proxy_stale_minutes") is not None
    assert entry.options.get("local_event_debounce_ms") is not None


def test_ensure_planner_option_defaults_removes_obsolete():
    hass = DummyHass()
    entry = SimpleNamespace(
        entry_id="entry1",
        options={
            "enable_cheap_window_ups": True,
            "min_capacity_percent": None,
            "max_price_conf": 5.5,
        },
    )

    init_module._ensure_planner_option_defaults(hass, entry)

    assert "enable_cheap_window_ups" not in entry.options
    assert entry.options.get("max_ups_price_czk") == 5.5
    assert entry.options.get("min_capacity_percent") is not None


def test_infer_box_id_from_local_entities(monkeypatch):
    class DummyRegistry:
        def __init__(self, entities):
            self.entities = entities

    class DummyEntity:
        def __init__(self, entity_id):
            self.entity_id = entity_id

    hass = SimpleNamespace()

    class _DummyRe:
        @staticmethod
        def compile(_pattern):
            import re as std_re

            return std_re.compile(r"^sensor\.oig_local_(\d+)_")

    def _async_get(_hass):
        return DummyRegistry(
            {
                "one": DummyEntity("sensor.oig_local_2206237016_tbl_box_prms"),
            }
        )

    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_get",
        _async_get,
    )
    monkeypatch.setattr(init_module, "re", _DummyRe)

    assert init_module._infer_box_id_from_local_entities(hass) == "2206237016"

    def _async_get_many(_hass):
        return DummyRegistry(
            {
                "one": DummyEntity("sensor.oig_local_111_tbl_box"),
                "two": DummyEntity("sensor.oig_local_222_tbl_box"),
            }
        )

    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_get",
        _async_get_many,
    )

    assert init_module._infer_box_id_from_local_entities(hass) is None
