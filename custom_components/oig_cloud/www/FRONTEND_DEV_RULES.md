# Frontend Development Rules

Pravidla pro vývoj OIG Cloud dashboardu. **POVINNÁ ČETBA před každou úpravou HTML/CSS/JS.**

## Struktura projektu

```
www/
├── dashboard.html              # Main entry point
├── dashboard-styles.css        # Main CSS (importuje ostatní)
├── css/                        # Organizované CSS moduly
│   ├── variables.css           # CSS custom properties
│   ├── 02-layout.css          # Layout utilities
│   ├── 03-typography.css      # Typography
│   ├── components/            # Znovupoužitelné komponenty
│   │   ├── buttons.css        # Všechny button styly
│   │   ├── cards.css          # Card komponenty
│   │   ├── modals.css         # Dialogy
│   │   ├── tabs.css           # Tab navigace
│   │   └── tiles.css          # Tile komponenty
│   ├── features/              # Feature-specific styly
│   │   ├── battery-health.css
│   │   ├── boiler-tab.css
│   │   ├── detail-tabs.css
│   │   └── ... (9 feature CSS souborů)
│   ├── themes/                # Theme variants
│   │   └── dark-mode.css
│   └── utils/                 # Utilities
│       └── animations.css     # @keyframes
├── js/                        # Organizované JS moduly
│   ├── core/                  # Core infrastructure (load first)
│   │   ├── utils.js           # Utility funkce
│   │   ├── api.js             # API komunikace
│   │   └── core.js            # Core dashboard logika
│   ├── features/              # Feature moduly (8 souborů)
│   │   ├── timeline.js
│   │   ├── pricing.js
│   │   ├── boiler.js
│   │   ├── flow.js
│   │   ├── battery-health.js
│   │   ├── analytics.js
│   │   ├── chmu.js
│   │   └── detail-tabs.js
│   ├── components/            # UI komponenty (4 soubory)
│   │   ├── tiles.js
│   │   ├── dialog.js
│   │   ├── shield.js
│   │   └── grid-charging.js
│   └── layout/                # Layout management
│       └── layout-manager.js
└── fragments/                 # HTML fragmenty
    └── boiler-tab.html        # Bojler záložka (dynamicky načítán)
```

## Pravidla - CSS

### 1. KAM přidat nový CSS?

**Pro znovupoužitelné komponenty** → `css/components/`
```css
/* css/components/my-component.css */
.my-component {
  /* Styly které se používají na více místech */
}
```

**Pro feature-specific styly** → `css/features/`
```css
/* css/features/my-feature.css */
.my-feature-container {
  /* Styly jen pro tento feature */
}
```

**Pro animace** → `css/utils/animations.css`
```css
@keyframes myAnimation {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Pro globální layout** → `css/02-layout.css`
**Pro typography** → `css/03-typography.css`
**Pro variables** → `css/variables.css`

### 2. JAK importovat nový CSS?

V `dashboard-styles.css`:

```css
/* Pořadí je KRITICKÉ! */

/* 1. Proměnné */
@import 'css/variables.css';

/* 2. Base */
@import 'css/02-layout.css';
@import 'css/03-typography.css';

/* 3. Utils */
@import 'css/utils/animations.css';

/* 4. Components */
@import 'css/components/buttons.css';
@import 'css/components/cards.css';
/* ... další componenty ... */

/* 5. Features (tvůj nový feature tady) */
@import 'css/features/my-feature.css';

/* 6. Themes (vždy poslední) */
@import 'css/themes/dark-mode.css';
```

### 3. Naming conventions

✅ **SPRÁVNĚ:**
```css
.battery-health-card { }        /* Feature namespace */
.btn-primary { }                /* Component variant */
.timeline-event--completed { }  /* BEM modifier */
```

❌ **ŠPATNĚ:**
```css
.card { }                       /* Příliš obecné */
.btnPrimary { }                 /* CamelCase */
.completed { }                  /* Bez namespace */
```

### 4. CSS Variables - VŽDY použij místo hard-coded hodnot

✅ **SPRÁVNĚ:**
```css
.my-component {
  color: var(--color-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-sm);
}
```

❌ **ŠPATNĚ:**
```css
.my-component {
  color: #007bff;              /* Hard-coded */
  padding: 16px;               /* Hard-coded */
  border-radius: 4px;          /* Hard-coded */
}
```

### 5. Responsive design - Mobile-first

✅ **SPRÁVNĚ:**
```css
.my-component {
  /* Mobile styly (default) */
  width: 100%;
}

