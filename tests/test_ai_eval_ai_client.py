"""Tests for ai_eval/ai_client.py — text-path AI client.

Mirrors the fake-hass style from test_ai_task_wiring.py.
"""
from __future__ import annotations

import json
import sys
import types

import pytest


def _install_shim() -> None:
    if "homeassistant.components.ai_task" not in sys.modules:
        mod = types.ModuleType("homeassistant.components.ai_task")

        class AITaskEntityFeature:
            GENERATE_DATA = 1

        class AITaskEntity:
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


class _FakeStore:
    def __init__(self, provider=None, key=None):
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


class _FakeResponse:
    def __init__(self, status=200, body=None):
        self.status = status
        self._body = body or {"choices": [{"message": {"content": "markdown output"}}]}

    async def json(self):
        return self._body

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass


class _FakeSession:
    def __init__(self, response=None):
        self._response = response or _FakeResponse()
        self.captured_payloads = []

    def post(self, url, headers=None, json=None, timeout=None):
        self.captured_payloads.append(json)
        return self._response

    def get(self, url, headers=None, timeout=None):
        return _FakeResponse(status=200, body={})


class _FakeHass:
    def __init__(self, session=None):
        self._session = session or _FakeSession()
        self.data = {}


def _patch_ai_client(monkeypatch, provider=None, key=None, session=None):
    from custom_components.oig_cloud.ai_eval import ai_client

    session = session or _FakeSession()
    hass = _FakeHass(session)

    monkeypatch.setattr(
        ai_client,
        "AiKeyStore",
        lambda h, entry_id: _FakeStore(provider, key),
    )
    monkeypatch.setattr(
        ai_client, "async_get_clientsession", lambda h: session
    )
    monkeypatch.setattr(
        ai_client, "get_ai_model_cache", lambda h: None
    )

    return hass, session


@pytest.mark.asyncio
async def test_text_path_returns_markdown_not_json(monkeypatch):
    session = _FakeSession(_FakeResponse(body={
        "choices": [{"message": {"content": "# FAKTA\nSome text\n\n## LIDSKY\nMore text"}}]
    }))
    hass, session = _patch_ai_client(
        monkeypatch, provider="nvidia", key="nvapi-secret00000000", session=session
    )

    from custom_components.oig_cloud.ai_eval.ai_client import generate_eval_report

    result = await generate_eval_report(
        hass, _Entry(), "system prompt", "user message"
    )

    assert result == "# FAKTA\nSome text\n\n## LIDSKY\nMore text"
    assert len(session.captured_payloads) == 1
    payload = session.captured_payloads[0]
    assert "response_format" not in payload
    assert payload["messages"] == [
        {"role": "system", "content": "system prompt"},
        {"role": "user", "content": "user message"},
    ]


@pytest.mark.asyncio
async def test_groq_qwen_sets_reasoning_effort_none(monkeypatch):
    session = _FakeSession()
    hass, session = _patch_ai_client(
        monkeypatch, provider="groq", key="gsk_secret0000000000", session=session
    )

    from custom_components.oig_cloud.ai_eval.ai_client import generate_eval_report

    await generate_eval_report(hass, _Entry(), "sys", "msg")

    assert len(session.captured_payloads) >= 1
    payload = session.captured_payloads[0]
    assert payload["model"].startswith("qwen")
    assert payload.get("reasoning_effort") == "none"


@pytest.mark.asyncio
async def test_no_ai_configured_returns_none(monkeypatch):
    hass, _ = _patch_ai_client(monkeypatch, provider=None, key=None)

    from custom_components.oig_cloud.ai_eval.ai_client import generate_eval_report

    result = await generate_eval_report(hass, _Entry(), "sys", "msg")

    assert result is None


@pytest.mark.asyncio
async def test_provider_set_but_no_key_returns_none(monkeypatch):
    hass, _ = _patch_ai_client(monkeypatch, provider="groq", key=None)

    from custom_components.oig_cloud.ai_eval.ai_client import generate_eval_report

    result = await generate_eval_report(hass, _Entry(), "sys", "msg")

    assert result is None


@pytest.mark.asyncio
async def test_privacy_no_identifying_fields_in_request(monkeypatch):
    session = _FakeSession()
    hass, session = _patch_ai_client(
        monkeypatch, provider="groq", key="gsk_secret0000000000", session=session
    )

    from custom_components.oig_cloud.ai_eval.ai_client import generate_eval_report

    await generate_eval_report(hass, _Entry(), "system", "user")

    payload_str = json.dumps(session.captured_payloads[0])
    for field in ("box_id", "serial", "latitude", "longitude"):
        assert field not in payload_str, f"Privacy violation: {field} found in request"

    payload = session.captured_payloads[0]
    for msg in payload["messages"]:
        content = msg["content"]
        assert "name" not in content.lower() or content in ("system", "user")
