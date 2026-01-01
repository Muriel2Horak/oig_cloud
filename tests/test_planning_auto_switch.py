from __future__ import annotations

from datetime import datetime, timedelta

from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.battery_forecast.planning import auto_switch
from custom_components.oig_cloud.battery_forecast.planning import scenario_analysis
from custom_components.oig_cloud.battery_forecast.types import (
    CBB_MODE_HOME_I,
    CBB_MODE_HOME_UPS,
)
from custom_components.oig_cloud.const import CONF_AUTO_MODE_SWITCH


class DummyConfigEntry:
    def __init__(self, options):
        self.options = options
        self.data = options


class DummySensor:
    def __init__(self, options):
        self._config_entry = DummyConfigEntry(options)
        self._auto_switch_handles = []
        self._auto_switch_retry_unsub = None
        self._hass = object()


def test_auto_mode_switch_enabled():
    sensor = DummySensor({CONF_AUTO_MODE_SWITCH: True})
    assert auto_switch.auto_mode_switch_enabled(sensor) is True

    sensor = DummySensor({CONF_AUTO_MODE_SWITCH: False})
    assert auto_switch.auto_mode_switch_enabled(sensor) is False


def test_normalize_service_mode():
    sensor = DummySensor({})
    assert auto_switch.normalize_service_mode(sensor, 0) == "Home 1"
    assert auto_switch.normalize_service_mode(sensor, "HOME UPS") == "Home UPS"
    assert auto_switch.normalize_service_mode(sensor, "home ii") == "Home 2"
    assert auto_switch.normalize_service_mode(sensor, "unknown") is None


def test_get_planned_mode_for_time():
    sensor = DummySensor({})
    base = dt_util.now().replace(minute=0, second=0, microsecond=0)
    timeline = [
        {"time": base.isoformat(), "mode": CBB_MODE_HOME_I, "mode_name": "Home 1"},
        {
            "time": (base + timedelta(minutes=15)).isoformat(),
            "mode": CBB_MODE_HOME_UPS,
            "mode_name": "Home UPS",
        },
    ]

    assert (
        auto_switch.get_planned_mode_for_time(sensor, base, timeline) == "Home 1"
    )
    assert (
        auto_switch.get_planned_mode_for_time(
            sensor, base + timedelta(minutes=16), timeline
        )
        == "Home UPS"
    )


def test_cancel_auto_switch_schedule_clears_handles():
    sensor = DummySensor({})
    called = {"count": 0}

    def _unsub():
        called["count"] += 1

    sensor._auto_switch_handles = [_unsub, _unsub]
    sensor._auto_switch_retry_unsub = _unsub

    auto_switch.cancel_auto_switch_schedule(sensor)

    assert called["count"] == 3
    assert sensor._auto_switch_handles == []
    assert sensor._auto_switch_retry_unsub is None


def test_schedule_auto_switch_retry_sets_unsub(monkeypatch):
    sensor = DummySensor({})
    called = {}

    def _fake_async_call_later(_hass, _delay, _cb):
        called["ok"] = True
        return lambda: None

    monkeypatch.setattr(auto_switch, "async_call_later", _fake_async_call_later)

    auto_switch.schedule_auto_switch_retry(sensor, 5.0)
    assert called["ok"] is True
    assert sensor._auto_switch_retry_unsub is not None


def test_calculate_interval_cost_opportunity():
    result = scenario_analysis.calculate_interval_cost(
        {"net_cost": 2.0, "battery_discharge": 1.0},
        spot_price=3.0,
        export_price=1.0,
        time_of_day="night",
    )

    assert result["direct_cost"] == 2.0
    assert result["opportunity_cost"] > 0
    assert result["total_cost"] > result["direct_cost"]


def test_calculate_fixed_mode_cost_basic():
    class DummySensorForScenario:
        def _get_battery_efficiency(self):
            return 1.0

        def _log_rate_limited(self, *_args, **_kwargs):
            return None

    sensor = DummySensorForScenario()
    now = dt_util.now()
    spot_prices = [
        {"time": (now + timedelta(minutes=15)).isoformat(), "price": 2.0},
        {"time": (now + timedelta(minutes=30)).isoformat(), "price": 3.0},
    ]
    export_prices = [
        {"time": (now + timedelta(minutes=15)).isoformat(), "price": 1.0},
        {"time": (now + timedelta(minutes=30)).isoformat(), "price": 1.0},
    ]

    result = scenario_analysis.calculate_fixed_mode_cost(
        sensor,
        fixed_mode=CBB_MODE_HOME_I,
        current_capacity=2.0,
        max_capacity=10.0,
        min_capacity=1.0,
        spot_prices=spot_prices,
        export_prices=export_prices,
        solar_forecast={},
        load_forecast=[0.5, 0.5],
        physical_min_capacity=0.5,
    )

    assert result["total_cost"] >= 0
    assert result["grid_import_kwh"] >= 0
    assert "penalty_cost" in result


def test_calculate_mode_baselines():
    class DummySensorForScenario:
        def _get_battery_efficiency(self):
            return 1.0

        def _log_rate_limited(self, *_args, **_kwargs):
            return None

    sensor = DummySensorForScenario()
    now = dt_util.now()
    spot_prices = [
        {"time": (now + timedelta(minutes=15)).isoformat(), "price": 2.0},
    ]
    export_prices = [
        {"time": (now + timedelta(minutes=15)).isoformat(), "price": 1.0},
    ]

    baselines = scenario_analysis.calculate_mode_baselines(
        sensor,
        current_capacity=2.0,
        max_capacity=10.0,
        physical_min_capacity=0.5,
        spot_prices=spot_prices,
        export_prices=export_prices,
        solar_forecast={},
        load_forecast=[0.5],
    )

    assert "HOME_I" in baselines
    assert baselines["HOME_I"]["total_cost"] >= 0
