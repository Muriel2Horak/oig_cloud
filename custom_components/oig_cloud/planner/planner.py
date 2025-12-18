"""OnePlanner - single planning algorithm with strict planning minimum enforcement."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Sequence, Tuple

from .physics import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_II,
    CBB_MODE_HOME_UPS,
    IntervalPhysicsResult,
    simulate_interval,
)


@dataclass(frozen=True)
class PlannerConfig:
    planning_min_percent: float
    target_percent: float
    max_ups_price_czk: float
    home_charge_rate_kw: float
    charge_efficiency: float
    discharge_efficiency: float
    safety_margin: float = 1.05
    eps_kwh: float = 0.01
    max_iterations: int = 300
    ups_min_duration_intervals: int = 2
    preserve_battery_margin_kwh: float = 0.25


@dataclass(frozen=True)
class BalancingInput:
    holding_start: Optional[datetime] = None
    holding_end: Optional[datetime] = None
    preferred_intervals: Optional[set[datetime]] = None


@dataclass(frozen=True)
class PlanInput:
    now: datetime
    current_soc_kwh: float
    max_capacity_kwh: float
    hw_min_kwh: float
    spot_prices: Sequence[Dict[str, Any]]  # [{time, price}]
    export_prices: Sequence[Dict[str, Any]]  # [{time, price}]
    solar_kwh: Sequence[float]
    load_kwh: Sequence[float]
    balancing: Optional[BalancingInput] = None


@dataclass(frozen=True)
class PlanOutput:
    modes: List[int]
    timeline: List[Dict[str, Any]]
    planning_min_kwh: float
    target_kwh: float
    infeasible: bool
    infeasible_reason: Optional[str] = None


class OnePlanner:
    """Single planner enforcing planning minimum via repair loop (UPS additions)."""

    def __init__(self, config: PlannerConfig) -> None:
        self.config = config

    def plan(self, data: PlanInput) -> PlanOutput:
        n = len(data.spot_prices)
        if n == 0:
            return PlanOutput(
                modes=[],
                timeline=[],
                planning_min_kwh=0.0,
                target_kwh=0.0,
                infeasible=False,
            )

        planning_min_kwh = (self.config.planning_min_percent / 100.0) * data.max_capacity_kwh
        target_kwh = (self.config.target_percent / 100.0) * data.max_capacity_kwh

        # Default modes: HOME I everywhere (simple, stable).
        modes: List[int] = [CBB_MODE_HOME_I] * n

        # Apply balancing holding window (UPS).
        if data.balancing and data.balancing.holding_start and data.balancing.holding_end:
            for i in range(n):
                ts = _parse_ts(data.spot_prices[i].get("time"))
                if not ts:
                    continue
                ts_end = ts + timedelta(minutes=15)
                if ts < data.balancing.holding_end and ts_end > data.balancing.holding_start:
                    modes[i] = CBB_MODE_HOME_UPS

        # Repair loop: enforce planning minimum using UPS (<= max price).
        infeasible = False
        infeasible_reason: Optional[str] = None

        for _ in range(self.config.max_iterations):
            soc_before, soc_after, _flows = self._simulate(data, modes)

            # Battery-preservation rule near floor (day deficit): switch to HOME II to avoid discharging.
            modes_changed = False
            for i in range(n):
                if modes[i] != CBB_MODE_HOME_I:
                    continue
                if data.solar_kwh[i] <= 0.001:
                    continue
                if data.solar_kwh[i] >= data.load_kwh[i]:
                    continue
                if soc_before[i] <= planning_min_kwh + self.config.preserve_battery_margin_kwh:
                    modes[i] = CBB_MODE_HOME_II
                    modes_changed = True

            if modes_changed:
                continue

            violation_idx = _first_violation_index(soc_after, planning_min_kwh, self.config.eps_kwh)
            if violation_idx is None:
                break

            # Choose a charging interval before the violation.
            candidate_idx = self._pick_ups_interval(
                data=data,
                modes=modes,
                before_index=violation_idx,
            )
            if candidate_idx is None:
                infeasible = True
                infeasible_reason = (
                    f"No UPS interval <= max_ups_price_czk={self.config.max_ups_price_czk} "
                    f"available before violation index {violation_idx}"
                )
                break

            self._apply_ups_with_min_duration(modes, candidate_idx)

        timeline = self._build_timeline(
            data=data,
            modes=modes,
            planning_min_kwh=planning_min_kwh,
            target_kwh=target_kwh,
        )

        return PlanOutput(
            modes=modes,
            timeline=timeline,
            planning_min_kwh=planning_min_kwh,
            target_kwh=target_kwh,
            infeasible=infeasible,
            infeasible_reason=infeasible_reason,
        )

    def _apply_ups_with_min_duration(self, modes: List[int], idx: int) -> None:
        modes[idx] = CBB_MODE_HOME_UPS
        # Enforce UPS min duration forward where possible (simple).
        for j in range(idx + 1, min(len(modes), idx + self.config.ups_min_duration_intervals)):
            modes[j] = CBB_MODE_HOME_UPS

    def _pick_ups_interval(self, *, data: PlanInput, modes: List[int], before_index: int) -> Optional[int]:
        candidates: List[Tuple[float, int]] = []
        preferred: set[datetime] = data.balancing.preferred_intervals if (data.balancing and data.balancing.preferred_intervals) else set()

        for i in range(0, max(0, before_index)):
            if modes[i] == CBB_MODE_HOME_UPS:
                continue
            price = float(data.spot_prices[i].get("price", 0.0) or 0.0)
            if price > self.config.max_ups_price_czk:
                continue
            ts = _parse_ts(data.spot_prices[i].get("time"))
            # preferred intervals get a slight artificial discount so they win ties
            preferred_bonus = -0.0001 if (ts and ts in preferred) else 0.0
            candidates.append((price + preferred_bonus, i))

        if not candidates:
            return None

        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]

    def _simulate(
        self,
        data: PlanInput,
        modes: Sequence[int],
    ) -> Tuple[List[float], List[float], List[IntervalPhysicsResult]]:
        soc_before: List[float] = []
        soc_after: List[float] = []
        flows: List[IntervalPhysicsResult] = []

        soc = data.current_soc_kwh
        charge_rate_kwh_15min = self.config.home_charge_rate_kw / 4.0

        for i, mode in enumerate(modes):
            soc_before.append(soc)

            res = simulate_interval(
                mode=mode,
                solar_kwh=data.solar_kwh[i] if i < len(data.solar_kwh) else 0.0,
                load_kwh=data.load_kwh[i] if i < len(data.load_kwh) else 0.125,
                battery_soc_kwh=soc,
                capacity_kwh=data.max_capacity_kwh,
                hw_min_capacity_kwh=data.hw_min_kwh,
                charge_efficiency=self.config.charge_efficiency,
                discharge_efficiency=self.config.discharge_efficiency,
                home_charge_rate_kwh_15min=charge_rate_kwh_15min,
            )

            soc = res.new_soc_kwh
            soc_after.append(soc)
            flows.append(res)

        return soc_before, soc_after, flows

    def _build_timeline(
        self,
        *,
        data: PlanInput,
        modes: Sequence[int],
        planning_min_kwh: float,
        target_kwh: float,
    ) -> List[Dict[str, Any]]:
        _ = planning_min_kwh
        _ = target_kwh

        timeline: List[Dict[str, Any]] = []
        soc = data.current_soc_kwh
        charge_rate_kwh_15min = self.config.home_charge_rate_kw / 4.0

        for i, mode in enumerate(modes):
            ts_str = str(data.spot_prices[i].get("time", ""))
            spot_price = float(data.spot_prices[i].get("price", 0.0) or 0.0)
            export_price = float(data.export_prices[i].get("price", 0.0) or 0.0) if i < len(data.export_prices) else 0.0
            solar_kwh = data.solar_kwh[i] if i < len(data.solar_kwh) else 0.0
            load_kwh = data.load_kwh[i] if i < len(data.load_kwh) else 0.125

            res = simulate_interval(
                mode=mode,
                solar_kwh=solar_kwh,
                load_kwh=load_kwh,
                battery_soc_kwh=soc,
                capacity_kwh=data.max_capacity_kwh,
                hw_min_capacity_kwh=data.hw_min_kwh,
                charge_efficiency=self.config.charge_efficiency,
                discharge_efficiency=self.config.discharge_efficiency,
                home_charge_rate_kwh_15min=charge_rate_kwh_15min,
            )
            soc = res.new_soc_kwh

            net_cost = (res.grid_import_kwh * spot_price) - (res.grid_export_kwh * export_price)

            timeline.append(
                {
                    "time": ts_str,
                    "timestamp": ts_str,
                    "battery_soc": round(soc, 6),
                    "battery_capacity_kwh": round(soc, 6),
                    "mode": int(mode),
                    "mode_name": _mode_name(int(mode)),
                    "solar_kwh": round(solar_kwh, 6),
                    "load_kwh": round(load_kwh, 6),
                    "grid_import": round(res.grid_import_kwh, 6),
                    "grid_export": round(res.grid_export_kwh, 6),
                    "grid_net": round(res.grid_import_kwh - res.grid_export_kwh, 6),
                    "spot_price": round(spot_price, 6),
                    "spot_price_czk": round(spot_price, 6),
                    "export_price_czk": round(export_price, 6),
                    "net_cost": round(net_cost, 6),
                    "solar_charge_kwh": round(max(0.0, res.battery_charge_kwh), 6),
                    "grid_charge_kwh": round(max(0.0, res.grid_import_kwh - load_kwh) if mode == CBB_MODE_HOME_UPS else 0.0, 6),
                }
            )

        return timeline


def _parse_ts(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except Exception:
        return None


def _first_violation_index(soc_after: Sequence[float], planning_min_kwh: float, eps_kwh: float) -> Optional[int]:
    for i, soc in enumerate(soc_after):
        if soc < planning_min_kwh - eps_kwh:
            return i
    return None


def _mode_name(mode: int) -> str:
    if mode == CBB_MODE_HOME_I:
        return "HOME I"
    if mode == CBB_MODE_HOME_II:
        return "HOME II"
    if mode == 2:
        return "HOME III"
    if mode == CBB_MODE_HOME_UPS:
        return "HOME UPS"
    return "HOME I"

