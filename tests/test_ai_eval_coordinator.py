"""Tests for the hourly AI evaluation coordinator.

Mirrors tests/test_ai_task_wiring.py style: fake hass, fake recorder,
monkeypatched AI client and notification.
"""
from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

import pytest

# ai_client -> ai_task imports homeassistant.components.ai_task, absent on the
# dev harness; install the same shim test_ai_task_wiring uses so this module is
# collectable regardless of test order.
from tests.test_ai_task_wiring import _install_shim  # noqa: E402

_install_shim()


# Import the REAL ai_client + notify modules so they populate sys.modules; the
# per-test monkeypatch.setattr then stubs their functions and auto-restores.
# (Do NOT shim fake modules into sys.modules — a leaked fake breaks the real
# ai_client/notify test files that collect after this one.)
from custom_components.oig_cloud.ai_eval import ai_client  # noqa: E402,F401
from custom_components.oig_cloud.ai_eval import notify  # noqa: E402,F401


class FakeState:
    def __init__(self, state: str, last_updated: datetime):
        self.state = state
        self.last_updated = last_updated


class FakeRecorderInstance:
    def __init__(self, states_by_entity: Dict[str, List[FakeState]]):
        self._states_by_entity = states_by_entity

    async def async_add_executor_job(self, func, hass, start_time, end_time, entity_ids, *args):
        result = {}
        for entity_id in entity_ids:
            states = self._states_by_entity.get(entity_id, [])
            filtered = [
                s for s in states
                if start_time <= s.last_updated <= end_time
            ]
            if filtered:
                result[entity_id] = filtered
        return result


class FakeStore:
    def __init__(self):
        self.saved: Dict[str, Any] = {}

    async def async_load(self):
        return self.saved

    async def async_save(self, data):
        self.saved = data


class FakeConfigEntry:
    def __init__(self, entry_id="test_entry", box_id="1234567890"):
        self.entry_id = entry_id
        self.options = {"box_id": box_id}
        self.data = {}


class FakeHass:
    def __init__(self):
        self.data = {}
        self.loop = asyncio.get_event_loop() if hasattr(asyncio, "get_event_loop") else None
        self._dispatcher_signals: List[str] = []

    def async_create_task(self, coro):
        import asyncio
        return asyncio.create_task(coro)

    def verify_event_loop_thread(self, what):
        pass


def _make_states(box_id: str, now: datetime) -> Dict[str, List[FakeState]]:
    base = now - timedelta(minutes=60)
    states = {}
    entity_map = {
        f"sensor.oig_{box_id}_actual_aci_wtotal": [("500", 0), ("500", 20), ("2500", 40)],  # grid_skok = notable
        f"sensor.oig_{box_id}_actual_aco_p": [("300", 0), ("350", 20), ("400", 40)],
        f"sensor.oig_{box_id}_actual_acinb_wtotal": [("200", 0), ("250", 20), ("300", 40)],
        f"sensor.oig_{box_id}_dc_in_fv_total": [("1000", 0), ("1200", 20), ("1400", 40)],
        f"sensor.oig_{box_id}_batt_batt_comp_p": [("-500", 0), ("-600", 20), ("-700", 40)],
        f"sensor.oig_{box_id}_batt_bat_c": [("60", 0), ("58", 20), ("55", 40)],
        f"sensor.oig_{box_id}_box_prms_mode": [("HOME_III", 0), ("HOME_III", 20), ("HOME_III", 40)],
    }
    for entity_id, values in entity_map.items():
        entity_states = []
        for val_str, offset_s in values:
            ts = base + timedelta(seconds=offset_s)
            entity_states.append(FakeState(val_str, ts))
        states[entity_id] = entity_states
    return states


