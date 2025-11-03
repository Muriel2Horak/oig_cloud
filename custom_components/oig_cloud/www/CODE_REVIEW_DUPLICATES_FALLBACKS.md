# Code Review: Duplicitní kód a Fallback hodnoty

## 🔴 KRITICKÉ DUPLICITY

### 1. `toggleChmuWarningModal()` - 2x definovaná
- **dashboard-analytics.js:193** - První definice
- **dashboard-chmu.js:71** - Druhá definice (správný modul)
- **Řešení**: Odstranit z analytics, použít import z chmu modulu

### 2. `loadBoilerData()` - 2x definovaná VE STEJNÉM SOUBORU!
- **dashboard-boiler.js:63** - První definice
- **dashboard-boiler.js:376** - Druhá definice
- **Řešení**: Zkontrolovat rozdíly, sloučit nebo přejmenovat

### 3. `findShieldSensorId()` - 2x definovaná
- **dashboard-core.js:56** - První definice
- **dashboard-flow.js:9** - Druhá definice
- **Řešení**: Přesunout do utils, importovat v obou

## ⚠️ FALLBACK PROBLÉMY

### Počet '--' fallbacků v modulech:
- **dashboard-pricing.js**: 16 výskytů (nejvíce!)
- **dashboard-flow.js**: 10 výskytů
- **dashboard-analytics.js**: 9 výskytů
- **dashboard-boiler.js**: 7 výskytů
- **dashboard-core.js**: 7 výskytů
- **dashboard-chmu.js**: 5 výskytů
- **dashboard-grid-charging.js**: 2 výskyty
- **dashboard-shield.js**: 1 výskyt
- **dashboard-utils.js**: 1 výskyt

### Problematické vzory v dashboard-core.js:

```javascript
// Řádek 1086-1088: Inline fallback - nelze poznat zda je to '--' nebo reálná hodnota
updateElementIfChanged('battery-charge-value', `${displayCharge?.toFixed(1) || '--'} kWh`, 'batt-charge-val');
updateElementIfChanged('battery-discharge-value', `${displayDischarge?.toFixed(1) || '--'} kWh`, 'batt-discharge-val');
updateElementIfChanged('battery-losses-value', `${displayLossesKwh?.toFixed(1) || '--'} kWh (${displayLossesPct?.toFixed(1) || '--'}%)`, 'batt-loss-val');

// Řádek 1096-1101: Block fallback - celá sekce je nedostupná
updateElementIfChanged('battery-efficiency-main', '--', 'batt-eff-main');
updateElementIfChanged('battery-charge-value', '--', 'batt-charge-val');
updateElementIfChanged('battery-discharge-value', '--', 'batt-discharge-val');
updateElementIfChanged('battery-losses-value', '--', 'batt-loss-val');
```

## 📊 DOPORUČENÍ

### Duplicitní kód:
1. ✅ Odstranit `toggleChmuWarningModal` z analytics
2. ✅ Vyřešit duplicitu `loadBoilerData` v boiler.js
3. ✅ Přesunout `findShieldSensorId` do utils

### Fallback hodnoty:
1. ❌ **PROBLÉM**: Nelze vizuálně rozlišit '--' (fallback) od skutečných dat
2. ✅ **ŘEŠENÍ**: Přidat CSS třídu pro fallback hodnoty
   - Například: `<span class="fallback-value">--</span>`
   - CSS: `.fallback-value { opacity: 0.5; font-style: italic; }`
3. ✅ **ŘEŠENÍ**: Přidat tooltip "Data nejsou k dispozici"

### Refaktorované updateElementIfChanged:
```javascript
function updateElementIfChanged(elementId, newValue, cacheKey, isFallback = false) {
    // ... stávající logika ...
    
    if (isFallback) {
        element.classList.add('fallback-value');
        element.setAttribute('title', 'Data nejsou k dispozici');
    } else {
        element.classList.remove('fallback-value');
        element.removeAttribute('title');
    }
}
```

### Použití:
```javascript
// Fallback hodnota - vizuálně odlišná
updateElementIfChanged('battery-efficiency-main', '--', 'batt-eff-main', true);

// Reálná hodnota
updateElementIfChanged('battery-efficiency-main', '85.2%', 'batt-eff-main', false);
```
