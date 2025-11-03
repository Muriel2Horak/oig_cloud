# JS Export Review - KRITICKÉ NÁLEZY

## ⚠️ CHYBĚJÍCÍ FUNKCE V EXPORTECH

### 1. dashboard-pricing.js (2 chybějící)
```javascript
// EXPORTOVÁNO ale NEDEFINOVÁNO:
- initCombinedChart
- updateCombinedChart
```

### 2. dashboard-flow.js (5 chybějících)
```javascript
// EXPORTOVÁNO ale NEDEFINOVÁNO:
- findShieldSensorId  // Toto jsme přesunuli do utils!
- updateNode
- updateNodeDetails
- debouncedLoadData
- debouncedLoadNodeDetails
```

### 3. dashboard-shield.js (5 chybějících)
```javascript
// EXPORTOVÁNO ale NEDEFINOVÁNO:
- loadShieldData
- setShieldMode
- setShieldModeWithConfirmation
- cancelShieldAction
- loadControlPanelStatus
```

### 4. dashboard-boiler.js (2 chybějící)
```javascript
// EXPORTOVÁNO ale NEDEFINOVÁNO:
- loadBoilerData  // Toto jsme přejmenovali!
- updateBoilerChart
```

### 5. dashboard-utils.js (1 chybějící)
```javascript
// EXPORTOVÁNO ale NEDEFINOVÁNO:
- waitForElement
```

### 6. dashboard-api.js (10 chybějících!)
```javascript
// EXPORTOVÁNO ale NEDEFINOVÁNO:
- getSensorString
- getSensorSafe
- getSensorStringSafe
- fetchOIGAPI
- loadBatteryTimeline
- loadUnifiedCostTile
- loadSpotPrices
- loadAnalytics
- callService
- batchLoadSensors
```

## 📊 CELKEM
- **25+ chybějících funkcí** v exportech
- **Nejvíce problémů**: dashboard-api.js (10), dashboard-flow.js (5), dashboard-shield.js (5)
- **Důvod**: Pravděpodobně přesuny funkcí během refaktoringu bez aktualizace exportů

## 🔧 PŘÍČINY

1. **Přesunuté funkce**: findShieldSensorId (přesunuta do utils, stále exportovaná z flow)
2. **Přejmenované funkce**: loadBoilerData (přejmenována, export neaktualizován)
3. **Rozdělené funkce**: Funkce mohly být rozděleny nebo sloučeny
4. **Neúplné exporty**: dashboard-api.js, dashboard-utils.js nemají žádný export block!


## 🎨 CSS REVIEW

### ✅ Výsledky
- **Velikost**: 8,525 řádků napříč 9 soubory
- **Největší soubory**: 
  - flow-canvas.css (72K, 2700 lines)
  - pricing-tab.css (50K, 2217 lines)
  - variables.css (36K, 1024 lines)
- **Duplicitní selektory**: ✓ Žádné nalezeny
- **CSS proměnné**: 100+ definováno, vypadá OK

### 💡 Doporučení
- CSS je dobře strukturované
- Žádné kritické problémy

## 📄 HTML REVIEW

### ⚠️ Nálezy
1. **Duplicitní ID**: `grid-charging-cost` (definováno 2x!)
2. **Chybějící elementy**: 20+ elementů odkazovaných v JS ale chybějících v HTML
   - Většinou boiler-* elementy
   - Pravděpodobně v oddělených HTML souborech (boiler-tab.html)

### 📊 Statistiky
- **Velikost**: 62K, 922 řádků
- **Script load order**: ✓ Správné pořadí (utils → api → moduly → core)

## 🚨 KRITICKÉ PRIORITY

### 1. OPRAVIT CHYBĚJÍCÍ EXPORTY (25+ funkcí)
Nejvíce kritické:
- dashboard-api.js: Chybí export block úplně!
- dashboard-utils.js: Chybí export block úplně!
- dashboard-flow.js: Odstranit findShieldSensorId z exportu (je v utils)
- dashboard-boiler.js: Aktualizovat export (loadBoilerData → loadBasicBoilerData/loadExtendedBoilerData)

### 2. OPRAVIT DUPLICITNÍ HTML ID
- `grid-charging-cost` - použito 2x v HTML

### 3. OVĚŘIT BOILER ELEMENTY
- 20+ boiler-* elementů chybí v dashboard.html
- Zkontrolovat jestli jsou v boiler-tab.html

