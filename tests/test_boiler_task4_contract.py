"""Boiler Planner Contract Tests — Task 4

Contract-first tests covering:
- Alternative-source capability enum semantics
- Canonical reason codes (exact appendix set)
- Planner input DTO normalization and validation
- Price/PV freshness thresholds (current + next 2 slots)
- Battery-derived signal boundary (allowed set only)
- Unsupported actuator downgrade to benchmark_only
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import pytest

from custom_components.oig_cloud.const import (
    CONF_BOILER_DEADLINE_TIME,
    DEFAULT_BOILER_DEADLINE_TIME,
)
from custom_components.oig_cloud.boiler.models import BoilerProfile
from custom_components.oig_cloud.boiler.planner_contract import (
    AlternativeSourceCapability,
    BoilerBatterySignals,
    PlannerInput,
    PlannerReasonCode,
    resolve_alt_source_capability,
    validate_freshness,
)


# ============================================================================
# 1. Alternative-Source Capability Enum
# ============================================================================

class TestAlternativeSourceCapability:
    def test_enum_has_exactly_three_values(self):
        assert len(AlternativeSourceCapability) == 3

    def test_disabled_value(self):
        assert AlternativeSourceCapability.DISABLED == "disabled"

    def test_benchmark_only_value(self):
        assert AlternativeSourceCapability.BENCHMARK_ONLY == "benchmark_only"

    def test_controllable_value(self):
        assert AlternativeSourceCapability.CONTROLLABLE == "controllable"

    def test_no_extra_values(self):
        names = {e.name for e in AlternativeSourceCapability}
        assert names == {"DISABLED", "BENCHMARK_ONLY", "CONTROLLABLE"}

    def test_from_string_valid(self):
        assert AlternativeSourceCapability("disabled") == AlternativeSourceCapability.DISABLED
        assert AlternativeSourceCapability("benchmark_only") == AlternativeSourceCapability.BENCHMARK_ONLY
        assert AlternativeSourceCapability("controllable") == AlternativeSourceCapability.CONTROLLABLE

    def test_from_string_invalid_raises(self):
        with pytest.raises(ValueError):
            AlternativeSourceCapability("unsupported")


# ============================================================================
# 2. Canonical Reason Codes
# ============================================================================

CANONICAL_REASON_CODES = frozenset({
    "comfort_satisfied",
    "comfort_unsatisfied",
    "no_feasible_plan",
    "bootstrap_profile",
    "history_profile_low_confidence",
    "input_stale_price",
    "input_stale_pv",
    "input_missing_recorder",
    "input_adapter_error",
    "input_stale_temperature",
    "top_sensor_unavailable",
    "bottom_sensor_unavailable_top_only_degraded",
    "primary_actuator_unavailable",
    "alternative_actuator_unavailable_benchmark_only",
    "circulation_pump_unavailable",
    "actuator_rate_limited",
    "actuator_serializer_error",
    "override_active",
    "override_expired",
    "planner_timeout",
    "replan_coalesced",
    "source_selected_grid",
    "source_selected_pv",
    "source_selected_alternative",
    "source_benchmark_only",
    "setup_incomplete",
    "migration_required",
    "api_repair_required",
    "storage_write_failed",
    # F3a: demand-target miss indicator
    "demand_target_missed",
})


class TestPlannerReasonCode:
    def test_all_canonical_codes_present(self):
        enum_values = {e.value for e in PlannerReasonCode}
        assert enum_values == CANONICAL_REASON_CODES, (
            f"Missing: {CANONICAL_REASON_CODES - enum_values}, "
            f"Extra: {enum_values - CANONICAL_REASON_CODES}"
        )

    def test_count_is_exactly_30(self):
        # F3a added DEMAND_TARGET_MISSED → 30 codes total
        assert len(PlannerReasonCode) == 30

    def test_from_string_valid(self):
        for code in CANONICAL_REASON_CODES:
            assert PlannerReasonCode(code).value == code

    def test_from_string_unknown_raises(self):
        with pytest.raises(ValueError):
            PlannerReasonCode("unknown_ad_hoc_reason")

    def test_reason_code_used_in_bootstrap_profile(self):
        # BootstrapProfile.degraded_reason must be a canonical code
        code = PlannerReasonCode.BOOTSTRAP_PROFILE
        assert code.value == "bootstrap_profile"

    def test_stale_reason_codes_exist(self):
        assert PlannerReasonCode.INPUT_STALE_PRICE.value == "input_stale_price"
        assert PlannerReasonCode.INPUT_STALE_PV.value == "input_stale_pv"


# ============================================================================
# 3. Planner Input DTO — Validation / Normalization
# ============================================================================

class TestPlannerInput:
    def _make_profile(self) -> BoilerProfile:
        return BoilerProfile(
            category="workday_summer",
            hourly_avg={h: 1.0 for h in range(24)},
            confidence={h: 0.5 for h in range(24)},
        )

    def test_valid_input_constructs(self):
        profile = self._make_profile()
        inp = PlannerInput(
            profile=profile,
            spot_prices={datetime(2026, 4, 25, 12, 0): 2.5},
            overflow_windows=[],
            entry_id="test_entry",
            box_id="12345",
        )
        assert inp.profile is profile
        assert inp.deadline_time == "06:00"
        assert inp.alt_source_capability == AlternativeSourceCapability.DISABLED
        assert inp.entry_id == "test_entry"
        assert inp.box_id == "12345"

    def test_missing_entry_id_raises(self):
        with pytest.raises(ValueError):
            PlannerInput(
                profile=self._make_profile(),
                spot_prices={},
                overflow_windows=[],
                entry_id="",
                box_id="12345",
            )

    def test_missing_box_id_raises(self):
        with pytest.raises(ValueError):
            PlannerInput(
                profile=self._make_profile(),
                spot_prices={},
                overflow_windows=[],
                entry_id="test_entry",
                box_id="",
            )

    def test_missing_profile_raises(self):
        with pytest.raises((ValueError, TypeError)):
            PlannerInput(
                profile=None,  # type: ignore[arg-type]
                spot_prices={},
                overflow_windows=[],
                entry_id="test_entry",
                box_id="12345",
            )

    def test_non_dict_spot_prices_raises(self):
        with pytest.raises(TypeError):
            PlannerInput(
                profile=self._make_profile(),
                spot_prices="not_a_dict",  # type: ignore[arg-type]
                overflow_windows=[],
                entry_id="test_entry",
                box_id="12345",
            )

    def test_non_list_overflow_windows_raises(self):
        with pytest.raises(TypeError):
            PlannerInput(
                profile=self._make_profile(),
                spot_prices={},
                overflow_windows="not_a_list",  # type: ignore[arg-type]
                entry_id="test_entry",
                box_id="12345",
            )

    def test_invalid_deadline_format_raises(self):
        with pytest.raises(ValueError):
            PlannerInput(
                profile=self._make_profile(),
                spot_prices={},
                overflow_windows=[],
                entry_id="test_entry",
                box_id="12345",
                deadline_time="invalid",
            )

    def test_deadline_hours_out_of_range_raises(self):
        with pytest.raises(ValueError):
            PlannerInput(
                profile=self._make_profile(),
                spot_prices={},
                overflow_windows=[],
                entry_id="test_entry",
                box_id="12345",
                deadline_time="25:00",
            )

    def test_deadline_minutes_out_of_range_raises(self):
        with pytest.raises(ValueError):
            PlannerInput(
                profile=self._make_profile(),
                spot_prices={},
                overflow_windows=[],
                entry_id="test_entry",
                box_id="12345",
                deadline_time="06:99",
            )

    def test_deadline_non_numeric_raises(self):
        with pytest.raises(ValueError):
            PlannerInput(
                profile=self._make_profile(),
                spot_prices={},
                overflow_windows=[],
                entry_id="test_entry",
                box_id="12345",
                deadline_time="ab:cd",
            )

    def test_invalid_alt_capability_string_raises(self):
        with pytest.raises(ValueError):
            PlannerInput(
                profile=self._make_profile(),
                spot_prices={},
                overflow_windows=[],
                entry_id="test_entry",
                box_id="12345",
                alt_source_capability="not_a_capability",  # type: ignore[arg-type]
            )

    def test_string_capability_coerced(self):
        inp = PlannerInput(
            profile=self._make_profile(),
            spot_prices={},
            overflow_windows=[],
            entry_id="test_entry",
            box_id="12345",
            alt_source_capability="benchmark_only",  # type: ignore[arg-type]
        )
        assert inp.alt_source_capability == AlternativeSourceCapability.BENCHMARK_ONLY

    def test_default_pv_values(self):
        inp = PlannerInput(
            profile=self._make_profile(),
            spot_prices={},
            overflow_windows=[],
            entry_id="test_entry",
            box_id="12345",
        )
        assert inp.pv_forecast == 0.0
        assert inp.pv_confidence == 0.0

    def test_topology_field_optional(self):
        inp = PlannerInput(
            profile=self._make_profile(),
            spot_prices={},
            overflow_windows=[],
            entry_id="test_entry",
            box_id="12345",
            topology=None,
        )
        assert inp.topology is None

    def test_battery_signals_optional(self):
        inp = PlannerInput(
            profile=self._make_profile(),
            spot_prices={},
            overflow_windows=[],
            entry_id="test_entry",
            box_id="12345",
            battery_signals=None,
        )
        assert inp.battery_signals is None


# ============================================================================
# 4. Freshness Validation
# ============================================================================

class TestFreshnessValidation:
    SLOT_MINUTES = 15

    def _make_input(
        self,
        spot_prices: dict | None = None,
        overflow_windows: list | None = None,
    ) -> PlannerInput:
        profile = BoilerProfile(
            category="workday_summer",
            hourly_avg={h: 1.0 for h in range(24)},
            confidence={h: 0.5 for h in range(24)},
        )
        return PlannerInput(
            profile=profile,
            spot_prices=spot_prices or {},
            overflow_windows=overflow_windows or [],
            entry_id="test_entry",
            box_id="12345",
        )

    def _slot_start(self, now: datetime) -> datetime:
        return now.replace(
            minute=(now.minute // self.SLOT_MINUTES) * self.SLOT_MINUTES,
            second=0,
            microsecond=0,
        )

    def test_fresh_when_all_three_slots_covered(self):
        now = datetime(2026, 4, 25, 12, 7)
        slot0 = self._slot_start(now)
        spot = {
            slot0: 1.0,
            slot0 + timedelta(minutes=15): 2.0,
            slot0 + timedelta(minutes=30): 3.0,
        }
        overflow = [(slot0, slot0 + timedelta(minutes=45))]
        inp = self._make_input(spot_prices=spot, overflow_windows=overflow)
        is_fresh, reasons = validate_freshness(inp, slot_minutes=self.SLOT_MINUTES, now=now)
        assert is_fresh is True
        assert reasons == []

    def test_stale_price_when_current_slot_missing(self):
        now = datetime(2026, 4, 25, 12, 7)
        slot0 = self._slot_start(now)
        spot = {
            slot0 + timedelta(minutes=15): 2.0,
            slot0 + timedelta(minutes=30): 3.0,
        }
        overflow = [(slot0, slot0 + timedelta(minutes=45))]
        inp = self._make_input(spot_prices=spot, overflow_windows=overflow)
        is_fresh, reasons = validate_freshness(inp, slot_minutes=self.SLOT_MINUTES, now=now)
        assert is_fresh is False
        assert PlannerReasonCode.INPUT_STALE_PRICE in reasons

    def test_stale_price_when_second_slot_missing(self):
        now = datetime(2026, 4, 25, 12, 7)
        slot0 = self._slot_start(now)
        spot = {
            slot0: 1.0,
            slot0 + timedelta(minutes=30): 3.0,
        }
        overflow = [(slot0, slot0 + timedelta(minutes=45))]
        inp = self._make_input(spot_prices=spot, overflow_windows=overflow)
        is_fresh, reasons = validate_freshness(inp, slot_minutes=self.SLOT_MINUTES, now=now)
        assert is_fresh is False
        assert PlannerReasonCode.INPUT_STALE_PRICE in reasons

    def test_stale_price_when_third_slot_missing(self):
        now = datetime(2026, 4, 25, 12, 7)
        slot0 = self._slot_start(now)
        spot = {
            slot0: 1.0,
            slot0 + timedelta(minutes=15): 2.0,
        }
        overflow = [(slot0, slot0 + timedelta(minutes=45))]
        inp = self._make_input(spot_prices=spot, overflow_windows=overflow)
        is_fresh, reasons = validate_freshness(inp, slot_minutes=self.SLOT_MINUTES, now=now)
        assert is_fresh is False
        assert PlannerReasonCode.INPUT_STALE_PRICE in reasons

    def test_windows_not_covering_now_are_still_fresh(self):
        """Overflow windows are a schedule of opportunities, not a freshness
        signal (F1): a window later today with none right now is fresh."""
        now = datetime(2026, 4, 25, 12, 7)
        slot0 = self._slot_start(now)
        spot = {
            slot0: 1.0,
            slot0 + timedelta(minutes=15): 2.0,
            slot0 + timedelta(minutes=30): 3.0,
        }
        # Window starts AFTER current slot — perfectly valid forecast.
        overflow = [(slot0 + timedelta(minutes=15), slot0 + timedelta(minutes=45))]
        inp = self._make_input(spot_prices=spot, overflow_windows=overflow)
        is_fresh, reasons = validate_freshness(inp, slot_minutes=self.SLOT_MINUTES, now=now)
        assert is_fresh is True
        assert reasons == []

    def test_only_price_stale_when_both_inputs_empty(self):
        """Empty overflow windows are fresh "no overflow expected" data; only
        the missing prices make the input stale."""
        now = datetime(2026, 4, 25, 12, 7)
        inp = self._make_input(spot_prices={}, overflow_windows=[])
        is_fresh, reasons = validate_freshness(inp, slot_minutes=self.SLOT_MINUTES, now=now)
        assert is_fresh is False
        assert PlannerReasonCode.INPUT_STALE_PRICE in reasons
        assert PlannerReasonCode.INPUT_STALE_PV not in reasons

    def test_empty_overflow_is_fresh(self):
        """Regression: an empty window list must NOT degrade the plan —
        before this fix every night carried INPUT_STALE_PV."""
        now = datetime(2026, 4, 25, 12, 7)
        slot0 = self._slot_start(now)
        spot = {
            slot0: 1.0,
            slot0 + timedelta(minutes=15): 2.0,
            slot0 + timedelta(minutes=30): 3.0,
        }
        inp = self._make_input(spot_prices=spot, overflow_windows=[])
        is_fresh, reasons = validate_freshness(inp, slot_minutes=self.SLOT_MINUTES, now=now)
        assert is_fresh is True
        assert reasons == []


# ============================================================================
# 5. Battery-Derived Signal Boundary
# ============================================================================

class TestBoilerBatterySignals:
    def test_allowed_fields_exact(self):
        assert BoilerBatterySignals.ALLOWED_FIELDS == frozenset({"overflow_windows"})

    def test_from_raw_extracts_only_allowed(self):
        raw = {
            "overflow_windows": [(datetime(2026, 4, 25, 12), datetime(2026, 4, 25, 13))],
            "soc": 85.0,
            "capacity_kwh": 10.24,
            "hw_min_percent": 20.0,
            "intervals": [{"index": 0}],
        }
        signals = BoilerBatterySignals.from_raw(raw)
        assert hasattr(signals, "overflow_windows")
        assert len(signals.overflow_windows) == 1
        # Forbidden internals must NOT leak through
        assert not hasattr(signals, "soc")
        assert not hasattr(signals, "capacity_kwh")
        assert not hasattr(signals, "hw_min_percent")
        assert not hasattr(signals, "intervals")

    def test_from_raw_empty_dict(self):
        signals = BoilerBatterySignals.from_raw({})
        assert signals.overflow_windows == []

    def test_from_raw_rejects_non_dict(self):
        with pytest.raises(TypeError):
            BoilerBatterySignals.from_raw("not_a_dict")

    def test_from_raw_ignores_forbidden_battery_internals(self):
        raw = {
            "current_soc_kwh": 5.0,
            "max_capacity_kwh": 10.24,
            "hw_min_kwh": 2.0,
            "planning_min_percent": 20.0,
            "charge_rate_kw": 2.5,
            "prices": [1.0, 2.0],
            "solar_forecast": [0.5] * 96,
            "load_forecast": [0.3] * 96,
        }
        signals = BoilerBatterySignals.from_raw(raw)
        # Only overflow_windows should be considered
        assert signals.overflow_windows == []

    def test_explicit_constructor_accepts_only_overflow_windows(self):
        signals = BoilerBatterySignals(overflow_windows=[])
        assert signals.overflow_windows == []

    def test_allowed_fields_is_class_constant(self):
        # ALLOWED_FIELDS must be a class-level constant, not overridable per instance
        assert hasattr(BoilerBatterySignals, "ALLOWED_FIELDS")
        assert BoilerBatterySignals.ALLOWED_FIELDS == frozenset({"overflow_windows"})
        # Creating an instance must not allow overriding ALLOWED_FIELDS
        signals = BoilerBatterySignals(overflow_windows=[])
        assert not hasattr(signals, "ALLOWED_FIELDS") or isinstance(
            getattr(type(signals), "ALLOWED_FIELDS", None), frozenset
        )


# ============================================================================
# 6. Unsupported Actuator Downgrade
# ============================================================================

class TestActuatorDowngrade:
    def test_no_alternative_returns_disabled(self):
        result = resolve_alt_source_capability(has_alternative=False)
        assert result == AlternativeSourceCapability.DISABLED

    def test_no_model_returns_benchmark_only(self):
        result = resolve_alt_source_capability(
            has_alternative=True,
            actuator_model=None,
            supported_models={"model_a"},
        )
        assert result == AlternativeSourceCapability.BENCHMARK_ONLY

    def test_unsupported_model_returns_benchmark_only(self):
        result = resolve_alt_source_capability(
            has_alternative=True,
            actuator_model="unsupported_model",
            supported_models={"model_a", "model_b"},
        )
        assert result == AlternativeSourceCapability.BENCHMARK_ONLY

    def test_supported_model_returns_controllable(self):
        result = resolve_alt_source_capability(
            has_alternative=True,
            actuator_model="model_a",
            supported_models={"model_a", "model_b"},
        )
        assert result == AlternativeSourceCapability.CONTROLLABLE

    def test_empty_supported_models_downgrades_everything(self):
        result = resolve_alt_source_capability(
            has_alternative=True,
            actuator_model="any_model",
            supported_models=set(),
        )
        assert result == AlternativeSourceCapability.BENCHMARK_ONLY

    def test_default_supported_models_downgrades(self):
        # When supported_models is None (default), nothing is supported
        result = resolve_alt_source_capability(
            has_alternative=True,
            actuator_model="model_a",
        )
        assert result == AlternativeSourceCapability.BENCHMARK_ONLY


# ============================================================================
# 7. Contract Integration — PlannerInput + Downgrade + Freshness
# ============================================================================

class TestContractIntegration:
    def _make_profile(self) -> BoilerProfile:
        return BoilerProfile(
            category="workday_summer",
            hourly_avg={h: 1.0 for h in range(24)},
            confidence={h: 0.5 for h in range(24)},
        )

    def test_full_contract_pipeline(self):
        now = datetime(2026, 4, 25, 12, 7)
        slot0 = now.replace(minute=0, second=0, microsecond=0)

        # 1. Determine capability (unsupported actuator → benchmark_only)
        capability = resolve_alt_source_capability(
            has_alternative=True,
            actuator_model="legacy_heater",
            supported_models={"smart_heater_v2"},
        )
        assert capability == AlternativeSourceCapability.BENCHMARK_ONLY

        # 2. Sanitize battery signals
        battery_raw = {
            "overflow_windows": [(slot0, slot0 + timedelta(hours=2))],
            "soc": 95.0,
            "prices": [3.0] * 96,
        }
        signals = BoilerBatterySignals.from_raw(battery_raw)

        # 3. Build planner input
        inp = PlannerInput(
            profile=self._make_profile(),
            spot_prices={
                slot0: 1.0,
                slot0 + timedelta(minutes=15): 2.0,
                slot0 + timedelta(minutes=30): 3.0,
            },
            overflow_windows=signals.overflow_windows,
            entry_id="test_entry",
            box_id="12345",
            alt_source_capability=capability,
            alt_cost_kwh=4.0,
            battery_signals=signals,
        )

        # 4. Validate freshness
        is_fresh, reasons = validate_freshness(inp, slot_minutes=15, now=now)
        assert is_fresh is True
        assert reasons == []

    def test_pipeline_with_stale_inputs(self):
        now = datetime(2026, 4, 25, 12, 7)

        capability = resolve_alt_source_capability(
            has_alternative=True,
            actuator_model="smart_heater_v2",
            supported_models={"smart_heater_v2"},
        )
        assert capability == AlternativeSourceCapability.CONTROLLABLE

        inp = PlannerInput(
            profile=self._make_profile(),
            spot_prices={},
            overflow_windows=[],
            entry_id="test_entry",
            box_id="12345",
            alt_source_capability=capability,
        )

        is_fresh, reasons = validate_freshness(inp, slot_minutes=15, now=now)
        assert is_fresh is False
        assert PlannerReasonCode.INPUT_STALE_PRICE in reasons
        # Empty overflow windows are fresh data (F1) — only prices are stale.
        assert PlannerReasonCode.INPUT_STALE_PV not in reasons


class TestRuntimeIdentityPropagation:
    def test_runtime_populates_entry_id_and_box_id(self):
        from types import SimpleNamespace
        from custom_components.oig_cloud.boiler.runtime import BoilerRuntime
        from custom_components.oig_cloud.boiler.planner_contract import PlannerInput

        class LegacyPlannerShouldNotRun:
            def __init__(self):
                self.calls = 0

            async def async_create_plan(self, profile=None, spot_prices=None, overflow_windows=None, deadline_time=None, planner_input=None):
                self.calls += 1
                raise AssertionError("runtime must use plan_comfort_core directly")

            async def async_get_overflow_windows(self, battery_forecast_data):
                return []

        planner = LegacyPlannerShouldNotRun()

        async def _ensure_profile():
            return SimpleNamespace(category="test")

        async def _spot_prices():
            return {}

        async def _overflow_windows():
            return []

        async def _energy_input():
            from custom_components.oig_cloud.boiler.runtime import BoilerEnergyInput

            return BoilerEnergyInput(
                spot_prices={},
                overflow_windows=[],
            )

        runtime = BoilerRuntime(
            hass=SimpleNamespace(),
            read_model=SimpleNamespace(
                get_current_profile=lambda: None,
                get_current_plan=lambda: None,
                async_ensure_profile=_ensure_profile,
            ),
            planner=planner,
            actuator=SimpleNamespace(async_apply_plan=lambda **kwargs: None, async_cancel_plan=lambda **kwargs: None),
            energy_adapter=SimpleNamespace(
                async_get_energy_input=_energy_input,
                get_spot_prices=_spot_prices,
                get_overflow_windows=_overflow_windows,
            ),
            coordinator=SimpleNamespace(config={}),
            box_id="box_42",
            entry_id="entry_99",
        )

        async def _run():
            planner_input = await runtime._async_build_planner_input(
                now=datetime(2026, 4, 25, 12, 7)
            )
            plan = await runtime.async_create_plan(force=True)
            return planner_input, plan

        import asyncio
        planner_input, plan = asyncio.run(_run())

        assert isinstance(planner_input, PlannerInput)
        assert planner_input.entry_id == "entry_99"
        assert planner_input.box_id == "box_42"
        assert plan is not None
        assert planner.calls == 0
        assert runtime.last_plan_result is not None
        assert runtime.last_plan_result.entry_id == "entry_99"
        assert runtime.last_plan_result.box_id == "box_42"
        assert runtime.get_current_plan() is plan


class TestDeadlineTimeNormalization:

    def _make_minimal_runtime(self, deadline_value: Any) -> tuple:
        from types import SimpleNamespace
        from custom_components.oig_cloud.boiler.runtime import BoilerRuntime

        class NoOpPlanner:
            async def async_create_plan(self, **_kw):
                raise AssertionError("runtime must use plan_comfort_core directly")

        planner = NoOpPlanner()

        async def _ensure_profile():
            return SimpleNamespace(category="test")

        async def _energy_input():
            from custom_components.oig_cloud.boiler.runtime import BoilerEnergyInput

            return BoilerEnergyInput(spot_prices={}, overflow_windows=[])

        coordinator = SimpleNamespace(
            config={CONF_BOILER_DEADLINE_TIME: deadline_value}
        )
        runtime = BoilerRuntime(
            hass=SimpleNamespace(),
            read_model=SimpleNamespace(
                async_ensure_profile=_ensure_profile,
                get_current_plan=lambda: None,
            ),
            planner=planner,
            actuator=SimpleNamespace(
                async_apply_plan=lambda **kw: None,
                async_cancel_plan=lambda **kw: None,
            ),
            energy_adapter=SimpleNamespace(
                async_get_energy_input=_energy_input,
                get_spot_prices=lambda: {},
                get_overflow_windows=lambda: [],
            ),
            coordinator=coordinator,
            box_id="box_deadline",
            entry_id="entry_deadline",
        )
        return runtime, planner

    @pytest.mark.asyncio
    async def test_build_planner_input_accepts_time_object_deadline(self):
        from datetime import time
        runtime, _ = self._make_minimal_runtime(time(20, 0))
        planner_input = await runtime._async_build_planner_input(now=datetime(2026, 4, 26, 12, 0))
        assert planner_input is not None
        assert planner_input.deadline_time == "20:00"

    @pytest.mark.asyncio
    async def test_build_planner_input_accepts_plain_hhmm_string(self):
        runtime, _ = self._make_minimal_runtime("20:00")
        planner_input = await runtime._async_build_planner_input(now=datetime(2026, 4, 26, 12, 0))
        assert planner_input is not None
        assert planner_input.deadline_time == "20:00"

    @pytest.mark.asyncio
    async def test_build_planner_input_accepts_hhmm_with_seconds(self):
        runtime, _ = self._make_minimal_runtime("20:00:00")
        planner_input = await runtime._async_build_planner_input(now=datetime(2026, 4, 26, 12, 0))
        assert planner_input is not None
        assert planner_input.deadline_time == "20:00"

    @pytest.mark.asyncio
    async def test_build_planner_input_falls_back_to_default_on_invalid(self):
        runtime, _ = self._make_minimal_runtime("not-a-time")
        default = DEFAULT_BOILER_DEADLINE_TIME
        planner_input = await runtime._async_build_planner_input(now=datetime(2026, 4, 26, 12, 0))
        assert planner_input is not None
        assert planner_input.deadline_time == default
