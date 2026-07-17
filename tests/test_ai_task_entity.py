# tests/test_ai_task_entity.py
"""SCOPE-REVISION #9: OIG supplies its OWN AITaskEntity — no HACS plugin."""
from __future__ import annotations

from types import SimpleNamespace

import pytest

ai_task = pytest.importorskip(
    "homeassistant.components.ai_task",
    reason="HA in this env predates ai_task (2025.7+); see Plan 3 Task 9",
)


def test_entity_declares_generate_data_feature():
    from custom_components.oig_cloud.ai_task import OigAiTaskEntity
    assert ai_task.AITaskEntityFeature.GENERATE_DATA in OigAiTaskEntity._attr_supported_features


def test_entity_implements_the_generate_data_hook():
    from custom_components.oig_cloud.ai_task import OigAiTaskEntity
    assert hasattr(OigAiTaskEntity, "_async_generate_data")


class _StubBackend:
    """Records whether the OIG backend was called, and with what."""

    def __init__(self, result=None):
        self.result = result if result is not None else {"ok": True}
        self.calls = []

    async def async_generate_data(self, instructions, structure):
        self.calls.append((instructions, structure))
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

    assert backend.calls == [("validate", {"type": "object"})]
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