@pytest.mark.asyncio
async def test_flow_produces_store_with_frozen_keys(monkeypatch):
    from custom_components.oig_cloud.ai_eval import coordinator

    box_id = "1234567890"
    now = datetime(2026, 8, 1, 14, 0, 0, tzinfo=timezone.utc)
    states = _make_states(box_id, now)

    fake_store = FakeStore()
    fake_entry = FakeConfigEntry(box_id=box_id)
    fake_hass = FakeHass()

    monkeypatch.setattr(coordinator, "Store", lambda hass, version, key: fake_store)

    async def fake_fetch_history(hass, entity_ids, start_time, end_time):
        return states

    monkeypatch.setattr(coordinator, "_fetch_history", fake_fetch_history)

    async def fake_generate_eval_report(hass, entry, system_prompt, user_message):
        return "FAKTA:\n- nic mimořádného\n\nLIDSKY:\n- vše v pořádku"

    ai_client_mod = sys.modules["custom_components.oig_cloud.ai_eval.ai_client"]
    monkeypatch.setattr(ai_client_mod, "generate_eval_report", fake_generate_eval_report)

    async def fake_publish_notification(hass, entry, report, notable):
        pass

    notify_mod = sys.modules["custom_components.oig_cloud.ai_eval.notify"]
    monkeypatch.setattr(notify_mod, "publish_eval_notification", fake_publish_notification)

    async def fake_fetch_precomputed(hass, box_id):
        return {"timeline": [], "cost_tile": {"today": {"plan_total_cost": 50.0}}}

    monkeypatch.setattr(coordinator, "_fetch_precomputed", fake_fetch_precomputed)

    coord = coordinator.AiEvalCoordinator(fake_hass, fake_entry)
    coord._store = fake_store

    await coord._async_run_tick(now)

    assert "report_fakta" in fake_store.saved
    assert "report_lidsky" in fake_store.saved
    assert "ledger" in fake_store.saved
    assert "last_run" in fake_store.saved
    assert "anomaly_count" in fake_store.saved
    assert isinstance(fake_store.saved["anomaly_count"], int)


@pytest.mark.asyncio
async def test_fakta_lidsky_split_correct(monkeypatch):
    from custom_components.oig_cloud.ai_eval import coordinator

    markdown = """FAKTA:
- 14:00 skok sítě +200W
- 14:05 nabíjení baterie

LIDSKY:
- Systém běžel stabilně.
- Baterie se dobíjela ze sítě."""

    fakta, lidsky = coordinator._split_fakta_lidsky(markdown)
    assert "skok sítě" in fakta
    assert "nabíjení baterie" in fakta
    assert "Systém běžel" in lidsky
    assert "Baterie se dobíjela" in lidsky


@pytest.mark.asyncio
async def test_generate_eval_report_none_records_a_failed_attempt(monkeypatch):
    from custom_components.oig_cloud.ai_eval import coordinator

    box_id = "1234567890"
    now = datetime(2026, 8, 1, 14, 0, 0, tzinfo=timezone.utc)
    states = _make_states(box_id, now)

    fake_store = FakeStore()
    fake_entry = FakeConfigEntry(box_id=box_id)
    fake_hass = FakeHass()

    monkeypatch.setattr(coordinator, "Store", lambda hass, version, key: fake_store)

    async def fake_fetch_history(hass, entity_ids, start_time, end_time):
        return states

    monkeypatch.setattr(coordinator, "_fetch_history", fake_fetch_history)

    async def fake_generate_eval_report(hass, entry, system_prompt, user_message):
        return None

    ai_client_mod = sys.modules["custom_components.oig_cloud.ai_eval.ai_client"]
    monkeypatch.setattr(ai_client_mod, "generate_eval_report", fake_generate_eval_report)

    publish_called = []

    async def fake_publish_notification(hass, entry, report, notable):
        publish_called.append(True)

    notify_mod = sys.modules["custom_components.oig_cloud.ai_eval.notify"]
    monkeypatch.setattr(notify_mod, "publish_eval_notification", fake_publish_notification)

    async def fake_fetch_precomputed(hass, box_id):
        return {"timeline": [], "cost_tile": {"today": {"plan_total_cost": 50.0}}}

    monkeypatch.setattr(coordinator, "_fetch_precomputed", fake_fetch_precomputed)

    coord = coordinator.AiEvalCoordinator(fake_hass, fake_entry)
    coord._store = fake_store

    await coord._async_run_tick(now)

    # A provider that answers nothing must NOT look like a quiet hour: the
    # deterministic ledger is kept, the attempt is timestamped, and the status
    # says why. (It used to write nothing at all, so an AI that had stopped
    # answering was invisible — the owner's install ran that way unnoticed.)
    assert fake_store.saved, "a failed AI call must still record the attempt"
    assert fake_store.saved["status"] == "ai_unavailable"
    assert fake_store.saved["last_run"] == now.isoformat()
    assert fake_store.saved["ledger"]
    # …but it must not invent a report, and it must not notify the owner.
    assert fake_store.saved["report_fakta"] == ""
    assert fake_store.saved["report_lidsky"] == ""
    assert publish_called == []


