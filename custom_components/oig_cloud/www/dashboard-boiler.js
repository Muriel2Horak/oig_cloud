/**
 * OIG Bojler Dashboard - Integrace do hlavního dashboardu
 * Heatmap, timeline, profiling
 */

// Global boiler state
const boilerState = {
    profiles: {},
    currentCategory: null,
    plan: null,
    charts: {},
    initialized: false
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
    
    if (boilerState.initialized) {
        console.log('🔥 [Boiler] Already initialized');
        return;
    }
    
    // Načíst data z API
    await loadBoilerData();
    
    // Vytvořit vizualizace
    createBoilerHeatmap();
    createBoilerTimeline();
    updateBoilerStats();
    
    boilerState.initialized = true;
    
    // Auto-refresh každých 5 minut
    setInterval(() => loadBoilerData(), 5 * 60 * 1000);
}

/**
 * Načtení dat z backend API
 */
async function loadBoilerData() {
    try {
        console.log('🔥 [Boiler] Loading data from API');
        
        const entryId = new URLSearchParams(window.location.search).get('entry_id');
        if (!entryId) {
            console.error('[Boiler] Missing entry_id');
            return;
        }
        
        // Načíst profily
        const profilesResp = await fetch(`/api/oig_cloud/${entryId}/boiler_profile`);
        if (profilesResp.ok) {
            const data = await profilesResp.json();
            boilerState.profiles = data.profiles || {};
            boilerState.currentCategory = data.current_category;
            console.log(`🔥 [Boiler] Loaded ${Object.keys(boilerState.profiles).length} profiles`);
        }
        
        // Načíst plán
        const planResp = await fetch(`/api/oig_cloud/${entryId}/boiler_plan`);
        if (planResp.ok) {
            boilerState.plan = await planResp.json();
            console.log('🔥 [Boiler] Plan loaded');
        }
        
        // Update UI
        updateCategorySelector();
        createBoilerHeatmap();
        createBoilerTimeline();
        updateBoilerStats();
        
    } catch (err) {
        console.error('[Boiler] Failed to load data:', err);
    }
}

/**
 * Update category selector
 */
function updateCategorySelector() {
    const select = document.getElementById('boiler-category-select');
    if (!select) return;
    
    select.innerHTML = '';
    
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
    
    // Vytvoř dataset pro každý den
    for (let day = 0; day < 7; day++) {
        const dayData = [];
        for (let hour = 0; hour < 24; hour++) {
            const consumption = profile.hourly_avg[hour] || 0;
            dayData.push(consumption);
        }
        
        datasets.push({
            label: DAY_LABELS[day],
            data: dayData,
            backgroundColor: `rgba(255, 152, 0, 0.${day + 3})`, // Různé opacity pro dny
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
    
    boilerState.plan.slots.forEach(slot => {
        const x = new Date(slot.start).getTime();
        const y = slot.avg_consumption_kwh;
        
        const point = { x, y };
        
        if (slot.recommended_source === 'fve') {
            fveData.push(point);
        } else if (slot.recommended_source === 'grid') {
            gridData.push(point);
        } else if (slot.recommended_source === 'alternative') {
            altData.push(point);
        }
    });
    
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
    
    if (totalEl) totalEl.textContent = `${boilerState.plan.total_consumption_kwh.toFixed(2)} kWh`;
    if (fveEl) fveEl.textContent = `${boilerState.plan.fve_kwh.toFixed(2)} kWh`;
    if (gridEl) gridEl.textContent = `${boilerState.plan.grid_kwh.toFixed(2)} kWh`;
    if (costEl) costEl.textContent = `${boilerState.plan.estimated_cost_czk.toFixed(2)} Kč`;
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
window.initBoilerDashboard = initBoilerDashboard;
window.onBoilerCategoryChange = onBoilerCategoryChange;
window.toggleBoilerControlPanel = toggleBoilerControlPanel;

console.log('🔥 [Boiler] Dashboard script loaded');
