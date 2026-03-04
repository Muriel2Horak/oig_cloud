# V2-V1 Full Parity — Konsolidovaný plán

## TL;DR

> **Quick Summary**: Uzavřít VŠECHNY identifikované gapy (G1-G9) mezi V1 a V2 dashboardem. Hlavní práce je restrukturalizace Flow tab layoutu z vertikálního stacku na 3-zónový layout s tiles po stranách flow canvasu (G1-G4). Sekundární práce jsou vizuální vylepšení (G5-G9).
> 
> **Deliverables**:
> - Restrukturalizovaný Flow tab layout (tiles left/right po stranách canvasu)
> - Sticky control panel nahoře
> - Zvětšený canvas (min-height 800px)
> - Header s gradient textem a 5-úrovňovým ČHMÚ badge
> - Responsivní breakpointy (380px, 768px, 1024px, 1200px)
> - Chybějící animace (slideUp, popIn, value-pop, value-roll)
> - Last update indikátor
>
> **Estimated Effort**: Medium-Large
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 6 (deploy)

---

## Context

### Original Request
Uživatel zjistil, že V2 dashboard nevypadá jako V1 — hlavně Flow tab má špatný layout (vše vertikálně pod sebou místo tiles po stranách). Požaduje kompletní GAP analýzu a jeden konsolidovaný plán pro uzavření VŠECH gapů.

### Interview Summary
**Key Discussions**:
- Kompletní code-level GAP analýza V1 vs V2 provedena (9 gapů identifikováno)
- Uživatel vybral "Všechny gapy (G1-G9)" pro uzavření
- V2 má plnou funkční paritu v nodech, control panelu, tiles, boileru, pricingu
- Hlavní problém je LAYOUT — V2 stackuje vertikálně, V1 má 3-zónový overlay

### GAP Analysis Summary

| Gap | Popis | Priorita | Effort |
|-----|-------|----------|--------|
| G1 | Flow layout: vertical stack → 3-zone | 🔴 KRITICKÝ | Velký |
| G2 | Tiles pozice: merged dole → left/right po stranách | 🔴 KRITICKÝ | Součást G1 |
| G3 | Control panel: pod canvasem → sticky nahoře | 🔴 KRITICKÝ | Součást G1 |
| G4 | Canvas výška: 500px → 800px+ | 🔴 KRITICKÝ | Malý |
| G5 | ČHMÚ badge: 2 stavy → 5 úrovní + pulse | 🟡 STŘEDNÍ | Malý |
| G6 | Header gradient text | 🟡 STŘEDNÍ | Malý |
| G7 | Responsivita: 1 breakpoint → 5 breakpointů | 🟡 STŘEDNÍ | Střední |
| G8 | Chybějící animace (slideUp, popIn, value-pop, value-roll) | 🟢 MINOR | Malý |
| G9 | Last update indikátor | 🟢 MINOR | Malý |

---

## Work Objectives

### Core Objective
Dosáhnout vizuální a layoutové parity V2 dashboardu s V1. Po dokončení musí Flow tab vypadat jako V1 — tiles po stranách canvasu, control panel nahoře, správné rozměry a responsive chování.

### Concrete Deliverables
- `www_v2/src/ui/app.ts` — restrukturalizovaný Flow tab layout + responsive breakpointy
- `www_v2/src/ui/features/flow/canvas.ts` — zvětšený canvas
- `www_v2/src/ui/features/tiles/tile.ts` — tiles container s position-aware renderem
- `www_v2/src/ui/components/header.ts` — gradient title + 5-level ČHMÚ + last update
- `www_v2/src/ui/theme.ts` — nové CSS proměnné pro ČHMÚ barvy (pokud chybí)
- Built `www_v2/dist/` — nasazený výstup

### Definition of Done
- [x] Flow tab má 3-zónový layout: tiles-left | canvas + connections | tiles-right
- [x] Control panel je sticky nahoře flow tabu
- [x] Canvas má min-height ≥ 800px
- [x] Tiles jsou rozděleny na left/right skupiny
- [x] ČHMÚ badge zobrazuje 5 úrovní s příslušnými barvami
- [x] Header titul má gradient
- [x] Dashboard reaguje na 5 breakpointů (380, 768, 1024, 1200, 1400px)
- [x] Animace slideUp, popIn, value-pop, value-roll fungují
- [x] Last update indikátor je viditelný v headeru
- [x] `npm run build` projde bez chyb
- [x] Deploy na HA proběhne úspěšně
- [x] Vizuální verifikace na https://ha.muriel-cz.cz

### Must Have
- V1-like 3-zone Flow layout
- Tiles left/right separace
- Sticky control panel
- Responsive breakpointy
- Build pass + successful deploy

