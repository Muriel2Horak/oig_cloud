"""Tests for per-phase grid cost / earnings computed sensors.

Covers:
  - Import integration (power > 0) multiplied by buy price
  - Export integration (power < 0) earnings multiplied by sell price
  - Zero power → no contribution
  - Mixed phases (some import, some export in same cycle)
  - Total = sum of per-phase accumulators for the same period
  - Midnight daily reset, month-end monthly reset, year-start yearly reset
  - Gating: when enable_pricing or enable_battery_prediction is off,
    _create_grid_cost_sensors() returns []
  - Price sensors unavailable → no accumulation (graceful skip)
  - Restore-race guard: saves skipped until _energy_cache_loaded is set
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any, Dict
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.oig_cloud.entities import computed_sensor as module
from custom_components.oig_cloud.entities.computed_sensor import OigCloudComputedSensor


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

BOX_ID = "999"


class DummyState:
    def __init__(self, state: str, last_updated: Any = None, last_changed: Any = None):
        self.state = state
        self.last_updated = last_updated
        self.last_changed = last_changed or last_updated
        self.entity_id = ""
        self.attributes: Dict[str, Any] = {}


class DummyStates:
    def __init__(self, mapping: Dict[str, DummyState]):
        self._m = mapping

    def get(self, entity_id: str):
        return self._m.get(entity_id)

    def async_all(self, domain: str = ""):
        items = []
        for eid, st in self._m.items():
            if not domain or eid.startswith(f"{domain}."):
                st.entity_id = eid
                items.append(st)
        return items


class DummyHass:
    def __init__(self, states: Dict[str, DummyState]):
        self.states = DummyStates(states)
        self._tasks: list = []

    def async_create_task(self, coro):
        self._tasks.append(coro)
        # Don't actually run them in tests
        return None


class DummyStore:
    def __init__(self, payload=None):
        self._payload = payload
        self.saved: Any = None

    async def async_load(self):
        return self._payload

    async def async_save(self, data):
        self.saved = data


def _make_coord():
    return SimpleNamespace(
        forced_box_id=BOX_ID,
        hass=None,
        async_add_listener=lambda *a, **k: lambda: None,
    )


def _make_sensor(sensor_type: str) -> OigCloudComputedSensor:
    """Create a grid cost sensor with a fresh (isolated) energy cache."""
    # Isolate module-level caches per test
    module._energy_stores.pop(BOX_ID, None)
    module._energy_data_cache.pop(BOX_ID, None)
    module._energy_last_update_cache.pop(BOX_ID, None)
    module._energy_cache_loaded.pop(BOX_ID, None)
    module._energy_restore_tasks.pop(BOX_ID, None)

    coord = _make_coord()
    sensor = OigCloudComputedSensor(coord, sensor_type)
    sensor._box_id = BOX_ID
    return sensor


def _make_hass_with_prices(
    *,
    buy: float = 2.0,
    sell: float = 1.5,
    l1: float = 0.0,
    l2: float = 0.0,
    l3: float = 0.0,
) -> DummyHass:
    """Return a DummyHass pre-loaded with spot/export prices and phase powers."""
    return DummyHass(
        {
            f"sensor.oig_{BOX_ID}_spot_price_current_15min": DummyState(str(buy)),
            f"sensor.oig_{BOX_ID}_export_price_current_15min": DummyState(str(sell)),
            f"sensor.oig_{BOX_ID}_actual_aci_wr": DummyState(str(l1)),
            f"sensor.oig_{BOX_ID}_actual_aci_ws": DummyState(str(l2)),
            f"sensor.oig_{BOX_ID}_actual_aci_wt": DummyState(str(l3)),
        }
    )


def _seed_cache(sensor: OigCloudComputedSensor, **overrides: float) -> None:
    """Put the sensor's energy dict into the shared cache (simulates loaded state)."""
    for k, v in overrides.items():
        sensor._energy[k] = v
    module._energy_data_cache[BOX_ID] = sensor._energy
    module._energy_cache_loaded[BOX_ID] = True


