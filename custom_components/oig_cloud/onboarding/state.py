"""Versioned soft-guide onboarding state (Plan 3 Task 11, K2f).

SCOPE-REVISION #6: onboarding is a SOFT guide. There is NO ``locked`` concept and
nothing here may imply one — an existing user sees a banner, never a wall. The state
holds only ``{schema_version, steps, timestamps, provider, finished_at}``; the four banned keys
("locked", "gate", "dashboard_locked", "complete_required") never appear.

The state persists over the private Home Assistant Store, mirroring the
battery-balancing + AI-key-store convention
(``Store(hass, 1, f"oig_cloud.onboarding_{entry_id}", private=True)`` — see
battery_forecast/balancing/core.py:79-84, ai/key_store.py:35). Steps are INDEPENDENT:
no ordering is enforced, because AI is optional (#5) and a user may finish pricing
before solar.
"""
from __future__ import annotations

import asyncio
import copy
import logging
from typing import Any, Dict, Mapping, Optional

from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)

SCHEMA_VERSION = 1
_FINISH_LOCKS_KEY = "onboarding_finish_locks"

#: The 9 wizard-v2 content steps (F1 Wizard v2 plan, design decision 1).
#: `welcome`/`summary` are FE-only navigation endpoints, never status-tracked
#: here. AI is optional (#5) and steps are unordered. `pricing_supplier_sell`
#: is new (supplier-step redesign, UX-SPEC §3/§4 owner correction round 2):
#: the old combined `pricing_supplier` step split into Nakup ("pricing_supplier",
#: id reused for back-compat with entries that already completed it) and
#: Prodej ("pricing_supplier_sell", new).
ONBOARDING_STEPS = (
    "modules", "ai", "solar", "pricing_distribution", "pricing_supplier",
    "pricing_supplier_sell", "battery", "boiler", "connection",
)


def _fresh_state() -> Dict[str, Any]:
    """A brand-new onboarding state — versioned, every step pending, no gate concept."""
    return {
        "schema_version": SCHEMA_VERSION,
        "steps": {step: "pending" for step in ONBOARDING_STEPS},
        "timestamps": {step: None for step in ONBOARDING_STEPS},
        "provider": None,
        "finished_at": None,
        "banner_dismissed": False,
    }


def _finish_lock_for(hass: Any, entry_id: str) -> asyncio.Lock:
    data = getattr(hass, "data", None)
    if not isinstance(data, dict):
        return asyncio.Lock()
    domain_data = data.setdefault(DOMAIN, {})
    if not isinstance(domain_data, dict):
        domain_data = {}
        data[DOMAIN] = domain_data
    locks = domain_data.setdefault(_FINISH_LOCKS_KEY, {})
    lock = locks.get(entry_id)
    if lock is None:
        lock = asyncio.Lock()
        locks[entry_id] = lock
    return lock


def is_grandfathered(options: Optional[Mapping[str, Any]]) -> bool:
    """True when a solar provider is already chosen AND its credentials are in place.

    D11 as narrowed by SCOPE-REVISION #6: a grandfathered entry is shown a banner,
    never a wall. We look ONLY at the solar provider + its keys — mirrors the
    cross-field validation in config/solar_rules.py:48-59.
    """
    if not isinstance(options, Mapping) or not options:
        return False
    provider = str(options.get("solar_forecast_provider") or "").strip()
    if provider == "solcast":
        return bool(str(options.get("solcast_api_key") or "").strip()) and bool(
            str(options.get("solcast_site_id") or "").strip()
        )
    if provider == "forecast_solar":
        # forecast_solar only requires a key for fast update modes; a configured key
        # is the strongest signal the user already finished onboarding for it.
        return bool(str(options.get("solar_forecast_api_key") or "").strip())
    return False


