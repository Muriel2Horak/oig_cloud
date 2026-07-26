"""SCOPE-REVISION #9: OIG's own OpenAI-compatible backend. K2b: prompts carry no PII."""
from __future__ import annotations

import json

import pytest

from custom_components.oig_cloud.ai.backends import (
    PROMPT_ALLOWED_FIELDS,
    PROVIDERS,
    OpenAiCompatBackend,
    build_anonymous_prompt,
)
from custom_components.oig_cloud.ai.model_cache import LastWorkingModelCache


class _Resp:
    def __init__(self, status=200, payload=None):
        self.status = status
        self._payload = payload or {}

    async def json(self):
        return self._payload

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False


class _Session:
    """Captures the outgoing request so tests can assert on the real body."""
    def __init__(self, resp):
        self._resp = resp
        self.calls = []

    def post(self, url, **kw):
        self.calls.append(("POST", url, kw))
        return self._resp

    def get(self, url, **kw):
        self.calls.append(("GET", url, kw))
        return self._resp


def _backend(session, provider="groq", key="gsk_secret0000000000"):
    return OpenAiCompatBackend(
        session=session, base_url=PROVIDERS[provider]["base_url"],
        api_key=key, models=("test-model",),
    )


def test_providers_are_co_equal_with_no_recommended_default():
    """SCOPE-REVISION #8: Groq restricted a legitimate account — no hard default."""
    assert set(PROVIDERS) == {"groq", "nvidia"}
    for spec in PROVIDERS.values():
        assert "base_url" in spec and "key_prefix" in spec
        assert "recommended" not in spec and "default" not in spec


def test_key_prefixes_match_scope_revision_7():
    assert PROVIDERS["groq"]["key_prefix"] == "gsk_"
    assert PROVIDERS["nvidia"]["key_prefix"] == "nvapi-"


@pytest.mark.asyncio
async def test_generate_data_sends_key_as_bearer_and_returns_parsed_json():
    resp = _Resp(200, {"choices": [{"message": {"content": '{"ok": true}'}}]})
    session = _Session(resp)
    out = await _backend(session).async_generate_data(
        "validate_config", {"capacity_kwh": 15.36}, {"type": "object"})
    assert out == {"ok": True}
    _, _, kw = session.calls[0]
    assert kw["headers"]["Authorization"] == "Bearer gsk_secret0000000000"


@pytest.mark.asyncio
async def test_invalid_json_from_model_raises_not_returns_garbage():
    resp = _Resp(200, {"choices": [{"message": {"content": "I am not JSON"}}]})
    with pytest.raises(RuntimeError, match="all 1 models"):
        await _backend(_Session(resp)).async_generate_data(
            "validate_config", {"capacity_kwh": 1}, {"type": "object"})


@pytest.mark.asyncio
async def test_http_error_is_surfaced_as_a_soft_failure():
    with pytest.raises(RuntimeError):
        await _backend(_Session(_Resp(401, {}))).async_generate_data(
            "validate_config", {"capacity_kwh": 1}, {"type": "object"})


@pytest.mark.asyncio
async def test_verify_key_probes_models_endpoint():
    session = _Session(_Resp(200, {"data": [{"id": "test-model"}]}))
    assert await _backend(session).async_verify_key() is True
    method, url, _ = session.calls[0]
    assert method == "GET" and url.endswith("/models")


@pytest.mark.asyncio
async def test_generate_data_rejects_free_text_task_before_serializing_request_body():
    resp = _Resp(200, {"choices": [{"message": {"content": "{}"}}]})
    session = _Session(resp)
    leaky_task = "validate install at 50.1219800, 13.9373742, Main Street 42"

    with pytest.raises(ValueError, match="unknown AI task"):
        await _backend(session).async_generate_data(
            leaky_task, {"capacity_kwh": 15.36}, {"type": "object"})

    assert session.calls == []


# --- K2b: anonymity is an ALLOW-LIST, asserted against the OUTGOING BODY ------

