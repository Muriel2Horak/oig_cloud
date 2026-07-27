"""Codex CRITICAL #2: every endpoint this plan ADDS is admin-gated and fails closed."""
from __future__ import annotations

import asyncio
import json
import logging
import time
from types import SimpleNamespace

import pytest
import voluptuous as vol

from custom_components.oig_cloud.api import ha_rest_api as api_module
from custom_components.oig_cloud.const import DOMAIN

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
    monkeypatch.setattr(
        api_module.aiohttp_client,
        "async_get_clientsession",
        lambda _hass: None,
    )
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
    assert set(body) == {
        "provider", "key_set", "verified", "status", "last_error_code",
        "next_probe_at",
    }
    assert body["provider"] == "groq" and body["key_set"] is True
    assert body["status"] == "verified"
    assert body["last_error_code"] is None
    assert body["next_probe_at"] is None
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


class _MappingRequest:
    """A request shaped like a REAL Home Assistant request: the authenticated
    user lives on the request MAPPING (request["hass_user"]) as HA's auth
    middleware sets it — NOT on request.app. request.app is the Application and
    carries only "hass". This is the shape the DummyRequest harness did not
    exercise, which is why the admin gate reading request.app alone regressed.
    """

    def __init__(self, hass, user):
        self._state = {"hass_user": user, "hass": hass}
        self.app = {"hass": hass}
        self.query = {}

    def get(self, key, default=None):
        return self._state.get(key, default)

    def __getitem__(self, key):
        return self._state[key]

    async def json(self):
        return {}


@pytest.mark.asyncio
async def test_ai_state_admits_a_real_ha_admin_from_the_request_mapping(ai_env):
    """Regression: a real admin whose user is on request['hass_user'] (not
    request.app) must be ADMITTED, not 403'd. Mirrors module_config POST."""
    admin = SimpleNamespace(is_admin=True)
    resp = await ai_env.view.get(_MappingRequest(ai_env.hass, admin), "box1")
    assert resp.status == 200
    assert "provider" in json.loads(resp.text)


@pytest.mark.asyncio
async def test_ai_state_still_rejects_a_real_ha_non_admin_from_the_mapping(ai_env):
    resp = await ai_env.view.get(
        _MappingRequest(ai_env.hass, SimpleNamespace(is_admin=False)), "box1")
    assert resp.status == 403


@pytest.mark.asyncio
async def test_ai_post_verification_failure_does_not_overwrite_a_verified_key(ai_env, monkeypatch):
    """R11.3: POST /ai writes the key before the verify result is known today,
    so a provider outage destroys a working key. A failed verification (here:
    the probe raises, e.g. a provider outage) must leave the previously stored,
    verified key untouched."""
    async def _ok(self):
        return True

    monkeypatch.setattr(api_module.OpenAiCompatBackend, "async_verify_key", _ok)
    await ai_env.view.post(
        admin_req_with(ai_env, {"provider": "groq", "api_key": _SECRET}), "box1")

    pre_state = json.loads((await ai_env.view.get(admin_req(ai_env), "box1")).text)
    assert pre_state["key_set"] is True and pre_state["verified"] is True

    async def _fail(self):
        raise RuntimeError("provider unreachable")

    monkeypatch.setattr(api_module.OpenAiCompatBackend, "async_verify_key", _fail)
    new_key = "gsk_ANewCandidateKeyThatWillFailToVerify00"
    resp = await ai_env.view.post(
        admin_req_with(ai_env, {"provider": "groq", "api_key": new_key}), "box1")

    assert resp.status == 502

    post_state = json.loads((await ai_env.view.get(admin_req(ai_env), "box1")).text)
    assert post_state["key_set"] is True and post_state["verified"] is True

    store = api_module.AiKeyStore(ai_env.hass, ai_env.entry.entry_id)
    assert await store.async_get_key() == _SECRET


@pytest.mark.asyncio
async def test_ai_post_verify_exception_returns_classified_code_not_raw_detail(
    ai_env, monkeypatch, caplog
):
    """R11.6: API responses get a safe code; raw exception text stays in logs."""
    raw_error = "provider timeout for 50.1219800, 13.9373742, Main Street 42"

    async def _fail(self):
        raise RuntimeError(raw_error)

    monkeypatch.setattr(api_module.OpenAiCompatBackend, "async_verify_key", _fail)

    with caplog.at_level(logging.WARNING, logger=api_module.__name__):
        resp = await ai_env.view.post(
            admin_req_with(ai_env, {"provider": "groq", "api_key": _SECRET}),
            "box1",
        )

    body = json.loads(resp.text)
    assert resp.status == 502
    assert body["code"] == "ai_verify_failed"
    assert "detail" not in body
    assert raw_error not in resp.text
    assert raw_error in caplog.text


