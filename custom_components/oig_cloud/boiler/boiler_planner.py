"""Heating scheduler for boiler based on spot prices."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from .boiler_models import BoilerPlan, PlanSlot

_LOGGER = logging.getLogger(__name__)


@dataclass
class PriceSlot:
    """Spot price slot for planning."""

    start: datetime
    end: datetime
    price_czk_kwh: float

    @property
    def duration_hours(self) -> float:
        """Get slot duration in hours."""
        return (self.end - self.start).total_seconds() / 3600.0


class BoilerPlanner:
    """Plans optimal heating schedule based on spot prices."""

    def __init__(
        self,
        heater_power_kw: float,
        slot_duration_minutes: int = 30,
    ) -> None:
        """Initialize planner.

        Args:
            heater_power_kw: Heater power in kW
            slot_duration_minutes: Planning slot duration
        """
        self.heater_power_kw = heater_power_kw
        self.slot_duration_minutes = slot_duration_minutes

    def create_plan(
        self,
        energy_needed_kwh: float,
        price_forecast: list[PriceSlot],
        deadline: datetime,
        alt_cost_kwh: Optional[float] = None,
        has_alternative: bool = False,
    ) -> BoilerPlan:
        """Create heating plan using greedy algorithm.

        Selects cheapest slots before deadline. If alternative heating is available
        and grid prices exceed alt_cost, uses alternative instead.

        Args:
            energy_needed_kwh: Energy to deliver in kWh
            price_forecast: List of price slots
            deadline: Deadline datetime
            alt_cost_kwh: Alternative heating cost (Kč/kWh)
            has_alternative: Whether alternative heating is available

        Returns:
            BoilerPlan with selected slots
        """
        _LOGGER.info(
            f"Creating heating plan: need={energy_needed_kwh:.2f}kWh, "
            f"deadline={deadline}, alt_cost={alt_cost_kwh}, has_alt={has_alternative}"
        )

        # Filter slots before deadline
        valid_slots = [slot for slot in price_forecast if slot.end <= deadline]

        if not valid_slots:
            _LOGGER.warning("No valid slots before deadline, returning empty plan")
            return BoilerPlan(
                deadline=deadline,
                use_alternative=has_alternative,
                created_at=datetime.now(),
            )

        # Sort by price ascending
        sorted_slots = sorted(valid_slots, key=lambda s: s.price_czk_kwh)

        # Greedy selection
        selected_slots: list[PlanSlot] = []
        total_energy = 0.0
        total_cost = 0.0
        use_alternative = False

        for price_slot in sorted_slots:
            # Check if we have enough energy
            if total_energy >= energy_needed_kwh:
                break

            # Check against alternative cost
            if alt_cost_kwh is not None and price_slot.price_czk_kwh > alt_cost_kwh:
                if has_alternative:
                    # Skip this slot, will use alternative
                    _LOGGER.debug(
                        f"Slot price {price_slot.price_czk_kwh:.2f} > alt {alt_cost_kwh:.2f}, "
                        "skipping for alternative"
                    )
                    continue
                else:
                    # No alternative, must use grid even if expensive
                    _LOGGER.warning(
                        f"Slot price {price_slot.price_czk_kwh:.2f} > alt {alt_cost_kwh:.2f}, "
                        "but no alternative available, using grid anyway"
                    )

            # Calculate energy this slot can provide
            slot_duration_h = price_slot.duration_hours
            slot_energy_kwh = self.heater_power_kw * slot_duration_h

            # Limit to remaining need
            remaining_need = energy_needed_kwh - total_energy
            actual_energy = min(slot_energy_kwh, remaining_need)
            actual_duration_h = actual_energy / self.heater_power_kw
            actual_duration_min = int(actual_duration_h * 60)

            # Calculate cost
            slot_cost = actual_energy * price_slot.price_czk_kwh

            # Create plan slot
            plan_slot = PlanSlot(
                start=price_slot.start,
                end=price_slot.start + timedelta(hours=actual_duration_h),
                duration_min=actual_duration_min,
                energy_kwh=actual_energy,
                price_czk_kwh=price_slot.price_czk_kwh,
                cost_czk=slot_cost,
            )

            selected_slots.append(plan_slot)
            total_energy += actual_energy
            total_cost += slot_cost

            _LOGGER.debug(
                f"Selected slot: {plan_slot.start} - {plan_slot.end}, "
                f"{actual_energy:.2f}kWh @ {price_slot.price_czk_kwh:.2f}Kč/kWh = {slot_cost:.2f}Kč"
            )

        # Check if we need alternative
        alt_energy = 0.0
        alt_cost = 0.0
        if total_energy < energy_needed_kwh and has_alternative:
            use_alternative = True
            alt_energy = energy_needed_kwh - total_energy
            if alt_cost_kwh is not None:
                alt_cost = alt_energy * alt_cost_kwh
            _LOGGER.info(
                f"Insufficient grid capacity ({total_energy:.2f}/{energy_needed_kwh:.2f}kWh), "
                f"will use alternative heating: {alt_energy:.2f}kWh @ {alt_cost:.2f}Kč"
            )

        # Create final plan
        plan = BoilerPlan(
            slots=selected_slots,
            total_energy_kwh=total_energy + alt_energy,
            total_cost_czk=total_cost + alt_cost,
            grid_energy_kwh=total_energy,
            grid_cost_czk=total_cost,
            alt_energy_kwh=alt_energy,
            alt_cost_czk=alt_cost,
            deadline=deadline,
            use_alternative=use_alternative,
            created_at=datetime.now(),
        )

        _LOGGER.info(
            f"Plan created: {len(selected_slots)} slots, grid={total_energy:.2f}kWh/{total_cost:.2f}Kč, "
            f"alt={alt_energy:.2f}kWh/{alt_cost:.2f}Kč, use_alt={use_alternative}"
        )

        return plan

    def parse_deadline(
        self, deadline_time: str, reference: Optional[datetime] = None
    ) -> datetime:
        """Parse deadline time string to datetime.

        Args:
            deadline_time: Time string in HH:MM format
            reference: Reference datetime (default: now)

        Returns:
            Deadline datetime (today or tomorrow depending on time)
        """
        if reference is None:
            reference = datetime.now()

        try:
            hour, minute = map(int, deadline_time.split(":"))
        except (ValueError, AttributeError):
            _LOGGER.error(f"Invalid deadline_time format: {deadline_time}, using 20:00")
            hour, minute = 20, 0

        # Create deadline for today
        deadline = reference.replace(hour=hour, minute=minute, second=0, microsecond=0)

        # If deadline already passed, use tomorrow
        if deadline <= reference:
            deadline += timedelta(days=1)
            _LOGGER.debug(f"Deadline {deadline_time} already passed, using tomorrow")

        return deadline

    @staticmethod
    def create_slots_from_forecast(
        forecast_data: list[dict],
        slot_duration_minutes: int = 30,
        reference: Optional[datetime] = None,
    ) -> list[PriceSlot]:
        """Create PriceSlot list from forecast data.

        Args:
            forecast_data: List of dicts with 'datetime' and 'price' keys
            slot_duration_minutes: Duration of each slot
            reference: Reference time (default: now)

        Returns:
            List of PriceSlot objects
        """
        if reference is None:
            reference = datetime.now()

        slots: list[PriceSlot] = []
        slot_delta = timedelta(minutes=slot_duration_minutes)

        for item in forecast_data:
            try:
                # Parse datetime (can be string or datetime)
                if isinstance(item.get("datetime"), str):
                    start = datetime.fromisoformat(item["datetime"])
                else:
                    start = item["datetime"]

                price = float(item["price"])

                slot = PriceSlot(
                    start=start,
                    end=start + slot_delta,
                    price_czk_kwh=price,
                )
                slots.append(slot)

            except (KeyError, ValueError, TypeError) as e:
                _LOGGER.warning(f"Failed to parse forecast item {item}: {e}")
                continue

        _LOGGER.debug(f"Created {len(slots)} price slots from forecast")
        return slots
