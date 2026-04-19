"""Backward-compatible API module wrapper.

The canonical implementation lives under ``lib.oig_cloud_client.api``,
but some tests and legacy imports still reference this module path.
"""

from __future__ import annotations

from typing import Any

from ..lib.oig_cloud_client.api.oig_cloud_api import (
    OigCloudApi as _LibOigCloudApi,
    OigCloudApiError,
    OigCloudAuthError,
    OigCloudConnectionError,
    OigCloudTimeoutError,
)


class OigCloudApi(_LibOigCloudApi):
    """Compatibility wrapper preserving the legacy constructor signature."""

    def __init__(
        self,
        username: str,
        password: str,
        no_telemetry: bool,
        hass: Any | None = None,
        timeout: int = 30,
    ) -> None:
        _ = hass
        super().__init__(username, password, no_telemetry, timeout=timeout)


__all__ = [
    "OigCloudApi",
    "OigCloudApiError",
    "OigCloudAuthError",
    "OigCloudConnectionError",
    "OigCloudTimeoutError",
]
