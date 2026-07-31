# tests/test_ai_task_options_wiring.py
"""F1 Unit 1 (dead-ai-wiring): entry.options wiring for ai_task.async_setup_entry.

Proves the 3 fields the field-propagation audit found DEAD
(docs/redesign_2026_07/rework/FIELD-PROPAGATION-MATRIX.md, "ai" section) are
now consumed at runtime:
  - ai_provider: AUTHORITATIVE when non-empty — selects the backend, and the
    KeyStore key is only used when its own provider record matches.
  - ai_base_url / ai_model: ADVANCED OVERRIDES — non-empty replaces the
    hardcoded PROVIDERS[...]["base_url"] / MODEL_CHAINS[...]; empty (the
    common case) falls back to the hardcoded default chain unchanged.

Needs the same sys.modules shim as test_ai_task_wiring.py (ai_task.py imports
homeassistant.components.ai_task, absent on the 2025.1.4 dev harness).
"""
from __future__ import annotations

import types

import pytest

from tests.test_ai_task_wiring import _install_shim

_install_shim()

from custom_components.oig_cloud import ai_task  # noqa: E402
from custom_components.oig_cloud.ai.backends import PROVIDERS  # noqa: E402


class _FakeStore:
    """Stands in for AiKeyStore — reports its OWN (provider, key) pair."""

    def __init__(self, provider, key):
        self._provider = provider
        self._key = key

    async def async_get_provider(self):
        return self._provider

    async def async_get_key(self):
        return self._key

    async def async_get_fallback_provider(self):
        return None

    async def async_get_fallback_key(self):
        return None


class _Entry:
    def __init__(self, entry_id="entry1", options=None):
        self.entry_id = entry_id
        self.options = options or {}


class _FakeHassForSetup:
    def __init__(self):
        self.data = {}
        self.services = types.SimpleNamespace(
            has_service=lambda domain, service: False
        )


def _patch_setup(monkeypatch, store_provider, store_key):
    monkeypatch.setattr(
        ai_task,
        "AiKeyStore",
        lambda hass, entry_id: _FakeStore(store_provider, store_key),
    )
    session = object()
    monkeypatch.setattr(ai_task, "async_get_clientsession", lambda hass: session)
    return session


async def _run_setup(monkeypatch, options, store_provider, store_key):
    _patch_setup(monkeypatch, store_provider, store_key)
    added = []
    await ai_task.async_setup_entry(
        _FakeHassForSetup(), _Entry("entry1", options=options), added.extend,
    )
    return added


# --- 1. options ai_provider drives backend selection -----------------------

@pytest.mark.asyncio
async def test_options_provider_selects_backend_when_key_matches(monkeypatch):
    """KeyStore holds the SAME provider/key pair the wizard just wrote."""
    added = await _run_setup(
        monkeypatch,
        options={"ai_provider": "nvidia"},
        store_provider="nvidia",
        store_key="nvapi-secret00000000",
    )
    assert len(added) == 1
    ent = added[0]
    assert ent._provider == "nvidia"
    assert ent._backend._api_key == "nvapi-secret00000000"
    assert ent._backend._base_url == PROVIDERS["nvidia"]["base_url"].rstrip("/")


@pytest.mark.asyncio
async def test_options_provider_overrides_stale_store_provider(monkeypatch):
    """Options provider is AUTHORITATIVE even when it differs from the store's.

    Store still holds an older provider selection (e.g. wizard changed the
    dropdown but the KeyStore record has not caught up) — no key exists for
    the newly selected provider, so no entity is added rather than silently
    reusing the wrong provider's key.
    """
    added = await _run_setup(
        monkeypatch,
        options={"ai_provider": "nvidia"},
        store_provider="groq",
        store_key="gsk_secret0000000000",
    )
    assert added == []


@pytest.mark.asyncio
async def test_empty_options_provider_falls_back_to_keystore(monkeypatch):
    """Behavior-neutral fallback: no options provider → pre-existing KeyStore path."""
    added = await _run_setup(
        monkeypatch,
        options={},
        store_provider="groq",
        store_key="gsk_secret0000000000",
    )
    assert len(added) == 1
    assert added[0]._provider == "groq"


# --- 2. non-empty ai_base_url / ai_model override hardcoded defaults -------

@pytest.mark.asyncio
async def test_non_empty_base_url_and_model_override_hardcoded_defaults(monkeypatch):
    added = await _run_setup(
        monkeypatch,
        options={
            "ai_provider": "groq",
            "ai_base_url": "https://custom.example.com/v1",
            "ai_model": "custom-model-x",
        },
        store_provider="groq",
        store_key="gsk_secret0000000000",
    )
    assert len(added) == 1
    backend = added[0]._backend
    assert backend._base_url == "https://custom.example.com/v1"
    assert backend._models == ("custom-model-x",)


# --- 3. empty ai_base_url / ai_model leave the hardcoded chain unchanged ---

@pytest.mark.asyncio
async def test_empty_base_url_and_model_keep_hardcoded_default_chain(monkeypatch):
    added = await _run_setup(
        monkeypatch,
        options={"ai_provider": "groq", "ai_base_url": "", "ai_model": ""},
        store_provider="groq",
        store_key="gsk_secret0000000000",
    )
    assert len(added) == 1
    backend = added[0]._backend
    assert backend._base_url == PROVIDERS["groq"]["base_url"].rstrip("/")
    assert backend._models == ai_task.MODEL_CHAINS["groq"]
