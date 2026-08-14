# Pre-deploy Planner and Recorder Integrity Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix planner input coherence, retry lifecycle ownership, invalid daily-energy publication, and Recorder-safe daily-cycle migration before direct Home Assistant deployment.

**Architecture:** Introduce one immutable BOX-floor snapshot that crosses planning and commit, one generation-owned retry timer, and one focused daily-energy module containing pure validation and marker-state transitions. Integrate the pure contracts at existing entity seams, prove migration with Home Assistant's real Recorder, then run a different-model `agent-ops` review and the full release gate set.

**Tech Stack:** Python 3.14.3, Home Assistant 2026.8.1, pytest 9.0.3, pytest-homeassistant-custom-component 0.13.355, Home Assistant Recorder, RestoreEntity `ExtraStoredData`, HP `agent-ops` fleet runtime.

## Global Constraints

- Design base: `bf99703811574321b4f165626ed3b12d9edd74ec`.
- Implement the contract in `docs/superpowers/specs/2026-08-12-predeploy-integrity-hardening.md` without weakening it.
- Use HP installed `/usr/local/bin/fleet-launch` inside `ctrl-opencode-horak`; never run scripts from the dirty `/repos/agent-ops` checkout.
- Every `agent-ops` worker uses a dedicated `/repos/wt-*` worktree and immutable base SHA.
- Delegated briefs, plans, handoffs, reviews, and commit messages use telegraphic English Markdown with no emoji or ASCII emoticons.
- Use TDD: record valid behavioral RED before production changes, then focused GREEN.
- Preserve entity ID, unique ID, statistic ID, Recorder history, units, and provider/scheduler behavior.
- No Recorder database rewrite, entity fork, dependency update, frontend change, GitHub push, or PR.
- Daily-energy accepted range is exactly inclusive `0..1_000_000_000 Wh`.
- Canonical Python: CPython 3.14.3, Home Assistant 2026.8.1, plugin 0.13.355.
- Required final gates: full pytest, coverage above `80.01%`, Flake8, Mypy, canonical Pylint E0/F0, Bandit, Gitleaks, security diff scan, dependency classification, and two consecutive all-files pre-commit passes.

---

### Task 1: Make BOX battery-floor planning transactional

**Files:**
- Modify: `custom_components/oig_cloud/battery_forecast/planning/forecast_update.py:291-329,1020-1085,1645-1740`
- Modify: `tests/test_battery_min_startup_readiness.py`
- Create: `tests/test_battery_floor_snapshot_transaction.py`

**Interfaces:**
- Produces: frozen `BoxFloorSnapshot` with `entity_id`, `percent`, `reason_class`, `raw_state`, `last_updated`, and `local_mode`.
- Produces: `_proxy_bat_min_entity_id(sensor: Any) -> str | None`.
- Produces: `_capture_box_floor_snapshot(sensor: Any) -> BoxFloorSnapshot`.
- Produces: `_box_floor_snapshot_is_current(sensor: Any, snapshot: BoxFloorSnapshot) -> bool`.
- Changes: `_run_planner(..., box_floor: BoxFloorSnapshot, ...)` consumes the snapshot and performs no live floor read.
- Consumes: existing `_resolve_proxy_bat_min()` classification and planner inputs.

- [ ] **Step 1: Add an awaited-mutation RED test**

```python
async def test_bat_min_change_during_input_collection_discards_every_result_side_effect(
    hass, planner_env, monkeypatch
):
    sensor = _PlannerSensor(hass)
    _set_floor(hass, "15", changed_at="2026-08-12T08:00:00+00:00")

    async def mutate_during_collection(*_args, **_kwargs):
        _set_floor(hass, "unavailable", changed_at="2026-08-12T08:00:01+00:00")

    monkeypatch.setattr(
        forecast_update_module,
        "_maybe_apply_solar_correction",
        mutate_during_collection,
    )
    await forecast_update_module.async_update(sensor)

    assert sensor._timeline_data == []
    assert sensor.write_called is False
    assert planner_env.summary_events == []
    assert planner_env.dispatches == []
    assert planner_env.daily_plan_writes == []
```

