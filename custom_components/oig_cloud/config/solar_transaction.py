"""Atomic solar provider snapshots and explicit-save activation transaction."""
from __future__ import annotations

import inspect
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Mapping

from ..config_registry import FIELD_REGISTRY
from ..forecast.provider_contract import build_effective_solar_dto
from .solar_key_store import (
    SOLAR_PRIVATE_FIELDS,
    SolarKeyStore,
    SolarProofStore,
    get_solar_transaction_lock,
)


class InvalidSolarProof(ValueError):
    """A supplied proof was unknown, expired, mismatched, or already consumed."""


class SolarTransactionError(RuntimeError):
    """A persistence boundary failed after transaction validation."""


class SolarTransactionConflict(SolarTransactionError):
    """The private credential revision changed after the caller's snapshot."""


_PROVIDER_PRIVATE_FIELDS = {
    "forecast_solar": ("solar_forecast_api_key",),
    "solcast": ("solcast_api_key", "solcast_site_id"),
}


def _selected_provider(
    stored_options: Mapping[str, Any], incoming_patch: Mapping[str, Any]
) -> str:
    return str(
        incoming_patch.get(
            "solar_forecast_provider",
            stored_options.get("solar_forecast_provider", "forecast_solar"),
        )
    )


def solar_credentials_with_legacy_options(
    provider: str,
    stored_options: Mapping[str, Any],
    active_credentials: Mapping[str, Any],
) -> dict[str, Any]:
    """Prefer the private store while retaining pre-store option compatibility."""
    legacy = {
        key: stored_options[key]
        for key in _PROVIDER_PRIVATE_FIELDS.get(provider, ())
        if isinstance(stored_options.get(key), str) and stored_options[key].strip()
    }
    return {**legacy, **dict(active_credentials)}


async def async_solar_dto_snapshot(
    hass: Any,
    entry: Any,
    incoming_patch: Mapping[str, Any],
) -> tuple[dict[str, Any], int]:
    """Capture one immutable effective DTO and credential revision under the lock."""
    dto, _provenance_options, revision = await async_solar_request_snapshot(
        hass,
        entry,
        incoming_patch,
    )
    return dto, revision


async def async_solar_request_snapshot(
    hass: Any,
    entry: Any,
    incoming_patch: Mapping[str, Any],
) -> tuple[dict[str, Any], dict[str, Any], int]:
    """Capture provider DTO and secret-free full provenance from one transaction."""
    async with get_solar_transaction_lock(hass, entry.entry_id):
        stored = deepcopy(dict(entry.options))
        provider = _selected_provider(stored, incoming_patch)
        store = SolarKeyStore(hass, entry.entry_id)
        active = solar_credentials_with_legacy_options(
            provider,
            stored,
            await store.async_get_active(provider) or {},
        )
        dto = build_effective_solar_dto(stored, active, incoming_patch)
        provenance_options = {
            key: deepcopy(value)
            for key, value in stored.items()
            if key not in SOLAR_PRIVATE_FIELDS
        }
        provenance_options.update(
            {
                key: deepcopy(value)
                for key, value in incoming_patch.items()
                if key not in SOLAR_PRIVATE_FIELDS
            }
        )
        return deepcopy(dto), provenance_options, await store.async_revision()


def _merged_options(
    current: Mapping[str, Any], updates: Mapping[str, Any]
) -> dict[str, Any]:
    result = {
        key: value for key, value in current.items() if key not in SOLAR_PRIVATE_FIELDS
    }
    for key, value in updates.items():
        if key in SOLAR_PRIVATE_FIELDS:
            continue
        result[key] = value
        field = FIELD_REGISTRY.get(key)
        if field is not None and field.mirror:
            result[field.mirror] = value
    return result


async def _maybe_await(value: Any) -> Any:
    return await value if inspect.isawaitable(value) else value


async def _reload(hass: Any, entry_id: str) -> None:
    reload_entry = getattr(hass.config_entries, "async_reload", None)
    if callable(reload_entry):
        await _maybe_await(reload_entry(entry_id))


async def async_commit_solar_configuration(
    hass: Any,
    entry: Any,
    updates: Mapping[str, Any],
    private_updates: Mapping[str, Any],
    *,
    proof: str | None,
    expected_revision: int | None = None,
) -> tuple[int, bool]:
    """Activate credentials, update options, reload, or compensate both snapshots."""
    lock = get_solar_transaction_lock(hass, entry.entry_id)
    async with lock:
        old_options = deepcopy(dict(entry.options))
        store = SolarKeyStore(hass, entry.entry_id)
        old_store = await store.async_snapshot()
        current_revision = int(old_store.get("revision", 0))
        if expected_revision is not None and current_revision != expected_revision:
            raise SolarTransactionConflict("solar configuration changed concurrently")
        patch = {**dict(updates), **dict(private_updates)}
        provider = _selected_provider(old_options, patch)
        active = solar_credentials_with_legacy_options(
            provider,
            old_options,
            await store.async_get_active(provider) or {},
        )
        dto = build_effective_solar_dto(old_options, active, patch)

        verified = False
        if proof is not None:
            verified = SolarProofStore(hass).claim_locked(entry.entry_id, proof, dto)
            if not verified:
                raise InvalidSolarProof("invalid solar test proof")

        credentials = {
            key: dto[key]
            for key in SOLAR_PRIVATE_FIELDS
            if isinstance(dto.get(key), str) and dto[key]
        }
        verified_at = (
            datetime.now(timezone.utc).isoformat() if verified else None
        )
        new_options = _merged_options(old_options, updates)

        try:
            revision = await store.async_activate(
                provider,
                credentials,
                verified_at=verified_at,
            )
            await _maybe_await(
                hass.config_entries.async_update_entry(entry, options=new_options)
            )
            await _reload(hass, entry.entry_id)
        except Exception as err:
            compensation_errors: list[Exception] = []
            try:
                await store.async_restore_snapshot(old_store)
            except Exception as compensation_err:  # pragma: no cover - catastrophic Store fault
                compensation_errors.append(compensation_err)
            try:
                await _maybe_await(
                    hass.config_entries.async_update_entry(entry, options=old_options)
                )
            except Exception as compensation_err:  # pragma: no cover - catastrophic HA fault
                compensation_errors.append(compensation_err)
            try:
                await _reload(hass, entry.entry_id)
            except Exception as compensation_err:  # pragma: no cover - catastrophic HA fault
                compensation_errors.append(compensation_err)
            if compensation_errors:
                raise SolarTransactionError("solar transaction compensation failed") from err
            raise SolarTransactionError("solar transaction rolled back") from err

        return revision, verified
