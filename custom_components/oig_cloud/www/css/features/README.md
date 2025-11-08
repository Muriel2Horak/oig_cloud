# CSS Features

Feature-specific styly pro OIG Cloud dashboard. Každý feature má vlastní CSS soubor.

## Pravidlo: 1 Feature = 1 CSS soubor

Pokud vyvíjíš nový feature nebo upravuješ existující, **vždy vytvoř/uprav jen jeden CSS soubor** pro tento feature.

## Současné features

### `battery-health.css` (1,183 řádků)
Styly pro Battery Health modul a dashboard.

**Sekce:**
- Battery health cards
- Battery prediction charts
- Battery status indicators
- Battery metrics displays

**Použití:** Automaticky načten v `dashboard.html`

### `battery-prediction-chart.css` (397 řádků)
Specializované styly pro battery prediction grafy.

**Obsahuje:**
- Chart containers
- Legend styly
- Tooltip formátování
- Responsive breakpoints

### `boiler-tab.css` (1,108 řádků)
Kompletní styly pro bojler záložku.

**Sekce:**
- Boiler controls
- Temperature displays
- Schedule management
- Status indicators

**Použití:** Načten v `fragments/boiler-tab.html`

### `chmu-card.css` (330 řádků)
ČHMÚ počasí karta.

**Obsahuje:**
- Weather icons
- Temperature display
- Forecast layout
- Wind/precipitation indicators

### `detail-tabs.css` (2,356 řádků)
Detail záložky (Flow, Pricing, Bojler).

**Hlavní komponenty:**
- Tab navigation
- Content containers
- Data tables
- Chart containers

### `flow-card.css` (1,100 řádků)
Flow visualization karta.

**Obsahuje:**
- Sankey diagram styles
- Flow arrows
- Energy flow indicators
- Animation states

### `grid-charging.css` (220 řádků)
Grid charging control karta.

**Obsahuje:**
- Charging controls
- Schedule UI
- Status indicators
- Progress bars

### `shield-card.css` (1,800 řádků)
Shield protection karta.

**Obsahuje:**
- Shield status
- Protection indicators
- Alert displays
- Configuration UI

### `timeline.css` (360 řádků)
Timeline karta s událostmi.

**Obsahuje:**
- Timeline layout
- Event markers
- Time axis
- Hover states

## Když přidáváš nový feature

1. **Vytvoř nový CSS soubor** v této složce: `features/muj-feature.css`
2. **Importuj ho** v `dashboard-styles.css`:
   ```css
   @import 'features/muj-feature.css';
   ```
3. **Dodržuj naming**: `.muj-feature-*` namespace pro všechny třídy
4. **Nepoužívej globální selektory**: Všechny styly musí být scoped k feature
5. **Použij CSS variables** z `variables.css` pro barvy, spacing, atd.

## Refactoring existujícího feature

Pokud upravuješ existující feature CSS:

✅ **ANO:**
- Extrahuj sdílené komponenty do `components/` pokud se používají i jinde
- Používej CSS variables místo hard-coded hodnot
- Přidej responsive styly (mobile-first)

❌ **NE:**
- Nepoužívej `!important` (pokud to není absolutně nutné)
- Nepoužívej inline styly v HTML
- Neglobalizuj styly (každý feature = vlastní namespace)

## Migration notes

**2025-01-08**: FÁZE 2
- Všechny feature CSS soubory přesunuty z `www/` root do `css/features/`
- Aktualizovány importy v `dashboard-styles.css`
- Celkem 9 feature CSS souborů (8,854 řádků)
