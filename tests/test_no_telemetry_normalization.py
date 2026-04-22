from __future__ import annotations

import importlib
import importlib.util
import datetime as dt
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
TEST_PACKAGE = "telemetry_normalization_testpkg"


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

    if "homeassistant" not in sys.modules:
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
        dt_module = _new_module("homeassistant.util.dt", now=lambda: dt.datetime.now())
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


_install_test_stubs()

init_module = _load_package_module(f"{TEST_PACKAGE}.oig_cloud", OIG_ROOT / "__init__.py")
const_module = importlib.import_module(f"{TEST_PACKAGE}.oig_cloud.const")
shield_core_module = importlib.import_module(f"{TEST_PACKAGE}.oig_cloud.shield.core")
logging_module = importlib.import_module(f"{TEST_PACKAGE}.oig_cloud.shared.logging")

CONF_NO_TELEMETRY = const_module.CONF_NO_TELEMETRY
CONF_PASSWORD = const_module.CONF_PASSWORD
CONF_USERNAME = const_module.CONF_USERNAME
DOMAIN = const_module.DOMAIN
ServiceShield = shield_core_module.ServiceShield

MISSING = object()


def _make_entry(*, data_flag=MISSING, options_flag=MISSING):
    data = {CONF_USERNAME: "user", CONF_PASSWORD: "pass"}
    options = {}

    if data_flag is not MISSING:
        data[CONF_NO_TELEMETRY] = data_flag
    if options_flag is not MISSING:
        options[CONF_NO_TELEMETRY] = options_flag

    return SimpleNamespace(data=data, options=options)


@pytest.mark.parametrize(
    ("data_flag", "options_flag", "expected"),
    [
        (MISSING, MISSING, False),
        (MISSING, False, False),
        (MISSING, True, False),
        (False, MISSING, False),
        (False, False, False),
        (False, True, False),
        (True, MISSING, False),
        (True, False, False),
        (True, True, False),
    ],
)
def test_resolve_no_telemetry_ignores_legacy_entry_data_and_options(
    data_flag, options_flag, expected
):
    entry = _make_entry(data_flag=data_flag, options_flag=options_flag)

    assert logging_module.resolve_no_telemetry(entry) is expected


@pytest.mark.parametrize(
    ("data_flag", "options_flag", "expected"),
    [
        (MISSING, MISSING, False),
        (MISSING, False, False),
        (MISSING, True, False),
        (False, MISSING, False),
        (False, False, False),
        (False, True, False),
        (True, MISSING, False),
        (True, False, False),
        (True, True, False),
    ],
)
def test_load_entry_auth_config_ignores_legacy_no_telemetry_flags(
    monkeypatch, data_flag, options_flag, expected
):
    entry = _make_entry(data_flag=data_flag, options_flag=options_flag)
    setup_calls: list[str] = []

    def _record_setup(*_args, **_kwargs):
        setup_calls.append("setup")
        return object()

    monkeypatch.setattr(
        shield_core_module,
        "setup_simple_telemetry",
        _record_setup,
        raising=False,
    )

    _, _, no_telemetry, _, _ = init_module._load_entry_auth_config(entry)

    assert no_telemetry is expected
    assert setup_calls == []


@pytest.mark.parametrize(
    ("data_flag", "options_flag", "expected"),
    [
        (MISSING, MISSING, False),
        (MISSING, False, False),
        (MISSING, True, False),
        (False, MISSING, False),
        (False, False, False),
        (False, True, False),
        (True, MISSING, False),
        (True, False, False),
        (True, True, False),
    ],
)
def test_service_shield_constructor_never_calls_legacy_simple_telemetry_setup(
    monkeypatch, data_flag, options_flag, expected
):
    entry = _make_entry(data_flag=data_flag, options_flag=options_flag)
    hass = SimpleNamespace(data={"core.uuid": "core-uuid"})
    setup_calls: list[str] = []

    def _record_setup(*_args, **_kwargs):
        setup_calls.append("setup")
        return object()

    monkeypatch.setattr(
        shield_core_module,
        "setup_simple_telemetry",
        _record_setup,
        raising=False,
    )

    _, _, no_telemetry, _, _ = init_module._load_entry_auth_config(entry)
    shield = ServiceShield(hass, entry)

    assert no_telemetry is expected
    assert setup_calls == []
    assert shield.telemetry_handler is None


@pytest.mark.asyncio
async def test_service_shield_legacy_raw_logging_is_disabled_after_lazy_binding(monkeypatch):
    entry = _make_entry()
    hass = SimpleNamespace(data={"core.uuid": "core-uuid"})

    class RecordingEmitter:
        def __init__(self):
            self.raw_events = []
            self.cloud_calls = 0

        async def emit_raw_event(self, event):
            self.raw_events.append(dict(event))
            return True

        async def emit_cloud_event(self, event):
            self.cloud_calls += 1
            return True

    shield = ServiceShield(hass, entry)
    emitter = RecordingEmitter()

    await shield._log_telemetry("ignored", "svc", {"reason": "before_bind"})
    shield.bind_telemetry_emitter(emitter)
    await shield._log_telemetry("ignored", "svc", {"reason": "after_bind"})

    assert emitter.cloud_calls == 0
    assert emitter.raw_events == []


def test_setup_service_shield_data_binds_entry_scoped_emitter(monkeypatch):
    class DummyShield:
        def __init__(self):
            self.bound_emitter = None

        def bind_telemetry_emitter(self, emitter):
            self.bound_emitter = emitter

        def get_shield_status(self):
            return {"status": "ok"}

        def get_queue_info(self):
            return {"queue": 0}

    entry_emitter = object()
    other_emitter = object()
    entry = SimpleNamespace(entry_id="entry-1", options={"box_id": "123"})
    hass = SimpleNamespace(
        data={
            DOMAIN: {
                "shield": SimpleNamespace(bound_emitter=other_emitter),
                "entry-1": {"telemetry": {"emitter": entry_emitter}},
                "entry-2": {"telemetry": {"emitter": other_emitter}},
            }
        }
    )
    shield = DummyShield()

    init_module._setup_service_shield_data(hass, entry, SimpleNamespace(), shield)

    assert shield.bound_emitter is entry_emitter
    assert hass.data[DOMAIN]["shield"] is shield


@pytest.mark.asyncio
async def test_service_shield_log_telemetry_swallows_raw_emitter_failures(
    monkeypatch, caplog
):
    entry = _make_entry()
    hass = SimpleNamespace(data={"core.uuid": "core-uuid"})

    class FailingEmitter:
        async def emit_raw_event(self, event):
            raise RuntimeError(f"boom: {event['event_type']}")

    monkeypatch.setattr(
        shield_core_module,
        "setup_simple_telemetry",
        lambda *_a, **_k: None,
        raising=False,
    )

    shield = ServiceShield(hass, entry)
    shield.bind_telemetry_emitter(FailingEmitter())

    with caplog.at_level("ERROR"):
        await shield._log_telemetry("timeout", "svc", {"reason": "test"})

    assert "Failed to log telemetry" not in caplog.text
