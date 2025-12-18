from __future__ import annotations

from datetime import datetime, timedelta

from custom_components.oig_cloud.planner import BalancingInput, OnePlanner, PlanInput, PlannerConfig
from custom_components.oig_cloud.planner.physics import CBB_MODE_HOME_I, CBB_MODE_HOME_UPS


def _make_prices(base: datetime, n: int, price: float) -> list[dict]:
    return [
        {"time": (base + timedelta(minutes=15 * i)).isoformat(), "price": price}
        for i in range(n)
    ]


def test_recover_from_below_planning_min_schedules_earliest_ups() -> None:
    base = datetime(2025, 1, 1, 0, 0, 0)
    spot_prices = _make_prices(base, 6, 5.0)
    export_prices = _make_prices(base, 6, 2.0)

    planner = OnePlanner(
        PlannerConfig(
            planning_min_percent=33.0,
            target_percent=80.0,
            max_ups_price_czk=10.0,
            home_charge_rate_kw=2.8,
            charge_efficiency=0.9,
            discharge_efficiency=0.9,
        )
    )

    out = planner.plan(
        PlanInput(
            now=base,
            current_soc_kwh=3.0,  # below planning min (33% of 15 kWh = 4.95 kWh)
            max_capacity_kwh=15.0,
            hw_min_kwh=3.0,
            spot_prices=spot_prices,
            export_prices=export_prices,
            solar_kwh=[0.0] * 6,
            load_kwh=[0.2] * 6,
            balancing=BalancingInput(),
        )
    )

    assert not out.infeasible
    assert len(out.modes) == 6
    # Needs 4 UPS intervals to recover: each adds 0.7 * 0.9 = 0.63 kWh.
    assert out.modes[:4] == [CBB_MODE_HOME_UPS] * 4
    assert out.modes[4] == CBB_MODE_HOME_I
    assert out.timeline[3]["battery_soc"] >= out.planning_min_kwh - 0.01


def test_recover_from_below_planning_min_respects_max_ups_price() -> None:
    base = datetime(2025, 1, 1, 0, 0, 0)
    spot_prices = [
        {"time": base.isoformat(), "price": 12.0},  # above max
        {"time": (base + timedelta(minutes=15)).isoformat(), "price": 5.0},
    ]
    export_prices = _make_prices(base, 2, 2.0)

    planner = OnePlanner(
        PlannerConfig(
            planning_min_percent=33.0,
            target_percent=80.0,
            max_ups_price_czk=10.0,
            home_charge_rate_kw=2.8,
            charge_efficiency=0.9,
            discharge_efficiency=0.9,
        )
    )

    out = planner.plan(
        PlanInput(
            now=base,
            current_soc_kwh=3.0,
            max_capacity_kwh=15.0,
            hw_min_kwh=3.0,
            spot_prices=spot_prices,
            export_prices=export_prices,
            solar_kwh=[0.0, 0.0],
            load_kwh=[0.2, 0.2],
        )
    )

    assert out.infeasible