- [ ] **Step 2: Add a post-plan/pre-commit RED test and stable control**

```python
async def test_floor_identity_change_before_commit_discards_plan(monkeypatch, planner_env):
    snapshot = planner_env.floor("15", "2026-08-12T08:00:00+00:00")
    planner_env.change_floor_after_planner("16", "2026-08-12T08:00:02+00:00")
    await planner_env.run()
    assert planner_env.all_result_side_effects == []
    assert planner_env.sensor._last_forecast_bucket is None

async def test_stable_floor_snapshot_commits_once(planner_env):
    planner_env.floor("15", "2026-08-12T08:00:00+00:00")
    await planner_env.run()
    assert planner_env.applied_floor_percent == 15.0
    assert planner_env.result_apply_count == 1
    assert planner_env.dispatch_count == 1
```

- [ ] **Step 3: Run Task 1 RED**

Run:

```bash
.venv-task1-r2/bin/python -m pytest -q \
  tests/test_battery_floor_snapshot_transaction.py \
  tests/test_battery_min_startup_readiness.py
```

Expected: new mutation assertions fail because planning re-reads the live floor and commits inconsistent results; stable existing controls pass.

- [ ] **Step 4: Add the immutable snapshot and thread it through planning**

```python
@dataclass(frozen=True, slots=True)
class BoxFloorSnapshot:
    entity_id: str | None
    percent: float | None
    reason_class: str
    raw_state: str | None
    last_updated: datetime | None
    local_mode: bool


def _capture_box_floor_snapshot(sensor: Any) -> BoxFloorSnapshot:
    entity_id = _proxy_bat_min_entity_id(sensor)
    state = sensor.hass.states.get(entity_id) if entity_id else None
    raw_state = state.state if state else None
    percent, reason_class = _classify_proxy_bat_min_state(
        raw_state,
        entity_exists=state is not None,
        context_exists=entity_id is not None,
    )
    entry = getattr(sensor, "_config_entry", None)
    return BoxFloorSnapshot(
        entity_id=entity_id,
        percent=percent,
        reason_class=reason_class,
        raw_state=raw_state,
        last_updated=state.last_updated if state else None,
        local_mode=(
            entry is not None
            and get_configured_mode(entry) != DATA_SOURCE_CLOUD_ONLY
        ),
    )
```

The capture reads Home Assistant state exactly once, then classifies that captured raw token. Refactor `_resolve_proxy_bat_min()` to return `(_capture_box_floor_snapshot(sensor).percent, reason_class)` only for backward-compatible callers; it must not be used inside the transactional path. Capture once before `_should_defer_for_box_floor()`. Pass the same object through `_prepare_forecast_inputs()` and `_run_planner()`. Remove the live `_resolve_proxy_bat_min()` call from `_run_planner()`.

- [ ] **Step 5: Add the fail-closed commit gate before every result side effect**

```python
if not _box_floor_snapshot_is_current(sensor, box_floor):
    sensor._log_rate_limited(
        "box_floor_changed_before_commit",
        "debug",
        "BOX floor changed during planner run; discarding result",
        cooldown_s=300.0,
    )
    return

await _emit_planner_summary_event(...)
_apply_planner_results(...)
```

Keep `mark_bucket_done = False` until the identity gate succeeds.

- [ ] **Step 6: Run Task 1 GREEN**

Run the Step 3 command. Expected: all tests pass; mutation cases produce zero result side effects.

- [ ] **Step 7: Commit Task 1**

```bash
git add custom_components/oig_cloud/battery_forecast/planning/forecast_update.py \
  tests/test_battery_floor_snapshot_transaction.py \
  tests/test_battery_min_startup_readiness.py
git commit -m "fix: bind battery plans to one floor snapshot"
```

### Task 2: Own forecast retries through entity lifecycle

