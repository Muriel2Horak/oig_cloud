/**
 * OIG Bojler Dashboard - Frontend
 * Heatmap visualizace, timeline graf, profiling tabulka
 */
/* global Chart, URLSearchParams */

class BoilerDashboard {
    constructor(entryId) {
        this.entryId = entryId;
        this.currentCategory = null;
        this.profiles = {};
        this.plan = null;
        this.charts = {};

        // Czech labels
        this.dayLabels = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
        this.categoryLabels = {
            'workday_spring': 'Pracovní den - Jaro',
            'workday_summer': 'Pracovní den - Léto',
            'workday_autumn': 'Pracovní den - Podzim',
            'workday_winter': 'Pracovní den - Zima',
            'weekend_spring': 'Víkend - Jaro',
            'weekend_summer': 'Víkend - Léto',
            'weekend_autumn': 'Víkend - Podzim',
            'weekend_winter': 'Víkend - Zima',
        };

        this.sourceColors = {
            'fve': '#4CAF50',      // Zelená
            'grid': '#FF9800',     // Oranžová
            'alternative': '#2196F3', // Modrá
        };
    }

    async init() {
        console.log('🔥 Initializing Boiler Dashboard');

        // Načíst CSS pro Chart.js
        this.loadChartJS();

        // Vytvořit UI strukturu
        this.createUI();

        // Načíst data
        await this.loadData();

        // Auto-refresh každých 5 minut
        setInterval(() => this.loadData(), 5 * 60 * 1000);
    }

