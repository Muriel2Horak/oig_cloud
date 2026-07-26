"""SET IDENTITY guarantee for module off/on toggles.

Owner question: "je overeno, ze vypnuti a zapnuti modulu zaregistruje a
odregistruje sadu entit?" (is it verified that disabling/enabling a module
registers and unregisters the SET of entities?). Prior coverage
(test_reload_reenable_entity.py, test_sensor_registry_cleanup.py,
test_module_config_reload_trigger.py) verified COUNTS and the reload trigger
in isolation, with plain Dummy hass/registry mocks. This file adds the SET
IDENTITY guarantee: off -> on returns the EXACT same entity_ids, no orphaned
registry entries, no `_2`-suffixed duplicates.

Unlike the Dummy-mock tests above, this drives the REAL production
`sensor.async_setup_entry` against a REAL `hass` fixture and the REAL
`homeassistant.helpers.entity_registry` (sensor.py calls
`entity_registry.async_get(hass)` directly -- a plain Dummy hass makes that
call fail silently, which is why the Dummy-based tests never exercised
`_cleanup_renamed_sensors` as part of the full setup flow). Only the 24 leaf
entity CLASSES (OigCloudDataSensor, OigCloudChmuSensor, ...) are replaced by
a single lightweight stand-in (`_IdentitySensor`) that derives entity_id /
unique_id from (box_id, sensor_type) exactly like the real base classes do
(entities/base_sensor.py). `_get_expected_sensor_types`, every `_create_*`
factory, and `_cleanup_renamed_sensors` run unmodified, against the REAL
`sensor_types.SENSOR_TYPES` catalog (also unmocked) -- the categorisation and
cleanup logic under test is 100% production code.

The harness plays the role entity_platform normally plays: it registers each
added entity into the real registry (so re-adding the same unique_id gets
back the SAME entity_id -- the real HA identity mechanism, not simulated by
this test) and mirrors states into the real state machine. A reload cycle is
modelled as: merge_entry_options (the REST-sanctioned options-write path) +
clearing tracked states (mimics the unload half of a reload -- states are
cleared, registry entries are deliberately left alone) + re-running
sensor.async_setup_entry (mimics the platform-forward half).

Scope: sensor platform only. PLATFORMS also lists switch, but no enable_*
module flag gates any switch entity (grep confirms), so this is not a
coverage gap.
"""
from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any, Dict, Optional, Set

import pytest
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.oig_cloud import sensor as sensor_module
from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView
from custom_components.oig_cloud.config_merge import merge_entry_options
from custom_components.oig_cloud.const import DOMAIN

BOX_ID = "555001"
ENTITY_PREFIX = f"sensor.oig_{BOX_ID}_"

# All 7 "modules" section fields from config_registry.py (section == "modules",
# reload_on_change == True) -- the exact set the brief calls "the 7 enable_*
# module flags". enable_dashboard is section "basic", not a module flag.
MODULE_FLAGS = [
    "enable_solar_forecast",
    "enable_battery_prediction",
    "enable_pricing",
    "enable_boiler",
    "enable_statistics",
    "enable_extended_sensors",
    "enable_chmu_warnings",
]

BASE_OPTIONS: Dict[str, Any] = {
    "box_id": BOX_ID,
    "enable_statistics": True,
    "enable_extended_sensors": True,
    "enable_solar_forecast": True,
    "enable_battery_prediction": True,
    "enable_pricing": True,
    "enable_chmu_warnings": True,
    "enable_boiler": True,
}


class _Coordinator:
    def __init__(self) -> None:
        self.data = {BOX_ID: {}}


class _IdentitySensor:
    """Stand-in for every SENSOR_TYPES-driven leaf sensor class.

    All ~20 patched classes/factories are called as `cls(coordinator,
    sensor_type, ...)` with varying extra positional args (entry,
    analytics_device_info, hass) -- sensor_type is always the only plain str
    among them, so picking it out generically avoids one bespoke stand-in per
    call signature.
    """

    def __init__(self, *args: Any, **_kwargs: Any) -> None:
        sensor_type = next(a for a in args if isinstance(a, str))
        self.entity_id = f"{ENTITY_PREFIX}{sensor_type}"
        self.unique_id = f"oig_{BOX_ID}_{sensor_type}"
        self.device_info = {"identifiers": {(DOMAIN, BOX_ID)}}


