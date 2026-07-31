# F1 Plan 3.6 — onboarding wizard completion: lineage & status

**Plan of record: v2.** Verified SOUND (orchestrator-verified against the real tree, 2026-07-22).

## Lineage
- **v1** — `plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion.md` — authored by fleet **spark** (GPT-5.3). Verdict after review: **UNSOUND** — missed the `IMPLEMENTATION-BRIEF-EN.md` R7–R10 binding `/solar_test` contract; structural gaps (no solar-value persistence, non-atomic Finish, client swallows classified errors, pricing type mismatch, phantom field names).
- **Critique A** — `critique/REPORT-plan3.6-A-claude3.md` — **claude-3** (Sonnet). UNSOUND.
- **Critique B** — `critique/REPORT-plan3.6-B-minimax.md` — **minimax**. UNSOUND, reached independently.
- **v2** — `plans/2026-07-22-f1-plan3.6-onboarding-wizard-completion-v2.md` — authored by **claude-3**, incorporating both critiques + the human decisions below. **This is the plan of record.** 16 verified findings → 12 TDD tasks, each grounded in real symbols + a falsifier.

Both critiques' central thesis (v1 omitted the binding `/solar_test` rules — 10 s shared-session cap, `(entry_id, provider)` rate-limit + 4-cap, R7.3 secret redaction) was orchestrator-verified against `IMPLEMENTATION-BRIEF-EN.md:196-197,162` and `PLAN-3.6-SPEC.md:135`. The critiques cited a `SCOPE-REVISION.md:<line>` filename that does not exist under `docs/`; the binding content is real and lives in `IMPLEMENTATION-BRIEF-EN.md` (its English restatement).

## Human decisions baked into v2
- **Q1** — `/solar_test` wire schema: registry key names verbatim (`solar_forecast_string{1,2}_{kwp,declination,azimuth}`, `solar_forecast_latitude`/`_longitude`, provider credential); supports 0/1/2 active strings; no wire rename.
- **Q2** — step-2 status: `solar` is `done` only after a successful `/solar_test`; otherwise it stays `pending` (navigation still proceeds — OQ-B); Finish never promotes `pending`.
- **OQ-A = YES** (Finish persists even for grandfathered), **OQ-B = NO** (test never blocks navigation).

## Open questions still for human (carried from v2)
1. **AK-2 spec-text correction** — `PLAN-3.6-SPEC.md` names non-existent fields (`solar_panel_power_kwp`/`_tilt`/`_azimuth`); correct in the spec's own change.
2. **Task 11 dashboard interaction while wizard open** — occlusion (v2 default) vs click-through (new UX scope).
3. **Pre-existing raw URLs** in `translations/{cs,en}.json` — follow-up ticket, not a 3.6 defect.

Base: `codex/f1-plan3-impl` @ `8aaef5702`.
