// === EXISTING FUNCTIONS ===

// NOTE: Analytics/Pricing/CHMU functions are called directly via globalThis.Dashboard*
// to avoid load-order dependency issues (flow.js loads before analytics.js)

// Get sensor entity ID
function getSensorId(sensor) {
    return `sensor.oig_${INVERTER_SN}_${sensor}`;
}

// Find shield sensor dynamically (may have suffix like _2, _3)
// Lazy load from utils to avoid load-time dependency
function findShieldSensorId(sensorName) {
    return globalThis.DashboardUtils?.findShieldSensorId?.(sensorName) || `sensor.oig_${INVERTER_SN}_${sensorName}`;
}

// Update time
function updateTime() {
    const now = new Date();
    document.getElementById('current-time').textContent = now.toLocaleTimeString('cs-CZ');
}

// Debouncing timers
let drawConnectionsTimeout = null;
let loadDataTimer = null;
let loadDetailsTimer = null;

function safeClearTimeout(timerId) {
    try {
        if (timerId) clearTimeout(timerId);
    } catch (e) {
        // Firefox can throw NS_ERROR_NOT_INITIALIZED if the document/window is being torn down.
        console.warn('[Flow] Failed to clear timeout', e);
    }
}

function safeSetTimeout(fn, delay) {
    try {
        return setTimeout(() => {
            try {
                if (document?.body) fn();
            } catch (e) {
                console.warn('[Flow] Timeout callback failed', e);
            }
        }, delay);
    } catch (e) {
        // Firefox can throw NS_ERROR_NOT_INITIALIZED if the document/window is being torn down.
        console.warn('[Flow] Failed to set timeout', e);
        return null;
    }
}

// Debounced version of drawConnections to prevent excessive redraws
function debouncedDrawConnections(delay = 100) {
    if (drawConnectionsTimeout) {
        safeClearTimeout(drawConnectionsTimeout);
    }
    drawConnectionsTimeout = safeSetTimeout(() => {
        drawConnections();
        drawConnectionsTimeout = null;
    }, delay);
}

// Debounced loadData() - prevents excessive calls
function debouncedLoadData() {
    if (loadDataTimer) safeClearTimeout(loadDataTimer);
    loadDataTimer = safeSetTimeout(() => {
        loadData();
    }, 200); // Wait 200ms before executing
}

// Debounced loadNodeDetails() - prevents excessive calls
function debouncedLoadNodeDetails() {
    if (loadDetailsTimer) safeClearTimeout(loadDetailsTimer);
    loadDetailsTimer = safeSetTimeout(() => {
        loadNodeDetails();
    }, 500); // Wait 500ms before executing
}

// Draw connection lines
function drawConnections() {
    const svg = document.getElementById('connections');
    if (!svg) return; // Guard: SVG neexistuje

    svg.innerHTML = '';

    // OPRAVA BUG #2: Použít cache místo přepočítávání
    const centers = FLOW_STATE.cachedNodeCenters || getNodeCenters();
    if (!centers) return;

    // Draw lines
    const connections = [
        { from: 'solar', to: 'inverter', color: '#ffd54f' },
        { from: 'battery', to: 'inverter', color: '#4caf50' },
        { from: 'inverter', to: 'grid', color: '#42a5f5' },
        { from: 'inverter', to: 'house', color: '#f06292' }
    ];

    connections.forEach(conn => {
        if (!centers[conn.from] || !centers[conn.to]) return; // Skip if node missing

        const from = centers[conn.from];
        const to = centers[conn.to];

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', from.x);
        line.setAttribute('y1', from.y);
        line.setAttribute('x2', to.x);
        line.setAttribute('y2', to.y);
        line.setAttribute('stroke', conn.color);
        line.classList.add('flow-line');
        svg.appendChild(line);
    });
}

// Create flow particle with optional delay for multiple particles
function createParticle(from, to, color, speed = 2000, delay = 0) {
    if (!from || !to) return;

    setTimeout(() => {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.background = color;
        particle.style.left = from.x + 'px';
        particle.style.top = from.y + 'px';

        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return; // Guard: container neexistuje

        particlesContainer.appendChild(particle);

        particle.animate([
            { left: from.x + 'px', top: from.y + 'px', opacity: 0 },
            { opacity: 1, offset: 0.1 },
            { opacity: 1, offset: 0.9 },
            { left: to.x + 'px', top: to.y + 'px', opacity: 0 }
        ], {
            duration: speed,
            easing: 'linear'
        }).onfinish = () => particle.remove();
    }, delay);
}

// ========================================
// FLOW ANIMATION v2.0 - Multi-layer particles
// ========================================

// Maxima pro normalizaci intenzity (Watt)
const FLOW_MAXIMUMS = {
    solar: 5400,      // 5.4 kW
    battery: 7000,    // 7 kW
    grid: 17000,      // 17 kW
    house: 10000      // 10 kW
};

// Barevné konstanty
const FLOW_COLORS = {
    solar: '#ffd54f',       // Žlutá
    battery: '#ff9800',     // Oranžová
    grid_import: '#f44336', // Červená (odběr)
    grid_export: '#4caf50', // Zelená (dodávka)
    house: '#f06292'        // Růžová (fallback)
};

// Globální stav pro kontinuální animaci kuliček
// Nový formát: podporuje multi-source flows
const particleFlows = {
    solarToInverter: { active: false, speed: 2000, count: 0, sources: [] },
    batteryToInverter: { active: false, speed: 2000, count: 0, sources: [] },
    inverterToBattery: { active: false, speed: 2000, count: 0, sources: [] },
    gridToInverter: { active: false, speed: 2000, count: 0, sources: [] },
    inverterToGrid: { active: false, speed: 2000, count: 0, sources: [] },
    inverterToHouse: { active: false, speed: 2000, count: 0, sources: [] }
};

const FLOW_STATE = globalThis.OIG_FLOW_STATE ?? (globalThis.OIG_FLOW_STATE = {
    cachedNodeCenters: null,
    lastLayoutHash: null,
    needsFlowReinitialize: false
});

/**
 * Vyčistí všechny sub-flow klíče pro daný flow
 * @param {string} flowKey - Hlavní klíč toku
 */
function cleanupSubFlows(flowKey) {
    Object.keys(particleFlows).forEach(key => {
        if (key.startsWith(flowKey + '_')) {
            particleFlows[key].active = false;
            delete particleFlows[key];
        }
    });
}

/**
 * OPRAVA ÚNIK PAMĚTI: Zastaví a vyčistí VŠECHNY particle flows včetně animací
 * Toto je kritická funkce pro prevenci memory leaks při dlouhém běhu dashboardu
 */
function stopAllParticleFlows() {
    console.log('[Particles] 🧹 Stopping all particle flows and cleaning up...');

    // 1. Zastavit všechny flows a SMAZAT je z objektu
    let flowCount = 0;
    Object.keys(particleFlows).forEach(key => {
        particleFlows[key].active = false;
        delete particleFlows[key];
        flowCount++;
    });

    console.log(`[Particles] ✓ Stopped ${flowCount} flows`);

    // 2. Vyčistit DOM a zrušit běžící animace
    const container = document.getElementById('particles');
    if (container) {
        const particles = container.querySelectorAll('.particle');
        const particleCount = particles.length;

        // Explicitně zrušit všechny Web Animation API animace
        particles.forEach(particle => {
            const animations = particle.getAnimations();
            animations.forEach(anim => {
                try {
                    anim.cancel();
                } catch (e) {
                    console.warn('[Particles] Failed to cancel animation', e);
                }
            });
            particle.remove();
        });

        // Finální vyčištění kontejneru
        container.innerHTML = '';

        console.log(`[Particles] ✓ Cleaned ${particleCount} particles from DOM`);
    } else {
        console.warn('[Particles] ⚠️ Particles container not found');
    }

    // 3. Reinicializovat základní flow objekty (ale neaktivní)
    const baseFlows = ['solarToInverter', 'batteryToInverter', 'inverterToBattery',
                       'gridToInverter', 'inverterToGrid', 'inverterToHouse'];
    baseFlows.forEach(flowKey => {
        particleFlows[flowKey] = { active: false, speed: 2000, count: 0, sources: [] };
    });

    console.log('[Particles] ✓ Particle flows cleaned and reinitialized');
}

/**
 * Aktualizovat všechny particle flows po změně layoutu.
 * Zastaví všechny běžící flows a vynutí reinicializaci s novými pozicemi nodes.
 */
function updateAllParticleFlows() {
    console.log('[Layout] 🔄 Updating all particle flows after layout change...');

    // DŮLEŽITÉ: Zastavit VŠECHNY běžící particles okamžitě
    stopAllParticleFlows();

    invalidateFlowLayoutCache();

    // NEBUDEME spouštět animateFlow okamžitě - necháme to na normální update cyklus
    // Tím zajistíme že particles dostanou správné pozice z getNodeCenters()

    console.log('[Layout] ✓ All particles stopped, waiting for next data update to reinitialize');
}

function invalidateFlowLayoutCache() {
    FLOW_STATE.cachedNodeCenters = null;
    FLOW_STATE.lastLayoutHash = null;
    FLOW_STATE.needsFlowReinitialize = true;
}

/**
 * DEBUGGING: Vypíše aktuální stav paměti a počet kuliček
 * Volitelné - použij v konzoli nebo pro monitoring
 */
function logParticleMemoryStats() {
    const container = document.getElementById('particles');
    const particleCount = container ? container.children.length : 0;
    const flowCount = Object.keys(particleFlows).length;
    const activeFlows = Object.keys(particleFlows).filter(k => particleFlows[k]?.active).length;

    console.log('═══════════════════════════════════════');
    console.log('📊 PARTICLE MEMORY STATS');
    console.log('═══════════════════════════════════════');
    console.log(`🔵 Particles in DOM: ${particleCount}`);
    console.log(`📦 Flow objects: ${flowCount} (${activeFlows} active)`);

    if (performance.memory) {
        const heapMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(2);
        const limitMB = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2);
        const percentage = ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(1);
        console.log(`💾 Heap used: ${heapMB} MB / ${limitMB} MB (${percentage}%)`);
    }

    console.log('═══════════════════════════════════════');

    return { particleCount, flowCount, activeFlows };
}

// Globální funkce pro debugging - můžeš volat z konzole
globalThis.logParticleStats = logParticleMemoryStats;
globalThis.cleanupParticles = stopAllParticleFlows;

