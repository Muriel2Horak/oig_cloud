"""Task 7c verification rejection tests — grep-level contract enforcement.

These tests prove the blockers Atlas found are fixed:
1. switch.py: no fallback direct switch service calls in BoilerWrapperSwitch
2. sensors.py: no direct self.coordinator.data reads for boiler state
3. actuator.py: no _build_circulation_windows helper
4. services/boiler.py: no stale _build_circulation_windows import
"""

from __future__ import annotations

import inspect


def test_switch_py_no_direct_switch_service_calls():
    """BoilerWrapperSwitch must not contain any direct switch service calls."""
    from custom_components.oig_cloud import switch as switch_mod

    source = inspect.getsource(switch_mod)
    lines = source.splitlines()
    in_wrapper = False
    direct_calls = []
    for i, line in enumerate(lines):
        if "class BoilerWrapperSwitch" in line:
            in_wrapper = True
        if in_wrapper and "services.async_call" in line:
            direct_calls.append((i + 1, line.strip()))
        if in_wrapper and line.strip().startswith("class ") and "BoilerWrapperSwitch" not in line:
            in_wrapper = False
    assert not direct_calls, f"Direct switch service calls found in BoilerWrapperSwitch: {direct_calls}"


def test_sensors_py_no_direct_coordinator_data_reads():
    """Boiler sensor native_value must not directly read self.coordinator.data
    or _coordinator_data(self.coordinator) outside an explicit compat adapter."""
    from custom_components.oig_cloud.boiler import sensors as sensors_mod

    source = inspect.getsource(sensors_mod)
    lines = source.splitlines()
    forbidden = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Allow reads inside _coordinator_data function itself and compat adapter
        if "def _coordinator_data" in stripped or "def _compat_coordinator_data" in stripped:
            continue
        if "self.coordinator.data.get" in stripped or "_coordinator_data(self.coordinator)" in stripped:
            # Check if this is inside a compat adapter class/function
            # Look back up to 20 lines for adapter context
            context = "\n".join(lines[max(0, i - 20):i + 1])
            if "_CompatCoordinatorAdapter" not in context and "_compat_coordinator_data" not in context:
                forbidden.append((i + 1, stripped))
    assert not forbidden, f"Direct coordinator data reads outside compat adapter: {forbidden}"


def test_actuator_py_no_build_circulation_windows():
    """actuator.py must not define _build_circulation_windows."""
    from custom_components.oig_cloud.boiler import actuator as actuator_mod

    source = inspect.getsource(actuator_mod)
    assert "def _build_circulation_windows(" not in source, "_build_circulation_windows must be removed from actuator.py"
    assert "def _pick_peak_hours(" not in source, "_pick_peak_hours must be removed from actuator.py"


def test_services_boiler_no_build_circulation_windows_import():
    """services/boiler.py must not import _build_circulation_windows."""
    from custom_components.oig_cloud.services import boiler as services_mod

    source = inspect.getsource(services_mod)
    assert "_build_circulation_windows" not in source, "_build_circulation_windows must not be imported in services/boiler.py"


def test_sensor_native_value_updates_dynamically():
    """Sensor native_value must reflect coordinator data changes (not cached)."""
    from types import SimpleNamespace

    from custom_components.oig_cloud.boiler.sensors import BoilerUpperZoneTempSensor

    coordinator = SimpleNamespace(box_id="123", data={"temperatures": {"upper_zone": 45.0}})
    sensor = BoilerUpperZoneTempSensor(coordinator)
    assert sensor.native_value == 45.0

    coordinator.data["temperatures"]["upper_zone"] = 50.0
    assert sensor.native_value == 50.0, "native_value must update when underlying data changes"


