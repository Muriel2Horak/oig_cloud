from __future__ import annotations

import importlib
import json
import sys
import types
from pathlib import Path
from types import SimpleNamespace


def _ensure_package(name: str, path: Path) -> None:
    module = sys.modules.get(name)
    if module is None:
        module = types.ModuleType(name)
        module.__path__ = [str(path)]
        sys.modules[name] = module


ROOT = Path(__file__).resolve().parents[1]
PACKAGE_ROOT = ROOT / "custom_components"
OIG_ROOT = PACKAGE_ROOT / "oig_cloud"
CONFIG_ROOT = OIG_ROOT / "config"
CORE_ROOT = OIG_ROOT / "core"
TEST_PACKAGE = "telemetry_mqtt_config_testpkg"

_ensure_package(TEST_PACKAGE, ROOT)
_ensure_package(f"{TEST_PACKAGE}.oig_cloud", OIG_ROOT)
_ensure_package(f"{TEST_PACKAGE}.oig_cloud.config", CONFIG_ROOT)
_ensure_package(f"{TEST_PACKAGE}.oig_cloud.core", CORE_ROOT)

try:
    import homeassistant  # noqa: F401
    import homeassistant.config_entries  # noqa: F401
    import homeassistant.const  # noqa: F401
    import homeassistant.core  # noqa: F401
    import homeassistant.exceptions  # noqa: F401
    import homeassistant.helpers.config_validation  # noqa: F401
    import homeassistant.helpers.event  # noqa: F401
    import homeassistant.helpers.selector  # noqa: F401
    import homeassistant.util.dt  # noqa: F401
except ImportError:
    homeassistant = types.ModuleType("homeassistant")
    config_entries = types.ModuleType("homeassistant.config_entries")
    const = types.ModuleType("homeassistant.const")
    core = types.ModuleType("homeassistant.core")
    exceptions = types.ModuleType("homeassistant.exceptions")
    helpers = types.ModuleType("homeassistant.helpers")
    config_validation = types.ModuleType("homeassistant.helpers.config_validation")
    event = types.ModuleType("homeassistant.helpers.event")
    selector = types.ModuleType("homeassistant.helpers.selector")
    util = types.ModuleType("homeassistant.util")
    util_dt = types.ModuleType("homeassistant.util.dt")

    class ConfigFlow:
        def __init__(self, *_args, **_kwargs) -> None:
            pass

    class OptionsFlow:
        def __init__(self, *_args, **_kwargs) -> None:
            pass

    class ConfigEntryState:
        SETUP_IN_PROGRESS = "setup_in_progress"
        LOADED = "loaded"

    class Platform:
        SENSOR = "sensor"
        SWITCH = "switch"

    class ConfigEntryAuthFailed(Exception):
        pass

    class ConfigEntryNotReady(Exception):
        pass

    setattr(config_entries, "ConfigFlow", ConfigFlow)
    setattr(config_entries, "OptionsFlow", OptionsFlow)
    setattr(config_entries, "ConfigEntry", object)
    setattr(config_entries, "ConfigEntryState", ConfigEntryState)
    setattr(config_entries, "ConfigFlowResult", dict)
    setattr(homeassistant, "__path__", [])
    setattr(const, "STATE_UNAVAILABLE", "unavailable")
    setattr(const, "STATE_UNKNOWN", "unknown")
    setattr(const, "Platform", Platform)
    setattr(core, "HomeAssistant", object)
    setattr(core, "Context", object)
    setattr(core, "callback", lambda func: func)
    setattr(helpers, "__path__", [])
    setattr(helpers, "selector", selector)
    setattr(helpers, "config_validation", config_validation)
    setattr(helpers, "event", event)
    setattr(util, "dt", util_dt)
    setattr(config_validation, "config_entry_only_config_schema", lambda domain: domain)
    setattr(event, "async_track_state_change_event", lambda *_a, **_k: None)
    setattr(event, "async_track_time_interval", lambda *_a, **_k: None)
    setattr(util_dt, "now", lambda: None)
    setattr(exceptions, "ConfigEntryAuthFailed", ConfigEntryAuthFailed)
    setattr(exceptions, "ConfigEntryNotReady", ConfigEntryNotReady)

    sys.modules["homeassistant"] = homeassistant
    sys.modules["homeassistant.config_entries"] = config_entries
    sys.modules["homeassistant.const"] = const
    sys.modules["homeassistant.core"] = core
    sys.modules["homeassistant.exceptions"] = exceptions
    sys.modules["homeassistant.helpers"] = helpers
    sys.modules["homeassistant.helpers.config_validation"] = config_validation
    sys.modules["homeassistant.helpers.event"] = event
    sys.modules["homeassistant.helpers.selector"] = selector
    sys.modules["homeassistant.util"] = util
    sys.modules["homeassistant.util.dt"] = util_dt

    setattr(homeassistant, "config_entries", config_entries)
    setattr(homeassistant, "const", const)
    setattr(homeassistant, "core", core)
    setattr(homeassistant, "exceptions", exceptions)
    setattr(homeassistant, "helpers", helpers)
    setattr(homeassistant, "util", util)

