# Brief — fix-boiler-fidelity-rev4

## Language — HARD

- English only: this brief, your report, code comments, commit messages. NEVER Czech.
- Keep a national or domain term in the original, in quotes: "datova schranka", "ZenBPM".
- Telegraphic English in bullets. Drop filler; keep every path, reference and acceptance line.
- No emoji, no ASCII emoticons: 2-4x the tokens of the word they replace, and >38% semantic
  confusion of which >90% is SILENT (arXiv 2601.07885).

## Context

- Repo: oig-cloud. Boiler tab v2, deployed. Owner (Martin) rejected a prior version for not
  matching the binding mock. Owner rule: "done" = strict visual match. Be strict.
- Binding visual spec (mock): `docs/redesign_2026_07/rework/BOILER-TAB-MOCK-rev3.html`
- Verification screenshots (deployed vs mock, already captured): `/tmp/verify-shots/`
  (10-boiler-viewport.png, boiler-scroll-*.png, boiler-bottom.png, mock-full.png).
- All FE code under: `custom_components/oig_cloud/www_v2/`
- Base: `f1/wizard-v2-impl` tip `2898bb63c`.

## Task — 4 fixes, same feature dir, do all in one pass

### FIX-1 draw-map density (HIGHEST visual impact)
- File: `src/ui/features/boiler/boiler-draw-map.ts`, method `_heatmapSvg()` (~line 125-158).
- Symptom: bottom-right "Mapa odberu vody" renders ALL history days (~58, ~1100px tall) instead
  of a compact 7-day card (~150px) like the mock's "Odbery vody . 7 dni".
- Root cause: `const days = dm.weekly;` ignores the `compact` flag already passed at mount
  (`src/ui/app.ts:1451`).
- Fix: `const days = this.compact ? dm.weekly.slice(-7) : dm.weekly;`
- Accept: compact card ~7 rows; whole tab ~2 screens (was ~2.7).

### FIX-2 English debug string leaking into Czech UI
- File: `src/ui/features/boiler/boiler-plan-realita-tile.ts`, line 493:
  `${s.detail ? html`<span class="s-detail">${s.detail}</span>` : nothing}`
- Symptom: literal English BE-developer explainer text renders under "Uspora (plan & realita)".
  Mock does not show it.
- Fix: DELETE line 493 (stop rendering `s.detail`). Do NOT touch the Python backend
  (`api/ha_rest_api.py` — out of scope, read-only if you look at all).
- Accept: no English text anywhere under Uspora.

### FIX-3 Czech decimal comma across the boiler tab (locale)
- Symptom: dots instead of commas — "2.0 kW", "4.84 kWh", "0.3 kWh", "+19.20 Kc", "0.00 kWh".
  Mock uses comma throughout; "Energie dnes" already uses comma, so today it is inconsistent
  within one tab.
- Sites to fix:
  - `src/ui/features/boiler/format.ts` — `formatKwh`, `formatCzk`, `formatKw`, `formatTempC`,
    `formatTempTrendCPerMin` all emit `.toFixed(...)` with a dot. Route through the Czech-comma
    pattern already used in `boiler-energy-today.ts:146` and `boiler-metric-panel.ts`
    (`.replace('.', ',')`).
  - `src/ui/features/boiler/boiler-hero-flow.ts` — inline dots: heater kW (~line 500,
    `(heaterPowerW / 1000).toFixed(1)`), demand-node kWh (~line 514,
    `${Math.round(...*10)/10} kWh`).
  - `src/ui/features/boiler/boiler-energy-today.ts:142` — savings `${savings.toFixed(1)} Kc`
    (no replace today) — add comma.
- Tests to UPDATE in the same pass (these currently encode the OLD dot behaviour — change the
  expected strings to comma, do not weaken the assertion):
  - `src/__tests__/boiler-format.test.ts` (lines ~13, 14, 18, 22)
  - `src/__tests__/boiler-v2-ui.test.ts` (~744, 745, 746, 814, 817, 818, 857, 1250, 1254, 1270, 1954)
  - `src/__tests__/boiler-f4-energy-today.test.ts` (~277, 284, 299)
- Do NOT touch `src/__tests__/onboarding-pricing-distribution.test.ts` — different, non-boiler
  pricing formatter, out of scope.
- Accept: every number in the boiler tab renders with a comma.

### FIX-4a hero KPI "Prísti ohrev" duplicated label
- File: `src/ui/features/boiler/boiler-hero-flow.ts`, `_nextHeatingLabel()` (~line 533-543).
- Symptom: KPI shows label "Prísti ohrev" then value "Prísti ohrev --" — word repeated.
- Root cause: when `kwh <= 0` the method returns
  `${t('boiler.plan.next_action')} ${t('boiler.hero.next_heating_dash')}`, but the KPI's own
  label (line ~405) is ALREADY `t('boiler.plan.next_action')`.
- Fix: when `kwh <= 0`, return just `t('boiler.hero.next_heating_dash', lang)` (= "--").
- Accept: KPI shows "Prísti ohrev / --" (or "time . source . kWh" when heating scheduled). No
  repeated words.

### FIX-4c (OPTIONAL, attempt only if the above 4 land cleanly and you have budget left)
- Mock hero right column has 3 nodes: "Odbery dnes" (today total L + peak), "Dalsi ocekavany",
  "Cirkulace". Deployed renders only the last two. i18n key `boiler.hero.node_draws` = "Odbery
  dnes" already exists but is unused.
- Would need: pass `.drawMap` into `oig-boiler-hero-flow` (mount at `src/ui/app.ts` ~line
  1418-1431), compute today's total liters + peak window from drawMap, add a 3rd right node,
  reposition the right-column geometry/connectors.
- This is layout-risky. Only ship it if it lands clean without disturbing the existing hero
  layout. Otherwise SKIP it and say so explicitly in your report — do not ship a broken hero.

## Explicitly OUT OF SCOPE — do not attempt, note only if relevant
- "Cena dnes" KPI missing (data-dependent, not a render bug — needs a BE-side null to be
  resolved). Do not fabricate a value.
- Soulad% / Prubeh% / Predikce absent from plan&realita — pending separate BE persistence work.
- Any backend Python change.

## Scope fence — files you may touch
- `custom_components/oig_cloud/www_v2/src/ui/features/boiler/**`
- `custom_components/oig_cloud/www_v2/src/__tests__/**` (only the boiler-related test files
  named above)
- `custom_components/oig_cloud/www_v2/src/ui/app.ts` (only if you attempt FIX-4c)

## Do NOT

- Do not commit. The integrator reviews and commits.
- Do not run a slow build/test gate: end at "written, here are the FILES CHANGED" and STOP. No
  `npx tsc`, no `npx vitest run`, no `npm run build` — the integrator runs the gate.
- Do not touch backend Python, `onboarding-pricing-distribution.test.ts`, or any file outside
  the scope fence above.
- Do not weaken a test assertion to make it pass — fix the expected value to match the new
  (correct) comma behaviour.

TASK: fe/fix

MILESTONES (4):
1 (25%) read mock + diagnosed files
2 (50%) implement FIX-1..4a
3 (75%) update tests for FIX-3
4 (100%) STOP and report FILES CHANGED

## When you finish

STOP and report what you changed, what you verified, and — explicitly — anything you could NOT establish.
