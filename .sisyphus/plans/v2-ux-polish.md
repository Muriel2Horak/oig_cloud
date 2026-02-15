# V2 UX Polish

## TL;DR
7 areas of UX polish for the V2 interface:
1. Typography hierarchy
2. Shield component
3. Collapsible panels
4. Responsive design
5. Pricing layout
6. Tile organization
7. Flow node visual polish

## Guardrails
- No backend/data changes
- No new breakpoints beyond 768/1024/1280 + Nest Hub
- Glassmorphism only on flow nodes
- No localStorage for panel collapse
- No localhost
- No new animations beyond V1 precedent

## Tasks

- [x] **Task 1: Typography hierarchy**
  - Add 6 size tokens in theme.ts
  - Apply typography hierarchy to node.ts
  - Ensure consistent text sizing throughout the UI

- [x] **Task 2: Shield component**
  - Create new control-panel/shield.ts component
  - Integrate shield component into panel.ts
  - Ensure proper visual consistency

- [ ] **Task 3: Collapsible side panels**
  - Implement collapsible side panels in app.ts
  - Add toggle buttons for panel collapse/expand
  - Grid transition: 260px 1fr 260px → 0px 1fr 0px
  - Transition duration: 300ms
  - No localStorage for persisting state

- [ ] **Task 4: Responsive design**
  - Nest Hub 1024×600: auto-collapse panels
  - Tablet 768–1024: 2-column layout
  - Mobile <768: single column layout
  - *Blocked by tasks 1, 3, 5, 6*

- [ ] **Task 5: Pricing stats.ts redesign**
  - Hero row for current prices
  - 2×2 grid for extremes
  - Collapsible what-if section
  - Reduced padding and fonts
  - Sparkline height ~30px

- [ ] **Task 6: Tiles compact V1 style**
  - Height ≤50px
  - Padding 6–8px
  - Value font size 12–14px
  - Label font size 8–9px
  - Border radius 8px
  - 2-column grid with 5px gap
  - Group headers (Energie/Klima/Ovládání)
  - Keep all tiles
  - No glassmorphism on tiles

- [x] **Task 7: Flow node visual polish**
  - Border-radius 12px
  - Shadow: 0 2px 12px rgba(0,0,0,0.15)
  - 1px border: rgba(255,255,255,0.08)
  - Symmetric padding
  - Keep glassmorphism + Tesla colors
  - No layout logic changes

- [ ] **Task 8: Deploy & Playwright verification**
  - Deploy via ./deploy_haos.sh --fe-v2-only
  - Verify on ha.muriel-cz.cz via iframe
  - Run Playwright tests for visual regression

## Verification Steps

1. **Build verification**: `npm run build` in www_v2
2. **Deploy verification**: Run ./deploy_haos.sh --fe-v2-only
3. **Playwright verification**: Test UI via iframe on ha.muriel-cz.cz

## Definition of Done

- [ ] All 8 tasks completed
- [ ] Build passes without errors
- [ ] Deploy script executes successfully
- [ ] Playwright tests pass
- [ ] All guardrails respected
- [ ] Verification steps completed

## Commit Strategy
- One commit per task
- Do not perform commits in this session
