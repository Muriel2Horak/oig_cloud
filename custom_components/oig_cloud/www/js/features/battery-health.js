/**
 * Battery Health Dashboard Module
 * Zobrazuje kvalitu baterie (SoH%), quality metrics, cycle progress
 *
 * Umístění: Tab "💰 Predikce a statistiky" vedle Battery Efficiency
 * Import: Přidat do dashboard.html
 */

// Cache pro Battery Health data (change detection)
let batteryHealthCache = {
    soh: null,
    capacity: null,
    measurementCount: null,
    lastMeasured: null,
    minCapacity: null,
    maxCapacity: null,
    qualityScore: null,
    selectionMethod: null,
    measurementHistory: null,
    methodDescription: null,
    degradation3m: null,
    degradation6m: null,
    degradation12m: null,
    degradationPerYear: null,
    estimatedEolDate: null,
    yearsTo80Pct: null,
    trendConfidence: null
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
    const state = sensor.state; // Průměrný SoH% za 30 dní

    console.log('[Battery Health] Sensor state:', state, 'attributes:', attrs);

    // Získat data ze senzoru (NOVÁ STRUKTURA PO REFACTORINGU)
    const soh = (state !== 'unknown' && state !== 'unavailable') ? Number.parseFloat(state) : null;

    const capacity = attrs.capacity_p80_last_20 ?? attrs.current_capacity_kwh ?? null;
    const measurementCount = attrs.measurement_count || 0;
    const lastMeasured = attrs.last_analysis || null;
    const minCapacity = attrs.capacity_p20_last_20 ?? null;
    const maxCapacity = attrs.capacity_p80_last_20 ?? null;
    const qualityScore = attrs.quality_score || null;
    const selectionMethod = attrs.soh_selection_method || null;
    const measurementHistory = attrs.measurement_history || [];
    const filters = attrs.filters || {};
    const methodDescription = attrs.soh_method_description || null;

    // Degradation trends (3, 6, 12 měsíců)
    const degradation3mPercent = attrs.degradation_3_months_percent || null;
    const degradation6mPercent = attrs.degradation_6_months_percent || null;
    const degradation12mPercent = attrs.degradation_12_months_percent || null;

    // Long-term trend (regression analysis)
    const degradationPerYearPercent = attrs.degradation_per_year_percent || null;
    const estimatedEolDate = attrs.estimated_eol_date || null;
    const yearsTo80Pct = attrs.years_to_80pct || null;
    const trendConfidence = attrs.trend_confidence || null;

    // Change detection
    const hasChanged =
        batteryHealthCache.soh !== soh ||
        batteryHealthCache.capacity !== capacity ||
        batteryHealthCache.measurementCount !== measurementCount ||
        batteryHealthCache.lastMeasured !== lastMeasured ||
        batteryHealthCache.minCapacity !== minCapacity ||
        batteryHealthCache.maxCapacity !== maxCapacity ||
        batteryHealthCache.qualityScore !== qualityScore ||
        batteryHealthCache.selectionMethod !== selectionMethod ||
        batteryHealthCache.measurementHistory !== measurementHistory ||
        batteryHealthCache.methodDescription !== methodDescription ||
        batteryHealthCache.degradation3m !== degradation3mPercent ||
        batteryHealthCache.degradation6m !== degradation6mPercent ||
        batteryHealthCache.degradation12m !== degradation12mPercent ||
        batteryHealthCache.degradationPerYear !== degradationPerYearPercent ||
        batteryHealthCache.estimatedEolDate !== estimatedEolDate ||
        batteryHealthCache.yearsTo80Pct !== yearsTo80Pct ||
        batteryHealthCache.trendConfidence !== trendConfidence;

    if (!hasChanged) {
        // Žádné změny, přeskočit update
        return;
    }

    // Update cache
    batteryHealthCache.soh = soh;
    batteryHealthCache.capacity = capacity;
    batteryHealthCache.measurementCount = measurementCount;
    batteryHealthCache.lastMeasured = lastMeasured;
    batteryHealthCache.minCapacity = minCapacity;
    batteryHealthCache.maxCapacity = maxCapacity;
    batteryHealthCache.qualityScore = qualityScore;
    batteryHealthCache.selectionMethod = selectionMethod;
    batteryHealthCache.measurementHistory = measurementHistory;
    batteryHealthCache.methodDescription = methodDescription;
    batteryHealthCache.degradation3m = degradation3mPercent;
    batteryHealthCache.degradation6m = degradation6mPercent;
    batteryHealthCache.degradation12m = degradation12mPercent;
    batteryHealthCache.degradationPerYear = degradationPerYearPercent;
    batteryHealthCache.estimatedEolDate = estimatedEolDate;
    batteryHealthCache.yearsTo80Pct = yearsTo80Pct;
    batteryHealthCache.trendConfidence = trendConfidence;

    console.log('[Battery Health] Values changed, updating UI:', {
        soh,
        capacity,
        measurementCount,
        lastMeasured,
        degradation3mPercent,
        degradation6mPercent,
        degradation12mPercent
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
        measurementCount,
        lastMeasured,
        minCapacity,
        maxCapacity,
        qualityScore,
        selectionMethod,
        measurementHistory,
        filters,
        methodDescription,
        degradation3mPercent,
        degradation6mPercent,
        degradation12mPercent,
        degradationPerYearPercent,
        estimatedEolDate,
        yearsTo80Pct,
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
    wrapper.style.minHeight = '160px'; // Shodný s efficiency tile pro konzistentní výšku

    // Vložit vedle Efficiency card (jako součást stejného grid)
    parentCard.parentNode.insertBefore(wrapper, parentCard.nextSibling);

    console.log('[Battery Health] Container created and positioned next to Efficiency');
    return wrapper;
}

function getBatteryHealthStatus(soh) {
    if (soh === null) {
        return { statusClass: 'status-unknown', statusIcon: '❓', statusText: 'Čekám na data' };
    }
    if (soh >= 95) {
        return { statusClass: 'status-excellent', statusIcon: '✅', statusText: 'Výborný stav' };
    }
    if (soh >= 90) {
        return { statusClass: 'status-good', statusIcon: '✔️', statusText: 'Dobrý stav' };
    }
    if (soh >= 80) {
        return { statusClass: 'status-fair', statusIcon: '⚠️', statusText: 'Střední degradace' };
    }
    return { statusClass: 'status-poor', statusIcon: '❌', statusText: 'Vysoká degradace' };
}

function getDegradationColor(value) {
    if (value === null || value === undefined) return 'var(--text-secondary)';
    if (value <= 2) return '#44ff44'; // zelená - výborné
    if (value <= 5) return '#ffaa00'; // oranžová - střední
    return '#ff4444'; // červená - vysoká
}

function formatDegradationRow(label, value) {
    if (value === null || value === undefined) return '';
    return `
        <div style="display: flex; justify-content: space-between; margin-top: 2px;">
            <span>${label}</span>
            <span style="color: ${getDegradationColor(value)}; font-weight: 600;">${value.toFixed(2)}%</span>
        </div>
    `;
}

function hasValue(value) {
    return value !== null && value !== undefined;
}

function buildDegradationHtml({ degradation3mPercent, degradation6mPercent, degradation12mPercent }) {
    if (!hasValue(degradation3mPercent) && !hasValue(degradation6mPercent) && !hasValue(degradation12mPercent)) {
        return '';
    }

    return `
        <div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05);">
            <div style="font-weight: 600; margin-bottom: 4px;">📉 Degradace kapacity:</div>
            ${formatDegradationRow('3 měsíce:', degradation3mPercent)}
            ${formatDegradationRow('6 měsíců:', degradation6mPercent)}
            ${formatDegradationRow('12 měsíců:', degradation12mPercent)}
        </div>
    `;
}

function buildPredictionHtml({ trendConfidence, yearsTo80Pct, estimatedEolDate, degradationPerYearPercent }) {
    if (!hasValue(trendConfidence) || trendConfidence < 70 || !hasValue(yearsTo80Pct)) {
        return '';
    }

    const yearsText = yearsTo80Pct >= 10 ? '10+' : yearsTo80Pct.toFixed(1);
    const eolText = estimatedEolDate || 'N/A';
    const hasEol = eolText !== 'N/A';
    const degradationHtml = hasValue(degradationPerYearPercent)
        ? `
            <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                <span>Degradace/rok:</span>
                <span style="color: ${getDegradationColor(degradationPerYearPercent)}; font-weight: 600;">${degradationPerYearPercent.toFixed(2)}%</span>
            </div>
        `
        : '';
    const eolHtml = hasEol
        ? `
            <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                <span>Očekávaný konec:</span>
                <span style="color: var(--text-primary); font-weight: 600;">${eolText}</span>
            </div>
        `
        : '';

    return `
        <div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05);">
            <div style="font-weight: 600; margin-bottom: 4px;">🔮 Dlouhodobá predikce:</div>
            ${degradationHtml}
            <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                <span>Do 80% SoH:</span>
                <span style="color: var(--text-primary); font-weight: 600;">${yearsText} let</span>
            </div>
            ${eolHtml}
            <div style="font-size: 0.85em; opacity: 0.7; margin-top: 4px; font-style: italic;">
                Spolehlivost: ${trendConfidence.toFixed(0)}%
            </div>
        </div>
    `;
}

function buildSohSection(soh, measurementCount) {
    if (!hasValue(soh)) {
        return `
            <div style="text-align: center; padding: 20px 0; font-size: 0.9em; color: var(--text-secondary);">
                <div style="font-size: 2em; margin-bottom: 8px; opacity: 0.5;">⏳</div>
                <div>Čekám na první měření...</div>
                <div style="font-size: 0.8em; margin-top: 8px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px;">
                    <div style="font-weight: 600; margin-bottom: 4px;">Jak to funguje:</div>
                    <div style="text-align: left;">
                        1. Baterii vybijte pod 90% SoC<br>
                        2. Nabijte na 95%+ SoC<br>
                        3. Snažte se nabíjet čistě ze slunce<br>
                        4. Měření se uloží každý den v 01:00
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="stat-value" style="font-size: 1.8em; margin: 10px 0; color: #4cd964;">
            ${soh.toFixed(1)}<span style="font-size: 0.6em; opacity: 0.7;">% SoH</span>
        </div>
        <div style="font-size: 0.7em; color: var(--text-secondary); margin-top: -5px;">
            (z ${measurementCount || 0} měření)
        </div>
    `;
}

function buildCapacitySection(capacity, minCapacity, maxCapacity) {
    if (!hasValue(capacity)) {
        return '';
    }

    const rangeHtml = hasValue(minCapacity) && hasValue(maxCapacity)
        ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.9em; opacity: 0.7;">
                <span>Rozsah:</span>
                <span>${minCapacity.toFixed(2)} - ${maxCapacity.toFixed(2)} kWh</span>
            </div>
        `
        : '';

    return `
        <div style="display: flex; justify-content: space-between;">
            <span>📊 Aktuální kapacita:</span>
            <span style="color: var(--text-primary); font-weight: 600;">${capacity.toFixed(2)} kWh</span>
        </div>
        ${rangeHtml}
    `;
}

function buildMeasurementSection(measurementCount, lastMeasured, qualityScore) {
    if (measurementCount <= 0) {
        return '';
    }

    const lastMeasuredHtml = lastMeasured
        ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.9em; opacity: 0.7;">
                <span>Poslední měření:</span>
                <span>${new Date(lastMeasured).toLocaleDateString('cs-CZ')}</span>
            </div>
        `
        : '';
    const qualityHtml = hasValue(qualityScore)
        ? `
            <div style="display: flex; justify-content: space-between;">
                <span>⭐ Kvalita:</span>
                <span style="color: var(--text-primary); font-weight: 600;">${qualityScore.toFixed(1)}/100</span>
            </div>
        `
        : '';

    return `
        <div style="display: flex; justify-content: space-between; margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.05);">
            <span>📈 Počet měření:</span>
            <span style="color: var(--text-primary); font-weight: 600;">${measurementCount}</span>
        </div>
        ${lastMeasuredHtml}
        ${qualityHtml}
    `;
}

function buildSohSparkline(measurements, width = 260, height = 60) {
    if (!Array.isArray(measurements) || measurements.length < 2) return '';
    const values = measurements.map(m => m.soh_percent).filter(v => typeof v === 'number');
    if (values.length < 2) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padding = 6;
    const step = (width - padding * 2) / (values.length - 1);
    const points = values.map((val, idx) => {
        const x = padding + idx * step;
        const y = padding + (height - padding * 2) * (1 - (val - min) / range);
        return `${x},${y}`;
    }).join(' ');

    return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="margin-top: 8px;">
            <defs>
                <linearGradient id="sohLine" x1="0" x2="1">
                    <stop offset="0%" stop-color="rgba(76,217,100,0.6)"></stop>
                    <stop offset="100%" stop-color="rgba(76,217,100,1)"></stop>
                </linearGradient>
            </defs>
            <polyline points="${points}" fill="none" stroke="url(#sohLine)" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
    `;
}

/**
 * Aktualizuje UI Battery Health tile
 */
function updateBatteryHealthUI(container, data) {
    const {
        soh,
        capacity,
        measurementCount,
        lastMeasured,
        minCapacity,
        maxCapacity,
        qualityScore,
        selectionMethod,
        measurementHistory,
        filters,
        methodDescription,
        degradation3mPercent,
        degradation6mPercent,
        degradation12mPercent,
        degradationPerYearPercent,
        estimatedEolDate,
        yearsTo80Pct,
        trendConfidence
    } = data;

    const { statusClass, statusIcon, statusText } = getBatteryHealthStatus(soh);

    const degradationHTML = buildDegradationHtml({
        degradation3mPercent,
        degradation6mPercent,
        degradation12mPercent
    });
    const predictionHTML = buildPredictionHtml({
        trendConfidence,
        yearsTo80Pct,
        estimatedEolDate,
        degradationPerYearPercent
    });
    const sohHtml = buildSohSection(soh, measurementCount);
    const capacityHtml = buildCapacitySection(capacity, minCapacity, maxCapacity);
    const measurementHtml = buildMeasurementSection(measurementCount, lastMeasured, qualityScore);
    // Sestavit HTML (stat-card kompatibilní struktura)
    container.innerHTML = `
        <div class="stat-label" style="color: #4cd964; font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
            <span>🔋 Kvalita baterie</span>
            <span class="battery-health-status ${statusClass}" style="font-size: 0.8em; padding: 4px 8px; border-radius: 12px;">
                ${statusIcon} ${statusText}
            </span>
        </div>

        ${sohHtml}

        <div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 8px;">
            ${capacityHtml}
            ${measurementHtml}
        </div>

        ${degradationHTML}
        ${predictionHTML}
    `;

    window.__batteryHealthDetails = {
        soh,
        capacity,
        measurementCount,
        lastMeasured,
        selectionMethod,
        measurementHistory,
        filters,
        methodDescription
    };

    container.style.cursor = 'pointer';
    container.onclick = () => openBatteryHealthDetails();

    console.log('[Battery Health] UI updated successfully');
}

function openBatteryHealthDetails() {
    const data = window.__batteryHealthDetails;
    if (!data) return;
    const existing = document.getElementById('battery-health-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'battery-health-modal';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.zIndex = '9999';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    const panel = document.createElement('div');
    panel.style.background = 'rgba(18, 24, 40, 0.98)';
    panel.style.border = '1px solid rgba(255,255,255,0.1)';
    panel.style.borderRadius = '12px';
    panel.style.width = 'min(900px, 92vw)';
    panel.style.maxHeight = '86vh';
    panel.style.overflow = 'auto';
    panel.style.padding = '20px';
    panel.style.color = 'var(--text-primary)';

    const historyRows = (data.measurementHistory || []).slice().reverse().map(m => `
        <tr>
            <td>${new Date(m.timestamp).toLocaleDateString('cs-CZ')}</td>
            <td style="text-align:right;">${m.soh_percent?.toFixed(1)}%</td>
            <td style="text-align:right;">${m.capacity_kwh?.toFixed(2)} kWh</td>
            <td style="text-align:right;">${m.delta_soc?.toFixed(0)}%</td>
            <td style="text-align:right;">${(m.charge_wh / 1000).toFixed(2)} kWh</td>
            <td style="text-align:right;">${m.duration_hours?.toFixed(1)} h</td>
        </tr>
    `).join('');

    panel.innerHTML = `
        <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 10px;">
            <h3 style="margin:0;">🔍 Detail kvality baterie</h3>
            <button class="chart-control-btn" onclick="document.getElementById('battery-health-modal').remove()">✕ Zavřít</button>
        </div>

        <div style="display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; font-size: 0.85em; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div><strong>SoH (p80):</strong> ${data.soh?.toFixed(1) ?? '--'}%</div>
            <div><strong>Měření:</strong> ${data.measurementCount ?? 0}</div>
            <div><strong>Metoda:</strong> ${data.selectionMethod || '--'}</div>
            <div><strong>Kapacita (p80):</strong> ${data.capacity?.toFixed(2) ?? '--'} kWh</div>
            <div><strong>Poslední analýza:</strong> ${data.lastMeasured ? new Date(data.lastMeasured).toLocaleDateString('cs-CZ') : '--'}</div>
            <div><strong>Filtry:</strong> ΔSoC ≥ ${data.filters?.min_delta_soc ?? '--'}%, min ${data.filters?.min_duration_hours ?? '--'}h</div>
        </div>

        ${data.methodDescription ? `
            <div style="margin-top: 12px; font-size: 0.85em; opacity: 0.85;">
                ${data.methodDescription}
            </div>
        ` : ''}

        <div style="margin-top: 12px;">
            ${buildSohSparkline(data.measurementHistory || [], 320, 70)}
        </div>

        <div style="margin-top: 12px; overflow:auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;">
            <table style="width:100%; border-collapse: collapse; font-size:0.85em;">
                <thead style="background: rgba(255,255,255,0.03);">
                    <tr style="text-align:left; opacity:0.8;">
                        <th>Datum</th>
                        <th style="text-align:right;">SoH</th>
                        <th style="text-align:right;">Kapacita</th>
                        <th style="text-align:right;">ΔSoC</th>
                        <th style="text-align:right;">Energie</th>
                        <th style="text-align:right;">Doba</th>
                    </tr>
                </thead>
                <tbody>
                    ${historyRows || '<tr><td colspan="6">Žádná měření</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    modal.appendChild(panel);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    document.body.appendChild(modal);
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

    const watcher = globalThis.DashboardStateWatcher;
    if (!watcher) {
        console.warn('[Battery Health] StateWatcher not available yet, retrying...');
        setTimeout(subscribeBatteryHealthUpdates, 500);
        return;
    }

    // Ensure watcher is running (idempotent)
    watcher.start({ intervalMs: 1000, prefixes: [`sensor.oig_${INVERTER_SN}_`] });

    // Register and subscribe once
    if (!globalThis.__oigBatteryHealthWatcherUnsub) {
        watcher.registerEntities([sensorId]);
        globalThis.__oigBatteryHealthWatcherUnsub = watcher.onEntityChange((entityId) => {
            if (entityId !== sensorId) return;
            console.log('[Battery Health] Sensor changed, updating...');
            updateBatteryHealthStats();
        });
    }

    // První načtení
    updateBatteryHealthStats();
}

// Export funkcí pro použití v dashboard.html
globalThis.updateBatteryHealthStats = updateBatteryHealthStats;
globalThis.subscribeBatteryHealthUpdates = subscribeBatteryHealthUpdates;

console.log('[Battery Health] Module loaded ✅');
