"""Plan 3.5 item 5: OnboardingView surfaces `grandfathered` (GET) and persists a
skip (POST {action: skip}), end-to-end, still admin-gated and fail-closed (#6)."""
from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.api import ha_rest_api as api_module

# Reuse the canonical request/hass/entry harness (see tests/test_ai_rest.py:14-27).
from tests.test_ha_rest_api_views import (      # noqa: E402
    DummyConfigEntries,
    DummyEntry,
    DummyHass,
    DummyJsonRequest,
    DummyRequest,
)


class _MemStore:
    """Keyed stand-in for homeassistant.helpers.storage.Store.

    POST creates one OnboardingState (→ one Store), GET creates a second with the
    same key; the second must observe what the first saved. Keyed by the Store
    `key` arg like the real Store — mirrors tests/test_ai_rest.py:_MemStore.
    """

    _bucket: dict[str, object] = {}

    def __init__(self, *_a, **_kw):
        # OnboardingState calls Store(hass, version, key, private=True) positionally.
        self._key = _kw.get("key") or (_a[2] if len(_a) >= 3 else "default")
        self.saved = _MemStore._bucket.get(self._key)

    async def async_load(self):
        return self.saved

    async def async_save(self, data):
        self.saved = data
        _MemStore._bucket[self._key] = data


@pytest.fixture
def ob_env(monkeypatch):
    _MemStore._bucket.clear()
    entry = DummyEntry(
        "e1",
        options={"solar_forecast_provider": "solcast",
                 "solcast_api_key": "k", "solcast_site_id": "s"},
    )
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    monkeypatch.setattr(
        "custom_components.oig_cloud.onboarding.state.Store", _MemStore)
    return SimpleNamespace(
        view=api_module.OIGCloudOnboardingView(), hass=hass, entry=entry)


def _non_admin(req):
    req.app["hass_user"] = SimpleNamespace(is_admin=False)
    return req


@pytest.mark.asyncio
async def test_get_requires_admin(ob_env):
    resp = await ob_env.view.get(_non_admin(DummyRequest(ob_env.hass)), "box1")
    assert resp.status == 403


@pytest.mark.asyncio
async def test_post_requires_admin(ob_env):
    req = _non_admin(DummyJsonRequest(ob_env.hass, payload={"step": "solar"}))
    resp = await ob_env.view.post(req, "box1")
    assert resp.status == 403


@pytest.mark.asyncio
async def test_get_surfaces_grandfathered_from_entry_options(ob_env):
    resp = await ob_env.view.get(DummyRequest(ob_env.hass), "box1")
    body = json.loads(resp.text)
    assert body["grandfathered"] is True


@pytest.mark.asyncio
async def test_get_grandfathered_false_without_solar(ob_env):
    ob_env.entry.options = {}
    resp = await ob_env.view.get(DummyRequest(ob_env.hass), "box1")
    body = json.loads(resp.text)
    assert body["grandfathered"] is False


@pytest.mark.asyncio
async def test_post_skip_persists_skipped_status(ob_env):
    req = DummyJsonRequest(ob_env.hass, payload={"step": "solar", "action": "skip"})
    resp = await ob_env.view.post(req, "box1")
    body = json.loads(resp.text)
    assert body["steps"]["solar"] == "skipped"
    assert body["timestamps"]["solar"]

    # And a fresh GET (a second Store instance) observes the persisted skip.
    resp2 = await ob_env.view.get(DummyRequest(ob_env.hass), "box1")
    body2 = json.loads(resp2.text)
    assert body2["steps"]["solar"] == "skipped"


@pytest.mark.asyncio
async def test_post_default_action_completes(ob_env):
    req = DummyJsonRequest(ob_env.hass, payload={"step": "pricing"})
    resp = await ob_env.view.post(req, "box1")
    body = json.loads(resp.text)
    assert body["steps"]["pricing"] == "done"
