# F1 Plan 3 — GATE STATUS

**Verdict: HUMAN-NEEDED** (gate is green; a scope decision is required before deploy — see §Decision)
**Branch:** `codex/f1-plan3-impl`  **Tip:** `6b687786c`  **Date:** 2026-07-17
**Do NOT deploy to HA. No merge to main. No PR.** (per brief)

---

## 1. What landed — all Plan 3 tasks committed

| Task | What | Model | Score | Commit |
|---|---|---|---|---|
| T8 | Config-flow AI step (provider/base_url/model co-equal, key→.storage) | minimax | PARTIAL¹ | `355305316` |
| T9 | OigAiTaskEntity (guarded) + hacs.json min-HA — **harness bump DEFERRED** | zai | PARTIAL² | `31a0a489d` |
| T10 | Admin-gated `/ai` REST (state + verify_key), key never echoed | minimax | GREEN | `e4b7e3295` |
| T11 | Onboarding versioned state + admin-gated REST (soft, no gate) | zai | GREEN | `14ffe2f81` |
| T12 | Onboarding wizard shell + step ① AI (verbatim guides) | minimax | PARTIAL³ | `8345a7180` |
| T13 | Onboarding steps ② solar + ③ pricing (registry-driven) | zai | GREEN | `cded22ffc` |
| T14 | Soft banner + Settings launcher (dashboard always renders) | minimax | GREEN⁴ | `99d5a0a6c` |
| — | **Review fix:** admin gate reads `request['hass_user']` not `request.app` | (integrator) | — | `6b687786c` |

¹ 1-line integrator fix to a fenced section-tuple test. ² Harness bump deferred (see §3). ³ 2 tsc integrator fixes.
⁴ zai's first attempt ABANDONed (rate-limited mid-run); re-dispatched to minimax, clean.

## 2. Gate — GREEN

- **Backend:** `flake8 --max-line-length=120` (whole tree) clean · `mypy` (ai, onboarding, config_registry,
  solar_rules, ha_rest_api) clean · **pytest `4335 passed, 28 skipped, 0 failed`**.
- **Frontend (www_v2):** `typecheck` clean · `lint` 0 errors (369 pre-existing `no-explicit-any` warnings) ·
  `test:unit` **58 files / 1455 tests passed** · `build` OK.
- **Base-vs-change failing set:** base `b0ebf983b` (turn start) = `4309 passed, 0 failed` → change = `4335 passed,
  0 failed`. Failing set ∅ → ∅ (+26 new tests). Harness unchanged (T9 bump deferred), so no harness-induced noise.

## 3. AI-key security (verified — review PASS + fixed this turn)

Provider key lives ONLY in `.storage` (`AiKeyStore`), never in `entry.options`, never a registry field
(`steps.py async_step_ai` pops `ai_api_key`; `OIGCloudAiView.post` writes via store) · never logged in clear
(`redact_key`) · `GET /ai` returns only `{provider,key_set,verified}` · POST prefix-checks locally before any
network call · `/ai` + `/onboarding` **admin-gated & fail-closed** (was broken → **fixed in `6b687786c`**).

## 4. Verified review findings NOT fixed (why the verdict is HUMAN-NEEDED)

The review (`review-critique/REVIEW.md`, minimax, security-tagged) found — and I verified — that the AI feature
and onboarding wizard are **built and unit-tested but not wired end-to-end**. The green tests exercise the
components with dummy harnesses that mask the integration gaps:

1. **AI entity never instantiated.** `ai_task.py` defines `OigAiTaskEntity` but there is no platform
   `async_setup_entry`; `_provider`/`_backend` are never set. Tied to the **deliberately deferred** T9 harness
   bump (the box venv `/repos/oig-cloud/.venv` is SHARED — bumping HA there is box-wide; and a 7-minor HA jump
   risks the 261-file suite). The live AI path cannot run on the current test HA (2025.1.4, no `ai_task`) anyway.
2. **Host-AI delegation payload UNVERIFIED.** `_async_delegate_to_host_ai_task` is a best-effort guess (flagged
   as such in-code) — the real `ai_task` service API can't be read without an `ai_task`-capable HA.
