from __future__ import annotations

import asyncio
import importlib
import importlib.util
import sys
import types
from pathlib import Path
from types import SimpleNamespace

import pytest


ROOT = Path(__file__).resolve().parents[1]
OIG_ROOT = ROOT / "custom_components" / "oig_cloud"
CORE_ROOT = OIG_ROOT / "core"
LIB_ROOT = OIG_ROOT / "lib"
LIB_OIG_ROOT = LIB_ROOT / "oig_cloud_client"
LIB_API_ROOT = LIB_OIG_ROOT / "api"
SHIELD_ROOT = OIG_ROOT / "shield"
TEST_PACKAGE = "init_extra_testpkg"


def _ensure_package(name: str, path: Path) -> None:
    module = sys.modules.get(name)
    if module is None:
        module = types.ModuleType(name)
        module.__path__ = [str(path)]
        sys.modules[name] = module


def _load_package_module(name: str, path: Path) -> types.ModuleType:
    spec = importlib.util.spec_from_file_location(
        name,
        path,
        submodule_search_locations=[str(path.parent)],
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def _new_module(name: str, **attrs: object) -> types.ModuleType:
    module = types.ModuleType(name)
    module.__dict__.update(attrs)
    return module


def _install_test_stubs() -> None:
    _ensure_package(TEST_PACKAGE, ROOT)
    _ensure_package(f"{TEST_PACKAGE}.oig_cloud.core", CORE_ROOT)
    _ensure_package(f"{TEST_PACKAGE}.oig_cloud.lib", LIB_ROOT)
    _ensure_package(f"{TEST_PACKAGE}.oig_cloud.lib.oig_cloud_client", LIB_OIG_ROOT)
    _ensure_package(f"{TEST_PACKAGE}.oig_cloud.lib.oig_cloud_client.api", LIB_API_ROOT)
    _ensure_package(f"{TEST_PACKAGE}.oig_cloud.shield", SHIELD_ROOT)

    try:
        import homeassistant  # noqa: F401
        import homeassistant.config_entries  # noqa: F401
        import homeassistant.const  # noqa: F401
        import homeassistant.core  # noqa: F401
        import homeassistant.exceptions  # noqa: F401
        import homeassistant.helpers.config_validation  # noqa: F401
        import homeassistant.helpers.event  # noqa: F401
        import homeassistant.util.dt  # noqa: F401
    except ImportError:
        class ConfigEntry:
            pass

        class ConfigEntryState:
            SETUP_IN_PROGRESS = "setup_in_progress"
            LOADED = "loaded"

        class HomeAssistant:
            pass

        class Context:
            pass

        class ConfigEntryAuthFailed(Exception):
            pass

        class ConfigEntryNotReady(Exception):
            pass

        class Platform:
            SENSOR = "sensor"
            SWITCH = "switch"

        def callback(func):
            return func

        config_entries = _new_module(
            "homeassistant.config_entries",
            ConfigEntry=ConfigEntry,
            ConfigEntryState=ConfigEntryState,
        )
        core = _new_module(
            "homeassistant.core",
            HomeAssistant=HomeAssistant,
            Context=Context,
            callback=callback,
        )
        ha_const = _new_module("homeassistant.const", Platform=Platform)
        exceptions = _new_module(
            "homeassistant.exceptions",
            ConfigEntryAuthFailed=ConfigEntryAuthFailed,
            ConfigEntryNotReady=ConfigEntryNotReady,
        )
        config_validation = _new_module(
            "homeassistant.helpers.config_validation",
            config_entry_only_config_schema=lambda domain: domain,
        )
        event = _new_module(
            "homeassistant.helpers.event",
            async_track_state_change_event=lambda *_a, **_k: None,
            async_track_time_interval=lambda *_a, **_k: None,
        )
        helpers = _new_module(
            "homeassistant.helpers",
            config_validation=config_validation,
            event=event,
        )
        dt_module = _new_module("homeassistant.util.dt", now=lambda: None)
        util = _new_module("homeassistant.util", dt=dt_module)
        homeassistant = _new_module(
            "homeassistant",
            config_entries=config_entries,
            core=core,
            const=ha_const,
            exceptions=exceptions,
            helpers=helpers,
            util=util,
        )

        sys.modules["homeassistant"] = homeassistant
        sys.modules["homeassistant.config_entries"] = config_entries
        sys.modules["homeassistant.core"] = core
        sys.modules["homeassistant.const"] = ha_const
        sys.modules["homeassistant.exceptions"] = exceptions
        sys.modules["homeassistant.helpers"] = helpers
        sys.modules["homeassistant.helpers.config_validation"] = config_validation
        sys.modules["homeassistant.helpers.event"] = event
        sys.modules["homeassistant.util"] = util
        sys.modules["homeassistant.util.dt"] = dt_module

    if "voluptuous" not in sys.modules:
        sys.modules["voluptuous"] = types.ModuleType("voluptuous")

    coordinator_module = _new_module(
        f"{TEST_PACKAGE}.oig_cloud.core.coordinator",
        OigCloudCoordinator=type("OigCloudCoordinator", (), {}),
    )
    sys.modules.setdefault(
        f"{TEST_PACKAGE}.oig_cloud.core.coordinator", coordinator_module
    )

    data_source_module = _new_module(
        f"{TEST_PACKAGE}.oig_cloud.core.data_source",
        DATA_SOURCE_CLOUD_ONLY="cloud_only",
        DEFAULT_DATA_SOURCE_MODE="cloud_only",
        DEFAULT_LOCAL_EVENT_DEBOUNCE_MS=1000,
        DEFAULT_PROXY_STALE_MINUTES=5,
        DataSourceController=type("DataSourceController", (), {}),
        get_data_source_state=lambda *_a, **_k: SimpleNamespace(
            effective_mode="cloud_only",
            configured_mode="cloud_only",
            local_available=False,
        ),
        init_data_source_state=lambda *_a, **_k: None,
    )
    sys.modules.setdefault(
        f"{TEST_PACKAGE}.oig_cloud.core.data_source", data_source_module
    )

    api_module = _new_module(
        f"{TEST_PACKAGE}.oig_cloud.lib.oig_cloud_client.api.oig_cloud_api",
        OigCloudApi=type("OigCloudApi", (), {}),
        OigCloudAuthError=type("OigCloudAuthError", (Exception,), {}),
    )
    sys.modules.setdefault(
        f"{TEST_PACKAGE}.oig_cloud.lib.oig_cloud_client.api.oig_cloud_api", api_module
    )

    for module_name in (
        f"{TEST_PACKAGE}.oig_cloud.shield.dispatch",
        f"{TEST_PACKAGE}.oig_cloud.shield.queue",
        f"{TEST_PACKAGE}.oig_cloud.shield.validation",
    ):
        module = _new_module(
            module_name,
            log_event=lambda *_a, **_k: None,
            safe_call_service=lambda *_a, **_k: None,
            start_monitoring_task=lambda *_a, **_k: None,
            check_entities_periodically=lambda *_a, **_k: None,
            check_loop=lambda *_a, **_k: None,
            start_monitoring=lambda *_a, **_k: None,
            async_check_loop=lambda *_a, **_k: None,
            extract_expected_entities=lambda *_a, **_k: {},
            check_entity_state_change=lambda *_a, **_k: True,
        )
        sys.modules.setdefault(module_name, module)

    if "homeassistant.helpers.device_registry" not in sys.modules:
        device_registry_module = _new_module(
            "homeassistant.helpers.device_registry",
            async_get=lambda *_a, **_k: None,
            async_entries_for_config_entry=lambda *_a, **_k: [],
        )
        sys.modules.setdefault(
            "homeassistant.helpers.device_registry", device_registry_module
        )
    else:
        device_registry_module = sys.modules["homeassistant.helpers.device_registry"]

    if "homeassistant.helpers.entity_registry" not in sys.modules:
        entity_registry_module = _new_module(
            "homeassistant.helpers.entity_registry",
            async_get=lambda *_a, **_k: None,
            async_entries_for_device=lambda *_a, **_k: [],
            async_entries_for_config_entry=lambda *_a, **_k: [],
        )
        sys.modules.setdefault(
            "homeassistant.helpers.entity_registry", entity_registry_module
        )
    else:
        entity_registry_module = sys.modules["homeassistant.helpers.entity_registry"]

    helpers_module = sys.modules.get("homeassistant.helpers")
    if helpers_module is not None:
        setattr(helpers_module, "device_registry", device_registry_module)
        setattr(helpers_module, "entity_registry", entity_registry_module)

    async def _async_unload_services(*_args, **_kwargs):
        return None

    services_module = _new_module(
        f"{TEST_PACKAGE}.oig_cloud.services",
        async_unload_services=_async_unload_services,
    )
    sys.modules.setdefault(f"{TEST_PACKAGE}.oig_cloud.services", services_module)


_install_test_stubs()

init_module = _load_package_module(f"{TEST_PACKAGE}.oig_cloud", OIG_ROOT / "__init__.py")
const_module = importlib.import_module(f"{TEST_PACKAGE}.oig_cloud.const")
shield_core_module = importlib.import_module(f"{TEST_PACKAGE}.oig_cloud.shield.core")

DOMAIN = const_module.DOMAIN
ServiceShield = shield_core_module.ServiceShield


class DummyDevice:
    def __init__(self, device_id, name):
        self.id = device_id
        self.name = name


class DummyDeviceRegistry:
    def __init__(self, devices):
        self.devices = devices
        self.removed = []

    def async_remove_device(self, device_id):
        self.removed.append(device_id)


class DummyEntityRegistry:
    def __init__(self, entities_by_device):
        self.entities_by_device = entities_by_device


class DummyConfigEntries:
    def __init__(self):
        self.updated = []
        self.reloaded = []
        self.unloaded = []

    def async_update_entry(self, entry, options=None):
        entry.options = options or {}
        self.updated.append(entry)

    async def async_unload_platforms(self, entry, platforms):
        self.unloaded.append((entry, platforms))
        return True

    async def async_reload(self, entry_id):
        self.reloaded.append(entry_id)


class DummyHass:
    def __init__(self):
        self.data = {DOMAIN: {}}
        self.config_entries = DummyConfigEntries()

    def async_create_task(self, coro):
        coro.close()
        return object()


@pytest.mark.asyncio
async def test_setup_telemetry_is_legacy_noop():
    hass = SimpleNamespace(data={"core.uuid": "abc"})

    await init_module._setup_telemetry(hass, "user@example.com")

    assert DOMAIN not in hass.data or "telemetry" not in hass.data[DOMAIN]


@pytest.mark.asyncio
async def test_async_setup(monkeypatch):
    hass = SimpleNamespace(data={})
    called = {"static": 0}

    async def fake_register(_hass):
        called["static"] += 1

    monkeypatch.setattr(init_module, "_register_static_paths", fake_register)

    result = await init_module.async_setup(hass, {})

    assert result is True
    assert called["static"] == 1
    assert DOMAIN in hass.data


@pytest.mark.asyncio
async def test_cleanup_unused_devices(monkeypatch):
    devices = [
        DummyDevice("dev1", "OIG Cloud Home"),
        DummyDevice("dev2", "Random Device"),
        DummyDevice("dev3", "ServiceShield"),
    ]
    device_registry = DummyDeviceRegistry(devices)
    entity_registry = DummyEntityRegistry({"dev2": []})

    hass = SimpleNamespace()
    entry = SimpleNamespace(entry_id="entry1")

    monkeypatch.setattr(
        "homeassistant.helpers.device_registry.async_get",
        lambda _hass: device_registry,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_get",
        lambda _hass: entity_registry,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.device_registry.async_entries_for_config_entry",
        lambda _reg, _entry_id: devices,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_entries_for_device",
        lambda _reg, device_id: entity_registry.entities_by_device.get(device_id, []),
    )

    await init_module._cleanup_unused_devices(hass, entry)

    assert "dev2" in device_registry.removed
    assert "dev1" not in device_registry.removed
    assert "dev3" not in device_registry.removed


@pytest.mark.asyncio
async def test_cleanup_unused_devices_regex_and_remove_error(monkeypatch):
    devices = [
        DummyDevice("dev1", "OIG Test Statistics"),
        DummyDevice("dev2", "Another Device"),
    ]
    device_registry = DummyDeviceRegistry(devices)
    entity_registry = DummyEntityRegistry({"dev1": [], "dev2": []})

    def _remove_device(device_id):
        if device_id == "dev2":
            raise RuntimeError("boom")
        device_registry.removed.append(device_id)

    device_registry.async_remove_device = _remove_device

    hass = SimpleNamespace()
    entry = SimpleNamespace(entry_id="entry1")

    monkeypatch.setattr(
        "homeassistant.helpers.device_registry.async_get",
        lambda _hass: device_registry,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_get",
        lambda _hass: entity_registry,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.device_registry.async_entries_for_config_entry",
        lambda _reg, _entry_id: devices,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_entries_for_device",
        lambda _reg, device_id: entity_registry.entities_by_device.get(device_id, []),
    )

    await init_module._cleanup_unused_devices(hass, entry)

    assert "dev1" in device_registry.removed


@pytest.mark.asyncio
async def test_cleanup_unused_devices_none_removed(monkeypatch):
    devices = [DummyDevice("dev1", "OIG Cloud Home")]
    device_registry = DummyDeviceRegistry(devices)
    entity_registry = DummyEntityRegistry({"dev1": ["entity"]})

    hass = SimpleNamespace()
    entry = SimpleNamespace(entry_id="entry1")

    monkeypatch.setattr(
        "homeassistant.helpers.device_registry.async_get",
        lambda _hass: device_registry,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_get",
        lambda _hass: entity_registry,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.device_registry.async_entries_for_config_entry",
        lambda _reg, _entry_id: devices,
    )
    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_entries_for_device",
        lambda _reg, device_id: entity_registry.entities_by_device.get(device_id, []),
    )

    await init_module._cleanup_unused_devices(hass, entry)

    assert device_registry.removed == []


