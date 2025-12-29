/**
 * Battery Chart Module - Chart.js visualization for battery forecast
 * Zobrazuje průběh kapacity baterie s plochami zobrazujícími příspěvek ze soláru a sítě
 */
/* global Chart */

export class BatteryChartModule {
    constructor() {
        this.chart = null;
    }

    /**
     * Inicializuje battery forecast chart s stacked area visualizací
     * @param {HTMLCanvasElement} canvasElement - Canvas element pro graf
     * @param {Object} hass - Home Assistant instance
     * @param {string} inverterId - ID střídače (např. "2206237016")
     */
    async init(canvasElement, hass, inverterId) {
        if (!canvasElement || !hass || !inverterId) {
            console.error('[BatteryChart] Missing required parameters');
            return;
        }

        this.canvasElement = canvasElement;
        this.hass = hass;
        this.inverterId = inverterId;

        console.log('[BatteryChart] Initializing battery chart for inverter:', inverterId);

        // Načíst a vykreslit data
        await this.loadAndRender();
    }

    /**
     * Načte data z battery forecast senzoru a vykreslí graf
     */
    async loadAndRender() {
        const entityId = `sensor.oig_${this.inverterId}_battery_forecast`;
        const batteryForecastSensor = this.hass.states[entityId];

        if (!batteryForecastSensor || !batteryForecastSensor.attributes) {
            console.warn('[BatteryChart] Battery forecast sensor not found:', entityId);
            return;
        }

        const timelineData = batteryForecastSensor.attributes.timeline_data || [];
        const maxCapacityKwh = batteryForecastSensor.attributes.max_capacity_kwh || 10;
        const minCapacityKwh = batteryForecastSensor.attributes.min_capacity_kwh || 0;

        if (timelineData.length === 0) {
            console.warn('[BatteryChart] No timeline data available');
            return;
        }

        console.log('[BatteryChart] Timeline data points:', timelineData.length);

        // Připravit data pro Chart.js
        const labels = [];
        const batteryCapacityData = [];
        const solarChargeData = [];  // Přírůstek ze soláru
        const gridChargeData = [];   // Přírůstek ze sítě

        timelineData.forEach(entry => {
            const timestamp = new Date(entry.timestamp);
            labels.push(timestamp);

            // HYBRID API uses battery_start, solar_kwh, grid_import_kwh
            batteryCapacityData.push(entry.battery_start || entry.battery_capacity_kwh || 0);

            // NOVÁ DATA: solar_kwh a grid_import_kwh z backendu (HYBRID)
            const solarCharge = entry.solar_kwh || entry.solar_charge_kwh || 0;
            const gridCharge = entry.grid_import_kwh || entry.grid_charge_kwh || 0;

            solarChargeData.push(solarCharge);
            gridChargeData.push(gridCharge);
        });

        console.log('[BatteryChart] Sample data:', {
            timestamp: labels[0],
            capacity: batteryCapacityData[0],
            solarCharge: solarChargeData[0],
            gridCharge: gridChargeData[0]
        });

        // Připravit datasets pro Chart.js
        const datasets = [];

        // 1. Hlavní čára - kapacita baterie
        datasets.push({
            label: 'Kapacita baterie',
            data: batteryCapacityData,
            borderColor: '#00bcd4',
            backgroundColor: 'rgba(0, 188, 212, 0.2)',
            borderWidth: 3,
            fill: false,
            type: 'line',
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
            yAxisID: 'y-battery',
            order: 1
        });

        // 2. Stacked area - nabíjení ze sítě (spodní vrstva)
        if (gridChargeData.some(v => v > 0)) {
            datasets.push({
                label: 'Nabíjení ze sítě',
                data: gridChargeData,
                backgroundColor: 'rgba(66, 165, 245, 0.5)',  // Modrá
                borderColor: '#42A5F5',
                borderWidth: 1,
                fill: 'origin',  // Vyplnit od nuly nahoru
                type: 'line',
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                yAxisID: 'y-charge',
                stack: 'charging',  // Stacked s ostatními
                order: 3
            });
        }

        // 3. Stacked area - nabíjení ze soláru (vrchní vrstva)
        if (solarChargeData.some(v => v > 0)) {
            datasets.push({
                label: 'Nabíjení ze soláru',
                data: solarChargeData,
                backgroundColor: 'rgba(253, 216, 53, 0.5)',  // Žlutá
                borderColor: '#FDD835',
                borderWidth: 1,
                fill: '-1',  // Vyplnit od předchozího datasetu (stack on grid)
                type: 'line',
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                yAxisID: 'y-charge',
                stack: 'charging',  // Stacked s grid
                order: 2
            });
        }

        // Vytvořit nebo aktualizovat graf
        if (this.chart) {
            this.chart.data.labels = labels;
            this.chart.data.datasets = datasets;
            this.chart.update();
        } else {
            this.chart = new Chart(this.canvasElement, {
                type: 'line',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: this.getTextColor(),
                                font: { size: 11 }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += context.parsed.y.toFixed(2) + ' kWh';
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'hour',
                                displayFormats: {
                                    hour: 'dd.MM HH:mm'
                                },
                                tooltipFormat: 'dd.MM.yyyy HH:mm'
                            },
                            ticks: {
                                color: this.getTextColor(),
                                maxRotation: 45,
                                minRotation: 45,
                                font: { size: 10 }
                            },
                            grid: {
                                color: this.getGridColor()
                            }
                        },
                        'y-battery': {
                            type: 'linear',
                            position: 'left',
                            min: minCapacityKwh,
                            max: maxCapacityKwh,
                            ticks: {
                                color: '#00bcd4',
                                callback: function(value) {
                                    return value.toFixed(1) + ' kWh';
                                }
                            },
                            grid: {
                                color: 'rgba(0, 188, 212, 0.2)'
                            },
                            title: {
                                display: true,
                                text: 'Kapacita baterie (kWh)',
                                color: '#00bcd4'
                            }
                        },
                        'y-charge': {
                            type: 'linear',
                            position: 'right',
                            stacked: true,  // DŮLEŽITÉ: Povolit stacking
                            min: 0,
                            ticks: {
                                color: '#ffc107',
                                callback: function(value) {
                                    return value.toFixed(2) + ' kWh';
                                }
                            },
                            grid: {
                                display: false
                            },
                            title: {
                                display: true,
                                text: 'Nabíjení (kWh)',
                                color: '#ffc107'
                            }
                        }
                    }
                }
            });
        }

        console.log('[BatteryChart] Chart rendered successfully');
    }

    /**
     * Aktualizuje graf s novými daty
     */
    async update() {
        await this.loadAndRender();
    }

    /**
     * Zničí graf a uvolní paměť
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    /**
     * Helper: Získat barvu textu podle tématu
     */
    getTextColor() {
        return this.isLightTheme() ? '#333333' : '#ffffff';
    }

    /**
     * Helper: Získat barvu mřížky podle tématu
     */
    getGridColor() {
        return this.isLightTheme() ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    }

    /**
     * Helper: Detekce light/dark theme
     */
    isLightTheme() {
        try {
            const haElement = window.parent.document.querySelector('home-assistant');
            if (haElement) {
                const computedStyle = window.getComputedStyle(haElement);
                const primaryBg = computedStyle.getPropertyValue('--primary-background-color');
                if (primaryBg) {
                    const rgb = primaryBg.match(/\d+/g);
                    if (rgb && rgb.length >= 3) {
                        const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
                        return brightness > 128;
                    }
                }
            }
        } catch (err) {
            console.debug('[BatteryChart] Theme detection failed:', err);
        }
        return false; // Default: dark theme
    }
}
