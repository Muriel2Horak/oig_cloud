from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.battery_forecast.sensors import (
    efficiency_sensor as eff_module,
)
from custom_components.oig_cloud.sensors import SENSOR_TYPES_STATISTICS as stats_module


class DummyState:
    def __init__(self, state, attributes=None):
        self.state = str(state)
        self.attributes = attributes or {}
        self.last_updated = datetime.now(timezone.utc)


class DummyStates:
    def __init__(self):
        self._states = {}

    def get(self, entity_id):
        return self._states.get(entity_id)

    def async_set(self, entity_id, state, attributes=None):
        self._states[entity_id] = DummyState(state, attributes)

    def async_all(self, domain):
        prefix = f"{domain}."
        return [st for eid, st in self._states.items() if eid.startswith(prefix)]


class DummyHass:
    def __init__(self):
        self.states = DummyStates()
        self.created = []
        self.data = {}
        self.config = SimpleNamespace(config_dir="/tmp")

    def async_create_task(self, coro):
        coro.close()
        self.created.append(True)
        return object()

    async def async_add_executor_job(self, func, *args, **kwargs):
        return func(*args, **kwargs)


class DummyCoordinator:
    def __init__(self, hass):
        self.hass = hass
        self.config_entry = SimpleNamespace(entry_id="entry")
        self.last_update_success = True

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


def _make_sensor(monkeypatch, hass):
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        lambda _coord: "123",
    )
    monkeypatch.setitem(
        stats_module.SENSOR_TYPES_STATISTICS,
        "battery_efficiency",
        {"name": "Battery Efficiency"},
    )
    coordinator = DummyCoordinator(hass)
    device_info = {"identifiers": {("oig_cloud", "123")}}
    entry = SimpleNamespace(entry_id="entry")
    sensor = eff_module.OigCloudBatteryEfficiencySensor(
        coordinator,
        "battery_efficiency",
        entry,
        device_info,
        hass,
    )
    sensor.hass = hass
    sensor.async_write_ha_state = lambda *args, **kwargs: None
    return sensor


def _set_fixed_utc(monkeypatch, fixed):
    monkeypatch.setattr(eff_module.dt_util, "utcnow", lambda: fixed)


