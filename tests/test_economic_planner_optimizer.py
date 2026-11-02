"""The UPS slots come from an optimizer, not from three greedy layers.

Field finding (box 2206237016, autumn 2026): 88 % of the charged energy was
picked by floor defense regardless of price and the economic layer did almost
nothing. On nearly flat prices the plan alternated UPS and Home 1 and discharged
energy that cost more than simply buying direct. These tests pin what replaces
it: for one forecast, the cheapest Home 1 / Home UPS sequence over the horizon,
with the hard minimum intact and a reason for every UPS slot.
"""

from __future__ import annotations

import itertools
import json
import random
from pathlib import Path
from typing import List, Optional

import numpy as np
import pytest

from custom_components.oig_cloud.battery_forecast import economic_planner as ep
from custom_components.oig_cloud.battery_forecast.economic_planner_types import (
    PlannerInputs,
)
from custom_components.oig_cloud.battery_forecast.types import (
    CBBMode,
    DEFAULT_EFFICIENCY,
    MODE_LABEL_HOME_I,
    MODE_LABEL_HOME_UPS,
    TRANSITION_COSTS,
)
from custom_components.oig_cloud.shared.cloud_contract import DETAIL_ENUMS

HOME_1 = CBBMode.HOME_I.value
UPS = CBBMode.HOME_UPS.value

CAPACITY = 15.36
HW_MIN = 0.20 * CAPACITY
FLOOR_PERCENT = 22.0
FLOOR = CAPACITY * FLOOR_PERCENT / 100.0
RATE_KW = 2.6


def _inputs(
    prices: List[float],
    *,
    solar: Optional[List[float]] = None,
    load: Optional[List[float]] = None,
    soc: float = 8.0,
    capacity: float = CAPACITY,
    hw_min: float = HW_MIN,
    floor_percent: float = FLOOR_PERCENT,
    rate_kw: float = RATE_KW,
    export_prices: Optional[List[float]] = None,
    current_mode: Optional[int] = None,
    wear: float = 0.0,
) -> PlannerInputs:
    n = len(prices)
    return PlannerInputs(
        current_soc_kwh=soc,
        max_capacity_kwh=capacity,
        hw_min_kwh=hw_min,
        planning_min_percent=floor_percent,
        charge_rate_kw=rate_kw,
        intervals=[{"index": i} for i in range(n)],
        prices=prices,
        solar_forecast=solar if solar is not None else [0.0] * n,
        load_forecast=load if load is not None else [0.25] * n,
        export_prices=export_prices,
        current_mode=current_mode,
        battery_wear_czk_per_kwh=wear,
    )


def _ups(modes: List[int]) -> List[int]:
    return [i for i, mode in enumerate(modes) if mode == UPS]


def _switches(modes: List[int]) -> int:
    return sum(1 for a, b in zip(modes, modes[1:]) if a != b)


def _start_soc(inputs: PlannerInputs) -> float:
    return max(inputs.hw_min_kwh, min(inputs.current_soc_kwh, inputs.max_capacity_kwh))


def _discharged(result, inputs: PlannerInputs) -> float:
    soc = _start_soc(inputs)
    total = 0.0
    for state in result.states:
        total += max(0.0, soc - state.soc_kwh)
        soc = state.soc_kwh
    return total


def _objective(modes: List[int], inputs: PlannerInputs) -> Optional[float]:
    """The optimizer's own objective, rebuilt from ``_simulate_interval`` alone.

    Returns None for a sequence that breaks the hard minimum: Home 1 may not end
    a slot below it.
    """
    soc = _start_soc(inputs)
    floor = inputs.planning_min_kwh
    previous = inputs.current_mode
    total = 0.0
    for i, mode in enumerate(modes):
        price = inputs.prices[i]
        new_soc, grid_import, grid_export, _ = ep._simulate_interval(
            soc, inputs.solar_forecast[i], inputs.load_forecast[i], price, inputs, mode
        )
        if mode == HOME_1 and new_soc < floor - 1e-9:
            return None
        export_price = inputs.export_prices[i] if inputs.export_prices else 0.0
        total += grid_import * price - grid_export * export_price
        total += inputs.battery_wear_czk_per_kwh * max(0.0, soc - new_soc)
        if previous is not None:
            total += ep._switch_cost(previous, mode, price)
        soc = new_soc
        previous = mode
    return total - ep._stored_energy_value(inputs) * soc