// Cache pro smoothing rychlosti - zabraňuje náhlým skokům
const speedCache = {};

async function updatePlannerModeBadge(force = false) {
    const badge = document.getElementById('planner-mode-badge');
    if (!badge) {
        return;
    }

    const data = globalThis.PlannerState
        ? await globalThis.PlannerState.fetchSettings(force)
        : null;
    let newState = 'unknown';
    if (data) {
        newState = data.auto_mode_switch_enabled ? 'enabled' : 'disabled';
    }
    let labelText = 'Plánovač: N/A';
    if (data) {
        labelText = newState === 'enabled' ? 'Plánovač: AUTO' : 'Plánovač: MANUÁL';
    }

    if (typeof updateElementIfChanged === 'function') {
        updateElementIfChanged('planner-mode-badge', labelText, 'planner-mode-badge-text');
    } else if (badge.textContent !== labelText) {
        badge.textContent = labelText;
    }

    if (badge.dataset.modeState !== newState) {
        let className = 'auto-unknown';
        if (newState === 'enabled') {
            className = 'auto-enabled';
        } else if (newState === 'disabled') {
            className = 'auto-disabled';
        }
        badge.classList.remove('auto-enabled', 'auto-disabled', 'auto-unknown');
        badge.classList.add(className);
        badge.dataset.modeState = newState;
    }
}

/**
 * Vypočítá parametry toku podle výkonu a maxima s VYHLAZENÍM rychlosti
 * @param {number} power - Výkon v W (může být záporný)
 * @param {number} maximum - Maximální výkon v W
 * @param {string} flowKey - Klíč toku pro cachování rychlosti
 * @returns {object} { active, intensity, count, speed, size, opacity }
 */
function calculateFlowParams(power, maximum, flowKey = null) {
    const absPower = Math.abs(power);
    const intensity = Math.min(100, (absPower / maximum) * 100);

    // Vypočítat cílovou rychlost
    const targetSpeed = Math.max(500, Math.round(3500 - (intensity * 30))); // 3500-500ms

    // OPRAVA: Smoothing rychlosti - zabraňuje náhlým skokům
    let finalSpeed = targetSpeed;
    if (flowKey && speedCache[flowKey] !== undefined) {
        // Exponential moving average (alpha = 0.3 = 30% nová hodnota, 70% stará)
        const alpha = 0.3;
        finalSpeed = Math.round(alpha * targetSpeed + (1 - alpha) * speedCache[flowKey]);

        // Pokud je rozdíl menší než 100ms, použít starou hodnotu (prevent jitter)
        if (Math.abs(finalSpeed - speedCache[flowKey]) < 100) {
            finalSpeed = speedCache[flowKey];
        }
    }

    // Uložit do cache
    if (flowKey) {
        speedCache[flowKey] = finalSpeed;
    }

    return {
        active: absPower >= 50,  // Práh: 50W (citlivější než 500W)
        intensity: intensity,
        count: Math.max(1, Math.min(4, Math.ceil(1 + intensity / 33))), // 1-4 kuličky
        speed: finalSpeed,                                               // Vyhlazená rychlost
        size: Math.round(6 + (intensity / 10)),                         // 6-16px
        opacity: Math.min(1, 0.3 + (intensity / 150))                   // 0.3-1
    };
}

/**
 * Vytvoří kontinuální tok kuliček - když jedna doběhne, vytvoří se nová
 * @param {string} flowKey - Klíč toku (např. 'solarToInverter')
 * @param {object} from - Pozice začátku {x, y}
 * @param {object} to - Pozice konce {x, y}
 * @param {string} color - Barva kuličky
 * @param {number} speed - Rychlost animace (ms)
 * @param {number} size - Velikost kuličky (px)
 * @param {number} opacity - Průhlednost (0-1)
 */
function createContinuousParticle(flowKey, from, to, color, speed, size = 8, opacity = 1) {
    const flow = particleFlows[flowKey];
    if (!flow?.active || !from || !to) return;

    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.background = color;

    // OPRAVA: Konstantní velikost - žádná náhodná variace (eliminuje vizuální chaos)
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.borderRadius = '50%';

    // Blur pro rychlé toky
    if (speed < 1500) {
        particle.style.filter = 'blur(0.5px)';
    }

    particle.style.left = from.x + 'px';
    particle.style.top = from.y + 'px';

    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    // OPRAVA ÚNIK PAMĚTI: Kontrola max počtu kuliček v DOM (prevence exponenciálního růstu)
    const currentParticleCount = particlesContainer.children.length;
    if (currentParticleCount > 50) {
        console.warn(`[Particles] ⚠️ Too many particles (${currentParticleCount}), skipping creation for flow: ${flowKey}`);
        return;
    }

    particlesContainer.appendChild(particle);

    const animation = particle.animate([
        { left: from.x + 'px', top: from.y + 'px', opacity: 0 },
        { opacity: opacity, offset: 0.1 },
        { opacity: opacity, offset: 0.9 },
        { left: to.x + 'px', top: to.y + 'px', opacity: 0 }
    ], {
        duration: speed,
        easing: 'linear'
    });

    animation.onfinish = () => {
        // OPRAVA ÚNIK PAMĚTI: Explicitně zrušit animaci před odstraněním elementu
        try {
            animation.cancel();
        } catch (e) {
            console.warn('[Particles] Failed to cancel animation on finish', e);
        }
        particle.remove();

        // OPRAVA: Zkontrolovat že flow je stále aktivní PŘED vytvořením nové kuličky
        // Tím zabráníme "zombie" kuličkám když se flow zastaví
        const flow = particleFlows[flowKey];
        if (flow?.active) {
            // Použít AKTUÁLNÍ rychlost z flow objektu (může se změnit během animace)
            createContinuousParticle(flowKey, from, to, color, flow.speed, size, opacity);
        }
    };
}

function areSourcesEqual(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((source, index) => {
        const other = right[index];
        return !!other &&
            source.type === other.type &&
            source.power === other.power &&
            source.color === other.color;
    });
}

function cloneSources(sources) {
    return Array.isArray(sources) ? sources.map(source => ({ ...source })) : [];
}

/**
 * Vytvoří multi-source flow s kuličkami různých barev
 * @param {string} flowKey - Klíč toku
 * @param {object} params - Parametry toku
 */
function updateMultiSourceFlow(flowKey, params) {
    const flow = particleFlows[flowKey];
    if (!flow) return;

    const {
        from,
        to,
        sources = [],
        totalPower = 0,
        speed,
        size,
        opacity
    } = params || {};

    // Zastavit starý flow pokud se změnily zdroje nebo rychlost
    const sourcesChanged = !areSourcesEqual(flow.sources, sources);
    const speedChanged = flow.speed !== speed;

    if (sourcesChanged || speedChanged) {
        // OPRAVA: Zastavit VŠECHNY staré sub-flow klíče
        cleanupSubFlows(flowKey);

        flow.active = false;
        flow.sources = cloneSources(sources);

        // Restart po malém delaye
        setTimeout(() => {
            flow.active = true;
            flow.speed = speed;

            // Pro každý zdroj vytvořit kuličky podle poměru
            let cumulativeDelay = 0;
            const scheduledSources = cloneSources(sources);
            if (!totalPower || scheduledSources.length === 0) return;
            const totalCount = Math.max(1, Math.min(4, Math.ceil(scheduledSources.length + totalPower / 2000)));

            scheduledSources.forEach(source => {
                const ratio = source.power / totalPower;
                const sourceCount = Math.max(1, Math.round(totalCount * ratio));

                for (let i = 0; i < sourceCount; i++) {
                    const particleKey = `${flowKey}_${source.type}_${i}`;
                    particleFlows[particleKey] = {
                        active: true,
                        speed: speed,
                        sources: [source]
                    };

                    setTimeout(() => {
                        createContinuousParticle(
                            particleKey,
                            from, to,
                            source.color,
                            speed,
                            size,
                            opacity
                        );
                    }, cumulativeDelay);

                    cumulativeDelay += speed / totalCount / 2;
                }
            });
        }, 100);
    }
}

// Spustí nebo zastaví kontinuální tok kuliček (simple single-color flow)
function updateParticleFlow(flowKey, params) {
    const flow = particleFlows[flowKey];
    if (!flow) return;

    const {
        from,
        to,
        color,
        active,
        speed,
        count = 1,
        size = 8,
        opacity = 1
    } = params || {};

    const wasActive = flow.active;
    const previousCount = flow.count;
    const countChanged = previousCount !== count;
    const speedChanged = Math.abs(flow.speed - speed) > 150; // OPRAVA: Tolerace ±150ms pro prevenci zbytečných restartů

    // OPRAVA: Pokud se mění počet kuliček NEBO výrazně rychlost, musíme restartovat flow
    // ALE: Nebudeme zastavovat existující kuličky - nechť doběhnou přirozeně
    if (active && wasActive && (countChanged || speedChanged)) {
        // Místo zastavení starých jen aktualizujeme parametry
        flow.speed = speed;
        flow.count = count;

        // Pokud se změnil počet, přidáme/ubereme kuličky
        if (countChanged) {
            console.log(`[Particles] Count changed for ${flowKey}: ${previousCount} -> ${count}`);
            // Starý count byl flow.count, nový je count
            const diff = count - previousCount;

            if (diff > 0) {
                // Přidat kuličky
                const delayBetweenParticles = speed / count / 2;
                for (let i = 0; i < diff; i++) {
                    setTimeout(() => {
                        if (flow.active) { // Double-check že flow je stále aktivní
                            createContinuousParticle(flowKey, from, to, color, speed, size, opacity);
                        }
                    }, i * delayBetweenParticles);
                }
            }
            // Pokud diff < 0 (ubrat kuličky), kuličky se zastaví přirozeně když onfinish zjistí jiný count
        }

        return;
    }

    flow.active = active;
    flow.speed = speed;
    flow.count = count;

    if (active && !wasActive) {
        // Spustit nové toky s odstupem
        const delayBetweenParticles = speed / count / 2;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                createContinuousParticle(flowKey, from, to, color, speed, size, opacity);
            }, i * delayBetweenParticles);
        }
    }
    // Pokud je active=false, kuličky se zastaví samy (rekurze se ukončí)
}

/**
 * Vypočítat barvu kuličky podle zdrojů energie.
 *
 * @param {number} solarRatio - Poměr solární energie (0-1)
 * @param {number} gridRatio - Poměr energie ze sítě (0-1)
 * @param {number} batteryRatio - Poměr energie z baterie (0-1, jen pro spotřebu)
 * @returns {string} CSS gradient nebo jednolitá barva
 */
