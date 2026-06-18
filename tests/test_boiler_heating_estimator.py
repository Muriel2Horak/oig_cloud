from __future__ import annotations

import pytest

from custom_components.oig_cloud.boiler.heating_estimator import (
    MIN_ELEMENT_W,
    calorimetric_power_w,
    estimate_heating,
    update_baseline,
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
    assert est.confidence >= 0.9  # nb + rising temp agree


def test_two_element_flat_top_still_heating():
    # The user's case: top of the tank already hot (flat top temp) but the
    # bottom element keeps drawing ~3.3 kW — the non-backup draw MUST win; a
    # flat top temperature must NOT veto it.
    est = estimate_heating(
        commanded_w=6600.0, nonbackup_total_w=3800.0,
        temp_trend_c_per_min=0.0, volume_l=200.0, baseline_w=500.0,
    )
    assert est.heating is True
    assert est.method == "nonbackup"
    assert est.power_w == pytest.approx(3300.0)
    assert est.confidence == pytest.approx(0.8)  # no temp corroboration


def test_thermostat_cut_no_draw_is_off():
    # Commanded but the non-backup shows no boiler-sized load → element is off.
    est = estimate_heating(
        commanded_w=6600.0, nonbackup_total_w=250.0,
        temp_trend_c_per_min=0.0, volume_l=200.0, baseline_w=200.0,
    )
    assert est.heating is False
    assert est.power_w == 0.0
    assert est.method == "off"


def test_temperature_only_confirms_heating_calorimetric():
    est = estimate_heating(
        commanded_w=6600.0, nonbackup_total_w=None,
        temp_trend_c_per_min=0.4, volume_l=200.0, baseline_w=None,
    )
    assert est.heating is True
    assert est.method == "calorimetry"
    assert est.power_w == pytest.approx(5582.4, abs=1.0)  # 0.4×200×1.163×60


def test_no_signals_falls_back_to_command():
    est = estimate_heating(
        commanded_w=6600.0, nonbackup_total_w=None,
        temp_trend_c_per_min=None, volume_l=200.0, baseline_w=None,
    )
    assert est.heating is True
    assert est.method == "command"
    assert est.power_w == pytest.approx(6600.0)
    assert est.confidence == pytest.approx(0.4)


def test_baseline_noise_floor_tracker():
    # Cold start during heating seeds LOW (≤ SEED_FLOOR) so the boiler is still
    # detected immediately rather than swallowed into the baseline.
    assert update_baseline(None, 3800.0) == pytest.approx(800.0)
    # A low first sample seeds at its own value.
    assert update_baseline(None, 400.0) == pytest.approx(400.0)
    # Follows a new low instantly (the floor = other loads when boiler off).
    assert update_baseline(500.0, 300.0) == pytest.approx(300.0)
    # Rises slowly toward a small (non-boiler) increase.
    assert update_baseline(500.0, 600.0) == pytest.approx(502.0)
    # FREEZES when a boiler-sized load is present → never creeps up and loses it
    # during a long continuous heat (this was the "stuck standby" bug).
    assert update_baseline(500.0, 3800.0) == pytest.approx(500.0)


def test_calorimetric_power_helper():
    assert calorimetric_power_w(None, 200.0) is None
    assert calorimetric_power_w(0.0, 200.0) is None
    assert calorimetric_power_w(0.1, 0.0) is None
    assert calorimetric_power_w(0.1, 200.0) == pytest.approx(0.1 * 200 * 1.163 * 60)
    assert calorimetric_power_w(5.0, 200.0) <= 8000.0


def test_min_element_threshold_boundary():
    # Just below the element threshold → off; at/above → heating.
    below = estimate_heating(
        commanded_w=6600.0, nonbackup_total_w=500.0 + MIN_ELEMENT_W - 1,
        temp_trend_c_per_min=None, volume_l=200.0, baseline_w=500.0,
    )
    assert below.heating is False
    at = estimate_heating(
        commanded_w=6600.0, nonbackup_total_w=500.0 + MIN_ELEMENT_W,
        temp_trend_c_per_min=None, volume_l=200.0, baseline_w=500.0,
    )
    assert at.heating is True
