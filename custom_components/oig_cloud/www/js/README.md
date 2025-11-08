# JavaScript Structure

Organizace všech JavaScript modulů pro OIG Cloud Dashboard.

## Složky

### `core/`
Core funkce a základní infrastruktura
- `utils.js` - Utility funkce (formatování, parsování, helpers)
- `api.js` - API client a komunikace s backendem
- `core.js` - Hlavní inicializace dashboardu (musí být načten poslední!)

### `features/`
Feature-specific moduly (funkční celky)
- `timeline.js` - Timeline a denní plán
- `pricing.js` - Pricing záložka a ceny
- `boiler.js` - Bojler záložka
- `flow.js` - Energy flow canvas a vizualizace
- `battery-health.js` - Baterie health monitoring
- `analytics.js` - Analytics a statistiky
- `chmu.js` - ČHMÚ počasí integrace
- `detail-tabs.js` - Detail záložky (včera/dnes/zítra)

### `components/`
UI komponenty (znovupoužitelné)
- `shield.js` - ServiceShield komponenta
- `tiles.js` - Tile komponenty
- `dialog.js` - Dialog a modal okna
- `grid-charging.js` - Grid charging komponenta

### `layout/`
Layout management
- `layout-manager.js` - Správa layoutu a responsivity

## Pravidla

### Pořadí načítání (DŮLEŽITÉ!)
1. **Core** (utils, api) - nejdřív
2. **Components** - potom
3. **Features** - pak
4. **Layout** - následně
5. **Core.js** - POSLEDNÍ! (inicializace)

### Naming convention
- Soubory: `kebab-case.js` (např. `battery-health.js`)
- Složky: `lowercase` (např. `features`, `components`)

### Dependencies
- Každý modul může používat `core/utils.js` a `core/api.js`
- Features by neměly záviset na jiných features
- Components by měly být nezávislé

## Přidání nového modulu

### 1. Vytvoř soubor ve správné složce
```bash
# Feature
touch js/features/my-feature.js

# Component
touch js/components/my-component.js
```

### 2. Přidej do dashboard.html
```javascript
const scripts = [
    // ...
    'js/features/my-feature.js',
    // ...
];
```

### 3. Dodržuj naming
```javascript
// Špatně - globální proměnné
var myVar = 123;

// Dobře - namespace nebo objekt
const MyFeature = {
    init() { ... }
};
```

## Migration Status

✅ **HOTOVO** - Všechny JS soubory přesunuty do struktury (2025-11-08)

Před: 16 souborů v root `www/`
Po: Organizované v `js/core/`, `js/features/`, `js/components/`, `js/layout/`
