from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.boiler.runtime import BoilerRuntime


class DummyState:
    def __init__(self, state, attributes=None, last_updated=None):
        self.state = state
        self.attributes = attributes or {}
        self.last_updated = last_updated
        self.last_changed = last_updated


class DummyStates:
    def __init__(self, data):
        self._data = data

    def get(self, entity_id):
        return self._data.get(entity_id)

    def set(self, entity_id, state):
        self._data[entity_id] = state


class DummyHass:
    def __init__(self, states=None):
        self.states = DummyStates(states or {})
        self.data = {}


class DummyLoop:
    def __init__(self, now=0.0):
        self.now = now

    def time(self):
        return self.now


class DummyBus:
    def __init__(self):
        self.listeners = []

    def async_listen(self, event_type, callback):
        record = SimpleNamespace(
            event_type=event_type,
            callback=callback,
            active=True,
            unsubscribe_calls=0,
        )
        self.listeners.append(record)

        def _unsubscribe():
            record.unsubscribe_calls += 1
            record.active = False

        return _unsubscribe

    def fire_state_changed(self, entity_id, time_fired):
        event = SimpleNamespace(data={"entity_id": entity_id}, time_fired=time_fired)
        for record in list(self.listeners):
            if record.active:
                record.callback(event)


class ActivityHass(DummyHass):
    def __init__(self, states=None):
        super().__init__(states)
        self.loop = DummyLoop()
        self.bus = DummyBus()


class RuntimeReadModel:
    def __init__(self, coordinator):
        self._coordinator = coordinator

    def get_current_profile(self):
        return getattr(self._coordinator, "_current_profile", None)

    def get_current_plan(self):
        return getattr(self._coordinator, "_current_plan", None)

    async def async_ensure_profile(self):
        return self.get_current_profile()


def _make_runtime(hass, config=None, plan=None):
    coordinator = SimpleNamespace(
        config=config or {},
        _oig_manual_mode_entity="sensor.manual_mode",
        _oig_current_cbb_entity="sensor.current_cbb",
        _current_plan=plan,
        _current_profile=None,
    )
    runtime = BoilerRuntime(
        hass=hass,
        read_model=RuntimeReadModel(coordinator),
        planner=SimpleNamespace(),
        actuator=SimpleNamespace(),
        energy_adapter=SimpleNamespace(),
        coordinator=coordinator,
        box_id="123",
        entry_id="entry1",
    )
    return runtime, coordinator


def _set_state(hass, entity_id, value, timestamp, attributes=None):
    hass.states.set(entity_id, DummyState(value, attributes, last_updated=timestamp))


def _add_buffer_entry(runtime, timestamp, source_key, power_kw, top_temp_c=50.0):
    if source_key is None:
        activity_state = "unknown"
    elif source_key == "discharge":
        activity_state = "discharging"
    else:
        activity_state = f"charging_{source_key}"
    runtime._timeline_buffer.append({
        "timestamp": timestamp,
        "top_temp_c": top_temp_c,
        "bottom_temp_c": 42.0,
        "source_key": source_key,
        "power_kw": power_kw,
        "activity_state": activity_state,
    })


def _freeze_runtime_now(monkeypatch, timestamp):
    from custom_components.oig_cloud.boiler import runtime as runtime_module

    monkeypatch.setattr(runtime_module.dt_util, "now", lambda: timestamp)


def test_segments_empty_buffer():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    assert runtime.source_segments == []
    assert runtime.sparklines == {"temperature": [], "power": []}


def test_segments_single_source():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    _add_buffer_entry(runtime, now, "fve", 2.0)
    _add_buffer_entry(runtime, now + timedelta(minutes=10), "fve", 2.0)

    segs = runtime.source_segments
    assert len(segs) == 1
    assert segs[0]["key"] == "fve"
    assert segs[0]["start"] == now
    assert segs[0]["end"] is None
    assert segs[0]["active"] is True
    assert segs[0]["energy_kwh"] == pytest.approx(2.0 * (10 / 60.0))