def _random_inputs(seed: int, *, n: int) -> PlannerInputs:
    rng = random.Random(seed)
    capacity = rng.choice([6.0, 10.24, 15.36])
    hw_min = 0.20 * capacity
    floor_percent = rng.choice([20.0, 22.0, 33.0])
    tiers = rng.choice([(1.0, 12.0), (7.5, 9.5), (2.0, 5.0), (8.0, 8.0)])
    prices = [round(rng.uniform(*tiers), 2) for _ in range(n)]
    load = [round(rng.uniform(0.0, 1.2), 3) for _ in range(n)]
    solar = (
        [round(rng.uniform(0.0, 2.0), 3) for _ in range(n)]
        if rng.random() < 0.5
        else [0.0] * n
    )
    export_prices = (
        [round(rng.uniform(-1.0, 3.0), 2) for _ in range(n)]
        if rng.random() < 0.5
        else None
    )
    return _inputs(
        prices,
        solar=solar,
        load=load,
        soc=rng.uniform(hw_min, capacity),
        capacity=capacity,
        hw_min=hw_min,
        floor_percent=floor_percent,
        rate_kw=rng.choice([1.5, 2.6, 4.0]),
        export_prices=export_prices,
        current_mode=rng.choice([None, HOME_1, UPS]),
        wear=rng.choice([0.0, 0.5]),
    )


# --------------------------------------------------------------------------
# the physics stays the planner's own
# --------------------------------------------------------------------------


@pytest.mark.parametrize("mode", [HOME_1, UPS])
@pytest.mark.parametrize("seed", range(40))
def test_array_physics_is_identical_to_simulate_interval(seed: int, mode: int) -> None:
    """The backward pass needs the step as arrays. Any divergence from
    ``_simulate_interval`` would plan one battery and report another."""
    rng = random.Random(seed)
    capacity = rng.choice([6.0, 10.24, 15.36])
    hw_min = rng.choice([0.0, 0.20 * capacity])
    inputs = _inputs(
        [5.0],
        capacity=capacity,
        hw_min=hw_min,
        soc=capacity,
        floor_percent=100.0 * hw_min / capacity,
        rate_kw=rng.choice([0.5, 2.6, 8.0]),
    )
    solar = rng.choice([0.0, rng.uniform(0.0, 3.0)])
    load = rng.choice([0.0, rng.uniform(0.0, 3.0)])
    socs = np.array(
        [hw_min, capacity] + [rng.uniform(hw_min, capacity) for _ in range(50)]
    )

    new_soc, grid_import, grid_export = ep._simulate_interval_array(
        socs, solar, load, inputs, mode
    )

    for i, soc in enumerate(socs):
        expected = ep._simulate_interval(float(soc), solar, load, 5.0, inputs, mode)
        assert new_soc[i] == pytest.approx(expected[0], abs=1e-12)
        assert grid_import[i] == pytest.approx(expected[1], abs=1e-12)
        assert grid_export[i] == pytest.approx(expected[2], abs=1e-12)


def test_reported_states_are_the_planners_own_simulation() -> None:
    inputs = _random_inputs(3, n=96)
    result = ep.plan_battery_schedule(inputs)

    assert result.states == ep._simulate_with_modes(result.modes, inputs)
    assert result.total_cost == pytest.approx(sum(s.cost_czk for s in result.states))


# --------------------------------------------------------------------------
# it really is the cheapest sequence
# --------------------------------------------------------------------------


def test_short_horizon_plan_matches_brute_force() -> None:
    """Over nine slots every sequence can be tried, and the plan must be as cheap
    as the best of them.

    Up to the SoC grid: the hard minimum makes the worth of a SoC level jump, and
    interpolating across a jump can misjudge a slot by a crown or two. It is rare,
    a rerun fifteen minutes later starts from the real SoC again, and a finer grid
    does not improve the replayed year.
    """
    gaps = []
    for seed in range(60):
        inputs = _random_inputs(seed, n=9)
        best = min(
            cost
            for cost in (
                _objective(list(modes), inputs)
                for modes in itertools.product((HOME_1, UPS), repeat=9)
            )
            if cost is not None
        )
        planned = _objective(ep.plan_battery_schedule(inputs).modes, inputs)
        assert planned is not None
        gaps.append(planned - best)

    assert min(gaps) >= -1e-9, "the plan beat every sequence: objective mismatch"
    assert sum(gap < 1e-6 for gap in gaps) >= 0.9 * len(gaps), gaps
    assert max(gaps) < 1.5, gaps


