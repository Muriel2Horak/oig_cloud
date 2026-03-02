# OIG Cloud Fixes - Manuální Nasazení přes HA File Editor

## Problém
Soubory mají read-only práva, Samba/SCP nefungují. Musíme použít HA File Editor UI.

## Postup

### Krok 1: Získat HA Token
1. Otevřít: **http://<HA_HOST>:8123**
2. Kliknout na uživatelský profil (dole vlevo)
3. Scrollovat dolů: **"Long-Lived Access Tokens"**
4. Kliknout: **"Create Token"**
5. Název: `oig_cloud_deployment`
6. Zkopírovat token

### Krok 2: Otevřít File Editor
1. V HA UI: **Settings** → **File Editor**
2. Navigovat: `/config/custom_components/oig_cloud/www/`

### Krok 3: Upravit soubory

#### 📄 dashboard.html (řádky 1065-1101)

**Najít:**
```html
<!-- Prefetch timeline data on load -->
<script>
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Dashboard] Prefetching timeline data...');
        
        const days = ['yesterday', 'today', 'tomorrow'];
        const sn = INVERTER_SN;
        
        days.forEach(day => {
            fetchWithAuth(`/api/oig_cloud/battery_forecast/${sn}/detail_tabs?tab=${day}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (data) {
                            console.log(`[Dashboard] Prefetched ${day} data:`, data.mode_blocks?.length, 'blocks');
                        }
                    })
                    .catch(err => console.warn(`[Dashboard] Prefetch ${day} failed:`, err));
        });
    });
