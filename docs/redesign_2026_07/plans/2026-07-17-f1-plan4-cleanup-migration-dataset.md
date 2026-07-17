# F1 Plan 4/4 — Cleanup, Transactional Migration, Bundled Dataset & GET Admin-Gate

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After Plans 2/3 are live, harden the F1 flow end-to-end: (1) close the deployed non-admin config-read hole, (2) replace the non-transactional legacy migration with a recoverable protocol, (3) remove author defaults + verified-dead keys with a compatibility window, (4) ship `pricelists` + `ai_models` as a bundled dataset with **no runtime fetch**, (5) convert silent fallback paths into explicit migration errors, and (6) prove all of it with smoke/regression tests on a copy of the live entry.

**Architecture:** Plan 2 already made the registry the single source of truth and Plan 3 already drives the FE from `/config_registry` + ships the AI backend. Plan 4 is the LAST plan: it removes the compatibility/dead scaffolding those plans left behind, but only after a transactional, recoverable migration makes every destructive step reversible. The battery/boiler tuning **heuristics stay LOCAL in code** (SCOPE-REVISION #1) — nothing in this plan is remote-tuning. `remote_config` becomes a **bundled dataset** read from packaged files; the runtime fetch / signature / cache / rollback / expiry machinery is **dropped** (closes critique CRITICAL #1).

**Tech Stack:** Python 3.12, Home Assistant custom integration, pytest (repo-root `tests/`, run via `.venv/bin/python -m pytest`), flake8 (`--max-line-length=120`), mypy (`--ignore-missing-imports --explicit-package-bases`).

**Spec (binding order — later wins):** `SCOPE-REVISION.md` (BINDING, 2026-07-17) → `docs/redesign_2026_07/F1-DESIGN.md` §§3, 4, 7, 8, 9 → `docs/redesign_2026_07/DECISIONS.md` D11, P6, P7, P8, K2a–K2f → `spec-critique/REPORT-codex.md` (CRITICAL #1, CRITICAL #2, top-5 #5) → `spec-critique/UX-AUDIT.md`.
**Where SCOPE-REVISION overrides F1-DESIGN:** §4 `remote_config/loader.py` runtime fetch is **CANCELLED** (SCOPE-REVISION #4); `pricelists` + `ai_models` are **bundled files shipped in each release** (#2, #3); the §9 error-table row “GitHub remote_config nedostupný → bundled kopie + cache" is **DROPPED** (bundled-only, no cache). The dashboard gate is **SOFT** (SCOPE-REVISION #6) — this plan adds NO hard gate.

**Do NOT (scope fences):**
- Do NOT re-plan Plan-2 (basic-field registration) or Plan-3 (FE/wizard/AI backend) work.
- Do NOT reintroduce remote fetch, remote tuning, or a hard dashboard gate — SCOPE-REVISION forbids all three.
- Do NOT delete any key, default, or shim before its Task-2 transactional migration + Task-3 compat window are in place (migration safety ordering below).

**Worklog convention:** commit after every task; all commits end with:
```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

---

## Migration safety ordering & guard-rail sequence (read before any Task)

This plan touches a **LIVE deployed box**. Every destructive step is ordered and recoverable. The critique (top-5 #5) found the current migration mutates `options` in place with no snapshot, no journal, no version marker, and no restore command — so Task 2 lands the recoverable protocol FIRST.

1. **Task 1** — GET admin-gate. Standalone, zero migration dependency; ships first to close the deployed hole.
2. **Task 2** — transactional migration core (snapshot → validate → write → mark-complete → restore). No deletions; just the foundation. Refactors the existing non-transactional `_migrate_legacy_planner_options` (`__init__.py:150`) onto it.
3. **Task 3** — alias/legacy compat **read** window + explicit deprecation signal. Nothing is removed; legacy keys still load (with a warning) inside a versioned window.
4. **Task 4** — author-defaults removal (P7) + sensor-first (P8). Upgrade path uses the Task-2 migrator to **pre-seed** effective values so behaviour does not change; new installs get `unavailable` + warning, no silent fallback. Heuristics stay LOCAL.
5. **Task 5** — verified-dead-key **write** removal (P6) + read-side filtering via the Task-2 migrator, with a 1-release backup of filtered keys (downgrade path). Per-key re-audit (see Task 5 note: the P6 list is NOT uniformly dead).
6. **Task 6** — bundled dataset (`pricelists` + `ai_models`); drop fetch/signature/cache/rollback/expiry + their tests.
7. **Task 7** — convert silent fallback paths (`hybrid`→`local_only`, REST unknown-key) into explicit migration errors inside the window; remove temporary guard code once consumers are canonical.
8. **Task 8** — remove the compatibility shims explicitly marked “removed in Plan 4" (the `# LEGACY` block in `ha_rest_api.py`) — **only after** Tasks 3/5/7 prove canonical-only.
9. **Task 9** — smoke/regression suite (incl. interruption/retry/downgrade on a copy of the live entry).
10. **Task 10** — full gate + self-review.

**Recoverability rules (apply to every destructive task):**
- Snapshot the current `entry.options` to `.storage/oig_cloud.migration_backup_<entry_id>` **before** any transform; the backup carries a `schema_version` + timestamp and a `restored_from` slot.
- Compute and validate **all** transforms against the registry before writing any.
- Write options/onboarding/store state through `merge_entry_options` (the single write path from Plan 1) — merge is not transactionality, so the migrator wraps it in snapshot→write→mark-complete.
- Mark the migration complete **last** via a monotonic migration marker (separate from `ConfigFlow.VERSION`, which is still `1` at `config/steps.py:3108`).
- Expose an admin repair/restore action valid for one defined release range.
- A failed/interrupted migration leaves a **recoverable** state (old options intact or backup restorable) — never a half-written neither-old-nor-new config.

---

### Task 1: GET `module_config` admin-gate — STANDALONE small fix (CRITICAL #2)

> Closes `spec-critique/REPORT-codex.md` CRITICAL #2. Approved as “Malý samostatný fix" in `SCOPE-REVISION.md`. No dependency on any other task.

**Why now:** `OIGCloudModuleConfigView.get` (`api/ha_rest_api.py:1206`) only sets `requires_auth = True` (`:1204`) — it does **not** require `is_admin`, unlike `post` (`:1224`, admin check at `:1228-1229`). The GET returns non-secret `solar_forecast_latitude` / `solar_forecast_longitude` (registry fields, `config_registry.py` solar section; emitted at `:1220` via `opts.get(key, field.default)`) and site data, so any authenticated non-admin HA account can read home-location/config data. Verified: the asymmetry is real.

**Files:**
- Modify: `custom_components/oig_cloud/api/ha_rest_api.py` — `OIGCloudModuleConfigView.get` (`:1206-1222`); mirror the `post` admin check (`:1228-1229`).
- Test: `tests/test_ha_rest_api_views.py` (mirror the existing module_config test fixtures there; plan-1 Task 5 also placed module_config regression coverage in `tests/test_boiler_f5_config_settings.py` — extend whichever holds the GET tests).

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_ha_rest_api_views.py  (append; reuse the file's existing hass_client +
# config-entry fixtures and the admin/non-admin user helpers already used by the
# module_config POST tests — copy their arrange/act pattern).
async def test_module_config_get_rejects_authenticated_non_admin(...):
    """CRITICAL #2: GET must fail closed for non-admins (it returns GPS/site data)."""
    # arrange: entry for box_id; an authenticated NON-admin HA user
    # act: GET /api/oig_cloud/<box_id>/module_config as the non-admin
    # assert: status == 403, body {"error": "Admin only"}  (mirrors POST at :1230)


async def test_module_config_get_still_works_for_admin(...):
    # arrange: same entry; an authenticated admin
    # act: GET .../module_config as admin
    # assert: status == 200, body has the "solar" section with solar_forecast_latitude
```

If the accepted variant is **GPS redaction for non-admins** instead of a hard 403 (SCOPE-REVISION permits either), replace the first test with: non-admin GET → 200 but `solar_forecast_latitude`/`solar_forecast_longitude` are absent/redacted; admin GET → full. **Recommendation: hard 403** — it mirrors POST's fail-closed posture, is minimal, and matches the critique ("fail closed and test an authenticated non-admin"). The redaction variant is acceptable only if non-admin settings read is a real product requirement.

- [ ] **Step 2: Run — verify FAIL** (GET currently returns 200 for any authenticated user).

Run: `.venv/bin/python -m pytest -q tests/test_ha_rest_api_views.py -k "module_config_get"`

- [ ] **Step 3: Add the admin gate to `get`** (mirror `post` exactly):

```python
# in OIGCloudModuleConfigView.get, immediately after `entry = _find_entry_for_box(...)`
# (place the auth check BEFORE _find_entry_for_box to match post's ordering, or right
# after — match the file's existing convention):
user = request.get("hass_user") or request.app.get("hass_user")
if not user or not user.is_admin:
    return web.json_response({"error": "Admin only"}, status=403)
```

For the **redaction variant**: instead gate per-field — when the caller is a non-admin, skip `solar_forecast_latitude` / `solar_forecast_longitude` (and any field later tagged location-bearing) in the GET loop at `:1216-1220`.

- [ ] **Step 4: Run — PASS**

Run: `.venv/bin/python -m pytest -q tests/test_ha_rest_api_views.py tests/test_boiler_f5_config_settings.py -k "module_config"`

- [ ] **Step 5: Lint + commit**

```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/api/ha_rest_api.py
.venv/bin/mypy --ignore-missing-imports --explicit-package-bases custom_components/oig_cloud/api/ha_rest_api.py
git add -u custom_components/oig_cloud/api/ha_rest_api.py tests/test_ha_rest_api_views.py
git commit -m "fix(rest): admin-gate GET module_config — non-admins can no longer read GPS/site config (CRITICAL #2)"
```

**Rollback note:** revert the added `if not user or not user.is_admin` block in `get`; behaviour returns to status quo ante. This task is standalone — it does not block any other task.

> **CRITICAL #2 is only HALF-closed by this task — stated explicitly (Critic A #2,
> was silently omitted by the original draft's "closed by Task 1" claim):**
> REPORT-codex's CRITICAL #2 finding bundles **two** distinct issues at
> [REPORT-codex.md:21](../../../spec-critique/REPORT-codex.md#L21): (a) the GET
> admin-gate asymmetry — **closed by this task**; and (b) the settings UI's
> plaintext API-key rendering — grep-confirmed still present at
> `www_v2/src/ui/features/settings/index.ts:627` (`isSecret =
> f.key.endsWith('api_key')`) and `:634` (`<input type="text" ...>` — no
> `type="password"` anywhere in `www_v2/src/`, confirmed by `grep "type='password'"`
> → 0 hits). **This residual half is explicitly OWNED BY PLAN 3, not this plan** —
> it is already tracked as UX-AUDIT finding **U5** (`spec-critique/UX-AUDIT.md`,
> "must fix in Plan 3": `<input type="password" autocomplete="off">` when
> `isSecret`). Plan 4 does not touch `www_v2/src/ui/features/settings/index.ts` in
> any task, so this residual is carried forward by reference, not silently
> dropped — F1-BACKLOG's Plan 3 ownership list already covers `settings/index.ts`
> wiring generally; this note makes the U5 linkage explicit so it isn't lost
> between the two plans.

---

### Task 2: Transactional, recoverable migration core (critique top-5 #5)

> Replaces the in-place, non-transactional `_migrate_legacy_planner_options` (`__init__.py:150`, called from `:205`) with a snapshot→validate→write→mark-complete protocol + admin restore. **No keys are deleted in this task** — it only makes all later deletions safe.

**Files:**
- Create: `custom_components/oig_cloud/config_migration.py`
- Modify: `custom_components/oig_cloud/__init__.py` — route `_migrate_legacy_planner_options` (`:150`, called from `_ensure_planner_option_defaults` at `:200/1545`) and the setup-time migration calls (`async_setup_entry` `:1535`, calls at `:1545-1547` and `:1557-1558`) through the new transactional migrator; keep `_get_planner_defaults` (`:133`) for now (its dual-write is removed in Task 5).
- Test: `tests/test_config_migration.py` (new) + `tests/test_init_setup_entry.py` (extend); pattern template: `tests/test_boiler_task9_migration_repair.py`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_config_migration.py
"""Recoverable config migration (critique top-5 #5): snapshot, validate, write,
mark-complete; a failed/interrupted migration leaves a recoverable state.

CORRECTED (f1-plan4-incorp revision, Critic A #3 / Critic B b): most Store I/O in
this repo is awaited (`ha_rest_api.py:104` `await store.async_load()`,
`boiler/actuator.py:340` `await self._store.async_save(...)`), but not all of it —
`boiler/runtime.py:1723` fires `self.hass.async_create_task(store.async_save(payload))`
without awaiting it. This module does not rely on the rest of the repo's habits either
way: run_migration and restore_last_backup are `async def` and every test below awaits
them, and the backup write itself is awaited explicitly regardless of what other call
sites in the repo do (2026-07-17 residuals pass, R2).
"""
from __future__ import annotations

import pytest

from custom_components.oig_cloud.config_migration import (
    MIGRATION_VERSION,
    run_migration,
    restore_last_backup,
)


@pytest.mark.asyncio
async def test_migration_snapshots_before_write(hass, freezer):
    entry = _entry_with_options({"min_capacity_percent": 25.0, "home_charge_rate": 3.0})
    await run_migration(hass, entry)
    backup = await _read_backup(hass, entry.entry_id)
    assert backup["schema_version"] == MIGRATION_VERSION
    assert backup["snapshot"]["min_capacity_percent"] == 25.0   # pre-image preserved


@pytest.mark.asyncio
async def test_migration_is_idempotent_and_marks_complete(hass):
    entry = _entry_with_options({"min_capacity_percent": 25.0})
    await run_migration(hass, entry)
    marker_before = _marker(entry)
    await run_migration(hass, entry)         # second run must be a no-op
    assert _marker(entry) == marker_before   # monotonic, not incremented again
    assert _marker(entry)["complete"] is True


@pytest.mark.asyncio
async def test_interrupted_migration_leaves_recoverable_state(hass, monkeypatch):
    """A transform that fails mid-way must NOT leave options half-migrated."""
    entry = _entry_with_options({"min_capacity_percent": 25.0, "legacy_only_key": "x"})
    monkeypatch.setattr(_transforms, "boom_after_first", True)   # force a failure
    await run_migration(hass, entry)          # must swallow + leave old options intact
    assert entry.options["min_capacity_percent"] == 25.0         # untouched
    assert _marker(entry)["complete"] is False                   # not marked done
    restored = await restore_last_backup(hass, entry)
    assert restored is True                                       # admin restore works


@pytest.mark.asyncio
async def test_restore_round_trips_to_pre_migration_options(hass):
    entry = _entry_with_options({"min_capacity_percent": 25.0, "home_charge_rate": 3.0})
    await run_migration(hass, entry)
    await restore_last_backup(hass, entry)
    assert entry.options["min_capacity_percent"] == 25.0         # exactly the snapshot
    assert "_migration" not in entry.options   # NEW: restore clears the marker too —
    # a wholesale replace (not a merge-update), so no key the migration ADDED can
    # survive a restore and strand the entry between old and new (critique top-5 #5,
    # the ":47 forbids neither-old-nor-new" rule)


@pytest.mark.asyncio
async def test_restore_with_corrupt_backup_store_is_safe(hass, monkeypatch):
    """NEW (Critic A #3): a corrupt/missing backup store must not crash restore."""
    entry = _entry_with_options({"min_capacity_percent": 25.0})

    async def _load_corrupt():
        return "not-a-dict"  # simulates a truncated/corrupt .storage file

    monkeypatch.setattr(
        "custom_components.oig_cloud.config_migration.Store.async_load", _load_corrupt
    )
    restored = await restore_last_backup(hass, entry)
    assert restored is False   # fails closed; does not raise, does not touch options
```

- [ ] **Step 2: Run — verify FAIL** (`ModuleNotFoundError: config_migration`).

Run: `.venv/bin/python -m pytest -q tests/test_config_migration.py`

- [ ] **Step 3: Implement `config_migration.py`**

> **Corrected in this revision (f1-plan4-incorp) — Critic A #3 and Critic B b found the
> original draft of this Step broken:**
> 1. `run_migration`/`restore_last_backup` were plain `def` calling `Store.async_save`/
>    `async_load` **without `await`** — an un-awaited coroutine here would silently
>    never execute. That risk does not depend on repo-wide convention: most Store
>    calls in this repo are awaited (`ha_rest_api.py:104`, `boiler/actuator.py:340`),
>    but not all — `boiler/runtime.py:1723` deliberately fires `async_save` via
>    `hass.async_create_task(...)` without awaiting it (fire-and-forget is an
>    accepted pattern there for a non-critical write). A migration backup is not
>    that kind of write: losing it silently would defeat the whole point of Task 2,
>    so `run_migration`/`restore_last_backup` explicitly await every Store call
>    regardless of what other call sites do. Both are now `async def`
>    (2026-07-17 residuals pass, R2 — corrects the prior "repo always awaits"
>    over-generalization).
> 2. The Step-2 code comment `# single write path; suppress_reload=True` was a
>    **comment, not an argument** — `merge_entry_options` genuinely accepts
>    `suppress_reload` (`config_merge.py:18`), the call just never passed it. Fixed
>    below to actually pass `suppress_reload=True`.
> 3. `restore_last_backup` called `merge_entry_options(hass, entry, dict(snapshot))`
>    — `merge_entry_options` only `.update()`s (`config_merge.py:24-26`, **"NEVER
>    replaces"**), so any key the migration *added* (including the `_migration`
>    marker itself, set to `complete=True` at write time) would survive a "restore"
>    untouched. That is exactly the neither-old-nor-new state the safety rules above
>    (`:47`) forbid: options rolled back to pre-migration values **while
>    `_migration.complete` still reads `True`**. Restore must be a **wholesale
>    replace**, matching the pop+`async_update_entry` pattern the repo already uses
>    for real deletions (`__init__.py:169-185`, `:870-874`, `:2018-2020`) rather than
>    the merge path.
> 4. **No durable journal and no admin restore command existed** (critique top-5 #5).
>    The backup store now carries an append-only `journal` list (every attempt,
>    success or failure) and Step 3b below registers an admin-invokable HA service
>    for restore, following the existing service-registration helper
>    (`services/__init__.py:1124-1145 (register loop + call at :1142)`).
> 5. **Downgrade caveat, stated explicitly (was silently assumed):** `Store(hass, 1,
>    "oig_cloud.migration_backup_<entry_id>")` is a **new store name in this
>    release** — `rg migration_backup --include='*.py'` → **0 hits** pre-Plan-4. A
>    HACS **downgrade** replaces files with an older build that has *no code path*
>    referencing this store, so it cannot read the backup automatically. The backup
>    only protects a **same-or-newer build**: an admin must invoke the restore
>    service *before* downgrading, while still on the migrating build. True
>    downgrade safety (an *older* build reading a live entry) still depends on the
>    Task-3 compat window leaving the original option spellings loadable — this is
>    the actual downgrade path; the backup store is same-build recovery only. Both
>    are documented so neither is mistaken for the other.

```python
# custom_components/oig_cloud/config_migration.py
"""The ONLY sanctioned config-entry migration path (F1 critique top-5 #5).

Snapshot current options -> compute+validate transforms -> write via
merge_entry_options -> mark complete LAST. A failure anywhere before the
mark-complete leaves the entry on its pre-migration options (recoverable),
never half-migrated. restore_last_backup() does a WHOLESALE replace (not a
merge) so it also clears any key/marker the migration added — see point 3
above. Both Store calls are awaited (point 1); suppress_reload is actually
passed (point 2). A journal entry is appended on every attempt (point 4).

Downgrade caveat (point 5): this backup store is new in this release and is
only readable by a same-or-newer build. It is admin same-build recovery, NOT
the mechanism that protects an actual HACS downgrade — that is the Task-3
compat window (config_deprecation.py).
"""
from __future__ import annotations

import logging
from typing import Any, Callable, Dict, List

from homeassistant.helpers.storage import Store

from .config_merge import merge_entry_options

_LOGGER = logging.getLogger(__name__)
MIGRATION_VERSION = 1  # bump when a new migration pass is added; monotonic per entry

_TRANSFORMS: List[Callable[[Dict[str, Any]], Dict[str, Any]]] = []  # populated by later tasks


def register_transform(fn: Callable[[Dict[str, Any]], Dict[str, Any]]) -> None:
    _TRANSFORMS.append(fn)


def _backup_store(hass, entry_id: str) -> Store:
    return Store(hass, 1, f"oig_cloud.migration_backup_{entry_id}")


def _marker(options: Dict[str, Any]) -> Dict[str, Any]:
    return options.get("_migration", {})


async def _append_journal(hass, entry_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    backup = await _backup_store(hass, entry_id).async_load() or {}
    if not isinstance(backup, dict):
        backup = {}
    journal = backup.get("journal", [])
    journal.append(event)
    backup["journal"] = journal
    return backup


async def run_migration(hass, entry) -> bool:
    options = dict(entry.options)
    if _marker(options).get("version") == MIGRATION_VERSION and _marker(options).get("complete"):
        return False  # already migrated this pass; idempotent
    snapshot = dict(options)  # pre-image — the recoverable state
    backup = await _append_journal(hass, entry.entry_id, {"event": "start"})
    try:
        updates: Dict[str, Any] = {}
        for fn in _TRANSFORMS:
            updates.update(fn(snapshot))  # transforms validate against the snapshot
        # mark complete atomically with the data writes
        updates["_migration"] = {"version": MIGRATION_VERSION, "complete": True}
    except Exception as err:  # noqa: BLE001 — a failed pass must never half-write
        _LOGGER.error("config migration failed for %s; leaving pre-migration options: %s",
                      entry.entry_id, err)
        backup.update({"schema_version": MIGRATION_VERSION, "snapshot": snapshot,
                       "complete": False})
        backup["journal"][-1].update({"event": "failed", "error": str(err)})
        await _backup_store(hass, entry.entry_id).async_save(backup)
        return False
    backup.update({"schema_version": MIGRATION_VERSION, "snapshot": snapshot, "complete": True})
    backup["journal"][-1].update({"event": "committed"})
    await _backup_store(hass, entry.entry_id).async_save(backup)
    merge_entry_options(hass, entry, updates, suppress_reload=True)  # single write path
    return True


async def restore_last_backup(hass, entry) -> bool:
    try:
        backup = await _backup_store(hass, entry.entry_id).async_load() or {}
    except Exception as err:  # noqa: BLE001 — a corrupt/unreadable store fails closed
        _LOGGER.error("migration backup store unreadable for %s: %s", entry.entry_id, err)
        return False
    if not isinstance(backup, dict):
        return False
    snapshot = backup.get("snapshot")
    if not snapshot:
        return False
    # Wholesale replace, NOT merge_entry_options: clears any key (incl. the
    # _migration marker) the migration added, so the entry lands exactly on the
    # pre-migration snapshot — never a mix of restored + still-migrated state.
    hass.config_entries.async_update_entry(entry, options=dict(snapshot))
    return True
```

Then route the existing setup migration through it: in `_migrate_legacy_planner_options` (`__init__.py:150`) keep its transform logic but **register it** via `register_transform(...)` and call `await run_migration(hass, entry)` once in `async_setup_entry` (replace the in-place mutation at `:205`). Keep `_get_planner_defaults` (`:133`) until Task 5.

- [ ] **Step 3b: Register the admin restore service** (closes REPORT-codex top-5 #5 "no restore command"; pattern from `services/__init__.py:1124-1145 (register loop + call at :1142)`):

```python
# in async_setup_entry (or a services/migration.py following services/boiler.py's shape)
async def _handle_restore_migration_backup(call: ServiceCall) -> None:
    entry_id = call.data["entry_id"]
    entry = hass.config_entries.async_get_entry(entry_id)
    if entry is None or not call.context.user_id:
        return
    user = await hass.auth.async_get_user(call.context.user_id)
    if not user or not user.is_admin:
        raise HomeAssistantError("Admin only")   # mirrors Task-1's admin-gate posture
    restored = await restore_last_backup(hass, entry)
    if not restored:
        raise HomeAssistantError("No migration backup available to restore")

hass.services.async_register(DOMAIN, "restore_migration_backup",
                              _handle_restore_migration_backup, schema=RESTORE_SCHEMA)
```

- [ ] **Step 4: Run — PASS** (incl. the existing planner-migration coverage in `tests/test_init_setup_entry.py`).

Run: `.venv/bin/python -m pytest -q tests/test_config_migration.py tests/test_init_setup_entry.py`

- [ ] **Step 5: Lint + commit**

```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/config_migration.py custom_components/oig_cloud/__init__.py
.venv/bin/mypy --ignore-missing-imports --explicit-package-bases custom_components/oig_cloud/config_migration.py
git add custom_components/oig_cloud/config_migration.py tests/test_config_migration.py
git add -u custom_components/oig_cloud/__init__.py tests/test_init_setup_entry.py
git commit -m "feat(migration): transactional recoverable config migration — snapshot/validate/write/mark (critique top-5 #5)"
```

**Rollback note:** if a rollout fails, `await restore_last_backup(hass, entry)` — invoked via the `oig_cloud.restore_migration_backup` admin service registered in Step 3b — re-applies the pre-migration snapshot as a wholesale replace (clearing the `_migration` marker too, so the entry is unambiguously pre-migration). The marker `_migration.complete=False` means re-running `run_migration` retries safely. Per point 5 above, this restore path only works on a same-or-newer build; run it **before** a HACS downgrade, not after.

---

### Task 3: Alias/legacy compatibility window + explicit deprecation (K2a–K2c)

> Establishes a versioned compat **read** window for legacy keys so nothing breaks on upgrade, then an explicit migration error after the window. **Nothing is removed here** — removals are Tasks 5/7/8, gated on this window.

> **Corrected in this revision (f1-plan4-incorp) — Critic A #7 found the interval
> half of this task broken:** `_collect_interval_values` (`config/steps.py:1395-1413`)
> builds its `values` dict from **canonical** `user_input` keys
> (`user_input.get("standard_scan_interval", 30)`, etc.) — `standard`/`extended`/
> `proxy_stale`/`debounce_ms` are its own **internal local variable names**, not a
> deprecated stored spelling. Grep-confirmed: `entry.options` is read only via the
> canonical name (`__init__.py:956` `entry.options.get("standard_scan_interval")`);
> there is **zero evidence** anywhere in the tree of an option ever stored under the
> bare names `standard`/`extended`/`proxy_stale`/`debounce_ms`. Because
> `_collect_interval_values` populates all four dict keys **unconditionally on every
> call**, wiring `deprecation_status` into `_validate_interval_values` (as the
> original draft did) would fire the deprecation/hard-error path on **every single
> interval save**, canonical or not, once the window closes — exactly Critic A's
> reported regression. **The interval aliases are therefore dropped from this
> task's deprecation scope entirely** — there is no legacy stored spelling to
> deprecate here, so there is nothing to migrate. (`_show_intervals_form` is
> likewise dropped from the Files list below — it was only touched to surface the
> now-removed interval deprecation warning.)

Legacy keys in scope (verified by grep):
- Planner legacy options still dual-written by `_get_planner_defaults` (`__init__.py:137-145`): `min_capacity_percent`, `target_capacity_percent`, `home_charge_rate`, `max_ups_price_czk`, `disable_planning_min_guard`, `price_hysteresis_czk`, `hw_min_hold_hours`. Of these, `min_capacity_percent` and `home_charge_rate` are read as legacy bridges (`__init__.py:153-160`). **Corrected (2026-07-17 residuals pass, R3):** `target_capacity_percent` and `max_ups_price_czk` are **not** write+display-only either — `target_capacity_percent` is read for live forecast math (`battery_forecast/data/battery_state.py:182`) and `max_ups_price_czk` is read in the presentation layer (`battery_forecast/presentation/detail_tabs_blocks.py:545`); see the corrected Task 5 dead-key table for the full live-reader list. `disable_planning_min_guard`, `price_hysteresis_czk`, and `hw_min_hold_hours` remain write+display-only as originally stated. This is still the **only** deprecation surface for this task — the correction only changes which keys are display-only, not the scope of this list.
- **Cite completed (Critic B d):** the original draft's `_get_planner_defaults`
  citation window (`:137-145`) clipped off two real entries in the same dict
  literal: `__init__.py:136` `CONF_AUTO_MODE_SWITCH: False` and `__init__.py:146`
  `"cheap_window_percentile": 30`. Neither is a legacy-alias name (both are
  canonical `CONF_*`/registry-backed keys, not dual-written aliases), so **neither
  is added to the legacy-keys list above** — they're called out here only so the
  Files/cite window is accurate (`__init__.py:133-146`, not `:137-145`) and so a
  future editor doesn't assume the dict literal ends at `:145`.

**Files:**
- Create: `custom_components/oig_cloud/config_deprecation.py` (window definition + per-key deprecation signal)
- Modify: `__init__.py` (`_migrate_legacy_planner_options` `:150`) — deprecation is wired **only** here, not into `config/steps.py`'s interval validation (see correction above).
- Test: `tests/test_config_deprecation.py` (new)

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_config_deprecation.py
from custom_components.oig_cloud.config_deprecation import (
    ALIAS_COMPAT_UNTIL_VERSION,   # monotonic version gate, NOT a wall-clock date
    deprecation_status,
)


def test_legacy_keys_accepted_inside_compat_window():
    # legacy option spellings load with a DeprecationWarning, return canonical value
    status = deprecation_status(options={"min_capacity_percent": 25.0},
                                 current_version=ALIAS_COMPAT_UNTIL_VERSION)
    assert status.accepted is True
    assert status.warnings                          # non-empty deprecation notices


def test_legacy_keys_hard_error_after_window():
    status = deprecation_status(options={"min_capacity_percent": 25.0},
                                 current_version=ALIAS_COMPAT_UNTIL_VERSION + 1)
    assert status.accepted is False
    assert any("migration_required" in e["code"] for e in status.errors)


def test_canonical_only_options_never_trigger_deprecation():
    """NEW (Critic A #7 regression guard): an entry with ONLY canonical keys must
    never be flagged, at any version — guards against re-introducing a hook that
    fires unconditionally (the bug in the original draft's _validate_interval_values
    wiring, where values were always present regardless of user spelling)."""
    status = deprecation_status(
        options={"standard_scan_interval": 60, "planning_min_percent": 30.0},
        current_version=ALIAS_COMPAT_UNTIL_VERSION + 1,
    )
    assert status.accepted is True
    assert not status.warnings
    assert not status.errors
```

- [ ] **Step 2: Run — verify FAIL** (`ModuleNotFoundError: config_deprecation`).

Run: `.venv/bin/python -m pytest -q tests/test_config_deprecation.py`

- [ ] **Step 3: Implement `config_deprecation.py`** — define the window as a **monotonic migration version** (not a wall-clock date — reproducible in CI), the legacy→canonical map (the 7 planner keys above **only**), and `deprecation_status(options, current_version)` returning `{accepted, warnings, errors}`, keyed off the keys actually **present** in the `options` dict passed in (never off an internal always-populated helper dict). Wire `deprecation_status` into `_migrate_legacy_planner_options` **only** so legacy keys emit a warning inside the window and a structured `{error: migration_required, deprecated: [...]}` after it. Do **not** wire it into `config/steps.py` interval validation — see the correction note above.

- [ ] **Step 4: Run — PASS**

Run: `.venv/bin/python -m pytest -q tests/test_config_deprecation.py`

- [ ] **Step 5: Lint + commit**

```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/config_deprecation.py
git add custom_components/oig_cloud/config_deprecation.py tests/test_config_deprecation.py
git commit -m "feat(migration): versioned alias/legacy compat window + explicit deprecation (K2a-K2c)"
```

**Rollback note:** bump `ALIAS_COMPAT_UNTIL_VERSION` upward to re-open the window; legacy keys load again with warnings. Removal (Tasks 5/8) depends on the window having closed cleanly under Task 9 smoke tests.

---

### Task 4: Author-defaults removal (P7) + sensor-first (P8) — heuristics STAY LOCAL

> Removes the author's hardcoded installation values. **SCOPE-REVISION #1 is binding: the battery/boiler tuning heuristics stay LOCAL in code — this task is NOT remote tuning.** Upgrade uses the Task-2 migrator to **pre-seed** the user's effective values so behaviour is unchanged; new installs see `unavailable` + a warning (no silent fallback).

> **Preconditions carried over from REPORT-codex's OQ-5/OQ-6 note (Critic B e — was
> closed by no task in the original draft):** the `enable_statistics` /
> `enable_extended_sensors` default contradiction (`config_registry.py:126-127`
> **False** vs. `steps.py:378/384` + runtime `__init__.py:1596` **True**) is a
> Plan-2 product decision, cited at the bottom of this plan as a Task-5/8
> precondition. It applies here too: this task's **sensor-first pre-seed
> transform must not read or write `enable_statistics`/`enable_extended_sensors`**
> until Plan 2 resolves OQ-5/OQ-6 — pre-seeding an "effective value" for a field
> whose own default is self-contradictory would silently pick a side of an
> unresolved product decision. None of Task 4's own targets (GPS/capacity/
> thresholds/cold-inlet/roof-geometry, below) are `enable_statistics`/
> `enable_extended_sensors`, so this is a scope guardrail, not new work.

Verified author defaults to remove (every cite grep-confirmed):
- GPS `50.1219800` / `13.9373742`: `config/validation.py:66` (function default) and `entities/solar_forecast_sensor.py:640-641` (`options.get(..., <default>)` fallback — the forecast runtime falls back to the author's GPS, critique MAJOR #2).
- Battery capacity `15.36` in exactly **5 files** (K2d confirmed): `battery_forecast/physics/interval_simulator.py:73` and `:194`, `battery_forecast/config.py:41`, `battery_forecast/balancing/executor.py:60`, `battery_forecast/storage/plan_storage_baseline.py:280`.
- Scenario thresholds `1.5` / `2.8`: `battery_forecast/planning/scenario_analysis.py:645-646` (`if price < 1.5: charge_amount = min(2.8 / 4.0, ...)`).
- **Cold-inlet — corrected in this revision (Critic B c):** the original draft claimed cold-inlet "is not wired into the classifier." That is only half true. `CONF_BOILER_COLD_INLET_TEMP_C`/`DEFAULT_BOILER_COLD_INLET_TEMP_C=10.0` (`const.py:28`, `:99`) **are already wired** into the forecast/planning path in **5 sites in `boiler/api_views.py`** (`:36` import, `:569` param default, `:990` `config.get(CONF_BOILER_COLD_INLET_TEMP_C, ...)`, `:1173`, `:1216`) — grep-confirmed. What is genuinely **unwired** is the **live activity classifier**: `BoilerActivityClassifier.classify()` (`boiler/classifier.py:153`) calls `compute_ready_fraction(top_c=curr.top_temp_c, bottom_c=curr.bottom_temp_c)` at `classifier.py:180` **without** passing `cold_inlet_c`, so it silently falls back to `compute_ready_fraction`'s own **separate hardcoded literal** `_COLD_INLET_TEMP_C = 10.0` (`classifier.py:52`, `:231`) — a second, independent author-default constant that happens to equal the same value as `DEFAULT_BOILER_COLD_INLET_TEMP_C` but is not derived from it. **Task 4 must wire `classify()`'s call site (`classifier.py:180`) to pass the configured `cold_inlet_c`** (plumbed from `config.get(CONF_BOILER_COLD_INLET_TEMP_C, DEFAULT_BOILER_COLD_INLET_TEMP_C)`, matching `api_views.py:990`'s pattern) — the `api_views.py` sites need no change, they already read configuration.
- Roof geometry (declination/azimuth/kWp) defaults in the solar form path — **corrected in this revision (Critic A #1 / Critic B a): the F1-DESIGN §7 cite `solar_forecast_sensor.py:548-575` IS confirmed in this tree**, contrary to the original draft's "could not confirm" / "unconfirmable" claims at its own `:345`/`:406`/`:803` (see the Self-review notes below for the full correction). Grep-verified exact anchors: `:548` `"solar_forecast_string1_declination", 10`; `:551` `"solar_forecast_string1_azimuth", 138`; `:554` `"solar_forecast_string1_kwp", 5.4`; `:571`/`:574`/`:576` mirror these for string 2 (`kwp` default `0`, not `5.4`, for string 2). Edit these six `options.get(..., <default>)` call sites directly — no further re-grep needed.

**Files:**
- Modify: `custom_components/oig_cloud/config/validation.py`, `entities/solar_forecast_sensor.py` (`:548,551,554,571,574,576`), `battery_forecast/physics/interval_simulator.py`, `battery_forecast/config.py`, `battery_forecast/balancing/executor.py`, `battery_forecast/storage/plan_storage_baseline.py`, `battery_forecast/planning/scenario_analysis.py`, `boiler/classifier.py` (`:180` — pass `cold_inlet_c` through to `compute_ready_fraction`, sourced the same way `api_views.py:990` does).
- Modify: `config_migration.py` — register a Task-2 transform that pre-seeds effective values on upgrade (excluding `enable_statistics`/`enable_extended_sensors` per the OQ-5/OQ-6 guardrail above).
- Test: `tests/test_author_defaults_removed.py` (new) + extend `tests/test_init_setup_entry.py`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_author_defaults_removed.py
"""P7: no author installation values in code; missing config -> unavailable, not a fallback."""
import test_canonical  # repo helper if present


def test_no_author_gps_defaults_in_code():
    # grep-style guard: the literals 50.1219800 / 13.9373742 must not appear as DEFAULTS
    # (they may appear only in fixtures/tests). Assert validation.py + sensor have no
    # `lat: float = 50.12...` / `options.get(..., 50.12...)` default.
    ...


def test_no_1536_capacity_literal_in_runtime():
    # the 5 runtime files must read capacity from the box/sensor-first, not 15.36
    ...


def test_missing_config_yields_unavailable_not_fallback():
    # new install (no GPS, no capacity) -> solar forecast entity state == unavailable
    # and a warning is logged; NO silent author-value fallback.
    ...


def test_upgrade_preseeds_effective_values_via_migrator():
    # an entry that previously RELIED on the author default now has the effective value
    # written into options by the Task-2 migrator; behaviour is unchanged.
    ...
```

- [ ] **Step 2: Run — verify FAIL.**

Run: `.venv/bin/python -m pytest -q tests/test_author_defaults_removed.py`

- [ ] **Step 3: Implement**
  - Replace each author default with a sensor-first / options-first read; if the value is genuinely absent, return `unavailable` (or `None` that the entity surfaces as `unavailable`) and log a warning. P8 priority: sensor/box → user config → **local** code constant (for owned heuristics only).
  - Wire `classifier.py:180`'s `compute_ready_fraction(...)` call to pass `cold_inlet_c=` sourced from `CONF_BOILER_COLD_INLET_TEMP_C` (see the corrected finding above — `api_views.py` is already wired; only `classifier.py`'s live-classify call site needs the change).
  - Register an upgrade transform in `config_migration.py` that, for entries whose effective value previously came from the removed default, **pre-seeds** that value into options (so the live box does not flip behaviour) — **excluding `enable_statistics`/`enable_extended_sensors`** per the OQ-5/OQ-6 guardrail above. This is the P7×D11 resolution from K2e.
  - **Heuristics that are owned tuning (drift bands, boost cap, holding threshold, cooldowns — the P8 “REMOTE kandidáti") stay as LOCAL code constants in this task.** They are NOT moved to any remote/bundled tuning surface.

- [ ] **Step 4: Run — PASS** (incl. existing solar/battery forecast suites).

Run: `.venv/bin/python -m pytest -q tests/test_author_defaults_removed.py tests/test_init_setup_entry.py -k "author or default or migrate or setup_entry"`

- [ ] **Step 5: Lint + commit**

```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/battery_forecast custom_components/oig_cloud/entities/solar_forecast_sensor.py custom_components/oig_cloud/config/validation.py
git add -u
git commit -m "fix(P7): remove author defaults (GPS/15.36/1.5-2.8/cold-inlet); sensor-first + unavailable-on-missing; upgrade pre-seeds via migrator"
```

**Rollback note:** the pre-seed transform is the safety net — if a sensor-first read misbehaves, `await restore_last_backup` (Task 2) returns the pre-migration options where the author default still applied. The `solar_forecast_sensor.py:548-576` roof-geometry cite is confirmed (see above) — no further re-grep needed before editing.

---

### Task 5: Dead-key write removal (P6) — per-key re-audit, transactional filter, 1-release backup

> Stops writing verified-dead keys and filters them on read via the Task-2 migrator, backing up filtered keys for one release (downgrade path). **The P6 “10 dead keys" list is NOT uniformly dead — re-audit each key.** Verified status from grep:

| Key | Status (grep-verified) | Action |
|---|---|---|
| `notifications_scan_interval` | write-only (`steps.py:3289`); readers only in `strings.json` | remove write |
| `disable_planning_min_guard` | write (`steps.py:472`, `__init__.py:140`); no runtime reader found | remove write (after confirm) |
| `price_hysteresis_czk` | write (`steps.py:476`) + display-only read (`:807`); `__init__.py:142` default | remove write; keep if display path reads it |
| `hw_min_hold_hours` | write (`steps.py:477`) + display-only read (`:808`); `__init__.py:143` default | remove write; keep if display path reads it |
| `min_capacity_percent` / `target_capacity_percent` / `home_charge_rate` / `max_ups_price_czk` | **NOT legacy-bridge-only — LIVE, grep-status corrected (2026-07-17 residuals pass, R3):** in addition to the migration-bridge read at `__init__.py:153-160`, all four are read **directly by these legacy names** at runtime, outside any migration/bridge path: `battery_forecast/data/battery_state.py:156` `options.get("min_capacity_percent")`, `:182` `options.get("target_capacity_percent")`, `:236` `config.get("home_charge_rate", 2.8)`; `battery_forecast/planning/forecast_update.py:902` `opts.get("home_charge_rate", 2.8)`; `battery_forecast/presentation/detail_tabs_blocks.py:545` `opts.get("max_ups_price_czk", 10.0)`; `config/steps.py:804-806` (wizard reads of the same names). None of these call sites fall back to the canonical `planning_min_percent` / `CONF_PLANNING_MIN_PERCENT` name — they read the legacy spelling or nothing. | **DO NOT remove the legacy-name write.** The previous action ("remove the legacy half of the dual-write") is unsafe as written: it would silently zero out the values `battery_state.py` and `forecast_update.py` read for battery-forecast math, falling back to their hardcoded defaults (33.0% / 80.0% / 2.8 kW / 10.0 CZK) instead of the user's configured values — a functional regression, not a display glitch. Safe sequencing is: (1) repoint every live reader above at the canonical key (`planning_min_percent` / `CONF_PLANNING_MIN_PERCENT` and its siblings) with its own dual-read fallback during Task 3's compat window, (2) confirm via a re-grep that no call site still reads the legacy name, only then (3) stop the dual-write. Steps (1)–(2) are **not currently covered by any task in this plan** and are deferred — see Residuals-addressed table (R3) at the end of this document. |
| `boiler_comfort_profile_mode` | **LIVE** — `CONF_BOILER_COMFORT_PROFILE_MODE` (`const.py:58`); schema field + default `config/boiler_steps.py:302-303`; wizard-data write `config/steps.py:566-567` | **DO NOT DELETE** — active boiler field |
| `boiler_recovery_rate_c_per_hour` | **LIVE** — `CONF_BOILER_RECOVERY_RATE_C_PER_HOUR` (`const.py:55`); validation + schema `config/boiler_steps.py:158,160,205-206`; migration bridge `boiler/migration.py:35`; wizard-data write `config/steps.py:549-550` | **DO NOT DELETE** — active boiler field |
| `boiler_alt_source_mode` | **LIVE** — `CONF_BOILER_ALT_SOURCE_MODE` (`const.py:57`); validation + schema `config/boiler_steps.py:228,242-243,259`; migration bridge `boiler/migration.py:38,540-541`; wizard-data write `config/steps.py:509,561` | **DO NOT DELETE** — active boiler field |
| `boiler_planning_horizon_hours` | **LIVE — cite corrected (2026-07-17 residuals pass, R-B): this key does NOT appear in `config/boiler_steps.py` at all**, unlike its three row-mates above — `CONF_BOILER_PLANNING_HORIZON_HOURS` (`const.py:49`); real readers/writers are `config/steps.py:491` (`_clamp_boiler_planning_horizon_hours` clamp helper), `:569,572` (wizard-data write via the clamp helper), `:2616`, `:2843` (schema defaults) | **DO NOT DELETE** — active boiler field |
| `planning_min_percent` | **CANONICAL** — `CONF_PLANNING_MIN_PERCENT` (`const.py:84`); read by planner | **DO NOT DELETE** |

> **P6 scope gap — corrected in this revision (Critic A #5):** the Scope-area
> coverage map (bottom of this doc) claims Task 5 gives "P6" full coverage, but
> four live, grep-confirmed config surfaces are **not in the table above and not
> touched by this task**: `tariff_weekend_same_as_weekday` (`steps.py:248,335,702,
> 712,2231,2232,2279,2301,2343` — read/written across the tariff wizard and
> options-flow display path), `import_yaml`/`async_step_import_yaml`
> (`steps.py:3134,3320`), `enable_auto` (`const.py:77` `CONF_ENABLE_AUTO`;
> `steps.py:620,1119`), and `config/schema.py` (exists as a file; not audited by
> this task at all). **None of these are dead** — they are live, read config
> surfaces outside this task's per-key table. This task explicitly does **NOT**
> cover them; the Scope-area coverage map below is corrected to say so rather than
> claim blanket "P6 coverage." A full `config/schema.py` + these three fields'
> dead/live audit is out of scope for Task 5 and not silently implied by it.

**Files:**
- Modify: `config/steps.py` (`_build_battery_options` `:436-501`, `async_step_quick_setup` `:3286-3303`), `__init__.py` (`_get_planner_defaults` `:133-146` — drop the legacy half of each dual-write).
- Modify: `config_migration.py` — add a **dedicated pop-based strip path** (NOT a `register_transform` merge-path entry — see the corrected Step 3 below, Critic A #4) that removes dead keys from `entry.options` and writes them to the 1-release backup.
- Test: `tests/test_dead_keys_removed.py` (new) + extend `tests/test_config_steps_payload.py`, `tests/test_config_flow_entry.py`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_dead_keys_removed.py
def test_build_battery_options_no_longer_writes_legacy_keys():
    from custom_components.oig_cloud.config.steps import ConfigFlow
    payload = ConfigFlow._build_battery_options({"planning_min_percent": 30.0,
                                                 "home_charge_rate": 2.5})
    assert "min_capacity_percent" not in payload      # legacy write removed
    assert "disable_planning_min_guard" not in payload
    # CONF_PLANNING_MIN_PERCENT / CONF_CHARGE_RATE_KW still present (canonical)


def test_quick_setup_no_longer_seeds_notifications_scan_interval():
    # async_step_quick_setup options no longer contain notifications_scan_interval
    ...


def test_dead_keys_filtered_on_read_with_backup():
    # entry.options with a dead key -> after migration the key is gone from options
    # AND preserved in the 1-release backup (downgrade path)
    ...
```

- [ ] **Step 2: Run — verify FAIL.**

Run: `.venv/bin/python -m pytest -q tests/test_dead_keys_removed.py`

- [ ] **Step 3: Implement**
  - Remove the legacy half of each dual-write in `_get_planner_defaults` (`__init__.py:137-145`) and the legacy keys in `_build_battery_options` (`steps.py:436-501`), and `notifications_scan_interval` in `async_step_quick_setup` (`:3286-3303`).
  - **Corrected in this revision (Critic A #4):** the original draft planned to
    strip dead keys via a `register_transform(...)` entry feeding `run_migration`'s
    `updates` dict, written through `merge_entry_options`. That cannot work —
    `merge_entry_options` only `.update()`s and **"NEVER replaces"**
    (`config_merge.py:4-5,24-26`), so a key present in `entry.options` but absent
    from `updates` is never removed; the "strip" transform would be silently
    unreachable. Real in-tree deletions instead use `options.pop(...)` followed by
    a **direct** `hass.config_entries.async_update_entry(...)` call
    (`__init__.py:169-185` `_purge_obsolete_planner_options`, `:870-874`
    `enable_spot_prices` removal, `:2018-2020` `_needs_reload` cleanup) — bypassing
    the merge path entirely. Add a dedicated pop-based function to
    `config_migration.py` instead:
    ```python
    _DEAD_KEYS: List[str] = []  # populated by this task's register_dead_key(...)


    def register_dead_key(key: str) -> None:
        _DEAD_KEYS.append(key)


    async def strip_dead_keys(hass, entry) -> None:
        """Deletions never go through merge_entry_options — see Critic A #4.
        Uses the same pop + async_update_entry pattern as the existing in-tree
        deletions (__init__.py:169-185, :870-874, :2018-2020)."""
        options = dict(entry.options)
        removed = {k: options.pop(k) for k in _DEAD_KEYS if k in options}
        if not removed:
            return
        backup = await _backup_store(hass, entry.entry_id).async_load() or {}
        if not isinstance(backup, dict):
            backup = {}
        backup["removed_keys"] = removed
        backup["backup_until_version"] = MIGRATION_VERSION + 1  # 1-release window
        await _backup_store(hass, entry.entry_id).async_save(backup)
        hass.config_entries.async_update_entry(entry, options=options)
    ```
    Call `await strip_dead_keys(hass, entry)` from `async_setup_entry` **after**
    `run_migration` (Task 2) has completed for that entry, not as one of its
    `_TRANSFORMS`.
  - **Do not remove any key marked LIVE or CANONICAL above, and do not touch
    `tariff_weekend_same_as_weekday`, `import_yaml`, `enable_auto`, or
    `config/schema.py`** (the P6 scope-gap items above — out of scope for this
    task). If a key's read status is ambiguous after re-grep, keep it and flag it
    in the task commit message rather than deleting.

- [ ] **Step 4: Run — PASS**

Run: `.venv/bin/python -m pytest -q tests/test_dead_keys_removed.py tests/test_config_steps_payload.py tests/test_config_flow_entry.py`

- [ ] **Step 5: Lint + commit**

```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/config/steps.py custom_components/oig_cloud/__init__.py
git add -u
git commit -m "feat(P6): remove verified-dead key writes; transactional read-filter + 1-release backup (per-key re-audited)"
```

**Rollback note:** the 1-release backup's `removed_keys` slot restores the stripped keys via the same pop-path pattern (merge back with a direct `async_update_entry`, not `merge_entry_options`, so a key that was legitimately removed elsewhere isn't silently reintroduced). Removal of the legacy *read* bridges (`__init__.py:153-160`) lands only in Task 8, after Task 9 smoke proves no live entry still depends on them.

---

### Task 6: Bundled dataset (`pricelists` + `ai_models`) — NO runtime fetch (SCOPE-REVISION #2,#3,#4; CRITICAL #1)

> `remote_config` becomes a **bundled dataset read from packaged files**. The runtime fetch / signature / MITM / cache / rollback / expiry machinery and its tests are **dropped** (closes critique CRITICAL #1). The `ai_models` fallback chain is **KEPT**.

**Verified state of the tree:** `custom_components/oig_cloud/remote_config/` does **not** exist in this worktree, and there are **zero** `remote_config` references in `custom_components/` (`rg -l remote_config custom_components/` → none). So this task **establishes** the bundled-dataset contract. If Plan 3 (authored in parallel) introduced a `remote_config/loader.py` fetch path against the older F1-DESIGN §4, this task **replaces** it with the bundled reader. The no-network-fetch test (Step 1) is the guardrail that closes CRITICAL #1 regardless of which plan introduced the loader.

**Files:**
- Create: `custom_components/oig_cloud/remote_config/__init__.py`, `remote_config/bundled.py` (reader), `remote_config/data/pricelists.json` (ČEZ/EG.D/PRE from ERÚ — generated maintainer-side, O3/K2c), `remote_config/data/ai_models.json` (per-provider list + fallback order; `enabled:false` for undeployed models like kimi-k2.6 per P1).
- If a `remote_config/loader.py` fetch path was added by Plan 3: **delete** it and its tests.
- Test: `tests/test_remote_config_bundled.py` (new).

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_remote_config_bundled.py
"""SCOPE-REVISION #2/#3/#4: pricelists + ai_models are BUNDLED. NO runtime fetch.
Closes critique CRITICAL #1."""
import socket
import pytest

from custom_components.oig_cloud.remote_config.bundled import (
    load_pricelists, load_ai_models, get_fallback_chain,
)


def test_pricelists_load_from_packaged_file():
    pl = load_pricelists()
    assert pl["year"] >= 2026
    assert {"cez", "egd", "pre"} <= set(pl["distributors"])


def test_ai_models_fallback_chain_kept_per_provider():
    chain = get_fallback_chain("groq")
    assert chain                      # non-empty fallback order preserved (P1/P10)
    assert all(m.get("id") for m in chain)


def test_NO_network_fetch_occurs(monkeypatch):
    """CRITICAL #1 guardrail: loading the dataset must not touch the network."""
    def _refuse(*a, **k):
        pytest.fail("remote_config performed a network fetch — bundled-only is required")
    monkeypatch.setattr(socket, "socket", _refuse)
    # also block any aiohttp/httpx client the loader might use
    monkeypatch.setattr("aiohttp.ClientSession", _refuse, raising=False)
    load_pricelists()
    load_ai_models()
```

- [ ] **Step 2: Run — verify FAIL** (`ModuleNotFoundError: remote_config.bundled`).

Run: `.venv/bin/python -m pytest -q tests/test_remote_config_bundled.py`

- [ ] **Step 3: Implement the bundled reader**

```python
# custom_components/oig_cloud/remote_config/bundled.py
"""Bundled dataset reader (SCOPE-REVISION #2/#3/#4). Reads ONLY packaged files.
No fetch, no signature, no cache, no rollback, no expiry — those are dropped
(critique CRITICAL #1). The ai_models fallback chain is KEPT (P1/P10)."""
from __future__ import annotations
import json
from importlib import resources
from typing import Any, Dict, List


def _load(name: str) -> Any:
    with resources.files(f"{__package__}.data").joinpath(name).open("r", encoding="utf-8") as fh:
        return json.load(fh)


def load_pricelists() -> Dict[str, Any]:
    return _load("pricelists.json")


def load_ai_models() -> Dict[str, Any]:
    return _load("ai_models.json")


def get_fallback_chain(provider: str) -> List[Dict[str, Any]]:
    models = load_ai_models().get(provider, [])
    return [m for m in models if m.get("enabled", True)]   # skip enabled:false (kimi-k2.6)
```

- Ship `data/pricelists.json` + `data/ai_models.json` (maintainer-generated; the ERÚ XLSX→JSON conversion runs maintainer-side, NOT in HA runtime — K2c). If Plan 3 already shipped these, point the reader at them.
- **Drop** the F1-DESIGN §9 error-table row “GitHub remote_config nedostupný → bundled kopie + poslední cache" — replace with bundled-only (no cache). Remove any signature/MITM/cache/rollback/expiry tests if they were added.

- [ ] **Step 4: Run — PASS** (the `test_NO_network_fetch_occurs` test is the CRITICAL #1 gate).

Run: `.venv/bin/python -m pytest -q tests/test_remote_config_bundled.py`

- [ ] **Step 5: Lint + commit**

```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/remote_config
.venv/bin/mypy --ignore-missing-imports --explicit-package-bases custom_components/oig_cloud/remote_config/bundled.py
git add custom_components/oig_cloud/remote_config tests/test_remote_config_bundled.py
git commit -m "feat(remote_config): bundled pricelists + ai_models reader, NO runtime fetch (SCOPE-REVISION #2-4; CRITICAL #1)"
```

**Rollback note:** the dataset is immutable per release; there is no runtime state to roll back. If a provider/model list is wrong, ship a corrected `data/*.json` in the next release.

---

### Task 7: Convert silent fallback paths to explicit migration errors (F1-DESIGN §8)

> After Plan 2/3 consumers exist, replace silent compatibility fallbacks with explicit, migration-safe error handling inside the Task-3 compat window, and remove temporary guard code once all clients are canonical.

Verified silent-fallback paths:
- `core/data_source.py:94-101` — `get_configured_mode` silently maps legacy `"hybrid"` → `"local_only"` with only a log line (`:98`). This is a silent behaviour change on a live box; convert to a versioned warning inside the window, then an explicit error.
- `api/ha_rest_api.py:1255` — POST treats an unknown field as `errors[key] = "unknown field"`; this is collected into the `errors` dict, and at `:1267-1268` `if errors:` returns `web.json_response({"error": "validation", "fields": errors}, status=400)` — a hard **400**, not a soft/200-ish response (corrected 2026-07-17, R-C). Inside the compat window, an alias-class unknown key should instead return a structured migration error at 200 or a distinct 4xx that a client can tell apart from an unrelated validation failure; after the window, the existing hard 400 remains as-is.

**Files:**
- Modify: `custom_components/oig_cloud/core/data_source.py` (`get_configured_mode` `:94-101`; keep `get_proxy_stale_minutes` `:104` / `get_local_event_debounce_ms` `:113`), `api/ha_rest_api.py` (`OIGCloudModuleConfigView.post` `:1224-1279`).
- Test: `tests/test_data_source_helpers.py`, `tests/test_ha_rest_api_views.py`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_data_source_helpers.py
def test_get_configured_mode_warns_on_hybrid_inside_window_then_errors():
    # inside window: hybrid accepted, mapped to local_only, DeprecationWarning emitted
    # after window: explicit migration_required error (not a silent map)
    ...


# tests/test_ha_rest_api_views.py
async def test_module_config_post_alias_key_returns_migration_error_inside_window(...):
    # POST with a deprecated alias key -> 400 {"error":"migration_required","deprecated":[...]}
    ...
```

- [ ] **Step 2: Run — verify FAIL.**

Run: `.venv/bin/python -m pytest -q tests/test_data_source_helpers.py tests/test_ha_rest_api_views.py -k "get_configured_mode or migration_error"`

- [ ] **Step 3: Implement** — drive both paths through `config_deprecation.deprecation_status`; emit the structured migration error after the window. Remove the temporary silent-map guard code once Task 9 smoke proves no live entry still sends `hybrid` / alias keys.

- [ ] **Step 4: Run — PASS**

Run: `.venv/bin/python -m pytest -q tests/test_data_source_helpers.py tests/test_ha_rest_api_views.py -k "get_configured_mode or module_config or migration"`

- [ ] **Step 5: Lint + commit**

```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/core/data_source.py custom_components/oig_cloud/api/ha_rest_api.py
git add -u
git commit -m "refactor(hardening): explicit migration errors for hybrid/alias paths (F1 §8); drop silent fallback after window"
```

**Rollback note:** widen the Task-3 window to re-enable silent acceptance. Removal of the legacy `hybrid` mode and the alias read-bridges (`__init__.py:153-160`) lands in Task 8.

---

### Task 8: Remove LEGACY compatibility shims marked “removed in Plan 4"

> Removes the scaffolding Plans 1/2 left behind, **only after** Tasks 3/5/7 prove every consumer is canonical. This is the only task that deletes still-readable legacy code.

Verified shims (plan-1 marked these `# LEGACY — superseded by config_registry; removed in Plan 4`):
- `api/ha_rest_api.py`: `_MODULE_CONFIG_FIELDS` (`:1076`), `_MODULE_CONFIG_MIRRORS` (`:1159`), `_SECRET_FIELDS` (`:1162`), `_coerce_module_value` (`:1167`).
- `__init__.py`: legacy read-bridges `legacy_min = options.get("min_capacity_percent")` (`:153-160`) — remove once Task 9 shows no live entry needs them.

**Precondition:** the plan-1 parity test `test_registry_covers_legacy_whitelist` (`tests/test_config_registry.py`) imports `_MODULE_CONFIG_FIELDS`. Remove that import (or the assertion) as part of this task — the registry is now the sole source of truth.

> **Added in this revision (Critic A #6 — test list under-covers):** the original
> draft's precondition and Step-4 run list named only `tests/test_config_registry.py`
> as an importer of the shims. Grep-confirmed that
> `tests/test_boiler_f4b_attribution.py:714,716,733,735` **also** imports
> `_coerce_module_value`/`_MODULE_CONFIG_FIELDS` from `ha_rest_api.py` (two boundary
> tests: `test_module_config_boiler_target_temp_boundary`,
> `test_module_config_boiler_volume_boundary`). If this file is left off Step 4's
> run list, deleting the shims here goes green locally and only reddens later at
> Task 10's full-suite run — exactly the under-coverage Critic A flagged. Add it to
> both the precondition and the Files/Test list below, and rewrite its two boundary
> tests to call the registry's `coerce_value`/`FIELD_REGISTRY` directly instead of
> the legacy helpers, in the same pass as `test_config_registry.py`.

**Files:**
- Modify: `custom_components/oig_cloud/api/ha_rest_api.py`, `custom_components/oig_cloud/__init__.py`, `tests/test_config_registry.py`, `tests/test_boiler_f4b_attribution.py` (`:714-742` — rewrite the two boundary tests off the legacy helpers).
- Test: `tests/test_ha_rest_api_more.py` (add a guard that no legacy helper is referenced by the canonical write path).

- [ ] **Step 1: Write the failing guard test**

```python
# tests/test_ha_rest_api_more.py
def test_module_config_no_legacy_helpers_in_runtime_path():
    # GET/POST route ONLY through registry coerce_value + merge_entry_options;
    # _coerce_module_value / _MODULE_CONFIG_FIELDS / _MODULE_CONFIG_MIRRORS no longer exist.
    import custom_components.oig_cloud.api.ha_rest_api as api
    for name in ("_coerce_module_value", "_MODULE_CONFIG_FIELDS",
                 "_MODULE_CONFIG_MIRRORS", "_SECRET_FIELDS"):
        assert not hasattr(api, name), f"legacy helper {name} still present"
```

- [ ] **Step 2: Run — verify FAIL** (the shims still exist).

Run: `.venv/bin/python -m pytest -q tests/test_ha_rest_api_more.py -k "legacy_helpers"`

- [ ] **Step 3: Implement** — delete the four shims from `ha_rest_api.py` and the legacy read-bridges from `__init__.py`; update `tests/test_config_registry.py` **and `tests/test_boiler_f4b_attribution.py`** to drop the `_MODULE_CONFIG_FIELDS`/`_coerce_module_value` imports (assert against the registry's `coerce_value`/`FIELD_REGISTRY` directly). Confirm `OIGCloudConfigRegistryView` (`:1282`, `registry_as_api_dict` `:1295`) remains the sole definition source.

- [ ] **Step 4: Run — PASS**

Run: `.venv/bin/python -m pytest -q tests/test_ha_rest_api_views.py tests/test_ha_rest_api_more.py tests/test_config_registry.py tests/test_boiler_f4b_attribution.py`

- [ ] **Step 5: Lint + commit**

```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/api/ha_rest_api.py custom_components/oig_cloud/__init__.py
git add -u
git commit -m "refactor(cleanup): remove LEGACY config shims (_MODULE_CONFIG_*, _coerce_module_value, legacy bridges) — registry is sole source (Plan 4)"
```

**Rollback note:** this task is the point of no return within a release. If a consumer regression appears, restore the shims behind the Task-3 window flag rather than reverting the whole plan. Run Task 9 smoke before and after.

---

### Task 9: Migration / smoke regression suite (F1-DESIGN §9)

> End-to-end coverage for alias deprecation, compat behaviour, the bundled-dataset load path, and transactional migration interruption/retry/downgrade on a copy of the author's sparse live entry.

**Files:**
- Create: `tests/test_f1_plan4_migration_smoke.py`, `tests/test-migration-plan4-smoke.sh`.

- [ ] **Step 1: Write the smoke tests**

```python
# tests/test_f1_plan4_migration_smoke.py
"""F1 §9: end-to-end Plan-4 migration safety on a sparse live-entry fixture."""

LIVE_ENTRY_FIXTURE = {
    # a copy of the author's actual sparse options (minimal: box creds + a few keys)
    "standard_scan_interval": 60, "min_capacity_percent": 18.0,
    "home_charge_rate": 2.6, "data_source_mode": "hybrid",
    "solar_forecast_latitude": 50.1219800,  # still the author GPS pre-migration
}


async def test_migration_smoke_compat_then_canonical(hass):
    # 1) load sparse legacy entry -> migration runs, snapshot taken
    # 2) legacy keys accepted inside window with warnings; canonical keys now present
    # 3) post-window: legacy alias write -> explicit migration_required error
    # 4) canonical write always accepted; legacy keys not re-introduced
    ...


async def test_migration_interrupt_then_retry_then_downgrade(hass, monkeypatch):
    # interrupt mid-write -> options unchanged, marker complete=False
    # retry -> completes idempotently
    # restore_last_backup -> options match the pre-migration snapshot (downgrade path)
    ...


def test_bundled_dataset_loads_with_no_fetch(monkeypatch):
    # re-assert the CRITICAL #1 guard at the integration level
    ...


async def test_get_module_config_non_admin_rejected(hass):
    # re-assert the Task-1 gate in the smoke flow
    ...
```

- [ ] **Step 2: Add the smoke matrix script**

```bash
#!/usr/bin/env bash
# tests/test-migration-plan4-smoke.sh
set -euo pipefail
.venv/bin/python -m pytest -q \
  tests/test_config_migration.py \
  tests/test_config_deprecation.py \
  tests/test_dead_keys_removed.py \
  tests/test_author_defaults_removed.py \
  tests/test_remote_config_bundled.py \
  tests/test_f1_plan4_migration_smoke.py \
  tests/test_config_merge.py tests/test_config_registry.py \
  tests/test_ha_rest_api_views.py tests/test_ha_rest_api_more.py \
  tests/test_data_source_helpers.py tests/test_init_setup_entry.py
```

- [ ] **Step 3: Acceptance**

Run: `bash tests/test-migration-plan4-smoke.sh` — all green.

- [ ] **Step 4: Lint + commit**

```bash
git add tests/test_f1_plan4_migration_smoke.py tests/test-migration-plan4-smoke.sh
git commit -m "test(f1-plan4): migration/smoke regression suite — compat, bundled load, interrupt/retry/downgrade (F1 §9)"
```

**Rollback note:** keep the smoke matrix under the Task-3 version flag so it can be re-run against a pre-removal tree to confirm the rollback path.

---

### Task 10: Full gate + self-review

- [ ] **Step 1: Run the full backend gate**

Run:
```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/
.venv/bin/mypy --ignore-missing-imports --explicit-package-bases custom_components/oig_cloud/config_migration.py custom_components/oig_cloud/remote_config/bundled.py custom_components/oig_cloud/api/ha_rest_api.py
.venv/bin/python -m pytest -q tests/
```
Expected: all green (full suite).

- [ ] **Step 2: Self-review** — confirm every destructive task (4, 5, 7, 8) has its Task-2 snapshot + Task-3 window guard in place and is covered by Task 9 smoke. Final commit for any straggler fixes:

```bash
git add -u && git commit -m "test(f1-plan4): full gate green — cleanup, transactional migration, bundled dataset, GET gate"
```

---

## Preconditions & dependencies on other plans

- **Plan 2 must resolve OQ-5/OQ-6** (the `enable_statistics` / `enable_extended_sensors` default contradiction) before Task 5/8 delete any path. Verified: `config_registry.py:126-127` default both to `False`, but `steps.py:378/384` and the runtime read `__init__.py:1596` default to `True`, and GET uses the registry default (`ha_rest_api.py:1220`) — so the dashboard can report a different state from the runtime. This is a Plan-2 product decision; Plan 4 must not delete either default until it is reconciled. Cited, not re-planned.
- **Plan 3 must ship the AI backend + bundled dataset files** (or this plan's Task 6 ships them). Plan 4's Task 6 is written to establish the bundled contract regardless.
- `manifest.json` (`:14`, version `2.3.36`) has **no `requires` minimum-HA field** (verified) — the min-HA decision (K2c) is a Plan-3/release concern; Plan 4 does not touch it.

## Scope-area coverage map

| Brief scope area | Tasks |
|---|---|
| 1. Cleanup (dead keys, author defaults, de-hardcode; heuristics LOCAL) | Task 4 (P7/P8), Task 5 (P6 — **partial**: the 10-key table only; `tariff_weekend_same_as_weekday`, `import_yaml`, `enable_auto`, `config/schema.py` are live and explicitly out of scope, see Task 5) |
| 2. `remote_config` → bundled dataset, no runtime fetch | Task 6 |
| 3. Alias/legacy migration, transactional/recoverable | Task 2 (transactional core), Task 3 (compat window) |
| 4. API/flow hardening after Plan 2/3 consumers | Task 7, Task 8 |
| 5. GET `module_config` admin-gate (standalone) | Task 1 |
| 6. Migration/smoke regression tests | Task 9 (+ guards in 2, 6) |

## Self-review notes

> **f1-plan4-incorp revision note:** the original draft of this plan was delivered
> to two adversarial critics (rework=SUBSTANTIAL and rework=TRIVIAL verdicts,
> both `honest=false, complete=false`) **without** their findings incorporated —
> the draft's mtime predates both verdicts. This revision incorporates every
> finding from both critics (1–7, a–e); see the Findings-addressed table at the
> end of this document for the full disposition. The bullet immediately below
> ("Every file:line cite was grep-verified") was the draft's own claim and **was
> false** — three of its own cites (`:345`/`:406`/`:803` in the pre-revision
> numbering, `solar_forecast_sensor.py:548-575`) contradicted lines the draft
> itself could have grepped. It is corrected here, not removed outright, so the
> discrepancy stays visible rather than silently disappearing.
>
> **Second revision note (2026-07-17, residuals pass):** the bullet that used to
> follow this note ("Every file:line cite in this revision was re-grep-verified")
> was **itself another instance of the same blanket-verification claim the note
> above already flags as false**. An independent verifier re-checked this
> document and found it did not hold precisely because that blanket claim was
> not true: at least two cites it covered were wrong (the Store-await premise in
> Task 2 / the A3 table row, and the Task 5 dead-key table's grep-status column
> for four keys — see the Residuals-addressed table at the end of this document).
> The blanket bullet is removed outright this time, not reworded, because a
> "verified" claim that is sometimes false is worse than no claim: it invites a
> reader to trust cites that were never actually re-checked. What can honestly be
> said is narrower and is stated inline at each cite's point of use (Verification
> log below, Findings-addressed table, and the Residuals-addressed table) rather
> than asserted as a single sweeping guarantee.
- **Honest gaps flagged:**
  - `remote_config/` does not yet exist in the tree; Task 6 establishes the bundled contract (or replaces a Plan-3 fetch loader). Stated explicitly in Task 6.
  - Tests live at repo-root `tests/` (262 top-level files via `find tests -maxdepth 1 -type f`; 274 including subdirectories via `find tests -type f` — corrected 2026-07-17, R-D), not `custom_components/oig_cloud/tests/*` as the brief's scope line says — cited as `tests/`.
  - The P6 “10 dead keys" are **not uniformly dead**; Task 5 re-audits each and refuses to delete LIVE/CANONICAL keys (`boiler_*`, `CONF_PLANNING_MIN_PERCENT`). Tabulated. **Additionally (this revision, Critic A #5): P6 is not fully covered by Task 5** — `tariff_weekend_same_as_weekday`, `import_yaml`, `enable_auto`, and `config/schema.py` are live, grep-confirmed, and explicitly out of Task 5's scope; the Scope-area coverage map above is corrected to say "partial," not full P6 coverage. **Deferred, not covered by this plan** — flagging rather than silently expanding Task 5's blast radius.
  - The `solar_forecast_sensor.py:548-575` roof-geometry cite (F1-DESIGN §7) — **this revision confirms it, reversing the prior draft's "could not confirm"**: lines `548`/`551`/`554` (string 1) and `571`/`574`/`576` (string 2) hold exactly the declination/azimuth/kWp defaults described (`10`, `138`, `5.4`/`0`). Re-grepped directly; no further verification needed before Task 4 edits it.
  - **New gap surfaced by this revision (Critic B c):** the cold-inlet default is wired in `boiler/api_views.py` (5 sites) but **not** in the live `BoilerActivityClassifier.classify()` path (`classifier.py:180`), which falls back to its own separate hardcoded `_COLD_INLET_TEMP_C=10.0` (`classifier.py:52`). Task 4 now targets this exact call site instead of the vague "the classifier" from the prior draft.
  - **New gap surfaced by this revision (Critic A #4):** the prior draft's dead-key/roof-geometry-adjacent deletion design routed strips through `merge_entry_options`, which cannot delete keys (update-only). Task 5 now uses a dedicated pop-based `strip_dead_keys` path, matching the repo's existing deletion pattern.
  - **CRITICAL #2 is only half-closed by Task 1** (this revision, Critic A #2): the GET admin-gate asymmetry is closed here; the plaintext-API-key half (`settings/index.ts:627,634`) is explicitly deferred to Plan 3 / UX-AUDIT U5 — not silently dropped. See the note at the end of Task 1.
- Critique CRITICAL #1 (remote_config control plane) → closed by Task 6 (bundled, no fetch). Critique CRITICAL #2 (non-admin config read) → **half**-closed by Task 1 (GET admin-gate); the plaintext-API-key half is Plan 3 / UX-AUDIT U5, not this plan (corrected from the prior draft's unqualified "closed"). Critique top-5 #5 (non-recoverable migration) → closed by Task 2, **redesigned in this revision** to actually await Store I/O, pass `suppress_reload`, restore via wholesale replace (not merge), and expose an admin restore service (was previously broken — see Task 2). Critique MAJOR #2 (author GPS fallback) → closed by Task 4. Critique MAJOR #5 (defaults contradiction, OQ-5/OQ-6) → cited as a Plan-2 precondition for Tasks 5/8 **and now also Task 4's pre-seed transform** (this revision, Critic B e — the contradiction was leaking into Task 4 uncited), not re-planned.
- No behaviour is removed before its transactional migration (Task 2), compat window (Task 3), and smoke proof (Task 9) are in place.

### Verification log (grep-confirmed anchors)

- `api/ha_rest_api.py`: `OIGCloudModuleConfigView` `:1192`; `get` `:1206` (only `requires_auth=True` at `:1204`, **no** `is_admin`); `post` `:1224` (admin check `:1228-1229`); `_MODULE_CONFIG_FIELDS` `:1076`; `solar_forecast_latitude`/`longitude` `:1107-1108`; `_MODULE_CONFIG_MIRRORS` `:1159`; `_SECRET_FIELDS` `:1162`; `_coerce_module_value` `:1167`; `coerce_value` call `:1261`; `merge_entry_options` call `:1272`; `OIGCloudConfigRegistryView` `:1282`; `registry_as_api_dict` `:1295`.
- `config_registry.py`: `enable_statistics`/`enable_extended_sensors` default **False** `:126-127`; `Field` `:16`; `mirror` `:27`; `reload_on_change` `:28`; `coerce_value` `:39`; `fields_for_section` `:90`.
- `config_merge.py`: `merge_entry_options` `:18-20` (has `suppress_reload` `:19` as a real third parameter, default `False` — the prior draft's Task-2 call left it as a trailing comment instead of passing it; fixed in this revision); `new_options.update(updates)` `:26` — never replaces (docstring `:4-5`).
- `config/steps.py`: `_build_options_payload` `:355`; `_build_base_options` `:367` (interval defaults `:369-377`, `enable_statistics`/`enable_extended_sensors` default **True** `:378/384`); `_build_battery_options` `:436-501` (legacy writes `:461/462/468/472/475/476/477`; canonical `:469 CONF_PLANNING_MIN_PERCENT` / `:470 CONF_CHARGE_RATE_KW`); `_build_boiler_options` `:502`; `_collect_interval_values` `:1395-1413` (keys sourced from canonical `user_input` names, e.g. `:1397` `user_input.get("standard_scan_interval", 30)` — confirmed NOT a legacy-spelling window, this revision); `_validate_interval_values` `:1415`; `_show_intervals_form` `:1464`; `notifications_scan_interval` write `:3289`; `VERSION = 1` `:3108`; `tariff_weekend_same_as_weekday` `:248,335,702,712,2231-2343`; `import_yaml`/`async_step_import_yaml` `:3134,3320`; `enable_auto` `:620,1119`.
- `__init__.py`: `_get_planner_defaults` `:133` (dict literal `:135-147` — dual-write legacy+canonical `:137-145`, **plus `:136` `CONF_AUTO_MODE_SWITCH` and `:146` `cheap_window_percentile`**, both omitted by the prior draft's `:137-145` window, this revision); `_migrate_legacy_planner_options` `:150` (called from `_ensure_planner_option_defaults` `:200/1545`); real in-tree deletions via pop + direct `async_update_entry` (NOT merge): `_purge_obsolete_planner_options` `:169-185`, `enable_spot_prices` removal `:870-874`, `_needs_reload` cleanup `:2018-2020`; `async_setup_entry` `:1535` (ad-hoc option-write/migration calls `:1545-1547, 1557-1558`); `enable_statistics` runtime default **True** `:1596`.
- `core/data_source.py`: `DATA_SOURCE_HYBRID="hybrid"` `:31`; `get_configured_mode` `:94` (silent `hybrid`→`local_only` map + log `:98`); `get_proxy_stale_minutes` `:104`; `get_local_event_debounce_ms` `:113`; `_on_any_state_change` `:547` (`normalize_proxy_entity_id` gate `:569/576`).
- Author defaults: GPS `validation.py:66`, `entities/solar_forecast_sensor.py:640-641`; `15.36` in 5 files (`interval_simulator.py:73,194`, `battery_forecast/config.py:41`, `balancing/executor.py:60`, `storage/plan_storage_baseline.py:280`); `1.5`/`2.8` `battery_forecast/planning/scenario_analysis.py:645-646`; cold-inlet `const.py:28/99` (**confirmed already wired** in `boiler/api_views.py:36,569,990,1173,1216`; genuinely unwired only at `classifier.py:180`'s `compute_ready_fraction` call, which falls back to `classifier.py:52` `_COLD_INLET_TEMP_C=10.0` — this revision, Critic B c); roof geometry `entities/solar_forecast_sensor.py:548,551,554,571,574,576` (**confirmed present, this revision** — reverses the prior draft's "could not confirm").
- `www_v2/src/ui/features/settings/index.ts`: `isSecret` `:627`; `<input type="text">` for secrets `:634` — no `type="password"` anywhere in `www_v2/src/` (0 hits) — this revision, closes the CRITICAL #2 residual note in Task 1.
- `boiler/classifier.py`: `BoilerActivityClassifier.classify` `:153`, calls `compute_ready_fraction(top_c=..., bottom_c=...)` without `cold_inlet_c` at `:180`; `compute_ready_fraction` `:227-231` default `cold_inlet_c: float = _COLD_INLET_TEMP_C` (`:52`, `= 10.0`) — this revision.
- `manifest.json:14` (`version 2.3.36`, no `requires`).
- Tests at repo-root `tests/` (262 top-level files via `find tests -maxdepth 1 -type f`; 274 including subdirectories via `find tests -type f` — corrected 2026-07-17, R-D); relevant existing: `test_config_merge.py`, `test_config_registry.py`, `test_ha_rest_api_views.py`/`_helpers.py`/`_more.py`, `test_init_setup_entry.py`, `test_boiler_task9_migration_repair.py`, `test_sensor_registry_cleanup.py`, `test_data_source_helpers.py`, `test_boiler_f4b_attribution.py:714-742` (imports `_coerce_module_value`/`_MODULE_CONFIG_FIELDS` — added to Task 8's scope, this revision, Critic A #6).

---

## Findings-addressed table (f1-plan4-incorp revision — 2026-07-17)

Both critics reviewed the prior draft of this document and returned `honest=false,
complete=false` (Critic A: rework=SUBSTANTIAL; Critic B: rework=TRIVIAL) because the
draft was delivered without their findings incorporated. Each row below carries its
own inline "corrected in this revision" note and grep-evidence column at its point of
use — see the Verification log above for the raw anchors. (A prior blanket claim that
*every* finding in this table was re-grepped was itself found false by an independent
verifier and is retracted; see the Residuals-addressed table's R1 entry below for why
blanket claims are not made in this document.)

| # | Finding | How addressed (section/line) | Grep evidence confirming the real code |
|---|---|---|---|
| A1 | False verification claim: draft:798 claimed blanket grep-verification, but its own `:345/:406/:803` called `solar_forecast_sensor.py:548-575` unconfirmable when the defaults ARE there. | Blanket claim removed from Self-review notes (now scoped to "this revision's cites"); Task 4's roof-geometry bullet and rollback note corrected to state the cite is confirmed; Self-review gap bullet rewritten to say "reversing the prior draft's could-not-confirm." | `entities/solar_forecast_sensor.py:548` `"solar_forecast_string1_declination", 10`; `:551` `azimuth", 138`; `:554` `"...kwp", 5.4`; `:571/:574/:576` mirror for string 2 (kwp default `0`). Verified directly by `sed`/`grep -n` in this worktree. |
| A2 | CRITICAL #2 half-closed: draft:804 "closed by Task 1" omitted the plaintext-API-key half (REPORT-codex:21, `settings/index.ts:626-636`). | Explicit note appended to end of Task 1 stating CRITICAL #2 is only half-closed here; plaintext-key half attributed to Plan 3 / UX-AUDIT U5, not silently dropped. Self-review notes updated to say "half-closed" instead of "closed." | `www_v2/src/ui/features/settings/index.ts:627` `isSecret = f.key.endsWith('api_key')`; `:634` `<input type="text" ...>`; `grep "type='password'" www_v2/src/` → 0 hits. |
| A3 | Migration transactional design broken: no journal (0 hits), no corrupt-store test (0 hits), backup written to a store no downgraded build can read; `run_migration` was sync calling `Store.async_save` without `await`; restore used `async_load() or {}` + `.get()` without await; restore left `_migration.complete=True` while options were pre-migration (the forbidden neither-old-nor-new state). | Task 2 Step 3 fully rewritten: `run_migration`/`restore_last_backup` are now `async def` and every Store call is awaited; a `journal` list is appended to the backup on every attempt; `restore_last_backup` does a **wholesale replace** via `hass.config_entries.async_update_entry` (not `merge_entry_options`), which also clears the `_migration` marker, eliminating the neither-old-nor-new state; a corrupt-store test (`test_restore_with_corrupt_backup_store_is_safe`) added; Step 3b registers an admin `restore_migration_backup` HA service; the downgrade caveat (backup store is new-this-release, only same-or-newer-build readable) is stated explicitly rather than assumed. | `ha_rest_api.py:104` `await store.async_load()`; `boiler/actuator.py:340` `await self._store.async_save(state)` (most — not all — Store I/O in this repo is awaited: `boiler/runtime.py:1723` `self.hass.async_create_task(store.async_save(payload))` is fire-and-forget, so `run_migration`/`restore_last_backup` await their own Store calls explicitly rather than relying on a repo-wide invariant — corrected 2026-07-17, R2); `rg migration_backup --include='*.py'` → 0 hits pre-Plan-4 (confirms the store name is new); `services/__init__.py:1124-1145 (register loop + call at :1142)` (existing service-registration pattern followed for Step 3b); `journal`/`corrupt` greps in `tests/` → 0 relevant hits pre-revision (confirms the gaps were real). |
| A4 | Dead-key deletion unreachable: draft's Task 5 planned to strip dead keys via a `register_transform` feeding `merge_entry_options`, which only `.update()`s and "NEVER replaces" — so the strip would never actually delete anything. | Task 5 Step 3 rewritten with a dedicated `strip_dead_keys` function using `options.pop(...)` + a direct `hass.config_entries.async_update_entry(...)` call, matching the repo's existing deletion pattern, invoked separately from `run_migration`'s merge-based transforms. | `config_merge.py:4-5` docstring "NEVER replaces"; `:26` `new_options.update(updates)`; real deletions at `__init__.py:169-185` (`_purge_obsolete_planner_options`, `options.pop`), `:870-874` (`enable_spot_prices` pop + direct `async_update_entry`), `:2018-2020` (`_needs_reload` pop + direct `async_update_entry`) — all bypass `merge_entry_options`. |
| A5 | P6 scope gap: `tariff_weekend_same_as_weekday`, `import_yaml`, `enable_auto`, `config/schema.py` are live but get 0 mentions despite the scope map claiming P6 coverage. | Task 5 gets an explicit "P6 scope gap" note naming all four items as live and out of scope; the Scope-area coverage map row is corrected from unqualified "P6" to "P6 — partial" with the four items named; Self-review gap bullet updated to match. **Deferred** — not covered by this plan; a full re-audit of these four surfaces is out of Task 5's per-key table and would need its own pass. | `config/steps.py:248,335,702,712,2231,2232,2279,2301,2343` (`tariff_weekend_same_as_weekday`); `:3134,3320` (`import_yaml`/`async_step_import_yaml`); `const.py:77` `CONF_ENABLE_AUTO = "enable_auto"`, `steps.py:620,1119`; `config/schema.py` exists (`find config -maxdepth 1 -name schema.py`). |
| A6 | Test list under-covers: Task 8 named only `tests/test_config_registry.py`, but `tests/test_boiler_f4b_attribution.py:714-742` also imports `_MODULE_CONFIG_FIELDS`/`_coerce_module_value` and is absent from Step-4's run list → Task 10's full-suite run reddens. | `tests/test_boiler_f4b_attribution.py` added to Task 8's Precondition, Files/Test list, Step 3 (rewrite its two boundary tests off the legacy helpers), and Step 4's run command. | `tests/test_boiler_f4b_attribution.py:714,716,733,735` — `from ...ha_rest_api import OIGCloudModuleConfigView, _coerce_module_value, _MODULE_CONFIG_FIELDS` (two call sites, confirmed by `grep -n`). |
| A7 | Interval deprecation hard-errors every save: Task 3:318 wired deprecation into `_validate_interval_values`, whose keys (`standard`/`extended`/`proxy_stale`/`debounce_ms`) are always-present internal aliases, not legacy stored spellings → post-window, every canonical interval save would hard-error. | Task 3 rewritten: the interval-alias half is **dropped entirely** from this task's deprecation scope (explained inline — there is no legacy stored spelling to migrate, since `entry.options` only ever stores the canonical `*_scan_interval`/`local_proxy_stale_minutes`/`local_event_debounce_ms` names). Deprecation is wired **only** into `_migrate_legacy_planner_options` for the 7 planner legacy keys. A new regression test `test_canonical_only_options_never_trigger_deprecation` guards against re-introducing an always-fires hook. `_show_intervals_form` dropped from Task 3's Files list (was only there to surface the now-removed warning). | `config/steps.py:1397` `"standard": user_input.get("standard_scan_interval", 30)` (alias sourced from canonical input, unconditionally); `__init__.py:956` `entry.options.get("standard_scan_interval")` (only canonical name ever read from stored options) — zero hits for `options.get("standard")`/`"extended"`/`"proxy_stale"`/`"debounce_ms"` as stored-option reads anywhere in the tree. |
| B-a | `:803` "could not be confirmed" for `solar_forecast_sensor.py:548-575` is wrong. | Same fix as A1 (overlapping finding) — see A1 row. | See A1. |
| B-b | `:236` `suppress_reload=True` is a comment, not a kwarg — the call never actually passes it. | Task 2's rewritten `run_migration` now calls `merge_entry_options(hass, entry, updates, suppress_reload=True)` as a real keyword argument; the correction is called out inline in Task 2's revision note. | `config_merge.py:18-19` — `suppress_reload: bool = False` is a genuine third parameter of `merge_entry_options`; the prior draft's call site left it as a trailing `# comment` instead of passing it. |
| B-c | `:389` says cold-inlet is unwired, but it IS wired in 5+ `boiler/api_views.py` sites already. | Task 4's cold-inlet bullet rewritten: acknowledges `api_views.py` is already wired (no change needed there), and narrows the real gap to `classifier.py:180`'s `compute_ready_fraction` call, which falls back to its own separate hardcoded `_COLD_INLET_TEMP_C=10.0` (`classifier.py:52`). Task 4's Files list and Step 3 retargeted to `classifier.py:180` instead of a vague "the boiler classifier." | `boiler/api_views.py:36,569,990,1173,1216` (`CONF_BOILER_COLD_INLET_TEMP_C`/`DEFAULT_BOILER_COLD_INLET_TEMP_C` used at all 5 sites); `boiler/classifier.py:180` (`compute_ready_fraction(top_c=..., bottom_c=...)`, no `cold_inlet_c` passed); `:52` `_COLD_INLET_TEMP_C = 10.0`; `:231` default param. |
| B-d | `:137-145` `_get_planner_defaults` cite omits `CONF_AUTO_MODE_SWITCH` (:136) and `cheap_window_percentile` (:146). | Task 3's legacy-keys bullet and the Verification log both corrected: cite window widened to `__init__.py:133-146`/`:135-147`; the two omitted entries are named explicitly and confirmed to be canonical (registry-backed) keys, NOT legacy aliases, so they are correctly excluded from the deprecation-window list rather than added to it. | `__init__.py:136` `CONF_AUTO_MODE_SWITCH: False`; `:146` `"cheap_window_percentile": 30`; `cheap_window_percentile` also live at `config_registry.py:146`, `battery_forecast/balancing/core.py:143` (`self._config_entry.options.get("cheap_window_percentile", 30)`) — confirms it's a live registry field, not dead/legacy. |
| B-e | Finding #3 (OQ-5/OQ-6 contradiction leaking into Task 4 sensor-first pre-seed) closed by no task. | Task 4 gets an explicit precondition note: its pre-seed transform must NOT read/write `enable_statistics`/`enable_extended_sensors` until Plan 2 resolves OQ-5/OQ-6, extending the existing Tasks-5/8 precondition to Task 4 as well. Self-review's critique-disposition line updated to name Task 4 alongside Tasks 5/8. | `config_registry.py:126-127` (`enable_statistics`/`enable_extended_sensors` default **False**) vs. `steps.py:378/384` + `__init__.py:1596` (default **True**) — the pre-existing OQ-5/OQ-6 contradiction, unchanged by this revision, now explicitly fenced off from Task 4. |

### Deferred findings (explicit, not silent)

- **A5 (P6 scope gap):** `tariff_weekend_same_as_weekday`, `import_yaml`, `enable_auto`, `config/schema.py` are confirmed live and are **not** added to Task 5's dead-key removal — re-auditing whether any of them are dead is out of scope for this revision (it would require its own per-key grep pass equivalent to Task 5's table, and the brief for this revision scoped incorporation of the two critics' findings, not a new P6 sub-audit). The Scope-area coverage map and Task 5 both now say "partial" so this isn't mistaken for full P6 coverage.
- **A2 / CRITICAL #2 plaintext-key half:** explicitly Plan 3's responsibility (UX-AUDIT U5); Plan 4 does not touch `www_v2/src/ui/features/settings/index.ts` in any task, so it cannot be closed here without expanding this plan's file scope beyond what SCOPE-REVISION and the brief authorize.

---

## Residuals-addressed table (independent verifier round 2 — 2026-07-17)

An independent verifier (gpt-5.5) re-checked the f1-plan4-incorp revision above and found it did **not** hold (`rework=substantial`): most of the 12 critic findings were genuinely addressed, but 3 concrete residuals remained — each a "grep-verified" claim in the revision that contradicted the real tree. This section is the disposition for those 3 residuals only; the Findings-addressed table above (A1–A7, B-a–B-e) and its Deferred findings are unchanged and not reopened.

| Residual | How fixed (section/line) | Fresh grep evidence (file:line) |
|---|---|---|
| R1 — blanket "grep-verified" claim survives | The bullet "Every file:line cite in this revision was re-grep-verified..." (Self-review notes, was ~:1062 pre-fix) is **removed outright**, not reworded — a second "Second revision note" explains why a blanket claim is retracted rather than repeated: it was demonstrably false (see R2/R3 below), and a sometimes-false "verified" claim is worse than none. Verification is now stated only inline, per cite, at its point of use (Verification log, Findings-addressed table, this table). | `rg -n 'grep-verified\|re-grep-verified\|Every file:line'` on the edited doc: the only remaining hits (Self-review notes, ~:1056/:1063) are the note quoting/naming the retracted claim as history, and the Task 5 table's column header `Status (grep-verified)` — neither is an active blanket-verification assertion. |
| R2 — false "repo always awaits Store I/O" premise | Corrected in 3 places: the `test_config_migration.py` module docstring (Task 2 Step 1), the Step-3 "Corrected in this revision" note point 1 (Task 2), and the A3 row's grep-evidence column (Findings-addressed table). All three now state that *most, not all*, Store I/O in this repo is awaited, name the counterexample, and make clear `run_migration`/`restore_last_backup` await their own Store calls explicitly as a deliberate choice for this specific write (a migration backup that can silently vanish defeats Task 2's purpose) — not because "the repo always does it that way." | `custom_components/oig_cloud/boiler/runtime.py:1723` — `self.hass.async_create_task(store.async_save(payload))`, fire-and-forget, confirms the counterexample. Awaited sites the doc already cited remain correct: `custom_components/oig_cloud/api/ha_rest_api.py:104` `await store.async_load()`; `custom_components/oig_cloud/boiler/actuator.py:340` `await self._store.async_save(state)`. |
| R3 — Task 5 dead-key table's false "legacy-only / dead" status for 4 keys | The table row for `min_capacity_percent` / `target_capacity_percent` / `home_charge_rate` / `max_ups_price_czk` (Task 5) is rewritten: status corrected from "legacy bridges" to "LIVE" with the full reader list, and the action changed from "remove the legacy half of the dual-write" to "DO NOT remove" until every live reader is repointed at the canonical key — with the repoint work named as **not currently covered by any task in this plan** and deferred here rather than silently assumed done. Task 3's parallel "write+display-only" claim for the same two of these four keys (`target_capacity_percent`, `max_ups_price_czk`) is also corrected, since it drew on the same false grep status and pointed back to this table. | `custom_components/oig_cloud/battery_forecast/data/battery_state.py:156` `sensor._config_entry.options.get("min_capacity_percent")`; `:182` `options.get("target_capacity_percent")`; `:236` `config.get("home_charge_rate", 2.8)`; `custom_components/oig_cloud/battery_forecast/planning/forecast_update.py:902` `float(opts.get("home_charge_rate", 2.8))`; `custom_components/oig_cloud/battery_forecast/presentation/detail_tabs_blocks.py:545` `float(opts.get("max_ups_price_czk", 10.0))`; `custom_components/oig_cloud/config/steps.py:804-806` (wizard reads of the same four names). All re-grepped directly in this worktree, 2026-07-17. |

**Deferred by this pass (named, not silent):** fixing R3 exposed that Task 5's original plan to stop dual-writing these 4 legacy key names has no companion task to repoint `battery_state.py:156/182/236`, `forecast_update.py:902`, and `detail_tabs_blocks.py:545` at the canonical key first. That repoint is real, non-trivial work (new dual-read-with-fallback logic in the battery-forecast module, plus tests) and is out of scope for this residuals-only pass, which is limited to correcting the 3 false claims themselves. It should become an explicit task (or an addition to Task 5) before Task 5's dual-write removal ships.
