"""Versioned soft-guide onboarding state (Plan 3 Task 11, K2f).

SCOPE-REVISION #6: onboarding is a SOFT guide. There is NO ``locked`` concept and
nothing here may imply one — an existing user sees a banner, never a wall. The state
holds only ``{schema_version, steps, timestamps, provider}``; the four banned keys
("locked", "gate", "dashboard_locked", "complete_required") never appear.

The state persists over the private Home Assistant Store, mirroring the
battery-balancing + AI-key-store convention
(``Store(hass, 1, f"oig_cloud.onboarding_{entry_id}", private=True)`` — see
battery_forecast/balancing/core.py:79-84, ai/key_store.py:35). Steps are INDEPENDENT:
no ordering is enforced, because AI is optional (#5) and a user may finish pricing
before solar.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Mapping, Optional

from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)

SCHEMA_VERSION = 1

#: The three independent onboarding steps. AI is optional (#5) and unordered.
ONBOARDING_STEPS = ("ai", "solar", "pricing")


def _fresh_state() -> Dict[str, Any]:
    """A brand-new onboarding state — versioned, every step pending, no gate concept."""
    return {
        "schema_version": SCHEMA_VERSION,
        "steps": {step: "pending" for step in ONBOARDING_STEPS},
        "timestamps": {step: None for step in ONBOARDING_STEPS},
        "provider": None,
    }


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

    def __init__(self, hass: Any, entry_id: str) -> None:
        self._store: Store = Store(
            hass, SCHEMA_VERSION, f"oig_cloud.onboarding_{entry_id}", private=True
        )
        self._data: Optional[Dict[str, Any]] = None

    async def _async_data(self) -> Dict[str, Any]:
        if self._data is None:
            loaded = await self._store.async_load()
            # Versioned: a stored state whose schema matches is reused as-is; anything
            # else (absent / older schema / corrupt) is a fresh soft-guide state.
            if isinstance(loaded, dict) and loaded.get("schema_version") == SCHEMA_VERSION:
                self._data = loaded
            else:
                self._data = _fresh_state()
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

    async def async_set_provider(self, provider: str) -> Dict[str, Any]:
        """Record the AI provider chosen during onboarding (AI is optional, #5)."""
        data = await self._async_data()
        data["provider"] = provider
        await self._store.async_save(data)
        return data
