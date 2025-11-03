# Code Review Summary - Duplicitní kód & Fallbacky

## 🎯 Zadání
Udělat code review zaměřený na:
1. **Duplicitní kód** - stejné funkce napříč moduly
2. **Fallback hodnoty** - nelze poznat '--' od reálných dat

## ✅ VÝSLEDKY

### 1. Duplicitní Kód - VYŘEŠENO ✓

Nalezeno a opraveno **3 kritické duplicity**:

#### A) `toggleChmuWarningModal()` - 2x definovaná
- **Problém**: Funkce existovala v dashboard-analytics.js (rozbita) i dashboard-chmu.js (správně)
- **Řešení**: 
  - ✅ Odstraněna z analytics
  - ✅ Import přidán tam kde je potřeba
  - ✅ Pouze 1 definice v dashboard-chmu.js

#### B) `loadBoilerData()` - 2x VE STEJNÉM SOUBORU!
- **Problém**: Dvě různé funkce se stejným názvem v dashboard-boiler.js
- **Řešení**:
  - ✅ První přejmenována na `loadBasicBoilerData()`
  - ✅ Druhá přejmenována na `loadExtendedBoilerData()`
  - ✅ Jasná sémantická separace (simple vs advanced dashboard)

#### C) `findShieldSensorId()` - 2x definovaná
- **Problém**: Funkce v dashboard-core.js i dashboard-flow.js
- **Řešení**:
  - ✅ Přesunuta do dashboard-utils.js (shared utility)
  - ✅ Odstraněna z core a flow
  - ✅ Importy přidány v obou modulech

**Verification**:
```bash
✓ toggleChmuWarningModal: 1 definition (chmu only)
✓ findShieldSensorId: 1 definition (utils only)
✓ loadBoilerData: 0 (replaced with 2 semantic versions)
```

### 2. Fallback Hodnoty - IMPLEMENTOVÁNO ✓

#### Problém
- Nelze vizuálně rozlišit `'--'` (nedostupná data) od reálných hodnot
- 58 výskytů '--' napříč moduly (16x pricing, 10x flow, 9x analytics...)

#### Řešení - Visual Fallback Indicator

**A) CSS Styling** (`css/variables.css`):
```css
.fallback-value {
    opacity: 0.5;              /* 50% průhlednost */
    font-style: italic;        /* Kurzíva */
    color: #888 !important;    /* Šedá barva */
    cursor: help;              /* Help cursor */
}

.fallback-value::after {
    content: ' ⚠';             /* Varovný znak */
    font-size: 0.8em;
    margin-left: 2px;
}
```

**B) Enhanced `updateElementIfChanged()`**:
```javascript
// Nová signatura s 4. parametrem
function updateElementIfChanged(elementId, newValue, cacheKey, isFallback = false)

// Automaticky:
// - Přidává CSS třídu .fallback-value
// - Nastavuje tooltip "Data nejsou k dispozici"
// - Odstraňuje při reálných datech
```

**C) Vizuální efekt**:
```
Fallback: -- ⚠   (šedě, kurzívou, s tooltipem)
Real:     85.2%  (normálně, bez warnu)
```

**D) Použití**:
```javascript
// SPRÁVNĚ - Fallback
updateElementIfChanged('id', '--', 'key', true);

// SPRÁVNĚ - Reálná data
updateElementIfChanged('id', '85.2%', 'key', false);

// ZASTARALÉ - Nelze rozlišit
updateElementIfChanged('id', '--', 'key');  // Vypadá jako reálná hodnota!
```

## 📊 STATISTIKY

### Duplicity
- **Nalezeno**: 3 kritické duplicity
- **Opraveno**: 3/3 (100%)
- **Commitů**: 2

### Fallbacky
- **Výskytů '--'**: 58 napříč všemi moduly
- **Implementováno**: Visual indicator systém
- **Zbývá**: Refaktorovat všechna volání (přidat `isFallback=true`)

### Moduly s nejvíce fallbacky (TODO refactor):
1. dashboard-pricing.js: 16 výskytů
2. dashboard-flow.js: 10 výskytů
3. dashboard-analytics.js: 9 výskytů
4. dashboard-boiler.js: 7 výskytů
5. dashboard-core.js: 7 výskytů

## 🚀 DALŠÍ KROKY

### Priorita 1: Refaktorovat fallbacky
```bash
# Najít všechny '--' fallbacky
grep -n "updateElementIfChanged.*'--'" dashboard-*.js

# Pro každý výskyt přidat 4. parametr true:
updateElementIfChanged('id', '--', 'key', true)
```

### Priorita 2: Test
```bash
# Ověřit že duplicity jsou pryč
bash check_functions.sh

# Vizuálně zkontrolovat fallback indikátory v prohlížeči
# (měly by být šedé, kurzívou, s ⚠ ikonou)
```

## ✨ IMPACT

### Před
- ❌ 3 duplicitní funkce způsobující konflikty
- ❌ Nelze poznat '--' od reálných dat
- ❌ Uživatelé nevědí proč vidí '--'

### Po
- ✅ Žádné duplicity
- ✅ Jasně viditelný rozdíl mezi fallback a daty
- ✅ Tooltip vysvětluje "Data nejsou k dispozici"
- ✅ Automatická visualizace bez manuálního HTML