@media (min-width: 768px) {
  .my-component {
    /* Tablet+ */
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .my-component {
    /* Desktop */
    width: 33.33%;
  }
}
```

## Pravidla - JavaScript

### 1. KAM přidat nový JS?

**Pro core funkce (utils, API)** → `js/core/`
```javascript
// js/core/utils.js
export function formatDate(date) { /* ... */ }
```

**Pro feature logiku** → `js/features/`
```javascript
// js/features/my-feature.js
export function initMyFeature() { /* ... */ }
```

**Pro UI komponenty** → `js/components/`
```javascript
// js/components/my-component.js
export function createMyComponent(props) { /* ... */ }
```

**Pro layout management** → `js/layout/`

### 2. JAK načíst nový JS?

V `dashboard.html`:

```javascript
const scripts = [
  // 1. Core (vždy první)
  'js/core/utils.js',
  'js/core/api.js',

  // 2. Components
  'js/components/my-component.js',

  // 3. Features
  'js/features/my-feature.js',

  // 4. Layout
  'js/layout/layout-manager.js',

  // 5. Core init (vždy poslední)
  'js/core/core.js'
];
```

**Pořadí je KRITICKÉ!** Core → Components → Features → Layout → Core.init

### 3. Module pattern - VŽDY použij

✅ **SPRÁVNĚ:**
```javascript
// js/features/my-feature.js
(function(window) {
  'use strict';

  const MyFeature = {
    init() {
      console.log('MyFeature initialized');
    },

    doSomething() {
      // Feature logika
    }
  };

  window.MyFeature = MyFeature;
})(window);
```

❌ **ŠPATNĚ:**
```javascript
// Globální scope pollution
var myVar = 'value';
function myFunction() { }
```

### 4. Event handlers - Clean up

✅ **SPRÁVNĚ:**
```javascript
const listeners = [];

function addListener(element, event, handler) {
  element.addEventListener(event, handler);
  listeners.push({ element, event, handler });
}

function cleanup() {
  listeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });
  listeners.length = 0;
}
```

### 5. Error handling - VŽDY

✅ **SPRÁVNĚ:**
```javascript
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    showErrorDialog('Nepodařilo se načíst data');
    return null;
  }
}
```

## Pravidla - HTML

### 1. Kdy použít fragment vs. generování v JS?

**Použij HTML fragment** (`fragments/*.html`) pokud:
- Velká, statická sekce UI (jako celá záložka)
- Obsahuje hodně struktury, méně dynamiky
- Příklad: `fragments/boiler-tab.html`

**Generuj v JS** pokud:
- Dynamický obsah (data z API)
- Malé komponenty
- Opakované použití s různými props

### 2. Semantic HTML - VŽDY

✅ **SPRÁVNĚ:**
```html
<article class="battery-card">
  <header class="battery-card__header">
    <h2>Baterie</h2>
  </header>
  <section class="battery-card__body">
    <p>Stav: <strong>85%</strong></p>
  </section>
</article>
```

❌ **ŠPATNĚ:**
```html
<div class="battery-card">
  <div class="header">
    <span>Baterie</span>
  </div>
  <div class="body">
    <div>Stav: <b>85%</b></div>
  </div>
</div>
```

### 3. Accessibility

- **VŽDY** přidej `aria-label` pro ikony/buttony bez textu
- Používej `role` atributy kde je to vhodné
- Keyboard navigation - `tabindex` kde je potřeba

```html
<button class="icon-button" aria-label="Zavřít">
  <i class="icon-close"></i>
</button>
```

## Deployment

### Testing lokálně

1. Ulož změny
2. Refresh browser (Ctrl/Cmd + Shift + R pro hard refresh)
3. Zkontroluj console errors (F12)

### Deploy na HA server

```bash
./deploy_to_ha.sh
```

**PŘED deploym:**
- ✅ Zkontroluj že všechny CSS soubory jsou importované v `dashboard-styles.css`
- ✅ Zkontroluj že všechny JS soubory jsou v `scripts` array v `dashboard.html`
- ✅ Test v browseru lokálně
- ✅ Zkontroluj browser console errors

## Troubleshooting

**CSS se nenačítá:**
1. Zkontroluj @import path v `dashboard-styles.css`
2. Hard refresh (Ctrl+Shift+R)
3. Zkontroluj Network tab v DevTools (404?)

**JS error "X is not defined":**
1. Zkontroluj pořadí načítání v `scripts` array
2. Zkontroluj že modul je správně exported (window.X = X)
3. Core soubory musí být první!

**Styly se přepisují:**
1. Zkontroluj specificity (feature namespace má prioritu)
2. Zkontroluj pořadí importů (poslední přepíše předchozí)
3. Nepoužívej `!important` (pokud to není nutné)

## Git workflow

```bash
# 1. Před změnami
git status                    # Zkontroluj stav
git pull origin temp         # Stáhni aktuální verzi

# 2. Proveď změny
# ... edituj soubory ...

# 3. Commit
git add -A
git commit -m "feat: přidán nový feature X

- Vytvořen css/features/feature-x.css
- Vytvořen js/features/feature-x.js
- Aktualizován dashboard.html"

# 4. Push
git push origin temp
```

## Poznámky z refactoringu

**2025-01-08**: Kompletní frontend refactoring
- Smazáno 22 backup/duplicate souborů (74,325 řádků)
- Reorganizováno 14 CSS souborů do struktury (components/, features/, utils/, themes/)
- Rozpuštěn monolitický dashboard-styles.css (9,080 → 7,006 řádků)
- Reorganizováno 16 JS souborů do struktury (core/, features/, components/, layout/)
- Vytvořeny README.md v každé složce s dokumentací
- Všechny změny otestovány a deploynuty

**DŮLEŽITÉ:** Tato struktura je FINÁLNÍ. Nedělej nové backup soubory, neduplikuj CSS/JS!