@pytest.mark.asyncio
async def test_update_current_month_metrics_computes_efficiency(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    hass.states.async_set("sensor.oig_123_computed_batt_charge_energy_month", 10000)
    hass.states.async_set("sensor.oig_123_computed_batt_discharge_energy_month", 8000)
    hass.states.async_set("sensor.oig_123_remaining_usable_capacity", 4.0)

    sensor._current_month_start_kwh = 5.0
    now_local = dt_util.as_local(dt_util.utcnow())
    sensor._current_month_key = eff_module._month_key(now_local.year, now_local.month)

    sensor._update_current_month_metrics()
    sensor._publish_state()

    metrics = sensor._current_month_metrics
    assert metrics["charge_kwh"] == 10.0
    assert metrics["discharge_kwh"] == 8.0
    assert metrics["delta_kwh"] == -1.0
    assert metrics["effective_discharge_kwh"] == 9.0
    assert metrics["efficiency_pct"] == 90.0
    assert sensor._attr_extra_state_attributes["efficiency_current_month_pct"] == 90.0
    assert sensor._attr_native_value is None


@pytest.mark.asyncio
async def test_update_current_month_metrics_missing_energy(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    hass.states.async_set("sensor.oig_123_remaining_usable_capacity", 4.0)
    sensor._current_month_start_kwh = 5.0

    sensor._update_current_month_metrics()
    sensor._publish_state()

    assert sensor._current_month_status == "missing charge/discharge data"
    assert sensor._attr_extra_state_attributes["efficiency_current_month_pct"] is None


@pytest.mark.asyncio
async def test_update_current_month_metrics_missing_start(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    hass.states.async_set("sensor.oig_123_computed_batt_charge_energy_month", 10000)
    hass.states.async_set("sensor.oig_123_computed_batt_discharge_energy_month", 8000)
    hass.states.async_set("sensor.oig_123_remaining_usable_capacity", 4.0)

    sensor._current_month_start_kwh = None
    now_local = dt_util.as_local(dt_util.utcnow())
    sensor._current_month_key = eff_module._month_key(now_local.year, now_local.month)

    sensor._update_current_month_metrics()
    sensor._publish_state()

    assert sensor._current_month_status == "missing month start"
    assert sensor._attr_extra_state_attributes["efficiency_current_month_pct"] is None


@pytest.mark.asyncio
async def test_capture_month_snapshot_records_data(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    hass.states.async_set("sensor.oig_123_computed_batt_charge_energy_month", 10000)
    hass.states.async_set("sensor.oig_123_computed_batt_discharge_energy_month", 8000)
    hass.states.async_set("sensor.oig_123_remaining_usable_capacity", 4.0)

    sensor._current_month_start_kwh = 5.0
    sensor._current_month_key = "2026-01"
    now_local = datetime(2026, 1, 15, tzinfo=dt_util.DEFAULT_TIME_ZONE)

    sensor._capture_month_snapshot(now_local)

    assert sensor._month_snapshot is not None
    assert sensor._month_snapshot["charge_wh"] == 10000
    assert sensor._month_snapshot["discharge_wh"] == 8000
    assert sensor._month_snapshot["battery_start_kwh"] == 5.0
    assert sensor._month_snapshot["battery_end_kwh"] == 4.0


@pytest.mark.asyncio
async def test_finalize_last_month_uses_snapshot(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    now_local = datetime(2026, 2, 1, 0, 10, tzinfo=dt_util.DEFAULT_TIME_ZONE)
    sensor._month_snapshot = {
        "month_key": "2026-01",
        "charge_wh": 20000.0,
        "discharge_wh": 15000.0,
        "battery_start_kwh": 10.0,
        "battery_end_kwh": 12.0,
        "captured_at": now_local.isoformat(),
    }

    await sensor._finalize_last_month(now_local, force=True)
    assert sensor._last_month_metrics is not None
    assert sensor._last_month_metrics["efficiency_pct"] == 65.0
    assert sensor._last_month_key == "2026-01"


@pytest.mark.asyncio
async def test_finalize_last_month_fallback_to_history(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    async def fake_load_month_metrics(_hass, _box_id, year, month):
        return {
            "year": year,
            "month": month,
            "efficiency_pct": 77.7,
            "losses_kwh": 1.0,
            "losses_pct": 10.0,
            "charge_kwh": 10.0,
            "discharge_kwh": 8.0,
            "effective_discharge_kwh": 9.0,
            "delta_kwh": -1.0,
            "battery_start_kwh": 5.0,
            "battery_end_kwh": 4.0,
        }

    monkeypatch.setattr(eff_module, "_load_month_metrics", fake_load_month_metrics)

    now_local = datetime(2026, 2, 15, 0, 10, tzinfo=dt_util.DEFAULT_TIME_ZONE)
    await sensor._finalize_last_month(now_local, force=True)
    assert sensor._last_month_metrics is not None
    assert sensor._last_month_metrics["efficiency_pct"] == 77.7


@pytest.mark.asyncio
async def test_finalize_last_month_missing_data_clears(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    async def fake_load_month_metrics(*_args, **_kwargs):
        return None

    monkeypatch.setattr(eff_module, "_load_month_metrics", fake_load_month_metrics)

    now_local = datetime(2026, 2, 15, 0, 10, tzinfo=dt_util.DEFAULT_TIME_ZONE)
    await sensor._finalize_last_month(now_local, force=True)
    assert sensor._last_month_metrics is None
    assert sensor._last_month_key is None


@pytest.mark.asyncio
async def test_finalize_last_month_resets_month_start(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    async def fake_load_month_metrics(*_args, **_kwargs):
        return None

    monkeypatch.setattr(eff_module, "_load_month_metrics", fake_load_month_metrics)

    hass.states.async_set("sensor.oig_123_remaining_usable_capacity", 6.0)
    now_local = datetime(2026, 2, 1, 0, 10, tzinfo=dt_util.DEFAULT_TIME_ZONE)

    await sensor._finalize_last_month(now_local, force=True)
    assert sensor._current_month_start_kwh == 6.0


def test_init_resolve_box_id_error(monkeypatch):
    hass = DummyHass()

    def boom(_coord):
        raise RuntimeError("boom")

    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        boom,
    )
    monkeypatch.setitem(
        stats_module.SENSOR_TYPES_STATISTICS,
        "battery_efficiency",
        {"name": "Battery Efficiency"},
    )
    coordinator = DummyCoordinator(hass)
    device_info = {"identifiers": {("oig_cloud", "123")}}
    entry = SimpleNamespace(entry_id="entry")
    sensor = eff_module.OigCloudBatteryEfficiencySensor(
        coordinator,
        "battery_efficiency",
        entry,
        device_info,
        hass,
    )
    assert sensor._box_id == "unknown"


def test_restore_from_state_without_attrs(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    sensor._restore_from_state()
    assert sensor._last_month_metrics is None


def test_handle_coordinator_update_calls_publish(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    sensor._update_current_month_metrics = Mock()
    sensor._publish_state = Mock()
    sensor._handle_coordinator_update()

    sensor._update_current_month_metrics.assert_called_once()
    sensor._publish_state.assert_called_once()


@pytest.mark.asyncio
async def test_async_added_to_hass_runs_initial_flow(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    monkeypatch.setattr(
        eff_module, "async_track_time_change", lambda *_a, **_k: lambda: None
    )
    sensor._restore_from_state = Mock()
    sensor._finalize_last_month = AsyncMock()
    sensor._update_current_month_metrics = Mock()
    sensor._publish_state = Mock()

    await sensor.async_added_to_hass()

    sensor._restore_from_state.assert_called_once()
    sensor._finalize_last_month.assert_awaited()
    sensor._update_current_month_metrics.assert_called_once()
    sensor._publish_state.assert_called_once()


@pytest.mark.asyncio
async def test_scheduled_snapshot_calls_helpers(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    sensor._capture_month_snapshot = Mock()
    sensor._update_current_month_metrics = Mock()
    sensor._publish_state = Mock()

    await sensor._scheduled_snapshot(datetime(2026, 2, 1, tzinfo=timezone.utc))

    sensor._capture_month_snapshot.assert_called_once()
    sensor._update_current_month_metrics.assert_called_once()
    sensor._publish_state.assert_called_once()


@pytest.mark.asyncio
async def test_scheduled_finalize_calls_helpers(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    sensor._finalize_last_month = AsyncMock()
    sensor._update_current_month_metrics = Mock()
    sensor._publish_state = Mock()

    await sensor._scheduled_finalize(datetime(2026, 2, 1, tzinfo=timezone.utc))

    sensor._finalize_last_month.assert_awaited()
    sensor._update_current_month_metrics.assert_called_once()
    sensor._publish_state.assert_called_once()


def test_capture_month_snapshot_updates_start_and_returns(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    hass.states.async_set("sensor.oig_123_remaining_usable_capacity", 4.0)
    now_local = datetime(2026, 2, 1, tzinfo=dt_util.DEFAULT_TIME_ZONE)

    sensor._capture_month_snapshot(now_local)

    assert sensor._current_month_key == "2026-02"
    assert sensor._current_month_start_kwh == 4.0
    assert sensor._month_snapshot is None


@pytest.mark.asyncio
async def test_finalize_last_month_keeps_existing_when_not_forced(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    async def fake_load_month_metrics(*_args, **_kwargs):
        raise AssertionError("Should not fetch history")

    monkeypatch.setattr(eff_module, "_load_month_metrics", fake_load_month_metrics)

    now_local = datetime(2026, 2, 15, 0, 10, tzinfo=dt_util.DEFAULT_TIME_ZONE)
    prev_year, prev_month = eff_module._previous_month(now_local)
    sensor._last_month_key = eff_module._month_key(prev_year, prev_month)
    sensor._last_month_metrics = {"efficiency_pct": 80.0}

    await sensor._finalize_last_month(now_local, force=False)
    assert sensor._last_month_metrics["efficiency_pct"] == 80.0


def test_restore_from_state_loads_last_month(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)

    hass.states.async_set(
        sensor.entity_id,
        "88.5",
        {
            "last_month_year": 2026,
            "last_month_month": 1,
            "efficiency_last_month_pct": 88.5,
            "last_month_charge_kwh": 20.0,
            "last_month_discharge_kwh": 15.0,
            "last_month_effective_discharge_kwh": 13.0,
            "last_month_delta_kwh": 2.0,
            "last_month_battery_start_kwh": 10.0,
            "last_month_battery_end_kwh": 12.0,
            "losses_last_month_kwh": 7.0,
            "losses_last_month_pct": 35.0,
            "battery_kwh_month_start": 5.0,
            "_current_month_key": "2026-02",
            "_month_snapshot": {"month_key": "2026-01"},
        },
    )

    sensor._restore_from_state()

    assert sensor._last_month_metrics is not None
    assert sensor._last_month_key == "2026-01"
    assert sensor._last_month_metrics["efficiency_pct"] == 88.5
    assert sensor._current_month_start_kwh == 5.0


def test_get_snapshot_metrics_returns_none_when_metrics_missing(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)
    prev_key = eff_module._month_key(2026, 1)
    sensor._month_snapshot = {
        "month_key": prev_key,
        "charge_wh": None,
        "discharge_wh": None,
        "battery_start_kwh": None,
        "battery_end_kwh": None,
    }

    result = sensor._get_snapshot_metrics(prev_key, 2026, 1)
    assert result is None


@pytest.mark.asyncio
async def test_load_last_month_metrics_skips_when_inflight(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)
    sensor._history_refresh_inflight = True

    result = await sensor._load_last_month_metrics(2026, 1)
    assert result is None


def test_reset_last_month_metrics_noop_for_same_key(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)
    prev_key = eff_module._month_key(2026, 1)
    sensor._last_month_key = prev_key
    sensor._last_month_metrics = {"efficiency_pct": 80.0}

    sensor._reset_last_month_metrics(prev_key)
    assert sensor._last_month_key == prev_key
    assert sensor._last_month_metrics["efficiency_pct"] == 80.0


def test_get_sensor_handles_missing(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)
    sensor._hass = None
    assert sensor._get_sensor("missing") is None

    sensor._hass = hass
    assert sensor._get_sensor("missing") is None


def test_get_sensor_invalid_state(monkeypatch):
    hass = DummyHass()
    sensor = _make_sensor(monkeypatch, hass)
    hass.states.async_set("sensor.oig_123_remaining_usable_capacity", "bad")
    assert sensor._get_sensor("remaining_usable_capacity") is None


@pytest.mark.asyncio
async def test_load_month_metrics_import_error(monkeypatch):
    hass = DummyHass()

    import builtins

    orig_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "homeassistant.components.recorder.statistics":
            raise ImportError("boom")
        return orig_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    result = await eff_module._load_month_metrics(hass, "123", 2026, 1)
    assert result is None


@pytest.mark.asyncio
async def test_load_month_metrics_success(monkeypatch):
    hass = DummyHass()

    def fake_statistics_during_period(_hass, start, end, entity_ids, *_a, **_k):
        entities = list(entity_ids)
        charge = entities[0]
        discharge = entities[1]
        battery = entities[2]
        return {
            charge: [{"sum": 20000}],
            discharge: [{"sum": 15000}],
            battery: [{"state": 10}, {"state": 12}],
        }

    monkeypatch.setattr(
        "homeassistant.components.recorder.statistics.statistics_during_period",
        fake_statistics_during_period,
    )

    metrics = await eff_module._load_month_metrics(hass, "123", 2026, 1)
    assert metrics is not None
    assert metrics["efficiency_pct"] == 65.0
    assert metrics["charge_kwh"] == 20.0


@pytest.mark.asyncio
async def test_load_month_metrics_invalid_data(monkeypatch):
    hass = DummyHass()

    def fake_statistics_during_period(_hass, start, end, entity_ids, *_a, **_k):
        entities = list(entity_ids)
        charge = entities[0]
        discharge = entities[1]
        battery = entities[2]
        return {
            charge: [{"state": "bad"}],
            discharge: [{"sum": 15000}],
            battery: [{"state": 10}, {"state": 12}],
        }

    monkeypatch.setattr(
        "homeassistant.components.recorder.statistics.statistics_during_period",
        fake_statistics_during_period,
    )

    metrics = await eff_module._load_month_metrics(hass, "123", 2026, 1)
    assert metrics is None


def test_compute_metrics_invalid_values():
    metrics = eff_module._compute_metrics_from_wh(0.0, 1000.0, 5.0, 4.0)
    assert metrics is None

    metrics = eff_module._compute_metrics_from_wh(1000.0, 1000.0, 5.0, 10.0)
    assert metrics is None


def test_previous_month_and_range():
    year, month = eff_module._previous_month(datetime(2026, 1, 15, tzinfo=timezone.utc))
    assert (year, month) == (2025, 12)

    start_local, end_local = eff_module._month_range_local(2026, 1)
    assert start_local.day == 1
    assert end_local.day >= 28
