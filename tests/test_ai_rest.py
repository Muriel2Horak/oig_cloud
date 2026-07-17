"""Codex CRITICAL #2: every endpoint this plan ADDS is admin-gated and fails closed."""
from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.api import ha_rest_api as api_module

_SECRET = "gsk_ThisIsARealLookingSecretKey0123456789"


# --- arrangement: reuse tests/test_ha_rest_api_views.py's fixtures (:15-87) ---
# DummyRequest already sets hass_user admin=True at :17; DummyJsonRequest (:78-87)
# adds the json() payload. Import them rather than re-declaring a second set that
# can drift from the originals. `tests/` IS a package (tests/__init__.py exists,
# verified 2026-07-17) and the house convention is the absolute form — see
# tests/test_simulate_interval_new.py:18 `from tests.simulate_interval_standalone
# import …`.
from tests.test_ha_rest_api_views import (      # noqa: E402
    DummyConfigEntries,
    DummyEntry,
    DummyHass,
    DummyJsonRequest,
    DummyRequest,
)


class _MemStore:
    """Stand-in for AiKeyStore's Store — keyed persistence like the real Store.

    The brief's single-instance `_MemStore` works for `test_ai_key_store.py` (one
    AiKeyStore reused); here POST creates a Store, then GET creates a SECOND
    Store with the same key, and the second one must observe what the first
    saved. A real `homeassistant.helpers.storage.Store` is keyed by `key`, so
    we mirror that. Same pattern as tests/test_ai_key_store.py — extended for
    cross-instance sharing.
    """

    _bucket: dict[str, object] = {}

    def __init__(self, *_a, **_kw):
        self._key = _kw.get("key") or (_a[2] if len(_a) >= 3 else "default")
        self.saved = _MemStore._bucket.get(self._key)

    async def async_load(self):
        return self.saved

    async def async_save(self, data):
        self.saved = data
        _MemStore._bucket[self._key] = data


@pytest.fixture
def ai_env(monkeypatch):
    """One arranged (view, hass, entry) triple + the admin-request helpers."""
    entry = DummyEntry("e1", options={})
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    monkeypatch.setattr(
        "custom_components.oig_cloud.ai.key_store.Store", _MemStore)
    return SimpleNamespace(
        view=api_module.OIGCloudAiView(), hass=hass, entry=entry)


def admin_req(env):
    """A GET request from an admin."""
    return DummyRequest(env.hass)


def admin_req_with(env, payload):
    """A POST request from an admin carrying `payload`."""
    return DummyJsonRequest(env.hass, payload=payload)


def non_admin_req(env):
    req = DummyRequest(env.hass)
    req.app["hass_user"] = SimpleNamespace(is_admin=False)
    return req


# --- tests --------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ai_state_requires_admin(ai_env):
    """Fail closed: key presence/provider is not for every authenticated user."""
    resp = await ai_env.view.get(non_admin_req(ai_env), "box1")
    assert resp.status == 403


@pytest.mark.asyncio
async def test_ai_post_requires_admin(ai_env):
    """The write surface fails closed too — mirrors module_config POST (:1228-1230)."""
    req = admin_req_with(ai_env, {"provider": "groq", "api_key": _SECRET})
    req.app["hass_user"] = SimpleNamespace(is_admin=False)
    resp = await ai_env.view.post(req, "box1")
    assert resp.status == 403


@pytest.mark.asyncio
async def test_ai_state_never_returns_the_key(ai_env, monkeypatch):
    async def _fake_verify(self):
        return True

    monkeypatch.setattr(
        api_module.OpenAiCompatBackend, "async_verify_key", _fake_verify)

    await ai_env.view.post(
        admin_req_with(ai_env, {"provider": "groq", "api_key": _SECRET}), "box1")
    resp = await ai_env.view.get(admin_req(ai_env), "box1")

    body = json.loads(resp.text)
    assert set(body) == {"provider", "key_set", "verified"}
    assert body["provider"] == "groq" and body["key_set"] is True
    assert "api_key" not in resp.text
    assert _SECRET not in resp.text and "gsk_" not in resp.text


@pytest.mark.asyncio
async def test_verify_key_rejects_a_wrong_prefix_without_calling_out(ai_env, monkeypatch):
    """Cheap local check first — SCOPE-REVISION #7 documents the prefixes."""
    called = []

    async def _boom(self):
        called.append(1)
        return True

    monkeypatch.setattr(api_module.OpenAiCompatBackend, "async_verify_key", _boom)

    resp = await ai_env.view.post(
        admin_req_with(ai_env, {"provider": "groq", "api_key": "nvapi-x"}), "box1")

    assert resp.status == 400
    assert "prefix" in json.loads(resp.text)["error"]
    assert called == [], "a malformed key must not reach the provider"


@pytest.mark.asyncio
async def test_ai_key_never_lands_in_entry_options(ai_env, monkeypatch):
    """P2, at the REST boundary: the write path must not leak into options."""
    async def _ok(self):
        return True

    monkeypatch.setattr(api_module.OpenAiCompatBackend, "async_verify_key", _ok)

    await ai_env.view.post(
        admin_req_with(ai_env, {"provider": "groq", "api_key": _SECRET}), "box1")

    assert _SECRET not in str(ai_env.entry.options)
    assert "gsk_" not in str(ai_env.entry.options)
