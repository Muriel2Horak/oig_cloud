"""TLS-only transport and the hourly job for anonymous energy slots."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from custom_components.oig_cloud.battery_forecast.planning import energy_telemetry_job as job
from custom_components.oig_cloud.shared.energy_publisher import EnergyMqttPublisher

NOW = datetime(2026, 11, 15, 18, 5, tzinfo=timezone.utc)


class _Client:
    def __init__(self):
        self.tls = False
        self.on_connect = None
        self.on_disconnect = None

    def tls_set(self, *args, **kwargs):
        self.tls = True

    def connect_async(self, *args):
        pass

    def loop_start(self):
        pass

    def loop_stop(self):
        pass

    def disconnect(self):
        pass


async def test_publisher_uses_tls_and_its_own_topic():
    client = _Client()
    publisher = EnergyMqttPublisher(entry_id="e", client_factory=lambda: client)
    assert await publisher.async_start() is True
    try:
        assert client.tls is True
        assert publisher.emit_cloud_event({"install_id": "a" * 24, "slots": []}) is True
        queued = publisher._queue.get_nowait()
        assert queued.topic == "oig/energy/" + "a" * 24
    finally:
        await publisher.async_shutdown()


async def test_publisher_refuses_a_box_serial_as_id():
    publisher = EnergyMqttPublisher(entry_id="e", client_factory=_Client)
    await publisher.async_start()
    try:
        assert publisher.emit_cloud_event({"install_id": "2206237016"}) is False
    finally:
        await publisher.async_shutdown()


def test_previous_hour_slots_end_at_the_last_settled_quarter():
    starts = job.slots_to_send(NOW, last_sent=None)
    assert starts == [datetime(2026, 11, 15, 17, 0, tzinfo=timezone.utc) + timedelta(minutes=15 * i) for i in range(4)]


def test_slots_already_sent_are_not_sent_again():
    last = datetime(2026, 11, 15, 17, 30, tzinfo=timezone.utc)
    starts = job.slots_to_send(NOW, last_sent=last)
    assert starts == [datetime(2026, 11, 15, 17, 45, tzinfo=timezone.utc)]


def test_after_a_long_gap_at_most_a_day_is_sent():
    last = NOW - timedelta(days=3)
    assert len(job.slots_to_send(NOW, last_sent=last)) == 96


def _sensor(options):
    hass = SimpleNamespace(data={}, states=SimpleNamespace(get=lambda _e: None))
    return SimpleNamespace(
        _hass=hass,
        hass=hass,
        _box_id="2206237016",
        _config_entry=SimpleNamespace(entry_id="e", options=options),
        _get_total_battery_capacity=lambda: 15.36,
    )


def _row():
    return {
        "consumption_kwh": 0.3, "nonbackup_kwh": 0.05, "solar_kwh": 0.0, "grid_import": 0.3,
        "grid_export": 0.0, "battery_soc": 99.0, "mode": 3, "spot_price": 6.2, "export_price": 3.1,
    }


async def test_job_sends_nothing_without_consent():
    sender = SimpleNamespace(emit_cloud_event=lambda _e: True)
    tick = job.EnergyTelemetryJob(_sensor({"share_energy_data": False}), publisher=sender, salt="s")
    with patch.object(job, "fetch_interval_from_history", AsyncMock(return_value=_row())) as fetch:
        assert await tick.async_run(NOW) is False
    fetch.assert_not_called()


async def test_job_sends_the_hour_with_consent_and_remembers_it():
    sent = []
    sender = SimpleNamespace(emit_cloud_event=lambda event: sent.append(event) or True)
    tick = job.EnergyTelemetryJob(_sensor({"share_energy_data": True}), publisher=sender, salt="s")
    with patch.object(job, "fetch_interval_from_history", AsyncMock(return_value=_row())):
        assert await tick.async_run(NOW) is True
        assert await tick.async_run(NOW + timedelta(minutes=1)) is False  # nothing new

    assert len(sent) == 1
    batch = sent[0]
    assert len(batch["slots"]) == 4
    assert batch["install_id"] != "2206237016"
    assert batch["box"]["capacity_kwh"] == 15.36


async def test_unmeasured_slots_are_skipped_not_zeroed():
    sent = []
    sender = SimpleNamespace(emit_cloud_event=lambda event: sent.append(event) or True)
    tick = job.EnergyTelemetryJob(_sensor({"share_energy_data": True}), publisher=sender, salt="s")
    rows = [None, _row(), None, _row()]
    with patch.object(job, "fetch_interval_from_history", AsyncMock(side_effect=rows)):
        await tick.async_run(NOW)
    assert len(sent[0]["slots"]) == 2


async def test_lifecycle_starts_nothing_without_consent(monkeypatch):
    from custom_components.oig_cloud.battery_forecast.sensors import sensor_lifecycle

    sensor = _sensor({"share_energy_data": False})
    sensor.async_on_remove = lambda _u: None
    assert await sensor_lifecycle._async_start_energy_telemetry(sensor) is None


async def test_lifecycle_keeps_one_salt_and_schedules_the_hourly_job(monkeypatch):
    from custom_components.oig_cloud.battery_forecast.sensors import sensor_lifecycle

    saved = {}

    class _Store:
        def __init__(self, *_a, **_k):
            pass

        async def async_load(self):
            return saved.get("data")

        async def async_save(self, data):
            saved["data"] = data

    class _Publisher:
        def __init__(self, **_k):
            self.started = False

        async def async_start(self):
            self.started = True
            return True

        async def async_shutdown(self):
            self.started = False

    timers = []
    monkeypatch.setattr(sensor_lifecycle, "Store", _Store)
    monkeypatch.setattr(sensor_lifecycle, "EnergyMqttPublisher", _Publisher)
    monkeypatch.setattr(
        sensor_lifecycle, "async_track_time_change", lambda *a, **k: timers.append(k) or (lambda: None)
    )
    sensor = _sensor({"share_energy_data": True})
    removers = []
    sensor.async_on_remove = removers.append

    first = await sensor_lifecycle._async_start_energy_telemetry(sensor)
    salt = saved["data"]["salt"]
    second = await sensor_lifecycle._async_start_energy_telemetry(sensor)

    assert first is not None and second is not None
    assert saved["data"]["salt"] == salt and len(salt) >= 32
    assert timers and timers[0]["minute"] == 7
    assert removers
