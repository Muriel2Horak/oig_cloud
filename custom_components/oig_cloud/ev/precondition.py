"""Heating the car before it leaves: should it start now?

Pure decision; ``ev.control`` reads the inputs and calls the services. The
departure comes from the calendar (``ev.calendar``), the same one the charging
plan uses. A day the user marked "heat" or "do not heat" wins over the general
rule; otherwise the rule is ``off``, ``cold`` (outside below a temperature),
``always`` or ``calendar`` (only the days the user marked).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from .calendar import EvDay

WHEN_OFF = "off"
WHEN_COLD = "cold"
WHEN_ALWAYS = "always"
WHEN_CALENDAR = "calendar"


@dataclass(frozen=True)
class PreconditionDecision:
    start: bool
    reason: str
    starts_at: Optional[datetime] = None

    def as_dict(self) -> dict:
        return {
            "start": self.start,
            "reason": self.reason,
            "starts_at": self.starts_at.isoformat() if self.starts_at else None,
        }


def decide_precondition(
    day: Optional[EvDay],
    now: datetime,
    *,
    when: str,
    minutes: int,
    cold_c: float,
    outside_c: Optional[float],
    plugged: bool,
    plugged_only: bool,
    already_done_for: Optional[datetime],
) -> PreconditionDecision:
    """Whether to start heating now, and when it would start for this departure."""
    if day is None or day.departure is None:
        return PreconditionDecision(False, "no_departure")
    starts_at = day.departure - timedelta(minutes=max(0, int(minutes)))
    if day.precondition is False:
        return PreconditionDecision(False, "day_off", starts_at)
    if day.precondition is not True:
        if when == WHEN_OFF or when == WHEN_CALENDAR:
            return PreconditionDecision(False, "not_wanted", starts_at)
        if when == WHEN_COLD:
            if outside_c is None:
                return PreconditionDecision(False, "no_temperature", starts_at)
            if outside_c >= cold_c:
                return PreconditionDecision(False, "warm", starts_at)
        elif when != WHEN_ALWAYS:
            return PreconditionDecision(False, "not_wanted", starts_at)
    if plugged_only and not plugged:
        return PreconditionDecision(False, "unplugged", starts_at)
    if already_done_for == day.departure:
        return PreconditionDecision(False, "done", starts_at)
    if now < starts_at:
        return PreconditionDecision(False, "waiting", starts_at)
    if now >= day.departure:
        return PreconditionDecision(False, "departed", starts_at)
    return PreconditionDecision(True, "start", starts_at)
