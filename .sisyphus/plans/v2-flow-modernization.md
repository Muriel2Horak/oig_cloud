# V2 Flow Modernization — Neon/Modern Visual Effects

## TL;DR

> **Quick Summary**: Add 4 visual effects to the V2 flow canvas connections: Bezier curves, neon glow, gradient coloring, and direction indicators. All changes in a single file (`canvas.ts`). Modern/Neon style — glowing curved lines on dark background.
> 
> **Deliverables**:
> - Smooth cubic Bezier connection paths (replacing straight lines)
> - Neon glow filter on active connections
> - Source→destination color gradients along paths
> - Animated direction indicators (SVG chevrons along paths)
> 
> **Estimated Effort**: Short (single file, ~100 lines of changes)
> **Parallel Execution**: NO — sequential (each effect builds on previous)
> **Critical Path**: Bezier → Gradient → Glow → Direction → Build → Deploy → Verify

---

## Context

### Original Request
User chose "Všechny 4 efekty" (all 4 effects) and "Moderní/Neon" visual style for Task 10 of the V2 Flow Overhaul plan. This is the final visual polish task.

### Interview Summary
**Key Discussions**:
- All 4 effects confirmed: Bezier curves, glow, gradients, direction indicators
- Modern/Neon style: glowing lines on dark background, sci-fi aesthetic
- Phase C limited to flow canvas only — no spreading to other tabs
- Particle system stays as-is (straight animation acceptable with subtle curves)

**Research Findings**:
- `canvas.ts` is 498 lines, key method `drawConnectionsSVG()` at lines 288-331
- Currently creates SVG `<line>` elements with hardcoded `stroke`, `stroke-width: 3`, `opacity: 0.6`
- `NODE_COLORS` in `types.ts` provides per-node colors for gradients
- `FLOW_COLORS` provides per-connection-type colors (slightly different from node colors)
- Particles use Web Animation API with straight-line `left`/`top` interpolation
- `calcEdgePoint()` already computes edge intersection points
- SVG is fully cleared and redrawn each frame (`svgEl.innerHTML = ''`)

### Metis Review
**Identified Gaps** (addressed):
- **Particle-Bezier mismatch**: Particles animate on straight lines but connections will be curved. Decision: keep particles straight — curves will be subtle enough that mismatch is imperceptible. Full particle refactor to `animateMotion` is out of scope.
- **Gradient direction for bidirectional connections**: Battery and grid connections dynamically flip direction. Solution: `from`/`to` in `FlowLine` already contains the correct direction — use it directly for gradient start/end.
- **Glow filter performance**: Use `stdDeviation ≤ 4` for blur to keep performance acceptable on mobile.
- **Short connection loops**: Clamp Bezier control point offset to `Math.min(offset, 0.3 * distance)` to prevent loops on short connections.
- **SVG ID collisions**: Use connection `line.id` as suffix for gradient/filter IDs.
- **Dark/light mode**: Current app uses dark theme exclusively — neon glow is designed for this.
- **Reduced motion**: Not addressed (no existing precedent in V1 or V2).

---

## Work Objectives

### Core Objective
Transform the flat, straight connection lines in the V2 flow canvas into visually stunning Modern/Neon styled curves with glow effects, color gradients, and animated direction indicators.

### Concrete Deliverables
- Modified `canvas.ts` with all 4 visual effects implemented in `drawConnectionsSVG()`
- Built production bundle via `npm run build`
- Deployed to production HA via `deploy_to_ha.sh`

### Definition of Done
- [ ] All 4 connection types (solar→inverter, battery↔inverter, grid↔inverter, inverter→house) show curved Bezier paths
- [ ] Active connections have visible neon glow
- [ ] Connections show source→destination color gradients
- [ ] Animated direction indicators visible on active connections
- [ ] Build passes with zero errors
- [ ] Production deployment verified visually

### Must Have
- Bezier curves replacing straight `<line>` elements
- SVG glow filter (`feGaussianBlur` + `feMerge`)
- `<linearGradient>` per connection with source/destination node colors
- Animated direction indicators along paths
- All existing functionality preserved (particles, resize handling, tab switching)

