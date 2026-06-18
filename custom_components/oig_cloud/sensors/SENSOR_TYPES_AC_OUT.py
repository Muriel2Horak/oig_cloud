from typing import Any, Dict

from homeassistant.components.sensor import SensorDeviceClass, SensorStateClass
from homeassistant.const import UnitOfEnergy, UnitOfPower

SENSOR_TYPES_AC_OUT: Dict[str, Dict[str, Any]] = {  # Oprava: Any místo union type
    "ac_out_aco_p": {
        "name": "Load Total",
        "name_cs": "Zátěž celkem",
        "device_class": SensorDeviceClass.POWER,
        "unit_of_measurement": UnitOfPower.WATT,  # Konstanta místo stringu
        "node_id": "ac_out",
        "node_key": "aco_p",
        "local_entity_suffix": "tbl_ac_out_aco_p",
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "data",
        "device_mapping": "main",
    },
    "ac_out_aco_pr": {
        "name": "Load Line 1",
        "name_cs": "Zátěž fáze 1",
        "device_class": SensorDeviceClass.POWER,
        "unit_of_measurement": UnitOfPower.WATT,  # Konstanta místo stringu
        "node_id": "ac_out",
        "node_key": "aco_pr",
        "local_entity_suffix": "tbl_ac_out_aco_pr",
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "data",
        "device_mapping": "main",
    },
    "ac_out_aco_ps": {
        "name": "Load Line 2",
        "name_cs": "Zátěž fáze 2",
        "device_class": SensorDeviceClass.POWER,
        "unit_of_measurement": UnitOfPower.WATT,  # Konstanta místo stringu
        "node_id": "ac_out",
        "node_key": "aco_ps",
        "local_entity_suffix": "tbl_ac_out_aco_ps",
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "data",
        "device_mapping": "main",
    },
    "ac_out_aco_pt": {
        "name": "Load Line 3",
        "name_cs": "Zátěž fáze 3",
        "device_class": SensorDeviceClass.POWER,
        "unit_of_measurement": UnitOfPower.WATT,  # Konstanta místo stringu
        "node_id": "ac_out",
        "node_key": "aco_pt",
        "local_entity_suffix": "tbl_ac_out_aco_pt",
        "state_class": SensorStateClass.MEASUREMENT,
        "sensor_type_category": "data",
        "device_mapping": "main",
    },
    "ac_out_en_day": {
        "name": "Consumption Today",
        "name_cs": "Dnešní spotřeba",
        "device_class": SensorDeviceClass.ENERGY,
        "unit_of_measurement": UnitOfEnergy.WATT_HOUR,
        "node_id": "ac_out",
        "node_key": "en_day",
        "local_entity_suffix": "tbl_ac_out_en_day",
        "state_class": SensorStateClass.TOTAL_INCREASING,
        "sensor_type_category": "data",
        "device_mapping": "main",
    },
    # --- Non-backup (nezáloha) consumption energy, integrated from
    #     actual_acinb_wtotal power (see entities/computed_sensor.py).
    #     Counterpart to ac_out_en_* (záloha) → full consumption split. ---
    "computed_nonbackup_consumption_today": {
        "name": "Non-backup Consumption Today",
        "name_cs": "Nezáloha - spotřeba dnes",
        "device_class": SensorDeviceClass.ENERGY,
        "unit_of_measurement": UnitOfEnergy.WATT_HOUR,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "computed",
        "device_mapping": "main",
    },
    "computed_nonbackup_consumption_month": {
        "name": "Non-backup Consumption Month",
        "name_cs": "Nezáloha - spotřeba měsíc",
        "device_class": SensorDeviceClass.ENERGY,
        "unit_of_measurement": UnitOfEnergy.WATT_HOUR,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "computed",
        "device_mapping": "main",
    },
    "computed_nonbackup_consumption_year": {
        "name": "Non-backup Consumption Year",
        "name_cs": "Nezáloha - spotřeba rok",
        "device_class": SensorDeviceClass.ENERGY,
        "unit_of_measurement": UnitOfEnergy.WATT_HOUR,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "computed",
        "device_mapping": "main",
    },
}