function getEnergySourceColor(solarRatio, gridRatio, batteryRatio = 0) {
    const SOLAR_COLOR = '#ffd54f';   // Žlutá
    const GRID_COLOR = '#42a5f5';    // Modrá
    const BATTERY_COLOR = '#ff9800'; // Oranžová

    // Normalize ratios (pokud se nesečtou na 1)
    const total = solarRatio + gridRatio + batteryRatio;
    if (total > 0) {
        solarRatio = solarRatio / total;
        gridRatio = gridRatio / total;
        batteryRatio = batteryRatio / total;
    }

    // Práh pro "čistý" zdroj (>95%)
    const PURE_THRESHOLD = 0.95;

    // Pokud je jeden zdroj dominantní, použij čistou barvu
    if (solarRatio > PURE_THRESHOLD) return SOLAR_COLOR;
    if (gridRatio > PURE_THRESHOLD) return GRID_COLOR;
    if (batteryRatio > PURE_THRESHOLD) return BATTERY_COLOR;

    // Vytvořit gradient podle poměrů
    if (batteryRatio > 0) {
        // 3 zdroje (pro spotřebu)
        if (solarRatio > 0.05 && gridRatio > 0.05 && batteryRatio > 0.05) {
            // Všechny 3 zdroje
            const solarPct = (solarRatio * 100).toFixed(0);
            const gridPct = ((solarRatio + gridRatio) * 100).toFixed(0);
            return `linear-gradient(135deg, ${SOLAR_COLOR} 0%, ${SOLAR_COLOR} ${solarPct}%, ${GRID_COLOR} ${solarPct}%, ${GRID_COLOR} ${gridPct}%, ${BATTERY_COLOR} ${gridPct}%, ${BATTERY_COLOR} 100%)`;
        }
        if (solarRatio > 0.05 && batteryRatio > 0.05) {
            // Solár + baterie
            const solarPct = (solarRatio * 100).toFixed(0);
            return `linear-gradient(135deg, ${SOLAR_COLOR} 0%, ${SOLAR_COLOR} ${solarPct}%, ${BATTERY_COLOR} ${solarPct}%, ${BATTERY_COLOR} 100%)`;
        }
        if (gridRatio > 0.05 && batteryRatio > 0.05) {
            // Grid + baterie
            const gridPct = (gridRatio * 100).toFixed(0);
            return `linear-gradient(135deg, ${GRID_COLOR} 0%, ${GRID_COLOR} ${gridPct}%, ${BATTERY_COLOR} ${gridPct}%, ${BATTERY_COLOR} 100%)`;
        }
    } else if (solarRatio > 0.05 && gridRatio > 0.05) {
        // 2 zdroje (pro nabíjení baterie)
        const solarPct = (solarRatio * 100).toFixed(0);
        return `linear-gradient(135deg, ${SOLAR_COLOR} 0%, ${SOLAR_COLOR} ${solarPct}%, ${GRID_COLOR} ${solarPct}%, ${GRID_COLOR} 100%)`;
    }

    // Fallback na dominantní barvu
    if (solarRatio >= gridRatio && solarRatio >= batteryRatio) return SOLAR_COLOR;
    if (gridRatio >= batteryRatio) return GRID_COLOR;
    return BATTERY_COLOR;
}

// Global cache for node positions
// OPRAVA BUG #4: Cache pro power hodnoty
let lastPowerValues = null;

// Prevent overlapping refreshes (iOS WebView can freeze during HA initial state burst)
let loadDataInProgress = false;
let loadDataPending = false;
let loadNodeDetailsInProgress = false;
let loadNodeDetailsPending = false;

// Calculate layout hash to detect changes
function getLayoutHash() {
    const solar = document.querySelector('.solar');
    const battery = document.querySelector('.battery');
    const inverter = document.querySelector('.inverter');
    const grid = document.querySelector('.grid-node');
    const house = document.querySelector('.house');
    const canvas = document.querySelector('.flow-canvas');

    if (!solar || !battery || !inverter || !grid || !house || !canvas) return null;

    // Use coordinates relative to the canvas.
    // On mobile WebViews (incl. HA app), viewport chrome show/hide triggers frequent resize/scroll
    // which changes getBoundingClientRect() top/left but *not* the layout inside the canvas.
    const canvasRect = canvas.getBoundingClientRect();

    // Hash based on relative geometry.
    // IMPORTANT: Do NOT include textContent length; it changes frequently during updates and
    // would cause unnecessary particle restarts (especially painful on iOS WebView).
    const hash = [solar, battery, inverter, grid, house]
        .map(el => {
            const rect = el.getBoundingClientRect();
            const relLeft = rect.left - canvasRect.left;
            const relTop = rect.top - canvasRect.top;
            return `${Math.round(relLeft)},${Math.round(relTop)},${Math.round(rect.width)},${Math.round(rect.height)}`;
        })
        .join('|');

    return hash;
}

// Get cached or fresh node centers
function getNodeCenters() {
    const currentHash = getLayoutHash();

    // If layout hasn't changed, return cached centers
    if (currentHash === FLOW_STATE.lastLayoutHash && FLOW_STATE.cachedNodeCenters) {
        return FLOW_STATE.cachedNodeCenters;
    }

    // Layout changed - recalculate
    const canvas = document.querySelector('.flow-canvas');
    if (!canvas) return null;

    const nodes = {
        solar: document.querySelector('.solar'),
        battery: document.querySelector('.battery'),
        inverter: document.querySelector('.inverter'),
        grid: document.querySelector('.grid-node'),
        house: document.querySelector('.house')
    };

    function getCenter(el) {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        // Get canvas scale factor
        const canvasStyle = globalThis.getComputedStyle(canvas);
        const transform = canvasStyle.transform;
        let scale = 1;
        if (transform && transform !== 'none') {
            const matrix = /matrix\(([^)]+)\)/.exec(transform);
            if (matrix?.[1]) {
                const values = matrix[1].split(',');
                scale = Number.parseFloat(values[0]) || 1;
            }
        }

        return {
            x: (rect.left + rect.width / 2 - canvasRect.left) / scale,
            y: (rect.top + rect.height / 2 - canvasRect.top) / scale
        };
    }

    const centers = {
        solar: getCenter(nodes.solar),
        battery: getCenter(nodes.battery),
        inverter: getCenter(nodes.inverter),
        grid: getCenter(nodes.grid),
        house: getCenter(nodes.house)
    };

    // Detect meaningful center movement (avoid restarting particles on tiny shifts).
    const prev = FLOW_STATE.cachedNodeCenters;
    const centerShift = (a, b) => {
        if (!a || !b) return 0;
        const dx = (a.x || 0) - (b.x || 0);
        const dy = (a.y || 0) - (b.y || 0);
        return Math.hypot(dx, dy);
    };
    const maxShift = prev
        ? Math.max(
            centerShift(prev.solar, centers.solar),
            centerShift(prev.battery, centers.battery),
            centerShift(prev.inverter, centers.inverter),
            centerShift(prev.grid, centers.grid),
            centerShift(prev.house, centers.house),
        )
        : 999;
    const layoutChanged = currentHash !== FLOW_STATE.lastLayoutHash;

    // Cache the results
    FLOW_STATE.cachedNodeCenters = centers;
    FLOW_STATE.lastLayoutHash = currentHash;

    // OPRAVA: Pokud se layout změnil, vyčistit VŠECHNY particles
    // protože mají hardcodované staré cílové pozice v animacích
    if (layoutChanged && currentHash && maxShift >= 12) {
        console.log('[Layout] Layout changed, stopping all particles and redrawing connections');

        // Zastavit všechny běžící particles (mají staré pozice)
        if (typeof stopAllParticleFlows === 'function') {
            stopAllParticleFlows();
        }

        // Nastavit flag pro reinicializaci
        FLOW_STATE.needsFlowReinitialize = true;

        // Překreslit čáry s novými pozicemi
        debouncedDrawConnections(50);
    }

    return centers;
}

function stopFlowAndCleanup(flowKey, params) {
    updateParticleFlow(flowKey, {
        ...params,
        active: false,
        count: 0
    });
    cleanupSubFlows(flowKey);
}

function maybeCleanupParticlesOnPowerChange(current, previous, threshold = 2000) {
    if (!previous) return;

    const changes = {
        solar: Math.abs(current.solarPower - (previous.solarPower || 0)),
        battery: Math.abs(current.batteryPower - (previous.batteryPower || 0)),
        grid: Math.abs(current.gridPower - (previous.gridPower || 0)),
        house: Math.abs(current.housePower - (previous.housePower || 0))
    };

    const significantChange = Object.values(changes).some(change => change > threshold);
    if (!significantChange) return;

    console.log(`[Particles] 🔄 Significant power change detected (S:${changes.solar}W B:${changes.battery}W G:${changes.grid}W H:${changes.house}W), cleaning up...`);
    const container = document.getElementById('particles');
    if (container && container.children.length > 10) {
        // Vyčistit jen pokud je více než 10 kuliček (aby se to nevolalo zbytečně)
        stopAllParticleFlows();
        // Po cleanup nastavit flag pro reinicializaci (už je nastaven v loadData, ale pro jistotu)
        FLOW_STATE.needsFlowReinitialize = true;
    }
}

function buildBatteryChargeSources(solarPower, gridPower, batteryPower) {
    const sources = [];
    let solarToBattery = 0;
    let gridToBattery = 0;

    if (solarPower > 0) {
        solarToBattery = Math.min(solarPower, batteryPower);
    }

    const remaining = batteryPower - solarToBattery;
    if (remaining > 50 && gridPower > 0) {
        gridToBattery = remaining;
    }

    if (solarToBattery > 50) {
        sources.push({ type: 'solar', power: solarToBattery, color: FLOW_COLORS.solar });
    }
    if (gridToBattery > 50) {
        sources.push({ type: 'grid', power: gridToBattery, color: FLOW_COLORS.grid_import });
    }

    return sources;
}

