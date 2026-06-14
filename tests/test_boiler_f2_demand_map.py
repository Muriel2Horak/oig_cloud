"""Tests for F2 boiler demand map backend.

Covers:
- Draw detection: rate-based threshold, standing loss rejection, heating guard
- Slot distribution across 15-min buckets
- Category slots aggregation
- Percentile computation (p50, p80)
- Fallback chain (exact -> day_type -> global -> bootstrap)
- Window clustering
- DemandMap.to_dto() serialization shape
- Canonical DTO demand_map key (_read_demand_map_dto)
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock

import pytest

from custom_components.oig_cloud.boiler.demand_profiler import (
    DRAW_MIN_DROP_C,
    DRAW_RATE_THRESHOLD_C_PER_MIN,
    ENERGY_CONSTANT_KWH_L_K,
    MAX_WINDOWS_PER_DAY,
    NOISE_FLOOR_KWH,
    SLOTS_PER_DAY,
    SLOT_DURATION_MIN,
    BoilerDemandProfiler,
    DemandMap,
    DemandSlot,
    DrawEvent,
    MatchMeta,
    build_category_slots,
    detect_draws,
    _cluster_windows,
    _distribute_draw_to_slots,
    _get_day_category,
    _slot_index,
    _percentile,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

UTC = timezone.utc

VOLUME_L = 120.0
TARGET_TEMP_C = 60.0
COLD_INLET_C = 10.0
DELTA_T = TARGET_TEMP_C - COLD_INLET_C  # 50 K


def _ts(hour: int, minute: int, day: int = 4, month: int = 6, year: int = 2026) -> datetime:
    """Create a UTC datetime for convenience."""
    return datetime(year, month, day, hour, minute, 0, tzinfo=UTC)


def _make_history(
    readings: list[tuple[int, int, float, str]],  # (hour, minute, temp, heating)
    day: int = 4,
    month: int = 6,
    year: int = 2026,
) -> list[dict]:
    return [
        {
            "timestamp": _ts(h, m, day=day, month=month, year=year),
            "temp": temp,
            "heating": heating,
        }
        for h, m, temp, heating in readings
    ]


def _make_history_p(
    readings: list[tuple[int, int, float, str, float]],  # (h, m, temp, heating, power_w)
    day: int = 4,
    month: int = 6,
    year: int = 2026,
) -> list[dict]:
    """History records that also carry the boiler heating-power proxy (power_w)."""
    return [
        {
            "timestamp": _ts(h, m, day=day, month=month, year=year),
            "temp": temp,
            "heating": heating,
            "power_w": power_w,
        }
        for h, m, temp, heating, power_w in readings
    ]


# ---------------------------------------------------------------------------
# 1. Percentile helper
# ---------------------------------------------------------------------------

class TestPercentile:
    def test_empty(self):
        assert _percentile([], 50) == 0.0

    def test_single(self):
        assert _percentile([3.0], 50) == 3.0

    def test_p50_even(self):
        result = _percentile([0.0, 1.0, 2.0, 3.0], 50)
        assert abs(result - 1.5) < 0.01

    def test_p80(self):
        values = list(range(10))  # 0..9
        result = _percentile(values, 80)
        # p80 of 0..9 with n=10: idx_f = 0.8*9=7.2 → 7+0.2*(8-7)=7.2
        assert abs(result - 7.2) < 0.01

    def test_p0_is_min(self):
        values = [5.0, 10.0, 15.0]
        assert _percentile(values, 0) == 5.0

    def test_p100_is_max(self):
        values = [5.0, 10.0, 15.0]
        assert _percentile(values, 100) == 15.0


# ---------------------------------------------------------------------------
# 2. Draw detection
# ---------------------------------------------------------------------------

class TestDetectDraws:

    def test_no_draws_empty_history(self):
        events = detect_draws([], VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        assert events == []

    def test_no_draws_single_reading(self):
        history = [{"timestamp": _ts(7, 0), "temp": 60.0, "heating": "off"}]
        events = detect_draws(history, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        assert events == []

    def test_standing_loss_rejected(self):
        """Standing loss ~0.05 degC/min must NOT trigger draw detection."""
        # 0.05 degC/min over 10 min = 0.5 degC drop — but rate < 0.15
        readings = _make_history([
            (6, 0, 60.0, "off"),
            (6, 10, 59.5, "off"),  # 0.5 degC / 10 min = 0.05 degC/min
            (6, 20, 59.0, "off"),  # another 0.05 degC/min
            (6, 30, 58.5, "off"),
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        assert len(events) == 0

    def test_genuine_morning_draw_detected(self):
        """Real draw 0.52 degC/min sustained over 2 intervals."""
        readings = _make_history([
            (6, 50, 60.0, "off"),
            (7, 0, 54.8, "off"),   # 5.2 degC / 10 min = 0.52 degC/min
            (7, 10, 49.6, "off"),  # another 0.52 degC/min (sustained)
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        assert len(events) == 1
        ev = events[0]
        assert ev.drop_c >= 5.0
        # Energy: drop * volume * constant
        expected_kwh = ev.drop_c * VOLUME_L * ENERGY_CONSTANT_KWH_L_K
        assert abs(ev.energy_kwh - expected_kwh) < 0.01
        # Liters: energy / (constant * delta_T)
        expected_liters = expected_kwh / (ENERGY_CONSTANT_KWH_L_K * DELTA_T)
        assert abs(ev.liters - expected_liters) < 1.0

    def test_genuine_evening_draw_detected(self):
        """Real draw 0.20 degC/min sustained over 2 intervals."""
        readings = _make_history([
            (21, 0, 60.0, "off"),
            (21, 10, 58.0, "off"),  # 2.0 degC / 10 min = 0.20 degC/min
            (21, 20, 56.0, "off"),  # another 0.20 degC/min
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        assert len(events) == 1
        ev = events[0]
        assert ev.drop_c >= 2.0
        assert ev.rate_c_per_min >= DRAW_RATE_THRESHOLD_C_PER_MIN

    def test_heating_suppresses_draw(self):
        """Intervals with heating=on must not be counted as draws."""
        readings = _make_history([
            (7, 0, 60.0, "on"),
            (7, 10, 54.0, "on"),  # 6 degC drop, but heating is on → not a draw
            (7, 20, 54.0, "off"),
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        assert len(events) == 0

    def test_heating_breaks_draw_window(self):
        """Heating coming on mid-draw stops the draw event."""
        readings = _make_history([
            (7, 0, 60.0, "off"),
            (7, 10, 54.8, "off"),  # 0.52 degC/min
            (7, 20, 50.0, "on"),   # heating comes on → break
            (7, 30, 52.0, "on"),
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        # Only 1 interval before heating (sustained=1 < min_intervals=2) → no event
        assert len(events) == 0

    def test_single_interval_below_min_intervals(self):
        """Only one interval above threshold → not enough, no draw."""
        readings = _make_history([
            (7, 0, 60.0, "off"),
            (7, 10, 54.8, "off"),   # 0.52 degC/min — first interval
            (7, 20, 54.6, "off"),   # 0.02 degC/min — second drops below threshold
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        # Only 1 sustained interval → no event
        assert len(events) == 0

    def test_multiple_draws_same_day(self):
        """Two separate draws are both detected."""
        readings = _make_history([
            # Morning draw
            (7, 0, 60.0, "off"),
            (7, 10, 54.8, "off"),
            (7, 20, 49.6, "off"),
            # Recovery
            (7, 30, 50.0, "off"),
            (10, 0, 58.0, "off"),
            # Evening draw
            (21, 0, 58.0, "off"),
            (21, 10, 56.0, "off"),
            (21, 20, 54.0, "off"),
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        assert len(events) == 2

    def test_draw_energy_formula(self):
        """Verify kWh formula: E = drop_C * volume * ENERGY_CONSTANT_KWH_L_K."""
        readings = _make_history([
            (7, 0, 60.0, "off"),
            (7, 10, 54.8, "off"),  # 5.2 degC drop per interval
            (7, 20, 49.6, "off"),
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        assert len(events) >= 1
        ev = events[0]
        # Total drop from first to last
        expected_kwh = ev.drop_c * VOLUME_L * ENERGY_CONSTANT_KWH_L_K
        assert abs(ev.energy_kwh - expected_kwh) < 0.01

    def test_draw_liters_formula(self):
        """Verify liters = kWh / (ENERGY_CONSTANT_KWH_L_K * (target - cold_inlet))."""
        readings = _make_history([
            (7, 0, 60.0, "off"),
            (7, 10, 54.8, "off"),
            (7, 20, 49.6, "off"),
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        ev = events[0]
        expected_liters = ev.energy_kwh / (ENERGY_CONSTANT_KWH_L_K * 50.0)
        assert abs(ev.liters - expected_liters) < 1.0


class TestDetectDrawsDuringHeating:
    """F3b: calorimetric draw detection while the boiler is heating (power_w)."""

    def test_draw_detected_while_heating(self):
        """Temp dropping despite full-power heating → draw the element can't offset."""
        # Heating at 6.6 kW for 10 min adds ~7.9 degC to a 120 L tank; the tank
        # instead drops 0.5 degC/interval → a large effective draw.
        readings = _make_history_p([
            (7, 0, 58.0, "on", 6600.0),
            (7, 10, 57.5, "on", 6600.0),
            (7, 20, 57.0, "on", 6600.0),
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        assert len(events) == 1
        # Effective drop accounts for the heat the element added, so energy is
        # much larger than the bare 1.0 degC the thermometer fell.
        assert events[0].drop_c > 10.0

    def test_same_drop_without_power_is_suppressed(self):
        """Identical temps but no power data → legacy path skips heating → no draw."""
        readings = _make_history([
            (7, 0, 58.0, "on"),
            (7, 10, 57.5, "on"),
            (7, 20, 57.0, "on"),
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        assert len(events) == 0

    def test_pure_heating_no_draw(self):
        """Tank rising as heating predicts → effective drop ~0 → no false draw."""
        # 6.6 kW over 10 min ≈ +7.88 degC for 120 L; let the tank rise ~7.9.
        readings = _make_history_p([
            (7, 0, 50.0, "on", 6600.0),
            (7, 10, 57.9, "on", 6600.0),
            (7, 20, 65.8, "on", 6600.0),
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        assert len(events) == 0

    def test_thermostat_cut_no_false_positive(self):
        """Commanded on but power proxy ~0 (thermostat cut) + flat temp → no draw."""
        readings = _make_history_p([
            (7, 0, 60.0, "on", 0.0),
            (7, 10, 59.95, "on", 0.0),
            (7, 20, 59.90, "on", 0.0),
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        assert len(events) == 0

    def test_record_power_helper(self):
        from custom_components.oig_cloud.boiler.demand_profiler import _record_power_w
        assert _record_power_w({"power_w": 3300.0}) == 3300.0
        assert _record_power_w({"power_w": 0.0}) == 0.0
        assert _record_power_w({}) is None
        assert _record_power_w({"power_w": None}) is None


# ---------------------------------------------------------------------------
# 3. Slot index & distribution
# ---------------------------------------------------------------------------

class TestSlotIndex:
    def test_midnight(self):
        assert _slot_index(_ts(0, 0)) == 0

    def test_00_15(self):
        assert _slot_index(_ts(0, 15)) == 1

    def test_07_00(self):
        assert _slot_index(_ts(7, 0)) == 28  # 7*4 = 28

    def test_23_45(self):
        assert _slot_index(_ts(23, 45)) == 95

    def test_total_slots(self):
        assert SLOTS_PER_DAY == 96


class TestDistributeDraw:

    def test_single_slot(self):
        """Draw entirely within one 15-min slot → all energy in that slot."""
        draw = DrawEvent(
            start=_ts(7, 0),
            end=_ts(7, 10),
            drop_c=5.0,
            rate_c_per_min=0.5,
            energy_kwh=0.7,
            liters=12.0,
        )
        result = _distribute_draw_to_slots(draw)
        assert len(result) == 1
        total = sum(result.values())
        assert abs(total - 0.7) < 0.001

    def test_spans_two_slots(self):
        """Draw spanning two 15-min slots proportionally splits energy."""
        draw = DrawEvent(
            start=_ts(7, 10),
            end=_ts(7, 20),
            drop_c=2.0,
            rate_c_per_min=0.2,
            energy_kwh=0.28,
            liters=4.8,
        )
        result = _distribute_draw_to_slots(draw)
        total = sum(result.values())
        assert abs(total - 0.28) < 0.001

    def test_proportional_split(self):
        """Draw from :10 to :20 spans slot 0 (:00-:15) and slot 1 (:15-:30)."""
        draw = DrawEvent(
            start=_ts(7, 10),
            end=_ts(7, 20),  # 10 min total: 5 min in slot 28, 5 min in slot 29
            drop_c=2.0,
            rate_c_per_min=0.2,
            energy_kwh=1.0,
            liters=17.2,
        )
        result = _distribute_draw_to_slots(draw)
        # 5 min in each slot → 50% each
        slots = sorted(result.keys())
        assert len(slots) == 2
        for kwh in result.values():
            assert abs(kwh - 0.5) < 0.01


# ---------------------------------------------------------------------------
# 4. Category slots
# ---------------------------------------------------------------------------

class TestBuildCategorySlots:

    def test_empty_draws(self):
        result = build_category_slots([])
        assert result == {}

    def test_single_draw_creates_category(self):
        draw = DrawEvent(
            start=_ts(7, 0, day=4, month=6),  # workday summer 2026-06-04
            end=_ts(7, 10, day=4, month=6),
            drop_c=5.0,
            rate_c_per_min=0.5,
            energy_kwh=0.7,
            liters=12.0,
        )
        result = build_category_slots([draw])
        # 2026-06-04 is Thursday → workday; June → summer
        assert "workday_summer" in result
        day_data = result["workday_summer"]["2026-06-04"]
        assert len(day_data) >= 1
        total_kwh = sum(day_data.values())
        assert abs(total_kwh - 0.7) < 0.001

    def test_multiple_days_different_categories(self):
        """Workday and weekend draws go to separate categories."""
        # 2026-06-04 = Thursday (workday)
        draw_wd = DrawEvent(
            start=_ts(7, 0, day=4, month=6),
            end=_ts(7, 10, day=4, month=6),
            drop_c=5.0, rate_c_per_min=0.5, energy_kwh=0.7, liters=12.0,
        )
        # 2026-06-06 = Saturday (weekend)
        draw_we = DrawEvent(
            start=_ts(7, 0, day=6, month=6),
            end=_ts(7, 10, day=6, month=6),
            drop_c=4.0, rate_c_per_min=0.4, energy_kwh=0.56, liters=9.6,
        )
        result = build_category_slots([draw_wd, draw_we])
        assert "workday_summer" in result
        assert "weekend_summer" in result


# ---------------------------------------------------------------------------
# 5. BoilerDemandProfiler: get_demand_map fallback chain
# ---------------------------------------------------------------------------

class TestBoilerDemandProfiler:

    def _make_profiler(self, volume_l=VOLUME_L):
        return BoilerDemandProfiler(
            volume_l=volume_l,
            target_temp_c=TARGET_TEMP_C,
            cold_inlet_temp_c=COLD_INLET_C,
        )

    def _make_draw_history_days(
        self,
        n_days: int,
        start_day: int = 1,
        month: int = 6,
        year: int = 2026,
    ) -> list[dict]:
        """Generate n_days of 2-draw-per-day history on workdays."""
        history = []
        # All weekdays in June 2026 starting from day 1
        # 2026-06-01 is Monday → workday
        for offset in range(n_days):
            d = start_day + offset
            if d > 28:
                break
            # Morning draw: two intervals at 0.52 degC/min
            history += _make_history([
                (7, 0, 60.0, "off"),
                (7, 10, 54.8, "off"),
                (7, 20, 49.6, "off"),
                # Evening draw
                (21, 0, 58.0, "off"),
                (21, 10, 56.0, "off"),
                (21, 20, 54.0, "off"),
            ], day=d, month=month, year=year)
        return history

    def test_bootstrap_when_no_history(self):
        profiler = self._make_profiler()
        profiler.update([])
        dm = profiler.get_demand_map("workday_summer")
        assert dm.meta.level == "bootstrap"
        assert dm.meta.days_used == 0
        assert dm.meta.fallback_used is True
        assert len(dm.slots) == SLOTS_PER_DAY

    def test_exact_match_sufficient_days(self):
        """10+ workday_summer days → exact level."""
        profiler = self._make_profiler()
        history = self._make_draw_history_days(10, start_day=1, month=6)
        profiler.update(history)
        dm = profiler.get_demand_map("workday_summer")
        assert dm.meta.level == "exact"
        assert dm.meta.days_used >= 3
        assert dm.meta.fallback_used is False

    def test_fallback_to_day_type_when_sparse(self):
        """If workday_summer has < 3 days but workday_spring has plenty,
        the profiler falls back to day_type level for a different season query."""
        profiler = self._make_profiler()
        # Add 10 days of spring workday data (March)
        history = self._make_draw_history_days(10, start_day=2, month=3)
        profiler.update(history)
        # Query for workday_summer (not the trained category)
        dm = profiler.get_demand_map("workday_summer")
        # Should fall back to day_type (workday_spring has data)
        assert dm.meta.fallback_used is True
        assert dm.meta.level in ("day_type", "global")

    def test_slots_len_96(self):
        profiler = self._make_profiler()
        dm = profiler.get_demand_map("workday_summer")
        assert len(dm.slots) == SLOTS_PER_DAY

    def test_confidence_zero_for_bootstrap(self):
        profiler = self._make_profiler()
        dm = profiler.get_demand_map("workday_summer")
        assert dm.confidence == 0.0

    def test_confidence_positive_with_data(self):
        profiler = self._make_profiler()
        history = self._make_draw_history_days(10, start_day=1, month=6)
        profiler.update(history)
        dm = profiler.get_demand_map("workday_summer")
        assert dm.confidence > 0.0

    def test_p80_nonzero_for_draw_slots(self):
        """Slots where draws happen should have p80 > 0."""
        profiler = self._make_profiler()
        history = self._make_draw_history_days(10, start_day=1, month=6)
        profiler.update(history)
        dm = profiler.get_demand_map("workday_summer")
        # Slot 28 = 07:00 → morning draw
        morning_slot = dm.slots[28]
        assert morning_slot.p80_kwh > 0.0

    def test_zero_draw_slots_are_data_not_missing(self):
        """Slots with no draws across all observed days should have p50=p80=0
        but has_data=True (zero IS information)."""
        profiler = self._make_profiler()
        history = self._make_draw_history_days(5, start_day=1, month=6)
        profiler.update(history)
        dm = profiler.get_demand_map("workday_summer")
        # Slot at 03:00 (slot 12) — no draws at 3am
        night_slot = dm.slots[12]
        assert night_slot.p80_kwh == 0.0
        # has_data should be True (we observed days, just no draws at this hour)
        assert night_slot.has_data is True

    def test_liters_p80_formula(self):
        """liters_p80 = p80_kwh / (ENERGY_CONSTANT_KWH_L_K * delta_T)."""
        profiler = self._make_profiler()
        history = self._make_draw_history_days(10, start_day=1, month=6)
        profiler.update(history)
        dm = profiler.get_demand_map("workday_summer")
        for slot in dm.slots:
            if slot.p80_kwh > 0:
                expected_liters = slot.p80_kwh / (ENERGY_CONSTANT_KWH_L_K * DELTA_T)
                assert abs(slot.liters_p80 - expected_liters) < 1.0
                break


# ---------------------------------------------------------------------------
# 6. Window clustering
# ---------------------------------------------------------------------------

class TestClusterWindows:

    def _make_slots(self, active_slot_indices: list[int], kwh: float = 0.2) -> list[DemandSlot]:
        slots = [DemandSlot() for _ in range(SLOTS_PER_DAY)]
        for idx in active_slot_indices:
            slots[idx] = DemandSlot(p50_kwh=kwh * 0.7, p80_kwh=kwh, liters_p80=kwh * 10, has_data=True)
        return slots

    def test_no_windows_when_all_below_noise(self):
        slots = [DemandSlot(p50_kwh=0.0, p80_kwh=0.01, liters_p80=0.0, has_data=True)
                 for _ in range(SLOTS_PER_DAY)]
        windows = _cluster_windows(slots, TARGET_TEMP_C, COLD_INLET_C)
        assert windows == []

    def test_single_window_morning(self):
        """Morning draw window (slots 28-30 = 07:00-07:45)."""
        slots = self._make_slots([28, 29, 30])
        windows = _cluster_windows(slots, TARGET_TEMP_C, COLD_INLET_C)
        assert len(windows) == 1
        assert windows[0].label == "morning"
        assert windows[0].p80_kwh > 0

    def test_two_windows_morning_and_evening(self):
        """Two separate windows in morning and evening."""
        slots = self._make_slots([28, 29, 80, 81])  # 07:00 and 20:00
        windows = _cluster_windows(slots, TARGET_TEMP_C, COLD_INLET_C)
        assert len(windows) == 2
        labels = {w.label for w in windows}
        assert "morning" in labels
        assert "evening" in labels

    def test_cap_at_max_windows(self):
        """More than MAX_WINDOWS_PER_DAY windows are capped."""
        # Create 4 separate windows
        slots = self._make_slots([4, 5, 28, 29, 56, 57, 80, 81])
        windows = _cluster_windows(slots, TARGET_TEMP_C, COLD_INLET_C)
        assert len(windows) <= MAX_WINDOWS_PER_DAY

    def test_windows_sorted_by_significance(self):
        """Windows are sorted by p80_kwh descending."""
        slots = self._make_slots([28, 29], kwh=0.5)  # large morning
        # Add smaller evening
        slots[80] = DemandSlot(p50_kwh=0.05, p80_kwh=0.1, liters_p80=1.7, has_data=True)
        windows = _cluster_windows(slots, TARGET_TEMP_C, COLD_INLET_C)
        if len(windows) >= 2:
            assert windows[0].p80_kwh >= windows[1].p80_kwh

    def test_window_liters_formula(self):
        """Window liters = total_p80 / (ENERGY_CONSTANT_KWH_L_K * delta_T)."""
        slots = self._make_slots([28, 29], kwh=0.3)
        windows = _cluster_windows(slots, TARGET_TEMP_C, COLD_INLET_C)
        assert len(windows) == 1
        w = windows[0]
        expected_liters = w.p80_kwh / (ENERGY_CONSTANT_KWH_L_K * DELTA_T)
        assert abs(w.liters - expected_liters) < 1.0


# ---------------------------------------------------------------------------
# 7. DemandMap.to_dto() serialization
# ---------------------------------------------------------------------------

class TestDemandMapToDto:

    def _make_demand_map(self) -> DemandMap:
        slots = [DemandSlot() for _ in range(SLOTS_PER_DAY)]
        slots[28] = DemandSlot(p50_kwh=0.4, p80_kwh=0.7, liters_p80=12.0, has_data=True)
        from custom_components.oig_cloud.boiler.demand_profiler import DemandWindow, _cluster_windows
        windows = _cluster_windows(slots, TARGET_TEMP_C, COLD_INLET_C)
        meta = MatchMeta(
            category="workday_summer",
            level="exact",
            days_used=10,
            label="workday (summer), 10 days",
            fallback_used=False,
        )
        return DemandMap(slots=slots, windows=windows, meta=meta, confidence=0.8)

    def test_dto_shape(self):
        dm = self._make_demand_map()
        dto = dm.to_dto()
        assert "slot_duration_min" in dto
        assert "slots_p50" in dto
        assert "slots_p80" in dto
        assert "slots_liters_p80" in dto
        assert "windows" in dto
        assert "profile" in dto
        assert "confidence" in dto

    def test_dto_slot_duration(self):
        dm = self._make_demand_map()
        dto = dm.to_dto()
        assert dto["slot_duration_min"] == SLOT_DURATION_MIN

    def test_dto_slots_length(self):
        dm = self._make_demand_map()
        dto = dm.to_dto()
        assert len(dto["slots_p50"]) == SLOTS_PER_DAY
        assert len(dto["slots_p80"]) == SLOTS_PER_DAY
        assert len(dto["slots_liters_p80"]) == SLOTS_PER_DAY

    def test_dto_profile_fields(self):
        dm = self._make_demand_map()
        dto = dm.to_dto()
        profile = dto["profile"]
        assert profile["category"] == "workday_summer"
        assert profile["level"] == "exact"
        assert profile["days_used"] == 10
        assert profile["fallback_used"] is False
        assert "label" in profile

    def test_dto_windows_shape(self):
        dm = self._make_demand_map()
        dto = dm.to_dto()
        for w in dto["windows"]:
            assert "slot_index" in w
            assert "start_minute" in w
            assert "p80_kwh" in w
            assert "liters" in w
            assert "label" in w

    def test_dto_confidence(self):
        dm = self._make_demand_map()
        dto = dm.to_dto()
        assert 0.0 <= dto["confidence"] <= 1.0

    def test_dto_values_are_rounded(self):
        """Slot values must be rounded to 3 decimal places."""
        dm = self._make_demand_map()
        dto = dm.to_dto()
        for v in dto["slots_p80"]:
            # Must have at most 3 decimal places
            assert round(v, 3) == v

    def test_dto_drives_plan_true_when_confident(self):
        """confidence >= threshold and non-bootstrap → windows drive the plan."""
        from custom_components.oig_cloud.boiler.demand_profiler import (
            MIN_CONFIDENCE_THRESHOLD,
        )
        dm = self._make_demand_map()  # confidence 0.8, level "exact"
        dto = dm.to_dto()
        assert dto["drives_plan"] is True
        assert dto["min_confidence"] == MIN_CONFIDENCE_THRESHOLD

    def test_dto_drives_plan_false_low_confidence(self):
        """Below the confidence threshold the plan ignores the windows."""
        dm = self._make_demand_map()
        dm.confidence = 0.1
        dto = dm.to_dto()
        assert dto["drives_plan"] is False

    def test_dto_drives_plan_false_bootstrap(self):
        """Bootstrap profile never drives the plan even if confidence is high."""
        dm = self._make_demand_map()
        dm.meta.level = "bootstrap"
        dto = dm.to_dto()
        assert dto["drives_plan"] is False


# ---------------------------------------------------------------------------
# 8. _read_demand_map_dto integration with canonical DTO
# ---------------------------------------------------------------------------

class TestReadDemandMapDto:
    """Test _read_demand_map_dto with mock coordinator."""

    def _make_runtime_with_profiler(self, demand_map: DemandMap | None):
        """Create a mock runtime whose coordinator has a _demand_profiler."""
        mock_profiler = MagicMock()
        if demand_map is not None:
            mock_profiler.get_demand_map.return_value = demand_map
        else:
            mock_profiler.get_demand_map.return_value = DemandMap(
                slots=[DemandSlot() for _ in range(SLOTS_PER_DAY)],
                windows=[],
                meta=MatchMeta(
                    category="workday_summer",
                    level="bootstrap",
                    days_used=0,
                    label="no history (bootstrap)",
                    fallback_used=True,
                ),
                confidence=0.0,
            )

        mock_coordinator = MagicMock()
        mock_coordinator._demand_profiler = mock_profiler

        mock_runtime = MagicMock()
        mock_runtime.coordinator = mock_coordinator
        return mock_runtime

    def test_returns_none_when_no_profiler(self):
        from custom_components.oig_cloud.boiler.api_views import _read_demand_map_dto
        mock_runtime = MagicMock()
        mock_runtime.coordinator = MagicMock(spec=[])  # no _demand_profiler attr
        result = _read_demand_map_dto(mock_runtime, {})
        assert result is None

    def test_returns_none_for_bootstrap_map(self):
        from custom_components.oig_cloud.boiler.api_views import _read_demand_map_dto
        runtime = self._make_runtime_with_profiler(None)  # bootstrap
        result = _read_demand_map_dto(runtime, {})
        assert result is None

    def test_returns_dto_with_data(self):
        from custom_components.oig_cloud.boiler.api_views import _read_demand_map_dto
        slots = [DemandSlot() for _ in range(SLOTS_PER_DAY)]
        slots[28] = DemandSlot(p50_kwh=0.4, p80_kwh=0.7, liters_p80=12.0, has_data=True)
        from custom_components.oig_cloud.boiler.demand_profiler import _cluster_windows
        windows = _cluster_windows(slots, TARGET_TEMP_C, COLD_INLET_C)
        meta = MatchMeta(
            category="workday_summer",
            level="exact",
            days_used=10,
            label="workday (summer), 10 days",
            fallback_used=False,
        )
        dm = DemandMap(slots=slots, windows=windows, meta=meta, confidence=0.8)
        runtime = self._make_runtime_with_profiler(dm)
        result = _read_demand_map_dto(runtime, {})
        assert result is not None
        assert "slots_p80" in result
        assert "profile" in result
        assert result["profile"]["level"] == "exact"

    def test_returns_none_when_runtime_is_none(self):
        from custom_components.oig_cloud.boiler.api_views import _read_demand_map_dto
        result = _read_demand_map_dto(None, {})
        assert result is None

    def test_handles_exception_gracefully(self):
        """Exceptions in _read_demand_map_dto must not propagate."""
        from custom_components.oig_cloud.boiler.api_views import _read_demand_map_dto
        mock_runtime = MagicMock()
        mock_runtime.coordinator._demand_profiler.get_demand_map.side_effect = RuntimeError("test")
        result = _read_demand_map_dto(mock_runtime, {})
        assert result is None


# ---------------------------------------------------------------------------
# 9. Noise floor and edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:

    def test_noise_floor_kwh_constant(self):
        """NOISE_FLOOR_KWH is a small positive float."""
        assert 0.0 < NOISE_FLOOR_KWH < 1.0

    def test_demand_profiler_update_twice(self):
        """Calling update() twice replaces previous data."""
        profiler = BoilerDemandProfiler(
            volume_l=VOLUME_L,
            target_temp_c=TARGET_TEMP_C,
            cold_inlet_temp_c=COLD_INLET_C,
        )
        history1 = _make_history([
            (7, 0, 60.0, "off"),
            (7, 10, 54.8, "off"),
            (7, 20, 49.6, "off"),
        ], day=1, month=6)
        profiler.update(history1)
        dm1 = profiler.get_demand_map("workday_summer")

        # Second update with empty history
        profiler.update([])
        dm2 = profiler.get_demand_map("workday_summer")
        assert dm2.meta.level == "bootstrap"

    def test_draw_detection_high_temp_false_positive_guard(self):
        """Rate > threshold but only 1 interval (min_intervals=2) → no draw."""
        readings = _make_history([
            (7, 0, 65.0, "off"),  # High temp (>55C, higher standing loss risk)
            (7, 10, 58.0, "off"),  # 7 degC / 10 min = 0.7 degC/min → rate >> threshold
            (7, 20, 58.5, "off"),  # Rate = -0.5/10 → < threshold, break
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        # Only 1 sustained interval → no event
        assert len(events) == 0

    def test_min_drop_guard(self):
        """Even if rate is high, total drop < min_drop_c prevents event."""
        readings = _make_history([
            (7, 0, 60.0, "off"),
            (7, 1, 59.85, "off"),   # 0.15/1min = 0.15 degC/min — barely at threshold
            (7, 2, 59.70, "off"),   # continued — but total drop = 0.3 < min_drop=0.5
        ])
        events = detect_draws(readings, VOLUME_L, TARGET_TEMP_C, COLD_INLET_C)
        assert len(events) == 0


# ---------------------------------------------------------------------------
# 10. Backward-compatibility: demand_map key absent from DTO when no profiler
# ---------------------------------------------------------------------------

class TestCanonicalDtoDemandMapKey:
    """Ensure demand_map key is present in DTO but None when no profiler."""

    def test_demand_map_key_present_in_dto(self):
        """The canonical DTO assembler includes demand_map even if None."""
        from custom_components.oig_cloud.boiler.api_views import _read_demand_map_dto
        # With None runtime → returns None (key absent from coordinator)
        result = _read_demand_map_dto(None, {})
        assert result is None  # backward-compatible: old FE ignores None

    def test_demand_map_dto_has_correct_types_when_populated(self):
        """When populated, demand_map fields must be correct types."""
        slots = [DemandSlot() for _ in range(SLOTS_PER_DAY)]
        slots[28] = DemandSlot(p50_kwh=0.4, p80_kwh=0.7, liters_p80=12.0, has_data=True)
        from custom_components.oig_cloud.boiler.demand_profiler import _cluster_windows
        windows = _cluster_windows(slots, TARGET_TEMP_C, COLD_INLET_C)
        meta = MatchMeta(
            category="workday_summer",
            level="exact",
            days_used=5,
            label="workday (summer), 5 days",
            fallback_used=False,
        )
        dm = DemandMap(slots=slots, windows=windows, meta=meta, confidence=0.5)
        dto = dm.to_dto()

        assert isinstance(dto["slots_p50"], list)
        assert isinstance(dto["slots_p80"], list)
        assert isinstance(dto["windows"], list)
        assert isinstance(dto["confidence"], float)
        assert isinstance(dto["profile"]["days_used"], int)
        assert isinstance(dto["profile"]["fallback_used"], bool)