@pytest.mark.asyncio
async def test_async_remove_config_entry_device(monkeypatch):
    device_entry = SimpleNamespace(
        id="dev1", identifiers={(DOMAIN, "123")}
    )
    hass = SimpleNamespace()

    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_get",
        lambda _hass: SimpleNamespace(),
    )
    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_entries_for_device",
        lambda *_a, **_k: [],
    )

    allowed = await init_module.async_remove_config_entry_device(
        hass, SimpleNamespace(), device_entry
    )

    assert allowed is True

    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_entries_for_device",
        lambda *_a, **_k: [SimpleNamespace(entity_id="sensor.test")],
    )

    denied = await init_module.async_remove_config_entry_device(
        hass, SimpleNamespace(), device_entry
    )

    assert denied is False


@pytest.mark.asyncio
async def test_async_remove_config_entry_device_exception(monkeypatch):
    device_entry = SimpleNamespace(id="dev1", identifiers={(DOMAIN, "123")})
    hass = SimpleNamespace()

    def boom(_hass):
        raise RuntimeError("boom")

    monkeypatch.setattr(
        "homeassistant.helpers.entity_registry.async_get",
        boom,
    )

    allowed = await init_module.async_remove_config_entry_device(
        hass, SimpleNamespace(), device_entry
    )

    assert allowed is False