# ---------------------------------------------------------------------------
# 1. Import integration (power > 0)
# ---------------------------------------------------------------------------

def test_import_cost_l1_single_cycle():
    """Pure import on L1: cost = power_W * dt_h / 1000 * buy_price."""
    sensor = _make_sensor("computed_grid_import_cost_l1_today")
    sensor.hass = _make_hass_with_prices(buy=2.0, sell=1.5, l1=1000.0)
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    dt_seconds = 3600.0  # 1 hour
    sensor._apply_grid_cost_delta(dt_seconds)

    # 1000 W * 1 h / 1000 = 1 kWh; 1 kWh * 2.0 CZK/kWh = 2.0 CZK
    assert abs(sensor._energy["grid_import_cost_l1_today"] - 2.0) < 1e-9
    # Export should remain zero for positive import
    assert sensor._energy["grid_export_earn_l1_today"] == 0.0


def test_import_cost_accumulates_across_cycles():
    """Repeated calls accumulate the cost."""
    sensor = _make_sensor("computed_grid_import_cost_l1_today")
    sensor.hass = _make_hass_with_prices(buy=3.0, l1=500.0)
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    # Two 30-minute cycles → total 1 hour at 500 W = 0.5 kWh * 3.0 = 1.5 CZK
    for _ in range(2):
        sensor._apply_grid_cost_delta(1800.0)

    assert abs(sensor._energy["grid_import_cost_l1_today"] - 1.5) < 1e-9


