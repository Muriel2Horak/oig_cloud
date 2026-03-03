"""Boiler Precedence Tests — Task 11

Tests for boiler coordination contract with battery-aware source selection.
Verifies that boiler defers to PV/battery instead of immediately choosing Grid.
"""
from types import SimpleNamespace

from custom_components.oig_cloud.boiler.models import EnergySource
from custom_components.oig_cloud.boiler.planner import BoilerPlanner


def test_boiler_avoids_early_grid_when_battery_or_pv_available():
    """Verifies boiler defers to PV when forecast shows production.

    Scenario:
    - No current overflow
    - Expensive grid price (5.0 CZK/kWh)
    - PV forecast available (3.0 kWh, 0.8 confidence)
    - Expected: Returns FVE (defer to PV), NOT Grid

    This prevents the incident where boiler forced early grid charging
    despite PV production being expected.
    """
    planner = BoilerPlanner(
        hass=SimpleNamespace(),
        slot_minutes=15,
        alt_cost_kwh=3.5,
        has_alternative=False,
    )

    source = planner._recommend_source(
        overflow_available=False,
        spot_price=5.0,
        alt_price=3.5,
        pv_forecast=3.0,
        pv_confidence=0.8,
    )

    assert source != EnergySource.GRID, (
        f"PV-FIRST VIOLATION: Boiler chose Grid at 5.0 CZK/kWh "
        f"when PV forecast (3.0 kWh, 0.8 confidence) was available. "
        f"Should defer to PV instead."
    )
    assert source == EnergySource.FVE, (
        f"Expected FVE source, got {source.value}"
    )


def test_boiler_fallback_to_grid_when_required():
    """Verifies boiler falls back to Grid when no PV/battery available.

    Scenario:
    - No current overflow
    - Expensive grid price (5.0 CZK/kWh)
    - No PV forecast (0.0 kWh, 0.0 confidence)
    - Alternative even more expensive (8.0 CZK/kWh)
    - Expected: Returns Grid (fallback behavior preserved)

    This ensures backward compatibility - Grid is still chosen when
    no better option exists.
    """
    planner = BoilerPlanner(
        hass=SimpleNamespace(),
        slot_minutes=15,
        alt_cost_kwh=8.0,
        has_alternative=True,
    )

    source = planner._recommend_source(
        overflow_available=False,
        spot_price=5.0,
        alt_price=8.0,
        pv_forecast=0.0,
        pv_confidence=0.0,
    )

    assert source == EnergySource.GRID, (
        f"FALLBACK VIOLATION: Boiler chose {source.value} when Grid is "
        f"the only viable option (no PV, alternative more expensive). "
        f"Should fallback to Grid."
    )
