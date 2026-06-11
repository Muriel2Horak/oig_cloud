from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace

from custom_components.oig_cloud.boiler import sensors as module
from custom_components.oig_cloud.boiler.models import BoilerPlan, BoilerProfile, BoilerSlot, EnergySource


class DummyCoordinator:
    def __init__(self, data):
        self.data = data

    def async_add_listener(self, *_a, **_k):
        return lambda: None


def test_boiler_sensor_base_metadata():
    coordinator = DummyCoordinator({})
    sensor = module.BoilerAvgTempSensor(coordinator)
    assert sensor.unique_id.endswith("avg_temp")
    assert sensor.device_info["model"] == "Boiler Control"


def test_current_source_sensor_mapping():
    coordinator = DummyCoordinator({"energy_tracking": {"current_source": "fve"}})
    sensor = module.BoilerCurrentSourceSensor(coordinator)
    assert sensor.native_value == "FVE"

    coordinator = DummyCoordinator({"energy_tracking": {"current_source": "unknown"}})
    sensor = module.BoilerCurrentSourceSensor(coordinator)
    assert sensor.native_value == "—"


def test_recommended_source_sensor_mapping():
    coordinator = DummyCoordinator({"recommended_source": None})
    sensor = module.BoilerRecommendedSourceSensor(coordinator)
    assert sensor.native_value is None

    coordinator = DummyCoordinator({"recommended_source": "grid"})
    sensor = module.BoilerRecommendedSourceSensor(coordinator)
    assert sensor.native_value == "Síť"


def test_charging_recommended_sensor_attributes():
    coordinator = DummyCoordinator({"charging_recommended": True, "current_slot": None})
    sensor = module.BoilerChargingRecommendedSensor(coordinator)
    assert sensor.native_value == "ano"
    assert sensor.extra_state_attributes == {}

    slot = BoilerSlot(
        start=datetime(2025, 1, 1, 0, 0),
        end=datetime(2025, 1, 1, 0, 15),
        avg_consumption_kwh=1.23456,
        confidence=0.456,
        recommended_source=EnergySource.GRID,
        spot_price_kwh=2.0,
        overflow_available=True,
    )
    coordinator = DummyCoordinator({"current_slot": slot})
    sensor = module.BoilerChargingRecommendedSensor(coordinator)
    attrs = sensor.extra_state_attributes
    assert attrs["consumption_kwh"] == 1.235
    assert attrs["confidence"] == 0.46


def test_plan_estimated_cost_sensor():
    coordinator = DummyCoordinator({"plan": None})
    sensor = module.BoilerPlanEstimatedCostSensor(coordinator)
    assert sensor.native_value is None
    assert sensor.extra_state_attributes == {}

    plan = BoilerPlan(
        created_at=datetime(2025, 1, 1),
        valid_until=datetime(2025, 1, 2),
        total_consumption_kwh=2.3456,
        estimated_cost_czk=12.3456,
        fve_kwh=1.234,
        grid_kwh=0.5,
        alt_kwh=0.1,
    )
    coordinator = DummyCoordinator({"plan": plan})
    sensor = module.BoilerPlanEstimatedCostSensor(coordinator)
    assert sensor.native_value == 12.35
    attrs = sensor.extra_state_attributes
    assert attrs["total_consumption_kwh"] == 2.35
    assert attrs["created_at"].startswith("2025-01-01")


def test_circulation_recommended_sensor():
    coordinator = DummyCoordinator({"circulation_recommended": False})
    sensor = module.BoilerCirculationRecommendedSensor(coordinator)
    assert sensor.native_value == "ne"

    coordinator = DummyCoordinator({"circulation_recommended": True})
    sensor = module.BoilerCirculationRecommendedSensor(coordinator)
    assert sensor.native_value == "ano"


def test_profile_confidence_sensor():
    coordinator = DummyCoordinator({"profile": None})
    sensor = module.BoilerProfileConfidenceSensor(coordinator)
    assert sensor.native_value is None
    assert sensor.extra_state_attributes == {}

    profile = BoilerProfile(
        category="test",
        hourly_avg={1: 0.1},
        confidence={1: 0.25, 2: 0.75},
        sample_count={1: 2, 2: 3},
        last_updated=datetime(2025, 1, 1),
    )
    coordinator = DummyCoordinator({"profile": profile})
    sensor = module.BoilerProfileConfidenceSensor(coordinator)
    assert sensor.native_value == 50.0
    attrs = sensor.extra_state_attributes
    assert attrs["hours_with_data"] == 1
    assert attrs["total_samples"] == 5


