from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.data import solar_forecast as sf_data
from custom_components.oig_cloud.boiler import coordinator as boiler_coordinator_module
from custom_components.oig_cloud.entities import battery_health_sensor as battery_health_module
from custom_components.oig_cloud.entities import solar_forecast_sensor as solar_sensor_module


def test_solar_forecast_data_missing_and_no_attrs_paths():
    logs = []

    sensor = SimpleNamespace(
        _hass=SimpleNamespace(states=SimpleNamespace(get=lambda _eid: None)),
        _config_entry=SimpleNamespace(options={"enable_solar_forecast": True}),
        coordinator=SimpleNamespace(solar_forecast_data=None),
        _box_id="123",
        _log_rate_limited=lambda *args, **kwargs: logs.append((args, kwargs)),
    )

    # no state + no cache -> _log_forecast_missing branch
    out = sf_data.get_solar_forecast(sensor)
    assert out == {}

    # state exists but no attrs -> _log_forecast_no_attrs branch
    sensor._hass = SimpleNamespace(
        states=SimpleNamespace(get=lambda _eid: SimpleNamespace(attributes=None))
    )
    out2 = sf_data.get_solar_forecast(sensor)
    assert out2 == {}

    # get_solar_forecast_strings early return branches
    sensor._hass = None
    assert sf_data.get_solar_forecast_strings(sensor) == {}

    sensor._hass = SimpleNamespace(states=SimpleNamespace(get=lambda _eid: SimpleNamespace(attributes=None)))
    assert sf_data.get_solar_forecast_strings(sensor) == {}


def test_solar_forecast_cached_parsing_and_invalid_entries():
    logs = []
    sensor = SimpleNamespace(
        _hass=SimpleNamespace(states=SimpleNamespace(get=lambda _eid: None)),
        _config_entry=SimpleNamespace(options={"enable_solar_forecast": True}),
        coordinator=SimpleNamespace(
            solar_forecast_data={
                "total_hourly": {
                    "invalid": 100,  # parse exception branch
                    "2025-01-01T10:00:00": 500,
                }
            }
        ),
        _box_id="123",
        _log_rate_limited=lambda *args, **kwargs: logs.append((args, kwargs)),
    )

    out = sf_data.get_solar_forecast(sensor)
    assert isinstance(out, dict)
    assert "today" in out and "tomorrow" in out


def test_battery_health_context_and_threshold_branches(monkeypatch):
    class DummyStore:
        def __init__(self, *_a, **_k):
            pass

    monkeypatch.setattr(battery_health_module, "Store", DummyStore)
    tracker = battery_health_module.BatteryHealthTracker(
        SimpleNamespace(states=SimpleNamespace(get=lambda _eid: None), config=SimpleNamespace(config_dir="/tmp")),
        "123",
    )

    # no context / empty parts branches
    assert tracker._format_measurement_context(None) == ""
    assert tracker._format_measurement_context({"source": None}) == ""

    # threshold helper
    value = tracker._max_discharge_threshold(100.0)
    assert isinstance(value, (int, float))


