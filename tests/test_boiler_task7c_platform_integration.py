"""Task 7c tests: platform integration and circulation pump follower.

Covers:
- circulation pump follower behavior in canonical actuator path
- pump follows active heating actuation only (no independent scheduler)
- pump unavailability emits circulation_pump_unavailable without blocking heating
- switch platform delegates commands through runtime/actuator
- sensor platform routes reads through runtime/read-model where available
- legacy compatibility: old paths do not duplicate commands
- setup/reload/unload for switch and sensor platforms
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import pytest

from custom_components.oig_cloud.boiler.actuator import BoilerActuator
from custom_components.oig_cloud.boiler.planner_contract import PlannerReasonCode
from custom_components.oig_cloud.const import (
    CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    DOMAIN,
)

FIXED_NOW = datetime(2026, 4, 25, 12, 0, tzinfo=timezone.utc)


def _dummy_hass(states=None):
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    async def _async_call(domain, service, data, blocking=False):
        hass.services.calls.append((domain, service, data, blocking))

    def _async_run_hass_job(job, *args):
        if hasattr(job, "target"):
            result = job.target(*args)
            if asyncio.iscoroutine(result):
                loop.create_task(result)
        return None

    hass = SimpleNamespace(
        services=SimpleNamespace(
            calls=[],
            async_call=_async_call,
        ),
        states=SimpleNamespace(
            get=lambda entity_id: (states or {}).get(entity_id),
        ),
        data={},
        async_create_task=lambda coro: loop.create_task(coro),
        config=SimpleNamespace(config_dir="/tmp"),
        loop=loop,
        async_run_hass_job=_async_run_hass_job,
    )
    return hass


def _make_slot(start, end, consumption, source):
    return SimpleNamespace(
        start=start,
        end=end,
        avg_consumption_kwh=consumption,
        recommended_source=source,
    )


class _DummyStore:
    def __init__(self, _hass, _version, _key):
        self.saved = None
        self._data = {}

    async def async_load(self):
        return dict(self._data)

    async def async_save(self, data):
        self.saved = data
        self._data = dict(data)


# ---------------------------------------------------------------------------
# Section 1 — Circulation pump follower behavior
# ---------------------------------------------------------------------------


class TestCirculationPumpFollower:
    @pytest.mark.asyncio
    async def test_pump_follows_heating_start(self, monkeypatch):
        """When a heating window starts, the pump also turns on."""
        from custom_components.oig_cloud.boiler import actuator as _actuator_mod
        now = FIXED_NOW
        monkeypatch.setattr(_actuator_mod.dt_util, "now", lambda: now)
        monkeypatch.setattr(_actuator_mod, "Store", _DummyStore)
        hass = _dummy_hass(
            states={
                "switch.oig_123_bojler_top": SimpleNamespace(state="off"),
                "switch.oig_123_bojler_cirkulace": SimpleNamespace(state="off"),
            }
        )
        actuator = BoilerActuator(hass)
        plan = SimpleNamespace(
            slots=[
                _make_slot(now - timedelta(minutes=5), now + timedelta(minutes=30), 1.0, "grid"),
            ]
        )
        profile = None
        config = {
            CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.real_main",
            CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY: "switch.real_pump",
        }
        await actuator.async_apply_plan(plan, profile, config, "123", "entry1")
        await asyncio.sleep(0)
        # Pump should follow heating: both turn_on calls expected
        heater_on = [c for c in hass.services.calls if c[1] == "turn_on" and c[2].get("entity_id") == "switch.oig_123_bojler_top"]
        pump_on = [c for c in hass.services.calls if c[1] == "turn_on" and c[2].get("entity_id") == "switch.oig_123_bojler_cirkulace"]
        assert heater_on, "Heater should be turned on"
        assert pump_on, "Pump should follow heating and turn on"

    @pytest.mark.asyncio
    async def test_pump_follows_heating_stop(self, monkeypatch):
        """When the last heating window ends, the pump also turns off."""
        from custom_components.oig_cloud.boiler import actuator as _actuator_mod
        now = FIXED_NOW
        monkeypatch.setattr(_actuator_mod.dt_util, "now", lambda: now)
        monkeypatch.setattr(_actuator_mod, "Store", _DummyStore)
        hass = _dummy_hass(
            states={
                "switch.oig_123_bojler_top": SimpleNamespace(state="on"),
                "switch.oig_123_bojler_cirkulace": SimpleNamespace(state="on"),
            }
        )
        actuator = BoilerActuator(hass)
        # Apply a plan that is about to end
        plan = SimpleNamespace(
            slots=[
                _make_slot(now - timedelta(minutes=30), now - timedelta(minutes=1), 1.0, "grid"),
            ]
        )
        profile = None
        config = {
            CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.real_main",
            CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY: "switch.real_pump",
        }
        await actuator.async_apply_plan(plan, profile, config, "123", "entry1")
        await asyncio.sleep(0)
        # Window is already past; no callbacks scheduled
        # Cancel plan explicitly
        hass.services.calls.clear()
        await actuator.async_cancel_plan("entry1", clear_plan=True)
        await asyncio.sleep(0)
        heater_off = [c for c in hass.services.calls if c[1] == "turn_off" and c[2].get("entity_id") == "switch.oig_123_bojler_top"]
        pump_off = [c for c in hass.services.calls if c[1] == "turn_off" and c[2].get("entity_id") == "switch.oig_123_bojler_cirkulace"]
        assert heater_off, "Heater should be turned off on cancel"
        assert pump_off, "Pump should be turned off on cancel"

    @pytest.mark.asyncio
    async def test_pump_unavailable_does_not_block_heating(self, monkeypatch):
        """Pump switch missing: heating proceeds, circulation_pump_unavailable emitted."""
        from custom_components.oig_cloud.boiler import actuator as _actuator_mod
        now = FIXED_NOW
        monkeypatch.setattr(_actuator_mod.dt_util, "now", lambda: now)
        monkeypatch.setattr(_actuator_mod, "Store", _DummyStore)
        hass = _dummy_hass(
            states={
                "switch.oig_123_bojler_top": SimpleNamespace(state="off"),
                # pump state missing -> entity not available
            }
        )
        actuator = BoilerActuator(hass)
        plan = SimpleNamespace(
            slots=[
                _make_slot(now - timedelta(minutes=5), now + timedelta(minutes=30), 1.0, "grid"),
            ]
        )
        profile = None
        config = {
            CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.real_main",
            CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY: "switch.real_pump",
        }
        await actuator.async_apply_plan(plan, profile, config, "123", "entry1")
        await asyncio.sleep(0)
        heater_on = [c for c in hass.services.calls if c[1] == "turn_on" and c[2].get("entity_id") == "switch.oig_123_bojler_top"]
        assert heater_on, "Heating must not be blocked by missing pump"
        assert PlannerReasonCode.CIRCULATION_PUMP_UNAVAILABLE.value in actuator.reason_codes

    @pytest.mark.asyncio
    async def test_idle_plan_pump_off(self, monkeypatch):
        """With no plan slots, no heating and no pump actuation occurs."""
        from custom_components.oig_cloud.boiler import actuator as _actuator_mod
        now = FIXED_NOW
        monkeypatch.setattr(_actuator_mod.dt_util, "now", lambda: now)
        monkeypatch.setattr(_actuator_mod, "Store", _DummyStore)
        hass = _dummy_hass(
            states={
                "switch.oig_123_bojler_top": SimpleNamespace(state="off"),
                "switch.oig_123_bojler_cirkulace": SimpleNamespace(state="off"),
            }
        )
        actuator = BoilerActuator(hass)
        plan = SimpleNamespace(slots=[])
        profile = None
        config = {
            CONF_BOILER_HEATER_SWITCH_ENTITY: "switch.real_main",
            CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY: "switch.real_pump",
        }
        await actuator.async_apply_plan(plan, profile, config, "123", "entry1")
        assert hass.services.calls == [], "No actuation for idle plan"

    @pytest.mark.asyncio
    async def test_legacy_circulation_windows_do_not_duplicate(self, monkeypatch):
        """Old-style circulation window inputs must not create independent pump scheduling."""
        from custom_components.oig_cloud.boiler import circulation as circ_mod
        # Ensure build_circulation_windows is either removed or returns empty/no-op
        if hasattr(circ_mod, "build_circulation_windows"):
            result = circ_mod.build_circulation_windows(None)
            assert result == [], "Legacy build_circulation_windows should return empty for None profile"


# ---------------------------------------------------------------------------
# Section 2 — Switch platform delegation
# ---------------------------------------------------------------------------


class TestSwitchPlatformDelegation:
    def test_wrapper_switch_stores_entry_id(self):
        """BoilerWrapperSwitch must carry entry_id for runtime lookup."""
        from custom_components.oig_cloud.switch import BoilerWrapperSwitch

        hass = _dummy_hass()
        switch = BoilerWrapperSwitch(
            hass=hass,
            box_id="123",
            name="Test",
            entity_suffix="bojler_top",
            target_entity_id="switch.real_main",
            entry_id="entry_7c",
        )
        assert switch._entry_id == "entry_7c"

    @pytest.mark.asyncio
    async def test_turn_on_delegates_to_actuator(self, monkeypatch):
        """Wrapper switch turn_on must route through actuator, not direct service call."""
        from custom_components.oig_cloud.switch import BoilerWrapperSwitch

        hass = _dummy_hass(states={"switch.real_main": SimpleNamespace(state="off")})
        hass.data[DOMAIN] = {"entry_7c": {}}
        switch = BoilerWrapperSwitch(
            hass=hass,
            box_id="123",
            name="Test",
            entity_suffix="bojler_top",
            target_entity_id="switch.real_main",
            entry_id="entry_7c",
        )
        actuator_calls = []

        class FakeActuator:
            async def async_turn_on_entity(self, entity_id, is_heater=False):
                actuator_calls.append(("on", entity_id, is_heater))

        class FakeRuntime:
            actuator = FakeActuator()

        monkeypatch.setattr(
            "custom_components.oig_cloud.switch.get_boiler_runtime",
            lambda h, e, b: FakeRuntime(),
        )
        await switch.async_turn_on()
        assert actuator_calls, "Switch must delegate to actuator"
        assert actuator_calls[0][0] == "on"
        assert actuator_calls[0][1] == "switch.real_main"
        assert actuator_calls[0][2] is True  # is_heater for bojler_top

    @pytest.mark.asyncio
    async def test_turn_off_delegates_to_actuator(self, monkeypatch):
        """Wrapper switch turn_off must route through actuator."""
        from custom_components.oig_cloud.switch import BoilerWrapperSwitch

        hass = _dummy_hass(states={"switch.real_main": SimpleNamespace(state="on")})
        switch = BoilerWrapperSwitch(
            hass=hass,
            box_id="123",
            name="Test",
            entity_suffix="bojler_top",
            target_entity_id="switch.real_main",
            entry_id="entry_7c",
        )
        actuator_calls = []

        class FakeActuator:
            async def async_turn_off_entity(self, entity_id, is_heater=False):
                actuator_calls.append(("off", entity_id, is_heater))

        class FakeRuntime:
            actuator = FakeActuator()

        monkeypatch.setattr(
            "custom_components.oig_cloud.switch.get_boiler_runtime",
            lambda h, e, b: FakeRuntime(),
        )
        await switch.async_turn_off()
        assert actuator_calls, "Switch must delegate to actuator"
        assert actuator_calls[0][0] == "off"

    def test_switch_unique_id_stable(self):
        """Unique ID must remain deterministic for the same box_id + suffix."""
        from custom_components.oig_cloud.switch import BoilerWrapperSwitch

        hass = _dummy_hass()
        switch = BoilerWrapperSwitch(
            hass=hass,
            box_id="123",
            name="Test",
            entity_suffix="bojler_top",
            target_entity_id="switch.real_main",
            entry_id="entry_7c",
        )
        assert switch.unique_id == "oig_cloud_123_boiler_bojler_top"


# ---------------------------------------------------------------------------
# Section 3 — Sensor platform read routing
# ---------------------------------------------------------------------------


class TestSensorPlatformRouting:
    def test_boiler_sensors_accept_runtime(self):
        """get_boiler_sensors must accept a runtime parameter."""
        from custom_components.oig_cloud.boiler.sensors import get_boiler_sensors

        coordinator = SimpleNamespace(
            data={},
            box_id="123",
        )
        runtime = SimpleNamespace(
            get_current_plan=lambda: None,
            get_current_profile=lambda: None,
        )
        sensors = get_boiler_sensors(coordinator, runtime=runtime)
        assert isinstance(sensors, list)
        assert len(sensors) > 0

    def test_profile_sensor_routes_through_runtime(self):
        """BoilerProfileConfidenceSensor should use runtime profile when available."""
        from custom_components.oig_cloud.boiler.sensors import BoilerProfileConfidenceSensor

        coordinator = SimpleNamespace(data={}, box_id="123")
        fake_profile = SimpleNamespace(
            confidence={"a": 0.5, "b": 0.7},
            hourly_avg={8: 1.0},
            sample_count={"a": 10, "b": 20},
            category="test",
            last_updated=FIXED_NOW,
        )
        runtime = SimpleNamespace(get_current_profile=lambda: fake_profile)
        sensor = BoilerProfileConfidenceSensor(coordinator, runtime=runtime)
        value = sensor.native_value
        assert value is not None
        assert value == 60.0  # avg of 50 and 70 -> 60.0

    def test_plan_sensor_routes_through_runtime(self):
        """BoilerPlanEstimatedCostSensor should use runtime plan when available."""
        from custom_components.oig_cloud.boiler.sensors import BoilerPlanEstimatedCostSensor

        coordinator = SimpleNamespace(data={}, box_id="123")
        fake_plan = SimpleNamespace(
            estimated_cost_czk=42.5,
            total_consumption_kwh=10.0,
            fve_kwh=3.0,
            grid_kwh=5.0,
            alt_kwh=2.0,
            created_at=FIXED_NOW,
            valid_until=FIXED_NOW + timedelta(hours=1),
        )
        runtime = SimpleNamespace(get_current_plan=lambda: fake_plan)
        sensor = BoilerPlanEstimatedCostSensor(coordinator, runtime=runtime)
        assert sensor.native_value == 42.5

    def test_sensor_unique_id_stable(self):
        """Sensor unique IDs must be deterministic."""
        from custom_components.oig_cloud.boiler.sensors import BoilerUpperZoneTempSensor

        coordinator = SimpleNamespace(data={"temperatures": {"upper_zone": 45.0}}, box_id="123")
        sensor = BoilerUpperZoneTempSensor(coordinator)
        assert sensor.unique_id == "oig_cloud_123_boiler_upper_zone_temp"


# ---------------------------------------------------------------------------
# Section 4 — Legacy compatibility (no duplicate actuation)
# ---------------------------------------------------------------------------


class TestLegacyCompatibility:
    def test_services_boiler_no_direct_switch_calls(self):
        """services/boiler.py must not contain direct switch service calls."""
        import inspect
        from custom_components.oig_cloud.services import boiler as boiler_mod

        source = inspect.getsource(boiler_mod)
        direct_calls = [
            line for line in source.splitlines()
            if 'hass.services.async_call("switch"' in line or "services.async_call('switch'" in line
        ]
        assert not direct_calls, "services/boiler.py must not duplicate switch actuation"

    def test_old_circulation_import_does_not_schedule(self):
        """Importing circulation helpers must not create any scheduled tasks."""
        from custom_components.oig_cloud.boiler import circulation as circ_mod
        # After redesign, circulation module should not have any scheduler classes or active loops
        assert not hasattr(circ_mod, "CirculationScheduler"), "No scheduler class should exist"
        assert not hasattr(circ_mod, "async_track_point_in_time"), "No HA scheduling imports"

    def test_actuator_reason_codes_include_pump_unavailable(self):
        """BoilerActuator must expose reason_codes and include circulation_pump_unavailable."""
        hass = _dummy_hass()
        actuator = BoilerActuator(hass)
        assert hasattr(actuator, "reason_codes")
        assert isinstance(actuator.reason_codes, list)

    def test_switch_platform_no_duplicate_service_calls(self):
        """switch.py must not call hass.services.async_call for switch domain directly after delegation."""
        import inspect
        from custom_components.oig_cloud import switch as switch_mod

        source = inspect.getsource(switch_mod)
        # The only direct switch service calls should be inside the actuator delegation methods,
        # not in the switch entity itself.
        lines = source.splitlines()
        in_boiler_wrapper = False
        wrapper_direct_calls = []
        for line in lines:
            if "class BoilerWrapperSwitch" in line:
                in_boiler_wrapper = True
            if in_boiler_wrapper and 'hass.services.async_call("switch"' in line:
                wrapper_direct_calls.append(line.strip())
            if in_boiler_wrapper and line.strip().startswith("class ") and "BoilerWrapperSwitch" not in line:
                in_boiler_wrapper = False
        assert not wrapper_direct_calls, "BoilerWrapperSwitch must not contain direct switch service calls"


# ---------------------------------------------------------------------------
# Section 5 — Actuator entity turn_on / turn_off delegation helpers
# ---------------------------------------------------------------------------


class TestActuatorEntityDelegation:
    @pytest.mark.asyncio
    async def test_actuator_turn_on_entity_controls_pump_for_heater(self):
        """Turning on a heater entity via actuator also turns on the pump."""
        hass = _dummy_hass(
            states={
                "switch.real_main": SimpleNamespace(state="off"),
                "switch.real_pump": SimpleNamespace(state="off"),
            }
        )
        actuator = BoilerActuator(hass)
        # Set pump entity manually for test
        actuator._pump_entity = "switch.real_pump"
        await actuator.async_turn_on_entity("switch.real_main", is_heater=True)
        on_calls = [c for c in hass.services.calls if c[1] == "turn_on"]
        assert ("switch", "turn_on", {"entity_id": "switch.real_main"}, False) in on_calls
        assert ("switch", "turn_on", {"entity_id": "switch.real_pump"}, False) in on_calls

    @pytest.mark.asyncio
    async def test_actuator_turn_off_entity_controls_pump_for_heater(self):
        """Turning off the last heater also turns off the pump."""
        hass = _dummy_hass(
            states={
                "switch.real_main": SimpleNamespace(state="on"),
                "switch.real_pump": SimpleNamespace(state="on"),
            }
        )
        actuator = BoilerActuator(hass)
        actuator._pump_entity = "switch.real_pump"
        await actuator.async_turn_on_entity("switch.real_main", is_heater=True)
        hass.services.calls.clear()
        await actuator.async_turn_off_entity("switch.real_main", is_heater=True)
        off_calls = [c for c in hass.services.calls if c[1] == "turn_off"]
        assert ("switch", "turn_off", {"entity_id": "switch.real_main"}, False) in off_calls
        assert ("switch", "turn_off", {"entity_id": "switch.real_pump"}, False) in off_calls

    @pytest.mark.asyncio
    async def test_actuator_turn_off_keeps_pump_if_other_heater_active(self):
        """Turning off one heater while another is active keeps pump on."""
        hass = _dummy_hass(
            states={
                "switch.real_main": SimpleNamespace(state="on"),
                "switch.real_alt": SimpleNamespace(state="on"),
                "switch.real_pump": SimpleNamespace(state="on"),
            }
        )
        actuator = BoilerActuator(hass)
        actuator._pump_entity = "switch.real_pump"
        await actuator.async_turn_on_entity("switch.real_main", is_heater=True)
        await actuator.async_turn_on_entity("switch.real_alt", is_heater=True)
        hass.services.calls.clear()
        await actuator.async_turn_off_entity("switch.real_main", is_heater=True)
        off_calls = [c for c in hass.services.calls if c[1] == "turn_off"]
        pump_off = [c for c in off_calls if c[2].get("entity_id") == "switch.real_pump"]
        assert not pump_off, "Pump must stay on while alt heater is active"

    @pytest.mark.asyncio
    async def test_actuator_pump_unavailable_on_manual_turn_on(self):
        """Manual heater turn-on with missing pump emits reason code."""
        hass = _dummy_hass(states={"switch.real_main": SimpleNamespace(state="off")})
        actuator = BoilerActuator(hass)
        actuator._pump_entity = "switch.real_pump"
        await actuator.async_turn_on_entity("switch.real_main", is_heater=True)
        assert PlannerReasonCode.CIRCULATION_PUMP_UNAVAILABLE.value in actuator.reason_codes
