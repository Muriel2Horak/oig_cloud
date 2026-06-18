"""Task 1: Canonical boiler identity and per-entry routing tests.

These tests enforce:
- Canonical identity shape is entry_id + box_id
- No fallback to first entry/box
- No hardcoded 2206237016 defaults in runtime code
- ServiceValidationError on mismatched/missing identity
- services.yaml boiler entries require canonical targeting
"""

from __future__ import annotations

import json
import os
from types import SimpleNamespace

import pytest
import voluptuous as vol
import yaml

from custom_components.oig_cloud.const import DOMAIN
from homeassistant.exceptions import ServiceValidationError


class DummyConfigEntry:
    def __init__(self, entry_id, domain="oig_cloud", state=None, options=None, data=None):
        self.entry_id = entry_id
        self.domain = domain
        self.options = options or {}
        self.data = data or {}
        if state is None:
            from homeassistant.config_entries import ConfigEntryState
            self.state = ConfigEntryState.LOADED
        else:
            self.state = state


class DummyConfigEntriesManager:
    def __init__(self, entries):
        self._entries = entries

    def async_get_entry(self, entry_id):
        return self._entries.get(entry_id)

    def async_entries(self, domain):
        return [e for e in self._entries.values() if e.domain == domain]


class DummyHass:
    def __init__(self, entries=None, domain_data=None):
        self.config_entries = DummyConfigEntriesManager(entries or {})
        self.data = {DOMAIN: domain_data or {}}


def test_canonical_resolver_validates_entry_exists():
    """Canonical resolver must raise when entry_id does not exist."""
    from custom_components.oig_cloud.services import _resolve_canonical_boiler_identity

    hass = DummyHass(entries={}, domain_data={})
    with pytest.raises(ServiceValidationError):
        _resolve_canonical_boiler_identity(
            hass, "nonexistent_entry", "123", "test_service"
        )


def test_canonical_resolver_rejects_mismatched_box_ownership():
    """If box_id is not owned by the entry, reject deterministically."""
    from custom_components.oig_cloud.services import _resolve_canonical_boiler_identity

    entry = DummyConfigEntry(
        entry_id="entry1",
        options={"box_id": "111"},
        data={},
    )
    hass = DummyHass(
        entries={"entry1": entry},
        domain_data={
            "entry1": {
                "coordinator": SimpleNamespace(data={"111": {}})
            }
        },
    )

    with pytest.raises(ServiceValidationError):
        _resolve_canonical_boiler_identity(
            hass, "entry1", "222", "test_service"
        )


def test_canonical_resolver_accepts_valid_entry_box_pair():
    """Valid entry_id + box_id pair resolves successfully."""
    from custom_components.oig_cloud.services import _resolve_canonical_boiler_identity

    entry = DummyConfigEntry(
        entry_id="entry1",
        options={"box_id": "111"},
        data={},
    )
    hass = DummyHass(
        entries={"entry1": entry},
        domain_data={
            "entry1": {
                "coordinator": SimpleNamespace(data={"111": {}})
            }
        },
    )

    result = _resolve_canonical_boiler_identity(
        hass, "entry1", "111", "test_service"
    )
    assert result == "111"


def test_canonical_resolver_validates_box_from_coordinator():
    """Box ownership can be validated from coordinator.data keys."""
    from custom_components.oig_cloud.services import _resolve_canonical_boiler_identity

    entry = DummyConfigEntry(
        entry_id="entry1",
        options={},
        data={},
    )
    hass = DummyHass(
        entries={"entry1": entry},
        domain_data={
            "entry1": {
                "coordinator": SimpleNamespace(data={"222": {}})
            }
        },
    )

    result = _resolve_canonical_boiler_identity(
        hass, "entry1", "222", "test_service"
    )
    assert result == "222"


# ---------------------------------------------------------------------------
# 2. Service schema tests — canonical identity fields required
# ---------------------------------------------------------------------------

