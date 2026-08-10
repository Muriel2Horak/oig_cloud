"""Solar provider credential storage.

Solar credentials live in `.storage/oig_cloud.solar_<entry_id>` and nowhere in
config-entry options. Module config writes candidates; successful `/solar_test`
promotes one candidate to the active provider credentials.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Mapping, Optional

from homeassistant.helpers.storage import Store

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 1
PROVIDER_FORECAST_SOLAR = "forecast_solar"
PROVIDER_SOLCAST = "solcast"
SOLAR_PRIVATE_FIELDS = frozenset(
    {"solar_forecast_api_key", "solcast_api_key", "solcast_site_id"}
)
_PROVIDER_FIELDS = {
    PROVIDER_FORECAST_SOLAR: ("solar_forecast_api_key",),
    PROVIDER_SOLCAST: ("solcast_api_key", "solcast_site_id"),
}


def _redact(raw: Optional[str]) -> str:
    if not raw or len(raw) < 8:
        return "***"
    prefix, sep, _rest = raw.partition("_")
    return f"{prefix}_***{raw[-4:]}" if sep else f"***{raw[-4:]}"


def _clean_credentials(provider: str, credentials: Mapping[str, Any]) -> Dict[str, str]:
    fields = _PROVIDER_FIELDS.get(provider)
    if fields is None:
        raise ValueError(f"unknown solar provider: {provider!r}")
    cleaned: Dict[str, str] = {}
    for key in fields:
        value = credentials.get(key)
        if isinstance(value, str) and value.strip():
            cleaned[key] = value.strip()
    return cleaned


class SolarKeyStore:
    """Per-entry private solar credential store."""

    def __init__(self, hass: Any, entry_id: str) -> None:
        self._store: Store = Store(
            hass, STORAGE_VERSION, f"oig_cloud.solar_{entry_id}", private=True
        )
        self._data: Optional[Dict[str, Any]] = None

    async def _async_data(self) -> Dict[str, Any]:
        if self._data is None:
            loaded = await self._store.async_load()
            self._data = loaded if isinstance(loaded, dict) else {}
            active = self._data.get("active")
            if not isinstance(active, dict):
                self._data["active"] = None
            candidates = self._data.get("candidates")
            if not isinstance(candidates, dict):
                self._data["candidates"] = {}
        return self._data

    async def async_set_candidate(
        self, provider: str, credentials: Mapping[str, Any]
    ) -> None:
        """Persist a provider-specific candidate without touching active credentials."""
        cleaned = _clean_credentials(provider, credentials)
        data = await self._async_data()
        candidates = data.setdefault("candidates", {})
        if cleaned:
            existing = candidates.get(provider)
            if not isinstance(existing, dict):
                existing = {}
            candidates[provider] = {**existing, **cleaned}
        else:
            candidates.pop(provider, None)
        await self._store.async_save(data)
        _LOGGER.debug(
            "Solar candidate stored for provider %s (%s)",
            provider,
            ", ".join(f"{key}={_redact(value)}" for key, value in cleaned.items())
            or "empty",
        )

    async def async_get_candidate(self, provider: str) -> Optional[Dict[str, str]]:
        data = await self._async_data()
        candidate = data.get("candidates", {}).get(provider)
        if not isinstance(candidate, dict):
            return None
        return dict(candidate)

    async def async_promote_candidate(self, provider: str, verified_at: str) -> bool:
        candidate = await self.async_get_candidate(provider)
        if not candidate:
            return False
        data = await self._async_data()
        data["active"] = {
            "provider": provider,
            **candidate,
            "verified_at": verified_at,
        }
        data.setdefault("candidates", {}).pop(provider, None)
        await self._store.async_save(data)
        _LOGGER.debug("Solar candidate promoted for provider %s", provider)
        return True

    async def async_clear_inactive(self, provider: str) -> None:
        """Clear credentials that do not belong to the selected provider."""
        data = await self._async_data()
        changed = False
        active = data.get("active")
        if isinstance(active, dict) and active.get("provider") != provider:
            data["active"] = None
            changed = True
        candidates = data.setdefault("candidates", {})
        for candidate_provider in list(candidates):
            if candidate_provider != provider:
                candidates.pop(candidate_provider, None)
                changed = True
        if changed:
            await self._store.async_save(data)
            _LOGGER.debug("Solar inactive credentials cleared for provider %s", provider)

    async def async_clear(self) -> None:
        """Delete the per-entry private solar credential store."""
        try:
            await self._store.async_remove()
        except FileNotFoundError:
            pass
        self._data = {"active": None, "candidates": {}}
        _LOGGER.debug("Solar key store cleared")

    async def async_get_active(self, provider: str) -> Optional[Dict[str, str]]:
        data = await self._async_data()
        active = data.get("active")
        if not isinstance(active, dict) or active.get("provider") != provider:
            return None
        return {
            key: str(active[key])
            for key in _PROVIDER_FIELDS.get(provider, ())
            if active.get(key)
        }

    async def async_credentials_for_validation(self, provider: str) -> Dict[str, str]:
        credentials = await self.async_get_active(provider) or {}
        candidate = await self.async_get_candidate(provider) or {}
        credentials.update(candidate)
        return credentials

    async def async_private_field_state(self) -> Dict[str, bool]:
        data = await self._async_data()
        state = {f"{key}_set": False for key in SOLAR_PRIVATE_FIELDS}
        active = data.get("active")
        if isinstance(active, dict):
            for key in SOLAR_PRIVATE_FIELDS:
                state[f"{key}_set"] = state[f"{key}_set"] or bool(active.get(key))
        candidates = data.get("candidates")
        if isinstance(candidates, dict):
            for candidate in candidates.values():
                if not isinstance(candidate, dict):
                    continue
                for key in SOLAR_PRIVATE_FIELDS:
                    state[f"{key}_set"] = state[f"{key}_set"] or bool(candidate.get(key))
        return state

    async def async_api_state(self) -> Dict[str, Any]:
        data = await self._async_data()
        active_value = data.get("active")
        active: Dict[str, Any] = active_value if isinstance(active_value, dict) else {}
        return {
            "provider": active.get("provider"),
            **await self.async_private_field_state(),
            "verified": bool(active.get("verified_at")),
        }
