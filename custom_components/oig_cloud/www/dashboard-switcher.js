class EnhancedDashboardSwitcher {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.currentView = 'basic';
        this.views = {
            'basic': 'Základní přehled'
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
            // Pouze basic view
            await this.loadEnhancedBasicView(mainContainer);
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
            <!-- Spot ceny - prominentně nahoře s grafem -->
            <div class="card spot-prices-hero" id="spot-prices-hero">
                <div class="card-title">
                    <span class="price-icon">💰</span>
                    <span>Spot ceny elektřiny</span>
                    <div class="price-status-indicator">
                        <span class="pulse-dot"></span>
                        <span>LIVE</span>
                    </div>
                </div>

                <div class="price-hero-container">
                    <div class="price-hero-main">
                        <div class="price-hero-item current-price-main">
                            <div class="price-hero-icon">⚡</div>
                            <div class="price-hero-content">
                                <div class="price-hero-label">Aktuální cena</div>
                                <div class="price-hero-value" id="current-spot-price">-- Kč/kWh</div>
                                <div class="price-hero-trend" id="price-trend">📈 Načítám...</div>
                            </div>
                        </div>

                        <div class="price-hero-secondary">
                            <div class="price-secondary-item buy">
                                <div class="price-secondary-icon">🔌</div>
                                <div class="price-secondary-label">Nákup</div>
                                <div class="price-secondary-value" id="buy-price">-- Kč</div>
                            </div>
                            <div class="price-secondary-item sell">
                                <div class="price-secondary-icon">💡</div>
                                <div class="price-secondary-label">Výkup</div>
                                <div class="price-secondary-value" id="sell-price">-- Kč</div>
                            </div>
                        </div>
                    </div>

                    <div class="price-chart-container">
                        <div class="price-mini-chart" id="price-mini-chart">
                            <!-- Graf hodinových cen -->
                        </div>
                        <div class="price-chart-legend">
                            <span>Dnes | Zítra</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Energetické toky - nové rozložení -->
            <div class="card energy-flow-card">
                <div class="card-title-with-status">
                    <span>⚡ Energetické toky</span>
                    <div class="realtime-indicator" id="realtime-indicator">
                        <span class="pulse-dot"></span>
                        <span>LIVE</span>
                    </div>
                </div>

                <div class="energy-flow-visual-new">
                    <!-- FV nahoře - Ultra kompaktní dlaždice -->
                    <div class="energy-box solar-box-compact" id="solar-box-main">
                        <div class="tile-header">
                            <span class="tile-icon">☀️</span>
                            <span class="tile-title">FVE</span>
                            <span class="tile-badge" id="solar-efficiency-badge">--%</span>
                        </div>

                        <div class="tile-power" id="solar-total-power">-- W</div>

                        <div class="tile-section" id="solar-strings-section">
                            <div class="tile-row" id="solar-string-1-row">
                                <span class="tile-metric clickable" id="string-1-voltage" title="Klikněte pro detail napětí String 1">⚡--V</span>
                                <span class="tile-metric clickable" id="string-1-current" title="Klikněte pro detail proudu String 1">�--A</span>
                                <span class="tile-metric clickable" id="string-1-today" title="Klikněte pro detail produkce String 1 dnes">📊--</span>
                            </div>
                            <div class="tile-row" id="solar-string-2-row" style="display: none;">
                                <span class="tile-metric clickable" id="string-2-voltage" title="Klikněte pro detail napětí String 2">⚡--V</span>
                                <span class="tile-metric clickable" id="string-2-current" title="Klikněte pro detail proudu String 2">�--A</span>
                                <span class="tile-metric clickable" id="string-2-today" title="Klikněte pro detail produkce String 2 dnes">📊--</span>
                            </div>
                        </div>

                        <div class="tile-footer">
                            <span class="tile-stat clickable" id="solar-total-today" title="Klikněte pro detail celkové produkce dnes">� --</span>
                            <span class="tile-stat clickable" id="solar-forecast-tomorrow" title="Klikněte pro detail předpovědi na zítra">🔮 --</span>
                        </div>
                    </div>

                    <!-- Střední část - rozvodna a toky -->
                    <div class="energy-center-hub">
                        <div class="inverter-hub">
                            <div class="inverter-icon">
                                <svg width="50" height="35" viewBox="0 0 70 50">
                                    <rect x="5" y="10" width="60" height="30" fill="currentColor" opacity="0.1" rx="5"/>
                                    <rect x="10" y="15" width="50" height="20" fill="currentColor" opacity="0.2" rx="3"/>
                                    <circle cx="20" cy="25" r="3" fill="currentColor" opacity="0.6">
                                        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
                                    </circle>
                                    <circle cx="30" cy="25" r="3" fill="currentColor" opacity="0.6">
                                        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" delay="0.5s" repeatCount="indefinite"/>
                                    </circle>
                                    <circle cx="40" cy="25" r="3" fill="currentColor" opacity="0.6">
                                        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" delay="1s" repeatCount="indefinite"/>
                                    </circle>
                                    <circle cx="50" cy="25" r="3" fill="currentColor" opacity="0.6">
                                        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" delay="1.5s" repeatCount="indefinite"/>
                                    </circle>
                                    <rect x="15" y="30" width="40" height="2" fill="currentColor" opacity="0.3"/>
                                </svg>
                            </div>
                            <div class="inverter-label">INVERTER</div>
                            <div class="inverter-status-display" id="inverter-status">Online</div>
                        </div>

                        <!-- Síť vlevo - Ultra kompaktní dlaždice -->
                        <div class="energy-box grid-box-compact" id="grid-box-main">
                            <div class="tile-header">
                                <span class="tile-icon">⚡</span>
                                <span class="tile-title">Síť</span>
                                <span class="tile-badge" id="grid-direction-badge">--</span>
                            </div>

                            <div class="tile-power" id="grid-power-display">-- W</div>

                            <div class="tile-price" id="grid-price-display">
                                <span class="tile-metric clickable" title="Klikněte pro detail aktuální ceny">💰 -- Kč/kWh</span>
                            </div>

                            <div class="tile-section">
                                <div class="tile-row">
                                    <span class="tile-metric clickable" id="grid-phase-l1" title="Výkon fáze L1">L1: --W</span>
                                    <span class="tile-metric clickable" id="grid-phase-l2" title="Výkon fáze L2">L2: --W</span>
                                </div>
                                <div class="tile-row">
                                    <span class="tile-metric clickable" id="grid-phase-l3" title="Výkon fáze L3">L3: --W</span>
                                    <span class="tile-metric clickable" id="grid-voltage-freq" title="Napětí a frekvence sítě">🔌 --V --Hz</span>
                                </div>
                            </div>

                            <div class="tile-section tile-flows">
                                <div class="tile-row">
                                    <span class="tile-label">⬇️ Odběr:</span>
                                    <span class="tile-metric clickable" id="grid-import-today" title="Celkem odebralo ze sítě dnes">--</span>
                                </div>
                                <div class="tile-row">
                                    <span class="tile-label">⬆️ Dodávka:</span>
                                    <span class="tile-metric clickable" id="grid-export-today" title="Celkem dodalo do sítě dnes">--</span>
                                </div>
                            </div>
                        </div>

                        <!-- Spotřeba/Dům vpravo - Ultra kompaktní dlaždice -->
                        <div class="energy-box consumption-box-compact" id="consumption-box-main">
                            <div class="tile-header">
                                <span class="tile-icon">🏠</span>
                                <span class="tile-title">Dům</span>
                            </div>

                            <div class="tile-power" id="consumption-power-display">-- W</div>

                            <div class="tile-section">
                                <div class="tile-row">
                                    <span class="tile-metric clickable" id="consumption-phase-l1" title="Spotřeba fáze L1">L1: --W</span>
                                    <span class="tile-metric clickable" id="consumption-phase-l2" title="Spotřeba fáze L2">L2: --W</span>
                                </div>
                                <div class="tile-row">
                                    <span class="tile-metric clickable" id="consumption-phase-l3" title="Spotřeba fáze L3">L3: --W</span>
                                    <span class="tile-metric clickable" id="consumption-today" title="Celková spotřeba dnes">📊 --</span>
                                </div>
                            </div>

                            <!-- Bojler sekce - zobrazí se jen pokud je aktivní -->
                            <div class="tile-section tile-boiler" id="boiler-section" style="display: none;">
                                <div class="tile-row tile-boiler-header">
                                    <span class="tile-icon">🔥</span>
                                    <span class="tile-metric clickable" id="boiler-power" title="Aktuální výkon bojleru">--W</span>
                                    <span class="tile-metric clickable" id="boiler-temp" title="Teplota bojleru">--°C</span>
                                </div>
                                <div class="tile-row">
                                    <span class="tile-label">Nabito:</span>
                                    <span class="tile-metric clickable" id="boiler-solar" title="Bojler nabito ze slunce">☀️--</span>
                                    <span class="tile-metric clickable" id="boiler-grid" title="Bojler nabito ze sítě">⚡--</span>
                                    <span class="tile-sum" id="boiler-total">(↑--)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Baterie dole - Ultra kompaktní dlaždice -->
                    <div class="energy-box battery-box-compact" id="battery-box-main">
                        <div class="tile-header">
                            <span class="tile-icon">🔋</span>
                            <span class="tile-title">Baterie</span>
                            <span class="tile-badge" id="battery-percentage">--%</span>
                        </div>

                        <div class="tile-power-row">
                            <span class="tile-power" id="battery-power">-- W</span>
                            <span class="tile-time" id="battery-time-info">--</span>
                        </div>

                        <div class="tile-section">
                            <div class="tile-row">
                                <span class="tile-metric clickable" id="battery-voltage" title="Klikněte pro detail napětí baterie">⚡--V</span>
                                <span class="tile-metric clickable" id="battery-current" title="Klikněte pro detail proudu baterie">🔌--A</span>
                                <span class="tile-metric clickable" id="battery-temperature" title="Klikněte pro detail teploty baterie">🌡️--°C</span>
                            </div>
                            <div class="tile-row">
                                <span class="tile-metric clickable" id="battery-remaining-capacity" title="Zbývající kapacita / Celková kapacita">�--</span>
                                <span class="tile-metric" id="battery-total-capacity">/--kWh</span>
                            </div>
                        </div>

                        <div class="tile-section tile-flows">
                            <div class="tile-row">
                                <span class="tile-label">⬆️ Nabito:</span>
                                <span class="tile-metric clickable" id="battery-charged-solar" title="Nabito ze slunce dnes">☀️--</span>
                                <span class="tile-metric clickable" id="battery-charged-grid" title="Nabito ze sítě dnes">⚡--</span>
                                <span class="tile-sum" id="battery-charged-total">(↑--)</span>
                            </div>
                            <div class="tile-row">
                                <span class="tile-label">⬇️ Vybito:</span>
                                <span class="tile-metric clickable" id="battery-discharged-today" title="Celkem vybito dnes">📉--</span>
                            </div>
                        </div>
                    </div>

                    <div class="hidden-backup">
                        <div class="battery-detail-item">
                            <div class="battery-detail-icon">🔄</div>
                                <div class="battery-detail-content">
                                    <div class="battery-detail-label">Cykly</div>
                                    <div class="battery-detail-value" id="battery-cycles">--</div>
                                </div>
                            </div>

                            <div class="battery-detail-item">
                                <div class="battery-detail-icon">🏥</div>
                                <div class="battery-detail-content">
                                    <div class="battery-detail-label">Zdraví</div>
                                    <div class="battery-detail-value" id="battery-health">--%</div>
                                </div>
                            </div>
                        </div>

                        <div class="energy-flow-arrows battery-arrows">
                            <div class="arrow arrow-up" id="battery-arrow">
                                <svg width="20" height="30" viewBox="0 0 20 30">
                                    <path d="M10 25 L10 10 M5 15 L10 10 L15 15" stroke="currentColor" stroke-width="2" fill="none"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Statistiky s hlavními ukazateli -->
                <div class="flow-stats-enhanced">
                    <div class="stat-card energy-balance-card">
                        <div class="stat-card-header">
                            <span class="stat-icon">⚖️</span>
                            <span class="stat-title">Energetická bilance</span>
                        </div>
                        <div class="stat-card-value" id="energy-balance-main">-- W</div>
                        <div class="stat-card-trend" id="energy-balance-trend">--</div>
                    </div>

                    <div class="stat-card self-sufficiency-card">
                        <div class="stat-card-header">
                            <span class="stat-icon">🎯</span>
                            <span class="stat-title">Soběstačnost</span>
                        </div>
                        <div class="stat-card-value" id="self-sufficiency-main">--%</div>
                        <div class="stat-card-subtitle">dnes</div>
                    </div>

                    <div class="stat-card efficiency-card">
                        <div class="stat-card-header">
                            <span class="stat-icon">📊</span>
                            <span class="stat-title">Účinnost FVE</span>
                        </div>
                        <div class="stat-card-value" id="solar-efficiency-main">--%</div>
                        <div class="stat-card-subtitle">ze špičky</div>
                    </div>

                    <div class="stat-card savings-card">
                        <div class="stat-card-header">
                            <span class="stat-icon">💰</span>
                            <span class="stat-title">Úspora dnes</span>
                        </div>
                        <div class="stat-card-value" id="daily-savings">-- Kč</div>
                        <div class="stat-card-subtitle">vs síť</div>
                    </div>
                </div>
            </div>

            <!-- Rychlé statistiky dne -->
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

    async updateSolarStringsData(inverterSn, totalPower) {
        try {
            const [
                string1Power, string2Power,
                string1Voltage, string2Voltage,
                string1Current, string2Current,
                totalToday,
                forecastString1, forecastString2
            ] = await Promise.all([
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_actual_fv_p1`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_actual_fv_p2`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_extended_fve_voltage_1`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_extended_fve_voltage_2`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_extended_fve_current_1`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_extended_fve_current_2`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_dc_in_fv_ad`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_solar_forecast_string1`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_solar_forecast_string2`)
            ]);

            const voltage1 = parseFloat(string1Voltage?.state || 0);
            const voltage2 = parseFloat(string2Voltage?.state || 0);
            const current1 = parseFloat(string1Current?.state || 0);
            const current2 = parseFloat(string2Current?.state || 0);

            // Auto-detekce: String 2 existuje pokud má jakoukoliv nenulovou hodnotu
            const hasString2 = voltage2 > 0 || current2 > 0;

            // Formát kompaktní hodnoty
            const fmt = (val, unit) => val > 0 ? `${val.toFixed(val >= 10 ? 0 : 1)}${unit}` : `--${unit}`;
            const fmtE = (val) => {
                const num = parseFloat(val || 0);
                return num >= 1 ? `${num.toFixed(1)}kWh` : `${(num * 1000).toFixed(0)}Wh`;
            };

            // Update celkový výkon a účinnost
            this.updateElement('solar-total-power', `${totalPower.toFixed(0)} W`);
            const efficiency = this.calculateSolarEfficiency(totalPower);
            this.updateElement('solar-efficiency-badge', `${efficiency.toFixed(0)}%`);

            // Update String 1 (vždy)
            this.updateElement('string-1-voltage', fmt(voltage1, 'V'));
            this.updateElement('string-1-current', fmt(current1, 'A'));
            this.updateElement('string-1-today', '--'); // Denní součty stringů neexistují

            // Nastavit entity IDs pro kliknutí
            this.makeEntityClickable('string-1-voltage', `sensor.oig_${inverterSn}_extended_fve_voltage_1`, 'Napětí String 1 - klikněte pro historii a detaily');
            this.makeEntityClickable('string-1-current', `sensor.oig_${inverterSn}_extended_fve_current_1`, 'Proud String 1 - klikněte pro historii a detaily');

            // Update String 2 (pokud existuje)
            const string2Row = document.getElementById('solar-string-2-row');
            if (hasString2) {
                string2Row.style.display = 'flex';
                this.updateElement('string-2-voltage', fmt(voltage2, 'V'));
                this.updateElement('string-2-current', fmt(current2, 'A'));
                this.updateElement('string-2-today', '--'); // Denní součty stringů neexistují

                this.makeEntityClickable('string-2-voltage', `sensor.oig_${inverterSn}_extended_fve_voltage_2`, 'Napětí String 2 - klikněte pro historii a detaily');
                this.makeEntityClickable('string-2-current', `sensor.oig_${inverterSn}_extended_fve_current_2`, 'Proud String 2 - klikněte pro historii a detaily');
            } else {
                string2Row.style.display = 'none';
            }

            // Výpočet předpovědi na zítra (součet z obou stringů)
            const forecastTomorrow1 = parseFloat(forecastString1?.attributes?.tomorrow_sum_kw || 0);
            const forecastTomorrow2 = parseFloat(forecastString2?.attributes?.tomorrow_sum_kw || 0);
            const totalForecastTomorrow = forecastTomorrow1 + forecastTomorrow2;

            // Update footer statistiky
            this.updateElement('solar-total-today', `📊 ${fmtE(totalToday?.state)}`);
            this.updateElement('solar-forecast-tomorrow', `🔮 ${totalForecastTomorrow > 0 ? fmtE(totalForecastTomorrow) : '--'}`);

            this.makeEntityClickable('solar-total-today', `sensor.oig_${inverterSn}_dc_in_fv_ad`, 'Celková produkce dnes - klikněte pro historii');
            if (totalForecastTomorrow > 0) {
                this.makeEntityClickable('solar-forecast-tomorrow', `sensor.oig_${inverterSn}_solar_forecast_string1`, 'Předpověď na zítra - klikněte pro detaily');
            }

        } catch (error) {
            console.error('Error updating solar strings data:', error);
        }
    }

    updateSolarString(stringNumber, data) {
        const { power, voltage, current, today, forecast } = data;

        // Vypočítat účinnost stringu (0-100%)
        const maxPowerPerString = 2500; // Předpokládaný max výkon na string
        const efficiency = Math.min(100, (power / maxPowerPerString) * 100);

        // Aktualizovat hodnoty
        this.updateElement(`string-${stringNumber}-power`, `${power.toFixed(0)} W`);
        this.updateElement(`string-${stringNumber}-voltage`, `${voltage.toFixed(1)} V`);
        this.updateElement(`string-${stringNumber}-current`, `${current.toFixed(2)} A`);
        this.updateElement(`string-${stringNumber}-today`, `${today.toFixed(2)} kWh`);
        this.updateElement(`string-${stringNumber}-forecast`, `${forecast.toFixed(1)} kWh`);
        this.updateElement(`string-${stringNumber}-efficiency`, `${efficiency.toFixed(0)}%`);

        // Aplikovat gradient podle účinnosti
        const stringCard = document.getElementById(`solar-string-${stringNumber}`);
        if (stringCard) {
            // Odstranit staré data-efficiency atributy
            stringCard.removeAttribute('data-efficiency');

            // Nastavit nový podle rozsahu
            if (efficiency < 10) {
                stringCard.setAttribute('data-efficiency', '0');
            } else if (efficiency < 35) {
                stringCard.setAttribute('data-efficiency', '25');
            } else if (efficiency < 65) {
                stringCard.setAttribute('data-efficiency', '50');
            } else if (efficiency < 90) {
                stringCard.setAttribute('data-efficiency', '75');
            } else {
                stringCard.setAttribute('data-efficiency', '100');
            }

            // Dynamický inline gradient pro jemnější přechody
            const grayColor = 'rgb(158, 158, 158)';
            const yellowColor = 'rgb(255, 213, 79)';

            // Interpolace mezi šedou a žlutou
            const ratio = efficiency / 100;
            const r = Math.round(158 + (255 - 158) * ratio);
            const g = Math.round(158 + (213 - 158) * ratio);
            const b = Math.round(158 + (79 - 158) * ratio);

            const r2 = Math.round(117 + (255 - 117) * ratio);
            const g2 = Math.round(117 + (193 - 117) * ratio);
            const b2 = Math.round(117 + (7 - 117) * ratio);

            stringCard.style.background = `linear-gradient(135deg, rgb(${r}, ${g}, ${b}), rgb(${r2}, ${g2}, ${b2}))`;
        }
    }

    async updateBatteryData(inverterSn, batteryPower, batteryPercent) {
        try {
            // Načíst všechna data baterie - použít extended_ senzory
            const [
                voltage, current, remainingCapacity,
                chargedFromGrid, chargedFromSolar, dischargedToday, temperature
            ] = await Promise.all([
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_extended_battery_voltage`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_extended_battery_current`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_remaining_usable_capacity`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_computed_batt_charge_grid_energy_today`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_computed_batt_charge_fve_energy_today`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_computed_batt_discharge_energy_today`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_extended_battery_temperature`)
            ]);

            // Data jsou načtená, ale v basic view se používají jen pro gauge
            // Žádné updateElement() volání - basic view má vlastní update v updateBasicData()

            console.log('✅ Battery data loaded (used for gauge in basic view)');

        } catch (error) {
            console.error('Error updating battery data:', error);
        }
    }

    async updateGridData(inverterSn) {
        try {
            const [
                gridTotal, gridL1, gridL2, gridL3,
                spotPrice, buyPrice, sellPrice,
                gridImportToday, gridExportToday
            ] = await Promise.all([
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_actual_aci_wtotal`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_actual_aci_wr`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_actual_aci_ws`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_actual_aci_wt`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_spot_price_current_czk_kwh`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_spot_price_current_15min`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_export_price_current_15min`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_extended_grid_consumption`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_extended_grid_delivery`)
            ]);

            const fmt = (val, unit) => val != null && val !== '--' ? `${parseFloat(val).toFixed(0)}${unit}` : `--${unit}`;
            const fmtE = (val) => {
                if (!val || val === '--') return '--';
                const num = parseFloat(val);
                return num >= 1 ? `${num.toFixed(1)}kWh` : `${(num * 1000).toFixed(0)}Wh`;
            };
            const fmtPrice = (val) => val != null ? `${parseFloat(val).toFixed(2)} Kč/kWh` : '-- Kč/kWh';

            // Update hlavní výkon a směr
            const totalPower = parseFloat(gridTotal?.state || 0);
            this.updateElement('grid-power-display', `${Math.abs(totalPower).toFixed(0)} W`);

            const directionBadge = document.getElementById('grid-direction-badge');
            if (directionBadge) {
                if (totalPower > 10) {
                    directionBadge.textContent = '📥 Import';
                    directionBadge.className = 'tile-badge grid-import';
                } else if (totalPower < -10) {
                    directionBadge.textContent = '📤 Export';
                    directionBadge.className = 'tile-badge grid-export';
                } else {
                    directionBadge.textContent = '⏸️ Standby';
                    directionBadge.className = 'tile-badge';
                }
            }

            // Update fáze
            this.updateElement('grid-phase-l1', `L1: ${fmt(gridL1?.state, 'W')}`);
            this.updateElement('grid-phase-l2', `L2: ${fmt(gridL2?.state, 'W')}`);
            this.updateElement('grid-phase-l3', `L3: ${fmt(gridL3?.state, 'W')}`);

            // Update spot ceny v existujícím elementu
            const priceDisplay = document.getElementById('grid-price-display');
            if (priceDisplay) {
                priceDisplay.innerHTML = `<span class="tile-metric clickable" id="grid-spot-price" title="Klikněte pro detail aktuální ceny">💰 ${fmtPrice(spotPrice?.state)}</span>`;
            }

            // Update denní součty
            this.updateElement('grid-import-today', `📥 ${fmtE(gridImportToday?.state)}`);
            this.updateElement('grid-export-today', `📤 ${fmtE(gridExportToday?.state)}`);

            // Nastavit clickable entity
            this.makeEntityClickable('grid-power-display', `sensor.oig_${inverterSn}_actual_aci_wtotal`, 'Celkový výkon sítě - klikněte pro historii');
            this.makeEntityClickable('grid-phase-l1', `sensor.oig_${inverterSn}_actual_aci_wr`, 'Fáze L1 - klikněte pro historii');
            this.makeEntityClickable('grid-phase-l2', `sensor.oig_${inverterSn}_actual_aci_ws`, 'Fáze L2 - klikněte pro historii');
            this.makeEntityClickable('grid-phase-l3', `sensor.oig_${inverterSn}_actual_aci_wt`, 'Fáze L3 - klikněte pro historii');
            this.makeEntityClickable('grid-spot-price', `sensor.oig_${inverterSn}_spot_price_current_czk_kwh`, 'Aktuální spot cena - klikněte pro detail');
            this.makeEntityClickable('grid-import-today', `sensor.oig_${inverterSn}_extended_grid_consumption`, 'Denní odběr ze sítě - klikněte pro historii');
            this.makeEntityClickable('grid-export-today', `sensor.oig_${inverterSn}_extended_grid_delivery`, 'Denní dodávka do sítě - klikněte pro historii');

        } catch (error) {
            console.error('Error updating grid data:', error);
        }
    }

    async updateConsumptionData(inverterSn) {
        try {
            const [
                totalConsumption,
                phaseL1, phaseL2, phaseL3,
                consumptionToday,
                boilerPower, boilerToday, boilerMode, boilerExists
            ] = await Promise.all([
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_actual_aco_p`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_extended_load_l1_power`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_extended_load_l2_power`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_extended_load_l3_power`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_ac_out_en_day`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_boiler_current_cbb_w`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_boiler_day_w`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_boiler_manual_mode`),
                this.dashboard.getSensorData(`sensor.oig_${inverterSn}_boiler_is_use`)
            ]);

            const fmt = (val, unit) => val != null && val !== '--' ? `${parseFloat(val).toFixed(0)}${unit}` : `--${unit}`;
            const fmtE = (val) => {
                if (!val || val === '--') return '--';
                const num = parseFloat(val);
                return num >= 1 ? `${num.toFixed(1)}kWh` : `${(num * 1000).toFixed(0)}Wh`;
            };

            // Update celkový výkon
            this.updateElement('consumption-power-display', `${parseFloat(totalConsumption?.state || 0).toFixed(0)} W`);

            // Update fáze
            this.updateElement('consumption-phase-l1', `L1: ${fmt(phaseL1?.state, 'W')}`);
            this.updateElement('consumption-phase-l2', `L2: ${fmt(phaseL2?.state, 'W')}`);
            this.updateElement('consumption-phase-l3', `L3: ${fmt(phaseL3?.state, 'W')}`);

            // Update denní spotřebu
            this.updateElement('consumption-today', `📊 ${fmtE(consumptionToday?.state)}`);

            // Update boiler sekce
            const hasBoiler = boilerExists?.state === 'on' || boilerExists?.state === true;
            const boilerSection = document.getElementById('consumption-boiler-section');
            if (boilerSection) {
                if (hasBoiler) {
                    boilerSection.style.display = 'flex';
                    this.updateElement('boiler-power', `💧 ${fmt(boilerPower?.state, 'W')}`);
                    this.updateElement('boiler-today', `📊 ${fmtE(boilerToday?.state)}`);
                    const mode = boilerMode?.state || 'auto';
                    this.updateElement('boiler-mode', `⚙️ ${mode}`);

                    this.makeEntityClickable('boiler-power', `sensor.oig_${inverterSn}_boiler_current_cbb_w`, 'Aktuální výkon bojleru');
                    this.makeEntityClickable('boiler-today', `sensor.oig_${inverterSn}_boiler_day_w`, 'Denní nabití bojleru');
                    this.makeEntityClickable('boiler-mode', `sensor.oig_${inverterSn}_boiler_manual_mode`, 'Režim bojleru');
                } else {
                    boilerSection.style.display = 'none';
                }
            }

            // Nastavit clickable entity
            this.makeEntityClickable('consumption-power-display', `sensor.oig_${inverterSn}_actual_aco_p`, 'Celková spotřeba - klikněte pro historii');
            this.makeEntityClickable('consumption-phase-l1', `sensor.oig_${inverterSn}_extended_load_l1_power`, 'Fáze L1 - klikněte pro historii');
            this.makeEntityClickable('consumption-phase-l2', `sensor.oig_${inverterSn}_extended_load_l2_power`, 'Fáze L2 - klikněte pro historii');
            this.makeEntityClickable('consumption-phase-l3', `sensor.oig_${inverterSn}_extended_load_l3_power`, 'Fáze L3 - klikněte pro historii');
            this.makeEntityClickable('consumption-today', `sensor.oig_${inverterSn}_ac_out_en_day`, 'Denní spotřeba - klikněte pro historii');

        } catch (error) {
            console.error('Error updating consumption data:', error);
        }
    }

    updateEnhancedFlowAnimations(solar, battery, grid, consumption) {
        // Aktualizovat šipky podle směru toku
        const solarArrow = document.getElementById('solar-arrow');
        const gridArrow = document.getElementById('grid-arrow');
        const consumptionArrow = document.getElementById('consumption-arrow');
        const batteryArrow = document.getElementById('battery-arrow');

        // Solar šipka - vždy dolů když svítí
        if (solarArrow) {
            if (solar > 10) {
                solarArrow.style.opacity = '1';
                solarArrow.style.animation = 'arrowPulse 2s ease-in-out infinite';
            } else {
                solarArrow.style.opacity = '0.3';
                solarArrow.style.animation = 'none';
            }
        }

        // Grid šipka - podle směru
        if (gridArrow) {
            if (Math.abs(grid) > 10) {
                gridArrow.style.opacity = '1';
                gridArrow.style.animation = 'arrowPulse 2s ease-in-out infinite';
                // Otočit podle směru
                if (grid > 0) {
                    gridArrow.style.transform = 'scaleX(1)'; // Import - šipka vpravo
                } else {
                    gridArrow.style.transform = 'scaleX(-1)'; // Export - šipka vlevo
                }
            } else {
                gridArrow.style.opacity = '0.3';
                gridArrow.style.animation = 'none';
            }
        }

        // Consumption šipka - vždy vlevo když je spotřeba
        if (consumptionArrow) {
            if (consumption > 10) {
                consumptionArrow.style.opacity = '1';
                consumptionArrow.style.animation = 'arrowPulse 2s ease-in-out infinite';
            } else {
                consumptionArrow.style.opacity = '0.3';
                consumptionArrow.style.animation = 'none';
            }
        }

        // Battery šipka - podle směru
        if (batteryArrow) {
            if (Math.abs(battery) > 10) {
                batteryArrow.style.opacity = '1';
                batteryArrow.style.animation = 'arrowPulse 2s ease-in-out infinite';
                // Otočit podle směru
                if (battery > 0) {
                    batteryArrow.style.transform = 'scaleY(-1)'; // Nabíjení - šipka nahoru
                } else {
                    batteryArrow.style.transform = 'scaleY(1)'; // Vybíjení - šipka dolů
                }
            } else {
                batteryArrow.style.opacity = '0.3';
                batteryArrow.style.animation = 'none';
            }
        }
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