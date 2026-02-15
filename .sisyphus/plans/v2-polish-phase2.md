# V2 Flow Dashboard — Phase 2: Opravy, Chybějící Features & Polish

## TL;DR

> **Quick Summary**: Opravit rozbitý responsive layout (dlaždice přes sebe, edit mode dead zone), doplnit chybějící V1 features (alarmy, balancing, grid charging plan, tile editor, pending change indikátory), zmenšit flow nody a přepracovat tile layout na vertikální 2-sloupcový auto-fit grid.
> 
> **Deliverables**:
> - Opravený responsive layout — žádné překrývání dlaždic na žádném breakpointu
> - Funkční edit mode drag — plný rozsah pohybu bez dead zone
> - Kompletní tile config editor (portovaný z V1) se záložkami Entity/Button, icon picker, sensor selection
> - Tile layout přepracovaný na vertikální stacking s 2-column auto-fit
> - Battery node: balancing indikátor, teplotní alarm s pulse animací, grid charging plan sekce
> - Inverter node: bypass alarm s pulse animací, opravený teplotní threshold (50→35°C), warning border, pending change indikátory (spinner + "→ XY")
> - Zmenšené flow nody (max-width 280→250px, padding 14→10px 14px)
> - Flow diagram integrace s ShieldController pro mode-changing vizuální feedback
> - Test infrastruktura (vitest) + TDD workflow pro všechny tasky
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 5 waves
> **Critical Path**: Task 0 (test setup) → Task 1 (responsive) → Task 3 (tile layout) → Task 5 (tile editor) → Task 12 (deploy)

---

## Context

### Original Request
Uživatel otestoval V2 dashboard na produkci po první vlně oprav (v2-flow-overhaul) a identifikoval 11+ problémů: responsive layout rozbitý (dlaždice přes sebe), edit mode nefunguje (500px dead zone), chybějící V1 features (alarmy, balancing, tile editor, shield indikátory), příliš velké nody, chybějící konfigurace dlaždic.

### Interview Summary
**Key Discussions**:
- Tile config panel: Kompletní editor z V1 — entity search, icon picker, 2 podpůrné entity, pojmenování, barvy, záložky Entity/Button
- Pending change UX: Spinner + cílová hodnota (např. "→ 3500W")
- Tile layout: Auto-fit 2 sloupce dle šířky (minmax ~120px), vertikální stacking
- Grid charging plan: Přidat do V2 (V1 parity)
- Test strategie: TDD s vitest

**Research Findings**:
- Root cause tile overlap: `grid-template-columns: 260px 1fr 260px` (app.ts:204) → min 544px, viewport 400px → přetečení
- Root cause edit dead zone: `overflow: hidden` (canvas.ts:53) + `min-height: 500px/600px` (node.ts:71,106) → vizuálně ořezané
- Root cause `display: contents` na tile containeru (tile.ts:158) → flex-direction fix v media query nefunguje
- V1 alarm animace: `pulse-hot`, `pulse-warning`, `warning-border` keyframes v dashboard-styles.css
- ShieldController v V2 JIŽ MÁ `pendingServices` Map a `changingServices` Set — stačí propojit s flow nody
- V1 tile editor: dialog.js (150-389) — kompletní konfigurace s entity search, icon picker, support entities
- V1 tiles.js: TileManager se save/load localStorage, removeTile, reset
- V1 inverter temp threshold: 35°C (V2 má špatně 50°C)

### Metis Review
**Identified Gaps** (addressed):
- `prefers-reduced-motion` pro alarm animace → přidáno jako guardrail ke každému animation tasku
- Tile editor scope creep → locked: port V1 přesně, žádné undo/redo, žádné presets
- Test infra scope → locked: vitest unit only, žádné CI, žádné coverage thresholds
- V2 features to preserve → žádné unikátní V2 features k ochraně, V2 je subset V1

---

## Work Objectives

### Core Objective
Dosáhnout feature parity s V1 ve flow dashboardu a opravit responsive layout, aby dashboard fungoval na všech velikostech obrazovky (400px–1920px+).

### Concrete Deliverables
- Opravený `app.ts` — responsive grid layout bez překrývání
- Opravený `canvas.ts` — edit mode bez dead zone
- Opravený `node.ts` — alarm animace, zmenšené nody, pending change indikátory, balancing, grid charging plan
- Nový `tile-dialog.ts` — kompletní tile config editor (Lit port z V1 dialog.js)
- Přepracovaný `tile.ts` — 2-column auto-fit layout, vertikální stacking
- Nový `vitest.config.ts` + test soubory pro každý task

### Definition of Done
- [ ] `bun run build` → úspěšný build bez chyb
- [ ] `npx vitest run` → všechny testy PASS
- [ ] Deploy na HA → `SMB_MOUNT="/Volumes/addon_configs" ./deploy_to_ha.sh --fe-v2-only` úspěšný
- [ ] Viewport 400×977: žádné překrývání, vše čitelné
- [ ] Viewport 1920×1080: 3-column layout, 2-column tiles
- [ ] Edit mode: drag funguje přes celou výšku flow gridu

### Must Have
- Všechny V1 alarm animace (pulse-hot, pulse-warning, warning-border)
- Tile editor se záložkami Entity/Button
- Pending change spinner + cílová hodnota na inverter nodu
- Grid charging plan sekce v battery nodu
- Balancing indikátor v battery nodu
- Responsivní layout na 400px–1920px+

### Must NOT Have (Guardrails)
- Žádné změny backendu/dat (`custom_components/oig_cloud/*.py` nedotýkat)
- Žádné změny V1 souborů (`www/js/` a `www/*.html` nedotýkat)
- Žádné nové npm závislosti (kromě vitest jako devDependency)
- Žádné nové breakpointy nad rámec stávajících (768/1024/1280 + Nest Hub 1024×600)
- Žádné undo/redo v tile editoru
- Žádné tile presets/templates
- Žádné CI/pipeline změny
- Žádné nové Web Components nad rámec potřeby (max: `oig-tile-dialog`, `oig-icon-picker`)
- Animace přesně dle V1 — žádné "vylepšení" nebo nové typy
- `prefers-reduced-motion: reduce` → vypnout všechny pulse/glow animace
- Žádné localStorage pro panel collapse state

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> This is NOT conditional — it applies to EVERY task, regardless of test strategy.
>
> **FORBIDDEN** — acceptance criteria that require:
> - "User manually tests..."
> - "User visually confirms..."
> - "User interacts with..."
> - ANY step where a human must perform an action
>
> **ALL verification is executed by the agent** using tools (Playwright, interactive_bash, curl, etc.). No exceptions.

