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
    assert state["steps"] == {
        "modules": "pending",
        "ai": "pending",
        "solar": "pending",
        "pricing_distribution": "pending",
        "pricing_supplier": "pending",
        "pricing_supplier_sell": "pending",
        "battery": "pending",
        "boiler": "pending",
        "connection": "pending",
    }


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
    await store.async_complete_step("pricing_distribution")
    state = await store.async_get()
    assert state["steps"]["pricing_distribution"] == "done"
    assert state["steps"]["ai"] == "pending"


@pytest.mark.asyncio
async def test_skipping_a_step_stamps_it_skipped(store):
    """#5: every step is skippable — a skip persists status 'skipped' + a timestamp."""
    await store.async_skip_step("pricing_distribution")
    state = await store.async_get()
    assert state["steps"]["pricing_distribution"] == "skipped"
    assert state["timestamps"]["pricing_distribution"]


@pytest.mark.asyncio
async def test_skip_unknown_step_raises(store):
    with pytest.raises(ValueError):
        await store.async_skip_step("nope")


@pytest.mark.asyncio
async def test_skip_and_complete_are_independent(store):
    await store.async_skip_step("ai")
    await store.async_complete_step("solar")
    state = await store.async_get()
    assert state["steps"]["ai"] == "skipped"
    assert state["steps"]["solar"] == "done"
    assert state["steps"]["pricing_distribution"] == "pending"


@pytest.mark.asyncio
async def test_async_get_carries_grandfathered_false_without_solar_options(store):
    """No solar provider/keys → not grandfathered (the fixture passes no options)."""
    state = await store.async_get()
    assert state["grandfathered"] is False


@pytest.mark.asyncio
async def test_async_get_carries_grandfathered_true_from_options(monkeypatch):
    """Solar provider + keys in the entry options → grandfathered True in the state."""
    monkeypatch.setattr(
        "custom_components.oig_cloud.onboarding.state.Store", _MemStore)
    ob = OnboardingState(
        SimpleNamespace(),
        "entry2",
        {"solar_forecast_provider": "solcast",
         "solcast_api_key": "k", "solcast_site_id": "s"},
    )
    state = await ob.async_get()
    assert state["grandfathered"] is True
    # Still a soft guide — no lock/gate concept leaks in alongside the flag.
    for banned in ("locked", "gate", "dashboard_locked", "complete_required"):
        assert banned not in state


def test_configured_entry_is_grandfathered_not_gated():
    """D11 as narrowed by #6: an existing user sees a banner, never a wall."""
    assert is_grandfathered({"solar_forecast_provider": "solcast",
                             "solcast_api_key": "k", "solcast_site_id": "s"}) is True
    assert is_grandfathered({}) is False


def test_onboarding_steps_cover_wizard_v2_content_steps():
    from custom_components.oig_cloud.onboarding.state import ONBOARDING_STEPS
    assert ONBOARDING_STEPS == (
        "modules", "ai", "solar", "pricing_distribution", "pricing_supplier",
        "pricing_supplier_sell", "battery", "boiler", "connection",
    )


@pytest.mark.asyncio
async def test_state_persisted_before_supplier_split_gets_new_step_id_defaulted(monkeypatch):
    """A state saved before `pricing_supplier_sell` existed lacks the key in
    `steps`/`timestamps` — loading it must default it to pending rather than
    KeyError or silently omit it (same pattern as `banner_dismissed`)."""
    from custom_components.oig_cloud.onboarding.state import SCHEMA_VERSION

    old_store = _MemStore()
    old_store.saved = {
        "schema_version": SCHEMA_VERSION,
        "steps": {
            "modules": "done", "ai": "pending", "solar": "pending",
            "pricing_distribution": "pending", "pricing_supplier": "done",
            "battery": "pending", "boiler": "pending", "connection": "pending",
        },
        "timestamps": {"pricing_supplier": "2026-01-01T00:00:00+00:00"},
        "provider": None, "finished_at": None, "banner_dismissed": False,
    }
    monkeypatch.setattr(
        "custom_components.oig_cloud.onboarding.state.Store",
        lambda *_a, **_kw: old_store,
    )
    state = OnboardingState(SimpleNamespace(), "entry1")
    data = await state.async_get()
    assert data["steps"]["pricing_supplier_sell"] == "pending"
    assert data["timestamps"]["pricing_supplier_sell"] is None
    assert data["steps"]["pricing_supplier"] == "done"  # untouched
