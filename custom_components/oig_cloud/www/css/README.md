# CSS Structure

Tato složka obsahuje všechny CSS styly pro OIG Cloud dashboard organizované do logických modulů.

## Struktura

```
css/
├── variables.css           # CSS custom properties (barvy, rozměry, fonty)
├── 02-layout.css          # Layout utilities (container, header, grid, flex)
├── 03-typography.css      # Typography (nadpisy, texty, font utilities)
├── components/            # Znovupoužitelné UI komponenty
│   ├── buttons.css        # Všechny button styly (56 variant)
│   ├── cards.css          # Card komponenty (.card, .card-header, .card-body)
│   ├── modals.css         # Dialogy a modaly
│   ├── tabs.css           # Tab navigace
│   └── tiles.css          # Tile komponenty (placeholder)
├── features/              # Feature-specific styly (1 feature = 1 soubor)
│   ├── battery-health.css
│   ├── battery-prediction-chart.css
│   ├── boiler-tab.css
│   ├── chmu-card.css
│   ├── detail-tabs.css
│   ├── flow-card.css
│   ├── grid-charging.css
│   ├── shield-card.css
│   └── timeline.css
├── themes/                # Theme variants (dark mode)
│   └── dark-mode.css
└── utils/                 # Utilities a helpery
    └── animations.css     # Všechny @keyframes (31 animací)
```

## Pořadí importů

V `dashboard-styles.css`:

```css
/* 1. Proměnné */
@import 'variables.css';

/* 2. Base (layout, typography) */
@import '02-layout.css';
@import '03-typography.css';

/* 3. Utils */
@import 'utils/animations.css';

/* 4. Components */
@import 'components/buttons.css';
@import 'components/cards.css';
@import 'components/tiles.css';
@import 'components/modals.css';

/* 5. Features (podle potřeby) */
/* 6. Main dashboard styles (zbytek dashboard-styles.css) */
```

## Pravidla

### Kdy přidat nový CSS soubor

**components/** - Pro znovupoužitelné UI prvky:
- ✅ Buttony, karty, inputy, tooltips, badges
- ✅ Používají se na více místech
- ❌ Feature-specific styly (ty do features/)

**features/** - Pro feature-specific styly:
- ✅ Jeden feature = jeden CSS soubor
- ✅ Např. `timeline.css`, `battery-health.css`
- ❌ Obecné komponenty (ty do components/)

**themes/** - Pro theme varianty:
- ✅ Dark mode, high contrast, custom themes
- ❌ Feature styly (ty do features/)

**utils/** - Pro utility třídy a helpery:
- ✅ Animations, mixins, helpers
- ❌ Konkrétní komponenty (ty do components/)

### Naming conventions

- **Soubory**: kebab-case (`battery-health.css`)
- **Třídy**: kebab-case (`.battery-graph`, `.btn-primary`)
- **CSS variables**: kebab-case (`--color-primary`, `--spacing-md`)

### Best practices

1. **Jeden účel = jeden soubor**: Nespoušťej různé věci do jednoho souboru
2. **Import order matters**: Variables → Layout → Typography → Utils → Components → Features
3. **No duplicates**: Pokud najdeš duplicitní kód, refaktoruj do sdílené komponenty
4. **Mobile-first**: Responsive styly v `02-layout.css`

## Migration history

**2025-01-08**: FÁZE 2 & 3 - Velký refactoring
- Rozpuštěn monolitický `dashboard-styles.css` (9,080 → 7,006 řádků)
- Extrahováno 2,212 řádků do 9 modulárních souborů
- Vytvořena složková struktura (components/, features/, utils/, themes/)
- Všechny importy aktualizovány v `dashboard-styles.css`
