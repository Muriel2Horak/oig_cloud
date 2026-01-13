"""Planner timeline helpers extracted from legacy battery forecast."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from homeassistant.util import dt as dt_util

from ...physics import simulate_interval
from ..data.input import get_solar_for_timestamp
from ..types import (
    CBB_MODE_HOME_II,
    CBB_MODE_HOME_III,
    CBB_MODE_HOME_UPS,
    CBB_MODE_NAMES,
)


def build_planner_timeline(
    *,
    modes: List[int],
    spot_prices: List[Dict[str, Any]],
    export_prices: List[Dict[str, Any]],
    solar_forecast: Dict[str, Any],
    load_forecast: List[float],
    current_capacity: float,
    max_capacity: float,
    hw_min_capacity: float,
    efficiency: float,
    home_charge_rate_kw: float,
    log_rate_limited: Optional[Any] = None,
) -> List[Dict[str, Any]]:
    """Build timeline in legacy format from planner modes."""
    timeline: List[Dict[str, Any]] = []
    soc = current_capacity
    charge_rate_kwh_15min = home_charge_rate_kw / 4.0

    for i, mode in enumerate(modes):
        if i >= len(spot_prices):
            break
        ts_str = str(spot_prices[i].get("time", ""))
        spot_price = float(spot_prices[i].get("price", 0.0) or 0.0)
        export_price = (
            float(export_prices[i].get("price", 0.0) or 0.0)
            if i < len(export_prices)
            else 0.0
        )

        solar_kwh = 0.0
        try:
            ts = datetime.fromisoformat(ts_str)
            if ts.tzinfo is None:
                ts = dt_util.as_local(ts)
            solar_kwh = get_solar_for_timestamp(
                ts, solar_forecast, log_rate_limited=log_rate_limited
            )
        except Exception:
            solar_kwh = 0.0

        load_kwh = load_forecast[i] if i < len(load_forecast) else 0.125

        res = simulate_interval(
            mode=mode,
            solar_kwh=solar_kwh,
            load_kwh=load_kwh,
            battery_soc_kwh=soc,
            capacity_kwh=max_capacity,
            hw_min_capacity_kwh=hw_min_capacity,
            charge_efficiency=efficiency,
            discharge_efficiency=efficiency,
            home_charge_rate_kwh_15min=charge_rate_kwh_15min,
        )
        soc = res.new_soc_kwh

        net_cost = (res.grid_import_kwh * spot_price) - (
            res.grid_export_kwh * export_price
        )

        timeline.append(
            {
                "time": ts_str,
                "timestamp": ts_str,
                "battery_soc": round(soc, 6),
                "battery_capacity_kwh": round(soc, 6),
                "mode": int(mode),
                "mode_name": CBB_MODE_NAMES.get(int(mode), "HOME I"),
                "solar_kwh": round(solar_kwh, 6),
                "load_kwh": round(load_kwh, 6),
                "grid_import": round(res.grid_import_kwh, 6),
                "grid_export": round(res.grid_export_kwh, 6),
                "grid_net": round(res.grid_import_kwh - res.grid_export_kwh, 6),
                "spot_price": round(spot_price, 6),
                "spot_price_czk": round(spot_price, 6),
                "export_price_czk": round(export_price, 6),
                "net_cost": round(net_cost, 6),
                "solar_charge_kwh": round(max(0.0, res.solar_charge_kwh), 6),
                "grid_charge_kwh": round(max(0.0, res.grid_charge_kwh), 6),
            }
        )

    return timeline


def format_planner_reason(
    reason_code: Optional[str],
    *,
    spot_price: Optional[float] = None,
) -> Optional[str]:
    """Map planner reason codes to user-facing text."""
    if not reason_code:
        return None

    if reason_code.startswith("planned_charge"):
        if spot_price is not None:
            return f"Plánované nabíjení ze sítě ({spot_price:.2f} Kč/kWh)"
        return "Plánované nabíjení ze sítě"

    if reason_code == "price_band_hold":
        if spot_price is not None:
            return (
                f"UPS držíme v cenovém pásmu dle účinnosti "
                f"({spot_price:.2f} Kč/kWh)"
            )
        return "UPS držíme v cenovém pásmu dle účinnosti"

    if reason_code in {"balancing_charge", "balancing_override"}:
        return "Balancování: nabíjení na 100 %"
    if reason_code == "holding_period":
        return "Balancování: držení 100 %"

    if reason_code in {"negative_price_charge", "auto_negative_charge"}:
        return "Negativní cena: nabíjení ze sítě"
    if reason_code in {"negative_price_curtail", "auto_negative_curtail"}:
        return "Negativní cena: omezení exportu (HOME III)"
    if reason_code in {"negative_price_consume", "auto_negative_consume"}:
        return "Negativní cena: maximalizace spotřeby"

    return None


def attach_planner_reasons(
    timeline: List[Dict[str, Any]],
    decisions: List[Any],
) -> None:
    """Attach planner reasons and decision metrics to timeline entries."""
    for idx, decision in enumerate(decisions):
        if idx >= len(timeline):
            break
        reason_code = getattr(decision, "reason", None)
        metrics = timeline[idx].get("decision_metrics") or {}
        if reason_code:
            metrics.setdefault("planner_reason_code", reason_code)
            metrics.setdefault("planner_reason", reason_code)
        metrics.setdefault(
            "planner_is_balancing", bool(getattr(decision, "is_balancing", False))
        )
        metrics.setdefault(
            "planner_is_holding", bool(getattr(decision, "is_holding", False))
        )
        metrics.setdefault(
            "planner_is_negative_price",
            bool(getattr(decision, "is_negative_price", False)),
        )
        timeline[idx]["decision_metrics"] = metrics

        reason_text = format_planner_reason(
            reason_code, spot_price=timeline[idx].get("spot_price")
        )
        if reason_text:
            timeline[idx]["decision_reason"] = reason_text


def add_decision_reasons_to_timeline(
    timeline: List[Dict[str, Any]],
    *,
    current_capacity: float,
    max_capacity: float,
    min_capacity: float,
    efficiency: float,
) -> None:
    """Attach decision reason strings and metrics to each timeline interval."""
    if not timeline:
        return

    battery = current_capacity
    future_ups_avg_price = _compute_future_ups_avg_price(timeline)

    for idx, entry in enumerate(timeline):
        entry["battery_soc_start"] = battery

        decision_reason, decision_metrics = _build_decision_for_entry(
            entry,
            battery=battery,
            min_capacity=min_capacity,
            efficiency=efficiency,
            future_ups_avg_price=future_ups_avg_price[idx],
        )

        existing_reason = entry.get("decision_reason")
        existing_metrics = entry.get("decision_metrics") or {}
        if existing_reason:
            decision_reason = existing_reason
        if existing_metrics:
            decision_metrics = {**decision_metrics, **existing_metrics}

        _apply_decision_metrics(
            entry,
            decision_metrics,
            battery=battery,
            future_ups_avg_price=future_ups_avg_price[idx],
        )
        entry["decision_reason"] = decision_reason
        entry["decision_metrics"] = decision_metrics

        # Advance battery for next interval (end-of-interval stored in timeline)
        try:
            battery = float(entry.get("battery_soc", battery))
        except (TypeError, ValueError):
            pass

    _ = max_capacity


def _compute_future_ups_avg_price(
    timeline: List[Dict[str, Any]],
) -> List[Optional[float]]:
    future_ups_avg_price: List[Optional[float]] = [None] * len(timeline)
    cumulative_charge = 0.0
    cumulative_cost = 0.0

    for idx in range(len(timeline) - 1, -1, -1):
        entry = timeline[idx]
        if entry.get("mode") == CBB_MODE_HOME_UPS:
            charge_kwh = entry.get("grid_charge_kwh", 0.0) or 0.0
            if charge_kwh > 0:
                cumulative_charge += charge_kwh
                cumulative_cost += charge_kwh * (entry.get("spot_price", 0) or 0)

        if cumulative_charge > 0:
            future_ups_avg_price[idx] = cumulative_cost / cumulative_charge
    return future_ups_avg_price


def _build_decision_for_entry(
    entry: Dict[str, Any],
    *,
    battery: float,
    min_capacity: float,
    efficiency: float,
    future_ups_avg_price: Optional[float],
) -> tuple[Optional[str], Dict[str, Any]]:
    mode = entry.get("mode")
    load_kwh = entry.get("load_kwh", 0.0) or 0.0
    solar_kwh = entry.get("solar_kwh", 0.0) or 0.0
    price = entry.get("spot_price", 0.0) or 0.0
    deficit = max(0.0, load_kwh - solar_kwh)

    if mode == CBB_MODE_HOME_II:
        return _decision_home_ii(
            deficit,
            battery=battery,
            min_capacity=min_capacity,
            efficiency=efficiency,
            price=price,
            avg_price=future_ups_avg_price,
        )
    if mode == CBB_MODE_HOME_UPS:
        return _decision_home_ups(entry, price)
    if mode == CBB_MODE_HOME_III:
        return "Max nabijeni z FVE, spotreba ze site", {}
    return _decision_default(deficit)


def _decision_home_ii(
    deficit: float,
    *,
    battery: float,
    min_capacity: float,
    efficiency: float,
    price: float,
    avg_price: Optional[float],
) -> tuple[Optional[str], Dict[str, Any]]:
    if deficit <= 0:
        return "Prebytky ze solaru do baterie (bez vybijeni)", {}

    available_battery = max(0.0, battery - min_capacity)
    discharge_kwh = (
        min(deficit / efficiency, available_battery) if efficiency > 0 else 0.0
    )
    covered_kwh = discharge_kwh * efficiency
    interval_saving = covered_kwh * price
    recharge_cost = (
        (discharge_kwh / efficiency) * avg_price
        if avg_price is not None and efficiency > 0
        else None
    )

    metrics = {
        "home1_saving_czk": round(interval_saving, 2),
        "soc_drop_kwh": round(discharge_kwh, 2),
        "recharge_avg_price_czk": (
            round(avg_price, 2) if avg_price is not None else None
        ),
        "recharge_cost_czk": (
            round(recharge_cost, 2) if recharge_cost is not None else None
        ),
    }

    if recharge_cost is not None:
        reason = (
            f"Drzeni baterie: HOME I by usetril {interval_saving:.2f} Kc, "
            f"dobiti ~{recharge_cost:.2f} Kc"
        )
    else:
        reason = (
            f"Drzeni baterie: HOME I by usetril {interval_saving:.2f} Kc, "
            "chybi UPS okno pro dobiti"
        )
    return reason, metrics


def _decision_home_ups(
    entry: Dict[str, Any], price: float
) -> tuple[Optional[str], Dict[str, Any]]:
    charge_kwh = entry.get("grid_charge_kwh", 0.0) or 0.0
    if charge_kwh > 0:
        reason = (
            f"Nabijeni ze site: +{charge_kwh:.2f} kWh pri {price:.2f} Kc/kWh"
        )
    else:
        reason = "UPS rezim (ochrana/udrzovani)"
    return reason, {}


def _decision_default(deficit: float) -> tuple[Optional[str], Dict[str, Any]]:
    if deficit > 0:
        return "Vybijeni baterie misto odberu ze site", {}
    return "Solar pokryva spotrebu, prebytky do baterie", {}


def _apply_decision_metrics(
    entry: Dict[str, Any],
    decision_metrics: Dict[str, Any],
    *,
    battery: float,
    future_ups_avg_price: Optional[float],
) -> None:
    price = entry.get("spot_price", 0.0) or 0.0
    load_kwh = entry.get("load_kwh", 0.0) or 0.0
    solar_kwh = entry.get("solar_kwh", 0.0) or 0.0
    deficit = max(0.0, load_kwh - solar_kwh)

    decision_metrics.setdefault("spot_price_czk", round(price, 2))
    decision_metrics.setdefault(
        "future_ups_avg_price_czk",
        round(future_ups_avg_price, 2) if future_ups_avg_price is not None else None,
    )
    decision_metrics.setdefault("load_kwh", round(load_kwh, 3))
    decision_metrics.setdefault("solar_kwh", round(solar_kwh, 3))
    decision_metrics.setdefault("deficit_kwh", round(deficit, 3))
    decision_metrics.setdefault(
        "grid_charge_kwh",
        round(entry.get("grid_charge_kwh", 0.0) or 0.0, 3),
    )
    decision_metrics.setdefault(
        "battery_start_kwh",
        round(entry.get("battery_soc_start", battery), 2),
    )
    decision_metrics.setdefault(
        "battery_end_kwh",
        round(entry.get("battery_soc", entry.get("battery_soc_start", battery)), 2),
    )