### Test Decision
- **Infrastructure exists**: NE
- **Automated tests**: ANO (TDD)
- **Framework**: vitest (projekt používá vite)

### TDD Workflow

Each TODO follows RED-GREEN-REFACTOR:

**Task Structure:**
1. **RED**: Write failing test first
   - Test file: `src/**/*.test.ts`
   - Test command: `npx vitest run [file]`
   - Expected: FAIL (test exists, implementation doesn't)
2. **GREEN**: Implement minimum code to pass
   - Command: `npx vitest run [file]`
   - Expected: PASS
3. **REFACTOR**: Clean up while keeping green
   - Command: `npx vitest run [file]`
   - Expected: PASS (still)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

> Whether TDD is enabled or not, EVERY task MUST include Agent-Executed QA Scenarios.
> These describe how the executing agent DIRECTLY verifies the deliverable.

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Frontend/UI** | Playwright (playwright skill) | Navigate, interact, assert DOM, screenshot |
| **CSS Layout** | Playwright (playwright skill) | Resize viewport, check bounding rects, screenshot |
| **Component Logic** | vitest | Unit tests on functions/renderers |
| **Build** | Bash | `bun run build` exit code 0 |
| **Deploy** | Bash | deploy script exit code 0 |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Start Immediately):
└── Task 0: Test Infrastructure Setup (vitest)

Wave 1 (After Wave 0):
├── Task 1: Responsive Layout Fix (grid + media queries)
├── Task 2: Edit Mode Drag Fix (overflow + min-height)
├── Task 6: Node Sizing Reduction
├── Task 7: Battery Alarm Animations
└── Task 8: Inverter Alarm Animations + Temp Threshold Fix

Wave 2 (After Wave 1):
├── Task 3: Tile Layout Rework (vertical + 2-col auto-fit)
├── Task 4: Battery Node — Balancing + Grid Charging Plan
├── Task 9: Pending Change Indicators (flow ↔ ShieldController)
└── Task 10: Tile Alignment (V1 style centering)

Wave 3 (After Wave 2):
└── Task 5: Tile Config Editor (full V1 port)

Wave 4 (After Wave 3):
├── Task 11: Build + Commit
└── Task 12: Deploy to HA + Production Verification

Critical Path: Task 0 → Task 1 → Task 3 → Task 5 → Task 12
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 0 | None | 1,2,6,7,8 | None (must be first) |
| 1 | 0 | 3,5 | 2,6,7,8 |
| 2 | 0 | None | 1,6,7,8 |
| 3 | 1 | 5,10 | 4,9 |
| 4 | 0 | None | 3,9,10 |
| 5 | 3 | 11 | None (complex, solo) |
| 6 | 0 | None | 1,2,7,8 |
| 7 | 0 | None | 1,2,6,8 |
| 8 | 0 | None | 1,2,6,7 |
| 9 | 0 | None | 3,4,10 |
| 10 | 3 | None | 4,9 |
| 11 | ALL 1-10 | 12 | None |
| 12 | 11 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 0 | 0 | `task(category="quick", load_skills=[], ...)` |
| 1 | 1,2,6,7,8 | 5 parallel: `task(category="visual-engineering", load_skills=["frontend-ui-ux"], ...)` |
| 2 | 3,4,9,10 | 4 parallel: mix visual-engineering + deep |
| 3 | 5 | `task(category="deep", load_skills=["frontend-ui-ux"], ...)` (complex, solo) |
| 4 | 11,12 | `task(category="quick", load_skills=["git-master"], ...)` + deploy |

---

## TODOs

- [x] 0. Test Infrastructure Setup (vitest)

  **What to do**:
  - Install vitest as devDependency: `bun add -d vitest`
  - Create `vitest.config.ts` with Lit component support
  - Create example test `src/__tests__/example.test.ts` to verify setup
  - Configure test script in `package.json`: `"test": "vitest run"`
  - Verify: `npx vitest run` → 1 test passes
  - NOTE: Lit components use Shadow DOM — tests will focus on logic/functions, not DOM rendering. For CSS layout verification, use Playwright QA scenarios.

  **Must NOT do**:
  - Add coverage thresholds
  - Add CI/pipeline changes
  - Add pre-commit hooks
  - Add E2E test framework

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - No special skills needed — straightforward package install + config
  
  **Parallelization**:
  - **Can Run In Parallel**: NO (must be first)
  - **Parallel Group**: Wave 0 (solo)
  - **Blocks**: Tasks 1-10
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www_v2/package.json` — Current vite config, build scripts, dependencies
  - `custom_components/oig_cloud/www_v2/vite.config.ts` — Vite configuration for vitest to extend

  **External References**:
  - Official docs: https://vitest.dev/guide/ — Setup with Vite projects

  **Acceptance Criteria**:
  - [ ] `vitest` in devDependencies of package.json
  - [ ] `vitest.config.ts` exists with valid configuration
  - [ ] `npx vitest run` → exits 0, shows "1 passed"
  - [ ] `bun run build` → still succeeds (no interference)

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Vitest runs and passes example test
    Tool: Bash
    Preconditions: bun installed, package.json exists
    Steps:
      1. Run: bun add -d vitest
      2. Assert: exit code 0
      3. Run: npx vitest run
      4. Assert: output contains "1 passed"
      5. Assert: exit code 0
      6. Run: bun run build
      7. Assert: exit code 0 (build not broken)
    Expected Result: Test infrastructure ready
    Evidence: Terminal output captured
  ```

  **Commit**: YES (group with Task 0 only)
  - Message: `chore(v2): add vitest test infrastructure`
  - Files: `package.json`, `vitest.config.ts`, `src/__tests__/example.test.ts`
  - Pre-commit: `npx vitest run`

---