def test_segments_source_transition():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    t0 = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(minutes=10)
    t2 = t1 + timedelta(minutes=5)

    _add_buffer_entry(runtime, t0, "fve", 2.0)
    _add_buffer_entry(runtime, t1, "fve", 2.0)
    _add_buffer_entry(runtime, t2, "grid", 1.5)

    segs = runtime.source_segments
    assert len(segs) == 2

    assert segs[0]["key"] == "fve"
    assert segs[0]["start"] == t0
    assert segs[0]["end"] == t2
    assert segs[0]["active"] is False
    assert segs[0]["energy_kwh"] == pytest.approx(2.0 * (10 / 60.0) + 2.0 * (5 / 60.0))

    assert segs[1]["key"] == "grid"
    assert segs[1]["start"] == t2
    assert segs[1]["end"] is None
    assert segs[1]["active"] is True


def test_segments_unknown_closes_active():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    t0 = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(minutes=10)
    t2 = t1 + timedelta(minutes=5)

    _add_buffer_entry(runtime, t0, "fve", 2.0)
    _add_buffer_entry(runtime, t1, "fve", 2.0)
    _add_buffer_entry(runtime, t2, None, None)

    segs = runtime.source_segments
    assert len(segs) == 1
    assert segs[0]["key"] == "fve"
    assert segs[0]["end"] == t2
    assert segs[0]["active"] is False


def test_segments_restart_empty():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    assert runtime.source_segments == []
    assert runtime.sparklines == {"temperature": [], "power": []}


def test_segments_circular_buffer_overwrite():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    t0 = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)

    entries = []
    for i in range(62):
        ts = t0 + timedelta(minutes=i)
        entries.append({
            "timestamp": ts,
            "top_temp_c": 50.0,
            "bottom_temp_c": 42.0,
            "source_key": "fve",
            "power_kw": 2.0,
            "activity_state": "charging_fve",
        })

    runtime._timeline_buffer = entries[-60:]

    segs = runtime.source_segments
    assert len(segs) == 1
    assert segs[0]["start"] == t0 + timedelta(minutes=2)
    assert segs[0]["active"] is True


def test_segments_energy_sign_convention_negative_charge():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    t0 = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(minutes=10)

    _add_buffer_entry(runtime, t0, "fve", -1.0)
    _add_buffer_entry(runtime, t1, "fve", 2.0)

    segs = runtime.source_segments
    assert len(segs) == 1
    assert segs[0]["energy_kwh"] == pytest.approx(0.0)
    assert "power_sign_mismatch_charge" in runtime._segment_derivation_flags


def test_segments_energy_sign_convention_positive_charge_three_readings():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    t0 = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(minutes=10)
    t2 = t1 + timedelta(minutes=10)

    _add_buffer_entry(runtime, t0, "fve", 2.0)
    _add_buffer_entry(runtime, t1, "fve", 2.0)
    _add_buffer_entry(runtime, t2, "fve", 3.0)

    segs = runtime.source_segments
    assert len(segs) == 1
    assert segs[0]["energy_kwh"] == pytest.approx(
        2.0 * (10 / 60.0) + 2.0 * (10 / 60.0)
    )
    assert "power_sign_mismatch_charge" not in runtime._segment_derivation_flags


def test_segments_discharge_negative_power():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    t0 = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(minutes=10)

    _add_buffer_entry(runtime, t0, "discharge", -1.5)
    _add_buffer_entry(runtime, t1, "discharge", -2.0)

    segs = runtime.source_segments
    assert len(segs) == 1
    assert segs[0]["energy_kwh"] == pytest.approx(1.5 * (10 / 60.0))
    assert "power_sign_mismatch_discharge" not in runtime._segment_derivation_flags


def test_segments_discharge_negative_power_three_readings():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    t0 = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(minutes=10)
    t2 = t1 + timedelta(minutes=10)

    _add_buffer_entry(runtime, t0, "discharge", -1.5)
    _add_buffer_entry(runtime, t1, "discharge", -2.0)
    _add_buffer_entry(runtime, t2, "discharge", -2.5)

    segs = runtime.source_segments
    assert len(segs) == 1
    assert segs[0]["energy_kwh"] == pytest.approx(
        1.5 * (10 / 60.0) + 2.0 * (10 / 60.0)
    )