@pytest.mark.parametrize("seed", range(10))
def test_long_horizon_plan_beats_every_price_threshold_policy(seed: int) -> None:
    """Too long to enumerate, so compare with the simple rule the field analysis
    found to be 1 500 CZK a year dearer: UPS below a price, Home 1 above it,
    with UPS forced whenever Home 1 would break the minimum."""
    inputs = _random_inputs(100 + seed, n=144)
    planned = _objective(ep.plan_battery_schedule(inputs).modes, inputs)
    assert planned is not None

    for threshold in sorted(set(inputs.prices))[::6]:
        modes: List[int] = []
        soc = _start_soc(inputs)
        for i, price in enumerate(inputs.prices):
            mode = UPS if price <= threshold else HOME_1
            step = ep._simulate_interval(
                soc, inputs.solar_forecast[i], inputs.load_forecast[i], price, inputs, mode
            )
            if mode == HOME_1 and step[0] < inputs.planning_min_kwh - 1e-9:
                mode = UPS
                step = ep._simulate_interval(
                    soc,
                    inputs.solar_forecast[i],
                    inputs.load_forecast[i],
                    price,
                    inputs,
                    mode,
                )
            modes.append(mode)
            soc = step[0]
        rule = _objective(modes, inputs)
        assert rule is not None
        assert planned <= rule + 0.05, f"threshold {threshold}: {planned} vs {rule}"


# --------------------------------------------------------------------------
# the hard minimum
# --------------------------------------------------------------------------


@pytest.mark.parametrize("seed", range(25))
def test_plan_never_goes_below_the_hard_minimum(seed: int) -> None:
    inputs = _random_inputs(200 + seed, n=144)
    result = ep.plan_battery_schedule(inputs)

    soc = _start_soc(inputs)
    for state in result.states:
        assert state.soc_kwh >= min(inputs.planning_min_kwh, soc) - 1e-9
        soc = state.soc_kwh


def test_minimum_is_defended_even_when_every_slot_is_expensive() -> None:
    inputs = _inputs([20.0] * 48, load=[0.5] * 48, soc=FLOOR + 0.3)
    result = ep.plan_battery_schedule(inputs)

    assert _ups(result.modes)
    assert min(s.soc_kwh for s in result.states) >= FLOOR - 1e-9


def test_battery_below_the_minimum_recovers_at_once() -> None:
    """Below the floor at any price: Home 1 would only take it lower."""
    inputs = _inputs([20.0] * 8, load=[0.3] * 8, soc=HW_MIN + 0.05)
    result = ep.plan_battery_schedule(inputs)

    assert result.modes[0] == UPS
    assert result.states[0].soc_kwh > HW_MIN + 0.05


def test_solar_that_clears_the_minimum_at_once_needs_no_grid() -> None:
    inputs = _inputs([9.0] * 8, solar=[2.0] * 8, load=[0.3] * 8, soc=HW_MIN + 0.05)
    assert ep.plan_battery_schedule(inputs).modes == [HOME_1] * 8


def test_solar_too_weak_to_clear_the_minimum_does_not_excuse_lingering() -> None:
    """The field replay: a morning forecast of a small surplus left the battery
    at the trigger for an hour, and the box force-charged it to 80 %."""
    inputs = _inputs([9.0] * 8, solar=[0.35] * 8, load=[0.3] * 8, soc=HW_MIN + 0.05)
    result = ep.plan_battery_schedule(inputs)

    assert result.modes[0] == UPS
    assert result.states[0].soc_kwh >= HW_MIN + 0.05 + 0.5


