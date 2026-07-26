from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.ai.backoff import AiBackoffState
from custom_components.oig_cloud.const import DOMAIN
from custom_components.oig_cloud.entities.ai_status_sensor import OigCloudAiStatusSensor
from custom_components.oig_cloud import sensor as sensor_module


class _FakeKeyStore:
    def __init__(self, state, raw_key="") -> None:
        self._state = state
        self.raw_key = raw_key

    async def async_api_state(self):
        return self._state


def _hass(entry_id="entry1", last_error_code=None):
    return SimpleNamespace(
        data={DOMAIN: {entry_id: {"ai_last_error_code": last_error_code}}},
    )


def _entry(entry_id="entry1"):
    return SimpleNamespace(entry_id=entry_id)


async def _state_for(api_state, *, backoff=None, last_error_code=None):
    entry = _entry()
    sensor = OigCloudAiStatusSensor(
        _hass(entry.entry_id, last_error_code),
        entry,
        "box1",
        key_store=_FakeKeyStore(api_state),
        backoff_state=backoff,
    )
    await sensor.async_update()
    return sensor.native_value


@pytest.mark.asyncio
async def test_native_value_not_configured():
    assert await _state_for({"provider": None, "key_set": False, "verified": False}) == "not_configured"


@pytest.mark.asyncio
async def test_native_value_verified():
    assert await _state_for({"provider": "groq", "key_set": True, "verified": True}) == "verified"


@pytest.mark.asyncio
async def test_native_value_unverified():
    assert await _state_for({"provider": "groq", "key_set": True, "verified": False}) == "unverified"


@pytest.mark.asyncio
async def test_native_value_backing_off():
    now = [100.0]
    backoff = AiBackoffState(now=lambda: now[0])
    backoff.record_failure("entry1", "groq")

    assert await _state_for(
        {"provider": "groq", "key_set": True, "verified": False},
        backoff=backoff,
    ) == "backing_off"


@pytest.mark.asyncio
async def test_native_value_no_credits():
    assert await _state_for(
        {"provider": "groq", "key_set": True, "verified": False},
        last_error_code="no_credits",
    ) == "no_credits"


@pytest.mark.asyncio
async def test_native_value_error():
    assert await _state_for(
        {"provider": "groq", "key_set": True, "verified": False},
        last_error_code="auth",
    ) == "error"


@pytest.mark.asyncio
async def test_extra_state_attributes_include_provider_error_code_and_next_probe_at():
    now = [100.0]
    backoff = AiBackoffState(now=lambda: now[0])
    backoff.record_failure("entry1", "groq")
    entry = _entry()
    sensor = OigCloudAiStatusSensor(
        _hass(entry.entry_id, "provider_unreachable"),
        entry,
        "box1",
        key_store=_FakeKeyStore({"provider": "groq", "key_set": True, "verified": False}),
        backoff_state=backoff,
    )
    await sensor.async_update()

    attrs = sensor.extra_state_attributes
    assert attrs["provider"] == "groq"
    assert attrs["last_error_code"] == "provider_unreachable"
    assert attrs["next_probe_at"] == 130.0


@pytest.mark.asyncio
async def test_ai_status_sensor_never_exposes_raw_key_material():
    fake_key = "gsk_DO_NOT_LEAK_1234567890"
    entry = _entry()
    sensor = OigCloudAiStatusSensor(
        _hass(entry.entry_id, f"raw upstream message {fake_key}"),
        entry,
        "box1",
        key_store=_FakeKeyStore(
            {"provider": "groq", "key_set": True, "verified": False},
            raw_key=fake_key,
        ),
        backoff_state=AiBackoffState(),
    )

    await sensor.async_update()

    assert fake_key not in str(sensor.native_value)
    assert fake_key not in json.dumps(sensor.extra_state_attributes, sort_keys=True, default=str)


def test_register_ai_status_sensor_returns_always_present_entity(monkeypatch):
    created = []

    class _DummyAiStatusSensor:
        def __init__(self, hass, entry, box_id):
            created.append((hass, entry, box_id))

    hass = _hass()
    coordinator = SimpleNamespace(forced_box_id="123456")
    entry = _entry()
    monkeypatch.setattr(sensor_module, "OigCloudAiStatusSensor", _DummyAiStatusSensor)

    sensors = sensor_module._register_ai_status_sensor(hass, coordinator, entry)

    assert len(sensors) == 1
    assert created == [(hass, entry, "123456")]
