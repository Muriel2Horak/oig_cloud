# Pricing Tab Compact Redesign

## TL;DR

> **Quick Summary**: Visually compact the "Ceny" (Pricing) tab by reducing padding, margins, font sizes, and chart height across all 7 sections. CSS-only changes — no logic or render method modifications.
> 
> **Deliverables**:
> - Compacted hero row (smaller padding, smaller fonts)
> - Compacted price block cards
> - Tighter section titles, planned consumption, and what-if sections
> - Reduced chart height (380px → 260px)
> - Tighter layout gaps and analytics row
> 
> **Estimated Effort**: Short (1-2 hours)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (stats.ts) → Task 2 (chart.ts) + Task 3 (app.ts) → Task 4 (build+deploy) → Task 5 (verify)

---

## Context

### Original Request
User said: "můžeš se podívat na pohled Ceny a navrhnou vizuální optimalizaci. je to hodně nešetrné na místo a chtělo by to zkompaktnit" (Look at the Pricing tab and propose visual optimization. It wastes too much space and needs to be compacted.)

When asked what to focus on, user confirmed: **"All of the above"** — reduce padding, collapse sections, shrink hero cards, reduce chart height, full compact redesign.

### Interview Summary
**Key Discussions**:
- User confirmed ALL areas need compacting — no exclusions
- CSS-only changes, no business logic modifications
- Deployment via `deploy_to_ha.sh` (auto-SMB mount, builds V2, restarts HA)
- Dashboard is inside HA iframe → shadow DOM → `<main>` scrollable container

**Current State**:
- `<main>` scrollHeight = **1717px**, viewport = **876px** (~2x viewport, requires scrolling)
- 7 vertical sections stacked with generous spacing
- Hero cards: 20px padding, 28px font size
- Stats cards: 14px 16px padding, 22px font size
- Chart: 380px fixed height
- Section titles: 16px margin-top, 10px margin-bottom
- Layout gaps: 16px between sections

### Metis Review
**Identified Gaps** (addressed):
- **Mobile breakpoints**: Keep existing `@media` queries unchanged — desktop compacting only
- **Minimum font sizes**: Hero value 20px → safe and readable on standard displays
- **Target scrollHeight**: Set concrete target ≤ 950px (from ~1717px)
- **Negative prices**: CSS layout handles negative numbers fine — no overflow risk at proposed sizes
- **Touch targets**: Keep minimum padding ≥ 8px for interactive elements

---

## Work Objectives

### Core Objective
Reduce the Pricing tab vertical scrollHeight from ~1717px to ≤ 950px by systematically reducing padding, margins, font sizes, and chart height across all 7 sections — without changing any business logic or component render methods.

### Concrete Deliverables
- Modified CSS in `stats.ts` (hero row, stats cards, planned consumption, what-if)
- Modified CSS in `chart.ts` (chart container height, header, hint)
- Modified CSS in `app.ts` (pricing-layout gap, analytics-row gap, timeline button)

### Definition of Done
- [ ] `<main>` scrollHeight ≤ 950px (measured via JS console)
- [ ] No horizontal scrollbar
- [ ] All 4 hero cards render and display values correctly
- [ ] Chart canvas renders with zoom/pan still functional
- [ ] No TypeScript compilation errors
- [ ] Successfully deployed to production via `deploy_to_ha.sh`

### Must Have
- All 7 sections compacted with reduced spacing
- Chart height reduced from 380px to 260px
- Hero value font reduced from 28px to 20px
- Stats card value font reduced from 22px to 16px
- Layout gap reduced from 16px to 8px
- All existing hover/click interactions preserved

### Must NOT Have (Guardrails)
- No changes to TypeScript logic — ONLY CSS values in `static styles = css\`...\`` blocks
- No changes to `render()` methods or HTML structure
- No new CSS classes or selectors added
- No changes to responsive `@media` breakpoints
- No changes to files outside pricing feature (`stats.ts`, `chart.ts`) and `app.ts`
- No modifications to V1 dashboard (`www/`)
- No new dependencies
- No changes to Chart.js configuration or data processing
- No "while we're here" improvements (collapsible sections, lazy loading, etc.)
- No touching of `types.ts`, `index.ts`, or `mode-icon-plugin.ts`

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (bun/TypeScript build)
- **Automated tests**: NO (CSS-only visual changes, no testable logic)
- **Framework**: N/A — verification is visual + DOM measurement

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