### Must NOT Have (Guardrails)
- ❌ Žádné změny V1 souborů (`www/js/`, `www/*.html`, `www/*.css`)
- ❌ Žádné nové npm závislosti
- ❌ Žádné nové Web Components (použít existující)
- ❌ Žádné změny backendu/dat
- ❌ Žádné modifikace `deploy_to_ha.sh`
- ❌ MAX_PARTICLES zůstává ≤ 50
- ❌ Žádné `position: absolute` na nodech — V2 používá CSS Grid (zachovat)
- ❌ Nepoužívat `bun` pro build — jen `npm run build`
- ❌ Neměnit funkční logiku nodů, panelu, tiles — jen layout a vizuály
- ❌ Žádný AI slop: nepřidávat zbytečné komentáře, JSDoc, extra error handling

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: NO (žádný test framework ve www_v2/)
- **Automated tests**: NO
- **Framework**: none

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Frontend/UI** | Playwright (playwright skill) | Navigate to HA dashboard, screenshot, assert DOM |
| **Build** | Bash (npm run build) | Must exit 0, no errors |
| **Deploy** | Bash (deploy script) | Must complete successfully |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — ALL INDEPENDENT):
├── Task 1: Flow layout restructuring (G1+G2+G3+G4) — hlavní práce
├── Task 4: Header improvements (G5+G6+G9)
└── Task 5: Missing animations (G8)

Wave 2 (After Wave 1):
├── Task 2: Responsive breakpoints (G7) — depends on Task 1 layout
└── Task 3: Build & lint check

Wave 3 (After Wave 2):
└── Task 6: Deploy + Full Visual Verification
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | 4, 5 |
| 4 | None | 3 | 1, 5 |
| 5 | None | 3 | 1, 4 |
| 2 | 1 | 3 | None |
| 3 | 1, 2, 4, 5 | 6 | None |
| 6 | 3 | None | None (final) |

---

## TODOs

