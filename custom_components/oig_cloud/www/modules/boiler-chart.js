/**
 * Boiler Chart Module - Chart.js visualization for water heater planning
 * Zobrazuje průběh teploty, SOC, plánované topení a náklady
 */
/* global Chart */

export class BoilerChartModule {
    chart = null;
    canvasElement = null;
    hass = null;
    inverterId = null;

    /**
     * Inicializuje boiler chart s multi-axis visualizací
     * @param {HTMLCanvasElement} canvasElement - Canvas element pro graf
     * @param {Object} hass - Home Assistant instance
     * @param {string} inverterId - ID střídače (např. "2206237016")
     */
    async init(canvasElement, hass, inverterId) {
        if (!canvasElement || !hass || !inverterId) {
            console.error('[BoilerChart] Missing required parameters');
            return;
        }

        this.canvasElement = canvasElement;
        this.hass = hass;
        this.inverterId = inverterId;

        console.log('[BoilerChart] Initializing boiler chart for inverter:', inverterId);

        // Načíst a vykreslit data
        await this.loadAndRender();
    }

    /**
     * Načte data z boiler senzorů a vykreslí graf
     */
    async loadAndRender() {
        // Načíst boiler sensory - Czech entity names
        const planEntityId = getSensorId('boiler_plan');
        const socEntityId = getSensorId('boiler_soc');
        const tempEntityId = getSensorId('boiler_temperature_top');
        const energyEntityId = getSensorId('boiler_energy_required');
        const costEntityId = getSensorId('boiler_plan_cost');

        const planSensor = this.hass.states[planEntityId];
        const socSensor = this.hass.states[socEntityId];
        const tempSensor = this.hass.states[tempEntityId];
        const energySensor = this.hass.states[energyEntityId];
        const costSensor = this.hass.states[costEntityId];

        if (!planSensor?.attributes) {
            console.warn('[BoilerChart] Boiler plan sensor not found:', planEntityId);
            return;
        }

        // Získat plán z atributů
        const plan = planSensor.attributes.plan ?? {};
        const slots = plan.slots ?? [];
        const digest = plan.digest ?? 'N/A';

        if (slots.length === 0) {
            console.warn('[BoilerChart] No plan slots available');
            this.renderEmptyState();
            return;
        }

        console.log('[BoilerChart] Plan slots:', slots.length, 'Digest:', digest);

        const series = this.buildSeries(slots);
        const metadata = this.buildMetadata({
            socSensor,
            tempSensor,
            energySensor,
            costSensor,
            digest,
        });
        const datasets = this.buildDatasets(series);

        // Vytvořit nebo aktualizovat graf
        if (this.chart) {
            this.chart.data.labels = series.labels;
            this.chart.data.datasets = datasets;
            this.chart.update('none');  // Bez animace pro rychlejší refresh
        } else {
            this.createChart(series.labels, datasets, metadata);
        }
    }

    buildSeries(slots) {
        const labels = [];
        const temperatureData = [];
        const socData = [];
        const heatingData = [];
        const spotPriceData = [];
        const costData = [];

        slots.forEach((slot) => {
            const timestamp = new Date(slot.start_time);
            labels.push(timestamp);

            temperatureData.push(slot.temp_top || 0);
            socData.push(slot.soc || 0);
            heatingData.push(slot.heating ? 1 : 0);
            spotPriceData.push(slot.spot_price || 0);
            costData.push(slot.cost || 0);
        });

        console.log('[BoilerChart] Sample slot data:', {
            timestamp: labels[0],
            temp: temperatureData[0],
            soc: socData[0],
            heating: heatingData[0],
            spotPrice: spotPriceData[0],
            cost: costData[0]
        });

        return {
            labels,
            temperatureData,
            socData,
            heatingData,
            spotPriceData,
            costData,
        };
    }

    buildMetadata({ socSensor, tempSensor, energySensor, costSensor, digest }) {
        return {
            currentSoc: Number.parseFloat(socSensor?.state ?? '0'),
            currentTemp: Number.parseFloat(tempSensor?.state ?? '0'),
            energyRequired: Number.parseFloat(energySensor?.state ?? '0'),
            totalCost: Number.parseFloat(costSensor?.state ?? '0'),
            digest,
        };
    }

