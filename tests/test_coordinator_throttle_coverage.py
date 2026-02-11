from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.core.coordinator import OigCloudCoordinator


@pytest.mark.asyncio
async def test_battery_forecast_throttled_when_last_update_less_than_30m(monkeypatch):
    """Test battery forecast is throttled when last update was less than 30 minutes ago."""
    from custom_components.oig_cloud.battery_forecast.data import solar_forecast as sf_data

    class DummySensor:
        def __init__(self):
            self._data_hash = "hash123"
            self._first_update = False
            self._profiles_dirty = True
            self._last_update = datetime.now(timezone.utc) - timedelta(minutes=25)
            self._timeline_data = [{"battery_capacity_kwh": 5.0}]
            self._hybrid_timeline = []
            self._mode_optimization_result = None
            self._mode_recommendations = []
            self._consumption_summary = None
            self._box_id = "123"
            self._config_entry = SimpleNamespace(entry_id="entry123", options={})
            self._hass = SimpleNamespace(data={})
            self.hass = SimpleNamespace()
            self.coordinator = SimpleNamespace(battery_forecast_data=None)
            self._write_called = False
            self._precompute_called = False

        def _get_spot_price_timeline(self):
            return [{"time": datetime.now().isoformat(), "price": 1.0}]

        async def _get_solar_forecast(self):
            return {}

        def _get_load_avg_sensors(self):
            return {}

        def _get_balancing_plan(self):
            return None

        def _get_target_battery_capacity(self):
            return None

        def _get_current_battery_soc_percent(self):
            return None

        def _get_battery_efficiency(self):
            return 0.9

        def _build_strategy_balancing_plan(self, *_args, **_kwargs):
            return None

        def _create_mode_recommendations(self, *_args, **kwargs):
            return [{"mode": "Home I"}]

        async def _maybe_fix_daily_plan(self):
            return None

        def _calculate_data_hash(self, _data):
            return "hash"

        def async_write_ha_state(self):
            self._write_called = True

        def _schedule_precompute(self, force=False):
            self._precompute_called = force

        def _create_task_threadsafe(self, *_args, **kwargs):
            return None

    class DummyOteApi:
        _cache_path = None

    class DummyLoop:
        def call_later(self, delay, callback):
            return SimpleNamespace()

    hass = SimpleNamespace(
        data={},
        loop=DummyLoop(),
    )

    coordinator = OigCloudCoordinator(
        hass,
        DummyOteApi(),
        30,
        300,
        SimpleNamespace(entry_id="entry123"),
    )

    coordinator._get_spot_price_timeline = DummySensor._get_spot_price_timeline
    coordinator._get_solar_forecast = DummySensor._get_solar_forecast
    coordinator._get_load_avg_sensors = DummySensor._get_load_avg_sensors
    coordinator._get_balancing_plan = DummySensor._get_balancing_plan
    coordinator._get_target_battery_capacity = DummySensor._get_target_battery_capacity
    coordinator._get_current_battery_soc_percent = DummySensor._get_current_battery_soc_percent
    coordinator._get_battery_efficiency = DummySensor._get_battery_efficiency

    result = await coordinator._maybe_update_battery_forecast(DummySensor())

    assert result is None


@pytest.mark.asyncio
async def test_battery_forecast_throttled_when_inputs_unchanged(monkeypatch):
    """Test battery forecast is throttled when inputs unchanged."""
    from custom_components.oig_cloud.battery_forecast.data import solar_forecast as sf_data

    class DummySensor:
        def __init__(self):
            self._data_hash = "hash123"
            self._first_update = False
            self._profiles_dirty = False
            self._last_update = datetime.now(timezone.utc) - timedelta(minutes=40)
            self._timeline_data = [{"battery_capacity_kwh": 5.0}]
            self._hybrid_timeline = []
            self._mode_optimization_result = None
            self._mode_recommendations = []
            self._consumption_summary = None
            self._box_id = "123"
            self._config_entry = SimpleNamespace(entry_id="entry123", options={})
            self._hass = SimpleNamespace(data={})
            self.hass = SimpleNamespace()
            self.coordinator = SimpleNamespace(battery_forecast_data=None)
            self._write_called = False
            self._precompute_called = False

        def _get_spot_price_timeline(self):
            return [{"time": datetime.now().isoformat(), "price": 1.0}]

        async def _get_solar_forecast(self):
            return {}

        def _get_load_avg_sensors(self):
            return {}

        def _get_balancing_plan(self):
            return None

        def _get_target_battery_capacity(self):
            return None

        def _get_current_battery_soc_percent(self):
            return None

        def _get_battery_efficiency(self):
            return 0.9

        def _build_strategy_balancing_plan(self, *_args, **_kwargs):
            return None

        def _create_mode_recommendations(self, *_args, **_kwargs):
            return [{"mode": "Home I"}]

        async def _maybe_fix_daily_plan(self):
            return None

        def _calculate_data_hash(self, _data):
            return "hash"

        def async_write_ha_state(self):
            self._write_called = True

        def _schedule_precompute(self, force=False):
            self._precompute_called = force

        def _create_task_threadsafe(self, *_args, **_kwargs):
            return None

    class DummyOteApi:
        _cache_path = None

    class DummyLoop:
        def call_later(self, delay, callback):
            return SimpleNamespace()

    hass = SimpleNamespace(
        data={},
        loop=DummyLoop(),
    )

    coordinator = OigCloudCoordinator(
        hass,
        DummyOteApi(),
        30,
        300,
        SimpleNamespace(entry_id="entry123"),
    )

    coordinator._get_spot_price_timeline = DummySensor._get_spot_price_timeline
    coordinator._get_solar_forecast = DummySensor._get_solar_forecast
    coordinator._get_load_avg_sensors = DummySensor._get_load_avg_sensors
    coordinator._get_balancing_plan = DummySensor._get_balancing_plan
    coordinator._get_target_battery_capacity = DummySensor._get_target_battery_capacity
    coordinator._get_current_battery_soc_percent = DummySensor._get_current_battery_soc_percent
    coordinator._get_battery_efficiency = DummySensor._get_battery_efficiency

    result = await coordinator._maybe_update_battery_forecast(DummySensor())

    assert result is None


@pytest.mark.asyncio
async def test_spot_prices_cache_get_hours_count_returns_zero_when_cache_empty(monkeypatch):
    """Test spot_prices_cache get returns 0 when cache is empty."""
    class DummyOteApi:
        _cache_path = None

    class DummyLoop:
        def call_later(self, delay, callback):
            return SimpleNamespace()

    hass = SimpleNamespace(
        data={},
        loop=DummyLoop(),
    )

    coordinator = OigCloudCoordinator(
        hass,
        DummyOteApi(),
        30,
        300,
        SimpleNamespace(entry_id="entry123"),
    )

    coordinator._spot_prices_cache = {}

    coordinator.async_create_task = lambda _coro: None

    result = await coordinator._maybe_update_battery_forecast(SimpleNamespace())

    assert result is None