3. **Prompt anonymity not enforced at the outgoing boundary.** `build_anonymous_prompt` (allow-list, T7) exists
   but the entity would pass raw `task.instructions` to the backend. **MUST be fixed before any AI call is
   enabled** — otherwise the "prompty anonymní" guarantee (SCOPE-REVISION #5) is not held in production.
4. **Onboarding wizard not mounted.** The banner CTA and Settings launcher dispatch a stub `launch-onboarding`
   event; nothing mounts the wizard. `STEP_SOLAR`/`STEP_PRICING` have no production consumer. (T12–14 were
   scoped as unit-tested components, not E2E wiring.)
5. **Grandfathering not populated.** `is_grandfathered` is tested but never called to set a `grandfathered`
   flag on the persisted state, so the banner's no-banner-for-existing-users branch can't trigger; per-step
   `skipped` status isn't wired end-to-end either.

None of these is a failing test or a hard dashboard gate (the dashboard always renders — T14 verified). They are
completeness/wiring gaps.

## 5. Providers avoided / notes

- **codex/spark** — sub-quota exhausted; killed the first T9 dispatch (rc1, "usage limit for Codex-Spark").
  `fleet-pick` is blind to spark's sub-quota and routed there anyway; I pinned providers explicitly after.
- **kimi** (<15%), **zai** after ~19:00 (hit 5-hour rate limit mid-T14 → that attempt ABANDONed, redispatched).
- Workers: minimax (T8,T10,T12,T14,review) + zai (T9,T11,T13). Integrator: claude-second (near its limit).

---

## Decision for Martin (per CLAUDE.md format)

**1. Kontext.** Plan 3 T8–T14 are all committed and the full gate is green (BE 4335 pass / FE 1455 pass / build
OK), and a real production bug the tests missed (admin gate 403-ing real admins on `/ai` + `/onboarding`) was
found by review and fixed (`6b687786c`). But the review (verified) shows the two headline features — OIG's own AI
backend and the soft onboarding wizard — are unit-tested components that are **not wired end-to-end**: the
`AITaskEntity` is never instantiated (T9 harness bump deferred — shared venv), the wizard launcher is a stub, and
grandfathering + prompt-anonymity aren't enforced at their boundaries (§4).

**2. What must be decided, and why it isn't mine.** Whether Plan 3 ships now as a *foundation increment*
(components landed; wiring is a follow-up / Plan 4) or must be *wired end-to-end before deploy*. This is a
product/scope call: the plan itself deferred the harness bump and lists these as adjacent work, and neither code
nor spec settles whether "Plan 3 done" means "components landed" or "feature live." The shared-venv constraint
also means the harness bump genuinely needs an isolated environment I should not create on this box unilaterally.

**3. Dopady.**
- **Ship as increment (recommended):** T1–T5 (registry-driven forms, conditional visibility, solar validator,
  readable dropdowns, masked secrets) are genuinely live and tested — real user value now. AI + onboarding land
  as inert, tested scaffolding. Risk: a banner + launcher + AI config step that don't yet *do* anything visible;
  **must gate/hide the un-wired UI and must land the prompt-anonymity boundary fix before enabling any AI call.**
- **Wire end-to-end first:** needs an isolated `ai_task`-capable HA venv (T9 bump), entity `async_setup_entry`,
  wizard mounting/routing, grandfathering population, anonymity moved into the backend boundary. Review rates the
  rework **substantial**; the harness bump risks the suite and needs a dedicated environment.

**4. Recommendation.** **Do not deploy yet.** Land this branch as a reviewed green foundation increment, but
(a) hide/flag the onboarding banner+launcher and the AI config step until a follow-up wires them, and (b) require
the prompt-anonymity boundary fix before any AI path is enabled. Open a focused follow-up (Plan 3.5 or fold into
Plan 4) for: T9 harness bump in an isolated venv + entity `async_setup_entry`, wizard mounting, grandfathering,
and the anonymity boundary. I did not do these here because they exceed "verify the gate" — they are the
scope decision above plus work needing an environment I shouldn't provision unilaterally, and my integrator quota
(claude-second) was nearly exhausted.

**Next fresh launch:** the branch is idempotent — `git log 6b13ac4fc..HEAD` shows T1–T14 + the review fix all
committed and pushed. A continuation would start from Martin's decision above, not by re-doing any task.
