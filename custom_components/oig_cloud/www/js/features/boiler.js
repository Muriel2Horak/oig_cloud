/**
 * OIG Bojler Dashboard - Integrace do hlavního dashboardu
 * Heatmap, timeline, profiling
 */

// Global boiler state
const boilerState = {
    profiles: {},
    currentCategory: null,
    plan: null,
    state: null,
    profileSummary: null,
    config: null,
    batteryTimeline: null,
    charts: {},
    initialized: false,
    refreshTimer: null
};

// Czech labels
const CATEGORY_LABELS = {
    'workday_spring': 'Pracovní den - Jaro',
    'workday_summer': 'Pracovní den - Léto',
    'workday_autumn': 'Pracovní den - Podzim',
    'workday_winter': 'Pracovní den - Zima',
    'weekend_spring': 'Víkend - Jaro',
    'weekend_summer': 'Víkend - Léto',
    'weekend_autumn': 'Víkend - Podzim',
    'weekend_winter': 'Víkend - Zima',
};

const SOURCE_COLORS = {
    'fve': '#4CAF50',      // Zelená
    'grid': '#FF9800',     // Oranžová
    'alternative': '#2196F3', // Modrá
};

const DAY_LABELS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

/**
 * Inicializace bojlerového dashboardu
 */
async function initBoilerDashboard() {
    console.log('🔥 [Boiler] Initializing dashboard');

    if (!boilerState.initialized) {
        boilerState.initialized = true;

        // Auto-refresh každých 5 minut (pouze jednou)
        boilerState.refreshTimer = setInterval(() => loadBoilerData(), 5 * 60 * 1000);
    }

    // Vždy načti aktuální data
    await loadBoilerData();
}

/**
 * Načtení dat z backend API
 */
/**
 * Load basic boiler data (profiles and plan)
 * Used for simple boiler tab
 */
async function loadBasicBoilerData() {
    try {
        console.log('🔥 [Boiler] Loading data from API');

        const entryId = new URLSearchParams(globalThis.location.search).get('entry_id');
        if (!entryId) {
            console.error('[Boiler] Missing entry_id');
            return;
        }

        // Načíst profily
        const profilesResp = await fetchWithAuth(`/api/oig_cloud/${entryId}/boiler_profile`, {
            credentials: 'same-origin'
        });
        if (profilesResp.ok) {
            const data = await profilesResp.json();
            boilerState.profiles = data.profiles || {};
            boilerState.currentCategory = data.current_category;
            boilerState.profileSummary = data.summary || null;
            boilerState.config = data.config || null;
            console.log(`🔥 [Boiler] Loaded ${Object.keys(boilerState.profiles).length} profiles`);
        } else {
            boilerState.profiles = {};
            boilerState.currentCategory = null;
            boilerState.profileSummary = null;
            boilerState.config = null;
        }

        // Načíst plán
        const planResp = await fetchWithAuth(`/api/oig_cloud/${entryId}/boiler_plan`, {
            credentials: 'same-origin'
        });
        if (planResp.ok) {
            boilerState.plan = await planResp.json();
            boilerState.state = boilerState.plan.state || null;
            console.log('🔥 [Boiler] Plan loaded');
        } else {
            boilerState.plan = null;
            boilerState.state = null;
        }

        if (globalThis.DashboardAPI?.loadBatteryTimeline && globalThis.INVERTER_SN) {
            const timelineData = await globalThis.DashboardAPI.loadBatteryTimeline(globalThis.INVERTER_SN);
            boilerState.batteryTimeline = timelineData?.active || null;
        }

        // Update UI
        updateCategorySelector();
        createBoilerHeatmap();
        createBoilerTimeline();
        updateBoilerStats();
        updateBoilerOverview();
        updateBoilerPlanInfo(boilerState.plan);
        updateBoilerForecastWindows();

    } catch (err) {
        console.error('[Boiler] Failed to load data:', err);
    }
}

/**
 * Combined loader that hydrates both API-driven and hass-driven widgets.
 */
async function loadBoilerData() {
    try {
        await loadBasicBoilerData();
    } catch (error) {
        console.error('[Boiler] Basic loader failed:', error);
    }

    try {
        await loadExtendedBoilerData();
    } catch (error) {
        console.error('[Boiler] Extended loader failed:', error);
    }
}

/**
 * Update category selector
 */
