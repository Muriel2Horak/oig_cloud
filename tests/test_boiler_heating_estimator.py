from __future__ import annotations

import pytest

from custom_components.oig_cloud.boiler.heating_estimator import (
    MIN_ELEMENT_W,
    calorimetric_power_w,
    estimate_heating,
)


def test_not_commanded_is_off():
    est = estimate_heating(
        commanded_w=0.0, nonbackup_total_w=5000.0,
        temp_trend_c_per_min=0.4, volume_l=200.0, baseline_w=200.0,
    )
    assert est.heating is False
    assert est.power_w == 0.0
    assert est.method == "off"


def test_nonbackup_excess_gives_measured_power():
    # baseline 300 W other loads, total 3600 → boiler ≈ 3300 W (one element)
    est = estimate_heating(
        commanded_w=6600.0, nonbackup_total_w=3600.0,
        temp_trend_c_per_min=0.2, volume_l=200.0, baseline_w=300.0,
    )
    assert est.heating is True
    assert est.method == "nonbackup"
    assert est.power_w == pytest.approx(3300.0)
    assert est.confidence >= 0.9  # nb + temp agree


def test_thermostat_cut_commanded_but_flat_and_no_draw():
    # box commands 6600 W but non-backup shows no boiler-sized load and temp
    # is flat at the ceiling → thermostat has cut the element.
    est = estimate_heating(
        commanded_w=6600.0, nonbackup_total_w=250.0,
        temp_trend_c_per_min=0.0, volume_l=200.0, baseline_w=200.0,
    )
    assert est.heating is False
    assert est.power_w == 0.0
    assert est.method == "off"


def test_temperature_only_confirms_heating_calorimetric():
    # No non-backup baseline yet; temperature rising → calorimetric power.
    est = estimate_heating(
        commanded_w=6600.0, nonbackup_total_w=None,
        temp_trend_c_per_min=0.4, volume_l=200.0, baseline_w=None,
    )
    assert est.heating is True
    assert est.method == "calorimetry"
    # 0.4 × 200 × 1.163 × 60 ≈ 5582 W
    assert est.power_w == pytest.approx(5582.4, abs=1.0)


def test_no_signals_falls_back_to_command():
    est = estimate_heating(
        commanded_w=6600.0, nonbackup_total_w=None,
        temp_trend_c_per_min=None, volume_l=200.0, baseline_w=None,
    )
    assert est.heating is True
    assert est.method == "command"
    assert est.power_w == pytest.approx(6600.0)
    assert est.confidence == pytest.approx(0.4)


def test_baseline_learns_only_while_not_heating():
    # Not heating (not commanded) → baseline seeds from the non-backup total.
    est = estimate_heating(
        commanded_w=0.0, nonbackup_total_w=400.0,
        temp_trend_c_per_min=None, volume_l=200.0, baseline_w=None,
    )
    assert est.baseline_w == pytest.approx(400.0)

    # Subsequent not-heating sample → EMA toward the new value.
    est2 = estimate_heating(
        commanded_w=0.0, nonbackup_total_w=600.0,
        temp_trend_c_per_min=None, volume_l=200.0, baseline_w=400.0,
    )
    assert 400.0 < est2.baseline_w < 600.0

    # While heating the baseline must NOT move (don't absorb the boiler load).
    est3 = estimate_heating(
        commanded_w=6600.0, nonbackup_total_w=400.0 + MIN_ELEMENT_W + 500,
        temp_trend_c_per_min=0.3, volume_l=200.0, baseline_w=400.0,
    )
    assert est3.heating is True
    assert est3.baseline_w == pytest.approx(400.0)


def test_calorimetric_power_helper():
    assert calorimetric_power_w(None, 200.0) is None
    assert calorimetric_power_w(0.0, 200.0) is None
    assert calorimetric_power_w(0.1, 0.0) is None
    assert calorimetric_power_w(0.1, 200.0) == pytest.approx(0.1 * 200 * 1.163 * 60)
    # clamped to the plausible max
    assert calorimetric_power_w(5.0, 200.0) <= 8000.0