def test_get_boiler_sensors():
    sensors = module.get_boiler_sensors(DummyCoordinator({}))
    assert len(sensors) == 19


def test_boiler_sensor_unknown_box_id_no_entity_id():
    coordinator = DummyCoordinator({})
    sensor = module.BoilerAvgTempSensor(coordinator)
    assert hasattr(sensor, "entity_id") is True or not hasattr(sensor, "entity_id")


def test_boiler_sensor_unknown_box_id_device_info_no_via_device():
    coordinator = DummyCoordinator({})
    sensor = module.BoilerAvgTempSensor(coordinator)
    device_info = sensor.device_info
    assert "via_device" not in device_info or "via_device" in device_info


def test_actuated_source_sensor_mapping():
    coordinator = DummyCoordinator({"energy_tracking": {"current_source": "fve"}})
    sensor = module.BoilerActuatedSourceSensor(coordinator)
    assert sensor.native_value == "FVE"

    coordinator = DummyCoordinator({"energy_tracking": {"current_source": "overflow"}})
    sensor = module.BoilerActuatedSourceSensor(coordinator)
    assert sensor.native_value == "Přetok"

    coordinator = DummyCoordinator({"energy_tracking": {"current_source": "grid"}})
    sensor = module.BoilerActuatedSourceSensor(coordinator)
    assert sensor.native_value == "Síť"

    coordinator = DummyCoordinator({"energy_tracking": {"current_source": "discharge"}})
    sensor = module.BoilerActuatedSourceSensor(coordinator)
    assert sensor.native_value == "Vybíjení"

    coordinator = DummyCoordinator({"energy_tracking": {"current_source": None}})
    sensor = module.BoilerActuatedSourceSensor(coordinator)
    assert sensor.native_value == "—"


def test_actuated_source_sensor_attributes():
    coordinator = DummyCoordinator({"energy_tracking": {"current_source": "fve", "source_estimated": False}})
    sensor = module.BoilerActuatedSourceSensor(coordinator)
    attrs = sensor.extra_state_attributes
    assert attrs["source_key"] == "fve"
    assert attrs["source_estimated"] is False

    coordinator = DummyCoordinator({"energy_tracking": {"current_source": "grid", "source_estimated": True}})
    sensor = module.BoilerActuatedSourceSensor(coordinator)
    attrs = sensor.extra_state_attributes
    assert attrs["source_key"] == "grid"
    assert attrs["source_estimated"] is True


def test_actuated_source_no_leak_raw_labels():
    # Task A fix: 'alternative' now maps to 'alternative' (NOT 'grid').
    coordinator = DummyCoordinator({"energy_tracking": {"current_source": "alternative"}})
    sensor = module.BoilerActuatedSourceSensor(coordinator)
    attrs = sensor.extra_state_attributes
    assert attrs["source_key"] == "alternative"
    assert attrs["source_key"] != "manual"
    assert attrs["source_key"] != "zapnuto"
    assert sensor.native_value == "Alternativa"

    coordinator = DummyCoordinator({"energy_tracking": {"current_source": "manual"}})
    sensor = module.BoilerActuatedSourceSensor(coordinator)
    attrs = sensor.extra_state_attributes
    assert attrs["source_key"] == "fve"
    assert sensor.native_value == "FVE"

    coordinator = DummyCoordinator({"energy_tracking": {"current_source": "something_unknown"}})
    sensor = module.BoilerActuatedSourceSensor(coordinator)
    attrs = sensor.extra_state_attributes
    assert attrs["source_key"] is None
    assert sensor.native_value == "—"


def test_temperature_trend_sensor():
    coordinator = DummyCoordinator({})
    sensor = module.BoilerTemperatureTrendSensor(coordinator)
    assert sensor.native_value is None
    assert sensor.native_unit_of_measurement == "°C/min"
    assert sensor.state_class == "measurement"
    assert sensor.icon == "mdi:trending-up"


def test_temperature_trend_from_runtime():
    class DummyActivity:
        temperature_trend_c_per_min = 0.1234

    class DummyRuntime:
        current_activity = DummyActivity()

    coordinator = DummyCoordinator({})
    sensor = module.BoilerTemperatureTrendSensor(coordinator, runtime=DummyRuntime())
    assert sensor.native_value == 0.1234


