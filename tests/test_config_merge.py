"""K2f: ONE merge path for all option writes. Never full-replace."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

from custom_components.oig_cloud.config_merge import merge_entry_options


def _entry(options):
    return SimpleNamespace(entry_id="e1", options=options)


def _hass():
    hass = SimpleNamespace(config_entries=SimpleNamespace(async_update_entry=MagicMock()))
    return hass


def test_merge_preserves_foreign_keys():
    """REGRESSION for the full-replace bug: dashboard-only keys must survive."""
    hass = _hass()
    entry = _entry({
        "boiler_thermal_arbitrage_enabled": True,   # dashboard-only orphan
        "box_id": "2206237016",                     # migration-written orphan
        "charge_rate_kw": 2.8,
    })
    merge_entry_options(hass, entry, {"charge_rate_kw": 2.6})
    (_, ), kwargs = hass.config_entries.async_update_entry.call_args
    new = kwargs["options"]
    assert new["boiler_thermal_arbitrage_enabled"] is True
    assert new["box_id"] == "2206237016"
    assert new["charge_rate_kw"] == 2.6


def test_merge_applies_registry_mirrors():
    hass = _hass()
    entry = _entry({"home_charge_rate": 2.8, "charge_rate_kw": 2.8})
    merge_entry_options(hass, entry, {"charge_rate_kw": 3.0})
    new = hass.config_entries.async_update_entry.call_args.kwargs["options"]
    assert new["home_charge_rate"] == 3.0  # mirror kept in sync


def test_merge_reload_flag():
    hass = _hass()
    entry = _entry({})
    merge_entry_options(hass, entry, {"boiler_target_temp_c": 55.0})
    new = hass.config_entries.async_update_entry.call_args.kwargs["options"]
    assert new["_needs_reload"] is True  # boiler field => reload requested


def test_merge_reload_flag_only_on_actual_change():
    """Unchanged reload-marked value must not request reload."""
    hass = _hass()
    entry = _entry({"boiler_target_temp_c": 55.0})
    merge_entry_options(hass, entry, {"boiler_target_temp_c": 55.0})
    new = hass.config_entries.async_update_entry.call_args.kwargs["options"]
    assert "_needs_reload" not in new


def test_merge_reload_flag_set_when_changed():
    """Changed reload-marked value must request reload."""
    hass = _hass()
    entry = _entry({"boiler_target_temp_c": 55.0})
    merge_entry_options(hass, entry, {"boiler_target_temp_c": 60.0})
    new = hass.config_entries.async_update_entry.call_args.kwargs["options"]
    assert new["_needs_reload"] is True


def test_merge_suppress_reload_never_sets_flag():
    """suppress_reload=True must block _needs_reload even for changes."""
    hass = _hass()
    entry = _entry({"boiler_target_temp_c": 55.0})
    merge_entry_options(hass, entry, {"boiler_target_temp_c": 60.0}, suppress_reload=True)
    new = hass.config_entries.async_update_entry.call_args.kwargs["options"]
    assert "_needs_reload" not in new


def test_merge_no_updates_is_noop():
    hass = _hass()
    entry = _entry({"a": 1})
    merge_entry_options(hass, entry, {})
    hass.config_entries.async_update_entry.assert_not_called()
