// ============================================================================
// PHASE 2.7: PERFORMANCE TRACKING CHART
// ============================================================================

let performanceChart = null;

/**
 * Initialize performance tracking chart
 */
function initPerformanceChart() {
    const canvas = document.getElementById('performance-chart');
    if (!canvas) {
        console.log('[Performance Chart] Canvas not found');
        return;
    }

    const ctx = canvas.getContext('2d');

    // Create Chart.js instance
    performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Očekávané náklady',
                    data: [],
                    backgroundColor: 'rgba(156, 39, 176, 0.5)',
                    borderColor: 'rgba(156, 39, 176, 0.8)',
                    borderWidth: 1
                },
                {
                    label: 'Skutečné náklady',
                    data: [],
                    backgroundColor: 'rgba(76, 175, 80, 0.5)',
                    borderColor: 'rgba(76, 175, 80, 0.8)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 3,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#333',
                        font: {
                            size: 10
                        },
                        boxWidth: 12,
                        padding: 8
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y.toFixed(2) + ' Kč';
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666',
                        font: {
                            size: 9
                        },
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666',
                        font: {
                            size: 9
                        },
                        callback: function(value) {
                            return value.toFixed(0) + ' Kč';
                        }
                    },
                    grid: {
                        color: 'rgba(156, 39, 176, 0.1)'
                    }
                }
            }
        }
    });

    console.log('[Performance Chart] Initialized');
}

/**
 * Update performance tracking chart with latest data
 */
async function updatePerformanceChart() {
    const hass = getHass();
    if (!hass) return;

    const performanceSensorId = `sensor.oig_${INVERTER_SN}_battery_forecast_performance`;
    const performanceSensor = hass.states[performanceSensorId];

    // Check if sensor is available
    if (!performanceSensor || performanceSensor.state === 'unavailable' || performanceSensor.state === 'unknown') {
        console.log('[Performance Chart] Performance sensor not available');

        // Update summary with placeholder
        updateElementIfChanged('perf-accuracy', '--', 'perf-acc');
        updateElementIfChanged('perf-savings', '--', 'perf-sav');
        updateElementIfChanged('perf-days', '--', 'perf-days');

        return;
    }

    const attrs = performanceSensor.attributes || {};
    const dailyHistory = attrs.daily_history || [];
    const monthlySummary = attrs.monthly_summary || {};
    const today = attrs.today || {};
    const yesterday = attrs.yesterday || {};

    // Update summary stats
    const accuracy = monthlySummary.avg_accuracy || yesterday.accuracy || null;
    const totalSavings = monthlySummary.total_savings || 0;
    const daysTracked = monthlySummary.days_tracked || 0;

    updateElementIfChanged('perf-accuracy',
        accuracy !== null ? `${accuracy.toFixed(1)}%` : '--',
        'perf-acc');
    updateElementIfChanged('perf-savings',
        totalSavings > 0 ? `+${totalSavings.toFixed(1)} Kč` : totalSavings < 0 ? `${totalSavings.toFixed(1)} Kč` : '0 Kč',
        'perf-sav');
    updateElementIfChanged('perf-days',
        daysTracked > 0 ? `${daysTracked} dní` : '--',
        'perf-days');

    // Update chart if initialized
    if (!performanceChart) {
        initPerformanceChart();
        if (!performanceChart) return;
    }

    // Prepare chart data (last 30 days)
    const last30Days = dailyHistory.slice(-30);

    const labels = [];
    const expectedData = [];
    const actualData = [];

    last30Days.forEach(day => {
        // Format date (DD.MM)
        const dateStr = day.date || '';
        const dateParts = dateStr.split('-');
        if (dateParts.length === 3) {
            labels.push(`${dateParts[2]}.${dateParts[1]}`);
        } else {
            labels.push(dateStr);
        }

        expectedData.push(day.expected || 0);
        actualData.push(day.actual || 0);
    });

    // Update chart data
    performanceChart.data.labels = labels;
    performanceChart.data.datasets[0].data = expectedData;
    performanceChart.data.datasets[1].data = actualData;

    // Update chart
    performanceChart.update('none'); // 'none' = no animation for performance

    console.log(`[Performance Chart] Updated with ${last30Days.length} days`);
}

// ============================================================================
// END PHASE 2.7
// ============================================================================

// Toggle ČHMÚ warning modal
function toggleChmuWarningModal() {
    const modal = document.getElementById('chmu-modal');
const openTimelineDialog = window.DashboardTimeline.openTimelineDialog;
const closeModeTimelineDialog = window.DashboardTimeline.closeModeTimelineDialog;
const buildModeTimeline = window.DashboardTimeline.buildModeTimeline;
    if (!container) {
        console.warn('[Today Plan Tile] Container not found - skipping render');
        return;
    }

    // Lazy load TodayPlanTile class if not already loaded
    if (typeof TodayPlanTile === 'undefined') {
        console.log('[Today Plan Tile] Loading module...');
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'modules/today-plan-tile.js';  // Relativní cesta (stejný základ jako dashboard-core.js)
        script.onload = () => {
            console.log('[Today Plan Tile] Module loaded, rendering...');
            initTodayPlanTile(container, tileSummary);
        };
        script.onerror = () => {
            console.error('[Today Plan Tile] Failed to load module');
        };
        document.head.appendChild(script);
        return;
    }

    // Update existing instance or create new one
    if (todayPlanTileInstance) {
        console.log('[Today Plan Tile] Updating existing instance');
        todayPlanTileInstance.update(tileSummary);
    } else {
        console.log('[Today Plan Tile] Creating new instance');
        initTodayPlanTile(container, tileSummary);
    }
}


