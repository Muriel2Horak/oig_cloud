# Porovnání Flow Layout: V1 vs V2

## Přehled

Dokument porovnává implementaci Flow layoutu mezi V1 (vanilla HTML+CSS+JS) a V2 (Lit + TypeScript) verzí OIG Cloud dashboardu.

---

## 1. Pozice Tiles (Vlastní dlaždice)

### V1 Layout

**Struktura:**
- Tiles jsou umístěny uvnitř `.flow-canvas` (absolute container)
- Pozice: overlay v horní části canvasu
- CSS selektory:
  ```css
  .custom-tiles-section {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    pointer-events: none;
    z-index: 10;
  }

  .tiles-container {
    display: flex;
    justify-content: space-between;
    padding: 15px;
    gap: 15px;
  }

  .tiles-block {
    pointer-events: auto;
    flex: 0 1 350px;
    max-width: 350px;
    min-width: 280px;
  }

  #tiles-left {
    margin-right: auto;
  }

  #tiles-right {
    margin-left: auto;
  }
  ```

**Klíčové vlastnosti:**
- **Positioning**: Absolute overlay nad flow canvas
- **Z-index**: 10 (nad canvasem a spojkami)
- **Layout**: Flexbox - left a right bloky na krajích
- **Šířka bloků**: 280-350px
- **Grid uvnitř**: 2 sloupce pro tiles

### V2 Layout

**Struktura:**
- Tiles jsou součástí 3-sloupcého CSS Grid layoutu
- Pozice: samostatné grid sloupce vedle center části
- CSS selektory (app.ts):
  ```css
  .flow-layout {
    display: grid;
    grid-template-columns: minmax(280px, 350px) 1fr minmax(280px, 350px);
    grid-template-rows: auto 1fr;
    gap: 12px;
  }

  .flow-tiles-left {
    grid-column: 1;
    grid-row: 1 / -1;
    align-self: start;
  }

  .flow-tiles-right {
    grid-column: 3;
    grid-row: 1 / -1;
    align-self: start;
  }
  ```

**Klíčové vlastnosti:**
- **Positioning**: CSS Grid - definované sloupce
- **Layout**: 3-column grid (left | center | right)
- **Šířka sloupců**: minmax(280px, 350px)
- **Align**: `align-self: start` (shora)

### Rozdíly

| Aspekt | V1 | V2 |
|--------|----|----|
| **Pozice** | Absolute overlay uvnitř canvasu | Samostatné grid sloupce |
| **Z-index** | 10 (nad canvasem) | Grid flow (přirozený dokument flow) |
| **Layout technika** | Flexbox | CSS Grid |
| **Poměr k canvasu** | Overlay překrývající canvas | Sousedí s canvasem v gridu |
| **Ovlivňování canvasu** | Potřebuje `pointer-events: none` na containeru | Žádný konflikt - samostatné oblasti |
| **Responzivita** | Flex wrap a min/max šířka | Grid columns se mění s media queries |

---

## 2. Control Panel

### V1 Layout

**Struktura:**
- Umístěn PŘED canvasem v DOMu
- Zde se stahuje při minimalizaci
- CSS:
  ```css
  .control-panel.minimized {
    /* class pro minimalizovaný stav */
  }
  ```

**Klíčové vlastnosti:**
- **Position**: Relative v toku dokumentu
- **Sticky**: Ne (pouze DOM order)
- **Z-index**: Standardní dokument tok

### V2 Layout

**Struktura:**
- Umístěn uvnitř `.flow-center` (střední grid sloupec)
- PŘED canvasem ve vykreslování (v orderu)
- CSS (app.ts):
  ```css
  .flow-center {
    grid-column: 2;
    grid-row: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  oig-control-panel {
    position: sticky;
    top: 0;
    z-index: 5;
  }
  ```

**Klíčové vlastnosti:**
- **Position**: Ve středním grid sloupci
- **Sticky**: Ano (`top: 0`, `z-index: 5`)
- **Z-index**: 5 (nad canvasem ale pod tiles)

### Rozdíly

