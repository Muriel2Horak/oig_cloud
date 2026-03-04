# Flow Layout Fix + Verification (OIG Dashboard V2)

## TL;DR

> **Quick Summary**: Restore the V2 3‑column flow layout (Tiles left, Flow center, Control panel right sticky), align breakpoints with the V2 theme, and add repeatable verification (TDD unit tests + Playwright + MCP Chrome production evidence).
> 
> **Deliverables**:
> - Updated flow layout CSS in `custom_components/oig_cloud/www_v2/src/ui/app.ts` (grid areas, breakpoint alignment, sticky offset).
> - V2 layout unit tests (Vitest) under `custom_components/oig_cloud/www_v2/tests/unit/ui/`.
> - V2 E2E harness updates (`tests/fe/mock/server.js`, `scripts/run_fe_e2e.sh`) and Playwright layout spec.
> - Production verification evidence screenshots for desktop, Nest Hub (1024×600), Nest Hub Max (1280×800), tablet, and mobile.
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 2 → Task 6 → Task 8 → Task 10

---

## Context

### Original Request
“Vypadá že nám umřela session… Code changes done, but verification failed… Flow layout je 3‑sloupcový / Control panel vpravo (sticky) / Dlaždice vlevo… potřebuji opravu + ověření.”

### Interview Summary
**Key Discussions**:
- Target = yesterday’s working layout (no redesign). Smaller tiles are acceptable.
- 3 columns on desktop + Google Nest (Nest Hub 7" 1024×600 and Nest Hub Max 1280×800).
- Tablet: 2 columns (Flow + Tiles), Control panel below. Mobile: 1 column, order Flow → Control → Tiles.
- Sticky on right panel; recommended inside main content scroll container.
- Production verification on `https://ha.muriel-cz.cz` using MCP Chrome (session already logged in).
- Automated visual QA required; DOM/CSS assertions + screenshots are sufficient (no strict pixel diff).
- Markup changes allowed; V1 must remain untouched.
- TDD required (Vitest + Playwright where applicable).

**Research Findings**:
- V2 flow layout CSS lives in `custom_components/oig_cloud/www_v2/src/ui/app.ts` (lines ~208–386) and uses a 3‑column CSS grid.
- Breakpoint mismatch: V2 `theme.ts` defines 768/1024/1280, but `app.ts` uses 380/768/769–1024/1200/1400.
- Sticky control panel uses `top: 0` (no header offset).
- Playwright config includes `cloud-nest` (1024×600) but no explicit Nest Max project.
- Production V2 route: `https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac_v2`.

### Metis Review
**Identified Gaps (addressed in plan)**:
- Breakpoint mismatch likely contributing to regression → align with V2 `theme.ts`.
- Sticky `top: 0` may be incorrect → introduce adjustable offset variable.
- No layout assertions in tests → add Vitest + Playwright checks.
- Distinguish Nest 1024×600 vs tablet 1024×768 → use height‑based media query (default assumption, called out below).

---

## Work Objectives

### Core Objective
Restore the V2 flow layout to a stable 3‑column design on desktop and Nest devices while enforcing the correct tablet/mobile stacking order and adding repeatable automated verification plus production evidence.

### Concrete Deliverables
- Updated V2 flow layout grid and breakpoints in `custom_components/oig_cloud/www_v2/src/ui/app.ts`.
- Vitest layout unit tests covering grid columns/areas at key breakpoints.
- Playwright V2 layout spec + device matrix (desktop, tablet, mobile, Nest Hub, Nest Hub Max).
- E2E harness support for V2 in the FE mock server and run script.
- MCP Chrome evidence screenshots on production for all target viewports.

### Definition of Done
- [ ] Desktop (≥1280×800) renders 3 columns: Tiles (left), Flow (center), Control panel (right).
- [ ] Nest Hub 1024×600 and Nest Hub Max 1280×800 render 3 columns (same order as desktop).
- [ ] Tablet (e.g., iPad 1024×768) renders 2 columns (Tiles + Flow) with Control panel below.
- [ ] Mobile (<768px) renders 1 column, order Flow → Control → Tiles.
- [ ] Control panel is sticky on desktop/Nest, non‑sticky on mobile.
- [ ] `npm --prefix custom_components/oig_cloud/www_v2 run test:unit` passes.
- [ ] `npm run test:fe:e2e` passes (including new V2 layout spec).
- [ ] Production MCP Chrome screenshots captured for desktop + Nest Hub + Nest Hub Max + tablet + mobile.

### Must Have
- Restore 3‑column flow layout (Tiles left, Flow center, Control right) on desktop + Nest.
- Tablet 2‑column layout with Control panel below; mobile single column with specified order.
- Sticky control panel on desktop/Nest with correct top offset.
- Automated verification: Vitest + Playwright + MCP Chrome evidence.

### Must NOT Have (Guardrails)
- No changes to V1 dashboard (`custom_components/oig_cloud/www/**`).
- No redesigns or new UI features; only layout/positioning changes.
- No new dependencies added.
- No changes to Control Panel business logic.
- No pixel‑diff visual testing requirement (similarity is enough).

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: **TDD** (Vitest + Playwright)
- **Frameworks**: Vitest (V2 unit), Playwright (E2E), MCP Chrome (production evidence)

### QA Policy
Every task MUST include agent-executed QA scenarios with evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

| Deliverable Type | Verification Tool | Method |
|---|---|---|
| V2 CSS/Layout | Vitest | Assert CSS strings/areas for breakpoints |
| V2 E2E Layout | Playwright | `toHaveCSS`, bounding boxes, screenshots |
| Production Verification | MCP Chrome | Navigate, resize, scroll, screenshot |

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately — baseline + test scaffolding):
├── Task 1: Capture production baseline evidence (MCP Chrome)
├── Task 2: Add Vitest layout tests (TDD)
├── Task 3: Add V2 host route in FE mock server
├── Task 4: Update FE E2E script to build V2 assets
└── Task 5: Update Playwright config for Nest Hub Max