@pytest.mark.asyncio
async def test_notable_anomaly_calls_publish_with_notable_true(monkeypatch):
    from custom_components.oig_cloud.ai_eval import coordinator

    box_id = "1234567890"
    now = datetime(2026, 8, 1, 14, 0, 0, tzinfo=timezone.utc)

    base = now - timedelta(minutes=60)
    states = {}

    grid_states = [
        FakeState("500", base),
        FakeState("2500", base + timedelta(seconds=40)),
    ]
    states[f"sensor.oig_{box_id}_actual_aci_wtotal"] = grid_states

    soc_states = [
        FakeState("60", base),
        FakeState("58", base + timedelta(seconds=40)),
    ]
    states[f"sensor.oig_{box_id}_batt_bat_c"] = soc_states

    for key in ["actual_aco_p", "actual_acinb_wtotal", "dc_in_fv_total", "batt_batt_comp_p", "box_prms_mode"]:
        states[f"sensor.oig_{box_id}_{key}"] = [FakeState("100", base)]

    fake_store = FakeStore()
    fake_entry = FakeConfigEntry(box_id=box_id)
    fake_hass = FakeHass()

    monkeypatch.setattr(coordinator, "Store", lambda hass, version, key: fake_store)

    async def fake_fetch_history(hass, entity_ids, start_time, end_time):
        return states

    monkeypatch.setattr(coordinator, "_fetch_history", fake_fetch_history)

    async def fake_generate_eval_report(hass, entry, system_prompt, user_message):
        return "FAKTA:\n- skok sítě\n\nLIDSKY:\n- pozor"

    ai_client_mod = sys.modules["custom_components.oig_cloud.ai_eval.ai_client"]
    monkeypatch.setattr(ai_client_mod, "generate_eval_report", fake_generate_eval_report)

    publish_calls = []

    async def fake_publish_notification(hass, entry, report, notable):
        publish_calls.append(notable)

    notify_mod = sys.modules["custom_components.oig_cloud.ai_eval.notify"]
    monkeypatch.setattr(notify_mod, "publish_eval_notification", fake_publish_notification)

    async def fake_fetch_precomputed(hass, box_id):
        return {"timeline": [], "cost_tile": {"today": {"plan_total_cost": 50.0}}}

    monkeypatch.setattr(coordinator, "_fetch_precomputed", fake_fetch_precomputed)

    coord = coordinator.AiEvalCoordinator(fake_hass, fake_entry)
    coord._store = fake_store

    await coord._async_run_tick(now)

    assert True in publish_calls