@pytest.mark.asyncio
async def test_async_unload_entry(monkeypatch):
    hass = DummyHass()
    entry = SimpleNamespace(entry_id="entry1")
    called = {"remove": 0, "stop": 0, "close": 0}

    async def fake_remove(_hass, _entry):
        called["remove"] += 1

    class DummyController:
        async def async_stop(self):
            called["stop"] += 1

    class DummySession:
        async def close(self):
            called["close"] += 1

    hass.data[DOMAIN][entry.entry_id] = {
        "data_source_controller": DummyController(),
        "session_manager": DummySession(),
    }

    monkeypatch.setattr(init_module, "_remove_frontend_panel", fake_remove)
    result = await init_module.async_unload_entry(hass, entry)

    assert result is True
    assert called["remove"] == 1
    assert called["stop"] == 1
    assert called["close"] == 1
    assert entry.entry_id not in hass.data[DOMAIN]


@pytest.mark.asyncio
async def test_async_unload_entry_handles_stop_error(monkeypatch):
    hass = DummyHass()
    entry = SimpleNamespace(entry_id="entry1")

    async def fake_remove(_hass, _entry):
        return None

    class DummyController:
        async def async_stop(self):
            raise RuntimeError("boom")

    class DummySession:
        async def close(self):
            return None

    hass.data[DOMAIN][entry.entry_id] = {
        "data_source_controller": DummyController(),
        "session_manager": DummySession(),
    }

    monkeypatch.setattr(init_module, "_remove_frontend_panel", fake_remove)

    result = await init_module.async_unload_entry(hass, entry)

    assert result is True
    assert entry.entry_id not in hass.data[DOMAIN]


