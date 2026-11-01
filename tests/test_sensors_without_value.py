"""Sensors that stayed unknown although their data existed, or could never have any."""

from __future__ import annotations

from types import SimpleNamespace

from custom_components.oig_cloud.entities.data_sensor import OigCloudDataSensor
from custom_components.oig_cloud.sensors.SENSOR_TYPES_SPOT import SENSOR_TYPES_SPOT


def _sensor(ac_in):
    sensor = SimpleNamespace(
        _box_id="123",
        coordinator=SimpleNamespace(data={"123": {"ac_in": ac_in}}),
    )
    return sensor


LIVE = {"aci_vr": 240.1, "aci_vs": 240.8, "aci_vt": 240.8, "aci_wr": 100, "aci_ws": 20, "aci_wt": 5}


def test_grid_voltage_is_the_mean_of_the_phases():
    value = OigCloudDataSensor._live_grid_value(_sensor(LIVE), "extended_grid_voltage")

    assert value == 240.6


def test_grid_power_is_the_sum_of_the_phases():
    assert OigCloudDataSensor._live_grid_value(_sensor(LIVE), "extended_grid_power") == 125


def test_missing_phase_leaves_the_value_unknown():
    partial = {"aci_vr": 240.1, "aci_vs": 240.8}

    assert OigCloudDataSensor._live_grid_value(_sensor(partial), "extended_grid_voltage") is None


def test_other_grid_sensors_keep_their_own_source():
    assert OigCloudDataSensor._live_grid_value(_sensor(LIVE), "extended_grid_delivery") is None


def test_no_price_sensor_without_an_implementation():
    assert "adjusted_spot_electricity_prices" not in SENSOR_TYPES_SPOT