def test_battery_below_the_minimum_recovers_with_nothing_draining_it() -> None:
    inputs = _inputs([8.0] * 4, load=[0.0] * 4, soc=HW_MIN + 0.05)
    result, trace = _trace(inputs)

    assert result.modes[0] == UPS
    assert _reason_of(trace, 0) == ep.REASON_FLOOR_RECOVERY


# --------------------------------------------------------------------------
# energy left at the end of the horizon is worth something
# --------------------------------------------------------------------------


def test_stored_energy_value_is_what_it_saves_later() -> None:
    """A stored kWh later replaces 0.882 kWh of purchase at a typical price and
    pays the wear of taking it out. Never negative."""
    prices = [3.0, 7.0, 8.0, 9.0, 20.0]
    assert ep._stored_energy_value(_inputs(prices)) == pytest.approx(
        DEFAULT_EFFICIENCY * 8.0
    )
    assert ep._stored_energy_value(_inputs(prices, wear=0.5)) == pytest.approx(
        DEFAULT_EFFICIENCY * 8.0 - 0.5
    )
    assert ep._stored_energy_value(_inputs([0.1] * 5, wear=5.0)) == 0.0


def test_battery_is_not_dumped_into_the_last_cheap_slots() -> None:
    """Without a value on the energy left at the end, the cheapest finish is an
    empty battery, whatever the last slots cost."""
    prices = [9.0] * 40 + [5.0] * 8
    inputs = _inputs(prices, soc=CAPACITY, load=[0.3] * 48)
    result = ep.plan_battery_schedule(inputs)

    assert result.modes[-8:] == [UPS] * 8
    assert result.states[-1].soc_kwh > result.states[39].soc_kwh


def test_flat_prices_do_not_cycle_the_battery() -> None:
    result = ep.plan_battery_schedule(_inputs([8.0] * 48, load=[0.1] * 48, soc=9.0))
    assert _ups(result.modes) == []


# --------------------------------------------------------------------------
# room for the sun
# --------------------------------------------------------------------------


def test_cheap_night_does_not_take_the_room_the_sun_will_fill() -> None:
    night, day, evening = 24, 40, 32
    prices = [3.0] * night + [6.0] * day + [12.0] * evening
    solar = [0.0] * night + [1.6] * day + [0.0] * evening
    load = [0.2] * 96
    inputs = _inputs(prices, solar=solar, load=load, soc=10.0)

    result = ep.plan_battery_schedule(inputs)

    assert _ups(result.modes) == [], (
        "the night charge would only push the day's solar out to the grid; "
        f"UPS at {_ups(result.modes)}"
    )


def test_a_full_battery_before_the_sun_is_used_up_first() -> None:
    """Holding a full battery into a large surplus throws the surplus away."""
    n = 40
    prices = [7.0] * n
    solar = [0.0] * 12 + [2.5] * 16 + [0.0] * 12
    load = [0.3] * n
    inputs = _inputs(prices, solar=solar, load=load, soc=CAPACITY)

    result = ep.plan_battery_schedule(inputs)

    assert all(result.modes[i] == HOME_1 for i in range(12))
    assert result.states[11].soc_kwh < CAPACITY - 1.0


def test_export_earnings_can_beat_making_room_for_the_sun() -> None:
    """Buying at 2 CZK while the sun sells at 4: keep the battery full and export.
    With export worth nothing the same plan empties the battery to catch the sun."""
    n = 24
    prices = [2.0] * 8 + [9.0] * 16
    solar = [0.0] * 8 + [2.0] * 8 + [0.0] * 8
    load = [0.3] * n
    export = [4.0] * n
    kwargs = dict(solar=solar, load=load, soc=CAPACITY)

    worthless = ep.plan_battery_schedule(_inputs(prices, **kwargs))
    priced = ep.plan_battery_schedule(_inputs(prices, export_prices=export, **kwargs))

    def exported(result) -> float:
        return sum(s.grid_export_kwh for s in result.states[8:16])

    assert worthless.modes[:8] == [HOME_1] * 8
    assert priced.modes[:8] == [UPS] * 8
    assert exported(priced) > exported(worthless)


def test_export_prices_must_cover_the_horizon() -> None:
    with pytest.raises(ValueError, match="Forecast lengths"):
        _inputs([5.0, 5.0], export_prices=[1.0])


