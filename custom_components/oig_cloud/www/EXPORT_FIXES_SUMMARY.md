# Export Integrity Fixes - Summary

## �� Úkol
Opravit všechny chybějící exportované funkce v JS modulech dashboardu.

## 🔍 Metodika
1. **Analýza**: Systematická kontrola všech `window.Dashboard*` exportů
2. **Ověření**: Hledání funkcí v aktuálních souborech
3. **Backup**: Hledání chybějících funkcí v `dashboard-core.js.bak` (původní monolit)
4. **Oprava**: Buď přesunutí funkcí z backupu, nebo odstranění obsolete exportů

## ✅ Opravené moduly

### 1. dashboard-flow.js
**Problém**: Export obsahoval neexistující `updateNode`, `updateNodeDetails`

**Řešení**:
- ✅ Přidány debounce funkce: `debouncedLoadData`, `debouncedLoadNodeDetails`
- ✅ `loadData` už existovala (řádek 1037)
- ✅ `loadNodeDetails` už existovala (řádek 1468)
- ❌ Odstraněny obsolete exporty: `updateNode`, `updateNodeDetails` (nikdy neexistovaly)

**Export PŘED**:
```javascript
window.DashboardFlow = {
    getSensorId,
    findShieldSensorId,
    updateTime,
    debouncedDrawConnections,
    drawConnections,
    getNodeCenters,
    updateNode,               // ❌ NEEXISTUJE
    updateNodeDetails,        // ❌ NEEXISTUJE
    loadData,
    debouncedLoadData,        // ❌ CHYBĚLA DEFINICE
    debouncedLoadNodeDetails, // ❌ CHYBĚLA DEFINICE
    init: ...
};
```

**Export PO**:
```javascript
window.DashboardFlow = {
    getSensorId,
    findShieldSensorId,
    updateTime,
    debouncedDrawConnections,
    drawConnections,
    getNodeCenters,
    loadData,                 // ✅ EXISTUJE
    loadNodeDetails,          // ✅ PŘIDÁNO
    debouncedLoadData,        // ✅ PŘIDÁNO
    debouncedLoadNodeDetails, // ✅ PŘIDÁNO
    init: ...
};
```

---

### 2. dashboard-shield.js
**Problém**: Export obsahoval 5 neexistujících funkcí

**Řešení**:
- ❌ Odstraněny obsolete exporty (nikdy neimplementovány):
  - `loadShieldData`
  - `setShieldMode`
  - `setShieldModeWithConfirmation`
  - `cancelShieldAction`
  - `loadControlPanelStatus`
- ✅ Přidány existující funkce:
  - `monitorShieldActivity`
  - `updateShieldUI`
  - `updateButtonStates`
  - `setBoxMode`
  - `setGridDelivery`
  - `setBoilerMode`
  - `loadControlStatus`

**Export PŘED**:
```javascript
window.DashboardShield = {
    startShieldQueueLiveUpdate,
    stopShieldQueueLiveUpdate,
    loadShieldData,              // ❌ NEEXISTUJE
    debouncedShieldMonitor,
    setShieldMode,               // ❌ NEEXISTUJE
    setShieldModeWithConfirmation, // ❌ NEEXISTUJE
    cancelShieldAction,          // ❌ NEEXISTUJE
    loadControlPanelStatus,      // ❌ NEEXISTUJE
    init: ...
};
```

**Export PO**:
```javascript
window.DashboardShield = {
    startShieldQueueLiveUpdate,
    stopShieldQueueLiveUpdate,
    debouncedShieldMonitor,
    monitorShieldActivity,       // ✅ PŘIDÁNO
    updateShieldUI,              // ✅ PŘIDÁNO
    updateButtonStates,          // ✅ PŘIDÁNO
    setBoxMode,                  // ✅ PŘIDÁNO
    setGridDelivery,             // ✅ PŘIDÁNO
    setBoilerMode,               // ✅ PŘIDÁNO
    loadControlStatus,           // ✅ PŘIDÁNO
    init: ...
};
```

---

### 3. dashboard-pricing.js
**Problém**: Export obsahoval neimplementované funkce combined chart

**Řešení**:
- ❌ Odstraněny plánované ale neimplementované funkce:
  - `initCombinedChart`
  - `updateCombinedChart`

**Export PŘED**:
```javascript
window.DashboardPricing = {
    debouncedLoadPricingData,
    debouncedUpdatePlannedConsumption,
    loadPricingData,
    updatePlannedConsumptionStats,
    updateWhatIfAnalysis,
    updateModeRecommendations,
    initCombinedChart,        // ❌ NEIMPLEMENTOVÁNO
    updateCombinedChart,      // ❌ NEIMPLEMENTOVÁNO
    init: ...
};
```

**Export PO**:
```javascript
window.DashboardPricing = {
    debouncedLoadPricingData,
    debouncedUpdatePlannedConsumption,
    loadPricingData,
    updatePlannedConsumptionStats,
    updateWhatIfAnalysis,
    updateModeRecommendations,
    init: ...
};
```

---

### 4. dashboard-boiler.js
**Problém**: Export používal staré názvy funkcí

