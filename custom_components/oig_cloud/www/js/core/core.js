// === INVERTER SN (from api.js) ===
// INVERTER_SN is defined in dashboard-api.js (loaded before this file)

// === LAYOUT (using dashboard-layout.js module) ===
// Import layout functions
const getCurrentBreakpoint = globalThis.DashboardLayout?.getCurrentBreakpoint;
const saveLayout = globalThis.DashboardLayout?.saveLayout;
const loadLayout = globalThis.DashboardLayout?.loadLayout;
const resetLayout = globalThis.DashboardLayout?.resetLayout;
const toggleEditMode = globalThis.DashboardLayout?.toggleEditMode;

// === GLOBAL VARIABLES FOR CHART DATA ===
// Store complete dataset for extremes calculation regardless of zoom
let originalPriceData = null;

// === TOOLTIP POSITIONING ===

// === CONTROL PANEL FUNCTIONS ===

// Toggle control panel
function toggleControlPanel() {
    const panel = document.getElementById('control-panel');
    const icon = document.getElementById('panel-toggle-icon');
    panel.classList.toggle('minimized');
    icon.textContent = panel.classList.contains('minimized') ? '+' : '−';
}

function handleInteractiveKey(event) {
    if (event?.key === 'Enter' || event?.key === ' ') {
        event.preventDefault();
        event.currentTarget?.click?.();
    }
}

globalThis.handleInteractiveKey = handleInteractiveKey;

function runWhenIdle(task, timeoutMs = 2000, fallbackDelayMs = 600) {
    if (typeof globalThis.requestIdleCallback === 'function') {
        globalThis.requestIdleCallback(() => task(), { timeout: timeoutMs });
        return;
    }
    setTimeout(task, fallbackDelayMs);
}

function detectHaApp() {
    try {
        const ua = globalThis.navigator?.userAgent || '';
        return /Home Assistant|HomeAssistant/i.test(ua);
    } catch (e) {
        console.warn('[Theme] Failed to detect HA app:', e);
        return false;
    }
}

function detectMobile() {
    try {
        const ua = globalThis.navigator?.userAgent || '';
        const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
        const smallViewport = globalThis.innerWidth <= 768 || globalThis.matchMedia?.('(max-width: 768px)')?.matches;
        return mobileUA || !!smallViewport;
    } catch (e) {
        console.warn('[Theme] Failed to detect mobile runtime:', e);
        return false;
    }
}

globalThis.OIG_RUNTIME = globalThis.OIG_RUNTIME || {};
if (globalThis.OIG_RUNTIME.isHaApp === undefined) {
    globalThis.OIG_RUNTIME.isHaApp = detectHaApp();
}
if (globalThis.OIG_RUNTIME.isMobile === undefined) {
    globalThis.OIG_RUNTIME.isMobile = detectMobile();
}
if (globalThis.OIG_RUNTIME.reduceMotion === undefined) {
    const prefersReduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    globalThis.OIG_RUNTIME.reduceMotion = !!(prefersReduced || globalThis.OIG_RUNTIME.isHaApp || globalThis.OIG_RUNTIME.isMobile);
}
if (globalThis.OIG_RUNTIME.initialLoadComplete === undefined) {
    globalThis.OIG_RUNTIME.initialLoadComplete = false;
}

// === SHIELD (moved to dashboard-shield.js) ===
// Import shield functions
const subscribeToShield = globalThis.DashboardShield?.subscribeToShield;
const startShieldQueueLiveUpdate = globalThis.DashboardShield?.startShieldQueueLiveUpdate;
const stopShieldQueueLiveUpdate = globalThis.DashboardShield?.stopShieldQueueLiveUpdate;
const loadShieldData = globalThis.DashboardShield?.loadShieldData;
const debouncedShieldMonitor = globalThis.DashboardShield?.debouncedShieldMonitor;
const setShieldMode = globalThis.DashboardShield?.setShieldMode;
const setShieldModeWithConfirmation = globalThis.DashboardShield?.setShieldModeWithConfirmation;
const cancelShieldAction = globalThis.DashboardShield?.cancelShieldAction;
const loadControlPanelStatus = globalThis.DashboardShield?.loadControlPanelStatus;