- [x] 1. Flow Tab Layout Restructuring (G1 + G2 + G3 + G4)

  **What to do**:

  Restrukturalizovat Flow tab z vertikálního stacku na 3-zónový layout odpovídající V1.

  **Krok 1 — app.ts: Změnit `.flow-layout` CSS (řádky 209-228)**

  Současný stav:
  ```css
  .flow-layout { display: flex; flex-direction: column; gap: 12px; }
  .flow-center { display: flex; flex-direction: column; gap: 12px; }
  .flow-tiles-stack { width: 100%; }
  ```

  Cílový stav — 3-sloupcový layout:
  ```css
  .flow-layout {
    display: grid;
    grid-template-columns: minmax(280px, 350px) 1fr minmax(280px, 350px);
    grid-template-rows: auto 1fr;
    gap: 12px;
    width: 100%;
    min-height: 0;
  }

  .flow-tiles-left {
    grid-column: 1;
    grid-row: 1 / -1;
    align-self: start;
  }

  .flow-center {
    grid-column: 2;
    grid-row: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .flow-tiles-right {
    grid-column: 3;
    grid-row: 1 / -1;
    align-self: start;
  }
  ```

  **Krok 2 — app.ts: Změnit Flow tab HTML render (řádky 744-763)**

  Současný stav:
  ```html
  <div class="flow-layout">
    <div class="flow-center">
      <oig-flow-canvas ...></oig-flow-canvas>
      <oig-control-panel></oig-control-panel>
    </div>
    <div class="flow-tiles-stack">
      <oig-tiles-container .tiles=${[...this.tilesLeft, ...this.tilesRight]}></oig-tiles-container>
    </div>
  </div>
  ```

  Cílový stav:
  ```html
  <div class="flow-layout">
    <div class="flow-tiles-left">
      <oig-tiles-container
        .tiles=${this.tilesLeft}
        .editMode=${this.editMode}
        position="left"
        @edit-tile=${this.onEditTile}
        @delete-tile=${this.onDeleteTile}
      ></oig-tiles-container>
    </div>

    <div class="flow-center">
      <oig-control-panel></oig-control-panel>
      <oig-flow-canvas
        .data=${this.flowData}
        particlesEnabled
        .active=${this.activeTab === 'flow'}
        .editMode=${this.editMode}
      ></oig-flow-canvas>
    </div>

    <div class="flow-tiles-right">
      <oig-tiles-container
        .tiles=${this.tilesRight}
        .editMode=${this.editMode}
        position="right"
        @edit-tile=${this.onEditTile}
        @delete-tile=${this.onDeleteTile}
      ></oig-tiles-container>
    </div>
  </div>
  ```

  Klíčové změny:
  - Tiles rozděleny na `this.tilesLeft` a `this.tilesRight` (v2 app.ts je už má separátně — `this.tilesLeft` a `this.tilesRight` existují v řádku 757)
  - Control panel přesunut NAD canvas (V1 pattern: sticky at top)
  - Přidán `position` atribut na `oig-tiles-container`

  **Krok 3 — app.ts: Control panel sticky CSS**

  Přidat do `.flow-center`:
  ```css
  oig-control-panel {
    position: sticky;
    top: 0;
    z-index: 5;
  }
  ```

  **Krok 4 — canvas.ts: Zvětšit canvas min-height (řádek 64)**

  Změnit:
  ```css
  .flow-grid-wrapper { min-height: 500px; }
  ```
  Na:
  ```css
  .flow-grid-wrapper { min-height: 800px; }
  ```

  **Krok 5 — tile.ts: Ověřit position property**

  V `OigTilesContainer` (řádek 181) už existuje `position: 'left' | 'right'` property. NEMĚNIT — jen se nyní využije v app.ts rendereru.

  **Must NOT do**:
  - Neměnit node positions/grid — V2 používá CSS Grid, NE absolute positioning
  - Neměnit particle system
  - Neměnit tile component interní rendering
  - Nepřidávat position: absolute na tiles — V1 to dělá, ale V2 má čistší Grid přístup
  - Nekopírovat V1 absolute positioning pattern — adaptovat koncept do CSS Grid

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Layout restructuring je primárně CSS/HTML práce s vizuálním výstupem
  - **Skills**: [`playwright`]
    - `playwright`: Potřeba pro vizuální verifikaci na reálném HA dashboardu

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 4, 5)
  - **Blocks**: Task 2 (responsive), Task 3 (build)
  - **Blocked By**: None

  **References**:

  **Pattern References (V1 — jak to má vypadat):**
  - `www/css/features/custom-tiles.css:1-43` — V1 tile positioning: `.custom-tiles-section { position: absolute; z-index: 10; }`, `.tiles-block { flex: 0 1 350px; max-width: 350px; min-width: 280px; }`, `#tiles-left { margin-right: auto; }`, `#tiles-right { margin-left: auto; }` — Tyto hodnoty (350px max, 280px min) použít jako vodítko pro grid-template-columns v V2
  - `www/dashboard.html:210-226` — V1 HTML: `<div class="custom-tiles-section"><div class="tiles-container"><div class="tiles-block" id="tiles-left">...</div><div class="tiles-block" id="tiles-right">...</div></div></div>` — tiles-left a tiles-right jsou VEDLE sebe přes celou šířku canvasu s `justify-content: space-between`

  **V2 soubory k editaci:**
  - `www_v2/src/ui/app.ts:209-228` — CSS pro `.flow-layout`, `.flow-center`, `.flow-tiles-stack` — TOTO PŘEPSAT na 3-sloupcový grid
  - `www_v2/src/ui/app.ts:744-763` — HTML render Flow tabu — TOTO PŘEPSAT na 3-zónovou strukturu
  - `www_v2/src/ui/features/flow/canvas.ts:61-65` — `.flow-grid-wrapper { min-height: 500px; }` — ZMĚNIT na 800px
  - `www_v2/src/ui/features/tiles/tile.ts:177-219` — `OigTilesContainer` — má `position` prop na řádku 181, grid layout na 186 — NEMĚNIT, jen ověřit funguje s oddělenými kontejnery

  **Data References:**
  - `www_v2/src/ui/app.ts:757` — `[...this.tilesLeft, ...this.tilesRight]` — zde se tiles slučují, ROZDĚLIT na dva separátní kontejnery
  - `www_v2/src/ui/app.ts:724-730` — `leftPanelCollapsed` a `rightPanelCollapsed` properties — header toggle buttons je ovládají, po restrukturalizaci je napojit na viditelnost tiles-left/tiles-right

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Flow tab má 3-sloupcový layout
    Tool: Playwright (playwright skill)
    Preconditions: npm run build proběhl, deploy na HA proběhl, dev server na https://ha.muriel-cz.cz
    Steps:
      1. Navigate to: https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac_v2
      2. Wait for: oig-flow-canvas visible (timeout: 15s)
      3. Assert: .flow-layout has CSS display: grid
      4. Assert: .flow-tiles-left exists and is visible (width > 0)
      5. Assert: .flow-tiles-right exists and is visible (width > 0)
      6. Assert: .flow-tiles-left is positioned LEFT of .flow-center (x-offset comparison)
      7. Assert: .flow-tiles-right is positioned RIGHT of .flow-center
      8. Assert: oig-control-panel is inside .flow-center
      9. Assert: oig-control-panel y-position < oig-flow-canvas y-position (panel ABOVE canvas)
      10. Screenshot: .sisyphus/evidence/task-1-flow-layout.png
    Expected Result: 3-column layout visible with tiles on sides
    Evidence: .sisyphus/evidence/task-1-flow-layout.png

  Scenario: Tiles jsou rozděleny na left a right
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to V2 dashboard
      2. Assert: .flow-tiles-left contains oig-tiles-container
      3. Assert: .flow-tiles-right contains oig-tiles-container
      4. Assert: Left container has tiles (childElementCount > 0 OR empty state text)
      5. Assert: Right container has tiles (childElementCount > 0 OR empty state text)
      6. Screenshot: .sisyphus/evidence/task-1-tiles-split.png
    Expected Result: Two separate tile containers, one on each side
    Evidence: .sisyphus/evidence/task-1-tiles-split.png

  Scenario: Canvas má zvětšenou výšku
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to V2 dashboard
      2. Evaluate: document.querySelector('oig-flow-canvas').shadowRoot.querySelector('.flow-grid-wrapper').offsetHeight
      3. Assert: height >= 800
      4. Screenshot: .sisyphus/evidence/task-1-canvas-height.png
    Expected Result: Canvas wrapper is at least 800px tall
    Evidence: .sisyphus/evidence/task-1-canvas-height.png
  ```

  **Evidence to Capture:**
  - [ ] .sisyphus/evidence/task-1-flow-layout.png
  - [ ] .sisyphus/evidence/task-1-tiles-split.png
  - [ ] .sisyphus/evidence/task-1-canvas-height.png

  **Commit**: YES (group with 4, 5)
  - Message: `feat(dashboard-v2): restructure flow tab to 3-column layout with side tiles`
  - Files: `www_v2/src/ui/app.ts`, `www_v2/src/ui/features/flow/canvas.ts`
  - Pre-commit: `npm run build` (in www_v2/)

---

- [x] 2. Responsive Breakpoints (G7)

  **What to do**:

  Přidat 5 responsive breakpointů do app.ts matching V1 pattern. V1 používá `transform: scale()` a různé `--node-*` CSS proměnné per breakpoint.

  V2 adaptace: místo `transform: scale()` na celém canvasu (V1 pattern) použít CSS Grid adjustments + font-size scaling, protože V2 používá CSS Grid pro node layout (ne absolute positioning).

  **Breakpointy k přidání do app.ts static styles:**

  ```css
  /* Extra small phones ≤380px */
  @media (max-width: 380px) {
    .flow-layout {
      grid-template-columns: 1fr;
    }
    .flow-tiles-left,
    .flow-tiles-right {
      grid-column: 1;
      grid-row: auto;
    }
    .flow-center {
      grid-column: 1;
    }
  }

  /* Mobile ≤768px */
  @media (max-width: 768px) {
    .flow-layout {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .flow-tiles-left,
    .flow-tiles-right {
      grid-column: 1;
      grid-row: auto;
    }
    .flow-center {
      grid-column: 1;
    }
  }

  /* Tablet portrait 769-1024px */
  @media (min-width: 769px) and (max-width: 1024px) {
    .flow-layout {
      grid-template-columns: minmax(200px, 280px) 1fr minmax(200px, 280px);
      gap: 8px;
    }
  }

  /* Desktop 1200px+ */
  @media (min-width: 1200px) {
    .flow-layout {
      grid-template-columns: minmax(280px, 350px) 1fr minmax(280px, 350px);
      gap: 16px;
    }
  }

  /* Large desktop 1400px+ */
  @media (min-width: 1400px) {
    .flow-layout {
      max-width: 1600px;
      margin: 0 auto;
    }
  }
  ```

  Na mobilu (≤768px): tiles se přesunou pod canvas (single column fallback) — to je přirozené chování pro dotykové zařízení.

  **Must NOT do**:
  - Nepoužívat `transform: scale()` na V2 grid — to je V1 pattern pro absolute positioned nodes
  - Neměnit flow node interní responsive (node.ts řádek 481 už má vlastní `@media (max-width: 768px)`)
  - Neodstraňovat existující breakpointy v app.ts (řádky 294-311)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Responsive CSS práce s vizuální verifikací
  - **Skills**: [`playwright`]
    - `playwright`: Testování různých viewport sizes

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 3 (build)
  - **Blocked By**: Task 1 (layout must exist first)

  **References**:

  **Pattern References (V1 responsive):**
  - `www/dashboard-styles.css:2331-2342` — V1 `@media (width <= 380px)`: `.flow-canvas { transform: scale(0.78); height: 650px; }` — V2 ekvivalent: single column layout
  - `www/dashboard-styles.css:2345-2406` — V1 `@media (width >= 769px) and (width <= 1024px) and (orientation: portrait)`: `.flow-canvas { height: 650px; transform: scale(0.95); max-width: 650px; }` — V2 ekvivalent: zmenšené grid columns
  - `www/dashboard-styles.css:2411-2416` — V1 `@media (width >= 769px) and (width <= 1200px) and (orientation: landscape)`: `transform: scale(0.75)` — V2: medium grid columns
  - `www/dashboard-styles.css:1981-1990` — V1 `@media (width >= 1400px)` — large desktop styling

  **V2 soubory k editaci:**
  - `www_v2/src/ui/app.ts:292-311` — Existující responsive sekce — ROZŠÍŘIT o nové breakpointy
  - `www_v2/src/ui/features/flow/node.ts:481` — NEMĚNIT — node.ts má vlastní responsive grid na 768px

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Mobile layout (375px) stacks vertically
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport to 375x812 (iPhone SE)
      2. Navigate to V2 dashboard
      3. Wait for oig-flow-canvas visible
      4. Assert: .flow-layout has single column layout (computed grid-template-columns = "1fr" or all children same x-offset)
      5. Assert: tiles appear BELOW canvas (y-offset comparison)
      6. Screenshot: .sisyphus/evidence/task-2-mobile-375.png
    Expected Result: Single column layout on mobile
    Evidence: .sisyphus/evidence/task-2-mobile-375.png

  Scenario: Tablet layout (1024px) has 3 columns with smaller tiles
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport to 1024x768
      2. Navigate to V2 dashboard
      3. Assert: .flow-layout has 3 columns (tiles visible on sides)
      4. Assert: tile containers are narrower than desktop
      5. Screenshot: .sisyphus/evidence/task-2-tablet-1024.png
    Expected Result: 3-column layout with reduced tile widths
    Evidence: .sisyphus/evidence/task-2-tablet-1024.png

  Scenario: Desktop layout (1400px+) has full 3-column with max-width
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport to 1440x900
      2. Navigate to V2 dashboard
      3. Assert: .flow-layout has 3 columns
      4. Assert: tiles have max-width ~350px
      5. Screenshot: .sisyphus/evidence/task-2-desktop-1440.png
    Expected Result: Full 3-column desktop layout
    Evidence: .sisyphus/evidence/task-2-desktop-1440.png
  ```

  **Evidence to Capture:**
  - [ ] .sisyphus/evidence/task-2-mobile-375.png
  - [ ] .sisyphus/evidence/task-2-tablet-1024.png
  - [ ] .sisyphus/evidence/task-2-desktop-1440.png

  **Commit**: YES
  - Message: `feat(dashboard-v2): add responsive breakpoints for flow layout`
  - Files: `www_v2/src/ui/app.ts`
  - Pre-commit: `npm run build` (in www_v2/)

---

- [x] 3. Build & Lint Verification

  **What to do**:

  Po dokončení Tasks 1, 2, 4, 5 spustit `npm run build` v `www_v2/` a ověřit, že vše kompiluje bez chyb.

  **Kroky:**
  1. `cd custom_components/oig_cloud/www_v2 && npm run build`
  2. Ověřit exit code 0
  3. Ověřit, že `dist/` obsahuje výstupní soubory
  4. Zkontrolovat, že žádné TypeScript chyby

  **Must NOT do**:
  - Nepoužívat `bun` — jen `npm run build`
  - Neignorovat TypeScript chyby

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Jednoduchý build command
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after all code changes)
  - **Blocks**: Task 6 (deploy)
  - **Blocked By**: Tasks 1, 2, 4, 5

  **References**:
  - `www_v2/package.json` — build script definice
  - `www_v2/tsconfig.json` — TypeScript konfigurace

  **Acceptance Criteria**:

  ```
  Scenario: npm run build succeeds
    Tool: Bash
    Steps:
      1. cd custom_components/oig_cloud/www_v2
      2. npm run build
      3. Assert: exit code 0
      4. Assert: dist/ directory contains .js files
      5. Assert: No "error" in build output (case-insensitive, excluding sourcemap warnings)
    Expected Result: Clean build with output files
    Evidence: Build output captured
  ```

  **Commit**: NO (build artifacts are not committed, or committed with deploy)

