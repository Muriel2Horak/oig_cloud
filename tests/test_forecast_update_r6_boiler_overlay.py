"""Tests for R6 boiler grid-load feedback in the battery forecast pipeline.

Covered scenarios:
  1. Load forecast grows by boiler grid_kwh when a boiler plan is present.
  2. Absent boiler module (no boiler_runtimes key) → load_forecast unchanged.
  3. Overflow-sourced slots (grid_kwh = 0.0, pv_kwh > 0) → excluded from overlay.
  4. Multiple boilers (multiple runtimes) → grid_kwh values summed per slot.
  5. last_plan_result = None → overlay is empty, forecast unchanged.
  6. No hass attribute → returns empty overlay silently.
  7. Non-dict entry_data → skipped gracefully.
  8. Slot with tz-naive start → normalised to tz-aware for matching.
  9. _apply_boiler_grid_load_overlay: spot_prices shorter than load_forecast → no index error.
 10. No circular imports: forecast_update imports nothing from boiler.* at module level.
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.oig_cloud.battery_forecast.planning import (
    forecast_update as forecast_update_module,
)
from custom_components.oig_cloud.const import DOMAIN, KEY_BOILER_RUNTIMES


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_slot(start: datetime, grid_kwh: float, pv_kwh: float = 0.0) -> SimpleNamespace:
    """Return a minimal PlanSlotAction-like object."""
    return SimpleNamespace(start=start, grid_kwh=grid_kwh, pv_kwh=pv_kwh)


def _make_plan_result(slots: list[Any]) -> SimpleNamespace:
    """Return a minimal PlanResult-like object."""
    return SimpleNamespace(slots=slots)


def _make_runtime(plan_result: Any | None) -> SimpleNamespace:
    """Return a minimal BoilerRuntime-like object."""
    return SimpleNamespace(last_plan_result=plan_result)


def _make_sensor(
    runtimes: dict[str, Any] | None = None,
    *,
    entry_id: str = "entry1",
) -> SimpleNamespace:
    """Return a minimal sensor-like object with hass.data configured.

    If *runtimes* is None the entry has no KEY_BOILER_RUNTIMES key (absent
    boiler module scenario).
    """
    entry_data: dict[str, Any] = {}
    if runtimes is not None:
        entry_data[KEY_BOILER_RUNTIMES] = runtimes

    hass = SimpleNamespace(
        data={
            DOMAIN: {entry_id: entry_data},
        }
    )
    sensor = SimpleNamespace(hass=hass, _hass=hass)
    return sensor


_UTC = timezone.utc

# Reference timestamps (all UTC-aware, 15-min slot boundaries).
_T0 = datetime(2025, 6, 10, 6, 0, 0, tzinfo=_UTC)
_T1 = datetime(2025, 6, 10, 6, 15, 0, tzinfo=_UTC)
_T2 = datetime(2025, 6, 10, 6, 30, 0, tzinfo=_UTC)


# ---------------------------------------------------------------------------
# _read_boiler_grid_load_overlay tests
# ---------------------------------------------------------------------------


def test_overlay_grows_by_grid_kwh_for_heated_slot():
    """Overlay dict contains grid_kwh for a slot with grid heating."""
    slot = _make_slot(_T0, grid_kwh=0.35)
    plan = _make_plan_result([slot])
    runtime = _make_runtime(plan)
    sensor = _make_sensor({"boiler1": runtime})

    overlay = forecast_update_module._read_boiler_grid_load_overlay(sensor)

    assert _T0 in overlay
    assert overlay[_T0] == pytest.approx(0.35)


def test_overlay_empty_when_no_boiler_runtimes_key():
    """When boiler_runtimes is absent (boiler module not configured), overlay is {}."""
    sensor = _make_sensor(runtimes=None)

    overlay = forecast_update_module._read_boiler_grid_load_overlay(sensor)

    assert overlay == {}


def test_overlay_empty_when_runtimes_dict_is_empty():
    """Empty runtimes dict → no plan → overlay empty."""
    sensor = _make_sensor(runtimes={})

    overlay = forecast_update_module._read_boiler_grid_load_overlay(sensor)

    assert overlay == {}


def test_overlay_excludes_overflow_slots_with_zero_grid_kwh():
    """Overflow-sourced slots have grid_kwh=0.0; they must NOT appear in the overlay."""
    overflow_slot = _make_slot(_T0, grid_kwh=0.0, pv_kwh=0.5)
    plan = _make_plan_result([overflow_slot])
    runtime = _make_runtime(plan)
    sensor = _make_sensor({"boiler1": runtime})

    overlay = forecast_update_module._read_boiler_grid_load_overlay(sensor)

    assert overlay == {}


def test_overlay_sums_multiple_boilers_same_slot():
    """Two boiler runtimes heating the same slot → grid_kwh summed."""
    slot_a = _make_slot(_T0, grid_kwh=0.2)
    slot_b = _make_slot(_T0, grid_kwh=0.15)
    plan_a = _make_plan_result([slot_a])
    plan_b = _make_plan_result([slot_b])
    sensor = _make_sensor(
        {
            "boiler1": _make_runtime(plan_a),
            "boiler2": _make_runtime(plan_b),
        }
    )

    overlay = forecast_update_module._read_boiler_grid_load_overlay(sensor)

    assert overlay[_T0] == pytest.approx(0.35)


def test_overlay_empty_when_last_plan_result_is_none():
    """Runtime without a computed plan (bootstrap) → overlay is empty."""
    runtime = _make_runtime(plan_result=None)
    sensor = _make_sensor({"boiler1": runtime})

    overlay = forecast_update_module._read_boiler_grid_load_overlay(sensor)

    assert overlay == {}


def test_overlay_empty_when_hass_is_none():
    """Sensor with no hass attribute → returns {} without raising."""
    sensor = SimpleNamespace(hass=None, _hass=None)

    overlay = forecast_update_module._read_boiler_grid_load_overlay(sensor)

    assert overlay == {}


def test_overlay_empty_when_hass_data_not_dict():
    """hass.data that is not a dict → returns {} gracefully."""
    hass = SimpleNamespace(data="not-a-dict")
    sensor = SimpleNamespace(hass=hass, _hass=hass)

    overlay = forecast_update_module._read_boiler_grid_load_overlay(sensor)

    assert overlay == {}


def test_overlay_non_dict_entry_data_skipped():
    """Non-dict entry_data under DOMAIN → skipped gracefully."""
    hass = SimpleNamespace(data={DOMAIN: {"entry1": "not-a-dict"}})
    sensor = SimpleNamespace(hass=hass, _hass=hass)

    overlay = forecast_update_module._read_boiler_grid_load_overlay(sensor)

    assert overlay == {}


def test_overlay_tz_naive_slot_start_normalised():
    """A slot with a tz-naive start datetime is normalised to tz-aware for key matching.

    The overlay must be accessible via a tz-aware key equivalent to the naive start.
    """
    naive_start = datetime(2025, 6, 10, 6, 0, 0)  # no tzinfo
    slot = _make_slot(naive_start, grid_kwh=0.25)
    plan = _make_plan_result([slot])
    runtime = _make_runtime(plan)
    sensor = _make_sensor({"boiler1": runtime})

    overlay = forecast_update_module._read_boiler_grid_load_overlay(sensor)

    # All keys in the overlay must be tz-aware.
    assert all(k.tzinfo is not None for k in overlay)
    # At least one key matches the same wall-clock time.
    values = list(overlay.values())
    assert len(values) == 1
    assert values[0] == pytest.approx(0.25)


def test_overlay_multiple_slots_different_times():
    """Multiple slots at different times each appear as separate overlay entries."""
    slots = [
        _make_slot(_T0, grid_kwh=0.10),
        _make_slot(_T1, grid_kwh=0.20),
        _make_slot(_T2, grid_kwh=0.30),
    ]
    plan = _make_plan_result(slots)
    runtime = _make_runtime(plan)
    sensor = _make_sensor({"boiler1": runtime})

    overlay = forecast_update_module._read_boiler_grid_load_overlay(sensor)

    assert len(overlay) == 3
    assert overlay[_T0] == pytest.approx(0.10)
    assert overlay[_T1] == pytest.approx(0.20)
    assert overlay[_T2] == pytest.approx(0.30)


# ---------------------------------------------------------------------------
# _apply_boiler_grid_load_overlay tests
# ---------------------------------------------------------------------------


def _make_spot_prices(times: list[datetime]) -> list[dict[str, Any]]:
    """Build a minimal spot_prices list from a list of datetimes."""
    return [{"time": t.isoformat(), "price": 1.0} for t in times]


def test_apply_overlay_adds_grid_kwh_to_matching_slot():
    """load_forecast grows by boiler grid_kwh for the matching slot timestamp."""
    slot = _make_slot(_T0, grid_kwh=0.35)
    plan = _make_plan_result([slot])
    runtime = _make_runtime(plan)
    sensor = _make_sensor({"boiler1": runtime})

    spot_prices = _make_spot_prices([_T0, _T1])
    load_forecast = [0.10, 0.20]

    forecast_update_module._apply_boiler_grid_load_overlay(sensor, spot_prices, load_forecast)

    assert load_forecast[0] == pytest.approx(0.10 + 0.35)  # matched slot
    assert load_forecast[1] == pytest.approx(0.20)          # unaffected


def test_apply_overlay_unchanged_when_no_boiler():
    """No boiler runtime → load_forecast is unchanged."""
    sensor = _make_sensor(runtimes=None)
    spot_prices = _make_spot_prices([_T0, _T1])
    load_forecast = [0.10, 0.20]

    forecast_update_module._apply_boiler_grid_load_overlay(sensor, spot_prices, load_forecast)

    assert load_forecast == [pytest.approx(0.10), pytest.approx(0.20)]


def test_apply_overlay_overflow_slots_not_added():
    """Overflow-sourced slots (grid_kwh=0.0) do not modify load_forecast."""
    slot = _make_slot(_T0, grid_kwh=0.0, pv_kwh=0.5)
    plan = _make_plan_result([slot])
    runtime = _make_runtime(plan)
    sensor = _make_sensor({"boiler1": runtime})

    spot_prices = _make_spot_prices([_T0])
    load_forecast = [0.15]

    forecast_update_module._apply_boiler_grid_load_overlay(sensor, spot_prices, load_forecast)

    assert load_forecast == [pytest.approx(0.15)]


def test_apply_overlay_unmatched_slot_ignored():
    """A boiler slot outside the spot_prices horizon is silently ignored."""
    future = datetime(2025, 6, 11, 8, 0, 0, tzinfo=_UTC)
    slot = _make_slot(future, grid_kwh=0.5)
    plan = _make_plan_result([slot])
    runtime = _make_runtime(plan)
    sensor = _make_sensor({"boiler1": runtime})

    spot_prices = _make_spot_prices([_T0, _T1])
    load_forecast = [0.10, 0.20]

    forecast_update_module._apply_boiler_grid_load_overlay(sensor, spot_prices, load_forecast)

    # Forecast unchanged because slot timestamp is outside the spot horizon.
    assert load_forecast == [pytest.approx(0.10), pytest.approx(0.20)]


def test_apply_overlay_spot_prices_shorter_than_load_forecast():
    """spot_prices shorter than load_forecast → no IndexError; extra slots untouched."""
    slot = _make_slot(_T0, grid_kwh=0.30)
    plan = _make_plan_result([slot])
    runtime = _make_runtime(plan)
    sensor = _make_sensor({"boiler1": runtime})

    spot_prices = _make_spot_prices([_T0])          # 1 entry
    load_forecast = [0.10, 0.20, 0.30]              # 3 entries

    forecast_update_module._apply_boiler_grid_load_overlay(sensor, spot_prices, load_forecast)

    assert load_forecast[0] == pytest.approx(0.10 + 0.30)
    assert load_forecast[1] == pytest.approx(0.20)   # untouched
    assert load_forecast[2] == pytest.approx(0.30)   # untouched


def test_apply_overlay_multiple_boilers_summed_in_forecast():
    """Two boilers heating the same slot → their grid_kwh sum is added to load_forecast."""
    slot_a = _make_slot(_T0, grid_kwh=0.20)
    slot_b = _make_slot(_T0, grid_kwh=0.15)
    sensor = _make_sensor(
        {
            "boiler1": _make_runtime(_make_plan_result([slot_a])),
            "boiler2": _make_runtime(_make_plan_result([slot_b])),
        }
    )

    spot_prices = _make_spot_prices([_T0])
    load_forecast = [0.10]

    forecast_update_module._apply_boiler_grid_load_overlay(sensor, spot_prices, load_forecast)

    assert load_forecast[0] == pytest.approx(0.10 + 0.20 + 0.15)


# ---------------------------------------------------------------------------
# No circular import check
# ---------------------------------------------------------------------------


def test_no_circular_import_from_boiler_module():
    """forecast_update must not import any symbol from boiler.* at module level.

    The boiler runtime is accessed only via hass.data duck-typing.
    """
    import sys

    # Ensure the module is already loaded.
    mod_name = "custom_components.oig_cloud.battery_forecast.planning.forecast_update"
    assert mod_name in sys.modules

    fu_module = sys.modules[mod_name]
    # None of the imported module names at the top level of forecast_update should
    # start with the boiler sub-package path.
    boiler_prefix = "custom_components.oig_cloud.boiler"
    for name, value in vars(fu_module).items():
        if hasattr(value, "__module__") and isinstance(getattr(value, "__module__", ""), str):
            assert not value.__module__.startswith(boiler_prefix), (
                f"forecast_update imports {value.__module__}.{name} from boiler.* "
                "— this creates a circular import risk"
            )
