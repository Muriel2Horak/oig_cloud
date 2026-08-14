"""AI provider key storage (F1 DECISIONS P2, SCOPE-REVISION #9).

The key lives in `.storage/oig_cloud.ai_<entry_id>` and NOWHERE else:
never in config-entry options (which are in the diagnostics export and were
historically full-replaced), and never in a log line — only a redacted
fingerprint. The REST surface may only ever learn {provider, key_set, verified}.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from homeassistant.helpers.storage import Store

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 1


def redact_key(raw: Optional[str]) -> str:
    """Fingerprint for logs: keep the provider prefix + last 4 chars only."""
    if not raw or len(raw) < 8:
        return "…"
    prefix, _, _ = raw.partition("_")
    if raw.startswith("nvapi-"):
        prefix = "nvapi-"
        return f"{prefix}…{raw[-4:]}"
    return f"{prefix}_…{raw[-4:]}" if _ else f"…{raw[-4:]}"


class AiKeyStore:
    """Per-entry AI credential store."""

    def __init__(self, hass: Any, entry_id: str) -> None:
        self._store: Store = Store(hass, STORAGE_VERSION, f"oig_cloud.ai_{entry_id}", private=True)
        self._data: Optional[Dict[str, Any]] = None

    async def _async_data(self) -> Dict[str, Any]:
        if self._data is None:
            self._data = (await self._store.async_load()) or {}
        return self._data

    async def async_set_key(self, provider: str, api_key: str) -> None:
        data = await self._async_data()
        data.update({"provider": provider, "api_key": api_key, "verified_at": None})
        await self._store.async_save(data)
        _LOGGER.debug("AI key stored for provider %s", provider)

    async def async_set_fallback(self, provider: str, api_key: str) -> None:
        """Store the cross-provider fallback key, leaving the primary untouched."""
        data = await self._async_data()
        data.update({"fallback_provider": provider, "fallback_api_key": api_key})
        await self._store.async_save(data)
        _LOGGER.debug("AI fallback key stored for provider %s", provider)

    async def async_clear(self) -> None:
        """Delete the per-entry private AI key store."""
        try:
            await self._store.async_remove()
        except FileNotFoundError:
            pass
        self._data = {}
        _LOGGER.debug("AI key store cleared")

    async def async_get_key(self) -> Optional[str]:
        return (await self._async_data()).get("api_key")

    async def async_get_provider(self) -> Optional[str]:
        return (await self._async_data()).get("provider")

    async def async_get_fallback_key(self) -> Optional[str]:
        """Return the separately stored cross-provider fallback key, if any."""
        return (await self._async_data()).get("fallback_api_key")

    async def async_get_fallback_provider(self) -> Optional[str]:
        """Return the separately stored cross-provider fallback provider, if any."""
        return (await self._async_data()).get("fallback_provider")

    async def async_mark_verified(self, verified_at: str) -> None:
        data = await self._async_data()
        data["verified_at"] = verified_at
        await self._store.async_save(data)

    async def async_api_state(self) -> Dict[str, Any]:
        """The ONLY shape the REST layer may return."""
        data = await self._async_data()
        return {
            "provider": data.get("provider"),
            "key_set": bool(data.get("api_key")),
            "verified": bool(data.get("verified_at")),
        }
