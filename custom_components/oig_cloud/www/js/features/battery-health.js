/**
 * Battery Health Dashboard Module
 * Zobrazuje kvalitu baterie (SoH%), quality metrics, cycle progress
 *
 * Umístění: Tab "💰 Predikce a statistiky" vedle Battery Efficiency
 * Import: Přidat do dashboard.html
 */

// Cache pro Battery Health data (change detection)
var batteryHealthCache = {
    soh: null,
    capacity: null,
    cycleInProgress: null,
    qualityScore: null,
    measurementCount: null,
    avgPurity: null
};

/**
 * Update Battery Health statistics na Pricing tab
 * Načítá data z battery_health senzoru a zobrazuje SoH metriky
 * Používá change detection pro optimalizaci
 */
async function updateBatteryHealthStats() {
    const hass = getHass();
    if (!hass) {
        console.warn('[Battery Health] No HA connection');
        return;
    }

    const sensorId = `sensor.oig_${INVERTER_SN}_battery_health`;
    const sensor = hass.states[sensorId];

    console.log('[Battery Health] Checking sensor:', sensorId, 'state:', sensor?.state);

    if (!sensor) {
        console.log('[Battery Health] Sensor not found:', sensorId);
        return;
    }

    const attrs = sensor.attributes || {};
    const state = sensor.state; // SoH% nebo "unknown"

    console.log('[Battery Health] Sensor state:', state, 'attributes:', attrs);

    // Získat data ze senzoru
    const soh = (state !== 'unknown' && state !== 'unavailable') ? parseFloat(state) : null;
    const capacity = attrs.current_capacity_kwh || null;
    const nominalCapacity = attrs.nominal_capacity_kwh || 12.29;
    const cycleInProgress = attrs.cycle_in_progress || false;
    const cycleStartSoc = attrs.cycle_start_soc || null;
    const cycleCurrentSoc = attrs.cycle_current_soc || null;
    const cycleDuration = attrs.cycle_duration_min || null;
    const totalMeasurements = attrs.total_measurements || 0;
    const qualityMeasurements = attrs.quality_measurements || 0;
    const avgQualityScore = attrs.avg_quality_score || null;
    const avgPurity = attrs.avg_purity_percent || null;
    const capacityLoss = attrs.capacity_loss_kwh || null;

    // Trend data (pokud jsou dostupná)
    const trend30d = attrs.degradation_rate_30d_pct_per_year || null;
    const trendConfidence = attrs.trend_confidence || null;

    // Change detection
    const hasChanged =
        batteryHealthCache.soh !== soh ||
        batteryHealthCache.capacity !== capacity ||
        batteryHealthCache.cycleInProgress !== cycleInProgress ||
        batteryHealthCache.qualityScore !== avgQualityScore ||
        batteryHealthCache.measurementCount !== totalMeasurements ||
        batteryHealthCache.avgPurity !== avgPurity;

    if (!hasChanged) {
        // Žádné změny, přeskočit update
        return;
    }

    // Update cache
    batteryHealthCache.soh = soh;
    batteryHealthCache.capacity = capacity;
    batteryHealthCache.cycleInProgress = cycleInProgress;
    batteryHealthCache.qualityScore = avgQualityScore;
    batteryHealthCache.measurementCount = totalMeasurements;
    batteryHealthCache.avgPurity = avgPurity;

    console.log('[Battery Health] Values changed, updating UI:', {
        soh,
        capacity,
        cycleInProgress,
        avgQualityScore,
        totalMeasurements,
        avgPurity
    });

    // Najít nebo vytvořit battery health tile
    let container = document.getElementById('battery-health-container');
    if (!container) {
        // Vytvořit nový container
        container = createBatteryHealthContainer();
    }

    // Update HTML
    updateBatteryHealthUI(container, {
        soh,
        capacity,
        nominalCapacity,
        capacityLoss,
        cycleInProgress,
        cycleStartSoc,
        cycleCurrentSoc,
        cycleDuration,
        totalMeasurements,
        qualityMeasurements,
        avgQualityScore,
        avgPurity,
        trend30d,
        trendConfidence
    });
}

/**
 * Vytvoří HTML container pro Battery Health tile
 */