</script>
```

**Nahradit:**
```html
<!-- Prefetch timeline data on load (deferred until api.js is loaded) -->
<script>
    function prefetchTimelineData() {
        if (typeof fetchWithAuth !== 'function') {
            console.warn('[Dashboard] fetchWithAuth not available yet, retrying...');
            setTimeout(prefetchTimelineData, 200);
            return;
        }
        
        console.log('[Dashboard] Prefetching timeline data...');
        const days = ['yesterday', 'today', 'tomorrow'];
        const sn = INVERTER_SN;
        
        days.forEach(day => {
            fetchWithAuth(`/api/oig_cloud/battery_forecast/${sn}/detail_tabs?tab=${day}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (data) {
                            console.log(`[Dashboard] Prefetched ${day} data:`, data.mode_blocks?.length, 'blocks');
                        }
                    })
                    .catch(err => console.warn(`[Dashboard] Prefetch ${day} failed:`, err));
        });
    }
    
    setTimeout(prefetchTimelineData, 500);
</script>
```

#### 📄 www/js/features/timeline.js

**Uprava 1: Řádek ~588 (loadAllTabsData funkce)**

Najít:
```javascript
console.log(`[TimelineDialog] Loading ALL tabs data for plan ${plan}...`);

try {
    const apiUrl = `/api/oig_cloud/battery_forecast/${INVERTER_SN}/detail_tabs?plan=${plan}`;
    const response = await fetchWithAuth(apiUrl);
```

Přidat před `const apiUrl = ...`:
```javascript
console.log(`[TimelineDialog] Loading ALL tabs data for plan ${plan}...`);

if (typeof fetchWithAuth !== 'function') {
    console.error('[TimelineDialog] fetchWithAuth is not available');
    this.cache[plan] = this.createEmptyCache();
    return;
}

try {
    const apiUrl = `/api/oig_cloud/battery_forecast/${INVERTER_SN}/detail_tabs?plan=${plan}`;
    const response = await fetchWithAuth(apiUrl);
```

**Uprava 2: Řádek ~3737 (buildExtendedTimeline funkce)**

Najít:
```javascript
async function buildExtendedTimeline() {
    const apiUrl = `/api/oig_cloud/battery_forecast/${INVERTER_SN}/detail_tabs?tab=today`;
    
    try {
        const response = await fetchWithAuth(apiUrl);
```

Přidat před `const apiUrl = ...`:
```javascript
async function buildExtendedTimeline() {
    if (typeof fetchWithAuth !== 'function') {
        console.error('[Extended Timeline] fetchWithAuth is not available');
        return;
    }
    
    const apiUrl = `/api/oig_cloud/battery_forecast/${INVERTER_SN}/detail_tabs?tab=today`;
    
    try {
        const response = await fetchWithAuth(apiUrl);
```

#### 📄 www/js/features/pricing.js

**Uprava: Řádek ~2261 (fetchTimelineFromAPI funkce)**

Najít:
```javascript
async function fetchTimelineFromAPI(plan, boxId) {
    const timelineUrl = `/api/oig_cloud/battery_forecast/${boxId}/timeline?type=active`;
    const fetchStart = performance.now();
    console.log(`[Pricing] Fetching ${plan} timeline from API...`);
    const response = await fetchWithAuth(timelineUrl, { credentials: 'same-origin' });
```

Přidat před `const timelineUrl = ...`:
```javascript
async function fetchTimelineFromAPI(plan, boxId) {
    if (typeof fetchWithAuth !== 'function') {
        console.error('[Pricing] fetchWithAuth is not available');
        return [];
    }
    
    const timelineUrl = `/api/oig_cloud/battery_forecast/${boxId}/timeline?type=active`;
    const fetchStart = performance.now();
    console.log(`[Pricing] Fetching ${plan} timeline from API...`);
    const response = await fetchWithAuth(timelineUrl, { credentials: 'same-origin' });
```

#### 📄 www/js/features/analytics.js

**Uprava: Řádek ~57 (fetchCostComparisonTileData funkce)**

Najít:
```javascript
async function fetchCostComparisonTileData(retryCount = 0, maxRetries = 3) {
    try {
        console.log(`[Cost Comparison] Loading data (attempt ${retryCount + 1}/${maxRetries + 1})`);
        const hybridRes = await fetchWithAuth(
            `/api/oig_cloud/battery_forecast/${INVERTER_SN}/unified_cost_tile`,
            { credentials: 'same-origin' }
        );
```

Přidat před `console.log(...`:
```javascript
async function fetchCostComparisonTileData(retryCount = 0, maxRetries = 3) {
    if (typeof fetchWithAuth !== 'function') {
        console.error('[Cost Comparison] fetchWithAuth is not available');
        return { hybrid: null };
    }
    
    try {
        console.log(`[Cost Comparison] Loading data (attempt ${retryCount + 1}/${maxRetries + 1})`);
        const hybridRes = await fetchWithAuth(
            `/api/oig_cloud/battery_forecast/${INVERTER_SN}/unified_cost_tile`,
            { credentials: 'same-origin' }
        );
```

### Krok 4: Uložit každý soubor
Pro každou úpravu kliknout **"Save"** v pravém horním rohu File Editoru

### Krok 5: Reload OIG Cloud Integrace
1. Settings → **Devices & Services**
2. Najít: **OIG Cloud**
3. Kliknout: **⚙️** (tři tečky)
4. Kliknout: **"Reload"**
5. Počkat **10-20 sekund**

### Krok 6: Otestovat
1. Otevřít: **https://ha.muriel-cz.cz/local/oig_cloud_dashboard**
2. Chrome DevTools (F12) → **Console** tab
3. Hard refresh: **Ctrl+Shift+R** (Windows) / **Cmd+Shift+R** (Mac)
4. Hledat chybu: `fetchWithAuth is not defined`

**Očekávaný výsledek:**
- ✅ **ŽÁDNÁ chyba** `fetchWithAuth is not defined`
- ✅ Logy v konzoli:
  ```
  [Dashboard] Prefetching timeline data...
  [Dashboard] Prefetched today data: X blocks
  [TimelineDialog] Loading ALL tabs data for plan hybrid...
  ```

## Shrnutí změn

| Soubor | Řádky | Změna |
|---------|---------|--------|
| www/dashboard.html | 1065-1101 | Odstranit DOMContentLoaded, přidat deferred funkci |
| www/js/features/timeline.js | ~588, ~3737 | Přidat defensive checky |
| www/js/features/pricing.js | ~2261 | Přidat defensive check |
| www/js/features/analytics.js | ~57 | Přidat defensive check |

## Co opravujeme
- **Race condition** mezi načítáním scriptů a voláním fetchWithAuth
- **4 place** s `typeof fetchWithAuth !== 'function'` check
- **Defers** prefetch o 500ms, aby se api.js stihl načíst
