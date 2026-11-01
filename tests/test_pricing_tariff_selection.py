"""The price sensors must charge the tariff that is really in force.

Regression: both 15-minute sensors read a ``vt_hours`` option that no config path
ever writes, so every hour fell through to VT. The planner prices through those
sensors, which left it blind to the NT/VT split and overstated every NT kWh in
the UI, while ``current_tariff`` kept showing the right tariff next to them.
"""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.data.pricing import (
    calculate_final_spot_price,
)
from custom_components.oig_cloud.battery_forecast.utils_common import (
    get_tariff_for_datetime,
)
from custom_components.oig_cloud.entities.analytics_sensor import (
    OigCloudAnalyticsSensor,
)
from custom_components.oig_cloud.pricing import spot_price_15min as price15_module
from custom_components.oig_cloud.pricing import (
    spot_price_export_15min as export_module,
)

# A short-VT schedule as the wizard stores it: VT for one hour, four times a day.
SPLIT_SCHEDULE = {
    "dual_tariff_enabled": True,
    "tariff_vt_start_weekday": "8,12,15,19",
    "tariff_nt_start_weekday": "9,13,16,20",
    "tariff_vt_start_weekend": "8,12,15,19",
    "tariff_nt_start_weekend": "9,13,16,20",
}
VT_HOURS = {8, 12, 15, 19}
WEDNESDAY = (2026, 10, 28)
SATURDAY = (2026, 10, 31)


def _spot_sensor(options):
    sensor = object.__new__(price15_module.SpotPrice15MinSensor)
    sensor._entry = SimpleNamespace(options=options)
    return sensor


def _export_sensor(options):
    sensor = object.__new__(export_module.ExportPrice15MinSensor)
    sensor._entry = SimpleNamespace(options=options)
    return sensor


def _analytics_sensor(options):
    sensor = object.__new__(OigCloudAnalyticsSensor)
    sensor._entry = SimpleNamespace(options=options)
    return sensor


@pytest.mark.parametrize("day", [WEDNESDAY, SATURDAY])
@pytest.mark.parametrize("hour", range(24))
def test_spot_sensor_follows_configured_tariff_changes(day, hour):
    moment = datetime(*day, hour, 30)
    expected = "VT" if hour in VT_HOURS else "NT"

    assert _spot_sensor(SPLIT_SCHEDULE)._get_tariff_for_datetime(moment) == expected


@pytest.mark.parametrize("hour", range(24))
def test_export_sensor_follows_configured_tariff_changes(hour):
    moment = datetime(*WEDNESDAY, hour, 30)
    expected = "VT" if hour in VT_HOURS else "NT"

    assert _export_sensor(SPLIT_SCHEDULE)._get_tariff_for_datetime(moment) == expected


def test_spot_sensor_charges_nt_distribution_in_nt_hours():
    options = {
        **SPLIT_SCHEDULE,
        "spot_pricing_model": "percentage",
        "spot_positive_fee_percent": 15.0,
        "distribution_fee_vt_kwh": 0.94731,
        "distribution_fee_nt_kwh": 0.30904,
        "vat_rate": 21.0,
    }
    sensor = _spot_sensor(options)

    nt_price = sensor._calculate_final_price_15min(5.0, datetime(*WEDNESDAY, 17, 0))
    vt_price = sensor._calculate_final_price_15min(5.0, datetime(*WEDNESDAY, 19, 0))

    assert nt_price == round((5.0 * 1.15 + 0.30904) * 1.21, 2)
    assert vt_price == round((5.0 * 1.15 + 0.94731) * 1.21, 2)


def test_export_sensor_applies_nt_fee_in_nt_hours():
    options = {
        **SPLIT_SCHEDULE,
        "export_pricing_model": "percentage",
        "export_fee_percent": 15.0,
        "export_fee_percent_nt": 5.0,
    }
    sensor = _export_sensor(options)

    assert sensor._calculate_export_price_15min(2.0, datetime(*WEDNESDAY, 17, 0)) == 1.9
    assert sensor._calculate_export_price_15min(2.0, datetime(*WEDNESDAY, 19, 0)) == 1.7


def test_single_tariff_install_stays_on_vt_everywhere():
    sensor = _spot_sensor({**SPLIT_SCHEDULE, "dual_tariff_enabled": False})

    for hour in range(24):
        moment = datetime(*WEDNESDAY, hour, 0)
        assert sensor._get_tariff_for_datetime(moment) == "VT"


@pytest.mark.parametrize("day", [WEDNESDAY, SATURDAY])
@pytest.mark.parametrize("hour", range(24))
def test_all_tariff_implementations_agree(day, hour):
    """Sensor, planner helper and the current_tariff sensor give one answer."""
    moment = datetime(*day, hour, 0)

    planner = get_tariff_for_datetime(moment, SPLIT_SCHEDULE)

    assert _spot_sensor(SPLIT_SCHEDULE)._get_tariff_for_datetime(moment) == planner
    assert _export_sensor(SPLIT_SCHEDULE)._get_tariff_for_datetime(moment) == planner
    assert _analytics_sensor(SPLIT_SCHEDULE)._get_tariff_for_datetime(moment) == planner


@pytest.mark.parametrize("hour", range(24))
def test_planner_price_paths_agree(hour):
    """The planner prices through the sensor or its own helper, depending on
    whether the sensor is registered yet. Both must give the same number."""
    options = {
        **SPLIT_SCHEDULE,
        "spot_pricing_model": "percentage",
        "spot_positive_fee_percent": 15.0,
        "spot_negative_fee_percent": 9.0,
        "distribution_fee_vt_kwh": 0.94731,
        "distribution_fee_nt_kwh": 0.30904,
        "vat_rate": 21.0,
    }
    moment = datetime(*WEDNESDAY, hour, 15)
    forecast_sensor = SimpleNamespace(_config_entry=SimpleNamespace(options=options))

    assert _spot_sensor(options)._calculate_interval_price(
        5.0, moment
    ) == calculate_final_spot_price(forecast_sensor, 5.0, moment)


def test_tariff_before_first_change_continues_yesterdays_last_change():
    """A day that ends on VT stays on VT until today's first change."""
    config = {
        "dual_tariff_enabled": True,
        "tariff_nt_start_weekday": "6",
        "tariff_vt_start_weekday": "22",
    }

    assert get_tariff_for_datetime(datetime(*WEDNESDAY, 2, 0), config) == "VT"
    assert get_tariff_for_datetime(datetime(*WEDNESDAY, 7, 0), config) == "NT"
    assert get_tariff_for_datetime(datetime(*WEDNESDAY, 23, 0), config) == "VT"


def test_tariff_before_first_change_reads_yesterdays_day_type():
    """Monday's small hours continue Sunday's schedule, not Monday's."""
    config = {
        "dual_tariff_enabled": True,
        "tariff_nt_start_weekday": "1",
        "tariff_vt_start_weekday": "6",
        "tariff_vt_start_weekend": "20",
        "tariff_nt_start_weekend": "2",
    }
    monday_small_hours = datetime(2026, 11, 2, 0, 30)

    assert get_tariff_for_datetime(monday_small_hours, config) == "VT"
