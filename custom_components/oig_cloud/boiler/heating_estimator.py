"""Estimate the boiler's REAL electric heating power.

The box's CBB power sensor (``cbb_w``) reports the **commanded** power (0 or the
element nameplate, e.g. 6600 W) and is blind to the tank thermostat cutting the
element — so it reads full power while the element is actually off, inflating
``day_w`` and faking the source. This module recovers the true power by fusing
three independent signals:

- **cbb_w** — the box command. If it is 0/None the box is not commanding heat
  (definitely off). It is only a *gate*, never the magnitude.
- **non-backup live power** (``actual_acinb_wtotal``) — how many Watts the
  non-backup circuit (where the boiler sits) actually draws. The boiler's
  contribution is ``measured − other-loads baseline``; the baseline is learned
  online while not heating, so other appliances are subtracted out.
- **tank temperature trend** — only the boiler moves the water temperature, so a
  rising temperature confirms real heat input and a flat temperature while
  commanded means the thermostat has cut the element.

Generic across installs (1..N elements, any wattage, 1..2 temp sensors): element
wattage is read from the non-backup step (never configured), and the energy can
also be derived calorimetrically from the temperature rise (element-agnostic).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

# Specific heat of water in Wh per litre per kelvin.
WATER_WH_PER_L_K = 1.163

COMMAND_ON_W = 100.0          # cbb_w above this → the box is commanding heat
MIN_ELEMENT_W = 1500.0        # smallest plausible real element draw (W)
TEMP_RISE_C_PER_MIN = 0.05    # temperature rising ≥ this → heat input present
BASELINE_EMA_ALPHA = 0.15     # learning rate for the "other non-backup loads" baseline
MAX_PLAUSIBLE_W = 8000.0      # clamp for the calorimetric power estimate


@dataclass
class HeatingEstimate:
    """Result of :func:`estimate_heating`."""

    heating: bool
    power_w: float
    confidence: float          # 0..1
    method: str                # "nonbackup" | "calorimetry" | "command" | "off"
    baseline_w: Optional[float]  # updated other-loads baseline to persist


def calorimetric_power_w(
    trend_c_per_min: Optional[float], volume_l: float
) -> Optional[float]:
    """Electric power implied by the tank temperature rise (W).

    ``P = dT/min × volume × 1.163 Wh/L·K × 60``. Returns None when the trend is
    non-positive or the volume is unusable (i.e. no usable calorimetric signal).
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
    on the next call (online learning of the non-backup other-loads baseline).
    """
    commanded = commanded_w is not None and commanded_w > COMMAND_ON_W
    has_nb = nonbackup_total_w is not None
    nb_excess: Optional[float] = None
    if has_nb and baseline_w is not None:
        nb_excess = max(0.0, float(nonbackup_total_w) - float(baseline_w))
    temp_rising = (
        temp_trend_c_per_min is not None
        and temp_trend_c_per_min >= TEMP_RISE_C_PER_MIN
    )

    # ── decide heating ────────────────────────────────────────────────────
    if not commanded:
        heating, method = False, "off"
    elif nb_excess is not None and nb_excess >= MIN_ELEMENT_W:
        heating, method = True, "nonbackup"          # non-backup shows the load
    elif temp_rising:
        heating, method = True, "calorimetry"        # temperature confirms heat
    elif (nb_excess is not None and nb_excess < MIN_ELEMENT_W) or (
        temp_trend_c_per_min is not None and not temp_rising
    ):
        # Commanded, but neither the non-backup draw nor the temperature shows
        # heat → the tank thermostat has cut the element.
        heating, method = False, "off"
    else:
        # Commanded with no usable corroborating signal → trust the command.
        heating, method = True, "command"

    # ── power magnitude ───────────────────────────────────────────────────
    if not heating:
        power = 0.0
    elif method == "nonbackup":
        power = float(nb_excess)
    else:
        cal = calorimetric_power_w(temp_trend_c_per_min, volume_l)
        power = cal if cal and cal > 0 else float(commanded_w or 0.0)

    # ── confidence ────────────────────────────────────────────────────────
    nb_agree = nb_excess is not None and nb_excess >= MIN_ELEMENT_W
    if nb_agree and temp_rising:
        confidence = 0.95
    elif nb_agree or temp_rising:
        confidence = 0.75
    elif method == "command":
        confidence = 0.4
    else:
        confidence = 0.6  # off via a clear signal

    # ── learn the other-loads baseline (only while NOT heating) ───────────
    new_baseline = baseline_w
    if has_nb and not heating:
        nb = float(nonbackup_total_w)
        new_baseline = nb if baseline_w is None else (
            baseline_w + BASELINE_EMA_ALPHA * (nb - baseline_w)
        )

    return HeatingEstimate(
        heating=heating,
        power_w=round(power, 1),
        confidence=confidence,
        method=method,
        baseline_w=new_baseline,
    )