- [x] 1. Responsive Layout Fix — Grid + Media Queries

  **What to do**:
  - FIX `app.ts:204` — change `grid-template-columns: 260px 1fr 260px` to `minmax(0, 260px) 1fr minmax(0, 260px)` so columns can shrink
  - FIX mobile media query `app.ts:398-415` — when `<768px`, hide left/right panels and show tiles BELOW flow canvas in single column
  - FIX `tile.ts:158-160` — remove `display: contents` from OigTilesContainer, replace with proper `display: flex; flex-direction: column; gap: 8px;`
  - ADD `overflow-x: hidden` to `.flow-layout` to prevent horizontal scroll at narrow viewports
  - ENSURE `.flow-left-panel` and `.flow-right-panel` have `overflow-y: auto` for scrollable tile panels
  - REDUCE `node.ts:71` — change `min-height: 600px !important` to `min-height: 400px` (remove !important)
  - TEST: Write unit test for grid breakpoint constants
  - VERIFY: At 400×977 viewport — no overlap, no horizontal scroll, all tiles visible

  **Must NOT do**:
  - Add new breakpoints beyond 768/1024/1280 + Nest Hub
  - Change the 3-column desktop layout concept
  - Remove panels entirely — they should just collapse on mobile

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: CSS grid layout debugging, responsive design patterns
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 6, 7, 8)
  - **Blocks**: Tasks 3, 5
  - **Blocked By**: Task 0

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:202-209` — Current `.flow-layout` grid definition (260px 1fr 260px)
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:367-415` — All 3 media queries (Nest Hub, Tablet, Mobile)
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:220-230` — `.flow-left-panel` / `.flow-right-panel` current CSS
  - `custom_components/oig_cloud/www_v2/src/ui/features/tiles/tile.ts:158-160` — `display: contents` (root cause)
  - `custom_components/oig_cloud/www_v2/src/ui/theme.ts:130-134` — Breakpoint constants

  **API/Type References**:
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:754-790` — render() method showing flow-layout HTML structure

  **WHY Each Reference Matters**:
  - `app.ts:204` is THE root cause of overlap — fixed 260px columns can't fit in 400px viewport
  - `tile.ts:158` is WHY mobile flex-direction fix doesn't work — `display: contents` makes container invisible
  - `app.ts:398-415` is the mobile media query that SHOULD fix it but doesn't due to display:contents
  - `node.ts:71` forces 600px min-height which contributes to vertical overflow

  **Acceptance Criteria**:

  - [ ] Test: viewport constants test passes (`npx vitest run`)
  - [ ] `bun run build` → success

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: No tile overlap at 400×977 viewport
    Tool: Playwright (playwright skill)
    Preconditions: V2 deployed to HA, accessible at https://ha.muriel-cz.cz
    Steps:
      1. Navigate to: https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac
      2. Set viewport: 400×977
      3. Wait for: oig-flow-canvas visible (timeout: 15s)
      4. Query all .tile elements → get bounding rects
      5. Assert: NO two tile bounding rects overlap (intersect check)
      6. Assert: No horizontal scrollbar (document.documentElement.scrollWidth <= 400)
      7. Assert: All tiles visible (none have display:none at this breakpoint)
      8. Screenshot: .sisyphus/evidence/task-1-mobile-400x977.png
    Expected Result: All tiles stack vertically, no overlap, no horizontal scroll
    Evidence: .sisyphus/evidence/task-1-mobile-400x977.png

  Scenario: Desktop 3-column layout preserved at 1920×1080
    Tool: Playwright (playwright skill)
    Preconditions: V2 deployed to HA
    Steps:
      1. Navigate to dashboard URL
      2. Set viewport: 1920×1080
      3. Wait for: .flow-layout visible
      4. Query .flow-left-panel → assert width > 0 and width <= 260
      5. Query .flow-right-panel → assert width > 0 and width <= 260
      6. Query .flow-center → assert width > 400
      7. Screenshot: .sisyphus/evidence/task-1-desktop-1920x1080.png
    Expected Result: 3-column layout with side panels visible
    Evidence: .sisyphus/evidence/task-1-desktop-1920x1080.png

  Scenario: Tablet single column at 768×1024
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport: 768×1024
      2. Navigate to dashboard URL
      3. Wait for: .flow-layout visible
      4. Assert: grid-template-columns computed to single column
      5. Screenshot: .sisyphus/evidence/task-1-tablet-768x1024.png
    Expected Result: Single column stacked layout
    Evidence: .sisyphus/evidence/task-1-tablet-768x1024.png
  ```

  **Commit**: NO (group with Task 11)

---

- [x] 2. Edit Mode Drag Fix — Overflow + Min-Height

  **What to do**:
  - FIX `canvas.ts:53` — change `overflow: hidden` to `overflow: visible` (or `overflow-y: auto` in edit mode)
  - FIX `node.ts:106` — change edit mode `min-height: 500px` to `min-height: 80vh` for dynamic height
  - FIX `node.ts:595-611` — update drag constraint calculation to use `Math.max(containerRect.height, window.innerHeight)` for maxTop
  - ADD scroll-into-view when dragging near edge of container
  - TEST: Write unit test for drag constraint calculation function (extract to pure function)

  **Must NOT do**:
  - Remove edit mode entirely
  - Change the percentage-based default positions
  - Add infinite scroll/canvas

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Drag-and-drop UX, overflow handling
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 6, 7, 8)
  - **Blocks**: None
  - **Blocked By**: Task 0

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/canvas.ts:50-65` — Canvas host CSS with `overflow: hidden` and `min-height: 500px`
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:68-80` — `.flow-grid` CSS with `min-height: 600px !important`
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:102-145` — Edit mode CSS with default positions (`top: 70%`, etc.)
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:586-628` — Drag constraint logic (containerRect bounding)

  **WHY Each Reference Matters**:
  - `canvas.ts:53` `overflow: hidden` physically clips content beyond the container — prevents dragging to visible area
  - `node.ts:71` `min-height: 600px !important` forces a fixed minimum but doesn't expand for drag
  - `node.ts:106` edit mode `min-height: 500px` creates the ~500px ceiling the user reports
  - `node.ts:595-611` drag constraint uses `containerRect` which is capped by min-height

  **Acceptance Criteria**:
  - [ ] Drag constraint function extracted and unit tested
  - [ ] `bun run build` → success

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Drag node beyond 500px in edit mode
    Tool: Playwright (playwright skill)
    Preconditions: V2 deployed, edit mode button accessible
    Steps:
      1. Navigate to dashboard URL at 1920×1080
      2. Enter edit mode (click edit button)
      3. Wait for: .node-battery[draggable] or position:absolute styles applied
      4. Get battery node position: getBoundingClientRect() → initialY
      5. Simulate drag: mousedown on battery node → mousemove to (initialX, initialY + 600) → mouseup
      6. Get new position: getBoundingClientRect() → newY
      7. Assert: newY > initialY + 500 (broke through the 500px barrier)
      8. Screenshot: .sisyphus/evidence/task-2-drag-beyond-500px.png
    Expected Result: Node successfully dragged beyond 500px
    Evidence: .sisyphus/evidence/task-2-drag-beyond-500px.png

  Scenario: Drag works across full viewport height
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport: 1920×1080
      2. Enter edit mode
      3. Drag solar node from top to bottom of flow area
      4. Assert: node Y position > 700px (proving full range)
      5. Screenshot: .sisyphus/evidence/task-2-full-range-drag.png
    Expected Result: Full vertical range accessible
    Evidence: .sisyphus/evidence/task-2-full-range-drag.png
  ```

  **Commit**: NO (group with Task 11)

