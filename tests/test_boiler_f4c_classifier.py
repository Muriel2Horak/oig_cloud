"""Tests for Task A: power-first classifier truth table.

Covers:
- 0 W + switch on  → NOT charging (power wins over switch)
- 2000 W + CBB mode → charging_overflow / charging_fve
- 2000 W + manual + grid import → charging_grid
- 2000 W + manual + no grid import → charging_fve
- gas delta → charging_alt
- trend-estimated alt heat
- switch fallback when power sensor missing
- compute_ready_fraction physics (47.2 / 38.7 / 200 L → ≈ 0.85)
- ready_fraction both below 40 → 0.0
- ready_fraction top-only cases
"""

from __future__ import annotations

import importlib.util
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import pytest

# ---------------------------------------------------------------------------
# Load classifier module HA-agnostically.
#
# classifier.py now does ``from .const import (...)`` — we must register the
# const module under the relative-import key used by the package BEFORE
# loading the classifier.
# ---------------------------------------------------------------------------

_boiler_base = (
    Path(__file__).parent.parent
    / "custom_components"
    / "oig_cloud"
    / "boiler"
)

# 1. Load boiler/const.py as "custom_components.oig_cloud.boiler.const"
_const_path = _boiler_base / "const.py"
_const_spec = importlib.util.spec_from_file_location(
    "custom_components.oig_cloud.boiler.const", _const_path
)
assert _const_spec and _const_spec.loader
_const_mod = importlib.util.module_from_spec(_const_spec)
sys.modules["custom_components.oig_cloud.boiler.const"] = _const_mod  # type: ignore[assignment]
_const_spec.loader.exec_module(_const_mod)

# 2. Load boiler/classifier.py.
#    The classifier now uses ``from .const import (...)`` — a relative import.
#    We register it under the full dotted name so Python can resolve the
#    relative import via __package__ and sys.modules.
_classifier_path = _boiler_base / "classifier.py"
_spec = importlib.util.spec_from_file_location(
    "custom_components.oig_cloud.boiler.classifier",
    _classifier_path,
)
assert _spec and _spec.loader
_classifier_mod = importlib.util.module_from_spec(_spec)
# Set __package__ so relative imports are resolved correctly.
_classifier_mod.__package__ = "custom_components.oig_cloud.boiler"
sys.modules["custom_components.oig_cloud.boiler.classifier"] = _classifier_mod
# Also register under the short alias used in assertions below.
sys.modules["classifier_f4c"] = _classifier_mod
_spec.loader.exec_module(_classifier_mod)

BoilerActivityClassifier = _classifier_mod.BoilerActivityClassifier
BoilerActivityDTO = _classifier_mod.BoilerActivityDTO
BoilerReading = _classifier_mod.BoilerReading
BoilerSourceHeaterSnapshot = _classifier_mod.BoilerSourceHeaterSnapshot
compute_ready_fraction = _classifier_mod.compute_ready_fraction

POWER_ON_THRESHOLD = _const_mod.BOILER_POWER_ON_THRESHOLD_W  # 100 W

