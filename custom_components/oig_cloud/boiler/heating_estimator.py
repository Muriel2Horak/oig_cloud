"""Estimate the boiler's REAL electric heating power.

The box's CBB power sensor (``cbb_w``) reports the **commanded** power (0 or the
element nameplate, e.g. 6600 W) and is blind to the tank thermostat cutting the
element — so it reads full power while the element is actually off, inflating
``day_w`` and faking the source. This module recovers the true power.

**Non-backup live power is the authority** for *how many Watts* the boiler draws
(``actual_acinb_wtotal`` minus a learned other-loads floor). It directly shows
the 0 / 3.3 / 6.6 kW levels — including the case where only one of two elements
runs (top of the tank already hot, bottom element still heating at 3.3 kW), which
a single top temperature sensor would miss entirely.

The tank **temperature trend** is a secondary signal: it confirms heat input and
provides a calorimetric (element-agnostic) power estimate when the non-backup
power is unavailable. It is NEVER used to veto a measured non-backup draw — a
flat top temperature does not mean "off" when the bottom element is heating.

The other-loads **baseline** is a noise-floor tracker (follows the non-backup
power down instantly, rises only slowly), so it sits at the level of the *other*
non-backup appliances regardless of the boiler — no feedback loop with the
heating decision.

Generic across installs: element wattage is read from the non-backup step, never
configured; works with 1..N elements and 1..2 temperature sensors.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .const import COMMAND_ON_W

# Specific heat of water in Wh per litre per kelvin.
WATER_WH_PER_L_K = 1.163

MIN_ELEMENT_W = 1500.0        # smallest plausible real element draw (W)
TEMP_RISE_C_PER_MIN = 0.05    # temperature rising ≥ this → heat input present
BASELINE_RISE_ALPHA = 0.02    # noise-floor: rise slowly toward the live value
SEED_FLOOR_W = 800.0          # cold-start cap for the assumed other-loads floor
MAX_PLAUSIBLE_W = 8000.0      # clamp for the calorimetric power estimate


@dataclass
class HeatingEstimate:
    """Result of :func:`estimate_heating`."""

    heating: bool
    power_w: float
    confidence: float          # 0..1
    method: str                # "nonbackup" | "calorimetry" | "command" | "off"
    baseline_w: Optional[float]  # updated other-loads floor to persist


def update_baseline(baseline_w: Optional[float], nonbackup_total_w: Optional[float]) -> Optional[float]:
    """Noise-floor tracker for the *other* non-backup loads.

    Converges to the level of everything on the non-backup circuit *except* the
    boiler, independent of the heating decision (no feedback loop):
    - seeded LOW (``min(live, SEED_FLOOR_W)``) so a cold start that begins during
      heating still detects the boiler immediately (rather than swallowing it);
    - follows the live value DOWN instantly (a new low is the real floor);
    - rises slowly toward the live value ONLY when the gap is not boiler-sized
      (i.e. the boiler is off) — so a long continuous heat never creeps the floor
      up and "loses" the boiler.
    """
    if nonbackup_total_w is None:
        return baseline_w
    nb = float(nonbackup_total_w)
    if baseline_w is None:
        return min(nb, SEED_FLOOR_W)
    if nb < baseline_w:
        return nb
    if (nb - baseline_w) < MIN_ELEMENT_W:
        return baseline_w + BASELINE_RISE_ALPHA * (nb - baseline_w)
    return baseline_w  # boiler-sized load present → freeze the floor


def calorimetric_power_w(
    trend_c_per_min: Optional[float], volume_l: float
) -> Optional[float]:
    """Electric power implied by the tank temperature rise (W).

    ``P = dT/min × volume × 1.163 Wh/L·K × 60``. Returns None when the trend is
    non-positive or the volume is unusable.
    """
    if trend_c_per_min is None or trend_c_per_min <= 0 or volume_l <= 0:
        return None
    watts = trend_c_per_min * volume_l * WATER_WH_PER_L_K * 60.0
    return max(0.0, min(watts, MAX_PLAUSIBLE_W))


def estimate_heating(
    *,
    commanded_w: Optional[float],
    nonbackup_total_w: Optional[float],
    temp_trend_c_per_min: Optional[float],
    volume_l: float,
    baseline_w: Optional[float],
) -> HeatingEstimate:
    """Fuse command + non-backup power + temperature into a real-power estimate.

    The returned ``baseline_w`` must be persisted by the caller and passed back
    on the next call.
    """
    commanded = commanded_w is not None and commanded_w > COMMAND_ON_W

    # Advance the other-loads floor, then take the boiler draw over it. Using the
    # updated floor means a cold start (no prior baseline) still detects heating
    # on the first cycle instead of swallowing the boiler.
    new_baseline = update_baseline(baseline_w, nonbackup_total_w)
    nb_excess: Optional[float] = None
    if nonbackup_total_w is not None and new_baseline is not None:
        nb_excess = max(0.0, float(nonbackup_total_w) - float(new_baseline))

    temp_rising = (
        temp_trend_c_per_min is not None
        and temp_trend_c_per_min >= TEMP_RISE_C_PER_MIN
    )

    if not commanded:
        heating, method, power = False, "off", 0.0
    elif nb_excess is not None:
        # Non-backup power is the authority — it sees one or both elements and
        # is not fooled by a flat top temperature.
        if nb_excess >= MIN_ELEMENT_W:
            heating, method, power = True, "nonbackup", nb_excess
        else:
            heating, method, power = False, "off", 0.0
    elif temp_rising:
        cal = calorimetric_power_w(temp_trend_c_per_min, volume_l)
        heating, method, power = True, "calorimetry", (
            cal if cal and cal > 0 else float(commanded_w or 0.0)
        )
    elif temp_trend_c_per_min is not None:
        # Commanded, no non-backup signal, temperature flat → thermostat cut.
        heating, method, power = False, "off", 0.0
    else:
        # Commanded with no usable corroborating signal → trust the command.
        heating, method, power = True, "command", float(commanded_w or 0.0)

    # ── confidence ────────────────────────────────────────────────────────
    if heating and method == "nonbackup":
        confidence = 0.95 if temp_rising else 0.8
    elif heating and method == "calorimetry":
        confidence = 0.7
    elif method == "command":
        confidence = 0.4
    else:
        confidence = 0.7

    return HeatingEstimate(
        heating=heating,
        power_w=round(power, 1),
        confidence=confidence,
        method=method,
        baseline_w=new_baseline,
    )