function buildGridExportSources(solarPower, batteryPower, gridExportPower) {
    let solarToGrid = 0;
    let batteryToGrid = 0;

    // Solár co nejde do baterie ani domu může jít do gridu
    const solarUsed = Math.max(0, batteryPower);
    const solarAvailableForGrid = Math.max(0, solarPower - solarUsed);

    solarToGrid = Math.min(solarAvailableForGrid, gridExportPower);

    const remaining = gridExportPower - solarToGrid;
    if (remaining > 50 && batteryPower < 0) {
        // Zbytek z baterie
        batteryToGrid = Math.min(Math.abs(batteryPower), remaining);
    }

    const sources = [];
    if (solarToGrid > 50) {
        sources.push({ type: 'solar', power: solarToGrid, color: FLOW_COLORS.solar });
    }
    if (batteryToGrid > 50) {
        sources.push({ type: 'battery', power: batteryToGrid, color: FLOW_COLORS.battery });
    }

    return sources;
}

function buildHouseSources(solarPower, batteryPower, gridPower, housePower) {
    // 1. Kolik energie baterie poskytuje/odebírá
    const batteryContribution = batteryPower < 0 ? Math.abs(batteryPower) : 0;

    // 2. Kolik soláru je dostupné pro dům
    // Solár může jít do: baterie (nabíjení) + dům + grid (přebytek)
    const solarAvailable = batteryPower > 0
        ? Math.max(0, solarPower - batteryPower)
        : solarPower;

    // 3. Kolik gridu potřebujeme
    // Grid pokrývá to, co solár + baterie nezvládnou
    const solarAndBattery = solarAvailable + batteryContribution;
    const gridNeeded = housePower > solarAndBattery && gridPower > 0
        ? Math.min(gridPower, housePower - solarAndBattery)
        : 0;

    // Přiřadit zdroje k domu
    const solarToHouse = Math.min(solarAvailable, housePower);
    const houseRemaining = housePower - solarToHouse;
    const batteryToHouse = houseRemaining > 0
        ? Math.min(batteryContribution, houseRemaining)
        : 0;
    const stillRemaining = houseRemaining - batteryToHouse;
    const gridToHouse = stillRemaining > 0
        ? Math.min(gridNeeded, stillRemaining)
        : 0;

    const sources = [];
    if (solarToHouse > 50) {
        sources.push({ type: 'solar', power: solarToHouse, color: FLOW_COLORS.solar });
    }
    if (batteryToHouse > 50) {
        sources.push({ type: 'battery', power: batteryToHouse, color: FLOW_COLORS.battery });
    }
    if (gridToHouse > 50) {
        sources.push({ type: 'grid', power: gridToHouse, color: FLOW_COLORS.grid_import });
    }

    return sources;
}

function updateSolarFlow(centers, solarPower) {
    const solarParams = calculateFlowParams(solarPower, FLOW_MAXIMUMS.solar, 'solarToInverter');
    updateParticleFlow('solarToInverter', {
        from: centers.solar,
        to: centers.inverter,
        color: FLOW_COLORS.solar,
        active: solarParams.active,
        speed: solarParams.speed,
        count: solarParams.count,
        size: solarParams.size,
        opacity: solarParams.opacity
    });
}

function updateBatteryFlow(centers, solarPower, batteryPower, gridPower) {
    const batteryAbsPower = Math.abs(batteryPower);
    const batteryParams = calculateFlowParams(
        batteryAbsPower,
        FLOW_MAXIMUMS.battery,
        batteryPower > 0 ? 'inverterToBattery' : 'batteryToInverter'
    );

    stopFlowAndCleanup('batteryToInverter', {
        from: centers.battery,
        to: centers.inverter,
        color: FLOW_COLORS.battery,
        speed: batteryParams.speed
    });
    stopFlowAndCleanup('inverterToBattery', {
        from: centers.inverter,
        to: centers.battery,
        color: FLOW_COLORS.solar,
        speed: batteryParams.speed
    });

    if (!batteryParams.active) {
        return;
    }

    if (batteryPower > 0) {
        // ===== NABÍJENÍ BATERIE =====
        // Vypočítat zdroje: solar + grid
        const sources = buildBatteryChargeSources(solarPower, gridPower, batteryPower);

        if (sources.length > 1) {
            // Multi-source: použít novou funkci
            updateMultiSourceFlow('inverterToBattery', {
                from: centers.inverter,
                to: centers.battery,
                sources,
                totalPower: batteryPower,
                speed: batteryParams.speed,
                size: batteryParams.size,
                opacity: batteryParams.opacity
            });
        } else {
            // Single source: vyčistit staré sub-flows a použít starou funkci
            cleanupSubFlows('inverterToBattery');
            const color = sources.length > 0 ? sources[0].color : FLOW_COLORS.solar;
            updateParticleFlow('inverterToBattery', {
                from: centers.inverter,
                to: centers.battery,
                color,
                active: true,
                speed: batteryParams.speed,
                count: batteryParams.count,
                size: batteryParams.size,
                opacity: batteryParams.opacity
            });
        }
    } else {
        // ===== VYBÍJENÍ BATERIE =====
        // Vždy oranžová
        updateParticleFlow('batteryToInverter', {
            from: centers.battery,
            to: centers.inverter,
            color: FLOW_COLORS.battery,
            active: true,
            speed: batteryParams.speed,
            count: batteryParams.count,
            size: batteryParams.size,
            opacity: batteryParams.opacity
        });
    }
}

function updateGridFlow(centers, solarPower, batteryPower, gridPower) {
    const gridAbsPower = Math.abs(gridPower);
    const gridParams = calculateFlowParams(
        gridAbsPower,
        FLOW_MAXIMUMS.grid,
        gridPower > 0 ? 'gridToInverter' : 'inverterToGrid'
    );

    stopFlowAndCleanup('gridToInverter', {
        from: centers.grid,
        to: centers.inverter,
        color: FLOW_COLORS.grid_import,
        speed: gridParams.speed
    });
    stopFlowAndCleanup('inverterToGrid', {
        from: centers.inverter,
        to: centers.grid,
        color: FLOW_COLORS.grid_export,
        speed: gridParams.speed
    });

    if (!gridParams.active) {
        return;
    }

    if (gridPower > 0) {
        // ===== ODBĚR ZE SÍTĚ =====
        updateParticleFlow('gridToInverter', {
            from: centers.grid,
            to: centers.inverter,
            color: FLOW_COLORS.grid_import,
            active: true,
            speed: gridParams.speed,
            count: gridParams.count,
            size: gridParams.size,
            opacity: gridParams.opacity
        });
        return;
    }

    // ===== DODÁVKA DO SÍTĚ =====
    const gridExportPower = Math.abs(gridPower);
    const sources = buildGridExportSources(solarPower, batteryPower, gridExportPower);

    if (sources.length > 1) {
        updateMultiSourceFlow('inverterToGrid', {
            from: centers.inverter,
            to: centers.grid,
            sources,
            totalPower: gridExportPower,
            speed: gridParams.speed,
            size: gridParams.size,
            opacity: gridParams.opacity
        });
        return;
    }

    cleanupSubFlows('inverterToGrid');
    const color = sources.length > 0 ? sources[0].color : FLOW_COLORS.grid_export;
    updateParticleFlow('inverterToGrid', {
        from: centers.inverter,
        to: centers.grid,
        color,
        active: true,
        speed: gridParams.speed,
        count: gridParams.count,
        size: gridParams.size,
        opacity: gridParams.opacity
    });
}

function updateHouseFlow(centers, solarPower, batteryPower, gridPower, housePower) {
    const houseParams = calculateFlowParams(housePower, FLOW_MAXIMUMS.house, 'inverterToHouse');

    if (!houseParams.active || housePower <= 0) {
        stopFlowAndCleanup('inverterToHouse', {
            from: centers.inverter,
            to: centers.house,
            color: FLOW_COLORS.house,
            speed: houseParams.speed
        });
        return;
    }

    const sources = buildHouseSources(solarPower, batteryPower, gridPower, housePower);

    if (sources.length > 1) {
        updateMultiSourceFlow('inverterToHouse', {
            from: centers.inverter,
            to: centers.house,
            sources,
            totalPower: housePower,
            speed: houseParams.speed,
            size: houseParams.size,
            opacity: houseParams.opacity
        });
        return;
    }

    cleanupSubFlows('inverterToHouse');
    const color = sources.length > 0 ? sources[0].color : FLOW_COLORS.house;
    updateParticleFlow('inverterToHouse', {
        from: centers.inverter,
        to: centers.house,
        color,
        active: true,
        speed: houseParams.speed,
        count: houseParams.count,
        size: houseParams.size,
        opacity: houseParams.opacity
    });
}

// Animate particles - v2.0 with continuous normalization
function animateFlow(data) {
    const runtime = globalThis.OIG_RUNTIME || {};
    if (runtime.reduceMotion) {
        if (!runtime.particlesDisabled) {
            runtime.particlesDisabled = true;
            if (typeof stopAllParticleFlows === 'function') {
                stopAllParticleFlows();
            }
            const container = document.getElementById('particles');
            if (container) {
                container.innerHTML = '';
            }
        }
        return;
    }
    const { solarPower, batteryPower, gridPower, housePower } = data;

    // Use cached positions
    const centers = getNodeCenters();
    if (!centers) return;

    maybeCleanupParticlesOnPowerChange(
        { solarPower, batteryPower, gridPower, housePower },
        lastPowerValues
    );

    updateSolarFlow(centers, solarPower);
    updateBatteryFlow(centers, solarPower, batteryPower, gridPower);
    updateGridFlow(centers, solarPower, batteryPower, gridPower);
    updateHouseFlow(centers, solarPower, batteryPower, gridPower, housePower);

    // OPRAVA: Uložit aktuální power hodnoty pro detekci změn
    lastPowerValues = { solarPower, batteryPower, gridPower, housePower };
}

// Use utils from DashboardUtils module (var allows re-declaration)
let formatPower = globalThis.DashboardUtils?.formatPower;
let formatEnergy = globalThis.DashboardUtils?.formatEnergy;
let updateElementIfChanged = globalThis.DashboardUtils?.updateElementIfChanged;

// Legacy wrapper kept for backward compatibility
function updateElementIfChanged_legacy(elementId, newValue, cacheKey) {
    if (!cacheKey) cacheKey = elementId;
    const element = document.getElementById(elementId);
    if (!element) return false;

    // Always update on first load (when previousValues[cacheKey] is undefined)
    // or when value actually changed
    if (previousValues[cacheKey] === undefined || previousValues[cacheKey] !== newValue) {
        element.textContent = newValue;
        previousValues[cacheKey] = newValue;
        return true; // Changed
    }
    return false; // No change
}

