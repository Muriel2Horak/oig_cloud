from __future__ import annotations

from types import SimpleNamespace

from custom_components.oig_cloud.battery_forecast.sensors.ha_sensor import (
    CBB_MODE_HOME_UPS,
    OigCloudBatteryForecastSensor,
)


class DummyCoordinator:
    def __init__(self):
        self.data = {}
        self.last_update_success = True

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class DummyConfigEntry:
    def __init__(self):
        self.options = {}
        self.data = {}


def _make_sensor(monkeypatch):
    def _init_sensor(
        sensor,
        *_args,
        **_kwargs,
    ):
        sensor._device_info = {}
        sensor._config_entry = DummyConfigEntry()
        sensor._box_id = "123"

    monkeypatch.setattr(
        "custom_components.oig_cloud.battery_forecast.sensors.ha_sensor.sensor_setup_module.initialize_sensor",
        _init_sensor,
    )
    coordinator = DummyCoordinator()
    return OigCloudBatteryForecastSensor(coordinator, "battery_forecast", DummyConfigEntry(), {})


def test_build_strategy_balancing_plan_skips_invalid_intervals(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    spot_prices = [
        {"time": "2025-01-01T00:00:00"},
        {"time": "2025-01-01T00:15:00"},
    ]
    plan = {
        "active": True,
        "intervals": [
            SimpleNamespace(ts="2025-01-01T00:00:00", mode=CBB_MODE_HOME_UPS),
            {"ts": "bad", "mode": CBB_MODE_HOME_UPS},
            {"ts": "2025-01-01T00:15:00", "mode": None},
        ],
        "holding_start": "bad",
        "holding_end": "2025-01-01T00:30:00",
    }
    result = sensor._build_strategy_balancing_plan(spot_prices, plan)
    assert result is not None
    assert result.charging_intervals == {0}
    assert result.holding_intervals == set()
