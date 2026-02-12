# OIG FE V2 - Migration Plan (Wave-by-Wave)

Tento dokument definuje pořadí migrace komponent z V1 do V2.

## Wave Overview

```
Wave 1 ──► Wave 2 ──► Wave 3 ──► Wave 4 ──► Wave 5
Infrastructure   Shell      Core Features   Secondary    Polish
   (1-2d)        (1-2d)        (3-5d)        (2-3d)       (1-2d)
```

---

## Wave 1: Infrastructure (1-2 days)

### Cíl
Založit projekt, build systém, core moduly.

### Deliverables
| ID | Task | Parity Ref | Stav |
|----|------|------------|------|
| W1-01 | package.json, tsconfig.json, vite.config.ts | - | 🔴 |
| W1-02 | index.html s HA integration | - | 🔴 |
| W1-03 | src/core/bootstrap.ts | PAR-015 | 🔴 |
| W1-04 | src/core/lifecycle.ts | PAR-014 | 🔴 |
| W1-05 | src/core/errors.ts | PAR-013 | 🔴 |
| W1-06 | src/core/logger.ts | - | 🔴 |
| W1-07 | src/data/ha-client.ts | PAR-015 | 🔴 |
| W1-08 | src/data/api.ts | PAR-015 | 🔴 |
| W1-09 | src/data/entity-store.ts | PAR-015 | 🔴 |
| W1-10 | src/data/query-cache.ts | PAR-015 | 🔴 |
| W1-11 | Vite build produkuje hashed assets | - | 🔴 |
| W1-12 | Deploy script pro V2 (www_v2) | - | 🔴 |

### Rizika
- HA auth mechanismus může být jiný než v V1
- Build konfigurace pro Web Components

### Fallback
- Rollback k V1, pokračovat s fixy

---

## Wave 2: Shell & Theme (1-2 days)

### Cíl
Základní UI shell, tab navigace, theming.

### Deliverables
| ID | Task | Parity Ref | Stav |
|----|------|------------|------|
| W2-01 | src/ui/layout/shell.ts | PAR-001 | 🔴 |
| W2-02 | src/ui/layout/tabs.ts | PAR-001B | 🔴 |
| W2-03 | src/ui/layout/grid.ts | PAR-007 | 🔴 |
| W2-04 | src/ui/components/header.ts | PAR-001A | 🔴 |
| W2-05 | src/ui/components/status-badge.ts | PAR-012 | 🔴 |
| W2-06 | Theme system (CSS vars) | PAR-008 | 🔴 |
| W2-07 | Theme detection & events | PAR-008B | 🔴 |
| W2-08 | Responsive breakpoints | PAR-007A | 🔴 |

### Závislosti
- Wave 1 kompletní

### Rizika
- CSS variable kompatibility v HA app
- Theme switching timing

### Fallback
- Hardcoded dark theme jako fallback

---

## Wave 3: Core Features (3-5 days)

### Cíl
Hlavní features - Flow, Pricing, Control Panel.

### 3A: Flow Visualization (1.5-2d)
| ID | Task | Parity Ref | Stav |
|----|------|------------|------|
| W3A-01 | src/ui/features/flow/index.ts | PAR-002 | 🔴 |
| W3A-02 | FlowCanvas (SVG container) | PAR-002B | 🔴 |
| W3A-03 | ConnectionLayer | PAR-002B | 🔴 |
| W3A-04 | ParticleLayer | PAR-002C | 🔴 |
| W3A-05 | SolarNode | PAR-002A | 🔴 |
| W3A-06 | BatteryNode | PAR-002A | 🔴 |
| W3A-07 | InverterNode | PAR-002A | 🔴 |
| W3A-08 | GridNode | PAR-002A | 🔴 |
| W3A-09 | HouseNode | PAR-002A | 🔴 |
| W3A-10 | ParticleEngine | PAR-002C | 🔴 |
| W3A-11 | FlowController | PAR-002 | 🔴 |
| W3A-12 | Performance throttling | PAR-014 | 🔴 |

### 3B: Pricing Tab (1-1.5d)
| ID | Task | Parity Ref | Stav |
|----|------|------------|------|
| W3B-01 | src/ui/features/pricing/index.ts | PAR-003 | 🔴 |
| W3B-02 | StatsCards | PAR-003A | 🔴 |
| W3B-03 | MainChart | PAR-003B | 🔴 |
| W3B-04 | ChartManager | PAR-003 | 🔴 |
| W3B-05 | Zoom/Pan controls | PAR-003C | 🔴 |
| W3B-06 | Datalabel modes | PAR-003D | 🔴 |
| W3B-07 | Chart integrations (zoom, datalabels, annotation) | PAR-003 | 🔴 |

### 3C: Control Panel (0.5-1d)
| ID | Task | Parity Ref | Stav |
|----|------|------------|------|
| W3C-01 | src/ui/features/control-panel/index.ts | PAR-005 | 🔴 |
| W3C-02 | BoxMode selector | PAR-005A | 🔴 |
| W3C-03 | GridDelivery selector | PAR-005B | 🔴 |
| W3C-04 | BatteryCharging dialog | PAR-005C | 🔴 |
| W3C-05 | ShieldQueue display | PAR-005D | 🔴 |

### Závislosti
- Wave 2 kompletní
- Chart.js + plugins

### Rizika
- Particle performance na mobile
- Chart.js memory leaky
- SVG rendering v HA app

### Fallback
- Particles vypnutelné
- Chart fallback na static image

---

## Wave 4: Secondary Features (2-3 days)

### Cíl
Timeline, Tiles, Boiler, Analytics, CHMU.