try:
    import aiohttp  # noqa: F401
except ImportError:
    aiohttp = types.ModuleType("aiohttp")

    class ClientTimeout:
        def __init__(self, *args, **kwargs) -> None:
            self.args = args
            self.kwargs = kwargs

    class TCPConnector:
        def __init__(self, *args, **kwargs) -> None:
            self.args = args
            self.kwargs = kwargs

    class ClientSession:
        def __init__(self, *args, **kwargs) -> None:
            self.args = args
            self.kwargs = kwargs

    class ClientConnectorError(Exception):
        pass

    class ClientResponseError(Exception):
        pass

    class ServerTimeoutError(Exception):
        pass

    class ClientResponse:
        pass

    setattr(aiohttp, "ClientTimeout", ClientTimeout)
    setattr(aiohttp, "TCPConnector", TCPConnector)
    setattr(aiohttp, "ClientSession", ClientSession)
    setattr(aiohttp, "ClientConnectorError", ClientConnectorError)
    setattr(aiohttp, "ClientResponseError", ClientResponseError)
    setattr(aiohttp, "ServerTimeoutError", ServerTimeoutError)
    setattr(aiohttp, "ClientResponse", ClientResponse)
    sys.modules["aiohttp"] = aiohttp

try:
    import certifi  # noqa: F401
except ImportError:
    certifi = types.ModuleType("certifi")
    setattr(certifi, "where", lambda: "/tmp/certifi.pem")
    sys.modules["certifi"] = certifi

try:
    import yarl  # noqa: F401
except ImportError:
    yarl = types.ModuleType("yarl")

    class URL(str):
        pass

    setattr(yarl, "URL", URL)
    sys.modules["yarl"] = yarl

if "voluptuous" not in sys.modules:
    voluptuous = types.ModuleType("voluptuous")
    _UNSET = object()

    class _Marker:
        def __init__(self, schema, default=_UNSET, description=None) -> None:
            self.schema = schema
            self.default = default
            self.description = description

        def __hash__(self) -> int:
            return hash((type(self), self.schema))

        def __eq__(self, other: object) -> bool:
            return (
                isinstance(other, type(self))
                and getattr(other, "schema", None) == self.schema
            )

    class Optional(_Marker):
        pass

    class Required(_Marker):
        pass

    class Schema:
        def __init__(self, schema) -> None:
            self.schema = schema

        def __call__(self, data):
            result = dict(data)
            if isinstance(self.schema, dict):
                for marker in self.schema:
                    key = getattr(marker, "schema", marker)
                    default = getattr(marker, "default", _UNSET)
                    if key not in result and default is not _UNSET:
                        result[key] = default() if callable(default) else default
            return result

    def _identity_validator(*_args, **_kwargs):
        return lambda value: value

    class Invalid(Exception):
        pass

    setattr(voluptuous, "Schema", Schema)
    setattr(voluptuous, "Optional", Optional)
    setattr(voluptuous, "Required", Required)
    setattr(voluptuous, "In", _identity_validator)
    setattr(voluptuous, "Coerce", _identity_validator)
    setattr(voluptuous, "All", _identity_validator)
    setattr(voluptuous, "Range", _identity_validator)
    setattr(voluptuous, "Invalid", Invalid)
    sys.modules["voluptuous"] = voluptuous

validation_module = types.ModuleType(f"{TEST_PACKAGE}.oig_cloud.config.validation")


class CannotConnect(Exception):
    pass


class InvalidAuth(Exception):
    pass


class LiveDataNotEnabled(Exception):
    pass


async def validate_input(*_args, **_kwargs):
    return None


setattr(validation_module, "CannotConnect", CannotConnect)
setattr(validation_module, "InvalidAuth", InvalidAuth)
setattr(validation_module, "LiveDataNotEnabled", LiveDataNotEnabled)
setattr(validation_module, "validate_input", validate_input)
sys.modules[f"{TEST_PACKAGE}.oig_cloud.config.validation"] = validation_module

