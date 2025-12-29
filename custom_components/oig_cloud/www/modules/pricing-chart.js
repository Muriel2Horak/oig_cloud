/**
 * Pricing Chart Module - Combined chart for electricity prices, solar forecast and battery
 */

export class PricingChartModule {
    constructor() {
        this.chart = null;
    }

    /**
     * Inicializuje pricing chart
     * @param {HTMLCanvasElement} canvasElement - Canvas element pro graf
     * @param {Object} hass - Home Assistant instance
     * @param {string} inverterId - ID střídače
     */
    async init(canvasElement, hass, inverterId) {
        if (!canvasElement || !hass || !inverterId) {
            console.error('[PricingChart] Missing required parameters');
            return;
        }

        this.canvasElement = canvasElement;
        this.hass = hass;
        this.inverterId = inverterId;

        console.log('[PricingChart] Initializing pricing chart');
        await this.loadAndRender();
    }

    /**
     * Načte pricing data a vykreslí graf
     */
    async loadAndRender() {
        const datasets = [];
        let allLabels = [];

        // Fetch timeline data from API (single source of truth)
        const timelineUrl = `/api/oig_cloud/battery_forecast/${this.inverterId}/timeline?type=active`;

        try {
            const response = await fetch(timelineUrl);
            if (!response.ok) {
                console.error('[PricingChart] Failed to fetch timeline:', response.status);
                return;
            }

            const data = await response.json();
            const timeline = data.active || [];

            if (timeline.length === 0) {
                console.warn('[PricingChart] No timeline data available');
                return;
            }

            // Extract pricing data from timeline
            allLabels = timeline.map(p => new Date(p.timestamp));
            const spotPrices = timeline.map(p => p.spot_price_czk || 0);
            const exportPrices = timeline.map(p => p.export_price_czk || 0);

            // 1. Spot prices with top/bottom 10% highlighting
            if (spotPrices.length > 0) {
                // Identifikace top/bottom 10% cen
                const sortedPrices = [...spotPrices].sort((a, b) => a - b);
                const tenPercentCount = Math.max(1, Math.ceil(sortedPrices.length * 0.1));
                const bottomThreshold = sortedPrices[tenPercentCount - 1];
                const topThreshold = sortedPrices[sortedPrices.length - tenPercentCount];

                const pointRadii = spotPrices.map(price =>
                    (price <= bottomThreshold || price >= topThreshold) ? 5 : 0
                );
                const pointColors = spotPrices.map(price => {
                    if (price <= bottomThreshold) return '#4CAF50';
                    if (price >= topThreshold) return '#F44336';
                    return '#42a5f5';
                });

                datasets.push({
                    label: 'Spotová cena nákupu',
                    data: spotPrices,
                    borderColor: '#42a5f5',
                    backgroundColor: 'rgba(66,165,245,0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    type: 'line',
                    yAxisID: 'y-price',
                    pointRadius: pointRadii,
                    pointHoverRadius: 6,
                    pointBackgroundColor: pointColors,
                    pointBorderColor: pointColors
                });
            }

            // 2. Export prices
            if (exportPrices.length > 0) {
                datasets.push({
                    label: 'Výkupní cena',
                    data: exportPrices,
                    borderColor: '#66bb6a',
                    backgroundColor: 'rgba(102,187,106,0.1)',
                    borderWidth: 2,
                    fill: false,
                    type: 'line',
                    tension: 0.4,
                    yAxisID: 'y-price',
                    pointRadius: 0,
                    pointHoverRadius: 4
                });
            }
        } catch (error) {
            console.error('[PricingChart] Error fetching timeline data:', error);
            return;
        }

        // 3. Solar forecast (interpolovaný na 15min grid)
        const solarEntityId = `sensor.oig_${this.inverterId}_solar_forecast`;
        const solarSensor = this.hass.states[solarEntityId];

        if (solarSensor && solarSensor.attributes && allLabels.length > 0) {
            const attrs = solarSensor.attributes;
            const todayString1_kw = attrs.today_hourly_string1_kw || {};
            const tomorrowString1_kw = attrs.tomorrow_hourly_string1_kw || {};
            const todayString2_kw = attrs.today_hourly_string2_kw || {};
            const tomorrowString2_kw = attrs.tomorrow_hourly_string2_kw || {};

            const allSolarData = {
                string1: { ...todayString1_kw, ...tomorrowString1_kw },
                string2: { ...todayString2_kw, ...tomorrowString2_kw }
            };

            const string1Data = [];
            const string2Data = [];

            for (let i = 0; i < allLabels.length; i++) {
                const timeLabel = allLabels[i];
                const hour = timeLabel.getHours();
                const minute = timeLabel.getMinutes();

                const currentHourDate = new Date(timeLabel);
                currentHourDate.setMinutes(0, 0, 0);
                const currentHourKey = currentHourDate.toISOString().substring(0, 19);

                const nextHourDate = new Date(currentHourDate);
                nextHourDate.setHours(hour + 1);
                const nextHourKey = nextHourDate.toISOString().substring(0, 19);

                const s1_current = allSolarData.string1[currentHourKey] || 0;
                const s1_next = allSolarData.string1[nextHourKey] || 0;
                const s2_current = allSolarData.string2[currentHourKey] || 0;
                const s2_next = allSolarData.string2[nextHourKey] || 0;

                const ratio = minute / 60;

                string1Data.push(this.interpolate(s1_current, s1_next, ratio));
                string2Data.push(this.interpolate(s2_current, s2_next, ratio));
            }

            const hasString1 = string1Data.some(v => v != null && v > 0);
            const hasString2 = string2Data.some(v => v != null && v > 0);

            const solarColors = {
                string1: { border: 'rgba(255, 213, 79, 0.3)', bg: 'rgba(255, 213, 79, 0.08)' },
                string2: { border: 'rgba(255, 183, 77, 0.3)', bg: 'rgba(255, 183, 77, 0.08)' }
            };

            if (hasString1 && hasString2) {
                // Stacked area pro oba stringy
                datasets.push({
                    label: 'String 2',
                    data: string2Data,
                    borderColor: solarColors.string2.border,
                    backgroundColor: solarColors.string2.bg,
                    borderWidth: 1,
                    fill: 'origin',
                    tension: 0.4,
                    type: 'line',
                    yAxisID: 'y-power',
                    stack: 'solar',
                    pointRadius: 0
                });

                datasets.push({
                    label: 'String 1',
                    data: string1Data,
                    borderColor: solarColors.string1.border,
                    backgroundColor: solarColors.string1.bg,
                    borderWidth: 1,
                    fill: '-1',
                    tension: 0.4,
                    type: 'line',
                    yAxisID: 'y-power',
                    stack: 'solar',
                    pointRadius: 0
                });
            } else if (hasString1) {
                datasets.push({
                    label: 'Solar forecast',
                    data: string1Data,
                    borderColor: solarColors.string1.border,
                    backgroundColor: solarColors.string1.bg,
                    borderWidth: 1,
                    fill: 'origin',
                    tension: 0.4,
                    type: 'line',
                    yAxisID: 'y-power',
                    pointRadius: 0
                });
            } else if (hasString2) {
                datasets.push({
                    label: 'Solar forecast',
                    data: string2Data,
                    borderColor: solarColors.string2.border,
                    backgroundColor: solarColors.string2.bg,
                    borderWidth: 1,
                    fill: 'origin',
                    tension: 0.4,
                    type: 'line',
                    yAxisID: 'y-power',
                    pointRadius: 0
                });
            }
        }

        // 4. Battery forecast s nabíjecími zdroji (stacked bars)
        const batteryEntityId = `sensor.oig_${this.inverterId}_battery_forecast`;
        const batterySensor = this.hass.states[batteryEntityId];

        if (batterySensor && batterySensor.attributes && allLabels.length > 0) {
            const timelineData = batterySensor.attributes.timeline_data || [];
            const maxCapacityKwh = batterySensor.attributes.max_capacity_kwh || 10;

            if (timelineData.length > 0) {
                const batteryCapacityData = [];
                const solarAddData = [];
                const gridAddData = [];

                for (let i = 0; i < allLabels.length; i++) {
                    const timeLabel = allLabels[i];
                    const isoKey = timeLabel.toISOString().substring(0, 19);
                    const timelineEntry = timelineData.find(t => t.timestamp === isoKey);

                    if (timelineEntry) {
                        // HYBRID API uses battery_start, solar_kwh, grid_import_kwh
                        const batteryCapacity = timelineEntry.battery_start || timelineEntry.battery_capacity_kwh || 0;
                        const solarCharge = timelineEntry.solar_kwh || timelineEntry.solar_charge_kwh || 0;
                        const gridCharge = timelineEntry.grid_import_kwh || timelineEntry.grid_charge_kwh || 0;

                        batteryCapacityData.push(batteryCapacity);
                        solarAddData.push(solarCharge > 0.01 ? -solarCharge : null);
                        gridAddData.push(gridCharge > 0.01 ? -gridCharge : null);
                    } else {
                        batteryCapacityData.push(null);
                        solarAddData.push(null);
                        gridAddData.push(null);
                    }
                }

                const batteryColors = {
                    capacity: { border: '#00bcd4', bg: 'rgba(0, 188, 212, 0.2)' },
                    solar: { border: '#FDD835', bg: 'rgba(253, 216, 53, 0.6)' },
                    grid: { border: '#42A5F5', bg: 'rgba(66, 165, 245, 0.7)' }
                };

                // Hlavní čára kapacity
                datasets.push({
                    label: 'Kapacita baterie',
                    data: batteryCapacityData,
                    borderColor: batteryColors.capacity.border,
                    backgroundColor: batteryColors.capacity.bg,
                    borderWidth: 3,
                    fill: true,
                    type: 'line',
                    tension: 0.4,
                    pointRadius: 0,
                    yAxisID: 'y-battery',
                    order: 1
                });

                // Stacked bars pro nabíjení
                if (solarAddData.some(v => v != null)) {
                    datasets.push({
                        label: 'Přírůstek ze solaru',
                        data: solarAddData,
                        backgroundColor: batteryColors.solar.bg,
                        borderColor: batteryColors.solar.border,
                        borderWidth: 1,
                        type: 'bar',
                        yAxisID: 'y-battery',
                        order: 3,
                        barPercentage: 0.8
                    });
                }

                if (gridAddData.some(v => v != null)) {
                    datasets.push({
                        label: 'Přírůstek ze sítě',
                        data: gridAddData,
                        backgroundColor: batteryColors.grid.bg,
                        borderColor: batteryColors.grid.border,
                        borderWidth: 1,
                        type: 'bar',
                        yAxisID: 'y-battery',
                        order: 2,
                        barPercentage: 0.8
                    });
                }
            }
        }

        // Vytvořit nebo aktualizovat graf
        if (this.chart) {
            this.chart.data.labels = allLabels;
            this.chart.data.datasets = datasets;
            this.chart.update();
        } else {
            this.chart = new Chart(this.canvasElement, {
                type: 'bar',
                data: { labels: allLabels, datasets: datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { labels: { color: this.getTextColor(), font: { size: 11 } } },
                        tooltip: { backgroundColor: 'rgba(0,0,0,0.8)' }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'hour',
                                displayFormats: { hour: 'dd.MM HH:mm' },
                                tooltipFormat: 'dd.MM.yyyy HH:mm'
                            },
                            ticks: {
                                color: this.getTextColor(),
                                maxRotation: 45,
                                minRotation: 45,
                                font: { size: 10 },
                                maxTicksLimit: 20
                            },
                            grid: { color: this.getGridColor() }
                        },
                        'y-price': {
                            type: 'linear',
                            position: 'left',
                            ticks: {
                                color: '#42a5f5',
                                callback: function(value) { return value.toFixed(2) + ' Kč'; }
                            },
                            grid: { color: 'rgba(66,165,245,0.2)' },
                            title: { display: true, text: 'Cena (Kč/kWh)', color: '#42a5f5' }
                        },
                        'y-power': {
                            type: 'linear',
                            position: 'right',
                            stacked: true,
                            ticks: {
                                color: '#ffc107',
                                callback: function(value) { return value.toFixed(2) + ' kW'; }
                            },
                            grid: { display: false },
                            title: { display: true, text: 'Výkon (kW)', color: '#ffc107' }
                        },
                        'y-battery': {
                            type: 'linear',
                            position: 'right',
                            offset: true,
                            ticks: {
                                color: '#00bcd4',
                                callback: function(value) { return value.toFixed(1) + ' kWh'; }
                            },
                            grid: { display: false },
                            title: { display: true, text: 'Kapacita baterie (kWh)', color: '#00bcd4' }
                        }
                    }
                }
            });
        }

        console.log('[PricingChart] Chart rendered with', datasets.length, 'datasets');
    }

    /**
     * Helper: Lineární interpolace
     */
    interpolate(v1, v2, ratio) {
        if (v1 == null || v2 == null) return v1 || v2 || null;
        return v1 + (v2 - v1) * ratio;
    }

    /**
     * Aktualizace grafu
     */
    async update() {
        await this.loadAndRender();
    }

    /**
     * Zničení grafu
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    getTextColor() {
        return this.isLightTheme() ? '#333333' : '#ffffff';
    }

    getGridColor() {
        return this.isLightTheme() ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    }

    isLightTheme() {
        try {
            const haElement = parent.document.querySelector('home-assistant');
            if (haElement) {
                const computedStyle = getComputedStyle(haElement);
                const primaryBg = computedStyle.getPropertyValue('--primary-background-color');
                if (primaryBg) {
                    const rgb = primaryBg.match(/\d+/g);
                    if (rgb && rgb.length >= 3) {
                        const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
                        return brightness > 128;
                    }
                }
            }
        } catch (e) {}
        return false;
    }
}
