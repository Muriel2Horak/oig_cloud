from typing import Any, Dict

from homeassistant.const import EntityCategory

SENSOR_TYPES_AI_EVAL: Dict[str, Dict[str, Any]] = {
    "ai_eval": {
        "name": "AI eval",
        "name_cs": "AI vyhodnocení",
        "device_class": None,
        "unit_of_measurement": None,
        "node_id": "ai_eval",
        "node_key": "anomaly_count",
        "local_entity_suffix": "tbl_ai_eval",
        "state_class": None,
        "entity_category": EntityCategory.DIAGNOSTIC,
        "sensor_type_category": "data",
        "device_mapping": "main",
    },
}
