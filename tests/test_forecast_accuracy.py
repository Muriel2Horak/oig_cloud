"""Phase 1: measuring how good the forecast actually is.

Nothing in the system produced a number for forecast accuracy, so there was no
way to tell whether a change helped, and no way to decide later whether an AI
revision layer earns its keep. These are the pure calculations behind that
number; the sensor that publishes them is a thin wrapper.
"""

from __future__ import annotations

from datetime import date

import pytest

from custom_components.oig_cloud.battery_forecast import accuracy as module


def _series(values: list[float | None]) -> list[dict]:
    return [
        {"time": f"{i // 4:02d}:{(i % 4) * 15:02d}", "consumption_kwh": v}
        for i, v in enumerate(values)
    ]


def _flat_day(value: float, slots: int = 96) -> list[dict]:
    return _series([value] * slots)


# --------------------------------------------------------------------------
# comparing two series
# --------------------------------------------------------------------------


def test_a_perfect_forecast_scores_zero_error():
    result = module.compare_series(_flat_day(0.3), _flat_day(0.3))

    assert result["mape_pct"] == pytest.approx(0.0)
    assert result["mae_kwh"] == pytest.approx(0.0)
    assert result["bias_pct"] == pytest.approx(0.0)


def test_the_real_6_9_numbers_come_out_as_measured():
    """Plan 14.25 kWh over 96 flat slots against 32.31 kWh actual: the day the
    stored plan held one value. Bias is what the owner sees as "it doesn't
    match reality"."""
    planned = _flat_day(14.25 / 96)
    actual = _flat_day(32.31 / 96)

    result = module.compare_series(planned, actual)

    assert result["planned_kwh"] == pytest.approx(14.25, abs=0.01)
    assert result["actual_kwh"] == pytest.approx(32.31, abs=0.01)
    assert result["bias_pct"] == pytest.approx(-55.9, abs=0.2)


def test_only_slots_present_on_both_sides_are_compared():
    planned = _series([0.3] * 96)
    actual = _series([0.3] * 48 + [None] * 48)

    result = module.compare_series(planned, actual)

    assert result["slots"] == 48


def test_near_zero_actuals_are_left_out_of_the_percentage():
    """A 0.001 kWh slot turns MAPE into noise; it still counts towards the
    absolute error and the totals."""
    planned = _series([0.3, 0.3])
    actual = _series([0.3, 0.0005])

    result = module.compare_series(planned, actual)

    assert result["mape_pct"] == pytest.approx(0.0)
    assert result["mae_kwh"] > 0
    assert result["slots"] == 2


def test_no_overlap_yields_no_numbers_rather_than_zero():
    result = module.compare_series(_series([0.3]), _series([None]))

    assert result["mape_pct"] is None
    assert result["bias_pct"] is None
    assert result["slots"] == 0


# --------------------------------------------------------------------------
# the naive baseline anything else has to beat
# --------------------------------------------------------------------------


def test_naive_forecast_averages_the_same_hour_of_similar_days():
    archive = {
        "2026-08-31": {"actual": _flat_day(0.20)},  # Monday
        "2026-09-01": {"actual": _flat_day(0.40)},  # Tuesday
        "2026-09-05": {"actual": _flat_day(0.90)},  # Saturday - other day type
    }

    naive = module.naive_forecast(archive, date(2026, 9, 7))  # Monday

    assert len(naive) == 96
    assert naive[0] == pytest.approx(0.30)


def test_naive_forecast_needs_at_least_one_matching_day():
    assert module.naive_forecast({}, date(2026, 9, 7)) == []


def test_naive_forecast_ignores_days_without_measurements():
    archive = {
        "2026-08-31": {"actual": []},
        "2026-09-01": {"actual": _flat_day(0.40)},
    }

    naive = module.naive_forecast(archive, date(2026, 9, 7))

    assert naive[0] == pytest.approx(0.40)


# --------------------------------------------------------------------------
# per-day report
# --------------------------------------------------------------------------


def _archive_day(planned: float, actual: float, cost: float = 40.0) -> dict:
    return {
        "date": "2026-09-06",
        "plan": [
            {
                "time": f"{i // 4:02d}:{(i % 4) * 15:02d}",
                "consumption_kwh": planned,
                "solar_kwh": 0.2,
                "net_cost": cost / 96,
            }
            for i in range(96)
        ],
        "actual": [
            {
                "time": f"{i // 4:02d}:{(i % 4) * 15:02d}",
                "consumption_kwh": actual,
                "solar_kwh": 0.18,
                "net_cost": (cost * 1.2) / 96,
            }
            for i in range(96)
        ],
        "locked": True,
    }


