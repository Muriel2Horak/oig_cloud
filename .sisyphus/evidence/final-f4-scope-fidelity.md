# F4 Scope Fidelity Check — Rerun After Blocker Fixes

VERDICT: APPROVE

## Scope reviewed

- Previous F4 rejection: `.sisyphus/evidence/final-f4-scope-fidelity.md` old blockers were rechecked against current source.
- Fix evidence: `.sisyphus/evidence/final-f4-blocker-fix.md` lines 20-52.
- Guardrails/notepads: `.sisyphus/plans/boiler-module-redesign.md` Must NOT / denylist / slot-horizon contract sections and `.sisyphus/notepads/boiler-module-redesign/*.md`.
- Current source reads: migration, migration tests, expert config/options tests, V2 app/components/data, translations, services, and Task 13 docs.
- Parallel cross-checks completed: migration safety (`bg_3bf0ed59`), V2 debug UI (`bg_644656d8`), docs/config copy (`bg_c265013b`), and plan guardrails (`bg_567491b4`). All returned PASS for their scoped blocker.

## Previous blockers re-evaluated

### 1. Ambiguous legacy alternative-source migration — RESOLVED

Previous blocker: a legacy config with `boiler_has_alternative_heating=True` but no explicit `boiler_alt_source_mode` could be safe-mapped.

Current evidence:

- `_can_safe_map()` now rejects ambiguous alternative-source capability before checking otherwise-safe keys: `custom_components/oig_cloud/boiler/migration.py` lines 527-536.
- `_has_ambiguous_alt_source_capability()` returns unsafe when `boiler_has_alternative_heating is True` and `boiler_alt_source_mode` is absent; it also rejects invalid modes and `controllable` without a switch: `custom_components/oig_cloud/boiler/migration.py` lines 539-552.
- `_unsafe_legacy_reasons()` records `ambiguous_alt_source:*` and `incomplete_or_ambiguous_config`, causing repair instead of safe-map: `custom_components/oig_cloud/boiler/migration.py` lines 449-469.
- Static-probe test covers the exact legacy bool/no-mode case and asserts `_can_safe_map(entry) is False`: `tests/test_boiler_task9_migration_repair.py` lines 425-433.
- Full migration test covers the same input and asserts `repair_required is True`, `safe_mapped is False`, boiler disabled, and no implicit `benchmark_only` conversion: `tests/test_boiler_task9_migration_repair.py` lines 436-454.
- Cross-check agent `bg_3bf0ed59` also searched for remaining legacy alt-source guess/safe-map paths and found no active inference path; old guessed-capability keys remain only as denylist entries.

Why this resolves F4: ambiguous legacy source capability is no longer guessed or auto-migrated. It is repair-required unless an explicit safe modern mode is present.

### 2. Dashboard V2 legacy debug plan/apply/cancel UI — RESOLVED

Previous blocker: normal V2 app rendered `<oig-boiler-debug-panel>`, exposing `plan_boiler_heating`, `apply_boiler_plan`, and `cancel_boiler_plan` buttons with empty payloads.

Current evidence:

- Normal V2 boiler render in `custom_components/oig_cloud/www_v2/src/ui/app.ts` renders V2 status, plan timeline, source explanation, collapsed manual override, and legacy read/diagnostic components only; there is no `<oig-boiler-debug-panel>` in the render tree: lines 960-1029.
- Direct grep/AST checks found no `<oig-boiler-debug-panel>` in `app.ts` and no AST match for rendering that tag under `custom_components/oig_cloud/www_v2/src`.
- The debug component still exists in `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts` lines 70-235 and still declares the legacy plan/apply/cancel buttons, but it is not rendered by the normal app. This is acceptable under the F4 instruction that component definitions may remain if not rendered in normal UI.
- Service-call helper functions still exist in `custom_components/oig_cloud/www_v2/src/data/boiler-data.ts` lines 659-674, but current UI search shows they are only referenced by the unrendered debug component.
- User docs remain consistent: `docs/user/SERVICES.md` lines 174-198 state these are backend/advanced compatibility services and are not exposed as Dashboard V2 UI actions.
- Cross-check agent `bg_644656d8` independently verified the same PASS: the component is defined but absent from `app.ts` normal boiler tab rendering.