---

- [x] 3. Tile Layout Rework — Vertical Stacking + 2-Column Auto-Fit

  **What to do**:
  - REWORK `app.ts` flow layout — remove separate left/right tile panels, move ALL tiles below (or alongside) flow canvas
  - CREATE tile container with CSS `grid-template-columns: repeat(auto-fit, minmax(120px, 1fr))` for auto 2-col/1-col
  - ADD `gap: 8px` between tiles in grid
  - ENSURE tiles stack under flow canvas on mobile (<768px) in single column
  - ENSURE tiles show in 2-column grid on desktop in 1/3 panel width
  - UPDATE `tile.ts` — remove `display: contents`, add proper grid container styling
  - TEST: Write test for tile grid layout config values

  **Must NOT do**:
  - Change tile component internals (Task 10 handles alignment)
  - Add tile drag-and-drop reordering (that's part of Task 5 tile editor)
  - Change tile height (already 50px from previous plan)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: CSS grid auto-fit patterns, responsive container design
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 9, 10)
  - **Blocks**: Tasks 5, 10
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:202-230` — Current 3-column grid layout with left/right panels
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:754-790` — render() HTML structure showing flow-left-panel/right-panel
  - `custom_components/oig_cloud/www_v2/src/ui/features/tiles/tile.ts:1-191` — Full tile component + container
  - `custom_components/oig_cloud/www_v2/src/ui/features/tiles/tile.ts:158-160` — `display: contents` to remove

  **WHY Each Reference Matters**:
  - `app.ts:202-230` defines the grid that currently splits tiles left/right — needs rework to single tile area
  - `app.ts:754-790` is the HTML template that arranges panels — needs structural change
  - `tile.ts:158` `display: contents` must be replaced with actual grid container

  **Acceptance Criteria**:
  - [ ] Tile grid config constants tested
  - [ ] `bun run build` → success

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Tiles in 2-column grid on desktop
    Tool: Playwright (playwright skill)
    Preconditions: V2 deployed, desktop viewport
    Steps:
      1. Set viewport: 1920×1080
      2. Navigate to dashboard URL
      3. Wait for: tiles visible
      4. Query tile container → get computed grid-template-columns
      5. Assert: 2 columns visible (at least 2 tiles side by side)
      6. Screenshot: .sisyphus/evidence/task-3-desktop-2col-tiles.png
    Expected Result: Tiles in 2-column auto-fit grid
    Evidence: .sisyphus/evidence/task-3-desktop-2col-tiles.png

  Scenario: Tiles in 1-column on narrow viewport
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport: 400×977
      2. Navigate to dashboard URL
      3. Wait for: tiles visible
      4. Assert: all tiles have same X position (single column)
      5. Assert: tiles stack vertically with gaps
      6. Screenshot: .sisyphus/evidence/task-3-mobile-1col-tiles.png
    Expected Result: Tiles stack in single column
    Evidence: .sisyphus/evidence/task-3-mobile-1col-tiles.png
  ```

  **Commit**: NO (group with Task 11)

---

- [x] 4. Battery Node — Balancing Indicator + Grid Charging Plan

  **What to do**:
  - ADD **balancing indicator** to battery node renderer (`node.ts` renderBattery method):
    - Show icon + text when balancing active (states: charging/holding/completed from V1)
    - Data source: check FlowData for balancing state attributes
    - Position: near battery gauge, similar to V1 `battery-balancing-indicator`
  - ADD **grid charging plan section** to battery node:
    - Show planned charging window (start/end time)
    - Show planned duration and estimated cost
    - Data source: check FlowData or planner entities
    - Layout: detail rows below energy breakdown (V1 `grid-charging-plan-section` pattern)
  - TEST: Write tests for balancing state parsing, charging plan data extraction

  **Must NOT do**:
  - Change battery gauge SVG component
  - Modify FlowData extraction logic (data layer changes)
  - Add new HA entity subscriptions — only use existing data from FlowData

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Component rendering, data-driven UI
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 9, 10)
  - **Blocks**: None
  - **Blocked By**: Task 0

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:700-800` — renderBattery() method — existing battery node renderer
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:766-793` — Energy breakdown section (pattern for adding grid charging plan)
  - `custom_components/oig_cloud/www/js/components/grid-charging.js:837-890` — V1 balancing indicator implementation (states, icons, tooltip)
  - `custom_components/oig_cloud/www/dashboard.html:306-311` — V1 balancing indicator HTML structure
  - `custom_components/oig_cloud/www/dashboard.html:325-328` — V1 grid charging badge
  - `custom_components/oig_cloud/www_v2/src/data/flow-data.ts` — FlowData interface and data extraction

  **API/Type References**:
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/types.ts` — FlowData interface, check for balancing/charging plan fields

  **WHY Each Reference Matters**:
  - `node.ts:700-800` is WHERE to add the new sections — renderBattery() is the target method
  - `node.ts:766-793` shows the PATTERN for detail rows (energy breakdown) — follow same structure for charging plan
  - `grid-charging.js:837-890` is the V1 LOGIC to port — balancing states (charging/holding/completed)
  - `flow-data.ts` is where to check if balancing/charging plan data is already extracted from HA entities

  **Acceptance Criteria**:
  - [ ] Balancing state parser tested
  - [ ] Charging plan data extractor tested
  - [ ] `bun run build` → success

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Battery node shows balancing indicator when active
    Tool: Playwright (playwright skill)
    Preconditions: V2 deployed, balancing entity has active state
    Steps:
      1. Navigate to dashboard URL at 1920×1080
      2. Wait for: .node-battery visible
      3. Query: .node-battery for balancing indicator element
      4. Assert: balancing indicator visible (if balancing active on system)
      5. Screenshot: .sisyphus/evidence/task-4-battery-balancing.png
    Expected Result: Balancing indicator rendered when data present
    Evidence: .sisyphus/evidence/task-4-battery-balancing.png

  Scenario: Grid charging plan section displayed
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to dashboard URL
      2. Wait for: .node-battery visible
      3. Query: battery node for charging plan section
      4. Assert: charging plan section exists in DOM (even if data empty, structure should be present)
      5. Screenshot: .sisyphus/evidence/task-4-charging-plan.png
    Expected Result: Charging plan section rendered
    Evidence: .sisyphus/evidence/task-4-charging-plan.png
  ```

  **Commit**: NO (group with Task 11)

---

- [x] 5. Tile Config Editor — Full V1 Port

  **What to do**:
  - CREATE `tile-dialog.ts` — Lit Web Component port of V1 `dialog.js`:
    - **Entity tab**: entity search/filter, custom label, icon picker, color picker, 2 support entities
    - **Button tab**: action select (toggle/on/off), entity search, label, icon, color, 2 support entities
    - **Icon picker modal**: searchable icon grid (port from V1)
    - **Save/Cancel buttons**: save updates tile config via TileManager
  - CREATE `icon-picker.ts` — Lit component for icon selection modal
  - ADD tile edit trigger: click on tile in edit mode → opens tile-dialog
  - ADD tile add/remove: + button to add new tile, trash icon to remove
  - ADD tile reordering: drag tiles within grid to change position in edit mode
  - INTEGRATE with existing `TileManager` or port V1 TileManager pattern (localStorage save/load)
  - TEST: Write tests for entity filtering logic, tile config save/load, icon search

  **Must NOT do**:
  - Add undo/redo functionality
  - Add tile presets or templates
  - Add tile import/export
  - Change the tile rendering itself (handled by Task 10)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Complex form UI, modal dialogs, drag-and-drop, search/filter UX
  
  **Parallelization**:
  - **Can Run In Parallel**: NO (complex, needs tile layout from Task 3)
  - **Parallel Group**: Wave 3 (solo)
  - **Blocks**: Task 11
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www/js/components/dialog.js:149-389` — V1 tile config dialog: full HTML template with entity search, icon picker, support entities, tabs
  - `custom_components/oig_cloud/www/js/components/dialog.js:381-870` — V1 dialog logic: filterEntities(), save(), switchTab(), openIconPicker()
  - `custom_components/oig_cloud/www/js/components/tiles.js:1-200` — V1 TileManager: setTile(), removeTile(), save/load localStorage, config structure
  - `custom_components/oig_cloud/www/js/components/tiles.js:660-710` — V1 tile rendering: renderEntityTile(), renderButtonTile()
  - `custom_components/oig_cloud/www_v2/src/ui/features/tiles/tile.ts` — V2 tile component to integrate with
  - `custom_components/oig_cloud/www_v2/src/ui/features/tiles/types.ts` — V2 tile type definitions

  **API/Type References**:
  - `custom_components/oig_cloud/www/js/components/dialog.js:183-254` — Entity tab form fields: entity search, label, icon, color, support-entity-1, support-entity-2
  - `custom_components/oig_cloud/www/js/components/dialog.js:257-337` — Button tab form fields: action, entity, label, icon, color, support entities

  **WHY Each Reference Matters**:
  - `dialog.js:149-389` is the COMPLETE V1 template to port to Lit — has all form fields, tabs, icon picker modal
  - `dialog.js:381-870` has the LOGIC to port — entity filtering, save handler, tab switching, icon picker
  - `tiles.js:1-200` has the CONFIG persistence pattern — localStorage save/load, tile config structure
  - `tile.ts` is what needs the edit trigger hook — clicking tile in edit mode opens dialog

  **Acceptance Criteria**:
  - [ ] Entity filter function tested (search, empty query, no results)
  - [ ] Tile config save/load functions tested
  - [ ] Icon search function tested
  - [ ] `bun run build` → success

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Open tile config dialog in edit mode
    Tool: Playwright (playwright skill)
    Preconditions: V2 deployed, edit mode accessible
    Steps:
      1. Navigate to dashboard URL at 1920×1080
      2. Enter edit mode
      3. Click on any tile
      4. Wait for: tile config dialog visible (timeout: 5s)
      5. Assert: dialog has "Konfigurace dlaždice" header
      6. Assert: Entity tab is active by default
      7. Assert: entity search input visible
      8. Screenshot: .sisyphus/evidence/task-5-tile-dialog-open.png
    Expected Result: Tile config dialog opens with Entity tab
    Evidence: .sisyphus/evidence/task-5-tile-dialog-open.png

  Scenario: Search and select entity in dialog
    Tool: Playwright (playwright skill)
    Steps:
      1. Open tile dialog (from previous scenario)
      2. Type "sensor.bat" in entity search input
      3. Wait for: entity list filtered (timeout: 3s)
      4. Assert: filtered list shows battery-related entities
      5. Click first result
      6. Assert: entity selected (highlighted or marked)
      7. Screenshot: .sisyphus/evidence/task-5-entity-search.png
    Expected Result: Entity search filters and selects correctly
    Evidence: .sisyphus/evidence/task-5-entity-search.png

  Scenario: Save tile config persists
    Tool: Playwright (playwright skill)
    Steps:
      1. Open tile dialog, select entity, enter label "Test Tile"
      2. Click "Uložit" button
      3. Assert: dialog closes
      4. Assert: tile shows updated label "Test Tile"
      5. Reload page
      6. Assert: tile still shows "Test Tile" (persisted)
      7. Screenshot: .sisyphus/evidence/task-5-tile-saved.png
    Expected Result: Config saved and persisted across reload
    Evidence: .sisyphus/evidence/task-5-tile-saved.png

  Scenario: Switch to Button tab and configure
    Tool: Playwright (playwright skill)
    Steps:
      1. Open tile dialog
      2. Click "Tlačítko" tab
      3. Assert: Button tab content visible
      4. Assert: Action select visible with options (Toggle, Zapnout, Vypnout)
      5. Screenshot: .sisyphus/evidence/task-5-button-tab.png
    Expected Result: Button tab has all required fields
    Evidence: .sisyphus/evidence/task-5-button-tab.png
  ```

  **Commit**: NO (group with Task 11)

---

- [x] 6. Node Sizing Reduction

  **What to do**:
  - REDUCE `node.ts` CSS — change `max-width: 280px` to `max-width: 250px` (match V1 `--node-max-width`)
  - REDUCE padding: `14px` → `10px 14px` (match V1 `--node-padding`)
  - ADD `min-width: 130px` (match V1 `--node-min-width`)
  - ADJUST font sizes if needed for smaller boxes (check V1 reference)
  - TEST: Write test for node CSS constants

  **Must NOT do**:
  - Change node layout algorithm (grid positions)
  - Change node content structure
  - Change glassmorphism/backdrop-filter styles

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: CSS sizing adjustments

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 7, 8)
  - **Blocks**: None
  - **Blocked By**: Task 0

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:82-95` — Current node CSS (max-width: 280px, padding: 14px)
  - `custom_components/oig_cloud/www/dashboard-styles.css:441-486` — V1 node CSS (min-width: 130px, max-width: 250px, padding: 10px 14px)

  **WHY Each Reference Matters**:
  - `node.ts:82-95` is WHERE to make changes — CSS template literal
  - `dashboard-styles.css:441-486` is the TARGET values — V1 sizing to match

  **Acceptance Criteria**:
  - [x] `bun run build` → success
  - [x] Node max-width is 250px in CSS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Flow nodes are smaller than before
    Tool: Playwright (playwright skill)
    Preconditions: V2 deployed
    Steps:
      1. Navigate to dashboard URL at 1920×1080
      2. Wait for: .node-inverter visible
      3. Query: .node-inverter → getBoundingClientRect()
      4. Assert: width <= 250px
      5. Assert: width >= 130px
      6. Screenshot: .sisyphus/evidence/task-6-node-sizing.png
    Expected Result: Nodes sized between 130-250px (matching V1)
    Evidence: .sisyphus/evidence/task-6-node-sizing.png
  ```

  **Commit**: NO (group with Task 11)

---

- [x] 7. Battery Alarm Animations

  **What to do**:
  - ADD **temperature alarm** to battery node (`node.ts` renderBattery):
    - When temp > 25°C: add class `temp-hot` with pulse-hot animation (red glow)
    - When temp < 15°C: add class `temp-cold` with pulse-cold animation (blue glow)
    - CSS keyframes: port from V1 `dashboard-styles.css:847-875`
  - ADD `@keyframes pulse-hot` and `@keyframes pulse-cold` to node component styles
  - ADD `prefers-reduced-motion: reduce` media query → disable all pulse animations
  - TEST: Write tests for temperature threshold logic (hot/cold/normal states)

  **Must NOT do**:
  - Change temperature data source
  - Add new alarm types not in V1
  - Modify battery gauge component

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: CSS animations, conditional styling
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 6, 8)
  - **Blocks**: None
  - **Blocked By**: Task 0

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:755-763` — Current battery temperature display (icon + value, no alarm)
  - `custom_components/oig_cloud/www/dashboard-styles.css:847-875` — V1 `pulse-hot` / `pulse-cold` keyframes and `.temp-hot`/`.temp-cold` classes
  - `custom_components/oig_cloud/www/dashboard.html:318-323` — V1 battery temperature indicator HTML with alarm classes

  **WHY Each Reference Matters**:
  - `node.ts:755-763` is WHERE to add conditional class logic
  - `dashboard-styles.css:847-875` has the EXACT keyframes to port
  - `dashboard.html:318-323` shows HOW V1 applies the alarm classes

  **Acceptance Criteria**:
  - [ ] Temperature threshold tests pass (>25°C → hot, <15°C → cold, else → normal)
  - [ ] `bun run build` → success

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Battery temp alarm visible when threshold exceeded
    Tool: Playwright (playwright skill)
    Preconditions: V2 deployed, battery temp entity accessible
    Steps:
      1. Navigate to dashboard URL
      2. Wait for: .node-battery visible
      3. Query: battery temperature element → check for temp-hot/temp-cold class
      4. If temp > 25: assert class "temp-hot" present, assert animation-name contains "pulse"
      5. Screenshot: .sisyphus/evidence/task-7-battery-alarm.png
    Expected Result: Temperature alarm class applied based on threshold
    Evidence: .sisyphus/evidence/task-7-battery-alarm.png

  Scenario: Animations disabled with prefers-reduced-motion
    Tool: Playwright (playwright skill)
    Steps:
      1. Emulate prefers-reduced-motion: reduce
      2. Navigate to dashboard URL
      3. Query: temp-hot element → get computed animation
      4. Assert: animation is "none" or animation-duration is "0s"
      5. Screenshot: .sisyphus/evidence/task-7-reduced-motion.png
    Expected Result: No animations with reduced motion preference
    Evidence: .sisyphus/evidence/task-7-reduced-motion.png
  ```

  **Commit**: NO (group with Task 11)

---

- [x] 8. Inverter Alarm Animations + Temperature Threshold Fix

  **What to do**:
  - FIX **temperature threshold**: `node.ts:816` — change 50°C to 35°C (match V1)
  - ADD **bypass alarm animation**: when bypass active, add `bypass-warning` class with pulse-warning animation
  - ADD **bypass label**: show "Bypass" text when bypass active (V1 pattern)
  - ADD **warning border**: when bypass OR temp alarm active, add `warning-active` class to inverter node with animated red border
  - ADD `@keyframes pulse-warning` and `@keyframes warning-border` from V1 dashboard-styles.css
  - ADD `prefers-reduced-motion: reduce` → disable all pulse/warning animations
  - TEST: Write tests for alarm state logic (bypass + temp combinations)

  **Must NOT do**:
  - Change bypass data source
  - Add new alarm types not in V1
  - Modify inverter mode display logic

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: CSS animations, alarm states
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 6, 7)
  - **Blocks**: None
  - **Blocked By**: Task 0

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:816` — Current temp threshold: `50` (WRONG, should be 35)
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:848-853` — Current bypass display (red dot, no animation)
  - `custom_components/oig_cloud/www/dashboard-styles.css:1095-1108` — V1 `pulse-warning` keyframes for bypass
  - `custom_components/oig_cloud/www/dashboard-styles.css:1141-1144` — V1 `warning-border` animation for inverter
  - `custom_components/oig_cloud/www/dashboard-styles.css:1246-1268` — V1 `inverter-temp-hot` animation
  - `custom_components/oig_cloud/www/dashboard.html:448-459` — V1 bypass + temperature indicators HTML

  **WHY Each Reference Matters**:
  - `node.ts:816` is the EXACT line with wrong threshold — simple number change
  - `node.ts:848-853` is WHERE to add alarm classes and label
  - `dashboard-styles.css:1095-1268` has ALL three keyframe animations to port

  **Acceptance Criteria**:
  - [ ] Alarm state logic tests pass (bypass on/off × temp hot/normal)
  - [ ] Temperature threshold is 35°C in code
  - [ ] `bun run build` → success

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Inverter shows bypass warning when active
    Tool: Playwright (playwright skill)
    Preconditions: V2 deployed
    Steps:
      1. Navigate to dashboard URL
      2. Wait for: .node-inverter visible
      3. Query: inverter node for bypass indicator
      4. If bypass active: assert class "bypass-warning" present, assert "Bypass" label visible
      5. Screenshot: .sisyphus/evidence/task-8-bypass-alarm.png
    Expected Result: Bypass warning with animation when active
    Evidence: .sisyphus/evidence/task-8-bypass-alarm.png

  Scenario: Inverter warning border when any alarm active
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to dashboard URL
      2. If bypass OR temp > 35°C on inverter:
      3. Assert: .node-inverter has class "warning-active"
      4. Assert: border-color is red-ish (computed)
      5. Screenshot: .sisyphus/evidence/task-8-warning-border.png
    Expected Result: Red animated border on inverter during alarm
    Evidence: .sisyphus/evidence/task-8-warning-border.png
  ```

  **Commit**: NO (group with Task 11)