/**
 * Initialize Today Plan Tile instance
 * @param {HTMLElement} container - Container element
 * @param {object} tileSummary - Tile summary data from API
 */
function initTodayPlanTile(container, tileSummary) {
    try {
        todayPlanTileInstance = new TodayPlanTile(
            container,
            tileSummary,
            () => {
                // Click handler - open timeline dialog and show DNES tab
                console.log('[Today Plan Tile] Opening timeline dialog with DNES view...');

                // Initialize dialog if needed
                if (!timelineDialogInstance) {
                    initTimelineDialog();
                }

                // Open dialog (will automatically show 'today' tab via TimelineDialog.open())
                timelineDialogInstance.open();
            }
        );
        console.log('[Today Plan Tile] Instance created successfully');
    } catch (error) {
        console.error('[Today Plan Tile] Failed to create instance:', error);
    }
}


/**
 * Load Unified Cost Tile data from API endpoint
 * PLAN_VS_ACTUAL_UX_REDESIGN_V2.md - Fáze 1 (UCT-FE-001)
 */
async function loadUnifiedCostTile() {
    try {
        console.log('[Unified Cost Tile] Loading data from API...');
        const response = await fetch(`/api/oig_cloud/battery_forecast/${INVERTER_SN}/unified_cost_tile`);

        if (!response.ok) {
            console.error('[Unified Cost Tile] API error:', response.status);
            return;
        }

        const data = await response.json();
        console.log('[Unified Cost Tile] Data loaded from API:', data);

        renderUnifiedCostTile(data);
    } catch (error) {
        console.error('[Unified Cost Tile] Failed to load from API:', error);
    }
}

/**
 * Render Unified Cost Tile - consolidated view of today/yesterday/tomorrow costs
 * PLAN_VS_ACTUAL_UX_REDESIGN_V2.md - Fáze 1 (UCT-FE-001)
 * Event-driven refresh triggered by buildExtendedTimeline()
 */
let unifiedCostTileInstance = null;

function renderUnifiedCostTile(unifiedCostData) {
    const container = document.getElementById('unified-cost-tile-container');
    if (!container) {
        console.warn('[Unified Cost Tile] Container not found - skipping render');
        return;
    }

    // Lazy load UnifiedCostTile class if not already loaded
    if (typeof UnifiedCostTile === 'undefined') {
        console.log('[Unified Cost Tile] Loading module...');
        const script = document.createElement('script');
        script.src = 'modules/unified-cost-tile.js';
        script.onload = () => {
            console.log('[Unified Cost Tile] Module loaded, rendering...');
            initUnifiedCostTile(container, unifiedCostData);
        };
        script.onerror = () => {
            console.error('[Unified Cost Tile] Failed to load module');
        };
        document.head.appendChild(script);
        return;
    }

    // Update existing instance or create new one
    if (unifiedCostTileInstance) {
        console.log('[Unified Cost Tile] Updating existing instance');
        unifiedCostTileInstance.update(unifiedCostData);
    } else {
        console.log('[Unified Cost Tile] Creating new instance');
        initUnifiedCostTile(container, unifiedCostData);
    }
}

/**
 * Initialize Unified Cost Tile instance
 * @param {HTMLElement} container - Container element
 * @param {object} unifiedCostData - unified_cost_tile data from sensor attributes
 */
function initUnifiedCostTile(container, unifiedCostData) {
    try {
        unifiedCostTileInstance = new UnifiedCostTile(
            container,
            unifiedCostData,
            () => {
                // Click handler - open timeline dialog and show DNES tab
                console.log('[Unified Cost Tile] Opening timeline dialog with DNES view...');

                // Initialize dialog if needed
                if (!timelineDialogInstance) {
                    initTimelineDialog();
                }

                // Open dialog (will automatically show 'today' tab)
                timelineDialogInstance.open();
            }
        );
        console.log('[Unified Cost Tile] Instance created successfully');
    } catch (error) {
        console.error('[Unified Cost Tile] Failed to create instance:', error);
    }
}


/**
 * Render TODAY's plan vs actual comparison + future intervals
 * FIRST: "Průběžný výsledek" (completed intervals with plan vs actual)
 * THEN: "Nadcházející intervaly" (future planned intervals)
 */