// === FLOW DIAGRAM (moved to dashboard-flow.js) ===
// Import functions from DashboardFlow module
const getSensorId = globalThis.DashboardFlow?.getSensorId;
const updateTime = globalThis.DashboardFlow?.updateTime;
const debouncedDrawConnections = globalThis.DashboardFlow?.debouncedDrawConnections;
const drawConnections = globalThis.DashboardFlow?.drawConnections;
const getNodeCenters = globalThis.DashboardFlow?.getNodeCenters;
const updateNode = globalThis.DashboardFlow?.updateNode;
const updateNodeDetails = globalThis.DashboardFlow?.updateNodeDetails;
const loadData = globalThis.DashboardFlow?.loadData;
const loadNodeDetails = globalThis.DashboardFlow?.loadNodeDetails;
const forceFullRefresh = globalThis.DashboardFlow?.forceFullRefresh;
const debouncedLoadData = globalThis.DashboardFlow?.debouncedLoadData;
const debouncedLoadNodeDetails = globalThis.DashboardFlow?.debouncedLoadNodeDetails;

// Import findShieldSensorId from utils
const findShieldSensorId = globalThis.DashboardUtils?.findShieldSensorId;

// === THEME DETECTION ===

/**
 * Detekuje aktuální téma Home Assistantu a aplikuje správné styly
 */
function detectAndApplyTheme() {
    try {
        const hass = getHass();
        const bodyElement = document.body;
        let isLightTheme = resolveThemeFromHass(hass);
        if (isLightTheme === null) {
            isLightTheme = resolveThemeFromCss();
        }
        applyThemeToBody(bodyElement, isLightTheme ?? false);

    } catch (error) {
        console.error('[Theme] Error detecting theme:', error);
        // Výchozí: tmavé téma
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
    }
}

function resolveThemeFromHass(hass) {
    if (!hass?.themes) {
        console.warn('[Theme] Cannot access hass.themes, trying CSS detection');
        return null;
    }

    const selectedTheme = hass.selectedTheme || hass.themes.default_theme;
    const darkMode = hass.themes.darkMode;
    if (darkMode !== undefined) {
        return !darkMode;
    }
    if (!selectedTheme) return null;

    const themeName = selectedTheme.toLowerCase();
    if (themeName.includes('light')) return true;
    if (themeName.includes('dark')) return false;
    return null;
}

function resolveThemeFromCss() {
    try {
        const haElement = globalThis.parent?.document?.querySelector?.('home-assistant');
        if (!haElement) return null;
        const computedStyle = getComputedStyle(haElement);
        const primaryBg = computedStyle.getPropertyValue('--primary-background-color');
        if (!primaryBg) return null;
        const rgb = primaryBg.match(/\d+/g);
        if (!rgb || rgb.length < 3) return null;
        const brightness = (Number.parseInt(rgb[0]) + Number.parseInt(rgb[1]) + Number.parseInt(rgb[2])) / 3;
        console.log('[Theme] CSS detection - brightness:', brightness, '-> light:', brightness > 128);
        return brightness > 128;
    } catch (e) {
        console.warn('[Theme] CSS detection failed:', e);
        return null;
    }
}

function applyThemeToBody(bodyElement, isLightTheme) {
    if (isLightTheme) {
        bodyElement.classList.add('light-theme');
        bodyElement.classList.remove('dark-theme');
    } else {
        bodyElement.classList.add('dark-theme');
        bodyElement.classList.remove('light-theme');
    }
}

// === NUMBER ROLLING EFFECT ===
// Přidá animaci podobnou split-flap při změně textContent u vybraných prvků
function initRollingNumbers() {
    const selectors = [
        '.stat-value',
        '.day-stat-value',
        '.card .value',
        '.tile-value',
        '.price-value',
    ];

    const targets = Array.from(document.querySelectorAll(selectors.join(',')));
    if (!targets.length) {
        return;
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'characterData') {
                const el = mutation.target.parentElement;
                if (!el) return;
                el.classList.remove('rolling-change');
                // force reflow to restart animation
                el.getBoundingClientRect();
                el.classList.add('rolling-change');
            } else if (mutation.type === 'childList' && mutation.target) {
                const el = /** @type {HTMLElement} */ (mutation.target);
                el.classList.remove('rolling-change');
                el.getBoundingClientRect();
                el.classList.add('rolling-change');
            }
        });
    });

    targets.forEach((el) => {
        observer.observe(el, {
            characterData: true,
            subtree: true,
            childList: true,
        });
    });
}

// === TOOLTIP SYSTEM ===

/**
 * Globální tooltip systém - používá dedikované DOM elementy mimo flow
 * Toto řešení zaručuje správné pozicování bez ohledu na CSS transformace rodičů
 */