---

- [x] 4. Header Improvements (G5 + G6 + G9)

  **What to do**:

  Vylepšit header komponentu: gradient title text, 5-level ČHMÚ badge, last update indikátor.

  **Krok 1 — header.ts: Gradient title (G6)**

  Současný stav (řádek 26-33):
  ```css
  .title {
    font-size: 18px;
    font-weight: 500;
    color: ${u(CSS_VARS.textPrimary)};
  }
  ```

  Přidat gradient:
  ```css
  .title {
    font-size: 18px;
    font-weight: 500;
    background: linear-gradient(135deg, ${u(CSS_VARS.accent)}, #00d4ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  ```

  **Krok 2 — header.ts: 5-level ČHMÚ badge (G5)**

  Současný stav (řádek 138): jen `warning` nebo `ok` class.

  Změnit na 5 úrovní:
  - Level 0: `ok` (zelená — `CSS_VARS.success`)
  - Level 1: `minor` (žlutá — `#f5c542`)
  - Level 2: `moderate` (oranžová — `CSS_VARS.warning`)
  - Level 3: `severe` (červená — `CSS_VARS.error`) + pulse animace
  - Level 4: `extreme` (fialová — `#9b59b6`) + pulse animace

  Přidat nový property `alertSeverity` (Number, 0-4) nebo vypočítat z existujícího `alertCount` + `effectiveSeverity` předávaného z app.ts.

  Nejlepší přístup: přidat `@property({ type: Number }) alertSeverity = 0;` do header.ts, protože `effectiveSeverity` je již k dispozici v app.ts řádek 715 (`this.chmuData.effectiveSeverity`).

  V app.ts render (řádek 719-731) přidat: `.alertSeverity=${this.chmuData.effectiveSeverity}`

  V header.ts změnit status-badge třídu:
  ```typescript
  private getSeverityClass(): string {
    if (this.alertCount === 0) return 'ok';
    switch(this.alertSeverity) {
      case 1: return 'minor';
      case 2: return 'moderate';
      case 3: return 'severe';
      case 4: return 'extreme';
      default: return 'warning';
    }
  }
  ```

  Přidat CSS třídy:
  ```css
  .status-badge.minor { background: #f5c542; color: #333; }
  .status-badge.moderate { background: var(--oig-warning); color: #fff; }
  .status-badge.severe { background: var(--oig-error); color: #fff; animation: pulse 2s infinite; }
  .status-badge.extreme { background: #9b59b6; color: #fff; animation: pulse 1.5s infinite; }
  ```

  **Krok 3 — header.ts: Last update indikátor (G9)**

  Přidat nový property:
  ```typescript
  @property({ type: String }) lastUpdate = '';
  ```

  V app.ts render přidat: `.lastUpdate=${this.lastUpdateFormatted}` (pokud existuje) NEBO použít existující `this.time` — ověřit co `this.time` obsahuje. Pokud `this.time` je aktuální čas, přidat separátní `lastUpdate` s timestamp posledního data refresh.

  V header.ts render přidat za `.time`:
  ```html
  ${this.lastUpdate ? html`<span class="last-update">Aktualizováno: ${this.lastUpdate}</span>` : null}
  ```

  **Must NOT do**:
  - Neměnit header layout (flex row) — jen přidat vizuální vylepšení
  - Neměnit event handling (status-click, edit-click, etc.)
  - Neodstraňovat existující V2 badge

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Vizuální CSS/HTML vylepšení headeru
  - **Skills**: [`playwright`]
    - `playwright`: Verifikace vizuálních změn na HA

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 5)
  - **Blocks**: Task 3 (build)
  - **Blocked By**: None

  **References**:

  **V1 reference:**
  - `www/dashboard-styles.css` — hledat `.dashboard-title` nebo gradient text pattern — V1 používá CSS gradient na titulku
  - `www/dashboard.html` — ČHMÚ badge render s 5 severity levels
  - `www/css/variables.css` — barvy pro ČHMÚ severity

  **V2 soubory k editaci:**
  - `www_v2/src/ui/components/header.ts:1-176` — CELÝ soubor — přidat gradient, severity levels, last update
  - `www_v2/src/ui/app.ts:715` — `this.chmuData.effectiveSeverity` — předat do headeru jako alertSeverity
  - `www_v2/src/ui/app.ts:719-731` — Header render — přidat `.alertSeverity` a `.lastUpdate` properties

  **Data flow:**
  - `www_v2/src/data/` — Zkontrolovat odkud pochází `this.chmuData` a zda má `effectiveSeverity` (0-4) — ANO, je to v app.ts řádek 715

  **Acceptance Criteria**:

  ```
  Scenario: Header title has gradient
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to V2 dashboard
      2. Wait for oig-header visible
      3. Evaluate: getComputedStyle on .title — check background-image contains 'gradient'
      4. Screenshot: .sisyphus/evidence/task-4-header-gradient.png
    Expected Result: Title text has visible gradient effect
    Evidence: .sisyphus/evidence/task-4-header-gradient.png

  Scenario: ČHMÚ badge reflects severity level
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to V2 dashboard
      2. Inspect oig-header shadow DOM for .status-badge
      3. Assert: badge has appropriate class (ok/minor/moderate/severe/extreme) based on data
      4. If severity >= 3: Assert pulse animation exists on badge
      5. Screenshot: .sisyphus/evidence/task-4-chmu-badge.png
    Expected Result: Badge shows correct severity class and animation
    Evidence: .sisyphus/evidence/task-4-chmu-badge.png
  ```

  **Evidence to Capture:**
  - [ ] .sisyphus/evidence/task-4-header-gradient.png
  - [ ] .sisyphus/evidence/task-4-chmu-badge.png

  **Commit**: YES (group with 1, 5)
  - Message: `feat(dashboard-v2): enhance header with gradient title and 5-level ČHMÚ badge`
  - Files: `www_v2/src/ui/components/header.ts`, `www_v2/src/ui/app.ts`