@pytest.mark.asyncio
async def test_quiet_hour_writes_ok_status_without_calling_ai(monkeypatch):
    """No notable event -> green status, NO AI call, NO notification (value gate)."""
    from custom_components.oig_cloud.ai_eval import coordinator

    box_id = "1234567890"
    now = datetime(2026, 8, 1, 14, 0, 0, tzinfo=timezone.utc)
    base = now - timedelta(minutes=60)
    # Gentle data — no grid spike, no phase limit, no bypass, no recovery charge.
    states = {}
    for key, v in [("actual_aci_wtotal", "500"), ("actual_aco_p", "300"),
                   ("actual_acinb_wtotal", "200"), ("dc_in_fv_total", "1000"),
                   ("batt_batt_comp_p", "-400"), ("batt_bat_c", "60"),
                   ("box_prms_mode", "HOME_III")]:
        states[f"sensor.oig_{box_id}_{key}"] = [FakeState(v, base), FakeState(v, base + timedelta(seconds=40))]

    fake_store = FakeStore()
    fake_hass = FakeHass()
    monkeypatch.setattr(coordinator, "Store", lambda hass, version, key: fake_store)

    async def fake_fetch_history(hass, entity_ids, start_time, end_time):
        return states
    monkeypatch.setattr(coordinator, "_fetch_history", fake_fetch_history)

    ai_calls = []

    async def fake_ai(hass, entry, system_prompt, user_message):
        ai_calls.append(True)
        return "FAKTA:\n- x\n\nLIDSKY:\n- y"
    monkeypatch.setattr(sys.modules["custom_components.oig_cloud.ai_eval.ai_client"],
                        "generate_eval_report", fake_ai)

    publishes = []

    async def fake_publish(hass, entry, report, notable):
        publishes.append(notable)
    monkeypatch.setattr(sys.modules["custom_components.oig_cloud.ai_eval.notify"],
                        "publish_eval_notification", fake_publish)

    coord = coordinator.AiEvalCoordinator(fake_hass, FakeConfigEntry(box_id=box_id))
    coord._store = fake_store
    await coord._async_run_tick(now)

    assert ai_calls == []            # value gate: no AI call on a quiet hour
    assert publishes == []           # no notification
    assert fake_store.saved.get("status") == "ok"
    assert fake_store.saved.get("anomaly_count") == 0
    assert fake_store.saved.get("report_lidsky") == ""


@pytest.mark.asyncio
async def test_shutdown_cancels_initial_tick_and_blocks_post_shutdown_work(monkeypatch):
    """Unload owns delayed work and prevents any later evaluation tick."""
    from custom_components.oig_cloud.ai_eval import coordinator

    fake_hass = FakeHass()
    fake_store = FakeStore()
    monkeypatch.setattr(coordinator, "Store", lambda *_a, **_k: fake_store)
    coord = coordinator.AiEvalCoordinator(fake_hass, FakeConfigEntry())
    coord._store = fake_store

    started = asyncio.Event()
    release = asyncio.Event()

    async def controlled_sleep(_seconds):
        started.set()
        await release.wait()

    ticks = []

    async def record_tick(_now):
        ticks.append(True)

    monkeypatch.setattr(asyncio, "sleep", controlled_sleep)
    monkeypatch.setattr(coord, "_async_run_tick", record_tick)
    monkeypatch.setattr(coordinator, "async_track_point_in_time", lambda *_a: lambda: None)

    await coord.async_setup()
    await started.wait()
    await coord.async_shutdown()
    release.set()
    await asyncio.get_running_loop().run_in_executor(None, lambda: None)

    assert ticks == []
    assert coord._initial_task is None


@pytest.mark.asyncio
async def test_shutdown_guard_rejects_already_dispatched_tick(monkeypatch):
    """A callback that was dispatched before unload cannot cross the boundary."""
    from custom_components.oig_cloud.ai_eval import coordinator

    fake_store = FakeStore()
    monkeypatch.setattr(coordinator, "Store", lambda *_a, **_k: fake_store)
    coord = coordinator.AiEvalCoordinator(FakeHass(), FakeConfigEntry())
    ticks = []

    async def record_tick(_now):
        ticks.append(True)

    monkeypatch.setattr(coord, "_async_run_tick", record_tick)
    await coord.async_shutdown()
    await coord._async_on_tick(datetime.now(timezone.utc))

    assert ticks == []


@pytest.mark.asyncio
async def test_shutdown_cancels_inflight_hourly_tick(monkeypatch):
    """Unload waits until an already-started evaluation is cancelled."""
    from custom_components.oig_cloud.ai_eval import coordinator

    fake_store = FakeStore()
    monkeypatch.setattr(coordinator, "Store", lambda *_a, **_k: fake_store)
    coord = coordinator.AiEvalCoordinator(FakeHass(), FakeConfigEntry())
    started = asyncio.Event()
    cancelled = asyncio.Event()

    async def blocked_tick(_now):
        started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            raise

    monkeypatch.setattr(coord, "_async_run_tick", blocked_tick)
    tick_task = asyncio.create_task(coord._async_on_tick(datetime.now(timezone.utc)))
    await started.wait()

    await coord.async_shutdown()

    assert cancelled.is_set()
    assert tick_task.done()
    assert coord._tick_tasks == set()


