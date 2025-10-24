"""Definice typů senzorů pro ČHMÚ meteorologická varování."""

from typing import Dict, Any
from homeassistant.components.sensor import SensorDeviceClass, SensorStateClass

# Typy senzorů pro ČHMÚ varování
SENSOR_TYPES_CHMU: Dict[str, Dict[str, Any]] = {
    "chmu_warning_level": {
        "name": "ČHMÚ Warning Level",
        "name_cs": "Úroveň varování ČHMÚ",
        "icon": "mdi:alert-octagon",
        "unit_of_measurement": None,
        "device_class": None,
        "state_class": SensorStateClass.MEASUREMENT,
        "category": "chmu_warnings",
        "sensor_type_category": "chmu_warnings",
        "device_mapping": "analytics",
        "description": "Úroveň meteorologického varování pro vaši lokalitu (0=žádné, 1=Minor/žluté, 2=Moderate/oranžové, 3=Severe/červené, 4=Extreme/fialové)",
        "enabled_by_default": False,
    },
}