_INSTALL = {
    "latitude": 50.1219800, "longitude": 13.9373742,
    "box_id": "2206237016", "email": "martin@example.com",
    "entity_id": "sensor.oig_2206237016_batt_batt_comp_p",
    "kwp": 5.4, "capacity_kwh": 15.36, "declination": 10, "azimuth": 138,
}


def _prompt_keys(prompt: str) -> set:
    """The keys actually interpolated into the prompt body."""
    return {
        line.split("=", 1)[0]
        for line in prompt.splitlines()
        if "=" in line and not line.startswith("task=")
    }


def test_every_key_in_the_prompt_is_on_the_allow_list():
    """K2b, the STRUCTURAL assertion: the prompt cannot contain a key nobody
    approved. A denylist would pass a hard-coded-PII test while leaking any
    field added later; this cannot."""
    prompt = build_anonymous_prompt("validate_config", _INSTALL)
    assert _prompt_keys(prompt) <= PROMPT_ALLOWED_FIELDS
    assert _prompt_keys(prompt)  # …and it is not vacuously empty


def test_an_unknown_field_is_DROPPED_not_sent():
    """The regression a denylist cannot catch: a field invented after this code
    was written. 'phone' is on no denylist anywhere — it must still not ship."""
    leaky = dict(_INSTALL, phone="+420777123456",
                 installation_name="Chata Krkonose", customer_id="CUST-99")
    prompt = build_anonymous_prompt("validate_config", leaky)
    assert _prompt_keys(prompt) <= PROMPT_ALLOWED_FIELDS
    for leaked in ("phone", "installation_name", "customer_id",
                   "+420777123456", "Chata Krkonose", "CUST-99"):
        assert leaked not in prompt


def test_the_allow_list_itself_carries_nothing_identifying():
    """Guards the allow-list against a careless future addition."""
    for banned in ("latitude", "longitude", "box_id", "email", "entity_id",
                   "name", "address", "phone", "customer_id"):
        assert banned not in PROMPT_ALLOWED_FIELDS


def test_anonymous_prompt_keeps_the_numbers_and_drops_the_identity():
    prompt = build_anonymous_prompt("validate_config", _INSTALL)
    # the ratios the task actually needs survive…
    assert "5.4" in prompt and "15.36" in prompt
    # …every identifying value is gone (K2b: real values from the fixture)
    for pii in ("50.1219800", "13.9373742", "50.12198", "2206237016",
                "martin@example.com", "sensor.oig_"):
        assert pii not in prompt


@pytest.mark.asyncio
async def test_no_pii_reaches_the_wire():
    """Assert on the REAL request body — F1-DESIGN §10 / codex 'anonymity' finding.

    Drives the LIVE generate path with a raw, unfiltered install mapping (the
    shape ai_task.py's OIG-backend branch would hand over) — NOT a
    pre-anonymized prompt — so this proves the boundary itself enforces the
    allow-list, not merely that build_anonymous_prompt works in isolation.
    Structural, not a PII spot-check: every key on the wire is allow-listed.
    """
    resp = _Resp(200, {"choices": [{"message": {"content": "{}"}}]})
    session = _Session(resp)
    leaky = dict(_INSTALL, phone="+420777123456", customer_id="CUST-99")
    await _backend(session).async_generate_data("validate_config", leaky, {"type": "object"})
    _, _, kw = session.calls[0]
    body = json.dumps(kw["json"])

    sent = kw["json"]["messages"][0]["content"]
    assert _prompt_keys(sent) <= PROMPT_ALLOWED_FIELDS

    for pii in ("50.1219800", "13.9373742", "2206237016", "martin@example.com",
                "sensor.oig_", "+420777123456", "CUST-99"):
        assert pii not in body


# --- Stage C1 Task 2: same-provider failover loop ---------------------------

