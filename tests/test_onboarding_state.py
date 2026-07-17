"""SCOPE-REVISION #6: onboarding is a SOFT guide. Nothing here may lock a dashboard."""
from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.onboarding.state import (
    SCHEMA_VERSION,
    OnboardingState,
    is_grandfathered,
)


class _MemStore:
    """Stand-in for homeassistant.helpers.storage.Store."""

    def __init__(self, *_a, **_kw):
        self.saved = None

    async def async_load(self):
        return self.saved

    async def async_save(self, data):
        self.saved = data


@pytest.fixture
def store(monkeypatch):
    monkeypatch.setattr("custom_components.oig_cloud.onboarding.state.Store", _MemStore)
    return OnboardingState(SimpleNamespace(), "entry1")


@pytest.mark.asyncio
async def test_fresh_state_is_versioned_and_all_steps_pending(store):
    state = await store.async_get()
    assert state["schema_version"] == SCHEMA_VERSION
    assert state["steps"] == {"ai": "pending", "solar": "pending", "pricing": "pending"}


@pytest.mark.asyncio
async def test_state_carries_no_lock_or_gate_concept(store):
    """The K1 hard gate is DROPPED — the API must not even express it."""
    state = await store.async_get()
    for banned in ("locked", "gate", "dashboard_locked", "complete_required"):
        assert banned not in state


@pytest.mark.asyncio
async def test_completing_a_step_stamps_it(store):
    await store.async_complete_step("solar")
    state = await store.async_get()
    assert state["steps"]["solar"] == "done"
    assert state["timestamps"]["solar"]


@pytest.mark.asyncio
async def test_steps_are_independent_no_ordering_enforced(store):
    """A user may do ③ before ① — AI is optional (#5)."""
    await store.async_complete_step("pricing")
    state = await store.async_get()
    assert state["steps"]["pricing"] == "done"
    assert state["steps"]["ai"] == "pending"


def test_configured_entry_is_grandfathered_not_gated():
    """D11 as narrowed by #6: an existing user sees a banner, never a wall."""
    assert is_grandfathered({"solar_forecast_provider": "solcast",
                             "solcast_api_key": "k", "solcast_site_id": "s"}) is True
    assert is_grandfathered({}) is False