function initTooltips() {
    const tooltip = document.getElementById('global-tooltip');
    const arrow = document.getElementById('global-tooltip-arrow');
    const entityValues = document.querySelectorAll('.entity-value[data-tooltip], .entity-value[data-tooltip-html], .detail-value[data-tooltip-html], #battery-grid-charging-indicator[data-tooltip], #battery-grid-charging-indicator[data-tooltip-html], #balancing-planned-time-short[data-tooltip-html], #battery-balancing-indicator[data-tooltip-html]');

    if (!tooltip || !arrow) {
        console.error('[Tooltips] Global tooltip elements not found!');
        return;
    }

    entityValues.forEach(element => {
        element.addEventListener('mouseenter', function () {
            const tooltipText = this.dataset.tooltip;
            const tooltipHtml = this.dataset.tooltipHtml;

            if (!tooltipText && !tooltipHtml) return;

            // Nastavit text nebo HTML
            if (tooltipHtml) {
                tooltip.innerHTML = tooltipHtml;
            } else {
                tooltip.textContent = tooltipText;
            }

            // Získat pozici elementu v rámci viewportu
            const rect = this.getBoundingClientRect();

            // Nejprve zobrazit tooltip pro změření jeho skutečné velikosti
            tooltip.style.visibility = 'hidden';
            tooltip.style.opacity = '1';

            const tooltipRect = tooltip.getBoundingClientRect();
            const tooltipWidth = tooltipRect.width;
            const tooltipHeight = tooltipRect.height;
            const padding = 10;
            const arrowSize = 5;

            // Vypočítat pozici tooltipu
            let tooltipTop = rect.top - tooltipHeight - arrowSize - padding;
            let tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);

            // Zajistit že tooltip není mimo viewport (horizontálně)
            const viewportWidth = globalThis.innerWidth;
            if (tooltipLeft < padding) {
                tooltipLeft = padding;
            }
            if (tooltipLeft + tooltipWidth > viewportWidth - padding) {
                tooltipLeft = viewportWidth - tooltipWidth - padding;
            }

            // Kontrola zda se tooltip vejde nad element
            let isBelow = false;
            if (tooltipTop < padding) {
                // Nedostatek místa nahoře - zobrazit dole
                tooltipTop = rect.bottom + arrowSize + padding;
                isBelow = true;
            }

            // Pozice šipky - vždy uprostřed původního elementu
            const arrowLeft = rect.left + (rect.width / 2) - arrowSize;
            const arrowTop = isBelow
                ? rect.bottom + padding
                : rect.top - arrowSize - padding;

            // Aplikovat vypočítané pozice
            tooltip.style.top = `${tooltipTop}px`;
            tooltip.style.left = `${tooltipLeft}px`;
            tooltip.style.visibility = 'visible';

            arrow.style.top = `${arrowTop}px`;
            arrow.style.left = `${arrowLeft}px`;

            // Nastavit směr šipky
            if (isBelow) {
                arrow.classList.add('below');
            } else {
                arrow.classList.remove('below');
            }

            // Zobrazit tooltip a šipku
            tooltip.classList.add('visible');
            arrow.classList.add('visible');
        });

        element.addEventListener('mouseleave', function () {
            // Skrýt tooltip a šipku
            tooltip.classList.remove('visible');
            arrow.classList.remove('visible');

            // Po animaci schovat mimo obrazovku
            setTimeout(() => {
                if (!tooltip.classList.contains('visible')) {
                    tooltip.style.top = '-9999px';
                    tooltip.style.left = '-9999px';
                    arrow.style.top = '-9999px';
                    arrow.style.left = '-9999px';
                }
            }, 200); // délka CSS transition
        });
    });

    // Tooltips initialized.
}

// === GRID CHARGING (moved to dashboard-grid-charging.js) ===
const openGridChargingDialog = globalThis.DashboardGridCharging?.openGridChargingDialog;
const closeGridChargingDialog = globalThis.DashboardGridCharging?.closeGridChargingDialog;

// === INITIALIZATION ===
function init() {
    console.log('[Dashboard] Initializing...');
    const isConstrainedRuntime = !!(globalThis.OIG_RUNTIME?.isHaApp || globalThis.OIG_RUNTIME?.isMobile);

    applyReduceMotion();
    detectAndApplyTheme();
    initLayoutCustomization();
    setupControlPanelForMobile();
    initTooltips();
    initRollingNumbers();

    if (typeof initPerformanceChart === 'function') {
        initPerformanceChart();
    }

    scheduleInitialDataLoad(isConstrainedRuntime);
    startShieldSubscription(isConstrainedRuntime);
    scheduleInitialShieldLoad();
    setupThemeListeners();
}

function applyReduceMotion() {
    if (!globalThis.OIG_RUNTIME?.reduceMotion) return;
    document.body.classList.add('oig-reduce-motion');
    const particles = document.getElementById('particles');
    if (particles) {
        particles.style.display = 'none';
    }
}