def test_segments_discharge_positive_power_mismatch():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    t0 = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(minutes=10)

    _add_buffer_entry(runtime, t0, "discharge", 1.5)
    _add_buffer_entry(runtime, t1, "discharge", -2.0)

    segs = runtime.source_segments
    assert len(segs) == 1
    assert segs[0]["energy_kwh"] == pytest.approx(0.0)
    assert "power_sign_mismatch_discharge" in runtime._segment_derivation_flags


def test_segments_missing_power_contributes_zero():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    t0 = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(minutes=10)

    _add_buffer_entry(runtime, t0, "fve", None)
    _add_buffer_entry(runtime, t1, "fve", 2.0)

    segs = runtime.source_segments
    assert segs[0]["energy_kwh"] == pytest.approx(0.0)


def test_segments_fill_percentage_math():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)

    for i in range(10):
        ts = now + timedelta(minutes=i * 10)
        _add_buffer_entry(runtime, ts, "fve", 2.0)

    for i in range(5):
        ts = now + timedelta(minutes=100 + i * 10)
        _add_buffer_entry(runtime, ts, "grid", 1.0)

    for i in range(2):
        ts = now + timedelta(minutes=150 + i * 10)
        _add_buffer_entry(runtime, ts, "discharge", -0.5)

    runtime._current_activity = SimpleNamespace(fill_level_pct=0.72)

    segs = runtime.source_segments
    assert len(segs) == 3

    fve_seg = next(s for s in segs if s["key"] == "fve")
    grid_seg = next(s for s in segs if s["key"] == "grid")
    discharge_seg = next(s for s in segs if s["key"] == "discharge")

    assert discharge_seg["fill_pct"] == 0.0

    total_non_discharge = fve_seg["fill_pct"] + grid_seg["fill_pct"]
    assert total_non_discharge == pytest.approx(0.72, abs=0.001)


def test_segments_all_discharge_fill_zero():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)

    for i in range(5):
        ts = now + timedelta(minutes=i * 10)
        _add_buffer_entry(runtime, ts, "discharge", -1.0)

    runtime._current_activity = SimpleNamespace(fill_level_pct=0.5)

    segs = runtime.source_segments
    assert len(segs) == 1
    assert segs[0]["fill_pct"] == 0.0


def test_segments_fill_correction_clamps_and_converges():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)

    for i in range(3):
        ts = now + timedelta(minutes=i * 10)
        _add_buffer_entry(runtime, ts, "fve", 1.0)

    runtime._current_activity = SimpleNamespace(fill_level_pct=0.72)

    segs = runtime.source_segments
    assert len(segs) == 1
    assert segs[0]["fill_pct"] == pytest.approx(0.72, abs=0.001)


def test_segments_max_three_correction_iterations():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)

    runtime._timeline_buffer = [
        {
            "timestamp": datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc),
            "top_temp_c": 50.0,
            "bottom_temp_c": 42.0,
            "source_key": "fve",
            "power_kw": 1.0,
            "activity_state": "charging_fve",
        },
        {
            "timestamp": datetime(2026, 5, 4, 12, 10, tzinfo=timezone.utc),
            "top_temp_c": 51.0,
            "bottom_temp_c": 42.0,
            "source_key": "grid",
            "power_kw": 1.0,
            "activity_state": "charging_grid",
        },
    ]

    runtime._current_activity = SimpleNamespace(fill_level_pct=0.72)

    segs = runtime.source_segments
    non_discharge = [s for s in segs if s["key"] != "discharge"]
    total = sum(s["fill_pct"] for s in non_discharge)
    assert total == pytest.approx(0.72, abs=0.001)


def test_segments_stale_flags_cleared_on_rebuild():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    t0 = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(minutes=10)

    _add_buffer_entry(runtime, t0, "fve", -1.0)
    _ = runtime.source_segments
    assert "power_sign_mismatch_charge" in runtime._segment_derivation_flags

    runtime._timeline_buffer = []
    _ = runtime.source_segments
    assert "power_sign_mismatch_charge" not in runtime._segment_derivation_flags


