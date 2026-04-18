_PARAM_TYPE_MAP = {
    "p_max_feed_grid": "limit",
    "prms_to_grid": "mode",
    "box_prms_mode": "mode",
    "box_prm2_app": "app",
    "boiler_manual_mode": "mode",
    "formating_mode": "level",
}


def _extract_param_type(entity_id: str) -> str:
    for key, param_type in _PARAM_TYPE_MAP.items():
        if key in entity_id:
            return param_type
    return "value"
