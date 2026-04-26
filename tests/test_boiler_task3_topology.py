"""Task 3 tests: stratification and thermometer topology as first-class planner inputs."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest


# ---------------------------------------------------------------------------
# 1. Topology model contracts
# ---------------------------------------------------------------------------


def test_stratification_mode_enum_values():
    from custom_components.oig_cloud.boiler.models import StratificationMode

    assert StratificationMode.SIMPLE_AVG.value == "simple_avg"
    assert StratificationMode.TWO_ZONE.value == "two_zone"


def test_thermometer_placement_enum_values():
    from custom_components.oig_cloud.boiler.models import ThermometerPlacement

    assert ThermometerPlacement.TOP.value == "top"
    assert ThermometerPlacement.UPPER_QUARTER.value == "upper_quarter"
    assert ThermometerPlacement.MIDDLE.value == "middle"
    assert ThermometerPlacement.LOWER_QUARTER.value == "lower_quarter"
    assert ThermometerPlacement.BOTTOM.value == "bottom"


def test_temperature_topology_enum_values():
    from custom_components.oig_cloud.boiler.models import TemperatureTopology

    assert TemperatureTopology.TOP_ONLY.value == "top_only"
    assert TemperatureTopology.TOP_BOTTOM.value == "top_bottom"
    assert TemperatureTopology.BOTTOM_ONLY.value == "bottom_only"


def test_boiler_thermal_topology_dataclass():
    from custom_components.oig_cloud.boiler.models import (
        BoilerThermalTopology,
        StratificationMode,
        TemperatureTopology,
        ThermometerPlacement,
    )

    topo = BoilerThermalTopology(
        stratification_mode=StratificationMode.TWO_ZONE,
        thermometer_placements=[ThermometerPlacement.TOP],
        temperature_topology=TemperatureTopology.TOP_ONLY,
        tank_volume_l=120.0,
        target_temp_c=60.0,
        cold_inlet_temp_c=10.0,
        heater_power_kw=2.0,
        standing_loss_coefficient=0.02,
    )
    assert topo.tank_volume_l == 120.0
    assert topo.temperature_topology == TemperatureTopology.TOP_ONLY


def test_bootstrap_profile_dataclass():
    from custom_components.oig_cloud.boiler.models import BootstrapProfile, BoilerProfile

    profile = BoilerProfile(category="bootstrap")
    bp = BootstrapProfile(
        profile=profile,
        confidence=0.5,
        degraded_reason="bootstrap_profile",
    )
    assert bp.confidence == 0.5
    assert bp.degraded_reason == "bootstrap_profile"


# ---------------------------------------------------------------------------
# 2. Thermal physics in boiler/thermal.py
# ---------------------------------------------------------------------------


def test_calculate_energy_to_heat_basic():
    from custom_components.oig_cloud.boiler.thermal import calculate_energy_to_heat

    # 100l from 20C to 60C
    energy = calculate_energy_to_heat(100.0, 20.0, 60.0)
    # Q = m * c * dT = 100 * 4186 * 40 = 16,744,000 J = 4.651 kWh
    expected = 100.0 * 4186.0 * 40.0 / 3_600_000
    assert energy == pytest.approx(expected, rel=1e-6)


def test_calculate_energy_to_heat_no_heating_needed():
    from custom_components.oig_cloud.boiler.thermal import calculate_energy_to_heat

    assert calculate_energy_to_heat(100.0, 60.0, 60.0) == 0.0
    assert calculate_energy_to_heat(100.0, 70.0, 60.0) == 0.0


def test_calculate_stratified_temp_simple_avg():
    from custom_components.oig_cloud.boiler.thermal import calculate_stratified_temp

    upper, lower = calculate_stratified_temp(
        measured_temp=50.0, sensor_position="top", mode="simple_avg"
    )
    assert upper == 50.0
    assert lower == 50.0


def test_calculate_stratified_temp_two_zone():
    from custom_components.oig_cloud.boiler.thermal import calculate_stratified_temp

    upper, lower = calculate_stratified_temp(
        measured_temp=50.0,
        sensor_position="top",
        mode="two_zone",
        split_ratio=0.5,
        boiler_height_m=1.0,
    )
    # Sensor at top (1.0). Upper zone center at 0.75, lower at 0.25.
    # Gradient = 0.8 * 10 = 8.0 C/m
    # upper = 50 + 8.0 * (0.75 - 1.0) * 1.0 = 50 - 2.0 = 48.0
    # lower = 50 + 8.0 * (0.25 - 1.0) * 1.0 = 50 - 6.0 = 44.0
    assert upper == pytest.approx(48.0, abs=0.01)
    assert lower == pytest.approx(44.0, abs=0.01)
    assert upper > lower


def test_validate_temperature_sensor_valid():
    from custom_components.oig_cloud.boiler.thermal import validate_temperature_sensor

    state = SimpleNamespace(state="25.5")
    assert validate_temperature_sensor(state, "sensor.temp") == 25.5


def test_validate_temperature_sensor_invalid():
    from custom_components.oig_cloud.boiler.thermal import validate_temperature_sensor

    assert validate_temperature_sensor(None, "sensor.temp") is None
    assert validate_temperature_sensor(SimpleNamespace(state="bad"), "sensor.temp") is None
    assert validate_temperature_sensor(SimpleNamespace(state="200"), "sensor.temp") is None
    assert validate_temperature_sensor(SimpleNamespace(state="-60"), "sensor.temp") is None


def test_estimate_residual_energy():
    from custom_components.oig_cloud.boiler.thermal import estimate_residual_energy

    assert estimate_residual_energy(10.0, 6.0, 3.0) == 1.0
    assert estimate_residual_energy(10.0, 6.0, 5.0) == 0.0
    assert estimate_residual_energy(5.0, 10.0, 0.0) == 0.0  # clamped to 0


def test_effective_power_normalization():
    from custom_components.oig_cloud.boiler.thermal import effective_power_kw

    assert effective_power_kw(2.0) == 2.0
    assert effective_power_kw(2.0, voltage_v=210.0, nominal_voltage_v=230.0) == pytest.approx(
        2.0 * (210.0 / 230.0) ** 2, rel=1e-6
    )


def test_standing_loss_per_slot():
    from custom_components.oig_cloud.boiler.thermal import standing_loss_per_slot

    # 120l tank at 60C avg, 20C ambient, 0.02 coefficient, 15 min
    loss = standing_loss_per_slot(120.0, 60.0, 20.0, 15, 0.02)
    assert loss >= 0.0
    # 30 min slot should lose roughly 2x
    loss_30 = standing_loss_per_slot(120.0, 60.0, 20.0, 30, 0.02)
    assert loss_30 == pytest.approx(loss * 2.0, rel=0.01)


def test_heating_per_slot():
    from custom_components.oig_cloud.boiler.thermal import heating_per_slot

    assert heating_per_slot(2.0, 15) == pytest.approx(0.5, rel=1e-6)
    assert heating_per_slot(2.0, 30) == pytest.approx(1.0, rel=1e-6)
    assert heating_per_slot(2.0, 60) == pytest.approx(2.0, rel=1e-6)


def test_predicted_temperature_after_slot():
    from custom_components.oig_cloud.boiler.thermal import predicted_temperature_after_slot

    # 100l at 50C, add 0.5kWh, lose 0.1kWh
    new_temp = predicted_temperature_after_slot(50.0, 0.5, 0.1, 100.0)
    # dT = (0.5 - 0.1) * 3_600_000 / (100 * 4186) = 0.4 * 3600000 / 418600 = ~3.44
    assert new_temp == pytest.approx(53.44, abs=0.1)


def test_stale_temperature_bias():
    from custom_components.oig_cloud.boiler.thermal import stale_temperature_bias

    assert stale_temperature_bias(0) == 0.0
    assert stale_temperature_bias(10) == pytest.approx(1.0, abs=0.01)
    assert stale_temperature_bias(30, bias_per_minute=0.2) == pytest.approx(6.0, abs=0.01)


# ---------------------------------------------------------------------------
# 3. Topology validation in config/steps.py
# ---------------------------------------------------------------------------


def test_validate_boiler_topology_top_only_supported():
    from custom_components.oig_cloud.config.steps import WizardMixin

    user_input = {
        "boiler_temp_sensor_top": "sensor.temp_top",
        "boiler_temp_sensor_bottom": "",
        "boiler_stratification_mode": "two_zone",
    }
    errors = WizardMixin._validate_boiler_topology(user_input)
    assert not errors


def test_validate_boiler_topology_top_bottom_supported():
    from custom_components.oig_cloud.config.steps import WizardMixin

    user_input = {
        "boiler_temp_sensor_top": "sensor.temp_top",
        "boiler_temp_sensor_bottom": "sensor.temp_bottom",
        "boiler_stratification_mode": "two_zone",
    }
    errors = WizardMixin._validate_boiler_topology(user_input)
    assert not errors


def test_validate_boiler_topology_bottom_only_rejected():
    from custom_components.oig_cloud.config.steps import WizardMixin

    user_input = {
        "boiler_temp_sensor_top": "",
        "boiler_temp_sensor_bottom": "sensor.temp_bottom",
        "boiler_stratification_mode": "two_zone",
    }
    errors = WizardMixin._validate_boiler_topology(user_input)
    assert "boiler_temp_sensor_bottom" in errors
    assert "bottom_only" in errors["boiler_temp_sensor_bottom"]


def test_validate_boiler_topology_duplicate_sensor_rejected():
    from custom_components.oig_cloud.config.steps import WizardMixin

    user_input = {
        "boiler_temp_sensor_top": "sensor.same",
        "boiler_temp_sensor_bottom": "sensor.same",
        "boiler_stratification_mode": "two_zone",
    }
    errors = WizardMixin._validate_boiler_topology(user_input)
    assert "boiler_temp_sensor_bottom" in errors
    assert "duplicate_sensor" in errors["boiler_temp_sensor_bottom"]


def test_validate_boiler_topology_three_plus_thermometers_rejected():
    from custom_components.oig_cloud.config.steps import WizardMixin

    user_input = {
        "boiler_temp_sensor_top": "sensor.temp1",
        "boiler_temp_sensor_bottom": "sensor.temp2",
        "boiler_temp_sensor_middle": "sensor.temp3",
        "boiler_stratification_mode": "two_zone",
    }
    errors = WizardMixin._validate_boiler_topology(user_input)
    assert "base" in errors or "boiler_temp_sensor_top" in errors or "boiler_temp_sensor_bottom" in errors


def test_validate_boiler_topology_cross_box_sharing_rejected():
    from custom_components.oig_cloud.config.steps import WizardMixin

    user_input = {
        "boiler_temp_sensor_top": "sensor.oig_123_boiler_temp",
        "boiler_temp_sensor_bottom": "sensor.oig_456_boiler_temp",
        "boiler_stratification_mode": "two_zone",
    }
    errors = WizardMixin._validate_boiler_topology(user_input)
    # Cross-box sharing should be rejected
    assert "boiler_temp_sensor_bottom" in errors or "base" in errors


def test_validate_boiler_topology_invalid_stratification_rejected():
    from custom_components.oig_cloud.config.steps import WizardMixin

    user_input = {
        "boiler_temp_sensor_top": "sensor.temp_top",
        "boiler_temp_sensor_bottom": "",
        "boiler_stratification_mode": "invalid_mode",
    }
    errors = WizardMixin._validate_boiler_topology(user_input)
    assert "boiler_stratification_mode" in errors


# ---------------------------------------------------------------------------
# 4. Profiler bootstrap profile
# ---------------------------------------------------------------------------


def test_profiler_generate_bootstrap_profile_returns_degraded():
    from custom_components.oig_cloud.boiler.models import BoilerThermalTopology
    from custom_components.oig_cloud.boiler.profiler import BoilerProfiler

    profiler = BoilerProfiler(SimpleNamespace(), "sensor.energy")
    topo = BoilerThermalTopology(
        stratification_mode="two_zone",
        thermometer_placements=["top"],
        temperature_topology="top_only",
        tank_volume_l=120.0,
        target_temp_c=60.0,
        cold_inlet_temp_c=10.0,
        heater_power_kw=2.0,
        standing_loss_coefficient=0.02,
    )
    bootstrap = profiler.generate_bootstrap_profile(topo)
    assert bootstrap.degraded_reason == "bootstrap_profile"
    assert bootstrap.confidence < 1.0
    assert bootstrap.profile is not None


def test_profiler_bootstrap_profile_has_hourly_slots():
    from custom_components.oig_cloud.boiler.models import BoilerThermalTopology
    from custom_components.oig_cloud.boiler.profiler import BoilerProfiler

    profiler = BoilerProfiler(SimpleNamespace(), "sensor.energy")
    topo = BoilerThermalTopology(
        stratification_mode="two_zone",
        thermometer_placements=["top"],
        temperature_topology="top_only",
        tank_volume_l=120.0,
        target_temp_c=60.0,
        cold_inlet_temp_c=10.0,
        heater_power_kw=2.0,
        standing_loss_coefficient=0.02,
    )
    bootstrap = profiler.generate_bootstrap_profile(topo)
    assert len(bootstrap.profile.hourly_avg) == 24


# ---------------------------------------------------------------------------
# 5. Profiler history-driven draw-deadline prediction
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_profiler_predict_draw_deadline_insufficient_history():
    from custom_components.oig_cloud.boiler.profiler import BoilerProfiler

    hass = SimpleNamespace()
    profiler = BoilerProfiler(hass, "sensor.energy")

    async def mock_fetch(self, temp_sensor, heating_entity, start, end, timeout=2.0):
        return []

    profiler._fetch_temperature_history = mock_fetch.__get__(profiler, BoilerProfiler)

    deadline, reason = await profiler.predict_draw_deadline(
        temp_sensor_entity="sensor.temp",
        heating_entity="switch.heater",
        query_budget_seconds=2,
    )
    assert deadline is None
    assert reason == "bootstrap_profile"


@pytest.mark.asyncio
async def test_profiler_predict_draw_deadline_with_usable_history():
    from custom_components.oig_cloud.boiler.profiler import BoilerProfiler

    now = datetime(2025, 6, 15, 12, 0, tzinfo=timezone.utc)
    profiler = BoilerProfiler(SimpleNamespace(), "sensor.energy")

    # Mock _fetch_temperature_history to return sufficient data
    # Need ≥87 samples per day for 10 days to pass 7 usable-day threshold
    async def mock_fetch(self, temp_sensor, heating_entity, start, end, timeout=2.0):
        results = []
        for day in range(10):
            base = now - timedelta(days=day)
            # Generate 15-minute interval samples for the full day (96 samples)
            for minute in range(0, 1440, 15):
                h = minute // 60
                m = minute % 60
                ts = base.replace(hour=h, minute=m)
                # Draw event between 6:00-7:00
                if h == 6 and m == 0:
                    temp = 58.0
                elif h == 6 and m == 15:
                    temp = 56.0
                elif h == 6 and m == 30:
                    temp = 54.0
                elif h == 6 and m == 45:
                    temp = 53.0
                else:
                    temp = 55.0
                heating = "on" if (h >= 7 and h < 22) else "off"
                results.append(
                    {"timestamp": ts, "temp": temp, "heating": heating}
                )
        return results

    profiler._fetch_temperature_history = mock_fetch.__get__(profiler, BoilerProfiler)

    deadline, reason = await profiler.predict_draw_deadline(
        temp_sensor_entity="sensor.temp",
        heating_entity="switch.heater",
        query_budget_seconds=2,
    )
    # With usable history, should return a deadline and low-confidence reason
    assert deadline is not None
    assert reason == "history_profile_low_confidence"


def test_profiler_predict_draw_deadline_detects_draw_event():
    from custom_components.oig_cloud.boiler.profiler import BoilerProfiler

    profiler = BoilerProfiler(SimpleNamespace(), "sensor.energy")

    # Simulate history data with a clear draw event
    history = [
        {"timestamp": datetime(2025, 6, 15, 6, 0, tzinfo=timezone.utc), "temp": 58.0, "heating": "off"},
        {"timestamp": datetime(2025, 6, 15, 6, 30, tzinfo=timezone.utc), "temp": 54.0, "heating": "off"},
        {"timestamp": datetime(2025, 6, 15, 7, 0, tzinfo=timezone.utc), "temp": 53.0, "heating": "off"},
        {"timestamp": datetime(2025, 6, 15, 7, 30, tzinfo=timezone.utc), "temp": 55.0, "heating": "on"},
    ]

    draw_events = profiler._detect_draw_events(history)
    assert len(draw_events) >= 1
    # Draw event: >=3C drop within 60min while heating off
    assert draw_events[0]["drop_c"] >= 3.0


# ---------------------------------------------------------------------------
# 6. utils.py delegates to thermal.py
# ---------------------------------------------------------------------------


def test_utils_calculate_energy_to_heat_delegates():
    from custom_components.oig_cloud.boiler import utils

    result = utils.calculate_energy_to_heat(100.0, 20.0, 60.0)
    assert result > 0.0


def test_utils_calculate_stratified_temp_delegates():
    from custom_components.oig_cloud.boiler import utils

    upper, lower = utils.calculate_stratified_temp(50.0, "top", "simple_avg")
    assert upper == 50.0
    assert lower == 50.0


def test_utils_validate_temperature_sensor_delegates():
    from custom_components.oig_cloud.boiler import utils

    state = SimpleNamespace(state="25.5")
    assert utils.validate_temperature_sensor(state, "sensor.temp") == 25.5


def test_utils_estimate_residual_energy_delegates():
    from custom_components.oig_cloud.boiler import utils

    assert utils.estimate_residual_energy(10.0, 6.0, 3.0) == 1.0


# ---------------------------------------------------------------------------
# 7. Runtime/coordinator consumes topology contract
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_thermal_read_model_returns_topology_aware_temps():
    from custom_components.oig_cloud.boiler.runtime import _ThermalReadModel

    config = {
        "boiler_temp_sensor_top": "sensor.top",
        "boiler_temp_sensor_bottom": "sensor.bottom",
        "boiler_stratification_mode": "two_zone",
        "boiler_two_zone_split_ratio": 0.5,
        "boiler_volume_l": 120,
        "boiler_target_temp_c": 60.0,
    }

    class FakeStates:
        def __init__(self, mapping):
            self._mapping = mapping

        def get(self, entity_id):
            return self._mapping.get(entity_id)

    class FakeHass:
        def __init__(self):
            self.states = FakeStates({
                "sensor.top": SimpleNamespace(state="55.0"),
                "sensor.bottom": SimpleNamespace(state="45.0"),
            })

    hass = FakeHass()
    coordinator = SimpleNamespace(config=config, hass=hass)
    model = _ThermalReadModel(coordinator)
    temps = await model.read_temperatures()

    assert temps["top"] == 55.0
    assert temps["bottom"] == 45.0
    assert temps["upper_zone"] == 55.0
    assert temps["lower_zone"] == 45.0


@pytest.mark.asyncio
async def test_thermal_read_model_top_only_uses_stratification():
    from custom_components.oig_cloud.boiler.runtime import _ThermalReadModel

    config = {
        "boiler_temp_sensor_top": "sensor.top",
        "boiler_temp_sensor_bottom": "",
        "boiler_temp_sensor_position": "top",
        "boiler_stratification_mode": "two_zone",
        "boiler_two_zone_split_ratio": 0.5,
        "boiler_volume_l": 120,
        "boiler_target_temp_c": 60.0,
    }

    class FakeStates:
        def __init__(self, mapping):
            self._mapping = mapping

        def get(self, entity_id):
            return self._mapping.get(entity_id)

    class FakeHass:
        def __init__(self):
            self.states = FakeStates({"sensor.top": SimpleNamespace(state="55.0")})

    hass = FakeHass()
    coordinator = SimpleNamespace(config=config, hass=hass)
    model = _ThermalReadModel(coordinator)
    temps = await model.read_temperatures()

    assert temps["top"] == 55.0
    assert temps["bottom"] is None
    # With top-only + two_zone, upper_zone should be derived from stratification
    assert temps["upper_zone"] is not None
    assert temps["lower_zone"] is not None
    assert temps["upper_zone"] > temps["lower_zone"]


def test_energy_state_adapter_uses_thermal_module():
    from custom_components.oig_cloud.boiler.runtime import _ThermalReadModel

    config = {
        "boiler_volume_l": 120,
        "boiler_target_temp_c": 60.0,
    }
    coordinator = SimpleNamespace(config=config)
    model = _ThermalReadModel(coordinator)
    energy = model.calculate_energy_state(
        {"upper_zone": 55.0, "lower_zone": 45.0}
    )
    assert energy["avg_temp"] == 50.0
    assert energy["energy_needed_kwh"] > 0.0


# ---------------------------------------------------------------------------
# 8. Plan calculations change when topology changes
# ---------------------------------------------------------------------------


def test_topology_changes_affect_energy_calculation():
    """Topology (tank volume) must alter required kWh via thermal.py."""
    from custom_components.oig_cloud.boiler.models import BoilerThermalTopology
    from custom_components.oig_cloud.boiler.thermal import calculate_energy_to_heat

    topo_small = BoilerThermalTopology(
        stratification_mode="two_zone",
        thermometer_placements=["top"],
        temperature_topology="top_only",
        tank_volume_l=80.0,
        target_temp_c=60.0,
        cold_inlet_temp_c=10.0,
        heater_power_kw=2.0,
        standing_loss_coefficient=0.02,
    )
    topo_large = BoilerThermalTopology(
        stratification_mode="two_zone",
        thermometer_placements=["top"],
        temperature_topology="top_only",
        tank_volume_l=200.0,
        target_temp_c=60.0,
        cold_inlet_temp_c=10.0,
        heater_power_kw=2.0,
        standing_loss_coefficient=0.02,
    )

    energy_small = calculate_energy_to_heat(
        topo_small.tank_volume_l, 20.0, topo_small.target_temp_c
    )
    energy_large = calculate_energy_to_heat(
        topo_large.tank_volume_l, 20.0, topo_large.target_temp_c
    )

    assert energy_large > energy_small
    assert energy_large == pytest.approx(energy_small * 2.5, rel=1e-6)


def test_stratification_mode_changes_affect_predicted_temperature():
    """Changing stratification mode must change zone temps from same sensor reading."""
    from custom_components.oig_cloud.boiler.thermal import calculate_stratified_temp

    upper_two_zone, lower_two_zone = calculate_stratified_temp(
        measured_temp=50.0,
        sensor_position="top",
        mode="two_zone",
        split_ratio=0.5,
        boiler_height_m=1.0,
    )
    upper_simple, lower_simple = calculate_stratified_temp(
        measured_temp=50.0,
        sensor_position="top",
        mode="simple_avg",
        split_ratio=0.5,
        boiler_height_m=1.0,
    )

    # two_zone must produce different zone temps from the same reading
    assert upper_two_zone != upper_simple or lower_two_zone != lower_simple
    assert upper_simple == 50.0
    assert lower_simple == 50.0
    assert upper_two_zone > lower_two_zone


def test_profiler_count_usable_days_insufficient_samples():
    """A day with only 2-3 samples must NOT count as usable."""
    from custom_components.oig_cloud.boiler.profiler import BoilerProfiler

    profiler = BoilerProfiler(SimpleNamespace(), "sensor.energy")

    day = datetime(2025, 6, 15, tzinfo=timezone.utc)
    history = [
        {"timestamp": day.replace(hour=6, minute=0), "temp": 58.0, "heating": "off"},
        {"timestamp": day.replace(hour=6, minute=30), "temp": 54.0, "heating": "off"},
    ]
    assert profiler._count_usable_days(history) == 0


def test_profiler_count_usable_days_sufficient_samples():
    """A day with ≥90% of 96 samples (≥87) must count as usable."""
    from custom_components.oig_cloud.boiler.profiler import BoilerProfiler

    profiler = BoilerProfiler(SimpleNamespace(), "sensor.energy")

    day = datetime(2025, 6, 15, tzinfo=timezone.utc)
    history = []
    for minute in range(0, 1440, 15):
        h = minute // 60
        m = minute % 60
        history.append(
            {"timestamp": day.replace(hour=h, minute=m), "temp": 55.0, "heating": "off"}
        )
    # 96 samples = 100% coverage for 15-min interval
    assert len(history) == 96
    assert profiler._count_usable_days(history) == 1


def test_profiler_count_usable_days_partial_coverage_rejected():
    """A day with 50 samples (52% coverage) must NOT count as usable."""
    from custom_components.oig_cloud.boiler.profiler import BoilerProfiler

    profiler = BoilerProfiler(SimpleNamespace(), "sensor.energy")

    day = datetime(2025, 6, 15, tzinfo=timezone.utc)
    history = []
    for minute in range(0, 1440, 30):
        h = minute // 60
        m = minute % 60
        history.append(
            {"timestamp": day.replace(hour=h, minute=m), "temp": 55.0, "heating": "off"}
        )
    # 48 samples = 50% coverage, below 90% threshold
    assert len(history) == 48
    assert profiler._count_usable_days(history) == 0


@pytest.mark.asyncio
async def test_profiler_predict_draw_deadline_passes_query_budget():
    """query_budget_seconds must be passed as timeout to _fetch_temperature_history."""
    from custom_components.oig_cloud.boiler.profiler import BoilerProfiler

    profiler = BoilerProfiler(SimpleNamespace(), "sensor.energy")

    captured_timeout = None

    async def mock_fetch(self, temp_sensor, heating_entity, start, end, timeout=2.0):
        nonlocal captured_timeout
        captured_timeout = timeout
        return []

    profiler._fetch_temperature_history = mock_fetch.__get__(profiler, BoilerProfiler)

    await profiler.predict_draw_deadline(
        temp_sensor_entity="sensor.temp",
        heating_entity="switch.heater",
        query_budget_seconds=5.5,
    )

    assert captured_timeout == 5.5


# ---------------------------------------------------------------------------
# 9. Cross-box entity sharing rejection under same config entry
# ---------------------------------------------------------------------------


def test_validate_boiler_topology_cross_box_actuator_rejected():
    from custom_components.oig_cloud.config.steps import WizardMixin

    user_input = {
        "boiler_temp_sensor_top": "sensor.oig_123_boiler_temp",
        "boiler_heater_switch_entity": "switch.oig_456_boiler",
        "boiler_stratification_mode": "two_zone",
    }
    errors = WizardMixin._validate_boiler_topology(user_input)
    assert "boiler_heater_switch_entity" in errors or "base" in errors


def test_validate_boiler_topology_cross_box_alt_heater_rejected():
    from custom_components.oig_cloud.config.steps import WizardMixin

    user_input = {
        "boiler_temp_sensor_top": "sensor.oig_123_boiler_temp",
        "boiler_alt_heater_switch_entity": "switch.oig_456_alt",
        "boiler_stratification_mode": "two_zone",
    }
    errors = WizardMixin._validate_boiler_topology(user_input)
    assert "boiler_alt_heater_switch_entity" in errors or "base" in errors


def test_validate_boiler_topology_cross_box_circulation_rejected():
    from custom_components.oig_cloud.config.steps import WizardMixin

    user_input = {
        "boiler_temp_sensor_top": "sensor.oig_123_boiler_temp",
        "boiler_circulation_pump_switch_entity": "switch.oig_456_circ",
        "boiler_stratification_mode": "two_zone",
    }
    errors = WizardMixin._validate_boiler_topology(user_input)
    assert "boiler_circulation_pump_switch_entity" in errors or "base" in errors
