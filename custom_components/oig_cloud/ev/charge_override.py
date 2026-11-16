"""One-off charging choices: charge now, or be charged by a given time.

They hold for one drive only. "Charge now" ends at the next departure or when
the car is unplugged; "charge by" ends at its time. Then the plan takes over
again. Both charge to the car's charge limit.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Mapping, Optional

from .profile import NextNeed

MODE_PLAN = "plan"
MODE_NOW = "now"
MODE_BY = "by"
MODES = (MODE_PLAN, MODE_NOW, MODE_BY)
# "Charge now" without a known departure lasts at most this long.
NOW_MAX_HOURS = 24
SLOT = timedelta(minutes=15)


@dataclass(frozen=True)
class ChargeOverride:
    mode: str
    until: datetime  # the override ends here (departure or the chosen time)
    set_at: datetime

    def as_dict(self) -> dict:
        return {
            "mode": self.mode,
            "until": self.until.isoformat(),
            "set_at": self.set_at.isoformat(),
        }

    @classmethod
    def from_dict(cls, raw: Optional[Mapping[str, Any]]) -> Optional["ChargeOverride"]:
        if not isinstance(raw, Mapping) or raw.get("mode") not in (MODE_NOW, MODE_BY):
            return None
        try:
            return cls(
                mode=str(raw["mode"]),
                until=datetime.fromisoformat(str(raw["until"])),
                set_at=datetime.fromisoformat(str(raw["set_at"])),
            )
        except (KeyError, TypeError, ValueError):
            return None

    def active(self, now: datetime) -> bool:
        return now < self.until


def make_override(
    mode: str, now: datetime, *, by: Optional[datetime], departure: Optional[datetime]
) -> Optional[ChargeOverride]:
    """The override for a choice; None for "plan" or an unusable time."""
    if mode == MODE_NOW:
        until = departure if departure is not None and departure > now else now + timedelta(hours=NOW_MAX_HOURS)
        return ChargeOverride(MODE_NOW, until, now)
    if mode == MODE_BY:
        if by is None or by <= now:
            return None
        return ChargeOverride(MODE_BY, by, now)
    return None


def override_need(
    override: ChargeOverride,
    now: datetime,
    *,
    soc_pct: float,
    limit_pct: float,
    capacity_kwh: float,
    max_power_kw: float,
) -> NextNeed:
    """The planner need that makes the plan follow the override.

    "Charge by" is a departure at that time. "Charge now" is a departure right
    after the slots the car needs at full power, so the planner has no cheaper
    slot to move the charge to.
    """
    if override.mode == MODE_BY:
        return NextNeed(deadline=override.until, need_pct=limit_pct, weekday=override.until.weekday())
    missing_kwh = max(0.0, (limit_pct - soc_pct) / 100.0 * capacity_kwh)
    slot_kwh = max(0.1, max_power_kw * SLOT.total_seconds() / 3600.0)
    slots = max(1, math.ceil(missing_kwh / slot_kwh))
    bucket = now.replace(minute=(now.minute // 15) * 15, second=0, microsecond=0)
    deadline = bucket + SLOT * slots
    return NextNeed(deadline=deadline, need_pct=limit_pct, weekday=deadline.weekday())