// Helper to update class only if changed
function updateClassIfChanged(element, className, shouldAdd) {
    const hasClass = element.classList.contains(className);
    if (shouldAdd && !hasClass) {
        element.classList.add(className);
        return true;
    } else if (!shouldAdd && hasClass) {
        element.classList.remove(className);
        return true;
    }
    return false;
}

function createYieldHelper(runtime) {
    const isConstrainedRuntime = !!runtime.isHaApp || !!runtime.isMobile || globalThis.innerWidth <= 768;
    const shouldYield = isConstrainedRuntime && !runtime.initialLoadComplete;
    const yieldIfNeeded = async () => {
        if (!shouldYield) return;
        await new Promise(resolve => {
            if (typeof globalThis.requestAnimationFrame === 'function') {
                globalThis.requestAnimationFrame(() => resolve());
            } else {
                setTimeout(resolve, 0);
            }
        });
    };
    return { isConstrainedRuntime, yieldIfNeeded };
}

async function updateSolarSection(yieldIfNeeded) {
    const [solarP1Data, solarP2Data, solarPercData, solarTodayData] = await Promise.all([
        getSensor(getSensorId('actual_fv_p1')),
        getSensor(getSensorId('actual_fv_p2')),
        getSensor(getSensorId('dc_in_fv_proc')),
        getSensor(getSensorId('dc_in_fv_ad')),
    ]);
    const solarP1 = solarP1Data.value || 0;
    const solarP2 = solarP2Data.value || 0;
    const solarPower = solarP1 + solarP2;
    const solarPerc = solarPercData.value || 0;
    const solarTodayWh = solarTodayData.value || 0;
    const solarTodayKWh = solarTodayWh / 1000;

    updateElementIfChanged('solar-power', formatPower(solarPower), 'solar-power');
    updateElementIfChanged('solar-today', 'Dnes: ' + solarTodayKWh.toFixed(2) + ' kWh', 'solar-today');

    const solarIcon = document.getElementById('solar-icon-dynamic');
    let solarIconEmoji;
    if (solarPerc <= 5) {
        solarIconEmoji = '🌙';
        if (solarIcon) {
            solarIcon.className = 'node-icon solar-icon-dynamic solar-icon-moon';
        }
    } else if (solarPerc < 50) {
        solarIconEmoji = '☀️';
        if (solarIcon) {
            solarIcon.className = 'node-icon solar-icon-dynamic';
        }
    } else {
        solarIconEmoji = '☀️';
        if (solarIcon) {
            solarIcon.className = 'node-icon solar-icon-dynamic solar-active';
            const scale = 1 + ((solarPerc - 50) / 50) * 0.3;
            solarIcon.style.fontSize = (32 * scale) + 'px';
        }
    }
    updateElementIfChanged('solar-icon-dynamic', solarIconEmoji, 'solar-icon');

    const solarNode = document.querySelector('.solar');
    updateClassIfChanged(solarNode, 'active', solarPower > 50);

    await yieldIfNeeded();
    return { solarPower, solarPerc };
}

async function updateBatterySection(yieldIfNeeded) {
    const [batterySoCData, batteryPowerData] = await Promise.all([
        getSensor(getSensorId('batt_bat_c')),
        getSensor(getSensorId('batt_batt_comp_p')),
    ]);
    const batterySoC = batterySoCData.value || 0;
    const batteryPower = batteryPowerData.value || 0;

    updateElementIfChanged('battery-soc', Math.round(batterySoC) + ' %', 'battery-soc');
    updateElementIfChanged('battery-power', formatPower(batteryPower), 'battery-power');

    const batteryFill = document.getElementById('battery-fill');
    const previousSoC = previousValues['battery-gauge-width'];
    if (previousSoC === undefined || Math.abs(previousSoC - batterySoC) > 0.5) {
        const maxHeight = 54;
        const fillHeight = (batterySoC / 100) * maxHeight;
        const fillY = 13 + (maxHeight - fillHeight);

        batteryFill.setAttribute('height', fillHeight);
        batteryFill.setAttribute('y', fillY);

        previousValues['battery-gauge-width'] = batterySoC;
    }

    const previousPower = previousValues['battery-power-state'];
    const isCharging = batteryPower > 10;
    if (previousPower !== isCharging) {
        if (isCharging) {
            batteryFill.classList.add('charging');
        } else {
            batteryFill.classList.remove('charging');
        }
        previousValues['battery-power-state'] = isCharging;
    }

    const gridChargingData = await getSensor(getSensorId('grid_charging_planned'));
    const isGridCharging = gridChargingData.value === 'on';
    const batteryLightning = document.getElementById('battery-lightning');

    if (isGridCharging && batteryPower > 10) {
        batteryLightning.classList.add('active');
    } else {
        batteryLightning.classList.remove('active');
    }

    const gridChargingIndicator = document.getElementById('battery-grid-charging-indicator');
    if (gridChargingIndicator) {
        if (isGridCharging) {
            gridChargingIndicator.classList.add('active');
        } else {
            gridChargingIndicator.classList.remove('active');
        }
    }

    const timeToEmptyData = await getSensorString(getSensorId('time_to_empty'));
    const timeToFullData = await getSensorString(getSensorId('time_to_full'));

    const batteryStatus = document.getElementById('battery-status');
    let newBatteryState;
    let newBatteryText;
    let newBatteryClass;
    if (batteryPower > 10) {
        newBatteryState = 'charging';
        const timeInfo = timeToFullData.value ? ` (${timeToFullData.value})` : '';
        newBatteryText = '⚡ Nabíjení' + timeInfo;
        newBatteryClass = 'node-status status-charging pulse';
    } else if (batteryPower < -10) {
        newBatteryState = 'discharging';
        const timeInfo = timeToEmptyData.value ? ` (${timeToEmptyData.value})` : '';
        newBatteryText = '⚡ Vybíjení' + timeInfo;
        newBatteryClass = 'node-status status-discharging pulse';
    } else {
        newBatteryState = 'idle';
        newBatteryText = '◉ Klid';
        newBatteryClass = 'node-status status-idle';
    }
    if (previousValues['battery-state'] !== newBatteryState || previousValues['battery-status-text'] !== newBatteryText) {
        batteryStatus.textContent = newBatteryText;
        batteryStatus.className = newBatteryClass;
        previousValues['battery-state'] = newBatteryState;
        previousValues['battery-status-text'] = newBatteryText;
    }

    const batteryVoltageData = await getSensor(getSensorId('extended_battery_voltage'));
    const batteryCurrentData = await getSensor(getSensorId('extended_battery_current'));
    const batteryTempData = await getSensor(getSensorId('extended_battery_temperature'));

    updateElementIfChanged('battery-voltage-value', (batteryVoltageData.value || 0).toFixed(1) + ' V');
    updateElementIfChanged('battery-current-value', (batteryCurrentData.value || 0).toFixed(1) + ' A');

    const batteryTemp = batteryTempData.value || 0;
    const tempIndicator = document.getElementById('battery-temp-indicator');
    const tempIconElement = document.getElementById('battery-temp-icon');
    let tempIcon;
    let tempClass;
    if (batteryTemp > 25) {
        tempIcon = '🌡️';
        tempClass = 'battery-temp-indicator temp-hot';
    } else if (batteryTemp < 15) {
        tempIcon = '🧊';
        tempClass = 'battery-temp-indicator temp-cold';
    } else {
        tempIcon = '🌡️';
        tempClass = 'battery-temp-indicator';
    }

    if (previousValues['battery-temp-icon'] !== tempIcon) {
        tempIconElement.textContent = tempIcon;
        tempIndicator.className = tempClass;
        previousValues['battery-temp-icon'] = tempIcon;
    }

    updateElementIfChanged('battery-temp-value', batteryTemp.toFixed(1) + ' °C');
    await yieldIfNeeded();

    return { batteryPower };
}

async function updateGridSection(yieldIfNeeded) {
    const gridPowerData = await getSensor(getSensorId('actual_aci_wtotal'));
    const gridConsumptionData = await getSensor(getSensorId('extended_grid_consumption'));
    const gridDeliveryData = await getSensor(getSensorId('extended_grid_delivery'));
    const gridPower = gridPowerData.value || 0;
    const gridConsumptionWh = gridConsumptionData.value || 0;
    const gridDeliveryWh = gridDeliveryData.value || 0;
    const gridConsumptionKWh = gridConsumptionWh / 1000;
    const gridDeliveryKWh = gridDeliveryWh / 1000;

    updateElementIfChanged('grid-power', formatPower(gridPower), 'grid-power');
    updateElementIfChanged('grid-today', 'Dnes: ' + (gridConsumptionKWh + gridDeliveryKWh).toFixed(1) + ' kWh', 'grid-today');

    const gridStatus = document.getElementById('grid-status');
    let newGridState;
    let newGridText;
    let newGridClass;
    if (gridPower > 10) {
        newGridState = 'importing';
        newGridText = '⬇ Import';
        newGridClass = 'node-status status-importing pulse';
    } else if (gridPower < -10) {
        newGridState = 'exporting';
        newGridText = '⬆ Export';
        newGridClass = 'node-status status-exporting pulse';
    } else {
        newGridState = 'idle';
        newGridText = '◉ Žádný tok';
        newGridClass = 'node-status status-idle';
    }
    if (previousValues['grid-state'] !== newGridState) {
        gridStatus.textContent = newGridText;
        gridStatus.className = newGridClass;
        previousValues['grid-state'] = newGridState;
    }

    await yieldIfNeeded();
    return { gridPower };
}

