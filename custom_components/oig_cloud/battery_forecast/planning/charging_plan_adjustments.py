"""Charging plan adjustment helpers."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Tuple

from .charging_plan_utils import (
    BOX_FLOOR_DWELL_TRIGGER_MIN,
    FLOOR_DWELL_EPS_PCT,
    FLOOR_DWELL_HYSTERESIS_KWH,
    recalculate_timeline_from_index,
)

if TYPE_CHECKING:
    from .charging_plan import EconomicChargingPlanConfig, PrePeakDecision

_LOGGER = logging.getLogger(__name__)

# Reason code used to mark intervals where the floor-dwell guard inserts a
# controlled pre-charge to prevent the box from autonomously force-charging
# at an uncontrolled price.
REASON_FLOOR_DWELL_GUARD: str = "floor_dwell_guard"

# Maximum iterations for the floor-dwell prevention loop.  Each iteration
# either resolves a dwell or exhausts cheap slots, so convergence is fast in
# practice.  A hard ceiling avoids infinite loops on degenerate inputs.
_FLOOR_DWELL_GUARD_MAX_ITER: int = 10


def fix_minimum_capacity_violations(
    *,
    timeline: List[Dict[str, Any]],
    min_capacity: float,
    max_price: float,
    price_threshold: float,
    charging_power_kw: float,
    max_capacity: float,
    efficiency: float,
    mode_label_home_ups: str,
    mode_label_home_i: str,
) -> List[Dict[str, Any]]:
    """Fix any minimum capacity violations by adding charging."""
    max_iterations = 50
    iteration = 0

    while iteration < max_iterations:
        violation_index = find_first_minimum_violation(timeline, min_capacity)
        if violation_index is None:
            break

        _LOGGER.debug(
            "Found minimum violation at index %s, capacity=%.2fkWh",
            violation_index,
            timeline[violation_index]["battery_capacity_kwh"],
        )

        charging_index = find_cheapest_hour_before(
            timeline, violation_index, max_price, price_threshold
        )

        if charging_index is None:
            _LOGGER.warning("[OIG_CLOUD_WARNING][component=planner][corr=na][run=na] " + "Cannot fix minimum violation at index %s - no suitable charging time found", violation_index,)  # NOSONAR
            break

        charge_kwh = charging_power_kw / 4.0
        old_charge = timeline[charging_index].get("grid_charge_kwh", 0)
        timeline[charging_index]["grid_charge_kwh"] = old_charge + charge_kwh
        if timeline[charging_index].get("reason") == "normal":
            timeline[charging_index]["reason"] = "legacy_violation_fix"

        _LOGGER.debug(
            "Adding %.2fkWh charging at index %s, price=%.2fCZK",
            charge_kwh,
            charging_index,
            timeline[charging_index]["spot_price_czk"],
        )

        recalculate_timeline_from_index(
            timeline,
            charging_index,
            max_capacity=max_capacity,
            min_capacity=min_capacity,
            efficiency=efficiency,
            mode_label_home_ups=mode_label_home_ups,
            mode_label_home_i=mode_label_home_i,
        )
        iteration += 1

    if iteration >= max_iterations:
        _LOGGER.warning("[OIG_CLOUD_WARNING][component=planner][corr=na][run=na] " + "Reached max iterations in minimum capacity fixing")

    return timeline


def ensure_target_capacity_at_end(
    *,
    timeline: List[Dict[str, Any]],
    target_capacity: float,
    max_price: float,
    price_threshold: float,
    charging_power_kw: float,
    max_capacity: float,
    min_capacity: float,
    efficiency: float,
    mode_label_home_ups: str,
    mode_label_home_i: str,
) -> List[Dict[str, Any]]:
    """Ensure target capacity at end of timeline."""
    if not timeline:
        return timeline

    max_iterations = 50
    iteration = 0

    while iteration < max_iterations:
        final_capacity = timeline[-1].get("battery_capacity_kwh", 0)
        if final_capacity >= target_capacity:
            _LOGGER.debug(
                "Target capacity achieved: %.2fkWh >= %.2fkWh",
                final_capacity,
                target_capacity,
            )
            break

        shortage = target_capacity - final_capacity
        _LOGGER.debug("Target capacity shortage: %.2fkWh", shortage)

        charging_index = find_cheapest_suitable_hour(
            timeline, max_price, price_threshold
        )

        if charging_index is None:
            _LOGGER.warning("[OIG_CLOUD_WARNING][component=planner][corr=na][run=na] " + "Cannot achieve target capacity - no suitable charging time found")
            break

        charge_kwh = charging_power_kw / 4.0
        old_charge = timeline[charging_index].get("grid_charge_kwh", 0)
        timeline[charging_index]["grid_charge_kwh"] = old_charge + charge_kwh
        if timeline[charging_index].get("reason") == "normal":
            timeline[charging_index]["reason"] = "legacy_target_ensure"

        _LOGGER.debug(
            "Adding %.2fkWh charging at index %s for target capacity",
            charge_kwh,
            charging_index,
        )

        recalculate_timeline_from_index(
            timeline,
            charging_index,
            max_capacity=max_capacity,
            min_capacity=min_capacity,
            efficiency=efficiency,
            mode_label_home_ups=mode_label_home_ups,
            mode_label_home_i=mode_label_home_i,
        )
        iteration += 1

    if iteration >= max_iterations:
        _LOGGER.warning("[OIG_CLOUD_WARNING][component=planner][corr=na][run=na] " + "Reached max iterations in target capacity ensuring")

    return timeline


def find_first_minimum_violation(
    timeline: List[Dict[str, Any]], min_capacity: float
) -> Optional[int]:
    """Find the first interval where capacity drops below minimum."""
    for i, point in enumerate(timeline):
        if point.get("battery_capacity_kwh", 0) < min_capacity:
            return i
    return None


def find_cheapest_hour_before(
    timeline: List[Dict[str, Any]],
    violation_index: int,
    max_price: float,
    price_threshold: float,
) -> Optional[int]:
    """Find cheapest suitable interval before a violation."""
    candidates = []

    for i in range(violation_index):
        price = timeline[i].get("spot_price_czk", float("inf"))

        if price > max_price:
            continue
        if price > price_threshold:
            continue

        existing_charge = timeline[i].get("grid_charge_kwh", 0)
        if existing_charge > 0:
            continue

        candidates.append((i, price))

    if not candidates:
        return None

    candidates.sort(key=lambda x: x[1])
    return candidates[0][0]


def find_cheapest_suitable_hour(
    timeline: List[Dict[str, Any]],
    max_price: float,
    price_threshold: float,
) -> Optional[int]:
    """Find cheapest suitable interval in entire timeline."""
    candidates = []

    for i, point in enumerate(timeline):
        price = point.get("spot_price_czk", float("inf"))

        if price > max_price:
            continue
        if price > price_threshold:
            continue

        existing_charge = point.get("grid_charge_kwh", 0)
        if existing_charge > 0:
            continue

        candidates.append((i, price))

    if not candidates:
        return None

    candidates.sort(key=lambda x: x[1])
    return candidates[0][0]


def schedule_pre_peak_charging(
    intervals: List[Dict[str, Any]],
    decision: "PrePeakDecision",
    config: "EconomicChargingPlanConfig",
) -> List[Dict[str, Any]]:
    """Post-generation adjustment: přidá grid_charge_kwh do vybraných pre-peak intervalů.

    Vzor: fix_minimum_capacity_violations() v tomto souboru.
    Nemodifikuje intervaly mimo decision.cheapest_intervals.
    Nezdvojuje nabíjení kde grid_charge_kwh > 0.
    """
    # Early return pokud should_charge=False
    if not decision.should_charge:
        return intervals

    # Pro každý index v decision.cheapest_intervals:
    for idx in decision.cheapest_intervals:
        if idx < 0 or idx >= len(intervals):
            continue

        interval = intervals[idx]

        # No-duplicate check
        if interval.get("grid_charge_kwh", 0) > 0:
            _LOGGER.debug(
                "Skipping interval %s — already has economic charging", idx
            )
            continue

        # Nastav charging
        charge_kwh = config.charging_power_kw / 4.0  # 15min interval
        intervals[idx]["grid_charge_kwh"] = charge_kwh
        intervals[idx]["decision_reason"] = f"pre_peak_avoidance: {decision.reason}"

        _LOGGER.debug(
            "Pre-peak charging: %.2fkWh at index %s (price=%.2fCZK)",
            charge_kwh,
            idx,
            interval.get("spot_price_czk", 0),
        )

    # Return modifikované intervals
    return intervals


# ---------------------------------------------------------------------------
# Floor-dwell prevention (Task B)
# ---------------------------------------------------------------------------


def _get_soc(state: Any) -> float:
    """Extract SoC from a SimulatedState or a timeline-dict entry."""
    # SimulatedState dataclass
    soc = getattr(state, "soc_kwh", None)
    if soc is not None:
        return float(soc)
    # Legacy timeline dict
    soc = state.get("battery_capacity_kwh") if isinstance(state, dict) else None
    if soc is not None:
        return float(soc)
    return 0.0


def find_first_floor_dwell(
    states: List[Any],
    floor_kwh: float,
    trigger_min: int,
    hysteresis_kwh: float,
    *,
    interval_minutes: int = 15,
) -> Optional[int]:
    """Find the first index where an unchecked dwell run would exceed the trigger.

    A "dwell" is a consecutive run of intervals where the simulated SoC is at or
    below ``floor_kwh * (1 + FLOOR_DWELL_EPS_PCT)``.  Prevention aims to keep the
    SoC above ``floor_kwh + hysteresis_kwh`` at all times so the box never fires
    autonomous forced-balancing.

    Returns the *start index* of the first dwell run whose length would equal or
    exceed ``trigger_min / interval_minutes`` intervals, or ``None`` when no such
    run exists.

    O(n): single pass — no per-candidate re-simulation.

    Args:
        states: List of SimulatedState objects or timeline dicts.
        floor_kwh: Hardware floor in kWh (``hw_min_kwh`` or proxy value).
        trigger_min: Dwell duration (minutes) after which the box fires (60 min).
        hysteresis_kwh: Extra margin above floor for prevention target.
        interval_minutes: Duration of each interval (default 15).
    """
    trigger_intervals = max(1, trigger_min // interval_minutes)
    # Prevention threshold: SoC must stay *above* this value.
    # We use floor+hysteresis (not floor + eps) for the prevention scan so that
    # the guard fires proactively, leaving room for the ~1-h sim-fidelity drift.
    prevention_threshold = floor_kwh + hysteresis_kwh

    run_start: Optional[int] = None
    run_len: int = 0

    for i, state in enumerate(states):
        soc = _get_soc(state)
        if soc <= prevention_threshold:
            if run_start is None:
                run_start = i
            run_len += 1
            if run_len >= trigger_intervals:
                return run_start
        else:
            run_start = None
            run_len = 0

    return None


def find_cheapest_hour_before_dwell(
    states: List[Any],
    dwell_start: int,
    prices: List[float],
    max_price: float,
    modes: Optional[List[int]] = None,
    home_ups_mode: Optional[int] = None,
) -> Optional[int]:
    """Find the cheapest interval before ``dwell_start`` at which to pre-charge.

    Mirrors :func:`find_cheapest_hour_before` but accepts a list of states (with
    SimulatedState or dict entries) and a separate prices list so it can be used
    from the economic-planner layer directly.

    Selection criteria:
      - Index < dwell_start (must be BEFORE the dwell begins)
      - Price <= max_price (respects the configured price cap)
      - Already HOME_UPS slots are skipped (when modes + home_ups_mode supplied)
        so that the guard loop does not re-select an ineffective slot and stall.
      - Cheapest price wins (tie-break: earliest index)

    Args:
        states: List of SimulatedState objects or timeline dicts (for length).
        dwell_start: Index of the first dwell interval (exclusive upper bound).
        prices: List of prices in Kč/kWh, aligned with states.
        max_price: Upper price cap; intervals above this are skipped.
        modes: Optional current mode list; when provided with home_ups_mode,
            slots already set to HOME_UPS are excluded from candidates.
        home_ups_mode: The integer value of HOME_UPS mode for skip-filtering.
    Returns:
        Index of the cheapest suitable slot, or None when none is found.
    """
    if dwell_start <= 0:
        return None

    best_idx: Optional[int] = None
    best_price: float = float("inf")

    for i in range(dwell_start):
        if i >= len(prices):
            break
        # Skip slots that are already HOME_UPS — re-selecting them is a no-op
        # that causes the guard loop to stall without resolving the dwell.
        if (
            modes is not None
            and home_ups_mode is not None
            and i < len(modes)
            and modes[i] == home_ups_mode
        ):
            continue
        price = prices[i]
        if price > max_price:
            continue
        if price < best_price:
            best_price = price
            best_idx = i

    return best_idx


def fix_floor_dwell_violations(
    *,
    modes: List[int],
    inputs: Any,  # PlannerInputs — imported lazily to avoid circular deps
    simulate_fn: Any,  # _simulate_with_modes_raw callable
    home_ups_mode: int,
    floor_kwh: float,
    hysteresis_kwh: float = FLOOR_DWELL_HYSTERESIS_KWH,
    max_price: float,
    interval_minutes: int = 15,
) -> Tuple[List[int], List[int]]:
    """Prevent floor-dwell violations by inserting controlled pre-charges.

    Operates on the modes list in-place and returns (modes, guard_indices).

    Algorithm (mirrors fix_minimum_capacity_violations pattern):
    1. Simulate the current modes (raw, no dwell injection).
    2. Find the first dwell run that would exceed the trigger.
    3. Find the cheapest slot before the dwell start.
    4. Insert a HOME_UPS pre-charge at that slot (the simulator charges at the
       full charge_rate_per_interval; the loop iterates if more is needed).
    5. Repeat up to _FLOOR_DWELL_GUARD_MAX_ITER times.  Log a warning on
       exhaustion (the plan's truth-layer cost will still reflect the box's
       autonomous charge).

    Performance: O(n) per iteration, O(n·K) total where K ≤ _FLOOR_DWELL_GUARD_MAX_ITER.

    Returns:
        Tuple of (updated modes list, list of inserted guard interval indices).
    """
    from .charging_plan_utils import FLOOR_DWELL_HYSTERESIS_KWH as _HYS  # noqa: F401 (imported for the default above)

    trigger_min = BOX_FLOOR_DWELL_TRIGGER_MIN
    prices = list(inputs.prices)
    guard_indices: List[int] = []

    for iteration in range(_FLOOR_DWELL_GUARD_MAX_ITER):
        states = simulate_fn(modes, inputs)

        dwell_start = find_first_floor_dwell(
            states,
            floor_kwh=floor_kwh,
            trigger_min=trigger_min,
            hysteresis_kwh=hysteresis_kwh,
            interval_minutes=interval_minutes,
        )

        if dwell_start is None:
            break  # No dwell — we're done.

        _LOGGER.debug(
            "[floor_dwell_guard] iteration=%d dwell_start=%d floor_kwh=%.3f hysteresis=%.3f",
            iteration,
            dwell_start,
            floor_kwh,
            hysteresis_kwh,
        )

        # ----------------------------------------------------------------
        # Edge case: dwell is already in progress NOW (dwell_start == 0).
        # The cheapest slot is "right now" — schedule a charge at index 0
        # regardless of price (safety override).
        # ----------------------------------------------------------------
        if dwell_start == 0:
            candidate_idx = 0
            _LOGGER.warning(
                "[OIG_CLOUD_WARNING][component=planner][corr=na][run=na] "
                "[floor_dwell_guard] Dwell already in progress (dwell_start=0); "
                "scheduling immediate charge at interval 0."
            )
        else:
            candidate_idx = find_cheapest_hour_before_dwell(
                states,
                dwell_start=dwell_start,
                prices=prices,
                max_price=max_price,
                modes=modes,
                home_ups_mode=home_ups_mode,
            )

        if candidate_idx is None:
            # No cheap slot before the dwell.  Log and give up — the dwell
            # truth-layer will price the consequence in total_cost.
            _LOGGER.warning(
                "[OIG_CLOUD_WARNING][component=planner][corr=na][run=na] "
                "[floor_dwell_guard] No suitable pre-charge slot found before dwell at index %d. "
                "Dwell cost will be reflected in total_cost.",
                dwell_start,
            )
            break

        # Mark the slot as HOME_UPS (pre-charge).
        modes[candidate_idx] = home_ups_mode
        guard_indices.append(candidate_idx)

        _LOGGER.debug(
            "[floor_dwell_guard] Inserted pre-charge at index=%d price=%.3f",
            candidate_idx,
            prices[candidate_idx] if candidate_idx < len(prices) else 0.0,
        )

    else:
        # Loop exhausted without resolving all dwells.
        _LOGGER.warning(
            "[OIG_CLOUD_WARNING][component=planner][corr=na][run=na] "
            "[floor_dwell_guard] Reached max iterations (%d) without eliminating all floor dwells.",
            _FLOOR_DWELL_GUARD_MAX_ITER,
        )

    return modes, sorted(set(guard_indices))
