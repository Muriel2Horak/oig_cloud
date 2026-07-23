"""Plan 3.5 item 5: OnboardingView surfaces `grandfathered` (GET) and persists a
skip (POST {action: skip}), end-to-end, still admin-gated and fail-closed (#6)."""
from __future__ import annotations

import asyncio
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


class _SlowMemStore(_MemStore):
    entered = asyncio.Event()
    release = asyncio.Event()

    async def async_save(self, data):
        _SlowMemStore.entered.set()
        await _SlowMemStore.release.wait()
        await super().async_save(data)


class _FailingMemStore(_MemStore):
    async def async_save(self, data):
        raise RuntimeError("boom")


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


@pytest.mark.asyncio
async def test_post_finish_preserves_pending_solar_and_sets_finished_at(ob_env):
    await ob_env.view.post(
        DummyJsonRequest(ob_env.hass, payload={"step": "ai"}), "box1"
    )
    await ob_env.view.post(
        DummyJsonRequest(ob_env.hass, payload={"step": "pricing"}), "box1"
    )

    resp = await ob_env.view.post(
        DummyJsonRequest(ob_env.hass, payload={"action": "finish"}), "box1"
    )
    body = json.loads(resp.text)

    assert resp.status == 200
    assert body["steps"] == {"ai": "done", "solar": "pending", "pricing": "done"}
    assert body["finished_at"]

    resp2 = await ob_env.view.get(DummyRequest(ob_env.hass), "box1")
    body2 = json.loads(resp2.text)
    assert body2["steps"] == {"ai": "done", "solar": "pending", "pricing": "done"}
    assert body2["finished_at"] == body["finished_at"]


@pytest.mark.asyncio
async def test_post_finish_rejects_duplicate_in_flight(ob_env, monkeypatch):
    _SlowMemStore.entered = asyncio.Event()
    _SlowMemStore.release = asyncio.Event()
    monkeypatch.setattr(
        "custom_components.oig_cloud.onboarding.state.Store", _SlowMemStore
    )

    first = asyncio.create_task(
        ob_env.view.post(
            DummyJsonRequest(ob_env.hass, payload={"action": "finish"}), "box1"
        )
    )
    await _SlowMemStore.entered.wait()
    second = await ob_env.view.post(
        DummyJsonRequest(ob_env.hass, payload={"action": "finish"}), "box1"
    )
    _SlowMemStore.release.set()
    first_resp = await first

    assert first_resp.status == 200
    assert second.status == 409
    body = json.loads(second.text)
    assert body["code"] == "finish_in_progress"
    assert body["error"] == "finish_in_progress"


@pytest.mark.asyncio
async def test_post_finish_persists_for_grandfathered_settings_launch(ob_env):
    ob_env.entry.options = {
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_api_key": "fs_x",
    }
    await ob_env.view.post(
        DummyJsonRequest(ob_env.hass, payload={"step": "pricing"}), "box1"
    )

    resp = await ob_env.view.post(
        DummyJsonRequest(ob_env.hass, payload={"action": "finish"}), "box1"
    )
    body = json.loads(resp.text)

    assert resp.status == 200
    assert body["grandfathered"] is True
    assert body["steps"]["pricing"] == "done"
    assert body["steps"]["solar"] == "pending"
    assert body["finished_at"]

    resp2 = await ob_env.view.get(DummyRequest(ob_env.hass), "box1")
    body2 = json.loads(resp2.text)
    assert body2["grandfathered"] is True
    assert body2["finished_at"] == body["finished_at"]


@pytest.mark.asyncio
async def test_post_finish_store_failure_is_classified(ob_env, monkeypatch):
    monkeypatch.setattr(
        "custom_components.oig_cloud.onboarding.state.Store", _FailingMemStore
    )

    resp = await ob_env.view.post(
        DummyJsonRequest(ob_env.hass, payload={"action": "finish"}), "box1"
    )
    body = json.loads(resp.text)

    assert resp.status == 503
    assert body["code"] == "finish_save_failed"
    assert body["error"] == "finish_save_failed"
