# V2 Dashboard — Fix 3 Broken Features (Empty Tabs, Tiles Configurator, Shield Badge)

## TL;DR

> **Quick Summary**: Fix 3 broken features in the OIG Cloud V2 Dashboard: (1) empty Pricing/Boiler tabs caused by a missing `</div>` tag, (2) broken tiles configurator missing edit-mode button visibility and "Add Tile" button, (3) Shield status badge missing from the Střídač (inverter) flow node. All root causes confirmed via live DOM inspection and code analysis.
> 
> **Deliverables**:
> - Pricing ("Ceny") and Boiler ("Bojler") tabs render their content correctly
> - Tiles show ⚙️/🗑️ buttons in edit mode without hover; "Přidat dlaždici" button allows adding new tiles
> - Shield status badge (🛡️) visible inside Střídač flow node with status, queue count
> - All verified in production via deploy_to_ha.sh
> 
> **Estimated Effort**: Short (3 files, ~60 lines of changes total)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 (div fix) → Task 4 (deploy) → Task 5 (verify)

---

## Context

### Original Request
User reported: "tiles měli svůj konfigurátor a nevidím ve flow shield frontu a v záložkách ceny a bojler vůbec nic není" (Tiles had their own configurator and I don't see shield front in flow and in tabs pricing and boiler there's nothing)

### Interview Summary
**Key Discussions**:
- Shield badge location: "Uvnitř Střídač nodu" — inside the inverter flow node, next to the mode
- Shield scope: "Obojí" — status badge in flow view + detailed panel in control panel (control panel already works)
- Tiles: "V edit módu" — configurator buttons appear when edit mode is active
- Scope: "Vše najednou" — fix all 3 problems together
- Deploy: Uses `deploy_to_ha.sh` script with auto-SMB mount, always builds V2, always restarts HA

**Research Findings**:
- **Root cause #1 CONFIRMED via DOM inspection**: Missing `</div>` after line 833 in app.ts causes pricing/boiler tab-content divs to be nested inside the flow tab-content div. When flow tab is not active, `display:none` hides everything inside it including pricing and boiler.
- **Data loads correctly**: Verified in production — pricingData has 120 timeline entries, boilerState exists, tilesLeft has 4 tiles. NOT a data issue.
- **Tiles ⚙️ buttons**: Exist in DOM but have `opacity: 0` with `:host(:hover)` rule — need to always show when editMode=true
- **No "Add Tile" button**: Missing entirely — need to add to OigTilesContainer + wire @add-tile event in app.ts
- **Shield data pipeline**: shieldController already imported and subscribed in node.ts — only stores pendingServices/changingServices, needs to also store status/queueCount for badge

### Metis Review
**Identified Gaps** (addressed):
- Edit mode reactivity: CONFIRMED — uses `@property({ type: Boolean })` decorator, fully reactive
- Shield loading/error states: Resolved — default to EMPTY_SHIELD_STATE (status='idle', queueCount=0), badge shows "nečinný" 
- "Add Tile" button position: Resolved — after last tile in the 2-column grid, matching existing tile grid pattern
- Rollback strategy: HA has previous build; worst case: `git checkout` + redeploy
- Edit mode entry: Header ✏️ button dispatches `onEditClick()` → toggles `this.editMode`

---

## Work Objectives

### Core Objective
Fix all 3 broken UI features in the V2 dashboard so tabs render content, tiles can be configured, and shield status is visible in the flow view.

### Concrete Deliverables
- `app.ts`: Missing `</div>` added (1 line), `@add-tile` event wired, `onAddTile()` handler added
- `tile.ts`: Edit actions always visible in editMode, "Přidat dlaždici" button with event dispatch
- `node.ts`: Shield badge in renderInverter() showing status + queue count

### Definition of Done
- [ ] Pricing tab shows pricing chart and stats when selected
- [ ] Boiler tab shows boiler controls when selected
- [ ] In edit mode, ⚙️ and 🗑️ buttons visible on tiles (without hover)
- [ ] In edit mode, "Přidat dlaždici" button visible in tiles container
- [ ] Clicking "Přidat dlaždici" opens tile dialog for new tile creation
- [ ] Shield badge visible in Střídač flow node showing status and queue
- [ ] All verified in production at ha.muriel-cz.cz