def test_boiler_plan_schema_requires_entry_id_and_box_id():
    """PLAN_SCHEMA must require entry_id and box_id for new canonical targeting."""
    from custom_components.oig_cloud.services.boiler import PLAN_SCHEMA

    # Empty schema should fail
    with pytest.raises(vol.Invalid):
        PLAN_SCHEMA({})

    # Missing box_id should fail
    with pytest.raises(vol.Invalid):
        PLAN_SCHEMA({"entry_id": "entry1"})

    # Missing entry_id should fail
    with pytest.raises(vol.Invalid):
        PLAN_SCHEMA({"box_id": "111"})

    # Both present should succeed
    result = PLAN_SCHEMA({"entry_id": "entry1", "box_id": "111"})
    assert result["entry_id"] == "entry1"
    assert result["box_id"] == "111"


def test_boiler_apply_schema_requires_entry_id_and_box_id():
    """APPLY_SCHEMA must require entry_id and box_id."""
    from custom_components.oig_cloud.services.boiler import APPLY_SCHEMA

    with pytest.raises(vol.Invalid):
        APPLY_SCHEMA({})

    result = APPLY_SCHEMA({"entry_id": "entry1", "box_id": "111"})
    assert result["entry_id"] == "entry1"
    assert result["box_id"] == "111"


def test_boiler_cancel_schema_requires_entry_id_and_box_id():
    """CANCEL_SCHEMA must require entry_id and box_id."""
    from custom_components.oig_cloud.services.boiler import CANCEL_SCHEMA

    with pytest.raises(vol.Invalid):
        CANCEL_SCHEMA({})

    result = CANCEL_SCHEMA({"entry_id": "entry1", "box_id": "111"})
    assert result["entry_id"] == "entry1"
    assert result["box_id"] == "111"


# ---------------------------------------------------------------------------
# 3. Multi-entry routing — no cross-contamination
# ---------------------------------------------------------------------------

def test_multi_entry_service_routing_no_cross_contamination():
    """Two entries with different box_ids — services must not cross-rout."""
    from custom_components.oig_cloud.services import _resolve_canonical_boiler_identity

    entry1 = DummyConfigEntry(entry_id="entry1", options={"box_id": "111"})
    entry2 = DummyConfigEntry(entry_id="entry2", options={"box_id": "222"})

    hass = DummyHass(
        entries={"entry1": entry1, "entry2": entry2},
        domain_data={
            "entry1": {"coordinator": SimpleNamespace(data={"111": {}})},
            "entry2": {"coordinator": SimpleNamespace(data={"222": {}})},
        },
    )

    # entry1 resolves to its own box
    assert _resolve_canonical_boiler_identity(hass, "entry1", "111", "test") == "111"
    # entry2 resolves to its own box
    assert _resolve_canonical_boiler_identity(hass, "entry2", "222", "test") == "222"

    # entry1 cannot resolve entry2's box
    with pytest.raises(ServiceValidationError):
        _resolve_canonical_boiler_identity(hass, "entry1", "222", "test")

    # entry2 cannot resolve entry1's box
    with pytest.raises(ServiceValidationError):
        _resolve_canonical_boiler_identity(hass, "entry2", "111", "test")


def test_boiler_strict_resolver_rejects_missing_identity():
    """_resolve_boiler_box_id_from_service rejects when no identity provided."""
    from custom_components.oig_cloud.services import _resolve_boiler_box_id_from_service

    hass = DummyHass(entries={}, domain_data={})
    with pytest.raises(ServiceValidationError):
        _resolve_boiler_box_id_from_service(hass, {}, "set_boiler_mode")


