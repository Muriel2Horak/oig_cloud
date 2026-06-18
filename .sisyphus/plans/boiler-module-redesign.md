# Boiler Module Redesign

## TL;DR
> **Summary**: Redesign the boiler subsystem as a standalone domain with its own runtime state, planner, actuator layer, setup flow, and V2-first UI. Keep comfort/deadline as the hard constraint, optimize inside that envelope for price and PV, support an alternative heating source as either a controllable branch or an economic benchmark, and make destructive re-onboarding acceptable where old boiler config cannot be mapped safely.
> **Deliverables**:
> - standalone boiler backend boundary
> - canonical identity/capability/query contracts
> - source-selection boiler planner (comfort / price / PV / alternative source)
> - simple + expert boiler setup flow
> - V2 boiler UI as the primary user surface
> - retirement/degradation plan for legacy V1 boiler UX
> - docs and regression coverage
> **Effort**: XL
> **Parallel**: NO - sequential dependency-first execution
> **Critical Path**: 1 → 2 → 3 → 4 → 5 → 6a → 6b → 7a → 7b → 7c → 8 → 9 → 10 → 11 → 12 → 13

## Context
### Original Request
- Do a deep boiler-module analysis.
- Optimize the module.
- Create a simple setup guide.
- Tune dashboard/UI because it says nonsense today.
- Review planner behavior.
- Decide what should be revised/refactored.

### Interview Summary
- Boiler should be redesigned as a **standalone module**, not primarily a child of the battery planner.
- Planner objective is a **balanced compromise** of comfort, price, and PV usage.
- **Comfort/deadline** is the hard constraint.
- The **alternative heating source** is a first-class concept; if controllable from HA, planner should actively schedule it; otherwise it must still be used as an economic benchmark.
- **Stratification and thermometer setup** are core planner inputs, not optional extras.
- Setup UX should be **simple + expert**.
- **V2** is the target UI surface.
- Manual overrides remain available but **secondary** to the automatic planner.
- Boiler planner should be **fully automatic**.
- Migration can be aggressive; current boiler solution may be discarded rather than preserved.
- Test strategy: **TDD**.
- Old boiler config/schedules do not need semantic migration; disable + repair/re-onboarding is acceptable when safe mapping is impossible.

### Metis Review (gaps addressed)
- Add one canonical boiler contract and explicitly ban direct reads/writes of coordinator private state from UI/services.
- Enforce per-entry/per-box routing and remove hardcoded identity/default routing.
- Make V2 cutover explicit; do not let V1 remain a silent second design center.
- Do not fabricate UI fallback data when backend data is missing.
- Bake in acceptance criteria for multi-device isolation, restart behavior, missing recorder history, stale price/PV data, DST/midnight deadlines, swapped sensors, and manual override collisions.
- Review-loop hardening added explicit comfort/deadline semantics, planner scoring rules, slot/horizon definitions, API endpoint strategy, setup screen mapping, concurrency/rate-limit guardrails, migration rollback/restart behavior, and ownership for HA platform wiring and profiler bootstrap.

### Architecture Decisions
- **Runtime key**: boiler runtime state is keyed by the authoritative pair `(entry_id, box_id)`; `device_id` is derived only for HA-facing device/service interactions.
- **API identity strategy**: the only canonical external targeting shape for boiler queries and service writes is explicit `entry_id + box_id`. `device_id` is never an external planner/query identity, and `entry_id`-only requests are not part of the new canonical external contract.
- **Manual override lifecycle**: manual override is explicit runtime state with reason + TTL; it supersedes automatic actuation until cleared or expired.
- **Manual override TTL policy**: TTL is required for every manual override. Default TTL is 2 hours. Allowed range is 15 minutes to 24 hours in 15-minute increments. A canonical reason code is required; optional user-facing free-text reason may be stored separately but must not replace the reason code.
- **Alternative-source rule**: `benchmark_only` may influence planning and explanation, but must never emit actuator commands.
- **Alternative-source controllable contract**: redesign v1 supports a controllable alternative source only through one canonical HA on/off actuator surface (single switch-style entity or equivalent normalized wrapper). More complex actuator models are out of scope for this redesign and fall back to `benchmark_only`.
- **Supported controllable alternative-source actuators**: one HA `switch` entity, or one canonical wrapper that normalizes to `on/off` semantics with readable current state. Unsupported actuator models (multi-step mode selectors, numeric setpoints, scripts without readable state, composite automations) must deterministically downgrade to `benchmark_only`.
- **Primary electric heating control contract**: the primary electric heating path must also resolve to one canonical controllable actuator surface with readable current state, or the boiler subsystem must fail setup/repair into a non-automatic mode. The redesign must not assume automatic planning is possible without a validated primary heating actuator.
- **Migration behavior**: if legacy boiler state cannot be mapped safely, disable + repair/re-onboarding wins over any best-effort migration.
- **Supported topology matrix**:
  - supported: top-only thermometer
  - supported: top + bottom thermometer
  - unsupported: bottom-only thermometer
  - invalid: same entity bound as both top and bottom thermometer
  - out of scope: 3+ thermometer models in this redesign
- **Cross-box entity sharing policy**: in v1, the same HA entity ID may not be bound as thermometer, primary actuator, alternative-source actuator, or circulation pump for more than one boiler box under the same config entry. Setup/options validation must reject overlapping bindings before runtime.
- **Unsatisfiable comfort behavior**: when no feasible plan can satisfy comfort/deadline, planner must emit explicit unsatisfied state/reason, compute the best safe achievable fallback plan, and surface the gap in runtime/API/UI instead of pretending comfort is met.
- **Input freshness thresholds**:
  - price input is fresh only if current slot and next two planning slots are covered
  - PV/overflow input is fresh only if current slot and next two planning slots are covered
  - stale-but-present inputs degrade to explicit non-trusted mode rather than being treated as valid optimization signals
- **Bounded battery-derived signals**: the boiler energy adapter may consume only these battery-side signals in v1 of the redesign: PV surplus/overflow windows, current local-vs-cloud freshness, and optional battery charge/discharge guard state if already exposed in stable coordinator output. It must not redesign battery planner internals or invent new battery-side planning models.
- **Unsatisfied comfort policy**: if comfort/deadline cannot be satisfied, planner must emit an explicit `unsatisfied_comfort` outcome, compute the safest achievable fallback plan, and surface the gap in runtime/API/UI.
- **Manual override expiry policy**: when manual override TTL expires, planner recomputes from current runtime state before any next actuation; it does not blindly resume an old persisted plan.
- **Manual override restart policy**: persisted manual override state survives restart only with explicit TTL/reason metadata; expired override state is cleared during restore.
- **Source semantics**:
  - `selected_source` = source the planner considers economically/operationally best
  - `actuated_source` = source actually driven by the system
  - in `benchmark_only` alternative-source mode, planner may set `selected_source=alternative`, but `actuated_source` must remain another controllable source or `none`
- **Legacy migration allowlist**: only these legacy boiler items may be safe-mapped automatically: box/boiler identity, volume, thermometer entities, source-cost inputs, stratification settings, and still-valid actuator entity IDs. Legacy schedules, partial runtime snapshots, or ambiguous source-control settings must not be auto-migrated.
- **Legacy migration denylist**: never auto-migrate persisted schedule windows, ambiguous manual override state, guessed alternative-source capability, or any config derived from hardcoded `2206237016` defaults.
- **Destructive migration safe state**: when old boiler automation is disabled for repair/re-onboarding, future scheduled actions must be cancelled and boiler automation state marked disabled, but existing physical outputs are left unchanged until a user or the new planner deliberately changes them.
- **Simple-path setup field inventory**:
  - `box_id` / target installation selection
  - boiler volume
  - top thermometer entity
  - optional second thermometer toggle + bottom thermometer entity
  - primary electric heating source presence/control input
  - primary electric heating effective power / recovery-rate input
  - alternative source mode (`disabled | benchmark_only | controllable`)
  - optional alternative source enabled + alternative source cost
  - controllable alternative source entity when mode = `controllable`
  - optional circulation pump entity
  - comfort profile mode = history-driven by default
- **Expert-only setup fields**:
  - stratification mode
  - thermometer placement refinement / split ratio
  - advanced alternative-source tuning
  - planning horizon tuning (slot size stays fixed at 15 minutes in v1)
  - manual profile correction controls
- **Compatibility policy**:
  - existing boiler read APIs may be wrapped temporarily, but all new code targets the canonical query contract
  - existing boiler write services/automation call shapes must either get an explicit compatibility shim or fail with deterministic repair/deprecation guidance; no silent payload guessing
- **Storage policy**:
  - persisted boiler runtime and schedule state must use explicit schema versioning
  - storage keys must be namespaced by canonical `(entry_id, box_id)`
  - entity unique IDs and registry ownership must remain stable for surviving entities; removed entities must be explicitly cleaned up or deprecated
- **Storage backend**: redesigned boiler runtime/schedule/override state uses Home Assistant `Store` with atomic async save semantics under namespaced keys. Recorder/history data is read-only input and is never used as the authoritative store for boiler runtime decisions.
- **Boiler storage schema version**: new redesigned boiler storage starts at `schema_version=2`; missing/unversioned legacy boiler storage is treated as `schema_version=1` and may only be migrated through the allowlist/denylist rules above.
- **Thermal model contract**:
  - create `custom_components/oig_cloud/boiler/thermal.py` as the only module that converts tank volume, temperatures, stratification, and heating capacity into required thermal energy and predicted temperatures
  - water model uses `4.184 kJ / liter / °C`; required kWh for one layer is `volume_liters * 4.184 * max(0, target_temp_c - current_temp_c) / 3600`
  - `effective_power_w` normalizes to `kWh_thermal_per_15m = effective_power_w * 0.25 / 1000`
  - if user provides `recovery_rate_c_per_hour`, runtime normalizes to `effective_power_w = recovery_rate_c_per_hour * volume_liters * 4.184 / 3.6`
  - two-sensor model treats tank as top and bottom layers with `split_ratio` default `0.5` and expert range `0.3–0.7`; top-only model treats the full tank as top temperature and applies a conservative `1.25x` required-energy safety factor
  - standing loss uses `loss_kWh_per_15m = standing_loss_w * 0.25 / 1000`; default `standing_loss_w=50 W`, expert range `10–150 W`; predicted temperatures subtract standing loss before next-slot comfort comparison
  - planner invocation temperature source starts from latest HA thermometer state if updated within one 15-minute slot; stale-but-present readings emit `input_stale_temperature` and apply one slot of standing-loss conservative bias; future slots use the previous slot's predicted temperature
  - two-sensor comfort comparison uses top-layer predicted temperature, while energy need uses both top/bottom layer energy; top-only never fabricates a bottom layer
- **Profiler recorder contract**:
  - profiler resolves thermometer entity IDs from canonical boiler config only; it does not infer entities from device registry names
  - history queries go through one adapter function with shape equivalent to `(entity_ids, start_time, end_time, minimal_response=True)` and never through ad-hoc recorder SQL
  - query range is the last 14 calendar days; at least 7 distinct usable days are required to exit bootstrap mode
  - one usable day has at least 90% of expected 15-minute samples for the top thermometer
  - a draw event is a usable-temperature drop of at least `3 °C` within 60 minutes while no configured heating source was actively heating
  - profiler query budget is 2 seconds; timeout or insufficient history emits bootstrap/low-confidence reason codes and does not block comfort-safe planning
- **Comfort deadline contract**:
  - comfort target = predicted usable hot-water temperature at or above the configured target temperature
  - v1 default comfort target = `50 °C`; setup may allow `40–65 °C` in whole-degree increments
  - deadline = local Home Assistant wall-clock time by which the target must be reached
  - history-driven profile supplies the next expected draw deadline when enough recorder history exists
  - no-history bootstrap uses one conservative daily deadline at `06:00` local time, marks profile confidence as low/degraded, and is replaced only after at least 7 days of usable history
  - a two-thermometer setup computes usable heat through the configured stratification model; a top-only setup uses a conservative top-sensor estimate and must not infer bottom temperature from fabricated data
- **Planning slot/horizon contract**: v1 planner slot size is fixed at 15 minutes. Default planning horizon is 24 elapsed hours / 96 UTC-backed slots rendered in Home Assistant local time. Expert setup may tune horizon between 12 and 48 elapsed hours, but may not change slot size in this redesign. DST local labels may skip/repeat, but underlying slot instants are never skipped/duplicated; nonexistent local deadlines advance to the next valid slot, repeated local deadline labels use the first matching instant unless the datetime carries an explicit fold.
- **Planner algorithm contract**:
  - input signature is one `PlannerInput` DTO; output is one `PlanResult` containing per-slot source actions, selected_source, actuated_source, comfort status, estimated cost/PV usage, freshness/degraded flags, and reason codes
  - objective order is fixed: first satisfy comfort target by deadline; if impossible, emit `unsatisfied_comfort` with safest achievable fallback; only then optimize economics/PV
  - economic score is compared in one unit: local currency per kWh thermal equivalent
  - ranking inside the comfort envelope is: lowest expected monetary cost, then highest PV/overflow utilization, then fewest actuator transitions, then latest safe heating slots to reduce standing losses
  - partial PV surplus is allocated per 15-minute slot up to available surplus energy; residual heating need means the kWh thermal still required in that slot after PV allocation and is scored against grid or alternative-source cost
  - stale price/PV inputs are ignored for optimization scoring but do not block a comfort-safe fallback plan