function createBatteryHealthContainer() {
    console.log('[Battery Health] Creating new container');

    // Najít Battery Efficiency tile - je to .stat-card s #battery-efficiency-main uvnitř
    const efficiencyTile = document.querySelector('.stat-card #battery-efficiency-main');

    if (!efficiencyTile) {
        console.warn('[Battery Health] Battery Efficiency tile not found, trying fallback position');
        // Fallback: najít pricing-tab a vložit dovnitř
        const pricingTab = document.getElementById('pricing-tab');
        if (!pricingTab) {
            console.error('[Battery Health] Cannot find pricing tab!');
            return null;
        }

        // Vytvořit wrapper vedle první stat-card grid
        const statGrid = pricingTab.querySelector('div[style*="grid-template-columns"]');
        if (statGrid) {
            const wrapper = document.createElement('div');
            wrapper.className = 'battery-health-tile';
            wrapper.id = 'battery-health-container';

            // Vložit za stat-card grid
            statGrid.parentNode.insertBefore(wrapper, statGrid.nextSibling);

            console.log('[Battery Health] Container created at fallback position');
            return wrapper;
        }
    }

    // Najít parent .stat-card (rodič #battery-efficiency-main)
    const parentCard = efficiencyTile.closest('.stat-card');
    if (!parentCard) {
        console.error('[Battery Health] Cannot find parent stat-card');
        return null;
    }

    // Vytvořit novou stat-card pro Battery Health
    const wrapper = document.createElement('div');
    wrapper.className = 'stat-card battery-health-tile';
    wrapper.id = 'battery-health-container';
    wrapper.style.background = 'linear-gradient(135deg, rgba(76, 217, 100, 0.15) 0%, rgba(76, 217, 100, 0.05) 100%)';
    wrapper.style.border = '1px solid rgba(76, 217, 100, 0.3)';
    wrapper.style.minHeight = '160px';

    // Vložit vedle Efficiency card (jako součást stejného grid)
    parentCard.parentNode.insertBefore(wrapper, parentCard.nextSibling);

    console.log('[Battery Health] Container created and positioned next to Efficiency');
    return wrapper;
}

/**
 * Aktualizuje UI Battery Health tile
 */
