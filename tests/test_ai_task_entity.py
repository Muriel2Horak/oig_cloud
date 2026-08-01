# tests/test_ai_task_entity.py
"""SCOPE-REVISION #9: OIG supplies its OWN AITaskEntity — no HACS plugin."""
from __future__ import annotations

from types import SimpleNamespace

import pytest

try:
    from homeassistant.components import ai_task
except ImportError:
    from tests.test_ai_task_wiring import _install_shim

    _install_shim()
    from homeassistant.components import ai_task


def test_entity_declares_generate_data_feature():
    from custom_components.oig_cloud.ai_task import OigAiTaskEntity
    assert (
        OigAiTaskEntity._attr_supported_features
        & ai_task.AITaskEntityFeature.GENERATE_DATA
    )


def test_entity_implements_the_generate_data_hook():
    from custom_components.oig_cloud.ai_task import OigAiTaskEntity
    assert hasattr(OigAiTaskEntity, "_async_generate_data")


class _StubBackend:
    """Records whether the OIG backend was called, and with what."""

    def __init__(self, result=None):
        self.result = result if result is not None else {"ok": True}
        self.calls = []

    async def async_generate_data(self, task, install, structure):
        self.calls.append((task, install, structure))
        return self.result


def _entity(provider, backend):
    """An OigAiTaskEntity with its collaborators injected, no HA plumbing."""
    from custom_components.oig_cloud.ai_task import OigAiTaskEntity

    ent = OigAiTaskEntity.__new__(OigAiTaskEntity)   # bypass HA entity __init__
    ent._provider = provider
    ent._backend = backend
    return ent


def _task(instructions="validate", structure=None):
    return SimpleNamespace(
        instructions=instructions, structure=structure or {"type": "object"})


def _chat_log():
    return SimpleNamespace(conversation_id="conv-1")


@pytest.mark.asyncio
@pytest.mark.parametrize("provider", ["groq", "nvidia"])
async def test_generate_data_delegates_to_the_openai_compat_backend(provider):
    """The entity is a thin adapter: all real work is in ai/backends.py."""
    backend = _StubBackend({"ok": True})
    result = await _entity(provider, backend)._async_generate_data(
        _task("validate", {"type": "object"}), _chat_log())

    assert backend.calls == [(
        "ai_task_generate_data", {}, {"type": "object"})]
    assert result.data == {"ok": True}
    assert result.conversation_id == "conv-1"


@pytest.mark.asyncio
async def test_ai_task_provider_does_NOT_call_the_oig_backend(monkeypatch):
    """M4 / SCOPE-REVISION #8: the three providers are CO-EQUAL. A user who
    picked 'use the AI already in my HA' must not have their prompts shipped to
    Groq — the branch that prevents it is the whole point of this test."""
    backend = _StubBackend({"ok": "from-groq"})
    ent = _entity("ai_task", backend)

    delegated = []

    async def _fake_delegate(task):
        delegated.append(task.instructions)
        return {"ok": "from-host"}

    monkeypatch.setattr(ent, "_async_delegate_to_host_ai_task", _fake_delegate)

    result = await ent._async_generate_data(_task("validate"), _chat_log())

    assert backend.calls == [], "OIG backend called for provider=ai_task"
    assert delegated == ["validate"]
    assert result.data == {"ok": "from-host"}


@pytest.mark.asyncio
async def test_ai_task_failure_without_consent_refuses_and_does_not_call_backend(monkeypatch):
    from homeassistant.exceptions import HomeAssistantError
    from custom_components.oig_cloud.ai.backends import AiBackendError

    backend = _StubBackend({"ok": "from-groq"})
    ent = _entity("ai_task", backend)
    ent._consent_cross_provider_fallback = False
    ent._fallback_backend = backend

    async def _fail(_task):
        raise HomeAssistantError("host failure with secret-like text")

    monkeypatch.setattr(ent, "_async_delegate_to_host_ai_task", _fail)

    with pytest.raises(AiBackendError) as exc_info:
        await ent._async_generate_data(_task(), _chat_log())

    assert exc_info.value.code == "cross_provider_fallback_declined"
    assert backend.calls == []