async function updateHouseSection({ yieldIfNeeded, runtime, isConstrainedRuntime }) {
    const housePowerData = await getSensor(getSensorId('actual_aco_p'));
    const houseTodayData = await getSensor(getSensorId('ac_out_en_day'));
    const housePower = housePowerData.value || 0;
    const houseTodayWh = houseTodayData.value || 0;
    const houseTodayKWh = houseTodayWh / 1000;

    updateElementIfChanged('house-power', formatPower(housePower), 'house-power');
    updateElementIfChanged('house-today', 'Dnes: ' + houseTodayKWh.toFixed(1) + ' kWh', 'house-today');

    const boxModeData = await getSensorString(getSensorId('box_prms_mode'));
    const boxMode = boxModeData.value || '--';
    let modeIcon = '⚙️';
    let modeText = boxMode;
    if (boxMode.includes('Home 1')) {
        modeIcon = '🏠';
        modeText = 'Home 1';
    } else if (boxMode.includes('Home 2')) {
        modeIcon = '🔋';
        modeText = 'Home 2';
    } else if (boxMode.includes('Home 3')) {
        modeIcon = '☀️';
        modeText = 'Home 3';
    } else if (boxMode.includes('UPS')) {
        modeIcon = '⚡';
        modeText = 'Home UPS';
    }

    const inverterModeElement = document.getElementById('inverter-mode');
    if (inverterModeElement) {
        const isModeChanging = inverterModeElement.classList.contains('mode-changing');
        updateElementIfChanged('inverter-mode', modeIcon + ' ' + modeText, 'inverter-mode');
        if (isModeChanging && !inverterModeElement.classList.contains('mode-changing')) {
            inverterModeElement.classList.add('mode-changing');
        }
    }

    const shouldUpdatePlanner = !isConstrainedRuntime || runtime.initialLoadComplete;
    if (shouldUpdatePlanner) {
        await updatePlannerModeBadge();
        await yieldIfNeeded();
    }

    const boilerModeFlowData = await getSensorStringSafe(getSensorId('boiler_manual_mode'));
    const boilerModeFlowElement = document.getElementById('boiler-mode');
    if (boilerModeFlowElement && boilerModeFlowData.exists) {
        const isModeChanging = boilerModeFlowElement.classList.contains('mode-changing');
        updateElementIfChanged('boiler-mode', boilerModeFlowData.value || '--', 'boiler-mode');
        if (isModeChanging && !boilerModeFlowElement.classList.contains('mode-changing')) {
            boilerModeFlowElement.classList.add('mode-changing');
        }
    }

    const realDataUpdateSensor = await getSensorString(getSensorId('real_data_update'));
    const lastUpdate = realDataUpdateSensor.value;
    if (lastUpdate && lastUpdate !== '--') {
        const lastUpdateHeader = document.getElementById('last-update-header');
        const updateDate = new Date(lastUpdate);
        const relativeTime = formatRelativeTime(updateDate);
        const displayText = `Aktualizováno ${relativeTime}`;

        if (previousValues['last-update'] !== displayText) {
            lastUpdateHeader.textContent = displayText;
            previousValues['last-update'] = displayText;
        }
    }

    return { housePower };
}

async function updateInverterIndicators() {
    const bypassStatusData = await getSensorString(getSensorId('bypass_status'));
    const bypassStatus = bypassStatusData.value || 'off';
    const bypassIndicator = document.getElementById('inverter-bypass-indicator');
    const bypassLabel = document.getElementById('inverter-bypass-label');
    const bypassIconElement = document.getElementById('inverter-bypass-icon');
    let bypassIcon;
    let bypassClass;
    const isBypassActive = bypassStatus.toLowerCase() === 'on' || bypassStatus === '1';
    if (isBypassActive) {
        bypassIcon = '🔴';
        bypassClass = 'inverter-bypass-indicator bypass-warning';
    } else {
        bypassIcon = '🟢';
        bypassClass = 'inverter-bypass-indicator bypass-ok';
    }
    if (previousValues['inverter-bypass-icon'] !== bypassIcon) {
        if (bypassIconElement) {
            bypassIconElement.textContent = bypassIcon;
        }
        if (bypassIndicator) {
            bypassIndicator.className = bypassClass;
        }
        if (bypassLabel) {
            bypassLabel.style.display = isBypassActive ? 'block' : 'none';
        }
        previousValues['inverter-bypass-icon'] = bypassIcon;
    }

    const inverterTempData = await getSensor(getSensorId('box_temp'));
    const inverterTemp = inverterTempData.value || 0;
    const inverterTempIndicator = document.getElementById('inverter-temp-indicator');
    const inverterTempIconElement = document.getElementById('inverter-temp-icon');
    let inverterTempIcon;
    let inverterTempClass;
    if (inverterTemp > 35) {
        inverterTempIcon = '🌡️';
        inverterTempClass = 'inverter-temp-indicator temp-hot';
    } else {
        inverterTempIcon = '🌡️';
        inverterTempClass = 'inverter-temp-indicator';
    }
    if (previousValues['inverter-temp-icon'] !== inverterTempIcon || previousValues['inverter-temp-class'] !== inverterTempClass) {
        if (inverterTempIconElement) {
            inverterTempIconElement.textContent = inverterTempIcon;
        }
        if (inverterTempIndicator) {
            inverterTempIndicator.className = inverterTempClass;
        }
        previousValues['inverter-temp-icon'] = inverterTempIcon;
        previousValues['inverter-temp-class'] = inverterTempClass;
    }
    updateElementIfChanged('inverter-temp-value', inverterTemp.toFixed(1) + ' °C');

    const inverterBox = document.getElementById('inverter-box');
    const bypassIsOn = bypassStatus && (bypassStatus.toLowerCase() === 'on' || bypassStatus === '1' || bypassStatus.toLowerCase().includes('on'));
    const tempIsHigh = inverterTemp > 35;
    const hasWarning = bypassIsOn || tempIsHigh;

    if (previousValues['inverter-warning'] === undefined || previousValues['inverter-warning'] !== hasWarning) {
        if (hasWarning) {
            inverterBox.classList.add('warning-active');
        } else {
            inverterBox.classList.remove('warning-active');
        }
        previousValues['inverter-warning'] = hasWarning;
    }
}

async function updateFlowAnimation({
    solarPower,
    solarPerc,
    batteryPower,
    gridPower,
    housePower,
    runtime,
    isConstrainedRuntime
}) {
    const [boilerPowerData, boilerInstallPowerData] = await Promise.all([
        getSensorSafe(getSensorId('boiler_current_cbb_w')),
        getSensorSafe(getSensorId('boiler_install_power')),
    ]);
    const boilerPower = boilerPowerData.value || 0;
    const boilerMaxPower = boilerInstallPowerData.value || 3000;

    const currentPowerValues = {
        solarPower,
        solarPerc,
        batteryPower,
        gridPower,
        housePower,
        boilerPower,
        boilerMaxPower
    };

    const powerChanged = !lastPowerValues ||
        Object.keys(currentPowerValues).some(key =>
            Math.abs(currentPowerValues[key] - (lastPowerValues[key] || 0)) > 0.1
        );

    if (powerChanged || FLOW_STATE.needsFlowReinitialize) {
        if (FLOW_STATE.needsFlowReinitialize) {
            FLOW_STATE.needsFlowReinitialize = false;
        }
        lastPowerValues = currentPowerValues;

        const flowTab = document.querySelector('#flow-tab');
        const isFlowTabActive = flowTab?.classList.contains('active');
        if (isFlowTabActive) {
            if (isConstrainedRuntime && !runtime.initialLoadComplete) {
                runtime.pendingFlowValues = currentPowerValues;
            } else {
                animateFlow(currentPowerValues);
            }
        }
    }
}

function scheduleNodeDetails(runtime) {
    if (previousValues['node-details-loaded']) {
        return;
    }

    if ((runtime.isHaApp || runtime.isMobile || globalThis.innerWidth <= 768) && !runtime.initialLoadComplete) {
        if (!runtime.nodeDetailsScheduled) {
            runtime.nodeDetailsScheduled = true;
            setTimeout(() => {
                loadNodeDetails();
                runtime.nodeDetailsScheduled = false;
            }, 1500);
        }
    } else {
        loadNodeDetails();
    }
    previousValues['node-details-loaded'] = true;
}

function updatePricingStatsIfActive() {
    const pricingActive = Boolean(globalThis.pricingTabActive);
    if (!pricingActive) {
        return;
    }

    if (globalThis.DashboardPricing?.updatePlannedConsumptionStats) {
        globalThis.DashboardPricing.updatePlannedConsumptionStats();
    }
    if (globalThis.DashboardPricing?.updateWhatIfAnalysis) {
        globalThis.DashboardPricing.updateWhatIfAnalysis();
    }
    if (globalThis.DashboardPricing?.updateModeRecommendations) {
        globalThis.DashboardPricing.updateModeRecommendations();
    }
}

// Load and update data (optimized - partial updates only)
async function loadData() {
    if (loadDataInProgress) {
        loadDataPending = true;
        return;
    }
    loadDataInProgress = true;
    const runtime = globalThis.OIG_RUNTIME || {};
    try {
        const { isConstrainedRuntime, yieldIfNeeded } = createYieldHelper(runtime);

        const { solarPower, solarPerc } = await updateSolarSection(yieldIfNeeded);
        const { batteryPower } = await updateBatterySection(yieldIfNeeded);
        const { gridPower } = await updateGridSection(yieldIfNeeded);
        const { housePower } = await updateHouseSection({ yieldIfNeeded, runtime, isConstrainedRuntime });

        await updateInverterIndicators();
        await updateFlowAnimation({
            solarPower,
            solarPerc,
            batteryPower,
            gridPower,
            housePower,
            runtime,
            isConstrainedRuntime
        });

        scheduleNodeDetails(runtime);

        if (globalThis.DashboardChmu?.updateChmuWarningBadge) {
            globalThis.DashboardChmu.updateChmuWarningBadge();
        }
        if (globalThis.DashboardAnalytics?.updateBatteryEfficiencyStats) {
            globalThis.DashboardAnalytics.updateBatteryEfficiencyStats();
        }

        updatePricingStatsIfActive();

        // Performance chart removed (legacy performance tracking)
    } finally {
        loadDataInProgress = false;
        if (globalThis.OIG_RUNTIME) {
            globalThis.OIG_RUNTIME.initialLoadComplete = true;
        }
        if (runtime.pendingFlowValues && (runtime.isHaApp || runtime.isMobile || globalThis.innerWidth <= 768)) {
            const pendingValues = runtime.pendingFlowValues;
            runtime.pendingFlowValues = null;
            setTimeout(() => {
                const flowTab = document.querySelector('#flow-tab');
                if (flowTab?.classList.contains('active')) {
                    animateFlow(pendingValues);
                }
            }, 400);
        }
        if (loadDataPending) {
            loadDataPending = false;
            setTimeout(() => loadData(), 0);
        }
    }
}

// Force full refresh (for manual reload or after service calls)
function forceFullRefresh() {
    previousValues['control-status-loaded'] = false;
    previousValues['node-details-loaded'] = false;
    loadData();
}

