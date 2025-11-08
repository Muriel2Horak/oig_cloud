# Frontend Refactoring Plan - OIG Cloud Dashboard

**Cíl**: Vyčistit CSS/HTML strukturu, odstranit duplicity, zavést jasná pravidla

---

## FÁZE 1: CLEANUP (OKAMŽITĚ) ⚠️

### 1.1 Smazat obsolete soubory

```bash
# HTML soubory (nepoužívají se v produkci)
rm custom_components/oig_cloud/www/dashboard-detail-tabs.html
rm custom_components/oig_cloud/www/boiler_dashboard.html  # Je tam inline CSS
rm custom_components/oig_cloud/www/boiler-tab.html         # HTML fragment

# CSS duplicity
rm custom_components/oig_cloud/www/dashboard-detail-tabs.css  # Duplikát css/detail-tabs.css
rm custom_components/oig_cloud/www/dashboard-styles-new.css   # Prázdný/test

# JS duplicity
rm custom_components/oig_cloud/www/dashboard-detail-tabs.js   # Nepoužívá se
```

### 1.2 Smazat backup soubory (PORUŠENÍ PRAVIDEL!)

```bash
cd custom_components/oig_cloud/www/

# Smazat všechny .backup, .bak, .old soubory
rm dashboard-core.js.CORRUPTED
rm dashboard-core.js.backup*
rm dashboard-core.js.bak*
rm dashboard-core.js.before_delete
rm dashboard-core.js.broken
rm dashboard-core.js.cleanup*
rm dashboard-flow.js.before_fix
rm dashboard-pricing.js.before_funcs
```

**Důvod**: DEVELOPMENT_RULES.md explicitly zakazuje backup soubory v `custom_components/`

---

## FÁZE 2: REFAKTORING CSS STRUKTURY

### 2.1 Současný stav

```
www/
├── dashboard-styles.css (9079 lines) ⚠️ MONOLITICKÝ
├── dashboard-battery-health.css
└── css/
    ├── variables.css
    ├── tabs.css
    ├── today-plan-tile.css
    ├── detail-tabs.css ✅ SPRÁVNÝ
    ├── boiler-tab.css
    ├── pricing-tab.css
    ├── flow-canvas.css
    ├── shield.css
    ├── custom-tiles.css
    └── theme-light.css
```

### 2.2 Cílový stav

```
www/css/
├── 00-variables.css          # CSS proměnné (z variables.css)
├── 01-reset.css              # Reset/normalize
├── 02-layout.css             # Grid, container, základní layout
├── 03-typography.css         # Fonty, nadpisy
│
├── components/
│   ├── tabs.css              # Tab navigace (existující)
│   ├── tiles.css             # Tiles komponenty
│   ├── cards.css             # Card komponenty
│   ├── buttons.css           # Tlačítka
│   ├── modals.css            # Modální okna
│   ├── forms.css             # Formuláře
│   ├── charts.css            # Chart wrappery
│   └── control-panel.css     # Ovládací panel
│
├── features/
│   ├── today-plan-tile.css   # Dnešní plán (existující)
│   ├── detail-tabs.css       # Detail záložky (existující) ✅
│   ├── boiler-tab.css        # Bojler (existující)
│   ├── pricing-tab.css       # Pricing (existující)
│   ├── flow-canvas.css       # Flow canvas (existující)
│   ├── shield.css            # ServiceShield (existující)
│   ├── battery-health.css    # Battery health
│   └── analytics.css         # Analytics charts
│
├── utils/
│   ├── animations.css        # Animace, transitions
│   ├── responsive.css        # Media queries
│   └── utilities.css         # Helper třídy (.hidden, .mt-10, etc.)
│
└── themes/
    ├── theme-light.css       # Light theme (existující)
    └── theme-dark.css        # Dark theme (vygenerovat)
```

### 2.3 Rozdělit dashboard-styles.css (9079 lines)

**Plán**:

1. Extrahovat sekce do samostatných souborů:
   ```
   dashboard-styles.css (9079 lines)
   ├─→ css/02-layout.css          (~500 lines)
   ├─→ css/03-typography.css      (~200 lines)
   ├─→ css/components/tiles.css   (~800 lines)
   ├─→ css/components/cards.css   (~600 lines)
   ├─→ css/components/buttons.css (~300 lines)
   ├─→ css/components/modals.css  (~400 lines)
   ├─→ css/utils/responsive.css   (~1000 lines)
   └─→ css/utils/animations.css   (~200 lines)
   ```

2. Zachovat zpětnou kompatibilitu:
   ```css
   /* dashboard-styles.css - MASTER IMPORT */
   @import url('css/00-variables.css');
   @import url('css/02-layout.css');
   @import url('css/03-typography.css');
   /* ... etc */
   ```

3. V dalším release vyřadit `dashboard-styles.css` a importovat přímo:
   ```html
   <!-- dashboard.html -->
   <link rel="stylesheet" href="css/00-variables.css">
   <link rel="stylesheet" href="css/02-layout.css">
   <!-- ... -->
   ```

---

## FÁZE 3: KONSOLIDACE HTML

### 3.1 Produkční struktura