| Deliverable Type | Verification Tool | Method |
|------------------|-------------------|--------|
| CSS changes | Bash (bun build) | Compile TypeScript, verify no errors |
| Visual result | chrome-devtools (screenshot) | Navigate to pricing tab, take screenshot |
| DOM measurement | chrome-devtools (evaluate_script) | Measure scrollHeight, check overflow |
| Production deploy | Bash (deploy_to_ha.sh) | Run script, verify exit code 0 |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — all CSS changes, MAX PARALLEL):
├── Task 1: Compact stats.ts CSS (hero, cards, sections) [quick]
├── Task 2: Compact chart.ts CSS (height, header, hint) [quick]
└── Task 3: Compact app.ts CSS (layout gap, analytics, timeline) [quick]

Wave 2 (After Wave 1 — build, deploy, verify):
├── Task 4: Build and deploy to production [quick]
└── Task 5: Production verification + screenshots [quick]

Wave FINAL (After ALL tasks — independent review):
├── Task F1: Visual QA — screenshot comparison [unspecified-high]
└── Task F2: Scope fidelity check [quick]

Critical Path: Tasks 1+2+3 (parallel) → Task 4 → Task 5 → F1+F2
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 3 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|------------|--------|------|
| 1 | — | 4 | 1 |
| 2 | — | 4 | 1 |
| 3 | — | 4 | 1 |
| 4 | 1, 2, 3 | 5 | 2 |
| 5 | 4 | F1, F2 | 2 |
| F1 | 5 | — | FINAL |
| F2 | 5 | — | FINAL |

### Agent Dispatch Summary

| Wave | # Parallel | Tasks → Agent Category |
|------|------------|----------------------|
| 1 | **3** | T1 → `quick`, T2 → `quick`, T3 → `quick` |
| 2 | **2** | T4 → `quick`, T5 → `quick` (sequential: T4 then T5) |
| FINAL | **2** | F1 → `unspecified-high`, F2 → `quick` |

---

## TODOs

