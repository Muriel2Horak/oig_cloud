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

        async def async_generate_data(hass, **kwargs):
            return {"data": {"ok": True}}

        mod.AITaskEntity = AITaskEntity
        mod.AITaskEntityFeature = AITaskEntityFeature
        mod.GenDataTask = GenDataTask
        mod.GenDataTaskResult = GenDataTaskResult
        mod.async_generate_data = async_generate_data
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
    """Stands in for AiKeyStore — returns configured provider/key pairs."""
    def __init__(self, provider, key, fallback_provider=None, fallback_key=None):
        self._provider = provider
        self._key = key
        self._fallback_provider = fallback_provider
        self._fallback_key = fallback_key

    async def async_get_provider(self):
        return self._provider

    async def async_get_key(self):
        return self._key

    async def async_get_fallback_provider(self):
        return self._fallback_provider

    async def async_get_fallback_key(self):
        return self._fallback_key


class _Entry:
    def __init__(self, entry_id="entry1", options=None):
        self.entry_id = entry_id
        self.options = options or {}


def _patch_setup(
    monkeypatch, provider, key, fallback_provider=None, fallback_key=None
):
    """Wire async_setup_entry to a fake store + sentinel aiohttp session."""
    monkeypatch.setattr(
        ai_task,
        "AiKeyStore",
        lambda hass, entry_id: _FakeStore(
            provider, key, fallback_provider, fallback_key
        ),
    )
    session = object()
    monkeypatch.setattr(ai_task, "async_get_clientsession", lambda hass: session)
    return session


class _FakeHassForSetup:
    def __init__(self, ai_task_service=True):
        self.data = {}
        self.services = types.SimpleNamespace(
            has_service=lambda domain, service: (
                ai_task_service and domain == "ai_task" and service == "generate_data"
            )
        )


async def _run_setup(
    provider,
    key,
    monkeypatch,
    ai_task_service=True,
    fallback_provider=None,
    fallback_key=None,
    consent=False,
):
    _patch_setup(monkeypatch, provider, key, fallback_provider, fallback_key)
    added = []
    await ai_task.async_setup_entry(
        _FakeHassForSetup(ai_task_service),
        _Entry(
            "entry1",
            options={"ai_consent_cross_provider_fallback": consent},
        ),
        added.extend,
    )
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
async def test_ai_task_provider_without_host_service_adds_no_entity(monkeypatch):
    added = await _run_setup("ai_task", None, monkeypatch, ai_task_service=False)

    assert added == []


@pytest.mark.asyncio
async def test_ai_task_provider_with_host_service_adds_entity(monkeypatch):
    added = await _run_setup("ai_task", None, monkeypatch, ai_task_service=True)

    assert len(added) == 1
    assert added[0]._provider == "ai_task"


@pytest.mark.asyncio
async def test_ai_task_setup_builds_fallback_backend_when_consent_and_fallback_configured(
    monkeypatch,
):
    added = await _run_setup(
        "ai_task",
        None,
        monkeypatch,
        fallback_provider="groq",
        fallback_key="gsk_fallback0000000000",
        consent=True,
    )

    assert len(added) == 1
    fallback = added[0]._fallback_backend
    assert isinstance(fallback, OpenAiCompatBackend)
    assert fallback._provider == "groq"
    assert fallback._base_url == PROVIDERS["groq"]["base_url"].rstrip("/")
    assert fallback._api_key == "gsk_fallback0000000000"


@pytest.mark.asyncio
async def test_ai_task_setup_no_fallback_backend_without_consent(monkeypatch):
    added = await _run_setup(
        "ai_task",
        None,
        monkeypatch,
        fallback_provider="groq",
        fallback_key="gsk_fallback0000000000",
        consent=False,
    )

    assert len(added) == 1
    assert added[0]._fallback_backend is None


@pytest.mark.asyncio
async def test_ai_task_setup_no_fallback_backend_when_none_configured(monkeypatch):
    added = await _run_setup(
        "ai_task", None, monkeypatch, consent=True
    )

    assert len(added) == 1
    assert added[0]._fallback_backend is None


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
    """O1 contract: call the host helper with the selected task fields."""
    ent = ai_task.OigAiTaskEntity(
        provider="ai_task", backend=None, install={}, entry_id="entry1")
    hass = _FakeHass()
    ent.hass = hass
    task = ai_task.GenDataTask(structure={"type": "object"}, instructions="ignored")

    host_ai_task = sys.modules["homeassistant.components.ai_task"]
    calls = []

    async def _fake_generate_data(received_hass, **kwargs):
        calls.append((received_hass, kwargs))
        return {"ok": True}

    monkeypatch.setattr(host_ai_task, "async_generate_data", _fake_generate_data)

    out = await ent._async_delegate_to_host_ai_task(task)

    assert out == {"ok": True}
    assert calls == [(
        hass,
        {
            "task_name": "oig_ai_task_delegate",
            "entity_id": None,
            "instructions": "ignored",
            "structure": {"type": "object"},
        },
    )]