- **Planner execution budget**: the 5-second budget covers only the interval from invocation of the core planner function with a fully assembled `PlannerInput` DTO to production of a `PlanResult`. Energy-adapter fetches, recorder/profiler queries, and DTO assembly are measured/logged separately and do not count against the core planner computation budget. If the computation budget is exceeded, the subsystem keeps the last still-safe plan when available, otherwise enters safe-hold/degraded state with `planner_timeout` and no new actuation.
- **Planner re-evaluation trigger policy**: replan at every 15-minute slot boundary, on fresh price/PV/overflow input update, on thermometer state update that changes modeled temperature by at least `0.5 °C`, on setup/options change, on manual override set/clear/TTL expiry, on HA restart restore, and on bound entity availability changes. Replans for the same `(entry_id, box_id)` are coalesced with a minimum 60-second cooldown except forced events: override expiry, setup/options change, restart restore, and actuator/sensor unavailability.
- **Replan orchestrator ownership**: `boiler/runtime.py` owns the runtime replan orchestrator. It registers HA state-change/listener hooks, observes slot boundaries and bound entity availability, invokes the energy adapter synchronously on each accepted trigger, assembles `PlannerInput`, calls `planner_core`, and enqueues accepted `PlanResult` work into the Task 7a actuator command serializer. `planner_core.py` stays pure/side-effect-free and never registers HA listeners.
- **Alternative-source cost unit and efficiency**: setup stores alternative-source cost as local currency per kWh thermal equivalent after all fuel, boiler efficiency, or COP conversion. Primary resistive electric heating defaults to efficiency `1.0` for grid-price comparison. Heat-pump or fuel-fired alternative efficiency/COP must be included in the user-entered conversion; if conversion is impossible, `benchmark_only` and `controllable` alternative-source modes are rejected with a setup validation error.
- **Primary heating capacity input**: automatic planning requires either primary electric `effective_power_w` or validated `recovery_rate_c_per_hour`; the setup must not guess either value. Valid sanity range is `100–12000 W` for `effective_power_w` and `0.1–30 °C/hour` for `recovery_rate_c_per_hour`. If neither is available or values are outside range, boiler setup enters non-automatic repair/configuration mode.
- **Runtime entity unavailability policy**: if the top thermometer is `unavailable`, `unknown`, removed, or stale beyond the current planning slot, automatic planning enters safe-hold/degraded state and does not issue new heat commands. If the bottom thermometer is unavailable in a two-sensor setup, planner degrades to top-only conservative mode with a reason code. If the primary heating actuator is unavailable, actuation pauses and the plan is marked degraded. If a controllable alternative-source actuator is unavailable, that source downgrades to `benchmark_only` for planning/explanation and emits no command.
- **Circulation pump policy**: the optional circulation pump entity, when configured, is a follower of active heating actuation only: on while a controllable heating source is actively heating, off otherwise. It is not independently scheduled by the planner in v1. Existing `boiler/circulation.py` logic must either be converted into this follower adapter or retired; no separate circulation-window scheduler remains active. If the pump entity is unavailable, primary heating can proceed and the runtime/API/UI surface `circulation_pump_unavailable` degraded state.
- **Supported circulation pump entity types**: one HA `switch` or `input_boolean` entity with readable current state. Unsupported circulation pump entity types are rejected during setup/options validation with an explicit validation error.
- **API endpoint strategy**: v1 redesign uses one canonical boiler read endpoint `GET /api/oig_cloud/boiler/{entry_id}/{box_id}` returning the full query DTO. Forecast windows and explanations are nested DTO fields, not separate client-stitched endpoint families. Boiler writes remain HA services using the canonical service payload shape.
- **Boiler runtime storage key**: runtime instances are stored at `hass.data[DOMAIN][entry_id]["boiler_runtimes"][box_id]`. The legacy `"boiler_coordinator"` key is read only through compatibility/migration shims and is removed when migration completes.
- **Planner module ownership**: `boiler/planner_core.py` owns the new planner algorithms. Legacy `boiler/planner.py` must become a thin compatibility adapter around `planner_core.py` or be deleted; it must not keep independent planner logic alive.
- **Per-box command serializer**: all planner-to-actuator transitions, manual override mutations, setup/options config writes, schedule persistence updates, and migration writes for one `(entry_id, box_id)` go through one `asyncio.Queue`-backed command serializer. The serializer compares `plan_version`/`config_version` on enqueue, rejects stale work before execution, coalesces rapid replans, and records `replan_coalesced` when applicable. A bare `asyncio.Lock` is not sufficient for this redesign.
- **Command serializer lifecycle**: each per-box serializer is owned by `boiler/runtime.py`; its consumer task is spawned during `async_setup_entry`, queue depth is bounded to 32 commands, enqueue beyond capacity rejects/coalesces lower-priority replan work with `replan_coalesced`, consumer exceptions are caught and surfaced as `actuator_serializer_error` with safe-hold fallback, and `async_unload_entry` stops accepting new commands, drains or cancels pending non-critical work, then cancels the consumer task without leaking tasks.
- **Actuator rate-limit policy**: for each physical source actuator, command state changes are limited to at most one on/off transition per 5-minute window. Repeated idempotent commands to the already-desired state are allowed; conflicting commands inside the limit window are rejected or deferred with an explicit reason code.
- **Store failure policy**: Home Assistant `Store` read/write failures, corruption, or async-save exceptions are caught and surfaced with `storage_write_failed`. Runtime keeps the last successful in-memory state, marks persistence degraded, and does not claim override/schedule durability until the next successful save.
- **Setup screen definition**: a simple-path “screen” means one user-facing config/options step that requires user input. Loading, validation, repair, and final summary screens do not count. The simple path is exactly these five input screens: target/volume, thermometers/topology, primary electric heating control/capacity plus optional circulation pump, alternative-source mode/cost/entity, comfort profile/defaults.
- **Migration rollback and restart safety**: before destructive boiler migration, write a versioned backup of legacy boiler config/schedule/runtime storage under the same canonical identity namespace. Migration writes are staged atomically; if Home Assistant restarts mid-migration, startup resumes to disabled + repair state and never re-enables legacy scheduled actions implicitly.

## Reason Code Appendix
Canonical reason/degraded codes introduced in Task 4 and reused by planner, actuator, API, UI, migration, and docs:
- `comfort_satisfied`
- `comfort_unsatisfied`
- `no_feasible_plan`
- `bootstrap_profile`
- `history_profile_low_confidence`
- `input_stale_price`
- `input_stale_pv`
- `input_missing_recorder`
- `input_adapter_error`
- `input_stale_temperature`
- `top_sensor_unavailable`
- `bottom_sensor_unavailable_top_only_degraded`
- `primary_actuator_unavailable`
- `alternative_actuator_unavailable_benchmark_only`
- `circulation_pump_unavailable`
- `actuator_rate_limited`
- `actuator_serializer_error`
- `override_active`
- `override_expired`
- `planner_timeout`
- `replan_coalesced`
- `source_selected_grid`
- `source_selected_pv`
- `source_selected_alternative`
- `source_benchmark_only`
- `setup_incomplete`
- `migration_required`
- `api_repair_required`
- `storage_write_failed`

## Work Objectives
### Core Objective
Replace the current boiler feature cluster with a standalone boiler subsystem that is architecturally separated from battery planner internals, uses a clear thermal and source-selection model, offers a short guided setup for normal users, and exposes one coherent V2 UI for status, planning, and control.

### Deliverables
- Identity/routing contract (`entry_id`, `device_id`, `box_id`)
- Boiler Runtime / Read Model boundary
- Planner input/capability contract
- Boiler Planner boundary
- Boiler Actuator / Scheduler boundary
- Boiler Query/UI API boundary
- Energy Input Adapter contract for battery/PV/price inputs
- New simple + expert boiler setup flow
- V2 boiler UI flow aligned to the new domain model
- Documentation and translation updates

### Definition of Done (verifiable conditions with commands)
- `bash scripts/run_local_checks.sh` exits 0 on the redesign branch.
- Every task evidence bundle includes its targeted test command output plus the per-task local-check gate result before commit.
- Boiler config flow supports the new simple + expert setup path and rejects invalid core sensor topology in tests.
- Boiler planner tests prove comfort/deadline is never violated while still preferring cheaper/FVE/alternative source options inside that envelope.
- V2 boiler UI tests pass against the new API/DTO contract.
- No V2 boiler view reads coordinator private state or ad-hoc entity internals.
- Legacy V1 boiler path is either removed or explicitly degraded/read-only with documented behavior.
- Existing boiler users either get a safe mapping or an explicit disable + repair/re-onboarding flow; never a guessed partial migration.
- End-to-end smoke QA covers setup → plan → actuator apply → manual override → TTL expiry → recompute → restart restore/recover for one canonical boiler instance.

### Must Have
- Boiler as a standalone domain
- Source-selection planner with three source families: FVE / grid / alternative source
- Alternative source controllable when integrated; benchmark-only otherwise
- Core thermal inputs: stratification + thermometer topology
- Automatic execution model
- V2-first user experience

### Must NOT Have
- No direct UI/service access to coordinator private fields
- No hardcoded box IDs or single-entry assumptions
- No fake/fabricated boiler UI data when backend data is missing
- No silent fallback from hard comfort constraint to “best effort” economics
- No continued dependency on V1 as an equal boiler design target
- No New Relic / legacy telemetry logic in boiler redesign work
- No concurrent state mutation path that bypasses the per-box planner/actuator lock or command queue
- No rapid physical actuator cycling beyond the explicit rate-limit policy

## Verification Strategy
> ZERO HUMAN INTERVENTION for technical verification - all tests/QA are agent-executed. User approval is still required as a release gate before calling the whole redesign complete.
- Test decision: **TDD** for backend/planner/setup; UI tests can be added in the same task after failing coverage is established.
- QA policy: Every task below includes agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Canonical Contract Appendix
- **Identity authority**:
  - `box_id` = authoritative domain identity for one boiler/battery-box installation
  - `entry_id` = authoritative Home Assistant config-entry owner of that `box_id`
  - `device_id` = Home Assistant device-registry identifier derived from the resolved `entry_id/box_id` pair when HA service/device targeting requires it
- Every boiler command/query/runtime object must resolve through that canonical tuple; none of those values may be guessed from hardcoded defaults.
- **Alternative source capability enum**: `disabled | benchmark_only | controllable`.
- **Planner input DTO**: thermal topology, temperatures, comfort-profile state, prices, PV/overflow inputs, alternative-source capability/cost, and freshness/degraded flags.
- **Query/API DTO**: current state, selected source, actuated source (when different), plan summary, reason codes, freshness/degraded flags, and manual-override state.
- **Manual override policy**: manual override pauses or supersedes automatic actuation explicitly and exposes remaining lifetime/reason in runtime + UI.
- **Service payload shape**: all write actions must accept canonical `entry_id + box_id` targeting plus an explicit command payload; empty payload service calls are forbidden.
- **API route shape**: boiler read endpoints must expose canonical identity explicitly in route/DTO shape and never infer “first entry” or default box implicitly.

## Identity Transport Rules
- **Service calls**: every boiler service must resolve target `entry_id + box_id` through one canonical resolver before touching planner/actuator state.
- **API routes**: boiler query endpoints must expose and consume canonical identity explicitly; no “first entry” fallback.
- **V2 data layer**: V2 boiler fetches must use canonical identity, not a hardcoded default entry/box assumption.
- **Persistence**: persisted schedules/state must be namespaced by canonical identity tuple.
- **Conflict rules**:
  - if `entry_id` and `box_id` do not resolve to the same owned boiler instance, reject the operation
  - external planner/query/service operations without explicit `entry_id + box_id` are invalid unless they pass through a deliberate legacy compatibility shim
  - `device_id` alone is never a sufficient external planner/query identity

## Target File Decomposition
- `custom_components/oig_cloud/boiler/contracts.py` — identity tuple, capability enums, planner input/query DTOs, reason/degraded enums
- `custom_components/oig_cloud/boiler/runtime.py` — standalone runtime/read-model ownership
- `custom_components/oig_cloud/boiler/runtime.py` — also owns replan orchestrator, HA listener registration, and per-box serializer lifecycle
- `custom_components/oig_cloud/boiler/thermal.py` — deterministic tank thermal calculations and capacity normalization
- `custom_components/oig_cloud/boiler/planner_core.py` — comfort-first planner implementation
- `custom_components/oig_cloud/boiler/actuator.py` — schedule/apply/cancel/restart/manual-override handling
- `custom_components/oig_cloud/boiler/query_api.py` — canonical boiler query assembly for UI/API
- `custom_components/oig_cloud/boiler/migration.py` — destructive disable/repair/re-onboarding helpers
- `custom_components/oig_cloud/config/boiler_steps.py` / `config/boiler_schema.py` — extracted boiler setup UX
- `custom_components/oig_cloud/www_v2/src/ui/features/boiler/*` — V2-only boiler presentation layer on top of canonical query DTO
- `custom_components/oig_cloud/__init__.py` — HA bootstrap wiring for the new boiler subsystem
- `custom_components/oig_cloud/sensor.py` — entity platform integration for boiler sensors under the new runtime boundary
- `custom_components/oig_cloud/switch.py` — wrapper/entity compatibility cutover or removal
- `custom_components/oig_cloud/boiler/sensors.py` — boiler sensor ownership under the new runtime model
- `custom_components/oig_cloud/boiler/profiler.py` — history/bootstrap profile ownership
- `custom_components/oig_cloud/const.py` — canonical boiler config and identity constants during cutover
- Existing files (`boiler/coordinator.py`, `boiler/planner.py`, `boiler/api_views.py`, `services/boiler.py`, `config/steps.py`) should either become thin adapters around those new modules or be deleted; do not leave two active implementations.
- **Module ownership rule**: new-files-first. Create the new canonical modules above, then convert legacy files into thin adapters or delete them. Do not evolve old and new implementations in parallel.

