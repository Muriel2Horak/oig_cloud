// ============================================================================
// ANALYTICS HELPERS
// ============================================================================

// Import ČHMÚ/timeline helpers on demand to avoid global name collisions.

/**
 * Load unified cost tile data from API
 */


let costComparisonTileInstance = null;
const COST_TILE_CACHE_TTL = 60 * 1000;
let costComparisonTileCache = null;
let costComparisonTileLastFetch = 0;
let costComparisonTilePromise = null;

async function loadCostComparisonTile(force = false) {
    const container = document.getElementById('cost-comparison-tile-container');
    if (!container) {
        return null;
    }
    const now = Date.now();

    if (!force && costComparisonTileCache && now - costComparisonTileLastFetch < COST_TILE_CACHE_TTL) {
        renderCostComparisonTile(costComparisonTileCache);
        return costComparisonTileCache;
    }

    if (!force && costComparisonTilePromise) {
        return costComparisonTilePromise;
    }

    const plannerPromise = globalThis.PlannerState?.fetchSettings?.() || Promise.resolve(null);

    costComparisonTilePromise = Promise.all([fetchCostComparisonTileData(), plannerPromise])
        .then(([rawTiles, plannerSettings]) => {
            const activePlan =
                globalThis.PlannerState?.resolveActivePlan?.(
                    plannerSettings || globalThis.PlannerState?.getCachedSettings?.()
                ) || 'hybrid';

            const summary = buildCostComparisonSummary(rawTiles.hybrid, activePlan);
            const payload = { hybrid: rawTiles.hybrid, comparison: summary };
            costComparisonTileCache = payload;
            costComparisonTileLastFetch = Date.now();
            renderCostComparisonTile(payload);
            return payload;
        })
        .finally(() => {
            costComparisonTilePromise = null;
        });

    return costComparisonTilePromise;
}

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

        if (!hybridRes.ok) {
            if (hybridRes.status === 401 || hybridRes.status === 403) {
                console.warn('[Cost Comparison] Unauthorized, skipping cost tile fetch');
                return { hybrid: null };
            }
            const shouldRetry = (code) => code >= 500;
            if (retryCount < maxRetries && shouldRetry(hybridRes.status)) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return fetchCostComparisonTileData(retryCount + 1, maxRetries);
            }
            const error = new Error(`HTTP ${hybridRes.status}`);
            error.status = hybridRes.status;
            throw error;
        }

        const hybridData = await hybridRes.json();
        return { hybrid: hybridData };
    } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
            console.warn('[Cost Comparison] Unauthorized, skipping cost tile fetch');
            return { hybrid: null };
        }
        console.error('[Cost Comparison] Failed to load', error);
        if (retryCount < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return fetchCostComparisonTileData(retryCount + 1, maxRetries);
        }
        throw error;
    }
}

function buildCostComparisonSummary(hybridTile, activePlan = 'hybrid') {
    const todayHybrid = hybridTile?.today || {};

    const actualSpent =
        todayHybrid.actual_cost_so_far ??
        todayHybrid.actual_total_cost ??
        0;

    function planSummary(dayData, planKey) {
        const future =
            dayData.future_plan_cost ??
            dayData.plan_total_cost ??
            0;
        return {
            plan_key: planKey,
            actual_cost: actualSpent,
            future_plan_cost: future,
            total_cost: actualSpent + future
        };
    }

    const standardSummary = planSummary(todayHybrid, 'hybrid');
    return {
        active_plan: activePlan,
        actual_spent: Math.round(actualSpent * 100) / 100,
        plans: {
            standard: standardSummary
        },
        delta_vs_standard: 0,
        baseline: todayHybrid.baseline_comparison ?? null,
        yesterday: hybridTile?.yesterday ?? null,
        tomorrow: {
            standard: hybridTile?.tomorrow?.plan_total_cost ?? null
        }
    };
}