---

- [x] 9. Pending Change Indicators — Flow ↔ ShieldController Integration

  **What to do**:
  - INTEGRATE `ShieldController` with flow node renderers in `node.ts`:
    - Subscribe to `changingServices` Set and `pendingServices` Map from ShieldController
    - When `set_box_mode` is pending: show spinner + "→ Home X" next to mode display on inverter node
    - When `set_grid_delivery` is pending: show spinner + "→ 3500W" next to grid export display
    - When `set_boiler_mode` is pending: show spinner + mode name on boiler (if displayed)
  - ADD `mode-changing` CSS class to flow elements during change (pulsing border/opacity effect)
  - CREATE small spinner component or use CSS-only spinner
  - ADD `showIndicator` / `hideIndicator` utility matching V1 pattern
  - TEST: Write tests for indicator state mapping (service type → node element → indicator text)

  **Must NOT do**:
  - Change ShieldController logic (it's already correct)
  - Change button state machine in selectors.ts
  - Add new service types

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Reactive UI, state-driven rendering
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 10)
  - **Blocks**: None
  - **Blocked By**: Task 0

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www_v2/src/data/shield-controller.ts` — ShieldController with `pendingServices: Map<ShieldServiceType, string>` and `changingServices: Set<ShieldServiceType>`
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:840-843` — Inverter mode display (WHERE to add "→ XY")
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:857-866` — Grid export display (WHERE to add "→ XY")
  - `custom_components/oig_cloud/www/js/components/shield.js:1027-1142` — V1 `showBoxModeChanging()`, `showGridModeChanging()`, `showGridLimitChanging()` functions
  - `custom_components/oig_cloud/www/js/components/shield.js:1021-1025` — V1 `setFlowChanging()` — adds mode-changing class
  - `custom_components/oig_cloud/www_v2/src/ui/features/control-panel/types.ts` — ShieldServiceType enum

  **WHY Each Reference Matters**:
  - `shield-controller.ts` already TRACKS pending services — just need to consume the data in flow nodes
  - `node.ts:840-843` and `857-866` are the EXACT locations to add spinner indicators
  - `shield.js:1027-1142` shows V1's PATTERN for showing/hiding indicators — logic to port
  - `types.ts` has the service type enum needed for mapping services to flow elements

  **Acceptance Criteria**:
  - [ ] Service-to-node mapping function tested
  - [ ] Indicator text formatting function tested
  - [ ] `bun run build` → success

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Mode change shows spinner on inverter
    Tool: Playwright (playwright skill)
    Preconditions: V2 deployed, control panel accessible
    Steps:
      1. Navigate to dashboard URL at 1920×1080
      2. Wait for: control panel visible
      3. Click mode change button (e.g., switch to Home 1)
      4. Wait for: confirm dialog → confirm
      5. Assert: inverter node shows spinner icon
      6. Assert: inverter node shows "→ Home 1" text
      7. Assert: inverter mode area has "mode-changing" class
      8. Wait for: change completes (spinner disappears, timeout: 30s)
      9. Assert: mode text updated to "Home 1"
      10. Screenshot: .sisyphus/evidence/task-9-mode-changing.png
    Expected Result: Spinner + target value shown during change
    Evidence: .sisyphus/evidence/task-9-mode-changing.png

  Scenario: Grid limit change shows pending indicator
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to dashboard URL
      2. Change grid delivery limit (e.g., to 3500W)
      3. Confirm change
      4. Assert: grid export area shows "→ 3500W"
      5. Assert: spinner visible next to value
      6. Screenshot: .sisyphus/evidence/task-9-grid-changing.png
    Expected Result: Grid limit change indicator visible
    Evidence: .sisyphus/evidence/task-9-grid-changing.png
  ```

  **Commit**: NO (group with Task 11)