## Execution Strategy
### Executor Rule
> Each numbered task below is a bounded work package, not a single uninterrupted coding burst. Before implementation starts on a task, the executor must decompose it into 3-8 microsteps with explicit `Create / Modify / Test` file lists, exact failing tests, exact verification commands, and a stop/checkpoint before commit. Do not execute a task as one opaque blob.
> Before every task commit, the executor must run the task-specific targeted tests and `bash scripts/run_local_checks.sh`; if the full local-check script is unavailable or exceeds the environment limit, capture the failure/timeout and run the narrow equivalent commands named by that task, then re-run the full script in the Final Verification Wave.
> If any task still fails its QA scenarios after two focused implementation attempts, stop and escalate with current state, failing evidence, and explicit options: revert to last green commit, reduce scope, or revise the architecture decision. Do not silently rewrite adjacent tasks to hide the failure.

### Sequential Execution Groups
Wave 1: identity/routing + internal boundary + thermal model foundations
Wave 2: planner contract + energy adapter + comfort-core planner + multi-source planner + actuator core + override lifecycle + platform/circulation routing
Wave 3: setup flow + migration/repair cleanup + canonical query/API contract
Wave 4: V2 UI + V1 read-only degradation + docs/translations + integration verification

### Dependency Matrix (full, all tasks)
- 1 blocks 2, 3, 4, 5, 6a, 6b, 7a, 7b, 7c, 8, 9, 10, 11, 12, 13
- 2 blocks 3, 4, 5, 6a, 6b, 7a, 7b, 7c, 8, 9, 10, 11, 12, 13
- 3 blocks 4, 5, 6a, 6b, 7a, 7b, 7c, 8, 9, 10, 11, 12, 13
- 4 blocks 5, 6a, 6b, 7a, 7b, 7c, 8, 9, 10, 11, 12, 13
- 5 blocks 6a, 6b, 7a, 7b, 7c, 8, 9, 10, 11, 12, 13
- 6a blocks 6b, 7a, 7b, 7c, 8, 9, 10, 11, 12, 13
- 6b blocks 7a, 7b, 7c, 8, 9, 10, 11, 12, 13
- 7a blocks 7b, 7c, 8, 9, 10, 11, 12, 13
- 7b blocks 7c, 8, 9, 10, 11, 12, 13
- 7c blocks 8, 9, 10, 11, 12, 13
- 8 blocks 9, 10, 11, 12, 13
- 9 blocks 10, 11, 12, 13
- 10 blocks 11, 12, 13
- 11 blocks 12, 13
- 12 blocks 13

### Agent Dispatch Summary
- Execute tasks sequentially by dependency order. The group labels are organizational only and must not be used to justify parallel execution against the dependency matrix.
- The dependency matrix is intentionally conservative because identity, runtime state, planner inputs, actuator persistence, setup, migration, API, and UI all share canonical DTO/storage contracts. Agents may only parallelize microsteps inside a task when those microsteps do not mutate the same files or contracts.

## TODOs