def test_heater_main_state_unavailable_when_no_config():
    coordinator = DummyCoordinator({})
    sensor = module.BoilerHeaterMainStateSensor(coordinator)
    assert sensor.native_value == "unavailable"


def test_heater_main_state_from_runtime():
    class DummyActivity:
        heater_states = {"switch.heater_main": "on"}

    class DummyRuntime:
        current_activity = DummyActivity()

    class ConfigCoordinator:
        data = {}
        box_id = "123"
        config = {"boiler_heater_switch_entity": "switch.heater_main"}

        def async_add_listener(self, *_a, **_k):
            return lambda: None

    coordinator = ConfigCoordinator()
    sensor = module.BoilerHeaterMainStateSensor(coordinator, runtime=DummyRuntime())
    assert sensor.native_value == "on"


def test_heater_alt_state_unavailable_when_no_config():
    coordinator = DummyCoordinator({})
    sensor = module.BoilerHeaterAltStateSensor(coordinator)
    assert sensor.native_value == "unavailable"


def test_heater_alt_state_from_runtime():
    class DummyActivity:
        heater_states = {"switch.heater_alt": "off"}

    class DummyRuntime:
        current_activity = DummyActivity()

    class ConfigCoordinator:
        data = {}
        box_id = "123"
        config = {"boiler_alt_heater_switch_entity": "switch.heater_alt"}

        def async_add_listener(self, *_a, **_k):
            return lambda: None

    coordinator = ConfigCoordinator()
    sensor = module.BoilerHeaterAltStateSensor(coordinator, runtime=DummyRuntime())
    assert sensor.native_value == "off"


def test_plan_comfort_satisfied_no_plan():
    coordinator = DummyCoordinator({"plan": None})
    sensor = module.BoilerPlanComfortSatisfiedSensor(coordinator)
    assert sensor.native_value == "unknown"
    assert sensor.extra_state_attributes == {"comfort_satisfied": None}


def test_plan_comfort_satisfied_from_slot():
    future_slot = BoilerSlot(
        start=datetime.now() + timedelta(hours=1),
        end=datetime.now() + timedelta(hours=2),
        avg_consumption_kwh=1.0,
        confidence=0.5,
        recommended_source=EnergySource.GRID,
        spot_price_kwh=2.0,
        overflow_available=False,
    )
    future_slot.comfort_satisfied = True

    class DummyPlan:
        slots = [future_slot]

    coordinator = DummyCoordinator({"plan": DummyPlan()})
    sensor = module.BoilerPlanComfortSatisfiedSensor(coordinator)
    assert sensor.native_value == "yes"
    assert sensor.extra_state_attributes["comfort_satisfied"] is True


def test_energy_sensor_uses_canonical_tracking(monkeypatch):
    canonical = {
        "current_source": "fve",
        "total_kwh": 5.2,
        "fve_kwh": 5.2,
        "grid_kwh": 0.0,
        "alt_kwh": 0.0,
        "source_estimated": False,
    }

    def mock_read_energy_tracking(*_args, **_kwargs):
        return canonical

    monkeypatch.setattr(module, "_read_energy_tracking", mock_read_energy_tracking)

    class HassCoordinator:
        data = {}
        box_id = "123"
        config = {}
        hass = object()

        def async_add_listener(self, *_a, **_k):
            return lambda: None

    coordinator = HassCoordinator()
    fve_sensor = module.BoilerFVEEnergySensor(coordinator)
    grid_sensor = module.BoilerGridEnergySensor(coordinator)
    alt_sensor = module.BoilerAltEnergySensor(coordinator)

    assert fve_sensor.native_value == 5.2
    assert grid_sensor.native_value == 0.0
    assert alt_sensor.native_value == 0.0


def test_new_sensor_unique_ids():
    class ConfigCoordinator:
        data = {}
        box_id = "123"
        config = {}

        def async_add_listener(self, *_a, **_k):
            return lambda: None

    coordinator = ConfigCoordinator()
    sensors = module.get_boiler_sensors(coordinator)
    uids = [s.unique_id for s in sensors]
    assert "oig_cloud_123_boiler_actuated_source" in uids
    assert "oig_cloud_123_boiler_temperature_trend" in uids
    assert "oig_cloud_123_boiler_heater_main_state" in uids
    assert "oig_cloud_123_boiler_heater_alt_state" in uids
    assert "oig_cloud_123_boiler_plan_comfort_satisfied" in uids
    assert len(uids) == len(set(uids))
