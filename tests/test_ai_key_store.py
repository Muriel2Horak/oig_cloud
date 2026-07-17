"""P2: the AI key lives in .storage — never in options, never in a log line."""
from __future__ import annotations

import logging
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from custom_components.oig_cloud.ai.key_store import AiKeyStore, redact_key

_SECRET = "gsk_ThisIsARealLookingSecretKey0123456789"


class _MemStore:
    """Stand-in for homeassistant.helpers.storage.Store."""
    def __init__(self, *_a, **_kw):
        self.saved = None

    async def async_load(self):
        return self.saved

    async def async_save(self, data):
        self.saved = data


@pytest.fixture
def store(monkeypatch):
    monkeypatch.setattr("custom_components.oig_cloud.ai.key_store.Store", _MemStore)
    return AiKeyStore(SimpleNamespace(), "entry1")


@pytest.mark.parametrize("raw,expected", [
    ("gsk_abcdefghijklmnop", "gsk_…mnop"),
    ("nvapi-abcdefghijklmnop", "nvapi-…mnop"),
    ("short", "…"),
    ("", "…"),
    (None, "…"),
])
def test_redact_key_never_reveals_the_secret(raw, expected):
    assert redact_key(raw) == expected


@pytest.mark.asyncio
async def test_round_trip_key_and_provider(store):
    await store.async_set_key("groq", _SECRET)
    assert await store.async_get_key() == _SECRET
    assert (await store.async_get_provider()) == "groq"


@pytest.mark.asyncio
async def test_api_state_never_exposes_the_key(store):
    """REST may only ever learn {provider, key_set, verified} (F1-DESIGN §3)."""
    await store.async_set_key("nvidia", _SECRET)
    state = await store.async_api_state()
    assert state == {"provider": "nvidia", "key_set": True, "verified": False}
    assert _SECRET not in str(state)


@pytest.mark.asyncio
async def test_key_never_reaches_config_entry_options(store):
    """The bug class this whole design exists to avoid."""
    entry = SimpleNamespace(entry_id="entry1", options={"charge_rate_kw": 2.8})
    hass = SimpleNamespace(config_entries=SimpleNamespace(async_update_entry=MagicMock()))
    await store.async_set_key("groq", _SECRET)
    # storing a key must not touch the entry at all
    hass.config_entries.async_update_entry.assert_not_called()
    assert _SECRET not in str(entry.options)


@pytest.mark.asyncio
async def test_setting_a_key_logs_only_a_redacted_fingerprint(store, caplog):
    with caplog.at_level(logging.DEBUG):
        await store.async_set_key("groq", _SECRET)
    assert _SECRET not in caplog.text
    assert "gsk_…6789" in caplog.text
