"""One-shot promote of the three blank enum defaults F1 Plan 3 Task 1 changed.

Task 1 re-defaulted solar_forecast_provider, solar_forecast_mode and
boiler_alt_source_type away from "" (which their own coerce_value rejects,
config_registry.py:74-75). A stored "" survives that change — GET returns
opts.get(key, field.default) (ha_rest_api.py:1220), so the stored blank wins
and the next POST 400s. This promotes exactly those three.

DELIBERATELY NOT a general migration: Plan 4 owns dead keys, _MODULE_CONFIG_FIELDS
removal and the bundled dataset. Three keys. One shot. Nothing else.
"""
from __future__ import annotations

import logging
from typing import Any, Dict

_LOGGER = logging.getLogger(__name__)

# key -> the default Task 1 gave it in config_registry.py. Keep in sync with the
# registry; tests/test_promote_defaults.py pins them to each other.
PROMOTED_DEFAULTS: Dict[str, str] = {
    "solar_forecast_provider": "forecast_solar",
    "solar_forecast_mode": "daily_optimized",
    "boiler_alt_source_type": "gas",
}


def promote_blank_enum_defaults(hass: Any, entry: Any) -> bool:
    """Replace a STORED "" with the field's new default. Returns True if written.

    Only "" is touched: an absent key already resolves to the new default, and a
    real user value is never overwritten. Idempotent — after one run there is no
    "" left, so a second run writes nothing.
    """
    options = dict(entry.options)
    promoted = {k: v for k, v in PROMOTED_DEFAULTS.items() if options.get(k) == ""}
    if not promoted:
        return False

    options.update(promoted)
    hass.config_entries.async_update_entry(entry, options=options)
    _LOGGER.info(
        "Promoted blank config defaults for %s: %s", entry.entry_id, promoted,
    )
    return True