@pytest.mark.asyncio
async def test_service_shield_cleanup_reraises_cancelled_check_task():
    shield = ServiceShield.__new__(ServiceShield)
    shield.mode_tracker = None
    shield._state_listener_unsub = None
    shield._telemetry_handler = None
    shield._logger = SimpleNamespace(info=lambda *_a, **_k: None)

    class CancelledTask:
        def done(self):
            return False

        def cancel(self):
            return None

        def __await__(self):
            async def _raise():
                raise asyncio.CancelledError

            return _raise().__await__()

    shield.check_task = CancelledTask()

    with pytest.raises(asyncio.CancelledError):
        await ServiceShield.cleanup(shield)


@pytest.mark.asyncio
async def test_async_reload_entry(monkeypatch):
    hass = DummyHass()
    entry = SimpleNamespace(entry_id="entry1", hass=hass)
    called = {"unload": 0, "setup": 0}

    async def fake_unload(_hass, _entry):
        called["unload"] += 1
        return True

    async def fake_setup(_hass, _entry):
        called["setup"] += 1
        return True

    monkeypatch.setattr(init_module, "async_unload_entry", fake_unload)
    monkeypatch.setattr(init_module, "async_setup_entry", fake_setup)

    await init_module.async_reload_entry(entry)

    assert called["unload"] == 1
    assert called["setup"] == 1


