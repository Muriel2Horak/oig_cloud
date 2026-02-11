from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.strategy import hybrid as hybrid_module


class DummyModeDecisionContext:
    pass


def test_hybrid_apply_mode_guard_uses_balancing_override_and_empty_decisions():
    """Test apply_mode_guard returns balancing_override when decisions is empty."""
    class DummyStrategy:
        config = SimpleNamespace(
            min_ups_price_czk=10.0,
            min_ups_duration_intervals=1,
            price_hysteresis_czk=0.0,
            hw_min_hold_hours=0.5,
        )
        sim_config = SimpleNamespace(
            min_capacity_kwh=1.0,
            ac_dc_efficiency=0.0,
            dc_ac_efficiency=0.0,
        )

        def determine_mode_for_interval(self, idx, price, ctx):
            return "HOME_I"

        def simulate(self, **kwargs):
            return SimpleNamespace(battery_end=5.0, grid_import=1.0)

    strategy = DummyStrategy()

    decisions = []
    ctx = DummyModeDecisionContext()
    override_mode, balancing_override = hybrid_module._apply_mode_guard(
        strategy,
        decisions=decisions,
        ctx=ctx,
        override_mode="HOME_I",
    )

    assert override_mode == "balancing_override"
    assert balancing_override == "balancing_override"
    assert decisions == "smoothed"


def test_hybrid_apply_mode_guard_returns_override_mode_from_decisions():
    """Test apply_mode_guard returns override_mode from decisions."""
    class DummyStrategy:
        config = SimpleNamespace(
            min_ups_price_czk=10.0,
            min_ups_duration_intervals=1,
            price_hysteresis_czk=0.0,
            hw_min_hold_hours=0.5,
        )
        sim_config = SimpleNamespace(
            min_capacity_kwh=1.0,
            ac_dc_efficiency=0.0,
            dc_ac_efficiency=0.0,
        )

        def determine_mode_for_interval(self, idx, price, ctx):
            return "HOME_I"

        def simulate(self, **kwargs):
            return SimpleNamespace(battery_end=5.0, grid_import=1.0)

    strategy = DummyStrategy()

    decisions = ["HOME_I", "HOME_II", "BALANCING"]
    ctx = DummyModeDecisionContext()
    override_mode, balancing_override = hybrid_module._apply_mode_guard(
        strategy,
        decisions=decisions,
        ctx=ctx,
        override_mode="HOME_I",
    )

    assert override_mode == "HOME_I"
    assert balancing_override == "balancing_override"