@pytest.mark.parametrize("wear", [-0.1, float("nan"), float("inf")])
def test_wear_must_be_a_real_cost(wear: float) -> None:
    """NaN would otherwise pass any range check and pick UPS for every slot."""
    with pytest.raises(ValueError, match="wear"):
        _inputs([5.0], wear=wear)


# --------------------------------------------------------------------------
# the field day
# --------------------------------------------------------------------------


def _real_day(*, wear: float = 0.0, current_mode: Optional[int] = None):
    data = json.loads(
        (Path(__file__).parent / "data" / "planner_day_2026_11_01.json").read_text()
    )
    inputs = _inputs(
        data["prices"],
        solar=data["solar_kwh"],
        load=data["load_kwh"],
        soc=data["soc_start_kwh"],
        capacity=data["capacity_kwh"],
        hw_min=data["hw_min_kwh"],
        floor_percent=data["planning_min_percent"],
        rate_kw=data["charge_rate_kw"],
        wear=wear,
        current_mode=current_mode,
    )
    return inputs, data


def test_real_flat_day_beats_the_plan_the_box_was_given() -> None:
    """1. 11. 2026, prices 8.05-11.73 CZK. The deployed layers discharged
    19.6 kWh and switched 20 times to save money that was not there."""
    inputs, data = _real_day()
    deployed = data["deployed_modes"]
    assert _objective(deployed, inputs) is not None

    result = ep.plan_battery_schedule(inputs)
    deployed_states = ep._simulate_with_modes(deployed, inputs)
    deployed_discharged = _discharged(
        type("R", (), {"states": deployed_states}), inputs
    )

    assert deployed_discharged == pytest.approx(19.6, abs=0.1)
    assert _switches(deployed) == 20
    assert _objective(result.modes, inputs) < _objective(deployed, inputs) - 3.0
    assert _discharged(result, inputs) < deployed_discharged - 3.0
    assert _switches(result.modes) < _switches(deployed)


def test_real_flat_day_keeps_the_battery_for_the_evening_peak() -> None:
    """16:00-21:00 is the only stretch that clearly beats buying direct."""
    inputs, _ = _real_day()
    result = ep.plan_battery_schedule(inputs)

    # The horizon starts at 22:15 of the previous day.
    peak = range(71, 91)  # 16:00-21:00 on 1. 11.
    assert all(result.modes[i] == HOME_1 for i in peak)


# --------------------------------------------------------------------------
# small penalty on switching
# --------------------------------------------------------------------------


def test_switch_cost_comes_from_the_transition_table() -> None:
    to_ups = TRANSITION_COSTS[(MODE_LABEL_HOME_I, MODE_LABEL_HOME_UPS)]["energy_loss_kwh"]
    to_home = TRANSITION_COSTS[(MODE_LABEL_HOME_UPS, MODE_LABEL_HOME_I)]["energy_loss_kwh"]

    assert ep._switch_cost(HOME_1, UPS, 8.0) == pytest.approx(to_ups * 8.0)
    assert ep._switch_cost(UPS, HOME_1, 8.0) == pytest.approx(to_home * 8.0)
    assert ep._switch_cost(UPS, UPS, 8.0) == 0.0
    assert ep._switch_cost(HOME_1, HOME_1, 8.0) == 0.0
    # A negative price is not a reward for switching.
    assert ep._switch_cost(HOME_1, UPS, -3.0) == 0.0


def test_near_flat_prices_do_not_chatter() -> None:
    """The saw-tooth that the field plan followed: real but tiny differences."""
    prices = [8.0, 8.3] * 48
    inputs = _inputs(prices, soc=CAPACITY, load=[0.2] * 96)
    result = ep.plan_battery_schedule(inputs)

    assert _switches(result.modes) <= 2, result.modes


def test_close_call_stays_in_the_mode_the_box_is_in() -> None:
    """Flat prices on a full battery: UPS and Home 1 cost the same. Whichever
    the box is in stays, so that a rerun does not flip it for nothing."""
    prices = [8.0] * 8
    stay_ups = ep.plan_battery_schedule(
        _inputs(prices, soc=CAPACITY, current_mode=UPS)
    )
    stay_home = ep.plan_battery_schedule(
        _inputs(prices, soc=CAPACITY, current_mode=HOME_1)
    )

    assert stay_ups.modes[0] == UPS
    assert stay_home.modes[0] == HOME_1