Wave 2 (After Wave 1 — implementation + verification):
├── Task 6: Update flow layout CSS + breakpoints in `app.ts`
├── Task 7: Implement sticky offset variable for control panel
├── Task 8: Add Playwright V2 layout spec
├── Task 9: Run unit + e2e tests and capture evidence
└── Task 10: Production verification (MCP Chrome) after deployment

Critical Path: Task 2 → Task 6 → Task 8 → Task 10

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|---|---|---|---|
| 1 | — | 10 | 1 |
| 2 | — | 6, 9 | 1 |
| 3 | — | 8, 9 | 1 |
| 4 | — | 9 | 1 |
| 5 | — | 8 | 1 |
| 6 | 2 | 7, 8, 9, 10 | 2 |
| 7 | 6 | 8, 9, 10 | 2 |
| 8 | 3, 5, 6 | 9 | 2 |
| 9 | 2, 4, 8 | 10 | 2 |
| 10 | 6, 9 | — | 2 |

### Agent Dispatch Summary

| Wave | # Parallel | Tasks → Agent Category |
|---|---:|---|
| 1 | **5** | T1 → `unspecified-low`, T2 → `quick`, T3 → `unspecified-high`, T4 → `quick`, T5 → `quick` |
| 2 | **5** | T6 → `visual-engineering`, T7 → `visual-engineering`, T8 → `unspecified-high`, T9 → `quick`, T10 → `unspecified-high` |

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [x] 1. Capture production baseline evidence (MCP Chrome) — COMPLETED

  **What to do**:
  - Navigate to `https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac_v2` using MCP Chrome.
  - Capture screenshots at: Desktop 1280×800, Nest Hub 1024×600, Nest Hub Max 1280×800, Tablet 1024×768, Mobile 375×667.
  - Record computed CSS for `.flow-layout` (`grid-template-columns`, `grid-template-areas`) and `oig-control-panel` (`position`, `top`).

  **Must NOT do**:
  - Do not change any layout or settings.
  - Do not log out or alter HA configuration.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Evidence capture only.
  - **Skills**: [`dev-browser`]
    - `dev-browser`: Needed for MCP Chrome automation & screenshots.
  - **Skills Evaluated but Omitted**:
    - `playwright`: MCP Chrome is required for production evidence.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2–5)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:
  - `.sisyphus/evidence/verification-report.md` — Confirms production V2 route.
  - `.sisyphus/notepads/v2-polish-phase2/deployment-verification.md` — Production URL references.

  **Acceptance Criteria**:
  - [ ] Screenshots saved to:
    - `.sisyphus/evidence/task-1-prod-desktop.png`
    - `.sisyphus/evidence/task-1-prod-nest-1024x600.png`
    - `.sisyphus/evidence/task-1-prod-nest-max-1280x800.png`
    - `.sisyphus/evidence/task-1-prod-tablet-1024x768.png`
    - `.sisyphus/evidence/task-1-prod-mobile-375x667.png`
  - [ ] CSS snapshot saved to `.sisyphus/evidence/task-1-prod-css.txt`

  **QA Scenarios**:
  ```
  Scenario: Capture baseline production layout
    Tool: chrome-devtools (MCP Chrome)
    Steps:
      1. Navigate to production V2 URL.
      2. Resize to each target viewport.
      3. Take screenshots for each viewport.
      4. Run JS in console to capture computed CSS values for `.flow-layout` and `oig-control-panel`.
    Expected Result: Evidence files exist with correct viewport names and CSS values.
    Evidence: .sisyphus/evidence/task-1-prod-*.png, .sisyphus/evidence/task-1-prod-css.txt
  ```

  **Commit**: NO (evidence only)