@pytest.mark.asyncio
async def test_ai_task_failure_with_consent_and_configured_fallback_delegates(monkeypatch):
    from homeassistant.exceptions import HomeAssistantError

    backend = _StubBackend({"ok": "from-groq"})
    ent = _entity("ai_task", None)
    ent._consent_cross_provider_fallback = True
    ent._fallback_backend = backend

    async def _fail(_task):
        raise HomeAssistantError("host failure")

    monkeypatch.setattr(ent, "_async_delegate_to_host_ai_task", _fail)

    result = await ent._async_generate_data(_task(), _chat_log())

    assert result.data == {"ok": "from-groq"}
    assert backend.calls == [(
        "ai_task_generate_data", {}, {"type": "object"})]


@pytest.mark.asyncio
async def test_real_backend_failure_and_success_drive_backoff_and_status_sensor():
    from custom_components.oig_cloud.ai.backends import AiBackendError
    from custom_components.oig_cloud.ai.backoff import AiBackoffState
    from custom_components.oig_cloud.entities.ai_status_sensor import (
        OigCloudAiStatusSensor,
    )

    now = [100.0]
    backoff = AiBackoffState(now=lambda: now[0])
    hass = SimpleNamespace(data={"oig_cloud": {"oig_ai_backoff_state": backoff}})
    entry = SimpleNamespace(entry_id="entry1")

    class _TrafficBackend(_StubBackend):
        def __init__(self):
            super().__init__()
            self.fail = True

        async def async_generate_data(self, task, install, structure):
            self.calls.append((task, install, structure))
            if self.fail:
                raise AiBackendError("provider_unreachable")
            return {"ok": True}

    backend = _TrafficBackend()
    ent = _entity("groq", backend)
    ent._entry_id = entry.entry_id
    ent.hass = hass

    key_store = SimpleNamespace(
        async_api_state=lambda: _api_state(),
    )

    async def _api_state():
        return {"provider": "groq", "key_set": True, "verified": True}

    sensor = OigCloudAiStatusSensor(
        hass, entry, "box1", key_store=key_store, backoff_state=backoff)

    with pytest.raises(AiBackendError) as exc_info:
        await ent._async_generate_data(_task(), _chat_log())
    assert exc_info.value.code == "provider_unreachable"
    await sensor.async_update()
    assert sensor.native_value == "backing_off"
    assert sensor.extra_state_attributes["last_error_code"] == "provider_unreachable"
    assert backoff.snapshot("entry1", "groq").state == "backing_off"

    now[0] = backoff.snapshot("entry1", "groq").next_probe_at
    backend.fail = False
    result = await ent._async_generate_data(_task(), _chat_log())

    assert result.data == {"ok": True}
    await sensor.async_update()
    assert sensor.native_value == "verified"
    assert sensor.extra_state_attributes["last_error_code"] is None
    assert backoff.snapshot("entry1", "groq").state == "idle"


class _FailingBackend:
    """A backend whose chain is exhausted — raises like the real one does."""

    def __init__(self):
        self.calls = []

    async def async_generate_data(self, task, install, structure):
        from custom_components.oig_cloud.ai.backends import AiBackendError
        self.calls.append((task, install, structure))
        raise AiBackendError("provider_unreachable")


@pytest.mark.asyncio
async def test_direct_provider_failure_with_consent_uses_fallback():
    """Groq primary fails -> NVIDIA fallback is called when consent is set."""
    primary = _FailingBackend()
    fallback = _StubBackend({"ok": "from-fallback"})
    ent = _entity("groq", primary)
    ent._consent_cross_provider_fallback = True
    ent._fallback_backend = fallback
    result = await ent._async_generate_data(_task(), _chat_log())
    assert result.data == {"ok": "from-fallback"}
    assert len(primary.calls) == 1 and len(fallback.calls) == 1


@pytest.mark.asyncio
async def test_direct_provider_failure_without_consent_does_not_use_fallback():
    from custom_components.oig_cloud.ai.backends import AiBackendError
    primary = _FailingBackend()
    fallback = _StubBackend({"ok": "from-fallback"})
    ent = _entity("groq", primary)
    ent._consent_cross_provider_fallback = False
    ent._fallback_backend = fallback
    with pytest.raises(AiBackendError):
        await ent._async_generate_data(_task(), _chat_log())
    assert fallback.calls == []