def test_other_box_modes_carry_no_switch_cost() -> None:
    """Home 2/3 must be left anyway, so neither action pays for it."""
    inputs = _inputs([8.0] * 8, soc=CAPACITY, current_mode=CBBMode.HOME_III.value)
    assert ep.plan_battery_schedule(inputs).modes[0] == HOME_1


# --------------------------------------------------------------------------
# wear
# --------------------------------------------------------------------------


def test_wear_stops_arbitrage_that_does_not_pay_for_it() -> None:
    """Spread 6.0 -> 7.5 CZK pays the round trip (6.0 / 0.838 = 7.16) but not
    0.50 CZK/kWh of wear on top of it."""
    prices = [6.0] * 16 + [7.5] * 16
    load = [0.0] * 16 + [0.5] * 16
    # The minimum on the hardware floor: nothing forces a purchase here, so
    # whatever is bought is bought for the spread.
    kwargs = dict(load=load, soc=8.0, floor_percent=20.0)

    free = ep.plan_battery_schedule(_inputs(prices, **kwargs))
    worn = ep.plan_battery_schedule(_inputs(prices, wear=0.5, **kwargs))

    def bought(result) -> float:
        return sum(s.grid_import_kwh for s in result.states[:16])

    assert bought(free) > 1.0
    assert bought(worn) == 0.0


def test_wear_lowers_throughput_where_the_purchase_was_marginal() -> None:
    """On the real flat day the peak pays for the night charge, but not for much
    wear on top of it. With the minimum at 22 % the plan has to hold the battery
    anyway, so this looks at the case where it does not."""
    discharged = []
    for wear in (0.0, 0.5, 2.0):
        inputs, _ = _real_day(wear=wear)
        inputs.planning_min_percent = 100.0 * inputs.hw_min_kwh / inputs.max_capacity_kwh
        discharged.append(_discharged(ep.plan_battery_schedule(inputs), inputs))

    assert discharged[0] >= discharged[1] >= discharged[2]
    assert discharged[2] < discharged[0]


# --------------------------------------------------------------------------
# every UPS slot says why
# --------------------------------------------------------------------------


def _trace(inputs: PlannerInputs):
    result = ep.plan_battery_schedule(inputs)
    return result, ep.build_planner_decision_trace(result.decisions, inputs)


def _reason_of(trace, slot: int) -> str:
    entries = [e for e in trace if slot in e["charge_intervals"]]
    assert len(entries) == 1, f"slot {slot} traced {len(entries)} times"
    return entries[0]["reason"]


@pytest.mark.parametrize("seed", range(25))
def test_every_ups_slot_has_exactly_one_reason(seed: int) -> None:
    inputs = _random_inputs(300 + seed, n=144)
    result, trace = _trace(inputs)

    traced = sorted(slot for entry in trace for slot in entry["charge_intervals"])

    assert traced == _ups(result.modes)
    allowed = {
        ep.REASON_FLOOR_RECOVERY,
        ep.REASON_FLOOR_DEFENSE,
        ep.REASON_PRICE_SPREAD,
        ep.REASON_HOLD_FOR_LATER,
        ep.REASON_END_OF_HORIZON,
        ep.REASON_SWITCH_NOT_WORTH_IT,
    }
    assert {entry["reason"] for entry in trace} <= allowed
    assert all(entry["action"] in ("charge", "hold") for entry in trace)


def test_real_day_is_not_one_reason_any_more() -> None:
    inputs, _ = _real_day()
    _, trace = _trace(inputs)

    assert "GLOBAL_GREEDY" not in {entry["reason"] for entry in trace}
    assert len({entry["reason"] for entry in trace}) >= 2


def test_reasons_reach_telemetry_without_a_contract_change() -> None:
    for reason in (
        ep.REASON_FLOOR_RECOVERY,
        ep.REASON_FLOOR_DEFENSE,
        ep.REASON_PRICE_SPREAD,
        ep.REASON_HOLD_FOR_LATER,
        ep.REASON_END_OF_HORIZON,
        ep.REASON_SWITCH_NOT_WORTH_IT,
    ):
        assert reason.lower() in DETAIL_ENUMS["detail_reason"]


