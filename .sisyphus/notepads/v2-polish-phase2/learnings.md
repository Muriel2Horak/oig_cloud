# V2 Polish Phase 2 — Learnings

## 2026-02-15 Chrome MCP Visual Analysis

### Connection Lines Issue
- `getCenter()` at canvas.ts:269 calculates node CENTER coordinates
- Lines go from center of one node to center of another — looks wrong visually
- Need edge-to-edge: calculate intersection point of line with node rectangle boundary
- SVG line coords observed: Solar(864,130.5)→Inverter(864,395), Battery(864,741.5)→Inverter(864,395), Inverter(864,395)→House(1626.64,395)

### Particle System Issue
- 6 particles exist in DOM but have `animation: "none"` per getComputedStyle
- This is EXPECTED for Web Animation API — animate() doesn't set CSS animation property
- The particles have opacity ~0.33 and are positioned at start coords
- Possible issues: speed value too high (slow animation), or particle spawning but not animating due to timing
- `params.speed` is used as both spawn interval AND animation duration — may be too long

### Tiles Issue
- `oig-tiles-container` has correct CSS: `display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr))`
- BUT tiles appear at y=1591 (below viewport)
- `flow-tiles-stack` CSS is just `width: 100%; min-width: 0` — no height constraint issues
- Container is 1728px wide × 62px tall — tiles all in single row (62px height = 50px tile + padding)
- The tiles ARE rendered but user needs to scroll down to see them
- This is a LAYOUT issue — flow canvas takes too much vertical space

### Node Layout
- Flow grid: `grid-template-columns: 1fr 1.2fr 1fr` with 3 rows
- At 1728px viewport: columns are 517.5px, 621px, 517.5px
- Grid node at x=52 (far left), House at x=1577 (far right) — too spread
- Battery node is 385px tall due to Grid Charging Plan section always showing
- `min-height: 600px !important` on flow-grid forces excessive height

### Deploy & Verification
- SMB mount: `/private/tmp/ha_mount/` (the `config` share, NOT addon_configs)
- Build: `npm run build` (bun not installed)
- Deploy: copy dist/ files to mount then restart HA via API
- HA caches static files in memory — MUST restart after file copy
- Chrome MCP can inspect via evaluateScript through shadow DOM chain:
  ```
  ha → shadowRoot → home-assistant-main → shadowRoot → ha-panel-iframe → shadowRoot → iframe → contentDocument
  ```

### Build Output
- index.js: 367,717 bytes
- charts.js: 227,268 bytes
- vendor.js: 16,578 bytes
- Current commit: 4ec95ca