class _DataSourceDummy:
    """OigCloudDataSourceSensor(hass, coordinator, entry) -- no str arg to pick out."""

    def __init__(self, *_a: Any, **_k: Any) -> None:
        self.entity_id = f"{ENTITY_PREFIX}data_source"
        self.unique_id = f"oig_{BOX_ID}_data_source"
        self.device_info = {"identifiers": {(DOMAIN, BOX_ID)}}


class _AiStatusDummy:
    def __init__(self, *_a: Any, **_k: Any) -> None:
        self.entity_id = f"{ENTITY_PREFIX}ai_status"
        self.unique_id = f"oig_{BOX_ID}_ai_status"
        self.device_info = {"identifiers": {(DOMAIN, BOX_ID)}}


_LEAF_CLASS_PATHS = [
    "custom_components.oig_cloud.entities.data_sensor.OigCloudDataSensor",
    "custom_components.oig_cloud.entities.computed_sensor.OigCloudComputedSensor",
    "custom_components.oig_cloud.entities.statistics_sensor.OigCloudStatisticsSensor",
    "custom_components.oig_cloud.entities.solar_forecast_sensor.OigCloudSolarForecastSensor",
    "custom_components.oig_cloud.entities.shield_sensor.OigCloudShieldSensor",
    "custom_components.oig_cloud.battery_forecast.sensors.ha_sensor.OigCloudBatteryForecastSensor",
    "custom_components.oig_cloud.entities.battery_health_sensor.BatteryHealthSensor",
    "custom_components.oig_cloud.entities.battery_balancing_sensor.OigCloudBatteryBalancingSensor",
    "custom_components.oig_cloud.battery_forecast.sensors.grid_charging_sensor.OigCloudGridChargingPlanSensor",
    "custom_components.oig_cloud.battery_forecast.sensors.efficiency_sensor.OigCloudBatteryEfficiencySensor",
    "custom_components.oig_cloud.battery_forecast.sensors.recommended_sensor.OigCloudPlannerRecommendedModeSensor",
    "custom_components.oig_cloud.entities.adaptive_load_profiles_sensor.OigCloudAdaptiveLoadProfilesSensor",
    "custom_components.oig_cloud.entities.analytics_sensor.OigCloudAnalyticsSensor",
    "custom_components.oig_cloud.pricing.spot_price_sensor.SpotPrice15MinSensor",
    "custom_components.oig_cloud.pricing.spot_price_sensor.ExportPrice15MinSensor",
    "custom_components.oig_cloud.entities.chmu_sensor.OigCloudChmuSensor",
]


def _install_identity_sensors(monkeypatch: pytest.MonkeyPatch) -> None:
    for path in _LEAF_CLASS_PATHS:
        monkeypatch.setattr(path, _IdentitySensor)

    # Boiler sensors aren't tracked in SENSOR_TYPES (sensor.py:132-135) -- gated
    # directly on enable_boiler in _cleanup_renamed_sensors, not via
    # _get_expected_sensor_types.
    monkeypatch.setattr(
        "custom_components.oig_cloud.boiler.sensors.get_boiler_sensors",
        lambda *_a, **_k: [_IdentitySensor("boiler_mode")],
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.boiler.runtime.get_boiler_runtime",
        lambda *_a, **_k: None,
    )
    # Imported at sensor.py module scope (not lazily), so patch the attribute
    # on sensor_module itself -- matches test_sensor_full_coverage.py.
    monkeypatch.setattr(sensor_module, "OigCloudDataSourceSensor", _DataSourceDummy)
    monkeypatch.setattr(sensor_module, "OigCloudAiStatusSensor", _AiStatusDummy)
    monkeypatch.setattr(sensor_module, "resolve_box_id", lambda _c: BOX_ID)


