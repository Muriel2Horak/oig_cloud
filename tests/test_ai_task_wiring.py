"""Wiring tests for OigAiTaskEntity (Plan 3.5 items 2+3).

ai_task.py imports `homeassistant.components.ai_task`, which does NOT exist on
the dev harness (HA 2025.1.4), and `conversation.ChatLog`, which is likewise
absent (the real `conversation` won't even import here — `hassil` is missing).
So BEFORE importing ai_task we register minimal fakes into `sys.modules`.

Scope note: this validates the wiring LOGIC (setup, per-provider instantiation,
delegation payload shape) — NOT the real HA ai_task API. The real
`ai_task.generate_data` service and the AITaskEntity base are validated on
Martin's live box (HA 2026.7.2) at deploy-verify. See the residual-risk note.

The shim is registered at THIS module's import time only. `ai_task` genuinely
does not exist on 2025.1.4, so registering it shadows nothing real; for
`conversation` we register a fake solely because the real module fails to import
on this harness — an ai_task-capable HA would already carry both.
"""
from __future__ import annotations

import sys
import types

import pytest


def _install_shim() -> None:
    if "homeassistant.components.ai_task" not in sys.modules:
        mod = types.ModuleType("homeassistant.components.ai_task")

        class AITaskEntityFeature:  # real: IntFlag; the value is irrelevant here
            GENERATE_DATA = 1

        class AITaskEntity:  # real: RestoreEntity subclass; a plain base suffices
            def __init__(self, *args, **kwargs) -> None:
                pass

        class GenDataTask:
            def __init__(self, structure=None, instructions=None, **kw) -> None:
                self.structure = structure
                self.instructions = instructions

        class GenDataTaskResult:
            def __init__(self, conversation_id=None, data=None) -> None:
                self.conversation_id = conversation_id
                self.data = data

        mod.AITaskEntity = AITaskEntity
        mod.AITaskEntityFeature = AITaskEntityFeature
        mod.GenDataTask = GenDataTask
        mod.GenDataTaskResult = GenDataTaskResult
        sys.modules["homeassistant.components.ai_task"] = mod

    # conversation.ChatLog — the real module doesn't import on 2025.1.4.
    class ChatLog:
        def __init__(self, conversation_id=None) -> None:
            self.conversation_id = conversation_id

    try:
        from homeassistant.components import conversation as _conv
        if not hasattr(_conv, "ChatLog"):
            _conv.ChatLog = ChatLog
    except Exception:
        conv = types.ModuleType("homeassistant.components.conversation")
        conv.ChatLog = ChatLog
        sys.modules["homeassistant.components.conversation"] = conv


_install_shim()

from custom_components.oig_cloud import ai_task  # noqa: E402
from custom_components.oig_cloud.ai.backends import (  # noqa: E402
    PROVIDERS,
    OpenAiCompatBackend,
)


# --- fakes for async_setup_entry -------------------------------------------

class _FakeStore:
    """Stands in for AiKeyStore — returns a preconfigured provider/key."""
    def __init__(self, provider, key):
        self._provider = provider
        self._key = key

    async def async_get_provider(self):
        return self._provider

    async def async_get_key(self):
        return self._key


class _Entry:
    def __init__(self, entry_id="entry1"):
        self.entry_id = entry_id


def _patch_setup(monkeypatch, provider, key):
    """Wire async_setup_entry to a fake store + sentinel aiohttp session."""
    monkeypatch.setattr(
        ai_task, "AiKeyStore", lambda hass, entry_id: _FakeStore(provider, key)
    )
    session = object()
    monkeypatch.setattr(ai_task, "async_get_clientsession", lambda hass: session)
    return session


class _FakeHassForSetup:
    def __init__(self):
        self.data = {}


async def _run_setup(provider, key, monkeypatch):
    _patch_setup(monkeypatch, provider, key)
    added = []
    await ai_task.async_setup_entry(_FakeHassForSetup(), _Entry("entry1"), added.extend)
    return added


# --- item 2: async_setup_entry per provider --------------------------------

@pytest.mark.asyncio
async def test_groq_provider_builds_openai_compat_backend(monkeypatch):
    added = await _run_setup("groq", "gsk_secret0000000000", monkeypatch)
    assert len(added) == 1
    ent = added[0]
    assert ent._provider == "groq"
    assert isinstance(ent._backend, OpenAiCompatBackend)
    assert ent._backend._base_url == PROVIDERS["groq"]["base_url"].rstrip("/")
    assert ent._backend._model == ai_task.MODEL_CHAINS["groq"][0]
    assert ent._backend._api_key == "gsk_secret0000000000"
    assert ent._attr_unique_id == "entry1_ai_task"


@pytest.mark.asyncio
async def test_nvidia_provider_uses_its_base_url_and_model(monkeypatch):
    added = await _run_setup("nvidia", "nvapi-secret00000000", monkeypatch)
    assert len(added) == 1
    ent = added[0]
    assert ent._provider == "nvidia"
    assert ent._backend._base_url == PROVIDERS["nvidia"]["base_url"].rstrip("/")
    assert ent._backend._model == ai_task.MODEL_CHAINS["nvidia"][0]


