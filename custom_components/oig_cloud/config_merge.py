# custom_components/oig_cloud/config_merge.py
"""The ONLY sanctioned way to write config-entry options (F1 K2f).

Merges updates into the existing options dict — NEVER replaces it — so values
written by other surfaces (dashboard REST, migrations, runtime flags) survive
every save. Applies registry mirrors and per-field reload flags.
"""
from __future__ import annotations

import logging
from typing import Any, Dict

from .config_registry import FIELD_REGISTRY

_LOGGER = logging.getLogger(__name__)


def merge_entry_options(
    hass: Any, entry: Any, updates: Dict[str, Any], suppress_reload: bool = False
) -> bool:
    """Merge `updates` into entry.options. Returns True if a write happened."""
    if not updates:
        return False
    current_options: Dict[str, Any] = dict(entry.options)
    new_options: Dict[str, Any] = dict(current_options)
    new_options.update(updates)
    needs_reload = False
    reload_reason_keys: list[str] = []
    for key, value in updates.items():
        field = FIELD_REGISTRY.get(key)
        if field is None:
            continue
        if field.mirror:
            new_options[field.mirror] = value
        if not suppress_reload and field.reload_on_change:
            if value != current_options.get(key):
                needs_reload = True
                reload_reason_keys.append(key)
    if needs_reload:
        new_options["_needs_reload"] = True
        new_options["_reload_reason"] = ",".join(reload_reason_keys)
    hass.config_entries.async_update_entry(entry, options=new_options)
    _LOGGER.debug("merge_entry_options: merged %s keys", len(updates))
    return True
