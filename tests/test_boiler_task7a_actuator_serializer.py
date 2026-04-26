"""Task 7a tests: core actuator command serializer.

Covers:
- core command DTOs (apply/cancel)
- queue-backed serializer with bounded depth
- serializer lifecycle (start/stop/drain/cancel/observable)
- stale plan_version / config_version rejection
- Store load/save failure handling
- per-source transition rate limiting (5 min window)
- benchmark_only / primary unavailable / alternative unavailable behavior
- consumer exception safe-hold recovery
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any

import pytest

# These imports will fail until production code is written — RED phase.
from custom_components.oig_cloud.boiler.actuator import (
    ActuatorCommand,
    ActuatorCommandPriority,
    ActuatorCommandType,
    ActuatorSerializerState,
    BoilerActuatorSerializer,
    SourceIntent,
)
from custom_components.oig_cloud.boiler.planner_contract import PlannerReasonCode


FIXED_NOW = datetime(2026, 4, 25, 12, 0, tzinfo=timezone.utc)


def _dummy_hass():
    return SimpleNamespace(data={})


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
        entry_id="entry_7a",
        box_id="box_7a",
        command_type=command_type,
        plan_version=plan_version,
        config_version=config_version,
        priority=priority,
        source_intent=source_intent,
        payload=payload or {},
        created_at=FIXED_NOW,
    )


# ---------------------------------------------------------------------------
# Section 1 — Command DTO existence and contracts
# ---------------------------------------------------------------------------

class TestActuatorCommandDTO:
    def test_apply_command_exists(self):
        cmd = _cmd(command_type=ActuatorCommandType.APPLY)
        assert cmd.entry_id == "entry_7a"
        assert cmd.box_id == "box_7a"
        assert cmd.plan_version == 1
        assert cmd.config_version == 1

    def test_cancel_command_exists(self):
        cmd = _cmd(command_type=ActuatorCommandType.CANCEL)
        assert cmd.command_type == ActuatorCommandType.CANCEL

    def test_safety_priority_higher_than_replan(self):
        assert ActuatorCommandPriority.SAFETY.value > ActuatorCommandPriority.CONFIG.value
        assert ActuatorCommandPriority.CONFIG.value > ActuatorCommandPriority.REPLAN.value

    def test_source_intent_enum_values(self):
        assert SourceIntent.PRIMARY.value == "primary"
        assert SourceIntent.ALTERNATIVE.value == "alternative"
        assert SourceIntent.NONE.value == "none"


# ---------------------------------------------------------------------------
# Section 2 — Serializer instantiation and observable state
# ---------------------------------------------------------------------------

class TestSerializerInstantiation:
    def test_serializer_stores_canonical_identity(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        assert ser.entry_id == "e1"
        assert ser.box_id == "b1"

    def test_initial_state_is_idle(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        assert ser.state == ActuatorSerializerState.IDLE

    def test_queue_size_zero_initially(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        assert ser.queue_size == 0


# ---------------------------------------------------------------------------
# Section 3 — Enqueue / bounded queue / priority preservation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestSerializerEnqueue:
    async def test_enqueue_increases_queue_size(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.enqueue(_cmd())
        assert ser.queue_size == 1
        await ser.stop()

    async def test_enqueue_without_start_raises(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        with pytest.raises(RuntimeError):
            await ser.enqueue(_cmd())

    async def test_queue_bounded_at_32(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        for i in range(32):
            ok = await ser.enqueue(_cmd(plan_version=i))
            assert ok is True
        ok = await ser.enqueue(_cmd(plan_version=99))
        assert ok is False
        assert ser.queue_size == 32
        await ser.stop()

    async def test_safety_command_preserved_when_queue_full(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ser._pause_consumer = True
        for i in range(32):
            await ser.enqueue(
                _cmd(plan_version=i, priority=ActuatorCommandPriority.REPLAN)
            )
        ok = await ser.enqueue(
            _cmd(priority=ActuatorCommandPriority.SAFETY, plan_version=99)
        )
        assert ok is True
        assert ser.queue_size == 32
        ser._pause_consumer = False
        await ser.stop()

    async def test_stale_plan_version_rejected(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.enqueue(_cmd(plan_version=5))
        ok, reason = await ser.enqueue_with_reason(_cmd(plan_version=3))
        assert ok is False
        assert "stale" in reason.lower()
        await ser.stop()

    async def test_stale_config_version_rejected(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.enqueue(_cmd(config_version=5))
        ok, reason = await ser.enqueue_with_reason(_cmd(config_version=3))
        assert ok is False
        assert "stale" in reason.lower()
        await ser.stop()

    async def test_newer_version_accepted(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.enqueue(_cmd(plan_version=3))
        ok = await ser.enqueue(_cmd(plan_version=5))
        assert ok is True
        await ser.stop()


# ---------------------------------------------------------------------------
# Section 4 — Consumer lifecycle (start/stop/drain/cancel)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestSerializerLifecycle:
    async def test_start_spawns_consumer_task(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        assert ser.consumer_task is not None
        assert not ser.consumer_task.done()
        await ser.stop()

    async def test_stop_prevents_new_enqueues(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.stop()
        with pytest.raises(RuntimeError):
            await ser.enqueue(_cmd())

    async def test_stop_drains_non_critical_work(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.enqueue(
            _cmd(priority=ActuatorCommandPriority.REPLAN, plan_version=1)
        )
        await ser.stop()
        assert ser.queue_size == 0

    async def test_stop_cancels_consumer_task(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.stop()
        assert ser.consumer_task is None or ser.consumer_task.done()

    async def test_observable_state_transitions(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        assert ser.state == ActuatorSerializerState.IDLE
        await ser.start()
        assert ser.state == ActuatorSerializerState.RUNNING
        await ser.stop()
        assert ser.state == ActuatorSerializerState.STOPPED


# ---------------------------------------------------------------------------
# Section 5 — Consumer exception safe-hold
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestConsumerExceptionHandling:
    async def test_consumer_exception_emits_serializer_error(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ser._inject_consumer_exception = True  # test-only hook
        await ser.enqueue(_cmd())
        await asyncio.sleep(0.05)
        assert PlannerReasonCode.ACTUATOR_SERIALIZER_ERROR in ser.reason_codes
        await ser.stop()

    async def test_consumer_exception_enters_safe_hold(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ser._inject_consumer_exception = True
        await ser.enqueue(_cmd())
        await asyncio.sleep(0.05)
        assert ser.state == ActuatorSerializerState.DEGRADED
        await ser.stop()

    async def test_critical_command_after_exception_not_silently_dropped(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ser._inject_consumer_exception = True
        await ser.enqueue(_cmd())
        await asyncio.sleep(0.05)
        # After exception, new critical commands should still be observable
        ok = await ser.enqueue(
            _cmd(priority=ActuatorCommandPriority.SAFETY, plan_version=2)
        )
        assert ok is True
        await ser.stop()


# ---------------------------------------------------------------------------
# Section 6 — Rate limiting (one on/off per source per 5 minutes)
# ---------------------------------------------------------------------------

class TestRateLimiting:
    def test_rate_limiter_allows_first_transition(self):
        from custom_components.oig_cloud.boiler.actuator import _ActuatorRateLimiter

        lim = _ActuatorRateLimiter(window_seconds=300)
        assert lim.can_transition("primary", True) is True

    def test_rate_limiter_rejects_rapid_conflicting_transition(self):
        from custom_components.oig_cloud.boiler.actuator import _ActuatorRateLimiter

        lim = _ActuatorRateLimiter(window_seconds=300)
        now = FIXED_NOW
        lim.record_transition("primary", True, now)
        assert lim.can_transition("primary", False, now + timedelta(minutes=1)) is False

    def test_rate_limiter_allows_idempotent_duplicate(self):
        from custom_components.oig_cloud.boiler.actuator import _ActuatorRateLimiter

        lim = _ActuatorRateLimiter(window_seconds=300)
        now = FIXED_NOW
        lim.record_transition("primary", True, now)
        assert lim.can_transition("primary", True, now + timedelta(minutes=1)) is True

    def test_rate_limiter_allows_after_window(self):
        from custom_components.oig_cloud.boiler.actuator import _ActuatorRateLimiter

        lim = _ActuatorRateLimiter(window_seconds=300)
        now = FIXED_NOW
        lim.record_transition("primary", True, now)
        assert (
            lim.can_transition("primary", False, now + timedelta(minutes=6)) is True
        )

    def test_rate_limiter_tracks_per_source_independently(self):
        from custom_components.oig_cloud.boiler.actuator import _ActuatorRateLimiter

        lim = _ActuatorRateLimiter(window_seconds=300)
        now = FIXED_NOW
        lim.record_transition("primary", True, now)
        assert lim.can_transition("alternative", False, now + timedelta(minutes=1)) is True


# ---------------------------------------------------------------------------
# Section 7 — Store failure handling
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestStoreFailureHandling:
    async def test_store_load_failure_keeps_in_memory_state(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        ser._store = _FailingStore(mode="load")
        await ser.start()
        assert PlannerReasonCode.STORAGE_WRITE_FAILED in ser.reason_codes
        assert ser.last_successful_state is not None
        await ser.stop()

    async def test_store_save_failure_emits_storage_write_failed(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ser._store = _FailingStore(mode="save")
        await ser.enqueue(_cmd())
        await asyncio.sleep(0.05)
        assert PlannerReasonCode.STORAGE_WRITE_FAILED in ser.reason_codes
        await ser.stop()


# ---------------------------------------------------------------------------
# Section 8 — Source availability behavior
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestSourceAvailability:
    async def test_benchmark_only_never_actuates_alternative(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        await ser.enqueue(
            _cmd(
                source_intent=SourceIntent.ALTERNATIVE,
                payload={"alt_mode": "benchmark_only"},
            )
        )
        await asyncio.sleep(0.05)
        assert ser.last_actuated_source != "alternative"
        await ser.stop()

    async def test_primary_unavailable_emits_reason_and_pauses(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ser._simulate_primary_unavailable = True
        await ser.enqueue(_cmd(source_intent=SourceIntent.PRIMARY))
        await asyncio.sleep(0.05)
        assert PlannerReasonCode.PRIMARY_ACTUATOR_UNAVAILABLE in ser.reason_codes
        await ser.stop()

    async def test_alternative_unavailable_downgrades_to_benchmark_only(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        await ser.start()
        ser._simulate_alternative_unavailable = True
        await ser.enqueue(
            _cmd(
                source_intent=SourceIntent.ALTERNATIVE,
                payload={"alt_mode": "controllable"},
            )
        )
        await asyncio.sleep(0.05)
        assert (
            PlannerReasonCode.ALTERNATIVE_ACTUATOR_UNAVAILABLE_BENCHMARK_ONLY
            in ser.reason_codes
        )
        await ser.stop()


# ---------------------------------------------------------------------------
# Section 9 — Namespaced persistence key
# ---------------------------------------------------------------------------

class TestNamespacedPersistence:
    def test_storage_key_includes_entry_id_and_box_id(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1", hass=_dummy_hass())
        assert "e1" in ser.storage_key
        assert "b1" in ser.storage_key


@pytest.mark.asyncio
class TestProductionStoreDependency:
    async def test_store_factory_receives_non_none_hass_and_canonical_key(self):
        calls = []

        def _factory(hass, version, key):
            calls.append((hass, version, key))
            return _FailingStore(mode="load")

        dummy_hass = SimpleNamespace(data={})
        ser = BoilerActuatorSerializer(
            entry_id="e1", box_id="b1", hass=dummy_hass, store_factory=_factory
        )
        await ser.start()
        await ser.stop()
        assert len(calls) == 1
        hass_arg, version_arg, key_arg = calls[0]
        assert hass_arg is dummy_hass
        assert version_arg == 1
        assert "e1" in key_arg
        assert "b1" in key_arg

    async def test_store_factory_receives_real_hass_from_runtime_factory(self):
        calls = []

        def _factory(hass, version, key):
            calls.append((hass, version, key))
            return _FailingStore(mode="load")

        dummy_hass = SimpleNamespace(data={})
        from custom_components.oig_cloud.boiler.runtime import create_boiler_runtime
        from custom_components.oig_cloud.const import DOMAIN

        dummy_hass.data = {DOMAIN: {}}
        dummy_coordinator = SimpleNamespace(
            config={},
            data={},
            entry_id="entry_test",
            box_id="box_test",
        )
        runtime = create_boiler_runtime(
            hass=dummy_hass,
            coordinator=dummy_coordinator,
            entry_id="entry_test",
            box_id="box_test",
        )
        ser = runtime._serializer
        ser._store_factory = _factory
        await ser.start()
        await ser.stop()
        assert len(calls) == 1
        assert calls[0][0] is dummy_hass

    async def test_production_path_without_hass_emits_storage_write_failed(self):
        ser = BoilerActuatorSerializer(entry_id="e1", box_id="b1")
        await ser.start()
        assert PlannerReasonCode.STORAGE_WRITE_FAILED in ser.reason_codes
        await ser.stop()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _FailingStore:
    """Test double that always raises."""

    def __init__(self, mode: str = "load"):
        self._mode = mode

    async def async_load(self):
        if self._mode == "load":
            raise RuntimeError("store load failure")
        return {}

    async def async_save(self, data):
        if self._mode == "save":
            raise RuntimeError("store save failure")
