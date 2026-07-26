"""Golden tests for the 5 dead NT fee fields wired into percentage/fixed pricing.

Covers: spot_positive_fee_percent_nt, spot_negative_fee_percent_nt,
spot_fixed_fee_mwh_nt, export_fee_percent_nt, export_fixed_fee_czk_nt.

Each field gets two assertions:
  1. dual-tariff: a VT-window interval and an NT-window interval price differently.
  2. single-tariff (dual_tariff_enabled=False): price is identical to the VT-only
     value the pre-fix code always produced - proves behavior-neutral rollout.
"""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from custom_components.oig_cloud.battery_forecast.data.pricing import (
    _calculate_commercial_price,
    _derive_export_prices,
)
from custom_components.oig_cloud.entities.analytics_sensor import (
    OigCloudAnalyticsSensor,
)
from custom_components.oig_cloud.pricing import spot_price_15min as price15_module
from custom_components.oig_cloud.pricing import (
    spot_price_export_15min as export_module,
)

# Weekday tariff schedule shared by battery_forecast.utils_common.get_tariff_for_datetime:
# VT from 06:00, NT from 22:00. 2025-01-02 is a Thursday.
TARIFF_SCHEDULE = {
    "dual_tariff_enabled": True,
    "tariff_vt_start_weekday": "6",
    "tariff_nt_start_weekday": "22,2",
    "tariff_vt_start_weekend": "6",
    "tariff_nt_start_weekend": "22,2",
}
VT_TIME = datetime(2025, 1, 2, 10, 0, 0)
NT_TIME = datetime(2025, 1, 2, 23, 0, 0)


def _dual_config(**overrides):
    config = dict(TARIFF_SCHEDULE)
    config.update(overrides)
    return config


def _single_config(**overrides):
    config = {"dual_tariff_enabled": False}
    config.update(overrides)
    return config


# --- battery_forecast/data/pricing.py: _calculate_commercial_price ---


def test_spot_positive_fee_percent_nt_dual_tariff_splits():
    config = _dual_config(
        spot_pricing_model="percentage",
        spot_positive_fee_percent=15.0,
        spot_positive_fee_percent_nt=5.0,
    )
    vt_price = _calculate_commercial_price(1.0, VT_TIME, config)
    nt_price = _calculate_commercial_price(1.0, NT_TIME, config)

    assert vt_price == 1.15
    assert nt_price == 1.05
    assert vt_price != nt_price


def test_spot_positive_fee_percent_nt_single_tariff_neutral():
    config = _single_config(
        spot_pricing_model="percentage",
        spot_positive_fee_percent=15.0,
        spot_positive_fee_percent_nt=5.0,
    )
    vt_price = _calculate_commercial_price(1.0, VT_TIME, config)
    nt_price = _calculate_commercial_price(1.0, NT_TIME, config)

    assert vt_price == 1.15
    assert nt_price == 1.15


def test_spot_negative_fee_percent_nt_dual_tariff_splits():
    config = _dual_config(
        spot_pricing_model="percentage",
        spot_negative_fee_percent=9.0,
        spot_negative_fee_percent_nt=3.0,
    )
    vt_price = _calculate_commercial_price(-1.0, VT_TIME, config)
    nt_price = _calculate_commercial_price(-1.0, NT_TIME, config)

    assert vt_price == -0.91
    assert nt_price == -0.97
    assert vt_price != nt_price


def test_spot_negative_fee_percent_nt_single_tariff_neutral():
    config = _single_config(
        spot_pricing_model="percentage",
        spot_negative_fee_percent=9.0,
        spot_negative_fee_percent_nt=3.0,
    )
    vt_price = _calculate_commercial_price(-1.0, VT_TIME, config)
    nt_price = _calculate_commercial_price(-1.0, NT_TIME, config)

    assert vt_price == -0.91
    assert nt_price == -0.91


def test_spot_fixed_fee_mwh_nt_dual_tariff_splits():
    config = _dual_config(
        spot_pricing_model="fixed",
        spot_fixed_fee_mwh=500.0,
        spot_fixed_fee_mwh_nt=300.0,
    )
    vt_price = _calculate_commercial_price(2.0, VT_TIME, config)
    nt_price = _calculate_commercial_price(2.0, NT_TIME, config)

    assert vt_price == 2.5
    assert nt_price == 2.3
    assert vt_price != nt_price


def test_spot_fixed_fee_mwh_nt_single_tariff_neutral():
    config = _single_config(
        spot_pricing_model="fixed",
        spot_fixed_fee_mwh=500.0,
        spot_fixed_fee_mwh_nt=300.0,
    )
    vt_price = _calculate_commercial_price(2.0, VT_TIME, config)
    nt_price = _calculate_commercial_price(2.0, NT_TIME, config)

    assert vt_price == 2.5
    assert nt_price == 2.5


