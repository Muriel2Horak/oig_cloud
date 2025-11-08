# CSS Components

Znovupoužitelné UI komponenty pro OIG Cloud dashboard.

## Soubory

### `buttons.css` (391 řádků)
**56 button variant** extrahovaných z monolitického CSS.

**Hlavní třídy:**
- `.btn` - Base button
- `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-warning`, `.btn-danger`
- `.btn-sm`, `.btn-lg` - Size variants
- `.control-button`, `.icon-button` - Specialized buttons
- `.button-group` - Button groups

**Použití:**
```html
<button class="btn btn-primary">Uložit</button>
<div class="button-group">
  <button class="btn btn-secondary">Zrušit</button>
  <button class="btn btn-primary">OK</button>
</div>
```

### `cards.css` (144 řádků)
Card komponenty pro dashboard.

**Hlavní třídy:**
- `.card` - Base card
- `.card-header`, `.card-body`, `.card-footer`
- `.card-compact`, `.card-elevated` - Variants

**Použití:**
```html
<div class="card">
  <div class="card-header">Nadpis</div>
  <div class="card-body">Obsah...</div>
</div>
```

### `modals.css` (147 řádků)
Dialogy a modální okna.

**Hlavní třídy:**
- `.modal`, `.modal-overlay`
- `.modal-header`, `.modal-body`, `.modal-footer`
- `.modal-close-btn`

**Použití:**
```html
<div class="modal">
  <div class="modal-overlay"></div>
  <div class="modal-content">
    <div class="modal-header">
      <h2>Nadpis</h2>
      <button class="modal-close-btn">×</button>
    </div>
    <div class="modal-body">...</div>
  </div>
</div>
```

### `tabs.css` (120 řádků)
Tab navigace.

**Hlavní třídy:**
- `.tab-container`, `.tab-header`, `.tab-content`
- `.tab-button`, `.tab-button.active`
- `.tab-pane`, `.tab-pane.active`

**Použití:**
```html
<div class="tab-container">
  <div class="tab-header">
    <button class="tab-button active">Tab 1</button>
    <button class="tab-button">Tab 2</button>
  </div>
  <div class="tab-content">
    <div class="tab-pane active">Content 1</div>
    <div class="tab-pane">Content 2</div>
  </div>
</div>
```

### `tiles.css` (14 řádků)
Tile komponenty (placeholder pro budoucí rozšíření).

## Pravidla

### Kdy přidat nový komponent
✅ **ANO** - Pokud:
- Používá se na více místech v dashboardu
- Je obecný (ne feature-specific)
- Má jasně definované varianty

❌ **NE** - Pokud:
- Používá se jen v jednom feature → patří do `features/`
- Je to utility třída → patří do `utils/`

### Best practices
1. **BEM naming**: `.component`, `.component__element`, `.component--modifier`
2. **Variants**: Používej modifier třídy (`.btn--primary`, ne `.btn.primary`)
3. **States**: Používej `.is-*` nebo `.has-*` (`.is-active`, `.has-error`)
4. **No hard-coded values**: Používej CSS variables z `variables.css`

## Migration notes
**2025-01-08**: FÁZE 3
- `buttons.css` extrahován z `dashboard-styles.css` (56 button bloků)
- `cards.css` extrahován z `dashboard-styles.css`
- `modals.css` extrahován z `dashboard-styles.css`
- `tiles.css` vytvořen jako placeholder
