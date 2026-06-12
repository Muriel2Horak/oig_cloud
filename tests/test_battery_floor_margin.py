"""Planning floor must sit above the BOX bat_min trigger (forced-balancing guard).

User-observed box behavior: battery dwelling at the bat_min trigger (20 %) for
~1 h makes the BOX force-balance from grid, uncontrolled. Prevention is by
construction: the planning floor = trigger + safety margin, enforced by the
existing proactive floor defense — no box emulation, no post-hoc plan patching.
"""

from types import SimpleNamespace

from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
    BOX_FLOOR_SAFETY_MARGIN_PCT,
    _derive_planning_min_percent,
    _resolve_proxy_bat_min_pct,
)


def test_margin_above_proxy_trigger():
    # user's install: proxy bat_min 20 % → plan floor 22 %
    assert _derive_planning_min_percent(20.0, 20.0) == 22.0


def test_margin_above_hw_floor_when_proxy_absent():
    # cloud-only: trigger unknown → assume it equals the hw floor
    assert _derive_planning_min_percent(20.0, None) == 20.0 + BOX_FLOOR_SAFETY_MARGIN_PCT


def test_low_proxy_trigger_never_lowers_hw_floor():
    # box trigger below hw floor (e.g. bat_gl_min-like 15 %): hw floor wins,
    # no margin needed — dwelling at 20 % does not trigger a 15 % box rule
    assert _derive_planning_min_percent(20.0, 15.0) == 20.0


def test_high_proxy_trigger_raises_floor():
    assert _derive_planning_min_percent(20.0, 25.0) == 27.0


class _State:
    def __init__(self, state):
        self.state = state


class _States(dict):
    def get(self, key, default=None):  # hass.states.get
        return dict.get(self, key, default)


def _sensor(box_id="123", state_val="20"):
    hass = SimpleNamespace(
        states=_States({f"sensor.oig_local_{box_id}_tbl_batt_prms_bat_min": _State(state_val)})
    )
    return SimpleNamespace(_box_id=box_id, hass=hass)


def test_proxy_read_ok():
    assert _resolve_proxy_bat_min_pct(_sensor(state_val="20")) == 20.0


def test_proxy_read_unavailable():
    assert _resolve_proxy_bat_min_pct(_sensor(state_val="unavailable")) is None


def test_proxy_read_absent_entity():
    s = SimpleNamespace(_box_id="999", hass=SimpleNamespace(states=_States()))
    assert _resolve_proxy_bat_min_pct(s) is None


def test_proxy_read_out_of_range():
    assert _resolve_proxy_bat_min_pct(_sensor(state_val="0")) is None
    assert _resolve_proxy_bat_min_pct(_sensor(state_val="150")) is None