- [ ] 2. Add Vitest layout tests (TDD)

  **What to do**:
  - Create `custom_components/oig_cloud/www_v2/tests/unit/ui/layout/flow-layout.test.ts`.
  - Assert `OigApp.styles` contains required `grid-template-areas` and `grid-template-columns` for desktop/tablet/mobile.
  - Add tests for Nest height override (default assumption: `max-height: 700px` → 3 columns) and document as a default.

  **Must NOT do**:
  - Do not change layout CSS yet (tests should fail first).

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small, localized test addition.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Unit tests only.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3–5)
  - **Blocks**: Tasks 6, 9
  - **Blocked By**: None

  **References**:
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:208-386` — Flow layout CSS to test.
  - `custom_components/oig_cloud/www_v2/tests/unit/ui/theme.test.ts` — Existing Vitest style & breakpoint patterns.
  - `custom_components/oig_cloud/www_v2/vitest.config.ts` — Test include paths.

  **Acceptance Criteria**:
  - [ ] New test file exists and fails against current CSS (RED).
  - [ ] `npm --prefix custom_components/oig_cloud/www_v2 run test:unit -- --runTestsByPath tests/unit/ui/layout/flow-layout.test.ts` fails pre‑fix and passes after Task 6.

  **QA Scenarios**:
  ```
  Scenario: Layout unit tests red/green
    Tool: Bash
    Steps:
      1. Run: npm --prefix custom_components/oig_cloud/www_v2 run test:unit -- --runTestsByPath tests/unit/ui/layout/flow-layout.test.ts
    Expected Result: Tests fail before layout changes, pass after Task 6.
    Evidence: .sisyphus/evidence/task-2-vitest-output.txt
  ```

  **Commit**: NO (unless user explicitly requests)

- [ ] 3. Add V2 host route in FE mock server

  **What to do**:
  - Update `tests/fe/mock/server.js` to add `/host-v2` route.
  - Serve V2 assets from `custom_components/oig_cloud/www_v2/dist` (e.g., map to `/local/oig_cloud_v2/`).
  - Ensure the host page injects `home-assistant` and iframes the V2 `index.html`.

  **Must NOT do**:
  - Do not remove or alter existing `/host` (V1) behavior.
  - Do not add new dependencies.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Test harness changes across mock server routes.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Harness changes only.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: None

  **References**:
  - `tests/fe/mock/server.js:99-152` — Existing `/host` route pattern.
  - `custom_components/oig_cloud/www_v2/index.html` — V2 entry HTML.
  - `custom_components/oig_cloud/www_v2/vite.config.ts` — Base path `/oig_cloud_static_v2/`.

  **Acceptance Criteria**:
  - [ ] `curl http://localhost:8124/host-v2?mode=cloud` returns HTML with a V2 iframe.
  - [ ] `curl http://localhost:8124/local/oig_cloud_v2/index.html` returns V2 HTML when dist exists.

  **QA Scenarios**:
  ```
  Scenario: Host V2 route serves index
    Tool: Bash
    Steps:
      1. Start mock server.
      2. curl http://localhost:8124/host-v2?mode=cloud
      3. curl http://localhost:8124/local/oig_cloud_v2/index.html
    Expected Result: Both endpoints return 200 and contain V2 HTML.
    Evidence: .sisyphus/evidence/task-3-host-v2-curl.txt
  ```

  **Commit**: NO (unless user explicitly requests)