---

- [x] 5. Missing Animations (G8)

  **What to do**:

  Přidat chybějící CSS animace do app.ts: `slideUp`, `popIn`, `value-pop`, `value-roll`.

  V2 app.ts má nyní jen `fadeIn` (řádek 278-281). Přidat:

  ```css
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes popIn {
    0% { opacity: 0; transform: scale(0.8); }
    70% { transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }

  @keyframes value-pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }

  @keyframes value-roll {
    0% { opacity: 0; transform: translateY(-10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  ```

  Tyto animace budou k dispozici pro použití v komponentách (nodes, tiles, etc.) ale NEAPLIKOVAT je automaticky na všechny elementy — jen definovat v globálním scope.

  Poznámka: V LitElement tyto animace musí být definovány buď v app.ts (host level) nebo v příslušných komponentách kde se používají. Protože V2 nodes/tiles jsou Shadow DOM komponenty, animace definované v app.ts nebudou viditelné uvnitř shadow roots. Řešení:
  - Definovat jako shared CSS v `theme.ts` exportovaný jako `css` template
  - NEBO přidat přímo do komponent kde se používají (node.ts, tile.ts)
  - Nejlepší přístup: přidat do `theme.ts` jako exportovaný `ANIMATIONS` css constant, a importovat v relevantních komponentách

  **Must NOT do**:
  - Nepřidávat animace na elementy, které je v V1 nemají
  - Neměnit existující pulse/spin/modePulse animace
  - Neaplikovat automaticky na všechny mount events

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Přidání CSS keyframes je jednoduchá úprava
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 4)
  - **Blocks**: Task 3 (build)
  - **Blocked By**: None

  **References**:

  **V1 reference:**
  - `www/css/utils/animations.css` — V1 definice animací (fadeIn, slideUp, popIn, value-pop, value-roll, spin)
  - `www/dashboard-styles.css` — kde se animace používají

  **V2 soubory k editaci:**
  - `www_v2/src/ui/theme.ts` — přidat exportovaný `SHARED_ANIMATIONS` css block
  - `www_v2/src/ui/app.ts:277-281` — existující `@keyframes fadeIn` — přidat další animace pod něj
  - `www_v2/src/ui/features/flow/node.ts` — pokud node.ts má vlastní static styles, importovat SHARED_ANIMATIONS

  **Acceptance Criteria**:

  ```
  Scenario: Animations are defined and available
    Tool: Bash
    Steps:
      1. grep -c "slideUp\|popIn\|value-pop\|value-roll" www_v2/src/ui/app.ts (or theme.ts)
      2. Assert: count >= 4 (all 4 animations found)
      3. npm run build → exit code 0
    Expected Result: All 4 animation keyframes defined, build succeeds
    Evidence: grep output + build output
  ```

  **Commit**: YES (group with 1, 4)
  - Message: `feat(dashboard-v2): add missing CSS animations for V1 parity`
  - Files: `www_v2/src/ui/theme.ts` or `www_v2/src/ui/app.ts`