### Must Have
- The `</div>` fix on exactly line 834 of app.ts
- ⚙️/🗑️ buttons always visible (not just on hover) when editMode=true
- "Přidat dlaždici" button that dispatches `add-tile` custom event with position
- Shield badge inside the Střídač node showing 🛡️ + status text + queue count
- Production deployment via deploy_to_ha.sh

### Must NOT Have (Guardrails)
- Do NOT restructure tab rendering or "clean up" adjacent HTML — ONLY add the missing `</div>`
- Do NOT refactor tile configuration, add validation, or change dialog behavior
- Do NOT modify shieldController subscription logic or add new ShieldState fields to the interface
- Do NOT create new CSS files — use inline styles or existing class patterns in the component's `static styles`
- Do NOT add npm packages or external libraries
- Do NOT change any data fetching logic (it works correctly)
- Do NOT touch V1 dashboard files (`custom_components/oig_cloud/www/**`)
- Do NOT modify deploy_to_ha.sh
- Do NOT add excessive comments, logging, or debug code
- Do NOT "improve" or refactor any code beyond the 3 specific fixes

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (no test framework in V2 frontend)
- **Automated tests**: None
- **Framework**: N/A
- **Agent QA**: Browser-based verification via Playwright skill after production deploy

### QA Policy
Every task includes agent-executed QA scenarios verified in production browser.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

| Deliverable Type | Verification Tool | Method |
|------------------|-------------------|--------|
| Tab rendering | Playwright (browser) | Navigate to dashboard, click tabs, screenshot content |
| Tiles buttons | Playwright (browser) | Enter edit mode, verify buttons visible, click add |
| Shield badge | Playwright (browser) | View flow tab, locate Střídač node, verify badge |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — all 3 fixes are independent):
├── Task 1: Fix missing </div> in app.ts [quick]
├── Task 2: Fix tiles configurator in tile.ts + app.ts [quick]
└── Task 3: Add shield badge in node.ts [quick]

Wave 2 (After Wave 1 — build, deploy, verify):
├── Task 4: Build and deploy to HA [quick]
└── Task 5: Production verification of all 3 fixes [quick] (after Task 4)

Wave FINAL (After ALL tasks):
└── Task F1: Scope fidelity check [quick]
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|------------|--------|------|
| 1 | — | 4 | 1 |
| 2 | — | 4 | 1 |
| 3 | — | 4 | 1 |
| 4 | 1, 2, 3 | 5 | 2 |
| 5 | 4 | F1 | 2 |
| F1 | 5 | — | FINAL |

### Agent Dispatch Summary

| Wave | # Parallel | Tasks → Agent Category |
|------|------------|----------------------|
| 1 | **3** | T1 → `quick`, T2 → `quick`, T3 → `quick` |
| 2 | **1→1** | T4 → `quick`, T5 → `quick` (sequential) |
| FINAL | **1** | F1 → `quick` |

---

## TODOs

