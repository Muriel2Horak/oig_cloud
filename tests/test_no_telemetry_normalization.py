from __future__ import annotations

import datetime as dt
import sys
import types
from types import SimpleNamespace

import pytest


def _new_module(name: str, **attrs: object) -> types.ModuleType:
    module = types.ModuleType(name)
    module.__dict__.update(attrs)
    return module


def _install_test_stubs() -> None:
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
        "custom_components.oig_cloud.core.coordinator",
        OigCloudCoordinator=type("OigCloudCoordinator", (), {}),
    )
    sys.modules.setdefault(
        "custom_components.oig_cloud.core.coordinator", coordinator_module
    )

    data_source_module = _new_module(
        "custom_components.oig_cloud.core.data_source",
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
        "custom_components.oig_cloud.core.data_source", data_source_module
    )

    api_module = _new_module(
        "custom_components.oig_cloud.lib.oig_cloud_client.api.oig_cloud_api",
        OigCloudApi=type("OigCloudApi", (), {}),
        OigCloudAuthError=type("OigCloudAuthError", (Exception,), {}),
    )
    sys.modules.setdefault(
        "custom_components.oig_cloud.lib.oig_cloud_client.api.oig_cloud_api", api_module
    )

    for module_name in (
        "custom_components.oig_cloud.shield.dispatch",
        "custom_components.oig_cloud.shield.queue",
        "custom_components.oig_cloud.shield.validation",
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

import custom_components.oig_cloud as init_module
from custom_components.oig_cloud.const import (
    CONF_NO_TELEMETRY,
    CONF_PASSWORD,
    CONF_USERNAME,
)
from custom_components.oig_cloud.shield.core import ServiceShield
from custom_components.oig_cloud.shared import logging as logging_module

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
        (MISSING, True, True),
        (False, MISSING, False),
        (False, False, False),
        (False, True, True),
        (True, MISSING, True),
        (True, False, True),
        (True, True, True),
    ],
)
def test_resolve_no_telemetry_merges_entry_data_and_options(
    data_flag, options_flag, expected
):
    entry = _make_entry(data_flag=data_flag, options_flag=options_flag)

    assert logging_module.resolve_no_telemetry(entry) is expected


@pytest.mark.parametrize(
    ("data_flag", "options_flag", "expected"),
    [
        (MISSING, MISSING, False),
        (MISSING, False, False),
        (MISSING, True, True),
        (False, MISSING, False),
        (False, False, False),
        (False, True, True),
        (True, MISSING, True),
        (True, False, True),
        (True, True, True),
    ],
)
def test_core_and_shield_resolve_no_telemetry_identically(
    monkeypatch, data_flag, options_flag, expected
):
    entry = _make_entry(data_flag=data_flag, options_flag=options_flag)
    hass = SimpleNamespace(data={"core.uuid": "core-uuid"})
    setup_calls: list[str] = []

    def _record_setup(self):
        setup_calls.append("setup")

    monkeypatch.setattr(ServiceShield, "_setup_telemetry", _record_setup)

    _, _, no_telemetry, _, _ = init_module._load_entry_auth_config(entry)
    ServiceShield(hass, entry)

    assert no_telemetry is expected
    assert setup_calls == ([] if expected else ["setup"])