@pytest.mark.asyncio
async def test_ai_post_verify_false_returns_classified_code(ai_env, monkeypatch):
    async def _fail(self):
        return False

    monkeypatch.setattr(api_module.OpenAiCompatBackend, "async_verify_key", _fail)

    resp = await ai_env.view.post(
        admin_req_with(ai_env, {"provider": "groq", "api_key": _SECRET}),
        "box1",
    )

    body = json.loads(resp.text)
    assert resp.status == 502
    assert body["code"] == "ai_verify_failed"
    assert "detail" not in body


@pytest.fixture
def validate_env(ai_env):
    ai_env.view = api_module.OIGCloudAiValidateConfigView()
    return ai_env


async def _verified_provider(monkeypatch, provider="groq"):
    async def _state(self):
        return {"provider": provider, "key_set": True, "verified": True}

    async def _key(self):
        return _SECRET

    monkeypatch.setattr(api_module.AiKeyStore, "async_api_state", _state)
    monkeypatch.setattr(api_module.AiKeyStore, "async_get_key", _key)


@pytest.mark.asyncio
async def test_ai_get_status_is_sourced_from_the_sensor_classification(ai_env, monkeypatch):
    async def _state(self):
        return {"provider": "groq", "key_set": True, "verified": False}

    monkeypatch.setattr(api_module.AiKeyStore, "async_api_state", _state)
    ai_env.hass.data[DOMAIN] = {
        ai_env.entry.entry_id: {"ai_last_error_code": "no_credits"}
    }

    resp = await ai_env.view.get(admin_req(ai_env), "box1")

    body = json.loads(resp.text)
    assert body == {
        "provider": "groq",
        "key_set": True,
        "verified": False,
        "status": "no_credits",
        "last_error_code": "no_credits",
        "next_probe_at": None,
    }


@pytest.mark.asyncio
async def test_validate_config_requires_admin(validate_env):
    resp = await validate_env.view.post(non_admin_req(validate_env), "box1")

    assert resp.status == 403
    assert json.loads(resp.text) == {"error": "Admin only"}


@pytest.mark.asyncio
async def test_validate_config_refuses_when_ai_not_verified(validate_env, monkeypatch):
    called = []

    async def _unverified(self):
        return {"provider": "groq", "key_set": True, "verified": False}

    monkeypatch.setattr(api_module.AiKeyStore, "async_api_state", _unverified)

    async def _collect(*args):
        called.append(args)
        return {"capacity_kwh": 10}

    monkeypatch.setattr(api_module, "_collect_anonymous_install", _collect, raising=False)

    resp = await validate_env.view.post(admin_req_with(validate_env, {}), "box1")

    assert resp.status == 200
    assert json.loads(resp.text) == {"ok": False, "code": "ai_not_verified"}
    assert called == []


@pytest.mark.asyncio
async def test_validate_config_collects_only_allow_listed_fields(validate_env, monkeypatch):
    await _verified_provider(monkeypatch)
    validate_env.entry.options.update({
        "capacity_kwh": 13.5,
        "kwp": 7.2,
        "declination": 35,
        "azimuth": -10,
        "battery_comfort_soc_percent": 50,
        "auto_mode_switch_enabled": True,
        "balancing_enabled": True,
        "balancing_interval_days": 14,
        "balancing_hold_hours": 3,
        "cheap_window_percentile": 25,
        "expensive_percentile": 0.8,
        "charge_rate_kw": 2.8,
        "latitude": 50.1,
        "longitude": 14.4,
        "box_id": "123456",
        "email": "user@example.invalid",
    })
    captured = []

    async def _generate(self, task, install, schema):
        captured.append((task, install, schema))
        return {"findings": []}

    monkeypatch.setattr(api_module.OpenAiCompatBackend, "async_generate_data", _generate)

    resp = await validate_env.view.post(admin_req_with(validate_env, {"install": {"gps": 1}}), "box1")

    assert resp.status == 200
    assert set(captured[0][1]).issubset(api_module.PROMPT_ALLOWED_FIELDS)
    assert not {"latitude", "longitude", "box_id", "email"}.intersection(captured[0][1])
    assert captured[0][0] == "validate_config"