function renderCostComparisonTile(data) {
    const container = document.getElementById('cost-comparison-tile-container');
    if (!container) {
        console.warn('[Cost Comparison] Container not found');
        return;
    }

    if (typeof CostComparisonTile === 'undefined') {
        const script = document.createElement('script');
        let payload = {};
        if (data) {
            payload = globalThis.structuredClone ? globalThis.structuredClone(data) : { ...data };
        }
        script.src = `modules/cost-comparison-tile.js?v=${Date.now()}`;
        script.onload = () => renderCostComparisonTile(payload);
        script.onerror = () => console.error('[Cost Comparison] Failed to load module');
        document.head.appendChild(script);
        return;
    }

    if (!data?.comparison) {
        container.innerHTML = `
            <div class="cost-card-placeholder">
                <span class="cost-card-title">💰 Nákladový přehled</span>
                <span class="cost-card-loading">Čekám na data…</span>
            </div>
        `;
        return;
    }

    const options = {
        onOpenHybrid: () => globalThis.DashboardTimeline?.openTimelineDialog?.('today', 'hybrid')
    };

    if (costComparisonTileInstance) {
        costComparisonTileInstance.update(data);
    } else {
        costComparisonTileInstance = new CostComparisonTile(container, data, options);
    }
}

/**
 * Render TODAY's plan vs actual comparison + future intervals
 * FIRST: "Průběžný výsledek" (completed intervals with plan vs actual)
 * THEN: "Nadcházející intervaly" (future planned intervals)
 */
function splitIntervals(intervals) {
    return {
        historicalIntervals: intervals.filter(i => i.status === 'historical' && i.actual && i.planned),
        futureIntervals: intervals.filter(i => i.status !== 'historical')
    };
}

function buildNoHistoricalHtml() {
    return `
        <div class="no-historical" style="padding: 40px; text-align: center; color: var(--text-secondary);">
            ⏳ Zatím neproběhl žádný interval.<br>
            <span style="font-size: 0.9em;">Porovnání bude k dispozici po dokončení prvního intervalu.</span>
        </div>
    `;
}