@pytest.mark.asyncio
async def test_ai_task_provider_adds_entity_with_no_backend(monkeypatch):
    """Delegation path: OIG backend is NOT constructed (co-equal providers)."""
    added = await _run_setup("ai_task", None, monkeypatch)
    assert len(added) == 1
    ent = added[0]
    assert ent._provider == "ai_task"
    assert ent._backend is None


@pytest.mark.asyncio
async def test_no_provider_configured_adds_no_entity(monkeypatch):
    """AI is optional (SCOPE-REVISION #5) — no config → no entity, no raise."""
    _patch_setup(monkeypatch, None, None)
    calls = []
    await ai_task.async_setup_entry(object(), _Entry(), calls.append)
    assert calls == []  # async_add_entities never called


@pytest.mark.asyncio
async def test_provider_set_but_key_missing_adds_no_entity(monkeypatch):
    """Can't call an OpenAI-compatible backend without a key → add nothing."""
    _patch_setup(monkeypatch, "groq", None)
    calls = []
    await ai_task.async_setup_entry(object(), _Entry(), calls.append)
    assert calls == []


# --- item 3: pin the delegation payload ------------------------------------

class _FakeServices:
    def __init__(self):
        self.calls = []

    async def async_call(self, domain, service, data, blocking, return_response):
        self.calls.append({
            "domain": domain, "service": service, "data": data,
            "blocking": blocking, "return_response": return_response,
        })
        return {"data": {"ok": True}}


class _FakeHass:
    def __init__(self):
        self.services = _FakeServices()


@pytest.mark.asyncio
async def test_delegation_payload_matches_ai_task_generate_data_contract(monkeypatch):
    """F1-DESIGN §2 contract: call ai_task.generate_data, entity_id OMITTED so
    HA resolves the user's preferred entity, blocking + return_response."""
    ent = ai_task.OigAiTaskEntity(
        provider="ai_task", backend=None, install={}, entry_id="entry1")
    hass = _FakeHass()
    ent.hass = hass
    task = ai_task.GenDataTask(structure={"type": "object"}, instructions="ignored")

    out = await ent._async_delegate_to_host_ai_task(task)

    assert out == {"data": {"ok": True}}
    assert len(hass.services.calls) == 1
    call = hass.services.calls[0]
    assert call["domain"] == "ai_task"
    assert call["service"] == "generate_data"
    assert call["blocking"] is True
    assert call["return_response"] is True
    assert call["data"] == {"task": task}
    assert "entity_id" not in call["data"]  # HA resolves the preferred entity


# --- guard: backend=None on the OIG-provider branch must fail closed -------

@pytest.mark.asyncio
async def test_missing_backend_on_openai_compat_provider_raises_classified_error():
    """Guard: backend=None on a NON-delegation provider must NOT None-deref.

    async_setup_entry is the only place that normally constructs this entity,
    and it gates on a present key — so backend=None never reaches here in
    production. But that guarantee is held at a distance (another function,
    another call site). Pre-change this raises AttributeError on the
    None.async_generate_data call; the guard turns it into a classified
    RuntimeError the UI can render. See the commit message for the recorded
    pre-change FAIL evidence.
    """
    ent = ai_task.OigAiTaskEntity(
        provider="groq", backend=None, install={}, entry_id="entry1")
    task = ai_task.GenDataTask(
        structure={"type": "object"}, instructions="validate")
    chat_log = ai_task.GenDataTaskResult(conversation_id="conv-1")

    with pytest.raises(RuntimeError, match="AI backend not configured"):
        await ent._async_generate_data(task, chat_log)


# --- Stage C1 Task 1: MODEL_CHAINS -----------------------------------------

def test_groq_chain_matches_p10_order():
    from custom_components.oig_cloud import ai_task
    assert ai_task.MODEL_CHAINS["groq"] == (
        "llama-3.3-70b-versatile", "qwen3-32b", "llama-3.1-8b-instant",
    )


def test_nvidia_chain_head_is_the_flagship_order_from_decisions_p1():
    from custom_components.oig_cloud import ai_task
    assert ai_task.MODEL_CHAINS["nvidia"][:6] == (
        "z-ai/glm-5.2",
        "mistralai/mistral-large-3-675b-instruct-2512",
        "minimaxai/minimax-m3",
        "nvidia/nemotron-3-super-120b-a12b",
        "mistralai/mistral-medium-3.5-128b",
        "openai/gpt-oss-120b",
    )


def test_nvidia_chain_excludes_dead_and_disabled_models_and_is_32_long():
    from custom_components.oig_cloud import ai_task
    chain = ai_task.MODEL_CHAINS["nvidia"]
    assert len(chain) == 32
    assert "moonshotai/kimi-k2.6" not in chain
    assert "01-ai/yi-large" not in chain
    assert len(set(chain)) == 32


def test_nvidia_chain_tail_is_latency_sorted():
    from custom_components.oig_cloud import ai_task
    tail = ai_task.MODEL_CHAINS["nvidia"][6:]
    assert tail[0] == "microsoft/phi-4-mini-instruct"
    assert tail[-1] == "meta/llama-3.3-70b-instruct"