def test_import_accumulates_month_and_year():
    """Month and year keys also accumulate alongside today."""
    sensor = _make_sensor("computed_grid_import_cost_l1_today")
    sensor.hass = _make_hass_with_prices(buy=1.0, l1=1000.0)
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    sensor._apply_grid_cost_delta(3600.0)  # 1 kWh → 1.0 CZK

    assert abs(sensor._energy["grid_import_cost_l1_today"] - 1.0) < 1e-9
    assert abs(sensor._energy["grid_import_cost_l1_month"] - 1.0) < 1e-9
    assert abs(sensor._energy["grid_import_cost_l1_year"] - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# 2. Export integration (power < 0)
# ---------------------------------------------------------------------------

def test_export_earnings_l2_single_cycle():
    """Pure export on L2: earnings = |power_W| * dt_h / 1000 * sell_price."""
    sensor = _make_sensor("computed_grid_export_earnings_l2_today")
    sensor.hass = _make_hass_with_prices(buy=2.0, sell=1.5, l2=-2000.0)
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    sensor._apply_grid_cost_delta(3600.0)  # 1 hour

    # 2000 W → 2 kWh; 2 kWh * 1.5 = 3.0 CZK earned
    assert abs(sensor._energy["grid_export_earn_l2_today"] - 3.0) < 1e-9
    # Import cost should remain zero for negative power
    assert sensor._energy["grid_import_cost_l2_today"] == 0.0


def test_export_earnings_month_and_year():
    sensor = _make_sensor("computed_grid_export_earnings_l3_today")
    sensor.hass = _make_hass_with_prices(sell=2.0, l3=-500.0)
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    sensor._apply_grid_cost_delta(3600.0)  # 0.5 kWh → 1.0 CZK

    assert abs(sensor._energy["grid_export_earn_l3_today"] - 1.0) < 1e-9
    assert abs(sensor._energy["grid_export_earn_l3_month"] - 1.0) < 1e-9
    assert abs(sensor._energy["grid_export_earn_l3_year"] - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# 3. Zero power → no contribution
# ---------------------------------------------------------------------------

def test_zero_power_no_change():
    sensor = _make_sensor("computed_grid_import_cost_l1_today")
    sensor.hass = _make_hass_with_prices(buy=2.0, sell=1.5, l1=0.0, l2=0.0, l3=0.0)
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    sensor._apply_grid_cost_delta(3600.0)

    for key, val in sensor._energy.items():
        if key.startswith("grid_"):
            assert val == 0.0, f"Expected 0 for {key}, got {val}"


# ---------------------------------------------------------------------------
# 4. Mixed phases (some import, some export in the same cycle)
# ---------------------------------------------------------------------------

def test_mixed_phases_independent():
    """L1 imports while L2 exports — each should accumulate independently."""
    sensor = _make_sensor("computed_grid_import_cost_today")
    # L1: 1000 W import, L2: -500 W export, L3: 0
    sensor.hass = _make_hass_with_prices(buy=2.0, sell=1.0, l1=1000.0, l2=-500.0, l3=0.0)
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    sensor._apply_grid_cost_delta(3600.0)

    # L1 import: 1 kWh * 2.0 = 2.0 CZK cost
    assert abs(sensor._energy["grid_import_cost_l1_today"] - 2.0) < 1e-9
    # L2 export: 0.5 kWh * 1.0 = 0.5 CZK earnings
    assert abs(sensor._energy["grid_export_earn_l2_today"] - 0.5) < 1e-9
    # L3 zero → no contribution
    assert sensor._energy["grid_import_cost_l3_today"] == 0.0
    assert sensor._energy["grid_export_earn_l3_today"] == 0.0
    # L2 should not have import cost
    assert sensor._energy["grid_import_cost_l2_today"] == 0.0


# ---------------------------------------------------------------------------
# 5. Total = sum of per-phase accumulators
# ---------------------------------------------------------------------------

def test_total_import_cost_today_equals_sum_of_phases():
    sensor = _make_sensor("computed_grid_import_cost_today")
    sensor.hass = _make_hass_with_prices(buy=2.0, l1=1000.0, l2=500.0, l3=1500.0)
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    sensor._apply_grid_cost_delta(3600.0)

    # L1: 2.0, L2: 1.0, L3: 3.0 → total 6.0
    total = sensor._get_grid_cost_total_value()
    assert total is not None
    l1 = sensor._energy["grid_import_cost_l1_today"]
    l2 = sensor._energy["grid_import_cost_l2_today"]
    l3 = sensor._energy["grid_import_cost_l3_today"]
    assert abs(total - (l1 + l2 + l3)) < 1e-9


def test_total_export_earnings_today_equals_sum_of_phases():
    sensor = _make_sensor("computed_grid_export_earnings_today")
    sensor.hass = _make_hass_with_prices(sell=1.5, l1=-1000.0, l2=-2000.0, l3=-500.0)
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    sensor._apply_grid_cost_delta(3600.0)

    total = sensor._get_grid_cost_total_value()
    assert total is not None
    e1 = sensor._energy["grid_export_earn_l1_today"]
    e2 = sensor._energy["grid_export_earn_l2_today"]
    e3 = sensor._energy["grid_export_earn_l3_today"]
    assert abs(total - (e1 + e2 + e3)) < 1e-9


def test_total_import_cost_month_equals_sum_of_phases():
    sensor = _make_sensor("computed_grid_import_cost_month")
    sensor.hass = _make_hass_with_prices(buy=3.0, l1=1000.0, l2=1000.0, l3=1000.0)
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    sensor._apply_grid_cost_delta(3600.0)

    total = sensor._get_grid_cost_total_value()
    assert total is not None
    assert abs(total - 9.0) < 1e-9  # 3 × 1 kWh × 3 CZK


# ---------------------------------------------------------------------------
# 6. Daily reset (_reset_daily)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_daily_reset_clears_today_keeps_month():
    sensor = _make_sensor("computed_grid_import_cost_l1_today")
    sensor.hass = DummyHass({})
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    _seed_cache(
        sensor,
        grid_import_cost_l1_today=5.0,
        grid_import_cost_l1_month=15.0,
        grid_import_cost_l1_year=50.0,
    )

    # Simulate midnight on a non-first-of-month, non-first-of-year day
    fake_now = datetime(2026, 6, 10, 0, 0, 0, tzinfo=timezone.utc)

    # Patch storage so the forced save doesn't fail
    dummy_store = DummyStore()
    module._energy_stores[BOX_ID] = dummy_store

    await sensor._reset_daily(fake_now)

    assert sensor._energy["grid_import_cost_l1_today"] == 0.0
    assert sensor._energy["grid_import_cost_l1_month"] == 15.0  # untouched
    assert sensor._energy["grid_import_cost_l1_year"] == 50.0   # untouched


@pytest.mark.asyncio
async def test_monthly_reset_on_first_of_month():
    sensor = _make_sensor("computed_grid_import_cost_l1_today")
    sensor.hass = DummyHass({})
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    _seed_cache(
        sensor,
        grid_import_cost_l1_today=5.0,
        grid_import_cost_l1_month=15.0,
        grid_import_cost_l1_year=50.0,
        grid_export_earn_l2_month=8.0,
    )

    fake_now = datetime(2026, 6, 1, 0, 0, 0, tzinfo=timezone.utc)

    dummy_store = DummyStore()
    module._energy_stores[BOX_ID] = dummy_store

    await sensor._reset_daily(fake_now)

    assert sensor._energy["grid_import_cost_l1_today"] == 0.0
    assert sensor._energy["grid_import_cost_l1_month"] == 0.0
    assert sensor._energy["grid_export_earn_l2_month"] == 0.0
    assert sensor._energy["grid_import_cost_l1_year"] == 50.0   # untouched


@pytest.mark.asyncio
async def test_yearly_reset_on_first_of_year():
    sensor = _make_sensor("computed_grid_import_cost_l1_today")
    sensor.hass = DummyHass({})
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    _seed_cache(
        sensor,
        grid_import_cost_l1_year=100.0,
        grid_export_earn_l3_year=80.0,
    )

    fake_now = datetime(2027, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    dummy_store = DummyStore()
    module._energy_stores[BOX_ID] = dummy_store

    await sensor._reset_daily(fake_now)

    assert sensor._energy["grid_import_cost_l1_year"] == 0.0
    assert sensor._energy["grid_export_earn_l3_year"] == 0.0


# ---------------------------------------------------------------------------
# 7. Price sensors unavailable → no accumulation
# ---------------------------------------------------------------------------

def test_no_accumulation_when_prices_unavailable():
    sensor = _make_sensor("computed_grid_import_cost_l1_today")
    sensor.hass = DummyHass(
        {
            # No spot_price / export_price sensors
            f"sensor.oig_{BOX_ID}_actual_aci_wr": DummyState("1000"),
        }
    )
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    sensor._apply_grid_cost_delta(3600.0)

    assert sensor._energy["grid_import_cost_l1_today"] == 0.0


def test_no_accumulation_when_buy_price_missing():
    sensor = _make_sensor("computed_grid_import_cost_l1_today")
    sensor.hass = DummyHass(
        {
            # Only sell price present, buy missing
            f"sensor.oig_{BOX_ID}_export_price_current_15min": DummyState("1.5"),
            f"sensor.oig_{BOX_ID}_actual_aci_wr": DummyState("1000"),
        }
    )
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    sensor._apply_grid_cost_delta(3600.0)

    assert sensor._energy["grid_import_cost_l1_today"] == 0.0


# ---------------------------------------------------------------------------
# 8. Gating: _create_grid_cost_sensors returns [] when flags are off
# ---------------------------------------------------------------------------

def test_gating_both_off():
    from custom_components.oig_cloud.sensor import _create_grid_cost_sensors

    coord = _make_coord()
    entry = SimpleNamespace(options={"enable_pricing": False, "enable_battery_prediction": False})
    result = _create_grid_cost_sensors(coord, entry)
    assert result == []


def test_gating_only_pricing_on():
    from custom_components.oig_cloud.sensor import _create_grid_cost_sensors

    coord = _make_coord()
    entry = SimpleNamespace(options={"enable_pricing": True, "enable_battery_prediction": False})
    result = _create_grid_cost_sensors(coord, entry)
    assert result == []


def test_gating_only_prediction_on():
    from custom_components.oig_cloud.sensor import _create_grid_cost_sensors

    coord = _make_coord()
    entry = SimpleNamespace(options={"enable_pricing": False, "enable_battery_prediction": True})
    result = _create_grid_cost_sensors(coord, entry)
    assert result == []


def test_gating_both_on_creates_12_sensors():
    from custom_components.oig_cloud.sensor import _create_grid_cost_sensors

    # Need a proper coordinator so OigCloudComputedSensor can build correctly
    coord = SimpleNamespace(
        forced_box_id=BOX_ID,
        hass=None,
        data=None,
        last_update_success=True,
        async_add_listener=lambda *a, **k: lambda: None,
    )
    entry = SimpleNamespace(options={"enable_pricing": True, "enable_battery_prediction": True})
    result = _create_grid_cost_sensors(coord, entry)
    assert len(result) == 12


# ---------------------------------------------------------------------------
# 9. _accumulate_grid_cost() returns correct value from shared cache
# ---------------------------------------------------------------------------

def test_accumulate_grid_cost_per_phase_today():
    sensor = _make_sensor("computed_grid_import_cost_l2_today")
    _seed_cache(sensor, grid_import_cost_l2_today=7.5)
    sensor.hass = DummyHass({})

    result = sensor._accumulate_grid_cost()
    assert result == pytest.approx(7.5, abs=1e-9)


def test_accumulate_grid_cost_total_today():
    sensor = _make_sensor("computed_grid_import_cost_today")
    _seed_cache(
        sensor,
        grid_import_cost_l1_today=1.0,
        grid_import_cost_l2_today=2.0,
        grid_import_cost_l3_today=3.0,
    )
    sensor.hass = DummyHass({})

    result = sensor._accumulate_grid_cost()
    assert result == pytest.approx(6.0, abs=1e-9)


def test_accumulate_grid_cost_total_month():
    sensor = _make_sensor("computed_grid_export_earnings_month")
    _seed_cache(
        sensor,
        grid_export_earn_l1_month=4.0,
        grid_export_earn_l2_month=5.0,
        grid_export_earn_l3_month=6.0,
    )
    sensor.hass = DummyHass({})

    result = sensor._accumulate_grid_cost()
    assert result == pytest.approx(15.0, abs=1e-9)


# ---------------------------------------------------------------------------
# 10. Restore-race guard: saves skipped until _energy_cache_loaded
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_save_skipped_before_cache_loaded(monkeypatch):
    """_save_energy_to_storage (non-forced) must skip when cache not loaded."""
    sensor = _make_sensor("computed_grid_import_cost_l1_today")
    sensor.hass = DummyHass({})

    saved_calls = []
    dummy_store = DummyStore()

    async def _fake_save(data):
        saved_calls.append(data)

    dummy_store.async_save = _fake_save
    module._energy_stores[BOX_ID] = dummy_store
    # NOT setting _energy_cache_loaded → race guard active

    await sensor._save_energy_to_storage(force=False)
    assert saved_calls == [], "Save should be skipped while cache not loaded"


@pytest.mark.asyncio
async def test_save_allowed_after_cache_loaded(monkeypatch):
    """Forced save (from restore path) must proceed even before normal cache."""
    sensor = _make_sensor("computed_grid_import_cost_l1_today")
    sensor.hass = DummyHass({})
    module._energy_cache_loaded[BOX_ID] = True

    dummy_store = DummyStore()
    module._energy_stores[BOX_ID] = dummy_store

    await sensor._save_energy_to_storage(force=True)
    assert dummy_store.saved is not None


# ---------------------------------------------------------------------------
# 11. Price sign: negative sell price → earnings still positive (abs guard)
# ---------------------------------------------------------------------------

def test_export_earnings_negative_sell_price():
    """If sell_price goes negative (edge case), earnings should still be computed
    correctly. Real accumulation uses abs(energy_kwh) * sell_price so a negative
    sell price yields negative earnings (stored as-is)."""
    sensor = _make_sensor("computed_grid_export_earnings_l1_today")
    sensor.hass = _make_hass_with_prices(buy=2.0, sell=-0.5, l1=-1000.0)
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    sensor._apply_grid_cost_delta(3600.0)

    # 1 kWh exported × -0.5 = -0.5 CZK (negative sell price means user pays for export)
    assert abs(sensor._energy["grid_export_earn_l1_today"] - (-0.5)) < 1e-9


# ---------------------------------------------------------------------------
# 12. Standalone fallback: accumulates when battery sensor is unavailable
# ---------------------------------------------------------------------------

def test_standalone_fallback_accumulates_when_battery_stalled():
    """When batt_batt_comp_p is unavailable the battery-driven path stalls.
    _accumulate_grid_cost() must still integrate grid cost via the standalone
    fallback path (_grid_cost_last_update_cache).
    """
    sensor = _make_sensor("computed_grid_import_cost_l1_today")
    # Provide prices and L1 import power, but NO batt_batt_comp_p (battery stalled).
    sensor.hass = _make_hass_with_prices(buy=2.0, sell=1.5, l1=1000.0)
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    # Inject a stale timestamp — 60 seconds ago (battery unavailable for 1 min).
    t0 = datetime.now(timezone.utc) - timedelta(seconds=60)
    module._grid_cost_last_update_cache[BOX_ID] = t0

    result = sensor._accumulate_grid_cost()

    # 1000 W × (60/3600) h / 1000 kWh × 2.0 CZK = 0.0333... CZK
    expected = 1000.0 * (60.0 / 3600.0) / 1000.0 * 2.0
    assert result is not None
    assert abs(sensor._energy["grid_import_cost_l1_today"] - expected) < 1e-6


def test_standalone_fallback_no_double_count_when_battery_ran():
    """When the battery-driven path already ran in this cycle (elapsed < 5 s),
    _accumulate_grid_cost() must NOT run the standalone path (no double-count).
    """
    sensor = _make_sensor("computed_grid_import_cost_l1_today")
    sensor.hass = _make_hass_with_prices(buy=2.0, sell=1.5, l1=1000.0)
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy

    # Battery path ran 1 second ago (within 5 s tolerance → no standalone path).
    t_recent = datetime.now(timezone.utc) - timedelta(seconds=1)
    module._grid_cost_last_update_cache[BOX_ID] = t_recent

    result = sensor._accumulate_grid_cost()

    # Cost must remain zero — the standalone path should NOT have fired.
    assert result is not None
    assert sensor._energy["grid_import_cost_l1_today"] == 0.0


def test_standalone_fallback_first_call_no_integration():
    """On the very first call (no prior timestamp), no integration should happen
    — only the timestamp is recorded.  This avoids a phantom Δt from epoch.
    """
    sensor = _make_sensor("computed_grid_import_cost_l1_today")
    sensor.hass = _make_hass_with_prices(buy=2.0, sell=1.5, l1=1000.0)
    module._energy_cache_loaded[BOX_ID] = True
    module._energy_data_cache[BOX_ID] = sensor._energy
    # No prior timestamp
    module._grid_cost_last_update_cache.pop(BOX_ID, None)

    result = sensor._accumulate_grid_cost()

    assert result is not None
    assert sensor._energy["grid_import_cost_l1_today"] == 0.0
    # Timestamp must now be set
    assert BOX_ID in module._grid_cost_last_update_cache
