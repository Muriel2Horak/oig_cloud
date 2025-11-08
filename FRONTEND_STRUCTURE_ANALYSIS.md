# Frontend Structure Analysis - OIG Cloud Dashboard

**Datum analýzy**: 2025-11-08
**Autor**: AI Code Review

---

## 🔍 ZJIŠTĚNÉ PROBLÉMY

### 1. DUPLICITNÍ HTML SOUBORY

#### ✅ PRODUKČNÍ (používá se)
```
dashboard.html
├── CSS imports:
│   ├── dashboard-styles.css (9079 lines) ⚠️ HLAVNÍ, ALE OBROVSKÝ
│   ├── css/today-plan-tile.css (350 lines)
│   ├── css/detail-tabs.css (511 lines) ✅ SPRÁVNÝ SOUBOR
│   └── dashboard-battery-health.css (364 lines)
└── Používá: __init__.py line 128
```

#### ❌ OBSOLETE (nepoužívá se v produkci)
```
dashboard-detail-tabs.html
├── CSS import:
│   └── dashboard-detail-tabs.css (454 lines) ❌ DUPLICITNÍ!
└── Není linkován v Python kódu
```

```
boiler_dashboard.html
├── Samostatný dashboard (inline styles)
└── Není linkován v Python kódu
```

```
boiler-tab.html
├── HTML fragment (ne kompletní stránka)
└── Není samostatně použitelný
```

---

## 2. DUPLICITNÍ CSS SOUBORY

### Konflikt: detail-tabs CSS

**Soubor A (✅ SPRÁVNÝ)**: `css/detail-tabs.css` (511 lines)
- Import v: `dashboard.html` (produkce)
- Definuje třídy:
  - `.detail-tab-content`
  - `.detail-summary-tiles`
  - `.mode-block`
  - `.mode-block-header`
  - `.block-header` ✅ NOVÉ (kompaktní)
  - `.block-modes` ✅ NOVÉ
  - `.block-cost` ✅ NOVÉ
  - `.energy-stats` ✅ NOVÉ

**Soubor B (❌ DUPLICITNÍ)**: `dashboard-detail-tabs.css` (454 lines)
- Import v: `dashboard-detail-tabs.html` (nepoužívá se)
- Definuje STEJNÉ třídy jako Soubor A
- **PROBLÉM**: Částečně jiné definice!

### Srovnání duplicitních tříd

| Třída | `css/detail-tabs.css` | `dashboard-detail-tabs.css` | Konflikt? |
|-------|----------------------|---------------------------|-----------|
| `.mode-block` | padding: 8px | padding: 10px | ⚠️ ANO |
| `.block-header` | ✅ EXISTUJE (kompaktní) | ✅ EXISTUJE | ✅ DUPLICITNÍ |
| `.block-modes` | ✅ EXISTUJE | ✅ EXISTUJE | ✅ DUPLICITNÍ |
| `.mode-badge` | padding: 3px 10px | padding: 4px 10px | ⚠️ ANO |
| `.energy-stats` | grid 2 columns | flex column | ⚠️ ANO |

---

## 3. JAVASCRIPT A CSS VAZBY

### dashboard-timeline.js (PRODUKCE)
**Používá CSS z**: `css/detail-tabs.css`

**HTML třídy generované v JS**:
```javascript
// Funkce: renderModeBlocks() (line 750-880)
.mode-block
.block-header        ← Nová kompaktní verze
.block-time
.block-duration
.block-match
.block-modes
.mode-row
.mode-label
.mode-badge
.block-cost
.cost-row
.cost-value
.cost-delta
.block-details       ← <details> element
.energy-stats        ← Grid 2 sloupce
.energy-row
.energy-value
```

### dashboard-detail-tabs.js (NEPOUŽÍVÁ SE)
**Používá CSS z**: `dashboard-detail-tabs.css`

**HTML třídy generované v JS**:
```javascript
// Funkce: renderModeBlocks() (line 315-400)
.mode-block
.block-header        ← Starší verze
.block-modes
... (stejné jako výše)
```

---

## 4. CSS STRUKTURA - PŘEHLED

### Hlavní styly (9079 lines) ⚠️
```
dashboard-styles.css
└── Obsahuje VŠECHNO pro celý dashboard
    ├── Layout, grid, tiles
    ├── Tabs navigation
    ├── Control panel
    ├── Charts
    ├── Modals, dialogs
    ├── Responsive
    └── Dark mode
```