def test_reason_flat_prices_only_the_minimum_can_justify_charging() -> None:
    """No price spread at all: without the floor nobody would charge."""
    inputs = _inputs([8.0] * 48, load=[0.5] * 48, soc=FLOOR + 0.3)
    result, trace = _trace(inputs)

    assert _ups(result.modes)
    assert {entry["reason"] for entry in trace} == {ep.REASON_FLOOR_DEFENSE}


def test_reason_battery_already_below_the_minimum() -> None:
    inputs = _inputs([8.0] * 8, load=[0.3] * 8, soc=HW_MIN + 0.05)
    _, trace = _trace(inputs)

    assert _reason_of(trace, 0) == ep.REASON_FLOOR_RECOVERY


def test_reason_cheap_night_for_an_expensive_morning() -> None:
    prices = [2.0] * 24 + [12.0] * 24
    inputs = _inputs(prices, load=[0.4] * 48, soc=6.0)
    result, trace = _trace(inputs)

    assert all(i < 24 for i in _ups(result.modes))
    economic = [e for e in trace if e["reason"] == ep.REASON_PRICE_SPREAD]
    assert economic
    assert economic[0]["action"] == "charge"
    # It names the expensive slot the energy is bought for, and what it paid.
    assert economic[0]["interval_idx"] >= 24
    assert economic[0]["served_price_czk"] == pytest.approx(12.0)
    assert economic[0]["slot_price_czk"] == pytest.approx(2.0)
    assert economic[0]["grid_charge_kwh"] > 0.0


def test_reason_full_battery_waiting_for_the_peak() -> None:
    prices = [6.0] * 24 + [14.0] * 12
    # The peak wants more than the battery holds, so every stored kWh is spoken for.
    inputs = _inputs(prices, soc=CAPACITY, load=[0.5] * 24 + [0.93] * 12)
    result, trace = _trace(inputs)

    assert result.modes[:24] == [UPS] * 24
    assert {_reason_of(trace, slot) for slot in range(24)} == {ep.REASON_HOLD_FOR_LATER}
    held = next(e for e in trace if 0 in e["charge_intervals"])
    assert held["action"] == "hold"
    assert held["grid_charge_kwh"] == 0.0
    assert held["served_price_czk"] == pytest.approx(14.0)


def test_reason_energy_bought_for_after_the_horizon() -> None:
    """Nothing later in the plan uses it; only its value at the end justifies
    the purchase."""
    prices = [9.0] * 40 + [3.0] * 8
    inputs = _inputs(prices, soc=CAPACITY, load=[0.1] * 48)
    result, trace = _trace(inputs)

    assert 47 in _ups(result.modes)
    assert _reason_of(trace, 47) == ep.REASON_END_OF_HORIZON


def test_reason_ups_kept_only_because_switching_costs_more() -> None:
    inputs = _inputs([8.0] * 8, soc=CAPACITY, current_mode=UPS)
    result, trace = _trace(inputs)

    assert result.modes[0] == UPS
    assert _reason_of(trace, 0) == ep.REASON_SWITCH_NOT_WORTH_IT


def test_reason_short_peak_inside_a_ups_run_is_not_a_purchase() -> None:
    """Slot 6 is dear enough that Home 1 would be cheaper there, by less than
    what leaving UPS and coming back costs. Home 1's cost already includes the
    way back, so comparing the two modes directly does not show it."""
    prices = [4.0] * 6 + [10.7] + [4.0] * 6 + [12.0] * 24
    inputs = _inputs(prices, load=[0.3] * len(prices), soc=6.0)
    result, trace = _trace(inputs)

    assert result.modes[6] == UPS
    assert _reason_of(trace, 6) == ep.REASON_SWITCH_NOT_WORTH_IT


def test_trace_says_what_home_1_would_have_cost() -> None:
    prices = [2.0] * 24 + [12.0] * 24
    inputs = _inputs(prices, load=[0.4] * 48, soc=6.0)
    _, trace = _trace(inputs)

    economic = next(e for e in trace if e["reason"] == ep.REASON_PRICE_SPREAD)
    assert economic["home1_extra_cost_czk"] > 0.0