**Files:**
- Modify: `custom_components/oig_cloud/battery_forecast/sensors/sensor_setup.py:75-90`
- Modify: `custom_components/oig_cloud/battery_forecast/sensors/sensor_lifecycle.py:15-35`
- Modify: `custom_components/oig_cloud/battery_forecast/sensors/sensor_runtime.py:86-90`
- Modify: `custom_components/oig_cloud/battery_forecast/task_utils.py:14-26`
- Modify: `tests/test_battery_forecast_sensor_runtime_more.py`
- Create: `tests/test_battery_forecast_retry_lifecycle.py`

**Interfaces:**
- Produces: `cancel_forecast_retry(sensor: Any) -> None`.
- Produces fields: `_forecast_lifecycle_generation: int`, `_forecast_lifecycle_active: bool`.
- Consumes: `_forecast_retry_unsub` and `create_task_threadsafe()`.

- [ ] **Step 1: Add lifecycle RED tests**

```python
def test_unload_unsubscribes_retry_once_and_invalidates_dequeued_callback(monkeypatch):
    sensor, timer = make_sensor_with_captured_timer(monkeypatch)
    task_utils.schedule_forecast_retry(sensor, 10.0)
    callback = timer.callback

    sensor_runtime.handle_will_remove(sensor)
    sensor_runtime.handle_will_remove(sensor)
    callback(dt_util.now())

    assert timer.unsubscribe_calls == 1
    assert sensor.created_tasks == []
    assert sensor._forecast_retry_unsub is None

def test_active_same_generation_retry_runs_once(monkeypatch):
    sensor, timer = make_sensor_with_captured_timer(monkeypatch)
    task_utils.schedule_forecast_retry(sensor, 10.0)
    timer.callback(dt_util.now())
    assert sensor.created_tasks == [sensor.async_update]
```

- [ ] **Step 2: Run Task 2 RED**

Run:

```bash
.venv-task1-r2/bin/python -m pytest -q \
  tests/test_battery_forecast_retry_lifecycle.py \
  tests/test_battery_forecast_sensor_runtime_more.py
```

Expected: teardown leaves the timer armed and the captured callback schedules work.

- [ ] **Step 3: Initialize and activate lifecycle identity**

In `initialize_sensor()`:

```python
sensor._forecast_lifecycle_generation = 0
sensor._forecast_lifecycle_active = False
```

At the start of `async_added_to_hass()` after Home Assistant attachment:

```python
sensor._forecast_lifecycle_generation += 1
sensor._forecast_lifecycle_active = True
```

- [ ] **Step 4: Make timer creation and cancellation generation-aware**

```python
def cancel_forecast_retry(sensor: Any) -> None:
    unsub = sensor._forecast_retry_unsub
    sensor._forecast_retry_unsub = None
    if unsub is not None:
        unsub()


def schedule_forecast_retry(sensor: Any, delay_seconds: float) -> None:
    generation = sensor._forecast_lifecycle_generation

    def _retry(now: datetime) -> None:
        sensor._forecast_retry_unsub = None
        if not sensor._forecast_lifecycle_active:
            return
        if sensor._forecast_lifecycle_generation != generation:
            return
        create_task_threadsafe(sensor, sensor.async_update)
```

Teardown order:

```python
sensor._forecast_lifecycle_active = False
sensor._forecast_lifecycle_generation += 1
task_utils_module.cancel_forecast_retry(sensor)
auto_switch_module.cancel_auto_switch_schedule(sensor)
auto_switch_module.stop_auto_switch_watchdog(sensor)
```

- [ ] **Step 5: Run Task 2 GREEN**

Run the Step 2 command. Expected: all tests pass; repeated teardown is idempotent; stale callback is inert.

- [ ] **Step 6: Commit Task 2**

```bash
git add custom_components/oig_cloud/battery_forecast/sensors/sensor_setup.py \
  custom_components/oig_cloud/battery_forecast/sensors/sensor_lifecycle.py \
  custom_components/oig_cloud/battery_forecast/sensors/sensor_runtime.py \
  custom_components/oig_cloud/battery_forecast/task_utils.py \
  tests/test_battery_forecast_retry_lifecycle.py \
  tests/test_battery_forecast_sensor_runtime_more.py
git commit -m "fix: bind forecast retries to entity lifecycle"
```