    loadChartJS() {
        // Pokud Chart.js již není načten, načíst z CDN
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
            script.onload = () => console.log('Chart.js loaded');
            document.head.appendChild(script);
        }
    }

    createUI() {
        const container = document.getElementById('boiler-dashboard-container');
        if (!container) {
            console.error('Boiler dashboard container not found');
            return;
        }

        container.innerHTML = `
            <div class="boiler-dashboard">
                <h2>🔥 Bojler - Ohřev vody</h2>

                <!-- Kategorie selector -->
                <div class="category-selector">
                    <label>Profil:</label>
                    <select id="category-select" onchange="boilerDashboard.onCategoryChange()">
                        <option value="">Načítání...</option>
                    </select>
                </div>

                <!-- Heatmap - 7×24 -->
                <div class="heatmap-section">
                    <h3>Spotřeba po hodinách (kWh)</h3>
                    <canvas id="boiler-heatmap" width="800" height="300"></canvas>
                </div>

                <!-- Timeline - doporučené zdroje -->
                <div class="timeline-section">
                    <h3>Plán ohřevu - Doporučené zdroje</h3>
                    <canvas id="boiler-timeline" width="800" height="200"></canvas>
                </div>

                <!-- Statistiky -->
                <div class="stats-section">
                    <div class="stat-card">
                        <h4>Celková spotřeba dnes</h4>
                        <div id="total-consumption" class="stat-value">-</div>
                    </div>
                    <div class="stat-card">
                        <h4>Z FVE</h4>
                        <div id="fve-consumption" class="stat-value">-</div>
                    </div>
                    <div class="stat-card">
                        <h4>Ze sítě</h4>
                        <div id="grid-consumption" class="stat-value">-</div>
                    </div>
                    <div class="stat-card">
                        <h4>Odhadovaná cena</h4>
                        <div id="estimated-cost" class="stat-value">-</div>
                    </div>
                </div>

                <!-- Profiling tabulka -->
                <div class="profile-table-section">
                    <h3>Detail profilu</h3>
                    <div id="profile-table"></div>
                </div>
            </div>
        `;

        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .boiler-dashboard {
                padding: 20px;
                font-family: var(--primary-font-family);
            }

            .category-selector {
                margin: 20px 0;
            }

            .category-selector label {
                font-weight: bold;
                margin-right: 10px;
            }

            .category-selector select {
                padding: 8px 12px;
                font-size: 14px;
                border: 1px solid var(--divider-color);
                border-radius: 4px;
                background: var(--card-background-color);
                color: var(--primary-text-color);
            }

            .heatmap-section, .timeline-section {
                margin: 30px 0;
                background: var(--card-background-color);
                padding: 20px;
                border-radius: 8px;
                box-shadow: var(--ha-card-box-shadow);
            }

            .stats-section {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin: 30px 0;
            }

            .stat-card {
                background: var(--card-background-color);
                padding: 20px;
                border-radius: 8px;
                box-shadow: var(--ha-card-box-shadow);
                text-align: center;
            }

            .stat-card h4 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: var(--secondary-text-color);
            }

            .stat-value {
                font-size: 24px;
                font-weight: bold;
                color: var(--primary-text-color);
            }

            .profile-table-section {
                margin: 30px 0;
                background: var(--card-background-color);
                padding: 20px;
                border-radius: 8px;
                box-shadow: var(--ha-card-box-shadow);
            }

            .profile-table-section table {
                width: 100%;
                border-collapse: collapse;
            }

            .profile-table-section th,
            .profile-table-section td {
                padding: 8px;
                text-align: left;
                border-bottom: 1px solid var(--divider-color);
            }

            .profile-table-section th {
                font-weight: bold;
                background: var(--primary-background-color);
            }
        `;
        document.head.appendChild(style);
    }

    async loadData() {
        console.log('Loading boiler data...');

        try {
            // Načíst profily
            const profileResponse = await fetch(`/api/oig_cloud/${this.entryId}/boiler_profile`);
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                this.profiles = profileData.profiles;
                this.currentCategory = profileData.current_category;

                this.updateCategorySelector();
                this.renderHeatmap();
                this.renderProfileTable();
            }

            // Načíst plán
            const planResponse = await fetch(`/api/oig_cloud/${this.entryId}/boiler_plan`);
            if (planResponse.ok) {
                const planData = await planResponse.json();
                this.plan = planData;

                this.renderTimeline();
                this.updateStats();
            }

        } catch (error) {
            console.error('Error loading boiler data:', error);
        }
    }

    updateCategorySelector() {
        const select = document.getElementById('category-select');
        if (!select) return;

        select.innerHTML = '';

        Object.keys(this.profiles).forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = this.categoryLabels[category] || category;
            if (category === this.currentCategory) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    onCategoryChange() {
        const select = document.getElementById('category-select');
        this.currentCategory = select.value;
        this.renderHeatmap();
        this.renderProfileTable();
    }

    renderHeatmap() {
        const canvas = document.getElementById('boiler-heatmap');
        if (!canvas) return;

        const profile = this.profiles[this.currentCategory];
        if (!profile) return;

        // Příprava dat pro heatmap
        const data = {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: this.dayLabels.map((day, dayIndex) => ({
                label: day,
                data: profile.heatmap[dayIndex]?.map(h => h.consumption) || [],
                backgroundColor: this.getHeatmapColor,
                borderWidth: 1,
                borderColor: '#fff',
            }))
        };

        // Zničit starý chart
        if (this.charts.heatmap) {
            this.charts.heatmap.destroy();
        }

        // Vytvořit nový chart
        this.charts.heatmap = new Chart(canvas, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
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
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(3)} kWh`;
                            }
                        }
                    }
                }
            }
        });
    }

    getHeatmapColor(value) {
        // Gradient: 0 kWh = modrá, high = červená
        const normalized = Math.min(value / 2.0, 1.0); // 2 kWh = max
        const hue = (1 - normalized) * 240; // 240 = modrá, 0 = červená
        return `hsl(${hue}, 70%, 50%)`;
    }

    renderTimeline() {
        const canvas = document.getElementById('boiler-timeline');
        if (!canvas || !this.plan) return;

        // Agregovat sloty podle zdroje
        const sourceData = {
            fve: [],
            grid: [],
            alternative: []
        };

        this.plan.slots.forEach(slot => {
            const hour = new Date(slot.start).getHours();
            const source = slot.recommended_source;

            if (!sourceData[source]) {
                sourceData[source] = Array(24).fill(0);
            }
            sourceData[source][hour] += slot.consumption_kwh;
        });

        const data = {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [
                {
                    label: 'FVE (zdarma)',
                    data: sourceData.fve,
                    backgroundColor: this.sourceColors.fve,
                    borderColor: this.sourceColors.fve,
                    fill: true,
                },
                {
                    label: 'Síť (spotová cena)',
                    data: sourceData.grid,
                    backgroundColor: this.sourceColors.grid,
                    borderColor: this.sourceColors.grid,
                    fill: true,
                },
                {
                    label: 'Alternativa',
                    data: sourceData.alternative,
                    backgroundColor: this.sourceColors.alternative,
                    borderColor: this.sourceColors.alternative,
                    fill: true,
                }
            ]
        };

        // Zničit starý chart
        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }

        // Vytvořit nový chart
        this.charts.timeline = new Chart(canvas, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Hodina'
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

    updateStats() {
        if (!this.plan) return;

        document.getElementById('total-consumption').textContent =
            `${this.plan.total_consumption_kwh.toFixed(2)} kWh`;

        document.getElementById('fve-consumption').textContent =
            `${this.plan.fve_kwh.toFixed(2)} kWh`;

        document.getElementById('grid-consumption').textContent =
            `${this.plan.grid_kwh.toFixed(2)} kWh`;

        document.getElementById('estimated-cost').textContent =
            `${this.plan.estimated_cost_czk.toFixed(2)} Kč`;
    }

    renderProfileTable() {
        const container = document.getElementById('profile-table');
        if (!container) return;

        const profile = this.profiles[this.currentCategory];
        if (!profile) return;

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Hodina</th>
                        <th>Průměrná spotřeba (kWh)</th>
                        <th>Confidence (%)</th>
                        <th>Počet vzorků</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (let hour = 0; hour < 24; hour++) {
            const consumption = profile.hourly_avg[hour] || 0;
            const confidence = (profile.confidence[hour] || 0) * 100;
            const samples = profile.sample_count[hour] || 0;

            html += `
                <tr>
                    <td>${hour}:00 - ${hour}:59</td>
                    <td>${consumption.toFixed(3)}</td>
                    <td>${confidence.toFixed(0)}%</td>
                    <td>${samples}</td>
                </tr>
            `;
        }

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }
}

// Global instance
let boilerDashboard = null;

// Auto-init když je DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBoilerDashboard);
} else {
    initBoilerDashboard();
}

function initBoilerDashboard() {
    // Získat entry_id z URL parametru
    const urlParams = new URLSearchParams(window.location.search);
    const entryId = urlParams.get('entry_id');

    if (entryId) {
        boilerDashboard = new BoilerDashboard(entryId);
        boilerDashboard.init();
    } else {
        console.error('Missing entry_id parameter');
    }
}