def test_segments_mismatch_flag_in_current_activity_stale_flags(monkeypatch):
    from custom_components.oig_cloud.boiler import runtime as runtime_module
    from custom_components.oig_cloud.boiler.classifier import BoilerActivityClassifier

    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    _freeze_runtime_now(monkeypatch, now)
    hass = ActivityHass()
    config = {
        "boiler_temp_sensor_top": "sensor.top",
        "boiler_heater_switch_entity": "switch.main",
    }
    runtime, _coordinator = _make_runtime(hass, config=config)

    _set_state(hass, "sensor.top", "50", now)
    _set_state(hass, "switch.main", "on", now)
    _set_state(hass, "sensor.manual_mode", "Vypnuto", now)
    _set_state(hass, "sensor.current_cbb", "0", now)

    hass.bus.fire_state_changed("sensor.top", now)

    assert runtime.current_activity is not None
    assert runtime.current_activity.stale_flags == []

    t0 = now
    t1 = t0 + timedelta(minutes=10)
    _add_buffer_entry(runtime, t0, "fve", -1.0)
    _add_buffer_entry(runtime, t1, "fve", 2.0)

    _ = runtime.source_segments

    activity = runtime.current_activity
    assert activity is not None
    assert "power_sign_mismatch_charge" in activity.stale_flags


def test_segments_multiple_transitions():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    t0 = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)

    sources = ["fve", "fve", "grid", "grid", "discharge", "discharge", "fve"]
    for i, src in enumerate(sources):
        ts = t0 + timedelta(minutes=i * 10)
        power = 2.0 if src != "discharge" else -1.5
        _add_buffer_entry(runtime, ts, src, power)

    segs = runtime.source_segments
    assert len(segs) == 4
    assert [s["key"] for s in segs] == ["fve", "grid", "discharge", "fve"]


def test_sparklines_max_twenty_points():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)

    for i in range(25):
        ts = now + timedelta(minutes=i)
        _add_buffer_entry(runtime, ts, "fve", float(i), top_temp_c=50.0 + i)

    spark = runtime.sparklines
    assert len(spark["temperature"]) == 20
    assert len(spark["power"]) == 20
    assert spark["temperature"][0] == 55.0
    assert spark["temperature"][-1] == 74.0
    assert spark["power"][0] == 5.0
    assert spark["power"][-1] == 24.0


def test_sparklines_filters_none_values():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)

    for i in range(10):
        ts = now + timedelta(minutes=i)
        top = 50.0 + i if i % 2 == 0 else None
        power = float(i) if i % 3 == 0 else None
        _add_buffer_entry(runtime, ts, "fve", power, top_temp_c=top)

    spark = runtime.sparklines
    assert len(spark["temperature"]) == 5
    assert len(spark["power"]) == 4


def test_segments_no_infinite_loop():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)

    for i in range(3):
        ts = now + timedelta(minutes=i * 10)
        _add_buffer_entry(runtime, ts, "fve", 1.0)

    runtime._current_activity = SimpleNamespace(fill_level_pct=0.72)

    segs = runtime.source_segments
    assert len(segs) == 1
    assert segs[0]["fill_pct"] == pytest.approx(0.72, abs=0.001)


def test_segments_zero_energy_splits_equally():
    hass = ActivityHass()
    runtime, _ = _make_runtime(hass)
    now = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)

    for i in range(3):
        ts = now + timedelta(minutes=i * 10)
        _add_buffer_entry(runtime, ts, "fve", 0.0)

    for i in range(3):
        ts = now + timedelta(minutes=30 + i * 10)
        _add_buffer_entry(runtime, ts, "grid", 0.0)

    runtime._current_activity = SimpleNamespace(fill_level_pct=0.72)

    segs = runtime.source_segments
    fve_seg = next(s for s in segs if s["key"] == "fve")
    grid_seg = next(s for s in segs if s["key"] == "grid")

    assert fve_seg["fill_pct"] == pytest.approx(0.36, abs=0.001)
    assert grid_seg["fill_pct"] == pytest.approx(0.36, abs=0.001)