// Load detailed information for all nodes (optimized - partial updates)
async function loadNodeDetails() {
    if (loadNodeDetailsInProgress) {
        loadNodeDetailsPending = true;
        return;
    }
    loadNodeDetailsInProgress = true;
    try {
        // === SOLAR DETAILS ===
        const solarP1 = await getSensor(getSensorId('dc_in_fv_p1'));
        const solarP2 = await getSensor(getSensorId('dc_in_fv_p2'));
        const solarV1 = await getSensor(getSensorId('extended_fve_voltage_1'));
        const solarV2 = await getSensor(getSensorId('extended_fve_voltage_2'));
        const solarI1 = await getSensor(getSensorId('extended_fve_current_1'));
        const solarI2 = await getSensor(getSensorId('extended_fve_current_2'));

        // Solar forecast sensors
        const solarForecast = await getSensor(getSensorId('solar_forecast'));

        // Update only if changed
        updateElementIfChanged('solar-s1', Math.round(solarP1.value || 0) + ' W');
        updateElementIfChanged('solar-s2', Math.round(solarP2.value || 0) + ' W');
        updateElementIfChanged('solar-s1-volt', Math.round(solarV1.value || 0) + 'V');
        updateElementIfChanged('solar-s2-volt', Math.round(solarV2.value || 0) + 'V');
        updateElementIfChanged('solar-s1-amp', (solarI1.value || 0).toFixed(1) + 'A');
        updateElementIfChanged('solar-s2-amp', (solarI2.value || 0).toFixed(1) + 'A');

        // Solar forecast - corner indicators (today and tomorrow)
        const forecastToday = (solarForecast.value || 0).toFixed(2);
        updateElementIfChanged('solar-forecast-today-value', forecastToday + ' kWh');

        const forecastTomorrow = solarForecast.attributes?.tomorrow_total_sum_kw || 0;
        updateElementIfChanged('solar-forecast-tomorrow-value', Number.parseFloat(forecastTomorrow).toFixed(2) + ' kWh');

        // === BATTERY DETAILS ===
        const battChargeTotal = await getSensor(getSensorId('computed_batt_charge_energy_today'));
        const battDischargeTotal = await getSensor(getSensorId('computed_batt_discharge_energy_today'));
        const battChargeSolar = await getSensor(getSensorId('computed_batt_charge_fve_energy_today'));
        const battChargeGrid = await getSensor(getSensorId('computed_batt_charge_grid_energy_today'));

        // Battery totals today - use formatEnergy (Wh from sensors)
        updateElementIfChanged('battery-charge-total', formatEnergy(battChargeTotal.value || 0));
        updateElementIfChanged('battery-charge-solar', formatEnergy(battChargeSolar.value || 0));
        updateElementIfChanged('battery-charge-grid', formatEnergy(battChargeGrid.value || 0));
        updateElementIfChanged('battery-discharge-total', formatEnergy(battDischargeTotal.value || 0));

        // Grid charging plan
        await updateGridChargingPlan();

        // Battery balancing card
        await updateBatteryBalancingCard();

        // === GRID DETAILS ===
        const gridImport = await getSensor(getSensorId('ac_in_ac_ad'));
        const gridExport = await getSensor(getSensorId('ac_in_ac_pd'));
        const gridFreq = await getSensor(getSensorId('ac_in_aci_f')); // OPRAVENO: správný senzor
        const gridL1V = await getSensor(getSensorId('ac_in_aci_vr')); // OPRAVENO: L1 napětí
        const gridL2V = await getSensor(getSensorId('ac_in_aci_vs')); // OPRAVENO: L2 napětí
        const gridL3V = await getSensor(getSensorId('ac_in_aci_vt')); // OPRAVENO: L3 napětí
        const gridL1P = await getSensor(getSensorId('actual_aci_wr'));
        const gridL2P = await getSensor(getSensorId('actual_aci_ws'));
        const gridL3P = await getSensor(getSensorId('actual_aci_wt'));
        const gridL1Power = gridL1P.value || 0;
        const gridL2Power = gridL2P.value || 0;
        const gridL3Power = gridL3P.value || 0;

        // Grid pricing sensors
        const spotPrice = await getSensor(getSensorId('spot_price_current_15min'));
        const exportPrice = await getSensor(getSensorId('export_price_current_15min'));
        const currentTariff = await getSensorString(getSensorId('current_tariff'));

        // Update only if changed - use formatEnergy (Wh from sensors)
        updateElementIfChanged('grid-import', formatEnergy(gridImport.value || 0));
        updateElementIfChanged('grid-export', formatEnergy(gridExport.value || 0));

        // Update frequency indicator in top right corner
        updateElementIfChanged('grid-freq-indicator', '〰️ ' + (gridFreq.value || 0).toFixed(2) + ' Hz');

        // Grid prices and tariff
        updateElementIfChanged('grid-spot-price', (spotPrice.value || 0).toFixed(2) + ' Kč/kWh');
        updateElementIfChanged('grid-export-price', (exportPrice.value || 0).toFixed(2) + ' Kč/kWh');

        // Update tariff indicator with better icons
        const tariffValue = currentTariff.value || '--';
        let tariffDisplay = '⏰ ' + tariffValue;
        if (tariffValue === 'VT' || tariffValue.includes('vysoký')) {
            tariffDisplay = '⚡ VT'; // Vysoký tarif - blesk
        } else if (tariffValue === 'NT' || tariffValue.includes('nízký')) {
            tariffDisplay = '🌙 NT'; // Nízký tarif - měsíc
        }
        updateElementIfChanged('grid-tariff-indicator', tariffDisplay);

        updateElementIfChanged('grid-l1-volt', Math.round(gridL1V.value || 0) + 'V');
        updateElementIfChanged('grid-l2-volt', Math.round(gridL2V.value || 0) + 'V');
        updateElementIfChanged('grid-l3-volt', Math.round(gridL3V.value || 0) + 'V');
        updateElementIfChanged('grid-l1-power', Math.round(gridL1Power) + 'W');
        updateElementIfChanged('grid-l2-power', Math.round(gridL2Power) + 'W');
        updateElementIfChanged('grid-l3-power', Math.round(gridL3Power) + 'W');

        // Update main box phases (new elements)
        updateElementIfChanged('grid-l1-volt-main', Math.round(gridL1V.value || 0) + 'V');
        updateElementIfChanged('grid-l2-volt-main', Math.round(gridL2V.value || 0) + 'V');
        updateElementIfChanged('grid-l3-volt-main', Math.round(gridL3V.value || 0) + 'V');
        updateElementIfChanged('grid-l1-power-main', Math.round(gridL1Power) + 'W');
        updateElementIfChanged('grid-l2-power-main', Math.round(gridL2Power) + 'W');
        updateElementIfChanged('grid-l3-power-main', Math.round(gridL3Power) + 'W');

        // === HOUSE DETAILS ===
        const houseL1 = await getSensor(getSensorId('ac_out_aco_pr'));
        const houseL2 = await getSensor(getSensorId('ac_out_aco_ps'));
        const houseL3 = await getSensor(getSensorId('ac_out_aco_pt'));

        // Update main box phases
        updateElementIfChanged('house-l1-main', Math.round(houseL1.value || 0) + 'W');
        updateElementIfChanged('house-l2-main', Math.round(houseL2.value || 0) + 'W');
        updateElementIfChanged('house-l3-main', Math.round(houseL3.value || 0) + 'W');

        // === BOILER DETAILS (as part of house) ===
        const boilerIsUse = await getSensorStringSafe(getSensorId('boiler_is_use'));
        const boilerDetailSection = document.getElementById('boiler-detail-section');

        if (boilerIsUse.exists && (boilerIsUse.value === 'Zapnuto' || boilerIsUse.value === 'on' || boilerIsUse.value === '1' || boilerIsUse.value === 1)) {
            // Show boiler section
            boilerDetailSection.style.display = 'block';

            const boilerCurrentPower = await getSensorSafe(getSensorId('boiler_current_cbb_w'));
            const boilerDayEnergy = await getSensorSafe(getSensorId('boiler_day_w'));
            const boilerManualMode = await getSensorStringSafe(getSensorId('boiler_manual_mode'));

            // Format power (W or kW)
            const powerValue = boilerCurrentPower.value || 0;
            const powerDisplay = powerValue >= 1000
                ? (powerValue / 1000).toFixed(1) + ' kW'
                : Math.round(powerValue) + ' W';
            updateElementIfChanged('house-boiler-power', powerDisplay);

            // Format energy (Wh or kWh)
            const energyValue = boilerDayEnergy.value || 0;
            const energyDisplay = energyValue >= 1000
                ? (energyValue / 1000).toFixed(2) + ' kWh'
                : Math.round(energyValue) + ' Wh';
            updateElementIfChanged('house-boiler-today', energyDisplay);

            // Format mode with icon
            const modeValue = boilerManualMode.value || '--';
            const modeIcon = document.getElementById('boiler-mode-icon');
            const setModeIcon = (icon) => {
                if (modeIcon) {
                    modeIcon.textContent = icon;
                }
            };
            let modeDisplay = modeValue;

            if (modeValue === 'CBB') {
                modeDisplay = '🤖 Inteligentní';
                setModeIcon('🤖');
            } else if (modeValue === 'Manual') {
                modeDisplay = '👤 Manuální';
                setModeIcon('👤');
            } else {
                setModeIcon('⚙️');
            }
            updateElementIfChanged('house-boiler-mode', modeDisplay);
        } else {
            // Hide boiler section
            boilerDetailSection.style.display = 'none';
        }

        // Update boiler control panel visibility/state
        const boilerControlSection = document.getElementById('boiler-control-section');
        if (boilerControlSection) {
            if (boilerIsUse.exists && (boilerIsUse.value === 'Zapnuto' || boilerIsUse.value === 'on' || boilerIsUse.value === '1' || boilerIsUse.value === 1)) {
                boilerControlSection.style.display = 'block';
                boilerControlSection.style.opacity = '1';
                boilerControlSection.style.pointerEvents = 'auto';
            } else {
                boilerControlSection.style.display = 'none';
            }
        }

        // === INVERTER DETAILS ===
        const inverterMode = await getSensorString(getSensorId('box_prms_mode'));
        const inverterGridMode = await getSensorString(getSensorId('invertor_prms_to_grid'));
        const inverterGridLimit = await getSensorSafe(getSensorId('invertor_prm1_p_max_feed_grid'));
        const notificationsUnread = await getSensor(getSensorId('notification_count_unread'));
        const notificationsError = await getSensor(getSensorId('notification_count_error'));

        // Check if box mode changed - trigger shield activity check
        const currentMode = inverterMode.value || '--';
        if (previousValues['box-mode'] !== undefined && previousValues['box-mode'] !== currentMode) {
            console.log('[Mode Change] Detected:', previousValues['box-mode'], '→', currentMode);
            // Trigger immediate shield activity check
            setTimeout(() => monitorShieldActivity(), 500);
        }
        previousValues['box-mode'] = currentMode;

        // Box mode with icons and descriptions
        let modeDisplay = currentMode;
        let modeDescription = '';
        if (modeDisplay.includes('Home 1')) {
            modeDescription = '🏠 Home 1: Max baterie + FVE pro domácnost';
        } else if (modeDisplay.includes('Home 2')) {
            modeDescription = '🔋 Home 2: Šetří baterii během výroby';
        } else if (modeDisplay.includes('Home 3')) {
            modeDescription = '☀️ Home 3: Priorita nabíjení baterie z FVE';
        } else if (modeDisplay.includes('UPS')) {
            modeDescription = '⚡ Home UPS: Vše ze sítě, baterie na 100%';
        } else {
            modeDescription = '⚙️ ' + modeDisplay;
        }
        updateElementIfChanged('inverter-mode-detail', modeDescription);

        // Grid export mode with icons (water theme: waterfall / river / dam)
        let gridExportDisplay = inverterGridMode.value || '--';
        let gridExportIcon = '💧';
        if (gridExportDisplay === 'Vypnuto / Off') {
            gridExportIcon = '🚫'; // Zákaz - odpovídá ovládacímu panelu
            gridExportDisplay = 'Vypnuto';
        } else if (gridExportDisplay === 'Zapnuto / On') {
            gridExportDisplay = 'Zapnuto';
        } else if (gridExportDisplay.includes('Limited') || gridExportDisplay.includes('omezením')) {
            gridExportIcon = '🚰'; // S omezením - odpovídá ovládacímu panelu
            gridExportDisplay = 'Omezeno';
        }

        // Aktualizovat grid export mode, ale zachovat třídu mode-changing pokud existuje
        const gridExportModeElement = document.getElementById('inverter-grid-export-mode');
        if (gridExportModeElement) {
            const isModeChanging = gridExportModeElement.classList.contains('mode-changing');
            updateElementIfChanged('inverter-grid-export-mode', gridExportDisplay);
            // Obnovit třídu mode-changing, pokud byla nastavená
            if (isModeChanging && !gridExportModeElement.classList.contains('mode-changing')) {
                gridExportModeElement.classList.add('mode-changing');
            }
        }

        document.getElementById('grid-export-icon').textContent = gridExportIcon;

        // Grid export limit (convert W to kW)
        const limitKw = (inverterGridLimit.value || 0) / 1000;
        updateElementIfChanged('inverter-export-limit', limitKw.toFixed(1) + ' kW');

        // Notifications with badges (zobrazení jen čísel)
        const unreadCount = notificationsUnread.value || 0;
        const errorCount = notificationsError.value || 0;

        const unreadEl = document.getElementById('inverter-notifications-unread');
        unreadEl.textContent = unreadCount;
        if (unreadCount > 0) {
            unreadEl.classList.add('has-unread');
            unreadEl.classList.remove('has-error');
        } else {
            unreadEl.classList.remove('has-unread', 'has-error');
        }

        const errorEl = document.getElementById('inverter-notifications-error');
        errorEl.textContent = errorCount;
        if (errorCount > 0) {
            errorEl.classList.add('has-error');
            errorEl.classList.remove('has-unread');
        } else {
            errorEl.classList.remove('has-error', 'has-unread');
        }

        // === BOILER DETAILS (if available) ===
        const boilerNode = document.getElementById('boiler-node');
        if (boilerNode && !boilerNode.classList.contains('hidden')) {
            const boilerPower = await getSensorSafe(getSensorId('boiler_current_cbb_w'));
            const boilerMode = await getSensorStringSafe(getSensorId('boiler_manual_mode'));
            const boilerTemp = await getSensorSafe(getSensorId('boiler_temperature'));
            const boilerStatus = await getSensorStringSafe(getSensorId('boiler_status'));

            if (boilerPower.exists || boilerMode.exists || boilerTemp.exists || boilerStatus.exists) {
                updateElementIfChanged('boiler-power', Math.round(boilerPower.value || 0) + ' W');

                // Aktualizovat boiler-mode, ale zachovat třídu mode-changing pokud existuje
                const boilerModeElement = document.getElementById('boiler-mode');
                if (boilerModeElement) {
                    const isModeChanging = boilerModeElement.classList.contains('mode-changing');
                    updateElementIfChanged('boiler-mode', boilerMode.value || '--');
                    // Obnovit třídu mode-changing, pokud byla nastavená
                    if (isModeChanging && !boilerModeElement.classList.contains('mode-changing')) {
                        boilerModeElement.classList.add('mode-changing');
                    }
                }

                updateElementIfChanged('boiler-mode-detail', boilerMode.value || '--');
                updateElementIfChanged('boiler-temp', (boilerTemp.value || 0).toFixed(1) + ' °C');
                updateElementIfChanged('boiler-status', boilerStatus.value || '--');
            }
        }

    } catch (e) {
        console.error('[Details] Error loading node details:', e);
    } finally {
        loadNodeDetailsInProgress = false;
        if (loadNodeDetailsPending) {
            loadNodeDetailsPending = false;
            setTimeout(() => loadNodeDetails(), 0);
        }

        // FIX: Překreslit linky po načtení dat (může se změnit pozice elementů)
        // Použít debounced verzi aby se nepřekreslovali příliš často
        debouncedDrawConnections(50);
    }
}

