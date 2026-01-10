from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.entities import statistics_sensor as module


class DummyCoordinator:
    def __init__(self, data=None):
        self.data = data
        self.config_entry = SimpleNamespace(options=SimpleNamespace(enable_statistics=True))


class DummyStore:
    def __init__(self, data=None, boom=False):
        self._data = data
        self._boom = boom

    async def async_load(self):
        if self._boom:
            raise RuntimeError("boom")
        return self._data

    async def async_save(self, _data):
        return None


def _install_sensor_type(monkeypatch, sensor_type="battery_load_median", extra=None):
    definition = {"name_cs": "Stat", "unit": "W"}
    if extra:
        definition.update(extra)
    monkeypatch.setattr(
        "custom_components.oig_cloud.sensor_types.SENSOR_TYPES",
        {sensor_type: definition},
    )


def _make_sensor(monkeypatch, sensor_type="battery_load_median", data=None, extra=None):
    _install_sensor_type(monkeypatch, sensor_type, extra)
    coord = DummyCoordinator(data=data)
    sensor = module.OigCloudStatisticsSensor(coord, sensor_type, {"identifiers": set()})
    sensor.hass = SimpleNamespace(
        states=SimpleNamespace(get=lambda _eid: None), async_create_task=lambda _c: None
    )
    return sensor


def test_device_info_property(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    assert sensor.device_info == {"identifiers": set()}


@pytest.mark.asyncio
async def test_async_added_to_hass_battery_load_median(monkeypatch):
    sensor = _make_sensor(monkeypatch)

    called = {"interval": 0}

    def _track_interval(_hass, _cb, _delta):
        called["interval"] += 1
        return None

    async def _load():
        return None

    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.statistics_sensor.async_track_time_interval",
        _track_interval,
    )
    monkeypatch.setattr(sensor, "_load_statistics_data", _load)

    await sensor.async_added_to_hass()
    assert called["interval"] == 1


@pytest.mark.asyncio
async def test_load_statistics_data_timezone_and_hourly_restore(monkeypatch):
    sensor = _make_sensor(monkeypatch, sensor_type="hourly_energy")
    sensor.async_write_ha_state = lambda: None
    store = DummyStore(
        {
            "sampling_data": [["2025-01-01T00:00:00+00:00", 1.0]],
            "hourly_data": [{"datetime": "2025-01-01T01:00:00", "value": 1.0}],
            "current_hourly_value": 1.2,
            "last_hour_reset": "2025-01-01T01:00:00+00:00",
        }
    )
    monkeypatch.setattr(module, "Store", lambda *_a, **_k: store)
    await sensor._load_statistics_data()
    assert sensor._current_hourly_value == 1.2