### Task 3: Validate daily energy and preserve the last good value

**Files:**
- Create: `custom_components/oig_cloud/entities/daily_energy.py`
- Modify: `custom_components/oig_cloud/entities/data_sensor.py:1-90,130-150,219-265,770-790`
- Modify: `custom_components/oig_cloud/sensors/SENSOR_TYPES_DC_IN.py:7-27`
- Create: `tests/test_daily_energy_validation.py`

**Interfaces:**
- Produces: `MAX_DAILY_ENERGY_WH = 1_000_000_000.0`.
- Produces: frozen `DailyEnergySample(value_wh: float | None, reason_class: str)`.
- Produces: `classify_daily_energy_wh(raw: Any) -> DailyEnergySample`.
- Produces configuration key: `validated_daily_energy: True` only for `dc_in_fv_ad`.
- Consumes: entity `_fallback_value()` and coordinator-shaped node data.

- [ ] **Step 1: Add pure validation and entity-path RED tables**

```python
@pytest.mark.parametrize(
    "raw",
    [True, False, "", "nope", float("nan"), float("inf"), float("-inf"), -1, 1_000_000_001],
)
def test_invalid_daily_energy_is_rejected(raw):
    result = classify_daily_energy_wh(raw)
    assert result.value_wh is None
    assert result.reason_class != "ok"

@pytest.mark.parametrize("raw, expected", [(0, 0.0), (1, 1.0), ("19497", 19497.0), (1_000_000_000, 1_000_000_000.0)])
def test_valid_daily_energy_is_normalized(raw, expected):
    assert classify_daily_energy_wh(raw) == DailyEnergySample(expected, "ok")
```

Add cloud-shaped and local-shaped coordinator tests that publish one valid sample, then each invalid sample, and assert the sensor still returns the prior valid value.

- [ ] **Step 2: Add real Recorder invalid-sample RED**

```python
async def test_negative_daily_energy_never_changes_recorder_sum(
    recorder_mock_compat, hass, freezer
):
    sensor = await publish_valid_daily_energy(hass, value=1000)
    before = await latest_sum(hass)
    await publish_raw_daily_energy(hass, sensor, value=-100)
    after = await latest_sum(hass)
    assert sensor.state == 1000.0
    assert after == before
```

- [ ] **Step 3: Run Task 3 RED**

Run:

```bash
.venv-task1-r2/bin/python -m pytest -q \
  tests/test_daily_energy_validation.py
```

Expected: helper import or invalid-value assertions fail; current Recorder accepts the negative sample.

- [ ] **Step 4: Implement the pure validator**

```python
MAX_DAILY_ENERGY_WH = 1_000_000_000.0


@dataclass(frozen=True, slots=True)
class DailyEnergySample:
    value_wh: float | None
    reason_class: str


def classify_daily_energy_wh(raw: Any) -> DailyEnergySample:
    if isinstance(raw, bool):
        return DailyEnergySample(None, "boolean")
    if isinstance(raw, str) and not raw.strip():
        return DailyEnergySample(None, "empty")
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return DailyEnergySample(None, "malformed")
    if not math.isfinite(value):
        return DailyEnergySample(None, "non_finite")
    if value < 0.0:
        return DailyEnergySample(None, "negative")
    if value > MAX_DAILY_ENERGY_WH:
        return DailyEnergySample(None, "above_max")
    return DailyEnergySample(value, "ok")
```

- [ ] **Step 5: Integrate validation before state publication**

Add `validated_daily_energy: True` only to `dc_in_fv_ad`. Initialize `self._daily_energy_invalid_log_ts: dict[str, float] = {}`. In `OigCloudDataSensor.state`, classify the raw node value before returning it. On rejection, return `_fallback_value()` and log only `sensor_type` plus `reason_class` when `time.monotonic() - last_reason_log >= 300.0`. Do not include the raw value or exception.

- [ ] **Step 6: Run Task 3 GREEN**

