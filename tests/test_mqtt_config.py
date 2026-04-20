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

_ensure_package("custom_components", PACKAGE_ROOT)
_ensure_package("custom_components.oig_cloud", OIG_ROOT)
_ensure_package("custom_components.oig_cloud.config", CONFIG_ROOT)
_ensure_package("custom_components.oig_cloud.core", CORE_ROOT)

if "homeassistant" not in sys.modules:
    homeassistant = types.ModuleType("homeassistant")
    config_entries = types.ModuleType("homeassistant.config_entries")
    const = types.ModuleType("homeassistant.const")
    core = types.ModuleType("homeassistant.core")
    helpers = types.ModuleType("homeassistant.helpers")
    selector = types.ModuleType("homeassistant.helpers.selector")

    class ConfigFlow:
        def __init__(self, *_args, **_kwargs) -> None:
            pass

    class OptionsFlow:
        def __init__(self, *_args, **_kwargs) -> None:
            pass

    setattr(config_entries, "ConfigFlow", ConfigFlow)
    setattr(config_entries, "OptionsFlow", OptionsFlow)
    setattr(config_entries, "ConfigEntry", object)
    setattr(config_entries, "ConfigFlowResult", dict)
    setattr(const, "STATE_UNAVAILABLE", "unavailable")
    setattr(const, "STATE_UNKNOWN", "unknown")
    setattr(core, "HomeAssistant", object)
    setattr(core, "callback", lambda func: func)
    setattr(helpers, "selector", selector)

    sys.modules["homeassistant"] = homeassistant
    sys.modules["homeassistant.config_entries"] = config_entries
    sys.modules["homeassistant.const"] = const
    sys.modules["homeassistant.core"] = core
    sys.modules["homeassistant.helpers"] = helpers
    sys.modules["homeassistant.helpers.selector"] = selector

    setattr(homeassistant, "config_entries", config_entries)
    setattr(homeassistant, "const", const)
    setattr(homeassistant, "core", core)
    setattr(homeassistant, "helpers", helpers)

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

validation_module = types.ModuleType("custom_components.oig_cloud.config.validation")


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
sys.modules["custom_components.oig_cloud.config.validation"] = validation_module

data_source_module = types.ModuleType("custom_components.oig_cloud.core.data_source")
setattr(data_source_module, "PROXY_BOX_ID_ENTITY_ID", "sensor.oig_proxy_box_id")
setattr(data_source_module, "PROXY_LAST_DATA_ENTITY_ID", "sensor.oig_proxy_last_data")
sys.modules["custom_components.oig_cloud.core.data_source"] = data_source_module

const_module = importlib.import_module("custom_components.oig_cloud.const")
steps_module = importlib.import_module("custom_components.oig_cloud.config.steps")

WizardMixin = steps_module.WizardMixin
OigCloudOptionsFlowHandler = steps_module.OigCloudOptionsFlowHandler
CONF_USERNAME = const_module.CONF_USERNAME


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
    assert getattr(const_module, "CONF_TELEMETRY_MQTT_ENABLED", None) == MQTT_ENABLED
    assert getattr(const_module, "CONF_TELEMETRY_MQTT_HOST", None) == MQTT_HOST
    assert getattr(const_module, "CONF_TELEMETRY_MQTT_PORT", None) == MQTT_PORT
    assert getattr(const_module, "CONF_TELEMETRY_MQTT_PREFIX", None) == MQTT_PREFIX


def test_build_options_payload_uses_inert_mqtt_defaults():
    flow = DummyWizard()

    payload = flow._build_options_payload({})

    assert payload[MQTT_ENABLED] is False
    assert payload[MQTT_HOST] == ""
    assert payload[MQTT_PORT] == 1883
    assert payload[MQTT_PREFIX] == "oig/cloud-telemetry"


def test_build_options_payload_maps_explicit_mqtt_settings():
    flow = DummyWizard()

    payload = flow._build_options_payload(
        {
            MQTT_ENABLED: True,
            MQTT_HOST: "mqtt.internal",
            MQTT_PORT: 2883,
            MQTT_PREFIX: "lab/oig",
        }
    )

    assert payload[MQTT_ENABLED] is True
    assert payload[MQTT_HOST] == "mqtt.internal"
    assert payload[MQTT_PORT] == 2883
    assert payload[MQTT_PREFIX] == "lab/oig"


def test_modules_schema_includes_mqtt_controls_with_defaults():
    flow = DummyWizard()

    schema = flow._get_modules_schema({})
    field_names = {field.schema for field in schema.schema}
    validated = schema({})

    assert MQTT_ENABLED in field_names
    assert MQTT_HOST in field_names
    assert MQTT_PORT in field_names
    assert MQTT_PREFIX in field_names
    assert validated[MQTT_ENABLED] is False
    assert validated[MQTT_HOST] == ""
    assert validated[MQTT_PORT] == 1883
    assert validated[MQTT_PREFIX] == "oig/cloud-telemetry"


def test_options_flow_init_prefills_existing_mqtt_settings():
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

    assert flow._wizard_data[MQTT_ENABLED] is True
    assert flow._wizard_data[MQTT_HOST] == "broker.local"
    assert flow._wizard_data[MQTT_PORT] == 1884
    assert flow._wizard_data[MQTT_PREFIX] == "custom/oig"
    assert validated[MQTT_ENABLED] is True
    assert validated[MQTT_HOST] == "broker.local"
    assert validated[MQTT_PORT] == 1884
    assert validated[MQTT_PREFIX] == "custom/oig"


def test_manifest_declares_paho_mqtt_requirement():
    manifest_path = ROOT / "custom_components" / "oig_cloud" / "manifest.json"

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    assert any(
        requirement.startswith("paho-mqtt")
        for requirement in manifest.get("requirements", [])
    )