@pytest.mark.asyncio
async def test_failover_tries_next_model_on_http_error(monkeypatch):
    calls = []

    class _Resp:
        def __init__(self, status, body=None):
            self.status = status
            self._body = body

        async def __aenter__(self): return self

        async def __aexit__(self, *a): return False

        async def json(self): return self._body

    class _Session:
        def post(self, url, headers, json, timeout):
            calls.append(json["model"])
            if json["model"] == "model-a":
                return _Resp(500)
            return _Resp(200, {"choices": [{"message": {"content": '{"ok": true}'}}]})

        def get(self, *a, **kw): raise AssertionError("verify not used here")

    backend = OpenAiCompatBackend(
        session=_Session(), base_url="https://x", api_key="k",
        models=("model-a", "model-b"))
    result = await backend.async_generate_data("validate_config", {"capacity_kwh": 10}, {})
    assert result == {"ok": True}
    assert calls == ["model-a", "model-b"]


@pytest.mark.asyncio
async def test_failover_tries_next_model_on_invalid_json():
    calls = []

    class _Resp:
        def __init__(self, status, body=None):
            self.status = status
            self._body = body

        async def __aenter__(self): return self

        async def __aexit__(self, *a): return False

        async def json(self): return self._body

    class _Session:
        def post(self, url, headers, json, timeout):
            calls.append(json["model"])
            if json["model"] == "model-a":
                return _Resp(200, {"choices": [{"message": {"content": "not json"}}]})
            return _Resp(200, {"choices": [{"message": {"content": '{"ok": true}'}}]})

        def get(self, *a, **kw): raise AssertionError("verify not used here")

    backend = OpenAiCompatBackend(
        session=_Session(), base_url="https://x", api_key="k",
        models=("model-a", "model-b"))
    result = await backend.async_generate_data("validate_config", {"capacity_kwh": 10}, {})
    assert result == {"ok": True}
    assert calls == ["model-a", "model-b"]


@pytest.mark.asyncio
async def test_failover_exhausts_chain_and_raises_classified_error():
    class _Resp:
        def __init__(self, status):
            self.status = status

        async def __aenter__(self): return self

        async def __aexit__(self, *a): return False

        async def json(self): return {}

    class _Session:
        def post(self, url, headers, json, timeout):
            return _Resp(500)

        def get(self, *a, **kw): raise AssertionError("verify not used here")

    backend = OpenAiCompatBackend(
        session=_Session(), base_url="https://x", api_key="k",
        models=("m1", "m2", "m3"))
    with pytest.raises(RuntimeError, match="all 3 models"):
        await backend.async_generate_data("validate_config", {"capacity_kwh": 10}, {})


@pytest.mark.asyncio
async def test_single_model_backend_still_works_shape_compat():
    """A 1-element models tuple behaves like today's single-model backend."""
    resp = _Resp(200, {"choices": [{"message": {"content": '{"ok": true}'}}]})
    session = _Session(resp)
    backend = OpenAiCompatBackend(
        session=session, base_url="https://x", api_key="k",
        models=("single-model",))
    out = await backend.async_generate_data(
        "validate_config", {"capacity_kwh": 15.36}, {"type": "object"})
    assert out == {"ok": True}


@pytest.mark.asyncio
async def test_cached_model_success_refreshes_cache_ttl():
    now = [0.0]
    cache = LastWorkingModelCache(now=lambda: now[0], ttl_seconds=60)
    cache.set("entry1", "groq", "cached-model")
    now[0] = 59.0

    resp = _Resp(200, {"choices": [{"message": {"content": '{"ok": true}'}}]})
    session = _Session(resp)
    backend = OpenAiCompatBackend(
        session=session, base_url="https://x", api_key="k",
        models=("chain-head",), entry_id="entry1", provider="groq",
        model_cache=cache,
    )

    assert await backend.async_generate_data("validate_config", {"capacity_kwh": 10}, {}) == {"ok": True}
    assert session.calls[0][2]["json"]["model"] == "cached-model"

    now[0] = 61.0
    assert cache.get("entry1", "groq") == "cached-model"
