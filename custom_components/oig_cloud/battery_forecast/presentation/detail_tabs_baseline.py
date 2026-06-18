"""Do-nothing (HOME I) baseline cost for a detail tab.

Estimates what a day would cost WITHOUT smart grid-charging: simulate plain
HOME I self-consume from the REAL starting battery SoC, using actual (or
planned-fallback) load/solar/price per interval. Compared against the day's
actual net cost this yields the realised savings of the active control.

This intentionally does NOT reuse the stored "baseline plan" (which is an
idealised projection assuming the battery covers everything → ~0 import); it
re-simulates from the real starting SoC so the comparison is meaningful.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

from ...const import HOME_I
from ...physics import simulate_interval
from ..economic_planner_types import DEFAULT_ROUND_TRIP_EFFICIENCY

# Single-direction efficiency consistent with the planner cost simulation.
_DIRECTIONAL_EFF = math.sqrt(DEFAULT_ROUND_TRIP_EFFICIENCY)
_HW_MIN_FRACTION = 0.20
# Max grid draw per 15 min treated as the inverter's irreducible trickle
# (≈240 W continuous) when crediting the do-nothing baseline.
_TRICKLE_CAP_KWH_15MIN = 0.06
# Sim vs actual battery level gap below which the trajectories are considered
# converged (no outstanding control divergence) and the sim re-syncs.
_SOC_SYNC_TOLERANCE_KWH = 0.8


def _branch_value(
    interval: Dict[str, Any], branch: str, *keys: str
) -> Optional[float]:
    payload = interval.get(branch)
    if not isinstance(payload, dict):
        return None
    for key in keys:
        value = payload.get(key)
        if isinstance(value, (int, float)):
            return float(value)
    return None


def _coalesce(*values: Optional[float]) -> Optional[float]:
    for value in values:
        if value is not None:
            return value
    return None


def _as_kwh(raw: Optional[float], capacity: float) -> Optional[float]:
    """Interpret a SoC reading as kWh (values above capacity are treated as %)."""
    if raw is None or raw <= 0 or capacity <= 0:
        return None
    if raw <= capacity + 0.01:
        return min(capacity, raw)
    return min(capacity, (raw / 100.0) * capacity)


def _starting_soc_kwh(
    intervals: List[Dict[str, Any]], capacity: float
) -> Optional[float]:
    for interval in intervals:
        soc = _as_kwh(_branch_value(interval, "actual", "battery_kwh"), capacity)
        if soc is not None:
            return soc
        soc = _as_kwh(_branch_value(interval, "actual", "battery_soc"), capacity)
        if soc is not None:
            return soc
        soc = _as_kwh(
            _branch_value(interval, "planned", "battery_kwh", "battery_soc"),
            capacity,
        )
        if soc is not None:
            return soc
    return None


def compute_do_nothing_baseline(
    sensor: Any, intervals: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """Fair "what if we did nothing" comparison over the ELAPSED window.

    Compares, over the intervals that actually happened (00:00→now for today,
    the whole day for yesterday), with the SAME real starting SoC:
      - baseline = plain HOME I self-consume (no smart grid-charging)
      - actual   = what the box really did
    and credits the end-of-window battery SoC delta at the window's average
    price (mark-to-market), so grid-charging that fills the battery for a later
    day is not counted as a same-day "loss".

    savings = baseline_cost - actual_cost + battery_value_delta
      (positive => the active control saved money vs doing nothing).

    Returns None when there is no actual data yet or inputs are insufficient.
    """
    if not intervals:
        return None

    elapsed = [iv for iv in intervals if isinstance(iv.get("actual"), dict) and iv["actual"]]
    if not elapsed:
        return None

    try:
        capacity = float(sensor._get_total_battery_capacity() or 0.0)
    except Exception:  # pragma: no cover - defensive
        capacity = 0.0
    if capacity <= 0:
        return None

    hw_min = capacity * _HW_MIN_FRACTION
    start_soc = _starting_soc_kwh(elapsed, capacity)
    if start_soc is None:
        return None

    soc = start_soc
    baseline_cost = 0.0
    actual_cost = 0.0
    price_sum = 0.0
    price_n = 0
    soc_actual_end: Optional[float] = None

    for interval in elapsed:
        actual_payload = interval.get("actual") or {}
        price = _coalesce(
            _branch_value(interval, "planned", "spot_price", "spot_price_czk"),
            _branch_value(interval, "actual", "spot_price", "spot_price_czk"),
        ) or 0.0
        load = _coalesce(
            _branch_value(interval, "actual", "consumption_kwh"),
            _branch_value(interval, "planned", "consumption_kwh"),
        ) or 0.0
        solar = _coalesce(
            _branch_value(interval, "actual", "solar_kwh"),
            _branch_value(interval, "planned", "solar_kwh"),
        ) or 0.0

        result = simulate_interval(
            mode=HOME_I,
            solar_kwh=solar,
            load_kwh=load,
            battery_soc_kwh=soc,
            capacity_kwh=capacity,
            hw_min_capacity_kwh=hw_min,
            charge_efficiency=_DIRECTIONAL_EFF,
            discharge_efficiency=_DIRECTIONAL_EFF,
            home_charge_rate_kwh_15min=0.0,
        )
        sim_soc_after = result.new_soc_kwh
        sim_cost = result.grid_import_kwh * price

        # Záloha-only actual cost: prefer backup_net_cost (total import minus
        # non-backup + battery grid-charge); fall back to total net_cost.
        actual_net = _branch_value(interval, "actual", "backup_net_cost")
        if actual_net is None:
            actual_net = _branch_value(interval, "actual", "net_cost")
        if actual_net is not None:
            actual_cost += actual_net

        # Per-interval actual battery level + mode (for re-sync below).
        end_kwh = _as_kwh(_branch_value(interval, "actual", "battery_kwh"), capacity)
        if end_kwh is None:
            end_kwh = _as_kwh(
                _branch_value(interval, "actual", "battery_soc"), capacity
            )

        actual_mode = actual_payload.get("mode")
        same_mode = actual_mode in (HOME_I, None)
        in_sync = (
            same_mode
            and actual_net is not None
            and end_kwh is not None
            and abs(sim_soc_after - end_kwh) <= _SOC_SYNC_TOLERANCE_KWH
        )

        if in_sync and actual_net is not None and end_kwh is not None:
            # Control made the SAME choice as the do-nothing baseline and the
            # battery trajectories agree → any cost difference is simulation
            # error (real inverter losses, grid trickle), not a control
            # effect. Take reality for the baseline and re-sync the sim SoC
            # so model drift doesn't accumulate into fake (de)savings.
            baseline_cost += actual_net
            soc = end_kwh
        else:
            # Control diverged (UPS window, or the SoC gap it created):
            # keep the pure HOME I simulation, plus the irreducible grid
            # trickle the real inverter always draws (~≤240 W) which BOTH
            # worlds pay — capped so genuine control effects are never
            # absorbed.
            baseline_cost += sim_cost
            if actual_net is not None:
                residual = max(0.0, actual_net - sim_cost)
                trickle_cap_cost = _TRICKLE_CAP_KWH_15MIN * price
                baseline_cost += min(residual, max(0.0, trickle_cap_cost))
            soc = sim_soc_after
        if price > 0:
            price_sum += price
            price_n += 1
        if end_kwh is not None:
            soc_actual_end = end_kwh

    soc_baseline_end = soc
    avg_price = (price_sum / price_n) if price_n else 0.0

    # Mark-to-market the end-of-window battery delta: extra charge the active
    # control holds vs the do-nothing baseline is deliverable energy worth
    # ~avg_price (after discharge losses).
    battery_value_delta = 0.0
    if soc_actual_end is not None:
        battery_value_delta = (
            (soc_actual_end - soc_baseline_end) * _DIRECTIONAL_EFF * avg_price
        )

    savings = baseline_cost - actual_cost + battery_value_delta

    return {
        "baseline_cost": round(baseline_cost, 2),
        "actual_cost": round(actual_cost, 2),
        "battery_value_delta": round(battery_value_delta, 2),
        "savings": round(savings, 2),
        "soc_actual_end_kwh": round(soc_actual_end, 2) if soc_actual_end is not None else None,
        "soc_baseline_end_kwh": round(soc_baseline_end, 2),
        "has_actual": True,
    }