# --------------------------------------------------------------------------- advisor

ADVICE_JSON = (
    '{"situace": "Baterie 60 %, zítra FVE 14 kWh.", "rizika": [], '
    '"doporuceni": [{"kdy": "zítra 11:00–14:00", "akce": "Ohřej bojler ze slunce", '
    '"duvod": "FVE 7 kWh, nákup 0,8 Kč", "prinos_kc": 40, "priorita": "vysoka"}], '
    '"anomalie": []}'
)


def _quiet_states(box_id: str, now: datetime) -> Dict[str, List[FakeState]]:
    base = now - timedelta(minutes=60)
    states = {}
    for key, v in [("actual_aci_wtotal", "500"), ("actual_aco_p", "300"),
                   ("actual_acinb_wtotal", "200"), ("dc_in_fv_total", "1000"),
                   ("batt_batt_comp_p", "-400"), ("batt_bat_c", "60"),
                   ("box_prms_mode", "HOME_III")]:
        states[f"sensor.oig_{box_id}_{key}"] = [FakeState(v, base),
                                                FakeState(v, base + timedelta(seconds=40))]
    return states


def _future_timeline(now: datetime) -> List[Dict[str, Any]]:
    from homeassistant.util import dt as dt_util

    local = dt_util.as_local(now).replace(tzinfo=None, minute=0, second=0, microsecond=0)
    return [
        {"time": (local + timedelta(minutes=15 * i)).strftime("%Y-%m-%dT%H:%M:%S"),
         "mode_name": "HOME I", "spot_price": 9.0, "battery_soc": 9.0,
         "solar_kwh": 0.1, "load_kwh": 0.2}
        for i in range(16)
    ]


def _wire(monkeypatch, coordinator, states, timeline, ai_answer, ai_calls, publishes, store):
    monkeypatch.setattr(coordinator, "Store", lambda hass, version, key: store)

    async def fake_fetch_history(hass, entity_ids, start_time, end_time):
        return states
    monkeypatch.setattr(coordinator, "_fetch_history", fake_fetch_history)

    async def fake_fetch_precomputed(hass, box_id):
        return {"timeline": timeline, "cost_tile": {}}
    monkeypatch.setattr(coordinator, "_fetch_precomputed", fake_fetch_precomputed)

    async def fake_ai(hass, entry, system_prompt, user_message):
        ai_calls.append((system_prompt, user_message))
        return ai_answer
    monkeypatch.setattr(sys.modules["custom_components.oig_cloud.ai_eval.ai_client"],
                        "generate_eval_report", fake_ai)

    async def fake_publish(hass, entry, report, notable):
        publishes.append(report)
    monkeypatch.setattr(sys.modules["custom_components.oig_cloud.ai_eval.notify"],
                        "publish_eval_notification", fake_publish)


@pytest.mark.asyncio
async def test_first_quiet_tick_with_a_plan_runs_the_advisor(monkeypatch):
    from custom_components.oig_cloud.ai_eval import coordinator, payload

    box_id = "1234567890"
    now = datetime(2026, 11, 5, 15, 0, 0, tzinfo=timezone.utc)
    store, ai_calls, publishes = FakeStore(), [], []
    _wire(monkeypatch, coordinator, _quiet_states(box_id, now), _future_timeline(now),
          ADVICE_JSON, ai_calls, publishes, store)

    coord = coordinator.AiEvalCoordinator(FakeHass(), FakeConfigEntry(box_id=box_id))
    coord._store = store
    await coord._async_run_tick(now)

    assert len(ai_calls) == 1
    system_prompt, user_message = ai_calls[0]
    assert system_prompt == payload.ADVISOR_SYSTEM_PROMPT
    assert user_message.startswith("SNAPSHOT:")
    assert "ANOMALIE (právě teď)" not in user_message
    assert "1234567890" not in user_message

    saved = store.saved
    assert saved["report"]["doporuceni"][0]["kdy"] == "zítra 11:00–14:00"
    assert saved["report_kind"] == "advice"
    assert saved["report_generated_at"] == now.isoformat()
    assert saved["advice_fingerprint"]
    assert "Baterie 60 %" in saved["report_lidsky"]
    assert saved["status"] == "attention"          # high-priority recommendation
    assert publishes and "Ohřej bojler" in publishes[0]