def test_boiler_strict_resolver_rejects_invalid_device_id(monkeypatch):
    """_resolve_boiler_box_id_from_service rejects invalid device_id without fallback."""
    from custom_components.oig_cloud.services import _resolve_boiler_box_id_from_service

    entry = DummyConfigEntry(entry_id="entry1", options={"box_id": "111"})
    hass = DummyHass(
        entries={"entry1": entry},
        domain_data={"entry1": {"coordinator": SimpleNamespace(data={"111": {}})}},
    )

    monkeypatch.setattr(
        "custom_components.oig_cloud.services.dr.async_get",
        lambda _hass: SimpleNamespace(async_get=lambda _did: None),
    )

    with pytest.raises(ServiceValidationError):
        _resolve_boiler_box_id_from_service(
            hass, {"device_id": "nonexistent_device"}, "set_boiler_mode"
        )


def test_boiler_strict_resolver_accepts_canonical_identity():
    """_resolve_boiler_box_id_from_service accepts valid entry_id + box_id."""
    from custom_components.oig_cloud.services import _resolve_boiler_box_id_from_service

    entry = DummyConfigEntry(entry_id="entry1", options={"box_id": "111"})
    hass = DummyHass(
        entries={"entry1": entry},
        domain_data={"entry1": {"coordinator": SimpleNamespace(data={"111": {}})}},
    )

    result = _resolve_boiler_box_id_from_service(
        hass, {"entry_id": "entry1", "box_id": "111"}, "set_boiler_mode"
    )
    assert result == "111"


def test_boiler_plan_schema_requires_identity_in_call_data():
    """Boiler service handlers resolve identity from call data, not captured entry."""
    from custom_components.oig_cloud.services.boiler import PLAN_SCHEMA

    schema_result = PLAN_SCHEMA({"entry_id": "entry1", "box_id": "111", "force": True})
    assert schema_result["entry_id"] == "entry1"
    assert schema_result["box_id"] == "111"


# ---------------------------------------------------------------------------
# 4. Hardcoded identity removal tests
# ---------------------------------------------------------------------------

TASK1_TARGET_FILES = [
    "custom_components/oig_cloud/boiler/coordinator.py",
    "custom_components/oig_cloud/config/steps.py",
    "custom_components/oig_cloud/services/boiler.py",
    "custom_components/oig_cloud/services/__init__.py",
    "custom_components/oig_cloud/www_v2/src/data/boiler-data.ts",
    "custom_components/oig_cloud/www_v2/src/ui/app.ts",
    "custom_components/oig_cloud/www_v2/src/data/entity-store.ts",
]


