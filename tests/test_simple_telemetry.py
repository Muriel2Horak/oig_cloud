from __future__ import annotations

import logging

import pytest

from custom_components.oig_cloud.shared.logging import SimpleTelemetry


class DummyResponse:
    def __init__(self, status: int, body: str):
        self.status = status
        self._body = body

    async def text(self):
        return self._body


class DummyRequestContext:
    def __init__(self, response: DummyResponse):
        self._response = response

    async def __aenter__(self):
        return self._response

    async def __aexit__(self, exc_type, exc, tb):
        return False


class DummySession:
    closed = False

    def __init__(self, response: DummyResponse):
        self._response = response

    def post(self, *args, **kwargs):
        return DummyRequestContext(self._response)


@pytest.mark.asyncio
async def test_send_event_logs_info_once_for_expected_4xx(caplog):
    telemetry = SimpleTelemetry("http://example.com", {})
    telemetry.session = DummySession(DummyResponse(403, "forbidden"))

    with caplog.at_level(logging.DEBUG):
        result1 = await telemetry.send_event("change_requested", "svc", {})
        result2 = await telemetry.send_event("change_requested", "svc", {})

    assert result1 is False
    assert result2 is False
    assert "INFO" in caplog.text
    assert "Failed to send change_requested: HTTP 403" in caplog.text


@pytest.mark.asyncio
async def test_send_event_logs_warning_for_unexpected_status(caplog):
    telemetry = SimpleTelemetry("http://example.com", {})
    telemetry.session = DummySession(DummyResponse(500, "boom"))

    with caplog.at_level(logging.WARNING):
        result = await telemetry.send_event("change_requested", "svc", {})

    assert result is False
    assert "Failed to send change_requested: HTTP 500" in caplog.text