---

- [x] 10. Tile Alignment — V1 Style Centering

  **What to do**:
  - UPDATE `tile.ts` tile value layout:
    - **Main value**: centered (text-align: center), font-size: 22px (V1 `node-value`), font-weight: 700
    - **Supplementary values**: logical alignment — top-right and bottom-right corners (V1 pattern)
    - **Label**: left-aligned, smaller (10-11px)
    - **Unit**: inline with main value, smaller font
  - MATCH V1 tile rendering pattern from `core.js:720-762`:
    - Large centered value with unit
    - Support entity values in corners
    - Color-coded left border
  - TEST: Write tests for tile layout CSS constants

  **Must NOT do**:
  - Change tile height (already 50px)
  - Change tile config structure
  - Add new tile types

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Typography, alignment, visual hierarchy
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 9)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www_v2/src/ui/features/tiles/tile.ts:20-50` — Current tile CSS styling
  - `custom_components/oig_cloud/www/js/core/core.js:720-762` — V1 `renderEntityTile()` — HTML structure with centered value, unit, support entities
  - `custom_components/oig_cloud/www/dashboard-styles.css` — V1 tile CSS classes: `.tile-value-large`, `.tile-unit`, `.tile-label`

  **WHY Each Reference Matters**:
  - `tile.ts:20-50` is WHERE to change CSS — current tile styling
  - `core.js:720-762` is the V1 HTML structure to MATCH — centered value, corner support values
  - V1 CSS is the TARGET visual design

  **Acceptance Criteria**:
  - [ ] `bun run build` → success

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Main tile value is centered
    Tool: Playwright (playwright skill)
    Preconditions: V2 deployed, tiles visible
    Steps:
      1. Navigate to dashboard URL at 1920×1080
      2. Wait for: tiles visible
      3. Query: first tile main value element
      4. Get computed text-align → assert "center"
      5. Get computed font-size → assert >= 20px
      6. Get computed font-weight → assert >= 700
      7. Screenshot: .sisyphus/evidence/task-10-tile-alignment.png
    Expected Result: Main value centered with large bold font
    Evidence: .sisyphus/evidence/task-10-tile-alignment.png
  ```

  **Commit**: NO (group with Task 11)