- [ ] 4. Update FE E2E script to build V2 assets

  **What to do**:
  - Update `scripts/run_fe_e2e.sh` to build V2 assets before running Playwright (`npm --prefix custom_components/oig_cloud/www_v2 run build`).
  - Ensure the script fails clearly if V2 build fails.

  **Must NOT do**:
  - Do not remove existing V1 E2E behavior.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small script change.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:
  - `scripts/run_fe_e2e.sh` — Existing E2E runner.
  - `custom_components/oig_cloud/www_v2/package.json` — V2 build script.

  **Acceptance Criteria**:
  - [ ] Script builds V2 dist before Playwright starts.
  - [ ] If build fails, script exits non‑zero.

  **QA Scenarios**:
  ```
  Scenario: E2E script builds V2 assets
    Tool: Bash
    Steps:
      1. Run: scripts/run_fe_e2e.sh
      2. Confirm logs show V2 build step before Playwright.
    Expected Result: Build step runs and Playwright starts.
    Evidence: .sisyphus/evidence/task-4-e2e-script-log.txt
  ```

  **Commit**: NO (unless user explicitly requests)

- [ ] 5. Update Playwright config for Nest Hub Max

  **What to do**:
  - Add a `cloud-nest-max` project in `playwright.config.js` with viewport 1280×800.
  - Ensure it uses `metadata: { mode: 'cloud' }` like other projects.

  **Must NOT do**:
  - Do not remove existing projects (`cloud`, `cloud-nest`, `cloud-tablet`, etc.).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`playwright`]
    - `playwright`: Ensures project matrix remains valid.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:
  - `playwright.config.js:15-34` — Existing project matrix.

  **Acceptance Criteria**:
  - [ ] `npx playwright test --list` shows `cloud-nest-max` project.

  **QA Scenarios**:
  ```
  Scenario: Playwright project list
    Tool: Bash
    Steps:
      1. Run: npx playwright test --list
    Expected Result: Output includes cloud-nest-max.
    Evidence: .sisyphus/evidence/task-5-playwright-list.txt
  ```

  **Commit**: NO (unless user explicitly requests)

- [ ] 6. Update flow layout CSS + breakpoints in `app.ts`

  **What to do**:
  - Replace `.flow-layout` rules with explicit `grid-template-areas` for desktop/tablet/mobile.
  - Align breakpoints with `theme.ts`:
    - Mobile: `<768px` → 1 column, order Flow → Control → Tiles.
    - Tablet: `768–1023px` → 2 columns (Tiles + Flow), Control below.
    - Desktop: `≥1024px` → 3 columns (Tiles | Flow | Control).
  - **DEFAULT**: Keep 3 columns on Nest 1024×600 using height‑based override (e.g., `@media (min-width: 1024px) and (max-height: 700px)`), so tablet 1024×768 still uses 2 columns. If this assumption fails on real Nest devices, adjust threshold based on MCP evidence.
  - Ensure `.flow-control-right` allows full width on tablet/mobile (remove min/max width constraints there).

  **Must NOT do**:
  - Do not change V1 assets.
  - Do not introduce new breakpoints beyond those required for the Nest/tablet split.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Multi-breakpoint CSS grid layout changes.
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Ensures responsive layout matches existing design.
  - **Skills Evaluated but Omitted**:
    - `playwright`: Verification handled in Task 8.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 7–10
  - **Blocked By**: Task 2

  **References**:
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:208-386` — Current flow layout CSS.
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:809-833` — Flow layout markup order.
  - `custom_components/oig_cloud/www_v2/src/ui/theme.ts:130-154` — Breakpoint definitions.

  **Acceptance Criteria**:
  - [ ] Desktop/Nest computed CSS shows `grid-template-columns: minmax(280px, 350px) 1fr minmax(280px, 350px)`.
  - [ ] Tablet computed CSS shows 2 columns and Control panel below.
  - [ ] Mobile computed CSS shows 1 column with Flow → Control → Tiles order.

  **QA Scenarios**:
  ```
  Scenario: Desktop/Nest layout columns
    Tool: Playwright
    Steps:
      1. Open /host-v2?mode=cloud
      2. Set viewport to 1280x800 and 1024x600
      3. Assert .flow-layout grid-template-columns matches 3-column layout
    Expected Result: 3-column grid columns
    Evidence: .sisyphus/evidence/task-6-grid-columns.txt

  Scenario: Tablet/mobile stacking order
    Tool: Playwright
    Steps:
      1. Set viewport to 1024x768 (tablet)
      2. Confirm Control panel is below Flow/Tiles (bounding boxes)
      3. Set viewport to 375x667 (mobile)
      4. Confirm order Flow → Control → Tiles
    Expected Result: Correct order at each breakpoint
    Evidence: .sisyphus/evidence/task-6-order-check.txt
  ```

  **Commit**: NO (unless user explicitly requests)