@pytest.mark.asyncio
async def test_validate_config_returns_structured_findings(validate_env, monkeypatch):
    await _verified_provider(monkeypatch)

    async def _generate(self, task, install, schema):
        return {"findings": [{"severity": "warning", "message": "capacity is unusual"}]}

    monkeypatch.setattr(api_module.OpenAiCompatBackend, "async_generate_data", _generate)

    resp = await validate_env.view.post(admin_req_with(validate_env, {}), "box1")

    assert resp.status == 200
    assert json.loads(resp.text) == {
        "ok": True,
        "findings": [{"severity": "warning", "message": "capacity is unusual"}],
    }


@pytest.mark.asyncio
async def test_validate_config_route_is_in_auth_matrix_and_returns_403_for_non_admin_consistently_with_missing_box(
    validate_env, monkeypatch,
):
    matrix = open("SCOPE-REVISION.md", encoding="utf-8").read()
    assert "/api/oig_cloud/{box}/ai" in matrix
    assert "/api/oig_cloud/{box}/ai/validate_config" in matrix

    existing = await validate_env.view.post(non_admin_req(validate_env), "box1")
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda _hass, _box: None)
    missing = await validate_env.view.post(non_admin_req(validate_env), "guessed-box")

    assert existing.status == missing.status == 403
    assert existing.text == missing.text


@pytest.mark.asyncio
async def test_validate_config_delegates_via_ai_task_when_that_is_the_configured_provider(
    validate_env, monkeypatch,
):
    await _verified_provider(monkeypatch, provider="ai_task")
    key_lookup = []

    async def _no_key_lookup(self):
        key_lookup.append(True)
        raise AssertionError("ai_task must not read an OpenAI-compatible key")

    monkeypatch.setattr(api_module.AiKeyStore, "async_get_key", _no_key_lookup)
    monkeypatch.setattr(api_module, "PROVIDERS", _NoProviderLookup(), raising=False)
    calls = []

    async def _delegate(hass, entry, structure, install):
        calls.append((hass, entry, structure, install))
        assert isinstance(structure, vol.Schema)
        return {"findings": [{"severity": "info", "message": "looks consistent"}]}

    monkeypatch.setattr(api_module, "_delegate_validate_config_ai_task", _delegate, raising=False)

    resp = await validate_env.view.post(admin_req_with(validate_env, {}), "box1")

    assert resp.status == 200
    assert json.loads(resp.text)["ok"] is True
    assert calls and calls[0][1] is validate_env.entry
    assert key_lookup == []


class _NoProviderLookup:
    def __contains__(self, key):
        return key == "ai_task"

    def __getitem__(self, key):
        raise AssertionError("ai_task must not look up a direct backend provider")


# --- Hard wall-clock budget for validate_config (F1 Unit B) ------------------
# The chain depth at MAX_MODEL_CHAIN_DEPTH models × DEFAULT_TIMEOUT_S (30s) per
# attempt is the worst-case wall-clock budget. The brief's slice spec is a 25s
# HARD cap at the view layer so a slow provider doesn't strand the only user
# surface for the AI feature. These tests pin that contract.

_VALIDATE_CONFIG_BUDGET_S = 25


class _SlowBackend:
    """Stand-in for OpenAiCompatBackend whose async_generate_data sleeps.

    The test ID `self._sleep_s` controls how long the mock blocks so each test
    can switch between "well inside budget" (smoke) and "well over budget"
    (timeout case) without touching the production code.
    """

    def __init__(self, sleep_s: float) -> None:
        self._sleep_s = sleep_s
        self.calls = 0

    async def async_generate_data(self, task, install, schema):
        self.calls += 1
        await asyncio.sleep(self._sleep_s)
        return {"findings": [{"severity": "info", "message": "should not see this"}]}


@pytest.mark.asyncio
async def test_validate_config_returns_ai_timeout_within_budget_when_backend_hangs(
    validate_env, monkeypatch,
):
    """A backend that takes 60s must NOT strand the request — the view caps
    wall-clock at the brief's 25s budget and returns 504 + ``ai_timeout``."""
    await _verified_provider(monkeypatch)
    monkeypatch.setattr(
        api_module.OpenAiCompatBackend, "async_generate_data",
        _SlowBackend(30).async_generate_data,
    )

    started = time.monotonic()
    resp = await validate_env.view.post(
        admin_req_with(validate_env, {}), "box1")
    elapsed = time.monotonic() - started

    assert resp.status == 504
    body = json.loads(resp.text)
    assert body == {"ok": False, "code": "ai_timeout"}
    assert elapsed < _VALIDATE_CONFIG_BUDGET_S + 5, (
        f"view returned in {elapsed:.1f}s, expected <{_VALIDATE_CONFIG_BUDGET_S + 5}s"
    )