function renderTodayComparison(todayData, dailyPlanState) {
    const container = document.getElementById('extended-timeline-container');
    if (!container) {
        console.warn('[Extended Timeline] Container not found');
        return;
    }

    const { date, intervals, summary } = todayData;

    if (!intervals || intervals.length === 0) {
        container.innerHTML = `
            <div class="today-comparison">
                <p class="no-data" style="padding: 40px; text-align: center; color: var(--text-tertiary);">
                    📅 Žádná data pro dnešní porovnání
                </p>
            </div>
        `;
        return;
    }

    // Split intervals: historical (completed) vs future (planned)
    const historicalIntervals = intervals.filter(i => i.status === 'historical' && i.actual && i.planned);
    const futureIntervals = intervals.filter(i => i.status !== 'historical');

    let html = '<div class="today-comparison">';

    // Header with summary stats
    html += `
        <div class="comparison-header">
            <h2>📊 Dnes (${date}) - Plán vs Skutečnost</h2>
    `;

    if (summary && historicalIntervals.length > 0) {
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
                    <div class="card-sublabel">${historicalIntervals.length} intervalů dokončeno</div>
                </div>
            </div>
        `;
    }

    html += '</div>'; // comparison-header

    // Only show if there are historical intervals
    if (historicalIntervals.length === 0) {
        html += `
            <div class="no-historical" style="padding: 40px; text-align: center; color: var(--text-secondary);">
                ⏳ Zatím neproběhl žádný interval.<br>
                <span style="font-size: 0.9em;">Porovnání bude k dispozici po dokončení prvního intervalu.</span>
            </div>
        `;
    } else {
        // Find top 3 worst deviations
        const sortedByDelta = [...historicalIntervals]
            .filter(i => i.delta && Math.abs(i.delta.net_cost) > 0.01)
            .sort((a, b) => Math.abs(b.delta.net_cost) - Math.abs(a.delta.net_cost))
            .slice(0, 3);

        if (sortedByDelta.length > 0) {
            html += `
                <div class="top-deviations">
                    <h3>⚠️ Největší odchylky od plánu</h3>
                    <div class="deviation-list">
            `;

            sortedByDelta.forEach((interval, idx) => {
                const time = new Date(interval.time);
                const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
                const delta = interval.delta;
                const deltaClass = delta.net_cost > 0 ? 'worse' : 'better';
                const icon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';

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
        }

        // Detailed comparison table
        html += `
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
            const deltaClass = delta && delta.net_cost > 0 ? 'worse' : delta && delta.net_cost < 0 ? 'better' : '';

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
                        ${delta && delta.net_cost ?
                            `${delta.net_cost > 0 ? '+' : ''}${delta.net_cost.toFixed(2)} Kč` :
                            '0.00 Kč'
                        }
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    }

    // === SEKCE 2: NADCHÁZEJÍCÍ INTERVALY ===
    if (futureIntervals.length > 0) {
        html += `
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
    }

    html += '</div>'; // today-comparison

    container.innerHTML = html;
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
        const response = await fetch(apiUrl);
        if (!response.ok) {
            console.error('[Yesterday Analysis] Failed to fetch data:', response.status);
            return;
        }

        const data = await response.json();
        const timelineExtended = data.timeline_extended;

        if (!timelineExtended || !timelineExtended.yesterday) {
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

    // Filter only historical (completed) intervals
    const historicalIntervals = intervals.filter(i => i.status === 'historical' && i.actual && i.planned);

    let html = '<div class="yesterday-analysis">';

    // Header with date
    html += `
        <div class="analysis-header">
            <h2>📊 Včera (${date}) - Plán vs Skutečnost</h2>
        </div>
    `;

    // Summary cards
    if (summary && historicalIntervals.length > 0) {
        const deltaClass = summary.delta_cost > 0 ? 'worse' : 'better';
        const deltaIcon = summary.delta_cost > 0 ? '📈' : '📉';
        const deltaPct = summary.delta_cost !== null && summary.planned_total_cost > 0
            ? ((summary.delta_cost / summary.planned_total_cost) * 100).toFixed(1)
            : '0.0';

        html += `
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
                        ${summary.delta_cost > 0 ? '+' : ''}${summary.delta_cost?.toFixed(2) || '0.00'} Kč
                    </div>
                    <div class="card-sublabel ${deltaClass}">
                        ${summary.delta_cost > 0 ? '❌' : '✅'} ${deltaPct}% ${summary.delta_cost > 0 ? 'horší' : 'lepší'}
                    </div>
                </div>
                <div class="summary-card">
                    <div class="card-label">🎯 Přesnost režimů</div>
                    <div class="card-value">${summary.accuracy_pct?.toFixed(0) || '0'}%</div>
                    <div class="card-sublabel">${historicalIntervals.length}/96 intervalů</div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
                ℹ️ Včerejší data jsou neúplná nebo se ještě zpracovávají.
            </div>
        `;
    }

    html += '</div>'; // yesterday-analysis

    container.innerHTML = html;
}

// Global function for toggling interval details
window.toggleIntervalDetail = function(intervalId) {
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
window.toggleSection = function(sectionId) {
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
window.DashboardAnalytics = {
    initPerformanceChart,
    updatePerformanceChart,
    buildYesterdayAnalysis,
    showYesterdayNoData,
    renderYesterdayAnalysis,
    updateBatteryEfficiencyBar,
    init: function() {
        console.log('[DashboardAnalytics] Initialized');
    }
};

console.log('[DashboardAnalytics] Module loaded');