class _Harness:
    """Plays the role entity_platform normally plays for sensor.py's entities."""

    def __init__(self, hass: Any, entry: MockConfigEntry, coordinator: _Coordinator) -> None:
        self.hass = hass
        self.entry = entry
        self.coordinator = coordinator
        self.boiler_coordinator = object()
        self.ent_reg = er.async_get(hass)
        self._tracked_states: Set[str] = set()

    async def setup(self) -> None:
        self.hass.data.setdefault(DOMAIN, {})[self.entry.entry_id] = {
            "coordinator": self.coordinator,
            "statistics_enabled": self.entry.options.get("enable_statistics", True),
            "boiler_coordinator": self.boiler_coordinator,
        }

        # Simulate the unload half of a real reload: HA clears entity STATES
        # on platform unload but leaves entity-registry entries alone --
        # that persistence is exactly what gives reload its identity
        # guarantee. Registry cleanup of no-longer-expected entries is real
        # production code (_cleanup_renamed_sensors), run inside setup below.
        for entity_id in list(self._tracked_states):
            self.hass.states.async_remove(entity_id)
        self._tracked_states.clear()

        def _add_entities(entities, _update: bool = False) -> None:
            for ent in entities:
                entity_id = ent.entity_id
                unique_id = getattr(ent, "unique_id", None)
                if unique_id:
                    object_id = entity_id.split(".", 1)[1]
                    reg_entry = self.ent_reg.async_get_or_create(
                        "sensor",
                        DOMAIN,
                        unique_id,
                        suggested_object_id=object_id,
                        config_entry=self.entry,
                    )
                    entity_id = reg_entry.entity_id
                self.hass.states.async_set(entity_id, "unknown")
                self._tracked_states.add(entity_id)

        await sensor_module.async_setup_entry(self.hass, self.entry, _add_entities)
        await self.hass.async_block_till_done()

    def registry_ids(self) -> Set[str]:
        return {
            e.entity_id
            for e in er.async_entries_for_config_entry(self.ent_reg, self.entry.entry_id)
        }

    def registry_unique_ids(self) -> Set[str]:
        return {
            e.unique_id
            for e in er.async_entries_for_config_entry(self.ent_reg, self.entry.entry_id)
        }

    def state_ids(self) -> Set[str]:
        return {
            s.entity_id
            for s in self.hass.states.async_all()
            if s.entity_id.startswith(ENTITY_PREFIX)
        }


def _new_harness(hass, monkeypatch: pytest.MonkeyPatch) -> _Harness:
    _install_identity_sensors(monkeypatch)
    entry = MockConfigEntry(domain=DOMAIN, options=dict(BASE_OPTIONS), title=f"OIG {BOX_ID}")
    entry.add_to_hass(hass)
    return _Harness(hass, entry, _Coordinator())