    buildDatasets(series) {
        const datasets = [
            {
                label: 'Teplota horní zóna (°C)',
                data: series.temperatureData,
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderWidth: 2,
                fill: true,
                type: 'line',
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 4,
                yAxisID: 'y-temp',
                order: 1
            },
            {
                label: 'SOC (%)',
                data: series.socData,
                borderColor: '#4ecdc4',
                backgroundColor: 'rgba(78, 205, 196, 0.1)',
                borderWidth: 2,
                fill: true,
                type: 'line',
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 4,
                yAxisID: 'y-soc',
                order: 2
            }
        ];

        const heatingBarData = series.heatingData.map((heating, idx) => {
            if (heating === 1) {
                return series.temperatureData[idx];
            }
            return null;
        });

        datasets.push(
            {
                label: 'Topení aktivní',
                data: heatingBarData,
                backgroundColor: 'rgba(255, 193, 7, 0.4)',
                borderColor: '#ffc107',
                borderWidth: 1,
                type: 'bar',
                barPercentage: 1,
                categoryPercentage: 1,
                yAxisID: 'y-temp',
                order: 3
            },
            {
                label: 'Spot cena (Kč/kWh)',
                data: series.spotPriceData,
                borderColor: '#95a5a6',
                backgroundColor: 'rgba(149, 165, 166, 0.1)',
                borderWidth: 1,
                borderDash: [5, 5],
                fill: false,
                type: 'line',
                tension: 0,
                pointRadius: 0,
                pointHoverRadius: 3,
                yAxisID: 'y-price',
                hidden: true,
                order: 4
            }
        );

        return datasets;
    }

    /**
     * Vytvoří Chart.js instanci
     */
    createChart(labels, datasets, metadata) {
        const ctx = this.canvasElement.getContext('2d');
        if (!ctx) {
            console.error('[BoilerChart] Failed to get canvas context');
            return;
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets
            },
            options: this.buildChartOptions(metadata)
        });

        console.log('[BoilerChart] Chart created successfully');
    }

    buildChartOptions(metadata) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: `Plán ohřevu bojleru | SOC: ${metadata.currentSoc.toFixed(0)}% | Teplota: ${metadata.currentTemp.toFixed(1)}°C | Energie: ${metadata.energyRequired.toFixed(2)} kWh | Náklady: ${metadata.totalCost.toFixed(2)} Kč`,
                    font: { size: 14, weight: 'bold' },
                    color: '#ffffff'
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#ffffff',
                        usePointStyle: true,
                        padding: 15,
                        filter: (legendItem) => {
                            return !legendItem.text.includes('Spot cena');
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#4ecdc4',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        title: (tooltipItems) => {
                            const item = tooltipItems[0];
                            const date = new Date(item.label);
                            return date.toLocaleString('cs-CZ', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        },
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;

                            if (label.includes('Teplota')) {
                                return `${label}: ${value.toFixed(1)}°C`;
                            } else if (label.includes('SOC')) {
                                return `${label}: ${value.toFixed(0)}%`;
                            } else if (label.includes('Topení')) {
                                if (value === null) {
                                    return '';
                                }
                                return '🔥 Topení ZAPNUTO';
                            } else if (label.includes('Spot cena')) {
                                return `${label}: ${value.toFixed(2)} Kč/kWh`;
                            }
                            return `${label}: ${value}`;
                        }
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x'
                    },
                    zoom: {
                        wheel: {
                            enabled: true
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x'
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'HH:mm'
                        },
                        tooltipFormat: 'dd.MM HH:mm'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff',
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 12
                    }
                },
                'y-temp': {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Teplota (°C)',
                        color: '#ff6b6b'
                    },
                    grid: {
                        color: 'rgba(255, 107, 107, 0.2)'
                    },
                    ticks: {
                        color: '#ff6b6b',
                        callback: (value) => `${value}°C`
                    },
                    min: 0,
                    max: 100
                },
                'y-soc': {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'SOC (%)',
                        color: '#4ecdc4'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: '#4ecdc4',
                        callback: (value) => `${value}%`
                    },
                    min: 0,
                    max: 100
                },
                'y-price': {
                    type: 'linear',
                    position: 'right',
                    display: false,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        };
    }

    /**
     * Vykreslí prázdný stav když nejsou data
     */
    renderEmptyState() {
        const ctx = this.canvasElement.getContext('2d');
        if (!ctx) return;

        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        // Zobrazit text "Žádný plán topení"
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚠️ Žádný plán topení', this.canvasElement.width / 2, this.canvasElement.height / 2);
        ctx.font = '14px Arial';
        ctx.fillText('Pro vytvoření plánu použijte službu "Naplánovat ohřev bojleru"', this.canvasElement.width / 2, this.canvasElement.height / 2 + 30);
    }

    /**
     * Refresh dat (volat při update senzorů)
     */
    async refresh() {
        await this.loadAndRender();
    }

    /**
     * Destroy chart instance
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}