**Řešení**:
- ✅ Aktualizovány názvy funkcí na skutečné:
  - `loadBoilerData` → `loadBasicBoilerData`, `loadExtendedBoilerData`
  - `updateBoilerChart` → `initializeBoilerChart`, `renderBoilerProfilingChart`, `renderBoilerHeatmap`
- ✅ Přidány další existující funkce pro úplnost

**Export PŘED**:
```javascript
window.DashboardBoiler = Object.assign(window.DashboardBoiler || {}, {
    loadBoilerData,           // ❌ NEEXISTUJE (starý název)
    updateBoilerChart,        // ❌ NEEXISTUJE (starý název)
    init: ...
});
```

**Export PO**:
```javascript
window.DashboardBoiler = Object.assign(window.DashboardBoiler || {}, {
    initBoilerDashboard,      // ✅ PŘIDÁNO
    loadBasicBoilerData,      // ✅ PŘIDÁNO (nový název)
    loadExtendedBoilerData,   // ✅ PŘIDÁNO (nový název)
    initializeBoilerChart,    // ✅ PŘIDÁNO (nový název)
    renderBoilerProfilingChart, // ✅ PŘIDÁNO
    renderBoilerHeatmap,      // ✅ PŘIDÁNO
    updateBoilerSensors,      // ✅ PŘIDÁNO
    updateBoilerProfile,      // ✅ PŘIDÁNO
    planBoilerHeating,        // ✅ PŘIDÁNO
    applyBoilerPlan,          // ✅ PŘIDÁNO
    cancelBoilerPlan,         // ✅ PŘIDÁNO
    init: ...
});
```

---

### 5. dashboard-utils.js
**Problém**: Export obsahoval neexistující `waitForElement`

**Řešení**:
- ❌ Odstraněn obsolete export: `waitForElement`

**Export PŘED**:
```javascript
window.DashboardUtils = {
    formatPower,
    formatEnergy,
    formatRelativeTime,
    formatChmuDateTime,
    formatNumber,
    formatCurrency,
    formatPercent,
    formatDuration,
    showNotification,
    debounce,
    throttle,
    updateElementIfChanged,
    updateClassIfChanged,
    waitForElement,           // ❌ NEEXISTUJE
    isNumberInRange,
    isValidEntityId,
    getCurrentTimeString,
    findShieldSensorId
};
```

**Export PO**:
```javascript
window.DashboardUtils = {
    formatPower,
    formatEnergy,
    formatRelativeTime,
    formatChmuDateTime,
    formatNumber,
    formatCurrency,
    formatPercent,
    formatDuration,
    showNotification,
    debounce,
    throttle,
    updateElementIfChanged,
    updateClassIfChanged,
    isNumberInRange,
    isValidEntityId,
    getCurrentTimeString,
    findShieldSensorId
};
```

---

### 6. dashboard-api.js
**Stav**: ✅ Již kompletní - žádné změny potřeba
- Všechny exportované funkce existují (ES6 `export function`)

---

## 🐛 HTML Fix

### Duplicitní ID: grid-charging-cost
**Problém**: ID `grid-charging-cost` se vyskytovalo 2x v `dashboard.html`
- Řádek 392: Battery detail (použito v JS)
- Řádek 698: Grid charging card summary (nepoužito v JS)

**Řešení**:
```html
<!-- PŘED (řádek 698) -->
<div id="grid-charging-cost">--</div>

<!-- PO (řádek 698) -->
<div id="grid-charging-cost-summary">--</div>
```

---

## 📊 Výsledky

### Celkový přehled oprav:
- **dashboard-flow.js**: 2 přidané funkce, 2 odstraněné obsolete
- **dashboard-shield.js**: 7 přidaných funkcí, 5 odstraněných obsolete
- **dashboard-pricing.js**: 2 odstraněné neimplementované
- **dashboard-boiler.js**: 11 přidaných funkcí, 2 přejmenované
- **dashboard-utils.js**: 1 odstraněný obsolete
- **dashboard.html**: 1 opravené duplicitní ID

### Finální test:
```bash
bash /tmp/final_export_check2.sh
```

**Výsledek**: ✅ ALL EXPORTS VERIFIED - NO ERRORS

```
📦 dashboard-api.js      → 17 funkcí ✓
📦 dashboard-utils.js    → 16 funkcí ✓
📦 dashboard-flow.js     → 10 funkcí ✓
📦 dashboard-shield.js   → 10 funkcí ✓
📦 dashboard-pricing.js  →  6 funkcí ✓
📦 dashboard-boiler.js   → 11 funkcí ✓
📦 dashboard-analytics.js →  6 funkcí ✓
📦 dashboard-chmu.js     →  5 funkcí ✓
```

---

## 🎓 Lessons Learned

1. **Export integrity**: Po refactoringu VŽDY ověřit exporty
2. **Function renaming**: Při přejmenování funkcí aktualizovat export bloky
3. **Obsolete code**: Nefunkční exporty způsobují runtime errory při volání
4. **Backup archaeology**: Původní monolit (`dashboard-core.js.bak`) je cenný zdroj pro recovery
5. **ES6 exports**: `export function` je viditelné i bez `window.Namespace` bloku

---

## ✨ Status
**COMPLETED** - Všechny exporty funkční a ověřené