@pytest.mark.asyncio
async def test_next_quiet_tick_keeps_the_advice_without_calling_ai(monkeypatch):
    from custom_components.oig_cloud.ai_eval import coordinator

    box_id = "1234567890"
    now = datetime(2026, 11, 5, 15, 0, 0, tzinfo=timezone.utc)
    later = now + timedelta(hours=1)
    store, ai_calls, publishes = FakeStore(), [], []
    _wire(monkeypatch, coordinator, _quiet_states(box_id, now), _future_timeline(now),
          ADVICE_JSON, ai_calls, publishes, store)
    coord = coordinator.AiEvalCoordinator(FakeHass(), FakeConfigEntry(box_id=box_id))
    coord._store = store
    await coord._async_run_tick(now)

    _wire(monkeypatch, coordinator, _quiet_states(box_id, later), _future_timeline(later),
          ADVICE_JSON, ai_calls, publishes, store)
    await coord._async_run_tick(later)

    assert len(ai_calls) == 1                       # no second call
    assert store.saved["last_run"] == later.isoformat()
    assert store.saved["report"]["situace"].startswith("Baterie 60 %")
    assert store.saved["report_generated_at"] == now.isoformat()


@pytest.mark.asyncio
async def test_advice_survives_a_restart_without_a_new_call(monkeypatch):
    from custom_components.oig_cloud.ai_eval import coordinator

    box_id = "1234567890"
    now = datetime(2026, 11, 5, 15, 0, 0, tzinfo=timezone.utc)
    store, ai_calls, publishes = FakeStore(), [], []
    _wire(monkeypatch, coordinator, _quiet_states(box_id, now), _future_timeline(now),
          ADVICE_JSON, ai_calls, publishes, store)
    first = coordinator.AiEvalCoordinator(FakeHass(), FakeConfigEntry(box_id=box_id))
    first._store = store
    await first._async_run_tick(now)

    monkeypatch.setattr(coordinator, "async_track_point_in_time", lambda *_a: lambda: None)
    monkeypatch.setattr(coordinator, "start_background", lambda hass, coro, name: _drop(coro))
    second = coordinator.AiEvalCoordinator(FakeHass(), FakeConfigEntry(box_id=box_id))
    second._store = store
    await second.async_setup()
    later = now + timedelta(minutes=20)
    await second._async_run_tick(later)

    assert len(ai_calls) == 1
    assert store.saved["report"]["doporuceni"]


def _drop(coro):
    coro.close()
    fut = asyncio.get_event_loop().create_future()
    fut.set_result(None)
    return fut


@pytest.mark.asyncio
async def test_anomaly_tick_sends_detail_and_falls_back_on_plain_text(monkeypatch):
    from custom_components.oig_cloud.ai_eval import coordinator

    box_id = "1234567890"
    now = datetime(2026, 11, 5, 15, 0, 0, tzinfo=timezone.utc)
    store, ai_calls, publishes = FakeStore(), [], []
    _wire(monkeypatch, coordinator, _make_states(box_id, now), [],
          "FAKTA:\n- skok sítě\n\nLIDSKY:\n- pozor", ai_calls, publishes, store)
    coord = coordinator.AiEvalCoordinator(FakeHass(), FakeConfigEntry(box_id=box_id))
    coord._store = store
    await coord._async_run_tick(now)

    assert "ANOMALIE (právě teď)" in ai_calls[0][1]
    assert store.saved["report"] is None
    assert store.saved["report_kind"] == "anomaly"
    assert "skok sítě" in store.saved["report_fakta"]
    assert store.saved["status"] == "attention"


