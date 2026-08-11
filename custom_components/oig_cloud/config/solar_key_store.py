"""Solar credential, proof, and per-entry transaction primitives."""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import secrets
import time
from copy import deepcopy
from collections.abc import Callable
from typing import Any, Dict, Mapping, Optional

from homeassistant.helpers.storage import Store

from ..forecast.provider_contract import serialize_effective_solar_dto

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
_TRANSACTION_DATA_KEY = "_oig_cloud_solar_transactions"
_PROOF_DATA_KEY = "_oig_cloud_solar_proofs"
_PROOF_TTL_SECONDS = 300.0
INITIAL_CREDENTIALS_TOKEN_FIELD = "_solar_credentials_setup_token"
_INITIAL_CREDENTIALS_STORE_PREFIX = "oig_cloud.solar_initial_"


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
            revision = self._data.get("revision")
            if not isinstance(revision, int) or isinstance(revision, bool) or revision < 0:
                self._data["revision"] = 0
            verification = self._data.get("verification")
            if not isinstance(verification, dict):
                active = self._data.get("active")
                self._data["verification"] = {
                    "status": (
                        "verified"
                        if isinstance(active, dict) and active.get("verified_at")
                        else "unverified"
                    )
                }
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
        await self.async_activate(provider, candidate, verified_at=verified_at)
        _LOGGER.debug("Solar candidate promoted for provider %s", provider)
        return True

    async def async_activate(
        self,
        provider: str,
        credentials: Mapping[str, Any],
        *,
        verified_at: Optional[str],
    ) -> int:
        """Atomically activate one provider and advance the additive revision once."""
        cleaned = _clean_credentials(provider, credentials)
        data = await self._async_data()
        revision = int(data.get("revision", 0)) + 1
        active: Dict[str, Any] = {"provider": provider, **cleaned}
        verification: Dict[str, Any] = {"status": "unverified"}
        if verified_at:
            active["verified_at"] = verified_at
            verification = {"status": "verified", "verified_at": verified_at}
        data.update(
            {
                "active": active,
                "candidates": {},
                "revision": revision,
                "verification": verification,
            }
        )
        await self._store.async_save(data)
        _LOGGER.debug("Solar credentials activated for provider %s", provider)
        return revision

    async def async_snapshot(self) -> Dict[str, Any]:
        """Return an exact private-store snapshot for compensating transactions."""
        return deepcopy(await self._async_data())

    async def async_restore_snapshot(self, snapshot: Mapping[str, Any]) -> None:
        """Restore a previously captured private-store snapshot exactly."""
        self._data = deepcopy(dict(snapshot))
        await self._store.async_save(self._data)

    async def async_revision(self) -> int:
        return int((await self._async_data()).get("revision", 0))

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
            "revision": int(data.get("revision", 0)),
            "verification": deepcopy(data.get("verification", {})),
        }


def get_solar_transaction_lock(hass: Any, entry_id: str) -> asyncio.Lock:
    """Return the shared per-entry proof/credential/options transaction lock."""
    root = getattr(hass, "data", None)
    if not isinstance(root, dict):
        root = {}
        hass.data = root
    locks = root.setdefault(_TRANSACTION_DATA_KEY, {})
    lock = locks.get(entry_id)
    if not isinstance(lock, asyncio.Lock):
        lock = asyncio.Lock()
        locks[entry_id] = lock
    return lock


async def async_stage_initial_credentials(
    hass: Any, provider: str, credentials: Mapping[str, Any]
) -> Optional[str]:
    """Stage first-entry credentials privately behind an opaque setup token."""
    cleaned = _clean_credentials(provider, credentials)
    required = _PROVIDER_FIELDS.get(provider, ())
    if not required or any(key not in cleaned for key in required):
        return None
    token = secrets.token_urlsafe(32)
    pending: Store = Store(
        hass,
        STORAGE_VERSION,
        f"{_INITIAL_CREDENTIALS_STORE_PREFIX}{token}",
        private=True,
    )
    await pending.async_save({"provider": provider, "credentials": cleaned})
    return token


async def async_activate_initial_credentials(hass: Any, entry: Any) -> bool:
    """Claim staged first-entry credentials and remove the public opaque token."""
    token = entry.options.get(INITIAL_CREDENTIALS_TOKEN_FIELD)
    if not isinstance(token, str) or not token:
        return False
    pending: Store = Store(
        hass,
        STORAGE_VERSION,
        f"{_INITIAL_CREDENTIALS_STORE_PREFIX}{token}",
        private=True,
    )
    async with get_solar_transaction_lock(hass, entry.entry_id):
        staged = await pending.async_load()
        if not isinstance(staged, dict):
            return False
        provider = staged.get("provider")
        credentials = staged.get("credentials")
        if not isinstance(provider, str) or not isinstance(credentials, dict):
            return False
        store = SolarKeyStore(hass, entry.entry_id)
        snapshot = await store.async_snapshot()
        try:
            await store.async_activate(provider, credentials, verified_at=None)
            options = dict(entry.options)
            options.pop(INITIAL_CREDENTIALS_TOKEN_FIELD, None)
            hass.config_entries.async_update_entry(entry, options=options)
            await pending.async_remove()
        except Exception:
            await store.async_restore_snapshot(snapshot)
            raise
    return True


class SolarProofStore:
    """In-memory opaque five-minute single-use solar verification proofs."""

    def __init__(
        self,
        hass: Any,
        *,
        now: Callable[[], float] = time.monotonic,
    ) -> None:
        self._hass = hass
        self._now = now
        root = getattr(hass, "data", None)
        if not isinstance(root, dict):
            root = {}
            hass.data = root
        self._proofs: Dict[str, Dict[str, Any]] = root.setdefault(_PROOF_DATA_KEY, {})

    @staticmethod
    def _binding(entry_id: str, dto: Mapping[str, Any]) -> tuple[str, str, str, bytes]:
        return (
            entry_id,
            str(dto.get("solar_forecast_provider", "")),
            str(dto.get("solar_forecast_mode", "")),
            hashlib.sha256(serialize_effective_solar_dto(dto)).digest(),
        )

    async def async_issue(self, entry_id: str, dto: Mapping[str, Any]) -> str:
        async with get_solar_transaction_lock(self._hass, entry_id):
            return self.issue_locked(entry_id, dto)

    def issue_locked(self, entry_id: str, dto: Mapping[str, Any]) -> str:
        self._prune()
        token = secrets.token_urlsafe(32)
        self._proofs[token] = {
            "binding": self._binding(entry_id, dto),
            "expires_at": self._now() + _PROOF_TTL_SECONDS,
        }
        return token

    async def async_claim(
        self, entry_id: str, token: str, dto: Mapping[str, Any]
    ) -> bool:
        async with get_solar_transaction_lock(self._hass, entry_id):
            return self.claim_locked(entry_id, token, dto)

    def claim_locked(self, entry_id: str, token: str, dto: Mapping[str, Any]) -> bool:
        record = self._proofs.pop(token, None)
        if not isinstance(record, dict) or record.get("expires_at", 0) < self._now():
            return False
        expected = record.get("binding")
        actual = self._binding(entry_id, dto)
        if not isinstance(expected, tuple) or len(expected) != len(actual):
            return False
        return all(
            hmac.compare_digest(left, right)
            if isinstance(left, bytes) and isinstance(right, bytes)
            else left == right
            for left, right in zip(expected, actual)
        )

    def _prune(self) -> None:
        now = self._now()
        for token, record in list(self._proofs.items()):
            if not isinstance(record, dict) or record.get("expires_at", 0) < now:
                self._proofs.pop(token, None)
