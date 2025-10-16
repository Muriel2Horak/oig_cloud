class OigBatteryForecastCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.chart = null;
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error('You need to define an entity');
        }
        this.config = config;
    }

    set hass(hass) {
        this._hass = hass;
        this.updateChart();
    }

    connectedCallback() {
        this.render();
        this.loadChartsLibrary();
    }

    async loadChartsLibrary() {
        try {
            // Načtení chart loaderu pokud není dostupný
            if (!window.ApexChartsLoader) {
                await this.loadScript('/oig_cloud_static/chart-loader.js');
            }

            // Zobrazení loading stavu
            this.showLoading('Načítání grafu...');

            // Načtení Apex Charts pomocí CDN loaderu
            await window.ApexChartsLoader.load();

            // Inicializace grafu
            this.initChart();

        } catch (error) {
            console.error('Chyba při načítání Apex Charts:', error);
            this.showError('Graf není dostupný - problém s načítáním z CDN');
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    }

    showLoading(message) {
        const chartContainer = this.shadowRoot.querySelector('#chart');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 400px;
                           color: var(--primary-text-color); text-align: center; flex-direction: column;">
                    <ha-icon icon="mdi:loading" class="spinning" style="font-size: 48px; margin-bottom: 16px;"></ha-icon>
                    <div>${message}</div>
                </div>
                <style>
                    .spinning {
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
    }

    showError(message) {
        const chartContainer = this.shadowRoot.querySelector('#chart');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 400px;
                           color: var(--error-color, #f44336); text-align: center; flex-direction: column;">
                    <ha-icon icon="mdi:alert-circle" style="font-size: 48px; margin-bottom: 16px;"></ha-icon>
                    <div style="font-weight: 500; margin-bottom: 8px;">Graf není k dispozici</div>
                    <div style="font-size: 0.9em; opacity: 0.8;">${message}</div>
                    <button style="margin-top: 16px; padding: 8px 16px; border: 1px solid var(--error-color);
                                  background: transparent; color: var(--error-color); border-radius: 4px; cursor: pointer;"
                            onclick="this.getRootNode().host.loadChartsLibrary()">
                        Zkusit znovu
                    </button>
                </div>
            `;
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 16px;
                }
                .card-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .card-title {
                    font-size: 1.2em;
                    font-weight: 500;
                    margin: 0;
                }
                .card-icon {
                    margin-right: 8px;
                    color: var(--primary-color);
                }
                #chart {
                    width: 100%;
                    height: 400px;
                }
                .legend {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    margin-top: 12px;
                    font-size: 0.9em;
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .legend-color {
                    width: 12px;
                    height: 12px;
                    border-radius: 2px;
                }
                .stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 12px;
                    margin-top: 16px;
                }
                .stat-item {
                    background: var(--card-background-color, #fff);
                    border: 1px solid var(--divider-color, #e0e0e0);
                    border-radius: 4px;
                    padding: 8px;
                    text-align: center;
                }
                .stat-value {
                    font-size: 1.1em;
                }
                .stat-label {
                    font-size: 0.8em;
                    color: var(--secondary-text-color);
                    margin-top: 2px;
                }
            </style>
            <div class="card-header">
                <ha-icon class="card-icon" icon="mdi:battery-charging"></ha-icon>
                <h2 class="card-title">Predikce kapacity baterie</h2>
            </div>
            <div id="chart"></div>
            <div class="legend">
                <div class="legend-item">
                    <div class="legend-color" style="background-color: #008FFB;"></div>
                    <span>Skutečná kapacita</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background-color: #00E396;"></div>
                    <span>Predikovaná kapacita</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background-color: #FEB019;"></div>
                    <span>Solární výroba</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background-color: #FF4560;"></div>
                    <span>Spotřeba domu</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background-color: #775DD0;"></div>
                    <span>Nabíjení ze sítě</span>
                </div>
            </div>
            <div class="stats" id="stats"></div>
        `;
    }

    initChart() {
        if (!window.ApexCharts || !this.shadowRoot.querySelector('#chart')) return;

        const options = {
            chart: {
                type: 'line',
                height: 500,
                stacked: false,
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800
                },
                toolbar: {
                    show: true,
                    tools: {
                        download: true,
                        selection: false,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true,
                    }
                }
            },
            series: [],
            xaxis: {
                type: 'datetime',
                labels: {
                    format: 'HH:mm',
                    style: {
                        fontSize: '11px'
                    }
                },
                axisBorder: {
                    show: true
                },
                axisTicks: {
                    show: true
                }
            },
            yaxis: [
                {
                    seriesName: 'Kapacita baterie',
                    title: {
                        text: 'Kapacita (kWh)',
                        style: {
                            fontSize: '12px'
                        }
                    },
                    min: 0,
                    max: undefined, // Bude nastaveno dynamicky
                    labels: {
                        formatter: (val) => val ? val.toFixed(1) : '0'
                    }
                },
                {
                    seriesName: 'Výroba',
                    opposite: true,
                    title: {
                        text: 'Výkon (kW)',
                        style: {
                            fontSize: '12px'
                        }
                    },
                    min: 0,
                    labels: {
                        formatter: (val) => val ? val.toFixed(1) : '0'
                    }
                }
            ],
            stroke: {
                width: [0, 3, 3, 0],
                curve: 'smooth'
            },
            fill: {
                type: ['gradient', 'solid', 'solid', 'solid'],
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.2,
                    stops: [0, 90, 100]
                }
            },
            colors: ['#FF9800', '#4CAF50', '#F44336', '#2196F3'],
            legend: {
                show: true,
                position: 'bottom',
                horizontalAlign: 'center',
                labels: {
                    colors: 'var(--primary-text-color, #212121)'
                },
                markers: {
                    width: 12,
                    height: 12
                }
            },
            tooltip: {
                shared: true,
                intersect: false,
                x: {
                    format: 'dd.MM HH:mm'
                },
                y: {
                    formatter: (val, opts) => {
                        if (!val) return '0';
                        const seriesName = opts.w.config.series[opts.seriesIndex]?.name || '';
                        if (seriesName.includes('Kapacita')) {
                            return val.toFixed(2) + ' kWh';
                        }
                        return val.toFixed(2) + ' kW';
                    }
                }
            },
            grid: {
                borderColor: 'var(--divider-color, #e0e0e0)',
                strokeDashArray: 3,
                xaxis: {
                    lines: {
                        show: true
                    }
                },
                yaxis: {
                    lines: {
                        show: true
                    }
                }
            },
            annotations: {
                xaxis: [],
                points: []
            }
        };

        this.chart = new ApexCharts(this.shadowRoot.querySelector('#chart'), options);
        this.chart.render();
        this.updateChart();
    }

    updateChart() {
        if (!this.chart || !this._hass) return;

        const entityId = this.config.entity;
        const entity = this._hass.states[entityId];
        if (!entity) return;

        const attrs = entity.attributes;

        // Příprava dat pro graf
        const series = this.prepareSeries(attrs);
        const annotations = this.prepareAnnotations(attrs);

        // Nastavení max hodnoty pro Y-axis kapacity
        const maxCapacity = attrs.max_capacity_kwh || 15;

        // Aktualizace grafu
        this.chart.updateOptions({
            series: series,
            annotations: annotations,
            yaxis: [
                {
                    seriesName: 'Kapacita baterie',
                    title: {
                        text: 'Kapacita (kWh)',
                        style: {
                            fontSize: '12px'
                        }
                    },
                    min: 0,
                    max: maxCapacity * 1.1, // 10% rezerva
                    labels: {
                        formatter: (val) => val ? val.toFixed(1) : '0'
                    }
                },
                {
                    seriesName: 'Výroba',
                    opposite: true,
                    title: {
                        text: 'Výkon (kW)',
                        style: {
                            fontSize: '12px'
                        }
                    },
                    min: 0,
                    labels: {
                        formatter: (val) => val ? val.toFixed(1) : '0'
                    }
                }
            ]
        });

        // Aktualizace statistik
        const stats = this.prepareStats(attrs);
        this.updateStats(stats);
    }

    prepareAnnotations(attrs) {
        const annotations = {
            xaxis: [],
            points: []
        };

        // Přidat vertikální čáru pro "Nyní"
        const now = new Date().getTime();
        annotations.xaxis.push({
            x: now,
            borderColor: '#999',
            strokeDashArray: 5,
            label: {
                text: 'Nyní',
                style: {
                    color: '#fff',
                    background: '#999'
                }
            }
        });

        // Přidat spot price annotations (červená čísla nahoře)
        const spotPrices = attrs.spot_prices || {};
        const peakHours = attrs.peak_hours || [];
        const offPeakHours = attrs.off_peak_hours || [];

        Object.entries(spotPrices).forEach(([timestamp, price]) => {
            const time = new Date(timestamp).getTime();
            const isPeak = peakHours.includes(timestamp);

            // Zobrazit ceny pouze každou hodinu (00 minut)
            if (new Date(timestamp).getMinutes() === 0) {
                annotations.points.push({
                    x: time,
                    y: 0,
                    marker: {
                        size: 0
                    },
                    label: {
                        text: price.toFixed(1),
                        style: {
                            color: '#fff',
                            background: isPeak ? '#F44336' : '#4CAF50',
                            fontSize: '10px',
                            padding: {
                                left: 4,
                                right: 4,
                                top: 2,
                                bottom: 2
                            }
                        },
                        offsetY: -10
                    }
                });
            }
        });

        // Přidat charging hours jako zelené sloupce
        const chargingHours = [
            ...(attrs.charging_hours_today || []),
            ...(attrs.charging_hours_tomorrow || [])
        ];

        chargingHours.forEach(timestamp => {
            const time = new Date(timestamp).getTime();
            annotations.xaxis.push({
                x: time,
                x2: time + (15 * 60 * 1000), // 15 minut
                fillColor: '#4CAF50',
                opacity: 0.3,
                label: {
                    text: '⚡',
                    style: {
                        color: '#fff',
                        background: '#4CAF50',
                        fontSize: '10px'
                    },
                    offsetY: 0
                }
            });
        });

        return annotations;
    }

    prepareSeries(attrs) {
        const series = [];

        // 1. KAPACITA BATERIE (oranžová area chart)
        const batteryData = this.prepareBatteryData(attrs);
        if (batteryData.length > 0) {
            series.push({
                name: 'Kapacita baterie',
                type: 'area',
                data: batteryData
            });
        }

        // 2. VÝROBA (zelená křivka)
        const solarData = this.prepareSolarData(attrs);
        if (solarData.length > 0) {
            series.push({
                name: 'Výroba',
                type: 'line',
                data: solarData
            });
        }

        // 3. SPOTŘEBA (červená křivka)
        const consumptionData = this.prepareConsumptionData(attrs);
        if (consumptionData.length > 0) {
            series.push({
                name: 'Spotřeba',
                type: 'line',
                data: consumptionData
            });
        }

        // 4. NABÍJENÍ (zelené sloupce) - použijeme annotations místo series
        // Viz prepareAnnotations()

        return series;
    }

    prepareBatteryData(attrs) {
        const data = [];
        const timelineData = attrs.timeline_data || [];

        // Pokud máme timeline_data, použijeme je
        if (timelineData.length > 0) {
            timelineData.forEach(point => {
                if (point.timestamp && point.battery_kwh !== undefined) {
                    data.push({
                        x: new Date(point.timestamp).getTime(),
                        y: point.battery_kwh
                    });
                }
            });
        } else {
            // Fallback na původní metodu
            const current = attrs.current_battery_kwh || 0;
            const now = new Date().getTime();

            data.push({
                x: now,
                y: current
            });

            // Predikce z battery_today_predicted a battery_tomorrow_predicted
            const todayPredicted = attrs.battery_today_predicted || {};
            const tomorrowPredicted = attrs.battery_tomorrow_predicted || {};

            Object.entries({...todayPredicted, ...tomorrowPredicted}).forEach(([timestamp, value]) => {
                data.push({
                    x: new Date(timestamp).getTime(),
                    y: value
                });
            });
        }

        return data.sort((a, b) => a.x - b.x);
    }

    prepareSolarData(attrs) {
        const data = [];
        const timelineData = attrs.timeline_data || [];

        if (timelineData.length > 0) {
            timelineData.forEach(point => {
                if (point.timestamp && point.solar_kw !== undefined) {
                    data.push({
                        x: new Date(point.timestamp).getTime(),
                        y: point.solar_kw
                    });
                }
            });
        } else {
            // Fallback
            const todayPredicted = attrs.solar_today_predicted || {};
            const tomorrowPredicted = attrs.solar_tomorrow_predicted || {};

            Object.entries({...todayPredicted, ...tomorrowPredicted}).forEach(([timestamp, value]) => {
                data.push({
                    x: new Date(timestamp).getTime(),
                    y: value
                });
            });
        }

        return data.sort((a, b) => a.x - b.x);
    }

    prepareConsumptionData(attrs) {
        const data = [];
        const timelineData = attrs.timeline_data || [];

        if (timelineData.length > 0) {
            timelineData.forEach(point => {
                if (point.timestamp && point.consumption_kw !== undefined) {
                    data.push({
                        x: new Date(point.timestamp).getTime(),
                        y: Math.abs(point.consumption_kw) // Spotřeba jako pozitivní
                    });
                }
            });
        } else {
            // Fallback - použít konstantní spotřebu z prediction
            const prediction = attrs.consumption_prediction || {};
            const avgHourly = prediction.average_hourly_kwh || 0.5;

            // Vytvoř predikci na 48 hodin
            const now = new Date();
            for (let i = 0; i < 48; i++) {
                const timestamp = new Date(now.getTime() + i * 60 * 60 * 1000);
                data.push({
                    x: timestamp.getTime(),
                    y: avgHourly
                });
            }
        }

        return data.sort((a, b) => a.x - b.x);
    }

    prepareStats(attrs) {
        const config = attrs.battery_config || {};
        const chargingToday = attrs.charging_hours_today || [];
        const chargingTomorrow = attrs.charging_hours_tomorrow || [];

        return {
            maxCapacity: `${config.max_capacity_kwh || 0} kWh`,
            minCapacity: `${config.min_capacity_percent || 20}%`,
            chargeRate: `${config.charge_rate_kw || 2.8} kW`,
            chargingHoursToday: chargingToday.length,
            chargingHoursTomorrow: chargingTomorrow.length,
            lastUpdate: attrs.last_update ? new Date(attrs.last_update).toLocaleString('cs-CZ') : 'N/A'
        };
    }

    updateStats(stats) {
        const statsContainer = this.shadowRoot.querySelector('#stats');
        if (!statsContainer) return;

        statsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${stats.maxCapacity}</div>
                <div class="stat-label">Max. kapacita</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.minCapacity}</div>
                <div class="stat-label">Min. kapacita</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.chargeRate}</div>
                <div class="stat-label">Nabíjecí výkon</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.chargingHoursToday}</div>
                <div class="stat-label">Nabíjení dnes</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.chargingHoursTomorrow}</div>
                <div class="stat-label">Nabíjení zítra</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.lastUpdate}</div>
                <div class="stat-label">Poslední aktualizace</div>
            </div>
        `;
    }

    getCardSize() {
        return 6; // Velikost karty v grid systému
    }
}

// Registrace custom elementu
customElements.define('oig-battery-forecast-card', OigBatteryForecastCard);

// Registrace pro Lovelace
window.customCards = window.customCards || [];
window.customCards.push({
    type: 'oig-battery-forecast-card',
    name: 'OIG Battery Forecast Card',
    description: 'Karta pro zobrazení predikce kapacity baterie s Apex Charts',
});

console.info(
    '%c  OIG-BATTERY-FORECAST-CARD  \n%c  Version 1.0.0             ',
    'color: orange; font-weight: bold; background: black',
    'color: white; font-weight: bold; background: dimgray'
);
