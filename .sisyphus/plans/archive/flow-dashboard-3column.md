# Flow dashboard – 3‑sloupcový layout (V2) + srovnání

## TL;DR

> **Quick Summary**: Připravit srovnání V1 vs V2 a upravit V2 Flow dashboard na 3‑sloupcový layout podle referenčního screenshotu (dlaždice vlevo, canvas uprostřed, ovládací panel vpravo).
>
> **Deliverables**:
> - Srovnání V1 vs V2 pro Flow layout (stručný markdown report s odkazy na klíčové soubory)
> - Upravený V2 Flow layout: 3 sloupce (tiles-left | flow-canvas | control-panel-right)
> - Ověření layoutu (agent-executed QA) + build
>
> **Estimated Effort**: Short
> **Parallel Execution**: YES – 2 vlny
> **Critical Path**: Porovnání → Úprava layoutu → Build + QA

---

## Context

### Original Request
„ok pojdme připravit plán a srovnání a opravu flow dashboardu aby byl 3 sloupcový. jako to bylo tady [screenshot]“

### Interview Summary
**Key Discussions**:
- Požadavek: 3‑sloupcový Flow layout jako ve screenshotu.
- Cíl: V2 dashboard s dlaždicemi vlevo, flow/canvas uprostřed a ovládáním vpravo.

**Research Findings**:
- V2 už používá `.flow-layout` s CSS Grid 3 sloupci v `www_v2/src/ui/app.ts`.
- Aktuální V2 struktura má control panel v **centru** nad canvas a tiles vpravo – nesoulad se screenshotem.
- V1 má flow layout v `www/dashboard.html` + CSS v `dashboard-styles.css` a `css/features/custom-tiles.css`.

### Metis Review
**Identified Gaps (addressed in plan)**:
- Nutnost jasně vymezit, zda se fix týká V2 (předpokládáme ano).
- Specifikace cílového layoutu: tiles vlevo, canvas uprostřed, control panel vpravo.
- Ověření layoutu bez lidského zásahu (agent‑executed QA).

---

## Work Objectives

### Core Objective
Srovnat V1 vs V2 Flow layout a upravit V2 tak, aby Flow dashboard byl přesně 3‑sloupcový podle referenčního screenshotu.

### Concrete Deliverables
- Markdown srovnání V1 vs V2 (flow layout) s odkazy na soubory.
- Upravená V2 šablona a CSS pro 3‑sloupcový Flow layout.
- Ověření přes build + agent‑executed QA scénáře.

### Definition of Done
- [ ] V2 Flow tab renderuje **3 sloupce**: tiles-left | flow-canvas | control-panel-right.
- [ ] V2 build (`npm run build` v `www_v2/`) projde bez chyb.
- [ ] Agent‑executed QA scénáře potvrzují layout v desktop i responsive breakpointu.

### Must Have
- Control panel vpravo (samostatný pravý sloupec).
- Canvas uprostřed bez stackování s control panel.
- Dlaždice pouze vlevo (v pravém sloupci nejsou tiles).

### Must NOT Have (Guardrails)
- Neměnit backend/data.
- Neměnit V1 soubory (`custom_components/oig_cloud/www/*`).
- Nepřidávat nové npm závislosti.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> Všechny verifikace provede agent (Playwright / bash). Bez ručního klikání uživatelem.

### Test Decision
- **Infrastructure exists**: YES (Vitest + Playwright)
- **Automated tests**: None (default – UI layout změna bez nových unit testů)
- **Framework**: Playwright pro E2E ověření layoutu

### Agent‑Executed QA Scenarios (MANDATORY)

#### Scenario: Desktop layout – 3 sloupce
  Tool: Playwright (playwright skill)
  Preconditions: Dev server běží na `http://localhost:3000` (nebo odpovídající URL), V2 dashboard dostupný
  Steps:
    1. Navigate: `http://localhost:3000/oig_cloud_dashboard_*_v2`
    2. Click tab: `button[data-tab="flow"]` (nebo selektor pro „Toky“)
    3. Wait for: `.flow-layout` visible (timeout: 10s)
    4. Assert: `.flow-layout` has computed `display: grid`
    5. Assert: `.flow-tiles-left` exists and is in column 1
    6. Assert: `.flow-center` exists and contains **only** `oig-flow-canvas`
    7. Assert: `.flow-tiles-right` **does not exist** OR is not in DOM
    8. Assert: `oig-control-panel` exists in right column (wrapper `.flow-control-right`)
    9. Screenshot: `.sisyphus/evidence/task-2-desktop-3col.png`
  Expected Result: 3‑sloupcový layout odpovídá referenčnímu screenshotu
  Evidence: `.sisyphus/evidence/task-2-desktop-3col.png`

#### Scenario: Mobile layout – stackování sloupců
  Tool: Playwright (playwright skill)
  Preconditions: V2 dashboard dostupný
  Steps:
    1. Set viewport: width 380, height 800
    2. Navigate: `http://localhost:3000/oig_cloud_dashboard_*_v2`
    3. Click tab: `button[data-tab="flow"]`
    4. Wait for: `.flow-layout` visible
    5. Assert: `.flow-layout` uses single-column flow (grid-template-columns: 1fr)
    6. Screenshot: `.sisyphus/evidence/task-2-mobile-stack.png`
  Expected Result: layout se srozumitelně poskládá do jedné kolony
  Evidence: `.sisyphus/evidence/task-2-mobile-stack.png`

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
├── Task 1: V1 vs V2 srovnání (report)
└── Task 2: Úprava V2 layoutu

