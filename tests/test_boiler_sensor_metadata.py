"""Regression tests for Home Assistant boiler sensor metadata."""

from homeassistant.components.sensor import SensorDeviceClass, SensorStateClass
from homeassistant.const import UnitOfEnergy

from custom_components.oig_cloud.sensors.SENSOR_TYPES_BOILER import SENSOR_TYPES_BOILER


def test_boiler_day_counter_is_energy_not_power() -> None:
    """The Wh day counter must remain valid as a utility-meter source."""
    metadata = SENSOR_TYPES_BOILER["boiler_day_w"]

    assert metadata["device_class"] is SensorDeviceClass.ENERGY
    assert metadata["unit_of_measurement"] is UnitOfEnergy.WATT_HOUR
    assert metadata["state_class"] is SensorStateClass.TOTAL_INCREASING
