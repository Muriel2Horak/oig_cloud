from __future__ import annotations

from pathlib import Path
import re
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


class DummyHttp:
    def __init__(self):
        self.registered = None

    async def async_register_static_paths(self, configs):
        self.registered = configs


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


def test_ensure_data_source_option_defaults_no_update():
    hass = DummyHass()
    entry = SimpleNamespace(
        options={
            "data_source_mode": "local",
            "local_proxy_stale_minutes": 5,
            "local_event_debounce_ms": 10,
        }
    )
    init_module._ensure_data_source_option_defaults(hass, entry)
    assert hass.config_entries.updated is None


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


def test_ensure_planner_option_defaults_invalid_max_price():
    hass = DummyHass()
    entry = SimpleNamespace(
        entry_id="entry1",
        options={"max_price_conf": "bad", "min_capacity_percent": None},
    )

    init_module._ensure_planner_option_defaults(hass, entry)

    assert entry.options.get("max_ups_price_czk") == 10.0
    assert entry.options.get("min_capacity_percent") is not None


def test_balancing_manager_import_error(monkeypatch):
    import builtins
    import importlib

    def fake_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name.endswith("battery_forecast.balancing"):
            raise ImportError("boom")
        return original_import(name, globals, locals, fromlist, level)

    original_import = builtins.__import__
    monkeypatch.setattr(builtins, "__import__", fake_import)

    module = importlib.reload(init_module)

    assert module.BalancingManager is None

    monkeypatch.setattr(builtins, "__import__", original_import)
    importlib.reload(init_module)


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


def test_remove_existing_panel_without_remove_method(monkeypatch):
    from homeassistant.components import frontend

    monkeypatch.delattr(frontend, "async_remove_panel", raising=False)
    init_module._remove_existing_panel(SimpleNamespace(), "panel-id")


def test_maybe_rename_entity_id_no_match():
    class DummyRegistry:
        def __init__(self):
            self.updated = False

        def async_update_entity(self, *_args, **_kwargs):
            self.updated = True

    entity_id, renamed = init_module._maybe_rename_entity_id(
        DummyRegistry(),
        "sensor.oig_123x",
        "oig_cloud_123",
        re.compile(r"^(.+?)(_\d+)$"),
    )

    assert entity_id == "sensor.oig_123x"
    assert renamed is False


def test_maybe_rename_entity_id_suffix_matches():
    class DummyRegistry:
        def __init__(self):
            self.updated = False

        def async_update_entity(self, *_args, **_kwargs):
            self.updated = True

    entity_id, renamed = init_module._maybe_rename_entity_id(
        DummyRegistry(),
        "sensor.oig_123_2",
        "oig_cloud_123_2",
        re.compile(r"^(.+?)(_\d+)$"),
    )

    assert entity_id == "sensor.oig_123_2"
    assert renamed is False


def test_resolve_entry_box_id_no_data():
    entry = SimpleNamespace(options={})
    coordinator = SimpleNamespace(data={})
    assert init_module._resolve_entry_box_id(entry, coordinator) is None


@pytest.mark.asyncio
async def test_init_balancing_manager_missing_class(monkeypatch):
    entry = SimpleNamespace(options={"balancing_enabled": True})
    coordinator = SimpleNamespace()
    monkeypatch.setattr(init_module, "BalancingManager", None)

    result = await init_module._init_balancing_manager(
        SimpleNamespace(), entry, coordinator, battery_prediction_enabled=True
    )

    assert result is None


def test_init_telemetry_store_no_box_id(monkeypatch):
    class DummyTelemetryStore:
        def __init__(self, *_args, **_kwargs):
            pass

    entry = SimpleNamespace(options={}, data={})
    coordinator = SimpleNamespace()

    from custom_components.oig_cloud.core import telemetry_store as telemetry_module

    monkeypatch.setattr(telemetry_module, "TelemetryStore", DummyTelemetryStore)
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        lambda _coord: None,
    )

    assert init_module._init_telemetry_store(SimpleNamespace(), entry, coordinator) is None


def test_device_name_matchers_empty():
    assert init_module._device_matches_keep_patterns("", ["Keep"]) is False
    assert init_module._device_matches_remove_regex("", [".*"]) is False


def test_infer_box_id_from_local_entities_exception(monkeypatch):
    hass = SimpleNamespace()

    def boom(_hass):
        raise RuntimeError("boom")

    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_get",
        boom,
    )
    assert init_module._infer_box_id_from_local_entities(hass) is None


@pytest.mark.asyncio
async def test_register_static_paths(monkeypatch, tmp_path):
    hass = SimpleNamespace(
        config=SimpleNamespace(path=lambda *parts: str(tmp_path.joinpath(*parts))),
        http=DummyHttp(),
    )

    class DummyStaticPathConfig:
        def __init__(self, url_path, path, cache_headers=False):
            self.url_path = url_path
            self.path = path
            self.cache_headers = cache_headers

    monkeypatch.setattr(
        "homeassistant.components.http.StaticPathConfig",
        DummyStaticPathConfig,
    )

    await init_module._register_static_paths(hass)
    assert hass.http.registered
    assert hass.http.registered[0].url_path == "/oig_cloud_static"


@pytest.mark.asyncio
async def test_setup_frontend_panel_registers(monkeypatch, tmp_path):
    entry = SimpleNamespace(entry_id="entry1", options={"box_id": "123"})

    async def fake_executor(func, *args, **kwargs):
        return func(*args, **kwargs)

    hass = SimpleNamespace(
        data={init_module.DOMAIN: {entry.entry_id: {"coordinator": SimpleNamespace(data={"123": {}})}}},
        states=SimpleNamespace(
            async_entity_ids=lambda: ["sensor.oig_123_remaining_usable_capacity"],
            get=lambda _eid: SimpleNamespace(state="ok"),
        ),
        async_add_executor_job=fake_executor,
        async_create_task=lambda coro: coro.close(),
    )

    async def fake_register(*_args, **_kwargs):
        return None

    def fake_remove(_hass, _panel_id, **_kwargs):
        return None

    monkeypatch.setattr(
        "homeassistant.components.frontend.async_register_built_in_panel",
        lambda *args, **kwargs: fake_register(),
    )
    monkeypatch.setattr(
        "homeassistant.components.frontend.async_remove_panel",
        fake_remove,
    )
    monkeypatch.setattr(
        init_module, "_read_manifest_file", lambda _path: "{\"version\": \"1.0.0\"}"
    )

    await init_module._setup_frontend_panel(hass, entry)


@pytest.mark.asyncio
async def test_remove_frontend_panel_handles_unknown(monkeypatch):
    entry = SimpleNamespace(entry_id="entry1")
    hass = SimpleNamespace()

    def fake_remove(_hass, _panel_id, **_kwargs):
        raise ValueError("unknown panel")

    monkeypatch.setattr(
        "homeassistant.components.frontend.async_remove_panel",
        fake_remove,
    )

    await init_module._remove_frontend_panel(hass, entry)