@pytest.mark.asyncio
async def test_async_update_options_disabled(monkeypatch):
    hass = DummyHass()
    entry = SimpleNamespace(
        entry_id="entry1",
        options={"enable_dashboard": False},
    )
    hass.data[DOMAIN][entry.entry_id] = {"config": {}}
    called = {"remove": 0}

    async def fake_remove(_hass, _entry):
        called["remove"] += 1

    monkeypatch.setattr(init_module, "_remove_frontend_panel", fake_remove)

    await init_module.async_update_options(hass, entry)
    assert called["remove"] == 1


@pytest.mark.asyncio
async def test_async_update_options_enable_dashboard(monkeypatch):
    class Options(dict):
        def get(self, key, default=None):
            if key == "enable_dashboard":
                return False
            return super().get(key, default)

    hass = DummyHass()
    entry = SimpleNamespace(
        entry_id="entry1",
        options=Options({"enable_dashboard": True}),
    )
    hass.data[DOMAIN][entry.entry_id] = {"config": {}}
    called = {"setup": 0}

    async def fake_setup(_hass, _entry):
        called["setup"] += 1

    monkeypatch.setattr(init_module, "_setup_frontend_panel", fake_setup)

    await init_module.async_update_options(hass, entry)

    assert called["setup"] == 1
    assert hass.data[DOMAIN][entry.entry_id]["dashboard_enabled"] is True
    assert hass.data[DOMAIN][entry.entry_id]["config"]["enable_dashboard"] is True


@pytest.mark.asyncio
async def test_async_update_options_needs_reload(monkeypatch):
    hass = DummyHass()
    entry = SimpleNamespace(
        entry_id="entry1",
        options={"enable_dashboard": False, "_needs_reload": True},
    )
    hass.data[DOMAIN][entry.entry_id] = {"config": {}}
    hass.async_create_task = lambda coro: asyncio.create_task(coro)

    async def fake_remove(_hass, _entry):
        return None

    monkeypatch.setattr(init_module, "_remove_frontend_panel", fake_remove)

    await init_module.async_update_options(hass, entry)

    await asyncio.sleep(0)
    assert hass.config_entries.reloaded == ["entry1"]


@pytest.mark.asyncio
async def test_async_update_options_disable_dashboard_change(monkeypatch):
    class Options(dict):
        def get(self, key, default=None):
            if key == "enable_dashboard":
                return True
            return super().get(key, default)

    hass = DummyHass()
    entry = SimpleNamespace(
        entry_id="entry1",
        options=Options({"enable_dashboard": False}),
    )
    hass.data[DOMAIN][entry.entry_id] = {"config": {}}
    called = {"remove": 0}

    async def fake_remove(_hass, _entry):
        called["remove"] += 1

    monkeypatch.setattr(init_module, "_remove_frontend_panel", fake_remove)

    await init_module.async_update_options(hass, entry)

    assert called["remove"] == 1


@pytest.mark.asyncio
async def test_cleanup_unused_devices_exception(monkeypatch):
    entry = SimpleNamespace(entry_id="entry1")
    hass = SimpleNamespace()

    def boom(_hass):
        raise RuntimeError("boom")

    monkeypatch.setattr(
        "homeassistant.helpers.device_registry.async_get",
        boom,
    )

    await init_module._cleanup_unused_devices(hass, entry)