// Show charge battery dialog
async function showChargeBatteryDialog() {
    try {
        // Check shield queue before adding task (use dynamic lookup)
        const shieldQueue = await getSensor(findShieldSensorId('service_shield_queue'));
        const queueCount = Number.parseInt(shieldQueue.value) || 0;

        // Warn if queue is getting full
        if (queueCount >= 3) {
            const proceed = confirm(
                `⚠️ VAROVÁNÍ: Fronta již obsahuje ${queueCount} úkolů!\n\n` +
                `Každá změna může trvat až 10 minut.\n` +
                `Opravdu chcete přidat další úkol?`
            );
            if (!proceed) return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'ack-dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'ack-dialog';

        dialog.innerHTML = `
            <div class="ack-dialog-header">
                ⚡ Nabíjení baterie
            </div>
            <div class="ack-dialog-body">
                <p>Nastavte cílový stav nabití baterie (SoC):</p>

                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 8px; font-size: 12px;">
                        Cílové SoC: <span id="target-soc-display">80</span>%
                    </label>
                    <input
                        type="range"
                        id="target-soc-slider"
                        min="0"
                        max="100"
                        value="80"
                        style="width: 100%;"
                        oninput="document.getElementById('target-soc-display').textContent = this.value"
                    />
                </div>
            </div>
            <div class="ack-dialog-warning">
                ⚠️ <strong>Upozornění:</strong> Nabíjení baterie ovlivní chování systému.
                Baterie bude nabíjena ze sítě až do zvoleného SoC. Změna může trvat až 10 minut.
            </div>
            <div class="ack-checkbox-wrapper">
                <input type="checkbox" id="charge-ack-checkbox">
                <label for="charge-ack-checkbox">
                    Potvrzuji, že jsem si vědom možných dopadů na provoz systému a beru na sebe odpovědnost za tuto změnu.
                </label>
            </div>
            <div class="ack-dialog-buttons">
                <button
                    class="btn-cancel"
                    onclick="this.closest('.ack-dialog-overlay').remove()"
                >
                    Zrušit
                </button>
                <button
                    id="charge-confirm-btn"
                    class="btn-confirm"
                    onclick="confirmChargeBattery()"
                    disabled
                >
                    ⚡ Spustit nabíjení
                </button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Enable/disable confirm button based on checkbox
        const checkbox = dialog.querySelector('#charge-ack-checkbox');
        const confirmBtn = dialog.querySelector('#charge-confirm-btn');

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                confirmBtn.disabled = false;
                confirmBtn.style.opacity = '1';
                confirmBtn.style.background = 'rgba(33, 150, 243, 0.5)';
            } else {
                confirmBtn.disabled = true;
                confirmBtn.style.opacity = '0.5';
                confirmBtn.style.background = 'rgba(33, 150, 243, 0.3)';
            }
        });
    } catch (e) {
        console.error('[Battery] Error in showChargeBatteryDialog:', e);
        showNotification('Chyba', 'Nepodařilo se zobrazit dialog', 'error');
    }
}

// Confirm charge battery
async function confirmChargeBattery() {
    const overlay = document.querySelector('.ack-dialog-overlay');
    const targetSoC = Number.parseInt(document.getElementById('target-soc-slider').value);

    // Remove dialog
    if (overlay) overlay.remove();

    try {
        // Show pending state immediately
        const btn = document.getElementById('charge-battery-btn');
        if (btn) {
            btn.disabled = true;
            btn.classList.add('pending');
        }

        // Call service
        const success = await callService('oig_cloud', 'set_formating_mode', {
            mode: 'Nabíjet',
            limit: targetSoC,
            acknowledgement: true
        });

        if (success) {
            // Immediately check shield activity
            await monitorShieldActivity();

            // Update UI immediately
            setTimeout(() => {
                updateButtonStates();
            }, 500);
        } else if (btn) {
            // Re-enable on error
            btn.disabled = false;
            btn.classList.remove('pending');
        }
    } catch (e) {
        console.error('[Battery] Error in confirmChargeBattery:', e);
        showNotification('Chyba', 'Nepodařilo se spustit nabíjení', 'error');

        // Re-enable button on error
        const btn = document.getElementById('charge-battery-btn');
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('pending');
        }
    }
}

// Initialize

// Export functions to window for backward compatibility
globalThis.DashboardFlow = {
    getSensorId,
    findShieldSensorId,
    updateTime,
    debouncedDrawConnections,
    drawConnections,
    getNodeCenters,
    invalidateFlowLayoutCache,
    loadData,
    loadNodeDetails,
    forceFullRefresh,
    debouncedLoadData,
    debouncedLoadNodeDetails,
    init: function() {
        console.log('[DashboardFlow] Initialized');
        // Start periodic updates
        setInterval(updateTime, 1000);
        setInterval(debouncedLoadData, 5000);
    }
};

console.log('[DashboardFlow] Module loaded');