### Must NOT Have (Guardrails)
- No changes outside `canvas.ts` (except importing `NODE_COLORS` from types.ts)
- No new Web Components
- No new npm dependencies
- No modifications to particle system (particles stay straight-line)
- No V1 file changes
- No backend changes
- No glow effects on nodes (connections only)
- No new configuration options for curve intensity/glow strength
- No extraction of utilities into separate files
- No `prefers-reduced-motion` handling (no existing precedent)
- Direction indicators must NOT conflict visually with existing particles
- Particle count stays ≤50

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> ALL verification is executed by the agent using tools.

### Test Decision
- **Infrastructure exists**: YES (vitest configured)
- **Automated tests**: NO — this is pure visual CSS/SVG work, unit tests don't apply
- **Primary verification**: Agent-Executed QA via Playwright (browser screenshots + DOM inspection)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

Verification is done via Chrome DevTools and Playwright — inspecting SVG DOM structure and taking screenshots.

---

## Execution Strategy

### Sequential Execution (Single File)

All changes are in one file (`canvas.ts`), building on each other:

```
Step 1: Bezier curves (replace <line> with <path>)
Step 2: Gradient connections (add <defs> with <linearGradient>)
Step 3: Glow filter (add <filter> to <defs>)
Step 4: Direction indicators (add animated chevrons)
Step 5: Build + Deploy + Verify
```

No parallelization needed — single file, each step ≤20 lines.

---

## TODOs

