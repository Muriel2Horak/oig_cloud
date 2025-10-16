class EnhancedDashboardSwitcher {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.currentView = 'basic';
        this.views = {
            'basic': 'Základní přehled',
            'minimal': 'Minimální',
            'advanced': 'Pokročilé grafy',
            'battery': 'Baterie & Predikce'
        };
        this.updateInterval = null;
        this.lastUpdate = null;
        this.haTheme = this.detectHATheme();
        this.init();
    }

    detectHATheme() {
        // Detekce HA tématu
        try {
            if (window.parent && window.parent.document) {
                const haRoot = window.parent.document.documentElement;
                const theme = haRoot.style.getPropertyValue('--primary-background-color');
                return theme && theme.includes('#1') ? 'dark' : 'light';
            }
        } catch (e) {
            console.log('Cannot access parent HA theme, using system preference');
        }

        // Fallback na system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    init() {
        this.applyHATheme();
        this.createSwitcher();
        this.loadView(this.currentView);
        this.startRealTimeUpdates();
    }

    applyHATheme() {
        document.documentElement.setAttribute('data-theme', this.haTheme);

        // Pokusit se získat CSS proměnné z HA
        try {
            if (window.parent && window.parent.document) {
                const haStyles = window.parent.getComputedStyle(window.parent.document.documentElement);
                const cssVars = [
                    '--primary-background-color',
                    '--card-background-color',
                    '--primary-text-color',
                    '--secondary-background-color',
                    '--primary-color'
                ];

                cssVars.forEach(varName => {
                    const value = haStyles.getPropertyValue(varName);
                    if (value) {
                        document.documentElement.style.setProperty(varName, value);
                    }
                });
            }
        } catch (e) {
            console.log('Using fallback theme variables');
        }
    }

    startRealTimeUpdates() {
        // Okamžitá aktualizace
        this.updateData();

        // Pak každých 15 sekund
        this.updateInterval = setInterval(() => {
            this.updateData();
        }, 15000);
    }

    async updateData() {
        const inverterSn = this.dashboard.inverterSn;
        this.lastUpdate = new Date();

        try {
            switch (this.currentView) {
                case 'basic':
                    await this.updateBasicData(inverterSn);
                    break;
                case 'minimal':
                    await this.updateMinimalData(inverterSn);
                    break;
                default:
                    // Advanced a battery mají vlastní update cykly
                    break;
            }

            // Aktualizovat timestamp
            this.updateLastUpdateTime();

        } catch (error) {
            console.error('Error updating data:', error);
        }
    }

    createSwitcher() {
        const headerContainer = document.querySelector('.header-container') || this.createHeaderContainer();

        const switcherHtml = `
            <div class="dashboard-switcher enhanced">
                <div class="switcher-header">
                    <div class="dashboard-logo">
                        <span class="logo-icon">⚡</span>
                        <span class="logo-text">OIG Cloud Dashboard</span>
                    </div>
                    <div class="dashboard-status">
                        <span class="status-dot" id="status-dot"></span>
                        <span class="last-update" id="header-last-update">Načítám...</span>
                    </div>
                </div>
                <div class="switcher-tabs">
                    ${Object.entries(this.views).map(([key, label]) => `
                        <button
                            class="tab-button enhanced ${key === this.currentView ? 'active' : ''}"
                            data-view="${key}"
                            onclick="enhancedDashboardSwitcher.switchView('${key}')"
                        >
                            ${this.getViewIcon(key)}
                            <span class="tab-label">${label}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        headerContainer.innerHTML = switcherHtml + headerContainer.innerHTML;
        this.addEnhancedStyles();
    }

    createHeaderContainer() {
        const container = document.createElement('div');
        container.className = 'header-container';
        document.body.insertBefore(container, document.body.firstChild);
        return container;
    }

    getViewIcon(view) {
        const icons = {
            'basic': '🏠',
            'minimal': '⚡',
            'advanced': '📊',
            'battery': '🔋'
        };
        return icons[view] || '📈';
    }

    switchView(view) {
        if (view === this.currentView) return;

        // Update active tab
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        this.currentView = view;
        this.loadView(view);

        // Save preference
        localStorage.setItem('oig_dashboard_view', view);
    }

    async loadView(view) {
        const mainContainer = document.querySelector('.dashboard-container') || document.createElement('div');
        mainContainer.className = 'dashboard-container enhanced';

        try {
            switch (view) {
                case 'basic':
                    await this.loadEnhancedBasicView(mainContainer);
                    break;
                case 'minimal':
                    await this.loadEnhancedMinimalView(mainContainer);
                    break;
                case 'advanced':
                    await this.loadAdvancedView(mainContainer);
                    break;
                case 'battery':
                    await this.loadBatteryView(mainContainer);
                    break;
                default:
                    await this.loadEnhancedBasicView(mainContainer);
            }
        } catch (error) {
            console.error(`Error loading view ${view}:`, error);
            mainContainer.innerHTML = `<div class="error-card enhanced">Chyba při načítání pohledu: ${error.message}</div>`;
        }

        if (!mainContainer.parentNode) {
            document.body.appendChild(mainContainer);
        }
    }

    async loadEnhancedBasicView(container) {
        const inverterSn = this.dashboard.inverterSn;

        container.innerHTML = `
            <!-- Spot ceny - prominentně nahoře -->
            <div class="card spot-prices-hero" id="spot-prices-hero">
                <div class="card-title">💰 Spot ceny elektřiny</div>
                <div class="price-hero-grid">
                    <div class="price-hero-item current">
                        <div class="price-hero-label">Aktuální cena</div>
                        <div class="price-hero-value" id="current-spot-price">-- Kč/kWh</div>
                        <div class="price-hero-trend" id="price-trend">📈</div>
                    </div>
                    <div class="price-hero-item buy">
                        <div class="price-hero-label">Nákup ze sítě</div>
                        <div class="price-hero-value" id="buy-price">-- Kč/kWh</div>
                    </div>
                    <div class="price-hero-item sell">
                        <div class="price-hero-label">Výkup do sítě</div>
                        <div class="price-hero-value" id="sell-price">-- Kč/kWh</div>
                    </div>
                </div>
                <div class="price-mini-chart" id="price-mini-chart">
                    <!-- Mini graf posledních hodin -->
                </div>
            </div>

            <!-- Grafický tok energie inspirovaný obrázkem -->
            <div class="card energy-flow-card">
                <div class="card-title-with-status">
                    <span>⚡ Energetické toky</span>
                    <div class="realtime-indicator" id="realtime-indicator">
                        <span class="pulse-dot"></span>
                        <span>LIVE</span>
                    </div>
                </div>

                <div class="energy-flow-visual">
                    <!-- Solární část nahoře -->
                    <div class="solar-section">
                        <div class="solar-panel">
                            <div class="panel-icon">
                                <svg width="60" height="40" viewBox="0 0 60 40">
                                    <rect x="5" y="5" width="50" height="30" fill="currentColor" opacity="0.2" rx="3"/>
                                    <rect x="8" y="8" width="11" height="7" fill="currentColor" opacity="0.6" rx="1"/>
                                    <rect x="21" y="8" width="11" height="7" fill="currentColor" opacity="0.6" rx="1"/>
                                    <rect x="34" y="8" width="11" height="7" fill="currentColor" opacity="0.6" rx="1"/>
                                    <rect x="47" y="8" width="6" height="7" fill="currentColor" opacity="0.6" rx="1"/>
                                    <rect x="8" y="17" width="11" height="7" fill="currentColor" opacity="0.6" rx="1"/>
                                    <rect x="21" y="17" width="11" height="7" fill="currentColor" opacity="0.6" rx="1"/>
                                    <rect x="34" y="17" width="11" height="7" fill="currentColor" opacity="0.6" rx="1"/>
                                    <rect x="47" y="17" width="6" height="7" fill="currentColor" opacity="0.6" rx="1"/>
                                    <rect x="8" y="26" width="11" height="7" fill="currentColor" opacity="0.6" rx="1"/>
                                    <rect x="21" y="26" width="11" height="7" fill="currentColor" opacity="0.6" rx="1"/>
                                    <rect x="34" y="26" width="11" height="7" fill="currentColor" opacity="0.6" rx="1"/>
                                    <rect x="47" y="26" width="6" height="7" fill="currentColor" opacity="0.6" rx="1"/>
                                </svg>
                            </div>
                            <div class="power-badge solar-badge" id="solar-power-badge">-- W</div>
                            <div class="daily-production" id="solar-daily">Dnes: -- kWh</div>
                        </div>
                    </div>

                    <!-- Střední sekce s rozvodnou -->
                    <div class="distribution-center">
                        <div class="inverter-box">
                            <div class="inverter-icon">
                                <svg width="80" height="60" viewBox="0 0 80 60">
                                    <rect x="10" y="15" width="60" height="30" fill="currentColor" opacity="0.1" rx="5"/>
                                    <rect x="15" y="20" width="50" height="20" fill="currentColor" opacity="0.2" rx="3"/>
                                    <circle cx="25" cy="30" r="3" fill="currentColor" opacity="0.6"/>
                                    <circle cx="35" cy="30" r="3" fill="currentColor" opacity="0.6"/>
                                    <circle cx="45" cy="30" r="3" fill="currentColor" opacity="0.6"/>
                                    <circle cx="55" cy="30" r="3" fill="currentColor" opacity="0.6"/>
                                    <rect x="20" y="35" width="40" height="2" fill="currentColor" opacity="0.3"/>
                                </svg>
                            </div>
                            <div class="inverter-status" id="inverter-status">Online</div>
                        </div>

                        <!-- Spojovací linky -->
                        <svg class="connection-lines" width="100%" height="100%" viewBox="0 0 400 300">
                            <!-- Solár dolů -->
                            <path id="solar-line" d="M 200 20 L 200 80" stroke="currentColor" stroke-width="3" fill="none" opacity="0.3"/>
                            <circle id="solar-flow" r="4" fill="#4CAF50" opacity="0">
                                <animateMotion dur="2s" repeatCount="indefinite" path="M 200 20 L 200 80"/>
                            </circle>

                            <!-- Battery vlevo -->
                            <path id="battery-line" d="M 80 150 L 160 150" stroke="currentColor" stroke-width="3" fill="none" opacity="0.3"/>
                            <circle id="battery-flow" r="4" fill="#FF9800" opacity="0">
                                <animateMotion dur="2s" repeatCount="indefinite" path="M 80 150 L 160 150"/>
                            </circle>

                            <!-- Grid vpravo -->
                            <path id="grid-line" d="M 240 150 L 320 150" stroke="currentColor" stroke-width="3" fill="none" opacity="0.3"/>
                            <circle id="grid-flow" r="4" fill="#2196F3" opacity="0">
                                <animateMotion dur="2s" repeatCount="indefinite" path="M 240 150 L 320 150"/>
                            </circle>

                            <!-- Dům dolů -->
                            <path id="house-line" d="M 200 180 L 200 260" stroke="currentColor" stroke-width="3" fill="none" opacity="0.3"/>
                            <circle id="house-flow" r="4" fill="#9C27B0" opacity="0">
                                <animateMotion dur="2s" repeatCount="indefinite" path="M 200 180 L 200 260"/>
                            </circle>
                        </svg>
                    </div>

                    <!-- Baterie vlevo -->
                    <div class="battery-section">
                        <div class="battery-container">
                            <div class="battery-graphic">
                                <svg width="50" height="80" viewBox="0 0 50 80">
                                    <rect x="10" y="5" width="30" height="5" fill="currentColor" opacity="0.4" rx="2"/>
                                    <rect x="12" y="10" width="26" height="60" fill="none" stroke="currentColor" stroke-width="2" opacity="0.6" rx="3"/>
                                    <rect id="battery-fill" x="14" y="60" width="22" height="0" fill="#4CAF50" rx="2">
                                        <animate attributeName="height" dur="1s" values="0;40;0" repeatCount="indefinite"/>
                                        <animate attributeName="y" dur="1s" values="60;30;60" repeatCount="indefinite"/>
                                    </rect>
                                </svg>
                            </div>
                            <div class="battery-percentage" id="battery-percentage">--%</div>
                            <div class="battery-power-flow" id="battery-power">-- W</div>
                            <div class="battery-capacity" id="battery-capacity">-- kWh</div>
                        </div>
                    </div>

                    <!-- Síť vpravo -->
                    <div class="grid-section">
                        <div class="grid-container">
                            <div class="grid-icon">
                                <svg width="60" height="60" viewBox="0 0 60 60">
                                    <circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                                    <path d="M 15 30 L 45 30 M 30 15 L 30 45" stroke="currentColor" stroke-width="3" opacity="0.6"/>
                                    <circle cx="30" cy="30" r="8" fill="currentColor" opacity="0.2"/>
                                    <path d="M 22 22 L 38 38 M 38 22 L 22 38" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                                </svg>
                            </div>
                            <div class="grid-status" id="grid-status">Import</div>
                            <div class="grid-power" id="grid-power">-- W</div>
                            <div class="grid-daily" id="grid-daily">Dnes: -- kWh</div>
                        </div>
                    </div>

                    <!-- Dům dole -->
                    <div class="house-section">
                        <div class="house-container">
                            <div class="house-graphic">
                                <svg width="80" height="60" viewBox="0 0 80 60">
                                    <path d="M 10 35 L 40 10 L 70 35 L 70 50 L 10 50 Z" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1"/>
                                    <rect x="20" y="30" width="12" height="15" fill="currentColor" opacity="0.3"/>
                                    <rect x="48" y="30" width="8" height="8" fill="currentColor" opacity="0.3"/>
                                    <circle cx="52" cy="34" r="1" fill="currentColor"/>
                                    <path d="M 15 45 L 25 45 M 55 45 L 65 45" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                                </svg>
                            </div>
                            <div class="house-consumption" id="house-consumption">-- W</div>
                            <div class="house-daily" id="house-daily">Dnes: -- kWh</div>
                        </div>
                    </div>
                </div>

                <!-- Statistiky pod diagramem -->
                <div class="flow-stats">
                    <div class="stat-item solar-stat">
                        <span class="stat-icon">☀️</span>
                        <span class="stat-label">Výroba</span>
                        <span class="stat-value" id="solar-efficiency">--%</span>
                    </div>
                    <div class="stat-item balance-stat">
                        <span class="stat-icon">⚖️</span>
                        <span class="stat-label">Bilance</span>
                        <span class="stat-value" id="energy-balance">-- W</span>
                    </div>
                    <div class="stat-item efficiency-stat">
                        <span class="stat-icon">🎯</span>
                        <span class="stat-label">Soběstačnost</span>
                        <span class="stat-value" id="self-sufficiency-flow">--%</span>
                    </div>
                </div>
            </div>            <!-- Statistiky s grafy -->
            <div class="card">
                <div class="card-title">📊 Dnešní bilance</div>
                <div class="balance-grid">
                    <div class="balance-item production">
                        <div class="balance-chart" id="production-chart"></div>
                        <div class="balance-info">
                            <div class="balance-icon">☀️</div>
                            <div class="balance-label">Výroba</div>
                            <div class="balance-value" id="production-today">-- kWh</div>
                            <div class="balance-forecast" id="production-forecast">Forecast: --</div>
                        </div>
                    </div>
                    <div class="balance-item consumption">
                        <div class="balance-chart" id="consumption-chart"></div>
                        <div class="balance-info">
                            <div class="balance-icon">🏠</div>
                            <div class="balance-label">Spotřeba</div>
                            <div class="balance-value" id="consumption-today">-- kWh</div>
                            <div class="balance-efficiency" id="self-sufficiency">Soběstačnost: --%</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bojler info (pokud aktivní) -->
            <div class="card" id="boiler-card" style="display: none;">
                <div class="card-title">🔥 Ohřev vody</div>
                <div class="boiler-status">
                    <div class="boiler-visual">
                        <div class="boiler-icon" id="boiler-icon">🔥</div>
                        <div class="boiler-temp" id="boiler-temp">--°C</div>
                        <div class="boiler-state" id="boiler-state">--</div>
                    </div>
                    <div class="boiler-energy">
                        <div class="energy-source grid">
                            <span class="source-icon">🔌</span>
                            <span class="source-label">Ze sítě</span>
                            <span class="source-value" id="boiler-from-grid">-- kWh</span>
                        </div>
                        <div class="energy-source solar">
                            <span class="source-icon">☀️</span>
                            <span class="source-label">Z FVE</span>
                            <span class="source-value" id="boiler-from-solar">-- kWh</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Notifikace a statusy -->
            <div class="card notifications-card">
                <div class="card-title">🔔 Systémové informace</div>
                <div class="notifications-grid">
                    <div class="notification-item" id="bypass-notification">
                        <div class="notification-icon">⚙️</div>
                        <div class="notification-content">
                            <div class="notification-title">Bypass stav</div>
                            <div class="notification-status" id="bypass-status">Kontroluji...</div>
                        </div>
                    </div>
                    <div class="notification-item" id="data-age-notification">
                        <div class="notification-icon">🕒</div>
                        <div class="notification-content">
                            <div class="notification-title">Stáří dat</div>
                            <div class="notification-status" id="data-age">Načítám...</div>
                        </div>
                    </div>
                    <div class="notification-item" id="communication-notification">
                        <div class="notification-icon">📡</div>
                        <div class="notification-content">
                            <div class="notification-title">Komunikace</div>
                            <div class="notification-status" id="comm-status">Online</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Baterie detaily -->
            <div class="card">
                <div class="card-title">🔋 Baterie - detailní statistiky</div>
                <div class="battery-detailed">
                    <div class="battery-gauge-container">
                        <div class="battery-gauge" id="battery-gauge">
                            <div class="gauge-fill" id="gauge-fill"></div>
                            <div class="gauge-text">
                                <div class="gauge-percentage" id="gauge-percentage">--%</div>
                                <div class="gauge-capacity" id="gauge-capacity">-- kWh</div>
                            </div>
                        </div>
                    </div>
                    <div class="battery-stats">
                        <div class="battery-stat">
                            <span class="stat-label">Nabíjení dnes:</span>
                            <span class="stat-value" id="battery-charged-today">-- kWh</span>
                        </div>
                        <div class="battery-stat">
                            <span class="stat-label">Vybíjení dnes:</span>
                            <span class="stat-value" id="battery-discharged-today">-- kWh</span>
                        </div>
                        <div class="battery-stat">
                            <span class="stat-label">Teplota:</span>
                            <span class="stat-value" id="battery-temperature">-- °C</span>
                        </div>
                        <div class="battery-stat">
                            <span class="stat-label">Stav:</span>
                            <span class="stat-value" id="battery-state">--</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.updateBasicData(inverterSn);
        this.initializeMiniCharts();
    }

    async loadEnhancedMinimalView(container) {
        container.innerHTML = `
            <div class="minimal-hero">
                <div class="hero-title">⚡ Energetický přehled</div>
                <div class="hero-subtitle" id="hero-subtitle">Aktualizováno před chvílí</div>
            </div>

            <!-- Spot cena prominentně -->
            <div class="card minimal-spot">
                <div class="spot-current-large">
                    <div class="spot-icon">💰</div>
                    <div class="spot-info">
                        <div class="spot-price" id="min-spot-price">-- Kč/kWh</div>
                        <div class="spot-label">Aktuální spot cena</div>
                    </div>
                    <div class="spot-trend" id="min-spot-trend">📈 +0.12</div>
                </div>
            </div>

            <!-- Rychlý přehled 4 hodnot -->
            <div class="card minimal-main">
                <div class="minimal-grid-enhanced">
                    <div class="minimal-item solar active" id="min-solar-item">
                        <div class="minimal-icon animated">☀️</div>
                        <div class="minimal-label">Výroba</div>
                        <div class="minimal-value" id="min-solar">-- W</div>
                        <div class="minimal-change" id="min-solar-change">--</div>
                    </div>
                    <div class="minimal-item battery charging" id="min-battery-item">
                        <div class="minimal-icon animated">🔋</div>
                        <div class="minimal-label">Baterie</div>
                        <div class="minimal-value" id="min-battery">--%</div>
                        <div class="minimal-change" id="min-battery-change">--</div>
                    </div>
                    <div class="minimal-item consumption" id="min-consumption-item">
                        <div class="minimal-icon">🏠</div>
                        <div class="minimal-label">Spotřeba</div>
                        <div class="minimal-value" id="min-consumption">-- W</div>
                        <div class="minimal-change" id="min-consumption-change">--</div>
                    </div>
                    <div class="minimal-item grid export" id="min-grid-item">
                        <div class="minimal-icon">🔌</div>
                        <div class="minimal-label">Síť</div>
                        <div class="minimal-value" id="min-grid">-- W</div>
                        <div class="minimal-change" id="min-grid-change">--</div>
                    </div>
                </div>
            </div>

            <!-- Dnešní bilance kompaktně -->
            <div class="card minimal-balance">
                <div class="balance-title">📊 Dnes</div>
                <div class="balance-quick">
                    <div class="balance-quick-item">
                        <span class="balance-quick-label">Vyrobeno</span>
                        <span class="balance-quick-value" id="min-produced">-- kWh</span>
                    </div>
                    <div class="balance-quick-item">
                        <span class="balance-quick-label">Spotřebováno</span>
                        <span class="balance-quick-value" id="min-consumed">-- kWh</span>
                    </div>
                    <div class="balance-quick-item highlight">
                        <span class="balance-quick-label">Soběstačnost</span>
                        <span class="balance-quick-value" id="min-self-sufficiency">--%</span>
                    </div>
                </div>
            </div>

            <!-- Notifikace kompaktně -->
            <div class="card minimal-alerts" id="minimal-alerts">
                <!-- Dynamicky generované alerty -->
            </div>
        `;

        await this.updateMinimalData(inverterSn);
    }

    async updateBasicData(inverterSn) {
        try {
            // Načíst všechna potřebná data paralelně
            const [
                solarPower, batteryPercent, batteryPower, consumptionPower, gridPower,
                spotPrice, buyPrice, sellPrice, productionToday, consumptionToday,
                batteryChargedToday, batteryDischargedToday, bypassStatus, lastDataUpdate
            ] = await Promise.all([
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_dc_in_fv_total`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_batt_bat_c`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_batt_batt_comp_p`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_actual_aco_p`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_actual_aci_wtotal`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_spot_price_current_czk_kwh`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_spot_price_current_15min`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_export_price_current_15min`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_dc_in_fv_ad`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_computed_load_energy_today`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_computed_batt_charge_energy_today`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_computed_batt_discharge_energy_today`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_bypass_status`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_last_update`)
            ]);

            // Aktualizovat spot ceny
            this.updateElement('current-spot-price', this.formatPrice(spotPrice?.state));
            this.updateElement('buy-price', this.formatPrice(buyPrice?.state));
            this.updateElement('sell-price', this.formatPrice(sellPrice?.state));

            // Aktualizovat výkony s animací
            this.updatePowerValue('solar-power-badge', solarPower?.state, ' W');
            this.updatePowerValue('battery-power', batteryPower?.state, ' W');
            this.updatePowerValue('house-consumption', consumptionPower?.state, ' W');
            this.updatePowerValue('grid-power', gridPower?.state, ' W');

            // Aktualizovat battery gauge a procenta
            this.updateElement('battery-percentage', `${parseFloat(batteryPercent?.state || 0).toFixed(0)}%`);
            this.updateBatteryVisualization(batteryPercent?.state, batteryPower?.state);

            // Aktualizovat denní statistiky v flow diagramu
            this.updateElement('solar-daily', `Dnes: ${this.formatEnergy(productionToday?.state)}`);
            this.updateElement('house-daily', `Dnes: ${this.formatEnergy(consumptionToday?.state)}`);

            // Vypočítat a zobrazit grid daily (import/export)
            const gridDaily = await this.dashboard.getSensorData(`sensor.oig_${inverterSn}_actual_aci_wtotal_ad`);
            this.updateElement('grid-daily', `Dnes: ${this.formatEnergy(gridDaily?.state)}`);

            // Aktualizovat battery capacity
            const batteryCapacity = parseFloat(batteryPercent?.state || 0) / 100 * 5.2; // Předpokládaná kapacita 5.2 kWh
            this.updateElement('battery-capacity', `${batteryCapacity.toFixed(1)} kWh`);

            // Aktualizovat statistiky
            this.updateElement('production-today', this.formatEnergy(productionToday?.state));
            this.updateElement('consumption-today', this.formatEnergy(consumptionToday?.state));

            // Aktualizovat battery detaily
            this.updateElement('battery-charged-today', this.formatEnergy(batteryChargedToday?.state));
            this.updateElement('battery-discharged-today', this.formatEnergy(batteryDischargedToday?.state));

            // Získat další battery data
            const [batteryTemp, batteryState] = await Promise.all([
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_batt_temp`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_batt_state`)
            ]);

            this.updateElement('battery-temperature', batteryTemp?.state ? `${parseFloat(batteryTemp.state).toFixed(1)}°C` : '--°C');
            this.updateElement('battery-state', batteryState?.state || 'Neznámý');

            // Vypočítat soběstačnost
            const selfSufficiency = this.calculateSelfSufficiency(
                parseFloat(productionToday?.state || 0),
                parseFloat(consumptionToday?.state || 1)
            );

            this.updateElement('self-sufficiency', `Soběstačnost: ${selfSufficiency.toFixed(0)}%`);

            // Aktualizovat notifikace
            this.updateNotifications(bypassStatus, lastDataUpdate);

            // Aktualizovat bojler pokud je aktivní
            await this.updateBoilerData(inverterSn);

            // Aktualizovat inverter status
            const inverterStatus = solarPower?.state > 0 || batteryPower?.state !== 0 ? 'Online' : 'Standby';
            this.updateElement('inverter-status', inverterStatus);

            // Aktualizovat animace podle stavu
            this.updateFlowAnimations(solarPower?.state, batteryPower?.state, gridPower?.state);

        } catch (error) {
            console.error('Error updating basic data:', error);
        }
    }

    updatePowerValue(elementId, value, unit) {
        const element = document.getElementById(elementId);
        if (element) {
            const numValue = parseFloat(value) || 0;
            element.textContent = numValue.toFixed(0) + unit;

            // Přidat barevné kódování
            element.className = element.className.replace(/\b(positive|negative|zero)\b/g, '');
            if (numValue > 0) element.classList.add('positive');
            else if (numValue < 0) element.classList.add('negative');
            else element.classList.add('zero');
        }
    }

    updateBatteryVisualization(percentage, power) {
        const percent = parseFloat(percentage) || 0;
        const pow = parseFloat(power) || 0;

        // Aktualizovat gauge
        const gaugeFill = document.getElementById('gauge-fill');
        if (gaugeFill) {
            gaugeFill.style.height = `${percent}%`;

            // Barva podle úrovně
            if (percent > 80) gaugeFill.style.background = '#4CAF50';
            else if (percent > 30) gaugeFill.style.background = '#FFC107';
            else gaugeFill.style.background = '#f44336';
        }

        this.updateElement('gauge-percentage', `${percent.toFixed(0)}%`);
        this.updateElement('battery-level', `${percent.toFixed(0)}%`);
        this.updateElement('battery-power', `${pow.toFixed(0)}W`);
    }

    updateFlowAnimations(solar, battery, grid) {
        const solarVal = parseFloat(solar) || 0;
        const batteryVal = parseFloat(battery) || 0;
        const gridVal = parseFloat(grid) || 0;

        // Aktualizovat hodnoty v novém grafickém rozhraní
        this.updateElement('solar-power-badge', `${solarVal.toFixed(0)} W`);
        this.updateElement('battery-power', `${batteryVal.toFixed(0)} W`);
        this.updateElement('grid-power', `${gridVal.toFixed(0)} W`);

        // Získat container pro přidání tříd
        const flowVisual = document.querySelector('.energy-flow-visual');
        if (!flowVisual) return;

        // Resetovat třídy
        flowVisual.classList.remove('flow-active', 'battery-charging', 'battery-discharging', 'grid-importing', 'grid-exporting');

        // Přidat aktivní tok pokud je nějaký výkon
        if (solarVal > 10 || Math.abs(batteryVal) > 10 || Math.abs(gridVal) > 10) {
            flowVisual.classList.add('flow-active');
        }

        // Animace podle směru toku baterie
        if (batteryVal > 10) {
            flowVisual.classList.add('battery-charging');
            this.animateFlowParticle('battery-flow', '#4CAF50');
        } else if (batteryVal < -10) {
            flowVisual.classList.add('battery-discharging');
            this.animateFlowParticle('battery-flow', '#FF9800');
        }

        // Animace podle směru toku sítě
        if (gridVal > 10) {
            flowVisual.classList.add('grid-importing');
            this.animateFlowParticle('grid-flow', '#f44336');
            this.updateElement('grid-status', 'Import');
        } else if (gridVal < -10) {
            flowVisual.classList.add('grid-exporting');
            this.animateFlowParticle('grid-flow', '#4CAF50');
            this.updateElement('grid-status', 'Export');
        } else {
            this.updateElement('grid-status', 'Standby');
        }

        // Animace solární výroby
        if (solarVal > 10) {
            this.animateFlowParticle('solar-flow', '#FF6F00');
        }

        // Vždy animovat tok k domu (spotřeba)
        this.animateFlowParticle('house-flow', '#9C27B0');

        // Aktualizovat battery gauge
        this.updateBatteryGraphic();

        // Aktualizovat statistiky toku
        this.updateFlowStatistics(solarVal, batteryVal, gridVal);
    }

    animateFlowParticle(particleId, color) {
        const particle = document.getElementById(particleId);
        if (particle) {
            particle.setAttribute('fill', color);
            particle.setAttribute('opacity', '1');

            // Restart animace
            const animateMotion = particle.querySelector('animateMotion');
            if (animateMotion) {
                animateMotion.beginElement();
            }
        }
    }

    updateBatteryGraphic() {
        const batteryFill = document.getElementById('battery-fill');
        const percentage = parseFloat(document.getElementById('battery-percentage')?.textContent) || 0;

        if (batteryFill) {
            const fillHeight = (percentage / 100) * 40; // Max height 40
            const fillY = 60 - fillHeight; // Start from bottom

            batteryFill.setAttribute('height', fillHeight.toString());
            batteryFill.setAttribute('y', fillY.toString());

            // Barva podle úrovně
            if (percentage > 80) {
                batteryFill.setAttribute('fill', '#4CAF50');
            } else if (percentage > 30) {
                batteryFill.setAttribute('fill', '#FF9800');
            } else {
                batteryFill.setAttribute('fill', '#f44336');
            }
        }
    }

    updateFlowStatistics(solar, battery, grid) {
        // Výpočet energetické bilance
        const balance = solar + battery + grid;
        this.updateElement('energy-balance', `${balance.toFixed(0)} W`);

        // Solar efficiency (poměr k maximální možné výrobě)
        const maxSolar = 5000; // Předpokládaný max výkon
        const solarEfficiency = solar > 0 ? (solar / maxSolar * 100) : 0;
        this.updateElement('solar-efficiency', `${solarEfficiency.toFixed(0)}%`);

        // Soběstačnost v real-time
        const consumption = parseFloat(document.getElementById('house-consumption')?.textContent) || 1;
        const selfSufficiency = consumption > 0 ? Math.min(100, (solar / consumption * 100)) : 0;
        this.updateElement('self-sufficiency-flow', `${selfSufficiency.toFixed(0)}%`);
    }

    async updateBoilerData(inverterSn) {
        try {
            const [boilerTemp, boilerState, boilerFromGrid, boilerFromSolar] = await Promise.all([
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_boiler_temp`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_boiler_state`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_boiler_energy_grid_today`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_boiler_energy_solar_today`)
            ]);

            const boilerCard = document.getElementById('boiler-card');
            if (boilerTemp || boilerState) {
                boilerCard.style.display = 'block';
                this.updateElement('boiler-temp', `${boilerTemp?.state || '--'}°C`);
                this.updateElement('boiler-state', boilerState?.state || 'Neznámý');
                this.updateElement('boiler-from-grid', this.formatEnergy(boilerFromGrid?.state));
                this.updateElement('boiler-from-solar', this.formatEnergy(boilerFromSolar?.state));
            } else {
                boilerCard.style.display = 'none';
            }
        } catch (error) {
            // Bojler není dostupný
            document.getElementById('boiler-card').style.display = 'none';
        }
    }

    updateNotifications(bypassStatus, lastDataUpdate) {
        // Bypass status
        const bypassElement = document.getElementById('bypass-status');
        if (bypassElement) {
            const isActive = bypassStatus?.state === 'active' || bypassStatus?.state === 'on';
            bypassElement.textContent = isActive ? 'Aktivní ⚠️' : 'Neaktivní ✅';
            bypassElement.className = `notification-status ${isActive ? 'warning' : 'ok'}`;
        }

        // Stáří dat
        const dataAgeElement = document.getElementById('data-age');
        if (dataAgeElement && lastDataUpdate) {
            const lastUpdate = new Date(lastDataUpdate.last_changed);
            const now = new Date();
            const diffMinutes = Math.floor((now - lastUpdate) / 60000);

            let ageText = '';
            let ageClass = 'ok';

            if (diffMinutes < 2) {
                ageText = 'Čerstvá data ✅';
            } else if (diffMinutes < 10) {
                ageText = `${diffMinutes} min ⚠️`;
                ageClass = 'warning';
            } else {
                ageText = `${diffMinutes} min ❌`;
                ageClass = 'error';
            }

            dataAgeElement.textContent = ageText;
            dataAgeElement.className = `notification-status ${ageClass}`;
        }
    }

    calculateSelfSufficiency(production, consumption) {
        if (consumption === 0) return 0;
        return Math.min(100, (production / consumption * 100));
    }

    formatPrice(value) {
        if (!value || value === '--') return '-- Kč/kWh';
        return `${parseFloat(value).toFixed(2)} Kč/kWh`;
    }

    formatEnergy(value) {
        if (!value || value === '--') return '-- kWh';
        const num = parseFloat(value);
        return num > 1000 ? `${(num / 1000).toFixed(1)} kWh` : `${num.toFixed(0)} Wh`;
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('cs-CZ', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const headerUpdate = document.getElementById('header-last-update');
        if (headerUpdate) {
            headerUpdate.textContent = `${timeStr}`;
        }

        // Animovat status dot
        const statusDot = document.getElementById('status-dot');
        if (statusDot) {
            statusDot.className = 'status-dot online';
        }
    }

    initializeMiniCharts() {
        // Placeholder pro mini grafy - můžeme použít Canvas nebo SVG
        console.log('Initializing mini charts...');
    }

    addEnhancedStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Enhanced Dashboard Switcher Styles */

            .dashboard-switcher.enhanced {
                background: var(--card-background-color, white);
                border-radius: var(--ha-card-border-radius, 12px);
                box-shadow: var(--ha-card-box-shadow, 0 4px 12px rgba(0,0,0,0.1));
                margin-bottom: 20px;
                overflow: hidden;
            }

            .switcher-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background: linear-gradient(135deg, var(--primary-color, #03a9f4), #0288d1);
                color: white;
            }

            .dashboard-logo {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 600;
            }

            .logo-icon {
                font-size: 1.5em;
                filter: drop-shadow(0 0 8px rgba(255,255,255,0.5));
            }

            .dashboard-status {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.9em;
            }

            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #ffeb3b;
                animation: pulse 2s infinite;
            }

            .status-dot.online {
                background: #4caf50;
                animation: none;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            .switcher-tabs {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                background: var(--secondary-background-color, #f5f5f5);
            }

            .tab-button.enhanced {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                padding: 15px 10px;
                border: none;
                background: transparent;
                color: var(--primary-text-color, #333);
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 14px;
                position: relative;
            }

            .tab-button.enhanced:hover {
                background: var(--primary-color, #03a9f4);
                color: white;
                transform: translateY(-2px);
            }

            .tab-button.enhanced.active {
                background: var(--primary-color, #03a9f4);
                color: white;
                box-shadow: inset 0 -3px 0 rgba(255,255,255,0.3);
            }

            .tab-label {
                font-size: 12px;
                font-weight: 500;
            }

            /* Enhanced cards */
            .dashboard-container.enhanced {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 20px;
                padding: 20px;
            }

            .card {
                background: var(--card-background-color, white);
                border-radius: var(--ha-card-border-radius, 12px);
                padding: 20px;
                box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,0.1));
                border: 1px solid var(--divider-color, #e0e0e0);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, var(--primary-color, #03a9f4), #0288d1);
                transform: scaleX(0);
                transition: transform 0.3s ease;
            }

            .card:hover::before {
                transform: scaleX(1);
            }

            .card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            }

            /* Spot ceny hero */
            .spot-prices-hero {
                grid-column: 1 / -1;
                background: linear-gradient(135deg, #fff3e0, #fff8e1);
            }

            [data-theme="dark"] .spot-prices-hero {
                background: linear-gradient(135deg, #2d2d2d, #333);
            }

            .price-hero-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin: 15px 0;
            }

            .price-hero-item {
                text-align: center;
                padding: 15px;
                border-radius: 8px;
                background: rgba(255,255,255,0.7);
                border: 2px solid transparent;
                transition: all 0.3s ease;
            }

            [data-theme="dark"] .price-hero-item {
                background: rgba(0,0,0,0.3);
            }

            .price-hero-item.current {
                border-color: var(--primary-color, #03a9f4);
                transform: scale(1.02);
            }

            .price-hero-value {
                font-size: 1.8em;
                font-weight: bold;
                margin: 8px 0;
                color: var(--primary-color, #03a9f4);
            }

            /* Power flow diagram */
            .power-flow-diagram {
                display: grid;
                grid-template-areas:
                    "solar . battery"
                    ". center ."
                    "grid . .";
                grid-template-columns: 1fr 2fr 1fr;
                gap: 20px;
                padding: 20px;
                position: relative;
                min-height: 300px;
            }

            .flow-solar { grid-area: solar; }
            .flow-center { grid-area: center; }
            .flow-battery { grid-area: battery; }
            .flow-grid { grid-area: grid; }

            .flow-icon {
                font-size: 2em;
                margin-bottom: 8px;
            }

            .flow-value {
                font-size: 1.4em;
                font-weight: bold;
                color: var(--primary-color, #03a9f4);
            }

            .flow-center {
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--secondary-background-color, #f5f5f5);
                border-radius: 50%;
                aspect-ratio: 1;
            }

            .house-icon {
                font-size: 3em;
            }

            .house-consumption {
                position: absolute;
                bottom: 10px;
                font-weight: bold;
                color: var(--primary-color, #03a9f4);
            }

            /* Realtime indicator */
            .card-title-with-status {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                font-size: 1.3em;
                font-weight: 600;
            }

            .realtime-indicator {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 0.8em;
                color: #4caf50;
                font-weight: bold;
            }

            .pulse-dot {
                width: 8px;
                height: 8px;
                background: #4caf50;
                border-radius: 50%;
                animation: pulse 1.5s infinite;
            }

            /* Battery gauge */
            .battery-detailed {
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 30px;
                align-items: center;
            }

            .battery-gauge {
                width: 80px;
                height: 200px;
                background: var(--secondary-background-color, #f5f5f5);
                border-radius: 40px;
                position: relative;
                overflow: hidden;
                border: 3px solid var(--divider-color, #e0e0e0);
            }

            .gauge-fill {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: #4CAF50;
                transition: height 1s ease;
                border-radius: 0 0 37px 37px;
            }

            .gauge-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                font-weight: bold;
                color: var(--primary-text-color);
                z-index: 1;
            }

            .battery-stats {
                display: grid;
                gap: 10px;
            }

            .battery-stat {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid var(--divider-color, #e0e0e0);
            }

            /* Notifications */
            .notifications-grid {
                display: grid;
                gap: 15px;
            }

            .notification-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                border-radius: 8px;
                background: var(--secondary-background-color, #f5f5f5);
                transition: all 0.3s ease;
            }

            .notification-item:hover {
                background: var(--primary-color, #03a9f4);
                color: white;
            }

            .notification-icon {
                font-size: 1.5em;
            }

            .notification-status.warning {
                color: #ff9800;
                font-weight: bold;
            }

            .notification-status.error {
                color: #f44336;
                font-weight: bold;
            }

            .notification-status.ok {
                color: #4caf50;
                font-weight: bold;
            }

            /* Minimal view enhancements */
            .minimal-hero {
                grid-column: 1 / -1;
                text-align: center;
                padding: 20px;
                background: linear-gradient(135deg, var(--primary-color, #03a9f4), #0288d1);
                color: white;
                border-radius: 12px;
                margin-bottom: 20px;
            }

            .hero-title {
                font-size: 2em;
                font-weight: bold;
                margin-bottom: 5px;
            }

            .minimal-spot {
                grid-column: 1 / -1;
            }

            .spot-current-large {
                display: flex;
                align-items: center;
                gap: 20px;
                padding: 20px;
                background: linear-gradient(135deg, #fff8e1, #fff3e0);
                border-radius: 12px;
            }

            [data-theme="dark"] .spot-current-large {
                background: linear-gradient(135deg, #2d2d2d, #333);
            }

            .spot-price {
                font-size: 2.5em;
                font-weight: bold;
                color: var(--primary-color, #03a9f4);
            }

            .minimal-grid-enhanced {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
            }

            .minimal-item {
                text-align: center;
                padding: 20px 15px;
                border-radius: 12px;
                background: var(--secondary-background-color, #f5f5f5);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .minimal-item:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 20px rgba(0,0,0,0.15);
            }

            .minimal-item.active::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: var(--primary-color, #03a9f4);
            }

            .minimal-icon.animated {
                animation: bounce 2s infinite;
            }

            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }

            .minimal-value {
                font-size: 1.8em;
                font-weight: bold;
                color: var(--primary-color, #03a9f4);
                margin: 10px 0;
            }

            .minimal-change {
                font-size: 0.9em;
                opacity: 0.8;
                font-weight: 500;
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .dashboard-container.enhanced {
                    grid-template-columns: 1fr;
                    padding: 10px;
                    gap: 15px;
                }

                .switcher-tabs {
                    grid-template-columns: repeat(2, 1fr);
                }

                .power-flow-diagram {
                    grid-template-areas:
                        "solar battery"
                        "center center"
                        "grid grid";
                    grid-template-columns: 1fr 1fr;
                }

                .price-hero-grid {
                    grid-template-columns: 1fr;
                }

                .battery-detailed {
                    grid-template-columns: 1fr;
                    gap: 20px;
                }

                .spot-current-large {
                    flex-direction: column;
                    text-align: center;
                }
            }

            /* Flow animations */
            .flow-arrow {
                position: absolute;
                width: 2px;
                background: var(--primary-color, #03a9f4);
                opacity: 0;
                transition: opacity 0.5s ease;
            }

            .flow-arrow.flowing {
                opacity: 1;
                animation: flow 2s linear infinite;
            }

            @keyframes flow {
                0% { transform: translateY(0); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: translateY(50px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // Placeholder pro ostatní metody...
    async loadAdvancedView(container) {
        container.innerHTML = `
            <div class="view-header">
                <h1>📊 Pokročilé grafy</h1>
                <p class="view-description">Detailní analýza s grafy a predikcemi</p>
            </div>

            <div class="card wide-card">
                <div class="card-title">🔋 Battery Forecast</div>
                <div id="battery-chart" style="height: 400px;"></div>
            </div>

            <div class="card wide-card">
                <div class="card-title">☀️ Solar Forecast</div>
                <div id="solar-chart" style="height: 400px;"></div>
            </div>

            <div class="card wide-card">
                <div class="card-title">💰 Spot Prices</div>
                <div id="prices-chart" style="height: 300px;"></div>
            </div>
        `;

        await this.dashboard.loadAndRenderCharts();
    }

    async loadBatteryView(container) {
        container.innerHTML = `
            <div class="view-header">
                <h1>🔋 Baterie & Optimalizace</h1>
                <p class="view-description">Pokročilé funkce pro optimalizaci baterie</p>
            </div>

            <div class="card">
                <div class="card-title">🔮 Battery Prediction</div>
                <div class="coming-soon">
                    <p>🚧 Tato sekce je ve vývoji</p>
                    <p>Bude obsahovat pokročilé funkce pro optimalizaci baterie</p>
                </div>
            </div>
        `;
    }

    async updateMinimalData(inverterSn) {
        // Implementace pro minimální pohled
        await this.updateBasicData(inverterSn);
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Počkat na načtení OigCloudDashboard
    if (typeof OigCloudDashboard === 'undefined') {
        console.error('OigCloudDashboard class not found! Make sure dashboard.js is loaded first.');
        return;
    }

    try {
        const dashboard = new OigCloudDashboard();
        window.enhancedDashboardSwitcher = new EnhancedDashboardSwitcher(dashboard);

        const savedView = localStorage.getItem('oig_dashboard_view') || 'basic';
        if (savedView !== 'basic') {
            enhancedDashboardSwitcher.switchView(savedView);
        }

        console.log('Enhanced Dashboard Switcher initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Enhanced Dashboard Switcher:', error);

        // Fallback - zobrazit alespoň chybovou zprávu
        document.body.innerHTML = `
            <div class="error-container">
                <h1>❌ Chyba při načítání dashboardu</h1>
                <p>Nepodařilo se inicializovat enhanced dashboard switcher.</p>
                <p><strong>Chyba:</strong> ${error.message}</p>
                <p>Zkontrolujte console (F12) pro více detailů.</p>
                <button onclick="window.location.reload()">🔄 Obnovit stránku</button>
            </div>
            <style>
                .error-container {
                    max-width: 600px;
                    margin: 50px auto;
                    padding: 30px;
                    text-align: center;
                    background: #ffebee;
                    border: 2px solid #f44336;
                    border-radius: 12px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }
                .error-container h1 {
                    color: #c62828;
                    margin-bottom: 20px;
                }
                .error-container button {
                    background: #f44336;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    margin-top: 20px;
                }
                .error-container button:hover {
                    background: #d32f2f;
                }
            </style>
        `;
    }
});