def test_spot_fixed_fee_mwh_nt_unset_defaults_to_vt():
    """NT unset -> defaults to VT value even with dual tariff on (mirrors fixed_commercial_price_nt)."""
    config = _dual_config(spot_pricing_model="fixed", spot_fixed_fee_mwh=500.0)
    vt_price = _calculate_commercial_price(2.0, VT_TIME, config)
    nt_price = _calculate_commercial_price(2.0, NT_TIME, config)

    assert vt_price == nt_price == 2.5


# --- battery_forecast/data/pricing.py: _derive_export_prices (export_fee_percent) ---


def test_export_fee_percent_nt_dual_tariff_splits():
    config = _dual_config(
        export_pricing_model="percentage",
        export_fee_percent=15.0,
        export_fee_percent_nt=5.0,
    )
    spot_prices = {
        "2025-01-02T10:00:00": 2.0,
        "2025-01-02T23:00:00": 2.0,
    }
    result = _derive_export_prices(spot_prices, config)

    assert result["2025-01-02T10:00:00"] == 1.7
    assert result["2025-01-02T23:00:00"] == 1.9
    assert result["2025-01-02T10:00:00"] != result["2025-01-02T23:00:00"]


def test_export_fee_percent_nt_single_tariff_neutral():
    config = _single_config(
        export_pricing_model="percentage",
        export_fee_percent=15.0,
        export_fee_percent_nt=5.0,
    )
    spot_prices = {
        "2025-01-02T10:00:00": 2.0,
        "2025-01-02T23:00:00": 2.0,
    }
    result = _derive_export_prices(spot_prices, config)

    assert result["2025-01-02T10:00:00"] == 1.7
    assert result["2025-01-02T23:00:00"] == 1.7


# --- pricing/spot_price_15min.py: SpotPrice15MinSensor._calculate_final_price_15min ---


def _make_spot15_sensor(options):
    sensor = object.__new__(price15_module.SpotPrice15MinSensor)
    sensor._entry = SimpleNamespace(options=options)
    return sensor


def test_spot_price_15min_positive_fee_nt_dual_tariff_splits():
    sensor = _make_spot15_sensor(
        {
            "dual_tariff_enabled": True,
            "vt_hours": "6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21",
            "spot_pricing_model": "percentage",
            "spot_positive_fee_percent": 15.0,
            "spot_positive_fee_percent_nt": 5.0,
            "distribution_fee_vt_kwh": 0.0,
            "distribution_fee_nt_kwh": 0.0,
            "vat_rate": 0.0,
        }
    )
    vt_price = sensor._calculate_final_price_15min(1.0, VT_TIME)
    nt_price = sensor._calculate_final_price_15min(1.0, NT_TIME)

    assert vt_price == 1.15
    assert nt_price == 1.05
    assert vt_price != nt_price


def test_spot_price_15min_positive_fee_nt_single_tariff_neutral():
    sensor = _make_spot15_sensor(
        {
            "dual_tariff_enabled": False,
            "spot_pricing_model": "percentage",
            "spot_positive_fee_percent": 15.0,
            "spot_positive_fee_percent_nt": 5.0,
            "distribution_fee_vt_kwh": 0.0,
            "distribution_fee_nt_kwh": 0.0,
            "vat_rate": 0.0,
        }
    )
    vt_price = sensor._calculate_final_price_15min(1.0, VT_TIME)
    nt_price = sensor._calculate_final_price_15min(1.0, NT_TIME)

    assert vt_price == 1.15
    assert nt_price == 1.15


# --- pricing/spot_price_export_15min.py: ExportPrice15MinSensor._calculate_export_price_15min ---


def _make_export15_sensor(options):
    sensor = object.__new__(export_module.ExportPrice15MinSensor)
    sensor._entry = SimpleNamespace(options=options)
    return sensor


def test_export_fixed_fee_czk_nt_dual_tariff_splits():
    sensor = _make_export15_sensor(
        {
            "dual_tariff_enabled": True,
            "vt_hours": "6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21",
            "export_pricing_model": "fixed",
            "export_fixed_fee_czk": 0.20,
            "export_fixed_fee_czk_nt": 0.10,
        }
    )
    vt_price = sensor._calculate_export_price_15min(3.0, VT_TIME)
    nt_price = sensor._calculate_export_price_15min(3.0, NT_TIME)

    assert vt_price == 2.8
    assert nt_price == 2.9
    assert vt_price != nt_price