- [ ] 1. Implement all 4 flow modernization effects in canvas.ts

  **What to do**:

  All changes go into `drawConnectionsSVG()` method (lines 288-331) and the CSS styles section. The method currently clears the SVG and creates `<line>` elements. Replace with:

  ### Step A: Add `<defs>` section with glow filter

  At the top of `drawConnectionsSVG()`, after `svgEl.innerHTML = ''`, create a `<defs>` element and append it to the SVG:

  ```typescript
  // Create <defs> for filters and gradients
  const defs = document.createElementNS(NS, 'defs');
  
  // Neon glow filter
  const filter = document.createElementNS(NS, 'filter');
  filter.setAttribute('id', 'neon-glow');
  filter.setAttribute('x', '-50%');
  filter.setAttribute('y', '-50%');
  filter.setAttribute('width', '200%');
  filter.setAttribute('height', '200%');
  
  const blur = document.createElementNS(NS, 'feGaussianBlur');
  blur.setAttribute('in', 'SourceGraphic');
  blur.setAttribute('stdDeviation', '3');
  blur.setAttribute('result', 'blur');
  filter.appendChild(blur);
  
  const merge = document.createElementNS(NS, 'feMerge');
  const mergeBlur = document.createElementNS(NS, 'feMergeNode');
  mergeBlur.setAttribute('in', 'blur');
  merge.appendChild(mergeBlur);
  const mergeOrig = document.createElementNS(NS, 'feMergeNode');
  mergeOrig.setAttribute('in', 'SourceGraphic');
  merge.appendChild(mergeOrig);
  filter.appendChild(merge);
  defs.appendChild(filter);
  
  svgEl.appendChild(defs);
  ```

  ### Step B: Import NODE_COLORS and add gradient mapping

  At the top of the file, import `NODE_COLORS` from `./types` (add to existing import).

  Add a constant mapping flow line IDs to source/dest node colors:

  ```typescript
  /** Map flow connection from/to node names to NODE_COLORS for gradients */
  function getGradientColors(from: string, to: string): { fromColor: string; toColor: string } {
    return {
      fromColor: NODE_COLORS[from] || '#9e9e9e',
      toColor: NODE_COLORS[to] || '#9e9e9e',
    };
  }
  ```

  ### Step C: Replace `<line>` with `<path>` (Bezier curves) + gradients + glow

  Inside the `for (const line of this.lines)` loop, replace the `<line>` creation (lines 319-330) with:

  ```typescript
  // 1. Calculate Bezier control points
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Perpendicular offset for curve (clamped to prevent loops on short connections)
  const curveOffset = Math.min(dist * 0.2, 40);
  // Normal vector (perpendicular to line direction)
  const nx = -dy / dist;
  const ny = dx / dist;
  // Midpoint
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  // Control point (offset perpendicular to midpoint)
  const cx = mx + nx * curveOffset;
  const cy = my + ny * curveOffset;
  
  // 2. Create gradient for this connection
  const gradientId = `grad-${line.id}`;
  const { fromColor, toColor } = getGradientColors(line.from, line.to);
  const gradient = document.createElementNS(NS, 'linearGradient');
  gradient.setAttribute('id', gradientId);
  gradient.setAttribute('x1', String(from.x));
  gradient.setAttribute('y1', String(from.y));
  gradient.setAttribute('x2', String(to.x));
  gradient.setAttribute('y2', String(to.y));
  gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
  const stop1 = document.createElementNS(NS, 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', fromColor);
  const stop2 = document.createElementNS(NS, 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', toColor);
  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
  
  // 3. Draw Bezier curve path with gradient and glow
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`);
  path.setAttribute('stroke', `url(#${gradientId})`);
  path.setAttribute('stroke-width', '3');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('fill', 'none');
  path.setAttribute('opacity', '0.8');
  path.setAttribute('filter', 'url(#neon-glow)');
  path.classList.add('flow-line');
  svgEl.appendChild(path);
  ```

  Note: Using quadratic Bezier (`Q`) with single control point instead of cubic (`C`) for simplicity — produces smooth enough curves with less code.

  ### Step D: Direction indicators (animated chevrons along paths)

  After drawing each path, add animated direction indicators:

  ```typescript
  // 4. Direction indicator — animated chevron along path
  if (line.params.active) {
    const chevronSize = 6;
    const chevron = document.createElementNS(NS, 'polygon');
    chevron.setAttribute('points', `0,${-chevronSize} ${chevronSize * 1.2},0 0,${chevronSize}`);
    chevron.setAttribute('fill', line.color);
    chevron.setAttribute('opacity', '0.9');
    
    const animateMotion = document.createElementNS(NS, 'animateMotion');
    animateMotion.setAttribute('dur', `${Math.max(1, line.params.speed / 1000)}s`);
    animateMotion.setAttribute('repeatCount', 'indefinite');
    animateMotion.setAttribute('path', `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`);
    animateMotion.setAttribute('rotate', 'auto');
    
    chevron.appendChild(animateMotion);
    svgEl.appendChild(chevron);
  }
  ```

  ### Step E: Update CSS styles

  Update the `.flow-line` CSS class to remove hardcoded opacity/stroke-width since those are now set per-element:

  ```css
  .flow-line {
    fill: none;
    stroke-linecap: round;
    /* Removed: stroke-width, opacity — now set dynamically */
  }
  ```

  **Must NOT do**:
  - Do NOT modify the particle system (`spawnParticles()`, `createParticle()`)
  - Do NOT modify `updateLines()` logic
  - Do NOT modify `calcEdgePoint()` or `getNodeInfo()`
  - Do NOT add new Web Components
  - Do NOT extract code into separate files
  - Do NOT touch any file outside `canvas.ts` (except the import line for NODE_COLORS from types.ts)
  - Do NOT change the `FlowLine` interface
  - Do NOT add dynamic configuration options
  - Keep `opacity` at 0.8 (slightly higher than current 0.6 for neon visibility)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file modification, ~80 lines of straightforward SVG code, clear instructions
  - **Skills**: [`playwright`]
    - `playwright`: Needed for visual verification via browser screenshots and DOM inspection
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — specific SVG changes already defined, no design decisions
    - `git-master`: Not needed — single commit at the end

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (only task)
  - **Blocks**: Task 2 (Build & Deploy)
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/canvas.ts:288-331` — Current `drawConnectionsSVG()` method — THE MAIN TARGET. Replace the `<line>` creation loop with Bezier `<path>` + gradients + glow + direction indicators
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/canvas.ts:252-270` — `calcEdgePoint()` method — DO NOT MODIFY, just understand how it returns edge intersection points
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/canvas.ts:272-286` — `getNodeInfo()` method — returns `{x, y, hw, hh}` relative to grid. DO NOT MODIFY
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/canvas.ts:305` — SVG namespace constant `const NS = 'http://www.w3.org/2000/svg'` — reuse this for all createElementNS calls
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/canvas.ts:93-98` — `.flow-line` CSS class to update

  **API/Type References** (contracts to implement against):
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/types.ts:175-181` — `NODE_COLORS` — source/destination colors for gradients: solar=#ffd54f, battery=#4caf50, inverter=#9575cd, grid=#42a5f5, house=#f06292
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/types.ts:199-205` — `FLOW_COLORS` — connection line colors: solar=#ffd54f, battery=#ff9800, grid_import=#f44336, grid_export=#4caf50, house=#f06292
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/types.ts:156-163` — `FlowParams` interface — `active`, `intensity`, `count`, `speed`, `size`, `opacity` fields. Use `active` to conditionally show direction indicators. Use `speed` for animation duration.
  - `custom_components/oig_cloud/www_v2/src/ui/features/flow/canvas.ts:22-29` — `FlowLine` interface — `id`, `from`, `to`, `color`, `power`, `params` fields. Use `from`/`to` to look up NODE_COLORS for gradients. Use `id` for unique gradient/filter IDs.

  **WHY Each Reference Matters**:
  - `drawConnectionsSVG()` (288-331): This is the ONLY method you modify. Replace the `<line>` creation with `<path>` + `<defs>` structure
  - `NODE_COLORS` (types.ts:175-181): Use these for gradient start/end colors. Map `line.from` → `NODE_COLORS[line.from]`, `line.to` → `NODE_COLORS[line.to]`
  - `FlowParams.active` (types.ts:157): Only show direction indicators when `line.params.active === true`
  - `FlowParams.speed` (types.ts:160): Use for `animateMotion dur` attribute — `speed / 1000` seconds

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Verify Bezier curves replace straight lines
    Tool: Playwright (playwright skill)
    Preconditions: App built and deployed, dev server or production URL accessible
    Steps:
      1. Navigate to: https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac_v2
      2. Wait for: iframe to load (oig_cloud_static_v2/index.html)
      3. Switch to iframe context
      4. Wait for: svg.connections-layer to be present (timeout: 10s)
      5. Query: svg.connections-layer path[d] — count elements
      6. Assert: At least 1 <path> element exists (solar is usually active)
      7. Assert: No <line> elements exist in svg.connections-layer
      8. Query: path[d] attribute value contains "Q" (quadratic Bezier command)
      9. Screenshot: .sisyphus/evidence/task-1-bezier-curves.png
    Expected Result: Curved paths visible, no straight lines
    Evidence: .sisyphus/evidence/task-1-bezier-curves.png

  Scenario: Verify neon glow filter exists and is applied
    Tool: Playwright (playwright skill)
    Preconditions: Same as above
    Steps:
      1. In iframe context, query: svg.connections-layer defs filter#neon-glow
      2. Assert: filter element exists
      3. Query: filter#neon-glow feGaussianBlur
      4. Assert: feGaussianBlur exists with stdDeviation attribute
      5. Query: path.flow-line[filter]
      6. Assert: filter attribute contains "url(#neon-glow)"
      7. Screenshot: .sisyphus/evidence/task-1-glow-effect.png
    Expected Result: Glow filter defined and applied to connection paths
    Evidence: .sisyphus/evidence/task-1-glow-effect.png

  Scenario: Verify gradient connections
    Tool: Playwright (playwright skill)
    Preconditions: Same as above, solar power > 50W (usually true during daytime)
    Steps:
      1. In iframe context, query: svg.connections-layer defs linearGradient
      2. Assert: At least 1 linearGradient element exists
      3. Query: linearGradient stop elements
      4. Assert: Each gradient has 2 stops with stop-color attributes
      5. Query: path.flow-line[stroke] 
      6. Assert: stroke attribute contains "url(#grad-" (gradient reference)
      7. Screenshot: .sisyphus/evidence/task-1-gradients.png
    Expected Result: Gradient definitions present, paths use gradient stroke
    Evidence: .sisyphus/evidence/task-1-gradients.png

  Scenario: Verify direction indicators animate
    Tool: Playwright (playwright skill)
    Preconditions: Same as above, at least 1 active connection
    Steps:
      1. In iframe context, query: svg.connections-layer polygon
      2. Assert: At least 1 polygon (chevron) element exists
      3. Query: polygon animateMotion
      4. Assert: animateMotion element exists with path and dur attributes
      5. Assert: animateMotion repeatCount is "indefinite"
      6. Screenshot: .sisyphus/evidence/task-1-direction-indicators.png
    Expected Result: Animated chevrons moving along connection paths
    Evidence: .sisyphus/evidence/task-1-direction-indicators.png

  Scenario: Verify particles still work (regression)
    Tool: Playwright (playwright skill)
    Preconditions: Same as above
    Steps:
      1. In iframe context, query: .particles-layer .particle
      2. Wait 3 seconds for particles to spawn
      3. Query again: .particles-layer .particle
      4. Assert: particle count > 0 (particles are spawning)
      5. Assert: particle count ≤ 50 (MAX_PARTICLES respected)
      6. Screenshot: .sisyphus/evidence/task-1-particles-regression.png
    Expected Result: Particles still animate along connections
    Evidence: .sisyphus/evidence/task-1-particles-regression.png

  Scenario: Verify no straight line elements remain
    Tool: Playwright (playwright skill)
    Preconditions: Same as above
    Steps:
      1. In iframe context, query: svg.connections-layer line
      2. Assert: Zero <line> elements (all replaced with <path>)
    Expected Result: Clean replacement, no legacy elements
    Evidence: Console assertion

  Scenario: Full visual verification screenshot
    Tool: Playwright (playwright skill)
    Preconditions: Same as above, daytime (solar active) for best visual
    Steps:
      1. Navigate to V2 dashboard
      2. Wait for flow tab to load
      3. Wait 5 seconds for particles and animations to stabilize
      4. Take full-page screenshot
      5. Screenshot: .sisyphus/evidence/task-1-full-flow-visual.png
    Expected Result: Neon-styled flow canvas with curved glowing gradient connections and animated chevrons
    Evidence: .sisyphus/evidence/task-1-full-flow-visual.png
  ```

  **Evidence to Capture:**
  - [ ] .sisyphus/evidence/task-1-bezier-curves.png
  - [ ] .sisyphus/evidence/task-1-glow-effect.png
  - [ ] .sisyphus/evidence/task-1-gradients.png
  - [ ] .sisyphus/evidence/task-1-direction-indicators.png
  - [ ] .sisyphus/evidence/task-1-particles-regression.png
  - [ ] .sisyphus/evidence/task-1-full-flow-visual.png

  **Commit**: YES
  - Message: `feat(flow): add neon Bezier curves, glow, gradients and direction indicators`
  - Files: `custom_components/oig_cloud/www_v2/src/ui/features/flow/canvas.ts`
  - Pre-commit: `npm run build` (in www_v2 directory)

