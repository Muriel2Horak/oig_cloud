# REPORT — f1-fixwave-int (F1 audit-fix wave integration)

Branch: `f1/audit-fix-wave` off `f1-plan3.6-impl` @ `c14424c6e`.
Worktree: `/repos/wt-f1-fixwave-int`. All 4 units merged `--no-ff`, gates green, pushed.

## Units integrated (each already reviewed, verdict `rework=none`)

Merge order 1,3,2,4 (backend-overlap pair 1+3 adjacent).

1. `f1/o3-eru-dataset-r2` (70c61155e) — rebuilt `pricelists.json` from real ERU 14/2025 XLSX;
   extended `scripts/build_pricelists.py`, added `scripts/data_sources/` (README + ceny-nn26-1.xlsx),
   `tests/test_build_pricelists.py`. Review: `rework=none`.
2. `f1/d11-grandfather-banner` (040e71760) — review banner for grandfathered users; onboarding
   `state.py` (`async_dismiss_banner`), `ha_rest_api.py` (`dismiss_banner` action), `app.ts`, banner.ts,
   onboarding-data.ts, i18n, `onboarding-soft-gate.test.ts` + skip test. Review: `rework=none`.
3. `f1/review-nits-r2` (56ae59bfe) — stale-year derived from snapshot `valid_from`
   (`_snapshot_valid_from_date`) + future-snapshot filter in `config_registry._pick_latest_snapshot`;
   `ha_rest_api.py` view uses it; tests. Review: `rework=none`.
4. `f1/o2-disclosure` (a95539853) — per-provider AI data-use disclosure in AI onboarding step;
   `step-ai.ts`, onboarding `index.ts`, i18n cs+en, `onboarding-step-ai.test.ts`. Review: `rework=none`.

## Drift check

Cumulative `git diff --stat f1-plan3.6-impl` = exactly the union of the 4 units' owned files
(20 files, +1886/-114). NO deletion I did not make; NO foreign file. No drift.

## Conflicts / resolutions

- `www_v2/src/i18n/onboarding.ts` — CONFLICT on merge of unit4 (add/add at same anchor: both unit2
  banner strings and unit4 disclosure strings inserted right after `onboarding.finish.error.generic`
  in the cs and en blocks). Resolved KEEPING BOTH blocks in each language section (pure additions,
  no key collision). Verified by tsc (clean) + vitest (green).
- `custom_components/oig_cloud/api/ha_rest_api.py` — unit2 and unit3 both touch this file but in
  far-apart regions (unit3: import + `OIGCloudPricelistsView` ~L1392; unit2: `OIGCloudOnboardingView`
  ~L1793/1860). Auto-merged by `ort`, no conflict. Both intents present.
- Semantic overlap units 1+3 (pricelist dataset vs snapshot selection): different files, no textual
  conflict. Re-ran both backend test files together to prove clean (see gate a2).

## Integration change beyond merges

- `tests/test_build_pricelists.py:218` — added 1 blank line to fix flake8 **E306** (nested `_walk`
  def had a comment but no blank line above). This was the ONLY new flake8 finding the wave
  introduced; committed as `02e83d783`. Behaviour unchanged (test still passes).

## Gates (all GREEN)

a) Backend — `/repos/oig-cloud/.ha-env/bin/python -m pytest -q` (full suite, from worktree root):
   **4464 passed, 28 skipped, 0 failed, 0 errors** (61.80s). The 6 old `test_build_pricelists.py`
   failures are GONE (real ERU dataset now bundled). Warnings present are benign
   `PytestUnraisableExceptionWarning` (mqtt_publisher event-loop-closed on teardown), not failures.

a2) Overlap pair rerun — `pytest -q tests/test_build_pricelists.py tests/test_config_registry.py`:
   **49 passed, 0 failed** (3.18s). Units 1+3 clean together.

b) Frontend — `custom_components/oig_cloud/www_v2`:
   - `tsc --noEmit`: exit 0, clean.
   - `vitest run`: **66 files, 1535 tests passed, 0 failed**.
   NOTE: fresh worktree had no `node_modules`; `npm ci` installed the pinned toolchain
   (typescript 5.9.3 satisfying `^5.3.0`, vitest 1.x). Without it, bare `npx tsc` resolved
   TypeScript **7.0.2** (a major that removed `baseUrl`) and emitted two SPURIOUS `tsconfig.json`
   errors (TS5102/TS5090) unrelated to the wave — `tsconfig.json` is unchanged by all 4 units. The
   real pinned-toolchain run is clean.

c) flake8 — `flake8 --max-line-length=120` over the 8 changed `.py` files (via `.ha-env` python `-m`):
   after the E306 fix, the ONLY remaining findings are **7 pre-existing F811** in
   `tests/test_ha_rest_api_views.py` (redefinition of test functions). Confirmed BYTE-IDENTICAL on
   the base tip `f1-plan3.6-impl` (same node names, same line numbers) — pre-existing base debt, NOT
   introduced by this wave. Zero NEW flake8 findings from the wave.

## Flagged for the human (not fixed — out of scope for this wave)

1. `tests/test_ha_rest_api_views.py` carries 7 pre-existing **F811** duplicate-test-name
   redefinitions on `f1-plan3.6-impl` base. Earlier same-named tests are shadowed (only the later
   definition runs). Worth a follow-up cleanup, but it predates this wave — I did NOT touch it, to
   avoid modifying a file beyond the units' scope.
2. Per the standing REVIEW rule, integration edits (the i18n conflict resolution + the 1-line E306
   fix) were made by this integrate slice, not separately reviewed by a different model. Both are
   mechanical (additive concatenation of two already-reviewed blocks; a whitespace-only lint fix) and
   are fully covered by the green tsc+vitest+pytest gates. Flagging for visibility; a belt-and-suspenders
   review can be dispatched if desired.

## Integration branch tip

`f1/audit-fix-wave` @ `02e83d783` (before this REPORT commit).
Pushed to `origin/f1/audit-fix-wave`. NOT merged to `f1-plan3.6-impl` or `main`. NOT deployed.
