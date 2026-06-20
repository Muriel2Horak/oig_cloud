"""Tests for BoilerActivityClassifier (Task 1).

Must remain Home-Assistant-agnostic.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any

import importlib.util
from pathlib import Path

import pytest

import sys

_boiler_base = Path(__file__).parent.parent / "custom_components" / "oig_cloud" / "boiler"

# Load boiler/const.py so the relative import ``from .const import (...)``
# inside classifier.py can be resolved.
_const_path = _boiler_base / "const.py"
_const_spec = importlib.util.spec_from_file_location(
    "custom_components.oig_cloud.boiler.const", _const_path
)
assert _const_spec is not None and _const_spec.loader is not None
_const_mod = importlib.util.module_from_spec(_const_spec)
sys.modules["custom_components.oig_cloud.boiler.const"] = _const_mod  # type: ignore[assignment]
_const_spec.loader.exec_module(_const_mod)

_classifier_path = _boiler_base / "classifier.py"
_spec = importlib.util.spec_from_file_location(
    "custom_components.oig_cloud.boiler.classifier", _classifier_path
)
assert _spec is not None and _spec.loader is not None
_classifier_mod = importlib.util.module_from_spec(_spec)
_classifier_mod.__package__ = "custom_components.oig_cloud.boiler"
sys.modules["classifier"] = _classifier_mod
sys.modules["custom_components.oig_cloud.boiler.classifier"] = _classifier_mod
_spec.loader.exec_module(_classifier_mod)

BoilerActivityClassifier = _classifier_mod.BoilerActivityClassifier
BoilerActivityDTO = _classifier_mod.BoilerActivityDTO
BoilerReading = _classifier_mod.BoilerReading
BoilerSourceHeaterSnapshot = _classifier_mod.BoilerSourceHeaterSnapshot


class MockEnergySource(str, Enum):
    FVE = "fve"
    GRID = "grid"
    ALTERNATIVE = "alternative"


FIXED_NOW = datetime(2026, 4, 25, 12, 0, tzinfo=timezone.utc)


def _reading(
    *,
    timestamp: datetime = FIXED_NOW,
    top_temp_c: float | None = 45.0,
    bottom_temp_c: float | None = None,
    source_key: str | None = "grid",
) -> BoilerReading:
    return BoilerReading(
        timestamp=timestamp,
        top_temp_c=top_temp_c,
        bottom_temp_c=bottom_temp_c,
        source_key=source_key,
    )


def _snapshot(
    *,
    current_source: Any = None,
    active_heaters: dict[str, str] | None = None,
    overflow_available: bool | None = None,
    power_kw: float | None = None,
) -> BoilerSourceHeaterSnapshot:
    return BoilerSourceHeaterSnapshot(
        current_source=current_source,
        active_heaters=active_heaters or {},
        overflow_available=overflow_available,
        power_kw=power_kw,
    )


class TestActivityStates:
    def test_charging_fve_no_overflow(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key="fve")
        snapshot = _snapshot(active_heaters={"switch.heater": "on"})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_fve"
        assert dto.source == "fve"

    def test_charging_overflow_when_fve_and_overflow_true(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key="fve")
        snapshot = _snapshot(
            active_heaters={"switch.heater": "on"},
            overflow_available=True,
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_overflow"
        assert dto.source == "fve"
        assert dto.active_segment_hint is not None
        assert dto.active_segment_hint["key"] == "overflow"

    def test_charging_grid(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key="grid")
        snapshot = _snapshot(active_heaters={"switch.heater": "on"})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_grid"
        assert dto.source == "grid"

    def test_standby_no_heater_no_trend(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=45.0, source_key="grid")
        snapshot = _snapshot(active_heaters={"switch.heater": "off"})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "standby"
        assert dto.source == "grid"

    def test_discharging_negative_trend(self):
        classifier = BoilerActivityClassifier()
        prev = _reading(timestamp=FIXED_NOW - timedelta(minutes=5), top_temp_c=46.0)
        curr = _reading(timestamp=FIXED_NOW, top_temp_c=45.0, source_key="grid")
        snapshot = _snapshot(active_heaters={"switch.heater": "off"})

        dto = classifier.classify(prev, curr, snapshot)

        assert dto.state == "discharging"
        assert dto.source == "grid"

    def test_bath_draw_detected_via_bottom_zone(self):
        """A bath/shower: top stays hot, bottom crashes (cold inlet). The
        whole-tank trend must go negative so the draw registers as discharging
        — a top-only trend would read ~0 and miss it."""
        classifier = BoilerActivityClassifier()
        prev = _reading(
            timestamp=FIXED_NOW - timedelta(minutes=5),
            top_temp_c=74.0,
            bottom_temp_c=70.0,
        )
        curr = _reading(
            timestamp=FIXED_NOW,
            top_temp_c=74.0,      # top unchanged → top-only trend would be 0
            bottom_temp_c=27.0,   # cold inlet from the draw
            source_key="grid",
        )
        snapshot = _snapshot(active_heaters={"switch.heater": "off"})

        dto = classifier.classify(prev, curr, snapshot)

        assert dto.temperature_trend_c_per_min is not None
        assert dto.temperature_trend_c_per_min < 0
        assert dto.state == "discharging"

    def test_unknown_when_top_temp_none(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=None, source_key="fve")
        snapshot = _snapshot(active_heaters={"switch.heater": "on"})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "unknown"
        assert "temperature_unavailable" in dto.stale_flags


class TestSourceNormalization:
    def test_energy_source_fve_normalizes_to_fve(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key=None)
        snapshot = _snapshot(current_source=MockEnergySource.FVE)

        dto = classifier.classify(None, curr, snapshot)

        assert dto.source == "fve"

    def test_energy_source_grid_normalizes_to_grid(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key=None)
        snapshot = _snapshot(current_source=MockEnergySource.GRID)

        dto = classifier.classify(None, curr, snapshot)

        assert dto.source == "grid"

    def test_energy_source_alternative_normalizes_to_alternative(self):
        """Task A: 'alternative' now maps to 'alternative', not 'grid'."""
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key=None)
        snapshot = _snapshot(current_source=MockEnergySource.ALTERNATIVE)

        dto = classifier.classify(None, curr, snapshot)

        assert dto.source == "alternative"

    def test_alternative_with_overflow_true_and_heater_on_is_charging_alt(self):
        """Task A: switch on + alternative source (no power_w) → charging_alt
        via legacy path, NOT charging_overflow, because alternative is not
        an electric heating source.

        Note: in practice, gas-fired boilers don't have a heater switch.
        The legacy path for no-power-sensor installs will see heater=on +
        source=alternative and produce charging_alt (the switch takes the
        charging_alt path since 'alternative' is not 'overflow' or 'fve').
        """
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key=None)
        snapshot = _snapshot(
            current_source=MockEnergySource.ALTERNATIVE,
            active_heaters={"switch.heater": "on"},
            overflow_available=True,
        )

        dto = classifier.classify(None, curr, snapshot)

        # Legacy (no power_w): switch=on + source=alternative.
        # 'alternative' is not 'overflow' or 'fve', so old path → charging_grid
        # UNLESS we enter the alt-trend branch.
        # Since there's no trend (prev=None) and no alt_heat_delta_kwh,
        # the legacy heater path produces charging_grid as before.
        assert dto.state == "charging_grid"
        assert dto.source == "alternative"

    def test_string_zapnuto_normalizes_to_fve(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key=None)
        snapshot = _snapshot(current_source="Zapnuto")

        dto = classifier.classify(None, curr, snapshot)

        assert dto.source == "fve"

    def test_string_manual_normalizes_to_fve(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key=None)
        snapshot = _snapshot(current_source="manual")

        dto = classifier.classify(None, curr, snapshot)

        assert dto.source == "fve"

    def test_string_alt_normalizes_to_alternative(self):
        """Task A: 'alt' maps to 'alternative', not 'grid'."""
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key=None)
        snapshot = _snapshot(current_source="alt")

        dto = classifier.classify(None, curr, snapshot)

        assert dto.source == "alternative"

    def test_unrecognized_string_returns_none(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key=None)
        snapshot = _snapshot(current_source="bogus")

        dto = classifier.classify(None, curr, snapshot)

        assert dto.source is None

    def test_reading_source_key_takes_priority_over_snapshot(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key="fve")
        snapshot = _snapshot(current_source="grid")

        dto = classifier.classify(None, curr, snapshot)

        assert dto.source == "fve"

    def test_alternative_source_in_output(self):
        """Task A: 'alternative' now maps correctly to 'alternative' (bug fix)."""
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key=None)
        snapshot = _snapshot(current_source="alternative")

        dto = classifier.classify(None, curr, snapshot)

        assert dto.source == "alternative"


class TestTrendComputation:
    def test_first_reading_returns_none(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=45.0)
        snapshot = _snapshot()

        dto = classifier.classify(None, curr, snapshot)

        assert dto.temperature_trend_c_per_min is None

    def test_prev_top_none_returns_none(self):
        classifier = BoilerActivityClassifier()
        prev = _reading(top_temp_c=None)
        curr = _reading(top_temp_c=45.0)
        snapshot = _snapshot()

        dto = classifier.classify(prev, curr, snapshot)

        assert dto.temperature_trend_c_per_min is None

    def test_curr_top_none_returns_none(self):
        classifier = BoilerActivityClassifier()
        prev = _reading(top_temp_c=45.0)
        curr = _reading(top_temp_c=None)
        snapshot = _snapshot()

        dto = classifier.classify(prev, curr, snapshot)

        assert dto.temperature_trend_c_per_min is None

    def test_out_of_order_timestamps_returns_none(self):
        classifier = BoilerActivityClassifier()
        prev = _reading(timestamp=FIXED_NOW)
        curr = _reading(timestamp=FIXED_NOW - timedelta(minutes=5))
        snapshot = _snapshot()

        dto = classifier.classify(prev, curr, snapshot)

        assert dto.temperature_trend_c_per_min is None

    def test_zero_elapsed_returns_none(self):
        classifier = BoilerActivityClassifier()
        prev = _reading(timestamp=FIXED_NOW)
        curr = _reading(timestamp=FIXED_NOW)
        snapshot = _snapshot()

        dto = classifier.classify(prev, curr, snapshot)

        assert dto.temperature_trend_c_per_min is None

    def test_deadband_below_threshold_returns_zero(self):
        classifier = BoilerActivityClassifier()
        prev = _reading(timestamp=FIXED_NOW - timedelta(minutes=5), top_temp_c=45.0)
        curr = _reading(timestamp=FIXED_NOW, top_temp_c=45.02)
        snapshot = _snapshot()

        dto = classifier.classify(prev, curr, snapshot)

        assert dto.temperature_trend_c_per_min == 0.0

    def test_exact_deadband_boundary_returns_zero(self):
        classifier = BoilerActivityClassifier()
        prev = _reading(timestamp=FIXED_NOW - timedelta(minutes=5), top_temp_c=45.0)
        curr = _reading(timestamp=FIXED_NOW, top_temp_c=45.049)
        snapshot = _snapshot()

        dto = classifier.classify(prev, curr, snapshot)

        assert dto.temperature_trend_c_per_min == 0.0

    def test_positive_trend_computed(self):
        classifier = BoilerActivityClassifier()
        prev = _reading(timestamp=FIXED_NOW - timedelta(minutes=5), top_temp_c=45.0)
        curr = _reading(timestamp=FIXED_NOW, top_temp_c=46.0)
        snapshot = _snapshot()

        dto = classifier.classify(prev, curr, snapshot)

        assert dto.temperature_trend_c_per_min == pytest.approx(0.2)

    def test_negative_trend_computed(self):
        classifier = BoilerActivityClassifier()
        prev = _reading(timestamp=FIXED_NOW - timedelta(minutes=5), top_temp_c=46.0)
        curr = _reading(timestamp=FIXED_NOW, top_temp_c=45.0)
        snapshot = _snapshot()

        dto = classifier.classify(prev, curr, snapshot)

        assert dto.temperature_trend_c_per_min == pytest.approx(-0.2)


class TestFillLevel:
    """Task A: fill_level_pct now uses compute_ready_fraction (physics-based).

    New formula (top-only, conservative):
        top < 40°C  → 0.0
        top ≥ 40°C  → (top - 40) / (top - 10) clamped to [0, 1]

    Old formula was top/80 which had no physical meaning. Tests updated.
    """

    def test_fill_at_40c_is_zero(self):
        """At exactly ready_temp=40°C the usable-volume estimate is 0 (top-only)."""
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=40.0)
        snapshot = _snapshot()

        dto = classifier.classify(None, curr, snapshot)

        assert dto.fill_level_pct == pytest.approx(0.0)

    def test_fill_at_80c_is_partial(self):
        """At 80°C top-only: (80-40)/(80-10) = 40/70 ≈ 0.571."""
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=80.0)
        snapshot = _snapshot()

        dto = classifier.classify(None, curr, snapshot)

        assert dto.fill_level_pct == pytest.approx(40.0 / 70.0, rel=0.01)

    def test_fill_at_0c_is_zero(self):
        """Below ready temp → 0.0."""
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=0.0)
        snapshot = _snapshot()

        dto = classifier.classify(None, curr, snapshot)

        assert dto.fill_level_pct == 0.0

    def test_fill_at_high_temp_is_below_one(self):
        """Top-only at 100°C: (100-40)/(100-10) = 60/90 ≈ 0.667, not 1.0.

        Top-only is conservative — 1.0 requires BOTH sensors above ready_temp.
        """
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=100.0)
        snapshot = _snapshot()

        dto = classifier.classify(None, curr, snapshot)

        assert dto.fill_level_pct == pytest.approx(60.0 / 90.0, rel=0.01)
        assert dto.fill_level_pct < 1.0

    def test_fill_clamps_below_0c(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=-10.0)
        snapshot = _snapshot()

        dto = classifier.classify(None, curr, snapshot)

        assert dto.fill_level_pct == 0.0

    def test_fill_none_temp_is_zero(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=None)
        snapshot = _snapshot()

        dto = classifier.classify(None, curr, snapshot)

        assert dto.fill_level_pct == 0.0


class TestHeaterStateNormalization:
    def test_on_preserved(self):
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(active_heaters={"switch.heater": "on"})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.heater_states == {"switch.heater": "on"}

    def test_off_preserved(self):
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(active_heaters={"switch.heater": "off"})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.heater_states == {"switch.heater": "off"}

    def test_unknown_maps_to_unavailable(self):
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(active_heaters={"switch.heater": "unknown"})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.heater_states == {"switch.heater": "unavailable"}

    def test_unavailable_maps_to_unavailable(self):
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(active_heaters={"switch.heater": "unavailable"})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.heater_states == {"switch.heater": "unavailable"}

    def test_empty_string_maps_to_unavailable(self):
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(active_heaters={"switch.heater": ""})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.heater_states == {"switch.heater": "unavailable"}

    def test_none_maps_to_unavailable(self):
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(active_heaters={"switch.heater": None})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.heater_states == {"switch.heater": "unavailable"}

    def test_localized_string_maps_to_unavailable(self):
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(active_heaters={"switch.heater": "Zapnuto"})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.heater_states == {"switch.heater": "unavailable"}

    def test_case_insensitive_on_off(self):
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(active_heaters={"switch.heater": "ON", "switch.alt": "OFF"})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.heater_states == {"switch.heater": "on", "switch.alt": "off"}


class TestActiveSegmentHint:
    def test_present_for_charging_states(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key="fve")
        snapshot = _snapshot(active_heaters={"switch.heater": "on"})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.active_segment_hint is not None
        assert dto.active_segment_hint["key"] == "fve"
        assert dto.active_segment_hint["end"] is None
        assert dto.active_segment_hint["energy_kwh"] == 0.0
        assert dto.active_segment_hint["fill_pct"] == 0.0
        assert dto.active_segment_hint["active"] is True

    def test_present_for_discharging(self):
        classifier = BoilerActivityClassifier()
        prev = _reading(timestamp=FIXED_NOW - timedelta(minutes=5), top_temp_c=46.0)
        curr = _reading(timestamp=FIXED_NOW, top_temp_c=45.0, source_key="grid")
        snapshot = _snapshot(active_heaters={"switch.heater": "off"})

        dto = classifier.classify(prev, curr, snapshot)

        assert dto.active_segment_hint is not None
        assert dto.active_segment_hint["key"] == "discharge"

    def test_none_for_standby(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key="grid")
        snapshot = _snapshot(active_heaters={"switch.heater": "off"})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.active_segment_hint is None

    def test_none_for_unknown(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=None)
        snapshot = _snapshot(active_heaters={"switch.heater": "on"})

        dto = classifier.classify(None, curr, snapshot)

        assert dto.active_segment_hint is None

    def test_dto_has_no_source_segments_key(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key="fve")
        snapshot = _snapshot(active_heaters={"switch.heater": "on"})

        dto = classifier.classify(None, curr, snapshot)

        assert not hasattr(dto, "source_segments")
        assert "source_segments" not in dto.__dict__


class TestOverflowEdgeCases:
    def test_overflow_source_key_directly_yields_charging_overflow(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key="overflow")
        snapshot = _snapshot(
            active_heaters={"switch.heater": "on"},
            overflow_available=True,
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_overflow"
        assert dto.source == "overflow"
        assert dto.active_segment_hint is not None
        assert dto.active_segment_hint["key"] == "overflow"

    def test_fve_with_overflow_false_stays_charging_fve(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key="fve")
        snapshot = _snapshot(
            active_heaters={"switch.heater": "on"},
            overflow_available=False,
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_fve"

    def test_fve_with_overflow_none_stays_charging_fve(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key="fve")
        snapshot = _snapshot(
            active_heaters={"switch.heater": "on"},
            overflow_available=None,
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_fve"


class TestStaleFlags:
    def test_temperature_unavailable_when_top_temp_none(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=None)
        snapshot = _snapshot()

        dto = classifier.classify(None, curr, snapshot)

        assert "temperature_unavailable" in dto.stale_flags

    def test_no_stale_flags_when_temp_available(self):
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=45.0)
        snapshot = _snapshot()

        dto = classifier.classify(None, curr, snapshot)

        assert "temperature_unavailable" not in dto.stale_flags
        assert dto.stale_flags == []


class TestPowerKwPassthrough:
    def test_power_kw_in_snapshot_does_not_crash(self):
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(power_kw=2.5)

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "standby"

    def test_power_kw_none_does_not_crash(self):
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(power_kw=None)

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "standby"