- [x] 1. Fix missing `</div>` in app.ts — Restore correct tab nesting

  **What to do**:
  - In `app.ts`, add a closing `</div>` tag after line 833 (after the `</div>` that closes `.flow-layout`) and before the `<!-- ===== PRICING TAB ===== -->` comment on line 835.
  - This single line fix closes the flow tab-content `<div>` that was opened at line 809.
  - After the fix, lines 834-835 should read:
    ```
            </div>   ← NEW: closes flow tab-content div (opened at line 809)
    
              <!-- ===== PRICING TAB ===== -->
    ```
  - Verify the fix by checking DOM structure: pricing and boiler tab-content divs should be siblings of flow tab-content, NOT nested inside it.

  **Must NOT do**:
  - Do NOT add any comments like "<!-- closing flow tab -->" 
  - Do NOT restructure any other HTML
  - Do NOT change any CSS or tab switching logic
  - Do NOT touch anything else in the template

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line addition with exact location known
  - **Skills**: [`playwright`]
    - `playwright`: Needed for QA verification in production browser
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — no design/styling work, just a missing tag

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4 (deploy)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:809-836` — The bug location. Line 809 opens `<div class="tab-content ...flow...">`, line 833 closes `</div>` for `.flow-layout` only, line 836 opens pricing tab-content. The missing `</div>` must go between lines 833 and 835.

  **API/Type References**:
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:192-206` — Tab CSS rules: `.tab-content { display: none }` and `.tab-content.active { display: block }`. This explains WHY nesting causes empty tabs — parent's `display:none` overrides child's `display:block`.

  **WHY Each Reference Matters**:
  - Line 809-836: This IS the bug. The executor needs to see the exact nesting to understand which div is unclosed.
  - Line 192-206: Explains the CSS mechanism so executor understands why this 1-line fix resolves empty tabs.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Pricing tab renders content (happy path)
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard deployed and accessible at ha.muriel-cz.cz
    Steps:
      1. Navigate to the V2 dashboard URL
      2. Wait for page load (flow canvas visible)
      3. Click the "Ceny" tab button in the tab bar
      4. Wait 2 seconds for tab transition
      5. Take screenshot of the tab content area
      6. Assert: The tab-content div with pricing class has display !== "none"
      7. Assert: At least one child element is visible inside pricing tab (pricing chart or stats)
    Expected Result: Pricing tab content is visible with chart/stats rendered, not an empty white area
    Failure Indicators: Empty tab content area, display:none on pricing tab-content
    Evidence: .sisyphus/evidence/task-1-pricing-tab-visible.png

  Scenario: Boiler tab renders content (happy path)
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard deployed, pricing tab test passed
    Steps:
      1. Click the "Bojler" tab button in the tab bar
      2. Wait 2 seconds for tab transition
      3. Take screenshot of the tab content area
      4. Assert: The tab-content div with boiler-layout class has display !== "none"
      5. Assert: At least one boiler component is visible (temperature, mode controls)
    Expected Result: Boiler tab content is visible with controls rendered
    Failure Indicators: Empty tab content area, display:none on boiler tab-content
    Evidence: .sisyphus/evidence/task-1-boiler-tab-visible.png

  Scenario: Flow tab still works after fix (regression check)
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard deployed
    Steps:
      1. Click the "Přehled" (flow) tab button 
      2. Wait 2 seconds
      3. Take screenshot
      4. Assert: Flow canvas is visible with nodes (Střídač, Baterie, etc.)
    Expected Result: Flow view renders correctly, no regression from the div fix
    Failure Indicators: Flow canvas missing, nodes not visible
    Evidence: .sisyphus/evidence/task-1-flow-still-works.png

  Scenario: Tab-content divs are siblings, not nested (structural verification)
    Tool: Playwright (playwright skill) — evaluate JavaScript
    Preconditions: Dashboard loaded
    Steps:
      1. Execute JavaScript in browser: query all `.tab-content` elements
      2. For each, check `parentElement.classList` 
      3. Assert: NONE of the tab-content elements has a parent with class `tab-content`
    Expected Result: All 3 tab-content divs are direct children of `oig-grid`, not nested inside each other
    Failure Indicators: Any tab-content element with parentElement.classList containing "tab-content"
    Evidence: .sisyphus/evidence/task-1-dom-structure-verified.json
  ```

  **Commit**: YES
  - Message: `fix(dashboard): add missing </div> closing tag for flow tab-content`
  - Files: `custom_components/oig_cloud/www_v2/src/ui/app.ts`
  - Pre-commit: N/A (no test framework)

---

- [x] 2. Fix tiles configurator — Edit button visibility + Add Tile button

  **What to do**:

  **Part A — Fix ⚙️/🗑️ button visibility in OigTile (tile.ts)**:
  - In `OigTile` class `static styles`, add a CSS rule that makes `.edit-actions` always visible when the host has editMode. The component already conditionally renders the edit actions block (line 167: `${this.editMode ? html\`...\` : nothing}`), but the CSS has `opacity: 0` by default (line 96) and only shows on `:host(:hover)` (line 100-101).
  - Add a host attribute reflection for editMode OR use the `:host([editmode])` selector pattern. Since `editMode` is a `@property({ type: Boolean })` at line 12, add `reflect: true` to make it an attribute, then add CSS rule:
    ```css
    :host([editmode]) .edit-actions {
      opacity: 1;
    }
    ```
  - Alternatively, since the component already renders nothing when editMode is false (line 167), simply change the default `.edit-actions` opacity from `0` to `1` and remove the `:host(:hover)` rule — OR keep hover for non-edit mode by using conditional class in the template.
  - **SIMPLEST APPROACH**: Change `@property({ type: Boolean }) editMode = false;` to `@property({ type: Boolean, reflect: true }) editMode = false;` at line 12, then add `:host([editmode]) .edit-actions { opacity: 1; }` after the `:host(:hover)` rule at line 101.

  **Part B — Add "Přidat dlaždici" button in OigTilesContainer (tile.ts)**:
  - In `OigTilesContainer` class:
    1. Add an `onAddTile()` method that dispatches a custom event:
       ```typescript
       private onAddTile(): void {
         this.dispatchEvent(new CustomEvent('add-tile', {
           detail: { position: this.position },
           bubbles: true, composed: true,
         }));
       }
       ```
    2. In the `render()` method, when `editMode` is true, append an "add tile" button after the tiles list. Also show it in the empty state:
       ```typescript
       render() {
         const addBtn = this.editMode ? html`
           <button class="add-tile-btn" @click=${this.onAddTile}>
             ➕ Přidat dlaždici
           </button>
         ` : nothing;
         
         if (this.tiles.length === 0) {
           return html`
             <div class="empty-state">Žádné dlaždice</div>
             ${addBtn}
           `;
         }
         
         return html`
           ${this.tiles.map(tile => html`
             <oig-tile .data=${tile} .editMode=${this.editMode} class="${tile.isZero ? 'inactive' : ''}"></oig-tile>
           `)}
           ${addBtn}
         `;
       }
       ```
    3. Add CSS for `.add-tile-btn` in `static styles`:
       ```css
       .add-tile-btn {
         display: flex;
         align-items: center;
         justify-content: center;
         padding: 8px;
         border: 2px dashed var(--oig-text-secondary, #888);
         border-radius: 8px;
         background: transparent;
         color: var(--oig-text-secondary, #888);
         cursor: pointer;
         font-size: 12px;
         min-height: 50px;
         transition: border-color 0.2s, color 0.2s;
       }
       .add-tile-btn:hover {
         border-color: var(--oig-accent, #4fc3f7);
         color: var(--oig-accent, #4fc3f7);
       }
       ```

  **Part C — Wire @add-tile event in app.ts**:
  - Add `onAddTile()` handler method near the existing `onEditTile()` (around line 670):
    ```typescript
    private onAddTile(e: CustomEvent): void {
      const { position } = e.detail as { position: 'left' | 'right' };
      this.editingTileIndex = -1;
      this.editingTileSide = position;
      this.editingTileConfig = null;
      this.tileDialogOpen = true;
    }
    ```
  - Wire the event on the `<oig-tiles-container>` element at line 812-818 by adding `@add-tile=${this.onAddTile}`:
    ```html
    <oig-tiles-container
      .tiles=${this.tilesLeft}
      .editMode=${this.editMode}
      position="left"
      @edit-tile=${this.onEditTile}
      @delete-tile=${this.onDeleteTile}
      @add-tile=${this.onAddTile}
    ></oig-tiles-container>
    ```

  **Must NOT do**:
  - Do NOT change tile dialog behavior (it already handles null config for new tiles)
  - Do NOT add tile validation or max-tile-count logic
  - Do NOT refactor existing tile event handlers
  - Do NOT change the tile data model or storage format
  - Do NOT modify the tile save/delete logic in `onTileSaved` or `onDeleteTile`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Well-defined changes in 2 files (tile.ts + app.ts) with clear specifications
  - **Skills**: [`playwright`]
    - `playwright`: Needed for QA — enter edit mode, verify buttons, test add flow
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — button styling follows existing patterns, no design decisions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4 (deploy)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www_v2/src/ui/features/tiles/tile.ts:90-101` — `.edit-actions` CSS with opacity:0 and `:host(:hover)` rule. This is what makes ⚙️ buttons invisible. Need to add `:host([editmode])` override.
  - `custom_components/oig_cloud/www_v2/src/ui/features/tiles/tile.ts:10-12` — OigTile class definition with `editMode` property. Add `reflect: true` to make it an HTML attribute for CSS targeting.
  - `custom_components/oig_cloud/www_v2/src/ui/features/tiles/tile.ts:167-172` — Conditional rendering of edit actions block. Shows buttons already work when rendered, just invisible due to CSS.
  - `custom_components/oig_cloud/www_v2/src/ui/features/tiles/tile.ts:177-219` — OigTilesContainer class. Add onAddTile() method and modify render() to include add button.
  - `custom_components/oig_cloud/www_v2/src/ui/features/tiles/tile.ts:197-201` — Empty state CSS `.empty-state`. Follow this pattern for `.add-tile-btn` styling.

  **API/Type References**:
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:670-707` — Existing `onEditTile()` handler. Follow this exact pattern for `onAddTile()` — same property names (editingTileIndex, editingTileSide, editingTileConfig, tileDialogOpen).
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:724-752` — `onTileSaved()` handler. Already handles new tiles (index=-1): finds first null slot or pushes to end. No changes needed here.
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:812-818` — Template where `<oig-tiles-container>` is rendered. Add `@add-tile=${this.onAddTile}` here.
  - `custom_components/oig_cloud/www_v2/src/ui/app.ts:60` — `editMode` state property in app.ts, toggled by `onEditClick()` at line 601-603.

  **External References**:
  - Lit `@property` with `reflect: true`: Makes Boolean property reflect as HTML attribute, enabling CSS `:host([editmode])` selector.

  **WHY Each Reference Matters**:
  - tile.ts:90-101: THE bug location for invisible buttons — executor must see the current CSS to add the override
  - tile.ts:177-219: THE location for adding the Add Tile button — executor must see the current render() to modify it
  - app.ts:670-707: Pattern to follow for onAddTile — must match property names exactly
  - app.ts:724-752: Proves no changes needed in save logic — executor should NOT touch this
  - app.ts:812-818: WHERE to wire the event — exact template location

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Edit buttons visible in edit mode without hover (happy path)
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard deployed, tiles exist (at least 1 tile visible)
    Steps:
      1. Navigate to V2 dashboard
      2. Wait for flow tab to load
      3. Locate the edit mode button (✏️) in the header
      4. Click the edit mode button
      5. Wait 1 second for edit mode activation
      6. Take screenshot of the tiles area (left column)
      7. Assert: ⚙️ buttons are visible on tiles (opacity > 0, visible without hovering)
      8. Assert: 🗑️ buttons are visible on tiles
    Expected Result: All tile edit/delete buttons visible immediately in edit mode
    Failure Indicators: Buttons only appear on hover, buttons not rendered at all
    Evidence: .sisyphus/evidence/task-2-edit-buttons-visible.png

  Scenario: "Přidat dlaždici" button appears in edit mode (happy path)
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard in edit mode (from previous scenario)
    Steps:
      1. Look for "Přidat dlaždici" button in the tiles container
      2. Assert: Button exists with text "Přidat dlaždici" or "➕ Přidat dlaždici"
      3. Assert: Button has dashed border styling
      4. Take screenshot
    Expected Result: Add tile button visible with dashed border placeholder style
    Failure Indicators: No add button found, button exists but not visible
    Evidence: .sisyphus/evidence/task-2-add-tile-button-visible.png

  Scenario: Add tile button opens dialog (happy path)
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard in edit mode, add button visible
    Steps:
      1. Click the "Přidat dlaždici" button
      2. Wait 1 second for dialog to open
      3. Assert: Tile dialog (oig-tile-dialog) is visible/open
      4. Take screenshot of the dialog
    Expected Result: Tile configuration dialog opens ready for new tile setup
    Failure Indicators: No dialog appears, dialog appears but is for editing existing tile
    Evidence: .sisyphus/evidence/task-2-add-tile-dialog-opens.png

  Scenario: Buttons hidden when NOT in edit mode (negative check)
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard loaded, edit mode OFF
    Steps:
      1. Navigate to dashboard (ensure edit mode is off)
      2. Look for "Přidat dlaždici" button
      3. Assert: Button does NOT exist or is not visible
      4. Look for ⚙️ buttons on tiles
      5. Assert: Edit buttons have opacity 0 (hidden by default, show on hover)
    Expected Result: No add button visible, edit buttons hidden when not in edit mode
    Failure Indicators: Add button visible outside edit mode, edit buttons always showing
    Evidence: .sisyphus/evidence/task-2-buttons-hidden-no-edit.png
  ```

  **Commit**: YES (group with Task 1)
  - Message: `fix(tiles): show edit buttons in edit mode and add "Add Tile" button`
  - Files: `custom_components/oig_cloud/www_v2/src/ui/features/tiles/tile.ts`, `custom_components/oig_cloud/www_v2/src/ui/app.ts`
  - Pre-commit: N/A

---

- [x] 3. Add Shield status badge inside Střídač (inverter) flow node

  **What to do**:

  **Part A — Extend shield state storage in node.ts**:
  - The `onShieldUpdate` callback at line 510-513 currently only stores `pendingServices` and `changingServices`. Add two more `@state()` properties and update the callback to also store `status` and `queueCount`:
    ```typescript
    // Add after line 55:
    @state() private shieldStatus: 'idle' | 'running' = 'idle';
    @state() private shieldQueueCount: number = 0;
    ```
    ```typescript
    // Update onShieldUpdate at line 510-513:
    private onShieldUpdate: ShieldListener = (state) => {
      this.pendingServices = state.pendingServices;
      this.changingServices = state.changingServices;
      this.shieldStatus = state.status;
      this.shieldQueueCount = state.queueCount;
    };
    ```

  **Part B — Add shield badge to renderInverter() in node.ts**:
  - In the `renderInverter()` method (line 1005-1082), add a shield badge after the planner badge (line 1043). Insert between the planner badge and the battery-indicators div:
    ```typescript
    // After line 1043 (<div class="planner-badge ...">):
    <div class="shield-badge ${this.shieldStatus === 'running' ? 'shield-running' : 'shield-idle'}">
      🛡️ ${this.shieldStatus === 'running' ? 'Zpracovávám' : 'Nečinný'}${this.shieldQueueCount > 0 ? html` <span class="shield-queue">(${this.shieldQueueCount})</span>` : nothing}
    </div>
    ```

  **Part C — Add CSS for shield badge in node.ts**:
  - Add shield badge styles in the `static styles` section of OigFlowNode. Follow the existing `.planner-badge` pattern. Add near the planner badge CSS:
    ```css
    .shield-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 600;
      margin-top: 4px;
    }
    .shield-idle {
      background: rgba(76, 175, 80, 0.15);
      color: #4caf50;
    }
    .shield-running {
      background: rgba(33, 150, 243, 0.15);
      color: #2196f3;
    }
    .shield-queue {
      font-weight: 400;
      opacity: 0.8;
    }
    ```

  **Must NOT do**:
  - Do NOT modify `shieldController` or `shield-controller.ts`
  - Do NOT change the `ShieldState` interface
  - Do NOT add click handlers to the badge (it's informational only)
  - Do NOT add the badge to any other node (only Střídač/inverter)
  - Do NOT duplicate the control panel's detailed shield status
  - Do NOT add loading/error states — use defaults from EMPTY_SHIELD_STATE

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding a small badge component following existing patterns (planner badge)
  - **Skills**: [`playwright`]
    - `playwright`: Needed for QA — verify badge appears in flow view
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — badge follows existing planner-badge pattern exactly

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 4 (deploy)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:1043` — `.planner-badge` rendering. Shield badge goes directly after this. Follow same HTML structure (div with class, conditional text).
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:1024-1082` — Full `renderInverter()` method. Executor must see the complete template to find insertion point.
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:54-56` — Existing `@state()` properties for shield data. Add `shieldStatus` and `shieldQueueCount` here.
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts:510-513` — `onShieldUpdate` callback. Must be extended to store status and queueCount.

  **API/Type References**:
  - `custom_components/oig_cloud/www_v2/src/ui/features/control-panel/types.ts:163-184` — `ShieldState` interface. Shows available fields: `status: 'idle' | 'running'`, `queueCount: number`. These are what the badge displays.
  - `custom_components/oig_cloud/www_v2/src/ui/features/control-panel/types.ts:186-199` — `EMPTY_SHIELD_STATE` defaults: `status: 'idle'`, `queueCount: 0`. Badge will default to "Nečinný" with no queue.

  **CSS Pattern References**:
  - Search for `.planner-badge` in node.ts `static styles` — follow this exact pattern for `.shield-badge` (same padding, font-size, border-radius). The planner badge has `.planner-auto`, `.planner-off`, `.planner-unknown` variants — shield badge uses `.shield-idle`, `.shield-running`.

  **WHY Each Reference Matters**:
  - node.ts:1043: EXACT insertion point — badge goes right after planner badge
  - node.ts:54-56: WHERE to add new state properties — must be in the same section
  - node.ts:510-513: WHERE to extend callback — must add 2 lines to store additional data
  - types.ts:163-184: WHAT data is available — executor needs to know the exact field names and types

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Shield badge visible in Střídač node (happy path)
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard deployed, flow tab active
    Steps:
      1. Navigate to V2 dashboard
      2. Wait for flow view to render (Střídač node visible)
      3. Locate the Střídač (inverter) node
      4. Look for shield badge element (🛡️ text)
      5. Take screenshot of the Střídač node
      6. Assert: Shield badge is visible inside the node
      7. Assert: Badge shows "🛡️ Nečinný" (idle state) or "🛡️ Zpracovávám" (running state)
    Expected Result: Shield status badge visible inside inverter node with status text
    Failure Indicators: No badge visible, badge outside the node, badge with "undefined" text
    Evidence: .sisyphus/evidence/task-3-shield-badge-visible.png

  Scenario: Shield badge styling matches planner badge (visual consistency)
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard deployed, flow tab active
    Steps:
      1. Locate Střídač node with both planner badge and shield badge
      2. Take screenshot
      3. Assert: Shield badge has rounded corners (border-radius)
      4. Assert: Shield badge has colored background (green for idle, blue for running)
      5. Assert: Font size is small (10px range), consistent with planner badge
    Expected Result: Shield badge visually consistent with planner badge styling
    Failure Indicators: Badge unstyled, badge too large, colors missing
    Evidence: .sisyphus/evidence/task-3-shield-badge-styled.png

  Scenario: Badge absent from non-inverter nodes (negative check)
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard deployed, flow tab active
    Steps:
      1. Locate Battery node (Baterie)
      2. Assert: No shield badge (🛡️) inside Battery node
      3. Locate Grid node (Síť)
      4. Assert: No shield badge inside Grid node
    Expected Result: Shield badge ONLY appears in Střídač node, not in any other flow node
    Failure Indicators: Shield badge appears in non-inverter nodes
    Evidence: .sisyphus/evidence/task-3-shield-badge-only-inverter.png
  ```

  **Commit**: YES (group with Tasks 1, 2)
  - Message: `feat(flow): add shield status badge to inverter node`
  - Files: `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts`
  - Pre-commit: N/A