function buildTodaySummaryHtml({ date, summary, historicalCount }) {
    let html = `
        <div class="comparison-header">
            <h2>📊 Dnes (${date}) - Plán vs Skutečnost</h2>
    `;

    if (summary && historicalCount > 0) {
        const deltaClass = summary.delta_cost > 0 ? 'worse' : 'better';
        const deltaIcon = summary.delta_cost > 0 ? '📈' : '📉';

        html += `
            <div class="summary-cards">
                <div class="summary-card">
                    <div class="card-label">Plánované náklady</div>
                    <div class="card-value">${summary.planned_total_cost?.toFixed(2) || '0.00'} Kč</div>
                </div>
                <div class="summary-card">
                    <div class="card-label">Skutečné náklady</div>
                    <div class="card-value">${summary.actual_total_cost?.toFixed(2) || '0.00'} Kč</div>
                </div>
                <div class="summary-card ${deltaClass}">
                    <div class="card-label">${deltaIcon} Rozdíl</div>
                    <div class="card-value ${deltaClass}">
                        ${summary.delta_cost > 0 ? '+' : ''}${summary.delta_cost?.toFixed(2) || '0.00'} Kč
                    </div>
                    <div class="card-sublabel">${summary.delta_cost > 0 ? 'Dráž než plán' : 'Levněji než plán'}</div>
                </div>
                <div class="summary-card">
                    <div class="card-label">Přesnost režimů</div>
                    <div class="card-value">${summary.accuracy_pct?.toFixed(0) || '0'}%</div>
                    <div class="card-sublabel">${historicalCount} intervalů dokončeno</div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    return html;
}

function buildTopDeviationsHtml(historicalIntervals) {
    const sortedByDelta = [...historicalIntervals]
        .filter(i => i.delta && Math.abs(i.delta.net_cost) > 0.01)
        .sort((a, b) => Math.abs(b.delta.net_cost) - Math.abs(a.delta.net_cost))
        .slice(0, 3);

    if (sortedByDelta.length === 0) return '';

    let html = `
        <div class="top-deviations">
            <h3>⚠️ Největší odchylky od plánu</h3>
            <div class="deviation-list">
    `;

    const getRankIcon = (rank) => {
        if (rank === 0) return '🥇';
        if (rank === 1) return '🥈';
        return '🥉';
    };

    sortedByDelta.forEach((interval, idx) => {
        const time = new Date(interval.time);
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        const delta = interval.delta;
        const deltaClass = delta.net_cost > 0 ? 'worse' : 'better';
        const icon = getRankIcon(idx);

        html += `
            <div class="deviation-item ${deltaClass}">
                <span class="rank">${icon}</span>
                <span class="time">${timeStr}</span>
                <span class="modes">
                    ${interval.planned.mode_name} → ${interval.actual.mode_name}
                </span>
                <span class="delta ${deltaClass}">
                    ${delta.net_cost > 0 ? '+' : ''}${delta.net_cost.toFixed(2)} Kč
                </span>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;
    return html;
}

function buildHistoricalTableHtml(historicalIntervals) {
    let html = `
        <div class="comparison-table">
            <h3>📋 Detail všech dokončených intervalů</h3>
            <table>
                <thead>
                    <tr>
                        <th>Čas</th>
                        <th>Plán</th>
                        <th>Skutečnost</th>
                        <th>SOC plán</th>
                        <th>SOC skutečnost</th>
                        <th>Náklady plán</th>
                        <th>Náklady skutečnost</th>
                        <th>Rozdíl</th>
                    </tr>
                </thead>
                <tbody>
    `;

    historicalIntervals.forEach(interval => {
        const time = new Date(interval.time);
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        const planned = interval.planned;
        const actual = interval.actual;
        const delta = interval.delta;

        const modeMatch = planned.mode_name === actual.mode_name;
        const modeIcon = modeMatch ? '✅' : '❌';
        let deltaClass = '';
        if (delta?.net_cost > 0) {
            deltaClass = 'worse';
        } else if (delta?.net_cost < 0) {
            deltaClass = 'better';
        }

        const deltaCost = delta?.net_cost;
        let deltaCostLabel = '0.00 Kč';
        if (deltaCost !== null && deltaCost !== undefined) {
            const sign = deltaCost > 0 ? '+' : '';
            deltaCostLabel = `${sign}${deltaCost.toFixed(2)} Kč`;
        }

        const plannedModeConfig = MODE_CONFIG[planned.mode_name] || MODE_CONFIG['HOME I'];
        const actualModeConfig = MODE_CONFIG[actual.mode_name] || MODE_CONFIG['HOME I'];

        html += `
            <tr class="${modeMatch ? 'match' : 'mismatch'}">
                <td class="time-cell">${timeStr}</td>
                <td class="mode-cell">
                    <span class="mode-badge" style="background: ${plannedModeConfig.color};">
                        ${planned.mode_name}
                    </span>
                </td>
                <td class="mode-cell">
                    ${modeIcon}
                    <span class="mode-badge" style="background: ${actualModeConfig.color};">
                        ${actual.mode_name}
                    </span>
                </td>
                <td class="soc-cell">${planned.battery_soc?.toFixed(0) || '-'}%</td>
                <td class="soc-cell">${actual.battery_soc?.toFixed(0) || '-'}%</td>
                <td class="cost-cell">${planned.net_cost?.toFixed(2) || '0.00'} Kč</td>
                <td class="cost-cell">${actual.net_cost?.toFixed(2) || '0.00'} Kč</td>
                <td class="delta-cell ${deltaClass}">
                    ${deltaCostLabel}
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;
    return html;
}

function buildFutureIntervalsHtml(futureIntervals) {
    if (futureIntervals.length === 0) return '';

    let html = `
        <div class="future-intervals-section" style="margin-top: 30px; padding-top: 20px; border-top: 2px solid rgba(255,255,255,0.1);">
            <h3>🔮 Nadcházející intervaly (${futureIntervals.length})</h3>
            <table>
                <thead>
                    <tr>
                        <th>Čas</th>
                        <th>Plánovaný režim</th>
                        <th>SOC plán</th>
                        <th>Náklady plán</th>
                        <th>Spotová cena</th>
                    </tr>
                </thead>
                <tbody>
    `;

    futureIntervals.forEach(interval => {
        const time = new Date(interval.time);
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        const planned = interval.planned;
        const plannedModeConfig = MODE_CONFIG[planned?.mode_name] || MODE_CONFIG['HOME I'];
        const isActive = interval.status === 'active';

        html += `
            <tr class="${isActive ? 'active-interval' : ''}">
                <td class="time-cell">${timeStr}${isActive ? ' ⏱️' : ''}</td>
                <td class="mode-cell">
                    <span class="mode-badge" style="background: ${plannedModeConfig.color};">
                        ${planned?.mode_name || 'N/A'}
                    </span>
                </td>
                <td class="soc-cell">${planned?.battery_soc?.toFixed(0) || '-'}%</td>
                <td class="cost-cell">${planned?.net_cost?.toFixed(2) || '0.00'} Kč</td>
                <td class="cost-cell">${planned?.spot_price?.toFixed(2) || '0.00'} Kč/kWh</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;
    return html;
}

// =============================================================================
// PHASE 2.10: YESTERDAY ANALYSIS - Včerejší plán vs skutečnost
// =============================================================================

/**
 * Build yesterday's plan vs actual analysis
 */
async function buildYesterdayAnalysis() {
    const apiUrl = `/api/oig_cloud/battery_forecast/${INVERTER_SN}/timeline?type=active`;

    try {
        const response = await fetchWithAuth(apiUrl, { credentials: 'same-origin' });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.warn('[Yesterday Analysis] Unauthorized, skipping');
                return;
            }
            console.error('[Yesterday Analysis] Failed to fetch data:', response.status);
            return;
        }

        const data = await response.json();
        const timelineExtended = data.timeline_extended;

        if (!timelineExtended?.yesterday) {
            console.warn('[Yesterday Analysis] No yesterday data available');
            showYesterdayNoData();
            return;
        }

        console.log('[Yesterday Analysis] Loaded YESTERDAY data:', {
            intervals: timelineExtended.yesterday?.intervals?.length || 0,
            summary: timelineExtended.yesterday?.summary
        });

        // Render yesterday's analysis
        renderYesterdayAnalysis(timelineExtended.yesterday);

    } catch (error) {
        console.error('[Yesterday Analysis] Error fetching data:', error);
        showYesterdayNoData();
    }
}


/**
 * Show "no data" message for yesterday
 */
function showYesterdayNoData() {
    const container = document.getElementById('yesterday-timeline-container');
    if (!container) return;

    container.innerHTML = `
        <div style="padding: 60px 20px; text-align: center;">
            <div style="font-size: 3em; margin-bottom: 20px; opacity: 0.3;">📅</div>
            <h3 style="color: var(--text-secondary); margin-bottom: 10px;">Včerejší data nejsou k dispozici</h3>
            <p style="color: var(--text-tertiary); font-size: 0.9em;">
                Data se archivují automaticky každý den o půlnoci.<br>
                Pokud jste integraci spustili dnes, včerejší data ještě nejsou k dispozici.
            </p>
        </div>
    `;
}

function buildYesterdaySummaryHtml(summary, historicalIntervals) {
    if (!summary || historicalIntervals.length === 0) {
        return `
            <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
                ℹ️ Včerejší data jsou neúplná nebo se ještě zpracovávají.
            </div>
        `;
    }

    const deltaClass = summary.delta_cost > 0 ? 'worse' : 'better';
    const deltaIcon = summary.delta_cost > 0 ? '📈' : '📉';
    const deltaPct = summary.delta_cost !== null && summary.planned_total_cost > 0
        ? ((summary.delta_cost / summary.planned_total_cost) * 100).toFixed(1)
        : '0.0';
    const deltaSign = summary.delta_cost > 0 ? '+' : '';
    const deltaOutcomeIcon = summary.delta_cost > 0 ? '❌' : '✅';
    const deltaOutcomeLabel = summary.delta_cost > 0 ? 'horší' : 'lepší';

    return `
        <div class="summary-cards">
            <div class="summary-card">
                <div class="card-label">💰 Plánované náklady</div>
                <div class="card-value">${summary.planned_total_cost?.toFixed(2) || '0.00'} Kč</div>
            </div>
            <div class="summary-card">
                <div class="card-label">💸 Skutečné náklady</div>
                <div class="card-value">${summary.actual_total_cost?.toFixed(2) || '0.00'} Kč</div>
            </div>
            <div class="summary-card ${deltaClass}">
                <div class="card-label">${deltaIcon} Výsledek</div>
                <div class="card-value ${deltaClass}">
                    ${deltaSign}${summary.delta_cost?.toFixed(2) || '0.00'} Kč
                </div>
                <div class="card-sublabel ${deltaClass}">
                    ${deltaOutcomeIcon} ${deltaPct}% ${deltaOutcomeLabel}
                </div>
            </div>
            <div class="summary-card">
                <div class="card-label">🎯 Přesnost režimů</div>
                <div class="card-value">${summary.accuracy_pct?.toFixed(0) || '0'}%</div>
                <div class="card-sublabel">${historicalIntervals.length}/96 intervalů</div>
            </div>
        </div>
    `;
}


/**
 * Render yesterday's plan vs actual analysis
 */
function renderYesterdayAnalysis(yesterdayData) {
    const container = document.getElementById('yesterday-timeline-container');
    if (!container) {
        console.warn('[Yesterday Analysis] Container not found');
        return;
    }

    const { date, intervals, summary } = yesterdayData;

    if (!intervals || intervals.length === 0) {
        showYesterdayNoData();
        return;
    }

    const historicalIntervals = intervals.filter(i => i.status === 'historical' && i.actual && i.planned);
    let html = '<div class="yesterday-analysis">';

    html += `
        <div class="analysis-header">
            <h2>📊 Včera (${date}) - Plán vs Skutečnost</h2>
        </div>
    `;

    html += buildYesterdaySummaryHtml(summary, historicalIntervals);

    html += '</div>';
    container.innerHTML = html;
}

// Global function for toggling interval details
globalThis.toggleIntervalDetail = function(intervalId) {
    const detailEl = document.getElementById(`interval-detail-${intervalId}`);
    const rowEl = document.querySelector(`[data-interval-id="${intervalId}"]`);

    if (detailEl && rowEl) {
        const isVisible = detailEl.style.display !== 'none';
        detailEl.style.display = isVisible ? 'none' : 'block';

        if (isVisible) {
            rowEl.classList.remove('expanded');
        } else {
            rowEl.classList.add('expanded');
        }
    }
};

// Global function for toggling section collapse
globalThis.toggleSection = function(sectionId) {
    const sectionEl = document.getElementById(sectionId);
    const headerEl = sectionEl?.parentElement.querySelector('.section-header');

    if (sectionEl && headerEl) {
        const isVisible = sectionEl.style.display !== 'none';
        sectionEl.style.display = isVisible ? 'none' : 'block';

        const toggleEl = headerEl.querySelector('.section-toggle');
        if (toggleEl) {
            toggleEl.textContent = isVisible ? '▶' : '▼';
        }

        if (isVisible) {
            headerEl.parentElement.classList.add('collapsed');
        } else {
            headerEl.parentElement.classList.remove('collapsed');
        }
    }
};

/**
 * Update battery efficiency bar visualization
 * Shows comparison between last month and current month efficiency
 * @param {number} lastMonthEff - Last month efficiency percentage
 * @param {number} currentMonthEff - Current month efficiency percentage
 */
function updateBatteryEfficiencyBar(lastMonthEff, currentMonthEff) {
    const barLast = document.getElementById('battery-efficiency-bar-last');
    const barCurrent = document.getElementById('battery-efficiency-bar-current');
    const labelLast = document.getElementById('battery-efficiency-bar-last-label');
    const labelCurrent = document.getElementById('battery-efficiency-bar-current-label');

    if (!barLast || !barCurrent || !labelLast || !labelCurrent) return;

    // Pokud máme obě hodnoty, zobraz poměr
    if (lastMonthEff !== null && lastMonthEff !== undefined &&
        currentMonthEff !== null && currentMonthEff !== undefined) {

        const total = lastMonthEff + currentMonthEff;
        const lastPercent = (lastMonthEff / total) * 100;
        const currentPercent = (currentMonthEff / total) * 100;

        barLast.style.width = `${lastPercent}%`;
        barCurrent.style.width = `${currentPercent}%`;
        labelLast.textContent = `${lastMonthEff.toFixed(1)}%`;
        labelCurrent.textContent = `${currentMonthEff.toFixed(1)}%`;
    } else if (lastMonthEff !== null && lastMonthEff !== undefined) {
        // Jen minulý měsíc
        barLast.style.width = '100%';
        barCurrent.style.width = '0%';
        labelLast.textContent = `${lastMonthEff.toFixed(1)}%`;
        labelCurrent.textContent = '--';
    } else if (currentMonthEff !== null && currentMonthEff !== undefined) {
        // Jen tento měsíc
        barLast.style.width = '0%';
        barCurrent.style.width = '100%';
        labelLast.textContent = '--';
        labelCurrent.textContent = `${currentMonthEff.toFixed(1)}%`;
    } else {
        // Žádná data
        barLast.style.width = '0%';
        barCurrent.style.width = '0%';
        labelLast.textContent = '--';
        labelCurrent.textContent = '--';
    }
}

// Export analytics functions
// Cache for battery efficiency to prevent unnecessary updates
let batteryEfficiencyCache = {
    efficiency: null,
    charge: null,
    discharge: null,
    losses: null,
    label: null
};
let batteryEfficiencyRetryTimeout = null;

function resolveBatteryEfficiencySensor(hass, sensorId) {
    if (!hass?.states) return null;
    const direct = hass.states[sensorId];
    if (direct) return direct;

    const prefix = `sensor.oig_${INVERTER_SN}_`;
    const suffix = '_battery_efficiency';
    const matchId = Object.keys(hass.states).find((id) => id.startsWith(prefix) && id.endsWith(suffix));
    return matchId ? hass.states[matchId] : null;
}

function buildEfficiencyDisplayData(attrs) {
    const lastMonthEff = attrs.efficiency_last_month_pct;
    const lastMonthLossesPct = attrs.losses_last_month_pct;
    const lastMonthLossesKwh = attrs.losses_last_month_kwh;
    const lastMonthCharge = attrs.last_month_charge_kwh;
    const lastMonthDischarge = attrs.last_month_discharge_kwh;

    const currentMonthEff = attrs.efficiency_current_month_pct;
    const currentMonthLossesPct = attrs.losses_current_month_pct;
    const currentMonthLossesKwh = attrs.losses_current_month_kwh;
    const currentMonthCharge = attrs.current_month_charge_kwh;
    const currentMonthDischarge = attrs.current_month_discharge_kwh;
    const currentMonthDays = attrs.current_month_days;

    const hasLastMonth = lastMonthEff !== null && lastMonthEff !== undefined &&
        lastMonthCharge !== null && lastMonthDischarge !== null;
    const hasCurrentMonth = currentMonthEff !== null && currentMonthEff !== undefined;

    if (hasLastMonth) {
        console.log('[Battery Efficiency] Using LAST month data:', lastMonthEff + '%');
        return {
            display: {
                efficiency: lastMonthEff,
                lossesPct: lastMonthLossesPct,
                lossesKwh: lastMonthLossesKwh,
                charge: lastMonthCharge,
                discharge: lastMonthDischarge,
                label: 'Minulý měsíc'
            },
            lastMonthEff,
            currentMonthEff
        };
    }

    if (hasCurrentMonth) {
        console.log('[Battery Efficiency] Using CURRENT month data:', currentMonthEff + '%');
        return {
            display: {
                efficiency: currentMonthEff,
                lossesPct: currentMonthLossesPct,
                lossesKwh: currentMonthLossesKwh,
                charge: currentMonthCharge,
                discharge: currentMonthDischarge,
                label: `Tento měsíc (${currentMonthDays} dní)`
            },
            lastMonthEff,
            currentMonthEff
        };
    }

    console.warn('[Battery Efficiency] No data available - lastMonth:', lastMonthEff, 'currentMonth:', currentMonthEff);
    return { display: null, lastMonthEff, currentMonthEff };
}

function hasEfficiencyChanged(display) {
    return (
        batteryEfficiencyCache.efficiency !== display.efficiency ||
        batteryEfficiencyCache.charge !== display.charge ||
        batteryEfficiencyCache.discharge !== display.discharge ||
        batteryEfficiencyCache.losses !== display.lossesKwh ||
        batteryEfficiencyCache.label !== display.label
    );
}

function updateBatteryEfficiencyCache(display) {
    batteryEfficiencyCache.efficiency = display.efficiency;
    batteryEfficiencyCache.charge = display.charge;
    batteryEfficiencyCache.discharge = display.discharge;
    batteryEfficiencyCache.losses = display.lossesKwh;
    batteryEfficiencyCache.label = display.label;
}

function updateBatteryEfficiencyMain(display) {
    const mainEl = document.getElementById('battery-efficiency-main');
    if (mainEl) {
        mainEl.textContent = `${display.efficiency.toFixed(1)}%`;
    }

    const periodEl = document.getElementById('battery-efficiency-period-label');
    if (periodEl) {
        periodEl.textContent = display.label;
    }
}

function updateBatteryEfficiencyTrend(lastMonthEff, currentMonthEff, displayLabel) {
    const trendEl = document.getElementById('battery-efficiency-trend');
    if (!trendEl) return;

    if (lastMonthEff !== null && currentMonthEff !== null &&
        lastMonthEff !== undefined && currentMonthEff !== undefined) {
        const diff = currentMonthEff - lastMonthEff;
        const diffAbs = Math.abs(diff);
        let trendText = '';
        let trendColor = '';

        if (diff > 0.5) {
            trendText = `↗️ Vs minulý měsíc +${diffAbs.toFixed(1)}%`;
            trendColor = '#4CAF50';
        } else if (diff < -0.5) {
            trendText = `↘️ Vs minulý měsíc -${diffAbs.toFixed(1)}%`;
            trendColor = '#FF5722';
        } else {
            trendText = '➡️ Podobně jako minulý měsíc';
            trendColor = 'var(--text-secondary)';
        }

        trendEl.textContent = trendText;
        trendEl.style.color = trendColor;
        return;
    }

    trendEl.textContent = displayLabel;
}

function updateBatteryEfficiencyDetails(display) {
    const chargeEl = document.getElementById('battery-charge-value');
    if (chargeEl) {
        chargeEl.textContent = `${display.charge?.toFixed(1) || '--'} kWh`;
    }

    const dischargeEl = document.getElementById('battery-discharge-value');
    if (dischargeEl) {
        dischargeEl.textContent = `${display.discharge?.toFixed(1) || '--'} kWh`;
    }

    const lossesEl = document.getElementById('battery-losses-value');
    if (lossesEl) {
        lossesEl.textContent = `${display.lossesKwh?.toFixed(1) || '--'} kWh (${display.lossesPct?.toFixed(1) || '--'}%)`;
    }
}

function resetBatteryEfficiencyUi() {
    const mainEl = document.getElementById('battery-efficiency-main');
    if (mainEl) mainEl.textContent = '--';

    const periodEl = document.getElementById('battery-efficiency-period-label');
    if (periodEl) periodEl.textContent = 'Čekám na data...';

    const trendEl = document.getElementById('battery-efficiency-trend');
    if (trendEl) trendEl.textContent = 'Čekám na data...';

    const chargeEl = document.getElementById('battery-charge-value');
    if (chargeEl) chargeEl.textContent = '--';

    const dischargeEl = document.getElementById('battery-discharge-value');
    if (dischargeEl) dischargeEl.textContent = '--';

    const lossesEl = document.getElementById('battery-losses-value');
    if (lossesEl) lossesEl.textContent = '--';
}

/**
 * Update battery efficiency statistics on Pricing tab
 * Loads data from battery_efficiency sensor and displays monthly stats
 * Uses change detection to update only when values change
 */
async function updateBatteryEfficiencyStats() {
    const hass = getHass();
    if (!hass) {
        console.warn('[Battery Efficiency] No HA connection');
        return;
    }

    const sensorId = `sensor.oig_${INVERTER_SN}_battery_efficiency`;
    const sensor = resolveBatteryEfficiencySensor(hass, sensorId);

    console.log('[Battery Efficiency] Checking sensor:', sensorId, 'state:', sensor?.state);

    if (!sensor) {
        console.log('[Battery Efficiency] Sensor not available:', sensorId);
        if (!batteryEfficiencyRetryTimeout) {
            batteryEfficiencyRetryTimeout = setTimeout(() => {
                batteryEfficiencyRetryTimeout = null;
                updateBatteryEfficiencyStats();
            }, 1500);
        }
        return;
    }

    const attrs = sensor.attributes || {};
    const hasAttrsData = (attrs.efficiency_current_month_pct !== null &&
        attrs.efficiency_current_month_pct !== undefined) ||
        (attrs.efficiency_last_month_pct !== null &&
            attrs.efficiency_last_month_pct !== undefined);
    if ((sensor.state === 'unavailable' || sensor.state === 'unknown') && !hasAttrsData) {
        console.log('[Battery Efficiency] Sensor has no data yet:', sensorId);
        return;
    }
    console.log('[Battery Efficiency] Sensor attributes:', attrs);

    const { display, lastMonthEff, currentMonthEff } = buildEfficiencyDisplayData(attrs);
    if (!display) {
        resetBatteryEfficiencyUi();
        return;
    }

    const mainEl = document.getElementById('battery-efficiency-main');
    if (!mainEl) {
        return;
    }
    const shouldForceRender = mainEl.textContent?.trim() === '--';
    if (!hasEfficiencyChanged(display) && !shouldForceRender) {
        return;
    }

    updateBatteryEfficiencyCache(display);
    console.log('[Battery Efficiency] Values changed, updating UI:', display);

    updateBatteryEfficiencyMain(display);
    updateBatteryEfficiencyTrend(lastMonthEff, currentMonthEff, display.label);
    updateBatteryEfficiencyDetails(display);
    updateBatteryEfficiencyBar(lastMonthEff, currentMonthEff);
}

function subscribeBatteryEfficiencyUpdates() {
    const hass = getHass();
    if (!hass) {
        console.warn('[Battery Efficiency] Cannot subscribe - no HA connection');
        return;
    }

    const sensorId = `sensor.oig_${INVERTER_SN}_battery_efficiency`;
    const watcher = globalThis.DashboardStateWatcher;
    if (!watcher) {
        console.warn('[Battery Efficiency] StateWatcher not available yet, retrying...');
        setTimeout(subscribeBatteryEfficiencyUpdates, 500);
        return;
    }

    watcher.start({ intervalMs: 1000, prefixes: [`sensor.oig_${INVERTER_SN}_`] });

    if (!globalThis.__oigBatteryEfficiencyWatcherUnsub) {
        watcher.registerEntities([sensorId]);
        globalThis.__oigBatteryEfficiencyWatcherUnsub = watcher.onEntityChange((entityId) => {
            if (entityId !== sensorId) return;
            console.log('[Battery Efficiency] Sensor changed, updating...');
            updateBatteryEfficiencyStats();
        });
    }

    updateBatteryEfficiencyStats();
}

globalThis.DashboardAnalytics = {
    buildYesterdayAnalysis,
    showYesterdayNoData,
    renderYesterdayAnalysis,
    updateBatteryEfficiencyBar,
    updateBatteryEfficiencyStats,
    subscribeBatteryEfficiencyUpdates,
    init: function() {
        console.log('[DashboardAnalytics] Initialized');
    }
};

console.log('[DashboardAnalytics] Module loaded');
if (typeof globalThis.DashboardAnalytics?.updateBatteryEfficiencyStats === 'function') {
    setTimeout(() => globalThis.DashboardAnalytics.updateBatteryEfficiencyStats(), 500);
    setTimeout(() => globalThis.DashboardAnalytics.updateBatteryEfficiencyStats(), 2000);
}
if (typeof globalThis.DashboardAnalytics?.subscribeBatteryEfficiencyUpdates === 'function') {
    setTimeout(() => globalThis.DashboardAnalytics.subscribeBatteryEfficiencyUpdates(), 1200);
}