function updateCategorySelector() {
    const select = document.getElementById('boiler-category-select');
    if (!select) return;

    select.innerHTML = '';

    if (!boilerState.currentCategory) {
        const available = Object.keys(boilerState.profiles || {});
        boilerState.currentCategory = available[0] || 'workday_summer';
    }

    Object.keys(CATEGORY_LABELS).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = CATEGORY_LABELS[cat];
        if (cat === boilerState.currentCategory) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

/**
 * Category change handler
 */
function onBoilerCategoryChange() {
    const select = document.getElementById('boiler-category-select');
    if (!select) return;

    boilerState.currentCategory = select.value;
    createBoilerHeatmap();
    renderBoilerProfilingChart();
    renderBoilerHeatmap();
    updateBoilerPredictedUsage();
}

/**
 * Vytvoření heatmapy 7×24
 */
function createBoilerHeatmap() {
    const canvas = document.getElementById('boiler-heatmap-chart');
    if (!canvas) {
        console.warn('[Boiler] Heatmap canvas not found');
        return;
    }

    const profile = boilerState.profiles[boilerState.currentCategory];
    if (!profile) {
        console.warn('[Boiler] No profile for category:', boilerState.currentCategory);
        return;
    }

    // Destroy existing chart
    if (boilerState.charts.heatmap) {
        boilerState.charts.heatmap.destroy();
    }

    // Připravit data jako bar chart (horizontální)
    const datasets = [];
    const labels = [];

    const heatmap = profile.heatmap || [];

    for (let day = 0; day < 7; day++) {
        const dayData = [];
        for (let hour = 0; hour < 24; hour++) {
            const cell = heatmap?.[day]?.[hour];
            const consumption = cell?.consumption ?? profile.hourly_avg?.[hour] ?? 0;
            dayData.push(Number.parseFloat(consumption) || 0);
        }

        datasets.push({
            label: DAY_LABELS[day],
            data: dayData,
            backgroundColor: `rgba(255, 152, 0, 0.${day + 3})`,
            borderColor: 'rgba(255, 152, 0, 0.8)',
            borderWidth: 1,
        });
    }

    // Hour labels (0-23)
    for (let h = 0; h < 24; h++) {
        labels.push(`${h}h`);
    }

    const ctx = canvas.getContext('2d');
    boilerState.charts.heatmap = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const day = context.dataset.label;
                            const hour = context.label;
                            const value = context.parsed.y;
                            return `${day} ${hour}: ${value.toFixed(3)} kWh`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: false,
                    title: {
                        display: true,
                        text: 'Hodina'
                    }
                },
                y: {
                    stacked: false,
                    title: {
                        display: true,
                        text: 'Spotřeba (kWh)'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Vytvoření timeline grafu
 */
function createBoilerTimeline() {
    const canvas = document.getElementById('boiler-timeline-chart');
    if (!canvas) {
        console.warn('[Boiler] Timeline canvas not found');
        return;
    }

    if (!boilerState.plan) {
        console.warn('[Boiler] No plan data');
        return;
    }

    // Destroy existing chart
    if (boilerState.charts.timeline) {
        boilerState.charts.timeline.destroy();
    }

    // Připravit data - groupnout sloty podle zdroje
    const fveData = [];
    const gridData = [];
    const altData = [];
    const solarAvailability = [];

    boilerState.plan.slots.forEach(slot => {
        const x = new Date(slot.start).getTime();
        const y = slot.consumption_kwh ?? slot.avg_consumption_kwh ?? 0;

        const point = { x, y };

        if (slot.recommended_source === 'fve') {
            fveData.push(point);
        } else if (slot.recommended_source === 'grid') {
            gridData.push(point);
        } else if (slot.recommended_source === 'alternative') {
            altData.push(point);
        }
    });

    const planStart = boilerState.plan.slots[0]?.start;
    const planEnd = boilerState.plan.slots[boilerState.plan.slots.length - 1]?.end;
    const timeline = boilerState.batteryTimeline || [];
    if (planStart && planEnd && timeline.length) {
        const startMs = new Date(planStart).getTime();
        const endMs = new Date(planEnd).getTime();
        timeline.forEach(entry => {
            const ts = entry.timestamp || entry.time;
            if (!ts) return;
            const x = new Date(ts).getTime();
            if (x < startMs || x > endMs) return;
            const solar = Number.parseFloat(entry.solar_kwh ?? entry.solar_charge_kwh ?? 0) || 0;
            solarAvailability.push({ x, y: solar });
        });
    }

    const ctx = canvas.getContext('2d');
    boilerState.charts.timeline = new Chart(ctx, {
        type: 'bar',
        data: {
            datasets: [
                {
                    label: 'FVE (zdarma)',
                    data: fveData,
                    backgroundColor: SOURCE_COLORS.fve,
                    borderColor: SOURCE_COLORS.fve,
                    borderWidth: 1
                },
                {
                    label: 'Síť',
                    data: gridData,
                    backgroundColor: SOURCE_COLORS.grid,
                    borderColor: SOURCE_COLORS.grid,
                    borderWidth: 1
                },
                {
                    label: 'Alternativa',
                    data: altData,
                    backgroundColor: SOURCE_COLORS.alternative,
                    borderColor: SOURCE_COLORS.alternative,
                    borderWidth: 1
                },
                {
                    label: 'FVE dostupnost (forecast)',
                    data: solarAvailability,
                    borderColor: 'rgba(76, 175, 80, 0.7)',
                    backgroundColor: 'rgba(76, 175, 80, 0.15)',
                    borderWidth: 1,
                    type: 'line',
                    tension: 0.3,
                    pointRadius: 0,
                    yAxisID: 'y-solar'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'HH:mm'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Čas'
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Spotřeba (kWh)'
                    },
                    beginAtZero: true
                },
                'y-solar': {
                    position: 'right',
                    title: {
                        display: true,
                        text: 'FVE (kWh)'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: 'rgba(76, 175, 80, 0.8)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

/**
 * Update statistik
 */
function updateBoilerStats() {
    if (!boilerState.plan) return;

    const totalEl = document.getElementById('boiler-total-consumption');
    const fveEl = document.getElementById('boiler-fve-consumption');
    const gridEl = document.getElementById('boiler-grid-consumption');
    const costEl = document.getElementById('boiler-estimated-cost');

    const total = Number.parseFloat(boilerState.plan.total_consumption_kwh) || 0;
    const fve = Number.parseFloat(boilerState.plan.fve_kwh) || 0;
    const grid = Number.parseFloat(boilerState.plan.grid_kwh) || 0;
    const cost = Number.parseFloat(boilerState.plan.estimated_cost_czk) || 0;

    if (totalEl) totalEl.textContent = `${total.toFixed(2)} kWh`;
    if (fveEl) fveEl.textContent = `${fve.toFixed(2)} kWh`;
    if (gridEl) gridEl.textContent = `${grid.toFixed(2)} kWh`;
    if (costEl) costEl.textContent = `${cost.toFixed(2)} Kč`;
}

/**
 * Toggle bojler control panel
 */
function toggleBoilerControlPanel() {
    const panel = document.getElementById('boiler-control-panel');
    if (!panel) return;

    const icon = document.getElementById('boiler-panel-toggle-icon');

    if (panel.classList.contains('minimized')) {
        panel.classList.remove('minimized');
        if (icon) icon.textContent = '−';
    } else {
        panel.classList.add('minimized');
        if (icon) icon.textContent = '+';
    }
}

// Export functions to global scope
globalThis.initBoilerDashboard = initBoilerDashboard;
globalThis.onBoilerCategoryChange = onBoilerCategoryChange;
globalThis.toggleBoilerControlPanel = toggleBoilerControlPanel;

console.log('🔥 [Boiler] Dashboard script loaded');
// === BOILER DATA & CHART ===
let boilerChartInstance = null;

/**
 * Load extended boiler data (sensors, profile, energy breakdown, predictions, charts)
 * Used for advanced boiler dashboard
 */
async function loadExtendedBoilerData() {
    console.log('[Boiler] Loading boiler data...');

    try {
        // Update boiler sensor values
        await updateBoilerSensors();

        // Update boiler profile
        await updateBoilerProfile();

        // NEW: Update energy breakdown
        await updateBoilerEnergyBreakdown();

        // NEW: Update predicted usage
        await updateBoilerPredictedUsage();

        // NEW: Update grade thermometer
        await updateBoilerGradeThermometer();

        // NEW: Render profiling chart
        await renderBoilerProfilingChart();

        // NEW: Render heatmap
        await renderBoilerHeatmap();

        // Initialize or refresh boiler chart
        await initializeBoilerChart();

        console.log('[Boiler] Data loaded successfully');
    } catch (error) {
        console.error('[Boiler] Failed to load data:', error);
    }
}

function formatTimeLabel(value) {
    if (!value) return '--:--';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTimeLabel(value) {
    if (!value) return '--';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTimeRange(start, end) {
    return `${formatTimeLabel(start)}–${formatTimeLabel(end)}`;
}

function formatSourceLabel(source) {
    const map = { fve: 'FVE', grid: 'Síť', alternative: 'Alternativa' };
    return map[source] || source || '--';
}

function clampNumber(value, min, max) {
    if (Number.isNaN(value)) return min;
    return Math.max(min, Math.min(max, value));
}

function computeHeatingPercent(avgTemp, targetTemp, coldInlet) {
    if (avgTemp === null || avgTemp === undefined) return null;
    const delta = targetTemp - coldInlet;
    if (delta <= 0) return null;
    const percent = ((avgTemp - coldInlet) / delta) * 100;
    return clampNumber(percent, 0, 100);
}

function sumHourlyAvg(hourlyAvg) {
    if (!hourlyAvg) return 0;
    return Object.values(hourlyAvg).reduce((acc, val) => acc + (Number.parseFloat(val) || 0), 0);
}

function pickPeakHours(hourlyAvg) {
    if (!hourlyAvg) return [];
    const ranked = Object.entries(hourlyAvg)
        .map(([hour, value]) => ({ hour: Number.parseInt(hour, 10), value: Number.parseFloat(value) || 0 }))
        .filter(item => Number.isFinite(item.value))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .filter(item => item.value > 0)
        .map(item => item.hour);
    return ranked.sort((a, b) => a - b);
}

function temperatureToColor(temp) {
    const minTemp = 10;
    const maxTemp = 70;
    const ratio = clampNumber((temp - minTemp) / (maxTemp - minTemp), 0, 1);
    const cold = { r: 33, g: 150, b: 243 };
    const hot = { r: 255, g: 87, b: 34 };
    const mix = (a, b) => Math.round(a + (b - a) * ratio);
    return `rgb(${mix(cold.r, hot.r)}, ${mix(cold.g, hot.g)}, ${mix(cold.b, hot.b)})`;
}

function parseTimeMinutes(label) {
    if (!label) return null;
    const [hour, minute] = label.split(':').map(part => Number.parseInt(part, 10));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
}

function isNowInWindow(nowMinutes, startMinutes, endMinutes) {
    if (startMinutes === null || endMinutes === null) return false;
    if (startMinutes <= endMinutes) {
        return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    }
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

function findNextWindow(windows, nowMinutes) {
    if (!Array.isArray(windows) || !windows.length) return null;
    let best = null;

    windows.forEach(window => {
        const start = parseTimeMinutes(window.start);
        const end = parseTimeMinutes(window.end);
        if (start === null || end === null) return;
        let delta = start - nowMinutes;
        if (delta < 0) {
            delta += 24 * 60;
        }
        if (!best || delta < best.delta) {
            best = { window, delta, start, end };
        }
    });

    return best;
}

function buildWindowsFromTimeline(timeline, selector) {
    if (!Array.isArray(timeline) || timeline.length === 0) return [];
    const windows = [];
    let current = null;

    timeline.forEach(entry => {
        const ts = entry.timestamp || entry.time;
        if (!ts) return;
        const time = new Date(ts);
        const isActive = selector(entry);
        if (isActive && !current) {
            current = { start: time, end: time };
        } else if (isActive && current) {
            current.end = time;
        } else if (!isActive && current) {
            windows.push(current);
            current = null;
        }
    });

    if (current) {
        windows.push(current);
    }

    return windows.map(window => ({
        start: formatTimeLabel(window.start),
        end: formatTimeLabel(new Date(window.end.getTime() + 15 * 60000))
    }));
}

function findNextHeatingSlot(slots) {
    if (!Array.isArray(slots)) return null;
    const now = Date.now();
    return slots.find(slot => {
        const end = new Date(slot.end || slot.end_time || slot.endTime).getTime();
        const consumption = slot.consumption_kwh ?? slot.avg_consumption_kwh ?? 0;
        return end > now && consumption > 0;
    }) || null;
}

function updateBoilerPlanInfo(plan) {
    if (!plan) {
        const ids = [
            'boiler-plan-digest',
            'boiler-plan-slots',
            'boiler-plan-active-slots',
            'boiler-plan-start',
            'boiler-plan-end',
            'boiler-spot-min',
            'boiler-spot-max',
            'boiler-forecast-fve-windows',
            'boiler-forecast-grid-windows'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '--';
        });
        return;
    }

    const slots = plan.slots || [];
    const heatingSlots = slots.filter(slot => slot.consumption_kwh > 0);
    const start = slots[0]?.start;
    const end = slots[slots.length - 1]?.end;

    const digestEl = document.getElementById('boiler-plan-digest');
    if (digestEl) {
        const total = Number.parseFloat(plan.total_consumption_kwh) || 0;
        if (total > 0) {
            const fveShare = Math.round(((plan.fve_kwh || 0) / total) * 100);
            const gridShare = Math.round(((plan.grid_kwh || 0) / total) * 100);
            const altShare = Math.round(((plan.alt_kwh || 0) / total) * 100);
            digestEl.textContent = `Mix: FVE ${fveShare}% · Síť ${gridShare}% · Alt ${altShare}%`;
        } else {
            digestEl.textContent = 'Mix: --';
        }
    }

    const slotsEl = document.getElementById('boiler-plan-slots');
    if (slotsEl) slotsEl.textContent = slots.length;

    const activeSlotsEl = document.getElementById('boiler-plan-active-slots');
    if (activeSlotsEl) activeSlotsEl.textContent = heatingSlots.length;

    const startEl = document.getElementById('boiler-plan-start');
    if (startEl) startEl.textContent = formatDateTimeLabel(start);

    const endEl = document.getElementById('boiler-plan-end');
    if (endEl) endEl.textContent = formatDateTimeLabel(end);

    const spotSlots = slots
        .filter(slot => {
            const consumption = slot.consumption_kwh ?? slot.avg_consumption_kwh ?? 0;
            return consumption > 0;
        })
        .map(slot => ({
            slot,
            price: Number.parseFloat(slot.spot_price)
        }))
        .filter(item => Number.isFinite(item.price));

    const minSpotEl = document.getElementById('boiler-spot-min');
    const maxSpotEl = document.getElementById('boiler-spot-max');

    if (!spotSlots.length) {
        if (minSpotEl) minSpotEl.textContent = '--';
        if (maxSpotEl) maxSpotEl.textContent = '--';
        return;
    }

    const minSpot = spotSlots.reduce((best, current) =>
        current.price < best.price ? current : best
    );
    const maxSpot = spotSlots.reduce((best, current) =>
        current.price > best.price ? current : best
    );

    if (minSpotEl) {
        minSpotEl.textContent = `${formatTimeRange(minSpot.slot.start, minSpot.slot.end)} (${minSpot.price.toFixed(2)} Kč/kWh)`;
    }
    if (maxSpotEl) {
        maxSpotEl.textContent = `${formatTimeRange(maxSpot.slot.start, maxSpot.slot.end)} (${maxSpot.price.toFixed(2)} Kč/kWh)`;
    }
}

async function updateBoilerSensors() {
    updateBoilerOverview();
}

async function updateBoilerProfile() {
    const config = boilerState.config || {};

    const volumeEl = document.getElementById('boiler-profile-volume');
    if (volumeEl) volumeEl.textContent = `${config.volume_l || '--'} L`;

    const targetEl = document.getElementById('boiler-profile-target-temp');
    if (targetEl) targetEl.textContent = `${config.target_temp_c ?? '--'} °C`;

    const deadlineEl = document.getElementById('boiler-profile-deadline');
    if (deadlineEl) deadlineEl.textContent = config.deadline_time || '--:--';

    const stratEl = document.getElementById('boiler-profile-stratification');
    if (stratEl) stratEl.textContent = config.stratification_mode || '--';

    const kConstantEl = document.getElementById('boiler-profile-k-constant');
    if (kConstantEl) kConstantEl.textContent = config.volume_l ? (config.volume_l * 0.001163).toFixed(4) : '--';

    const heaterPowerEl = document.getElementById('boiler-profile-heater-power');
    if (heaterPowerEl) {
        heaterPowerEl.textContent = '--';
    }
}

function updateBoilerOverview() {
    const config = boilerState.config || {};
    const plan = boilerState.plan;
    const state = boilerState.state || {};
    const temps = state.temperatures || {};
    const energyState = state.energy_state || {};

    const topTempRaw = temps.upper_zone ?? temps.top ?? null;
    const bottomTempRaw = temps.lower_zone ?? temps.bottom ?? null;
    const topTemp = Number.isFinite(topTempRaw) ? topTempRaw : null;
    const bottomTemp = Number.isFinite(bottomTempRaw) ? bottomTempRaw : null;
    const hasTemps = topTemp !== null || bottomTemp !== null;
    const avgTemp = hasTemps && Number.isFinite(energyState.avg_temp)
        ? energyState.avg_temp
        : null;
    const energyNeeded = hasTemps && Number.isFinite(energyState.energy_needed_kwh)
        ? energyState.energy_needed_kwh
        : null;
    const targetTemp = Number.isFinite(config.target_temp_c) ? config.target_temp_c : 60;
    const coldInlet = Number.isFinite(config.cold_inlet_temp_c) ? config.cold_inlet_temp_c : 10;
    const heatingPercent = computeHeatingPercent(avgTemp, targetTemp, coldInlet);

    const heatingPercentEl = document.getElementById('boiler-soc-value');
    if (heatingPercentEl) {
        heatingPercentEl.textContent = heatingPercent === null ? '-- %' : `${heatingPercent.toFixed(0)} %`;
    }

    const topEl = document.getElementById('boiler-temp-top-value');
    if (topEl) topEl.textContent = topTemp === null ? '-- °C' : `${topTemp.toFixed(1)} °C`;

    const bottomEl = document.getElementById('boiler-temp-bottom-value');
    if (bottomEl) {
        bottomEl.textContent = bottomTemp === null ? '-- °C' : `${bottomTemp.toFixed(1)} °C`;
        const bottomCard = bottomEl.closest('.status-card');
        if (bottomCard) {
            bottomCard.style.display = bottomTemp === null ? 'none' : '';
        }
    }

    const energyEl = document.getElementById('boiler-energy-required-value');
    if (energyEl) energyEl.textContent = energyNeeded === null ? '-- kWh' : `${energyNeeded.toFixed(2)} kWh`;

    const planCostEl = document.getElementById('boiler-plan-cost-value');
    if (planCostEl) {
        planCostEl.textContent = plan?.estimated_cost_czk === undefined
            ? '-- Kč'
            : `${plan.estimated_cost_czk.toFixed(2)} Kč`;
    }

    const nextHeatingEl = document.getElementById('boiler-next-heating-value');
    if (nextHeatingEl) {
        const nextSlot = plan?.next_slot || findNextHeatingSlot(plan?.slots || []);
        if (nextSlot) {
            const sourceLabel = formatSourceLabel(nextSlot.recommended_source);
            nextHeatingEl.textContent = `${formatTimeRange(nextSlot.start, nextSlot.end)} (${sourceLabel})`;
        } else {
            nextHeatingEl.textContent = 'Neplánováno';
        }
    }

    const sourceEl = document.getElementById('boiler-recommended-source-value');
    if (sourceEl) {
        const source = state.recommended_source || plan?.next_slot?.recommended_source;
        sourceEl.textContent = formatSourceLabel(source);
    }
}

function updateBoilerForecastWindows() {
    const fveEl = document.getElementById('boiler-forecast-fve-windows');
    const gridEl = document.getElementById('boiler-forecast-grid-windows');
    if (!fveEl && !gridEl) return;

    if (!boilerState.plan || !boilerState.plan.slots?.length) {
        if (fveEl) fveEl.textContent = '--';
        if (gridEl) gridEl.textContent = '--';
        return;
    }

    const timeline = boilerState.batteryTimeline || [];
    if (!timeline.length) {
        if (fveEl) fveEl.textContent = '--';
        if (gridEl) gridEl.textContent = '--';
        return;
    }

    const planStart = boilerState.plan?.slots?.[0]?.start;
    const planSlots = boilerState.plan?.slots || [];
    const planEnd = planSlots[planSlots.length - 1]?.end;
    const startMs = planStart ? new Date(planStart).getTime() : null;
    const endMs = planEnd ? new Date(planEnd).getTime() : null;

    const filtered = timeline.filter(entry => {
        if (!startMs || !endMs) return true;
        const ts = entry.timestamp || entry.time;
        if (!ts) return false;
        const t = new Date(ts).getTime();
        return t >= startMs && t <= endMs;
    });

    const fveWindows = buildWindowsFromTimeline(filtered, entry => {
        const solar = Number.parseFloat(entry.solar_kwh ?? entry.solar_charge_kwh ?? 0) || 0;
        return solar > 0;
    });
    const gridWindows = buildWindowsFromTimeline(filtered, entry => {
        const grid = Number.parseFloat(entry.grid_charge_kwh ?? 0) || 0;
        return grid > 0;
    });

    if (fveEl) {
        fveEl.textContent = fveWindows.length
            ? fveWindows.map(w => `${w.start}–${w.end}`).join(', ')
            : '--';
    }
    if (gridEl) {
        gridEl.textContent = gridWindows.length
            ? gridWindows.map(w => `${w.start}–${w.end}`).join(', ')
            : '--';
    }
}

async function initializeBoilerChart() {
    const canvas = document.getElementById('boiler-chart');
    if (!canvas) {
        console.warn('[Boiler] Chart canvas not found');
        return;
    }

    const slots = boilerState.plan?.slots || [];
    const hasDetailedSlots = slots.some(slot => slot.temp_top !== undefined || slot.soc !== undefined);

    if (!slots.length || !hasDetailedSlots) {
        const container = canvas.closest('.chart-container');
        if (container) {
            container.style.display = 'none';
        }
        return;
    }

    const hass = getHass();
    if (!hass) {
        console.warn('[Boiler] Hass not available for chart');
        return;
    }

    // Lazy load boiler chart module
    if (!globalThis.BoilerChartModule) {
        try {
            const module = await import('./modules/boiler-chart.js');
            globalThis.BoilerChartModule = module.BoilerChartModule;
        } catch (error) {
            console.error('[Boiler] Failed to load boiler-chart.js:', error);
            return;
        }
    }

    // Create or refresh chart instance
    if (boilerChartInstance) {
        await boilerChartInstance.refresh();
        return;
    }

    boilerChartInstance = new globalThis.BoilerChartModule();
    await boilerChartInstance.init(canvas, hass, INVERTER_SN);
}

// Boiler control functions (will use ServiceShield)
async function planBoilerHeating() {
    console.log('[Boiler] Planning heating...');

    const hass = getHass();
    if (!hass) return;

    try {
        await hass.callService('oig_cloud', 'plan_boiler_heating', {});

        showNotification('✅ Plán topení byl úspěšně vytvořen', 'success');

        // Refresh after planning
        setTimeout(() => loadBoilerData(), 2000);
    } catch (error) {
        console.error('[Boiler] Failed to plan heating:', error);
        showNotification('❌ Chyba při plánování topení', 'error');
    }
}

async function applyBoilerPlan() {
    console.log('[Boiler] Applying heating plan...');

    const hass = getHass();
    if (!hass) return;

    try {
        await hass.callService('oig_cloud', 'apply_boiler_plan', {});

        showNotification('✅ Plán topení byl aplikován', 'success');

        // Refresh after applying
        setTimeout(() => loadBoilerData(), 2000);
    } catch (error) {
        console.error('[Boiler] Failed to apply plan:', error);
        showNotification('❌ Chyba při aplikaci plánu', 'error');
    }
}

async function cancelBoilerPlan() {
    console.log('[Boiler] Canceling heating plan...');

    const hass = getHass();
    if (!hass) return;

    try {
        await hass.callService('oig_cloud', 'cancel_boiler_plan', {});

        showNotification('✅ Plán topení byl zrušen', 'success');

        // Refresh after canceling
        setTimeout(() => loadBoilerData(), 2000);
    } catch (error) {
        console.error('[Boiler] Failed to cancel plan:', error);
        showNotification('❌ Chyba při rušení plánu', 'error');
    }
}

// NEW: Update energy breakdown (grid vs alternative)
async function updateBoilerEnergyBreakdown() {
    const plan = boilerState.plan;
    if (!plan) {
        const gridEl = document.getElementById('boiler-grid-energy-value');
        if (gridEl) gridEl.textContent = '-- kWh';
        const altEl = document.getElementById('boiler-alt-energy-value');
        if (altEl) altEl.textContent = '-- kWh';
        const fveEl = document.getElementById('boiler-fve-energy-value');
        if (fveEl) fveEl.textContent = '-- kWh';
        return;
    }

    const gridEnergy = plan.grid_kwh || 0;
    const altEnergy = plan.alt_kwh || 0;
    const fveEnergy = plan.fve_kwh || 0;

    const gridEl = document.getElementById('boiler-grid-energy-value');
    if (gridEl) gridEl.textContent = `${gridEnergy.toFixed(2)} kWh`;

    const altEl = document.getElementById('boiler-alt-energy-value');
    if (altEl) altEl.textContent = `${altEnergy.toFixed(2)} kWh`;

    const fveEl = document.getElementById('boiler-fve-energy-value');
    if (fveEl) fveEl.textContent = `${fveEnergy.toFixed(2)} kWh`;

    const totalEnergy = gridEnergy + altEnergy + fveEnergy;
    if (totalEnergy > 0) {
        const gridPercent = (gridEnergy / totalEnergy) * 100;
        const altPercent = (altEnergy / totalEnergy) * 100;
        const fvePercent = (fveEnergy / totalEnergy) * 100;

        const ratioGrid = document.getElementById('boiler-ratio-grid');
        const ratioAlt = document.getElementById('boiler-ratio-alt');
        const ratioFve = document.getElementById('boiler-ratio-fve');

        if (ratioGrid) ratioGrid.style.width = `${gridPercent}%`;
        if (ratioAlt) ratioAlt.style.width = `${altPercent}%`;
        if (ratioFve) ratioFve.style.width = `${fvePercent}%`;

        const gridLabel = document.getElementById('boiler-ratio-grid-label');
        if (gridLabel) gridLabel.textContent = `${gridPercent.toFixed(0)}% síť`;
        const altLabel = document.getElementById('boiler-ratio-alt-label');
        if (altLabel) altLabel.textContent = `${altPercent.toFixed(0)}% alternativa`;
        const fveLabel = document.getElementById('boiler-ratio-fve-label');
        if (fveLabel) fveLabel.textContent = `${fvePercent.toFixed(0)}% FVE`;
    } else {
        const ratioGrid = document.getElementById('boiler-ratio-grid');
        const ratioAlt = document.getElementById('boiler-ratio-alt');
        const ratioFve = document.getElementById('boiler-ratio-fve');
        if (ratioGrid) ratioGrid.style.width = '0%';
        if (ratioAlt) ratioAlt.style.width = '0%';
        if (ratioFve) ratioFve.style.width = '0%';
    }
}

// NEW: Update predicted usage
async function updateBoilerPredictedUsage() {
    const summary = boilerState.profileSummary || {};
    const profile = boilerState.profiles?.[boilerState.currentCategory] || {};
    const hourlyAvg = profile.hourly_avg || {};

    const predictedToday = summary.predicted_total_kwh ?? sumHourlyAvg(hourlyAvg);
    const peakHours = summary.peak_hours ?? pickPeakHours(hourlyAvg);
    const waterLiters = summary.water_liters_40c;

    const predictedEl = document.getElementById('boiler-predicted-today');
    if (predictedEl) predictedEl.textContent = `${predictedToday.toFixed(2)} kWh`;

    const peaksEl = document.getElementById('boiler-peak-hours');
    if (peaksEl) peaksEl.textContent = peakHours.map(h => `${h}h`).join(', ') || '--';

    const litersEl = document.getElementById('boiler-water-liters');
    if (litersEl) {
        if (Number.isFinite(waterLiters)) {
            litersEl.textContent = `${waterLiters.toFixed(0)} L`;
        } else {
            litersEl.textContent = '-- L';
        }
    }

    const circulationEl = document.getElementById('boiler-circulation-windows');
    if (circulationEl) {
        const windows = summary.circulation_windows || [];
        circulationEl.textContent = windows.length
            ? windows.map(w => `${w.start}–${w.end}`).join(', ')
            : '--';
    }

    const circulationNowEl = document.getElementById('boiler-circulation-now');
    if (circulationNowEl) {
        const state = boilerState.state || {};
        const recommended = state.circulation_recommended;
        const windows = summary.circulation_windows || [];
        if (!windows.length) {
            circulationNowEl.textContent = '--';
            circulationNowEl.classList.remove('active');
            circulationNowEl.classList.remove('idle');
        } else {
            const now = new Date();
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            const isActive = windows.some(window => {
                const start = parseTimeMinutes(window.start);
                const end = parseTimeMinutes(window.end);
                return isNowInWindow(nowMinutes, start, end);
            });

            if (isActive) {
                const currentWindow = windows.find(window => {
                    const start = parseTimeMinutes(window.start);
                    const end = parseTimeMinutes(window.end);
                    return isNowInWindow(nowMinutes, start, end);
                });
                circulationNowEl.textContent = currentWindow
                    ? `ANO (do ${currentWindow.end})`
                    : 'ANO';
                circulationNowEl.classList.add('active');
                circulationNowEl.classList.remove('idle');
            } else {
                const nextWindow = findNextWindow(windows, nowMinutes);
                if (recommended && nextWindow) {
                    circulationNowEl.textContent = `DOPORUČENO (${nextWindow.window.start}–${nextWindow.window.end})`;
                } else {
                    circulationNowEl.textContent = nextWindow
                        ? `Ne (další ${nextWindow.window.start}–${nextWindow.window.end})`
                        : 'Ne';
                }
                circulationNowEl.classList.add('idle');
                circulationNowEl.classList.remove('active');
            }
        }
    }
}

// NEW: Update grade thermometer
async function updateBoilerGradeThermometer() {
    const config = boilerState.config || {};
    const state = boilerState.state || {};
    const temps = state.temperatures || {};
    const energyState = state.energy_state || {};

    const tempTopRaw = temps.upper_zone ?? temps.top ?? null;
    const tempBottomRaw = temps.lower_zone ?? temps.bottom ?? null;
    const tempTop = Number.isFinite(tempTopRaw) ? tempTopRaw : null;
    const tempBottom = Number.isFinite(tempBottomRaw) ? tempBottomRaw : null;
    const targetTemp = Number.isFinite(config.target_temp_c) ? config.target_temp_c : 60;
    const coldInlet = Number.isFinite(config.cold_inlet_temp_c) ? config.cold_inlet_temp_c : 10;
    const avgTemp = Number.isFinite(energyState.avg_temp) ? energyState.avg_temp : null;
    const heatingPercent = computeHeatingPercent(avgTemp, targetTemp, coldInlet);

    const waterLevel = document.getElementById('boiler-water-level');
    const gradeLabel = document.getElementById('boiler-grade-label');
    const tank = document.querySelector('.boiler-tank');

    if (waterLevel && heatingPercent !== null) {
        waterLevel.style.height = `${heatingPercent}%`;
    }
    if (gradeLabel) {
        gradeLabel.textContent = heatingPercent === null ? '-- % nahřáto' : `${heatingPercent.toFixed(0)}% nahřáto`;
    }

    const tempMin = 10;
    const tempMax = 70;
    const mapToPercent = (temp) => clampNumber(((temp - tempMin) / (tempMax - tempMin)) * 100, 0, 100);

    const topMarker = document.getElementById('boiler-sensor-top');
    if (topMarker && tempTop !== null) {
        topMarker.style.bottom = `${mapToPercent(tempTop)}%`;
        topMarker.querySelector('.sensor-label').textContent = `${tempTop.toFixed(1)}°C`;
    }

    const bottomMarker = document.getElementById('boiler-sensor-bottom');
    if (bottomMarker) {
        if (tempBottom === null) {
            bottomMarker.style.display = 'none';
        } else {
            bottomMarker.style.display = '';
            bottomMarker.style.bottom = `${mapToPercent(tempBottom)}%`;
            bottomMarker.querySelector('.sensor-label').textContent = `${tempBottom.toFixed(1)}°C`;
        }
    }

    if (tank) {
        tank.classList.toggle('single-sensor', tempBottom === null);
    }

    const targetLine = document.getElementById('boiler-target-line');
    if (targetLine) {
        targetLine.style.bottom = `${mapToPercent(targetTemp)}%`;
    }

    if (waterLevel) {
        const topColor = temperatureToColor(tempTop ?? targetTemp);
        const bottomColor = temperatureToColor(tempBottom ?? coldInlet);
        waterLevel.style.background = `linear-gradient(180deg, ${topColor} 0%, ${bottomColor} 100%)`;
    }
}

// NEW: Render profiling chart
async function renderBoilerProfilingChart() {
    const canvas = document.getElementById('boiler-profile-chart');
    if (!canvas) return;

    try {
        const profile = boilerState.profiles?.[boilerState.currentCategory];
        if (!profile) {
            console.warn('[Boiler] Profile not available');
            return;
        }

        const hourlyData = profile.hourly_avg || {};
        const predictedToday = boilerState.profileSummary?.predicted_total_kwh ?? sumHourlyAvg(hourlyData);
        const peakHours = boilerState.profileSummary?.peak_hours ?? pickPeakHours(hourlyData);
        const daysTracked = 7;

        // Prepare data for chart
        const labels = Array.from({ length: 24 }, (_, i) => `${i}h`);
        const data = labels.map((_, i) => Number.parseFloat(hourlyData[i] || 0));

        // Destroy existing chart
        if (globalThis.boilerProfileChart) {
            globalThis.boilerProfileChart.destroy();
        }

        // Create new chart
        const ctx = canvas.getContext('2d');
        globalThis.boilerProfileChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Průměrná spotřeba (kWh)',
                    data: data,
                    backgroundColor: labels.map((_, i) =>
                        peakHours.includes(i)
                            ? 'rgba(244, 67, 54, 0.6)'
                            : 'rgba(33, 150, 243, 0.6)'
                    ),
                    borderColor: labels.map((_, i) =>
                        peakHours.includes(i)
                            ? 'rgba(244, 67, 54, 1)'
                            : 'rgba(33, 150, 243, 1)'
                    ),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.y.toFixed(2)} kWh`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'kWh'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Hodina'
                        }
                    }
                }
            }
        });

        // Update stats
        const statToday = document.getElementById('profile-stat-today');
        if (statToday) statToday.textContent = `${predictedToday.toFixed(2)} kWh`;
        const statPeaks = document.getElementById('profile-stat-peaks');
        if (statPeaks) statPeaks.textContent = peakHours.map(h => `${h}h`).join(', ') || '--';
        const statConfidence = document.getElementById('profile-stat-confidence');
        if (statConfidence) {
            const confidence = boilerState.profileSummary?.avg_confidence;
            statConfidence.textContent = Number.isFinite(confidence)
                ? `${Math.round(confidence * 100)} %`
                : '-- %';
        }

        const statDays = document.getElementById('profile-stat-days');
        if (statDays) statDays.textContent = `${daysTracked} dní`;

    } catch (error) {
        console.error('[Boiler] Error rendering profiling chart:', error);
    }
}

// NEW: Render heatmap
async function renderBoilerHeatmap() {
    const container = document.getElementById('boiler-heatmap');
    if (!container) return;

    try {
        const profile = boilerState.profiles?.[boilerState.currentCategory];
        if (!profile) {
            console.warn('[Boiler] Profile not available for heatmap');
            return;
        }

        const heatmapData = profile.heatmap || [];
        let dataMatrix = heatmapData;
        if (!heatmapData || heatmapData.length === 0) {
            const hourlyData = profile.hourly_avg || {};
            dataMatrix = Array.from({ length: 7 }, () =>
                Array.from({ length: 24 }, (_, hour) => Number.parseFloat(hourlyData[hour] || 0))
            );
        }

        const numericMatrix = dataMatrix.map(day =>
            day.map(cell => {
                if (cell && typeof cell === 'object') {
                    return Number.parseFloat(cell.consumption) || 0;
                }
                return Number.parseFloat(cell) || 0;
            })
        );

        // Calculate thresholds
        const allValues = numericMatrix.flat();
        const maxValue = Math.max(...allValues, 0.1);
        const lowThreshold = maxValue * 0.3;
        const highThreshold = maxValue * 0.7;

        // Clear container
        container.innerHTML = '';

        // Day labels
        const days = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

        // Header row with hour labels
        const headerDiv = document.createElement('div');
        headerDiv.className = 'heatmap-day-label';
        container.appendChild(headerDiv);

        for (let hour = 0; hour < 24; hour++) {
            const hourLabel = document.createElement('div');
            hourLabel.className = 'heatmap-hour-label';
            hourLabel.textContent = hour;
            container.appendChild(hourLabel);
        }

        // Rows for each day
        days.forEach((day, dayIndex) => {
            const dayLabel = document.createElement('div');
            dayLabel.className = 'heatmap-day-label';
            dayLabel.textContent = day;
            container.appendChild(dayLabel);

            for (let hour = 0; hour < 24; hour++) {
                const value = numericMatrix[dayIndex]?.[hour] || 0;
                const cell = document.createElement('div');
                cell.className = 'heatmap-cell';

                if (value === 0) {
                    cell.classList.add('none');
                } else if (value < lowThreshold) {
                    cell.classList.add('low');
                } else if (value < highThreshold) {
                    cell.classList.add('medium');
                } else {
                    cell.classList.add('high');
                }

                cell.title = `${day} ${hour}h: ${value.toFixed(2)} kWh`;
                container.appendChild(cell);
            }
        });

    } catch (error) {
        console.error('[Boiler] Error rendering heatmap:', error);
    }
}

// Removed duplicate showNotification - using DashboardUtils.showNotification instead


// Export enhanced boiler functions
globalThis.DashboardBoiler = Object.assign(globalThis.DashboardBoiler || {}, {
    initBoilerDashboard,
    loadBoilerData,
    loadBasicBoilerData,
    loadExtendedBoilerData,
    initializeBoilerChart,
    renderBoilerProfilingChart,
    renderBoilerHeatmap,
    updateBoilerSensors,
    updateBoilerProfile,
    planBoilerHeating,
    applyBoilerPlan,
    cancelBoilerPlan,
    init: function() {
        console.log('[DashboardBoiler] Enhanced - Data & Chart loaded');
    }
});

console.log('[DashboardBoiler] Enhanced module loaded');
