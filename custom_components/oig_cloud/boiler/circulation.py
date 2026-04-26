"""Helper for circulation recommendation (deprecated independent scheduling).

The circulation pump now follows active heating actuation via BoilerActuator.
This module retains only the boolean recommendation helper for sensor backward
compatibility; window-building has been removed.
"""

from __future__ import annotations

from typing import Any


def is_circulation_recommended(profile: Any, now: Any = None) -> bool:
    """Return whether circulation is recommended.

    With the pump-follower redesign (Task 7c), circulation is no longer
    independently scheduled. This helper always returns False; the sensor
    should reflect pump state via the actuator path instead.
    """
    return False