@pytest.mark.asyncio
async def test_extra_entities_option_reaches_the_snapshot(monkeypatch):
    from custom_components.oig_cloud.ai_eval import coordinator

    class _St:
        def __init__(self, state, attributes):
            self.state, self.attributes = state, attributes

    class _States:
        def get(self, entity_id):
            return {"sensor.venku": _St("7.5", {"friendly_name": "Venku",
                                                "unit_of_measurement": "°C"})}.get(entity_id)

    box_id = "1234567890"
    now = datetime(2026, 11, 5, 15, 0, 0, tzinfo=timezone.utc)
    store, ai_calls, publishes = FakeStore(), [], []
    _wire(monkeypatch, coordinator, _quiet_states(box_id, now), _future_timeline(now),
          ADVICE_JSON, ai_calls, publishes, store)
    hass = FakeHass()
    hass.states = _States()
    entry = FakeConfigEntry(box_id=box_id)
    entry.options["ai_extra_entities"] = ["sensor.venku"]
    coord = coordinator.AiEvalCoordinator(hass, entry)
    coord._store = store
    await coord._async_run_tick(now)

    assert "Venku=7.5 °C" in ai_calls[0][1]


@pytest.mark.asyncio
async def test_requested_refresh_forces_one_advice_run_and_is_rate_limited(monkeypatch):
    from custom_components.oig_cloud.ai_eval import coordinator

    box_id = "1234567890"
    now = datetime(2026, 11, 5, 15, 0, 0, tzinfo=timezone.utc)
    store, ai_calls, publishes = FakeStore(), [], []
    _wire(monkeypatch, coordinator, _quiet_states(box_id, now), _future_timeline(now),
          ADVICE_JSON, ai_calls, publishes, store)
    coord = coordinator.AiEvalCoordinator(FakeHass(), FakeConfigEntry(box_id=box_id))
    coord._store = store
    await coord._async_run_tick(now)          # first advice
    assert len(ai_calls) == 1

    clock = {"t": now + timedelta(minutes=10)}
    monkeypatch.setattr(coordinator.dt_util, "utcnow", lambda: clock["t"])
    started = []
    monkeypatch.setattr(coordinator, "start_background",
                        lambda hass, coro, name: started.append(asyncio.ensure_future(coro)) or started[-1])

    assert coord.request_advice() == "started"
    await started[-1]
    assert len(ai_calls) == 2                 # forced despite unchanged facts
    assert coord.request_advice() == "rate_limited"
    clock["t"] += timedelta(minutes=6)
    assert coord.request_advice() == "started"
    await started[-1]
    assert len(ai_calls) == 3


def test_fingerprint_changes_when_the_owner_picks_other_sensors():
    from custom_components.oig_cloud.ai_eval import snapshot as snap

    base = {"chmu": [], "hodiny": [], "fve": {}, "senzory": []}
    picked = dict(base, senzory=[{"nazev": "Venku", "stav": "7"}])
    assert snap.fingerprint(base) != snap.fingerprint(picked)
    warmer = dict(base, senzory=[{"nazev": "Venku", "stav": "9"}])
    assert snap.fingerprint(picked) == snap.fingerprint(warmer)   # values don't count


def test_only_one_hourly_timer_is_ever_armed(monkeypatch):
    """setup schedules a tick and the initial tick reschedules: the first timer
    must be cancelled, or every hour runs two AI calls at once (seen live:
    two 15:00 ticks, the provider refused one)."""
    from custom_components.oig_cloud.ai_eval import coordinator

    armed, cancelled = [], []

    def fake_track(hass, action, when):
        token = len(armed)
        armed.append(token)
        return lambda: cancelled.append(token)

    monkeypatch.setattr(coordinator, "async_track_point_in_time", fake_track)
    monkeypatch.setattr(coordinator, "Store", lambda *_a, **_k: FakeStore())
    coord = coordinator.AiEvalCoordinator(FakeHass(), FakeConfigEntry())
    coord._schedule_next_tick()
    coord._schedule_next_tick()
    coord._schedule_next_tick()
    assert cancelled == [0, 1]
