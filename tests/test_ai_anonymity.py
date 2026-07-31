"""Plan 3.5 item 1 — PROMPT-ANONYMITY OUTGOING BOUNDARY (K2b/O2, binding).

Reproduces the reported leak: ai_task.py's OIG-backend branch used to forward
task.instructions (free HA text that can embed GPS, box_id, e-mail, entity_id)
straight into the outgoing HTTP body, bypassing the allow-list entirely. The
fix moves enforcement to the boundary that actually emits the HTTP body:
OpenAiCompatBackend.async_generate_data now takes an install MAPPING and
builds the outgoing content itself via build_anonymous_prompt — there is no
parameter through which raw free text can reach the wire.

This test drives that live generate path with a synthetic fixture carrying
both PII and a genuinely allow-listed number, and asserts on the concrete
literals in the serialized outgoing POST body — the leak is about bytes on
the wire, not about dict membership.
"""
from __future__ import annotations

import json

import pytest

from custom_components.oig_cloud.ai.backends import PROVIDERS, OpenAiCompatBackend


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
    """Captures the outgoing request so the test can assert on the real body."""

    def __init__(self, resp):
        self._resp = resp
        self.calls = []

    def post(self, url, **kw):
        self.calls.append(("POST", url, kw))
        return self._resp

    def get(self, url, **kw):
        self.calls.append(("GET", url, kw))
        return self._resp


# The exact synthetic fixture from the brief: GPS, box_id, e-mail, entity_id —
# every field a future caller might carelessly stuff into free-text
# instructions — plus one genuinely allow-listed number.
_LEAKY_INSTALL = {
    "latitude": 50.0755,
    "longitude": 14.4378,
    "box_id": "OIG-BOX-12345",
    "email": "martin@example.com",
    "entity_id": "sensor.oig_battery",
    "capacity_kwh": 15.36,
}


@pytest.mark.asyncio
async def test_outgoing_boundary_drops_pii_and_keeps_allowlisted_numbers():
    """The proof: live generate path, real POST body, concrete literals."""
    resp = _Resp(200, {"choices": [{"message": {"content": "{}"}}]})
    session = _Session(resp)
    backend = OpenAiCompatBackend(
        session=session, base_url=PROVIDERS["groq"]["base_url"],
        api_key="gsk_secret0000000000", models=("test-model",),
    )

    await backend.async_generate_data(
        "validate_config", _LEAKY_INSTALL, {"type": "object"})

    _, _, kw = session.calls[0]
    body = json.dumps(kw["json"])

    for pii in ("50.0755", "14.4378", "OIG-BOX-12345",
                "martin@example.com", "sensor.oig_battery"):
        assert pii not in body, f"PII literal {pii!r} reached the outgoing body"

    # …and it didn't pass by sending an empty prompt: the allow-listed number
    # the task actually needs is present.
    assert "15.36" in body


@pytest.mark.asyncio
async def test_outgoing_boundary_cannot_be_handed_raw_free_text_as_content():
    """The exact shape of the original defect: a free-text instruction string
    that embeds identifying values, the way task.instructions realistically
    could. There is no parameter for it any more — a caller can only hand
    over a mapping, which is filtered through the allow-list before it is
    ever rendered into a string."""
    resp = _Resp(200, {"choices": [{"message": {"content": "{}"}}]})
    session = _Session(resp)
    backend = OpenAiCompatBackend(
        session=session, base_url=PROVIDERS["nvidia"]["base_url"],
        api_key="nvapi-secret0000000000", models=("test-model",),
    )

    raw_instructions_shaped_leak = {
        "note": "plan for box OIG-BOX-12345 at martin@example.com, sensor.oig_battery",
        "capacity_kwh": 15.36,
    }
    await backend.async_generate_data(
        "validate_config", raw_instructions_shaped_leak, {"type": "object"})

    _, _, kw = session.calls[0]
    body = json.dumps(kw["json"])
    for pii in ("OIG-BOX-12345", "martin@example.com", "sensor.oig_battery", "note"):
        assert pii not in body
    assert "15.36" in body