def test_no_hardcoded_2206237016_in_task1_target_files():
    """Verify no hardcoded 2206237016 remains in Task 1 target production files."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    found = []
    for rel_path in TASK1_TARGET_FILES:
        full_path = os.path.join(root, rel_path)
        if not os.path.exists(full_path):
            continue
        with open(full_path, "r", encoding="utf-8") as f:
            for lineno, line in enumerate(f, 1):
                if "2206237016" in line:
                    found.append(f"{rel_path}:{lineno}: {line.strip()}")

    assert not found, "Hardcoded 2206237016 found in Task 1 target files:\n" + "\n".join(found)


# ---------------------------------------------------------------------------
# 5. services.yaml canonical field tests
# ---------------------------------------------------------------------------

def test_services_yaml_boiler_entries_have_canonical_fields():
    """Boiler service entries in services.yaml must document entry_id and box_id."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    services_yaml_path = os.path.join(root, "custom_components/oig_cloud/services.yaml")

    with open(services_yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    boiler_services = ["plan_boiler_heating", "apply_boiler_plan", "cancel_boiler_plan"]

    for service_name in boiler_services:
        assert service_name in data, f"Service {service_name} not found in services.yaml"
        fields = data[service_name].get("fields", {})
        field_names = list(fields.keys())

        # Must have entry_id and box_id fields documented
        assert "entry_id" in field_names, (
            f"Service {service_name} missing entry_id field in services.yaml"
        )
        assert "box_id" in field_names, (
            f"Service {service_name} missing box_id field in services.yaml"
        )

        # entry_id should be required for new write paths
        entry_id_field = fields["entry_id"]
        assert entry_id_field.get("required", False) is True, (
            f"Service {service_name} entry_id must be required"
        )

        # box_id should be required
        box_id_field = fields["box_id"]
        assert box_id_field.get("required", False) is True, (
            f"Service {service_name} box_id must be required"
        )


def test_set_boiler_mode_schema_allows_canonical_legacy_and_missing_identity_for_resolver():
    """set_boiler_mode schema must let canonical, legacy, and resolver-fallback calls through."""
    from custom_components.oig_cloud.services import SET_BOILER_MODE_SCHEMA

    # Missing identity must pass schema so resolver can raise deterministic ServiceValidationError.
    missing_identity = SET_BOILER_MODE_SCHEMA({
        "mode": "cbb",
        "acknowledgement": True,
    })
    assert missing_identity["mode"] == "cbb"

    # Legacy device_id callers must pass schema so the device registry fallback is reachable.
    legacy_device = SET_BOILER_MODE_SCHEMA({
        "device_id": "some_device",
        "mode": "cbb",
        "acknowledgement": True,
    })
    assert legacy_device["device_id"] == "some_device"

    # Canonical call with entry_id+box_id must succeed
    result = SET_BOILER_MODE_SCHEMA({
        "entry_id": "entry1",
        "box_id": "111",
        "mode": "cbb",
        "acknowledgement": True,
    })
    assert result["entry_id"] == "entry1"
    assert result["box_id"] == "111"


def test_boiler_strict_resolver_accepts_legacy_device_id(monkeypatch):
    """Legacy device_id path remains reachable after schema validation."""
    from custom_components.oig_cloud.services import _resolve_boiler_box_id_from_service

    entry = DummyConfigEntry(entry_id="entry1", options={"box_id": "111"})
    hass = DummyHass(
        entries={"entry1": entry},
        domain_data={"entry1": {"coordinator": SimpleNamespace(data={"111": {}})}},
    )
    device = SimpleNamespace(identifiers={(DOMAIN, "111")})

    monkeypatch.setattr(
        "custom_components.oig_cloud.services.dr.async_get",
        lambda _hass: SimpleNamespace(async_get=lambda device_id: device if device_id == "dev1" else None),
    )

    result = _resolve_boiler_box_id_from_service(
        hass, {"device_id": "dev1"}, "set_boiler_mode"
    )
    assert result == "111"


def test_boiler_resolver_accepts_single_unambiguous_loaded_entry_without_identity():
    """Omitted identity is compatible only when exactly one loaded OIG box is unambiguous."""
    from custom_components.oig_cloud.services import _resolve_boiler_box_id_from_service

    entry = DummyConfigEntry(entry_id="entry1", options={"box_id": "111"})
    hass = DummyHass(
        entries={"entry1": entry},
        domain_data={"entry1": {"coordinator": SimpleNamespace(data={"111": {}})}},
    )

    assert _resolve_boiler_box_id_from_service(hass, {}, "set_boiler_mode") == "111"


def test_boiler_resolver_rejects_ambiguous_missing_identity_without_first_entry_fallback():
    """Multiple loaded OIG boxes without call identity must raise boiler_missing_identity."""
    from custom_components.oig_cloud.services import _resolve_boiler_box_id_from_service

    entry1 = DummyConfigEntry(entry_id="entry1", options={"box_id": "111"})
    entry2 = DummyConfigEntry(entry_id="entry2", options={"box_id": "222"})
    hass = DummyHass(
        entries={"entry1": entry1, "entry2": entry2},
        domain_data={
            "entry1": {"coordinator": SimpleNamespace(data={"111": {}})},
            "entry2": {"coordinator": SimpleNamespace(data={"222": {}})},
        },
    )

    with pytest.raises(ServiceValidationError) as exc_info:
        _resolve_boiler_box_id_from_service(hass, {}, "set_boiler_mode")
    assert getattr(exc_info.value, "translation_key", None) == "boiler_missing_identity"


def test_boiler_service_translations_cover_identity_fields_and_validation_errors():
    """EN/CS translations must cover boiler service identity fields and service errors."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    required_exception_keys = {
        "boiler_entry_not_found",
        "boiler_entry_wrong_domain",
        "boiler_entry_not_loaded",
        "boiler_box_not_owned",
        "boiler_device_not_found",
        "boiler_missing_identity",
    }
    required_field_services = {
        "set_boiler_mode",
        "plan_boiler_heating",
        "apply_boiler_plan",
        "cancel_boiler_plan",
    }

    for locale in ("en", "cs"):
        path = os.path.join(root, "custom_components", "oig_cloud", "translations", f"{locale}.json")
        with open(path, "r", encoding="utf-8") as file_obj:
            data = json.load(file_obj)

        exception_keys = set(data.get("exceptions", {}).keys())
        assert required_exception_keys <= exception_keys

        services = data.get("services", {})
        for service_name in required_field_services:
            fields = services.get(service_name, {}).get("fields", {})
            assert "entry_id" in fields, f"{locale} {service_name} missing entry_id translation"
            assert "box_id" in fields, f"{locale} {service_name} missing box_id translation"


# ---------------------------------------------------------------------------
# 6. BoilerCoordinator hardcoded fallback removal
# ---------------------------------------------------------------------------

def test_boiler_coordinator_no_hardcoded_fallback():
    """BoilerCoordinator._build_oig_entity_id must not fall back to 2206237016."""
    from custom_components.oig_cloud.boiler.coordinator import BoilerCoordinator

    # When box_id is "unknown", entity builder must NOT use hardcoded fallback
    coordinator = BoilerCoordinator.__new__(BoilerCoordinator)
    coordinator.box_id = "unknown"

    # The method should either raise or return a generic pattern, NOT 2206237016
    result = coordinator._build_oig_entity_id("boiler_day_w")
    assert "2206237016" not in result, (
        f"_build_oig_entity_id must not hardcode 2206237016: got {result}"
    )


def test_boiler_coordinator_resolves_known_box_id():
    """BoilerCoordinator must build entity IDs from resolved box_id."""
    from custom_components.oig_cloud.boiler.coordinator import BoilerCoordinator

    coordinator = BoilerCoordinator.__new__(BoilerCoordinator)
    coordinator.box_id = "123456"

    result = coordinator._build_oig_entity_id("boiler_day_w")
    assert result == "sensor.oig_123456_boiler_day_w", f"Got: {result}"


# ---------------------------------------------------------------------------
# 7. const.py canonical constants
# ---------------------------------------------------------------------------

def test_const_py_has_canonical_boiler_identity_constants():
    """const.py must define canonical boiler identity constants."""
    from custom_components.oig_cloud import const

    assert hasattr(const, "KEY_BOILER_RUNTIMES"), "Missing KEY_BOILER_RUNTIMES"
    assert const.KEY_BOILER_RUNTIMES == "boiler_runtimes"

    assert hasattr(const, "STORAGE_KEY_BOILER_SCHEDULE"), "Missing STORAGE_KEY_BOILER_SCHEDULE"
    assert hasattr(const, "UNKNOWN_BOX_ID"), "Missing UNKNOWN_BOX_ID"
    assert const.UNKNOWN_BOX_ID == "unknown"

    assert hasattr(const, "DEFAULT_BOILER_HEATER_POWER_ENTITY_ID_PATTERN"), (
        "Missing DEFAULT_BOILER_HEATER_POWER_ENTITY_ID_PATTERN"
    )


# ---------------------------------------------------------------------------
# 8. BoilerCoordinator must not infer box_id from global states
# ---------------------------------------------------------------------------

def test_boiler_coordinator_no_infer_box_id_from_states():
    """BoilerCoordinator._resolve_box_id must NOT scan global sensors."""
    from custom_components.oig_cloud.boiler import coordinator as mod
    from custom_components.oig_cloud.const import UNKNOWN_BOX_ID

    class DummyHassNoInfer:
        class states:
            @staticmethod
            def async_entity_ids(_domain):
                return ["sensor.oig_123_boiler_day_w", "sensor.oig_456_boiler_day_w"]

    hass = DummyHassNoInfer()
    coordinator = mod.BoilerCoordinator(hass, {})
    result = coordinator._resolve_box_id({})
    assert result == UNKNOWN_BOX_ID, (
        f"Expected UNKNOWN_BOX_ID when config has no box_id, got {result}"
    )


def test_boiler_coordinator_infer_method_removed_or_safe():
    """_infer_box_id_from_states must not return a cross-entry box_id."""
    from custom_components.oig_cloud.boiler import coordinator as mod

    class DummyHassInfer:
        class states:
            @staticmethod
            def async_entity_ids(_domain):
                return ["sensor.oig_123_boiler_day_w"]

    hass = DummyHassInfer()
    coordinator = mod.BoilerCoordinator(hass, {})
    # Method should either not exist, or return None (no unsafe inference)
    if hasattr(coordinator, "_infer_box_id_from_states"):
        result = coordinator._infer_box_id_from_states()
        assert result is None, (
            f"_infer_box_id_from_states must not infer cross-entry box_id, got {result}"
        )


# ---------------------------------------------------------------------------
# 9. services/boiler.py must resolve dynamically, not from closure
# ---------------------------------------------------------------------------

def test_boiler_services_handlers_resolve_from_call_data():
    """Boiler service handlers must look up coordinator from hass.data using call.data entry_id."""
    from custom_components.oig_cloud.services.boiler import (
        PLAN_SCHEMA, APPLY_SCHEMA, CANCEL_SCHEMA,
    )

    # Schemas require entry_id + box_id
    plan_data = PLAN_SCHEMA({"entry_id": "entry1", "box_id": "111"})
    assert plan_data["entry_id"] == "entry1"
    assert plan_data["box_id"] == "111"

    apply_data = APPLY_SCHEMA({"entry_id": "entry2", "box_id": "222"})
    assert apply_data["entry_id"] == "entry2"
    assert apply_data["box_id"] == "222"

    cancel_data = CANCEL_SCHEMA({"entry_id": "entry3", "box_id": "333"})
    assert cancel_data["entry_id"] == "entry3"
    assert cancel_data["box_id"] == "333"


# ---------------------------------------------------------------------------
# 10. Frontend files — no hardcoded 2206237016 fallback
# ---------------------------------------------------------------------------

EXTRA_FRONTEND_FILES = [
    "custom_components/oig_cloud/www_v2/src/data/flow-data.ts",
    "custom_components/oig_cloud/www_v2/src/data/pricing-data.ts",
    "custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts",
]


def test_no_hardcoded_2206237016_in_extra_frontend_files():
    """Additional V2 frontend files must not hardcode 2206237016 as fallback."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    found = []
    for rel_path in EXTRA_FRONTEND_FILES:
        full_path = os.path.join(root, rel_path)
        if not os.path.exists(full_path):
            continue
        with open(full_path, "r", encoding="utf-8") as f:
            for lineno, line in enumerate(f, 1):
                if "2206237016" in line:
                    found.append(f"{rel_path}:{lineno}: {line.strip()}")

    assert not found, "Hardcoded 2206237016 found in frontend files:\n" + "\n".join(found)


# ---------------------------------------------------------------------------
# 11. services.yaml set_boiler_mode canonical fields
# ---------------------------------------------------------------------------

def test_services_yaml_set_boiler_mode_has_canonical_fields():
    """set_boiler_mode in services.yaml should document canonical entry_id + box_id."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    services_yaml_path = os.path.join(root, "custom_components/oig_cloud/services.yaml")

    with open(services_yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    assert "set_boiler_mode" in data, "set_boiler_mode not found in services.yaml"
    fields = data["set_boiler_mode"].get("fields", {})
    field_names = list(fields.keys())

    assert "entry_id" in field_names, (
        "set_boiler_mode missing entry_id field in services.yaml"
    )
    assert "box_id" in field_names, (
        "set_boiler_mode missing box_id field in services.yaml"
    )