FIXED_NOW = datetime(2026, 6, 11, 12, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _reading(
    *,
    timestamp: datetime = FIXED_NOW,
    top_temp_c: float | None = 47.2,
    bottom_temp_c: float | None = None,
    source_key: str | None = None,
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
    power_w: float | None = None,
    box_boiler_mode: str | None = None,
    grid_import_w: float | None = None,
    pv_surplus_hint: bool | None = None,
    alt_heat_delta_kwh: float | None = None,
) -> BoilerSourceHeaterSnapshot:
    return BoilerSourceHeaterSnapshot(
        current_source=current_source,
        active_heaters=active_heaters or {},
        overflow_available=overflow_available,
        power_kw=power_kw,
        power_w=power_w,
        box_boiler_mode=box_boiler_mode,
        grid_import_w=grid_import_w,
        pv_surplus_hint=pv_surplus_hint,
        alt_heat_delta_kwh=alt_heat_delta_kwh,
    )


# ---------------------------------------------------------------------------
# Core bug fix: switch ON + 0 W → NOT charging
# ---------------------------------------------------------------------------

class TestPowerFirstTruth:
    def test_switch_on_but_zero_watts_is_not_charging(self):
        """The core bug: UI showed 'charging_grid' while CBB sends 0 W.

        With power_w=0 (below threshold) the classifier must return standby
        regardless of heater switch state.
        """
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(
            active_heaters={"switch.bojler_dole_local_main_switch": "on"},
            power_w=0.0,
            box_boiler_mode="cbb",
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "standby", (
            f"Expected standby but got '{dto.state}' — "
            "switch ON with 0 W power must not register as charging"
        )

    def test_switch_on_below_threshold_is_not_charging(self):
        """Below POWER_ON_THRESHOLD (100 W) is treated as off."""
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(
            active_heaters={"switch.heater": "on"},
            power_w=50.0,
            box_boiler_mode="cbb",
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "standby"

    def test_exactly_at_threshold_is_charging(self):
        """Exactly at POWER_ON_THRESHOLD → electric heating."""
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(
            power_w=POWER_ON_THRESHOLD,
            box_boiler_mode="cbb",
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state in ("charging_fve", "charging_overflow")

    def test_2000w_cbb_no_overflow_is_charging_fve(self):
        """2000 W CBB mode without overflow → charging_fve."""
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(
            power_w=2000.0,
            box_boiler_mode="cbb",
            overflow_available=False,
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_fve"
        assert dto.source == "fve"
        assert dto.source_estimated is False

    def test_2000w_cbb_with_overflow_is_charging_overflow(self):
        """2000 W CBB mode with overflow available → charging_overflow."""
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(
            power_w=2000.0,
            box_boiler_mode="cbb",
            overflow_available=True,
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_overflow"
        assert dto.source == "overflow"
        assert dto.source_estimated is False

    def test_2000w_cbb_pv_surplus_hint_takes_priority(self):
        """pv_surplus_hint overrides overflow_available for CBB mode."""
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(
            power_w=2000.0,
            box_boiler_mode="cbb",
            overflow_available=False,   # plan says no overflow
            pv_surplus_hint=True,        # live hint says yes
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_overflow"

    def test_2000w_manual_with_grid_import_is_charging_grid(self):
        """2000 W manual mode + house imports > 1000 W → charging_grid."""
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(
            power_w=2000.0,
            box_boiler_mode="manual",
            grid_import_w=1200.0,  # > 50% of 2000
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_grid"
        assert dto.source == "grid"
        assert dto.source_estimated is False

    def test_2000w_manual_low_grid_import_is_charging_fve(self):
        """2000 W manual mode + small grid import → charging_fve."""
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(
            power_w=2000.0,
            box_boiler_mode="manual",
            grid_import_w=300.0,  # < 50% of 2000
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_fve"
        assert dto.source == "fve"

    def test_2000w_manual_no_grid_sensor_defaults_fve(self):
        """2000 W manual mode + no grid sensor → assume fve."""
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(
            power_w=2000.0,
            box_boiler_mode="manual",
            grid_import_w=None,
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_fve"

    def test_2000w_cbb_uppercase_mode_works(self):
        """'CBB' (uppercase from OIG) maps to 'cbb' internally."""
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(
            power_w=2000.0,
            box_boiler_mode="CBB",
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state in ("charging_fve", "charging_overflow")

    def test_heater_switch_ignored_when_power_available(self):
        """Switch state must NOT influence classification when power_w is set."""
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(
            active_heaters={
                "switch.bojler_dole_local_main_switch": "on",
                "switch.bojler_nahora_local_main_switch": "on",
            },
            power_w=0.0,
            box_boiler_mode="cbb",
        )

        dto = classifier.classify(None, curr, snapshot)

        # Even with both switches ON, 0 W → not charging
        assert dto.state not in ("charging_fve", "charging_overflow", "charging_grid")


# ---------------------------------------------------------------------------
# Gas / alternative heat detection
# ---------------------------------------------------------------------------

class TestAlternativeHeatDetection:
    def test_gas_delta_positive_yields_charging_alt(self):
        """Positive gas meter delta → charging_alt / source = alternative."""
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=42.0)
        snapshot = _snapshot(
            power_w=0.0,
            alt_heat_delta_kwh=0.5,
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_alt"
        assert dto.source == "alternative"
        assert dto.source_estimated is False

    def test_gas_delta_zero_does_not_yield_charging_alt(self):
        """Zero gas meter delta → not alt heating."""
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=42.0)
        snapshot = _snapshot(
            power_w=0.0,
            alt_heat_delta_kwh=0.0,
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state != "charging_alt"

    def test_gas_delta_none_does_not_yield_charging_alt(self):
        """No gas meter → no alt detection from this path."""
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=42.0)
        snapshot = _snapshot(
            power_w=0.0,
            alt_heat_delta_kwh=None,
        )

        dto = classifier.classify(None, curr, snapshot)

        # Without trend we expect standby
        assert dto.state == "standby"

    def test_trend_estimated_alt_when_no_meter_and_positive_trend(self):
        """High positive trend + alt-heat hint + no meter → charging_alt estimated."""
        classifier = BoilerActivityClassifier()
        # 42.0 → 50.0 over 5 min = 1.6 °C/min > ALT_TREND_THRESHOLD (0.08)
        prev = _reading(
            timestamp=FIXED_NOW - timedelta(minutes=5),
            top_temp_c=42.0,
        )
        curr = _reading(timestamp=FIXED_NOW, top_temp_c=50.0)
        snapshot = _snapshot(
            power_w=0.0,
            alt_heat_delta_kwh=None,
            current_source="alternative",   # hint that alt exists
        )

        dto = classifier.classify(prev, curr, snapshot)

        assert dto.state == "charging_alt"
        assert dto.source == "alternative"
        assert dto.source_estimated is True

    def test_trend_estimated_alt_requires_has_alternative_hint(self):
        """Without has_alternative hint, positive trend stays standby."""
        classifier = BoilerActivityClassifier()
        prev = _reading(
            timestamp=FIXED_NOW - timedelta(minutes=5),
            top_temp_c=42.0,
        )
        curr = _reading(timestamp=FIXED_NOW, top_temp_c=50.0)
        snapshot = _snapshot(
            power_w=0.0,
            alt_heat_delta_kwh=None,
            current_source=None,   # no alt hint
        )

        dto = classifier.classify(prev, curr, snapshot)

        # High trend but no alt hint → should not claim charging_alt
        assert dto.state != "charging_alt"

    def test_alt_detection_segment_hint_key(self):
        """charging_alt active_segment_hint key should be 'alternative'."""
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=42.0)
        snapshot = _snapshot(
            power_w=0.0,
            alt_heat_delta_kwh=1.0,
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.active_segment_hint is not None
        assert dto.active_segment_hint["key"] == "alternative"


# ---------------------------------------------------------------------------
# Legacy switch-based fallback (power_w = None)
# ---------------------------------------------------------------------------

class TestLegacySwitchFallback:
    def test_switch_on_fve_source_no_power_sensor_is_charging_fve(self):
        """Without power_w, old switch+source heuristic still works."""
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key="fve")
        snapshot = _snapshot(
            active_heaters={"switch.heater": "on"},
            power_w=None,   # sensor absent
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_fve"
        assert dto.source_estimated is True

    def test_switch_on_overflow_available_no_power_sensor_is_charging_overflow(self):
        """Without power_w + switch on + overflow → charging_overflow."""
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key="fve")
        snapshot = _snapshot(
            active_heaters={"switch.heater": "on"},
            overflow_available=True,
            power_w=None,
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "charging_overflow"
        assert dto.source_estimated is True

    def test_switch_off_no_power_sensor_is_standby(self):
        """Without power_w + switch off → standby."""
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=47.0)
        snapshot = _snapshot(
            active_heaters={"switch.heater": "off"},
            power_w=None,
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "standby"

    def test_negative_trend_no_power_sensor_is_discharging(self):
        """Without power_w + negative trend → discharging."""
        classifier = BoilerActivityClassifier()
        prev = _reading(timestamp=FIXED_NOW - timedelta(minutes=5), top_temp_c=48.0)
        curr = _reading(timestamp=FIXED_NOW, top_temp_c=47.0)
        snapshot = _snapshot(
            active_heaters={"switch.heater": "off"},
            power_w=None,
        )

        dto = classifier.classify(prev, curr, snapshot)

        assert dto.state == "discharging"


# ---------------------------------------------------------------------------
# compute_ready_fraction physics
# ---------------------------------------------------------------------------

class TestReadyFraction:
    def test_both_sensors_47_2_38_7_expected_fraction(self):
        """Real-world values: top=47.2°C, bottom=38.7°C.

        With linear stratification:
        T(h) = 38.7 + h*(47.2 - 38.7) = 38.7 + 8.5*h
        At 40°C: h_ready = (40 - 38.7) / 8.5 ≈ 0.153
        Ready fraction = 1 - 0.153 ≈ 0.847
        """
        fraction = compute_ready_fraction(top_c=47.2, bottom_c=38.7)

        # Should be around 0.84–0.85
        assert fraction == pytest.approx(0.847, abs=0.01)

    def test_both_temps_below_40_is_zero(self):
        """Both sensors below ready_temp → fully cold → 0.0."""
        fraction = compute_ready_fraction(top_c=35.0, bottom_c=20.0)
        assert fraction == 0.0

    def test_both_temps_above_40_is_one(self):
        """Both sensors well above ready_temp → fully ready → 1.0."""
        fraction = compute_ready_fraction(top_c=60.0, bottom_c=45.0)
        assert fraction == 1.0

    def test_top_none_is_zero(self):
        """No temperature data → 0.0."""
        fraction = compute_ready_fraction(top_c=None, bottom_c=38.7)
        assert fraction == 0.0

    def test_top_only_below_40_is_zero(self):
        """Top-only at 35°C → 0.0 (conservative)."""
        fraction = compute_ready_fraction(top_c=35.0, bottom_c=None)
        assert fraction == 0.0

    def test_top_only_at_60c_is_partial(self):
        """Top-only at 60°C: fraction = (60-40)/(60-10) = 0.4."""
        fraction = compute_ready_fraction(top_c=60.0, bottom_c=None)
        assert fraction == pytest.approx(0.4)

    def test_top_only_at_40c_is_zero(self):
        """Top-only at exactly 40°C (= ready_temp): numerator=0 → 0.0."""
        fraction = compute_ready_fraction(top_c=40.0, bottom_c=None)
        assert fraction == pytest.approx(0.0)

    def test_top_only_at_90c_partial(self):
        """Top-only at 90°C: fraction = (90-40)/(90-10) = 50/80 = 0.625.

        Note: top-only is CONSERVATIVE — it doesn't assume the entire tank is hot.
        Only the fraction above the ready threshold relative to the full range is
        counted.  To get 1.0 both sensors must be above ready_temp.
        """
        fraction = compute_ready_fraction(top_c=90.0, bottom_c=None)
        assert fraction == pytest.approx(0.625)

    def test_clamped_above_one(self):
        """fill_level_pct is always ≤ 1.0."""
        fraction = compute_ready_fraction(top_c=120.0, bottom_c=110.0)
        assert fraction <= 1.0

    def test_clamped_below_zero(self):
        """fill_level_pct is always ≥ 0.0."""
        fraction = compute_ready_fraction(top_c=-10.0, bottom_c=-15.0)
        assert fraction >= 0.0

    def test_both_uniform_above_ready_is_one(self):
        """Uniform temperature at 50°C → 1.0."""
        fraction = compute_ready_fraction(top_c=50.0, bottom_c=50.0)
        assert fraction == 1.0

    def test_both_uniform_below_ready_is_zero(self):
        """Uniform temperature at 30°C → 0.0."""
        fraction = compute_ready_fraction(top_c=30.0, bottom_c=30.0)
        assert fraction == 0.0

    def test_partial_two_sensor(self):
        """Partial fill: bottom=30, top=50, ready=40.
        h_ready = (40-30)/(50-30) = 0.5  → fraction = 1 - 0.5 = 0.5
        """
        fraction = compute_ready_fraction(top_c=50.0, bottom_c=30.0)
        assert fraction == pytest.approx(0.5)

    def test_custom_ready_temp(self):
        """Custom ready temperature is respected."""
        fraction = compute_ready_fraction(
            top_c=60.0, bottom_c=40.0, ready_temp_c=50.0
        )
        # h_ready = (50-40)/(60-40) = 0.5 → fraction = 0.5
        assert fraction == pytest.approx(0.5)


# ---------------------------------------------------------------------------
# Source normalization — alternative fix
# ---------------------------------------------------------------------------

class TestAlternativeSourceNormalization:
    def test_alternative_string_normalizes_to_alternative(self):
        """'alternative' must map to 'alternative', NOT 'grid' (Task A bug fix)."""
        from classifier_f4c import _normalize_raw_source
        assert _normalize_raw_source("alternative") == "alternative"

    def test_alt_string_normalizes_to_alternative(self):
        """'alt' maps to 'alternative'."""
        from classifier_f4c import _normalize_raw_source
        assert _normalize_raw_source("alt") == "alternative"

    def test_grid_string_normalizes_to_grid(self):
        """'grid' still works."""
        from classifier_f4c import _normalize_raw_source
        assert _normalize_raw_source("grid") == "grid"

    def test_fve_string_normalizes_to_fve(self):
        """'fve' still works."""
        from classifier_f4c import _normalize_raw_source
        assert _normalize_raw_source("fve") == "fve"


# ---------------------------------------------------------------------------
# Activity DTO has source_estimated field
# ---------------------------------------------------------------------------

class TestSourceEstimatedField:
    def test_power_based_classification_is_not_estimated(self):
        """When power_w drives classification, source_estimated must be False."""
        classifier = BoilerActivityClassifier()
        curr = _reading()
        snapshot = _snapshot(power_w=2000.0, box_boiler_mode="cbb")

        dto = classifier.classify(None, curr, snapshot)

        assert hasattr(dto, "source_estimated")
        assert dto.source_estimated is False

    def test_switch_fallback_is_estimated(self):
        """When legacy switch path is used (no power_w), source_estimated = True."""
        classifier = BoilerActivityClassifier()
        curr = _reading(source_key="fve")
        snapshot = _snapshot(
            active_heaters={"switch.heater": "on"},
            power_w=None,
        )

        dto = classifier.classify(None, curr, snapshot)

        assert dto.source_estimated is True

    def test_standby_with_power_sensor_is_not_estimated(self):
        """Standby state with power_w available is not estimated."""
        classifier = BoilerActivityClassifier()
        curr = _reading(top_temp_c=47.0)
        snapshot = _snapshot(power_w=0.0)

        dto = classifier.classify(None, curr, snapshot)

        assert dto.state == "standby"
        assert dto.source_estimated is False
