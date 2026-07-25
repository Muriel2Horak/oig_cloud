# F1 Wizard v2 (Phase B) — bite-sized TDD implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement task-by-task. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** replace the FE dashboard's 3-step onboarding overlay (`www_v2/src/ui/features/onboarding/`)
with the 10-step wizard v2 designed in `docs/redesign_2026_07/rework/UX-SPEC-wizard-v2.md` (round 2,
owner-approved): welcome → modules → AI → solar → pricing-distribution → pricing-supplier →
battery → boiler → connection → summary, grouped into Phase A ("nastavuje se jednou") and Phase B
("mění se v čase"), with a review-mode diff experience (per-field "Bylo → Nyní" hints, a step-9 diff
table, single final save) for existing installs.

**⚠️ Dependency — Phase A must land first.** This plan is written and file/line-verified against
branch `f1/rework-rca-spec-r2` (tip `9a57f7a9c`), which is **identical** to `f1/rework-impl`
(Phase A's integration branch — 0 commits ahead as of this writing; Phase A has not started). Every
task below builds on Phase A shipping the **RCA fixes**:

- **RCA-R1** (`docs/redesign_2026_07/rework/RCA-R1.md`): 7 missing `CS_LABELS` entries
  (`www_v2/src/i18n/fields.ts`) — 5 `confirmed_distribution_*` + 2 `balancing_*`.
- **RCA-R2** (`RCA-R2.md`): `config/steps.py:3404-3408` seeding-exception fix — existing options
  seed into the wizard instead of silently reverting to defaults.
- **RCA-R3** (`RCA-R3.md`), **proper fix**: `config_registry.py`'s `pricing` section (currently
  lines 402-442, 5 `confirmed_distribution_*` fields only — verified against the current tree, no
  `pricing_supplier` section exists yet) split into `pricing_distribution` (the existing 5,
  possibly renamed) + a new `pricing_supplier` section carrying the 24 keys UX-SPEC r2 §4
  specifies (19 legacy + 5 new `_nt` variants), with `show_if` gating per scenario selector — this
  is the registry shape §4/§4a require the wizard to render.
- **RCA-R4** (`RCA-R4.md`): `config/steps.py:1687-1688` Prague-fallback (`50.0/14.0`) removed —
  `None` when unset, so the FE never has to distinguish "actually Prague" from "unset".

**Risk flag:** if Phase A ships only the RCA docs' **minimal** fixes (R3 minimal = 19 keys bolted
onto the existing flat `pricing` section, no `pricing_distribution`/`pricing_supplier` split), Tasks
14–17 below (which assume the split + the 5 new `_nt` keys) must be re-scoped by whoever executes
them — re-verify `config_registry.py`'s actual section names/keys against the landed tree before
starting Stage S3. All file/line references in Stages S1–S2 (wizard shell, review-mode plumbing) are
verified against the **current** tree and are independent of which R3 fix variant lands, since they
don't touch pricing field content.

**Design decisions made by this plan (not stated by the spec, needed to keep tasks unambiguous):**

1. **Backend `ONBOARDING_STEPS`** (`custom_components/oig_cloud/onboarding/state.py:33`, currently
   `("ai", "solar", "pricing")`) expands to the **8 content steps** — `modules`, `ai`, `solar`,
   `pricing_distribution`, `pricing_supplier`, `battery`, `boiler`, `connection`. **`welcome`
   (step 0) and `summary` (step 9) do NOT get an independent pending/done/skipped status** — they
   are always-rendered navigation endpoints, never gated by an `enable_*` flag, never individually
   skippable (Přeskočit on welcome/summary makes no sense — there is nothing to skip). This keeps
   `OnboardingState.steps`/`timestamps` meaningful (one entry per thing that can actually be
   pending/done/skipped) instead of carrying two permanently-inapplicable keys.
2. **GPS "Převzít z Home Assistanta"** reads `this.hass.config.latitude`/`.longitude` **client-side**
   — the standard HA frontend `hass` object shape, the same object already threaded into the wizard
   as `@property({attribute: false}) hass` (`index.ts:418`, already used by `resolveLang(this.hass)`
   at `i18n/boiler.ts:3-6`). No new REST endpoint: this is the FE-side equivalent of the backend's
   existing `self.hass.config.latitude` read at `steps.py:1687`, not a new data source.
3. **Review-mode detection**: `isReviewMode = onboardingState.grandfathered === true` — reuses the
   existing backend-computed flag (`onboarding/state.py:64-82`, `is_grandfathered`) rather than
   inventing a second "has existing options" check in the FE.

## Tech stack / verify commands

- **Backend:** Python 3.12, HA custom integration, `.venv/bin/python -m pytest`,
  `.venv/bin/flake8 --max-line-length=120`, `.venv/bin/mypy --ignore-missing-imports
  --explicit-package-bases`.
- **Frontend:** TypeScript + Lit, vitest (`custom_components/oig_cloud/www_v2`, config
  `vitest.config.ts` — includes `src/__tests__/**/*.test.ts`). Run from that directory:
  `cd custom_components/oig_cloud/www_v2 && npx vitest run <path>`.