function initLayoutCustomization() {
    const currentBreakpoint = getCurrentBreakpoint();
    console.log(`[Layout] Initial breakpoint: ${currentBreakpoint}`);

    const loaded = loadLayout(currentBreakpoint);
    if (loaded) {
        console.log(`[Layout] Custom ${currentBreakpoint} layout loaded`);
    } else {
        console.log(`[Layout] Using default ${currentBreakpoint} layout`);
    }

    globalThis.addEventListener('resize', handleLayoutResize);
}

function setupControlPanelForMobile() {
    if (globalThis.innerWidth > 768) return;
    const panel = document.getElementById('control-panel');
    const icon = document.getElementById('panel-toggle-icon');
    if (panel && icon) {
        panel.classList.add('minimized');
        icon.textContent = '+';
    }
}

function scheduleInitialDataLoad(isConstrainedRuntime) {
    setTimeout(() => {
        const startHeavyLoad = () => {
            forceFullRefresh();
        };
        if (isConstrainedRuntime) {
            setTimeout(() => runWhenIdle(startHeavyLoad, 3500, 1200), 200);
        } else {
            startHeavyLoad();
        }

        updateTime();
        runWhenIdle(buildExtendedTimeline, isConstrainedRuntime ? 3500 : 2500, isConstrainedRuntime ? 1200 : 900);
        loadPricingIfActive();
    }, 50);
}

function loadPricingIfActive() {
    const pricingTab = document.getElementById('pricing-tab');
    if (!pricingTab?.classList?.contains('active')) return;
    console.log('[Init] Pricing tab is active, loading initial pricing data...');
    pricingTabActive = true;
    setTimeout(() => {
        loadPricingData();
    }, 200);
}

function startShieldSubscription(isConstrainedRuntime) {
    const startShield = () => {
        subscribeToShield();
    };
    if (isConstrainedRuntime) {
        setTimeout(() => runWhenIdle(startShield, 4000, 1500), 300);
    } else {
        startShield();
    }
}

function scheduleInitialShieldLoad() {
    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = 2000;

    const tryInitialShieldLoad = () => {
        console.log(`[Shield] Attempting initial load (attempt ${retryCount + 1}/${maxRetries})...`);
        const hass = getHass();
        if (!hass?.states) {
            retryCount++;
            return retryShieldLoad(tryInitialShieldLoad, retryCount, maxRetries, retryInterval);
        }

        const activitySensorId = findShieldSensorId('service_shield_activity');
        if (!activitySensorId || !hass.states[activitySensorId]) {
            retryCount++;
            return retryShieldLoad(tryInitialShieldLoad, retryCount, maxRetries, retryInterval);
        }

        console.log('[Shield] Sensors ready, loading initial UI...');
        updateButtonStates();
        updateShieldQueue();
        updateShieldUI();
        monitorShieldActivity();
    };

    setTimeout(tryInitialShieldLoad, 1000);
}

function retryShieldLoad(retryFn, retryCount, maxRetries, retryInterval) {
    if (retryCount < maxRetries) {
        setTimeout(retryFn, retryInterval);
        return;
    }
    console.error('[Shield] Failed to load after', maxRetries, 'attempts');
    console.warn('[Shield] Falling back to 20s polling as backup');
    setInterval(() => {
        console.log('[Shield] Backup polling triggered');
        monitorShieldActivity();
        updateShieldQueue();
        updateShieldUI();
        updateButtonStates();
    }, 20000);
}

function setupThemeListeners() {
    try {
        globalThis.parent?.addEventListener?.('theme-changed', () => {
            console.log('[Theme] Theme changed event detected');
            detectAndApplyTheme();
        });
    } catch (e) {
        console.warn('[Theme] Cannot listen to parent events:', e);
    }

    globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener('change', () => {
        console.log('[Theme] System preference changed');
        detectAndApplyTheme();
    });

    globalThis.setTimeout(() => {
        detectAndApplyTheme();
    }, 1000);
}
// === TAB SWITCHING ===
let pricingTabActive = false;