def test_day_report_covers_consumption_solar_and_money():
    report = module.day_report(_archive_day(0.15, 0.33))

    assert report["date"] == "2026-09-06"
    assert report["consumption"]["bias_pct"] == pytest.approx(-54.5, abs=0.5)
    assert report["solar"]["slots"] == 96
    assert report["cost"]["planned_czk"] == pytest.approx(40.0, abs=0.01)
    assert report["cost"]["actual_czk"] == pytest.approx(48.0, abs=0.01)


def test_day_report_scores_each_revision_against_the_same_actuals():
    day = _archive_day(0.15, 0.33)
    day["revisions"] = [
        {"version": 1, "created_at": "2026-09-06T06:00:00", "consumption_kwh": [0.30] * 96},
        {"version": 2, "created_at": "2026-09-06T12:00:00", "consumption_kwh": [0.33] * 96},
    ]

    report = module.day_report(day)

    versions = {entry["version"]: entry for entry in report["versions"]}
    assert versions[0]["consumption"]["bias_pct"] == pytest.approx(-54.5, abs=0.5)
    assert versions[2]["consumption"]["bias_pct"] == pytest.approx(0.0, abs=0.5)


def test_a_revision_is_only_scored_on_the_slots_it_speaks_about():
    day = _archive_day(0.15, 0.33)
    day["revisions"] = [
        {
            "version": 2,
            "created_at": "2026-09-06T12:00:00",
            "consumption_kwh": [None] * 48 + [0.33] * 48,
        }
    ]

    report = module.day_report(day)
    revision = next(e for e in report["versions"] if e["version"] == 2)

    assert revision["consumption"]["slots"] == 48


def test_day_report_includes_the_naive_baseline_when_history_allows():
    report = module.day_report(
        _archive_day(0.15, 0.33),
        naive=[0.30] * 96,
    )

    assert report["naive"]["bias_pct"] == pytest.approx(-9.1, abs=0.5)


def test_an_unlocked_day_is_reported_but_flagged():
    day = _archive_day(0.15, 0.33)
    day["locked"] = False

    assert module.day_report(day)["complete"] is False


# --------------------------------------------------------------------------
# rolling summary - what the sensor publishes
# --------------------------------------------------------------------------


def test_rolling_summary_averages_the_days_it_has():
    archive = {
        "2026-09-04": _archive_day(0.15, 0.33),
        "2026-09-05": _archive_day(0.30, 0.33),
    }

    summary = module.rolling_summary(archive, window_days=7, today=date(2026, 9, 7))

    assert summary["days"] == 2
    assert summary["consumption_mape_pct"] is not None
    assert summary["consumption_bias_pct"] < 0


def test_rolling_summary_ignores_days_outside_the_window():
    archive = {
        "2026-08-01": _archive_day(0.15, 0.33),
        "2026-09-05": _archive_day(0.30, 0.33),
    }

    summary = module.rolling_summary(archive, window_days=7, today=date(2026, 9, 7))

    assert summary["days"] == 1


def test_rolling_summary_without_data_reports_nothing_rather_than_zero():
    summary = module.rolling_summary({}, window_days=7, today=date(2026, 9, 7))

    assert summary["days"] == 0
    assert summary["consumption_mape_pct"] is None


# --------------------------------------------------------------------------
# a percentage against a near-zero denominator is not a measurement
# --------------------------------------------------------------------------


def test_bias_is_withheld_when_the_measured_total_is_negligible():
    """Field case: an archive whose plan side covered only the evening was
    scored against actual solar of ~0.05 kWh and reported +575 % bias. The
    ratio is arithmetic, not information."""
    planned = _series([0.08] * 24 + [None] * 72)
    actual = _series([0.002] * 24 + [None] * 72)

    result = module.compare_series(planned, actual, field="consumption_kwh")

    assert result["bias_pct"] is None
    assert result["planned_kwh"] > 0
    assert result["actual_kwh"] > 0
    assert result["slots"] == 24


def test_bias_is_reported_once_the_total_is_meaningful():
    planned = _series([0.10] * 24 + [None] * 72)
    actual = _series([0.15] * 24 + [None] * 72)

    result = module.compare_series(planned, actual)

    assert result["bias_pct"] == pytest.approx(-33.3, abs=0.5)


def test_a_rolling_summary_ignores_days_whose_bias_is_withheld():
    archive = {
        "2026-09-05": {
            "date": "2026-09-05",
            "plan": _series([0.08] * 24 + [None] * 72),
            "actual": _series([0.002] * 24 + [None] * 72),
            "locked": False,
        },
    }

    summary = module.rolling_summary(archive, window_days=7, today=date(2026, 9, 7))

    assert summary["days"] == 1
    assert summary["consumption_bias_pct"] is None
