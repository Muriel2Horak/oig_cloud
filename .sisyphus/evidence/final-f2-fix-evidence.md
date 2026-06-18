# Final F2 Fix Evidence — Planner Duplication and Slot Adapter

Date: 2026-04-26

## Changes Verified

- `BoilerPlanner.async_create_plan()` now calls `plan_comfort_core()` once and returns `plan_result_to_boiler_plan(...)` instead of computing comfort-core as a discarded side effect.
- Runtime `async_create_plan()` and `async_request_replan()` store the adapted `BoilerPlan` in `_current_plan` and keep `last_plan_result` as the canonical comfort-core metadata source.
- `PlanSlotAction.heating_kwh` maps to `BoilerSlot.avg_consumption_kwh`; `PlanSlotAction.source` maps to `BoilerSlot.recommended_source`.
- `_build_heating_windows()` can consume adapted slots and has a defensive fallback for raw core slot fields.

## RED Evidence

Command:

```bash
pytest tests/test_boiler_task6a_planner_core.py::test_boiler_planner_async_create_plan_returns_adapted_comfort_core_plan tests/test_boiler_task6a_planner_core.py::test_runtime_create_plan_uses_core_and_stores_adapted_plan tests/test_boiler_task6b_multi_source.py::test_plan_result_adapter_maps_heating_and_source_for_actuator_windows tests/test_boiler_task6b_multi_source.py::test_runtime_replan_accepts_required_triggers_and_hands_off_plan_result -q
```

Result before production changes: `4 failed`.

Expected failures observed:
- returned plan total was `0.0` while comfort-core heat was nonzero;
- runtime called the legacy planner double and returned `None`;
- `plan_result_to_boiler_plan` did not exist;
- replan left `runtime.get_current_plan()` as `None`.

## GREEN Evidence

Command:

```bash
pytest tests/test_boiler_task6a_planner_core.py tests/test_boiler_task6b_multi_source.py tests/test_boiler_task7a_actuator_serializer.py tests/test_boiler_task7b_manual_override.py tests/test_boiler_task10_canonical_api.py -q
```

Result: `101 passed, 7 warnings`.

## LSP Evidence

`lsp_diagnostics` returned no diagnostics for:
- `custom_components/oig_cloud/boiler/planner.py`
- `custom_components/oig_cloud/boiler/runtime.py`
- `custom_components/oig_cloud/boiler/actuator.py`
- `tests/test_boiler_task6a_planner_core.py`
- `tests/test_boiler_task6b_multi_source.py`
