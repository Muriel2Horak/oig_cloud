"""Water usage profiling for boiler optimization."""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from .boiler_models import WaterUsageProfile

_LOGGER = logging.getLogger(__name__)


class BoilerUsageProfiler:
    """Tracks and analyzes water usage patterns."""

    def __init__(
        self,
        interval_minutes: int = 30,
        tracking_days: int = 7,
    ) -> None:
        """Initialize profiler.

        Args:
            interval_minutes: Time interval for histogram buckets
            tracking_days: Number of days to track in rolling window
        """
        self.interval_minutes = interval_minutes
        self.tracking_days = tracking_days

        # Store energy drops (water usage events)
        # Format: {datetime: energy_drop_kwh}
        self._events: dict[datetime, float] = {}

        # Last known energy state (to detect drops)
        self._last_energy_kwh: Optional[float] = None
        self._last_check_time: Optional[datetime] = None

    def update_energy_reading(
        self,
        current_energy_kwh: float,
        timestamp: Optional[datetime] = None,
        heating_active: bool = False,
    ) -> Optional[float]:
        """Update with new energy reading and detect usage.

        Args:
            current_energy_kwh: Current energy in tank
            timestamp: Reading timestamp (default: now)
            heating_active: Whether heating is currently active

        Returns:
            Detected energy drop in kWh, or None if no usage detected
        """
        if timestamp is None:
            timestamp = datetime.now()

        # First reading, just store
        if self._last_energy_kwh is None:
            self._last_energy_kwh = current_energy_kwh
            self._last_check_time = timestamp
            return None

        # Detect energy drop (water usage)
        energy_drop = self._last_energy_kwh - current_energy_kwh

        # Only count as usage if:
        # 1. Energy decreased (drop > 0)
        # 2. Not heating (heating would increase energy)
        # 3. Drop is significant (>0.1 kWh ~ 10L at 10°C delta)
        if energy_drop > 0.1 and not heating_active:
            _LOGGER.debug(
                f"Detected water usage: {energy_drop:.2f} kWh drop at {timestamp}"
            )
            self._events[timestamp] = energy_drop
            self._cleanup_old_events(timestamp)
            self._last_energy_kwh = current_energy_kwh
            self._last_check_time = timestamp
            return energy_drop

        # Update last known state
        self._last_energy_kwh = current_energy_kwh
        self._last_check_time = timestamp
        return None

    def _cleanup_old_events(self, current_time: datetime) -> None:
        """Remove events older than tracking window."""
        cutoff = current_time - timedelta(days=self.tracking_days)
        old_keys = [ts for ts in self._events if ts < cutoff]
        for key in old_keys:
            del self._events[key]

        if old_keys:
            _LOGGER.debug(f"Cleaned up {len(old_keys)} old usage events")

    def get_profile(
        self, reference_time: Optional[datetime] = None
    ) -> WaterUsageProfile:
        """Generate usage profile from tracked events.

        Args:
            reference_time: Reference time for cleanup (default: now)

        Returns:
            WaterUsageProfile with hourly averages
        """
        if reference_time is None:
            reference_time = datetime.now()

        # Cleanup old events
        self._cleanup_old_events(reference_time)

        # Aggregate events by hour
        hourly_totals: dict[int, float] = defaultdict(float)
        hourly_counts: dict[int, int] = defaultdict(int)

        for timestamp, energy_kwh in self._events.items():
            hour = timestamp.hour
            hourly_totals[hour] += energy_kwh
            hourly_counts[hour] += 1

        # Calculate averages
        hourly_avg_kwh: dict[int, float] = {}
        for hour in range(24):
            if hourly_counts[hour] > 0:
                hourly_avg_kwh[hour] = hourly_totals[hour] / hourly_counts[hour]
            else:
                hourly_avg_kwh[hour] = 0.0

        profile = WaterUsageProfile(
            hourly_avg_kwh=hourly_avg_kwh,
            days_tracked=self.tracking_days,
            last_updated=reference_time,
        )

        _LOGGER.debug(
            f"Generated profile from {len(self._events)} events over {self.tracking_days} days"
        )
        return profile

    def predict_usage_until(
        self, deadline_hour: int, current_hour: Optional[int] = None
    ) -> float:
        """Predict total water usage until deadline hour.

        Args:
            deadline_hour: Target hour (0-23)
            current_hour: Current hour (default: now)

        Returns:
            Predicted total usage in kWh
        """
        if current_hour is None:
            current_hour = datetime.now().hour

        profile = self.get_profile()

        # Calculate hours until deadline
        if deadline_hour >= current_hour:
            # Same day
            hours = list(range(current_hour, deadline_hour))
        else:
            # Next day
            hours = list(range(current_hour, 24)) + list(range(0, deadline_hour))

        # Sum predicted usage
        predicted_kwh = sum(profile.hourly_avg_kwh.get(h, 0.0) for h in hours)

        _LOGGER.debug(
            f"Predicted usage from hour {current_hour} to {deadline_hour}: {predicted_kwh:.2f} kWh"
        )
        return predicted_kwh

    def get_peak_usage_hours(self, top_n: int = 3) -> list[int]:
        """Get hours with highest average usage.

        Args:
            top_n: Number of top hours to return

        Returns:
            List of hours (0-23) sorted by usage descending
        """
        profile = self.get_profile()
        sorted_hours = sorted(
            profile.hourly_avg_kwh.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        return [hour for hour, _ in sorted_hours[:top_n]]
