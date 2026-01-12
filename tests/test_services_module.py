from __future__ import annotations

from types import SimpleNamespace

import pytest
import voluptuous as vol

from custom_components.oig_cloud import services as services_module


class DummyServices:
    def __init__(self):
        self.registered = []
        self._existing = set()

    def has_service(self, _domain, name):
        return name in self._existing

    def async_register(self, domain, name, handler, schema=None, supports_response=False):
        self.registered.append((domain, name, handler, schema, supports_response))
        self._existing.add(name)


class DummyDevice:
    def __init__(self, identifiers):
        self.identifiers = identifiers


class DummyDeviceRegistry:
    def __init__(self, device):
        self._device = device

    def async_get(self, _device_id):
        return self._device


def test_box_id_helpers_from_entry_and_coordinator():
    entry = SimpleNamespace(
        options={"box_id": "123"},
        data={"box_id": "456", "inverter_sn": "789"},
    )
    coordinator = SimpleNamespace(config_entry=entry, data={"999": {}})
    hass = SimpleNamespace(config_entries=SimpleNamespace(async_get_entry=lambda _eid: None))

    assert services_module._box_id_from_entry(hass, coordinator, "entry") == "123"
    assert services_module._box_id_from_coordinator(coordinator) == "999"


def test_get_entry_client():
    client = object()
    coordinator = SimpleNamespace(api=client)
    hass = SimpleNamespace(data={services_module.DOMAIN: {"entry": {"coordinator": coordinator}}})
    entry = SimpleNamespace(entry_id="entry")
    assert services_module._get_entry_client(hass, entry) is client


def test_strip_identifier_suffix():
    assert services_module._strip_identifier_suffix("123_shield") == "123"
    assert services_module._strip_identifier_suffix("123_analytics") == "123"


def test_extract_box_id_from_device():
    device = DummyDevice({(services_module.DOMAIN, "2206237016_shield")})
    assert services_module._extract_box_id_from_device(device, "dev") == "2206237016"


def test_register_service_if_missing():
    hass = SimpleNamespace(services=DummyServices())

    def handler(_call):
        return None

    assert (
        services_module._register_service_if_missing(
            hass, "svc", handler, vol.Schema({})
        )
        is True
    )
    assert (
        services_module._register_service_if_missing(
            hass, "svc", handler, vol.Schema({})
        )
        is False
    )


def test_resolve_box_id_from_service_missing():
    coordinator = SimpleNamespace(config_entry=None, data={})
    hass = SimpleNamespace(
        data={services_module.DOMAIN: {"entry": {"coordinator": coordinator}}},
        config_entries=SimpleNamespace(async_get_entry=lambda _eid: None),
    )
    entry = SimpleNamespace(entry_id="entry")
    assert (
        services_module._resolve_box_id_from_service(hass, entry, {}, "svc") is None
    )


def test_validate_grid_delivery_inputs():
    with pytest.raises(vol.Invalid):
        services_module._validate_grid_delivery_inputs(None, None)
    with pytest.raises(vol.Invalid):
        services_module._validate_grid_delivery_inputs("mode", 10)
    with pytest.raises(vol.Invalid):
        services_module._validate_grid_delivery_inputs(None, 10000)


def test_acknowledged():
    assert services_module._acknowledged({"acknowledgement": True}, "svc") is True
    assert services_module._acknowledged({}, "svc") is False


def test_serialize_dt():
    assert services_module._serialize_dt(None) is None
    assert services_module._serialize_dt("2025-01-01") == "2025-01-01"


def test_iter_balancing_managers_and_results():
    manager = SimpleNamespace(box_id="123")
    hass = SimpleNamespace(
        data={
            services_module.DOMAIN: {
                "shield": {},
                "entry": {"balancing_manager": manager},
            }
        }
    )

    managers = services_module._iter_balancing_managers(hass, None)
    assert managers == [("entry", manager, "123")]

    plan = SimpleNamespace(
        mode=SimpleNamespace(value="mode"),
        reason="reason",
        holding_start="start",
        holding_end="end",
        priority=SimpleNamespace(value="p1"),
    )
    result = services_module._build_balancing_plan_result("entry", "123", plan)
    assert result["plan_mode"] == "mode"

    assert services_module._build_no_plan_result("entry", "123")["reason"] == "no_plan_needed"
    err = RuntimeError("boom")
    assert services_module._build_error_result("entry", "123", err)["error"] == "boom"
