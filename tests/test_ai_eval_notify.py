"""Tests for the AI-eval persistent notification seam."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from custom_components.oig_cloud.ai_eval.notify import publish_eval_notification


def _fake_hass():
    return MagicMock()


def _fake_entry(entry_id: str = "abc123"):
    return SimpleNamespace(entry_id=entry_id)


@pytest.mark.asyncio
async def test_notable_true_creates_notification_with_lidsky_body_and_stable_id():
    hass = _fake_hass()
    entry = _fake_entry("abc123")
    lidsky = "Anomálie: přepětí na fázi R, přetížení zálohy."

    with patch(
        "custom_components.oig_cloud.ai_eval.notify.async_create_notification"
    ) as mock_create:
        await publish_eval_notification(hass, entry, lidsky, notable=True)

    mock_create.assert_called_once_with(
        hass,
        message=lidsky,
        title="OIG Cloud AI Eval",
        notification_id="oig_cloud_ai_eval_abc123",
    )


@pytest.mark.asyncio
async def test_notable_false_does_not_create_notification():
    hass = _fake_hass()
    entry = _fake_entry()

    with patch(
        "custom_components.oig_cloud.ai_eval.notify.async_create_notification"
    ) as mock_create:
        await publish_eval_notification(hass, entry, "some report", notable=False)

    mock_create.assert_not_called()


@pytest.mark.asyncio
async def test_empty_report_is_noop():
    hass = _fake_hass()
    entry = _fake_entry()

    with patch(
        "custom_components.oig_cloud.ai_eval.notify.async_create_notification"
    ) as mock_create:
        await publish_eval_notification(hass, entry, "", notable=True)
        await publish_eval_notification(hass, entry, None, notable=True)

    mock_create.assert_not_called()


@pytest.mark.asyncio
async def test_none_config_entry_does_not_raise():
    hass = _fake_hass()

    with patch(
        "custom_components.oig_cloud.ai_eval.notify.async_create_notification"
    ) as mock_create:
        await publish_eval_notification(hass, None, "report", notable=True)

    mock_create.assert_called_once()
    call_kwargs = mock_create.call_args.kwargs
    assert call_kwargs["notification_id"] == "oig_cloud_ai_eval_unknown"
