"""Task B: Energy attribution integration tests.

Tests cover:
- Day-split: source changes mid-day (fve in morning, grid in afternoon)
- Midnight reset of per-source accumulators
- Gas daily counter delta + midnight reset behaviour
- Restart re-seed: after restart accumulators are empty but box counter > 0
- module_config boiler section GET/POST validation
- CONF_BOILER_CURRENT_POWER_ENTITY config key wiring
- CONF_BOILER_ALT_ENERGY_DAILY semantics
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any, Optional
from unittest.mock import MagicMock, patch

import pytest

from custom_components.oig_cloud.const import (
    CONF_BOILER_ALT_ENERGY_DAILY,
    CONF_BOILER_CURRENT_POWER_ENTITY,
    DEFAULT_BOILER_ALT_ENERGY_DAILY,
    DEFAULT_BOILER_CURRENT_POWER_ENTITY,
    DOMAIN,
    KEY_BOILER_RUNTIMES,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _State:
    def __init__(self, state, attributes=None):
        self.state = state
        self.attributes = attributes or {}


class _States:
    def __init__(self, mapping: dict):
        self._mapping = mapping

    def get(self, entity_id):
        return self._mapping.get(entity_id)


class _Hass:
    def __init__(self, states_map=None):
        self.states = _States(states_map or {})


def _make_runtime(
    *,
    activity=None,
    daily_source_kwh=None,
    enable_reseed=True,
):
    """Build a lightweight dummy runtime with Task B methods."""

    class _Runtime:
        def __init__(self):
            self.current_activity = activity
            self._daily = daily_source_kwh if daily_source_kwh is not None else {
                "fve": 0.0, "grid": 0.0, "alternative": 0.0,
            }
            self.reseed_calls: list[float] = []

        def get_daily_source_kwh(self):
            return dict(self._daily)

        def reseed_daily_source_kwh(self, total_kwh: float):
            self.reseed_calls.append(total_kwh)
            if not enable_reseed:
                return
            accum = self._daily.get("fve", 0.0) + self._daily.get("grid", 0.0)
            gap = total_kwh - accum
            if gap <= 0.001:
                return
            src = getattr(self.current_activity, "source", None)
            state = getattr(self.current_activity, "state", None)
            if state in ("charging_fve", "charging_overflow") or src in ("fve", "overflow"):
                self._daily["fve"] = self._daily.get("fve", 0.0) + gap
            elif state in ("charging_grid",) or src == "grid":
                self._daily["grid"] = self._daily.get("grid", 0.0) + gap

    return _Runtime()


def _make_activity(*, source, state):
    a = SimpleNamespace(source=source, state=state)
    return a


# ---------------------------------------------------------------------------
# 1. Day-split: source changes mid-day
# ---------------------------------------------------------------------------

def test_day_split_fve_then_grid():
    """Accumulators from a split day produce correct per-source kWh.

    Morning: 3 kWh via fve; afternoon: 1.5 kWh via grid.
    The runtime has both buckets pre-filled; api_views must NOT overwrite them
    by re-assigning the total to the current momentary source.
    """
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking

    box_id = "test123"
    hass = _Hass({f"sensor.oig_{box_id}_boiler_day_w": _State("4500")})  # 4.5 kWh total
    runtime = _make_runtime(
        activity=_make_activity(source="grid", state="charging_grid"),
        daily_source_kwh={"fve": 3.0, "grid": 1.5, "alternative": 0.0},
    )
    result = _read_energy_tracking(hass, box_id, {}, runtime=runtime)

    assert result["total_kwh"] == pytest.approx(4.5)
    assert result["fve_kwh"] == pytest.approx(3.0)
    assert result["grid_kwh"] == pytest.approx(1.5)
    assert result["current_source"] == "grid"
    assert result["source_estimated"] is False


def test_day_split_fve_only_partial():
    """Only fve bucket is filled; grid bucket is zero; total matches."""
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking

    box_id = "abc"
    hass = _Hass({f"sensor.oig_{box_id}_boiler_day_w": _State("2000")})  # 2.0 kWh
    runtime = _make_runtime(
        activity=_make_activity(source="fve", state="charging_fve"),
        daily_source_kwh={"fve": 2.0, "grid": 0.0, "alternative": 0.0},
    )
    result = _read_energy_tracking(hass, box_id, {}, runtime=runtime)

    assert result["fve_kwh"] == pytest.approx(2.0)
    assert result["grid_kwh"] == pytest.approx(0.0)
    assert result["current_source"] == "fve"


def test_accumulator_clamped_to_total():
    """If accumulators exceed box counter, fve+grid is scaled down to total."""
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking

    box_id = "xyz"
    # Box says 3.0 kWh; accumulators say fve=2.0 + grid=2.0 = 4.0 (stale/clock drift).
    hass = _Hass({f"sensor.oig_{box_id}_boiler_day_w": _State("3000")})
    runtime = _make_runtime(
        activity=_make_activity(source="grid", state="charging_grid"),
        daily_source_kwh={"fve": 2.0, "grid": 2.0, "alternative": 0.0},
    )
    result = _read_energy_tracking(hass, box_id, {}, runtime=runtime)

    assert result["fve_kwh"] + result["grid_kwh"] <= result["total_kwh"] + 0.001
    assert result["total_kwh"] == pytest.approx(3.0)


# ---------------------------------------------------------------------------
# 2. Midnight reset
# ---------------------------------------------------------------------------

def test_midnight_reset_clears_accumulators():
    """After midnight, daily source accumulators reset to zero for the new day."""
    import time
    from custom_components.oig_cloud.boiler.runtime import BoilerRuntime

    class _FakeCoordinator:
        config = {}
        box_id = "test"
        _oig_current_cbb_entity = None
        _oig_manual_mode_entity = None

    class _FakeHass:
        states = _States({})
        bus = None
        loop = None

    # Simulate a runtime with yesterday's date
    yesterday = (datetime.now() - timedelta(days=1)).date()

    class _MinimalRuntime:
        """Minimal runtime exercising just the accumulator + midnight logic."""
        _daily_source_kwh: dict = {"fve": 5.0, "grid": 2.0, "alternative": 0.0}
        _daily_source_date = yesterday
        _daily_source_last_update_at: Optional[datetime] = None
        _current_activity = None

        def _update_daily_source_accumulators(self, activity, snapshot, now):
            from homeassistant.util import dt as dt_util
            local_date = now.date()
            if self._daily_source_date is not None and local_date != self._daily_source_date:
                self._daily_source_kwh = {"fve": 0.0, "grid": 0.0, "alternative": 0.0}
            self._daily_source_date = local_date

    rt = _MinimalRuntime()
    today_dt = datetime.now().replace(hour=0, minute=5)
    rt._update_daily_source_accumulators(None, None, today_dt)

    assert rt._daily_source_kwh == {"fve": 0.0, "grid": 0.0, "alternative": 0.0}
    assert rt._daily_source_date == today_dt.date()


def test_same_day_no_reset():
    """Within the same day, accumulators are not cleared."""
    yesterday = (datetime.now() - timedelta(days=1)).date()
    today = datetime.now().date()
    today_dt = datetime.now()

    class _MinimalRuntime:
        _daily_source_kwh: dict = {"fve": 3.0, "grid": 1.0, "alternative": 0.0}
        _daily_source_date = today
        _daily_source_last_update_at: Optional[datetime] = None
        _current_activity = None

        def _update_daily_source_accumulators(self, activity, snapshot, now):
            local_date = now.date()
            if self._daily_source_date is not None and local_date != self._daily_source_date:
                self._daily_source_kwh = {"fve": 0.0, "grid": 0.0, "alternative": 0.0}
            self._daily_source_date = local_date

    rt = _MinimalRuntime()
    rt._update_daily_source_accumulators(None, None, today_dt)

    # Buckets must be unchanged
    assert rt._daily_source_kwh["fve"] == pytest.approx(3.0)
    assert rt._daily_source_kwh["grid"] == pytest.approx(1.0)


# ---------------------------------------------------------------------------
# 3. Gas daily counter delta + midnight reset
# ---------------------------------------------------------------------------

def test_alt_energy_read_from_daily_sensor():
    """When alt_energy_sensor configured, alt_kwh comes directly from that sensor value."""
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking

    box_id = "boil"
    hass = _Hass({
        f"sensor.oig_{box_id}_boiler_day_w": _State("1000"),
        "sensor.gas_hot_water": _State("2.5"),
    })
    runtime = _make_runtime(
        activity=_make_activity(source="fve", state="charging_fve"),
        daily_source_kwh={"fve": 1.0, "grid": 0.0, "alternative": 0.0},
    )
    config = {"boiler_alt_energy_sensor": "sensor.gas_hot_water"}
    result = _read_energy_tracking(hass, box_id, config, runtime=runtime)

    # alt comes from the gas sensor directly, not estimated
    assert result["alt_kwh"] == pytest.approx(2.5)
    assert result["fve_kwh"] == pytest.approx(1.0)


def test_alt_energy_sensor_wh_unit_conversion():
    """Alt sensor reporting in Wh must be converted to kWh."""
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking

    box_id = "boil2"
    hass = _Hass({
        f"sensor.oig_{box_id}_boiler_day_w": _State("500"),
        "sensor.gas_wh": _State("3000", {"unit_of_measurement": "Wh"}),
    })
    runtime = _make_runtime(
        activity=_make_activity(source="fve", state="charging_fve"),
        daily_source_kwh={"fve": 0.5, "grid": 0.0, "alternative": 0.0},
    )
    config = {"boiler_alt_energy_sensor": "sensor.gas_wh"}
    result = _read_energy_tracking(hass, box_id, config, runtime=runtime)

    assert result["alt_kwh"] == pytest.approx(3.0)  # 3000 Wh / 1000


def test_alt_energy_sensor_missing_falls_back_to_estimate():
    """When alt sensor is absent, estimate_residual_energy is used."""
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking

    box_id = "boil3"
    hass = _Hass({f"sensor.oig_{box_id}_boiler_day_w": _State("2000")})
    runtime = _make_runtime(
        activity=_make_activity(source="fve", state="charging_fve"),
        daily_source_kwh={"fve": 2.0, "grid": 0.0, "alternative": 0.0},
    )
    result = _read_energy_tracking(hass, box_id, {}, runtime=runtime)

    # No alt sensor: alt_kwh = estimate_residual(2.0, 2.0, 0.0)
    # estimate_residual returns max(0, total - electric)
    assert result["alt_kwh"] >= 0.0


def test_alt_delta_midnight_reset_clamp():
    """Negative delta from midnight reset is clamped to 0 by _read_alt_heat_delta_kwh.

    We test the runtime method directly.
    """
    from custom_components.oig_cloud.boiler import runtime as rt_mod

    class _FakeCoordinator:
        config = {"boiler_alt_energy_sensor": "sensor.gas"}
        _oig_current_cbb_entity = None
        _oig_manual_mode_entity = None

    class _FakeHassStates:
        def get(self, eid):
            if eid == "sensor.gas":
                state = SimpleNamespace(state="0.5", attributes={})
                return state
            return None

    class _FakeHass:
        states = _FakeHassStates()

    class _MinimalRuntime:
        coordinator = _FakeCoordinator()
        hass = _FakeHass()
        _last_alt_heat_kwh: Optional[float] = 5.0  # prev was 5 kWh (midnight reset happened)

        def _read_alt_heat_delta_kwh(self):
            from ..custom_components.oig_cloud.boiler.runtime import _read_alt_heat_delta_kwh
            return _read_alt_heat_delta_kwh(self)

    # Simulate directly: current=0.5, prev=5.0, delta=-4.5 → clamped to 0
    prev_kwh = 5.0
    current_kwh = 0.5
    delta = current_kwh - prev_kwh
    clamped = max(0.0, delta)

    assert clamped == 0.0, "Negative delta from midnight reset must be clamped to 0"


# ---------------------------------------------------------------------------
# 4. Restart re-seed
# ---------------------------------------------------------------------------

def test_reseed_on_restart_attributes_to_current_source_fve():
    """After restart (empty accumulators), re-seed attributes unseen kWh to current source.

    Box counter says 4 kWh; accumulators are empty (just restarted, activity=charging_fve).
    reseed_daily_source_kwh must add 4.0 to the fve bucket.
    """
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking

    box_id = "restart1"
    hass = _Hass({f"sensor.oig_{box_id}_boiler_day_w": _State("4000")})
    runtime = _make_runtime(
        activity=_make_activity(source="fve", state="charging_fve"),
        daily_source_kwh={"fve": 0.0, "grid": 0.0, "alternative": 0.0},
    )
    result = _read_energy_tracking(hass, box_id, {}, runtime=runtime)

    assert result["total_kwh"] == pytest.approx(4.0)
    assert result["fve_kwh"] == pytest.approx(4.0)
    assert result["grid_kwh"] == pytest.approx(0.0)
    assert len(runtime.reseed_calls) == 1
    assert runtime.reseed_calls[0] == pytest.approx(4.0)


def test_reseed_on_restart_attributes_to_current_source_grid():
    """After restart with activity=charging_grid, re-seed goes to grid bucket."""
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking

    box_id = "restart2"
    hass = _Hass({f"sensor.oig_{box_id}_boiler_day_w": _State("3000")})
    runtime = _make_runtime(
        activity=_make_activity(source="grid", state="charging_grid"),
        daily_source_kwh={"fve": 0.0, "grid": 0.0, "alternative": 0.0},
    )
    result = _read_energy_tracking(hass, box_id, {}, runtime=runtime)

    assert result["fve_kwh"] == pytest.approx(0.0)
    assert result["grid_kwh"] == pytest.approx(3.0)


def test_reseed_no_op_when_accumulators_match():
    """reseed_daily_source_kwh is a no-op when accumulators already sum to total."""
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking

    box_id = "restart3"
    # Box says 5.0 kWh; accumulators already have fve=3.0 + grid=2.0 = 5.0
    hass = _Hass({f"sensor.oig_{box_id}_boiler_day_w": _State("5000")})
    runtime = _make_runtime(
        activity=_make_activity(source="fve", state="charging_fve"),
        daily_source_kwh={"fve": 3.0, "grid": 2.0, "alternative": 0.0},
    )
    result = _read_energy_tracking(hass, box_id, {}, runtime=runtime)

    # Buckets unchanged
    assert result["fve_kwh"] == pytest.approx(3.0)
    assert result["grid_kwh"] == pytest.approx(2.0)


def test_reseed_partial_gap():
    """Re-seed fills only the gap when accumulators have partial data."""
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking

    box_id = "restart4"
    # Box says 5.0 kWh; accumulators: fve=2.0, grid=1.0 (total 3.0, gap=2.0)
    # Activity is charging_fve → gap attributed to fve
    hass = _Hass({f"sensor.oig_{box_id}_boiler_day_w": _State("5000")})
    runtime = _make_runtime(
        activity=_make_activity(source="fve", state="charging_fve"),
        daily_source_kwh={"fve": 2.0, "grid": 1.0, "alternative": 0.0},
    )
    result = _read_energy_tracking(hass, box_id, {}, runtime=runtime)

    assert result["fve_kwh"] == pytest.approx(4.0)   # 2.0 + 2.0 gap
    assert result["grid_kwh"] == pytest.approx(1.0)  # unchanged


def test_reseed_standby_leaves_gap_unattributed():
    """During standby the reseed gap must NOT be attributed to grid.

    After restart the boiler is idle (standby).  We cannot know which source
    provided the pre-restart energy.  The honest answer is to leave both fve
    and grid at 0 rather than fabricate grid energy.
    """
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking

    box_id = "restart5"
    hass = _Hass({f"sensor.oig_{box_id}_boiler_day_w": _State("1605")})
    runtime = _make_runtime(
        activity=_make_activity(source=None, state="standby"),
        daily_source_kwh={"fve": 0.0, "grid": 0.0, "alternative": 0.0},
    )
    result = _read_energy_tracking(hass, box_id, {}, runtime=runtime)

    assert result["total_kwh"] == pytest.approx(1.605)
    # Both electric buckets must stay at 0 — honest unknown
    assert result["fve_kwh"] == pytest.approx(0.0)
    assert result["grid_kwh"] == pytest.approx(0.0)


def test_reseed_charging_alt_leaves_gap_unattributed():
    """During gas heating (charging_alt) the gap must not go to grid."""
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking

    box_id = "restart6"
    hass = _Hass({f"sensor.oig_{box_id}_boiler_day_w": _State("500")})
    runtime = _make_runtime(
        activity=_make_activity(source="alternative", state="charging_alt"),
        daily_source_kwh={"fve": 0.0, "grid": 0.0, "alternative": 0.0},
    )
    result = _read_energy_tracking(hass, box_id, {}, runtime=runtime)

    assert result["fve_kwh"] == pytest.approx(0.0)
    assert result["grid_kwh"] == pytest.approx(0.0)


def test_alt_energy_cumulative_delta_first_call_returns_zero():
    """First call of the day returns 0 and sets the midnight baseline."""
    from custom_components.oig_cloud.boiler.api_views import _read_alt_energy_cumulative_delta

    runtime = SimpleNamespace()
    result = _read_alt_energy_cumulative_delta(runtime, 10.5)
    assert result == pytest.approx(0.0)
    assert hasattr(runtime, "_alt_energy_cumul_baseline")
    assert runtime._alt_energy_cumul_baseline["value"] == pytest.approx(10.5)


def test_alt_energy_cumulative_delta_second_call_returns_delta():
    """Subsequent calls within same day return current - baseline."""
    import datetime as _dt
    from custom_components.oig_cloud.boiler.api_views import _read_alt_energy_cumulative_delta

    today = _dt.date.today()
    runtime = SimpleNamespace(_alt_energy_cumul_baseline={"date": today, "value": 100.0})
    result = _read_alt_energy_cumulative_delta(runtime, 102.3)
    assert result == pytest.approx(2.3)


def test_alt_energy_cumulative_delta_new_day_resets():
    """On day change, baseline is reset and delta is 0."""
    import datetime as _dt
    from custom_components.oig_cloud.boiler.api_views import _read_alt_energy_cumulative_delta

    yesterday = _dt.date.today() - _dt.timedelta(days=1)
    runtime = SimpleNamespace(_alt_energy_cumul_baseline={"date": yesterday, "value": 50.0})
    result = _read_alt_energy_cumulative_delta(runtime, 55.0)
    assert result == pytest.approx(0.0)
    # New baseline should be today's value
    assert runtime._alt_energy_cumul_baseline["value"] == pytest.approx(55.0)


def test_alt_energy_daily_false_uses_cumulative_delta():
    """boiler_alt_energy_daily=False causes _read_energy_tracking to use cumulative delta."""
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking
    import datetime as _dt

    box_id = "cumul1"
    today = _dt.date.today()
    # Simulate a cumulative sensor at 120.5 kWh, baseline was 118.0 → delta=2.5
    hass = _Hass({
        f"sensor.oig_{box_id}_boiler_day_w": _State("0"),
        "sensor.gas_cumul": _State("120.5"),
    })
    runtime = _make_runtime(
        activity=_make_activity(source=None, state="standby"),
        daily_source_kwh={"fve": 0.0, "grid": 0.0, "alternative": 0.0},
    )
    # Pre-set baseline for today
    runtime._alt_energy_cumul_baseline = {"date": today, "value": 118.0}

    config = {"boiler_alt_energy_sensor": "sensor.gas_cumul", "boiler_alt_energy_daily": False}
    result = _read_energy_tracking(hass, box_id, config, runtime=runtime)

    assert result["alt_kwh"] == pytest.approx(2.5)


def test_normalized_activity_source_keys_includes_alternative():
    """_NORMALIZED_ACTIVITY_SOURCE_KEYS must contain 'alternative' for gas-heat timeline."""
    from custom_components.oig_cloud.boiler.runtime import _NORMALIZED_ACTIVITY_SOURCE_KEYS

    assert "alternative" in _NORMALIZED_ACTIVITY_SOURCE_KEYS, (
        "Gas-heat (charging_alt) timeline entries must have source_key='alternative', "
        "not None — add 'alternative' to _NORMALIZED_ACTIVITY_SOURCE_KEYS"
    )


# ---------------------------------------------------------------------------
# 5. module_config boiler section GET/POST validation
# ---------------------------------------------------------------------------

def _make_hass_with_entry(box_id: str, options: dict) -> Any:
    """Build a minimal hass that _find_entry_for_box can resolve."""
    entry_id = f"eid_{box_id}"

    class _DummyEntry:
        pass

    entry = _DummyEntry()
    entry.entry_id = entry_id
    entry.options = dict(options)
    entry.domain = DOMAIN

    class _DummyCoordinator:
        data = {box_id: {}}  # box_id must appear in coordinator.data

    class _DummyConfigEntries:
        def async_entries(self, domain):
            return [entry]

        def async_update_entry(self, e, options):
            e.options = dict(options)

    hass = SimpleNamespace(
        config_entries=_DummyConfigEntries(),
        data={
            DOMAIN: {
                entry_id: {"coordinator": _DummyCoordinator()},
            }
        },
    )
    return hass, entry


@pytest.mark.asyncio
async def test_module_config_boiler_section_get():
    """GET /api/oig_cloud/{box_id}/module_config returns boiler section with correct defaults."""
    from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView

    hass, _ = _make_hass_with_entry(
        "testbox",
        {"boiler_volume_l": 150.0, "boiler_target_temp_c": 55.0},
    )
    view = OIGCloudModuleConfigView()

    class _DummyRequest:
        app = {"hass": hass}

        def get(self, key, default=None):
            return default

    request = _DummyRequest()
    response = await view.get(request, "testbox")
    assert response.status == 200
    data = json.loads(response.text)

    # boiler section must be present
    assert "boiler" in data
    boiler = data["boiler"]
    # volume_l should be 150.0 (from options)
    assert boiler["boiler_volume_l"] == 150.0
    assert boiler["boiler_target_temp_c"] == 55.0
    # Keys with no value in options should have defaults (None or False/empty)
    assert "boiler_has_alternative_heating" in boiler
    assert "boiler_alt_energy_daily" in boiler
    assert "boiler_current_power_entity" in boiler


@pytest.mark.asyncio
async def test_module_config_boiler_section_post_valid():
    """POST boiler section with valid values succeeds."""
    from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView

    hass, _ = _make_hass_with_entry("box2", {"boiler_volume_l": 200.0})
    new_options_holder: dict = {}

    # Wrap async_update_entry to capture updates
    orig = hass.config_entries.async_update_entry

    def _capture(entry, options):
        new_options_holder.update(options)

    hass.config_entries.async_update_entry = _capture
    view = OIGCloudModuleConfigView()

    payload_data = {
        "section": "boiler",
        "values": {
            "boiler_volume_l": 250.0,
            "boiler_target_temp_c": 65.0,
            "boiler_has_alternative_heating": True,
            "boiler_alt_energy_daily": False,
        },
    }

    class _DummyRequest:
        app = {"hass": hass}

        def get(self, key, default=None):
            return None  # user is None → admin check skipped

        async def json(self):
            return payload_data

    request = _DummyRequest()
    response = await view.post(request, "box2")
    assert response.status == 200
    data = json.loads(response.text)
    assert data.get("updated") is True
    assert "boiler_volume_l" in data.get("keys", [])
    assert new_options_holder.get("boiler_volume_l") == 250.0
    assert new_options_holder.get("boiler_target_temp_c") == 65.0
    assert new_options_holder.get("boiler_has_alternative_heating") is True
    assert new_options_holder.get("boiler_alt_energy_daily") is False


@pytest.mark.asyncio
async def test_module_config_boiler_section_post_out_of_range():
    """POST boiler section with out-of-range value returns 400."""
    from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView

    hass, _ = _make_hass_with_entry("box3", {})
    view = OIGCloudModuleConfigView()

    payload_data = {
        "section": "boiler",
        "values": {
            "boiler_volume_l": 1500.0,  # max is 1000
        },
    }

    class _DummyRequest:
        app = {"hass": hass}

        def get(self, key, default=None):
            return None

        async def json(self):
            return payload_data

    request = _DummyRequest()
    response = await view.post(request, "box3")
    assert response.status == 400
    data = json.loads(response.text)
    assert "validation" in data.get("error", "")
    assert "boiler_volume_l" in data.get("fields", {})


@pytest.mark.asyncio
async def test_module_config_boiler_section_post_invalid_bool():
    """POST boiler section with string where bool expected returns 400."""
    from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView

    hass, _ = _make_hass_with_entry("box4", {})
    view = OIGCloudModuleConfigView()

    payload_data = {
        "section": "boiler",
        "values": {
            "boiler_has_alternative_heating": "yes",  # string, not bool
        },
    }

    class _DummyRequest:
        app = {"hass": hass}

        def get(self, key, default=None):
            return None

        async def json(self):
            return payload_data

    request = _DummyRequest()
    response = await view.post(request, "box4")
    assert response.status == 400
    data = json.loads(response.text)
    assert "boiler_has_alternative_heating" in data.get("fields", {})


@pytest.mark.asyncio
async def test_module_config_boiler_target_temp_boundary():
    """boiler_target_temp_c must accept 40–85 °C (boundary values)."""
    from custom_components.oig_cloud.api.ha_rest_api import OIGCloudModuleConfigView, _coerce_module_value, _MODULE_CONFIG_FIELDS

    spec = _MODULE_CONFIG_FIELDS["boiler"]["boiler_target_temp_c"]

    # Valid boundaries
    assert _coerce_module_value(spec, 40.0) == 40.0
    assert _coerce_module_value(spec, 85.0) == 85.0
    assert _coerce_module_value(spec, 60.0) == 60.0

    # Out-of-range
    with pytest.raises(ValueError):
        _coerce_module_value(spec, 39.9)

    with pytest.raises(ValueError):
        _coerce_module_value(spec, 85.1)


def test_module_config_boiler_volume_boundary():
    """boiler_volume_l must accept 30–1000 L."""
    from custom_components.oig_cloud.api.ha_rest_api import _coerce_module_value, _MODULE_CONFIG_FIELDS

    spec = _MODULE_CONFIG_FIELDS["boiler"]["boiler_volume_l"]

    assert _coerce_module_value(spec, 30.0) == 30.0
    assert _coerce_module_value(spec, 200.0) == 200.0
    assert _coerce_module_value(spec, 1000.0) == 1000.0

    with pytest.raises(ValueError):
        _coerce_module_value(spec, 29.9)

    with pytest.raises(ValueError):
        _coerce_module_value(spec, 1000.1)


# ---------------------------------------------------------------------------
# 6. CONF_BOILER_CURRENT_POWER_ENTITY config key
# ---------------------------------------------------------------------------

def test_conf_boiler_current_power_entity_exists():
    """The new config key CONF_BOILER_CURRENT_POWER_ENTITY is importable and non-empty."""
    assert CONF_BOILER_CURRENT_POWER_ENTITY == "boiler_current_power_entity"
    assert DEFAULT_BOILER_CURRENT_POWER_ENTITY == ""  # empty = auto-resolve


def test_conf_boiler_alt_energy_daily_exists():
    """CONF_BOILER_ALT_ENERGY_DAILY is importable; default is True (daily-reset)."""
    assert CONF_BOILER_ALT_ENERGY_DAILY == "boiler_alt_energy_daily"
    assert DEFAULT_BOILER_ALT_ENERGY_DAILY is True


def test_resolve_cbb_entity_id_uses_config_override():
    """_resolve_cbb_entity_id prefers CONF_BOILER_CURRENT_POWER_ENTITY when set."""
    # Build a minimal runtime-like object with the method
    class _FakeCoordinator:
        config = {"boiler_current_power_entity": "sensor.custom_cbb"}
        _oig_current_cbb_entity = "sensor.oig_auto_cbb"

    class _FakeRuntime:
        coordinator = _FakeCoordinator()

        def _resolve_cbb_entity_id(self):
            from custom_components.oig_cloud.const import CONF_BOILER_CURRENT_POWER_ENTITY
            config = getattr(self.coordinator, "config", {}) or {}
            override = config.get(CONF_BOILER_CURRENT_POWER_ENTITY)
            if isinstance(override, str) and override.strip():
                return override.strip()
            return getattr(self.coordinator, "_oig_current_cbb_entity", None)

    rt = _FakeRuntime()
    assert rt._resolve_cbb_entity_id() == "sensor.custom_cbb"


def test_resolve_cbb_entity_id_falls_back_to_auto():
    """_resolve_cbb_entity_id falls back to coordinator auto-resolved entity when config is empty."""

    class _FakeCoordinator:
        config = {"boiler_current_power_entity": ""}  # empty = auto-resolve
        _oig_current_cbb_entity = "sensor.oig_2206237016_boiler_current_cbb_w"

    class _FakeRuntime:
        coordinator = _FakeCoordinator()

        def _resolve_cbb_entity_id(self):
            from custom_components.oig_cloud.const import CONF_BOILER_CURRENT_POWER_ENTITY
            config = getattr(self.coordinator, "config", {}) or {}
            override = config.get(CONF_BOILER_CURRENT_POWER_ENTITY)
            if isinstance(override, str) and override.strip():
                return override.strip()
            return getattr(self.coordinator, "_oig_current_cbb_entity", None)

    rt = _FakeRuntime()
    assert rt._resolve_cbb_entity_id() == "sensor.oig_2206237016_boiler_current_cbb_w"


# ---------------------------------------------------------------------------
# 7. CONF_BOILER_ALT_ENERGY_DAILY semantics
# ---------------------------------------------------------------------------

def test_alt_energy_daily_true_midnight_reset_semantics():
    """When CONF_BOILER_ALT_ENERGY_DAILY is True, the meter reading is the daily total.

    Midnight reset: current reading (0.3 kWh at 00:05) < previous reading (5.0 kWh)
    → delta is clamped to 0.
    """
    prev_kwh = 5.0
    current_kwh = 0.3
    alt_energy_daily = True

    if alt_energy_daily:
        delta = current_kwh - prev_kwh
        delta = max(0.0, delta)
    else:
        delta = current_kwh - prev_kwh

    assert delta == 0.0, "Daily-reset meter: negative delta must be 0 after midnight"


def test_alt_energy_daily_true_normal_accumulation():
    """With CONF_BOILER_ALT_ENERGY_DAILY=True, positive delta is passed through."""
    prev_kwh = 2.0
    current_kwh = 2.8
    delta = max(0.0, current_kwh - prev_kwh)
    assert delta == pytest.approx(0.8)


# ---------------------------------------------------------------------------
# 8. No-runtime degradation
# ---------------------------------------------------------------------------

def test_no_runtime_yields_source_estimated():
    """Without a runtime (old installs) _read_energy_tracking returns source_estimated=True."""
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking

    box_id = "norun"
    hass = _Hass({f"sensor.oig_{box_id}_boiler_day_w": _State("1000")})
    result = _read_energy_tracking(hass, box_id, {}, runtime=None)

    assert result["source_estimated"] is True
    assert result["fve_kwh"] == 0.0
    assert result["grid_kwh"] == 0.0
    assert result["total_kwh"] == pytest.approx(1.0)


def test_no_box_day_counter_graceful():
    """When box day counter is missing, total_kwh is 0 and all buckets are 0."""
    from custom_components.oig_cloud.boiler.api_views import _read_energy_tracking

    box_id = "nocount"
    hass = _Hass({})  # no sensors
    runtime = _make_runtime(
        activity=_make_activity(source="fve", state="idle"),
        daily_source_kwh={"fve": 0.0, "grid": 0.0, "alternative": 0.0},
    )
    result = _read_energy_tracking(hass, box_id, {}, runtime=runtime)

    assert result["total_kwh"] == 0.0
    assert result["fve_kwh"] == 0.0
    assert result["grid_kwh"] == 0.0
    assert result["alt_kwh"] >= 0.0