- [ ] 7. Implement sticky offset variable for control panel

  **What to do**:
  - Replace `oig-control-panel { top: 0; }` with `top: var(--oig-sticky-top, 0px)`.
  - Define `--oig-sticky-top` on `:host` or `.flow-layout` using header + spacing. **Default**: `calc(var(--oig-header-height, 56px) + 8px)` for desktop, and `0px` on mobile. If HA header height differs in production, adjust based on MCP CSS snapshot.
  - Ensure sticky applies only on desktop/Nest; disable sticky on mobile to avoid layout issues.

  **Must NOT do**:
  - Do not introduce JS layout calculations.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 8–10
  - **Blocked By**: Task 6

  **References**:
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:240-244` — Current sticky config.
  - `custom_components/oig_cloud/www_v2/src/ui/components/header.ts:18-25` — Header styling context.

  **Acceptance Criteria**:
  - [ ] Desktop/Nest: `oig-control-panel` computed `position: sticky` and `top` equals the configured variable.
  - [ ] Mobile: `oig-control-panel` is non‑sticky (position not `sticky`).

  **QA Scenarios**:
  ```
  Scenario: Sticky behavior on desktop
    Tool: Playwright
    Steps:
      1. Set viewport 1280x800
      2. Scroll main content
      3. Assert oig-control-panel stays visible at top offset
    Expected Result: Sticky panel stays below header
    Evidence: .sisyphus/evidence/task-7-sticky-desktop.png

  Scenario: Sticky disabled on mobile
    Tool: Playwright
    Steps:
      1. Set viewport 375x667
      2. Check computed CSS for oig-control-panel position
    Expected Result: position is not sticky
    Evidence: .sisyphus/evidence/task-7-sticky-mobile.txt
  ```

  **Commit**: NO (unless user explicitly requests)

- [ ] 8. Add Playwright V2 layout spec

  **What to do**:
  - Add `tests/fe/specs/dashboard-v2-layout.spec.js` targeting `/host-v2?mode=cloud`.
  - Reuse patterns from `tests/fe/specs/dashboard.spec.js` for host/iframe handling.
  - Add assertions for:
    - Desktop 3‑column grid
    - Nest Hub 1024×600 3‑column grid
    - Nest Hub Max 1280×800 3‑column grid
    - Tablet 2‑column layout + control panel below
    - Mobile order Flow → Control → Tiles
    - Sticky position on desktop
  - Add `toHaveScreenshot()` for one baseline per viewport (visual similarity only).

  **Must NOT do**:
  - Do not remove or alter V1 Playwright specs.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]
    - `playwright`: Needed for CSS assertions and screenshot baselines.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 3, 5, 6

  **References**:
  - `tests/fe/specs/dashboard.spec.js` — Playwright patterns for host/iframe.
  - `playwright.config.js` — Project matrix (cloud, cloud-nest, cloud-tablet, cloud-nest-max).
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts` — Selectors & grid layout.

  **Acceptance Criteria**:
  - [ ] New spec passes on all target projects.
  - [ ] Screenshot artifacts saved by Playwright.

  **QA Scenarios**:
  ```
  Scenario: V2 layout E2E verification
    Tool: Playwright
    Steps:
      1. Run: npx playwright test tests/fe/specs/dashboard-v2-layout.spec.js
      2. Verify tests run on cloud, cloud-tablet, cloud-mobile, cloud-nest, cloud-nest-max
    Expected Result: All layout assertions pass, screenshots saved
    Evidence: .sisyphus/evidence/task-8-playwright-v2-report.txt
  ```

  **Commit**: NO (unless user explicitly requests)