---

- [x] 6. Deploy & Full Visual Verification

  **What to do**:

  Deploy na HA a provést kompletní vizuální verifikaci všech gapů.

  **Kroky:**
  1. Build: `npm run build` v `www_v2/`
  2. Deploy: `SMB_MOUNT="/private/tmp/ha_mount" ./deploy_to_ha.sh`
  3. Počkat na restart HA
  4. Vizuální verifikace všech 9 gapů na https://ha.muriel-cz.cz

  **Must NOT do**:
  - Nemodifikovat deploy_to_ha.sh
  - Nepřidávat přepínače k deploy příkazu
  - Nespouštět deploy bez úspěšného buildu

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Deploy + verifikace, ne code work
  - **Skills**: [`playwright`]
    - `playwright`: Kompletní vizuální verifikace na live HA

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None
  - **Blocked By**: Task 3 (build must pass)

  **References**:
  - `deploy_to_ha.sh` — deploy skript (NEČÍST, jen spustit)
  - V2 URL: `https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac_v2`
  - V1 URL pro referenci: `https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac`

  **Acceptance Criteria**:

  ```
  Scenario: Deploy succeeds
    Tool: Bash
    Steps:
      1. cd custom_components/oig_cloud/www_v2 && npm run build
      2. Assert: exit code 0
      3. cd ../../.. (back to repo root)
      4. SMB_MOUNT="/private/tmp/ha_mount" ./deploy_to_ha.sh
      5. Assert: deploy script completes (exit code 0)
      6. Wait 30 seconds for HA restart
    Expected Result: Deploy completes without errors
    Evidence: Deploy output captured

  Scenario: Full visual verification — G1-G4 (Layout)
    Tool: Playwright (playwright skill)
    Preconditions: Deploy completed, HA restarted
    Steps:
      1. Navigate to: https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac_v2
      2. Wait for: oig-flow-canvas visible (timeout: 30s — HA may be slow after restart)
      3. Assert: 3-column flow layout (tiles-left | canvas | tiles-right)
      4. Assert: Control panel above canvas
      5. Assert: Canvas height >= 800px
      6. Assert: Tiles are split left/right
      7. Full page screenshot: .sisyphus/evidence/task-6-full-layout.png
    Expected Result: V1-like 3-zone layout visible
    Evidence: .sisyphus/evidence/task-6-full-layout.png

  Scenario: Full visual verification — G5+G6+G9 (Header)
    Tool: Playwright (playwright skill)
    Steps:
      1. Inspect oig-header shadow DOM
      2. Assert: .title has gradient background
      3. Assert: .status-badge has severity-appropriate class
      4. Screenshot: .sisyphus/evidence/task-6-header.png
    Expected Result: Header has gradient title and severity badge
    Evidence: .sisyphus/evidence/task-6-header.png

  Scenario: Full visual verification — G7 (Responsive)
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport 375x812 → Screenshot .sisyphus/evidence/task-6-mobile.png
      2. Assert: Single column layout
      3. Set viewport 1024x768 → Screenshot .sisyphus/evidence/task-6-tablet.png
      4. Assert: 3-column layout with smaller tiles
      5. Set viewport 1440x900 → Screenshot .sisyphus/evidence/task-6-desktop.png
      6. Assert: Full 3-column layout
    Expected Result: Responsive behavior across 3 viewports
    Evidence: .sisyphus/evidence/task-6-mobile.png, task-6-tablet.png, task-6-desktop.png

  Scenario: V1 vs V2 side-by-side comparison
    Tool: Playwright (playwright skill)
    Steps:
      1. Screenshot V1: https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac
         → .sisyphus/evidence/task-6-v1-reference.png
      2. Screenshot V2: https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac_v2
         → .sisyphus/evidence/task-6-v2-final.png
      3. Compare visually — overall layout should be similar
    Expected Result: V2 layout matches V1 pattern
    Evidence: .sisyphus/evidence/task-6-v1-reference.png, task-6-v2-final.png
  ```

  **Evidence to Capture:**
  - [ ] .sisyphus/evidence/task-6-full-layout.png
  - [ ] .sisyphus/evidence/task-6-header.png
  - [ ] .sisyphus/evidence/task-6-mobile.png
  - [ ] .sisyphus/evidence/task-6-tablet.png
  - [ ] .sisyphus/evidence/task-6-desktop.png
  - [ ] .sisyphus/evidence/task-6-v1-reference.png
  - [ ] .sisyphus/evidence/task-6-v2-final.png

  **Commit**: YES
  - Message: `chore(dashboard-v2): deploy V2 with full V1 parity`
  - Files: `www_v2/dist/*`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1+4+5 (Wave 1) | `feat(dashboard-v2): restructure flow layout, enhance header, add animations` | app.ts, canvas.ts, header.ts, theme.ts | `npm run build` |