data_source_module = types.ModuleType(f"{TEST_PACKAGE}.oig_cloud.core.data_source")
setattr(data_source_module, "PROXY_BOX_ID_ENTITY_ID", "sensor.oig_proxy_box_id")
setattr(data_source_module, "PROXY_LAST_DATA_ENTITY_ID", "sensor.oig_proxy_last_data")
sys.modules[f"{TEST_PACKAGE}.oig_cloud.core.data_source"] = data_source_module

const_module = importlib.import_module(f"{TEST_PACKAGE}.oig_cloud.const")
steps_module = importlib.import_module(f"{TEST_PACKAGE}.oig_cloud.config.steps")

WizardMixin = steps_module.WizardMixin
OigCloudOptionsFlowHandler = steps_module.OigCloudOptionsFlowHandler
CONF_USERNAME = const_module.CONF_USERNAME
TELEMETRY_MQTT_HOST = const_module.TELEMETRY_MQTT_HOST
TELEMETRY_MQTT_PORT = const_module.TELEMETRY_MQTT_PORT
TELEMETRY_MQTT_PREFIX = const_module.TELEMETRY_MQTT_PREFIX


def _mqtt_key(name: str, fallback: str) -> str:
    return getattr(const_module, name, fallback)


MQTT_ENABLED = _mqtt_key("CONF_TELEMETRY_MQTT_ENABLED", "telemetry_mqtt_enabled")
MQTT_HOST = _mqtt_key("CONF_TELEMETRY_MQTT_HOST", "telemetry_mqtt_host")
MQTT_PORT = _mqtt_key("CONF_TELEMETRY_MQTT_PORT", "telemetry_mqtt_port")
MQTT_PREFIX = _mqtt_key("CONF_TELEMETRY_MQTT_PREFIX", "telemetry_mqtt_prefix")


class DummyWizard(WizardMixin):
    def __init__(self) -> None:
        super().__init__()
        self.hass = SimpleNamespace(
            states=SimpleNamespace(get=lambda _eid: None),
            config=SimpleNamespace(latitude=50.0, longitude=14.0),
        )


class DummyOptionsFlow(OigCloudOptionsFlowHandler):
    pass


def test_mqtt_constants_are_declared_in_const_module():
    assert TELEMETRY_MQTT_HOST == "telemetry.muriel-cz.cz"
    assert TELEMETRY_MQTT_PORT == 1883
    assert TELEMETRY_MQTT_PREFIX == "oig/cloud-telemetry"


def test_build_options_payload_omits_legacy_mqtt_settings():
    flow = DummyWizard()

    payload = flow._build_options_payload({})

    assert MQTT_ENABLED not in payload
    assert MQTT_HOST not in payload
    assert MQTT_PORT not in payload
    assert MQTT_PREFIX not in payload


def test_build_options_payload_ignores_explicit_legacy_mqtt_settings():
    flow = DummyWizard()

    payload = flow._build_options_payload(
        {
            MQTT_ENABLED: True,
            MQTT_HOST: "mqtt.internal",
            MQTT_PORT: 2883,
            MQTT_PREFIX: "lab/oig",
        }
    )

    assert MQTT_ENABLED not in payload
    assert MQTT_HOST not in payload
    assert MQTT_PORT not in payload
    assert MQTT_PREFIX not in payload


def test_modules_schema_excludes_legacy_mqtt_controls():
    flow = DummyWizard()

    schema = flow._get_modules_schema({})
    field_names = {field.schema for field in schema.schema}
    validated = schema({})

    assert MQTT_ENABLED not in field_names
    assert MQTT_HOST not in field_names
    assert MQTT_PORT not in field_names
    assert MQTT_PREFIX not in field_names
    assert MQTT_ENABLED not in validated
    assert MQTT_HOST not in validated
    assert MQTT_PORT not in validated
    assert MQTT_PREFIX not in validated


def test_options_flow_init_does_not_surface_existing_mqtt_settings():
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={
            MQTT_ENABLED: True,
            MQTT_HOST: "broker.local",
            MQTT_PORT: 1884,
            MQTT_PREFIX: "custom/oig",
        },
    )

    flow = DummyOptionsFlow(entry)
    validated = flow._get_modules_schema()({})

    assert MQTT_ENABLED not in flow._wizard_data
    assert MQTT_HOST not in flow._wizard_data
    assert MQTT_PORT not in flow._wizard_data
    assert MQTT_PREFIX not in flow._wizard_data
    assert MQTT_ENABLED not in validated
    assert MQTT_HOST not in validated
    assert MQTT_PORT not in validated
    assert MQTT_PREFIX not in validated


def test_manifest_declares_paho_mqtt_requirement():
    manifest_path = ROOT / "custom_components" / "oig_cloud" / "manifest.json"

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    assert any(
        requirement.startswith("paho-mqtt")
        for requirement in manifest.get("requirements", [])
    )