---

- [x] 11. Build + Commit

  **What to do**:
  - Run `bun run build` → verify success
  - Run `npx vitest run` → verify all tests pass
  - Commit all changes with descriptive message
  - Include all modified/new files

  **Must NOT do**:
  - Push to remote (user decides when)
  - Skip test verification

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit creation
  
  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 1-10 (ALL)

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www_v2/package.json` — Build script: `bun run build`

  **Acceptance Criteria**:
  - [ ] `bun run build` → exit code 0
  - [ ] `npx vitest run` → all tests pass
  - [ ] `git status` shows clean working tree after commit

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Build and tests pass
    Tool: Bash
    Steps:
      1. Run: bun run build (in www_v2/)
      2. Assert: exit code 0
      3. Run: npx vitest run (in www_v2/)
      4. Assert: exit code 0, output shows "X passed, 0 failed"
    Expected Result: Clean build and all tests green
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `feat(v2): phase 2 — responsive fix, alarm animations, tile editor, pending indicators, node sizing`
  - Files: All modified files in `www_v2/src/`
  - Pre-commit: `bun run build && npx vitest run`

---

- [x] 12. Deploy to HA + Production Verification

  **What to do**:
  - Deploy via: `./deploy_to_ha.sh` (BEZ přepínače — plný deploy s automatickým restartem HA; řádky 316–353 skriptu mají restart zabudovaný)
  - Verify deployment at: `https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac`
  - Run comprehensive QA verification on production

  **Must NOT do**:
  - Deploy backend changes
  - Modify deploy script

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`playwright`]
    - `playwright`: Production verification screenshots
  
  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (after Task 11)
  - **Blocks**: None
  - **Blocked By**: Task 11

  **References**:

  **Pattern References**:
  - `deploy_to_ha.sh` — Deploy script
  - `.sisyphus/notepads/v2-flow-overhaul/learnings.md` — Previous deploy learnings (SMB mount path)

  **Acceptance Criteria**:
  - [ ] Deploy script exits 0
  - [ ] Dashboard loads at HA URL

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Full production verification
    Tool: Playwright (playwright skill)
    Preconditions: Deploy completed
    Steps:
      1. Navigate to: https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac
      2. Set viewport: 1920×1080
      3. Wait for: flow canvas loaded (timeout: 30s)
      4. Screenshot: .sisyphus/evidence/task-12-desktop-final.png
      
      5. Verify responsive: set viewport 400×977
      6. Assert: no tile overlap
      7. Screenshot: .sisyphus/evidence/task-12-mobile-final.png
      
      8. Verify nodes: query .node-inverter width → assert <= 250px
      9. Verify tiles: query tile values → assert centered text
      10. Screenshot: .sisyphus/evidence/task-12-nodes-tiles.png
      
      11. Set viewport: 768×1024
      12. Screenshot: .sisyphus/evidence/task-12-tablet-final.png
    Expected Result: All features working on production
    Evidence: .sisyphus/evidence/task-12-*.png

  Scenario: Edit mode verification on production
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport: 1920×1080
      2. Enter edit mode
      3. Drag battery node beyond 500px
      4. Assert: drag succeeds
      5. Click tile → assert config dialog opens
      6. Screenshot: .sisyphus/evidence/task-12-edit-mode.png
    Expected Result: Edit mode fully functional
    Evidence: .sisyphus/evidence/task-12-edit-mode.png
  ```

  **Commit**: NO (already committed in Task 11)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 0 | `chore(v2): add vitest test infrastructure` | package.json, vitest.config.ts, example.test.ts | `npx vitest run` |