---

- [x] 4. Build and deploy to Home Assistant

  **What to do**:
  - Run the deployment script: `bash deploy_to_ha.sh`
  - The script auto-detects V2, builds the frontend, mounts SMB share to HA, copies files, and restarts HA
  - Wait for HA restart to complete (script handles this)
  - Verify the script exits with code 0

  **Must NOT do**:
  - Do NOT modify deploy_to_ha.sh
  - Do NOT manually copy files — use the script only
  - Do NOT change HA configuration

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single script execution
  - **Skills**: [`playwright`]
    - `playwright`: Needed for post-deploy browser verification
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed — no git operations in deploy

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Wave 1)
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 1, 2, 3

  **References**:

  **Pattern References**:
  - `deploy_to_ha.sh` — Deployment script. Run from project root: `bash deploy_to_ha.sh`. Uses `.ha_config` for credentials.
  
  **WHY Each Reference Matters**:
  - deploy_to_ha.sh: The ONLY way to deploy. Executor must run this, not manual file copy.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Deploy script succeeds (happy path)
    Tool: Bash
    Preconditions: All 3 code fixes applied (Tasks 1-3 complete)
    Steps:
      1. Run: bash deploy_to_ha.sh (from project root /Users/martinhorak/Downloads/oig_cloud)
      2. Wait for script completion (timeout: 5 minutes)
      3. Assert: Exit code is 0
      4. Assert: Script output contains success message (e.g. "restart" or "done")
    Expected Result: Script completes successfully, HA restarts with new code
    Failure Indicators: Non-zero exit code, build errors, SMB mount failure, HA unreachable
    Evidence: .sisyphus/evidence/task-4-deploy-output.txt

  Scenario: Dashboard loads after deploy (smoke test)
    Tool: Playwright (playwright skill)
    Preconditions: Deploy script completed successfully
    Steps:
      1. Wait 30 seconds for HA to restart
      2. Navigate to dashboard URL: https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac_v2
      3. Wait for page load (timeout: 30s)
      4. Assert: Page loads without error
      5. Assert: Flow canvas or tab bar is visible
    Expected Result: Dashboard loads and renders after deploy
    Failure Indicators: 404 error, blank page, JS errors in console
    Evidence: .sisyphus/evidence/task-4-dashboard-loads.png
  ```

  **Commit**: NO (already committed in Tasks 1-3)

---

- [x] 5. Production verification of all 3 fixes

  **What to do**:
  - Open production dashboard in browser
  - Systematically verify each of the 3 fixes
  - Take before/after-style screenshots of each fix
  - Run all QA scenarios from Tasks 1, 2, 3

  **Must NOT do**:
  - Do NOT make any code changes during verification
  - Do NOT skip any QA scenario

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Browser-only verification
  - **Skills**: [`playwright`]
    - `playwright`: Primary tool — all verification is browser-based
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — verification only, no design work

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Task 4)
  - **Blocks**: Task F1
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - Dashboard URL: `https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac_v2`
  - Static files URL: `https://ha.muriel-cz.cz/oig_cloud_static_v2/`

  **WHY Each Reference Matters**:
  - Dashboard URL: WHERE to verify — the production deployment target

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Complete verification — all 3 fixes working together
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard deployed (Task 4 complete)
    Steps:
      1. Navigate to dashboard URL
      2. Wait for full load
      3. VERIFY FIX #1:
         a. Click "Ceny" tab → screenshot → assert content visible
         b. Click "Bojler" tab → screenshot → assert content visible
         c. Click "Přehled" tab → assert flow still works
      4. VERIFY FIX #2:
         a. Click edit mode button (✏️)
         b. Assert ⚙️ buttons visible on tiles
         c. Assert "Přidat dlaždici" button visible
         d. Click "Přidat dlaždici" → assert dialog opens
         e. Close dialog, click edit mode to exit
         f. Assert buttons are hidden again
      5. VERIFY FIX #3:
         a. On flow tab, locate Střídač node
         b. Assert shield badge (🛡️) visible inside node
         c. Assert badge shows status text ("Nečinný" or "Zpracovávám")
      6. Take final screenshot of each view
    Expected Result: All 3 fixes working correctly in production
    Failure Indicators: Any of the 3 fixes not working as specified
    Evidence: 
      - .sisyphus/evidence/task-5-final-pricing.png
      - .sisyphus/evidence/task-5-final-boiler.png
      - .sisyphus/evidence/task-5-final-tiles-edit.png
      - .sisyphus/evidence/task-5-final-shield-badge.png
  ```

  **Commit**: NO

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 1 review agent runs after all tasks complete.

- [ ] F1. **Scope Fidelity Check** — `quick`
  For each task: read "What to do" from plan, read actual git diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Flag unaccounted changes. Verify ONLY 3 files were modified: app.ts, tile.ts, node.ts.
  Output: `Tasks [N/N compliant] | Files Modified [expected 3] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| After Task(s) | Message | Files | Verification |
|---------------|---------|-------|--------------|
| 1, 2, 3 | `fix(dashboard): fix empty tabs, tiles configurator, and add shield badge` | app.ts, tile.ts, node.ts | Production browser verification |

> Note: All 3 fixes can be committed together since they're independent bug fixes in the same deploy cycle.

---

## Success Criteria

### Verification Commands
```bash
# Build check (part of deploy script)
bash deploy_to_ha.sh  # Expected: exit 0, HA restarts with new code
```

### Final Checklist
- [ ] Pricing tab shows chart and stats (not empty)
- [ ] Boiler tab shows controls (not empty)
- [ ] Flow tab still works correctly (no regression)
- [ ] In edit mode: ⚙️/🗑️ buttons visible on tiles
- [ ] In edit mode: "Přidat dlaždici" button visible
- [ ] Clicking "Přidat dlaždici" opens tile dialog
- [ ] Shield badge visible in Střídač node with status
- [ ] Only 3 files modified: app.ts, tile.ts, node.ts
- [ ] No V1 dashboard files touched
- [ ] No new dependencies added