def test_trace_marks_home_1_impossible_when_it_breaks_the_minimum() -> None:
    inputs = _inputs([8.0] * 8, load=[0.3] * 8, soc=HW_MIN + 0.05)
    _, trace = _trace(inputs)

    assert trace[0]["home1_extra_cost_czk"] is None


def test_trace_fits_a_recorded_attribute() -> None:
    """The trace is published as a sensor attribute and the recorder drops all
    attributes of a state above 16 KiB. A plan can hold UPS for most of a 144
    slot horizon, so one entry per slot would not fit. The largest trace in a
    replayed year was 8 kB; the busy case here is far beyond any real price day
    and still leaves room for the sensor's other attributes."""
    long_hold = _inputs([6.0] * 120 + [14.0] * 24, soc=CAPACITY, load=[0.5] * 144)
    busy = _inputs(
        [2.0, 2.0, 2.0, 2.0, 14.0, 14.0, 14.0, 14.0] * 18,
        soc=6.0,
        load=[0.8] * 144,
    )

    assert len(json.dumps(_trace(long_hold)[1])) < 2048
    assert len(json.dumps(_trace(busy)[1])) < 12288


def test_unusable_price_falls_back_to_home_1_instead_of_ups_for_everything() -> None:
    result = ep.plan_battery_schedule(_inputs([8.0, float("nan"), 8.0]))

    assert result.modes == [HOME_1] * 3
    assert result.decisions == []


def test_unusable_export_price_falls_back_too() -> None:
    result = ep.plan_battery_schedule(
        _inputs([8.0, 8.0], export_prices=[float("nan"), 1.0], soc=CAPACITY)
    )

    assert result.modes == [HOME_1] * 2
    assert result.decisions == []


def test_empty_horizon_plans_nothing() -> None:
    result = ep.plan_battery_schedule(_inputs([]))

    assert result.modes == []
    assert result.states == []
    assert result.decisions == []


# --------------------------------------------------------------------------
# it runs in the event loop
# --------------------------------------------------------------------------


def test_full_horizon_plans_within_the_event_loop_budget() -> None:
    """``_run_planner`` is called directly from ``async_update``. The old layers
    took about 10 ms; a pure Python backward pass over every grid point would
    take hundreds of milliseconds on the box's J4125."""
    import time

    inputs = _random_inputs(7, n=144)
    started = time.perf_counter()
    for _ in range(5):
        ep.plan_battery_schedule(inputs)
    elapsed = (time.perf_counter() - started) / 5

    assert elapsed < 0.25, f"one plan took {elapsed * 1000:.0f} ms"


def test_stored_energy_is_not_worth_more_than_buying_it_again_at_the_end():
    """Regression: an expensive day's median valued energy that a cheap night refills,
    so the plan held the battery instead of going down and recharging."""
    prices = [12.0] * 60 + [8.5] * 16

    value = ep._stored_energy_value(_inputs(prices))

    assert value == pytest.approx(8.5 / ep.DEFAULT_CHARGE_EFFICIENCY)


def test_stored_energy_keeps_its_later_use_value_when_the_plan_ends_expensive():
    prices = [8.5] * 60 + [12.0] * 16

    value = ep._stored_energy_value(_inputs(prices))

    assert value == pytest.approx(ep.DEFAULT_EFFICIENCY * 8.5)


def test_plan_goes_down_through_expensive_hours_when_the_end_is_cheap():
    """A kWh served at 11 Kc needs 1.13 kWh from the battery, refilled at the end for
    less than it saves. The old value held the battery full through those hours."""
    prices = [11.0] * 40 + [12.0] * 40 + [8.0] * 16
    inputs = _inputs(prices)

    result = ep.plan_battery_schedule(inputs)

    assert 0 in result.modes[:40]


def test_result_names_what_home_1_costs_only_on_ups_slots():
    result = ep.plan_battery_schedule(_inputs([12.0] * 40 + [8.0] * 16))

    assert len(result.home1_extra_costs) == len(result.modes)
    for mode, extra_cost in zip(result.modes, result.home1_extra_costs):
        if mode != 3:
            assert extra_cost is None