### 4A: Timeline & Dialogs (0.5-1d)
| ID | Task | Parity Ref | Stav |
|----|------|------------|------|
| W4A-01 | src/ui/features/timeline/index.ts | PAR-004 | 🔴 |
| W4A-02 | TimelineDialog | PAR-004A | 🔴 |
| W4A-03 | DayTabs (Včera/Dnes/Zítra/Historie) | PAR-004A | 🔴 |
| W4A-04 | Auto-refresh | PAR-004B | 🔴 |
| W4A-05 | Generic Dialog component | PAR-005C | 🔴 |

### 4B: Custom Tiles (0.5d)
| ID | Task | Parity Ref | Stav |
|----|------|------------|------|
| W4B-01 | src/ui/features/tiles/index.ts | PAR-006 | 🔴 |
| W4B-02 | TileDisplay | PAR-006A | 🔴 |
| W4B-03 | TileConfig dialog | PAR-006B | 🔴 |
| W4B-04 | TileManagement | PAR-006C | 🔴 |

### 4C: Boiler (0.5-1d)
| ID | Task | Parity Ref | Stav |
|----|------|------------|------|
| W4C-01 | src/ui/features/boiler/index.ts | PAR-010 | 🔴 |
| W4C-02 | Heatmap display | PAR-010A | 🔴 |
| W4C-03 | Profile management | PAR-010A | 🔴 |
| W4C-04 | Auto-refresh | PAR-010B | 🔴 |

### 4D: Analytics (0.5d)
| ID | Task | Parity Ref | Stav |
|----|------|------------|------|
| W4D-01 | src/ui/features/analytics/index.ts | PAR-011 | 🔴 |
| W4D-02 | BatteryEfficiency | PAR-011A | 🔴 |
| W4D-03 | BatteryHealth | PAR-011B | 🔴 |
| W4D-04 | PlannedConsumption | PAR-011C | 🔴 |
| W4D-05 | BatteryBalancing | PAR-011D | 🔴 |

### 4E: CHMU Warnings (0.5d)
| ID | Task | Parity Ref | Stav |
|----|------|------------|------|
| W4E-01 | src/ui/features/chmu/index.ts | PAR-012 | 🔴 |
| W4E-02 | WarningBadge | PAR-012A | 🔴 |
| W4E-03 | WarningModal | PAR-012B | 🔴 |

### Závislosti
- Wave 3 kompletní

### Rizika
- API endpoints mohou chybět
- Boiler feature může být optional

### Fallback
- Feature flagy pro vypnutí

---

## Wave 5: Polish & Testing (1-2 days)

### Cíl
Mobile optimization, performance, testing, docs.

### Deliverables
| ID | Task | Parity Ref | Stav |
|----|------|------------|------|
| W5-01 | Mobile layout optimization | PAR-009 | 🔴 |
| W5-02 | HA Companion App testing | PAR-009C | 🔴 |
| W5-03 | Touch interactions | PAR-009A | 🔴 |
| W5-04 | Performance profiling | PAR-014 | 🔴 |
| W5-05 | Memory leak check | PAR-014C | 🔴 |
| W5-06 | Visibility API handling | PAR-014D | 🔴 |
| W5-07 | Layout Edit Mode | PAR-007B | 🔴 |
| W5-08 | Layout Reset | PAR-007C | 🔴 |
| W5-09 | Error boundaries final | PAR-013 | 🔴 |
| W5-10 | Unit tests (core modules) | - | 🔴 |
| W5-11 | E2E tests (critical paths) | - | 🔴 |
| W5-12 | Visual regression tests | - | 🔴 |
| W5-13 | Deploy documentation | - | 🔴 |

### Závislosti
- Wave 4 kompletní

### Rizika
- Device-specific bugs
- Performance na low-end devices

### Fallback
- Graceful degradation
- Particles auto-disable

---

## Parallel Development Strategy

```
                    ┌─► W3A: Flow (dev A)
Wave 2 complete ────┼─► W3B: Pricing (dev B)
                    └─► W3C: Control Panel (dev A)

                    ┌─► W4A: Timeline (dev B)
Wave 3 complete ────┼─► W4B: Tiles (dev A)
                    ├─► W4C: Boiler (dev A)
                    ├─► W4D: Analytics (dev B)
                    └─► W4E: CHMU (dev A)
```

---

## Risk Register

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R1 | HA auth API changes | Low | High | Abstract auth layer |
| R2 | Particle performance on mobile | Medium | Medium | Auto-disable, config |
| R3 | Chart.js memory leaks | Medium | Medium | Proper cleanup, monitoring |
| R4 | HA app iframe issues | Medium | High | Fallback to link panel |
| R5 | Backend API changes | Low | High | Contract tests |
| R6 | Browser compatibility | Low | Medium | Polyfills, progressive |
| R7 | Deployment issues | Medium | High | Staged rollout, rollback |

---

## Acceptance Gates

### Wave 1 Gate
- [ ] `npm run build` succeeds
- [ ] `npm run dev` loads in browser
- [ ] HA auth works
- [ ] Console log shows `[V2]` prefix

### Wave 2 Gate
- [ ] Shell renders with header
- [ ] Tabs switchable
- [ ] Theme matches HA theme
- [ ] Responsive breakpoints work

### Wave 3 Gate
- [ ] Flow tab shows nodes
- [ ] Particles animate
- [ ] Pricing tab shows chart
- [ ] Zoom/pan works
- [ ] Control panel functions

### Wave 4 Gate
- [ ] All secondary features render
- [ ] Dialogs open/close
- [ ] Auto-refresh works

### Wave 5 Gate
- [ ] All PAR-XXX tests green
- [ ] No console errors
- [ ] Mobile layout works
- [ ] HA app works
- [ ] V1 + V2 parallel in sidebar