@pytest.mark.asyncio
async def test_solar_sensor_normalization_and_solcast_error_paths(monkeypatch):
    # _normalize_hourly_keys branches (non-str key, invalid str, aware/naive)
    normalized = solar_sensor_module._normalize_hourly_keys(
        {
            1: 100.0,
            "bad": 50.0,
            "2025-01-01T10:15:00+00:00": 300.0,
            "2025-01-01T10:45:00": 250.0,
        }
    )
    assert 1 in normalized
    assert "bad" in normalized

    # sensor for load/save normalization branches
    coordinator = SimpleNamespace(forced_box_id="123", async_add_listener=lambda *_a, **_k: (lambda: None))
    entry = SimpleNamespace(options={"enable_solar_forecast": True})
    sensor = solar_sensor_module.OigCloudSolarForecastSensor(
        coordinator, "solar_forecast", entry, {}
    )
    sensor.hass = SimpleNamespace(
        states=SimpleNamespace(get=lambda _eid: None),
        services=SimpleNamespace(async_call=lambda *_a, **_k: None),
        async_create_task=lambda _coro: None,
    )

    class DummyStore:
        async def async_load(self):
            return {
                "last_api_call": 0,
                "forecast_data": {
                    "total_hourly": {
                        "2025-01-01T10:15:00+00:00": 100.0,
                        "2025-01-01T10:45:00+00:00": 120.0,
                    }
                },
            }

        async def async_save(self, _data):
            return None

    saved = {"called": False}

    async def _save():
        saved["called"] = True

    monkeypatch.setattr(solar_sensor_module, "Store", lambda *_a, **_k: DummyStore())
    monkeypatch.setattr(sensor, "_save_persistent_data", _save)
    await sensor._load_persistent_data()
    assert saved["called"] is True

    # solcast missing site_id branch (line 626-627)
    sensor._config_entry.options.update(
        {
            "solar_forecast_provider": "solcast",
            "solcast_api_key": "key",
            "solcast_site_id": "",
        }
    )
    await sensor._fetch_solcast_data(1000.0)

    # parse forecast entry invalid pv_estimate branch (711-714)
    parsed = sensor._parse_forecast_entry(
        {"period_end": "2025-01-01T00:30:00+00:00", "pv_estimate": "not-a-number"},
        total_kwp=1.0,
    )
    assert parsed is None

    # _convert_to_hourly naive timestamp branch (dt.tzinfo is None)
    hourly = sensor._convert_to_hourly({"2025-01-01T10:15:00": 50.0})
    assert hourly


def test_boiler_coordinator_infer_box_id_branches(monkeypatch):
    """_infer_box_id_from_states is removed; _resolve_box_id must not use it."""
    from homeassistant.helpers import frame

    monkeypatch.setattr(frame, "report_usage", lambda *_a, **_k: None)

    hass = SimpleNamespace(
        states=SimpleNamespace(
            async_entity_ids=lambda _domain: [
                "sensor.invalid",
                "sensor.foo_bar_baz",
                "sensor_oig_123_boiler_day_w",
            ]
        )
    )
    coordinator = boiler_coordinator_module.BoilerCoordinator(hass, {})
    assert coordinator._resolve_box_id({}) == "unknown"


def test_boiler_coordinator_resolve_box_id_forced_branch(monkeypatch):
    from homeassistant.helpers import frame

    monkeypatch.setattr(frame, "report_usage", lambda *_a, **_k: None)

    hass = SimpleNamespace(states=SimpleNamespace(async_entity_ids=lambda _domain: []))
    coordinator = boiler_coordinator_module.BoilerCoordinator(hass, {})
    coordinator.forced_box_id = "777"
    assert coordinator._resolve_box_id({}) == "777"


def _hybrid_strategy_stub():
    class _Sim:
        def simulate(self, *, battery_start, mode, solar_kwh, load_kwh, force_charge=False):
            _ = mode
            _ = force_charge
            return SimpleNamespace(battery_end=battery_start + solar_kwh - load_kwh, grid_import=1.0)

    return SimpleNamespace(
        MAX_ITERATIONS=3,
        MIN_UPS_PRICE_BAND_PCT=0.08,
        config=SimpleNamespace(
            max_ups_price_czk=10.0,
            min_ups_duration_intervals=1,
            price_hysteresis_czk=0.0,
            hw_min_hold_hours=0.5,
            round_trip_efficiency=None,
        ),
        sim_config=SimpleNamespace(min_capacity_kwh=1.0, ac_dc_efficiency=0.0, dc_ac_efficiency=0.0),
        simulator=_Sim(),
        _planning_min=1.0,
        _target=3.0,
    )


def test_boiler_coordinator_len_parts_guard_branch(monkeypatch):
    """_infer_box_id_from_states is removed; _resolve_box_id returns unknown."""
    from homeassistant.helpers import frame

    monkeypatch.setattr(frame, "report_usage", lambda *_a, **_k: None)

    class FakeEntityId:
        def __contains__(self, _item):
            return True

        def split(self, _sep):
            return ["sensor", "oig"]

    hass = SimpleNamespace(
        states=SimpleNamespace(
            async_entity_ids=lambda _domain: [
                FakeEntityId(),
            ]
        )
    )
    coordinator = boiler_coordinator_module.BoilerCoordinator(hass, {})
    assert coordinator._resolve_box_id({}) == "unknown"