def test_sensor_extra_state_attributes_update_dynamically():
    """Sensor extra_state_attributes must reflect coordinator data changes (not cached)."""
    from datetime import datetime, timezone
    from types import SimpleNamespace

    from custom_components.oig_cloud.boiler.sensors import BoilerChargingRecommendedSensor

    slot = SimpleNamespace(
        start=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
        end=datetime(2025, 1, 1, 9, 0, tzinfo=timezone.utc),
        avg_consumption_kwh=1.5,
        confidence=0.85,
        spot_price_kwh=2.5,
        overflow_available=True,
    )
    coordinator = SimpleNamespace(box_id="123", data={"charging_recommended": True, "current_slot": slot})
    sensor = BoilerChargingRecommendedSensor(coordinator)

    attrs1 = sensor.extra_state_attributes
    assert attrs1["consumption_kwh"] == 1.5

    slot2 = SimpleNamespace(
        start=datetime(2025, 1, 1, 10, 0, tzinfo=timezone.utc),
        end=datetime(2025, 1, 1, 11, 0, tzinfo=timezone.utc),
        avg_consumption_kwh=2.0,
        confidence=0.9,
        spot_price_kwh=3.0,
        overflow_available=False,
    )
    coordinator.data["current_slot"] = slot2
    attrs2 = sensor.extra_state_attributes
    assert attrs2["consumption_kwh"] == 2.0, "extra_state_attributes must update when underlying data changes"


def test_switch_available_updates_dynamically():
    """BoilerWrapperSwitch.available must reflect state changes (not cached)."""
    from types import SimpleNamespace

    from custom_components.oig_cloud import switch as switch_mod
    from custom_components.oig_cloud.const import DOMAIN

    class DummyStates:
        def __init__(self):
            self._states = {}

        def get(self, entity_id):
            return self._states.get(entity_id)

    class DummyHass:
        def __init__(self):
            self.states = DummyStates()
            self.data = {DOMAIN: {}}

    hass = DummyHass()
    wrapper = switch_mod.BoilerWrapperSwitch(
        hass=hass,
        box_id="123",
        name="Test",
        entity_suffix="bojler_top",
        target_entity_id="switch.test",
        entry_id="entry1",
    )
    assert wrapper.available is False

    hass.states._states["switch.test"] = SimpleNamespace(state="on")
    assert wrapper.available is True, "available must update when target entity state changes"


def test_switch_is_on_updates_dynamically():
    """BoilerWrapperSwitch.is_on must reflect state changes (not cached)."""
    from types import SimpleNamespace

    from custom_components.oig_cloud import switch as switch_mod
    from custom_components.oig_cloud.const import DOMAIN

    class DummyStates:
        def __init__(self):
            self._states = {}

        def get(self, entity_id):
            return self._states.get(entity_id)

    class DummyHass:
        def __init__(self):
            self.states = DummyStates()
            self.data = {DOMAIN: {}}

    hass = DummyHass()
    wrapper = switch_mod.BoilerWrapperSwitch(
        hass=hass,
        box_id="123",
        name="Test",
        entity_suffix="bojler_top",
        target_entity_id="switch.test",
        entry_id="entry1",
    )
    assert wrapper.is_on is None

    hass.states._states["switch.test"] = SimpleNamespace(state="on")
    assert wrapper.is_on is True, "is_on must update when target entity state changes"

    hass.states._states["switch.test"] = SimpleNamespace(state="off")
    assert wrapper.is_on is False, "is_on must update when target entity state changes again"


def test_get_boiler_sensors_passes_runtime_to_all_sensors():
    """get_boiler_sensors must pass runtime to every sensor constructor."""
    from types import SimpleNamespace

    from custom_components.oig_cloud.boiler.sensors import get_boiler_sensors

    coordinator = SimpleNamespace(box_id="123", data={})
    runtime = object()
    sensors = get_boiler_sensors(coordinator, runtime=runtime)

    for sensor in sensors:
        assert sensor._runtime is runtime, f"{sensor.__class__.__name__} did not receive runtime"
        assert sensor._adapter._runtime is runtime, f"{sensor.__class__.__name__} adapter did not receive runtime"