def test_cross_provider_fallback_consent_field_shape():
    from custom_components.oig_cloud.config_registry import FIELD_REGISTRY

    field = FIELD_REGISTRY["ai_consent_cross_provider_fallback"]
    assert field.type is bool
    assert field.default is False
    assert field.scope == "advanced"


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


class _FallbackBackend:
    def __init__(self, result=None):
        self.result = result if result is not None else {"ok": "fallback"}
        self.calls = []
        self._provider = "groq"

    async def async_generate_data(self, task, install, schema):
        self.calls.append((task, install, schema))
        return self.result


@pytest.mark.asyncio
async def test_ai_task_failure_without_consent_refuses_without_backend_call(monkeypatch):
    from homeassistant.exceptions import HomeAssistantError
    from custom_components.oig_cloud.ai.backends import AiBackendError

    fallback = _FallbackBackend()
    ent = ai_task.OigAiTaskEntity(
        provider="ai_task", backend=None, install={}, entry_id="entry1",
        consent_cross_provider=False, fallback_backend=fallback,
    )

    async def _fail(_task):
        raise HomeAssistantError("upstream key-shaped-secret")

    monkeypatch.setattr(ent, "_async_delegate_to_host_ai_task", _fail)

    with pytest.raises(AiBackendError) as exc_info:
        await ent._async_generate_data(
            ai_task.GenDataTask(structure={"type": "object"}),
            ai_task.GenDataTaskResult(conversation_id="conv-1"),
        )

    assert exc_info.value.code == "cross_provider_fallback_declined"
    assert "upstream key-shaped-secret" not in str(exc_info.value)
    assert fallback.calls == []


@pytest.mark.asyncio
async def test_ai_task_failure_with_consent_and_fallback_backend_delegates(monkeypatch):
    from homeassistant.exceptions import HomeAssistantError

    fallback = _FallbackBackend({"ok": "from-groq"})
    ent = ai_task.OigAiTaskEntity(
        provider="ai_task", backend=None, install={"capacity_kwh": 9}, entry_id="entry1",
        consent_cross_provider=True, fallback_backend=fallback,
    )

    async def _fail(_task):
        raise HomeAssistantError("host failure")

    monkeypatch.setattr(ent, "_async_delegate_to_host_ai_task", _fail)
    task = ai_task.GenDataTask(structure={"type": "object"}, instructions="private text")

    result = await ent._async_generate_data(
        task, ai_task.GenDataTaskResult(conversation_id="conv-1"))

    assert result.data == {"ok": "from-groq"}
    assert fallback.calls == [(
        "ai_task_generate_data", {"capacity_kwh": 9}, {"type": "object"})]


# --- Stage C1 Task 1: MODEL_CHAINS -----------------------------------------

def test_groq_chain_matches_p10_order():
    from custom_components.oig_cloud import ai_task
    # qwen/qwen3.6-27b is the live Groq id (the old "qwen3-32b" 404s), placed
    # first with two non-reasoning fallbacks. Verified against Groq 2026-08-01.
    assert ai_task.MODEL_CHAINS["groq"] == (
        "qwen/qwen3.6-27b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant",
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


# --- F1 fallback: direct-provider primary can also carry a fallback ---------

@pytest.mark.asyncio
async def test_direct_provider_wires_fallback_when_consented(monkeypatch):
    """Groq primary + a stored NVIDIA fallback + consent -> the entity carries
    the fallback backend, so a direct-provider primary can fall back too."""
    added = await _run_setup(
        "groq", "gsk_secret0000000000", monkeypatch,
        fallback_provider="nvidia", fallback_key="nvapi-secret00000000",
        consent=True)
    ent = added[0]
    assert ent._provider == "groq"
    assert ent._consent_cross_provider_fallback is True
    assert isinstance(ent._fallback_backend, OpenAiCompatBackend)
    assert ent._fallback_backend._provider == "nvidia"


@pytest.mark.asyncio
async def test_direct_provider_no_fallback_without_consent(monkeypatch):
    added = await _run_setup(
        "groq", "gsk_secret0000000000", monkeypatch,
        fallback_provider="nvidia", fallback_key="nvapi-secret00000000",
        consent=False)
    assert added[0]._fallback_backend is None


@pytest.mark.asyncio
async def test_same_provider_fallback_is_ignored(monkeypatch):
    """A fallback equal to the primary gives no resilience -> not wired."""
    added = await _run_setup(
        "groq", "gsk_secret0000000000", monkeypatch,
        fallback_provider="groq", fallback_key="gsk_other0000000000",
        consent=True)
    assert added[0]._fallback_backend is None
