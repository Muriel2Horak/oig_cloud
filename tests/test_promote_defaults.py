# tests/test_promote_defaults.py
"""The one-shot promote for the three keys whose default Task 1 changed.

NOT a general migration (that is Plan 4's). Three keys, one shot, "" -> default.
"""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from custom_components.oig_cloud.config.promote_defaults import (
    PROMOTED_DEFAULTS,
    promote_blank_enum_defaults,
)


def _entry(options):
    return SimpleNamespace(entry_id="e1", options=dict(options))


def _hass():
    return SimpleNamespace(
        config_entries=SimpleNamespace(async_update_entry=MagicMock()))


def test_promotes_exactly_the_three_keys_task_1_re_defaulted():
    """A fourth key here means someone widened this into Plan 4's migration."""
    assert PROMOTED_DEFAULTS == {
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_mode": "daily_optimized",
        "boiler_alt_source_type": "gas",
    }


@pytest.mark.parametrize("key,expected", [
    ("solar_forecast_provider", "forecast_solar"),
    ("solar_forecast_mode", "daily_optimized"),
    ("boiler_alt_source_type", "gas"),
])
def test_blank_is_promoted_to_the_new_default(key, expected):
    entry = _entry({key: ""})
    hass = _hass()
    assert promote_blank_enum_defaults(hass, entry) is True
    hass.config_entries.async_update_entry.assert_called_once()
    _, kw = hass.config_entries.async_update_entry.call_args
    assert kw["options"][key] == expected


def test_a_real_user_value_is_never_overwritten():
    """The user chose Solcast. One shot must not un-choose it."""
    entry = _entry({"solar_forecast_provider": "solcast",
                    "solcast_api_key": "k", "solcast_site_id": "s"})
    hass = _hass()
    assert promote_blank_enum_defaults(hass, entry) is False
    hass.config_entries.async_update_entry.assert_not_called()


def test_an_absent_key_is_left_absent_not_materialised():
    """Absent already resolves to the new default via GET's field.default
    fallback (ha_rest_api.py:1220) — writing it would be gratuitous churn."""
    entry = _entry({"charge_rate_kw": 2.8})
    hass = _hass()
    assert promote_blank_enum_defaults(hass, entry) is False
    hass.config_entries.async_update_entry.assert_not_called()


def test_promote_is_idempotent_a_second_run_writes_nothing():
    """'One shot' must hold even though this runs on every setup."""
    entry = _entry({"solar_forecast_provider": ""})
    hass = _hass()
    assert promote_blank_enum_defaults(hass, entry) is True
    entry.options = hass.config_entries.async_update_entry.call_args[1]["options"]
    hass.config_entries.async_update_entry.reset_mock()
    assert promote_blank_enum_defaults(hass, entry) is False
    hass.config_entries.async_update_entry.assert_not_called()


def test_untouched_keys_survive_the_promote():
    entry = _entry({"solar_forecast_provider": "", "charge_rate_kw": 2.8,
                    "solcast_site_id": "keep-me"})
    hass = _hass()
    promote_blank_enum_defaults(hass, entry)
    opts = hass.config_entries.async_update_entry.call_args[1]["options"]
    assert opts["charge_rate_kw"] == 2.8
    assert opts["solcast_site_id"] == "keep-me"


def test_every_promoted_value_is_legal_for_its_own_field():
    """Ties the promote to the registry — if Task 1's default moves, this fails."""
    from custom_components.oig_cloud.config_registry import FIELD_REGISTRY, coerce_value
    for key, value in PROMOTED_DEFAULTS.items():
        f = FIELD_REGISTRY[key]
        assert coerce_value(f, value) == value
        assert value == f.default, f"{key}: promote disagrees with the registry default"