- **i18n/hassfest gate:** `scripts/run_hassfest.sh` (already exists — Task 12 of the 2026-07-22
  plan wired it in; reuse, don't reinvent).
- **Spec:** `docs/redesign_2026_07/rework/UX-SPEC-wizard-v2.md` (round 2) + RCA-R1..R4. Format
  reference: `docs/redesign_2026_07/plans/2026-07-10-f1-plan1-registry-merge.md`.

**Worklog convention:** commit after every task; trailer identifies the implementing agent per
this repo's own convention (see recent commits on `f1/rework-impl`/`f1-plan3.6-impl` for examples).

---

## Stage S1 — Wizard shell (10 steps, phase labels, nav/status)

### Task 1: Expand the step-id vocabulary (backend + FE mirror)

**Files:**
- Modify: `custom_components/oig_cloud/onboarding/state.py:33` (`ONBOARDING_STEPS`)
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/onboarding-data.ts:33`
  (`OnboardingStepId` type), `:80` (`ONBOARDING_STEPS` const), `:83-90` (`EMPTY_ONBOARDING_STATE`)
- Test: `tests/test_onboarding_state.py` (append), `www_v2/src/__tests__/onboarding-steps.test.ts`
  (append)

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_onboarding_state.py — append
def test_onboarding_steps_cover_wizard_v2_content_steps():
    from custom_components.oig_cloud.onboarding.state import ONBOARDING_STEPS
    assert ONBOARDING_STEPS == (
        "modules", "ai", "solar", "pricing_distribution", "pricing_supplier",
        "battery", "boiler", "connection",
    )
```

```typescript
// www_v2/src/__tests__/onboarding-steps.test.ts — append
import { ONBOARDING_STEPS, EMPTY_ONBOARDING_STATE } from '@/ui/features/onboarding/onboarding-data';

test('ONBOARDING_STEPS covers the 8 wizard-v2 content steps', () => {
  expect(ONBOARDING_STEPS).toEqual([
    'modules', 'ai', 'solar', 'pricing_distribution', 'pricing_supplier',
    'battery', 'boiler', 'connection',
  ]);
  expect(Object.keys(EMPTY_ONBOARDING_STATE.steps)).toEqual(ONBOARDING_STEPS);
});
```

- [ ] **Step 2: Run — verify FAIL** (`ONBOARDING_STEPS == ("ai", "solar", "pricing")` today).

Run: `.venv/bin/python -m pytest -q tests/test_onboarding_state.py -k steps_cover` and
`cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/onboarding-steps.test.ts`

- [ ] **Step 3: Implement.** Update `ONBOARDING_STEPS` in both files to the 8-tuple above (design
  decision 1 — `welcome`/`summary` excluded). Update `OnboardingStepId` TS union to the 10 values
  (the 8 content steps + `'welcome'` + `'summary'`) since the FE still needs to *route* to those two
  even though they carry no status. Update `EMPTY_ONBOARDING_STATE.steps`/`.timestamps` to the 8-key
  shape (unaffected `provider`/`grandfathered`/`banner_dismissed` fields stay).

- [ ] **Step 4: Run existing onboarding test suites — fix fallout.** Every test asserting the old
  3-key `steps: {ai, solar, pricing}` shape breaks (see Stage S5 Task 26 for the full sweep — for
  THIS task, only fix the two files touched above plus `tests/test_onboarding_rest.py` if it
  hardcodes the 3-key shape).

Run: `.venv/bin/python -m pytest -q tests/test_onboarding_state.py tests/test_onboarding_rest.py`
and `cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/onboarding-steps.test.ts src/__tests__/onboarding-mount.test.ts`

- [ ] **Step 5: Lint + commit**

```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/onboarding/state.py
git add custom_components/oig_cloud/onboarding/state.py custom_components/oig_cloud/www_v2/src/ui/features/onboarding/onboarding-data.ts tests/test_onboarding_state.py custom_components/oig_cloud/www_v2/src/__tests__/onboarding-steps.test.ts
git commit -m "feat(onboarding): expand ONBOARDING_STEPS to the 8 wizard-v2 content steps"
```

**Done-criteria:** `ONBOARDING_STEPS`/`OnboardingStepId` cover all 8 status-tracked steps in both
languages; both new tests pass.

---

### Task 2: FE `WIZARD_STEPS` full 10-step sequence + Czech step labels

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/index.ts:303` (`WIZARD_STEPS`), `:310-314`
  (`STEP_LABELS`), `:316-320` (`STEP_SKIPPABLE`)
- Test: `www_v2/src/__tests__/onboarding-mount.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
test('WIZARD_STEPS is the 10-step wizard-v2 sequence, welcome first and summary last', () => {
  // render <oig-onboarding-wizard open inverterSn="X">, read data-step attrs off nav.steps buttons
  const steps = [...el.shadowRoot.querySelectorAll('[data-testid="wizard-steps"] button')]
    .map((b) => b.getAttribute('data-step'));
  expect(steps).toEqual([
    'welcome', 'modules', 'ai', 'solar', 'pricing_distribution', 'pricing_supplier',
    'battery', 'boiler', 'connection', 'summary',
  ]);
});
```

- [ ] **Step 2: Run — verify FAIL** (`steps` today is `['ai', 'solar', 'pricing']`).

Run: `cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/onboarding-mount.test.ts`

- [ ] **Step 3: Implement.**

```typescript
const WIZARD_STEPS: ReadonlyArray<OnboardingStepId> = [
  'welcome', 'modules', 'ai', 'solar', 'pricing_distribution', 'pricing_supplier',
  'battery', 'boiler', 'connection', 'summary',
];

const STEP_LABELS: Record<OnboardingStepId, string> = {
  welcome: 'Vítejte',
  modules: 'Moduly',
  ai: 'AI',
  solar: 'Solar',
  pricing_distribution: 'Ceny — distribuce',
  pricing_supplier: 'Ceny — dodavatel',
  battery: 'Baterie a plánovač',
  boiler: 'Bojler',
  connection: 'Připojení',
  summary: 'Shrnutí',
};

// welcome/summary are not in ONBOARDING_STEPS (design decision 1) and are never individually
// skippable — Přeskočit is disabled on them regardless of this map's value.
const STEP_SKIPPABLE: Record<OnboardingStepId, boolean> = {
  welcome: false,
  modules: false,           // gates later steps; skipping it is meaningless
  ai: STEP_AI.skippable,
  solar: STEP_SOLAR.skippable,
  pricing_distribution: STEP_PRICING_DISTRIBUTION.skippable,
  pricing_supplier: STEP_PRICING_SUPPLIER.skippable,
  battery: STEP_BATTERY.skippable,
  boiler: STEP_BOILER.skippable,
  connection: STEP_CONNECTION.skippable,
  summary: false,
};
```

`STEP_PRICING_DISTRIBUTION`/`STEP_PRICING_SUPPLIER`/`STEP_BATTERY`/`STEP_BOILER`/`STEP_CONNECTION`
are introduced in Stage S3 (Tasks 14, 15, 17, 18, 19) — this task may forward-declare them as
`{skippable: true}` stubs in their eventual files (`step-pricing-distribution.ts` etc., created
here with just the `WizardStep` shape) so the shell compiles; Stage S3 fills in the registry-driven
bodies. `step-pricing.ts`'s current non-registry-driven `STEP_PRICING` (`step-pricing.ts:10-16`) is
replaced by these two — delete it in this task (nothing else imports it after this change; confirm
with `grep -rn "STEP_PRICING\b" src/`).

- [ ] **Step 4: Run — PASS.** Also run the full onboarding suite for fallout (old tests referencing
  3-step nav labels/order will fail here — expected; Stage S5 Task 26 does the full sweep, but fix
  `onboarding-mount.test.ts` itself now since this task edits it).

Run: `cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/onboarding-mount.test.ts`

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/index.ts src/ui/features/onboarding/step-pricing-distribution.ts src/ui/features/onboarding/step-pricing-supplier.ts src/ui/features/onboarding/step-battery.ts src/ui/features/onboarding/step-boiler.ts src/ui/features/onboarding/step-connection.ts src/__tests__/onboarding-mount.test.ts
git commit -m "feat(onboarding): 10-step WIZARD_STEPS sequence + Czech step labels"
```

**Done-criteria:** nav renders all 10 steps in spec order; `tsc --noEmit` clean; new test passes.

---

### Task 3: Phase grouping label (Phase A / Phase B) above the step nav

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (new `STEP_PHASE` map, `render()` nav
  section around `:1280-1301`)
- Test: `www_v2/src/__tests__/onboarding-mount.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
test('phase label groups modules/ai/solar/pricing_distribution/boiler/connection as Phase A, pricing_supplier/battery as Phase B', () => {
  const phaseA = el.shadowRoot.querySelectorAll('[data-testid="wizard-phase-a"]');
  const phaseB = el.shadowRoot.querySelectorAll('[data-testid="wizard-phase-b"]');
  expect(phaseA.length).toBe(1);
  expect(phaseB.length).toBe(1);
  expect(phaseA[0].textContent).toContain('Nastavuje se jednou');
  expect(phaseB[0].textContent).toContain('Mění se v čase');
});
```

- [ ] **Step 2: Run — verify FAIL** (no `data-testid="wizard-phase-*"` element exists).

- [ ] **Step 3: Implement.**

```typescript
const STEP_PHASE: Partial<Record<OnboardingStepId, 'A' | 'B'>> = {
  modules: 'A', ai: 'A', solar: 'A', pricing_distribution: 'A', boiler: 'A', connection: 'A',
  pricing_supplier: 'B', battery: 'B',
  // welcome/summary: no phase (undefined) — they span both, per spec §table-of-contents note
};
const PHASE_LABELS = { A: 'Nastavuje se jednou', B: 'Mění se v čase' } as const;
```

In `render()`, above `nav.steps` (`:1280`), render a faint grouping row spanning the Phase-A step
buttons and another spanning Phase-B, per spec §6 ("Progress indicator" — "extend [nav.steps] with
a phase label spanning its steps, not a second competing progress bar"). Use CSS `grid-template-columns`
matching the button count per phase so the label visually spans, `data-testid="wizard-phase-a"` /
`"wizard-phase-b"`.

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/index.ts src/__tests__/onboarding-mount.test.ts
git commit -m "feat(onboarding): Phase A / Phase B grouping label above step nav (UX-SPEC §table-of-contents)"
```

**Done-criteria:** both phase labels render with spec-exact Czech copy; existing per-step
`STEP_STATUS_LABELS` badge (`index.ts:322-326`) unchanged.

---

### Task 4: Module-gated step visibility (nav + content skip modules step's off toggles)

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (new `visibleWizardSteps()` helper, used by
  both nav render and `goNext`/`goPrev`/`advanceFromCurrentStep`, `:721-764`)
- Test: `www_v2/src/__tests__/onboarding-mount.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
test('turning off enable_boiler in the modules step hides the boiler step from nav and skips it on Next', async () => {
  // seed modulesDraft.enable_boiler = false (Task 5's modules step wiring), navigate to 'connection'
  // via repeated wizard-next clicks from 'modules' — assert 'boiler' never appears in the nav list
  // and goNext from 'connection'-adjacent step never routes through it.
  const steps = [...el.shadowRoot.querySelectorAll('[data-testid="wizard-steps"] button')]
    .map((b) => b.getAttribute('data-step'));
  expect(steps).not.toContain('boiler');
});
```

- [ ] **Step 2: Run — verify FAIL** (Task 2 hardcodes all 10 steps unconditionally).

- [ ] **Step 3: Implement.**

```typescript
/** Steps gated by a modules-step toggle (UX-SPEC table-of-contents "New install" column). */
const STEP_GATE: Partial<Record<OnboardingStepId, string>> = {
  ai: '',  // AI is never gated by a modules toggle — always shown (optional, not conditional)
  solar: 'enable_solar_forecast',
  pricing_distribution: 'enable_pricing',
  pricing_supplier: 'enable_pricing',
  battery: 'enable_battery_prediction',
  boiler: 'enable_boiler',
};

private visibleWizardSteps(): OnboardingStepId[] {
  return WIZARD_STEPS.filter((s) => {
    const gate = STEP_GATE[s];
    return !gate || !!this.modulesDraft[gate];
  });
}
```

Replace every direct `WIZARD_STEPS` read in nav rendering (`:1281`) and step-advance logic
(`goNext`/`goPrev`/`advanceFromCurrentStep`/`currentIndex`, `:721-764`, `:1060-1063`) with
`this.visibleWizardSteps()`. `this.modulesDraft` is introduced in Task 5 (Modules step wiring) —
if Task 5 has not landed yet in the same worker's sequence, stub it as
`@state() private modulesDraft: Record<string, unknown> = {}` here and let Task 5 populate it.

- [ ] **Step 4: Run — PASS.** Re-run Task 2/3's tests too (nav queries must still find all steps
  when every module is on, the default new-install state per Task 5).

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/index.ts src/__tests__/onboarding-mount.test.ts
git commit -m "feat(onboarding): module-gated step visibility in nav + navigation"
```

**Done-criteria:** a step whose gating module is off never appears in nav and is never landed-on by
Next/Back; `visibleWizardSteps()` is the single source of truth (no second filtering copy).

---

### Task 5: Welcome (step 0) and Summary (step 9) content — new-install vs review-mode text

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (`renderStepContent`, add `'welcome'` and
  replace the trailing fallback branch `:1230-1244` with an explicit `'summary'` branch)
- New: `www_v2/src/i18n/onboarding.ts` (append `onboarding.welcome.*`/`onboarding.summary.*` keys)
- Test: `www_v2/src/__tests__/onboarding-mount.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
test('welcome step shows new-install copy for a fresh entry, review copy for a grandfathered one', () => {
  // two renders: onboardingState.grandfathered = false vs true
  expect(freshEl.shadowRoot.querySelector('[data-step="welcome"]').textContent)
    .toContain('Nic nemusíte vyplnit najednou');
  expect(reviewEl.shadowRoot.querySelector('[data-step="welcome"]').textContent)
    .toContain('nic se nesmaže, dokud nedáte Uložit');
});
```

- [ ] **Step 2: Run — verify FAIL** (`renderStepContent` has no `'welcome'` branch; falls through to
  the pricing default per `:1230`).

- [ ] **Step 3: Implement.** Add `onboarding.welcome.new_install`/`onboarding.welcome.review` and
  `onboarding.summary.new_install_heading` to `i18n/onboarding.ts`'s `STRINGS.cs` map (verbatim CZ
  copy from spec §Step 0 / §Step 9 — this is the general per-key i18n pattern already used for
  `onboarding.bootstrap.*` etc., `onboarding.ts:17-24`). In `renderStepContent`, add:

```typescript
if (this.currentStep === 'welcome') {
  const isReview = this.onboardingState?.grandfathered === true; // design decision 3
  return html`
    <section class="step step-welcome" data-step="welcome">
      <h3>${STEP_LABELS.welcome}</h3>
      <div class="step-card">
        <p>${t(isReview ? 'onboarding.welcome.review' : 'onboarding.welcome.new_install', this.wizardLang)}</p>
      </div>
    </section>`;
}
```

Replace the current unconditional trailing branch (`:1230-1244`, which renders pricing-tab-pointer
copy regardless of `currentStep`) with an explicit `if (this.currentStep === 'summary')` branch —
its full diff-table content lands in Task 9; this task only wires the flat "new install" list per
spec §Step 9 (`onboarding.summary.new_install_heading` + a plain list of module names whose
`enable_*` flag is true, reading `this.modulesDraft`).

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/index.ts src/i18n/onboarding.ts src/__tests__/onboarding-mount.test.ts
git commit -m "feat(onboarding): welcome + summary step content, new-install vs review copy"
```

**Done-criteria:** welcome/summary render spec-exact CZ copy branching only on `grandfathered`;
no step falls through to the old pricing-pointer default anymore (`grep -n "provede jednou"
src/ui/features/onboarding/index.ts` returns nothing).

---

## Stage S2 — Review-mode state

### Task 6: `originalValues` snapshot + review-mode detection

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (`startBootstrap`, `:855-891`; new
  `@state() private originalValues: Record<string, unknown> = {}`)
- Test: `www_v2/src/__tests__/onboarding-review-mode.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
// new file
test('originalValues snapshots entry.options-derived module_config once at bootstrap, unaffected by later draft edits', async () => {
  // mock module_config GET to return {battery: {charge_rate_kw: 2.8, ...}, ...}
  // open wizard, wait for bootstrap, then mutate this.pricingDraft (or equivalent) — assert
  // originalValues.charge_rate_kw still reads 2.8 (the snapshot, not the live draft).
});
```

- [ ] **Step 2: Run — verify FAIL** (`originalValues` doesn't exist).

- [ ] **Step 3: Implement.** `startBootstrap()` (`:855-891`) already fires `loadPricingConfig` and
  will (Task 8) fire equivalent loaders for modules/battery/solar/boiler/connection. Once ALL
  section loaders settle, flatten every section's returned dict into one
  `originalValues: Record<string, unknown>` (flat, cross-section key namespace — registry keys are
  already globally unique, verified: no key collision across `modules`/`battery`/`solar`/`boiler`/
  `pricing`/`basic` sections in `config_registry.py`) and freeze it — never written to again until
  the next `startBootstrap()` call (matches spec §3 "snapshotted once at wizard open"). This is a
  NEW piece of state, a peer to `solarDraft`/`pricingDraft` (`:444`,`:437`), not a rename of them —
  per spec §3's explicit instruction.

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/index.ts src/__tests__/onboarding-review-mode.test.ts
git commit -m "feat(onboarding): originalValues snapshot for review-mode diff hints (UX-SPEC §3)"
```

**Done-criteria:** `originalValues` is populated once per wizard open, immutable across the session,
independent from every step's live draft state.

---

### Task 7: Per-field diff hint ("Bylo: X → Nyní: Y")

**Files:**
- Modify: `www_v2/src/ui/features/field-renderer.ts` (`FieldPresenterContext`, `:19-27`;
  `renderFieldPresenter`, `:38-119`)
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (every `renderFieldPresenter(f, {...})` call
  site — pass `originalValue`)
- Test: `www_v2/src/__tests__/field-renderer.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
test('renders a diff hint when value differs from originalValue, none when equal', () => {
  const withDiff = renderFieldPresenter(numberField, { value: 3.0, originalValue: 2.8, dirty: true, secretSet: false, onChange: () => {}, entityCatalog: [] });
  const noDiff = renderFieldPresenter(numberField, { value: 2.8, originalValue: 2.8, dirty: false, secretSet: false, onChange: () => {}, entityCatalog: [] });
  // render both to a container, assert
  expect(container1.querySelector('[data-testid="diff-hint"]').textContent).toContain('Bylo: 2.8 → Nyní: 3');
  expect(container2.querySelector('[data-testid="diff-hint"]')).toBeNull();
});
```

- [ ] **Step 2: Run — verify FAIL** (`FieldPresenterContext` has no `originalValue`, no diff-hint
  markup exists in `renderFieldPresenter`).

- [ ] **Step 3: Implement.** Add `originalValue?: unknown` to `FieldPresenterContext` (`:19-27`).
  In `renderFieldPresenter`, after each control's markup (bool/select/number/text branches,
  `:41-119`), append a shared diff-hint fragment when `ctx.originalValue !== undefined &&
  ctx.originalValue !== ctx.value` (loose enough to cover number/string coercion — `3` vs `3.0`
  should NOT show a spurious diff; use `String(ctx.originalValue) !== String(ctx.value)` after
  normalizing, or compare post-coercion values, whichever `renderLabel`'s existing scale-aware
  formatting (`:72`) makes simpler — implementer's call, tested by the RED case above):

```typescript
function renderDiffHint(ctx: FieldPresenterContext, formattedOld: string, formattedNew: string) {
  if (ctx.originalValue === undefined || String(ctx.originalValue) === String(ctx.value)) return nothing;
  return html`<span class="diff-hint" data-testid="diff-hint">Bylo: ${formattedOld} → Nyní: ${formattedNew}</span>`;
}
```

Render it inside each `.row` div, directly under the control (per spec §6 "Diff hints" — "never a
modal, toast, or separate summary-only surface"), muted styling reusing the existing `.hint` CSS
class treatment (`field-renderer.ts:145-151`). Never a secret field's raw value — for `f.secret`
fields, hint reads "Bylo: (nastaveno) → Nyní: (změněno)" instead of the actual secret string.
Update every `renderFieldPresenter(f, {...})` call site in `onboarding/index.ts`
(solar `:1120-1131`, pricing `:1204-1212`, and the new sections from Stage S3) to pass
`originalValue: this.originalValues[f.key]`.

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/field-renderer.test.ts && npx tsc --noEmit
git add src/ui/features/field-renderer.ts src/ui/features/onboarding/index.ts src/__tests__/field-renderer.test.ts
git commit -m "feat(field-renderer): per-field diff hint for review mode (UX-SPEC §3/§6)"
```

**Done-criteria:** diff hint shows only when a value diverges from `originalValues`, secret fields
never leak their old/new raw value, hint clears when the user reverts to the original.

---

### Task 8: Seed every step's draft from `entry.options` in review mode (not registry defaults)

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/index.ts` — extend `startBootstrap()` (`:855-891`) to
  fire a `module_config` GET per new section (mirrors `loadPricingConfig`, `:824-843`), and change
  `loadSolarRegistry` (`:794-819`) to seed `solarDraft` from `entry.options`-derived values (via
  `module_config`'s `solar` section) FIRST, registry `default` only as fallback for genuinely-unset
  fields (new-install case)
- Test: `www_v2/src/__tests__/onboarding-review-mode.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
test('review mode (grandfathered) seeds solarDraft from module_config, not registry defaults', async () => {
  // mock GET /module_config -> {solar: {solar_forecast_latitude: 49.5, ...}}, GET /config_registry
  // -> default lat = null. After bootstrap: solarDraft.solar_forecast_latitude === 49.5, not the
  // registry default.
});

test('new install (not grandfathered, no module_config solar section) leaves fields empty, no fabricated value', async () => {
  // GET /module_config -> {solar: {solar_forecast_latitude: null, ...}} — assert solarDraft stays
  // empty/null, never a Prague coordinate or any other invented default (UX-SPEC §3 "New install").
});
```

- [ ] **Step 2: Run — verify FAIL** (`loadSolarRegistry` today (`:794-819`) seeds ONLY from the
  registry's own `default`, ignoring `entry.options` entirely — solar was never review-mode-aware).

- [ ] **Step 3: Implement.** Fire `GET /module_config` once per bootstrap (already done for
  `pricing` via `loadPricingConfig`); for every OTHER section (`solar`, `battery`, `modules`,
  `boiler`, `basic`→connection) do the same and seed that section's draft from the response, falling
  back to the registry `default` only when the response value is `null`/absent (new-install per-field
  rule, spec §3). This generalizes the existing `loadPricingConfig` pattern (`:824-843`) to every
  section instead of just pricing — one bootstrap fetch per section, all fired in parallel inside
  `startBootstrap()` alongside the existing four.

- [ ] **Step 4: Run — PASS.** Re-run the full onboarding bootstrap suite (this changes bootstrap
  fetch count/shape).

Run: `cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/onboarding-bootstrap.test.ts src/__tests__/onboarding-review-mode.test.ts`

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/index.ts src/__tests__/onboarding-review-mode.test.ts src/__tests__/onboarding-bootstrap.test.ts
git commit -m "feat(onboarding): seed every step draft from entry.options in review mode (UX-SPEC §3)"
```

**Done-criteria:** every section's draft prefers `entry.options` over registry defaults; a genuinely
new install still sees empty fields, never a fabricated value (the general form of the R4 fix).

---

### Task 9: Step 9 full diff table (review mode only)

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (`'summary'` branch added in Task 5)
- Test: `www_v2/src/__tests__/onboarding-review-mode.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
test('summary step (review mode) renders one row per CHANGED field only, columns Pole/Bylo/Nyní', () => {
  // originalValues.charge_rate_kw = 2.8, batteryDraft.charge_rate_kw = 3.0 (changed);
  // originalValues.enable_boiler = true, modulesDraft.enable_boiler = true (unchanged)
  const rows = el.shadowRoot.querySelectorAll('[data-testid="summary-diff-row"]');
  expect(rows.length).toBe(1); // only the changed field
  expect(rows[0].textContent).toContain('2.8');
  expect(rows[0].textContent).toContain('3');
});
```

- [ ] **Step 2: Run — verify FAIL** (Task 5's `'summary'` branch only renders the flat new-install
  list, no diff table).

- [ ] **Step 3: Implement.** Build a flat `{ key, oldValue, newValue }[]` by diffing
  `this.originalValues` against the union of every section draft (`modulesDraft`, `solarDraft`,
  `pricingDistributionDraft`, `pricingSupplierDraft` [Task 15], `batteryDraft` [Task 17],
  `boilerDraft` [Task 18], `connectionDraft` [Task 19]) — filter to entries where
  `String(old) !== String(new)`, per spec §3 ("one row per changed field only... a wall of 'X → X'
  rows defeats the purpose"). Render as a table, `data-testid="summary-diff-row"` per row, columns
  "Pole" (resolved via `fieldLabel`, same catalog Task 22 completes) / "Bylo" / "Nyní". Render
  the spec's confirm copy above the save button:
  `t('onboarding.summary.confirm_notice', lang)` → "Toto se změní. Dokud nekliknete na Uložit,
  nic se neuloží." (new i18n key, `onboarding.ts`).

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/index.ts src/i18n/onboarding.ts src/__tests__/onboarding-review-mode.test.ts
git commit -m "feat(onboarding): step-9 full diff table for review mode (UX-SPEC §3)"
```

**Done-criteria:** unchanged fields never appear in the table; the confirm-copy sentence appears
directly above the save button per spec §6 (no separate dialog).

---

### Task 10: Single final save (replace per-step confirm calls)

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/index.ts` — remove `confirmPricing` (`:1041-1054`) as
  a standalone per-step action; fold its `saveModuleConfig` call into `finish()`/`sendFinishRequest`
  (`:688-719`)
- Test: `www_v2/src/__tests__/onboarding-review-mode.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
test('summary Uložit saves every changed section in one batch, nothing before it', async () => {
  // change a solar field and a battery field, click through to summary, click summary's save
  // button — assert saveModuleConfig called once per CHANGED section (2 calls: solar, battery),
  // and NOT called at all before the summary step's save click (no per-step auto-save).
});
```

- [ ] **Step 2: Run — verify FAIL** (today `confirmPricing` (`:1041-1054`) saves the pricing
  section immediately on its own step's [Potvrdit] click, before the user ever reaches summary).

- [ ] **Step 3: Implement.** Remove the pricing step's own [Potvrdit] button/`confirmPricing` call
  (superseded — Task 15's supplier/distribution steps become read/edit-only, no per-step save).
  Add a `saveAllChangedSections()` method: for each section whose draft differs from
  `originalValues`-scoped subset, call `saveModuleConfig(section, changedValuesForSection)`
  (reusing `settings-data.ts:160-172` unchanged — it already accepts arbitrary `Record<string,
  unknown>`). Wire the summary step's "Uložit" button (Task 9) to call this, THEN `sendFinishRequest`
  (`:688-703`) exactly as today's last-step Next already does (`:736-751`) — same sequencing, now
  gated behind the diff table's explicit confirm instead of implicit per-step saves.

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/index.ts src/__tests__/onboarding-review-mode.test.ts
git commit -m "feat(onboarding): single final save at step 9, remove per-step auto-save (UX-SPEC §3)"
```

**Done-criteria:** no config write happens before the user clicks summary's Uložit; every changed
section (and only changed sections) is written in that one action.

---

### Task 11: Recovered pricing_supplier note + module-off-in-review-mode warning

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (modules step from Task 20, `pricing_supplier`
  step from Task 15)
- Modify: `www_v2/src/i18n/onboarding.ts` (append two keys)
- Test: `www_v2/src/__tests__/onboarding-review-mode.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
test('pricing_supplier step shows the "recovered values" note only when enable_pricing=true AND at least one legacy key is present AND entry predates wizard v2', () => {
  // 3 render variants per the spec's compound condition — assert note shown/hidden per case
});
test('modules step shows the "hidden not deleted" warning only in review mode, when a module is toggled OFF', () => {
  // review mode, enable_boiler true->false in this session -> warning shown
  // new install, enable_boiler false->true -> warning NOT shown (nothing to lose yet)
});
```

- [ ] **Step 2: Run — verify FAIL** (neither note exists in current markup).

- [ ] **Step 3: Implement.** Add the two spec-exact CZ strings (§3 "Tyto hodnoty jsme našli..." and
  "Vypnutím modulu se jeho nastavení skryje...") to `i18n/onboarding.ts`. Gate the recovered-values
  note on: `this.modulesDraft.enable_pricing && Object.keys(this.originalValues).some(k =>
  LEGACY_PRICING_SUPPLIER_KEYS.includes(k)) && this.onboardingState?.grandfathered`. Gate the
  modules-off warning on: review mode AND a toggle whose ORIGINAL value (from
  `this.originalValues`) was `true` now reading `false` in `this.modulesDraft`.

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/index.ts src/i18n/onboarding.ts src/__tests__/onboarding-review-mode.test.ts
git commit -m "feat(onboarding): recovered-pricing note + module-off warning (UX-SPEC §3, K2f merge-save)"
```

**Done-criteria:** both notes gate exactly on the compound conditions spec §3 states, never shown
outside them.

---

## Stage S3 — Step content migrations

*(Every task in this stage that touches `pricing_supplier`/`pricing_distribution` registry keys
carries the Phase A risk flag from this plan's header — re-verify field names against the landed
registry before implementing.)*

### Task 12: Solar — `solcast_site_id` visibility + GPS "Převzít z Home Assistanta" button

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (solar branch, `:1078-1150`)
- Test: `www_v2/src/__tests__/onboarding-review-mode.test.ts` or a new `onboarding-solar-gps.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
test('GPS button fills solar_forecast_latitude/longitude from hass.config, only on click', () => {
  // el.hass = { config: { latitude: 49.2, longitude: 16.6 } }
  const button = el.shadowRoot.querySelector('[data-testid="solar-gps-from-hass"]');
  expect(el.solarDraft.solar_forecast_latitude).toBeUndefined(); // not auto-filled on mount
  button.click();
  expect(el.solarDraft.solar_forecast_latitude).toBe(49.2);
  expect(el.solarDraft.solar_forecast_longitude).toBe(16.6);
});
```

- [ ] **Step 2: Run — verify FAIL** (no such button/handler exists; `solcast_site_id` is already
  registry-visible per `config_registry.py:316-317` — verify with
  `grep -n "solcast_site_id" config_registry.py` that it renders via the existing
  `fieldsFromRegistry(reg, 'solar')` call at `step-solar.ts:26`; if it already renders correctly,
  this sub-item is a no-op, confirm via a quick manual registry-fields assertion rather than adding
  dead test coverage).

- [ ] **Step 3: Implement.** Add a button directly below the GPS field pair in the solar step render
  (`:1120-1131` loop), `data-testid="solar-gps-from-hass"`, label "📍 Převzít z Home Assistanta"
  (spec §Step 3), `@click` handler: `this.solarDraft = {...this.solarDraft, solar_forecast_latitude:
  this.hass?.config?.latitude, solar_forecast_longitude: this.hass?.config?.longitude}` (design
  decision 2 — no new endpoint). Disable/hide the button when `this.hass?.config?.latitude` is
  falsy (nothing to take over).

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/index.ts src/__tests__/onboarding-solar-gps.test.ts
git commit -m "feat(onboarding): GPS 'Převzít z Home Assistanta' button on solar step (UX-SPEC §Step 3)"
```

**Done-criteria:** button fills both fields from `this.hass.config` on click only, never
automatically; does not reintroduce a silent fallback (R4 principle).

---

### Task 13: Enum-value CZ labels — generalized mechanism (`solar_forecast_mode` first)

**Files:**
- New: `www_v2/src/i18n/enum-labels.ts`
- Modify: `www_v2/src/ui/features/field-renderer.ts` (`select` branch, `:56-68`) or
  `registry-data.ts` (`fieldsFromRegistry`, `:46-62`) — implementer's call on which layer owns the
  mapping (registry-data.ts is more consistent: it already maps `spec.enum` → `options` at `:55`)
- Test: `www_v2/src/__tests__/registry-data.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
test('fieldsFromRegistry renders humanized CZ labels for solar_forecast_mode enum values, never the raw enum string', () => {
  const fields = fieldsFromRegistry(fixtureRegistryWithSolarForecastMode, 'solar');
  const modeField = fields.find((f) => f.key === 'solar_forecast_mode');
  expect(modeField.options).toEqual([
    ['hourly', 'Každou hodinu (vyžaduje API klíč)'],
    ['every_4h', 'Každé 4 hodiny (vyžaduje API klíč)'],
    ['daily_optimized', 'Denně, optimalizovaně (výchozí)'],
  ]);
});
```

- [ ] **Step 2: Run — verify FAIL** (`fieldsFromRegistry:55` today maps
  `spec.enum?.map((v) => [v, v])` — raw value as both key and label).

- [ ] **Step 3: Implement.** New `enum-labels.ts` catalog, same shape/fallback pattern as
  `i18n/fields.ts`'s `CS_LABELS` (`field.<key>.enum.<value>` → CZ string, falls back to the raw
  value if missing — never throws, matches the "no raw enum value is ever a visible label" principle
  spec §6 states while still degrading safely for未-cataloged future enums). Seed it with
  `solar_forecast_mode`'s 3 values (spec §Step 3 copy above). Change `fieldsFromRegistry`'s options
  line (`:55`) to `spec.enum?.map((v) => [v, enumLabel(key, v)] as [string, string])`.

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/registry-data.test.ts && npx tsc --noEmit
git add src/i18n/enum-labels.ts src/data/registry-data.ts src/__tests__/registry-data.test.ts
git commit -m "feat(i18n): enum-value label catalog, solar_forecast_mode CZ labels (UX-SPEC §6)"
```

**Done-criteria:** `solar_forecast_mode`'s select renders 3 CZ labels, never `hourly`/`every_4h`/
`daily_optimized` raw. Mechanism is reusable — Task 19 (`data_source_mode`) is a catalog append,
not a new code path.

---

### Task 14: Pricing-distribution step — dual-ness info line + NT price display

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/step-pricing-distribution.ts` (created as a stub in
  Task 2; fill in as a `RegistryStep`, mirroring `step-solar.ts:20-30`)
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (new `pricing_distribution` render branch,
  replacing the old `'pricing'` branch's distributor/tariff portion, `:1152-1227`)
- Test: `www_v2/src/__tests__/onboarding-pricing-distribution.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
test('selecting a dual-tariff code (e.g. D25d) shows the dual info line + NT price fields', () => {
  el.pricingDistributionDraft = { confirmed_distribution_distributor: 'CEZ', confirmed_distribution_tariff: 'D25d' };
  // re-render
  expect(el.shadowRoot.querySelector('[data-testid="tariff-dual-info"]').textContent)
    .toContain('Dvoutarifní');
  expect(el.shadowRoot.querySelector('[data-key="confirmed_distribution_price_nt_incl_vat"]')).not.toBeNull();
});
test('selecting a single-tariff code (D01d) shows single-tariff info, no NT fields', () => {
  el.pricingDistributionDraft = { confirmed_distribution_distributor: 'CEZ', confirmed_distribution_tariff: 'D01d' };
  expect(el.shadowRoot.querySelector('[data-testid="tariff-dual-info"]').textContent).toContain('Jednotarifní');
  expect(el.shadowRoot.querySelector('[data-key="confirmed_distribution_price_nt_incl_vat"]')).toBeNull();
});
```

- [ ] **Step 2: Run — verify FAIL** (today's pricing step (`:1152-1227`) has no dual-tariff
  derivation at all — only the 5 flat `confirmed_distribution_*` fields).

- [ ] **Step 3: Implement.** Derive dual-ness client-side from the selected tariff code against the
  known dual-tariff code set (per §4's verified 30/30 split — `D25d/D26d/D27d/D35d/D45d/D56d/D57d/
  D61d` always dual, all others single; hardcode this set in the FE per spec §4's own framing "the
  wizard must derive dual-ness from this selection" — no new backend endpoint needed, the codes
  are stable dataset identifiers, not registry-driven values). Render the info line
  (`data-testid="tariff-dual-info"`) immediately after tariff selection. For NT price display: per
  §4a, this needs a Phase A registry addition (`confirmed_distribution_price_nt_incl_vat`/`_excl_vat`
  fields, OR a direct client-side read of `this.pricing.distributors[distributor][tariff].nt` — the
  `/pricelists` response already carries the `nt` sub-object per §4a's verified REST evidence,
  `ha_rest_api.py:1354-1419`). **Prefer the direct-read approach** (no Phase A registry dependency,
  lower risk given this plan's header risk-flag) — render NT price directly from
  `this.pricing.distributors[...][tariff].nt`, not through `fieldsFromRegistry`.

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/step-pricing-distribution.ts src/ui/features/onboarding/index.ts src/__tests__/onboarding-pricing-distribution.test.ts
git commit -m "feat(onboarding): pricing-distribution step — dual-tariff derivation + NT price display (UX-SPEC §4/§4a)"
```

**Done-criteria:** dual-ness always matches the tariff code (never a user-facing toggle, per §4
"no step renders a 'Mám dva tarify' toggle anywhere" — grep the whole onboarding dir for
`dual_tariff_enabled` after this task and confirm zero UI-facing hits); NT prices show only when
dual.

---

### Task 15: Pricing-distribution step — tariff-schedule 5 fields (moved from supplier)

**Files:**
- Modify: same files as Task 14
- Test: `www_v2/src/__tests__/onboarding-pricing-distribution.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
test('dual tariff shows the 5 tariff-schedule fields (VT/NT start times, weekend toggle)', () => {
  // dual selection from Task 14's setup
  const keys = ['tariff_vt_start_weekday', 'tariff_nt_start_weekday', 'tariff_weekend_same_as_weekday'];
  keys.forEach((k) => expect(el.shadowRoot.querySelector(`[data-key="${k}"]`)).not.toBeNull());
});
test('tariff_vt_start_weekend/tariff_nt_start_weekend show only when weekend_same_as_weekday=false', () => {
  el.pricingDistributionDraft.tariff_weekend_same_as_weekday = true;
  expect(el.shadowRoot.querySelector('[data-key="tariff_vt_start_weekend"]')).toBeNull();
});
```

- [ ] **Step 2: Run — verify FAIL** (these 5 keys render nowhere today — RCA-R3 finding, registry
  has zero `tariff_*` keys per the current `config_registry.py` pricing section, lines 402-442).

- [ ] **Step 3: Implement.** **Phase A dependency** (this plan's header risk flag applies directly
  here): these 5 fields must exist in the landed registry (`pricing_distribution` or wherever Phase
  A places them) with the `show_if` chains spec §4 table specifies (`tariff is dual`,
  `tariff is dual AND tariff_weekend_same_as_weekday=false`). "`tariff is dual`" is not a literal
  registry field — thread the Task 14 dual-derivation boolean as a synthetic visibility predicate
  (client-side `isVisible`-equivalent check ANDed with the registry's own `show_if`, since
  `isVisible` (`registry-data.ts:64-68`) only understands `{field, in}` against a flat values
  object — extend the values object passed to `isVisible` with a synthetic `_dual: true/false` key
  the wizard computes, OR extend `isVisible`'s signature to accept an extra predicate — implementer's
  call, tested by the RED case above either way).

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/step-pricing-distribution.ts src/ui/features/onboarding/index.ts src/data/registry-data.ts src/__tests__/onboarding-pricing-distribution.test.ts
git commit -m "feat(onboarding): tariff-schedule fields in pricing-distribution step (UX-SPEC §4, RCA-R3)"
```

**Done-criteria:** all 5 fields render with spec-exact show_if gating; weekend-override fields hide
by default (weekday==weekend is the more common case, matches spec's field ordering intent).

---

### Task 16: Pricing-supplier step — 18 fields, groups A/B/C, section intro copy

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/step-pricing-supplier.ts` (stub from Task 2)
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (new `pricing_supplier` render branch)
- Test: `www_v2/src/__tests__/onboarding-pricing-supplier.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
test('pricing_supplier renders group A (import) fields gated by spot_pricing_model, group B (export), group C (distribution/VAT)', () => {
  el.pricingSupplierDraft = { spot_pricing_model: 'percentage' };
  expect(el.shadowRoot.querySelector('[data-key="spot_positive_fee_percent_vt"]')).not.toBeNull();
  expect(el.shadowRoot.querySelector('[data-key="fixed_commercial_price_vt"]')).toBeNull(); // wrong scenario
  expect(el.shadowRoot.querySelector('[data-key="vat_rate"]')).not.toBeNull(); // group C always visible
});
test('_nt variant fields show only when the tariff is dual (cross-step flag from distribution step)', () => {
  el.pricingSupplierDraft = { spot_pricing_model: 'percentage' };
  el.isDualTariff = false; // Task 17's cross-step flag
  expect(el.shadowRoot.querySelector('[data-key="spot_positive_fee_percent_nt"]')).toBeNull();
});
test('section intro copy distinguishes dataset price (step 4) from actual contract (step 5)', () => {
  expect(el.shadowRoot.querySelector('[data-testid="pricing-supplier-intro"]').textContent)
    .toContain('vaše skutečná smlouva');
});
```

- [ ] **Step 2: Run — verify FAIL** (none of `config_registry.py`'s current `pricing` section keys
  are the 18 legacy supplier keys — RCA-R3's core finding).

- [ ] **Step 3: Implement.** **Phase A dependency.** Assuming Phase A lands the `pricing_supplier`
  registry section with the 18 keys + their `show_if` chains (spec §4 tables A/B/C — the `show_if`
  mechanism is already generic in `Field` (`config_registry.py:41`) and already exercised by solar's
  provider-conditional fields, so no new FE machinery is needed beyond what Task 15 already builds
  for the cross-step dual flag), render via `fieldsFromRegistry(reg, 'pricing_supplier')` +
  `isVisible` exactly like `step-solar.ts`'s pattern — no bespoke per-field logic needed since
  `show_if` chains are mutually exclusive per scenario selector (spec §4, "at most
  scenario-count-many fields visible at once"). Add the spec-exact section intro copy
  (`data-testid="pricing-supplier-intro"`) above the three groups.

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/step-pricing-supplier.ts src/ui/features/onboarding/index.ts src/__tests__/onboarding-pricing-supplier.test.ts
git commit -m "feat(onboarding): pricing-supplier step — 18-field restoration, groups A/B/C (UX-SPEC §4, RCA-R3)"
```

**Done-criteria:** every group A/B/C field from spec §4's tables renders with correct show_if
gating; `dual_tariff_enabled` never appears as a user-facing control anywhere in this step (grep
check, same as Task 14's done-criteria).

---

### Task 17: Cross-step dual-flag propagation (distribution → supplier)

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (new `@state() private isDualTariff = false`,
  updated wherever `pricingDistributionDraft.confirmed_distribution_tariff` changes)
- Test: `www_v2/src/__tests__/onboarding-pricing-supplier.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
test('changing the tariff in the distribution step updates isDualTariff, which the supplier step reads for its _nt fields', () => {
  el.currentStep = 'pricing_distribution';
  el.onPricingDistributionFieldChange('confirmed_distribution_tariff', 'D25d'); // dual code
  expect(el.isDualTariff).toBe(true);
  el.currentStep = 'pricing_supplier';
  el.pricingSupplierDraft = { spot_pricing_model: 'percentage' };
  expect(el.shadowRoot.querySelector('[data-key="spot_positive_fee_percent_nt"]')).not.toBeNull();
});
```

- [ ] **Step 2: Run — verify FAIL** (`isDualTariff` doesn't exist; Task 16's supplier step can't
  gate `_nt` fields without it).

- [ ] **Step 3: Implement.** Single `@state() private isDualTariff = false`, a peer to
  `solarDraft`/`pricingDraft` (spec §4's explicit "the wizard's draft state must carry the derived
  single/dual flag forward from step 4 into step 5's show_if evaluation... a peer to those, not a
  rename"). Set it in the distribution step's tariff-change handler (Task 14's dual-derivation
  logic, reused here — factor the dual-code-set lookup into one shared function both tasks call,
  not duplicated). Pass `isDualTariff` into the supplier step's `isVisible` calls as the synthetic
  `_dual` predicate Task 15 introduced (reused, not a second mechanism).

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/index.ts src/__tests__/onboarding-pricing-supplier.test.ts
git commit -m "feat(onboarding): isDualTariff cross-step flag, distribution step drives supplier step's _nt fields (UX-SPEC §4)"
```

**Done-criteria:** one dual-code-set lookup shared by both steps (no duplicated logic); supplier
step's `_nt` fields track the distribution step's live selection, not a stale snapshot.

---

### Task 18: Battery step — section grouping (Nabíjení/Automatika/Vyrovnávání/Plánovač)

**Files:**
- New: `www_v2/src/ui/features/onboarding/step-battery.ts` (stub from Task 2, filled in — mirrors
  `step-solar.ts:20-30`'s `RegistryStep` shape)
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (new `battery` render branch)
- Test: `www_v2/src/__tests__/onboarding-battery.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
test('battery step renders 4 grouped sections in spec order: Nabíjení, Automatika, Vyrovnávání, Plánovač', () => {
  const headings = [...el.shadowRoot.querySelectorAll('[data-testid="battery-group-heading"]')].map((h) => h.textContent);
  expect(headings).toEqual(['Nabíjení', 'Automatika', 'Vyrovnávání článků', 'Plánovač']);
  // Nabíjení group contains charge_rate_kw + battery_comfort_soc_percent
  const nabijeniGroup = el.shadowRoot.querySelector('[data-group="nabijeni"]');
  expect(nabijeniGroup.querySelector('[data-key="charge_rate_kw"]')).not.toBeNull();
});
```

- [ ] **Step 2: Run — verify FAIL** (battery has no wizard-v2 step at all today — only reachable via
  the Settings tab, not this wizard).

- [ ] **Step 3: Implement.** `STEP_BATTERY: RegistryStep` (mirrors `step-solar.ts:20-30`, `section:
  'battery'`). In `index.ts`, render 4 explicit sub-groups by filtering
  `fieldsFromRegistry(reg, 'battery')` on hardcoded key lists per spec §Step 6: `["charge_rate_kw",
  "battery_comfort_soc_percent"]` / `["auto_mode_switch_enabled"]` /
  `["balancing_enabled","balancing_interval_days","balancing_hold_hours",
  "balancing_opportunistic_threshold","balancing_economic_threshold"]` /
  `["expensive_percentile","cheap_window_percentile"]`, each behind `balancing_enabled`'s own
  show_if for the 4 sub-fields (already the case in Phase A's registry, per
  `config_registry.py:295-302` — verify `balancing_enabled` gates the other 4 via `show_if` once
  Phase A lands; today none of them carry a `show_if` at all — confirm before relying on it, add
  the gate client-side as a fallback if Phase A didn't add it).

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/step-battery.ts src/ui/features/onboarding/index.ts src/__tests__/onboarding-battery.test.ts
git commit -m "feat(onboarding): battery step — 4-group layout (UX-SPEC §Step 6)"
```

**Done-criteria:** all 10 battery registry fields render exactly once, in the 4 spec-ordered groups;
`balancing_*` sub-fields visually/functionally gated by `balancing_enabled`.

---

### Task 19: Boiler step (new) — single registry-driven step

**Files:**
- New: `www_v2/src/ui/features/onboarding/step-boiler.ts` (stub from Task 2, filled in)
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (new `boiler` render branch)
- Test: `www_v2/src/__tests__/onboarding-boiler.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
test('boiler step renders all 25 boiler registry fields as a single step, gated by enable_boiler', () => {
  el.modulesDraft.enable_boiler = false;
  expect([...el.shadowRoot.querySelectorAll('[data-testid="wizard-steps"] button')].map((b) => b.dataset.step)).not.toContain('boiler');
  el.modulesDraft.enable_boiler = true;
  el.currentStep = 'boiler';
  const rendered = fieldsFromRegistry(fixtureRegistry, 'boiler').every((f) => el.shadowRoot.querySelector(`[data-key="${f.key}"]`));
  expect(rendered).toBe(true);
});
```

- [ ] **Step 2: Run — verify FAIL** (boiler is not part of the FE onboarding overlay at all today —
  confirmed by `grep -rn "boiler" src/ui/features/onboarding/` returning zero hits pre-this-task).

- [ ] **Step 3: Implement.** `STEP_BOILER: RegistryStep`, `section: 'boiler'` — CS_LABELS already
  covers every boiler key (`i18n/fields.ts:53-77`, verified — no missing entries, unlike pricing).
  Render `fieldsFromRegistry(reg, 'boiler')` grouped per the existing `wizard_boiler` cs.json
  structural grouping (intro → sensors → thresholds → circulation → legionella — **structure only**;
  the actual label/hint text comes from `fields.ts`'s `CS_LABELS`/`CS_HINTS`, NOT `cs.json`, per the
  same layer distinction RCA-R1/spec §Step 8 establish for the FE wizard — do not re-import
  `cs.json` copy here, it would be the exact defect pattern R1 already fixed elsewhere). Single flat
  step, not 8 substeps (spec §Step 7's explicit "not the 8-substep HA-native flow" instruction).

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/step-boiler.ts src/ui/features/onboarding/index.ts src/__tests__/onboarding-boiler.test.ts
git commit -m "feat(onboarding): boiler step — new step 7, single registry-driven form (UX-SPEC §Step 7)"
```

**Done-criteria:** all 25 boiler fields render in one step, grouped, gated by `enable_boiler`; no
`cs.json` copy imported into this FE path.

---

### Task 20: Connection step (new) — 5 basic-section fields, enum labels for `data_source_mode`

**Files:**
- New: `www_v2/src/ui/features/onboarding/step-connection.ts` (stub from Task 2, filled in)
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (new `connection` render branch)
- Modify: `www_v2/src/i18n/enum-labels.ts` (append `data_source_mode` values, Task 13's catalog)
- Modify: `www_v2/src/i18n/fields.ts` (append `CS_LABELS`/`CS_HINTS` for the 5 `basic` keys — zero
  entries exist today per spec §Step 8's verified grep)
- Test: `www_v2/src/__tests__/onboarding-connection.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
test('connection step renders data_source_mode with 2 CZ labels (hybrid excluded from options)', () => {
  const field = fieldsFromRegistry(fixtureRegistry, 'basic').find((f) => f.key === 'data_source_mode');
  expect(field.options.map(([v]) => v)).not.toContain('hybrid');
  expect(field.options).toEqual([
    ['cloud_only', 'Přes OIG Cloud (výchozí — funguje vždy)'],
    ['local_only', 'Přímo z boxu po domácí síti (rychlejší, bez internetu)'],
  ]);
});
test('local_proxy_stale_minutes/local_event_debounce_ms show only when data_source_mode=local_only', () => {
  el.connectionDraft = { data_source_mode: 'cloud_only' };
  expect(el.shadowRoot.querySelector('[data-key="local_proxy_stale_minutes"]')).toBeNull();
});
```

- [ ] **Step 2: Run — verify FAIL** (`basic` section fields render nowhere in the FE wizard today;
  `data_source_mode`'s registry enum is 3-valued with no FE filtering of `hybrid`).

- [ ] **Step 3: Implement.** `STEP_CONNECTION: RegistryStep`, `section: 'basic'`. Add 5 `CS_LABELS`/
  `CS_HINTS` entries to `fields.ts` (adapt copy from `cs.json`'s `wizard_intervals` text per spec
  §Step 8's explicit instruction — "the words are fine, only the file they live in is wrong").
  `enum-labels.ts`: 2 labels for `data_source_mode` — `hybrid` gets NO catalog entry and the FE
  filters it out of rendered `options` explicitly (`field.options.filter(([v]) => v !== 'hybrid')`
  in `fieldsFromRegistry` or a step-local filter — implementer's call; a catalog-miss silently
  falling back to the raw string would violate spec §6's "no raw enum value is ever a visible
  label" principle, so this needs an explicit exclusion, not just an absent catalog entry).
  `enable_dashboard` is NOT rendered here (spec §Step 8, "the premium gate checkbox itself... out of
  scope for a step that runs after the gate is already open").

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/step-connection.ts src/ui/features/onboarding/index.ts src/i18n/enum-labels.ts src/i18n/fields.ts src/__tests__/onboarding-connection.test.ts
git commit -m "feat(onboarding): connection step — new step 8, basic-section fields (UX-SPEC §Step 8)"
```

**Done-criteria:** all 5 basic fields render (`enable_dashboard` excluded); `hybrid` never appears
as a selectable option; interval fields hide when mode is `cloud_only`.

---

### Task 21: Modules step — "Hlavní moduly" / "Doplňkové" grouping

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (new `modules` render branch; introduces
  `@state() private modulesDraft` referenced by Tasks 4/9/11 — land it here if not already stubbed)
- Modify: `www_v2/src/i18n/onboarding.ts` (append 2 group-header keys)
- Test: `www_v2/src/__tests__/onboarding-modules.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
test('modules step groups fields into Hlavní moduly (4, each gates a later step) and Doplňkové (3)', () => {
  const main = [...el.shadowRoot.querySelectorAll('[data-group="hlavni"] [data-key]')].map((n) => n.dataset.key);
  const extra = [...el.shadowRoot.querySelectorAll('[data-group="doplnkove"] [data-key]')].map((n) => n.dataset.key);
  expect(main).toEqual(['enable_solar_forecast', 'enable_pricing', 'enable_battery_prediction', 'enable_boiler']);
  expect(extra).toEqual(['enable_statistics', 'enable_extended_sensors', 'enable_chmu_warnings']);
});
```

- [ ] **Step 2: Run — verify FAIL** (modules step doesn't exist in the FE wizard yet — today it's
  HA-native-flow-only, `config/steps.py` `wizard_modules`).

- [ ] **Step 3: Implement.** `fieldsFromRegistry(reg, 'modules')` split by the two hardcoded key
  lists above (spec §Step 1). All 7 labels already exist in `CS_LABELS` (`fields.ts:19-25`,
  verified — no missing entries). Add the two group-header strings to `onboarding.ts`. If
  `this.modulesDraft` was already introduced as a stub by Task 4, wire real seeding here (from
  `module_config`'s `modules` section, per Task 8's pattern) instead of the empty-object stub.

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/index.ts src/i18n/onboarding.ts src/__tests__/onboarding-modules.test.ts
git commit -m "feat(onboarding): modules step — Hlavní/Doplňkové grouping (UX-SPEC §Step 1)"
```

**Done-criteria:** exactly 7 fields render, split 4/3 into the two spec-ordered groups; no new
`CS_LABELS` entries needed (pre-existing coverage confirmed).

---

### Task 22: AI step — prepend R5 "K čemu je tu AI" intro block

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/index.ts` (`OigOnboardingStepAi.render()`, `:271-285`)
- Modify: `www_v2/src/i18n/onboarding.ts` (append `onboarding.ai.intro_*` keys)
- Test: `www_v2/src/__tests__/onboarding-step-ai.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
test('AI step renders the R5 intro block (heading, body, why-it-matters, optionality) above the provider cards', () => {
  const intro = el.shadowRoot.querySelector('[data-testid="ai-intro"]');
  expect(intro.textContent).toContain('K čemu je tu AI');
  expect(intro.textContent).toContain('AI Task');
  const introRect = intro.getBoundingClientRect?.() ?? {};
  const gridEl = el.shadowRoot.querySelector('.grid');
  // structural check: intro precedes .grid in DOM order
  expect(intro.compareDocumentPosition(gridEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
```

- [ ] **Step 2: Run — verify FAIL** (`render()` (`:271-285`) goes straight from the `<h2>` to the
  provider-card `.grid` — no intro block).

- [ ] **Step 3: Implement.** Add the 4 CZ strings verbatim from spec §5 ("heading"/"body"/
  "why-it-matters"/"optionality", `UX-SPEC-wizard-v2.md:603-620`) as `onboarding.ai.intro_heading`
  etc. in `onboarding.ts`. Render them in a `data-testid="ai-intro"` block between the `<h2>`
  (`:274`) and the `.grid` (`:280`) in `OigOnboardingStepAi.render()`. **Do not** add any copy
  about `validate_config` or pricelist cross-verification (spec §5 "Not established" — explicitly
  excluded) or reference `battery_forecast/` (spec confirms zero AI ties there).

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/onboarding-step-ai.test.ts && npx tsc --noEmit
git add src/ui/features/onboarding/index.ts src/i18n/onboarding.ts src/__tests__/onboarding-step-ai.test.ts
git commit -m "feat(onboarding): AI step — R5 'K čemu je tu AI' intro block (UX-SPEC §5)"
```

**Done-criteria:** intro renders above provider cards, spec-exact copy, no unshipped-capability
claims; existing provider-card/key-verify behavior (`:218-269`) untouched.

---

## Stage S4 — i18n completeness + hassfest

### Task 23: `CS_LABELS`/`CS_HINTS` completeness parity guard

**Files:**
- Modify: `www_v2/src/i18n/fields.ts` (no content change expected if Tasks 12-22 were thorough —
  this task is the safety net)
- Test: `www_v2/src/__tests__/registry-data.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
test('every registry field key rendered by the wizard has a CS_LABELS entry (no humanised fallback reaches the screen)', () => {
  const allSections = ['modules', 'battery', 'solar', 'boiler', 'ai', 'pricing_distribution', 'pricing_supplier', 'basic'];
  for (const section of allSections) {
    for (const f of fieldsFromRegistry(fixtureFullRegistry, section)) {
      expect(f.label).not.toMatch(/_/); // a humanised fallback still contains the key's underscores-as-spaces... 
      // stronger check: assert CS_LABELS[`field.${f.key}.label`] !== undefined directly
    }
  }
});
```

Mirrors the backend's own parity-guard pattern already established at
`tests/test_config_registry.py`'s `test_registry_covers_legacy_whitelist` (from the registry-merge
plan, Task 3) — same idea, FE-side, catches exactly the class of defect RCA-R1 found.

- [ ] **Step 2: Run — verify FAIL if any task above left a gap** (expected PASS if Tasks 12-22 were
  complete — this is a regression net, not new feature work; if it fails, the gap is a bug in an
  earlier task, fix `fields.ts` directly rather than reopening that task).

- [ ] **Step 3: Implement (only if Step 2 failed).** Add whatever `CS_LABELS`/`CS_HINTS` entries the
  test reports missing.

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/registry-data.test.ts
git add src/i18n/fields.ts src/__tests__/registry-data.test.ts
git commit -m "test(i18n): CS_LABELS completeness parity guard across all wizard-v2 sections"
```

**Done-criteria:** zero registry keys used by any wizard step fall back to a humanised label —
closes off the entire RCA-R1 defect class permanently, not just the 7 fields it found.

---

### Task 24: hassfest gate

**Files:** none (verification-only task)

- [ ] **Step 1: Run the existing gate.**

```bash
scripts/run_hassfest.sh
```

- [ ] **Step 2: Fix any failure** — most likely new/changed translation keys in `strings.json`/
  `translations/cs.json` if any task above touched the HA-native layer (none should have — Stage S3
  tasks all target `www_v2/src/i18n/*.ts`, a separate layer per RCA-R1's correction — but the HA
  options-flow's own `wizard_modules`/`wizard_boiler` etc. strings are untouched by this plan, so a
  clean run is expected; a failure here signals accidental cross-layer editing, not new content).

- [ ] **Step 3: Commit any fix.**

```bash
git add -u
git commit -m "fix(i18n): hassfest gate green after wizard-v2 changes"
```

**Done-criteria:** `scripts/run_hassfest.sh` exits 0. If Step 1 is already green with no changes to
commit, record that explicitly rather than fabricating a commit.

---

## Stage S5 — cleanup of the old 3-step overlay + tests

### Task 25: Remove dead 3-step-only code paths

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/index.ts` — remove the now-unreachable trailing
  fallback branch replaced in Task 5 (verify it's actually gone, not just shadowed), remove
  `PRICING_CONFIRM_KEYS` (`:51-57`) if Task 10 made it dead code (confirm with
  `grep -n "PRICING_CONFIRM_KEYS" src/`), remove the standalone `confirmPricing`/
  `pricingSaving`/`pricingSaveError` state if fully superseded by Task 10's batch save
- Modify: `www_v2/src/ui/features/onboarding/step-pricing.ts` — delete (superseded by
  `step-pricing-distribution.ts`/`step-pricing-supplier.ts`, Task 2)

- [ ] **Step 1: Identify dead code.**

```bash
cd /repos/wt-f1-implB-launch && npx eslint --no-eslintrc --rule '{"no-unused-vars":"error"}' custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts 2>&1 | head -40
grep -rn "step-pricing\b" custom_components/oig_cloud/www_v2/src --include="*.ts" | grep -v step-pricing-distribution | grep -v step-pricing-supplier
```

- [ ] **Step 2: Delete confirmed-dead code and the `step-pricing.ts` file.** Re-run `tsc --noEmit`
  after each deletion — a compile error means something still imports it; fix the import instead of
  restoring the dead code.

- [ ] **Step 3: Run the full FE suite.**

```bash
cd custom_components/oig_cloud/www_v2 && npx vitest run
```

- [ ] **Step 4: Commit.**

```bash
git add -u
git commit -m "chore(onboarding): remove 3-step overlay dead code superseded by wizard v2"
```

**Done-criteria:** `tsc --noEmit` clean, no unused exports/state left from the 3-step design,
`step-pricing.ts` deleted.

---

### Task 26: Update/retire tests written against the 3-step shell

**Files:**
- Modify: `www_v2/src/__tests__/onboarding-mount.test.ts`, `onboarding-skip.test.ts`,
  `onboarding-soft-gate.test.ts`, `onboarding-pricing-render.test.ts`,
  `onboarding-production-launch.test.ts` — every test asserting `WIZARD_STEPS.length === 3`,
  `['ai','solar','pricing']` ordering, or the old pricing-tab-pointer copy from the removed
  fallback branch

- [ ] **Step 1: Full-suite run to enumerate every remaining 3-step-shaped failure.**

```bash
cd custom_components/oig_cloud/www_v2 && npx vitest run 2>&1 | tee /tmp/wizard-v2-fallout.txt
```

- [ ] **Step 2: For each failing test, decide retire vs. update** — a test asserting behavior the
  10-step wizard genuinely no longer has (e.g. "wizard has exactly 3 steps") is retired (delete the
  assertion, not the whole file, unless the whole file's premise is gone); a test asserting
  behavior that still holds but against stale fixtures (e.g. nav button count) is updated in place.

- [ ] **Step 3: Re-run — PASS, zero regressions against the pre-Phase-B baseline for anything NOT
  about step count/order/copy** (soft-guide skippability, bootstrap abort/retry semantics, AI
  key-verify flow — none of Stage S1-S4's changes should have touched these; a failure here is a
  real regression, not expected fallout).

```bash
cd custom_components/oig_cloud/www_v2 && npx vitest run
```

- [ ] **Step 4: Full backend suite too** (Task 1's `ONBOARDING_STEPS` expansion has backend
  fallout beyond the two files that task fixed directly).

```bash
.venv/bin/python -m pytest -q tests/
```

- [ ] **Step 5: Commit.**

```bash
git add -u
git commit -m "test(onboarding): update/retire tests against the retired 3-step shell"
```

**Done-criteria:** full FE (`vitest run`) and backend (`pytest tests/`) suites green; every
retirement is a deliberate decision recorded in the commit, not a silently-deleted assertion.

---

## Estimate summary

| Stage | Tasks | Rough estimate |
|---|---|---|
| S1 — Wizard shell | 5 (Tasks 1-5) | ~4h |
| S2 — Review-mode state | 6 (Tasks 6-11) | ~5h |
| S3 — Step content migrations | 10 (Tasks 12-21... wait — 12-22) | ~9h |
| S4 — i18n completeness + hassfest | 2 (Tasks 23-24) | ~1h |
| S5 — Cleanup | 2 (Tasks 25-26) | ~2h |
| **Total** | **26 tasks** | **~21h** |

(Stage S3 spans Tasks 12–22 inclusive — 11 tasks, not 10; table corrected in the total column,
which counts all 26 tasks correctly.)