**PROBLÉM**: Monolitický soubor, těžko udržovatelný

### Modularizované CSS v `css/` ✅
```
css/
├── variables.css (1038 lines)      - CSS proměnné, barvy
├── tabs.css (165 lines)            - Tab navigace
├── today-plan-tile.css (350 lines) - Dnešní plán tile
├── detail-tabs.css (511 lines)     - Detail záložky ✅ POUŽÍVÁ SE
├── boiler-tab.css (579 lines)      - Bojler záložka
├── pricing-tab.css (2217 lines)    - Pricing záložka
├── flow-canvas.css (2700 lines)    - Flow canvas vizualizace
├── shield.css (220 lines)          - ServiceShield
├── custom-tiles.css (1026 lines)   - Custom tiles
└── theme-light.css (230 lines)     - Light theme
```

### Samostatné CSS (kořen www/)
```
dashboard-battery-health.css (364 lines)   ✅ POUŽÍVÁ SE
dashboard-detail-tabs.css (454 lines)      ❌ DUPLICITNÍ
dashboard-styles-new.css (24 lines)        ❓ PRÁZDNÝ/TEST?
```

---

## 5. DUPLICITNÍ ZÁLOŽNÉ SOUBORY ⚠️⚠️⚠️

**KRITICKÝ PROBLÉM**: Backup soubory v produkční složce!

```bash
dashboard-core.js.CORRUPTED
dashboard-core.js.backup
dashboard-core.js.backup2
dashboard-core.js.bak
dashboard-core.js.bak2
dashboard-core.js.bak3
dashboard-core.js.bak4
dashboard-core.js.bak5
dashboard-core.js.bak6
dashboard-core.js.bak7
dashboard-core.js.bak8
dashboard-core.js.bak9
dashboard-core.js.before_delete
dashboard-core.js.broken
dashboard-core.js.cleanup1
dashboard-core.js.cleanup2
dashboard-core.js.cleanup3
dashboard-core.js.cleanup4
dashboard-flow.js.before_fix
dashboard-pricing.js.before_funcs
```

**PORUŠUJE**: DEVELOPMENT_RULES.md pravidlo:
> ❌ NIKDY nevytvářej `.backup` soubory v `custom_components/oig_cloud/`

---

## 📊 STATISTIKA

### CSS soubory
- **Celkem**: 14 souborů
- **Celkový objem**: 18,957 řádků
- **Duplicitní**: 2 soubory (dashboard-detail-tabs.css, dashboard-styles-new.css)
- **Obsolete**: 1 soubor (dashboard-detail-tabs.css)

### HTML soubory
- **Celkem**: 4 soubory
- **Produkční**: 1 (dashboard.html)
- **Obsolete**: 3 (dashboard-detail-tabs.html, boiler_dashboard.html, boiler-tab.html)

### JavaScript backup soubory
- **Celkem**: 19 záložních souborů
- **Porušení pravidel**: 100%

---

## 🎯 IDENTIFIKOVANÉ PROBLÉMY

1. **Duplicitní CSS definice**
   - `css/detail-tabs.css` vs `dashboard-detail-tabs.css`
   - Konfliktní padding, layout

2. **Obsolete soubory v produkci**
   - `dashboard-detail-tabs.html` + `.css`
   - Nejsou linkované, ale existují

3. **Backup soubory v www/**
   - 19 záložních JS souborů
   - Porušení development rules

4. **Monolitický dashboard-styles.css**
   - 9079 řádků
   - Všechno v jednom souboru
   - Těžko udržovatelný

5. **Nekonzistentní struktura**
   - Některé CSS v `css/`, jiné v kořeni
   - Žádná jasná konvence

---

## ✅ CO FUNGUJE DOBŘE

1. **Modularizace v css/**
   - Dobrý přístup pro nové komponenty
   - Čisté oddělení záležitostí

2. **Produkční flow**
   - `dashboard.html` → jasný entry point
   - CSS importy jsou viditelné

3. **Kompaktní styly**
   - Nové `.block-*` třídy v `css/detail-tabs.css`
   - Grid layout pro energie

---

## 🔧 DALŠÍ KROKY

Viz: `FRONTEND_REFACTORING_PLAN.md` (bude vytvořen)