Run the Step 3 command. Expected: all pure, cloud, local, fallback, safe-log, and Recorder tests pass.

- [ ] **Step 7: Commit Task 3**

```bash
git add custom_components/oig_cloud/entities/daily_energy.py \
  custom_components/oig_cloud/entities/data_sensor.py \
  custom_components/oig_cloud/sensors/SENSOR_TYPES_DC_IN.py \
  tests/test_daily_energy_validation.py
git commit -m "fix: validate daily energy before recorder"
```

### Task 4: Migrate the daily reset marker without rewriting history

**Files:**
- Modify: `custom_components/oig_cloud/entities/daily_energy.py`
- Modify: `custom_components/oig_cloud/entities/data_sensor.py:40-160,330-360`
- Modify: `tests/test_dc_in_fv_ad_daily_cycle.py`
- Create: `tests/test_daily_energy_marker_restore.py`
- Create: `tests/test_daily_energy_recorder_migration.py`

**Interfaces:**
- Produces: frozen `DailyCycleMarkerState(armed, last_value_wh, last_local_date)`.
- Produces: `DailyCycleRestoreData(ExtraStoredData)` with `version = 1`.
- Produces: `restore_daily_cycle_marker(restored_value, restored_local_date, payload) -> DailyCycleMarkerState`.
- Produces: `observe_daily_cycle_value(state, value_wh, local_date) -> DailyCycleMarkerState`.
- Consumes: validated daily-energy values from Task 3 and Home Assistant local date.

- [ ] **Step 1: Add pure state-machine RED tests**

```python
def test_new_entity_is_armed_immediately():
    state = restore_daily_cycle_marker(None, None, None)
    assert state.armed is True

def test_legacy_restore_stays_unarmed_until_lower_value_on_later_local_day():
    state = restore_daily_cycle_marker(19497.0, date(2026, 8, 11), None)
    stale = observe_daily_cycle_value(state, 19497.0, date(2026, 8, 12))
    assert stale.armed is False
    assert stale.last_local_date == date(2026, 8, 11)
    rolled = observe_daily_cycle_value(stale, 0.0, date(2026, 8, 12))
    assert rolled.armed is True
```

Add cases for versioned armed restore, versioned unarmed restore, malformed payload, same-day small dip, restart while unarmed, and restart after arming.

- [ ] **Step 2: Add real Recorder upgrade RED**

```python
async def test_legacy_total_increasing_history_is_not_double_counted_on_first_total_sample(
    recorder_mock_compat, hass, freezer
):
    await seed_legacy_total_increasing(hass, values=[1000, 1100])
    sensor = await restore_new_entity_without_marker_extra(hass, state=1100)
    await publish(sensor, value=1200, same_local_day=True)
    assert sensor.last_reset is None
    assert await latest_sum(hass) == pytest.approx(200.0)

    await publish(sensor, value=0, next_local_day=True)
    assert sensor.last_reset == dt_util.start_of_local_day()
    assert await latest_sum(hass) == pytest.approx(200.0)
```

- [ ] **Step 3: Run Task 4 RED**

Run:

```bash
.venv-task1-r2/bin/python -m pytest -q \
  tests/test_daily_energy_marker_restore.py \
  tests/test_daily_energy_recorder_migration.py \
  tests/test_dc_in_fv_ad_daily_cycle.py
```

Expected: legacy restore publishes the first marker immediately and Recorder overcounts; pure marker helpers are absent.

- [ ] **Step 4: Implement versioned restore data and pure transition**

```python
@dataclass(frozen=True, slots=True)
class DailyCycleMarkerState:
    armed: bool
    last_value_wh: float | None
    last_local_date: date | None


class DailyCycleRestoreData(ExtraStoredData):
    def __init__(self, state: DailyCycleMarkerState) -> None:
        self._state = state

    def as_dict(self) -> dict[str, Any]:
        return {
            "daily_cycle_marker": {
                "version": 1,
                "armed": self._state.armed,
                "last_value_wh": self._state.last_value_wh,
                "last_local_date": (
                    self._state.last_local_date.isoformat()
                    if self._state.last_local_date
                    else None
                ),
            }
        }
```