```
www/
└── dashboard.html ✅ JEDINÝ PRODUKČNÍ
    ├── Importuje CSS z css/
    └── Načítá JS moduly
```

### 3.2 Přesunout fragmenty

```
www/fragments/  (NOVÁ SLOŽKA)
├── boiler-tab.html      # HTML fragment pro bojler tab
├── README.md            # Vysvětlení, že toto jsou fragmenty
└── (budoucí fragmenty)
```

**Důvod**: Oddělit kompletní HTML stránky od fragmentů

---

## FÁZE 4: JEDNOTNÁ STRUKTURA SLOŽEK

### 4.1 Současný chaos

```
www/
├── dashboard-*.js (14 souborů v kořeni)
├── css/ (10 souborů)
├── components/ (?)
├── modules/ (?)
└── examples/ (?)
```

### 4.2 Cílová struktura

```
www/
├── dashboard.html              # Entry point
│
├── css/                        # Všechny styly
│   ├── 00-variables.css
│   ├── 01-reset.css
│   ├── 02-layout.css
│   ├── components/
│   ├── features/
│   ├── utils/
│   └── themes/
│
├── js/                         # Všechny JS moduly
│   ├── core/
│   │   ├── dashboard-core.js
│   │   ├── dashboard-api.js
│   │   └── dashboard-utils.js
│   ├── features/
│   │   ├── timeline.js
│   │   ├── pricing.js
│   │   ├── boiler.js
│   │   ├── battery-health.js
│   │   ├── analytics.js
│   │   └── flow.js
│   ├── components/
│   │   ├── tiles.js
│   │   ├── charts.js
│   │   ├── dialog.js
│   │   └── shield.js
│   └── layout/
│       └── layout-manager.js
│
├── fragments/                  # HTML fragmenty (ne stránky)
│   └── boiler-tab.html
│
└── assets/                     # Statické soubory
    ├── icons/
    └── images/
```

---

## FÁZE 5: MIGRACE (POSTUPNĚ)

### Krok 1: Přesun CSS souborů (1 týden)

```bash
# Přesunout battery-health do css/features/
mv dashboard-battery-health.css css/features/battery-health.css

# Aktualizovat import v dashboard.html
# Před: <link rel="stylesheet" href="dashboard-battery-health.css">
# Po:   <link rel="stylesheet" href="css/features/battery-health.css">
```

### Krok 2: Přesun JS souborů (2 týdny)

```bash
# Vytvořit složky
mkdir -p js/{core,features,components,layout}

# Přesunout core
mv dashboard-core.js js/core/
mv dashboard-api.js js/core/
mv dashboard-utils.js js/core/

# Přesunout features
mv dashboard-timeline.js js/features/timeline.js
mv dashboard-pricing.js js/features/pricing.js
# ... atd
```

**POZOR**: Aktualizovat všechny importy v dashboard.html!

### Krok 3: Rozdělit dashboard-styles.css (3 týdny)

1. Vytvořit nové soubory v `css/components/`, `css/utils/`
2. Extrahovat sekce z `dashboard-styles.css`
3. Přidat `@import` do `dashboard-styles.css` (přechodně)
4. Testovat
5. V dalším release: importovat přímo v HTML

---

## FÁZE 6: DOKUMENTACE

### 6.1 Vytvořit README.md pro každou složku

```
css/README.md
js/README.md
fragments/README.md
```

### 6.2 Aktualizovat DEVELOPMENT_RULES.md

Přidat sekci: **Frontend Structure Rules**

---

## TIMELINE

| Fáze | Časový odhad | Priority |
|------|--------------|----------|
| FÁZE 1: Cleanup | 1 den | 🔴 CRITICAL |
| FÁZE 2: CSS Refaktoring | 3 týdny | 🟠 HIGH |
| FÁZE 3: HTML Konsolidace | 3 dny | 🟡 MEDIUM |
| FÁZE 4: Folder Structure | 2 týdny | 🟡 MEDIUM |
| FÁZE 5: Migrace | 6 týdnů | 🟢 LOW (postupně) |
| FÁZE 6: Dokumentace | 1 týden | 🟠 HIGH |

---

## RIZIKA A MITIGACE

### Riziko 1: Breaking changes při přesunu souborů

**Mitigace**:
- Testovat po každém přesunu
- Používat deployment script
- Git commit po každé úspěšné změně

### Riziko 2: CSS konflikty při rozdělení dashboard-styles.css

**Mitigace**:
- Zachovat původní soubor s @import (přechodně)
- Testovat v prohlížeči inspector
- Postupné rozdělení (ne vše najednou)

### Riziko 3: Ztráta zpětné kompatibility

**Mitigace**:
- Vytvořit branch `frontend-refactor`
- Merge do main až po úplném otestování
- Release notes s breaking changes

---

## DALŠÍ KROKY

1. ✅ Přečíst FRONTEND_STRUCTURE_ANALYSIS.md
2. 📝 Review tohoto plánu
3. 🔴 **OKAMŽITĚ**: Provést FÁZE 1 (Cleanup)
4. 📋 Vytvořit development rules (viz FRONTEND_DEV_RULES.md)
5. 🚀 Začít FÁZE 2-6 postupně
