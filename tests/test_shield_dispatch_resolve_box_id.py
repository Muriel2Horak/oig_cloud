from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

from custom_components.oig_cloud.shield import dispatch as dispatch_module


class _StubShield:
    def __init__(self, data):
        self.hass = SimpleNamespace(data=data)


def test_resolve_box_id_skips_non_dict_globals():
    """Regression: hass.data['oig_cloud'] holds per-entry dicts AND the global
    'shield' key pointing at a ServiceShield instance. Iterating values must
    skip the non-dict ServiceShield, otherwise .get() raises AttributeError.
    """
    shield = _StubShield(data={})
    coordinator = object()
    shield.hass.data["oig_cloud"] = {
        "shield": shield,
        "entry_abc": {"service_shield": shield, "coordinator": coordinator},
    }

    with patch(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        return_value="2206237016",
    ):
        result = dispatch_module._resolve_box_id_for_power_monitor(shield)

    assert result == "2206237016"


def test_resolve_box_id_returns_none_when_no_oig_data():
    shield = _StubShield(data={})
    assert dispatch_module._resolve_box_id_for_power_monitor(shield) is None


def test_resolve_box_id_returns_none_when_shield_not_matched():
    shield = _StubShield(data={})
    other_shield = object()
    shield.hass.data["oig_cloud"] = {
        "shield": shield,
        "entry_abc": {"service_shield": other_shield, "coordinator": object()},
    }
    assert dispatch_module._resolve_box_id_for_power_monitor(shield) is None