Why this resolves F4: normal Dashboard V2 no longer exposes the legacy debug plan/apply/cancel action surface. The remaining definitions are inert in normal UI.

### 3. Slot-size tuning, horizon bounds, and stale cheapest-slot copy — RESOLVED

Previous blocker: expert setup/options exposed editable `boiler_plan_slot_minutes`, horizon allowed 12-72, and release-facing copy still advertised slot-size tuning / cheapest-slot-only boiler behavior.

Current evidence:

- Horizon constants are fixed to 12-48 hours: `custom_components/oig_cloud/config/steps.py` lines 58-59.
- `_clamp_boiler_planning_horizon_hours()` clamps values with `max(min)` to those 12-48 bounds: `custom_components/oig_cloud/config/steps.py` lines 458-466.
- Options payload stores fixed slot size via `DEFAULT_BOILER_PLAN_SLOT_MINUTES` and ignores stored/user tuning input: `custom_components/oig_cloud/config/steps.py` lines 536-544.
- Expert schema exposes `boiler_planning_horizon_hours` with min/max 12-48 and does not expose `boiler_plan_slot_minutes`: `custom_components/oig_cloud/config/steps.py` lines 2538-2553 and 2765-2780.
- Tests assert the contract:
  - expert schema hides `boiler_plan_slot_minutes`: `tests/test_config_flow_boiler_setup.py` lines 596-606;
  - options force slot size to 15 and clamp 72 to 48: `tests/test_config_flow_boiler_setup.py` lines 621-635;
  - options clamp lower bound to 12: `tests/test_config_flow_boiler_setup.py` lines 638-650;
  - wizard summary defaults store slot size 15: `tests/test_config_flow_entry.py` lines 420-436.
- `docs/user/CONFIGURATION.md` lines 132-146 now says Expert mode may tune the 12-48h planning horizon and that slot size is not configurable; planner uses a fixed 15-minute contract.
- `custom_components/oig_cloud/services.yaml` lines 240-289 describes comfort/source-aware planning and exposes no slot-size parameter.
- `custom_components/oig_cloud/translations/en.json` lines 598-631 and `custom_components/oig_cloud/translations/cs.json` lines 476-509 expose horizon, deadline, source mode, etc., but no `boiler_plan_slot_minutes` key or 60-minute recommendation.
- Direct static searches found no `boiler_plan_slot_minutes`, `Recommended 60`, `Doporučeno 60`, `15-60 minutes`, `15-60 minut`, `slot size`, `slot-size`, or stale `cheapest time slots` / `nejlevnější časové sloty` copy in docs/translations/services. The remaining Czech `časové sloty` wording in translations describes planner output, not configurable slot-size tuning or cheapest-only behavior.
- Cross-check agent `bg_c265013b` independently returned PASS for slot hiding, 12-48 horizon clamp, and stale copy removal.

Why this resolves F4: v1 slot size is fixed at 15 minutes, only horizon is tunable within 12-48 hours, and release-facing copy no longer advertises out-of-scope slot tuning or cheapest-slot-only behavior.

## Other F4 boundaries reconfirmed

- No telemetry/New Relic or `battery_forecast/*` redesign was introduced by these blocker fixes.
- The remaining V2 legacy diagnostics section in `app.ts` is read/diagnostic display only for boiler state/profile visuals; it does not include the debug action panel.
- Test/example references to `2206237016` were not treated as blockers; review focused on production defaults and scope creep as instructed.

## Supporting verification context

- This rerun is based on direct source reads, direct grep/AST checks, and the four internal cross-check results listed above.
- Atlas verification is supporting context, not a substitute for this review: targeted pytest after fixes reported `186 passed`; Dashboard V2 validation reported `657` unit tests passed, lint `0 errors`, typecheck passed, and build passed; changed-file LSP checks were clean except Markdown diagnostics are unavailable in this environment because `marksman` is not installed.

## Final decision

APPROVE. The three previous F4 blockers are resolved in current source:

1. Ambiguous legacy alternative-source capability now forces repair instead of safe-map.
2. Normal Dashboard V2 does not render the legacy debug plan/apply/cancel UI.
3. Expert setup/options/docs/translations/services no longer expose slot-size tuning or stale cheapest-slot-only boiler behavior; horizon is clamped to 12-48 hours.