function switchTab(tabName) {
    // Zapamatuj si předchozí tab PŘED změnou
    const previousActiveContent = document.querySelector('.tab-content.active');
    const previousTab = previousActiveContent ? previousActiveContent.id.replace('-tab', '') : null;

    console.log(`[Tab] Switching from '${previousTab}' to '${tabName}'`);

    // Remove active from all tabs and contents
    document.querySelectorAll('.dashboard-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active to clicked tab (find by checking which one was clicked via event)
    const clickedTab = document.querySelector(`.dashboard-tab[data-tab="${tabName}"]`);
    if (clickedTab) {
        clickedTab.classList.add('active');
    }

    // Add active to corresponding content
    const tabContent = document.getElementById(tabName + '-tab');
    if (tabContent) {
        tabContent.classList.add('active');
    }

    // Track active tab for event-driven updates
    pricingTabActive = (tabName === 'pricing');

    // OPRAVA: Při ODCHODU z tab flow (toky), zastavit particles (cleanup)
    if (previousTab === 'flow' && tabName !== 'flow') {
        console.log('[Tab] ========== LEAVING FLOW TAB - CLEANUP ==========');
        stopAllParticleFlows();
    }

    // OPRAVA: Při přepnutí NA tab flow (toky), překreslit connections a FORCE restart particles
    if (tabName === 'flow') {
        console.log('[Tab] ========== SWITCHING TO FLOW TAB ==========');

        // DŮLEŽITÉ: Počkat až se tab zobrazí a DOM se vykreslí
        setTimeout(() => {
            console.log('[Tab] --- Timeout fired, starting redraw ---');

            const flowTab = document.getElementById('flow-tab');
            console.log('[Tab] Flow tab visible?', flowTab?.classList?.contains('active'));
            console.log('[Tab] Flow tab offsetHeight:', flowTab?.offsetHeight);

            // OPRAVA: Zkontrolovat jestli je tab skutečně viditelný
            if (!flowTab?.classList?.contains('active')) {
                console.warn('[Tab] ✗ Flow tab not visible yet, aborting redraw');
                return;
            }

            // 3. Invalidovat cache pozic
            globalThis.DashboardFlow?.invalidateFlowLayoutCache?.();
            console.log('[Tab] ✓ Cache invalidated');

            // 4. Force browser reflow aby DOM byl stabilní
            if (flowTab) {
                const reflow = flowTab.offsetHeight; // Trigger reflow
                console.log('[Tab] ✓ Browser reflow triggered:', reflow, 'px');
            }

            // 5. Načíst fresh pozice node elementů
            console.log('[Tab] Getting node centers...');
            const centers = getNodeCenters();
            console.log('[Tab] Node centers result:', centers);

            // OPRAVA: Zkontrolovat jestli se pozice načetly správně
            if (!centers || Object.keys(centers).length === 0) {
                console.error('[Tab] ✗ Failed to get node centers (DOM not ready), retrying...');
                // Zkusit znovu s delším timeout
                setTimeout(() => {
                    globalThis.DashboardFlow?.invalidateFlowLayoutCache?.();
                    const retryCenters = getNodeCenters();
                    console.log('[Tab] Retry node centers result:', retryCenters);

                    if (!retryCenters || Object.keys(retryCenters).length === 0) {
                        console.error('[Tab] ✗ Retry also failed, giving up');
                        return;
                    }

                    console.log('[Tab] ✓ Node centers loaded on retry:', Object.keys(retryCenters).length);
                    drawConnections();
                    globalThis.DashboardFlow?.invalidateFlowLayoutCache?.();
                    loadData();
                    console.log('[Tab] ✓ Retry complete');
                }, 200);
                return;
            }

            // 6. Překreslit čáry (teď už máme správné pozice)
            console.log('[Tab] ✓ Node centers cached:', Object.keys(centers).length);
            console.log('[Tab] Drawing connections...');
            drawConnections();
            console.log('[Tab] ✓ Connections drawn');

            // 7. Nastavit flag pro vynucené restartování animací
            globalThis.DashboardFlow?.invalidateFlowLayoutCache?.();
            console.log('[Tab] Flag needsFlowReinitialize set to TRUE');

            // 8. Načíst aktuální data a restartovat particles
            console.log('[Tab] Loading fresh data for animations...');
            loadData(); // Načte data a zavolá animateFlow() s aktuálními hodnotami
            console.log('[Tab] ========== TOKY TAB SWITCH COMPLETE ==========');
        }, 150); // Delší timeout aby se DOM stihl vykreslit
    }

    // Load data when entering pricing tab
    if (tabName === 'pricing') {
        const tabSwitchStart = performance.now();
        console.log('[Tab] ========== SWITCHING TO PRICING TAB ==========');
        // Počkat až se tab zobrazí a canvas bude viditelný
        setTimeout(() => {
            const afterTimeout = performance.now();
            console.log(`[Pricing] Tab visible after ${(afterTimeout - tabSwitchStart).toFixed(0)}ms timeout, loading pricing data...`);
            loadPricingData();

            // Subscribe to Battery Health updates (once)
            if (typeof subscribeBatteryHealthUpdates === 'function') {
                subscribeBatteryHealthUpdates();
            }
        }, 150); // Stejný timeout jako u Toky pro konzistenci
    }

    // Load boiler dashboard when entering boiler tab
    if (tabName === 'boiler') {
        console.log('[Tab] ========== SWITCHING TO BOILER TAB ==========');
        setTimeout(() => {
            console.log('[Boiler] Tab visible, initializing boiler dashboard...');
            if (typeof initBoilerDashboard === 'function') {
                initBoilerDashboard();
            } else {
                console.error('[Boiler] initBoilerDashboard function not found');
            }
        }, 150);
    }

}

// === BOILER (enhanced in dashboard-boiler.js) ===
const loadPricingData = globalThis.DashboardPricing?.loadPricingData;
const updatePlannedConsumptionStats = globalThis.DashboardPricing?.updatePlannedConsumptionStats;
let tileDialog = null;

// === CUSTOM TILES (moved to dashboard-tiles.js) ===
const initCustomTiles = globalThis.DashboardTiles?.initCustomTiles;
const renderAllTiles = globalThis.DashboardTiles?.renderAllTiles;
const updateTileCount = globalThis.DashboardTiles?.updateTileCount;
const toggleTilesVisibility = globalThis.DashboardTiles?.toggleTilesVisibility;
const resetAllTiles = globalThis.DashboardTiles?.resetAllTiles;

/**
 * Render icon - podporuje emoji i MDI ikony
 * @param {string} icon - Icon string (emoji nebo mdi:xxx)
 * @param {string} color - Icon color
 * @returns {string} - HTML string
 */
function renderIcon(icon, color) {
    if (!icon) return '';

    // MDI ikona (formát mdi:xxx) - použít emoji fallback protože ha-icon nefunguje v iframe
    if (icon.startsWith('mdi:')) {
        const iconName = icon.substring(4); // Odstranit 'mdi:' prefix

        // Emoji mapa - stejná jako v dashboard-dialog.js
        const emojiMap = {
            // Spotřebiče
            'fridge': '❄️', 'fridge-outline': '❄️', 'dishwasher': '🍽️', 'washing-machine': '🧺',
            'tumble-dryer': '🌪️', 'stove': '🔥', 'microwave': '📦', 'coffee-maker': '☕',
            'kettle': '🫖', 'toaster': '🍞',
            // Osvětlení
            'lightbulb': '💡', 'lightbulb-outline': '💡', 'lamp': '🪔', 'ceiling-light': '💡',
            'floor-lamp': '🪔', 'led-strip': '✨', 'led-strip-variant': '✨', 'wall-sconce': '💡',
            'chandelier': '💡',
            // Vytápění
            'thermometer': '🌡️', 'thermostat': '🌡️', 'radiator': '♨️', 'radiator-disabled': '❄️',
            'heat-pump': '♨️', 'air-conditioner': '❄️', 'fan': '🌀', 'hvac': '♨️', 'fire': '🔥',
            'snowflake': '❄️',
            // Energie
            'lightning-bolt': '⚡', 'flash': '⚡', 'battery': '🔋', 'battery-charging': '🔋',
            'battery-50': '🔋', 'solar-panel': '☀️', 'solar-power': '☀️', 'meter-electric': '⚡',
            'power-plug': '🔌', 'power-socket': '🔌',
            // Auto
            'car': '🚗', 'car-electric': '🚘', 'car-battery': '🔋', 'ev-station': '🔌',
            'ev-plug-type2': '🔌', 'garage': '🏠', 'garage-open': '🏠',
            // Zabezpečení
            'door': '🚪', 'door-open': '🚪', 'lock': '🔒', 'lock-open': '🔓', 'shield-home': '🛡️',
            'cctv': '📹', 'camera': '📹', 'motion-sensor': '👁️', 'alarm-light': '🚨', 'bell': '🔔',
            // Okna
            'window-closed': '🪟', 'window-open': '🪟', 'blinds': '🪟', 'blinds-open': '🪟',
            'curtains': '🪟', 'roller-shade': '🪟',
            // Média
            'television': '📺', 'speaker': '🔊', 'speaker-wireless': '🔊', 'music': '🎵',
            'volume-high': '🔊', 'cast': '📡', 'chromecast': '📡',
            // Síť
            'router-wireless': '📡', 'wifi': '📶', 'access-point': '📡', 'lan': '🌐',
            'network': '🌐', 'home-assistant': '🏠',
            // Voda
            'water': '💧', 'water-percent': '💧', 'water-boiler': '♨️', 'water-pump': '💧',
            'shower': '🚿', 'toilet': '🚽', 'faucet': '🚰', 'pipe': '🔧',
            // Počasí
            'weather-sunny': '☀️', 'weather-cloudy': '☁️', 'weather-night': '🌙',
            'weather-rainy': '🌧️', 'weather-snowy': '❄️', 'weather-windy': '💨',
            // Ostatní
            'information': 'ℹ️', 'help-circle': '❓', 'alert-circle': '⚠️',
            'checkbox-marked-circle': '✅', 'toggle-switch': '🔘', 'power': '⚡', 'sync': '🔄'
        };

        const emoji = emojiMap[iconName] || '⚙️';
        return `<span style="font-size: 28px; color: ${color};">${emoji}</span>`;
    }

    // Emoji nebo jiný text
    return icon;
}

function getEntityState(entityId) {
    const hass = getHass();
    if (!hass?.states) {
        return { error: 'HA nedostupné' };
    }

    const state = hass.states[entityId];
    if (!state) {
        return { error: `Entita nenalezena:<br>${entityId}` };
    }

    return { hass, state };
}

function formatPowerValue(rawValue, rawUnit = '') {
    let value = rawValue;
    let unit = rawUnit;

    if (unit === 'W' || unit === 'Wh') {
        const numValue = Number.parseFloat(value);
        if (!Number.isNaN(numValue)) {
            if (Math.abs(numValue) >= 1000) {
                value = (numValue / 1000).toFixed(1);
                unit = unit === 'W' ? 'kW' : 'kWh';
            } else {
                value = Math.round(numValue);
            }
        }
    }

    return { value, unit };
}

function buildSupportEntityHtml(hass, entityId, position, side, index) {
    if (!entityId) return '';

    const supportState = hass.states[entityId];
    if (!supportState) return '';

    const { value, unit } = formatPowerValue(
        supportState.state,
        supportState.attributes.unit_of_measurement || ''
    );
    const icon = supportState.attributes.icon || '';
    const positionClass = position === 'top' ? 'tile-support-top-right' : 'tile-support-bottom-right';
    const valueId = position === 'top'
        ? `tile-${side}-${index}-support-top`
        : `tile-${side}-${index}-support-bottom`;

    return `
        <div class="tile-support ${positionClass}" onclick="event.stopPropagation(); openEntityDialog('${entityId}')">
            <span class="support-icon">${icon}</span>
            <span class="support-value" id="${valueId}">${value}${unit}</span>
        </div>
    `;
}

function buildSupportEntitiesHtml(hass, supportEntities, side, index) {
    if (!supportEntities) return '';
    const top = buildSupportEntityHtml(hass, supportEntities.top_right, 'top', side, index);
    const bottom = buildSupportEntityHtml(hass, supportEntities.bottom_right, 'bottom', side, index);
    return `${top}${bottom}`;
}

/**
 * Render entity tile content
 * @param {object} config - Entity tile config
 * @param {string} side - Tile side (left/right)
 * @param {number} index - Tile index
 * @returns {string} - HTML string
 */
function renderEntityTile(config, side, index) {
    const resolved = getEntityState(config.entity_id);
    if (resolved.error) {
        return `<div class="tile-error">${resolved.error}</div>`;
    }
    const { hass, state } = resolved;

    const label = config.label || state.attributes.friendly_name || config.entity_id;
    // Použij POUZE ikonu z config, pokud není nastavena, použij výchozí - nikdy ne z HA state
    const icon = config.icon || '📊';
    const formatted = formatPowerValue(state.state, state.attributes.unit_of_measurement || '');
    const value = formatted.value;
    const unit = formatted.unit;
    const color = config.color || '#03A9F4';

    // Podporné entity
    const supportHtml = buildSupportEntitiesHtml(hass, config.support_entities, side, index);

    // Detekce neaktivního stavu (0 W nebo 0 hodnota)
    const numericValue = Number.parseFloat(state.state);
    const isInactive = !Number.isNaN(numericValue) && numericValue === 0;
    const inactiveClass = isInactive ? ' tile-inactive' : '';

    return `
        <div class="tile-content tile-content-horizontal${inactiveClass}" style="border-left: 3px solid ${color};">
            <div class="tile-main-content">
                <div class="tile-icon-large" style="color: ${color};">${renderIcon(icon, color)}</div>
                <div class="tile-value-large" onclick="openEntityDialog('${config.entity_id}')" style="cursor: pointer;"><span id="tile-${side}-${index}-value">${value}</span><span class="tile-unit" id="tile-${side}-${index}-unit">${unit}</span></div>
            </div>
            ${supportHtml}
            <div class="tile-label-hover">${label}</div>
        </div>
    `;
}

/**
 * Render button tile content
 * @param {object} config - Button tile config
 * @param {string} side - Tile side (left/right)
 * @param {number} index - Tile index
 * @returns {string} - HTML string
 */
function renderButtonTile(config, side, index) {
    const resolved = getEntityState(config.entity_id);
    if (resolved.error) {
        return `<div class="tile-error">${resolved.error}</div>`;
    }
    const { hass, state } = resolved;

    const label = config.label || state.attributes.friendly_name || config.entity_id;
    // Použij POUZE ikonu z config, pokud není nastavena, použij výchozí - nikdy ne z HA state
    const icon = config.icon || '🔘';
    const color = config.color || '#FFC107';
    const action = config.action || 'toggle';
    const isOn = state.state === 'on';

    const buttonClass = isOn ? 'tile-button-active' : 'tile-button-inactive';

    // Popis akce pro uživatele
    const actionLabels = {
        'toggle': 'Přepnout',
        'turn_on': 'Zapnout',
        'turn_off': 'Vypnout'
    };
    const actionLabel = actionLabels[action] || 'Ovládat';

    // Podporné entity
    const supportHtml = buildSupportEntitiesHtml(hass, config.support_entities, side, index);

    return `
        <div class="tile-content tile-content-horizontal ${buttonClass}"
             style="border-left: 3px solid ${color};"
             onclick="executeTileButtonAction('${config.entity_id}', '${action}')">
            <div class="tile-main-content">
                <div class="tile-icon-large" style="color: ${color};">${renderIcon(icon, color)}</div>
                <div class="tile-button-state" id="tile-${side}-${index}-button-state">${isOn ? 'ON' : 'OFF'}</div>
            </div>
            ${supportHtml}
            <div class="tile-label-hover">${label} • ${actionLabel}</div>
        </div>
    `;
}

/**
 * Execute button action
 * @param {string} entityId - Entity ID
 * @param {string} action - Action (toggle, turn_on, turn_off)
 */
function executeTileButtonAction(entityId, action) {
    const hass = getHass();
    if (!hass) {
        console.error('[Tiles] Cannot execute action - no HA connection');
        return;
    }

    const domain = entityId.split('.')[0];
    const service = action === 'toggle' ? 'toggle' : action;

    console.log(`[Tiles] Calling ${domain}.${service} on ${entityId}`);

    hass.callService(domain, service, { entity_id: entityId })
        .then(() => {
            console.log(`[Tiles] Service call successful`);
            // Re-render tiles after state change (debounced)
            setTimeout(renderAllTiles, 500);
        })
        .catch((err) => {
            console.error(`[Tiles] Service call failed:`, err);
            alert(`Chyba při volání služby: ${err.message}`);
        });
}

// === ČHMÚ (moved to dashboard-chmu.js) ===
const updateChmuWarningBadge = globalThis.DashboardChmu?.updateChmuWarningBadge;
const toggleChmuWarningModal = globalThis.DashboardChmu?.toggleChmuWarningModal;
const openChmuWarningModal = globalThis.DashboardChmu?.openChmuWarningModal;
const closeChmuWarningModal = globalThis.DashboardChmu?.closeChmuWarningModal;

// === BATTERY & PRICING ANALYTICS (moved to modules) ===
const updateBatteryEfficiencyBar = globalThis.DashboardAnalytics?.updateBatteryEfficiencyBar;
const updateWhatIfAnalysis = globalThis.DashboardPricing?.updateWhatIfAnalysis;
const updateModeRecommendations = globalThis.DashboardPricing?.updateModeRecommendations;

// === ANALYTICS (moved to dashboard-analytics.js) ===
const initPerformanceChart = globalThis.DashboardAnalytics?.initPerformanceChart;
const updatePerformanceChart = globalThis.DashboardAnalytics?.updatePerformanceChart;
const buildYesterdayAnalysis = globalThis.DashboardAnalytics?.buildYesterdayAnalysis;
const renderYesterdayAnalysis = globalThis.DashboardAnalytics?.renderYesterdayAnalysis;

// === EXPORT TILE RENDERING FUNCTIONS FOR TILES.JS ===
globalThis.renderEntityTile = renderEntityTile;
globalThis.renderButtonTile = renderButtonTile;
globalThis.executeTileButtonAction = executeTileButtonAction;
globalThis.renderAllTiles = renderAllTiles;