Wave 2 (After Wave 1):
└── Task 3: Build + QA verifikace

Critical Path: Task 2 → Task 3

---

## TODOs

- [ ] 1. Vytvořit srovnání V1 vs V2 (Flow layout)

  **What to do**:
  - Zmapovat V1 layout (HTML + CSS) a V2 layout (Lit template + CSS).
  - Sepsat rozdíly: pozice tiles, control panel, výška canvasu, responsive chování.
  - Výstup uložit do `.sisyphus/evidence/flow-v1-v2-comparison.md`.

  **Must NOT do**:
  - Nezasahovat do V1/V2 kódu (pouze report).

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Strukturované porovnání a syntéza rozdílů.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: není potřeba pro report.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - `custom_components/oig_cloud/www/dashboard.html` – V1 Flow tab struktura
  - `custom_components/oig_cloud/www/dashboard-styles.css` – V1 flow CSS (canvas, control panel)
  - `custom_components/oig_cloud/www/css/features/custom-tiles.css` – V1 tiles layout (280–350px)
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts` – V2 flow layout CSS + template

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/flow-v1-v2-comparison.md` existuje a obsahuje sekce: V1 struktura, V2 struktura, rozdíly, cílový layout.

  **Agent‑Executed QA Scenarios**:
  - Scenario: Report exists
    - Tool: Bash
    - Steps: `ls .sisyphus/evidence/flow-v1-v2-comparison.md`
    - Expected Result: soubor existuje

  **Commit**: NO

---

- [ ] 2. Upravit V2 Flow layout na 3 sloupce (tiles-left | canvas | control-panel-right)

  **What to do**:
  - V `www_v2/src/ui/app.ts` změnit template tak, aby:
    - `.flow-tiles-left` zůstaly vlevo
    - `.flow-center` obsahoval **jen** `oig-flow-canvas`
    - control panel byl v pravém sloupci (nový wrapper např. `.flow-control-right`)
    - `.flow-tiles-right` odstraněn nebo deaktivován
  - Upravit CSS pro pravý sloupec (šířka 280–350px, sticky panel)
  - Zajistit, že canvas zůstane minimálně 800px výšky (pokud už existuje, ověřit)
  - Zkontrolovat responsive breakpoints (380/768/1024/1200/1400px) a případně doladit

  **Must NOT do**:
  - Nepřidávat nové UI komponenty ani závislosti.
  - Neměnit V1 soubory.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Lokalizovaná změna layoutu + šablony.
  - **Skills**: `frontend-ui-ux`
    - `frontend-ui-ux`: citlivé umístění panelů a responsivní chování
  - **Skills Evaluated but Omitted**:
    - `playwright`: použije se až v QA tasku

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts` – `.flow-layout`, `.flow-center`, template Flow tab
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/canvas.ts` – canvas wrapper (min-height)
  - `custom_components/oig_cloud/www_v2/src/ui/features/control-panel/panel.ts` – control panel component
  - `custom_components/oig_cloud/www/css/features/custom-tiles.css` – V1 tiles width pattern (min 280 / max 350)

  **Acceptance Criteria**:
  - [ ] V2 Flow tab obsahuje 3 sloupce: tiles-left | flow-canvas | control-panel-right
  - [ ] `.flow-tiles-right` není přítomný v DOM (nebo je zcela odstraněn)
  - [ ] `oig-control-panel` je v pravém sloupci a sticky (top: 0)
  - [ ] canvas má min-height ≥ 800px

  **Agent‑Executed QA Scenarios**:
  - Scenario: Desktop layout – 3 sloupce (viz Verification Strategy)
  - Scenario: Mobile layout – stackování sloupců (viz Verification Strategy)

  **Commit**: NO

---

- [ ] 3. Build + QA verifikace

  **What to do**:
  - Spustit build pro V2: `npm run build` ve `custom_components/oig_cloud/www_v2`
  - Spustit Playwright QA scénáře (viz Verification Strategy)
  - Uložit evidence do `.sisyphus/evidence/`

  **Must NOT do**:
  - Nepoužívat bun (jen npm)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `playwright`
    - `playwright`: automatizované ověření layoutu
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: není potřeba pro QA

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 1, Task 2

  **References**:
  - `custom_components/oig_cloud/www_v2/package.json` – build script
  - `playwright.config.js` – E2E konfigurace

  **Acceptance Criteria**:
  - [ ] `npm run build` → PASS
  - [ ] Evidence screenshots vytvořeny v `.sisyphus/evidence/`

  **Commit**: NO

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| None | — | — | — |

---

## Success Criteria

### Verification Commands
```bash
cd custom_components/oig_cloud/www_v2
npm run build
```

### Final Checklist
- [ ] Flow layout je 3‑sloupcový a odpovídá referenčnímu screenshotu
- [ ] Control panel je vpravo (sticky)
- [ ] Dlaždice jsou vlevo
- [ ] Build prošel