- [ ] 9. Run unit + E2E tests and capture evidence

  **What to do**:
  - Run V2 unit tests: `npm --prefix custom_components/oig_cloud/www_v2 run test:unit`.
  - Run FE E2E tests: `npm run test:fe:e2e`.
  - Save outputs to evidence files.

  **Must NOT do**:
  - Do not skip failing tests.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 2, 4, 8

  **References**:
  - `custom_components/oig_cloud/www_v2/package.json` — V2 test scripts.
  - `package.json` — Root FE E2E scripts.

  **Acceptance Criteria**:
  - [ ] Unit tests pass (exit code 0).
  - [ ] Playwright E2E tests pass (exit code 0).

  **QA Scenarios**:
  ```
  Scenario: Run V2 unit tests
    Tool: Bash
    Steps:
      1. npm --prefix custom_components/oig_cloud/www_v2 run test:unit
    Expected Result: Exit code 0
    Evidence: .sisyphus/evidence/task-9-vitest.txt

  Scenario: Run FE E2E tests
    Tool: Bash
    Steps:
      1. npm run test:fe:e2e
    Expected Result: Exit code 0
    Evidence: .sisyphus/evidence/task-9-playwright.txt
  ```

  **Commit**: NO (unless user explicitly requests)

- [ ] 10. Production verification (MCP Chrome)

  **What to do**:
  - After deployment, use MCP Chrome to verify production route with the same viewport matrix as Task 1.
  - Confirm 3‑column layout on desktop + Nest devices, 2‑column on tablet, and 1‑column on mobile.
  - Scroll to verify sticky control panel on desktop/Nest.

  **Must NOT do**:
  - Do not alter production settings.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`dev-browser`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Final verification
  - **Blocked By**: Tasks 6, 9

  **References**:
  - Production URL: `https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac_v2`

  **Acceptance Criteria**:
  - [ ] Screenshots saved to `.sisyphus/evidence/task-10-prod-*.png` for each viewport.
  - [ ] Sticky behavior verified with scroll.

  **QA Scenarios**:
  ```
  Scenario: Production layout verification
    Tool: chrome-devtools (MCP Chrome)
    Steps:
      1. Navigate to production V2 URL
      2. Resize to each target viewport
      3. Capture screenshots and scroll to verify sticky control panel
    Expected Result: Layout matches requirements, sticky works on desktop/Nest
    Evidence: .sisyphus/evidence/task-10-prod-*.png
  ```

  **Commit**: NO (evidence only)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Verify Must Have / Must NOT Have, check evidence files, confirm production screenshots exist.

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit`, `npm --prefix custom_components/oig_cloud/www_v2 run test:unit`, and `npm run test:fe:e2e`. Check for lint issues and accidental V1 changes.

- [ ] F3. **Real QA** — `unspecified-high` (+ `dev-browser`)
  Re-run all QA scenarios, confirm production evidence, verify sticky scroll behavior.

- [ ] F4. **Scope Fidelity Check** — `deep`
  Ensure only V2 layout files were touched and no redesign/features were added.

---

## Commit Strategy

| After Task | Message | Files | Verification |
|---|---|---|---|
| (If requested) | `fix(v2-layout): restore 3-column flow layout + tests` | app.ts, tests, mock server, Playwright spec | V2 unit + FE E2E tests |

> Default: **No commits** unless explicitly requested.

---

## Success Criteria

### Verification Commands
```bash
npm --prefix custom_components/oig_cloud/www_v2 run test:unit
npm run test:fe:e2e
```

### Final Checklist
- [ ] 3‑column layout on desktop + Nest devices
- [ ] 2‑column layout on tablet
- [ ] 1‑column layout on mobile with correct order
- [ ] Sticky control panel works on desktop/Nest
- [ ] All tests pass
- [ ] Production evidence screenshots captured
