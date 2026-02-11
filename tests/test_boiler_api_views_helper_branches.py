from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

from custom_components.oig_cloud.boiler import api_views as module


def test_pick_peak_hours_empty_returns_empty_list():
    assert module._pick_peak_hours({}) == []


def test_build_circulation_windows_empty_returns_empty_list():
    assert module._build_circulation_windows([]) == []


def test_find_next_heating_slot_skips_non_consuming_slots():
    now = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    slots = [
        SimpleNamespace(end=now, avg_consumption_kwh=1.0),
        SimpleNamespace(end=now.replace(hour=13), avg_consumption_kwh=0.0),
    ]
    assert module._find_next_heating_slot(slots, now) is None


def test_build_state_payload_serializes_last_update_datetime():
    now = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    payload = module._build_state_payload(SimpleNamespace(data={"last_update": now}))
    assert payload["last_update"] == now.isoformat()