function updateBatteryHealthUI(container, data) {
    const {
        soh,
        capacity,
        nominalCapacity,
        capacityLoss,
        cycleInProgress,
        cycleStartSoc,
        cycleCurrentSoc,
        cycleDuration,
        totalMeasurements,
        qualityMeasurements,
        avgQualityScore,
        avgPurity,
        trend30d,
        trendConfidence
    } = data;

    // Určit status a barvu
    let statusClass = 'status-unknown';
    let statusIcon = '❓';
    let statusText = 'Čekám na data';

    if (soh !== null) {
        if (soh >= 95) {
            statusClass = 'status-excellent';
            statusIcon = '✅';
            statusText = 'Výborný stav';
        } else if (soh >= 90) {
            statusClass = 'status-good';
            statusIcon = '✔️';
            statusText = 'Dobrý stav';
        } else if (soh >= 80) {
            statusClass = 'status-fair';
            statusIcon = '⚠️';
            statusText = 'Střední degradace';
        } else {
            statusClass = 'status-poor';
            statusIcon = '❌';
            statusText = 'Vysoká degradace';
        }
    }

    // Cycle progress indicator (kompaktní pro stat-card)
    let cycleHTML = '';
    if (cycleInProgress && cycleStartSoc !== null && cycleCurrentSoc !== null) {
        const deltaPercent = cycleCurrentSoc - cycleStartSoc;
        const durationMin = cycleDuration || 0;
        const durationHrs = (durationMin / 60).toFixed(1);

        cycleHTML = `
            <div style="font-size: 0.85em; color: #007aff; margin: 8px 0; padding: 8px; background: rgba(0, 122, 255, 0.1); border-radius: 4px; border-left: 3px solid #007aff;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600;">� Nabíjení probíhá</span>
                    <span style="font-size: 0.9em; opacity: 0.8;">${durationHrs}h</span>
                </div>
                <div style="margin-top: 4px; font-size: 0.9em;">
                    ${cycleStartSoc.toFixed(0)}% → ${cycleCurrentSoc.toFixed(0)}% (+${deltaPercent.toFixed(0)}%)
                </div>
            </div>
        `;
    }

    // Trend (kompaktní, inline)
    let trendHTML = '';
    if (trend30d !== null && trendConfidence !== null && trendConfidence >= 70) {
        const trendIcon = trend30d < -2 ? '📉' : trend30d < -0.5 ? '➡️' : '✅';
        const trendColor = trend30d < -2 ? '#ff4444' : trend30d < -0.5 ? '#ffaa00' : '#44ff44';

        trendHTML = `
            <div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between;">
                <span>${trendIcon} Degradace:</span>
                <span style="color: ${trendColor}; font-weight: 600;">${Math.abs(trend30d).toFixed(2)}%/rok</span>
            </div>
        `;
    }

    // Sestavit HTML (stat-card kompatibilní struktura)
    container.innerHTML = `
        <div class="stat-label" style="color: #4cd964; font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
            <span>🔋 Kvalita baterie</span>
            <span class="battery-health-status ${statusClass}" style="font-size: 0.8em; padding: 4px 8px; border-radius: 12px;">
                ${statusIcon} ${statusText}
            </span>
        </div>

        ${soh !== null ? `
        <div class="stat-value" style="font-size: 1.8em; margin: 10px 0; color: #4cd964;">
            ${soh.toFixed(1)}<span style="font-size: 0.6em; opacity: 0.7;">% SoH</span>
        </div>
        ` : `
        <div style="text-align: center; padding: 20px 0; font-size: 0.9em; color: var(--text-secondary);">
            <div style="font-size: 2em; margin-bottom: 8px; opacity: 0.5;">⏳</div>
            <div>Čekám na první měření...</div>
            <div style="font-size: 0.8em; margin-top: 4px; font-style: italic;">Nabít 40%+ → 95%+</div>
        </div>
        `}

        ${cycleHTML}

        <div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 8px;">
            ${capacity !== null ? `
            <div style="display: flex; justify-content: space-between;">
                <span>📊 Kapacita:</span>
                <span style="color: var(--text-primary); font-weight: 600;">${capacity.toFixed(2)} kWh</span>
            </div>
            ${capacityLoss !== null && capacityLoss > 0 ? `
            <div style="display: flex; justify-content: space-between;">
                <span>📉 Ztráta:</span>
                <span style="color: #ff453a; font-weight: 600;">${capacityLoss.toFixed(2)} kWh</span>
            </div>
            ` : ''}
            ` : ''}

            ${totalMeasurements > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.05);">
                <span>📈 Měření:</span>
                <span style="color: var(--text-primary);">${totalMeasurements} (${qualityMeasurements} ⭐)</span>
            </div>
            ${avgQualityScore !== null ? `
            <div style="display: flex; justify-content: space-between;">
                <span>⭐ Kvalita:</span>
                <span style="color: var(--text-primary);">${avgQualityScore.toFixed(1)}/100</span>
            </div>
            ` : ''}
            ${avgPurity !== null ? `
            <div style="display: flex; justify-content: space-between;">
                <span>🔬 Čistota:</span>
                <span style="color: var(--text-primary);">${avgPurity.toFixed(1)}%</span>
            </div>
            ` : ''}
            ` : ''}
        </div>

        ${trendHTML}
    `;

    console.log('[Battery Health] UI updated successfully');
}

/**
 * Subscribe to battery_health sensor changes
 */
function subscribeBatteryHealthUpdates() {
    const hass = getHass();
    if (!hass) {
        console.warn('[Battery Health] Cannot subscribe - no HA connection');
        return;
    }

    const sensorId = `sensor.oig_${INVERTER_SN}_battery_health`;

    console.log('[Battery Health] Subscribing to updates:', sensorId);

    // Event listener pro změny stavu
    hass.connection.subscribeEvents((event) => {
        if (event.data.entity_id === sensorId) {
            console.log('[Battery Health] Sensor changed, updating...');
            updateBatteryHealthStats();
        }
    }, 'state_changed');

    // První načtení
    updateBatteryHealthStats();
}

// Export funkcí pro použití v dashboard.html
window.updateBatteryHealthStats = updateBatteryHealthStats;
window.subscribeBatteryHealthUpdates = subscribeBatteryHealthUpdates;

console.log('[Battery Health] Module loaded ✅');