| 11 | `feat(v2): phase 2 — responsive fix, alarm animations, tile editor, pending indicators, node sizing` | All www_v2/src/ files | `bun run build && npx vitest run` |

---

## Success Criteria

### Verification Commands
```bash
cd custom_components/oig_cloud/www_v2 && bun run build  # Expected: exit 0
cd custom_components/oig_cloud/www_v2 && npx vitest run  # Expected: all pass
./deploy_to_ha.sh  # Expected: exit 0 (plný deploy BEZ přepínače, restart zahrnut)
```

### Final Checklist
- [ ] All "Must Have" present (alarm animations, tile editor, pending indicators, balancing, grid charging plan, responsive fix, edit mode fix)
- [ ] All "Must NOT Have" absent (no backend changes, no V1 modifications, no new dependencies beyond vitest, no new breakpoints)
- [ ] All tests pass
- [ ] Desktop 1920×1080: 3-column layout, 2-col tiles, all nodes ≤250px wide
- [ ] Mobile 400×977: no overlap, single column tiles, all content accessible
- [ ] Tablet 768×1024: single column, stacked layout
- [ ] Edit mode: full drag range, tile config dialog functional
- [ ] Alarm animations: pulse-hot, pulse-warning, warning-border all working
- [ ] prefers-reduced-motion: all animations disabled
- [ ] Pending change: spinner + "→ XY" visible during mode/grid changes
- [ ] Tile editor: Entity + Button tabs, icon picker, sensor selection, save/load works
