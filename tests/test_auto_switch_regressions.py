"""Regression coverage for the noon scheduler/guard disagreement."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.battery_forecast.planning import auto_switch
from custom_components.oig_cloud.const import CONF_AUTO_MODE_SWITCH


@pytest.fixture
def switch_runtime(monkeypatch):
    """Run the real switching functions with a controllable clock and timers."""
    now = datetime(2026, 9, 13, 12, 0, tzinfo=timezone.utc)
    clock = SimpleNamespace(now=now)
    state = SimpleNamespace(state="HOME I", last_changed=now - timedelta(minutes=25))
    calls, timers, retries, tasks = [], [], [], []

    async def call(domain, service, data, blocking=False):
        calls.append((clock.now, domain, service, data, blocking))

    def track(_hass, callback, when):
        timers.append((when, callback))
        return lambda: None

    def later(_hass, delay, callback):
        retries.append((delay, callback))
        return lambda: None

    sensor = SimpleNamespace(
        _hass=SimpleNamespace(
            states=SimpleNamespace(get=lambda _entity: state),
            services=SimpleNamespace(async_call=call),
            data={},
        ),
        _config_entry=SimpleNamespace(
            options={CONF_AUTO_MODE_SWITCH: True}, data={}, entry_id="entry"
        ),
        _box_id="123",
        _side_effects_enabled=True,
        _last_auto_switch_request=None,
        _auto_switch_handles=[],
        _auto_switch_retry_unsub=None,
        _auto_switch_watchdog_unsub=None,
        _auto_switch_watchdog_interval=timedelta(seconds=30),
        _auto_switch_ready_at=None,
        _create_task_threadsafe=lambda fn, *args: tasks.append((fn, args)),
        _timeline_data=[
            {"time": now.isoformat(), "mode_name": "HOME UPS"},
            {"time": (now + timedelta(minutes=30)).isoformat(), "mode_name": "HOME I"},
        ],
    )
    monkeypatch.setattr(auto_switch.dt_util, "now", lambda: clock.now)
    monkeypatch.setattr(auto_switch, "async_track_point_in_time", track)
    monkeypatch.setattr(auto_switch, "async_call_later", later)
    monkeypatch.setattr(auto_switch, "_async_track_time_interval", lambda *_args: lambda: None)
    return SimpleNamespace(
        sensor=sensor, clock=clock, state=state, calls=calls,
        timers=timers, retries=retries, tasks=tasks,
    )


def test_future_guarded_transition_does_not_replace_current_block(switch_runtime):
    runtime = switch_runtime
    now = runtime.clock.now
    timeline = [
        {"time": now.isoformat(), "mode_name": "Home 1"},
        {"time": (now + timedelta(minutes=2)).isoformat(), "mode_name": "Home UPS"},
        {"time": (now + timedelta(minutes=32)).isoformat(), "mode_name": "Home 1"},
    ]
    current, events = auto_switch._build_schedule_events(
        runtime.sensor, timeline=timeline, now=now,
        last_mode_change=runtime.state.last_changed,
    )
    assert current == "Home 1"
    assert [(when, mode) for when, mode, _ in events] == [
        (now + timedelta(minutes=2), "Home UPS"),
        (now + timedelta(minutes=32), "Home 1"),
    ]


def test_first_upcoming_transition_is_not_dropped_without_state_time(switch_runtime):
    runtime = switch_runtime
    now = runtime.clock.now
    current, events = auto_switch._build_schedule_events(
        runtime.sensor, now=now, last_mode_change=None,
        timeline=[
            {"time": now.isoformat(), "mode_name": "Home 1"},
            {"time": (now + timedelta(minutes=15)).isoformat(), "mode_name": "Home UPS"},
        ],
    )
    assert current == "Home 1"
    assert events == [(now + timedelta(minutes=15), "Home UPS", "Home 1")]


@pytest.mark.asyncio
@pytest.mark.parametrize("source", ["scheduled", "watchdog", "refresh"])
async def test_all_automatic_paths_defer_then_retry_valid_window(switch_runtime, source):
    runtime = switch_runtime
    sensor, now = runtime.sensor, runtime.clock.now
    if source == "scheduled":
        auto_switch._schedule_auto_switch_events(sensor, [(now, "Home UPS", "Home 1")], now)
        await runtime.timers[-1][1](now)
    elif source == "watchdog":
        await auto_switch.auto_switch_watchdog_tick(sensor, now)
    else:
        await auto_switch.update_auto_switch_schedule(sensor)

    assert runtime.calls == []
    assert len(runtime.retries) == 1
    delay, retry = runtime.retries[0]
    assert delay == 300

    runtime.clock.now += timedelta(seconds=delay)
    retry(runtime.clock.now)
    for function, args in runtime.tasks:
        await function(*args)
    assert [(call[0], call[3]["mode"]) for call in runtime.calls] == [
        (now + timedelta(minutes=5), "Home UPS")
    ]


@pytest.mark.asyncio
async def test_scheduled_exit_holds_ups_30_minutes_from_confirmation(switch_runtime):
    runtime = switch_runtime
    confirmed = runtime.clock.now - timedelta(minutes=14)
    runtime.state.state = "HOME UPS"
    runtime.state.last_changed = confirmed
    runtime.sensor._timeline_data = [
        {"time": runtime.clock.now.isoformat(), "mode_name": "Home 1"},
        {"time": (runtime.clock.now + timedelta(minutes=15)).isoformat(), "mode_name": "Home 1"},
    ]
    auto_switch._schedule_auto_switch_events(
        runtime.sensor, [(runtime.clock.now, "Home 1", "Home UPS")], runtime.clock.now
    )
    await runtime.timers[-1][1](runtime.clock.now)
    assert runtime.calls == []
    delay, retry = runtime.retries[0]
    assert delay == 16 * 60
    runtime.clock.now = confirmed + timedelta(minutes=30)
    retry(runtime.clock.now)
    for function, args in runtime.tasks:
        await function(*args)
    assert runtime.calls[0][3]["mode"] == "Home 1"
    assert runtime.calls[0][0] - confirmed == timedelta(minutes=30)


@pytest.mark.asyncio
@pytest.mark.parametrize("change", ["disabled", "empty", "replanned", "expired"])
async def test_scheduled_callback_revalidates_latest_plan(switch_runtime, change):
    runtime = switch_runtime
    now, sensor = runtime.clock.now, runtime.sensor
    runtime.state.last_changed = now - timedelta(hours=1)
    auto_switch._schedule_auto_switch_events(sensor, [(now, "Home UPS", "Home 1")], now)
    if change == "disabled":
        sensor._config_entry.options[CONF_AUTO_MODE_SWITCH] = False
    elif change == "empty":
        sensor._timeline_data = []
    elif change == "replanned":
        sensor._timeline_data[0]["mode_name"] = "Home 1"
    else:
        runtime.clock.now += timedelta(minutes=30)
    await runtime.timers[-1][1](now)
    assert runtime.calls == []


@pytest.mark.asyncio
async def test_guard_retry_does_not_replay_expired_charge_window(switch_runtime):
    runtime = switch_runtime
    now = runtime.clock.now
    runtime.sensor._timeline_data[1]["time"] = (now + timedelta(minutes=3)).isoformat()
    await auto_switch.ensure_current_mode(runtime.sensor, "Home UPS", "test")
    assert runtime.calls == []
    delay, retry = runtime.retries[0]
    runtime.clock.now += timedelta(seconds=delay)
    retry(runtime.clock.now)
    for function, args in runtime.tasks:
        await function(*args)
    assert runtime.calls == []


@pytest.mark.asyncio
async def test_repeated_watchdog_ticks_keep_one_retry(switch_runtime):
    runtime = switch_runtime
    await auto_switch.auto_switch_watchdog_tick(runtime.sensor, runtime.clock.now)
    runtime.clock.now += timedelta(seconds=30)
    await auto_switch.auto_switch_watchdog_tick(runtime.sensor, runtime.clock.now)
    assert runtime.calls == []
    assert len(runtime.retries) == 1


@pytest.mark.asyncio
async def test_retry_honors_intervening_manual_change(switch_runtime):
    runtime = switch_runtime
    await auto_switch.update_auto_switch_schedule(runtime.sensor)
    _, retry = runtime.retries[0]
    runtime.clock.now += timedelta(minutes=2)
    runtime.state.state = "HOME II"
    runtime.state.last_changed = runtime.clock.now
    runtime.clock.now += timedelta(minutes=3)
    retry(runtime.clock.now)
    for function, args in runtime.tasks:
        await function(*args)
    assert runtime.calls == []
    assert runtime.retries[-1][0] == 27 * 60


@pytest.mark.asyncio
async def test_disabled_retry_does_not_issue_mode_command(switch_runtime):
    runtime = switch_runtime
    await auto_switch.update_auto_switch_schedule(runtime.sensor)
    delay, retry = runtime.retries[0]
    runtime.sensor._config_entry.options[CONF_AUTO_MODE_SWITCH] = False
    runtime.clock.now += timedelta(seconds=delay)
    retry(runtime.clock.now)
    for function, args in runtime.tasks:
        await function(*args)
    assert runtime.calls == []
    assert runtime.sensor._auto_switch_handles == []
    assert runtime.sensor._auto_switch_retry_unsub is None


@pytest.mark.asyncio
@pytest.mark.parametrize("source", ["scheduled", "watchdog", "refresh", "retry"])
async def test_final_charge_slot_expires_without_following_mode(switch_runtime, source):
    runtime = switch_runtime
    sensor, start = runtime.sensor, runtime.clock.now
    sensor._timeline_data = [{"time": start.isoformat(), "mode_name": "HOME UPS"}]
    runtime.state.last_changed = start - timedelta(minutes=10)
    if source == "retry":
        await auto_switch.update_auto_switch_schedule(sensor)
        assert runtime.calls == []
        delay, retry = runtime.retries[0]
        assert delay == 20 * 60
        runtime.clock.now += timedelta(seconds=delay)
        retry(runtime.clock.now)
        for function, args in runtime.tasks:
            await function(*args)
    else:
        # Exact end is already outside the final 15-minute forecast interval.
        runtime.clock.now += timedelta(minutes=15)
        runtime.state.last_changed = start - timedelta(hours=1)
        if source == "scheduled":
            auto_switch._schedule_auto_switch_events(sensor, [(start, "Home UPS", "Home 1")], start)
            await runtime.timers[-1][1](start)
        elif source == "watchdog":
            await auto_switch.auto_switch_watchdog_tick(sensor, runtime.clock.now)
        else:
            await auto_switch.update_auto_switch_schedule(sensor)
    assert runtime.calls == []
    assert sensor._auto_switch_retry_unsub is None