| Aspekt | V1 | V2 |
|--------|----|----|
| **DOM pozice** | Před canvas elementem | Uvnitř `.flow-center` před canvas |
| **Sticky** | Ne | Ano (`top: 0`) |
| **Z-index** | Standardní dokument tok | 5 (nad canvasem) |
| **Chování při scrollu** | Odroluje se stránkou | Zůstává nahoře při scrollu uvnitř flow center |
| **Layout kontext** | Samostatný element | Součást grid sloupce |

---

## 3. Výška Canvasu

### V1 Layout

**CSS (dashboard-styles.css):**
```css
.flow-canvas {
  position: relative;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  height: 1000px;  /* PEVNÁ VÝŠKA */
  --node-min-width: 130px;
  --node-max-width: 250px;
}
```

**Klíčové vlastnosti:**
- **Výška**: 1000px (fixní)
- **Position**: Relative (pro absolute children)
- **Max-width**: 100%
- **Margin**: 0 auto (centrování)

### V2 Layout

**CSS (app.ts):**
```css
.flow-grid-wrapper {
  position: relative;
  z-index: 1;
  min-height: 800px;  /* MINIMÁLNÍ VÝŠKA */
}
```

**Klíčové vlastnosti:**
- **Výška**: 800px (minimální, může se zvětšit)
- **Position**: Relative
- **Z-index**: 1
- **Flexibility**: `min-height` (nastavitelná)

### Rozdíly

| Aspekt | V1 | V2 |
|--------|----|----|
| **Hodnota** | 1000px | 800px (min-height) |
| **Typ** | Fixní (`height`) | Minimální (`min-height`) |
| **Přizpůsobení obsahu** | Ne - pevná výška | Ano - může se roztáhnout |
| **Rozdíl** | 200px vyšší | 200px nižší (ale flexibilní) |
| **Dopad** | Více vertikálního prostoru pro nodes | Úspornější, flexibilní design |

---

## 4. Responsive Chování

### V1 Layout

**Media queries (dashboard-styles.css):**
```css
/* Mobile responsive */
@media (width <= 768px) {
  .flow-canvas.edit-mode .node {
    min-width: 44px;
    min-height: 44px;
    padding: 12px;
  }

  .tiles-container {
    grid-template-columns: 1fr;
  }

  .tiles-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tile-dialog {
    width: 95%;
    max-height: 90vh;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .icon-picker-content {
    width: 95%;
    max-height: 90vh;
  }

  .icon-category-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  }
}
```

**Klíčové vlastnosti:**
- **Jedna breakpoint**: 768px
- **Zaměření**: Mobile úpravy (hit area, dialogy)
- **Tiles**: Zůstávají v 2-sloupcém gridu
- **Nodes**: Zvětšený hit area pro edit mode
- **Dialogy**: 95% šířka na mobile

### V2 Layout

**Media queries (app.ts):**
```css
/* Tablet 768–1024: 2-column layout */
@media (min-width: 768px) and (max-width: 1024px) {
  .flow-center {
    gap: 8px;
  }
}

/* Mobile <768: Single column, stacked */
@media (max-width: 768px) {
  .flow-center {
    gap: 8px;
  }
  .analytics-row {
    grid-template-columns: 1fr;
  }
  .boiler-visual-grid {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 380px) {
  .flow-layout {
    grid-template-columns: 1fr;
  }
  .flow-tiles-left,
  .flow-tiles-right {
    grid-column: 1;
    grid-row: auto;
  }
  .flow-center {
    grid-column: 1;
  }
}

@media (max-width: 768px) {
  .flow-layout {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .flow-tiles-left,
  .flow-tiles-right {
    grid-column: 1;
    grid-row: auto;
  }
  .flow-center {
    grid-column: 1;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .flow-layout {
    grid-template-columns: minmax(200px, 280px) 1fr minmax(200px, 280px);
    gap: 8px;
  }
}

@media (min-width: 1200px) {
  .flow-layout {
    grid-template-columns: minmax(280px, 350px) 1fr minmax(280px, 350px);
    gap: 16px;
  }
}

@media (min-width: 1400px) {
  .flow-layout {
    max-width: 1600px;
    margin: 0 auto;
  }
}
```