@pytest.mark.asyncio
async def test_load_statistics_data_failure(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    monkeypatch.setattr(module, "Store", lambda *_a, **_k: DummyStore(boom=True))
    await sensor._load_statistics_data()


@pytest.mark.asyncio
async def test_update_sampling_data_non_median(monkeypatch):
    sensor = _make_sensor(monkeypatch, sensor_type="hourly_energy")
    await sensor._update_sampling_data(datetime.now())
    assert sensor._sampling_data == []


@pytest.mark.asyncio
async def test_update_sampling_data_trims(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    sensor._max_sampling_size = 1
    sensor._sampling_data = [(datetime.now() - timedelta(minutes=5), 1.0)]
    monkeypatch.setattr(sensor, "_get_actual_load_value", lambda: 2.0)
    await sensor._update_sampling_data(datetime.now())
    assert len(sensor._sampling_data) == 1


@pytest.mark.asyncio
async def test_check_hourly_end_non_hourly(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    await sensor._check_hourly_end(datetime.now())


@pytest.mark.asyncio
async def test_check_hourly_end_invalid_hourly_record(monkeypatch):
    sensor = _make_sensor(
        monkeypatch,
        sensor_type="hourly_energy",
        extra={"source_sensor": "sensor.fake", "hourly_data_type": "energy_diff"},
    )
    sensor._source_entity_id = "sensor.fake"
    sensor._hourly_data = [{"datetime": "bad", "value": 1.0}]
    sensor._last_hour_reset = None

    async def _calc():
        return 1.0

    monkeypatch.setattr(sensor, "_calculate_hourly_energy", _calc)
    await sensor._check_hourly_end(datetime.now().replace(minute=1))


@pytest.mark.asyncio
async def test_daily_statistics_update_no_time_range(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    sensor._time_range = None
    await sensor._daily_statistics_update(None)


def test_is_correct_day_type_weekend_weekday(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    sensor._day_type = "weekend"
    weekend = datetime(2025, 1, 4)
    weekday = datetime(2025, 1, 6)
    assert sensor._is_correct_day_type(weekend) is True
    assert sensor._is_correct_day_type(weekday) is False
    sensor._day_type = "weekday"
    assert sensor._is_correct_day_type(weekday) is True


def test_is_correct_day_type_default(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    sensor._day_type = None
    assert sensor._is_correct_day_type(datetime(2025, 1, 6)) is True


@pytest.mark.asyncio
async def test_calculate_interval_statistics_day_type_skip(monkeypatch, caplog):
    class FakeDT(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2025, 1, 6, 12, tzinfo=timezone.utc)

    sensor = _make_sensor(
        monkeypatch,
        sensor_type="interval",
        extra={"time_range": (6, 8), "max_age_days": 1, "day_type": "weekend"},
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.statistics_sensor.datetime",
        FakeDT,
    )
    sensor._day_type = "weekend"
    sensor._time_range = (6, 8)
    state = SimpleNamespace(
        last_updated=datetime(2025, 1, 6, 7, tzinfo=timezone.utc), state="100"
    )
    async def _async_job(*_a, **_k):
        return {"sensor.oig_unknown_actual_aco_p": [state]}

    sensor.hass = SimpleNamespace(async_add_executor_job=_async_job)
    assert await sensor._calculate_interval_statistics_from_history() is None
    assert "No valid data found for calculation" in caplog.text


@pytest.mark.asyncio
async def test_calculate_interval_statistics_outside_normal_interval(monkeypatch, caplog):
    class FakeDT(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2025, 1, 6, 12, tzinfo=timezone.utc)

    sensor = _make_sensor(
        monkeypatch,
        sensor_type="interval",
        extra={"time_range": (6, 8), "max_age_days": 1},
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.statistics_sensor.datetime",
        FakeDT,
    )
    sensor._time_range = (6, 8)
    state = SimpleNamespace(
        last_updated=datetime(2025, 1, 6, 9, tzinfo=timezone.utc), state="100"
    )
    async def _async_job(*_a, **_k):
        return {"sensor.oig_unknown_actual_aco_p": [state]}

    sensor.hass = SimpleNamespace(async_add_executor_job=_async_job)
    assert await sensor._calculate_interval_statistics_from_history() is None
    assert "No valid data found for calculation" in caplog.text


@pytest.mark.asyncio
async def test_calculate_interval_statistics_outside_overnight_interval(monkeypatch, caplog):
    class FakeDT(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2025, 1, 6, 12, tzinfo=timezone.utc)

    sensor = _make_sensor(
        monkeypatch,
        sensor_type="interval",
        extra={"time_range": (22, 6), "max_age_days": 1},
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.statistics_sensor.datetime",
        FakeDT,
    )
    sensor._time_range = (22, 6)
    state = SimpleNamespace(
        last_updated=datetime(2025, 1, 6, 12, tzinfo=timezone.utc), state="100"
    )
    async def _async_job(*_a, **_k):
        return {"sensor.oig_unknown_actual_aco_p": [state]}

    sensor.hass = SimpleNamespace(async_add_executor_job=_async_job)
    assert await sensor._calculate_interval_statistics_from_history() is None
    assert "No valid data found for calculation" in caplog.text


@pytest.mark.asyncio
async def test_calculate_hourly_energy_missing_config(monkeypatch):
    sensor = _make_sensor(monkeypatch, sensor_type="hourly_energy")
    sensor._sensor_config = None
    assert await sensor._calculate_hourly_energy() is None


@pytest.mark.asyncio
async def test_calculate_hourly_energy_source_unavailable(monkeypatch):
    sensor = _make_sensor(
        monkeypatch,
        sensor_type="hourly_energy",
        extra={"source_sensor": "sensor.fake"},
    )
    sensor._source_entity_id = "sensor.fake"
    sensor.hass = SimpleNamespace(states=SimpleNamespace(get=lambda _eid: None))
    assert await sensor._calculate_hourly_energy() is None


@pytest.mark.asyncio
async def test_calculate_hourly_energy_unknown_type(monkeypatch):
    sensor = _make_sensor(
        monkeypatch,
        sensor_type="hourly_energy",
        extra={"source_sensor": "sensor.fake", "hourly_data_type": "weird"},
    )
    sensor._source_entity_id = "sensor.fake"
    sensor.hass = SimpleNamespace(
        states=SimpleNamespace(
            get=lambda _eid: SimpleNamespace(state="10", attributes={"unit_of_measurement": "kWh"})
        )
    )
    assert await sensor._calculate_hourly_energy() is None


@pytest.mark.asyncio
async def test_calculate_hourly_energy_invalid_value(monkeypatch):
    sensor = _make_sensor(
        monkeypatch,
        sensor_type="hourly_energy",
        extra={"source_sensor": "sensor.fake", "hourly_data_type": "energy_diff"},
    )
    sensor._source_entity_id = "sensor.fake"
    sensor.hass = SimpleNamespace(
        states=SimpleNamespace(get=lambda _eid: SimpleNamespace(state="bad", attributes={}))
    )
    assert await sensor._calculate_hourly_energy() is None


def test_calculate_statistics_value_empty(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    sensor._sampling_data = []
    assert sensor._calculate_statistics_value() is None


def test_calculate_statistics_value_exception(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    sensor._sampling_data = [("bad", 1.0)]
    sensor._sampling_minutes = 1
    assert sensor._calculate_statistics_value() is None


def test_state_hourly_when_coordinator_has_data(monkeypatch):
    sensor = _make_sensor(monkeypatch, sensor_type="hourly_energy", data={"ok": 1})
    sensor._current_hourly_value = 2.5
    assert sensor.state == 2.5


def test_state_non_hourly_uses_statistics(monkeypatch):
    sensor = _make_sensor(monkeypatch)
    sensor._calculate_statistics_value = lambda: 3.0
    assert sensor.state == 3.0


def test_available_battery_load_and_hourly(monkeypatch):
    sensor = _make_sensor(monkeypatch, data=None)
    sensor._sampling_data = []
    assert sensor.available is False
    sensor._sampling_data = [(datetime.now(), 1.0)]
    assert sensor.available is True

    hourly = _make_sensor(
        monkeypatch,
        sensor_type="hourly_energy",
    )
    hourly.hass = SimpleNamespace(states=SimpleNamespace(get=lambda _eid: None))
    assert hourly.available is False


def test_available_hourly_missing_source_entity_id(monkeypatch):
    sensor = _make_sensor(monkeypatch, sensor_type="hourly_energy")
    sensor.hass = SimpleNamespace(states=SimpleNamespace(get=lambda _eid: None))
    assert sensor.available is False


def test_available_non_hourly_uses_coordinator_data(monkeypatch):
    sensor = _make_sensor(monkeypatch, sensor_type="interval", data={"ok": 1})
    assert sensor.available is True


def test_statistics_processor_invalid_timestamps(monkeypatch):
    processor = module.StatisticsProcessor(SimpleNamespace())

    def _parse(_val):
        raise ValueError("bad")

    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.statistics_sensor.dt_util.parse_datetime",
        _parse,
    )
    result = processor.process_hourly_data(
        "sensor.test", [{"timestamp": "bad"}, {"time": "bad"}]
    )
    assert result["attributes"]["data_points"] == 0


def test_statistics_processor_datetime_timestamp():
    processor = module.StatisticsProcessor(SimpleNamespace())
    now = datetime(2025, 1, 6, 12, tzinfo=timezone.utc)
    result = processor.process_hourly_data("sensor.test", [{"timestamp": now}])
    assert result["attributes"]["data_points"] == 1
