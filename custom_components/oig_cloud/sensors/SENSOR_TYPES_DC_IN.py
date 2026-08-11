from typing import Any, Dict

from homeassistant.components.sensor import SensorDeviceClass, SensorStateClass
from homeassistant.const import PERCENTAGE, UnitOfEnergy, UnitOfPower

SENSOR_TYPES_DC_IN: Dict[str, Dict[str, Any]] = {
    "dc_in_fv_ad": {
        "name": "PV Output Today",
        "name_cs": "Dnešní výroba",
        "device_class": SensorDeviceClass.ENERGY,
        "unit_of_measurement": UnitOfEnergy.WATT_HOUR,
        "node_id": "dc_in",
        "node_key": "fv_ad",
        # Daily accumulator (dc_in.fv_ad = "FVE aktual denni"): resets to 0 at
        # LOCAL midnight and may be re-aggregated downward a few Wh during the
        # day. TOTAL (not TOTAL_INCREASING) so the small intraday dip is not
        # mistaken for a meter reset -- but TOTAL alone is not enough: the
        # recorder gates its reset branch on `last_reset is not None`, so
        # without the marker below the midnight drop to 0 is booked as a
        # negative delta and the completed day is subtracted from the sum.
        # `daily_cycle_reset` makes OigCloudDataSensor publish `last_reset` at
        # local midnight. The two belong together; see
        # tests/test_dc_in_fv_ad_daily_cycle.py.
        "state_class": SensorStateClass.TOTAL,
        "daily_cycle_reset": True,
        "sensor_type_category": "data",
        "device_mapping": "main",
        "local_entity_suffix": "tbl_dc_in_fv_ad",
    },
    "dc_in_fv_p1": {
        "name": "Panels Output String 1",
        "name_cs": "Výkon panelů string 1",
        "device_class": SensorDeviceClass.POWER,
        "unit_of_measurement": UnitOfPower.WATT,
        "node_id": "dc_in",
        "node_key": "fv_p1",
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "data",
        "device_mapping": "main",
        "local_entity_suffix": "tbl_dc_in_fv_p1",
    },
    "dc_in_fv_p2": {
        "name": "Panels Output String 2",
        "name_cs": "Výkon panelů string 2",
        "device_class": SensorDeviceClass.POWER,
        "unit_of_measurement": UnitOfPower.WATT,
        "node_id": "dc_in",
        "node_key": "fv_p2",
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "data",
        "device_mapping": "main",
        "local_entity_suffix": "tbl_dc_in_fv_p2",
    },
    "dc_in_fv_proc": {
        "name": "Panels Output Percent",
        "name_cs": "Výkon panelů (procenta)",
        "device_class": SensorDeviceClass.POWER_FACTOR,
        "unit_of_measurement": PERCENTAGE,
        "node_id": "dc_in",
        "node_key": "fv_proc",
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "data",
        "device_mapping": "main",
        "local_entity_suffix": "tbl_dc_in_fv_proc",
    },
    "dc_in_fv_total": {
        "name": "Panels Output Total",
        "name_cs": "Výkon panelů celkem",
        "device_class": SensorDeviceClass.POWER,
        "unit_of_measurement": UnitOfPower.WATT,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "computed",
        "device_mapping": "main",
    },
}