| 2 (Wave 2) | `feat(dashboard-v2): add responsive breakpoints for flow layout` | app.ts | `npm run build` |
| 6 (Wave 3) | `chore(dashboard-v2): deploy V2 with full V1 parity` | dist/* | deploy + visual check |

---

## Success Criteria

### Verification Commands
```bash
cd custom_components/oig_cloud/www_v2 && npm run build  # Expected: exit code 0, no errors
SMB_MOUNT="/private/tmp/ha_mount" ./deploy_to_ha.sh      # Expected: deploy succeeds
```

### Final Checklist
- [x] G1: Flow layout is 3-column (tiles-left | canvas | tiles-right)
- [x] G2: Tiles split into left and right containers
- [x] G3: Control panel sticky above canvas
- [x] G4: Canvas height >= 800px
- [x] G5: ČHMÚ badge shows 5 severity levels with colors
- [x] G6: Header title has gradient text
- [x] G7: 5 responsive breakpoints working (380, 768, 1024, 1200, 1400)
- [x] G8: slideUp, popIn, value-pop, value-roll animations defined
- [x] G9: Last update indicator visible in header
- [x] Build passes without errors
- [x] Deploy succeeds
- [x] V1 and V2 side-by-side screenshots captured for comparison
- [x] All "Must NOT Have" guardrails respected