- [x] 1. Define canonical box identity and per-entry routing first

  **What to do**: Remove hardcoded box defaults and global first-entry service behavior before any planner/UI rewrite. Introduce one canonical routing resolver that maps every boiler command/query to the correct entry_id and device_id. Make this the required foundation for all later boiler tasks.
  **Must NOT do**: Do not leave `2206237016` defaults, global captured coordinators, or cross-entry boiler routing assumptions alive anywhere in setup, services, UI, or planner inputs.

  **Implementation sequence**:
  1. Inventory every current identity source/fallback in runtime, setup, V1, and V2 bridge files.
  2. Add one canonical resolver and route all boiler service/query entry points through it.
  3. Move canonical boiler identity/config constants into `const.py` and remove scattered literal boiler identity keys/defaults.
  4. Update `services.yaml` boiler service schemas to require canonical `entry_id + box_id` targeting fields for new write paths.
  5. Remove hardcoded/default identity fallbacks and replace tests with explicit multi-entry expectations.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: foundational routing and identity correctness
  - Skills: [`test-driven-development`] - routing contract must be locked before deeper refactor
  - Omitted: [`frontend-ui-ux`] - backend/platform foundation

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4,5,6a,6b,7a,7b,7c,8,9,10,11,12,13 | Blocked By: none

  **References**:
  - `custom_components/oig_cloud/services/__init__.py` - current global service registration shape
  - `custom_components/oig_cloud/services/boiler.py` - current entry/coordinator capture
  - `custom_components/oig_cloud/services.yaml` - HA service metadata and field schemas
  - `custom_components/oig_cloud/boiler/coordinator.py` - current boiler entry/device assumptions
  - `custom_components/oig_cloud/config/steps.py` - hardcoded/default entity examples
  - `custom_components/oig_cloud/const.py` - canonical boiler config and identity constants during cutover
  - `custom_components/oig_cloud/www/js/core/api.js`
  - `custom_components/oig_cloud/www_v2/src/data/boiler-data.ts`
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts`
  - `custom_components/oig_cloud/www_v2/src/data/entity-store.ts`

  **Acceptance Criteria**:
  - [ ] No hardcoded boiler box identity remains in runtime boiler/setup/UI code.
  - [ ] Boiler commands/queries resolve per-entry/per-box deterministically.
  - [ ] First-entry/first-box fallback and implicit `device_id` guessing are removed.
  - [ ] Canonical boiler identity/config constants live in `const.py` and are imported rather than duplicated as literals.
  - [ ] Boiler service payloads require canonical targeting instead of empty or implicit request bodies.
  - [ ] Boiler service entries in `services.yaml` expose canonical `entry_id` and `box_id` fields and no longer document empty/implicit boiler targeting for new write paths.
  - [ ] Service calls with `entry_id` that does not own the provided `box_id` are rejected deterministically and never fall back to first entry/box.
  - [ ] Existing write-service callers get an explicit compatibility shim or deterministic repair/deprecation failure path.
  - [ ] Multi-entry tests prove no cross-routing.

  **QA Scenarios**:
  ```
  Scenario: Multi-entry service routing
    Tool: Bash
    Steps: Run tests with two entries/two boiler devices and invoke boiler services against both.
    Expected: Each request hits only its intended entry/device.
    Evidence: .sisyphus/evidence/task-1-boiler-routing.txt

  Scenario: Hardcoded identity removed
    Tool: Bash
    Steps: Grep boiler/setup/UI target files for legacy hardcoded box identity and run routing tests.
    Expected: No hardcoded identity remains and tests pass.
    Evidence: .sisyphus/evidence/task-1-boiler-routing-hardcoded.txt

  Scenario: Service metadata and identity mismatch rejection
    Tool: Bash
    Steps: Run service-schema tests for `services.yaml` boiler entries, then invoke boiler service tests with missing identity and mismatched `entry_id + box_id` ownership.
    Expected: Service metadata requires canonical targeting fields; invalid or mismatched identity is rejected with no first-entry/first-box fallback.
    Evidence: .sisyphus/evidence/task-1-boiler-routing-services-yaml.txt
  ```

  **Commit**: YES | Message: `refactor(boiler): define canonical identity and routing` | Files: `const.py`, services/setup/runtime/UI bridge files, `services.yaml`, tests

- [x] 2. Define the canonical internal boiler domain boundary

  **What to do**: Introduce explicit internal interface boundaries for Boiler Runtime / Read Model, Boiler Planner, Boiler Actuator / Scheduler, and Energy Input Adapter. Remove direct reads/writes of boiler coordinator private fields from services and internal backend callers. This task owns contracts, delegation seams, and coordinator reduction only; HA switch/sensor platform rewiring is owned by Tasks 7c and 10.
  **Must NOT do**: Do not define the external dashboard/API DTO contract here; that belongs to Task 10.

  **Implementation sequence**:
  1. Extract internal contracts/runtime ownership from the current coordinator.
  2. Move service-layer logic off coordinator private fields onto explicit interfaces.
  3. Wire boiler runtime instance creation into HA `async_setup_entry` in `__init__.py`, store it under canonical `(entry_id, box_id)` ownership in `hass.data`, and add `async_unload_entry` teardown delegation to the runtime boundary.
  4. Create the runtime replan orchestrator skeleton in `boiler/runtime.py`: listener registration hooks, trigger intake, adapter/planner/actuator delegation interfaces, and serializer lifecycle ownership hooks; detailed trigger behavior is completed in Task 6b and serializer behavior in Task 7a.
  5. Reduce `BoilerCoordinator` to a thin HA adapter and update tests to enforce that role.
  6. Add explicit forbidden-behavior tests for coordinator methods that compute planner outputs, read thermal state directly, or apply actuator commands directly.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: cross-cutting backend boundary work
  - Skills: [`test-driven-development`] - lock boundary with tests first
  - Omitted: [`frontend-ui-ux`] - backend boundary task

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3,4,5,6a,6b,7a,7b,7c,8,9,10,11,12,13 | Blocked By: 1

  **References**:
  - `custom_components/oig_cloud/__init__.py` - integration bootstrap currently wires boiler into HA lifecycle
  - `custom_components/oig_cloud/sensor.py` - current sensor platform wiring
  - `custom_components/oig_cloud/switch.py` - current wrapper/control entity path
  - `custom_components/oig_cloud/boiler/sensors.py` - current boiler entity ownership
  - `custom_components/oig_cloud/boiler/profiler.py` - current profile/history ownership
  - `custom_components/oig_cloud/boiler/coordinator.py` - current boiler runtime source
  - `custom_components/oig_cloud/services/boiler.py` - service layer currently touching coordinator state
  - `tests/test_boiler_module.py` - direct boiler module expectations

  **Acceptance Criteria**:
  - [ ] Internal backend callers use defined boiler runtime/read interfaces, not coordinator private fields.
  - [ ] Boiler service consumers call actuator/planner interfaces, not direct coordinator mutations.
  - [ ] `BoilerCoordinator` methods are limited to HA lifecycle callbacks, entity/platform registration handoff, and delegation to runtime/planner/actuator interfaces; any coordinator method that computes planner outputs, reads thermal state directly, or applies actuator commands directly is a test failure.
  - [ ] Task 2 creates adapter seams consumed by later HA platform rewiring work; it must not half-migrate entity unique IDs, platform unload behavior, or switch/sensor registration logic.
  - [ ] Task 2 does not implement planner algorithms, actuator scheduling, energy-adapter data fetching, setup UI, or external API DTOs; it only defines interfaces/dataclasses and moves existing call sites to those interfaces.
  - [ ] HA `async_setup_entry` instantiates the boiler runtime for each configured canonical boiler identity and stores it in `hass.data`; `async_unload_entry` tears it down without orphaned runtime state.
  - [ ] Runtime storage uses the exact key `hass.data[DOMAIN][entry_id]["boiler_runtimes"][box_id]`; legacy `"boiler_coordinator"` is only read through compatibility/migration shims.
  - [ ] `boiler/runtime.py` owns replan orchestrator and serializer lifecycle seams; `planner_core.py` remains side-effect-free and does not register HA listeners.
  - [ ] Tests fail before boundary extraction and pass after refactor.

  **QA Scenarios**:
  ```
  Scenario: Read contract replaces coordinator-private access
    Tool: Bash
    Steps: Run targeted backend tests covering boiler coordinator/services and grep for removed private-field access in backend callers.
    Expected: Tests pass and forbidden private-field reads are absent in target files.
    Evidence: .sisyphus/evidence/task-2-boiler-boundary.txt

  Scenario: Invalid direct coupling is caught
    Tool: Bash
    Steps: Run failing regression test that previously depended on coordinator-private state semantics.
    Expected: Old path fails before change and new contract path passes after change.
    Evidence: .sisyphus/evidence/task-2-boiler-boundary-error.txt

  Scenario: HA entry lifecycle creates and unloads boiler runtime
    Tool: Bash
    Steps: Run integration setup/unload tests for a config entry with one boiler box.
    Expected: `async_setup_entry` stores the boiler runtime at `hass.data[DOMAIN][entry_id]["boiler_runtimes"][box_id]`; `async_unload_entry` removes runtime state and leaves no orphan services/entities.
    Evidence: .sisyphus/evidence/task-2-boiler-boundary-ha-lifecycle.txt

  Scenario: Runtime owns orchestration seams
    Tool: Bash
    Steps: Run runtime boundary tests verifying listener registration hooks, adapter/planner/actuator delegation seams, and grep `planner_core.py` for HA listener or `hass` coupling.
    Expected: Runtime owns orchestration seams; planner core remains pure and side-effect-free.
    Evidence: .sisyphus/evidence/task-2-boiler-boundary-runtime-orchestrator.txt
  ```

  **Commit**: YES | Message: `refactor(boiler): define standalone internal domain boundary` | Files: `custom_components/oig_cloud/__init__.py`, `custom_components/oig_cloud/boiler/*`, `services/boiler.py`, tests

- [x] 3. Make stratification and thermometer topology first-class planner inputs

  **What to do**: Turn stratification mode, thermometer placement, temperature topology, and first-run/history-bootstrap profile ownership into explicit validated inputs for the thermal model. Remove the current “advanced but effectively optional” treatment and ensure invalid sensor topology is rejected in setup/tests rather than surfacing as runtime nonsense.
  **Must NOT do**: Do not hide essential physical-model inputs behind expert-only runtime assumptions.

  **Implementation sequence**:
  1. Freeze the supported topology matrix and required thermal inputs.
  2. Implement validation/model normalization for those inputs, including cross-box entity sharing rejection.
  3. Create `boiler/thermal.py` and implement the Thermal Model Contract formulas as tested deterministic functions.
  4. Refit thermal calculations and tests so topology changes affect energy demand predictably through `boiler/thermal.py` only.
  5. Assign `boiler/profiler.py` as the owner of first-run/no-history bootstrap profile generation and expose confidence/degraded state through the planner input contract.
  6. Implement history-driven draw-deadline prediction in `boiler/profiler.py` through the Profiler Recorder Contract adapter, including 14-day query range, 7 usable-day threshold, 90% sample coverage rule, 3 °C / 60-minute draw detection, and 2-second query budget.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: domain-model + validation work
  - Skills: [`test-driven-development`] - thermal-model validation should be test-first
  - Omitted: [`frontend-ui-ux`] - backend/setup modeling

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4,5,6a,6b,7a,7b,7c,8,9,10,11,12,13 | Blocked By: 1,2

  **References**:
  - `custom_components/oig_cloud/boiler/utils.py`
  - `custom_components/oig_cloud/boiler/models.py`
  - `custom_components/oig_cloud/boiler/thermal.py` - target thermal calculation module
  - `custom_components/oig_cloud/boiler/profiler.py`
  - `custom_components/oig_cloud/config/steps.py`
  - `docs/user/CONFIGURATION.md`
  - `tests/test_boiler_module.py`

  **Acceptance Criteria**:
  - [ ] Thermal model consumes validated stratification/sensor topology inputs.
  - [ ] Invalid or incomplete boiler topology is rejected during setup/config validation.
  - [ ] Supported topology matrix is enforced exactly: top-only supported, top+bottom supported, bottom-only rejected, duplicate sensor rejected, 3+ thermometer models unsupported.
  - [ ] Cross-box entity sharing is rejected for thermometer, primary actuator, alternative-source actuator, and circulation pump bindings under the same config entry.
  - [ ] `boiler/thermal.py` is the only module that implements thermal physics and exposes deterministic functions for required kWh, per-slot heating, effective-power normalization, standing-loss per slot, stale-temperature conservative bias, and predicted temperature after slot.
  - [ ] Boiler plan calculations change in tested ways when topology/stratification changes.
  - [ ] `boiler/profiler.py` owns no-history bootstrap policy and test-covered first-run boiler profile generation; no other module may fabricate mature household history.
  - [ ] History-driven prediction produces a next-deadline estimate with confidence level when at least 7 usable days of recorder history exist; insufficient/inconsistent history or profiler query timeout degrades to bootstrap mode with `bootstrap_profile` / `history_profile_low_confidence` reason codes.

  **QA Scenarios**:
  ```
  Scenario: Invalid sensor topology rejected in setup
    Tool: Bash
    Steps: Run config-flow tests with missing/swapped essential thermometer selections.
    Expected: Boiler setup blocks invalid topology with explicit validation error.
    Evidence: .sisyphus/evidence/task-3-boiler-topology-validation.txt

  Scenario: Stratification changes plan energy demand
    Tool: Bash
    Steps: Run `boiler/thermal.py` unit tests across top-only, top+bottom split ratio 0.5, and expert split ratio 0.3/0.7 configurations with the same raw temperatures.
    Expected: Required kWh, effective power normalization, standing-loss per 15-minute slot, stale-temperature conservative bias, per-slot heating, and predicted temperature match the Thermal Model Contract formulas exactly.
    Evidence: .sisyphus/evidence/task-3-boiler-topology-thermal.txt

  Scenario: Cross-box entity sharing rejected
    Tool: Bash
    Steps: Run config/options validation tests that bind the same thermometer, actuator, and circulation pump entities to two boiler boxes under one config entry.
    Expected: Setup rejects overlapping bindings with explicit validation errors before runtime state is created.
    Evidence: .sisyphus/evidence/task-3-boiler-topology-cross-box-sharing.txt

  Scenario: First-run no-history bootstrap
    Tool: Bash
    Steps: Run profile/bootstrap tests with empty historical draw data for both one-thermometer and two-thermometer setups.
    Expected: Boiler runtime enters a defined bootstrap profile mode with explicit confidence/degraded state instead of inventing mature household history.
    Evidence: .sisyphus/evidence/task-3-boiler-topology-bootstrap.txt

  Scenario: History-driven deadline prediction
    Tool: Bash
    Steps: Run profiler adapter tests with 14 days of 15-minute top-thermometer history, at least 7 usable days with ≥90% samples, draw events defined as ≥3 °C drops within 60 minutes while heating off, plus insufficient-history and query-timeout fixtures.
    Expected: Usable history produces a next-deadline estimate plus confidence within the 2-second query budget; insufficient history or timeout stays in bootstrap mode with explicit reason codes.
    Evidence: .sisyphus/evidence/task-3-boiler-profiler-history-deadline.txt
  ```

  **Commit**: YES | Message: `feat(boiler): validate thermal topology and profile inputs` | Files: `boiler/thermal.py`, `boiler/utils.py`, `boiler/models.py`, `boiler/profiler.py`, `config/steps.py`, tests

- [x] 4. Define the planner input and source-capability contract

  **What to do**: Freeze the canonical planner input DTO and capability model before implementing the full planner core. This task owns identity propagation into planner inputs, the `disabled | benchmark_only | controllable` alternative-source capability enum, degraded/freshness reason codes, and explicit planner input schema.
  **Must NOT do**: Do not implement the full source-selection algorithm here; this task only freezes contract and invariants.

  **Implementation sequence**:
  1. Define planner DTOs/enums/reason codes in one contract module.
  2. Write tests for valid/invalid planner input normalization and capability semantics.
  3. Update upstream callers to populate the new DTO without changing planner strategy yet.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: foundational planning contract work
  - Skills: [`test-driven-development`] - planner contract must be test-first
  - Omitted: [`frontend-ui-ux`] - contract layer only

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5,6a,6b,7a,7b,7c,8,9,10,11,12,13 | Blocked By: 1,2,3

  **References**:
  - `custom_components/oig_cloud/boiler/planner.py`
  - `custom_components/oig_cloud/boiler/coordinator.py`
  - `custom_components/oig_cloud/battery_forecast/economic_planner_integration.py` - current energy/price fallback patterns
  - `custom_components/oig_cloud/www_v2/src/data/boiler-data.ts`
  - `tests/test_boiler_precedence.py`

  **Acceptance Criteria**:
  - [ ] Planner input DTO is defined and tested.
  - [ ] Alternative-source capability enum is defined and used consistently.
  - [ ] Reason/degraded/freshness codes exactly match the Reason Code Appendix and are reusable by planner, actuator, API, UI, migration, and docs.
  - [ ] Price/PV freshness thresholds are enforced exactly as defined in the contract and covered by tests.
  - [ ] Battery-derived inputs are limited to the explicitly allowed signal set.
  - [ ] Unsupported alternative-source actuator models are downgraded deterministically to `benchmark_only` during capability detection.

  **QA Scenarios**:
  ```
  Scenario: Planner input contract validation
    Tool: Bash
    Steps: Run planner contract tests with valid and invalid input DTOs.
    Expected: Invalid planner inputs fail loudly; valid ones normalize consistently.
    Evidence: .sisyphus/evidence/task-4-boiler-planner-contract.txt

  Scenario: Capability enum behavior
    Tool: Bash
    Steps: Run tests for disabled, benchmark-only, and controllable alternative-source cases.
    Expected: Planner input layer exposes the correct capability semantics to downstream planner code.
    Evidence: .sisyphus/evidence/task-4-boiler-planner-capability.txt

  Scenario: Reason code contract is canonical
    Tool: Bash
    Steps: Run contract tests that enumerate all reason/degraded codes from the Reason Code Appendix and reject unknown ad-hoc strings in planner/actuator/API DTOs.
    Expected: Only appendix-listed codes are emitted or accepted by new boiler contracts.
    Evidence: .sisyphus/evidence/task-4-boiler-planner-reason-codes.txt

  Scenario: Freshness threshold contract
    Tool: Bash
    Steps: Run tests where price/PV inputs cover current slot only, current+1 slot, and current+2 slots.
    Expected: Inputs are considered fresh only when current slot and next two planning slots are covered; otherwise they degrade explicitly.
    Evidence: .sisyphus/evidence/task-4-boiler-planner-freshness.txt

  Scenario: Battery-derived signal boundary
    Tool: Bash
    Steps: Run adapter/planner contract tests with allowed battery-derived signals present and with forbidden extra battery-planner internals injected.
    Expected: Allowed signals pass; forbidden internal signals are rejected or ignored by contract.
    Evidence: .sisyphus/evidence/task-4-boiler-planner-battery-boundary.txt

  Scenario: Unsupported actuator downgrade
    Tool: Bash
    Steps: Run capability-detection tests with unsupported alternative-source actuator models.
    Expected: Unsupported models are downgraded deterministically to `benchmark_only` and never exposed as controllable.
    Evidence: .sisyphus/evidence/task-4-boiler-planner-actuator-downgrade.txt
  ```

  **Commit**: YES | Message: `refactor(boiler): define planner input contract` | Files: planner contract files and tests

- [x] 5. Replace implicit battery/planner coupling with an explicit energy input adapter

  **What to do**: Introduce a clean adapter that supplies boiler planning with price, PV, overflow, and optional battery-derived signals on a per-entry basis. Remove hidden `hass.data` global coupling and any reliance on non-produced keys or orphaned assumptions.
  **Must NOT do**: Do not let boiler planner read global battery forecast state directly.

  **Implementation sequence**:
  1. Define one per-entry energy adapter interface and output shape.
  2. Make the adapter pull-based: it is invoked synchronously only by the `boiler/runtime.py` replan orchestrator on accepted trigger events and has no independent background refresh task.
  3. Replace direct battery/global reads with the adapter.
  4. Add degraded-state handling for missing recorder/PV/price inputs.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: boundary cleanup across subsystems
  - Skills: [`test-driven-development`] - contract-first integration tests
  - Omitted: [`frontend-ui-ux`] - backend adapter seam

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6a,6b,7a,7b,7c,8,9,10,11,12,13 | Blocked By: 1,2,3,4

  **References**:
  - `custom_components/oig_cloud/boiler/coordinator.py`
  - `custom_components/oig_cloud/core/coordinator.py`
  - `custom_components/oig_cloud/battery_forecast/planning/forecast_update.py`
  - `custom_components/oig_cloud/battery_forecast/data/battery_state.py`
  - `tests/test_rollout_flags.py`, `tests/test_observability.py`, `tests/test_battery_state_helpers.py`

  **Acceptance Criteria**:
  - [ ] Boiler planner receives all external energy inputs through one adapter interface.
  - [ ] Energy adapter is pull-based and invoked by the runtime replan orchestrator; it does not register its own listeners or background refresh loop.
  - [ ] No boiler runtime code reads undeclared global battery forecast keys directly.
  - [ ] Missing adapter inputs degrade explicitly with reason codes, not silent nonsense.
  - [ ] Missing recorder history is handled explicitly and surfaced through planner input freshness/degraded semantics.
  - [ ] Stale-but-present price/PV inputs are downgraded consistently by the adapter before planner use.
  - [ ] If battery/PV forecasting is absent or not configured, boiler planning still runs in degraded comfort-safe mode using available grid/alternative-source inputs and explicit missing-input reason codes.
  - [ ] Unexpected adapter exceptions from recorder, battery coordinator, or malformed input data are caught and converted into explicit degraded/comfort-safe fallback rather than halting the planner loop.

  **QA Scenarios**:
  ```
  Scenario: Missing PV/battery input degrades explicitly
    Tool: Bash
    Steps: Run boiler planner tests with adapter returning partial/missing data.
    Expected: Planner exposes degraded/fallback reason instead of silent default behavior.
    Evidence: .sisyphus/evidence/task-5-boiler-energy-adapter-degraded.txt

  Scenario: Missing recorder history bootstrap
    Tool: Bash
    Steps: Run boiler input/bootstrap tests with recorder history unavailable or empty.
    Expected: Boiler runtime/planner enters a defined degraded bootstrap mode with explicit reason codes instead of fake historical assumptions.
    Evidence: .sisyphus/evidence/task-5-boiler-energy-adapter-recorder.txt

  Scenario: Stale-but-present optimization inputs
    Tool: Bash
    Steps: Run adapter tests with price/PV data present but below required freshness horizon.
    Expected: Inputs are marked stale and not trusted as optimization-grade signals.
    Evidence: .sisyphus/evidence/task-5-boiler-energy-adapter-stale.txt

  Scenario: Per-entry isolation
    Tool: Bash
    Steps: Run multi-entry tests with two box IDs and distinct energy inputs.
    Expected: Boiler planning for one entry never consumes the other entry's adapter data.
    Evidence: .sisyphus/evidence/task-5-boiler-energy-adapter-isolation.txt

  Scenario: Runtime orchestrator invokes adapter
    Tool: Bash
    Steps: Run runtime/adapter tests where accepted replan triggers invoke the adapter and rejected/coalesced triggers do not.
    Expected: Adapter is called synchronously by runtime orchestrator only for accepted triggers; no independent adapter background task or listener exists.
    Evidence: .sisyphus/evidence/task-5-boiler-energy-adapter-runtime-invocation.txt

  Scenario: Battery/PV subsystem absent
    Tool: Bash
    Steps: Run adapter/planner input tests with no battery forecast coordinator and no PV/overflow data configured.
    Expected: Boiler input adapter emits explicit missing/stale reason codes and planner can still produce a comfort-safe non-PV fallback plan.
    Evidence: .sisyphus/evidence/task-5-boiler-energy-adapter-no-battery.txt

  Scenario: Adapter throws unexpected exception
    Tool: Bash
    Steps: Run adapter tests where the battery forecast coordinator raises an unexpected exception, recorder history query raises a Home Assistant error, and one input payload has an unexpected shape.
    Expected: Adapter catches each exception, emits `input_adapter_error` plus specific missing/stale reason codes where applicable, and planner falls back to a comfort-safe non-PV plan without unhandled error propagation.
    Evidence: .sisyphus/evidence/task-5-boiler-energy-adapter-exception.txt
  ```

  **Commit**: YES | Message: `refactor(boiler): add explicit energy input adapter` | Files: `boiler/coordinator.py`, adapter files, tests

- [x] 6a. Build the comfort-core planner and single-source schedule

  **What to do**: Implement the comfort-first planner core using the frozen planner input contract and thermal model. This task proves the planner can satisfy a target temperature by deadline with one controllable heating source before any PV/alternative-source economics are introduced.
  **Must NOT do**: Do not implement PV allocation, alternative-source scoring, replan trigger orchestration, or UI/API explanation assembly here; those belong to Task 6b.

  **Implementation sequence**:
  1. Write failing tests for the `PlannerInput -> PlanResult` signature, 15-minute slot horizon, comfort target/deadline definition, and thermal-model integration.
  2. Implement the comfort-envelope solver for one source using `boiler/thermal.py` outputs.
  3. Add single-source scheduling for grid/primary electric heating capacity limits.
  4. Add single-source DST/midnight deadline correctness, unsatisfied-comfort fallback, runtime thermometer-unavailability behavior, and 5-second core planner budget enforcement.
  5. Hard commit gate: run Task 6a QA scenarios, write evidence, and commit before Task 6b starts.

  **Recommended Agent Profile**:
  - Category: `ultrabrain` - Reason: core comfort solver correctness with hard constraints
  - Skills: [`test-driven-development`] - planner behavior must be test-first
  - Omitted: [`frontend-ui-ux`] - backend planning logic

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6b,7a,7b,7c,8,9,10,11,12,13 | Blocked By: 1,2,3,4,5

  **References**:
  - `custom_components/oig_cloud/boiler/planner.py` - current boiler planner
  - `custom_components/oig_cloud/boiler/planner_core.py` - target comfort-core planner module
  - `custom_components/oig_cloud/boiler/thermal.py` - target thermal calculation module from Task 3
  - `tests/test_boiler_precedence.py` - current precedence expectations

  **Acceptance Criteria**:
  - [ ] Planner outputs explicitly encode chosen source, comfort constraint satisfaction, and explanation skeleton for one-source plans.
  - [ ] Planner uses 15-minute slots and default 24-hour horizon unless expert horizon configuration overrides the horizon within the allowed 12–48 hour range.
  - [ ] TDD proves comfort never loses to economics for the single-source baseline.
  - [ ] Deadline handling is explicitly correct across midnight/DST boundaries for single-source plans.
  - [ ] Planner exposes explicit `unsatisfied_comfort` outcome and safest-achievable fallback when no one-source plan can meet comfort/deadline.
  - [ ] Runtime top-sensor unavailability enters safe-hold/no-new-actuation behavior; bottom-sensor unavailability degrades to conservative top-only mode with explicit reason code.
  - [ ] Temperature input resolution handles fresh HA states, stale-but-present HA states, and future predicted slot temperatures according to the Thermal Model Contract.
  - [ ] Core planner function returns within the 5-second computation budget measured from fully assembled `PlannerInput` to `PlanResult`.
  - [ ] Task 6a produces a green hard-commit evidence bundle before Task 6b begins.

  **QA Scenarios**:
  ```
  Scenario: Single-source comfort deadline happy path
    Tool: Bash
    Steps: Run planner tests with one primary electric source, validated thermal model, 15-minute slots, and achievable comfort target/deadline.
    Expected: Planner produces source-per-slot actions that reach target temperature by deadline and records `comfort_satisfied`.
    Evidence: .sisyphus/evidence/task-6a-boiler-planner-comfort-core-happy-path.txt

  Scenario: Comfort deadline conflict
    Tool: Bash
    Steps: Run planner tests where delaying to cheapest allowed slot would miss comfort deadline.
    Expected: Planner schedules earlier heating if necessary to satisfy comfort hard constraint.
    Evidence: .sisyphus/evidence/task-6a-boiler-planner-deadline.txt

  Scenario: DST, midnight, and unsatisfied comfort
    Tool: Bash
    Steps: Run planner tests around midnight and DST transition boundaries plus a no-feasible-plan fixture.
    Expected: Deadline semantics stay correct; no skipped/duplicated heating windows; impossible plans return `comfort_unsatisfied` / `no_feasible_plan` with safest fallback.
    Evidence: .sisyphus/evidence/task-6a-boiler-planner-dst-unsatisfied.txt

  Scenario: Runtime thermometer unavailable and planner timeout
    Tool: Bash
    Steps: Run planner tests where top thermometer becomes unavailable, bottom thermometer becomes unavailable in two-sensor setup, top thermometer is stale-but-present, and core planner computation budget is exceeded.
    Expected: Top unavailable enters safe-hold; bottom unavailable degrades to conservative top-only; stale top reading emits `input_stale_temperature` and applies conservative standing-loss bias; timeout emits `planner_timeout` and keeps last safe plan or safe-hold.
    Evidence: .sisyphus/evidence/task-6a-boiler-planner-unavailable-timeout.txt
  ```

  **Commit**: YES | Message: `feat(boiler): add comfort-core planner` | Files: `boiler/planner_core.py`, `boiler/planner.py`, `boiler/thermal.py`, planner tests

- [x] 6b. Add multi-source scoring, PV allocation, and replan mechanics

  **What to do**: Extend the green Task 6a comfort-core planner with PV/overflow allocation, alternative-source economics, ranking tie-breakers, replan trigger/cooldown behavior, stale-input fallback, and final explanation/reason output.
  **Must NOT do**: Do not change the Task 6a thermal formulas or single-source comfort solver except through failing regression tests that prove the previous contract was wrong.

  **Implementation sequence**:
  1. Add PV/overflow slot allocation and residual-energy scoring inside the comfort envelope.
  2. Add alternative-source scoring for `disabled`, `benchmark_only`, and `controllable` modes using currency/kWh thermal equivalent costs.
  3. Add lexicographic ranking tie-breakers exactly as defined: monetary cost, PV/overflow use, actuator-transition count, latest safe slot.
  4. Complete `boiler/runtime.py` replan orchestrator trigger handling, coalescing, 60-second cooldown, forced-event bypass behavior, synchronous adapter invocation, `PlannerInput` assembly, `planner_core` invocation, and `PlanResult` enqueue into the Task 7a serializer seam.
  5. Add all-optimization-inputs-stale behavior, partial-horizon PV data behavior, and explanation/reason output.
  6. Run all Task 6a and 6b planner/runtime orchestrator tests before commit to prove multi-source work did not regress comfort-core behavior.

  **Recommended Agent Profile**:
  - Category: `ultrabrain` - Reason: multi-source scoring, economics, and trigger logic
  - Skills: [`test-driven-development`] - multi-source planner behavior must be regression locked
  - Omitted: [`frontend-ui-ux`] - backend planning logic

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7a,7b,7c,8,9,10,11,12,13 | Blocked By: 1,2,3,4,5,6a

  **References**:
  - `custom_components/oig_cloud/boiler/runtime.py` - replan orchestrator owner
  - `custom_components/oig_cloud/boiler/planner.py` - planner extension target
  - `custom_components/oig_cloud/boiler/planner_core.py` - target multi-source scoring module
  - `custom_components/oig_cloud/battery_forecast/economic_planner_integration.py` - current energy/price fallback patterns
  - `tests/test_pv_first_incident.py` - planning conflict intent
  - `tests/test_e2e_precedence_chain.py` - coupling intent tests

  **Acceptance Criteria**:
  - [ ] Alternative source participates in planning when configured; controllable vs benchmark-only behavior is explicit.
  - [ ] Planner implements lexicographic scoring order from the Planner Algorithm Contract: comfort first, then monetary cost, then PV/overflow use, then actuator-transition minimization, then latest safe heating slot.
  - [ ] Partial PV surplus is allocated per 15-minute slot up to available surplus energy; residual heating need is scored against grid or alternative-source cost.
  - [ ] Planner re-evaluates only on the trigger set from the Planner Re-evaluation Trigger Policy and coalesces same-box replans inside the 60-second cooldown except forced events.
  - [ ] `boiler/runtime.py` observes accepted replan triggers, synchronously invokes the Task 5 adapter, assembles `PlannerInput`, calls `planner_core`, and enqueues accepted `PlanResult` into the Task 7a serializer seam.
  - [ ] `planner_core.py` has no HA listener registration, `hass.data` access, service calls, or actuator side effects.
  - [ ] All-stale optimization inputs are ignored for economics but still allow a comfort-safe fallback with explicit stale reason codes.
  - [ ] Final `PlanResult` includes source-per-slot actions, selected_source, actuated_source, estimated cost/PV usage, freshness/degraded flags, and canonical reason codes.
  - [ ] All Task 6a tests still pass unchanged.

  **QA Scenarios**:
  ```
  Scenario: Multi-source comfort-first plan with PV surplus
    Tool: Bash
    Steps: Run planner tests with 4+ 15-minute slots, varying PV surplus, varying grid prices, configured primary heating capacity, and an achievable comfort target/deadline.
    Expected: Planner selects PV surplus slots first where they fit, uses grid or alternative source only for residual comfort need, and returns source-per-slot actions with explanation and estimated cost/PV usage.
    Evidence: .sisyphus/evidence/task-6b-boiler-planner-pv-happy-path.txt

  Scenario: Alternative source cheaper than grid
    Tool: Bash
    Steps: Run planner tests with alternative-source cost below grid cost and no PV surplus for both benchmark-only and controllable modes.
    Expected: Benchmark-only affects recommendation/explanation without actuation; controllable mode selects alternative source and exposes correct actuated_source intent.
    Evidence: .sisyphus/evidence/task-6b-boiler-planner-alt-source.txt

  Scenario: Replan triggers and cooldown
    Tool: Bash
    Steps: Run scheduler/planner trigger tests for slot boundary, price update, PV update, 0.5 °C temperature delta, override expiry, restart restore, and repeated rapid updates within 60 seconds.
    Expected: Runtime orchestrator accepts required triggers, invokes adapter/planner once per accepted trigger, coalesces rapid same-box updates with `replan_coalesced`, forced events bypass cooldown, and no duplicate concurrent planner execution occurs.
    Evidence: .sisyphus/evidence/task-6b-boiler-planner-replan-triggers.txt

  Scenario: Partial PV horizon and all optimization inputs stale
    Tool: Bash
    Steps: Run planner tests with PV data missing for some future slots and a separate fixture where all price/PV inputs are stale.
    Expected: Partial PV is used only where fresh; stale/missing slots are degraded explicitly; comfort-safe fallback still exists without trusting stale economics.
    Evidence: .sisyphus/evidence/task-6b-boiler-planner-partial-stale-inputs.txt
  ```

  **Commit**: YES | Message: `feat(boiler): add multi-source planner scoring` | Files: `boiler/planner_core.py`, `boiler/planner.py`, planner tests

- [x] 7a. Build the core actuator command serializer

  **What to do**: Create the canonical actuator core that applies/cancels plans through the per-box queue-backed command serializer, persists schedule/runtime state, rejects stale plan versions, handles actuator unavailability, enforces physical transition rate limits, and surfaces Store failures.
  **Must NOT do**: Do not implement manual override TTL lifecycle, circulation pump behavior, or HA switch platform rewiring here; those are Tasks 7b and 7c.

  **Implementation sequence**:
  1. Create `boiler/actuator.py` core command types and queue-backed serializer per `(entry_id, box_id)`.
  2. Implement serializer lifecycle hooks consumed by `boiler/runtime.py`: bounded queue size 32, consumer task startup/shutdown, enqueue rejection/coalescing, consumer exception safe-hold behavior, and unload drain/cancel semantics.
  3. Implement plan apply/cancel with plan_version/config_version stale rejection before execution.
  4. Namespace schedule/runtime persistence by canonical identity using HA `Store` and catch Store failures.
  5. Add per-source transition rate limiting, idempotent duplicate-command behavior, and actuator-unavailability degradation.
  6. Add tests for core apply/cancel, serializer lifecycle, ordering, stale rejection, Store failure, rate limit, and primary/alternative actuator unavailability.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: safety-critical actuator state machine
  - Skills: [`test-driven-development`] - actuation safety must be regression locked
  - Omitted: [`frontend-ui-ux`] - backend actuator core only

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7b,7c,8,9,10,11,12,13 | Blocked By: 1,2,3,4,5,6a,6b

  **References**:
  - `custom_components/oig_cloud/boiler/actuator.py` - target canonical actuator path
  - `custom_components/oig_cloud/services/boiler.py`
  - `custom_components/oig_cloud/services/__init__.py`
  - `tests/test_boiler_services.py`

  **Acceptance Criteria**:
  - [ ] One canonical actuator core applies/cancels boiler plans.
  - [ ] Planner-to-actuator transitions for the same `(entry_id, box_id)` are serialized through the queue-backed command serializer, not a bare lock.
  - [ ] Serializer queue is bounded to 32 commands; lower-priority replan work is rejected/coalesced when full while forced safety/config commands are preserved.
  - [ ] Runtime can start, stop, drain/cancel, and observe the serializer consumer task without leaking tasks during unload.
  - [ ] Serializer consumer exceptions emit `actuator_serializer_error`, enter safe-hold, and do not silently drop future critical commands.
  - [ ] Stale `plan_version` / `config_version` work is rejected before any physical actuation.
  - [ ] Persisted runtime/schedule state is namespaced by canonical boiler identity.
  - [ ] Store read/write failures are caught, emit `storage_write_failed`, keep last successful in-memory state, and do not claim persistence durability until save succeeds.
  - [ ] Physical source actuators obey the one on/off transition per 5-minute rate-limit policy.
  - [ ] `benchmark_only` alternative-source mode never triggers actuation.
  - [ ] Controllable alternative-source mode actuates deterministically when selected by planner.
  - [ ] Primary actuator unavailability pauses actuation and surfaces `primary_actuator_unavailable`; controllable alternative actuator unavailability downgrades that source to benchmark-only behavior with `alternative_actuator_unavailable_benchmark_only`.

  **QA Scenarios**:
  ```
  Scenario: Core actuator apply/cancel and restart restore
    Tool: Bash
    Steps: Run actuator tests with an active canonical plan in persisted storage, then cancel it and restore after restart.
    Expected: Scheduler restores only canonical plan state, applies/cancels exactly once, and does not double-apply actions.
    Evidence: .sisyphus/evidence/task-7a-boiler-actuator-core-restore.txt

  Scenario: Queue serializer rejects stale and concurrent work
    Tool: Bash
    Steps: Run actuator concurrency tests that enqueue stale plan_version, newer plan_version, concurrent same-box plan applications, a full 32-command queue, and a simulated consumer exception.
    Expected: Queue preserves order, rejects stale work before execution, coalesces/rejects lower-priority replan work when full, emits `actuator_serializer_error` on consumer exception, records one final plan_version, and emits no interleaved duplicate commands.
    Evidence: .sisyphus/evidence/task-7a-boiler-actuator-serializer.txt

  Scenario: Serializer lifecycle on HA unload
    Tool: Bash
    Steps: Run runtime/actuator tests that start the serializer consumer, enqueue pending commands, then call `async_unload_entry`.
    Expected: Runtime stops accepting new commands, drains or cancels pending non-critical work, cancels the consumer task, and leaves no leaked tasks or orphan command state.
    Evidence: .sisyphus/evidence/task-7a-boiler-actuator-serializer-lifecycle.txt

  Scenario: Store failure and transition rate limit
    Tool: Bash
    Steps: Run actuator tests where HA Store save raises, then request alternating on/off transitions for the same source within five minutes.
    Expected: Store failure emits `storage_write_failed`; first transition applies; duplicate desired-state commands are idempotent; conflicting rapid transitions are rejected or deferred with rate-limit reason.
    Evidence: .sisyphus/evidence/task-7a-boiler-actuator-storage-rate-limit.txt

  Scenario: Benchmark-only and actuator unavailable behavior
    Tool: Bash
    Steps: Run actuator tests for benchmark-only selected source, controllable alternative-source selected source, primary actuator unavailable, and alternative actuator unavailable.
    Expected: Benchmark-only emits no command; controllable alternative emits canonical on/off command; unavailable actuators degrade exactly per Runtime Entity Unavailability Policy.
    Evidence: .sisyphus/evidence/task-7a-boiler-actuator-source-availability.txt
  ```

  **Commit**: YES | Message: `refactor(boiler): add actuator command serializer` | Files: `boiler/actuator.py`, `services/boiler.py`, `services/__init__.py`, tests

- [x] 7b. Implement manual override lifecycle and recovery semantics

  **What to do**: Layer manual override state, TTL/reason validation, expiry recomputation, restart restore, and crash recovery on top of the green Task 7a actuator serializer.
  **Must NOT do**: Do not add HA switch platform rewiring or circulation pump follower logic here.

  **Implementation sequence**:
  1. Add manual override command/state through the Task 7a command serializer.
  2. Enforce default TTL, min/max TTL, 15-minute increments, and required canonical reason code.
  3. Persist override TTL/reason only when still valid and clear expired override during restore.
  4. On TTL expiry, recompute from current runtime state instead of resuming old persisted plans.
  5. Add crash simulation after command intent persistence but before completion acknowledgement.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: lifecycle/recovery behavior must be deterministic
  - Skills: [`test-driven-development`] - restart/crash behavior needs regression coverage
  - Omitted: [`frontend-ui-ux`] - backend lifecycle only

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7c,8,9,10,11,12,13 | Blocked By: 1,2,3,4,5,6a,6b,7a

  **References**:
  - `custom_components/oig_cloud/boiler/actuator.py` - override lifecycle target
  - `custom_components/oig_cloud/services/boiler.py` - override service path
  - `tests/test_boiler_services.py`

  **Acceptance Criteria**:
  - [ ] Manual override mutations for the same `(entry_id, box_id)` go through the Task 7a command serializer.
  - [ ] Manual override creation requires TTL and canonical reason code; default TTL is 2 hours and allowed TTL range is 15 minutes to 24 hours in 15-minute increments.
  - [ ] Manual override collisions with automatic plan application are explicit and deterministic.
  - [ ] Manual override expiry triggers recompute-from-current-state, not resume-old-plan behavior.
  - [ ] Override TTL/reason survive restart only when still valid; expired override state is cleared during restore.
  - [ ] Crash recovery after command intent persistence reconciles desired vs actual state once and respects plan_version/rate-limit rules.

  **QA Scenarios**:
  ```
  Scenario: Manual override during automatic plan
    Tool: Bash
    Steps: Run actuator tests that simulate external/manual override command during active automatic plan application.
    Expected: Serializer resolves the collision deterministically and records explicit override reason/state.
    Evidence: .sisyphus/evidence/task-7b-boiler-actuator-override-collision.txt

  Scenario: Manual override TTL validation and expiry
    Tool: Bash
    Steps: Run actuator tests where override is created with default TTL, minimum TTL, maximum TTL, invalid TTL, and an override that expires before the next automatic actuation window.
    Expected: Default TTL is 2 hours; allowed range is 15 minutes to 24 hours in 15-minute increments; invalid TTL is rejected; expiry recomputes from live state.
    Evidence: .sisyphus/evidence/task-7b-boiler-actuator-override-expiry.txt

  Scenario: Override restart and crash recovery
    Tool: Bash
    Steps: Run restart/crash simulation tests that interrupt after override command intent persistence but before completion acknowledgement.
    Expected: Restore keeps only still-valid override state, reconciles once, avoids duplicate rapid cycling, and records explicit recovery reason.
    Evidence: .sisyphus/evidence/task-7b-boiler-actuator-override-crash-recovery.txt
  ```

  **Commit**: YES | Message: `feat(boiler): add manual override lifecycle` | Files: `boiler/actuator.py`, `services/boiler.py`, tests

- [x] 7c. Rewire platform integration and circulation pump follower

  **What to do**: Connect the green Task 7a/7b actuator behavior to HA switch/control and sensor platform wiring, plus optional circulation pump follower behavior, retiring old independent circulation-window scheduling and old coordinator-coupled boiler sensors.
  **Must NOT do**: Do not change core actuator serializer or override semantics except through failing regression tests proving a bug in Tasks 7a/7b.

  **Implementation sequence**:
  1. Integrate optional circulation pump follower behavior into the canonical actuator path and retire or adapt `boiler/circulation.py` so no separate circulation-window scheduler remains active.
  2. Rewire switch/control platform registration, unique IDs, and unload behavior to delegate to the actuator path without duplicating execution logic.
  3. Rewire sensor platform registration, sensor unique IDs, state-read routing, reload, and unload behavior so `sensor.py` and `boiler/sensors.py` read through the canonical runtime/read model rather than `BoilerCoordinator` private state.
  4. Verify existing write-service callers either use explicit compatibility shims or deterministic repair/deprecation failure paths.
  5. Add pump follower, switch platform, sensor platform, platform unload/reload, and old-path no-duplicate-actuation regression tests.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: HA platform lifecycle plus pump integration
  - Skills: [`test-driven-development`] - entity lifecycle regressions must be locked
  - Omitted: [`frontend-ui-ux`] - backend/platform integration only

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 8,9,10,11,12,13 | Blocked By: 1,2,3,4,5,6a,6b,7a,7b

  **References**:
  - `custom_components/oig_cloud/boiler/actuator.py` - canonical actuator path
  - `custom_components/oig_cloud/boiler/circulation.py` - existing circulation-window logic to convert or retire
  - `custom_components/oig_cloud/sensor.py` - boiler sensor platform registration path
  - `custom_components/oig_cloud/boiler/sensors.py` - boiler sensor entity classes/read routing
  - `custom_components/oig_cloud/switch.py` - HA switch/control platform wiring
  - `custom_components/oig_cloud/services/boiler.py`
  - `tests/test_boiler_switch_wrapper.py`

  **Acceptance Criteria**:
  - [ ] Configured circulation pump follows active heating actuation only; pump unavailability surfaces `circulation_pump_unavailable` without blocking primary heating.
  - [ ] Existing `boiler/circulation.py` no longer runs an independent circulation-window scheduler after the redesign.
  - [ ] HA switch/control platform registration, unique IDs, reload, and unload behavior delegate to the new actuator path without retaining duplicate actuation logic.
  - [ ] HA sensor platform registration, unique IDs, reload, and unload behavior delegate to the new boiler runtime/read model; boiler sensor entities do not retain direct `BoilerCoordinator` private-state coupling.
  - [ ] Existing old service/platform callers get explicit compatibility shim or deterministic repair/deprecation failure path documented in the commit evidence.

  **QA Scenarios**:
  ```
  Scenario: Circulation pump follower behavior
    Tool: Bash
    Steps: Run actuator/platform tests with optional circulation pump configured through active heating start/stop, idle plan, pump-unavailable state, and legacy circulation-window inputs.
    Expected: Pump turns on only while a heating source is actively heating, turns off otherwise, no independent circulation window is scheduled, and unavailable pump emits `circulation_pump_unavailable` without blocking heating.
    Evidence: .sisyphus/evidence/task-7c-boiler-actuator-circulation-pump.txt

  Scenario: Switch platform delegates to actuator path
    Tool: Bash
    Steps: Run switch wrapper tests for setup, reload, unload, command dispatch, and unique ID stability.
    Expected: Switch platform delegates commands to actuator, does not duplicate actuation logic, unload removes platform state cleanly, and surviving entity IDs stay stable.
    Evidence: .sisyphus/evidence/task-7c-boiler-actuator-switch-platform.txt

  Scenario: Sensor platform delegates to runtime read model
    Tool: Bash
    Steps: Run sensor platform tests for setup, reload, unload, unique ID stability, and state-read routing; grep `sensor.py` and `boiler/sensors.py` for direct coordinator-private field access.
    Expected: Sensor entities read through canonical runtime/read model; no direct coordinator-private coupling remains; unload removes sensor platform state cleanly; surviving entity IDs stay stable.
    Evidence: .sisyphus/evidence/task-7c-boiler-sensor-platform.txt

  Scenario: Legacy caller compatibility does not duplicate commands
    Tool: Bash
    Steps: Run service/platform compatibility tests for old boiler write paths after switch rewiring.
    Expected: Old callers either route through one compatibility shim or fail with deterministic repair/deprecation guidance; no duplicate commands are emitted.
    Evidence: .sisyphus/evidence/task-7c-boiler-actuator-legacy-compat.txt
  ```

  **Commit**: YES | Message: `refactor(boiler): wire actuator and sensor platform integration` | Files: `boiler/actuator.py`, `boiler/circulation.py`, `boiler/sensors.py`, `sensor.py`, `switch.py`, `services/boiler.py`, tests

- [x] 8. Replace the boiler setup flow with explicit simple + expert modes

  **What to do**: Rebuild boiler setup so the default user path is exactly five user-input screens, while advanced physical/planner parameters remain available behind an expert layer. Define the simple-path required fields explicitly, including the screen-to-field grouping from the Setup Screen Definition architecture decision.
  **Must NOT do**: Do not keep the current monolithic boiler step that exposes too many low-level fields too early.

  **Implementation sequence**:
  1. Extract boiler setup into dedicated config modules.
  2. Implement simple screen 1: target box selection and boiler volume.
  3. Implement simple screen 2: top thermometer, optional second thermometer toggle, bottom thermometer.
  4. Implement simple screen 3: primary electric heating actuator, effective power/recovery-rate input, and optional circulation pump.
  5. Implement simple screen 4: alternative-source mode, cost, and controllable entity when required.
  6. Implement simple screen 5: comfort profile/default target/deadline summary.
  7. Layer expert-only fields after the simple path and route setup/options re-entry persistence through the per-box command serializer with tests.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: real config-flow/schema/validation implementation
  - Skills: [`test-driven-development`] - config-flow behavior should be test-first
  - Omitted: [`frontend-ui-ux`] - this is wizard/config first

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 9,10,11,12,13 | Blocked By: 1,2,3,4,5,6a,6b,7a,7b,7c

  **References**:
  - `custom_components/oig_cloud/config/steps.py`
  - `custom_components/oig_cloud/config_flow.py`
  - `custom_components/oig_cloud/translations/en.json`
  - `custom_components/oig_cloud/translations/cs.json`
  - `tests/test_config_flow_wizard_steps.py`, `tests/test_config_options_flow.py`, `tests/test_config_steps_payload.py`

  **Acceptance Criteria**:
  - [ ] Boiler onboarding has a short default path and a separate expert path.
  - [ ] Core inputs (source availability/costs, topology, comfort/profile essentials) are captured explicitly.
  - [ ] Simple path required fields are fixed as: `box_id` selection, boiler volume, top thermometer, optional second thermometer toggle + bottom thermometer, primary electric heating source, primary electric heating effective power/recovery-rate input, alternative source mode (`disabled | benchmark_only | controllable`), optional alternative source cost, controllable alternative source entity when mode = `controllable`, optional circulation pump entity, and comfort profile mode.
  - [ ] Primary heating capacity validation enforces `100–12000 W` for `effective_power_w` or `0.1–30 °C/hour` for `recovery_rate_c_per_hour`; invalid or missing values prevent automatic mode.
  - [ ] Expert-only fields are explicitly defined: stratification tuning, thermometer placement refinements, advanced source tuning, planning horizon tuning, and manual profile correction controls.
  - [ ] Simple path is exactly 5 user-input screens as defined in the Setup Screen Definition; validation/loading/summary screens are excluded from this count.
  - [ ] Wizard/tests/documentation no longer drift on boiler defaults and labels.
  - [ ] Options-flow re-entry and multi-box selection behavior are explicitly covered by tests.
  - [ ] Options-flow config persistence enqueues a `config_update` command through the Task 7a per-box serializer; active planner/actuator work either completes with the old config and is discarded if stale, or replans from the fully persisted new config.
  - [ ] Interrupted or incomplete setup never enables automatic boiler actuation and resumes through config/repair state after restart.

  **QA Scenarios**:
  ```
  Scenario: Simple path completes without expert-only details
    Tool: Bash
    Steps: Run config-flow tests through the normal boiler setup path with only core inputs.
    Expected: Boiler setup completes successfully and stores the expected canonical options.
    Evidence: .sisyphus/evidence/task-8-boiler-setup-simple.txt

  Scenario: Expert path validates advanced parameters
    Tool: Bash
    Steps: Run config-flow tests with stratification and thermometer expert inputs, including invalid combinations.
    Expected: Valid expert inputs persist; invalid ones are rejected with explicit errors.
    Evidence: .sisyphus/evidence/task-8-boiler-setup-expert.txt

  Scenario: Alternative-source setup modes
    Tool: Bash
    Steps: Run config-flow tests for `disabled`, `benchmark_only`, and `controllable` alternative-source setups, including missing controllable entity cases.
    Expected: Setup persists the chosen mode deterministically and requires a controllable entity only for `controllable` mode.
    Evidence: .sisyphus/evidence/task-8-boiler-setup-alt-source.txt

  Scenario: Options-flow re-entry preserves existing config
    Tool: Bash
    Steps: Run options-flow tests that re-enter boiler configuration after initial setup and change one field on each simple-path screen.
    Expected: Existing values are pre-populated; changed values persist under the same canonical `(entry_id, box_id)` namespace without data loss.
    Evidence: .sisyphus/evidence/task-8-boiler-setup-options-reentry.txt

  Scenario: Multi-box setup isolation
    Tool: Bash
    Steps: Run setup tests with two boiler boxes and configure each independently through the simple path.
    Expected: Each box stores its own canonical options and actuator/sensor bindings without cross-contamination.
    Evidence: .sisyphus/evidence/task-8-boiler-setup-multi-box.txt

  Scenario: Restart during incomplete setup
    Tool: Bash
    Steps: Run config-flow restart/resume tests where setup stops after screens 2, 3, and 4.
    Expected: No automatic actuation is enabled; the user resumes in config/repair state with previously entered valid values preserved.
    Evidence: .sisyphus/evidence/task-8-boiler-setup-restart-incomplete.txt

  Scenario: Options-flow update during active planner work
    Tool: Bash
    Steps: Run options-flow tests that change primary heating capacity and thermometer binding while a planner computation is queued/running for the same `(entry_id, box_id)`.
    Expected: Config write goes through the per-box serializer; stale planner result is discarded or old-config work completes without actuation after config_version mismatch; planner recomputes from the fully persisted new config.
    Evidence: .sisyphus/evidence/task-8-boiler-setup-options-concurrency.txt

  ```

  **Commit**: YES | Message: `feat(boiler): redesign setup flow for simple and expert modes` | Files: `config/steps.py`, translations, setup tests

- [x] 9. Define destructive migration, storage cleanup, and repair behavior

  **What to do**: Implement the explicit upgrade path for old boiler configs/schedules/state, including versioned legacy backup, atomic staged writes, restart-safe migration recovery, and deterministic repair/re-onboarding. If legacy state cannot be mapped safely, disable old boiler automation state, clear incompatible persisted schedule data, and raise a deterministic repair/re-onboarding path instead of silently guessing a conversion.
  **Must NOT do**: Do not silently carry forward stale schedules or partial boiler config into the new model.

  **Implementation sequence**:
  1. Detect legacy boiler config/storage versions at setup.
  2. Write a versioned backup of legacy boiler config/schedule/runtime state before any destructive change.
  3. Safe-map only what is provably compatible.
  4. Stage migration writes atomically with an in-progress marker that startup can resume safely.
  5. Disable/clear/raise repair for everything else and test restart behavior.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: migration/storage/repair behavior crosses runtime and setup
  - Skills: [`test-driven-development`] - migration behavior needs explicit regression tests
  - Omitted: [`frontend-ui-ux`] - backend/state cleanup first

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 10,11,12,13 | Blocked By: 1,2,3,4,5,6a,6b,7a,7b,7c,8

  **References**:
  - `custom_components/oig_cloud/services/boiler.py`
  - `custom_components/oig_cloud/boiler/coordinator.py`
  - `custom_components/oig_cloud/config_flow.py`
  - persisted schedule/state stores under boiler runtime files

  **Acceptance Criteria**:
  - [ ] Upgrade behavior is explicit: either safe mapping or deterministic disable + repair/re-onboarding.
  - [ ] Incompatible legacy schedules/state are cleared or archived, never silently reused.
  - [ ] User-facing repair path is deterministic and test-covered.
  - [ ] Migration allowlist/denylist is codified in code and test-covered.
  - [ ] Forced disable/re-onboarding leaves existing physical outputs unchanged while cancelling future scheduled actions.
  - [ ] Entity unique IDs/registry ownership are explicitly preserved for surviving entities and explicitly cleaned up/deprecated for removed entities.
  - [ ] Legacy boiler storage backup is created before destructive migration and is never used to silently re-enable old automation.
  - [ ] Restart during migration resumes to disabled + repair state with future scheduled actions cancelled and physical outputs unchanged.
  - [ ] New migrated boiler storage writes `schema_version=2`; unversioned legacy storage is treated as `schema_version=1`.

  **QA Scenarios**:
  ```
  Scenario: Unsafe legacy boiler config forces re-onboarding
    Tool: Bash
    Steps: Run migration tests with incompatible legacy boiler config/schedule state.
    Expected: Boiler automation is disabled deterministically and repair/re-onboarding path is raised instead of silently guessing a conversion.
    Evidence: .sisyphus/evidence/task-9-boiler-migration-repair.txt

  Scenario: Stale persisted schedule cleanup
    Tool: Bash
    Steps: Run upgrade tests with persisted legacy schedule payloads.
    Expected: Old schedule state is cleared or migrated explicitly; no stale actuation remains live after restart.
    Evidence: .sisyphus/evidence/task-9-boiler-migration-storage.txt

  Scenario: Safe disable state during destructive migration
    Tool: Bash
    Steps: Run migration tests with active legacy schedule/automation state that must be disabled.
    Expected: Future scheduled actions are cancelled, automation is marked disabled, and current physical outputs are left unchanged until explicit new control takes over.
    Evidence: .sisyphus/evidence/task-9-boiler-migration-safe-state.txt

  Scenario: Entity registry cleanup and stability
    Tool: Bash
    Steps: Run migration tests that inspect unique IDs / entity-registry outcomes for surviving and removed boiler entities.
    Expected: Surviving entities keep stable IDs; removed/obsolete entities are cleaned up or deprecated deterministically.
    Evidence: .sisyphus/evidence/task-9-boiler-migration-entities.txt

  Scenario: Restart during staged destructive migration
    Tool: Bash
    Steps: Run migration tests that interrupt Home Assistant after legacy backup is written but before migration finalization.
    Expected: Startup resumes to disabled + repair state, cancels future scheduled actions, preserves physical output state, and does not run stale legacy schedules.
    Evidence: .sisyphus/evidence/task-9-boiler-migration-restart.txt

  Scenario: Legacy backup and schema versioning
    Tool: Bash
    Steps: Run migration tests from unversioned legacy storage and inspect backup + new storage payloads.
    Expected: Backup exists under canonical identity namespace, new payload has `schema_version=2`, and legacy backup is not used for implicit automation restore.
    Evidence: .sisyphus/evidence/task-9-boiler-migration-backup-schema.txt
  ```

  **Commit**: YES | Message: `refactor(boiler): define migration and repair behavior` | Files: migration/storage/runtime/setup files and tests

- [x] 10. Replace the dashboard/API contract with one canonical boiler query model

  **What to do**: Introduce one stable external boiler query/DTO contract for V2 and any surviving read-only legacy consumers. Remove direct entity-internal or coordinator-private coupling from UI APIs. Ensure the contract carries state, plan, source-selection reasoning, freshness, degraded flags, and override context. Use the API Endpoint Strategy architecture decision: one canonical read endpoint per explicit `entry_id + box_id` returning the full DTO, with forecast-window/explanation assembly server-side.
  **Must NOT do**: Do not keep multiple incompatible boiler payload shapes in parallel.

  **Implementation sequence**:
  1. Define the canonical external boiler DTO and route shape.
  2. Update boiler API/query assembly to emit only that shape.
  3. Add contract tests and remove remaining legacy/internal reads.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: backend API/query work with frontend implications
  - Skills: [`test-driven-development`] - contract tests first
  - Omitted: [`frontend-ui-ux`] - API contract layer first

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 11,12,13 | Blocked By: 1,2,3,4,5,6a,6b,7a,7b,7c,8,9

  **References**:
  - `custom_components/oig_cloud/api/ha_rest_api.py`
  - `custom_components/oig_cloud/boiler/api_views.py`
  - `custom_components/oig_cloud/www/js/core/api.js`
  - `custom_components/oig_cloud/www_v2/src/data/*`
  - `tests/test_ha_rest_api_views.py`, `tests/test_boiler_api_views_helper_branches.py`

  **Acceptance Criteria**:
  - [ ] One external boiler DTO/query contract serves V2 and any remaining compatibility surfaces.
  - [ ] Boiler UI/API no longer depend on private sensor or coordinator internals.
  - [ ] Query contract exposes explicit reason/freshness/degraded information.
  - [ ] Canonical boiler read routes and V2 fetches use explicit `entry_id + box_id` identity semantics.
  - [ ] Endpoint strategy is one canonical read endpoint: `GET /api/oig_cloud/boiler/{entry_id}/{box_id}`; no separate client-stitched forecast/explanation endpoint family is introduced in v1.
  - [ ] Forecast-window and explanation assembly no longer depend on battery timeline stitching in the client.
  - [ ] Query DTO top-level keys include `entry_id`, `box_id`, `current_state`, `comfort_status`, `selected_source`, `actuated_source`, `plan_slots`, `reason_codes`, `freshness`, `degraded_flags`, and `manual_override`.

  **QA Scenarios**:
  ```
  Scenario: Boiler query contract is stable
    Tool: Bash
    Steps: Run backend API tests for `GET /api/oig_cloud/boiler/{entry_id}/{box_id}` against a fixture boiler runtime.
    Expected: Response payload includes `entry_id`, `box_id`, `current_state`, `comfort_status`, `selected_source`, `actuated_source`, `plan_slots`, `reason_codes`, `freshness`, `degraded_flags`, and `manual_override`; no private coordinator/sensor internals leak.
    Evidence: .sisyphus/evidence/task-10-boiler-query-contract.txt

  Scenario: Legacy internal access removed
    Tool: Bash
    Steps: Grep target API/frontend bridge files for forbidden coordinator-private field access and run contract tests.
    Expected: Forbidden access paths are absent and contract tests pass.
    Evidence: .sisyphus/evidence/task-10-boiler-query-contract-internals.txt

  Scenario: Legacy API/service caller compatibility bridge
    Tool: Bash
    Steps: Run compatibility tests for existing boiler API/service callers against the cutover contract or documented failure/deprecation path.
    Expected: Old callers either route through an explicit shim or fail with deterministic repair/deprecation behavior.
    Evidence: .sisyphus/evidence/task-10-boiler-query-contract-compat.txt

  Scenario: Canonical endpoint rejects missing or mismatched identity
    Tool: Bash
    Steps: Run API tests for missing `entry_id`, missing `box_id`, unknown box, and mismatched entry/box ownership against `GET /api/oig_cloud/boiler/{entry_id}/{box_id}`.
    Expected: Valid identity returns DTO; invalid identity returns deterministic 4xx/repair response with `api_repair_required` or identity error code and no fallback to first entry/box.
    Evidence: .sisyphus/evidence/task-10-boiler-query-contract-identity-errors.txt
  ```

  **Commit**: YES | Message: `refactor(boiler-api): define canonical boiler query contract` | Files: API/query files, tests

- [x] 11. Rebuild the boiler V2 UI around automatic planning first

  **What to do**: Make V2 the primary boiler UI. Put automatic state, selected source, current plan, and explanation first; make manual overrides secondary. Remove or replace boiler UI surfaces that currently present technical nonsense, stale assumptions, or hidden fallback values. Implement or refactor named V2 boiler UI units equivalent to `BoilerStatusPanel`, `BoilerPlanTimeline`, `BoilerSourceExplanation`, `BoilerOverridePanel`, and `BoilerUnavailableState` inside the existing V2 boiler feature files.
  **Must NOT do**: Do not let V2 fabricate fake boiler state when API data is missing. Do not center the UX on manual controls.

  **Implementation sequence**:
  1. Rebuild boiler data adapters against the canonical DTO only.
  2. Redesign the V2 hierarchy around status/plan/explanation first.
  3. Move manual overrides to a secondary area and add missing-data states.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: V2-first dashboard/UI redesign
  - Skills: [`frontend-ui-ux`, `test-driven-development`] - coherent V2 information hierarchy with real regression coverage
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 12,13 | Blocked By: 1,2,3,4,5,6a,6b,7a,7b,7c,8,9,10

  **References**:
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts`
  - `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts`
  - `custom_components/oig_cloud/www/dashboard.html`
  - `custom_components/oig_cloud/www/boiler-tab.html`
  - `docs/FE_V2_MIGRATION.md`
  - `custom_components/oig_cloud/www_v2/src/__tests__/*`, `tests/fe/specs/dashboard.spec.js`

  **Acceptance Criteria**:
  - [ ] V2 boiler surface communicates automatic plan/status/source/explanation before manual controls.
  - [ ] Missing backend data renders as explicit unavailable/degraded states, not fake defaults.
  - [ ] Boiler V2 tests cover primary status/plan/explanation states and manual override entry points.
  - [ ] V2 boiler sections expose stable test selectors: `[data-testid="boiler-status-panel"]`, `[data-testid="boiler-plan-timeline"]`, `[data-testid="boiler-source-explanation"]`, `[data-testid="boiler-override-panel"]`, and `[data-testid="boiler-unavailable-state"]`.
  - [ ] Status section renders `current_state`, `comfort_status`, `selected_source`, `actuated_source`, and `degraded_flags` from the canonical DTO.
  - [ ] Plan timeline section renders per-slot source, expected temperature/comfort result, estimated cost, and PV/overflow contribution when present.
  - [ ] Explanation section renders reason codes, freshness/degraded reasons, and unsatisfied-comfort gap if present.
  - [ ] Manual override controls are secondary/collapsed or visually subordinate, require explicit TTL/reason input, default TTL to 2 hours, enforce the 15-minute to 24-hour range in 15-minute increments, and are disabled when canonical identity or actuator capability is unavailable.
  - [ ] Loading, API error, unavailable, and degraded states have explicit UI text/translation keys and no fabricated temperature/plan values.
  - [ ] Any new V2 boiler UI string introduced in this task has EN/CS translation keys added in the same task; Task 13 may refine wording but must not be required to fix missing keys.

  **QA Scenarios**:
  ```
  Scenario: Automatic plan-first boiler UI
    Tool: Bash
    Steps: Run V2 unit tests and, if available, browser checks for the boiler view using representative API fixtures.
    Expected: Automatic plan/status/explanation is primary; manual overrides are secondary but reachable.
    Evidence: .sisyphus/evidence/task-11-boiler-v2-ui.txt

  Scenario: Missing data handling
    Tool: Bash
    Steps: Run V2 tests with incomplete boiler DTO payloads.
    Expected: UI shows unavailable/degraded state, never fabricated temperatures or fake plan data.
    Evidence: .sisyphus/evidence/task-11-boiler-v2-ui-degraded.txt

  Scenario: Plan timeline and explanation rendering
    Tool: Bash
    Steps: Run V2 tests with canonical DTO fixtures containing source-per-slot plan actions, PV contribution, cost estimate, reason codes, freshness flags, and unsatisfied-comfort gap.
    Expected: Status, timeline, and explanation sections render those exact DTO fields in priority order and do not derive data from coordinator/entity internals.
    Evidence: .sisyphus/evidence/task-11-boiler-v2-ui-timeline-explanation.txt

  Scenario: Loading and API error states
    Tool: Bash
    Steps: Run V2 tests with pending fetch, 404/repair-needed response, and 500/error response fixtures.
    Expected: UI renders translated loading/error/unavailable messages, disables unsafe controls, and never shows stale fabricated boiler values.
    Evidence: .sisyphus/evidence/task-11-boiler-v2-ui-loading-errors.txt

  Scenario: Browser-level V2 boiler smoke check
    Tool: Playwright
    Steps: Open the V2 dashboard with canonical boiler DTO fixtures; assert `[data-testid="boiler-status-panel"]`, `[data-testid="boiler-plan-timeline"]`, `[data-testid="boiler-source-explanation"]`, and `[data-testid="boiler-override-panel"]` are visible; reload with unavailable DTO fixture and assert `[data-testid="boiler-unavailable-state"]` is visible and override submit controls are disabled.
    Expected: Browser-rendered UI matches the plan-first hierarchy, selectors exist, unavailable state is explicit, and no fake temperature/plan values are displayed.
    Evidence: .sisyphus/evidence/task-11-boiler-v2-ui-browser-smoke.png
  ```

  **Commit**: YES | Message: `feat(boiler-ui): redesign V2 boiler surface around automatic planning` | Files: `www_v2/src/ui/features/boiler/*`, frontend tests, `translations/en.json`, `translations/cs.json`

- [x] 12. Degrade V1 boiler UX to explicit read-only mode

  **What to do**: Stop treating V1 as a co-equal target. Make the V1 boiler surface explicitly read-only with clear messaging that V2 is the maintained and editable surface. Update docs accordingly.
  **Must NOT do**: Do not leave two divergent editable boiler UIs after redesign.

  **Implementation sequence**:
  1. Remove or disable editable V1 boiler controls.
  2. Add an explicit redirect/read-only notice to V1.
  3. Update docs so users see one primary boiler UI path.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: product surface reduction + docs alignment
  - Skills: [`frontend-ui-ux`, `test-driven-development`] - clean deprecation/read-only treatment with regression coverage
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 13 | Blocked By: 1,2,3,4,5,6a,6b,7a,7b,7c,8,9,10,11

  **References**:
  - `custom_components/oig_cloud/www/dashboard.html`
  - `custom_components/oig_cloud/www/boiler-tab.html`
  - `docs/user/DASHBOARD.md`, `docs/user/FAQ.md`, `docs/user/TROUBLESHOOTING.md`

  **Acceptance Criteria**:
  - [ ] V1 boiler surface is explicitly degraded to read-only with redirect/notice semantics.
  - [ ] Docs no longer imply equal support for old and new boiler surfaces.
  - [ ] There is one clear primary boiler UI path for users.
  - [ ] Existing V1 boiler routes loaded mid-session after update show read-only notice and disabled edit controls; attempted V1 writes do not emit boiler service calls.

  **QA Scenarios**:
  ```
  Scenario: V1 boiler surface no longer competes with V2
    Tool: Bash
    Steps: Run frontend/docs checks and inspect V1 boiler entry points.
    Expected: V1 no longer acts as a full editable boiler control surface.
    Evidence: .sisyphus/evidence/task-12-boiler-v1-readonly.txt

  Scenario: User docs align with target UI
    Tool: Bash
    Steps: Grep user docs for obsolete boiler dashboard/setup directions.
    Expected: Docs point to the new primary V2 boiler experience and current setup flow.
    Evidence: .sisyphus/evidence/task-12-boiler-v1-readonly-docs.txt

  Scenario: Mid-session V1 user cannot write stale controls
    Tool: Bash
    Steps: Run frontend tests or static event-handler tests for existing V1 boiler routes with controls rendered from a pre-update page state.
    Expected: Edit controls are disabled or replaced by read-only notice; no boiler write service call is emitted from V1.
    Evidence: .sisyphus/evidence/task-12-boiler-v1-readonly-mid-session.txt
  ```

  **Commit**: YES | Message: `docs(boiler): degrade V1 boiler UX to read-only` | Files: V1 boiler UI/docs files

- [x] 13. Final boiler polish: docs, translations, and release-facing clarity

  **What to do**: Write the simple setup guide, update user docs, align translations, and ensure release-facing explanation text matches the new boiler model everywhere.
  **Must NOT do**: Do not leave stale copy about old dashboard paths, old telemetry/config assumptions, or non-existent boiler behaviors.

  **Implementation sequence**:
  1. Write the boiler simple-setup guide from the final flow.
  2. Align docs/terminology across setup, planner, and V2 boiler UI.
  3. Verify EN/CS translation parity and remove stale boiler copy.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: docs and explanatory copy are first-class deliverables
  - Skills: [`frontend-ui-ux`] - helpful for naming and explanatory consistency
  - Omitted: [`test-driven-development`] - documentation task

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: none | Blocked By: 1,2,3,4,5,6a,6b,7a,7b,7c,8,9,10,11,12

  **References**:
  - `docs/user/CONFIGURATION.md`
  - `docs/user/DASHBOARD.md`
  - `docs/user/PLANNER.md`
  - `docs/user/SERVICES.md`
  - `custom_components/oig_cloud/translations/en.json`
  - `custom_components/oig_cloud/translations/cs.json`

  **Acceptance Criteria**:
  - [ ] Boiler setup guide matches the new simple + expert flow.
  - [ ] Boiler planner docs explain comfort-first automatic planning with alternative-source economics.
  - [ ] UI/docs/translations use one consistent vocabulary.
  - [ ] Documentation examples are checked against canonical DTO/setup fixtures and do not describe behavior that runtime tests disprove.

  **QA Scenarios**:
  ```
  Scenario: Boiler docs match actual setup and UI
    Tool: Bash
    Steps: Grep docs/translations and compare against current config flow + V2 file names/labels.
    Expected: No stale boiler docs or contradictory copy remain.
    Evidence: .sisyphus/evidence/task-13-boiler-docs-alignment.txt

  Scenario: Translation parity
    Tool: Bash
    Steps: Compare key boiler strings across EN/CS translation files.
    Expected: Core boiler setup/planner/UI terms exist in both and reflect the same model.
    Evidence: .sisyphus/evidence/task-13-boiler-docs-translations.txt

  Scenario: Documentation examples match fixtures
    Tool: Bash
    Steps: Run or inspect docs/fixture consistency checks comparing setup guide fields, planner examples, and canonical DTO fixture names used in UI/API tests.
    Expected: Docs describe the same field names, source states, reason codes, and setup screens exercised by tests.
    Evidence: .sisyphus/evidence/task-13-boiler-docs-fixtures.txt
  ```

  **Commit**: YES | Message: `docs(boiler): align setup guide and planner terminology` | Files: docs + translations

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents plus 1 end-to-end QA check run in PARALLEL where tooling allows. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F5 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
  - [ ] Every acceptance criterion in Tasks 1–13, including 6a, 6b, 7a, 7b, and 7c, has corresponding passing evidence.
  - [ ] No delivered behavior contradicts an Architecture Decision, Identity Transport Rule, Reason Code Appendix, or Must NOT Have guardrail.
  - [ ] Evidence: `.sisyphus/evidence/final-f1-plan-compliance.md`

- [ ] F2. Code Quality Review — unspecified-high
  - [ ] New boiler modules have single responsibility and do not duplicate old/new active implementations in parallel.
  - [ ] No source file introduces ad-hoc coordinator-private reads, hardcoded box IDs, fake UI data, or unbounded planner/actuator loops.
  - [ ] Evidence: `.sisyphus/evidence/final-f2-code-quality.md`

- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
  - [ ] Agent executes browser/UI smoke coverage for V2 boiler status, timeline, explanation, unavailable state, and override controls.
  - [ ] Agent captures screenshots or traces proving V1 read-only degradation and V2 primary path behavior.
  - [ ] Evidence: `.sisyphus/evidence/final-f3-manual-qa.md` plus screenshots under `.sisyphus/evidence/`

- [ ] F4. Scope Fidelity Check — deep
  - [ ] No New Relic/legacy telemetry redesign, battery planner redesign, 3+ thermometer model, complex alternative-source actuator, or V1 editable UI scope slipped in.
  - [ ] Migration behavior matches allowlist/denylist and never guesses legacy schedules/source capability.
  - [ ] Evidence: `.sisyphus/evidence/final-f4-scope-fidelity.md`

- [ ] F5. End-to-End Boiler Flow QA — unspecified-high (`setup → plan → actuate → override → TTL expiry → recompute → restart restore/recover`)
  - [ ] One canonical boiler instance completes setup, produces comfort-safe plan, applies actuator command, handles manual override TTL expiry, recomputes, and restores after restart.
  - [ ] Flow also verifies one failure branch: unavailable top thermometer or unavailable primary actuator enters explicit degraded/safe-hold state.
  - [ ] Evidence: `.sisyphus/evidence/final-f5-e2e-boiler-flow.md`

## Commit Strategy
- Keep the redesign in layered commits that match the domain decomposition:
  1. identity/routing
  2. internal domain boundary
  3. thermal/topology validation
  4. planner input contract
  5. energy adapter
  6a. comfort-core planner
  6b. multi-source planner scoring
  7a. actuator command serializer
  7b. manual override lifecycle
  7c. platform/circulation integration
  8. setup flow
  9. migration/repair cleanup
  10. query/API contract
  11. V2 UI
  12. V1 read-only degradation
  13. docs/translations
- Tests for each layer stay in the same commit as their implementation.

## Success Criteria
- Boiler becomes a standalone subsystem with explicit boundaries.
- Automatic boiler planning is explainable, comfort-safe, and source-aware.
- Alternative source economics/control are first-class.
- V2 becomes the obvious primary boiler UI.
- Setup becomes understandable for normal users while preserving expert power.
- The old “UI says nonsense / planner is implicit / backend is coupled” failure mode is structurally removed, not cosmetically hidden.
