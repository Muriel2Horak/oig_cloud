from homeassistant.components.sensor import SensorDeviceClass, SensorStateClass


from typing import Dict


SENSOR_TYPES_AC_IN: Dict[str, Dict[str, str | SensorDeviceClass | SensorStateClass]] = {
    "ac_in_ac_ad": {
        "name": "Grid Consumption Today",
        "name_cs": "Dnešní odběr ze sítě",
        "device_class": SensorDeviceClass.ENERGY,
        "unit_of_measurement": "Wh",
        "node_id": "ac_in",
        "node_key": "ac_ad",
        "state_class": SensorStateClass.TOTAL_INCREASING,
    },
    "ac_in_ac_pd": {
        "name": "Grid Delivery Today",
        "name_cs": "Dnešní dodávka do sítě",
        "device_class": SensorDeviceClass.ENERGY,
        "unit_of_measurement": "Wh",
        "node_id": "ac_in",
        "node_key": "ac_pd",
        "state_class": SensorStateClass.TOTAL_INCREASING,
    },
    "ac_in_aci_f": {
        "name": "Frequency",
        "name_cs": "Frekvence sítě",
        "device_class": SensorDeviceClass.FREQUENCY,
        "unit_of_measurement": "Hz",
        "node_id": "ac_in",
        "node_key": "aci_f",
        "state_class": SensorStateClass.MEASUREMENT,
    },
    "ac_in_aci_vr": {
        "name": "Grid Voltage Line 1",
        "name_cs": "Síť - Napětí fáze 1",
        "device_class": SensorDeviceClass.VOLTAGE,
        "unit_of_measurement": "V",
        "node_id": "ac_in",
        "node_key": "aci_vr",
        "state_class": SensorStateClass.MEASUREMENT,
    },
    "ac_in_aci_vs": {
        "name": "Grid Voltage Line 2",
        "name_cs": "Síť - Napětí fáze 2",
        "device_class": SensorDeviceClass.VOLTAGE,
        "unit_of_measurement": "V",
        "node_id": "ac_in",
        "node_key": "aci_vs",
        "state_class": SensorStateClass.MEASUREMENT,
    },
    "ac_in_aci_vt": {
        "name": "Grid Voltage Line 3",
        "name_cs": "Síť - Napětí fáze 3",
        "device_class": SensorDeviceClass.VOLTAGE,
        "unit_of_measurement": "V",
        "node_id": "ac_in",
        "node_key": "aci_vt",
        "state_class": SensorStateClass.MEASUREMENT,
    },
    "ac_in_aci_wr": {
        "name": "Grid Load Line 1",
        "name_cs": "Síť - zátěž fáze 1",
        "device_class": SensorDeviceClass.POWER,
        "unit_of_measurement": "W",
        "node_id": "ac_in",
        "node_key": "aci_wr",
        "state_class": SensorStateClass.MEASUREMENT,
    },
    "ac_in_aci_ws": {
        "name": "Grid Load Line 2",
        "name_cs": "Síť - zátěž fáze 2",
        "device_class": SensorDeviceClass.POWER,
        "unit_of_measurement": "W",
        "node_id": "ac_in",
        "node_key": "aci_ws",
        "state_class": SensorStateClass.MEASUREMENT,
    },
    "ac_in_aci_wt": {
        "name": "Grid Load Line 3",
        "name_cs": "Síť - zátěž fáze 3",
        "device_class": SensorDeviceClass.POWER,
        "unit_of_measurement": "W",
        "node_id": "ac_in",
        "node_key": "aci_wt",
        "state_class": SensorStateClass.MEASUREMENT,
    },
    "ac_in_aci_wtotal": {
        "name": "Grid Load Total",
        "name_cs": "Síť - Zátěž celkem",
        "device_class": SensorDeviceClass.POWER,
        "unit_of_measurement": "W",
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.MEASUREMENT,
    }
}