@pytest.mark.asyncio
@pytest.mark.parametrize("flag", MODULE_FLAGS)
async def test_off_on_returns_exact_same_entity_set(hass, monkeypatch, flag):
    harness = _new_harness(hass, monkeypatch)
    entry = harness.entry

    # 1. Setup with flag ON -> snapshot S1 (state machine + entity registry).
    await harness.setup()
    s1 = harness.registry_ids()
    assert s1 == harness.state_ids(), "registry/state mismatch right after initial setup"
    u1 = harness.registry_unique_ids()
    expected_on = sensor_module._get_expected_sensor_types(hass, entry)

    # 2. Toggle OFF via the REST-sanctioned merge path -> module entities
    #    removed from BOTH the state machine and the entity registry (no
    #    orphaned registry entries), non-module entities untouched.
    merge_entry_options(hass, entry, {flag: False})
    await harness.setup()
    s_off = harness.registry_ids()
    assert s_off == harness.state_ids(), f"orphaned registry entry after disabling {flag}"
    expected_off = sensor_module._get_expected_sensor_types(hass, entry)

    if flag == "enable_boiler":
        module_ids = {f"{ENTITY_PREFIX}boiler_mode"}
    else:
        module_ids = {f"{ENTITY_PREFIX}{t}" for t in (expected_on - expected_off)}
    assert module_ids, f"{flag} test is vacuous -- toggling it off changed no sensor type"
    assert module_ids <= s1, f"module ids for {flag} were never even in S1: {module_ids - s1}"
    assert not (module_ids & s_off), (
        f"disabling {flag} left module entities behind: {module_ids & s_off}"
    )
    untouched = s1 - module_ids
    assert untouched <= s_off, (
        f"disabling {flag} removed unrelated entities: {untouched - s_off}"
    )

    # 3. Toggle ON -> snapshot S2. Must equal S1 EXACTLY: same entity_ids (no
    #    `_2` suffixes, nothing missing, nothing extra), unique_ids stable.
    merge_entry_options(hass, entry, {flag: True})
    await harness.setup()
    s2 = harness.registry_ids()
    assert s2 == harness.state_ids(), f"orphaned registry entry after re-enabling {flag}"
    assert s2 == s1, (
        f"re-enabling {flag} did not restore the exact same entity set: "
        f"missing={s1 - s2} extra={s2 - s1}"
    )
    assert harness.registry_unique_ids() == u1, f"unique_ids drifted for {flag}"

    # 4. Double-cycle (off-on-off-on) stays stable.
    merge_entry_options(hass, entry, {flag: False})
    await harness.setup()
    merge_entry_options(hass, entry, {flag: True})
    await harness.setup()
    s3 = harness.registry_ids()
    assert s3 == harness.state_ids()
    assert s3 == s1, f"double off/on cycle for {flag} drifted from the original set"
    assert harness.registry_unique_ids() == u1, f"unique_ids drifted after double-cycle for {flag}"


# --- battery+solar dependency: REST must reject, not silently accept -------

_ADMIN_USER = SimpleNamespace(is_admin=True)


class _DepEntry:
    def __init__(self, entry_id: str, options: dict) -> None:
        self.entry_id = entry_id
        self.options = dict(options)
        self.domain = DOMAIN


class _DepCoordinator:
    def __init__(self, box_id: str) -> None:
        self.data = {box_id: {}}


class _DepConfigEntries:
    def __init__(self, entry: _DepEntry) -> None:
        self._entry = entry
        self.updated: list = []

    def async_entries(self, domain: str):
        return [self._entry]

    def async_update_entry(self, entry, options) -> None:
        entry.options = dict(options)
        self.updated.append(dict(options))


class _DepHass:
    def __init__(self, entry: _DepEntry, box_id: str) -> None:
        self.config_entries = _DepConfigEntries(entry)
        self.data = {
            DOMAIN: {entry.entry_id: {"coordinator": _DepCoordinator(box_id)}}
        }


class _DepPostRequest:
    def __init__(self, hass, payload: dict) -> None:
        self.app = {"hass": hass}
        self._payload = payload

    def get(self, key: str, default: Optional[Any] = None):
        if key == "hass_user":
            return _ADMIN_USER
        return default

    async def json(self):
        return self._payload


@pytest.mark.asyncio
async def test_disable_solar_with_battery_on_is_rejected_by_rest_validation():
    box_id = "depbox"
    entry = _DepEntry(
        f"eid_{box_id}",
        {"enable_battery_prediction": True, "enable_solar_forecast": True},
    )
    hass = _DepHass(entry, box_id)

    view = OIGCloudModuleConfigView()
    request = _DepPostRequest(
        hass, {"section": "modules", "values": {"enable_solar_forecast": False}}
    )

    response = await view.post(request, box_id)

    assert response.status == 400
    data = json.loads(response.text)
    assert data["error"] == "validation"
    assert data["fields"], "rejection must name the offending field(s)"

    # No partial state: the entry's options are exactly what they were before
    # the POST -- merge_entry_options must never have run.
    assert entry.options == {
        "enable_battery_prediction": True,
        "enable_solar_forecast": True,
    }
    assert hass.config_entries.updated == []