- [x] 1. Compact stats.ts CSS — hero row, stats cards, planned consumption, what-if

  **What to do**:
  - Open `stats.ts` and modify ONLY CSS values in `static styles = css\`...\`` blocks
  - Apply these exact changes in the OigPricingStats styles (starting at line 419):

  **`:host`** (line 420-423):
  ```css
  /* BEFORE */ margin-bottom: 16px;
  /* AFTER  */ margin-bottom: 6px;
  ```

  **`.stats-grid`** (line 425-430):
  ```css
  /* BEFORE */ gap: 12px; margin-bottom: 16px;
  /* AFTER  */ gap: 8px; margin-bottom: 8px;
  ```

  **`.hero-row`** (line 432-437):
  ```css
  /* BEFORE */ gap: 16px; margin-bottom: 20px;
  /* AFTER  */ gap: 10px; margin-bottom: 10px;
  ```

  **`.hero-card`** (line 439-447):
  ```css
  /* BEFORE */ border-radius: 16px; padding: 20px;
  /* AFTER  */ border-radius: 12px; padding: 12px 14px;
  ```

  **`.hero-value`** (line 478-484):
  ```css
  /* BEFORE */ font-size: 28px; margin-bottom: 4px;
  /* AFTER  */ font-size: 20px; margin-bottom: 2px;
  ```

  **`.hero-value .stat-unit`** (line 486-491):
  ```css
  /* BEFORE */ font-size: 14px;
  /* AFTER  */ font-size: 11px;
  ```

  **`.hero-title`** (line 469-476):
  ```css
  /* BEFORE */ margin-bottom: 8px;
  /* AFTER  */ margin-bottom: 4px;
  ```

  **`.stats-2x2-grid`** (line 499-504):
  ```css
  /* BEFORE */ gap: 16px; margin-bottom: 20px;
  /* AFTER  */ gap: 10px; margin-bottom: 10px;
  ```

  **`.stats-2x2-item`** (line 506-512):
  ```css
  /* BEFORE */ padding: 16px;
  /* AFTER  */ padding: 10px 12px;
  ```

  **`.stats-2x2-item h3`** (line 514-521):
  ```css
  /* BEFORE */ margin-bottom: 12px;
  /* AFTER  */ margin-bottom: 6px;
  ```

  **`.section-title`** (line 523-531):
  ```css
  /* BEFORE */ margin-bottom: 10px; margin-top: 16px;
  /* AFTER  */ margin-bottom: 4px; margin-top: 8px;
  ```

  **`.planned-section`** (line 534-540):
  ```css
  /* BEFORE */ padding: 14px 16px; margin-bottom: 12px;
  /* AFTER  */ padding: 10px 12px; margin-bottom: 6px;
  ```

  **`.planned-header`** (line 542-547):
  ```css
  /* BEFORE */ margin-bottom: 10px;
  /* AFTER  */ margin-bottom: 6px;
  ```

  **`.planned-main-value`** (line 549-553):
  ```css
  /* BEFORE */ font-size: 22px;
  /* AFTER  */ font-size: 16px;
  ```

  **`.planned-profile`** (line 568-572):
  ```css
  /* BEFORE */ margin-bottom: 10px;
  /* AFTER  */ margin-bottom: 4px;
  ```

  **`.planned-details`** (line 574-578):
  ```css
  /* BEFORE */ gap: 10px;
  /* AFTER  */ gap: 6px;
  ```

  **`.whatif-section`** (line 625-631):
  ```css
  /* BEFORE */ padding: 14px 16px; margin-bottom: 12px;
  /* AFTER  */ padding: 10px 12px; margin-bottom: 6px;
  ```

  **`.whatif-header`** (line 633-638):
  ```css
  /* BEFORE */ margin-bottom: 10px;
  /* AFTER  */ margin-bottom: 6px;
  ```

  **`.whatif-cost`** (line 640-644):
  ```css
  /* BEFORE */ font-size: 20px;
  /* AFTER  */ font-size: 16px;
  ```

  - Also modify the OigStatsCard styles (starting at line 270):

  **`:host`** (OigStatsCard, line 271-279):
  ```css
  /* BEFORE */ padding: 14px 16px;
  /* AFTER  */ padding: 10px 12px;
  ```

  **`.card-value`** (line 303-308):
  ```css
  /* BEFORE */ font-size: 22px;
  /* AFTER  */ font-size: 16px;
  ```

  **`.card-title`** (line 295-301):
  ```css
  /* BEFORE */ margin-bottom: 6px;
  /* AFTER  */ margin-bottom: 3px;
  ```

  **`.sparkline-container`** (line 327-329):
  ```css
  /* BEFORE */ margin-top: 8px;
  /* AFTER  */ margin-top: 4px;
  ```

  - And modify OigMiniSparkline (line 57-61):

  **`:host`** (OigMiniSparkline):
  ```css
  /* BEFORE */ height: 30px;
  /* AFTER  */ height: 24px;
  ```

  **Must NOT do**:
  - Do NOT modify any `render()` methods
  - Do NOT change responsive `@media (max-width: 600px)` breakpoints (lines 697-707)
  - Do NOT add new CSS classes or selectors
  - Do NOT modify TypeScript logic, properties, or event handlers

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward CSS value replacements with exact before/after values
  - **Skills**: `[]`
    - No special skills needed — pure text editing
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — specific values already decided, no design judgment required
    - `playwright`: Not needed — no browser verification in this task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4 (build and deploy)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References**:
  - `www_v2/src/ui/features/pricing/stats.ts:56-66` — OigMiniSparkline styles (`:host { height: 30px }`)
  - `www_v2/src/ui/features/pricing/stats.ts:270-330` — OigStatsCard styles (padding, font-size, sparkline margin)
  - `www_v2/src/ui/features/pricing/stats.ts:419-708` — OigPricingStats styles (hero row, planned section, what-if section, section titles)

  **WHY Each Reference Matters**:
  - Lines 56-66: The sparkline height directly affects card vertical size — reducing from 30px to 24px saves 6px per card × 4 cards
  - Lines 270-330: Stats card padding and font size are the primary space consumers in the price blocks grid
  - Lines 419-708: This is the main CSS block with all section styles — hero row, planned consumption, what-if analysis

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript compilation succeeds after CSS changes
    Tool: Bash
    Preconditions: stats.ts has been modified with all CSS value changes
    Steps:
      1. Run: cd /Users/martinhorak/Downloads/oig_cloud/custom_components/oig_cloud/www_v2 && npx tsc --noEmit
      2. Check exit code is 0
    Expected Result: No compilation errors — exit code 0
    Failure Indicators: Any TypeScript error output, non-zero exit code
    Evidence: .sisyphus/evidence/task-1-tsc-check.txt

  Scenario: All CSS value changes applied correctly
    Tool: Bash (grep)
    Preconditions: stats.ts has been saved
    Steps:
      1. Verify hero-value font-size is 20px: grep "font-size: 20px" stats.ts (in hero-value context)
      2. Verify hero-card padding is 12px 14px: grep "padding: 12px 14px" stats.ts
      3. Verify planned-main-value font-size is 16px: grep "font-size: 16px" stats.ts
      4. Verify sparkline height is 24px: grep "height: 24px" stats.ts
    Expected Result: All grep commands find exactly the expected values
    Failure Indicators: grep returns no match, or old values still present
    Evidence: .sisyphus/evidence/task-1-css-values-check.txt
  ```

  **Commit**: YES (groups with 2, 3)
  - Message: `fix(dashboard): compact pricing tab — reduce spacing, padding, and font sizes`
  - Files: `www_v2/src/ui/features/pricing/stats.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 2. Compact chart.ts CSS — chart container height, header, controls, hint

  **What to do**:
  - Open `chart.ts` and modify ONLY CSS values in the `static styles = css\`...\`` block (starting at line 490)
  - Apply these exact changes:

  **`:host`** (line 491-497):
  ```css
  /* BEFORE */ padding: 16px;
  /* AFTER  */ padding: 10px 12px;
  ```

  **`.chart-header`** (line 499-506):
  ```css
  /* BEFORE */ margin-bottom: 12px;
  /* AFTER  */ margin-bottom: 6px;
  ```

  **`.chart-controls`** (line 514-518):
  ```css
  /* BEFORE */ gap: 6px;
  /* AFTER  */ gap: 4px;
  ```

  **`.control-btn`** (line 520-530):
  ```css
  /* BEFORE */ padding: 5px 10px;
  /* AFTER  */ padding: 4px 8px;
  ```

  **`.chart-container`** (line 562-567):
  ```css
  /* BEFORE */ height: 380px; max-height: 400px;
  /* AFTER  */ height: 260px; max-height: 280px;
  ```

  **`.chart-hint`** (line 588-594):
  ```css
  /* BEFORE */ margin-top: 6px;
  /* AFTER  */ margin-top: 2px;
  ```

  **Must NOT do**:
  - Do NOT modify the `@media (max-width: 768px)` breakpoint for chart-container (lines 569-573)
  - Do NOT modify any Chart.js configuration in JavaScript
  - Do NOT change `render()` method or any lifecycle hooks
  - Do NOT touch `createChart()`, `updateChart()`, or any chart data processing

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 6 simple CSS value replacements in one file
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — exact values provided

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4 (build and deploy)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References**:
  - `www_v2/src/ui/features/pricing/chart.ts:490-595` — Complete CSS block for `oig-pricing-chart` component
  - `www_v2/src/ui/features/pricing/chart.ts:562-567` — Chart container height (the biggest single space savings)
  - `www_v2/src/ui/features/pricing/chart.ts:569-573` — Mobile breakpoint — DO NOT TOUCH

  **WHY Each Reference Matters**:
  - Lines 490-595: The only CSS block in chart.ts — all changes are within this range
  - Lines 562-567: Reducing chart height from 380px to 260px saves 120px — the single biggest win
  - Lines 569-573: The mobile breakpoint must stay at 300px — compacting is desktop-focused

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Chart CSS values correctly updated
    Tool: Bash (grep)
    Preconditions: chart.ts has been saved with CSS changes
    Steps:
      1. Verify chart container height: grep "height: 260px" chart.ts
      2. Verify max-height: grep "max-height: 280px" chart.ts
      3. Verify host padding: grep "padding: 10px 12px" chart.ts
      4. Verify mobile breakpoint preserved: grep "height: 300px" chart.ts (should still exist)
    Expected Result: All new values found, mobile breakpoint preserved
    Failure Indicators: Old values still present, mobile breakpoint changed
    Evidence: .sisyphus/evidence/task-2-css-values-check.txt

  Scenario: TypeScript compilation succeeds
    Tool: Bash
    Preconditions: chart.ts has been modified
    Steps:
      1. Run: cd /Users/martinhorak/Downloads/oig_cloud/custom_components/oig_cloud/www_v2 && npx tsc --noEmit
    Expected Result: Exit code 0, no errors
    Failure Indicators: Non-zero exit code
    Evidence: .sisyphus/evidence/task-2-tsc-check.txt
  ```

  **Commit**: YES (groups with 1, 3)
  - Message: `fix(dashboard): compact pricing tab — reduce spacing, padding, and font sizes`
  - Files: `www_v2/src/ui/features/pricing/chart.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 3. Compact app.ts CSS — pricing-layout gap, analytics-row gap, timeline button

  **What to do**:
  - Open `app.ts` and modify ONLY CSS values in `static styles` for pricing-related selectors
  - Apply these exact changes:

  **`.pricing-layout`** (line 247-252):
  ```css
  /* BEFORE */ gap: 16px;
  /* AFTER  */ gap: 8px;
  ```

  **`.analytics-row`** (line 271-275):
  ```css
  /* BEFORE */ gap: 12px;
  /* AFTER  */ gap: 8px;
  ```

  **`.timeline-btn`** (line 277-289):
  ```css
  /* BEFORE */ padding: 8px 14px; font-size: 13px;
  /* AFTER  */ padding: 6px 10px; font-size: 12px;
  ```

  **Must NOT do**:
  - Do NOT modify any CSS that is NOT related to pricing tab layout
  - Do NOT change `.flow-layout`, `.flow-center`, or any flow-related styles
  - Do NOT modify responsive breakpoints at lines 346-386
  - Do NOT change any `render*()` methods
  - Be careful to ONLY change `.pricing-layout`, `.analytics-row`, and `.timeline-btn`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 3 simple CSS value changes in one file, clearly scoped selectors
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — exact values provided

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 4 (build and deploy)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References**:
  - `www_v2/src/ui/app.ts:247-252` — `.pricing-layout` gap definition
  - `www_v2/src/ui/app.ts:271-275` — `.analytics-row` gap definition
  - `www_v2/src/ui/app.ts:277-291` — `.timeline-btn` padding and font-size
  - `www_v2/src/ui/app.ts:346-386` — Responsive breakpoints — DO NOT TOUCH

  **WHY Each Reference Matters**:
  - Lines 247-252: The main layout gap affects ALL 7 sections — reducing from 16px to 8px saves ~48px total (6 gaps × 8px)
  - Lines 271-275: Analytics row has 4 cards — reducing gap saves horizontal density
  - Lines 277-291: Timeline button is a standalone section — smaller padding reduces its footprint
  - Lines 346-386: These are responsive breakpoints for flow tab and analytics — must not be modified

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: App.ts CSS values correctly updated
    Tool: Bash (grep)
    Preconditions: app.ts has been saved with CSS changes
    Steps:
      1. Search for pricing-layout gap value in context
      2. Search for analytics-row gap value
      3. Search for timeline-btn padding value
    Expected Result: New compact values present, no old values for these selectors
    Failure Indicators: Old values still present
    Evidence: .sisyphus/evidence/task-3-css-values-check.txt
  ```

  **Commit**: YES (groups with 1, 2)
  - Message: `fix(dashboard): compact pricing tab — reduce spacing, padding, and font sizes`
  - Files: `www_v2/src/ui/app.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 4. Build and deploy to production

  **What to do**:
  - Run the deployment script `deploy_to_ha.sh` which:
    1. Auto-mounts SMB share to HA host (10.0.0.143)
    2. Builds V2 frontend (bun build)
    3. Copies built files to HA
    4. Restarts Home Assistant
  - Wait for HA to restart and dashboard to become available
  - Verify the build succeeded (exit code 0)

  **Must NOT do**:
  - Do NOT modify the deployment script
  - Do NOT manually build — let the script handle it
  - Do NOT skip the HA restart

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single script execution with status check
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed — deployment, not git operations

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Wave 1)
  - **Parallel Group**: Wave 2 (sequential with Task 5)
  - **Blocks**: Task 5 (production verification)
  - **Blocked By**: Tasks 1, 2, 3

  **References** (CRITICAL):

  **Pattern References**:
  - `deploy_to_ha.sh` — Deployment script (auto-mounts SMB, builds, copies, restarts)
  - `.ha_config` — HA credentials for deployment

  **WHY Each Reference Matters**:
  - `deploy_to_ha.sh`: The single deployment entry point — handles build + copy + restart
  - `.ha_config`: Required by the deploy script for SMB credentials

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Build and deployment succeeds
    Tool: Bash
    Preconditions: All 3 CSS files have been modified (tasks 1, 2, 3 complete)
    Steps:
      1. Run: cd /Users/martinhorak/Downloads/oig_cloud && bash deploy_to_ha.sh
      2. Check exit code is 0
      3. Wait 30 seconds for HA restart
    Expected Result: Script completes with exit code 0, build output shows success
    Failure Indicators: Non-zero exit code, build errors, SMB mount failure
    Evidence: .sisyphus/evidence/task-4-deploy-output.txt

  Scenario: HA dashboard is accessible after restart
    Tool: chrome-devtools
    Preconditions: Deployment completed, HA restarting
    Steps:
      1. Wait 45 seconds after deploy
      2. Navigate to: https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac_v2
      3. Wait for page to load (look for "oig-app" in DOM)
    Expected Result: Dashboard loads without errors
    Failure Indicators: 502/503 error, blank page, JavaScript errors
    Evidence: .sisyphus/evidence/task-4-dashboard-accessible.png
  ```

  **Commit**: NO (commit happens with tasks 1-3)

---

- [x] 5. Production verification + before/after comparison

  **What to do**:
  - Navigate to the production pricing tab
  - Navigate the shadow DOM: `home-assistant` → `home-assistant-main` → `ha-panel-iframe` → iframe → `oig-app` shadowRoot → `<main>`
  - Click the "Ceny" tab to activate it
  - Take screenshots of the compacted pricing tab (top view + full scroll if needed)
  - Measure scrollHeight via JavaScript evaluation
  - Verify no horizontal overflow
  - Verify chart still renders correctly
  - Compare with before screenshots in `.sisyphus/evidence/pricing-tab-current-top.png`

  **Must NOT do**:
  - Do NOT modify any files
  - Do NOT attempt CSS changes in production

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Browser navigation and screenshot capture
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — chrome-devtools MCP is sufficient and already proven for this project's shadow DOM

  **Parallelization**:
  - **Can Run In Parallel**: NO (requires Task 4 to complete)
  - **Parallel Group**: Wave 2 (after Task 4)
  - **Blocks**: F1, F2
  - **Blocked By**: Task 4

  **References** (CRITICAL):

  **Pattern References**:
  - `.sisyphus/evidence/pricing-tab-current-top.png` — BEFORE screenshot (top of pricing tab with hero row + price blocks)
  - `.sisyphus/evidence/pricing-tab-current-middle.png` — BEFORE screenshot (chart + analytics)

  **WHY Each Reference Matters**:
  - Before screenshots enable visual comparison — the agent should compare these with new screenshots
  - Shadow DOM navigation path is critical: `home-assistant` → `home-assistant-main` → `ha-panel-iframe` → iframe → `oig-app` shadowRoot → `<main>`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: ScrollHeight meets target (≤ 950px)
    Tool: chrome-devtools (evaluate_script)
    Preconditions: Dashboard loaded, Ceny tab active
    Steps:
      1. Navigate shadow DOM to reach <main> element
      2. Evaluate: document.querySelector('oig-app').shadowRoot.querySelector('main').scrollHeight
      3. Assert: scrollHeight <= 950
    Expected Result: scrollHeight ≤ 950px (down from ~1717px)
    Failure Indicators: scrollHeight > 950
    Evidence: .sisyphus/evidence/task-5-scrollheight.txt

  Scenario: No horizontal overflow
    Tool: chrome-devtools (evaluate_script)
    Preconditions: Dashboard loaded, Ceny tab active
    Steps:
      1. Evaluate scrollWidth vs clientWidth of main container
    Expected Result: scrollWidth === clientWidth (no horizontal scrollbar)
    Failure Indicators: scrollWidth > clientWidth
    Evidence: .sisyphus/evidence/task-5-overflow-check.txt

  Scenario: Visual comparison — compacted layout
    Tool: chrome-devtools (take_screenshot)
    Preconditions: Dashboard loaded, Ceny tab active
    Steps:
      1. Take screenshot of pricing tab top section
      2. Compare visually with .sisyphus/evidence/pricing-tab-current-top.png
    Expected Result: Visible reduction in spacing — hero cards smaller, text more compact
    Failure Indicators: No visible change, broken layout, overlapping elements
    Evidence: .sisyphus/evidence/task-5-pricing-compacted-top.png

  Scenario: Chart renders and is functional
    Tool: chrome-devtools (evaluate_script)
    Preconditions: Dashboard loaded, Ceny tab active, scrolled to chart
    Steps:
      1. Find canvas element in pricing chart shadow DOM
      2. Assert canvas has width > 0 and height > 0
    Expected Result: Canvas renders with positive dimensions
    Failure Indicators: Canvas not found, zero dimensions
    Evidence: .sisyphus/evidence/task-5-chart-renders.txt

  Scenario: All 4 hero cards visible
    Tool: chrome-devtools (take_snapshot)
    Preconditions: Dashboard loaded, Ceny tab active
    Steps:
      1. Take accessibility tree snapshot
      2. Verify 4 hero cards are present with their values (spot price, export price, average, solar forecast)
    Expected Result: All 4 hero card values visible in snapshot
    Failure Indicators: Missing hero cards, overlapping text, empty values
    Evidence: .sisyphus/evidence/task-5-hero-cards.txt
  ```

  **Commit**: NO (verification only)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 2 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Visual QA — Screenshot Comparison** — `unspecified-high`
  Take full-page screenshots of the compacted pricing tab. Compare with before screenshots at `.sisyphus/evidence/pricing-tab-current-top.png` and `.sisyphus/evidence/pricing-tab-current-middle.png`. Verify: no overlapping elements, no truncated text, all sections visible, chart renders, sparklines visible, hero card values readable. Scroll through entire tab and verify each section is properly compacted without breaking.
  Output: `Sections [7/7 visible] | Layout [OK/BROKEN] | Text [READABLE/TRUNCATED] | Chart [RENDERS/BROKEN] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Scope Fidelity Check** — `quick`
  Verify ONLY CSS values were changed: `git diff --stat` should show exactly 3 files (stats.ts, chart.ts, app.ts). Run `git diff` and verify every change is a CSS value replacement (no new selectors, no render method changes, no TypeScript logic changes). Check that responsive breakpoints are unchanged. Verify no files outside pricing feature were modified.
  Output: `Files Changed [3/3 expected] | CSS-Only [YES/NO] | Breakpoints [UNCHANGED/MODIFIED] | Logic [UNTOUCHED/MODIFIED] | VERDICT: APPROVE/REJECT`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1, 2, 3 (grouped) | `fix(dashboard): compact pricing tab — reduce spacing, padding, and font sizes` | `stats.ts`, `chart.ts`, `app.ts` | `npx tsc --noEmit` |

---

## Success Criteria

### Verification Commands
```bash
# ScrollHeight target (run in browser console after navigating to pricing tab):
document.querySelector('oig-app').shadowRoot.querySelector('main').scrollHeight
# Expected: ≤ 950 (was ~1717)

# No horizontal overflow:
const main = document.querySelector('oig-app').shadowRoot.querySelector('main');
main.scrollWidth === main.clientWidth
# Expected: true

# Build check:
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
# Expected: exit code 0
```

### Final Checklist
- [ ] All "Must Have" present (all 7 sections compacted)
- [ ] All "Must NOT Have" absent (no logic changes, no breakpoint changes, no new selectors)
- [ ] TypeScript compiles without errors
- [ ] ScrollHeight ≤ 950px
- [ ] No horizontal overflow
- [ ] Chart renders and is functional
- [ ] All hero card values visible and readable
- [ ] Successfully deployed to production