**Klíčové vlastnosti:**
- **5 breakpointů**: 380px, 768px, 1024px, 1200px, 1400px
- **Grid transformace**:
  - ≤380px: Single column (stacked)
  - 769-1024px: Narrower columns (200-280px)
  - 1025-1199px: Standard columns (280-350px)
  - ≥1200px: Wider gaps (16px)
  - ≥1400px: Max-width 1600px centered

### Rozdíly

| Aspekt | V1 | V2 |
|--------|----|----|
| **Počet breakpointů** | 1 (768px) | 5 (380px, 768px, 1024px, 1200px, 1400px) |
| **Mobile layout** | Hit area úpravy, 2-column tiles | Single column stacked |
| **Tablet layout** | Stejné jako desktop | Narrower columns (200-280px) |
| **Large desktop** | Bez změn | Wider gaps (16px) |
| **Extra large (1400px+)** | Bez změn | Max-width 1600px centered |
| **Grid transformation** | Žádná (tiles overlay) | 3-column → 1-column stack |
| **Tiles na mobile** | 2-sloupcový grid zůstává | Stackují se s jinými prvky |

---

## 5. Shrnutí Hlavních Rozdílů

| Kategorie | V1 | V2 | Dopad |
|-----------|----|----|-------|
| **Tiles pozice** | Absolute overlay | Grid sloupce | V2 lépe respektuje dokument flow |
| **Control panel** | Non-sticky | Sticky top | V2 zůstává viditelný při scrollu |
| **Canvas výška** | 1000px fixní | 800px min | V2 flexibilnější, úspornější |
| **Responsive** | 1 breakpoint | 5 breakpointů | V2 jemnější gradace |
| **Layout technologie** | Flexbox + absolute | CSS Grid | V2 modernější, robustnější |
| **Z-index management** | 10 pro tiles | Grid flow | V2 přirozenější pořadí |
| **Pointer events** | `pointer-events: none` potřebné | Ne | V2 jednodušší, méně hacků |

---

## 6. Technické Detaily Implementace

### V1: Vanilla HTML + CSS

**Pozicování pomocí CSS Variables:**
```css
.solar {
  top: var(--solar-top);
  left: var(--solar-left);
  transform: var(--solar-transform);
}
```

**Tiles overlay:**
- `.custom-tiles-section` má `pointer-events: none`
- `.tiles-block` má `pointer-events: auto`
- To umožňuje klikání na tiles přestože overlay překrývá canvas

### V2: Lit + TypeScript + CSS Grid

**Grid-based pozicování:**
```css
.flow-layout {
  display: grid;
  grid-template-columns: minmax(280px, 350px) 1fr minmax(280px, 350px);
  grid-template-rows: auto 1fr;
  gap: 12px;
}
```

**Grid areas:**
- `.flow-tiles-left`: grid-column 1, grid-row 1 / -1
- `.flow-center`: grid-column 2, grid-row 1 / -1
- `.flow-tiles-right`: grid-column 3, grid-row 1 / -1

---

## 7. Dopady na UX

### V1:
- **Výhody**: Jednoduchá implementace, pevná šířka
- **Nevýhody**: Overlay překrývající canvas může omezovat přístup, fixní výška může být na mobilech příliš velká

### V2:
- **Výhody**:
  - Responsive design pro různé velikosti obrazovky
  - Grid layout respektuje přirozený dokument flow
  - Sticky control panel zůstává dostupný
  - Flexibilní výška canvasu
- **Nevýhody**:
  - Složitější CSS Grid implementace
  - Vyžaduje správné media query cascade

---

## Závěr

V2 představuje výrazný krok vpřed v terms of moderního, responsive designu. Přechod od absolute positioning k CSS Grid a přidání více breakpointů zlepšuje uživatelskou zkušenost na různých zařízeních. Hlavní vylepšení zahrnují:

1. **Lepší dokument flow**: Tiles jsou součástí gridu, ne overlay
2. **Přístupnost**: Sticky control panel
3. **Flexibilita**: Min-height místo fixní výšky
4. **Responsivita**: 5 breakpointů pro jemnou gradaci

Tyto změny usnadňují budoucí úpravy a zlepšují konzistentnost napříč různými zařízeními.