class OnboardingState:
    """Versioned soft-guide onboarding state over the private Store."""

    def __init__(
        self, hass: Any, entry_id: str, options: Optional[Mapping[str, Any]] = None
    ) -> None:
        self._store: Store = Store(
            hass, SCHEMA_VERSION, f"oig_cloud.onboarding_{entry_id}", private=True
        )
        # The config-entry options are the source of truth for ``grandfathered``
        # (#6 / D11): a user who already chose a solar provider + keys is shown a
        # banner, never a wall. None → not grandfathered (is_grandfathered guards).
        self._options: Optional[Mapping[str, Any]] = options
        self._data: Optional[Dict[str, Any]] = None
        self._finish_lock = _finish_lock_for(hass, entry_id)

    async def _async_data(self) -> Dict[str, Any]:
        if self._data is None:
            loaded = await self._store.async_load()
            # Versioned: a stored state whose schema matches is reused as-is; anything
            # else (absent / older schema / corrupt) is a fresh soft-guide state.
            if isinstance(loaded, dict) and loaded.get("schema_version") == SCHEMA_VERSION:
                self._data = loaded
                # A state persisted before D11 added the banner-dismissal flag
                # lacks the key — default it rather than bumping the schema.
                self._data.setdefault("banner_dismissed", False)
                # A state persisted before the 3-step-to-9-step split still
                # carries the old "pricing" key, which the FE rejects as an
                # unknown step id. Migrate its status onto `pricing_distribution`
                # only if that key is absent (a state that already completed
                # the new split takes precedence); either way `pricing` never
                # survives the load, so the store self-heals on next write.
                legacy_steps = self._data.setdefault("steps", {})
                if "pricing" in legacy_steps:
                    legacy_status = legacy_steps.pop("pricing")
                    if "pricing_distribution" not in legacy_steps:
                        legacy_steps["pricing_distribution"] = legacy_status
                self._data.setdefault("timestamps", {}).pop("pricing", None)
                # A state persisted before the supplier-step split (new
                # "pricing_supplier_sell" step id) lacks it in `steps`/
                # `timestamps` — default it rather than bumping the schema,
                # same established pattern as `banner_dismissed` above.
                for step in ONBOARDING_STEPS:
                    self._data.setdefault("steps", {}).setdefault(step, "pending")
                    self._data.setdefault("timestamps", {}).setdefault(step, None)
            else:
                self._data = _fresh_state()
            # ``grandfathered`` is DERIVED from the live config-entry options and
            # recomputed on every load so it can never go stale (a user who later
            # removes their solar keys stops being grandfathered). It is not a
            # lock/gate — it only selects the banner's "review your config" copy
            # (D11); the banner itself is still shown until ``banner_dismissed``.
            self._data["grandfathered"] = is_grandfathered(self._options)
        return self._data

    async def async_get(self) -> Dict[str, Any]:
        """Return the current onboarding state (read is non-persisting)."""
        return await self._async_data()

    async def async_complete_step(self, step: str) -> Dict[str, Any]:
        """Mark ``step`` done and stamp its timestamp. Steps are independent (no ordering)."""
        if step not in ONBOARDING_STEPS:
            raise ValueError(f"unknown onboarding step: {step!r}")
        data = await self._async_data()
        data["steps"][step] = "done"
        data["timestamps"][step] = dt_util.utcnow().isoformat()
        await self._store.async_save(data)
        _LOGGER.debug("Onboarding step '%s' completed for entry", step)
        return data

    async def async_skip_step(self, step: str) -> Dict[str, Any]:
        """Mark ``step`` skipped and stamp its timestamp (#5: every step skippable).

        Mirrors ``async_complete_step`` but records status ``"skipped"`` — a skip
        is a terminal, user-chosen outcome, not a lock. Steps stay independent.
        """
        if step not in ONBOARDING_STEPS:
            raise ValueError(f"unknown onboarding step: {step!r}")
        data = await self._async_data()
        data["steps"][step] = "skipped"
        data["timestamps"][step] = dt_util.utcnow().isoformat()
        await self._store.async_save(data)
        _LOGGER.debug("Onboarding step '%s' skipped for entry", step)
        return data

    async def async_dismiss_banner(self) -> Dict[str, Any]:
        """Persist that the user closed the migration/review banner (D11).

        Grandfathered users may never want the wizard — this is the only way
        their dismissal survives a reload. Not a gate: the wizard stays
        launchable from Settings regardless (#6).
        """
        data = await self._async_data()
        data["banner_dismissed"] = True
        await self._store.async_save(data)
        _LOGGER.debug("Onboarding banner dismissed for entry")
        return data

    async def async_set_provider(self, provider: str) -> Dict[str, Any]:
        """Record the AI provider chosen during onboarding (AI is optional, #5)."""
        data = await self._async_data()
        data["provider"] = provider
        await self._store.async_save(data)
        return data

    async def async_finish(self) -> Dict[str, Any]:
        """Persist a final checkpoint without changing any per-step status."""
        if self._finish_lock.locked():
            return {"error": "finish_in_progress", "code": "finish_in_progress"}

        async with self._finish_lock:
            current = await self._async_data()
            data = copy.deepcopy(current)
            data["finished_at"] = dt_util.utcnow().isoformat()
            try:
                await self._store.async_save(data)
            except Exception as err:
                _LOGGER.error("Failed to persist onboarding finish: %s", err)
                return {"error": "finish_save_failed", "code": "finish_save_failed"}
            self._data = data
            return data