While unarmed, retain the pre-boundary reference when a later-day value is equal or higher. Arm only when the later-day validated value is strictly lower.

- [ ] **Step 5: Integrate RestoreEntity lifecycle**

During `async_added_to_hass()`:

```python
last_state = await self.async_get_last_state()
extra = await self.async_get_last_extra_data()
self._daily_cycle_marker_state = restore_daily_cycle_marker(
    restored_value,
    restored_local_date,
    extra.as_dict() if extra else None,
)
```

Expose `extra_restore_state_data` only for the configured daily-cycle sensor. Observe every accepted Task 3 value before Home Assistant publishes it. Return `None` from `last_reset` until `armed` is true.

- [ ] **Step 6: Run Task 4 GREEN**

Run the Step 3 command. Expected: all state-machine, restart, stale-cache, current daily-cycle, and real Recorder migration tests pass.

- [ ] **Step 7: Commit Task 4**

```bash
git add custom_components/oig_cloud/entities/daily_energy.py \
  custom_components/oig_cloud/entities/data_sensor.py \
  tests/test_daily_energy_marker_restore.py \
  tests/test_daily_energy_recorder_migration.py \
  tests/test_dc_in_fv_ad_daily_cycle.py
git commit -m "fix: migrate daily reset marker without history loss"
```

### Task 5: HP agent-ops review, full verification, and integration handoff

**Files:**
- Create: `.superpowers/sdd/2026-08-12-predeploy-integrity/task-report.md`
- Create on HP: one implementation brief and at least one attributed review brief outside the product commit
- Modify only if a reviewer finds a defect: files from Tasks 1-4 plus focused regression tests

**Interfaces:**
- Consumes: Task 1-4 commits and their worker session ID.
- Produces: different-model review verdict, corrected local commit series, exact gate evidence, and direct-deployment-ready head.

- [ ] **Step 1: Launch implementation through installed HP agent-ops**

Inside `ctrl-opencode-horak`, create a dedicated Git worktree and an English brief containing:

```text
TASK: none/fix
MILESTONES (5):
1. 15% Freeze base and capture focused baseline
2. 35% Complete planner snapshot and retry lifecycle RED/GREEN
3. 60% Complete daily-energy validation and migration RED/GREEN
4. 80% Run focused and full gates
5. 100% Commit and publish frozen evidence bundle
```

Launch:

```bash
/usr/local/bin/fleet-launch --role orchestrator <brief-file> \
  "Implement pre-deploy planner and Recorder integrity plan"
```

Expected: one orchestrator session, dedicated `/repos/wt-*` custody, immutable base, no shared live worktree.

- [ ] **Step 2: Launch an attributed different-model critic**

Review brief must contain:

```text
TASK: none/review
REVIEWS: <implementation-session-id>
MILESTONES (4):
1. 20% Freeze author bundle and exact diff
2. 50% Reproduce all RED/GREEN contracts independently
3. 80% Probe concurrency, migration, Recorder, and safe-log negative controls
4. 100% Return APPROVE or evidence-grounded REJECT
```

Expected: different model family, frozen author bundle, explicit approval before integration.

- [ ] **Step 3: Import the reviewed HP commits without GitHub**

Transfer a Git bundle or exact patches over the authorized SSH path. Verify:

```bash
git fsck --no-dangling
git show --stat --oneline <reviewed-head>
git diff --check bf99703811574321b4f165626ed3b12d9edd74ec..<reviewed-head>
```

Expected: exact intended source/test/docs scope; no dependency, frontend, secret, or deployment artifact.

- [ ] **Step 4: Run canonical local verification**