- [ ] 2. Build and deploy to production

  **What to do**:
  1. Run `npm run build` in `custom_components/oig_cloud/www_v2/`
  2. Verify build succeeds with zero errors
  3. Deploy: `SMB_MOUNT="/private/tmp/ha_mount" ./deploy_to_ha.sh` (from project root)
  4. Wait for HA restart to complete (~30-60 seconds)

  **Must NOT do**:
  - Do NOT modify `deploy_to_ha.sh`
  - Do NOT use `--fe-only` or `--fe-v2-only` flags (full deploy required for restart)
  - Do NOT use `bun` for build (use `npm`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two shell commands, no decision-making needed
  - **Skills**: []
    - No special skills needed — just bash commands
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed yet — verification is in Task 3

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 3 (Verification)
  - **Blocked By**: Task 1 (Implementation)

  **References**:

  **Documentation References**:
  - Project root `deploy_to_ha.sh` — Deploy script. Run with `SMB_MOUNT="/private/tmp/ha_mount"` env var. Lines 316-353 handle HA restart.

  **Acceptance Criteria**:

  ```
  Scenario: Build succeeds
    Tool: Bash
    Steps:
      1. cd custom_components/oig_cloud/www_v2 && npm run build
      2. Assert: Exit code 0
      3. Assert: No TypeScript errors in output
      4. Assert: Output mentions module count (e.g., "394 modules")
    Expected Result: Clean build

  Scenario: Deploy succeeds
    Tool: Bash
    Preconditions: SMB mount accessible at /private/tmp/ha_mount
    Steps:
      1. SMB_MOUNT="/private/tmp/ha_mount" ./deploy_to_ha.sh
      2. Assert: Exit code 0
      3. Assert: Output shows file count deployed
      4. Assert: Output shows HA restart triggered
      5. Wait 60 seconds for HA restart
    Expected Result: Files deployed, HA restarted
  ```

  **Commit**: NO (commit is in Task 1)

- [ ] 3. Visual verification on production

  **What to do**:
  1. Open production dashboard in browser
  2. Navigate to flow tab (Toky)
  3. Verify all 4 effects are visible
  4. Take screenshots as evidence
  5. Check mobile responsive view

  **Must NOT do**:
  - Do NOT modify any code during verification
  - If issues found, report back — do NOT auto-fix

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Browser verification only, screenshot capture
  - **Skills**: [`playwright`]
    - `playwright`: Required for browser navigation and screenshot capture

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None
  - **Blocked By**: Task 2 (Deploy)

  **References**:
  - V2 Dashboard URL: `https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac_v2`
  - V2 iframe URL pattern: `https://ha.muriel-cz.cz/oig_cloud_static_v2/index.html?v=...`

  **Acceptance Criteria**:

  ```
  Scenario: Desktop flow visual verification
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to: https://ha.muriel-cz.cz/oig_cloud_dashboard_aab05107e596a3ee794f37a9be7294ac_v2
      2. Wait for iframe load
      3. Switch to iframe context
      4. Wait for: .flow-grid-wrapper (timeout: 15s)
      5. Wait 5 seconds for animations
      6. Screenshot: .sisyphus/evidence/task-3-desktop-flow.png
      7. Verify DOM:
         - svg.connections-layer path.flow-line exists (Bezier)
         - defs filter#neon-glow exists (Glow)
         - defs linearGradient exists (Gradient)
         - polygon with animateMotion exists (Direction)
    Expected Result: All 4 effects visible on desktop
    Evidence: .sisyphus/evidence/task-3-desktop-flow.png

  Scenario: Mobile flow visual verification
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport to 375x812 (iPhone)
      2. Navigate to same URL
      3. Wait for load
      4. Screenshot: .sisyphus/evidence/task-3-mobile-flow.png
      5. Assert: Flow connections still visible (no layout break)
    Expected Result: Effects work on mobile viewport
    Evidence: .sisyphus/evidence/task-3-mobile-flow.png

  Scenario: Other tabs regression check
    Tool: Playwright (playwright skill)
    Steps:
      1. Click "Ceny" tab
      2. Wait for price data to load
      3. Screenshot: .sisyphus/evidence/task-3-ceny-tab.png
      4. Click "Bojler" tab
      5. Wait for boiler data to load
      6. Screenshot: .sisyphus/evidence/task-3-bojler-tab.png
      7. Assert: No visual issues on other tabs
    Expected Result: Other tabs unaffected by flow changes
    Evidence: .sisyphus/evidence/task-3-ceny-tab.png, .sisyphus/evidence/task-3-bojler-tab.png
  ```

  **Evidence to Capture:**
  - [ ] .sisyphus/evidence/task-3-desktop-flow.png
  - [ ] .sisyphus/evidence/task-3-mobile-flow.png
  - [ ] .sisyphus/evidence/task-3-ceny-tab.png
  - [ ] .sisyphus/evidence/task-3-bojler-tab.png

  **Commit**: NO

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(flow): add neon Bezier curves, glow, gradients and direction indicators` | `canvas.ts` | `npm run build` |

---

## Success Criteria

### Verification Commands
```bash
# Build
cd custom_components/oig_cloud/www_v2 && npm run build  # Expected: 0 errors, ~394 modules

# Deploy
SMB_MOUNT="/private/tmp/ha_mount" ./deploy_to_ha.sh  # Expected: files deployed, HA restart
```

### Final Checklist
- [ ] Bezier curves visible (no straight lines)
- [ ] Neon glow on active connections
- [ ] Gradient colors from source to destination node
- [ ] Animated direction chevrons on active connections
- [ ] Particles still working (≤50, animating)
- [ ] Other tabs (Ceny, Bojler) unaffected
- [ ] Mobile responsive layout intact
- [ ] Build passes with zero errors
- [ ] Production deployment successful
