"""Tests for the hourly AI evaluation coordinator.

Mirrors tests/test_ai_task_wiring.py style: fake hass, fake recorder,
monkeypatched AI client and notification.
"""
from __future__ import annotations

import sys
import types
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List
from unittest.mock import AsyncMock, MagicMock

import pytest


def _install_ai_shims() -> None:
    if "custom_components.oig_cloud.ai_eval.ai_client" not in sys.modules:
        mod = types.ModuleType("custom_components.oig_cloud.ai_eval.ai_client")

        async def generate_eval_report(hass, config_entry, system_prompt, user_message):
            return None

        mod.generate_eval_report = generate_eval_report
        sys.modules["custom_components.oig_cloud.ai_eval.ai_client"] = mod

    if "custom_components.oig_cloud.ai_eval.notify" not in sys.modules:
        mod = types.ModuleType("custom_components.oig_cloud.ai_eval.notify")

        async def publish_eval_notification(hass, config_entry, report, notable):
            pass

        mod.publish_eval_notification = publish_eval_notification
        sys.modules["custom_components.oig_cloud.ai_eval.notify"] = mod


_install_ai_shims()


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
        f"sensor.oig_{box_id}_actual_aci_wtotal": [("500", 0), ("600", 20), ("700", 40)],
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


import asyncio


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

    async def fake_fetch_plan_block(hass, box_id):
        return "PLÁN A CENY:\nDnes: plán 50.00 Kč"

    monkeypatch.setattr(coordinator, "_fetch_plan_block", fake_fetch_plan_block)

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
async def test_generate_eval_report_none_noops(monkeypatch):
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

    async def fake_fetch_plan_block(hass, box_id):
        return "PLÁN A CENY:\nDnes: plán 50.00 Kč"

    monkeypatch.setattr(coordinator, "_fetch_plan_block", fake_fetch_plan_block)

    coord = coordinator.AiEvalCoordinator(fake_hass, fake_entry)
    coord._store = fake_store

    await coord._async_run_tick(now)

    assert fake_store.saved == {}
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

    async def fake_fetch_plan_block(hass, box_id):
        return "PLÁN A CENY:\nDnes: plán 50.00 Kč"

    monkeypatch.setattr(coordinator, "_fetch_plan_block", fake_fetch_plan_block)

    coord = coordinator.AiEvalCoordinator(fake_hass, fake_entry)
    coord._store = fake_store

    await coord._async_run_tick(now)

    assert True in publish_calls