```bash
.venv-task1-r2/bin/python -m pytest -q \
  tests/test_battery_floor_snapshot_transaction.py \
  tests/test_battery_forecast_retry_lifecycle.py \
  tests/test_daily_energy_validation.py \
  tests/test_daily_energy_marker_restore.py \
  tests/test_daily_energy_recorder_migration.py \
  tests/test_battery_min_startup_readiness.py \
  tests/test_dc_in_fv_ad_daily_cycle.py

.venv-task1-r2/bin/python -m pytest -v --tb=short \
  --cov=custom_components/oig_cloud \
  --cov-report=xml \
  --cov-report=term-missing:skip-covered

.venv-task1-r2/bin/python -m flake8 custom_components/oig_cloud tests
.venv-task1-r2/bin/python -m mypy custom_components/oig_cloud \
  --ignore-missing-imports --explicit-package-bases
bash scripts/run_pylint.sh
```

Expected: zero test/static failures; line coverage above `80.01%`; Pylint E0/F0.

- [ ] **Step 5: Run final security and release gates**

- Run an exact Codex Security diff scan from `bf997038` to reviewed head.
- Run Bandit and Gitleaks over the exact patch.
- Re-run Trivy, pip-audit, and Safety; classify unchanged dependency-lock findings without hiding them.
- Run two consecutive report-bearing `pre-commit run --all-files` passes.

Expected: zero introduced security finding, zero secret finding, no hook rewrite, and all product-correctness blockers closed.

- [ ] **Step 6: Write the durable report and final commit**

The report records exact RED, GREEN, full-suite, coverage, static, security, critic, commit, and residual dependency evidence. Commit with:

```bash
git add <exact-reviewed-source-and-test-paths> \
  .superpowers/sdd/2026-08-12-predeploy-integrity/task-report.md
git commit -m "fix: harden planner and recorder integrity"
```

Expected: clean worktree, no push, no PR, no deployment yet.

### Task 6: Direct deployment and live acceptance

**Files:**
- Use: `deploy_to_ha.sh`
- Create: `.superpowers/sdd/2026-08-12-predeploy-integrity/deploy-report.md`
- Create: machine-readable pre/post evidence using existing deploy verification helpers

**Interfaces:**
- Consumes: reviewed clean commit, `.ha_config`, direct-deploy script, existing server backup/readiness contract.
- Produces: deployed Home Assistant integration, rollback evidence, OIG-scoped log result, entity and calculation evidence, and one natural solar wall-clock refresh proof.

- [ ] **Step 1: Capture pre-deploy baseline and backup**

Record current integration version/hash, OIG entity availability, `dc_in_fv_ad` state/statistic metadata, solar cache response timestamp/provenance, battery-plan inputs/outputs, and OIG-scoped errors/warnings. Create and validate the deploy script's recoverable server backup before copying files.

- [ ] **Step 2: Execute the repository direct-deploy script**

Run only from the reviewed clean worktree:

```bash
./deploy_to_ha.sh
```

Expected: deterministic build check, copy, Home Assistant config check, restart, readiness, and deployed bundle hash verification succeed. On any failure, stop and rollback through the script.

- [ ] **Step 3: Verify immediate post-deploy behavior**

Confirm:

- integration setup succeeds;
- OIG entities are available;
- no new OIG error or warning exists;
- `dc_in_fv_ad` retains entity/statistic identity and plausible non-negative state;
- first post-upgrade sample does not overcount Recorder history;
- manual solar refresh accepts one new snapshot truthfully;
- battery plan floor matches one stable BOX `bat_min` snapshot;
- no retired retry callback or pending-task warning appears.

- [ ] **Step 4: Verify the next natural solar wall-clock occurrence**

At the next configured Prague occurrence, compare against the baseline:

- response timestamp advances;
- cache provenance remains entry/provider/fingerprint/revision correct;
- exactly one automatic refresh is accepted;
- no duplicate retry or publish occurs;
- OIG-scoped logs contain zero errors and zero warnings;
- entity availability and established calculation invariants remain true.

- [ ] **Step 5: Finalize or diagnose**

If every acceptance check passes, record hashes/timestamps/counts in `deploy-report.md` and remove the one-shot verification heartbeat. If any check fails, keep the heartbeat, preserve the backup, do not hide warnings, and continue diagnosis or rollback.