def test_export_fixed_fee_czk_nt_single_tariff_neutral():
    sensor = _make_export15_sensor(
        {
            "dual_tariff_enabled": False,
            "export_pricing_model": "fixed",
            "export_fixed_fee_czk": 0.20,
            "export_fixed_fee_czk_nt": 0.10,
        }
    )
    vt_price = sensor._calculate_export_price_15min(3.0, VT_TIME)
    nt_price = sensor._calculate_export_price_15min(3.0, NT_TIME)

    assert vt_price == 2.8
    assert nt_price == 2.8


def test_export_fee_percent_nt_dual_tariff_splits_export_sensor():
    """export_fee_percent_nt wired at the primary export sensor site too."""
    sensor = _make_export15_sensor(
        {
            "dual_tariff_enabled": True,
            "vt_hours": "6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21",
            "export_pricing_model": "percentage",
            "export_fee_percent": 15.0,
            "export_fee_percent_nt": 5.0,
        }
    )
    vt_price = sensor._calculate_export_price_15min(2.0, VT_TIME)
    nt_price = sensor._calculate_export_price_15min(2.0, NT_TIME)

    assert vt_price == 1.7
    assert nt_price == 1.9
    assert vt_price != nt_price


# --- entities/analytics_sensor.py: OigCloudAnalyticsSensor._final_price_with_fees ---


class DummyCoordinator:
    def __init__(self):
        self.data = {}
        self.forced_box_id = "123"
        self.hass = None
        self.last_update_success = True

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


def _make_analytics_sensor(options, sensor_type="spot_price_today_avg"):
    coordinator = DummyCoordinator()
    entry = SimpleNamespace(options=options)
    device_info = {"identifiers": {("oig_cloud", "123")}}
    return OigCloudAnalyticsSensor(coordinator, sensor_type, entry, device_info)


def test_analytics_spot_positive_fee_percent_nt_dual_tariff_splits():
    sensor = _make_analytics_sensor(
        _dual_config(
            spot_pricing_model="percentage",
            spot_positive_fee_percent=15.0,
            spot_positive_fee_percent_nt=5.0,
            distribution_fee_vt_kwh=0.0,
            distribution_fee_nt_kwh=0.0,
            vat_rate=0.0,
        )
    )
    vt_price = sensor._final_price_with_fees(1.0, target_datetime=VT_TIME)
    nt_price = sensor._final_price_with_fees(1.0, target_datetime=NT_TIME)

    assert vt_price == 1.15
    assert nt_price == 1.05
    assert vt_price != nt_price


def test_analytics_spot_positive_fee_percent_nt_single_tariff_neutral():
    sensor = _make_analytics_sensor(
        _single_config(
            spot_pricing_model="percentage",
            spot_positive_fee_percent=15.0,
            spot_positive_fee_percent_nt=5.0,
            distribution_fee_vt_kwh=0.0,
            distribution_fee_nt_kwh=0.0,
            vat_rate=0.0,
        )
    )
    vt_price = sensor._final_price_with_fees(1.0, target_datetime=VT_TIME)
    nt_price = sensor._final_price_with_fees(1.0, target_datetime=NT_TIME)

    assert vt_price == 1.15
    assert nt_price == 1.15


def test_analytics_build_dynamic_hourly_prices_nt_splits_and_is_neutral():
    dual_sensor = _make_analytics_sensor(
        _dual_config(
            spot_pricing_model="percentage",
            spot_positive_fee_percent=15.0,
            spot_positive_fee_percent_nt=5.0,
            distribution_fee_vt_kwh=0.0,
            distribution_fee_nt_kwh=0.0,
            vat_rate=0.0,
        )
    )
    raw_prices = {
        "2025-01-02T10:00:00": 1.0,
        "2025-01-02T23:00:00": 1.0,
    }
    dual_result = dual_sensor._build_dynamic_hourly_prices(raw_prices)
    assert dual_result["2025-01-02T10:00:00"]["final_price"] == 1.15
    assert dual_result["2025-01-02T23:00:00"]["final_price"] == 1.05

    single_sensor = _make_analytics_sensor(
        _single_config(
            spot_pricing_model="percentage",
            spot_positive_fee_percent=15.0,
            spot_positive_fee_percent_nt=5.0,
            distribution_fee_vt_kwh=0.0,
            distribution_fee_nt_kwh=0.0,
            vat_rate=0.0,
        )
    )
    single_result = single_sensor._build_dynamic_hourly_prices(raw_prices)
    assert single_result["2025-01-02T10:00:00"]["final_price"] == 1.15
    assert single_result["2025-01-02T23:00:00"]["final_price"] == 1.15
