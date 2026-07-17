# F1 Plan 3 + Plan 3.5 — GATE STATUS

**Verdict: DEPLOY** (Plan 3 components landed AND wired end-to-end; full gate green; prompt-anonymity
enforced at the outgoing boundary; security review CLEAN — one residual is live-box-only, see §6)
**Branch:** `codex/f1-plan3-impl`  **Tip:** `69808ded2` (== `origin/codex/f1-plan3-impl`, pushed)
**Date:** 2026-07-17
**Do NOT deploy from this session.** This verdict authorizes Martin to deploy to the live box; the
integrator here does not push to HA, does not merge to main, opens no PR.

---

## 1. What Plan 3.5 wired — the five end-to-end gaps, all closed

The pre-3.5 gate (tip `6b687786c`) was green but HUMAN-NEEDED: the AI backend + onboarding were
unit-tested **scaffolding, not wired**. Martin decided (2026-07-17): wire it all end-to-end before
deploy. All five wiring items are now committed on top of `20ab3f27a`:

| # | Wiring item | Model | Commit | Verified |
|---|---|---|---|---|
| 1 | **Prompt-anonymity OUTGOING boundary** (safety gate) — allow-list at the emitting boundary; raw-text `instructions` param removed from the backend signature | claude | `ec1432d83` | test asserts serialized POST body carries **no** GPS/box_id/email/entity_id; allow-listed `15.36` survives |
| 2+3 | **AITaskEntity `async_setup_entry`** (real `Platform.AI_TASK` forward) + **pinned host-AI delegation payload** | opus | `69808ded2` | mock-tested in current venv (`sys.modules` shim fakes only the HA base class; routing/gating/backend-construction is real production code) |
| 4 | **Onboarding wizard mounted** as a real production consumer — `<oig-onboarding-wizard>` rendered/routed, replacing the stub `launch-onboarding` re-dispatch | minimax | `4ebe1ab6e` | vitest + tsc |
| 5 | **Grandfathering populated** — `is_grandfathered` sets the persisted `grandfathered` flag; per-step `skipped` status wired end-to-end | opus | `ca21d8767` | real flow tested; skip persists across a second `Store` instance |

All four workers delivered clean (`rc=0 cause=delivered`); the integrator (this session) reviewed each
frozen bundle, ran the gate, and is the only committer. Workers committed nothing.

## 2. Gate — GREEN (base `20ab3f27a` → change `69808ded2`)

- **Backend pytest:** `4354 passed, 28 skipped, 0 failed` (baseline `4335 passed, 28 skipped, 0 failed`
  → **+19 new tests, failing set ∅ → ∅**).
- **flake8** `--max-line-length=120` (whole `custom_components/oig_cloud` tree): clean.
- **mypy** (changed source: `ai/backends.py`, `ai_task.py`, `api/ha_rest_api.py`, `onboarding/state.py`):
  **no new failures.** Residual errors are all pre-existing/environmental — `paho.mqtt` + `opentelemetry`
  missing stubs (unrelated files), the `homeassistant.components.ai_task` import (HA 2025.1.4 harness has
  no `ai_task`, expected), and one `_backend` union-attr that exists **identically at base**
  (`ai_task.py` base line 52 == change line 95 — same call, not introduced by 3.5).
- **Frontend (`custom_components/oig_cloud/www_v2`):** `tsc --noEmit` clean · `vitest` **60 files /
  1465 tests passed** (baseline 1455 → +10) · `eslint` **0 errors** (377 pre-existing `no-explicit-any`
  warnings).

## 3. Prompt-anonymity (SCOPE-REVISION #5) — enforced at the boundary, verified

The safety gate is a genuine **allow-list at the emitting boundary**, not a denylist. `async_generate_data`
(`ai/backends.py`) no longer accepts a raw-text `instructions` parameter — there is structurally no channel
for free text. Outgoing content is built inside the boundary by `build_anonymous_prompt` (keeps only
`PROMPT_ALLOWED_FIELDS`, drops everything else). The sole caller (`ai_task.py:95`) passes a literal install
label + an allow-listed install mapping + `task.structure` (schema); `task.instructions` appears only in a
comment. **Proof one-liner:** `tests/test_ai_anonymity.py` drives the live generate path with a
GPS/box_id/email/entity_id fixture and asserts on `json.dumps(kw["json"])` (the real serialized POST body)
that every PII literal is absent while the allow-listed `15.36` survives.

## 4. AI-key + admin gates — CLEAN (unchanged by 3.5, re-verified)

Key lives only in the private `Store` (`key_store.py`); logs emit only `redact_key` fingerprints; REST
returns only `{provider,key_set,verified}`; the key flows solely into the `Authorization: Bearer` header,
never the prompt/body/response. `OIGCloudAiView` + `OIGCloudOnboardingView` call `_require_admin` as the
first line of `get`/`post` (reads real `request["hass_user"]`, fail-closed 403); the new skip/grandfathered
paths sit behind that same gate.

## 5. Security review — CLEAN, rework=none

`review-plan-3-5-security-wiring-reality-10bc89` (opus, security-tagged, reviewed the frozen bundle of
`20ab3f27a..69808ded2`, anonymity-boundary focus) returned:
`{"grounded":true,"in_scope":true,"honest":true,"complete":true,"rework":"none"}`.
Verdict text: *"No anonymity leak, no key exposure, no admin hole. Diff is mergeable as it stands."*
The wiring is confirmed **real, not a dummy-harness mask**: `Platform.AI_TASK` is a true platform entry
point, the wizard is genuinely mounted, skip genuinely persists.

## 6. What still needs live-box validation (deploy-verify, not a gate blocker)

The shared test venv is HA 2025.1.4, which has **no `ai_task` module** and MUST NOT be bumped (box-wide
risk) — so the wiring is mock-tested here and the **real `ai_task` platform path is validated on Martin's
live box (HA 2026.7.2) at deploy-verify.** Two honest, non-security residuals from the review to check on
the live box:
1. `install={}` is passed unconditionally today, so prompts currently carry **no** installation numbers — a
   documented functionality seam. Empty ≠ leaky: safe, not a security gap.
2. Actual `Platform.AI_TASK` registration + the `_async_delegate_to_host_ai_task` call shape can only be
   confirmed against an `ai_task`-capable HA. Pinned to the documented `ai_task.generate_data` contract with
   a mock; confirm on the live box.

## 7. Providers / notes

- Plan 3.5 workers: claude (item 1), opus (items 2+3, item 5), minimax (item 4), opus (security review).
  All delivered `rc=0`. Integrator: this session (claude, orchestrator role).
- Isolated venv was **not** created and `/repos/oig-cloud/.venv` was **not** bumped — per the brief's
  box-wide-risk fence; the live path is validated at deploy-verify instead.
