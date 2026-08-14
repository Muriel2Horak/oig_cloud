"""Persistent-notification seam for the hourly AI-eval LIDSKY summary."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.persistent_notification import (
    async_create as async_create_notification,
)

_LOGGER = logging.getLogger(__name__)

_NOTIFICATION_TITLE = "OIG Cloud AI Eval"


def _stable_notification_id(config_entry: Any) -> str:
    entry_id = getattr(config_entry, "entry_id", None) or "unknown"
    return f"oig_cloud_ai_eval_{entry_id}"


async def publish_eval_notification(
    hass: Any,
    config_entry: Any,
    report_lidsky: str | None,
    notable: bool,
) -> None:
    if not notable:
        return

    if not report_lidsky:
        return

    try:
        async_create_notification(
            hass,
            message=report_lidsky,
            title=_NOTIFICATION_TITLE,
            notification_id=_stable_notification_id(config_entry),
        )
    except Exception:
        _LOGGER.exception("Failed to publish AI-eval notification")
