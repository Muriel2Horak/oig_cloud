/**
 * Today Plan Tile - Usage Example
 *
 * Ukázka integrace TodayPlanTile do dashboard-core.js
 *
 * Phase 2.9 - NEZASAZOVAT BEZ REVIEW!
 *
 * @version 1.0.0
 * @status EXAMPLE - NE PRO PRODUKCI
 */

// ============================================================================
// PŘÍKLAD 1: Základní použití dlaždice
// ============================================================================

/**
 * Načíst data z API a vytvořit dlaždici
 */
async function renderTodayPlanTile() {
    try {
        // Načíst data z API
        const response = await fetch('/api/oig_cloud/battery_forecast/SN123456/timeline?type=active');
        const data = await response.json();

        // Extrahovat today_tile_summary
        const tileSummary = data.today_tile_summary;

        if (!tileSummary) {
            console.warn('⚠️ today_tile_summary not available in API response');
            return;
        }

        // Najít container pro dlaždici
        const container = document.getElementById('today-plan-tile-container');
        if (!container) {
            console.error('❌ Container #today-plan-tile-container not found');
            return;
        }

        // Vytvořit instanci dlaždice s click handlerem
        const tile = new TodayPlanTile(container, tileSummary, () => {
            // Otevřít záložku DNES
            openTodayTab();
        });

        console.log('✅ Today Plan Tile rendered successfully');

        // Uložit instanci pro pozdější update
        window.todayPlanTileInstance = tile;

    } catch (error) {
        console.error('❌ Failed to render Today Plan Tile:', error);
    }
}

/**
 * Otevřít záložku DNES v dashboard
 */
function openTodayTab() {
    // Najít tab container
    const tabContainer = document.querySelector('#battery-forecast-tabs');
    if (!tabContainer) {
        console.warn('⚠️ Tab container not found');
        return;
    }

    // Najít záložku DNES
    const todayTab = tabContainer.querySelector('[data-tab="today"]');
    if (todayTab) {
        todayTab.click();
        console.log('✅ Today tab opened');
    } else {
        console.warn('⚠️ Today tab not found');
    }
}

// ============================================================================
// PŘÍKLAD 2: Auto-refresh každých 15 minut
// ============================================================================

/**
 * Nastavit automatický refresh dlaždice
 */
function setupTodayPlanTileAutoRefresh() {
    // Refresh každých 15 minut (synchronizováno s backend tracking)
    const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 min

    // Vypočítat delay do příštího intervalu (00, 15, 30, 45 min)
    function getNextRefreshDelay() {
        const now = new Date();
        const currentMinute = now.getMinutes();
        const nextInterval = Math.ceil((currentMinute + 1) / 15) * 15;
        const minutesUntilNext = nextInterval - currentMinute;

        return minutesUntilNext * 60 * 1000; // ms
    }

    // První refresh za X minut (do příštího intervalu)
    const initialDelay = getNextRefreshDelay();

    console.log(`⏰ First refresh in ${Math.round(initialDelay / 1000 / 60)} minutes`);

    setTimeout(() => {
        // První refresh
        refreshTodayPlanTile();

        // Pak každých 15 minut
        setInterval(() => {
            refreshTodayPlanTile();
        }, REFRESH_INTERVAL);

    }, initialDelay);
}

/**
 * Refresh dlaždice - načíst nová data a aktualizovat
 */
async function refreshTodayPlanTile() {
    try {
        console.log('🔄 Refreshing Today Plan Tile...');

        // Vizuální indikátor refreshu
        const refreshEl = document.querySelector('.auto-refresh');
        if (refreshEl) {
            refreshEl.classList.add('refreshing');
        }

        // Načíst nová data
        const response = await fetch('/api/oig_cloud/battery_forecast/SN123456/timeline?type=active');
        const data = await response.json();
        const tileSummary = data.today_tile_summary;

        if (!tileSummary) {
            console.warn('⚠️ today_tile_summary not available');
            return;
        }

        // Aktualizovat existující instanci
        if (window.todayPlanTileInstance) {
            window.todayPlanTileInstance.update(tileSummary);
            console.log('✅ Today Plan Tile refreshed');
        } else {
            // Pokud instance neexistuje, vytvořit novou
            renderTodayPlanTile();
        }

        // Odstranit vizuální indikátor
        if (refreshEl) {
            setTimeout(() => {
                refreshEl.classList.remove('refreshing');
            }, 1000);
        }

    } catch (error) {
        console.error('❌ Failed to refresh Today Plan Tile:', error);
    }
}

// ============================================================================
// PŘÍKLAD 3: Integrace do dashboard-core.js
// ============================================================================

/**
 * Přidat do init funkce dashboardu
 */
function initializeDashboard() {
    // ... existing dashboard init code ...

    // Inicializovat Today Plan Tile
    renderTodayPlanTile();

    // Nastavit auto-refresh
    setupTodayPlanTileAutoRefresh();

    console.log('✅ Dashboard initialized with Today Plan Tile');
}

// ============================================================================
// PŘÍKLAD 4: HTML struktura v dashboard HTML
// ============================================================================

/*
<!-- Přidat do HTML kde má být dlaždice -->
<div class="dashboard-tiles-left">
    <!-- Existující dlaždice -->
    <div class="tile">...</div>

    <!-- NOVÁ dlaždice "Dnes - Plnění plánu" -->
    <div id="today-plan-tile-container" class="tile-slot"></div>

    <!-- Další dlaždice -->
    <div class="tile">...</div>
</div>
*/

// ============================================================================
// PŘÍKLAD 5: Manuální update dlaždice
// ============================================================================

/**
 * Manuálně aktualizovat dlaždici (např. po změně režimu)
 */
function manualUpdateTodayPlanTile() {
    if (window.todayPlanTileInstance) {
        refreshTodayPlanTile();
    }
}

// ============================================================================
// PŘÍKLAD 6: Cleanup při unload
// ============================================================================

/**
 * Vyčistit resources při opuštění stránky
 */
window.addEventListener('beforeunload', () => {
    if (window.todayPlanTileInstance) {
        window.todayPlanTileInstance.destroy();
        window.todayPlanTileInstance = null;
    }
});

// ============================================================================
// EXPORT pro použití
// ============================================================================

export {
    renderTodayPlanTile,
    setupTodayPlanTileAutoRefresh,
    refreshTodayPlanTile,
    openTodayTab,
    manualUpdateTodayPlanTile
};