@pytest.mark.asyncio
async def test_validate_config_timeout_does_not_double_classify_via_generic_branch(
    validate_env, monkeypatch, caplog,
):
    """The view's existing ``Exception`` branch used to swallow the timeout by
    mapping it to ``error``. The hard-budget wrapper must intercept the
    TimeoutError BEFORE the generic branch and answer with ``ai_timeout`` —
    not ``error``."""
    await _verified_provider(monkeypatch)
    monkeypatch.setattr(
        api_module.OpenAiCompatBackend, "async_generate_data",
        _SlowBackend(30).async_generate_data,
    )

    with caplog.at_level(logging.WARNING, logger=api_module.__name__):
        resp = await validate_env.view.post(
            admin_req_with(validate_env, {}), "box1")

    body = json.loads(resp.text)
    assert resp.status == 504
    assert body["code"] == "ai_timeout"
    assert body["code"] != "error"


@pytest.mark.asyncio
async def test_validate_config_ai_task_path_also_hard_budgets(
    validate_env, monkeypatch,
):
    """The delegation path (provider='ai_task') goes through
    ``_delegate_validate_config_ai_task`` — that call has NO inner timeout
    today, so the brief's wall-clock cap must also bound it."""
    await _verified_provider(monkeypatch, provider="ai_task")
    monkeypatch.setattr(api_module.AiKeyStore, "async_get_key", _no_key_lookup, raising=False)

    async def _slow_delegate(hass, entry, structure, install):
        await asyncio.sleep(30)
        return {"findings": []}

    monkeypatch.setattr(api_module, "_delegate_validate_config_ai_task", _slow_delegate, raising=False)

    started = time.monotonic()
    resp = await validate_env.view.post(
        admin_req_with(validate_env, {}), "box1")
    elapsed = time.monotonic() - started

    assert resp.status == 504
    assert json.loads(resp.text)["code"] == "ai_timeout"
    assert elapsed < _VALIDATE_CONFIG_BUDGET_S + 5


@pytest.mark.asyncio
async def test_validate_config_happy_path_returns_findings_within_budget(
    validate_env, monkeypatch,
):
    """Happy path: a fast backend returning valid findings renders the same
    JSON the FE renders. Re-asserts the existing contract under the new
    wrapper so a regression on the budget never silently drops the success
    path."""
    await _verified_provider(monkeypatch)

    async def _generate(self, task, install, schema):
        return {"findings": [{"severity": "warning", "message": "ok"}]}

    monkeypatch.setattr(api_module.OpenAiCompatBackend, "async_generate_data", _generate)

    started = time.monotonic()
    resp = await validate_env.view.post(
        admin_req_with(validate_env, {}), "box1")
    elapsed = time.monotonic() - started

    assert resp.status == 200
    assert json.loads(resp.text) == {
        "ok": True,
        "findings": [{"severity": "warning", "message": "ok"}],
    }
    assert elapsed < _VALIDATE_CONFIG_BUDGET_S


@pytest.mark.asyncio
async def test_validate_config_logs_start_model_duration_result(
    validate_env, monkeypatch, caplog,
):
    """The view must emit INFO/WARN logs with start, model, duration_ms, result
    so the live hang can be diagnosed from logs. ``validate`` is the only
    user-facing AI feature today."""
    await _verified_provider(monkeypatch)

    async def _generate(self, task, install, schema):
        return {"findings": [{"severity": "info", "message": "ok"}]}

    monkeypatch.setattr(api_module.OpenAiCompatBackend, "async_generate_data", _generate)

    with caplog.at_level(logging.INFO, logger=api_module.__name__):
        resp = await validate_env.view.post(
            admin_req_with(validate_env, {}), "box1")

    assert resp.status == 200
    assert "validate_config" in caplog.text
    assert "duration_ms" in caplog.text
    assert "groq" in caplog.text


async def _no_key_lookup(self):
    raise AssertionError("ai_task must not read an OpenAI-compatible key")
