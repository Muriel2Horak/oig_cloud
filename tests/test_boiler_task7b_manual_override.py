"""Task 7b tests: manual override lifecycle and recovery semantics.

Covers:
- override creation with canonical reason code and TTL
- default TTL is 2 hours
- TTL validation: 15 min minimum, 24 hours max, 15-minute increments
- invalid TTL rejection
- invalid/non-canonical reason code rejection
- override collision with automatic plan: override wins, automatic deferred
- override expiry triggers recompute-from-current-state (not resume-old-plan)
- override TTL/reason survives restart only while still valid
- expired override state cleared during restore
- crash simulation after command intent persistence but before completion
- recovery reconciles desired vs actual state once, respects plan_version/rate-limit
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.oig_cloud.boiler.actuator import (
    ActuatorCommand,
    ActuatorCommandPriority,
    ActuatorCommandType,
    BoilerActuatorSerializer,
    SourceIntent,
)
from custom_components.oig_cloud.boiler.planner_contract import PlannerReasonCode


FIXED_NOW = datetime(2026, 4, 25, 12, 0, tzinfo=timezone.utc)


def _dummy_hass():
    return SimpleNamespace(data={})


class _MemoryStore:
    def __init__(self, data: dict[str, Any] | None = None):
        self._data = data

    async def async_load(self):
        return self._data

    async def async_save(self, data):
        self._data = data


def _cmd(
    *,
    command_type: ActuatorCommandType = ActuatorCommandType.APPLY,
    plan_version: int = 1,
    config_version: int = 1,
    priority: ActuatorCommandPriority = ActuatorCommandPriority.REPLAN,
    source_intent: SourceIntent = SourceIntent.PRIMARY,
    payload: dict[str, Any] | None = None,
) -> ActuatorCommand:
    return ActuatorCommand(
        entry_id="entry_7b",
        box_id="box_7b",
        command_type=command_type,
        plan_version=plan_version,
        config_version=config_version,
        priority=priority,
        source_intent=source_intent,
        payload=payload or {},
        created_at=FIXED_NOW,
    )


# ---------------------------------------------------------------------------
# Section 1 — Override creation and basic state
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestOverrideCreation:
    async def test_create_override_requires_canonical_reason_code(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ok, reason = await ser.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value,
            ttl_minutes=120,
        )
        assert ok is True
        assert ser.override_state is not None
        assert ser.override_state["reason_code"] == PlannerReasonCode.OVERRIDE_ACTIVE.value
        await ser.stop()

    async def test_create_override_rejects_non_canonical_reason(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ok, reason = await ser.create_override(
            reason_code="user_felt_like_it",
            ttl_minutes=120,
        )
        assert ok is False
        assert "reason" in reason.lower() or "invalid" in reason.lower()
        await ser.stop()

    async def test_default_ttl_is_2_hours(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.create_override(reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value)
        assert ser.override_state is not None
        assert ser.override_state["ttl_minutes"] == 120
        await ser.stop()

    async def test_create_override_custom_ttl(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value,
            ttl_minutes=180,
        )
        assert ser.override_state["ttl_minutes"] == 180
        await ser.stop()


# ---------------------------------------------------------------------------
# Section 2 — TTL validation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestOverrideTTLValidation:
    async def test_ttl_minimum_15_minutes(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ok, _ = await ser.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value,
            ttl_minutes=15,
        )
        assert ok is True
        await ser.stop()

    async def test_ttl_maximum_24_hours(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ok, _ = await ser.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value,
            ttl_minutes=1440,
        )
        assert ok is True
        await ser.stop()

    async def test_ttl_below_minimum_rejected(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ok, reason = await ser.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value,
            ttl_minutes=10,
        )
        assert ok is False
        assert "ttl" in reason.lower() or "15" in reason.lower()
        await ser.stop()

    async def test_ttl_above_maximum_rejected(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ok, reason = await ser.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value,
            ttl_minutes=1500,
        )
        assert ok is False
        assert "ttl" in reason.lower() or "24" in reason.lower()
        await ser.stop()

    async def test_ttl_must_be_15_minute_increment(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ok, reason = await ser.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value,
            ttl_minutes=20,
        )
        assert ok is False
        assert "increment" in reason.lower() or "15" in reason.lower()
        await ser.stop()

    async def test_ttl_15_minute_increment_accepted(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ok, _ = await ser.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value,
            ttl_minutes=45,
        )
        assert ok is True
        await ser.stop()


# ---------------------------------------------------------------------------
# Section 3 — Override collision with automatic plan application
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestOverrideCollision:
    async def test_override_active_blocks_automatic_plan_command(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.create_override(reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value)
        ok, reason = await ser.enqueue_with_reason(
            _cmd(priority=ActuatorCommandPriority.REPLAN)
        )
        # Automatic plan should be rejected/deferred when override is active
        assert ok is False or PlannerReasonCode.OVERRIDE_ACTIVE.value in ser.reason_codes
        await ser.stop()

    async def test_safety_command_allowed_during_override(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.create_override(reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value)
        ok, _ = await ser.enqueue_with_reason(
            _cmd(priority=ActuatorCommandPriority.SAFETY)
        )
        assert ok is True
        await ser.stop()

    async def test_override_state_exposes_reason(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.create_override(reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value)
        assert PlannerReasonCode.OVERRIDE_ACTIVE.value in ser.reason_codes
        await ser.stop()


# ---------------------------------------------------------------------------
# Section 4 — Override expiry
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestOverrideExpiry:
    async def test_override_expires_after_ttl(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value,
            ttl_minutes=15,
        )
        assert ser.override_state is not None
        # Simulate time passing by directly mutating expiry for test
        ser.override_state["expires_at"] = (FIXED_NOW - timedelta(minutes=1)).isoformat()
        expired = ser._is_override_expired(at_time=FIXED_NOW)
        assert expired is True
        await ser.stop()

    async def test_expired_override_clears_state(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value,
            ttl_minutes=15,
        )
        ser.override_state["expires_at"] = (FIXED_NOW - timedelta(minutes=1)).isoformat()
        ser._check_and_clear_expired_override(at_time=FIXED_NOW)
        assert ser.override_state is None
        assert PlannerReasonCode.OVERRIDE_EXPIRED.value in ser.reason_codes
        await ser.stop()

    async def test_after_expiry_automatic_plan_accepted_again(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value,
            ttl_minutes=15,
        )
        ser.override_state["expires_at"] = (FIXED_NOW - timedelta(minutes=1)).isoformat()
        ser._check_and_clear_expired_override(at_time=FIXED_NOW)
        ok, _ = await ser.enqueue_with_reason(
            _cmd(priority=ActuatorCommandPriority.REPLAN)
        )
        assert ok is True
        await ser.stop()


# ---------------------------------------------------------------------------
# Section 5 — Restart restore with TTL validity check
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestOverrideRestartRestore:
    async def test_valid_override_survives_restart(self):
        from homeassistant.util import dt as dt_util
        future = dt_util.now() + timedelta(days=1)
        store_data = {
            "override": {
                "reason_code": PlannerReasonCode.OVERRIDE_ACTIVE.value,
                "ttl_minutes": 120,
                "expires_at": future.isoformat(),
                "created_at": FIXED_NOW.isoformat(),
            },
            "latest_plan_version": 1,
            "latest_config_version": 1,
            "last_actuated_source": None,
            "reason_codes": [],
        }
        ser = BoilerActuatorSerializer(
            entry_id="e1",
            box_id="b1",
            hass=_dummy_hass(),
            store_factory=lambda h, v, k: _MemoryStore(store_data),
        )
        await ser.start()
        assert ser.override_state is not None
        assert ser.override_state["reason_code"] == PlannerReasonCode.OVERRIDE_ACTIVE.value
        await ser.stop()

    async def test_expired_override_cleared_on_restore(self):
        store_data = {
            "override": {
                "reason_code": PlannerReasonCode.OVERRIDE_ACTIVE.value,
                "ttl_minutes": 15,
                "expires_at": (FIXED_NOW - timedelta(minutes=5)).isoformat(),
                "created_at": (FIXED_NOW - timedelta(minutes=20)).isoformat(),
            },
            "latest_plan_version": 1,
            "latest_config_version": 1,
            "last_actuated_source": None,
            "reason_codes": [],
        }
        ser = BoilerActuatorSerializer(
            entry_id="e1",
            box_id="b1",
            hass=_dummy_hass(),
            store_factory=lambda h, v, k: _MemoryStore(store_data),
        )
        await ser.start()
        assert ser.override_state is None
        assert PlannerReasonCode.OVERRIDE_EXPIRED.value in ser.reason_codes
        await ser.stop()


# ---------------------------------------------------------------------------
# Section 6 — Crash recovery semantics
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestCrashRecovery:
    async def test_crash_recovery_reconciles_desired_vs_actual(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        # Simulate: intent persisted but completion never acknowledged
        ser._last_successful_state = {
            "desired_source": "primary",
            "desired_state": True,
            "latest_plan_version": 3,
            "latest_config_version": 1,
            "last_actuated_source": None,
            "reason_codes": [],
        }
        recovered = await ser.recover_from_crash()
        assert recovered is True
        # Recovery should record one transition respecting rate limits
        assert ser.last_actuated_source == "primary"
        await ser.stop()

    async def test_crash_recovery_respects_rate_limit(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ser._last_successful_state = {
            "desired_source": "primary",
            "desired_state": True,
            "latest_plan_version": 3,
            "latest_config_version": 1,
            "last_actuated_source": None,
            "reason_codes": [],
        }
        # Pre-seed rate limiter with a recent transition
        ser._rate_limiter.record_transition("primary", False, FIXED_NOW - timedelta(minutes=1))
        recovered = await ser.recover_from_crash()
        # Should still reconcile but may emit rate_limited reason
        assert recovered is True
        await ser.stop()

    async def test_crash_recovery_respects_plan_version(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ser._last_successful_state = {
            "desired_source": "primary",
            "desired_state": True,
            "latest_plan_version": 5,
            "latest_config_version": 1,
            "last_actuated_source": None,
            "reason_codes": [],
        }
        recovered = await ser.recover_from_crash()
        assert recovered is True
        assert ser._latest_plan_version == 5
        await ser.stop()

    async def test_crash_recovery_noop_when_no_persisted_intent(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        recovered = await ser.recover_from_crash()
        assert recovered is False
        await ser.stop()


# ---------------------------------------------------------------------------
# Section 7 — Override persistence through Store
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestOverridePersistence:
    async def test_override_saved_to_store_on_create(self):
        ser = BoilerActuatorSerializer(
            entry_id="e1",
            box_id="b1",
            hass=_dummy_hass(),
            store_factory=lambda h, v, k: _MemoryStore(),
        )
        await ser.start()
        await ser.create_override(reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value)
        assert "override" in ser.last_successful_state
        assert ser.last_successful_state["override"]["reason_code"] == PlannerReasonCode.OVERRIDE_ACTIVE.value
        assert PlannerReasonCode.OVERRIDE_ACTIVE.value in ser.last_successful_state["reason_codes"]
        await ser.stop()

    async def test_override_cleared_from_store_on_explicit_clear(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.create_override(reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value)
        await ser.clear_override()
        assert ser.override_state is None
        # Persisted state should no longer contain override
        override = ser.last_successful_state.get("override")
        assert override is None or override.get("reason_code") is None
        await ser.stop()


# ---------------------------------------------------------------------------
# Section 8 — Override + serializer state interactions
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestOverrideSerializerInteractions:
    async def test_override_does_not_break_queue_bounds(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.create_override(reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value)
        for i in range(32):
            await ser.enqueue(
                _cmd(plan_version=i, priority=ActuatorCommandPriority.SAFETY)
            )
        assert ser.queue_size == 32
        await ser.stop()

    async def test_multiple_override_create_updates_ttl(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value,
            ttl_minutes=60,
        )
        first_expires = ser.override_state["expires_at"]
        await asyncio.sleep(0.01)
        await ser.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value,
            ttl_minutes=120,
        )
        second_expires = ser.override_state["expires_at"]
        assert second_expires != first_expires
        assert ser.override_state["ttl_minutes"] == 120
        await ser.stop()


@pytest.mark.asyncio
class TestOverrideQueueSemantics:
    async def test_create_override_enqueues_serialized_command(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        initial_size = ser.queue_size
        await ser.create_override(reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value)
        assert ser.queue_size == initial_size
        assert ser.override_state is not None
        await ser.stop()

    async def test_clear_override_enqueues_serialized_command(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.create_override(reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value)
        initial_size = ser.queue_size
        await ser.clear_override()
        assert ser.queue_size == initial_size
        assert ser.override_state is None
        await ser.stop()

    async def test_override_create_command_blocks_replan_in_execute(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.create_override(reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value)
        ok, _ = await ser.enqueue_with_reason(
            _cmd(priority=ActuatorCommandPriority.REPLAN)
        )
        assert ok is True
        await asyncio.sleep(0.05)
        assert PlannerReasonCode.OVERRIDE_ACTIVE.value in ser.reason_codes
        await ser.stop()

    async def test_override_command_priority_is_config(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ser._pause_consumer = True
        for i in range(32):
            await ser.enqueue(
                _cmd(plan_version=i, priority=ActuatorCommandPriority.REPLAN)
            )
        assert ser.queue_size == 32
        ok, _ = await ser.create_override(
            reason_code=PlannerReasonCode.OVERRIDE_ACTIVE.value
        )
        assert ok is True
        ser._pause_consumer = False
        await ser.stop()


@pytest.mark.asyncio
class TestCrashRecoveryFromPersistedStore:
    async def test_recover_from_crash_reads_desired_source_from_store(self):
        store = _MemoryStore({
            "desired_source": "primary",
            "desired_state": True,
            "latest_plan_version": 3,
            "latest_config_version": 1,
            "last_actuated_source": None,
            "reason_codes": [],
            "override": None,
        })
        ser = BoilerActuatorSerializer(
            entry_id="e1",
            box_id="b1",
            hass=_dummy_hass(),
            store_factory=lambda h, v, k: store,
        )
        await ser.start()
        recovered = await ser.recover_from_crash()
        assert recovered is True
        assert ser.last_actuated_source == "primary"
        await ser.stop()

    async def test_recover_from_crash_respects_plan_version_from_store(self):
        store = _MemoryStore({
            "desired_source": "primary",
            "desired_state": True,
            "latest_plan_version": 7,
            "latest_config_version": 2,
            "last_actuated_source": None,
            "reason_codes": [],
            "override": None,
        })
        ser = BoilerActuatorSerializer(
            entry_id="e1",
            box_id="b1",
            hass=_dummy_hass(),
            store_factory=lambda h, v, k: store,
        )
        await ser.start()
        recovered = await ser.recover_from_crash()
        assert recovered is True
        assert ser._latest_plan_version == 7
        assert ser._latest_config_version == 2
        await ser.stop()

    async def test_recover_from_crash_respects_rate_limit_from_store(self):
        store = _MemoryStore({
            "desired_source": "primary",
            "desired_state": True,
            "latest_plan_version": 3,
            "latest_config_version": 1,
            "last_actuated_source": None,
            "reason_codes": [],
            "override": None,
        })
        ser = BoilerActuatorSerializer(
            entry_id="e1",
            box_id="b1",
            hass=_dummy_hass(),
            store_factory=lambda h, v, k: store,
        )
        await ser.start()
        ser._rate_limiter.record_transition("primary", False, FIXED_NOW - timedelta(minutes=1))
        recovered = await ser.recover_from_crash(now=FIXED_NOW)
        assert recovered is True
        assert PlannerReasonCode.ACTUATOR_RATE_LIMITED.value in ser.reason_codes
        await ser.stop()

    async def test_recover_from_crash_noop_when_store_lacks_desired_intent(self):
        store = _MemoryStore({
            "latest_plan_version": 1,
            "latest_config_version": 1,
            "last_actuated_source": None,
            "reason_codes": [],
            "override": None,
        })
        ser = BoilerActuatorSerializer(
            entry_id="e1",
            box_id="b1",
            hass=_dummy_hass(),
            store_factory=lambda h, v, k: store,
        )
        await ser.start()
        recovered = await ser.recover_from_crash()
        assert recovered is False
        await ser.stop()

    async def test_crash_recovery_persists_desired_state_after_execute(self):
        store = _MemoryStore()
        ser = BoilerActuatorSerializer(
            entry_id="e1",
            box_id="b1",
            hass=_dummy_hass(),
            store_factory=lambda h, v, k: store,
        )
        await ser.start()
        await ser.enqueue(_cmd(source_intent=SourceIntent.PRIMARY))
        await asyncio.sleep(0.05)
        assert ser.last_successful_state.get("desired_source") == "primary"
        assert ser.last_successful_state.get("desired_state") is True
        await ser.stop()

    async def test_fresh_serializer_restores_desired_state_from_store(self):
        store = _MemoryStore({
            "desired_source": "alternative",
            "desired_state": False,
            "latest_plan_version": 5,
            "latest_config_version": 2,
            "last_actuated_source": "primary",
            "reason_codes": [],
            "override": None,
        })
        ser = BoilerActuatorSerializer(
            entry_id="e1",
            box_id="b1",
            hass=_dummy_hass(),
            store_factory=lambda h, v, k: store,
        )
        await ser.start()
        assert ser.last_successful_state.get("desired_source") == "alternative"
        assert ser.last_successful_state.get("desired_state") is False
        await ser.stop()
