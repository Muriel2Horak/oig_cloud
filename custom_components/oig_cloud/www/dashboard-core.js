const INVERTER_SN = new URLSearchParams(window.location.search).get('inverter_sn') || '2206237016';

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

// Toggle queue section
// === SHIELD INTEGRATION FUNCTIONS ===

// Debouncing timers
let loadDataTimer = null;
let loadDetailsTimer = null;
let shieldMonitorTimer = null;

// Debounced loadData() - prevents excessive calls
function debouncedLoadData() {
    if (loadDataTimer) clearTimeout(loadDataTimer);
    loadDataTimer = setTimeout(() => {
        loadData();
    }, 200); // Wait 200ms before executing
}

// Debounced loadNodeDetails() - prevents excessive calls
function debouncedLoadNodeDetails() {
    if (loadDetailsTimer) clearTimeout(loadDetailsTimer);
    loadDetailsTimer = setTimeout(() => {
        loadNodeDetails();
    }, 500); // Wait 500ms before executing
}

// Debounced shield monitor - prevents excessive calls when shield sensors change rapidly
function debouncedShieldMonitor() {
    if (shieldMonitorTimer) clearTimeout(shieldMonitorTimer);
    shieldMonitorTimer = setTimeout(() => {
        monitorShieldActivity();
        updateShieldQueue();
        updateShieldUI();
        updateButtonStates();
    }, 100); // Wait 100ms before executing (shorter delay for responsive UI)
}

// Subscribe to shield status changes
function subscribeToShield() {
    const hass = getHass();
    if (!hass) {
        console.warn('Cannot subscribe to shield - no HA connection');
        return;
    }

    console.log('[Shield] Subscribing to state changes...');

    try {
        // Subscribe to state changes
        hass.connection.subscribeEvents((event) => {
            if (event.event_type === 'state_changed') {
                const entityId = event.data.entity_id;

                // Shield status sensors
                if (entityId.includes('service_shield_')) {
                    console.log(`[Shield] Shield sensor changed: ${entityId}`, event.data.new_state);
                    // Use debounced monitor to prevent excessive updates
                    debouncedShieldMonitor();
                }

                // Target state sensors (box mode, boiler mode, grid delivery)
                // Note: updateButtonStates() is already called by debouncedShieldMonitor()
                // We only need to trigger debounce when target sensors change
                if (entityId.includes('box_prms_mode') ||
                    entityId.includes('boiler_manual_mode') ||
                    entityId.includes('invertor_prms_to_grid') ||
                    entityId.includes('invertor_prm1_p_max_feed_grid')) {
                    console.log(`[Shield] Target sensor changed: ${entityId}`, event.data.new_state);
                    debouncedShieldMonitor(); // This will call updateButtonStates() after debounce
                }

                // Data sensors - trigger loadData() on changes
                if (entityId.includes('actual_pv') ||           // Solar power
                    entityId.includes('actual_batt') ||         // Battery power
                    entityId.includes('actual_aci_wtotal') ||   // Grid power
                    entityId.includes('actual_aco_p') ||        // House power
                    entityId.includes('boiler_current_cbb_w') || // Boiler power
                    entityId.includes('extended_battery_soc') || // Battery SOC
                    entityId.includes('extended_battery_voltage') || // Battery voltage
                    entityId.includes('box_temp') ||            // Inverter temp
                    entityId.includes('bypass_status') ||       // Bypass status
                    entityId.includes('chmu_warning_level') ||  // ČHMÚ weather warning
                    entityId.includes('real_data_update')) {    // Real data update
                    // console.log(`[Data] Sensor changed: ${entityId}`, event.data.new_state?.state);
                    debouncedLoadData(); // Trigger data update immediately (debounced)
                }

                // Detail sensors - trigger loadNodeDetails() on changes
                if (entityId.includes('dc_in_fv_p') ||         // Solar strings
                    entityId.includes('extended_fve_') ||       // Solar voltage/current
                    entityId.includes('computed_batt_') ||      // Battery energy
                    entityId.includes('ac_in_') ||              // Grid details
                    entityId.includes('ac_out_') ||             // House phases
                    entityId.includes('spot_price') ||          // Grid pricing
                    entityId.includes('current_tariff') ||      // Tariff
                    entityId.includes('grid_charging_planned') || // Grid charging plan
                    entityId.includes('notification_count')) {  // Notifications
                    // console.log(`[Details] Sensor changed: ${entityId}`);
                    debouncedLoadNodeDetails(); // Trigger details update (debounced)
                }

                // Pricing chart sensors - trigger loadPricingData() on changes
                if (entityId.includes('_spot_price_current_15min') ||  // Spot prices
                    entityId.includes('_export_price_current_15min') || // Export prices
                    entityId.includes('_solar_forecast') ||              // Solar forecast
                    entityId.includes('_battery_prediction')) {          // Battery prediction

                    // Check if actual data changed (not just last_updated timestamp)
                    const oldState = event.data.old_state;
                    const newState = event.data.new_state;

                    if (oldState && newState) {
                        // For pricing sensors, check if attributes actually changed
                        const oldAttrs = JSON.stringify(oldState.attributes || {});
                        const newAttrs = JSON.stringify(newState.attributes || {});

                        if (oldAttrs === newAttrs && oldState.state === newState.state) {
                            // No actual data change, skip update
                            return;
                        }
                    }

                    // console.log(`[Pricing] Sensor data changed: ${entityId}`, newState?.state);
                    debouncedLoadPricingData(); // Trigger pricing chart update (debounced)
                }

                // Custom tiles - check if entity is used in any tile
                if (window.tileManager) {
                    const tilesLeft = window.tileManager.getTiles('left');
                    const tilesRight = window.tileManager.getTiles('right');
                    const allTiles = [...(tilesLeft || []), ...(tilesRight || [])];

                    // Check if changed entity is used in any tile (main or support entities)
                    const isTileEntity = allTiles.some(tile => {
                        if (!tile) return false;
                        // Check main entity
                        if (tile.entity === entityId) return true;
                        // Check support entities
                        if (tile.supportEntities) {
                            return tile.supportEntities.some(se => se.entity === entityId);
                        }
                        return false;
                    });

                    if (isTileEntity) {
                        console.log(`[Tiles] Entity used in tile changed: ${entityId}`);
                        // Debounced re-render to prevent excessive updates
                        if (!window.tileRenderTimeout) {
                            window.tileRenderTimeout = setTimeout(() => {
                                renderAllTiles();
                                window.tileRenderTimeout = null;
                            }, 100);
                        }
                    }
                }
            }
        }, 'state_changed');

        // Subscribe to theme changes (HA events)
        hass.connection.subscribeEvents((event) => {
            console.log('[Theme] HA theme event:', event);
            detectAndApplyTheme();
        }, 'themes_updated');

        // Subscribe to frontend set theme event
        hass.connection.subscribeEvents((event) => {
            console.log('[Theme] Frontend theme changed:', event);
            detectAndApplyTheme();
        }, 'frontend_set_theme');

        // Subscribe to connection state changes (reconnect after HA restart)
        hass.connection.addEventListener('ready', () => {
            console.log('[Connection] WebSocket reconnected - refreshing all data');
            forceFullRefresh();
        });

        hass.connection.addEventListener('disconnected', () => {
            console.warn('[Connection] WebSocket disconnected');
        });

        console.log('[Shield] Successfully subscribed to state changes');
    } catch (e) {
        console.error('[Shield] Failed to subscribe:', e);
    }
}

// Parse shield activity to get pending tasks
function parseShieldActivity(activity) {
    // activity = "set_box_mode: Home 5" or "Idle" or "nečinný" or null
    if (!activity ||
        activity === 'Idle' ||
        activity === 'idle' ||
        activity === 'nečinný' ||
        activity === 'Nečinný') {
        return null;
    }

    // Try to match pattern: "service_name: target_value"
    const match = activity.match(/^(\w+):\s*(.+)$/);
    if (!match) {
        // Don't warn for known idle states
        if (!['idle', 'Idle', 'nečinný', 'Nečinný'].includes(activity)) {
            console.warn('[Shield] Cannot parse activity:', activity);
        }
        return null;
    }

    return {
        service: match[1],      // "set_box_mode"
        target: match[2].trim() // "Home 5"
    };
}

// Update shield UI (global status bar)
async function updateShieldUI() {
    try {
        const statusEl = document.getElementById('shield-global-status');
        if (!statusEl) return;

        // Get shield sensors (use dynamic lookup for queue and activity)
        const shieldStatus = await getSensor(getSensorId('service_shield_status'));
        const shieldQueue = await getSensor(findShieldSensorId('service_shield_queue'));
        const shieldActivity = await getSensor(findShieldSensorId('service_shield_activity'));

        const status = shieldStatus.value || 'Idle';
        const queueCount = parseInt(shieldQueue.value) || 0;
        const activity = shieldActivity.value || 'Idle';

        console.log('[Shield] Status:', status, 'Queue:', queueCount, 'Activity:', activity);

        // Update status bar based on state
        if (status === 'Running' || status === 'running') {
            statusEl.innerHTML = `🔄 Zpracovává: ${activity}`;
            statusEl.className = 'shield-status processing';
        } else if (queueCount > 0) {
            const plural = queueCount === 1 ? 'úkol' : queueCount < 5 ? 'úkoly' : 'úkolů';
            statusEl.innerHTML = `⏳ Ve frontě: ${queueCount} ${plural}`;
            statusEl.className = 'shield-status pending';
        } else {
            statusEl.innerHTML = `✓ Připraveno`;
            statusEl.className = 'shield-status idle';
        }
    } catch (e) {
        console.error('[Shield] Error updating shield UI:', e);
    }
}

// Update button states based on shield status
async function updateButtonStates() {
    try {
        // console.log('[Shield] Updating button states...');

        // Get shield sensors (string values for status/activity, use dynamic lookup)
        const shieldStatus = await getSensorString(getSensorId('service_shield_status'));
        const shieldQueue = await getSensor(findShieldSensorId('service_shield_queue'));
        const shieldActivity = await getSensorString(findShieldSensorId('service_shield_activity'));

        // Get current states (string values)
        const boxMode = await getSensorString(getSensorId('box_prms_mode'));
        const boilerMode = await getSensorStringSafe(getSensorId('boiler_manual_mode'));

        // Parse shield activity
        const pending = parseShieldActivity(shieldActivity.value);
        const isRunning = (shieldStatus.value === 'Running' || shieldStatus.value === 'running');
        const queueCount = parseInt(shieldQueue.value) || 0;

        // console.log('[Shield] Parsed state:', {
        //     pending,
        //     isRunning,
        //     queueCount,
        //     boxMode: boxMode.value,
        //     boilerMode: boilerMode.value
        // });

        // Update Box Mode buttons
        updateBoxModeButtons(boxMode.value, pending, isRunning);

        // Update Boiler Mode buttons
        updateBoilerModeButtons(boilerMode.value, pending, isRunning);

        // Update Grid Delivery buttons
        await updateGridDeliveryButtons(pending, isRunning);

        // Update Battery Formating buttons
        await updateBatteryFormatingButtons(pending, isRunning);

    } catch (e) {
        console.error('[Shield] Error updating button states:', e);
    }
}

// Update Box Mode buttons
function updateBoxModeButtons(currentMode, pending, isRunning) {
    const modes = ['Home 1', 'Home 2', 'Home 3', 'Home UPS'];
    const buttonIds = {
        'Home 1': 'btn-mode-home1',
        'Home 2': 'btn-mode-home2',
        'Home 3': 'btn-mode-home3',
        'Home UPS': 'btn-mode-ups'
    };

    modes.forEach(mode => {
        const btn = document.getElementById(buttonIds[mode]);
        if (!btn) return;

        // Reset classes
        btn.classList.remove('active', 'pending', 'processing', 'disabled-by-service');

        // OPRAVA: Zamknout VŠECHNA tlačítka pokud běží set_box_mode (nezávisle na target)
        if (pending && pending.service === 'set_box_mode') {
            btn.disabled = true;
            // Pokud je tento mode cílový, zobraz jako processing/pending
            if (pending.target === mode) {
                btn.classList.add(isRunning ? 'processing' : 'pending');
                // console.log(`[Shield] Button ${mode} -> ${isRunning ? 'processing' : 'pending'} (target)`);
            } else {
                // Ostatní tlačítka jen zamknout
                btn.classList.add('disabled-by-service');
                // console.log(`[Shield] Button ${mode} -> disabled (service running)`);
            }
        }
        // Check if this is current mode (exact match)
        else {
            btn.disabled = false;
            if (currentMode === mode) {
                btn.classList.add('active');
                // console.log(`[Shield] Button ${mode} -> active (currentMode: ${currentMode})`);
            }
        }
    });

    // Update status text
    const statusEl = document.getElementById('box-mode-status');
    if (!statusEl) return;

    if (pending && pending.service === 'set_box_mode') {
        const arrow = isRunning ? '🔄' : '⏳';
        statusEl.innerHTML = `${currentMode} ${arrow} <span class="transitioning">${pending.target}</span>`;
    } else {
        statusEl.textContent = currentMode || '--';
    }
}

// Update Boiler Mode buttons
function updateBoilerModeButtons(currentModeRaw, pending, isRunning) {
    // boiler_manual_mode sensor: "CBB" = CBB, "Manuální" = Manual
    const currentMode = currentModeRaw === 'Manuální' ? 'Manual' : 'CBB';
    const modes = ['CBB', 'Manual'];

    modes.forEach(mode => {
        const btnId = `btn-boiler-${mode.toLowerCase()}`;
        const btn = document.getElementById(btnId);
        if (!btn) return;

        // Reset classes
        btn.classList.remove('active', 'pending', 'processing', 'disabled-by-service');

        // OPRAVA: Zamknout VŠECHNA tlačítka pokud běží set_boiler_mode (nezávisle na target)
        if (pending && pending.service === 'set_boiler_mode') {
            btn.disabled = true;
            // Pokud je tento mode cílový, zobraz jako processing/pending
            if (pending.target === mode) {
                btn.classList.add(isRunning ? 'processing' : 'pending');
                // console.log(`[Shield] Boiler ${mode} -> ${isRunning ? 'processing' : 'pending'} (target)`);
            } else {
                // Ostatní tlačítka jen zamknout
                btn.classList.add('disabled-by-service');
                // console.log(`[Shield] Boiler ${mode} -> disabled (service running)`);
            }
        }
        // Check if active
        else {
            btn.disabled = false;
            if (currentMode === mode) {
                btn.classList.add('active');
                // console.log(`[Shield] Boiler ${mode} -> active`);
            }
        }
    });

    // Update status
    const statusEl = document.getElementById('boiler-mode-status');
    if (!statusEl) return;

    if (pending && pending.service === 'set_boiler_mode') {
        const arrow = isRunning ? '🔄' : '⏳';
        statusEl.innerHTML = `${currentMode} ${arrow} <span class="transitioning">${pending.target}</span>`;
    } else {
        statusEl.textContent = currentMode;
    }
}

// Update Grid Delivery buttons
async function updateGridDeliveryButtons(pending, isRunning) {
    try {
        // Get current grid delivery mode (string) and limit (number)
        const gridModeData = await getSensorString(getSensorId('invertor_prms_to_grid'));
        const gridLimitData = await getSensor(getSensorId('invertor_prm1_p_max_feed_grid'));

        const currentMode = gridModeData.value || '';
        const currentLimit = gridLimitData.value || 0;
        const isChanging = currentMode === 'Probíhá změna';

        // console.log('[Shield] Grid delivery - mode:', currentMode, 'limit:', currentLimit, 'isChanging:', isChanging);

        // Update mode buttons
        // Sensor vrací: "Vypnuto", "Zapnuto", "Omezeno" (nebo "Probíhá změna")
        // Mapování sensor hodnota -> button label
        const modeMapping = {
            'Vypnuto': 'Vypnuto / Off',
            'Zapnuto': 'Zapnuto / On',
            'Omezeno': 'S omezením / Limited'
        };

        const modeButtons = {
            'Vypnuto / Off': 'btn-grid-off',
            'Zapnuto / On': 'btn-grid-on',
            'S omezením / Limited': 'btn-grid-limited'
        };

        // Zjistit jaký button label odpovídá current mode
        const currentModeLabel = modeMapping[currentMode] || currentMode;

        Object.entries(modeButtons).forEach(([mode, btnId]) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;

            btn.classList.remove('active', 'pending', 'processing');

            // If "Probíhá změna", disable all buttons and show processing on all
            if (isChanging) {
                btn.disabled = true;
                btn.classList.add('processing');
                // console.log(`[Shield] Grid ${mode} -> disabled (změna probíhá)`);
                return;
            }

            // OPRAVA: Zamknout VŠECHNA tlačítka pokud běží set_grid_delivery (nezávisle na target)
            if (pending && pending.service === 'set_grid_delivery') {
                btn.disabled = true;

                // Pokud pending target je číslo (limit change), animuj tlačítko "S omezením"
                const isLimitChange = !isNaN(parseInt(pending.target));
                const isTargetButton = isLimitChange
                    ? btnId === 'btn-grid-limited'  // Při změně limitu animuj "S omezením"
                    : pending.target && pending.target.includes(mode.split(' ')[0]); // Při změně mode animuj odpovídající tlačítko

                if (isTargetButton) {
                    btn.classList.add(isRunning ? 'processing' : 'pending');
                    // console.log(`[Shield] Grid ${mode} -> ${isRunning ? 'processing' : 'pending'} (target)`);
                } else {
                    // Ostatní tlačítka jen zamknout, nezobrazovat jako pending
                    btn.classList.add('disabled-by-service');
                    // console.log(`[Shield] Grid ${mode} -> disabled (service running)`);
                }
            }
            // Check if active (porovnat label s currentModeLabel)
            else {
                btn.disabled = false;
                if (mode === currentModeLabel) {
                    btn.classList.add('active');
                    // console.log(`[Shield] Grid ${mode} -> active (currentMode: ${currentMode})`);
                }
            }
        });

        // Update limit display
        const inputEl = document.getElementById('grid-limit');
        if (inputEl) {
            // If pending limit change, show target value with highlight
            if (pending && pending.service === 'set_grid_delivery' && !isNaN(parseInt(pending.target))) {
                inputEl.value = pending.target;
                inputEl.style.borderColor = isRunning ? '#42a5f5' : '#ffc107';
            }
            // Otherwise show current limit
            else {
                inputEl.value = currentLimit;
                inputEl.style.borderColor = '';
            }
        }

    } catch (e) {
        console.error('[Shield] Error updating grid delivery buttons:', e);
    }
}

// Update Battery Formating button (charge-battery-btn)
async function updateBatteryFormatingButtons(pending, isRunning) {
    try {
        const chargeBtn = document.getElementById('charge-battery-btn');
        if (!chargeBtn) return;

        // Pokud je pending task pro battery formating
        if (pending && pending.service === 'set_formating_mode') {
            chargeBtn.classList.remove('pending', 'processing');
            chargeBtn.classList.add(isRunning ? 'processing' : 'pending');
            // console.log(`[Shield] Battery charging -> ${pending.target} (${isRunning ? 'processing' : 'pending'})`);
        } else {
            chargeBtn.classList.remove('pending', 'processing');
        }

    } catch (e) {
        console.error('[Shield] Error updating battery formating buttons:', e);
    }
}

// Get HA connection
function getHass() {
    try {
        return parent.document.querySelector('home-assistant').hass;
    } catch (e) {
        console.error('Cannot get HA instance:', e);
        return null;
    }
}

// Open entity more-info dialog
function openEntityDialog(entityId) {
    const hass = getHass();
    if (!hass) {
        console.error('Cannot open entity dialog - no HA connection');
        return;
    }

    try {
        const event = new Event('hass-more-info', {
            bubbles: true,
            composed: true
        });
        event.detail = { entityId: entityId };
        parent.document.querySelector('home-assistant').dispatchEvent(event);
        console.log(`[Entity] Opened dialog for ${entityId}`);
    } catch (e) {
        console.error(`[Entity] Failed to open dialog for ${entityId}:`, e);
    }
}

// Call HA service
async function callService(domain, service, data) {
    console.log(`[Service] Calling ${domain}.${service} with data:`, JSON.stringify(data));
    const hass = getHass();
    if (!hass) {
        console.error('[Service] Failed to get hass object');
        showNotification('Chyba', 'Nelze získat připojení k Home Assistant', 'error');
        return false;
    }

    try {
        console.log(`[Service] Executing ${domain}.${service}...`);
        await hass.callService(domain, service, data);
        console.log(`[Service] ✅ Success: ${domain}.${service}`);

        // Shield queue will be updated automatically via WebSocket event (sensor state change)
        // No need to manually trigger update here - backend callback handles it instantly

        return true;
    } catch (e) {
        console.error(`[Service] ❌ Error calling ${domain}.${service}:`, e);
        console.error('[Service] Error details:', e.message, e.stack);
        showNotification('Chyba', e.message || 'Volání služby selhalo', 'error');
        return false;
    }
}

// Show notification toast
function showNotification(title, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `notification-toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <strong>${title}</strong>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="toast-body">${message}</div>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// Track mode change state
let modeChangeInProgress = false;
let lastModeChangeNotified = false;

// Shield Queue live duration update
let shieldQueueUpdateInterval = null;

function startShieldQueueLiveUpdate() {
    // Clear existing interval
    if (shieldQueueUpdateInterval) {
        clearInterval(shieldQueueUpdateInterval);
    }

    // Update every second for live duration
    shieldQueueUpdateInterval = setInterval(() => {
        updateShieldQueue();
    }, 1000);
}

function stopShieldQueueLiveUpdate() {
    if (shieldQueueUpdateInterval) {
        clearInterval(shieldQueueUpdateInterval);
        shieldQueueUpdateInterval = null;
    }
}

// Update Shield Queue display
function updateShieldQueue() {
    try {
        // Use Hass states directly (instant, no API call needed!)
        const hass = getHass();
        if (!hass || !hass.states) {
            console.warn('[Queue] Hass not available');
            return;
        }

        // Use helper function to find sensor (handles _2, _3 suffixes)
        const entityId = findShieldSensorId('service_shield_activity');

        if (!entityId) {
            console.warn('[Queue] service_shield_activity sensor not found');
            return;
        }

        const activitySensor = hass.states[entityId];
        const container = document.getElementById('shield-queue-container');

        if (!activitySensor || !activitySensor.attributes || !container) {
            console.warn('[Queue] Missing data:', {
                sensor: entityId,
                hasState: !!activitySensor,
                hasAttrs: !!activitySensor?.attributes,
                hasContainer: !!container
            });
            return;
        }

        const attrs = activitySensor.attributes;
        const runningRequests = attrs.running_requests || [];
        const queuedRequests = attrs.queued_requests || [];
        const allRequests = [...runningRequests, ...queuedRequests];

        if (allRequests.length === 0) {
            container.innerHTML = '<div class="queue-empty">✅ Fronta je prázdná</div>';
            stopShieldQueueLiveUpdate(); // Stop live updates when queue is empty
            return;
        }

        // Start live duration updates when there are active requests
        if (!shieldQueueUpdateInterval) {
            startShieldQueueLiveUpdate();
        }

        // Build table
        let html = '<table class="shield-queue-table">';
        html += '<thead><tr><th>Stav</th><th>Služba</th><th>Změny</th><th>Vytvořeno</th><th>Trvání</th><th>Akce</th></tr></thead>';
        html += '<tbody>';

        allRequests.forEach((req, index) => {
            const isRunning = index === 0 && runningRequests.length > 0;
            const isQueued = !isRunning; // Anything not running is queued

            // OPRAVA: Přidat position pro delete button (1-based index pro backend)
            // Running má position 1, queued jsou 2, 3, 4, ...
            req.position = index + 1;

            const statusClass = isRunning ? 'queue-status-running' : 'queue-status-queued';
            const statusIcon = isRunning ? '🔄' : '⏳';
            const statusText = isRunning ? 'Zpracovává se' : 'Čeká';

            // Format service name to human-readable Czech
            const serviceMap = {
                'set_box_mode': '🏠 Změna režimu boxu',
                'set_grid_delivery': '💧 Změna nastavení přetoků',
                'set_grid_delivery_limit': '🔢 Změna limitu přetoků',
                'set_boiler_mode': '🔥 Změna nastavení bojleru',
                'set_formating_mode': '🔋 Změna nabíjení baterie',
                'set_battery_capacity': '⚡ Změna kapacity baterie'
            };
            let serviceName = serviceMap[req.service] || req.service || 'N/A';

            // Format changes
            let changes = 'N/A';
            if (req.changes && Array.isArray(req.changes) && req.changes.length > 0) {
                changes = req.changes.map(ch => {
                    // Try to extract just the important part
                    const match = ch.match(/:\s*'?([^'→]+)'?\s*→\s*'?([^'(]+)'?/);
                    if (match) {
                        let from = match[1].trim();
                        let to = match[2].trim();

                        // Mapování hodnot pro lepší čitelnost
                        const valueMap = {
                            'CBB': 'Inteligentní',
                            'Manual': 'Manuální',
                            'Manuální': 'Manuální'
                        };

                        from = valueMap[from] || from;
                        to = valueMap[to] || to;

                        return `${from} → ${to}`;
                    }
                    return ch;
                }).join('<br>');
            }

            // Format creation time and duration
            let createdText = '<span style="opacity: 0.4;">--</span>';
            let durationText = '<span style="opacity: 0.4;">--</span>';

            // Try multiple timestamp fields (started_at for running, queued_at for queued)
            const timestamp = req.started_at || req.queued_at || req.created_at || req.timestamp || req.created;

            if (timestamp) {
                try {
                    const createdDate = new Date(timestamp);
                    const now = new Date();
                    const diffSec = Math.floor((now - createdDate) / 1000);

                    // Format creation time (HH:MM)
                    const hours = String(createdDate.getHours()).padStart(2, '0');
                    const minutes = String(createdDate.getMinutes()).padStart(2, '0');
                    createdText = `${hours}:${minutes}`;

                    // Add date if not today
                    const isToday = createdDate.toDateString() === now.toDateString();
                    if (!isToday) {
                        const day = createdDate.getDate();
                        const month = createdDate.getMonth() + 1;
                        createdText = `${day}.${month}. ${createdText}`;
                    }

                    // Format duration (how long in queue)
                    if (diffSec < 60) {
                        durationText = `${diffSec}s`;
                    } else if (diffSec < 3600) {
                        const diffMin = Math.floor(diffSec / 60);
                        const diffSecRem = diffSec % 60;
                        durationText = `${diffMin}m ${diffSecRem}s`;
                    } else {
                        const diffHours = Math.floor(diffSec / 3600);
                        const diffMin = Math.floor((diffSec % 3600) / 60);
                        durationText = `${diffHours}h ${diffMin}m`;
                    }
                } catch (e) {
                    console.warn('[Queue] Invalid timestamp format:', timestamp, e);
                }
            } else {
                console.warn('[Queue] No timestamp found in request:', req);
            }

            html += `
                <tr>
                    <td class="${statusClass}">${statusIcon} ${statusText}</td>
                    <td>${serviceName}</td>
                    <td style="font-size: 11px;">${changes}</td>
                    <td class="queue-time">${createdText}</td>
                    <td class="queue-time" style="font-weight: 600;">${durationText}</td>
                    <td style="text-align: center;">
                        ${isQueued ? `
                            <button
                                onclick="removeFromQueue(${req.position})"
                                style="
                                    background: none;
                                    border: none;
                                    cursor: pointer;
                                    font-size: 18px;
                                    opacity: 0.6;
                                    padding: 4px 8px;
                                    transition: all 0.2s;
                                "
                                onmouseover="this.style.opacity='1'; this.style.transform='scale(1.2)'"
                                onmouseout="this.style.opacity='0.6'; this.style.transform='scale(1)'"
                                title="Odstranit z fronty"
                            >🗑️</button>
                        ` : '<span style="opacity: 0.3;">—</span>'}
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;

    } catch (e) {
        console.error('[Queue] Error updating queue display:', e);
    }
}

// ============================================================================
// SHIELD MONITORING - Simplified universal approach
// ============================================================================

// Helper: Parse service request to get type and target value
function parseServiceRequest(request) {
    if (!request || !request.service) {
        return null;
    }

    const service = request.service;

    // NOVÝ PŘÍSTUP: Použij strukturovaná data z targets[] místo parsování changes[]
    if (request.targets && Array.isArray(request.targets) && request.targets.length > 0) {
        const target = request.targets[0];

        // Mapování param → type
        if (service.includes('set_box_mode') && target.param === 'mode') {
            return { type: 'box_mode', targetValue: target.value };
        }

        if (service.includes('set_boiler_mode') && target.param === 'mode') {
            return { type: 'boiler_mode', targetValue: target.value };
        }

        if (service.includes('set_grid_delivery') && target.param === 'mode') {
            return { type: 'grid_mode', targetValue: target.value };
        }

        if (service.includes('set_grid_delivery') && target.param === 'limit') {
            return { type: 'grid_limit', targetValue: target.value };
        }
    }

    // FALLBACK: Starý přístup pro kompatibilitu (pokud targets[] není dostupný)
    if (!request.changes || !Array.isArray(request.changes)) {
        return null;
    }

    const changeStr = request.changes[0] || '';

    // Box mode: "prms_mode: 'Home 1' → 'Home 2'"
    if (service.includes('set_box_mode')) {
        const match = changeStr.match(/→\s*'([^']+)'/);
        return match ? { type: 'box_mode', targetValue: match[1] } : null;
    }

    // Boiler mode: "manual_mode: 'CBB' → 'Manuální'"
    if (service.includes('set_boiler_mode')) {
        const match = changeStr.match(/→\s*'([^']+)'/);
        return match ? { type: 'boiler_mode', targetValue: match[1] } : null;
    }

    // Grid mode: "prms_to_grid: 'Vypnuto' → 'Zapnuto'"
    if (service.includes('set_grid_delivery') && changeStr.includes('prms_to_grid')) {
        const match = changeStr.match(/→\s*'([^']+)'/);
        return match ? { type: 'grid_mode', targetValue: match[1] } : null;
    }

    // Grid limit: "p_max_feed_grid: 5400 → 3000"
    if (service.includes('set_grid_delivery') && changeStr.includes('p_max_feed_grid')) {
        const match = changeStr.match(/→\s*(\d+)/);
        return match ? { type: 'grid_limit', targetValue: match[1] } : null;
    }

    return null;
}

// Helper: Show changing indicator for specific service type
function showChangingIndicator(type, targetValue, startedAt = null) {
    // console.log(`[Shield] Showing change indicator: ${type} → ${targetValue} (started: ${startedAt})`);

    switch (type) {
        case 'box_mode':
            showBoxModeChanging(targetValue);
            break;
        case 'boiler_mode':
            showBoilerModeChanging(targetValue);
            break;
        case 'grid_mode':
            showGridModeChanging(targetValue, startedAt);
            break;
        case 'grid_limit':
            showGridLimitChanging(targetValue, startedAt);
            break;
    }
}

// Helper: Hide changing indicator for specific service type
function hideChangingIndicator(type) {
    // console.log(`[Shield] Hiding change indicator: ${type}`);

    switch (type) {
        case 'box_mode':
            hideBoxModeChanging();
            break;
        case 'boiler_mode':
            hideBoilerModeChanging();
            break;
        case 'grid_mode':
            hideGridModeChanging();
            break;
        case 'grid_limit':
            hideGridLimitChanging();
            break;
    }
}

// Main monitor function - simplified
let isMonitoringShieldActivity = false;

async function monitorShieldActivity() {
    if (isMonitoringShieldActivity) {
        // console.log('[Shield] Skipping - already running');
        return;
    }

    isMonitoringShieldActivity = true;

    try {
        const hass = getHass();
        if (!hass || !hass.states) return;

        // Find activity sensor
        const sensorPrefix = `sensor.oig_${INVERTER_SN}_service_shield_activity`;
        const entityId = Object.keys(hass.states).find(id => id.startsWith(sensorPrefix));
        if (!entityId) return;

        const activitySensor = hass.states[entityId];
        if (!activitySensor || !activitySensor.attributes) return;

        const attrs = activitySensor.attributes;
        const runningRequests = attrs.running_requests || [];
        const queuedRequests = attrs.queued_requests || [];
        const allRequests = [...runningRequests, ...queuedRequests];

        // console.log('[Shield] Monitoring:', {
        //     running: runningRequests.length,
        //     queued: queuedRequests.length,
        //     total: allRequests.length
        // });

        // Track which service types are active
        const activeServices = new Set();

        // Parse all requests and show indicators
        allRequests.forEach(request => {
            const parsed = parseServiceRequest(request);
            if (parsed) {
                activeServices.add(parsed.type);
                // Pass the full request object for started_at access
                showChangingIndicator(parsed.type, parsed.targetValue, request.started_at);
            }
        });

        // Hide indicators for service types that are no longer active
        const allServiceTypes = ['box_mode', 'boiler_mode', 'grid_mode', 'grid_limit'];
        allServiceTypes.forEach(type => {
            if (!activeServices.has(type)) {
                hideChangingIndicator(type);
            }
        });

    } catch (e) {
        console.error('[Shield] Error monitoring activity:', e);
    } finally {
        isMonitoringShieldActivity = false;
    }
}

// ============================================================================
// SERVICE-SPECIFIC SHOW/HIDE FUNCTIONS
// ============================================================================

// Box Mode
function showBoxModeChanging(targetMode) {
    const modeButtonMap = {
        'Home 1': 'btn-mode-home1',
        'Home 2': 'btn-mode-home2',
        'Home 3': 'btn-mode-home3',
        'Home UPS': 'btn-mode-ups'
    };

    const buttonIds = Object.values(modeButtonMap);
    const buttons = buttonIds.map(id => document.getElementById(id)).filter(b => b);
    const targetButtonId = modeButtonMap[targetMode];

    // Flow diagram: blink mode text
    const inverterModeElement = document.getElementById('inverter-mode');
    if (inverterModeElement) {
        inverterModeElement.classList.add('mode-changing');
    }

    // Show badge
    const modeChangeIndicator = document.getElementById('mode-change-indicator');
    const modeChangeText = document.getElementById('mode-change-text');
    if (modeChangeIndicator && modeChangeText) {
        modeChangeText.textContent = `→ ${targetMode}`;
        modeChangeIndicator.style.display = 'flex';
    }

    // Lock buttons, animate target
    buttons.forEach(btn => {
        btn.disabled = true;
        if (btn.id === targetButtonId) {
            btn.style.animation = 'pulse-pending 1.5s ease-in-out infinite';
            btn.style.opacity = '0.8';
        } else {
            btn.style.animation = '';
            btn.style.opacity = '0.5';
        }
    });
}

function hideBoxModeChanging() {
    const buttonIds = ['btn-mode-home1', 'btn-mode-home2', 'btn-mode-home3', 'btn-mode-ups'];
    const buttons = buttonIds.map(id => document.getElementById(id)).filter(b => b);

    // Remove flow diagram animation
    const inverterModeElement = document.getElementById('inverter-mode');
    if (inverterModeElement) {
        inverterModeElement.classList.remove('mode-changing');
    }

    // Hide badge
    const modeChangeIndicator = document.getElementById('mode-change-indicator');
    if (modeChangeIndicator) {
        modeChangeIndicator.style.display = 'none';
    }

    // Unlock buttons
    buttons.forEach(btn => {
        btn.disabled = false;
        btn.style.animation = '';
        btn.style.opacity = '';
    });
}

// Boiler Mode
function showBoilerModeChanging(targetMode) {
    const boilerModeMap = {
        'CBB': 'cbb',
        'Manual': 'manual',
        'Manuální': 'manual',
        'Inteligentní': 'cbb'
    };

    const boilerButtons = [
        document.getElementById('btn-boiler-cbb'),
        document.getElementById('btn-boiler-manual')
    ].filter(b => b);

    const targetModeLower = boilerModeMap[targetMode] || targetMode?.toLowerCase();
    const targetButtonId = targetModeLower ? `btn-boiler-${targetModeLower}` : null;

    // Flow diagram: blink mode text
    const boilerModeElement = document.getElementById('boiler-mode');
    if (boilerModeElement) {
        boilerModeElement.classList.add('mode-changing');
    }

    // Show badge
    const boilerChangeIndicator = document.getElementById('boiler-change-indicator');
    const boilerChangeText = document.getElementById('boiler-change-text');
    if (boilerChangeIndicator && boilerChangeText) {
        const isIntelligent = targetMode === 'CBB' || targetMode === 'Inteligentní';
        const modeIcon = isIntelligent ? '🤖' : '👤';
        const modeName = isIntelligent ? 'Inteligentní' : 'Manuální';
        boilerChangeText.textContent = `${modeIcon} ${modeName}`;
        boilerChangeIndicator.style.display = 'flex';
    }

    // Lock buttons, animate target
    boilerButtons.forEach(btn => {
        btn.disabled = true;
        if (btn.id === targetButtonId) {
            btn.style.animation = 'pulse-pending 1.5s ease-in-out infinite';
            btn.style.opacity = '0.8';
        } else {
            btn.style.animation = '';
            btn.style.opacity = '0.5';
        }
    });
}

function hideBoilerModeChanging() {
    const boilerButtons = [
        document.getElementById('btn-boiler-cbb'),
        document.getElementById('btn-boiler-manual')
    ].filter(b => b);

    // Remove flow diagram animation
    const boilerModeElement = document.getElementById('boiler-mode');
    if (boilerModeElement) {
        boilerModeElement.classList.remove('mode-changing');
    }

    // Hide badge
    const boilerChangeIndicator = document.getElementById('boiler-change-indicator');
    if (boilerChangeIndicator) {
        boilerChangeIndicator.style.display = 'none';
    }

    // Unlock buttons
    boilerButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.animation = '';
        btn.style.opacity = '';
    });
}

// Grid Mode
function showGridModeChanging(targetMode, startedAt = null) {
    const gridModeMap = {
        'Off': 'off',
        'Vypnuto': 'off',
        'On': 'on',
        'Zapnuto': 'on',
        'Limited': 'limited',
        'Omezeno': 'limited',
        'S omezením': 'limited'
    };

    const gridButtons = [
        document.getElementById('btn-grid-off'),
        document.getElementById('btn-grid-on'),
        document.getElementById('btn-grid-limited')
    ].filter(b => b);

    const gridModeLower = gridModeMap[targetMode];
    const targetButtonId = gridModeLower ? `btn-grid-${gridModeLower}` : null;

    // Flow diagram: blink mode text
    const gridExportModeElement = document.getElementById('inverter-grid-export-mode');
    if (gridExportModeElement) {
        gridExportModeElement.classList.add('mode-changing');
    }

    // Show badge - bez duration!
    const gridChangeIndicator = document.getElementById('grid-change-indicator');
    const gridChangeText = document.getElementById('grid-change-text');
    if (gridChangeIndicator && gridChangeText) {
        const isOff = targetMode === 'Off' || targetMode === 'Vypnuto';
        const isOn = targetMode === 'On' || targetMode === 'Zapnuto';
        const modeIcon = isOff ? '🚫' : isOn ? '💧' : '🚰';
        const modeName = isOff ? 'Vypnuto' : isOn ? 'Zapnuto' : 'Omezeno';

        gridChangeText.textContent = `${modeIcon} ${modeName}`;
        gridChangeIndicator.style.display = 'flex';
    }

    // Lock buttons, animate target
    gridButtons.forEach(btn => {
        btn.disabled = true;
        if (btn.id === targetButtonId) {
            btn.style.animation = 'pulse-pending 1.5s ease-in-out infinite';
            btn.style.opacity = '0.8';
        } else {
            btn.style.animation = '';
            btn.style.opacity = '0.5';
        }
    });
}

function hideGridModeChanging() {
    const gridButtons = [
        document.getElementById('btn-grid-off'),
        document.getElementById('btn-grid-on'),
        document.getElementById('btn-grid-limited')
    ].filter(b => b);

    // Remove flow diagram animation
    const gridExportModeElement = document.getElementById('inverter-grid-export-mode');
    if (gridExportModeElement) {
        gridExportModeElement.classList.remove('mode-changing');
    }

    // Hide badge
    const gridChangeIndicator = document.getElementById('grid-change-indicator');
    if (gridChangeIndicator) {
        gridChangeIndicator.style.display = 'none';
    }

    // Unlock buttons
    gridButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.animation = '';
        btn.style.opacity = '';
    });
}

// Grid Limit
function showGridLimitChanging(targetLimit, startedAt = null) {
    const gridButtons = [
        document.getElementById('btn-grid-off'),
        document.getElementById('btn-grid-on'),
        document.getElementById('btn-grid-limited')
    ].filter(b => b);

    // When only limit changes, animate the Limited button
    const targetButtonId = 'btn-grid-limited';

    // Animate limit value in flow diagram
    const gridLimitElement = document.getElementById('inverter-export-limit');
    if (gridLimitElement) {
        gridLimitElement.classList.add('mode-changing');
    }

    // Show limit badge (different from mode badge) - bez duration!
    const gridLimitIndicator = document.getElementById('grid-limit-indicator');
    const gridLimitText = document.getElementById('grid-limit-text');
    if (gridLimitIndicator && gridLimitText) {
        gridLimitText.textContent = `→ ${targetLimit}W`;
        gridLimitIndicator.style.display = 'flex';
    }

    // Lock buttons, animate Limited
    gridButtons.forEach(btn => {
        btn.disabled = true;
        if (btn.id === targetButtonId) {
            btn.style.animation = 'pulse-pending 1.5s ease-in-out infinite';
            btn.style.opacity = '0.8';
        } else {
            btn.style.animation = '';
            btn.style.opacity = '0.5';
        }
    });
}

function hideGridLimitChanging() {
    const gridButtons = [
        document.getElementById('btn-grid-off'),
        document.getElementById('btn-grid-on'),
        document.getElementById('btn-grid-limited')
    ].filter(b => b);

    // Remove limit value animation in flow diagram
    const gridLimitElement = document.getElementById('inverter-export-limit');
    if (gridLimitElement) {
        gridLimitElement.classList.remove('mode-changing');
    }

    // Hide limit badge
    const gridLimitIndicator = document.getElementById('grid-limit-indicator');
    if (gridLimitIndicator) {
        gridLimitIndicator.style.display = 'none';
    }

    // Unlock buttons (only if no mode change is active)
    gridButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.animation = '';
        btn.style.opacity = '';
    });
}

// ============================================================================
// END OF SHIELD MONITORING
// ============================================================================

// Show grid delivery dialog with optional limit input
function showGridDeliveryDialog(mode, currentLimit) {
    return new Promise((resolve) => {
        const needsLimit = mode === 'S omezením / Limited';
        const modeDisplayName = mode === 'Vypnuto / Off' ? 'Vypnuto' :
            mode === 'Zapnuto / On' ? 'Zapnuto' :
                'S omezením';
        const modeIcon = mode === 'Vypnuto / Off' ? '🚫' :
            mode === 'Zapnuto / On' ? '💧' : '🚰';

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'ack-dialog-overlay';

        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'ack-dialog';

        const limitInputHtml = needsLimit ? `
            <div class="ack-dialog-body" style="margin-bottom: 15px;">
                <label for="grid-limit-input" style="display: block; margin-bottom: 8px; font-weight: 600;">
                    Zadejte limit přetoků (W):
                </label>
                <input type="number"
                       id="grid-limit-input"
                       placeholder="např. 5000"
                       min="1"
                       max="20000"
                       step="100"
                       value="${currentLimit || 5000}"
                       class="dialog-input">
                <small style="display: block; margin-top: 5px; opacity: 0.7;">Rozsah: 1-20000 W</small>
            </div>
        ` : '';

        dialog.innerHTML = `
            <div class="ack-dialog-header">
                ${modeIcon} Změna dodávky do sítě
            </div>
            <div class="ack-dialog-body">
                Chystáte se změnit dodávku do sítě na: <strong>"${modeDisplayName}"</strong>
            </div>
            ${limitInputHtml}
            <div class="ack-dialog-warning">
                ⚠️ <strong>Upozornění:</strong> ${needsLimit ?
                'Režim a limit budou změněny postupně (serializováno). Každá změna může trvat až 10 minut.' :
                'Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.'}
            </div>
            <div class="ack-checkbox-wrapper">
                <input type="checkbox" id="ack-checkbox">
                <label for="ack-checkbox">
                    <strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost.
                    Aplikace nenese odpovědnost za případné negativní důsledky této změny.
                </label>
            </div>
            <div class="ack-dialog-buttons">
                <button class="btn-cancel">Zrušit</button>
                <button class="btn-confirm" disabled>Potvrdit změnu</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const checkbox = dialog.querySelector('#ack-checkbox');
        const confirmBtn = dialog.querySelector('.btn-confirm');
        const cancelBtn = dialog.querySelector('.btn-cancel');
        const limitInput = dialog.querySelector('#grid-limit-input');

        // Enable confirm button only when checkbox is checked
        checkbox.addEventListener('change', () => {
            confirmBtn.disabled = !checkbox.checked;
        });

        // Handle confirm
        confirmBtn.addEventListener('click', () => {
            if (checkbox.checked) {
                let limit = null;
                if (needsLimit && limitInput) {
                    limit = parseInt(limitInput.value);
                    if (isNaN(limit) || limit < 1 || limit > 20000) {
                        alert('Prosím zadejte platný limit mezi 1-20000 W');
                        return;
                    }
                }
                document.body.removeChild(overlay);
                resolve({ confirmed: true, mode, limit });
            }
        });

        // Handle cancel
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve({ confirmed: false });
        });

        // Handle ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEsc);
                resolve({ confirmed: false });
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

// Show acknowledgement dialog
function showAcknowledgementDialog(title, message, onConfirm) {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'ack-dialog-overlay';

        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'ack-dialog';

        dialog.innerHTML = `
            <div class="ack-dialog-header">
                ⚠️ ${title}
            </div>
            <div class="ack-dialog-body">
                ${message}
            </div>
            <div class="ack-dialog-warning">
                ⚠️ <strong>Upozornění:</strong> Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.
            </div>
            <div class="ack-checkbox-wrapper">
                <input type="checkbox" id="ack-checkbox">
                <label for="ack-checkbox">
                    <strong>Souhlasím</strong> s tím, že měním režim boxu na vlastní odpovědnost.
                    Aplikace nenese odpovědnost za případné negativní důsledky této změny.
                </label>
            </div>
            <div class="ack-dialog-buttons">
                <button class="btn-cancel">Zrušit</button>
                <button class="btn-confirm" disabled>Potvrdit změnu</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const checkbox = dialog.querySelector('#ack-checkbox');
        const confirmBtn = dialog.querySelector('.btn-confirm');
        const cancelBtn = dialog.querySelector('.btn-cancel');

        // Enable confirm button only when checkbox is checked
        checkbox.addEventListener('change', () => {
            confirmBtn.disabled = !checkbox.checked;
        });

        // Handle confirm
        confirmBtn.addEventListener('click', () => {
            if (checkbox.checked) {
                document.body.removeChild(overlay);
                resolve(true);
            }
        });

        // Handle cancel
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(false);
        });

        // Handle ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEsc);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

// Jednoduchý confirm dialog bez checkboxu a vysvětlení
function showSimpleConfirmDialog(title, message, confirmText = 'OK', cancelText = 'Zrušit') {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'ack-dialog-overlay';

        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'ack-dialog';

        dialog.innerHTML = `
            <div class="ack-dialog-header">
                ⚠️ ${title}
            </div>
            <div class="ack-dialog-body" style="padding: 20px 0;">
                ${message}
            </div>
            <div class="ack-dialog-buttons">
                <button class="btn-cancel">${cancelText}</button>
                <button class="btn-confirm">${confirmText}</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const confirmBtn = dialog.querySelector('.btn-confirm');
        const cancelBtn = dialog.querySelector('.btn-cancel');

        // Handle confirm
        confirmBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(true);
        });

        // Handle cancel
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(false);
        });

        // Handle ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEsc);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

// Remove item from shield queue
async function removeFromQueue(position) {
    try {
        // Získat detaily položky pro název akce
        const shieldQueue = await getSensor(findShieldSensorId('service_shield_queue'));
        const requests = shieldQueue.attributes?.requests || [];
        const request = requests.find(r => r.position === position);

        let actionName = 'Operace';
        if (request) {
            if (request.service_name.includes('set_box_mode')) {
                actionName = `Změna režimu na ${request.target_display || request.target_value || 'neznámý'}`;
            } else if (request.service_name.includes('set_grid_limit')) {
                actionName = `Změna limitu do sítě na ${request.target_display || request.target_value || 'neznámý'}`;
            } else if (request.service_name.includes('set_grid_delivery_limit')) {
                actionName = `Změna limitu ze sítě na ${request.target_display || request.target_value || 'neznámý'}`;
            }
        }

        // Jednoduchý confirm dialog
        const confirmed = await showSimpleConfirmDialog(
            actionName,
            'Operace bude odstraněna z fronty bez provedení.',
            'OK',
            'Zrušit'
        );

        if (!confirmed) return;

        console.log(`[Queue] Removing position ${position} from queue`);

        const success = await callService('oig_cloud', 'shield_remove_from_queue', {
            position: position
        });

        if (success) {
            // Tichá aktualizace bez notifikace
            await updateShieldQueue();
            await updateShieldUI();
        } else {
            showNotification('Chyba', 'Nepodařilo se odstranit položku z fronty', 'error');
        }
    } catch (e) {
        console.error('[Queue] Error removing from queue:', e);
        showNotification('Chyba', 'Chyba při odstraňování z fronty', 'error');
    }
}

// === SHIELD SERVICE CALL HELPERS ===

/**
 * Univerzální wrapper pro volání služeb s pending UI
 * @param {Object} config - Konfigurace
 * @param {string} config.serviceName - Název služby (pro UI)
 * @param {string} config.buttonId - ID tlačítka pro pending state (optional)
 * @param {Function} config.serviceCall - Async funkce která volá service
 * @param {boolean} config.skipQueueWarning - Přeskočit warning při plné frontě
 */
async function executeServiceWithPendingUI(config) {
    const { serviceName, buttonId, serviceCall, skipQueueWarning = false } = config;

    try {
        // Check shield queue before adding task
        if (!skipQueueWarning) {
            const shieldQueue = await getSensor(findShieldSensorId('service_shield_queue'));
            const queueCount = parseInt(shieldQueue.value) || 0;

            if (queueCount >= 3) {
                const proceed = confirm(
                    `⚠️ VAROVÁNÍ: Fronta již obsahuje ${queueCount} úkolů!\n\n` +
                    `Každá změna může trvat až 10 minut.\n` +
                    `Opravdu chcete přidat další úkol?`
                );
                if (!proceed) return false;
            }
        }

        // Show pending state immediately
        const btn = buttonId ? document.getElementById(buttonId) : null;
        if (btn) {
            btn.disabled = true;
            btn.classList.add('pending');
        }

        // Execute service call
        const success = await serviceCall();

        if (success) {
            // Okamžitá aktualizace UI bez čekání na WebSocket debounce
            monitorShieldActivity();
            await updateShieldQueue();
            await updateShieldUI();
            await updateButtonStates();
            return true;
        } else {
            // Re-enable on error
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('pending');
            }
            return false;
        }
    } catch (e) {
        console.error(`[Shield] Error in ${serviceName}:`, e);
        showNotification('Chyba', `Nepodařilo se provést: ${serviceName}`, 'error');

        // Re-enable button on error
        const btn = buttonId ? document.getElementById(buttonId) : null;
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('pending');
        }
        return false;
    }
}

// Set box mode
async function setBoxMode(mode) {
    try {
        // Check if mode is already active
        const currentModeData = await getSensorString(getSensorId('box_prms_mode'));
        const currentMode = currentModeData.value || '';

        if (currentMode.includes(mode)) {
            return; // Режим už je aktivní - tiše ignorovat
        }

        // Show acknowledgement dialog
        const confirmed = await showAcknowledgementDialog(
            'Změna režimu střídače',
            `Chystáte se změnit režim boxu na <strong>"${mode}"</strong>.<br><br>` +
            `Tato změna ovlivní chování celého systému a může trvat až 10 minut.`
        );
        if (!confirmed) return;

        // Button ID mapping
        const buttonIds = {
            'Home 1': 'btn-mode-home1',
            'Home 2': 'btn-mode-home2',
            'Home 3': 'btn-mode-home3',
            'Home UPS': 'btn-mode-ups'
        };

        // Execute with pending UI
        await executeServiceWithPendingUI({
            serviceName: 'Změna režimu boxu',
            buttonId: buttonIds[mode],
            serviceCall: async () => {
                return await callService('oig_cloud', 'set_box_mode', {
                    mode: mode,
                    acknowledgement: true
                });
            }
        });

    } catch (e) {
        console.error('[Shield] Error in setBoxMode:', e);
        showNotification('Chyba', 'Nepodařilo se změnit režim boxu', 'error');
    }
}

// Set grid delivery - main entry point
async function setGridDelivery(mode) {
    console.log('═══════════════════════════════════════════════');
    console.log('[Grid] setGridDelivery() called with mode:', mode);
    console.log('═══════════════════════════════════════════════');

    try {
        // Get current mode and limit
        const currentModeData = await getSensorString(getSensorId('invertor_prms_to_grid'));
        const currentMode = currentModeData.value || '';
        const currentLimitData = await getSensorSafe(getSensorId('invertor_prm1_p_max_feed_grid'));
        const currentLimit = currentLimitData.value || 5000;

        console.log('[Grid] Current state:', { currentMode, currentLimit });

        // Check if change is already in progress
        if (currentMode === 'Probíhá změna') {
            console.log('[Grid] ⏸️ Change already in progress, skipping silently');
            return;
        }

        // Check if already active (except for Limited - can change limit)
        const isAlreadyActive =
            (mode === 'Vypnuto / Off' && currentMode === 'Vypnuto') ||
            (mode === 'Zapnuto / On' && currentMode === 'Zapnuto');

        if (isAlreadyActive) {
            console.log('[Grid] ⏸️ Mode already active, skipping silently');
            return;
        }

        // Check if Limited is already active
        const isLimitedActive = currentMode === 'Omezeno';
        const isChangingToLimited = mode === 'S omezením / Limited';

        console.log('[Grid] Decision flags:', { isLimitedActive, isChangingToLimited });

        // Show dialog
        console.log('[Grid] 📋 Opening dialog...');
        const result = await showGridDeliveryDialog(mode, currentLimit);

        if (!result.confirmed) {
            console.log('[Grid] ❌ Dialog cancelled by user');
            return;
        }

        console.log('[Grid] ✅ Dialog confirmed with:', result);

        // Determine button ID
        const buttonIds = {
            'Vypnuto / Off': 'btn-grid-off',
            'Zapnuto / On': 'btn-grid-on',
            'S omezením / Limited': 'btn-grid-limited'
        };
        const buttonId = buttonIds[mode];

        // CASE 1: Limited is active, just change limit
        if (isLimitedActive && isChangingToLimited && result.limit) {
            console.log('[Grid] 🔧 Case 1: Changing limit only');

            await executeServiceWithPendingUI({
                serviceName: 'Změna limitu přetoků',
                buttonId: buttonId,
                serviceCall: async () => {
                    return await callService('oig_cloud', 'set_grid_delivery', {
                        limit: result.limit,
                        acknowledgement: true,
                        warning: true
                    });
                }
            });
            return;
        }

        // CASE 2: Mode + Limit together (Limited from Off/On)
        if (isChangingToLimited && result.limit) {
            console.log('[Grid] 🔧 Case 2: Mode + limit together (backend will serialize)');

            await executeServiceWithPendingUI({
                serviceName: 'Nastavení přetoků s omezením',
                buttonId: buttonId,
                serviceCall: async () => {
                    // NOVÁ LOGIKA: Pošleme OBĚ parametry najednou
                    // Backend automaticky rozdělí na 2 volání ve frontě
                    console.log('[Grid] Sending mode + limit together:', { mode, limit: result.limit });
                    return await callService('oig_cloud', 'set_grid_delivery', {
                        mode: mode,
                        limit: result.limit,
                        acknowledgement: true,
                        warning: true
                    });
                }
            });
            return;
        }

        // CASE 3: Single-step change (just mode)
        console.log('[Grid] 🔧 Case 3: Single-step change (mode only)');

        await executeServiceWithPendingUI({
            serviceName: 'Změna dodávky do sítě',
            buttonId: buttonId,
            serviceCall: async () => {
                return await callService('oig_cloud', 'set_grid_delivery', {
                    mode: mode,
                    acknowledgement: true,
                    warning: true
                });
            }
        });

    } catch (e) {
        console.error('[Grid] Error in setGridDelivery:', e);
        showNotification('Chyba', 'Nepodařilo se změnit dodávku do sítě', 'error');
    }
}

// OLD FUNCTIONS - KEPT FOR COMPATIBILITY BUT NOT USED
async function setGridDeliveryOld(mode, limit) {
    if (mode === null && limit === null) {
        showNotification('Chyba', 'Musíte zadat režim nebo limit!', 'error');
        return;
    }

    if (mode !== null && limit !== null) {
        showNotification('Chyba', 'Můžete zadat pouze režim NEBO limit!', 'error');
        return;
    }

    const confirmed = confirm('Opravdu chcete změnit dodávku do sítě?\n\n⚠️ VAROVÁNÍ: Tato změna může ovlivnit chování systému!');
    if (!confirmed) return;

    const data = {
        acknowledgement: true,
        warning: true
    };

    if (mode !== null) {
        data.mode = mode;
    } else {
        data.limit = parseInt(limit);
        if (isNaN(data.limit) || data.limit < 1 || data.limit > 9999) {
            showNotification('Chyba', 'Limit musí být 1-9999 W', 'error');
            return;
        }
    }

    const success = await callService('oig_cloud', 'set_grid_delivery', data);

    if (success) {
        const msg = mode ? `Režim: ${mode}` : `Limit: ${data.limit} W`;
        showNotification('Dodávka do sítě', msg, 'success');
        setTimeout(forceFullRefresh, 2000);
    }
}

// Set grid delivery limit from input
function setGridDeliveryLimit() {
    const input = document.getElementById('grid-limit');
    const limit = parseInt(input.value);

    if (!limit || limit < 1 || limit > 9999) {
        showNotification('Chyba', 'Zadejte limit 1-9999 W', 'error');
        return;
    }

    setGridDelivery(null, limit);
}

// Set boiler mode
async function setBoilerMode(mode) {
    try {
        // Get current mode
        const currentModeData = await getSensorStringSafe(getSensorId('boiler_manual_mode'));
        const currentModeRaw = currentModeData.value || '';
        const currentMode = currentModeRaw === 'Manuální' ? 'Manual' : currentModeRaw;

        console.log('[Boiler] setBoilerMode called:', { mode, currentMode, currentModeRaw });

        // Check if already active
        if (currentMode === mode) {
            console.log('[Boiler] ⏸️ Mode already active, skipping silently');
            return;
        }

        const modeName = mode === 'CBB' ? 'Inteligentní' : 'Manuální';
        const modeIcon = mode === 'CBB' ? '🤖' : '👤';

        // Show acknowledgement dialog
        const confirmed = await showAcknowledgementDialog(
            'Změna režimu bojleru',
            `Chystáte se změnit režim bojleru na <strong>"${modeIcon} ${modeName}"</strong>.<br><br>` +
            `Tato změna ovlivní chování ohřevu vody a může trvat až 10 minut.`
        );
        if (!confirmed) return;

        // Button ID
        const btnId = `btn-boiler-${mode.toLowerCase()}`;

        // Store expected mode for monitoring
        const expectedMode = mode === 'CBB' ? 'CBB' : 'Manuální';
        window._lastRequestedBoilerMode = expectedMode;
        console.log('[Boiler] Stored expected mode for monitoring:', expectedMode);

        // Execute with pending UI
        await executeServiceWithPendingUI({
            serviceName: 'Změna režimu bojleru',
            buttonId: btnId,
            serviceCall: async () => {
                return await callService('oig_cloud', 'set_boiler_mode', {
                    mode: mode,
                    acknowledgement: true
                });
            }
        });

    } catch (e) {
        console.error('[Shield] Error in setBoilerMode:', e);
        showNotification('Chyba', 'Nepodařilo se změnit režim bojleru', 'error');
    }
}

// Update solar forecast
async function updateSolarForecast() {
    const confirmed = confirm('Opravdu chcete aktualizovat solární předpověď?');
    if (!confirmed) return;

    const success = await callService('oig_cloud', 'update_solar_forecast', {});

    if (success) {
        showNotification('Solární předpověď', 'Předpověď se aktualizuje...', 'success');
        // Delší čas pro forecast update
        setTimeout(forceFullRefresh, 5000);
    }
}

// Load control panel status (now uses shield integration)
async function loadControlStatus() {
    try {
        // Update shield UI and button states
        await updateShieldUI();
        await updateButtonStates();
    } catch (e) {
        console.error('Error loading control status:', e);
    }
}

// === EXISTING FUNCTIONS ===

// Get sensor entity ID
function getSensorId(sensor) {
    return `sensor.oig_${INVERTER_SN}_${sensor}`;
}

// Find shield sensor dynamically (may have suffix like _2, _3)
function findShieldSensorId(sensorName) {
    try {
        const hass = getHass();
        if (!hass || !hass.states) {
            console.warn(`[Shield] Cannot find ${sensorName} - hass not available`);
            return getSensorId(sensorName); // Fallback to basic pattern
        }

        const sensorPrefix = `sensor.oig_${INVERTER_SN}_${sensorName}`;

        // Find matching entity with strict pattern:
        // - sensor.oig_<SN>_<name> (exact match)
        // - sensor.oig_<SN>_<name>_2, _3, etc. (with numeric suffix)
        const entityId = Object.keys(hass.states).find(id => {
            if (id === sensorPrefix) {
                return true; // Exact match
            }
            if (id.startsWith(sensorPrefix + '_')) {
                // Check if suffix is numeric (e.g., _2, _3)
                const suffix = id.substring(sensorPrefix.length + 1);
                return /^\d+$/.test(suffix);
            }
            return false;
        });

        if (!entityId) {
            console.warn(`[Shield] Sensor not found with prefix: ${sensorPrefix}`);
            return getSensorId(sensorName); // Fallback to basic pattern
        }

        return entityId;
    } catch (e) {
        console.error(`[Shield] Error finding sensor ${sensorName}:`, e);
        return getSensorId(sensorName); // Fallback to basic pattern
    }
}

// Get HA token from parent
function getHAToken() {
    try {
        return parent.document.querySelector('home-assistant').hass.auth.data.access_token;
    } catch (e) {
        console.error('Cannot get HA token:', e);
        return null;
    }
}

// Fetch sensor data (returns { value, lastUpdated, attributes })
// OPTIMIZED: Uses direct hass.states access instead of API calls
async function getSensor(entityId) {
    try {
        const hass = getHass();
        if (!hass || !hass.states) {
            return { value: 0, lastUpdated: null, attributes: {} };
        }

        const state = hass.states[entityId];
        if (!state) {
            return { value: 0, lastUpdated: null, attributes: {} };
        }

        const value = state.state !== 'unavailable' && state.state !== 'unknown'
            ? parseFloat(state.state) || 0
            : 0;
        const lastUpdated = state.last_updated ? new Date(state.last_updated) : null;
        const attributes = state.attributes || {};
        return { value, lastUpdated, attributes };
    } catch (e) {
        return { value: 0, lastUpdated: null, attributes: {} };
    }
}

// Fetch sensor data as string (for non-numeric sensors like box_prms_mode)
// OPTIMIZED: Uses direct hass.states access instead of API calls
async function getSensorString(entityId) {
    try {
        const hass = getHass();
        if (!hass || !hass.states) {
            return { value: '', lastUpdated: null, attributes: {} };
        }

        const state = hass.states[entityId];
        if (!state) {
            return { value: '', lastUpdated: null, attributes: {} };
        }

        const value = (state.state !== 'unavailable' && state.state !== 'unknown')
            ? state.state
            : '';
        const lastUpdated = state.last_updated ? new Date(state.last_updated) : null;
        const attributes = state.attributes || {};
        return { value, lastUpdated, attributes };
    } catch (e) {
        return { value: '', lastUpdated: null, attributes: {} };
    }
}

// Safe sensor fetch with optional logging
// OPTIMIZED: Uses direct hass.states access instead of API calls
async function getSensorSafe(entityId, silent = true) {
    try {
        const hass = getHass();
        if (!hass || !hass.states) {
            return { value: 0, lastUpdated: null, attributes: {}, exists: false };
        }

        const state = hass.states[entityId];
        if (!state) {
            if (!silent) console.log(`Sensor ${entityId} not available`);
            return { value: 0, lastUpdated: null, attributes: {}, exists: false };
        }

        const value = state.state !== 'unavailable' && state.state !== 'unknown'
            ? parseFloat(state.state) || 0
            : 0;
        const lastUpdated = state.last_updated ? new Date(state.last_updated) : null;
        const attributes = state.attributes || {};
        return { value, lastUpdated, attributes, exists: true };
    } catch (e) {
        if (!silent) console.error(`Error fetching sensor ${entityId}:`, e);
        return { value: 0, lastUpdated: null, attributes: {}, exists: false };
    }
}

// Safe string sensor fetch with optional logging
// OPTIMIZED: Uses direct hass.states access instead of API calls
async function getSensorStringSafe(entityId, silent = true) {
    try {
        const hass = getHass();
        if (!hass || !hass.states) {
            return { value: '', lastUpdated: null, exists: false };
        }

        const state = hass.states[entityId];
        if (!state) {
            if (!silent) console.log(`Sensor ${entityId} not available`);
            return { value: '', lastUpdated: null, exists: false };
        }

        const value = (state.state !== 'unavailable' && state.state !== 'unknown')
            ? state.state
            : '';
        const lastUpdated = state.last_updated ? new Date(state.last_updated) : null;
        return { value, lastUpdated, exists: true };
    } catch (e) {
        if (!silent) console.error(`Error fetching sensor ${entityId}:`, e);
        return { value: '', lastUpdated: null, exists: false };
    }
}

// Format relative time (like Home Assistant)
function formatRelativeTime(date) {
    if (!date) return '';

    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 10) return 'právě teď';
    if (diffSec < 60) return `před ${diffSec} sekundami`;
    if (diffMin === 1) return 'před minutou';
    if (diffMin < 60) return `před ${diffMin} minutami`;
    if (diffHour === 1) return 'před hodinou';
    if (diffHour < 24) return `před ${diffHour} hodinami`;
    if (diffDay === 1) return 'včera';
    if (diffDay < 7) return `před ${diffDay} dny`;

    return date.toLocaleDateString('cs-CZ');
}

// Update time
function updateTime() {
    const now = new Date();
    document.getElementById('current-time').textContent = now.toLocaleTimeString('cs-CZ');
}

// Debounced version of drawConnections to prevent excessive redraws
let drawConnectionsTimeout = null;
function debouncedDrawConnections(delay = 100) {
    if (drawConnectionsTimeout) {
        clearTimeout(drawConnectionsTimeout);
    }
    drawConnectionsTimeout = setTimeout(() => {
        drawConnections();
        drawConnectionsTimeout = null;
    }, delay);
}

// Draw connection lines
function drawConnections() {
    const svg = document.getElementById('connections');
    const canvas = document.querySelector('.flow-canvas');
    if (!svg) return; // Guard: SVG neexistuje

    svg.innerHTML = '';

    // OPRAVA BUG #2: Použít cache místo přepočítávání
    const centers = cachedNodeCenters || getNodeCenters();
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

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

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

/**
 * Vypočítá parametry toku podle výkonu a maxima
 * @param {number} power - Výkon v W (může být záporný)
 * @param {number} maximum - Maximální výkon v W
 * @returns {object} { active, intensity, count, speed, size, opacity }
 */
function calculateFlowParams(power, maximum) {
    const absPower = Math.abs(power);
    const intensity = Math.min(100, (absPower / maximum) * 100);
    
    return {
        active: absPower >= 50,  // Práh: 50W (citlivější než 500W)
        intensity: intensity,
        count: Math.max(1, Math.min(4, Math.ceil(1 + intensity / 33))), // 1-4 kuličky
        speed: Math.max(500, Math.round(3500 - (intensity * 30))),      // 3500-500ms
        size: Math.round(6 + (intensity / 10)),                         // 6-16px
        opacity: Math.min(1.0, 0.3 + (intensity / 150))                 // 0.3-1.0
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
    if (!flow || !flow.active || !from || !to) return;

    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.background = color;
    
    // Dynamická velikost s malou variací pro "živý" efekt
    const sizeVariation = size + (Math.random() * 2 - 1); // ±1px
    particle.style.width = `${sizeVariation}px`;
    particle.style.height = `${sizeVariation}px`;
    particle.style.borderRadius = '50%';
    
    // Blur pro rychlé toky
    if (speed < 1500) {
        particle.style.filter = 'blur(0.5px)';
    }
    
    particle.style.left = from.x + 'px';
    particle.style.top = from.y + 'px';

    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    particlesContainer.appendChild(particle);

    particle.animate([
        { left: from.x + 'px', top: from.y + 'px', opacity: 0 },
        { opacity: opacity, offset: 0.1 },
        { opacity: opacity, offset: 0.9 },
        { left: to.x + 'px', top: to.y + 'px', opacity: 0 }
    ], {
        duration: speed,
        easing: 'linear'
    }).onfinish = () => {
        particle.remove();
        // Rekurzivně vytvoř další kuličku pokud je flow stále aktivní
        createContinuousParticle(flowKey, from, to, color, flow.speed, size, opacity);
    };
}

/**
 * Vytvoří multi-source flow s kuličkami různých barev
 * @param {string} flowKey - Klíč toku
 * @param {object} from - Pozice začátku
 * @param {object} to - Pozice konce
 * @param {Array} sources - [{type, power, color}, ...]
 * @param {number} totalPower - Celkový výkon
 * @param {number} speed - Rychlost animace
 * @param {number} size - Velikost kuliček
 * @param {number} opacity - Průhlednost
 */
function updateMultiSourceFlow(flowKey, from, to, sources, totalPower, speed, size, opacity) {
    const flow = particleFlows[flowKey];
    if (!flow) return;

    // Zastavit starý flow pokud se změnily zdroje
    const sourcesChanged = JSON.stringify(flow.sources) !== JSON.stringify(sources);
    if (sourcesChanged) {
        flow.active = false;
        flow.sources = sources;
        
        // Restart po malém delaye
        setTimeout(() => {
            flow.active = true;
            flow.speed = speed;
            
            // Pro každý zdroj vytvořit kuličky podle poměru
            let cumulativeDelay = 0;
            const totalCount = Math.max(1, Math.min(4, Math.ceil(sources.length + totalPower / 2000)));
            
            sources.forEach((source, idx) => {
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
function updateParticleFlow(flowKey, from, to, color, active, speed, count = 1, size = 8, opacity = 1) {
    const flow = particleFlows[flowKey];
    if (!flow) return;

    const wasActive = flow.active;
    const countChanged = flow.count !== count;

    // Pokud se mění počet kuliček, musíme restartovat flow
    if (active && wasActive && countChanged) {
        flow.active = false; // Zastav staré kuličky
        setTimeout(() => {
            // Po 100ms spusť nové
            flow.active = true;
            flow.speed = speed;
            flow.count = count;
            const delayBetweenParticles = speed / count / 2;
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    createContinuousParticle(flowKey, from, to, color, speed, size, opacity);
                }, i * delayBetweenParticles);
            }
        }, 100);
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
    const colors = [];
    const SOLAR_COLOR = '#ffd54f';   // Žlutá
    const GRID_COLOR = '#42a5f5';    // Modrá
    const BATTERY_COLOR = '#ff9800'; // Oranžová

    // Normalize ratios (pokud se nesečtou na 1.0)
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
        } else if (solarRatio > 0.05 && batteryRatio > 0.05) {
            // Solár + baterie
            const solarPct = (solarRatio * 100).toFixed(0);
            return `linear-gradient(135deg, ${SOLAR_COLOR} 0%, ${SOLAR_COLOR} ${solarPct}%, ${BATTERY_COLOR} ${solarPct}%, ${BATTERY_COLOR} 100%)`;
        } else if (gridRatio > 0.05 && batteryRatio > 0.05) {
            // Grid + baterie
            const gridPct = (gridRatio * 100).toFixed(0);
            return `linear-gradient(135deg, ${GRID_COLOR} 0%, ${GRID_COLOR} ${gridPct}%, ${BATTERY_COLOR} ${gridPct}%, ${BATTERY_COLOR} 100%)`;
        }
    } else {
        // 2 zdroje (pro nabíjení baterie)
        if (solarRatio > 0.05 && gridRatio > 0.05) {
            // Solár + grid
            const solarPct = (solarRatio * 100).toFixed(0);
            return `linear-gradient(135deg, ${SOLAR_COLOR} 0%, ${SOLAR_COLOR} ${solarPct}%, ${GRID_COLOR} ${solarPct}%, ${GRID_COLOR} 100%)`;
        }
    }

    // Fallback na dominantní barvu
    if (solarRatio >= gridRatio && solarRatio >= batteryRatio) return SOLAR_COLOR;
    if (gridRatio >= batteryRatio) return GRID_COLOR;
    return BATTERY_COLOR;
}

// Global cache for node positions
let cachedNodeCenters = null;
let lastLayoutHash = null;

// OPRAVA BUG #4: Cache pro power hodnoty
let lastPowerValues = null;

// Calculate layout hash to detect changes
function getLayoutHash() {
    const solar = document.querySelector('.solar');
    const battery = document.querySelector('.battery');
    const inverter = document.querySelector('.inverter');
    const grid = document.querySelector('.grid-node');
    const house = document.querySelector('.house');

    if (!solar || !battery || !inverter || !grid || !house) return null;

    // OPRAVA BUG #5: Zahrnout délku obsahu pro detekci změny velikosti
    const hash = [solar, battery, inverter, grid, house]
        .map(el => {
            const rect = el.getBoundingClientRect();
            const contentLength = el.textContent?.length || 0;
            return `${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.width)},${Math.round(rect.height)},${contentLength}`;
        })
        .join('|');

    return hash;
}

// Get cached or fresh node centers
function getNodeCenters() {
    const currentHash = getLayoutHash();

    // If layout hasn't changed, return cached centers
    if (currentHash === lastLayoutHash && cachedNodeCenters) {
        return cachedNodeCenters;
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
        const canvasStyle = window.getComputedStyle(canvas);
        const transform = canvasStyle.transform;
        let scale = 1;
        if (transform && transform !== 'none') {
            const matrix = transform.match(/matrix\(([^)]+)\)/);
            if (matrix) {
                const values = matrix[1].split(',');
                scale = parseFloat(values[0]) || 1;
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

    // OPRAVA BUG #1: Zkontrolovat změnu PŘED nastavením nového hashe
    const layoutChanged = currentHash !== lastLayoutHash;

    // Cache the results
    cachedNodeCenters = centers;
    lastLayoutHash = currentHash;

    // If layout changed, redraw connections
    if (layoutChanged && currentHash) {
        // console.log('[Layout] Layout changed, redrawing connections');
        debouncedDrawConnections(50);
    }

    return centers;
}

// Animate particles - v2.0 with continuous normalization
function animateFlow(data) {
    const { solarPower, solarPerc, batteryPower, gridPower, housePower, boilerPower, boilerMaxPower } = data;

    // Use cached positions
    const centers = getNodeCenters();
    if (!centers) return;

    // ========================================
    // 1. SOLAR → INVERTER (žlutá, jednosměrný)
    // ========================================
    const solarParams = calculateFlowParams(solarPower, FLOW_MAXIMUMS.solar);
    
    updateParticleFlow(
        'solarToInverter', 
        centers.solar, 
        centers.inverter, 
        FLOW_COLORS.solar, 
        solarParams.active, 
        solarParams.speed, 
        solarParams.count,
        solarParams.size,
        solarParams.opacity
    );

    // ========================================
    // 2. BATTERY ↔ INVERTER (obousměrný)
    // ========================================
    const batteryAbsPower = Math.abs(batteryPower);
    const batteryParams = calculateFlowParams(batteryAbsPower, FLOW_MAXIMUMS.battery);

    // Zastavit oba směry nejdřív
    updateParticleFlow('batteryToInverter', centers.battery, centers.inverter, FLOW_COLORS.battery, false, batteryParams.speed, 0);
    updateParticleFlow('inverterToBattery', centers.inverter, centers.battery, FLOW_COLORS.solar, false, batteryParams.speed, 0);

    if (batteryParams.active) {
        if (batteryPower > 0) {
            // ===== NABÍJENÍ BATERIE =====
            // Vypočítat zdroje: solar + grid
            let solarToBattery = 0;
            let gridToBattery = 0;

            if (solarPower > 0) {
                solarToBattery = Math.min(solarPower, batteryPower);
            }

            const remaining = batteryPower - solarToBattery;
            if (remaining > 50 && gridPower > 0) {
                gridToBattery = remaining;
            }

            // Multi-source flow: žluté + modré kuličky
            const sources = [];
            if (solarToBattery > 50) {
                sources.push({ type: 'solar', power: solarToBattery, color: FLOW_COLORS.solar });
            }
            if (gridToBattery > 50) {
                sources.push({ type: 'grid', power: gridToBattery, color: FLOW_COLORS.grid_import });
            }

            if (sources.length > 1) {
                // Multi-source: použít novou funkci
                updateMultiSourceFlow(
                    'inverterToBattery',
                    centers.inverter,
                    centers.battery,
                    sources,
                    batteryPower,
                    batteryParams.speed,
                    batteryParams.size,
                    batteryParams.opacity
                );
            } else {
                // Single source: použít starou funkci
                const color = sources.length > 0 ? sources[0].color : FLOW_COLORS.solar;
                updateParticleFlow(
                    'inverterToBattery', 
                    centers.inverter, 
                    centers.battery, 
                    color, 
                    true, 
                    batteryParams.speed, 
                    batteryParams.count,
                    batteryParams.size,
                    batteryParams.opacity
                );
            }
        } else {
            // ===== VYBÍJENÍ BATERIE =====
            // Vždy oranžová
            updateParticleFlow(
                'batteryToInverter', 
                centers.battery, 
                centers.inverter, 
                FLOW_COLORS.battery, 
                true, 
                batteryParams.speed, 
                batteryParams.count,
                batteryParams.size,
                batteryParams.opacity
            );
        }
    }

    // ========================================
    // 3. GRID ↔ INVERTER (obousměrný)
    // ========================================
    const gridAbsPower = Math.abs(gridPower);
    const gridParams = calculateFlowParams(gridAbsPower, FLOW_MAXIMUMS.grid);

    // Zastavit oba směry nejdřív
    updateParticleFlow('gridToInverter', centers.grid, centers.inverter, FLOW_COLORS.grid_import, false, gridParams.speed, 0);
    updateParticleFlow('inverterToGrid', centers.inverter, centers.grid, FLOW_COLORS.grid_export, false, gridParams.speed, 0);

    if (gridParams.active) {
        if (gridPower > 0) {
            // ===== ODBĚR ZE SÍTĚ =====
            // Červená, jednosměrný
            updateParticleFlow(
                'gridToInverter', 
                centers.grid, 
                centers.inverter, 
                FLOW_COLORS.grid_import, 
                true, 
                gridParams.speed, 
                gridParams.count,
                gridParams.size,
                gridParams.opacity
            );
        } else {
            // ===== DODÁVKA DO SÍTĚ =====
            // Vypočítat zdroje: solar + battery
            const gridExportPower = Math.abs(gridPower);
            
            let solarToGrid = 0;
            let batteryToGrid = 0;

            // Solár co nejde do baterie ani domu může jít do gridu
            const solarUsed = (batteryPower > 0 ? batteryPower : 0);
            const solarAvailableForGrid = Math.max(0, solarPower - solarUsed);
            
            solarToGrid = Math.min(solarAvailableForGrid, gridExportPower);
            
            const remaining = gridExportPower - solarToGrid;
            if (remaining > 50 && batteryPower < 0) {
                // Zbytek z baterie
                batteryToGrid = Math.min(Math.abs(batteryPower), remaining);
            }

            // Multi-source flow: žluté + oranžové kuličky
            const sources = [];
            if (solarToGrid > 50) {
                sources.push({ type: 'solar', power: solarToGrid, color: FLOW_COLORS.solar });
            }
            if (batteryToGrid > 50) {
                sources.push({ type: 'battery', power: batteryToGrid, color: FLOW_COLORS.battery });
            }

            if (sources.length > 1) {
                // Multi-source
                updateMultiSourceFlow(
                    'inverterToGrid',
                    centers.inverter,
                    centers.grid,
                    sources,
                    gridExportPower,
                    gridParams.speed,
                    gridParams.size,
                    gridParams.opacity
                );
            } else {
                // Single source - zelená
                const color = sources.length > 0 ? sources[0].color : FLOW_COLORS.grid_export;
                updateParticleFlow(
                    'inverterToGrid', 
                    centers.inverter, 
                    centers.grid, 
                    color, 
                    true, 
                    gridParams.speed, 
                    gridParams.count,
                    gridParams.size,
                    gridParams.opacity
                );
            }
        }
    }

    // ========================================
    // 4. INVERTER → HOUSE (spotřeba, multi-source)
    // ========================================
    const houseParams = calculateFlowParams(housePower, FLOW_MAXIMUMS.house);

    // Vypočítat zdroje pro spotřebu (house)
    let solarToHouse = 0;
    let batteryToHouse = 0;
    let gridToHouse = 0;

    if (houseParams.active && housePower > 0) {
        // OPRAVA: Správná logika rozdělení zdrojů
        // batteryPower > 0 = nabíjení baterie (energie TEČE DO baterie)
        // batteryPower < 0 = vybíjení baterie (energie TEČE Z baterie)
        // gridPower > 0 = odběr ze sítě
        // gridPower < 0 = dodávka do sítě

        // 1. Kolik energie baterie poskytuje/odebírá
        let batteryContribution = 0;
        if (batteryPower < 0) {
            // Vybíjení - baterie dává energii
            batteryContribution = Math.abs(batteryPower);
        }
        // Pokud batteryPower > 0, baterie ODEBÍRÁ energii (nabíjí se), nedává do domu

        // 2. Kolik soláru je dostupné pro dům
        // Solár může jít do: baterie (nabíjení) + dům + grid (přebytek)
        let solarAvailable = solarPower;
        if (batteryPower > 0) {
            // Baterie se nabíjí - část soláru jde do baterie
            solarAvailable = Math.max(0, solarPower - batteryPower);
        }

        // 3. Kolik gridu potřebujeme
        // Grid pokrývá to, co solár + baterie nezvládnou
        const solarAndBattery = solarAvailable + batteryContribution;
        let gridNeeded = 0;
        if (housePower > solarAndBattery && gridPower > 0) {
            gridNeeded = Math.min(gridPower, housePower - solarAndBattery);
        }

        // Přiřadit zdroje k domu
        solarToHouse = Math.min(solarAvailable, housePower);
        const houseRemaining = housePower - solarToHouse;

        if (houseRemaining > 0) {
            batteryToHouse = Math.min(batteryContribution, houseRemaining);
            const stillRemaining = houseRemaining - batteryToHouse;

            if (stillRemaining > 0) {
                gridToHouse = Math.min(gridNeeded, stillRemaining);
            }
        }

        // Multi-source flow: žluté + oranžové + červené kuličky
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

        if (sources.length > 1) {
            // Multi-source
            updateMultiSourceFlow(
                'inverterToHouse',
                centers.inverter,
                centers.house,
                sources,
                housePower,
                houseParams.speed,
                houseParams.size,
                houseParams.opacity
            );
        } else {
            // Single source
            const color = sources.length > 0 ? sources[0].color : FLOW_COLORS.house;
            updateParticleFlow(
                'inverterToHouse', 
                centers.inverter, 
                centers.house, 
                color, 
                true, 
                houseParams.speed, 
                houseParams.count,
                houseParams.size,
                houseParams.opacity
            );
        }
    } else {
        updateParticleFlow('inverterToHouse', centers.inverter, centers.house, FLOW_COLORS.house, false, houseParams.speed, 0);
    }
}

// Cache for previous values to detect changes
const previousValues = {};

// Helper to format power: < 1000 → W, >= 1000 → kW
function formatPower(watts) {
    if (watts === null || watts === undefined || isNaN(watts)) return '-- W';
    const absWatts = Math.abs(watts);
    if (absWatts >= 1000) {
        return (watts / 1000).toFixed(2) + ' kW';
    } else {
        return Math.round(watts) + ' W';
    }
}

// Helper to format energy: < 1000 → Wh, >= 1000 → kWh
function formatEnergy(wattHours) {
    if (wattHours === null || wattHours === undefined || isNaN(wattHours)) return '-- Wh';
    const absWh = Math.abs(wattHours);
    if (absWh >= 1000) {
        return (wattHours / 1000).toFixed(2) + ' kWh';
    } else {
        return Math.round(wattHours) + ' Wh';
    }
}

// Helper to update element only if value changed (or first load)
function updateElementIfChanged(elementId, newValue, cacheKey) {
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

// Load and update data (optimized - partial updates only)
async function loadData() {
    // Solar
    const solarP1Data = await getSensor(getSensorId('actual_fv_p1'));
    const solarP2Data = await getSensor(getSensorId('actual_fv_p2'));
    const solarPercData = await getSensor(getSensorId('dc_in_fv_proc'));
    const solarP1 = solarP1Data.value || 0;
    const solarP2 = solarP2Data.value || 0;
    const solarPower = solarP1 + solarP2;
    const solarPerc = solarPercData.value || 0;
    const solarTodayData = await getSensor(getSensorId('dc_in_fv_ad'));
    const solarTodayWh = solarTodayData.value || 0;
    const solarTodayKWh = solarTodayWh / 1000; // Convert Wh to kWh

    // Display solar power using formatPower helper - UPDATE ONLY IF CHANGED
    updateElementIfChanged('solar-power', formatPower(solarPower), 'solar-power');
    updateElementIfChanged('solar-today', 'Dnes: ' + solarTodayKWh.toFixed(2) + ' kWh', 'solar-today');

    // Update solar icon based on percentage (dynamic icon with animation)
    const solarIcon = document.getElementById('solar-icon-dynamic');
    let solarIconEmoji;
    if (solarPerc <= 5) {
        solarIconEmoji = '🌙'; // Měsíc v noci - výrazný
        solarIcon.className = 'node-icon solar-icon-dynamic solar-icon-moon';
    } else if (solarPerc < 50) {
        solarIconEmoji = '☀️'; // Normální slunce
        solarIcon.className = 'node-icon solar-icon-dynamic';
    } else {
        solarIconEmoji = '☀️'; // Aktivní slunce s animací
        solarIcon.className = 'node-icon solar-icon-dynamic solar-active';
        // Scale based on percentage (50% = 1.0, 100% = 1.3)
        const scale = 1.0 + ((solarPerc - 50) / 50) * 0.3;
        solarIcon.style.fontSize = (32 * scale) + 'px';
    }
    updateElementIfChanged('solar-icon-dynamic', solarIconEmoji, 'solar-icon');

    // Update active class only if changed
    const solarNode = document.querySelector('.solar');
    updateClassIfChanged(solarNode, 'active', solarPower > 50);

    // Battery
    const batterySoCData = await getSensor(getSensorId('batt_bat_c'));
    const batteryPowerData = await getSensor(getSensorId('batt_batt_comp_p'));
    const batterySoC = batterySoCData.value || 0;
    const batteryPower = batteryPowerData.value || 0;

    // Update battery SoC only if changed
    updateElementIfChanged('battery-soc', Math.round(batterySoC) + ' %', 'battery-soc');

    // Display battery power using formatPower helper - UPDATE ONLY IF CHANGED
    updateElementIfChanged('battery-power', formatPower(batteryPower), 'battery-power');

    // Update SVG battery fill (animated) - s gradientem podle SoC
    const batteryFill = document.getElementById('battery-fill');

    // Update fill height if SoC changed
    const previousSoC = previousValues['battery-gauge-width'];
    if (previousSoC === undefined || Math.abs(previousSoC - batterySoC) > 0.5) {
        // SVG baterie má výšku 54px (od y=13 do y=67)
        const maxHeight = 54;
        const fillHeight = (batterySoC / 100) * maxHeight;
        const fillY = 13 + (maxHeight - fillHeight); // Počítáme od shora dolů

        batteryFill.setAttribute('height', fillHeight);
        batteryFill.setAttribute('y', fillY);

        previousValues['battery-gauge-width'] = batterySoC;
    }

    // Add charging animation if charging
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

    // Check grid charging status for lightning indicator
    const gridChargingData = await getSensor(getSensorId('grid_charging_planned'));
    const isGridCharging = gridChargingData.value === 'on';
    const batteryLightning = document.getElementById('battery-lightning');

    if (isGridCharging && batteryPower > 10) {
        batteryLightning.classList.add('active');
    } else {
        batteryLightning.classList.remove('active');
    }

    // Get time to empty/full from sensors
    const timeToEmptyData = await getSensorString(getSensorId('time_to_empty'));
    const timeToFullData = await getSensorString(getSensorId('time_to_full'));

    // Update battery status with time info
    const batteryStatus = document.getElementById('battery-status');
    let newBatteryState, newBatteryText, newBatteryClass;
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

    // Update battery corner indicators
    const batteryVoltageData = await getSensor(getSensorId('extended_battery_voltage'));
    const batteryCurrentData = await getSensor(getSensorId('extended_battery_current'));
    const batteryTempData = await getSensor(getSensorId('extended_battery_temperature'));

    updateElementIfChanged('battery-voltage-value', (batteryVoltageData.value || 0).toFixed(1) + ' V');
    updateElementIfChanged('battery-current-value', (batteryCurrentData.value || 0).toFixed(1) + ' A');

    // Update temperature indicator with animation
    const batteryTemp = batteryTempData.value || 0;
    const tempIndicator = document.getElementById('battery-temp-indicator');
    const tempIconElement = document.getElementById('battery-temp-icon');
    let tempIcon, tempClass;
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

    // Update temperature value
    updateElementIfChanged('battery-temp-value', batteryTemp.toFixed(1) + ' °C');

    // Grid
    const gridPowerData = await getSensor(getSensorId('actual_aci_wtotal'));
    const gridConsumptionData = await getSensor(getSensorId('extended_grid_consumption'));
    const gridDeliveryData = await getSensor(getSensorId('extended_grid_delivery'));
    const gridPower = gridPowerData.value || 0;
    const gridConsumptionWh = gridConsumptionData.value || 0;
    const gridDeliveryWh = gridDeliveryData.value || 0;
    const gridConsumptionKWh = gridConsumptionWh / 1000; // Convert Wh to kWh
    const gridDeliveryKWh = gridDeliveryWh / 1000; // Convert Wh to kWh

    // Display grid power using formatPower helper (absolute value) - UPDATE ONLY IF CHANGED
    updateElementIfChanged('grid-power', formatPower(Math.abs(gridPower)), 'grid-power');
    updateElementIfChanged('grid-today', 'Dnes: ' + (gridConsumptionKWh + gridDeliveryKWh).toFixed(1) + ' kWh', 'grid-today');

    // Update grid status only if state changed
    const gridStatus = document.getElementById('grid-status');
    let newGridState, newGridText, newGridClass;
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

    // House
    const housePowerData = await getSensor(getSensorId('actual_aco_p'));
    const houseTodayData = await getSensor(getSensorId('ac_out_en_day'));
    const housePower = housePowerData.value || 0;
    const houseTodayWh = houseTodayData.value || 0;
    const houseTodayKWh = houseTodayWh / 1000; // Convert Wh to kWh

    // Display house power using formatPower helper - UPDATE ONLY IF CHANGED
    updateElementIfChanged('house-power', formatPower(housePower), 'house-power');
    updateElementIfChanged('house-today', 'Dnes: ' + houseTodayKWh.toFixed(1) + ' kWh', 'house-today');

    // Update box mode with icons
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

    // Aktualizovat inverter mode, ale zachovat třídu mode-changing pokud existuje
    const inverterModeElement = document.getElementById('inverter-mode');
    if (inverterModeElement) {
        const isModeChanging = inverterModeElement.classList.contains('mode-changing');
        updateElementIfChanged('inverter-mode', modeIcon + ' ' + modeText, 'inverter-mode');
        // Obnovit třídu mode-changing, pokud byla nastavená
        if (isModeChanging && !inverterModeElement.classList.contains('mode-changing')) {
            inverterModeElement.classList.add('mode-changing');
        }
    }

    // Aktualizovat boiler mode (ve flow diagramu), ale zachovat třídu mode-changing pokud existuje
    const boilerModeFlowData = await getSensorStringSafe(getSensorId('boiler_manual_mode'));
    const boilerModeFlowElement = document.getElementById('boiler-mode');
    if (boilerModeFlowElement && boilerModeFlowData.exists) {
        const isModeChanging = boilerModeFlowElement.classList.contains('mode-changing');
        updateElementIfChanged('boiler-mode', boilerModeFlowData.value || '--', 'boiler-mode');
        // Obnovit třídu mode-changing, pokud byla nastavená
        if (isModeChanging && !boilerModeFlowElement.classList.contains('mode-changing')) {
            boilerModeFlowElement.classList.add('mode-changing');
        }
    }

    // Show last update time from real_data_update sensor - UPDATE TO HEADER
    const realDataUpdateSensor = await getSensorString(getSensorId('real_data_update'));
    const lastUpdate = realDataUpdateSensor.value; // String value from sensor
    if (lastUpdate && lastUpdate !== '--') {
        const lastUpdateHeader = document.getElementById('last-update-header');
        // Parse timestamp and convert to relative time
        const updateDate = new Date(lastUpdate);
        const relativeTime = formatRelativeTime(updateDate);
        const displayText = `Aktualizováno ${relativeTime}`;

        if (previousValues['last-update'] !== displayText) {
            lastUpdateHeader.textContent = displayText;
            previousValues['last-update'] = displayText;
        }
    }

    // ===== INVERTER CORNER INDICATORS =====
    // Bypass indicator (top-left corner)
    const bypassStatusData = await getSensorString(getSensorId('bypass_status'));
    const bypassStatus = bypassStatusData.value || 'off';
    const bypassIndicator = document.getElementById('inverter-bypass-indicator');
    const bypassLabel = document.getElementById('inverter-bypass-label');
    const bypassIconElement = document.getElementById('inverter-bypass-icon');
    let bypassIcon, bypassClass;
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
        // Show/hide bypass label
        if (bypassLabel) {
            bypassLabel.style.display = isBypassActive ? 'block' : 'none';
        }
        previousValues['inverter-bypass-icon'] = bypassIcon;
    }

    // Temperature indicator (top-right corner)
    const inverterTempData = await getSensor(getSensorId('box_temp'));
    const inverterTemp = inverterTempData.value || 0;
    const inverterTempIndicator = document.getElementById('inverter-temp-indicator');
    const inverterTempIconElement = document.getElementById('inverter-temp-icon');
    let inverterTempIcon, inverterTempClass;
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
    // Always update temperature value (force update)
    updateElementIfChanged('inverter-temp-value', inverterTemp.toFixed(1) + ' °C');

    // Warning border around entire inverter (when bypass ON OR temp >35°C)
    const inverterBox = document.getElementById('inverter-box');
    const bypassIsOn = bypassStatus && (bypassStatus.toLowerCase() === 'on' || bypassStatus === '1' || bypassStatus.toLowerCase().includes('on'));
    const tempIsHigh = inverterTemp > 35;
    const hasWarning = bypassIsOn || tempIsHigh;

    // Debug log for bypass status
    // console.log('[Inverter] Bypass status:', bypassStatus, 'isOn:', bypassIsOn, 'tempIsHigh:', tempIsHigh, 'hasWarning:', hasWarning);

    // Force update on first load or when changed
    if (previousValues['inverter-warning'] === undefined || previousValues['inverter-warning'] !== hasWarning) {
        if (hasWarning) {
            inverterBox.classList.add('warning-active');
            // console.log('[Inverter] Warning ACTIVATED');
        } else {
            inverterBox.classList.remove('warning-active');
            // console.log('[Inverter] Warning DEACTIVATED');
        }
        previousValues['inverter-warning'] = hasWarning;
    }

    // ===== ANIMATION DATA LOADING =====
    // Load sensors needed for proper animation logic (solarPerc already loaded above)

    const boilerPowerData = await getSensorSafe(getSensorId('boiler_current_cbb_w'));
    const boilerPower = boilerPowerData.value || 0;

    const boilerInstallPowerData = await getSensorSafe(getSensorId('boiler_install_power'));
    const boilerMaxPower = boilerInstallPowerData.value || 3000; // Default 3kW

    // OPRAVA BUG #4: Volat animateFlow() jen pokud se hodnoty skutečně změnily
    // NEBO pokud je nastaven flag needsFlowReinitialize (po přepnutí tabu)
    const currentPowerValues = {
        solarPower,
        solarPerc,
        batteryPower,
        gridPower,
        housePower,
        boilerPower,
        boilerMaxPower
    };

    // Kontrola zda se něco změnilo
    const powerChanged = !lastPowerValues ||
        Object.keys(currentPowerValues).some(key =>
            Math.abs(currentPowerValues[key] - (lastPowerValues[key] || 0)) > 0.1
        );

    if (powerChanged || needsFlowReinitialize) {
        if (needsFlowReinitialize) {
            // console.log('[Animation] Flow reinitialize flag set, forcing animation update');
            needsFlowReinitialize = false; // Reset flag
        } else {
            // console.log('[Animation] Power values changed, updating flow');
        }
        lastPowerValues = currentPowerValues;

        // Animate particles (kontinuálně běžící s aktualizací rychlosti)
        animateFlow(currentPowerValues);
    }

    // REMOVED: Control panel status now handled by WebSocket events
    // if (!previousValues['control-status-loaded']) {
    //     loadControlStatus();
    //     previousValues['control-status-loaded'] = true;
    // }

    // Load details for all nodes (only on first load or explicit refresh)
    if (!previousValues['node-details-loaded']) {
        await loadNodeDetails(); // Wait for details on first load
        previousValues['node-details-loaded'] = true;
    }

    // Update ČHMÚ weather warning badge
    updateChmuWarningBadge();
}

// Force full refresh (for manual reload or after service calls)
function forceFullRefresh() {
    previousValues['control-status-loaded'] = false;
    previousValues['node-details-loaded'] = false;
    loadData();
}

// Load detailed information for all nodes (optimized - partial updates)
async function loadNodeDetails() {
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
        const solarForecastS1 = await getSensor(getSensorId('solar_forecast_string1'));
        const solarForecastS2 = await getSensor(getSensorId('solar_forecast_string2'));

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
        updateElementIfChanged('solar-forecast-tomorrow-value', parseFloat(forecastTomorrow).toFixed(2) + ' kWh');

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

        // === GRID DETAILS ===
        const gridPowerData = await getSensor(getSensorId('actual_aci_wtotal'));
        const gridImport = await getSensor(getSensorId('ac_in_ac_ad'));
        const gridExport = await getSensor(getSensorId('ac_in_ac_pd'));
        const gridFreq = await getSensor(getSensorId('ac_in_aci_f')); // OPRAVENO: správný senzor
        const gridL1V = await getSensor(getSensorId('ac_in_aci_vr')); // OPRAVENO: L1 napětí
        const gridL2V = await getSensor(getSensorId('ac_in_aci_vs')); // OPRAVENO: L2 napětí
        const gridL3V = await getSensor(getSensorId('ac_in_aci_vt')); // OPRAVENO: L3 napětí
        const gridL1P = await getSensor(getSensorId('actual_aci_wr'));
        const gridL2P = await getSensor(getSensorId('actual_aci_ws'));
        const gridL3P = await getSensor(getSensorId('actual_aci_wt'));
        const gridPower = gridPowerData.value || 0;

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
        updateElementIfChanged('grid-l1-power', Math.round(gridL1P.value || 0) + 'W');
        updateElementIfChanged('grid-l2-power', Math.round(gridL2P.value || 0) + 'W');
        updateElementIfChanged('grid-l3-power', Math.round(gridL3P.value || 0) + 'W');

        // Update main box phases (new elements)
        updateElementIfChanged('grid-l1-volt-main', Math.round(gridL1V.value || 0) + 'V');
        updateElementIfChanged('grid-l2-volt-main', Math.round(gridL2V.value || 0) + 'V');
        updateElementIfChanged('grid-l3-volt-main', Math.round(gridL3V.value || 0) + 'V');
        updateElementIfChanged('grid-l1-power-main', Math.round(gridL1P.value || 0) + 'W');
        updateElementIfChanged('grid-l2-power-main', Math.round(gridL2P.value || 0) + 'W');
        updateElementIfChanged('grid-l3-power-main', Math.round(gridL3P.value || 0) + 'W');

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
            let modeDisplay = modeValue;

            if (modeValue === 'CBB') {
                modeDisplay = '🤖 Inteligentní';
                if (modeIcon) modeIcon.textContent = '🤖';
            } else if (modeValue === 'Manual') {
                modeDisplay = '👤 Manuální';
                if (modeIcon) modeIcon.textContent = '👤';
            } else {
                if (modeIcon) modeIcon.textContent = '⚙️';
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
                boilerControlSection.style.opacity = '1';
                boilerControlSection.style.pointerEvents = 'auto';
            } else {
                boilerControlSection.style.opacity = '0.3';
                boilerControlSection.style.pointerEvents = 'none';
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
            gridExportIcon = '💧'; // Zapnuto - odpovídá ovládacímu panelu
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
    }

    // FIX: Překreslit linky po načtení dat (může se změnit pozice elementů)
    // Použít debounced verzi aby se nepřekreslovali příliš často
    debouncedDrawConnections(50);
}

// Show charge battery dialog
async function showChargeBatteryDialog() {
    try {
        // Check shield queue before adding task (use dynamic lookup)
        const shieldQueue = await getSensor(findShieldSensorId('service_shield_queue'));
        const queueCount = parseInt(shieldQueue.value) || 0;

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
    const targetSoC = parseInt(document.getElementById('target-soc-slider').value);

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
        } else {
            // Re-enable on error
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('pending');
            }
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
// === THEME DETECTION ===

/**
 * Detekuje aktuální téma Home Assistantu a aplikuje správné styly
 */
function detectAndApplyTheme() {
    try {
        const hass = getHass();
        const bodyElement = document.body;
        let isLightTheme = false;

        if (hass && hass.themes) {
            // Metoda 1: Přímý přístup k HA theme konfiguraci (nejspolehlivější)
            const selectedTheme = hass.selectedTheme || hass.themes.default_theme;
            const darkMode = hass.themes.darkMode;

            // console.log('[Theme] HA theme info:', {
            //     selectedTheme,
            //     darkMode,
            //     themes: hass.themes
            // });

            // HA má explicitní dark mode flag
            if (darkMode !== undefined) {
                isLightTheme = !darkMode;
                // console.log('[Theme] Using HA darkMode flag:', darkMode, '-> light theme:', isLightTheme);
            } else if (selectedTheme) {
                // Fallback: některá témata mají v názvu "light" nebo "dark"
                const themeName = selectedTheme.toLowerCase();
                if (themeName.includes('light')) {
                    isLightTheme = true;
                } else if (themeName.includes('dark')) {
                    isLightTheme = false;
                }
                // console.log('[Theme] Detected from theme name:', selectedTheme, '-> light:', isLightTheme);
            }
        } else {
            console.warn('[Theme] Cannot access hass.themes, trying CSS detection');
        }

        // Metoda 2: Fallback - detekce z CSS proměnných
        if (!hass || !hass.themes) {
            try {
                const haElement = parent.document.querySelector('home-assistant');
                if (haElement) {
                    const computedStyle = getComputedStyle(haElement);
                    const primaryBg = computedStyle.getPropertyValue('--primary-background-color');

                    if (primaryBg) {
                        const rgb = primaryBg.match(/\d+/g);
                        if (rgb && rgb.length >= 3) {
                            const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
                            isLightTheme = brightness > 128;
                            console.log('[Theme] CSS detection - brightness:', brightness, '-> light:', isLightTheme);
                        }
                    }
                }
            } catch (e) {
                console.warn('[Theme] CSS detection failed:', e);
            }
        }

        // Aplikovat třídu na body
        if (isLightTheme) {
            bodyElement.classList.add('light-theme');
            bodyElement.classList.remove('dark-theme');
            // console.log('[Theme] ✓ Light theme applied');
        } else {
            bodyElement.classList.add('dark-theme');
            bodyElement.classList.remove('light-theme');
            // console.log('[Theme] ✓ Dark theme applied');
        }

    } catch (error) {
        console.error('[Theme] Error detecting theme:', error);
        // Výchozí: tmavé téma
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
    }
}

// === TOOLTIP SYSTEM ===

/**
 * Globální tooltip systém - používá dedikované DOM elementy mimo flow
 * Toto řešení zaručuje správné pozicování bez ohledu na CSS transformace rodičů
 */
function initTooltips() {
    const tooltip = document.getElementById('global-tooltip');
    const arrow = document.getElementById('global-tooltip-arrow');
    const entityValues = document.querySelectorAll('.entity-value[data-tooltip], .entity-value[data-tooltip-html], .detail-value[data-tooltip-html], #battery-grid-charging-indicator[data-tooltip], #battery-grid-charging-indicator[data-tooltip-html]');

    if (!tooltip || !arrow) {
        console.error('[Tooltips] Global tooltip elements not found!');
        return;
    }

    entityValues.forEach(element => {
        element.addEventListener('mouseenter', function () {
            const tooltipText = this.getAttribute('data-tooltip');
            const tooltipHtml = this.getAttribute('data-tooltip-html');

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
            const viewportWidth = window.innerWidth;
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

    // console.log('[Tooltips] Initialized for', entityValues.length, 'elements');
}

// === GRID CHARGING PLAN FUNCTIONS ===

// Update target warning indicator - kontrola dosažitelnosti cílové kapacity
async function updateTargetWarningIndicator() {
    const forecastData = await getSensorString(getSensorId('battery_forecast'));
    const warningRow = document.getElementById('target-warning-row');
    const warningIndicator = document.getElementById('target-warning-indicator');

    if (!forecastData || !forecastData.attributes || !warningRow || !warningIndicator) {
        return;
    }

    const attrs = forecastData.attributes;
    const targetAchieved = attrs.target_achieved;
    const minAchieved = attrs.min_achieved;
    const finalCapacityKwh = attrs.final_capacity_kwh;
    const targetCapacityKwh = attrs.target_capacity_kwh;
    const minCapacityKwh = attrs.min_capacity_kwh;
    const shortageKwh = attrs.shortage_kwh || 0;

    // Pokud nejsou dostupná data, skrýt
    if (targetAchieved === undefined) {
        warningRow.style.display = 'none';
        return;
    }

    // Pokud je vše OK (target dosažen), skrýt warning
    if (targetAchieved) {
        warningRow.style.display = 'none';
        return;
    }

    // Target NENÍ dosažen - zobrazit warning
    warningRow.style.display = 'flex';

    const maxCapacityKwh = attrs.max_capacity_kwh || 12.29;
    const finalPercentage = ((finalCapacityKwh / maxCapacityKwh) * 100).toFixed(0);
    const targetPercentage = ((targetCapacityKwh / maxCapacityKwh) * 100).toFixed(0);

    // Rozhodnout barvu a text podle závažnosti
    let color, icon, text, tooltipText;

    if (!minAchieved) {
        // KRITICKÉ: Nedosáhne ani minimum
        color = '#f44336'; // červená
        icon = '🔴';
        text = `⚠️ Dosáhne ${finalPercentage}%`;
        tooltipText = `
            <div style="padding: 8px; text-align: left;">
                <strong style="color: ${color};">⚠️ KRITICKÉ VAROVÁNÍ</strong><br><br>
                <strong>Nedosáhne minimální kapacity!</strong><br>
                <span style="opacity: 0.8;">
                    Cílová kapacita: ${targetPercentage}% (${targetCapacityKwh.toFixed(1)} kWh)<br>
                    Minimální kapacita: ${((minCapacityKwh / maxCapacityKwh) * 100).toFixed(0)}% (${minCapacityKwh.toFixed(1)} kWh)<br>
                    <strong>Dosažitelná: ${finalPercentage}% (${finalCapacityKwh.toFixed(1)} kWh)</strong><br>
                    Chybí: ${shortageKwh.toFixed(1)} kWh
                </span>
                <hr style="margin: 6px 0; border: none; border-top: 1px solid rgba(255,255,255,0.2);">
                <span style="font-size: 0.9em; opacity: 0.9;">
                    💡 Není dostatek levných hodin pro nabíjení.<br>
                    Zvyšte max. cenu nebo snižte cílovou kapacitu.
                </span>
            </div>
        `;
    } else {
        // VAROVÁNÍ: Nedosáhne target, ale dosáhne minimum
        color = '#ff9800'; // oranžová
        icon = '🟠';
        text = `⚠️ Dosáhne ${finalPercentage}%`;
        tooltipText = `
            <div style="padding: 8px; text-align: left;">
                <strong style="color: ${color};">⚠️ VAROVÁNÍ</strong><br><br>
                <strong>Nedosáhne cílové kapacity</strong><br>
                <span style="opacity: 0.8;">
                    Cílová kapacita: ${targetPercentage}% (${targetCapacityKwh.toFixed(1)} kWh)<br>
                    <strong>Dosažitelná: ${finalPercentage}% (${finalCapacityKwh.toFixed(1)} kWh)</strong><br>
                    Chybí: ${shortageKwh.toFixed(1)} kWh
                </span>
                <hr style="margin: 6px 0; border: none; border-top: 1px solid rgba(255,255,255,0.2);">
                <span style="font-size: 0.9em; opacity: 0.9;">
                    💡 Není dostatek levných hodin pro dosažení targetu.<br>
                    Minimální kapacita bude zajištěna.
                </span>
            </div>
        `;
    }

    // Nastavit text a barvu
    warningIndicator.textContent = text;
    warningIndicator.style.color = color;
    warningIndicator.setAttribute('data-tooltip-html', tooltipText);

    // Přidat blikání (použít existující animaci)
    warningIndicator.style.animation = 'pulse-warning 2s ease-in-out infinite';
}

async function updateGridChargingPlan() {
    const gridChargingData = await getSensorString(getSensorId('grid_charging_planned'));
    const isPlanned = gridChargingData.value === 'on';

    // console.log('[Grid Charging] updateGridChargingPlan() called');
    // console.log('[Grid Charging] Sensor ID:', getSensorId('grid_charging_planned'));
    // console.log('[Grid Charging] Sensor value:', gridChargingData.value);
    // console.log('[Grid Charging] Is planned:', isPlanned);
    // console.log('[Grid Charging] Attributes:', gridChargingData.attributes);

    // Update indicator in battery card - always visible, but with active/inactive state
    const indicator = document.getElementById('battery-grid-charging-indicator');
    if (indicator) {
        // console.log('[Grid Charging] Indicator found, setting active class:', isPlanned);
        if (isPlanned) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }

        // Build tooltip with charging intervals table
        if (gridChargingData.attributes?.charging_intervals?.length > 0) {
            const intervals = gridChargingData.attributes.charging_intervals;
            const totalEnergy = gridChargingData.attributes.total_energy_kwh || 0;
            const totalCost = gridChargingData.attributes.total_cost_czk || 0;

            let tooltipHTML = '<div style="text-align: left; font-size: 11px; min-width: 250px;">';
            tooltipHTML += '<strong style="display: block; margin-bottom: 8px; font-size: 12px;">Plánované nabíjení z gridu</strong>';
            tooltipHTML += '<table style="width: 100%; border-collapse: collapse;">';
            tooltipHTML += '<thead><tr style="border-bottom: 1px solid rgba(255,255,255,0.2);">';
            tooltipHTML += '<th style="padding: 4px; text-align: left;">Čas</th>';
            tooltipHTML += '<th style="padding: 4px; text-align: right;">Energie</th>';
            tooltipHTML += '<th style="padding: 4px; text-align: right;">Cena</th>';
            tooltipHTML += '</tr></thead>';
            tooltipHTML += '<tbody>';

            intervals.forEach(interval => {
                if (interval.is_charging_battery) {
                    const time = new Date(interval.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
                    const energy = (interval.energy_kwh || 0).toFixed(2);
                    const cost = (interval.cost_czk || 0).toFixed(2);
                    tooltipHTML += '<tr>';
                    tooltipHTML += `<td style="padding: 2px 4px;">${time}</td>`;
                    tooltipHTML += `<td style="padding: 2px 4px; text-align: right;">${energy} kWh</td>`;
                    tooltipHTML += `<td style="padding: 2px 4px; text-align: right;">${cost} Kč</td>`;
                    tooltipHTML += '</tr>';
                }
            });

            tooltipHTML += '</tbody>';
            tooltipHTML += '<tfoot><tr style="border-top: 1px solid rgba(255,255,255,0.3); font-weight: bold;">';
            tooltipHTML += '<td style="padding: 4px;">Celkem</td>';
            tooltipHTML += `<td style="padding: 4px; text-align: right;">${totalEnergy.toFixed(2)} kWh</td>`;
            tooltipHTML += `<td style="padding: 4px; text-align: right;">${totalCost.toFixed(2)} Kč</td>`;
            tooltipHTML += '</tr></tfoot>';
            tooltipHTML += '</table>';
            tooltipHTML += '</div>';

            indicator.setAttribute('data-tooltip-html', tooltipHTML);
        } else {
            indicator.setAttribute('data-tooltip', 'Žádné plánované nabíjení');
        }

        // Re-inicializovat tooltips aby fungovaly i na dynamicky přidaných elementech
        initTooltips();
    }
    // else {
    //     console.error('[Grid Charging] Indicator element NOT FOUND!');
    // }

    // Show/hide section in battery details
    // OPRAVA: Zobrazit když existují intervaly (ne jen když sensor je ON)
    const section = document.getElementById('grid-charging-plan-section');
    if (section) {
        const hasIntervals = gridChargingData.attributes?.charging_intervals?.length > 0;
        const shouldShow = hasIntervals; // Zobrazit když jsou plánované intervaly
        // console.log('[Grid Charging] Section found, hasIntervals:', hasIntervals, 'shouldShow:', shouldShow);
        section.style.display = shouldShow ? 'block' : 'none';
    }
    // else {
    //     console.error('[Grid Charging] Section element NOT FOUND!');
    // }

    // Update energy (total_energy_kwh)
    const energyElement = document.getElementById('grid-charging-energy');
    if (energyElement && gridChargingData.attributes && gridChargingData.attributes.total_energy_kwh !== undefined) {
        const energy = parseFloat(gridChargingData.attributes.total_energy_kwh);
        energyElement.textContent = energy.toFixed(1) + ' kWh';
    }

    // Update cost
    const costElement = document.getElementById('grid-charging-cost');
    if (costElement && gridChargingData.attributes && gridChargingData.attributes.total_cost_czk !== undefined) {
        const cost = parseFloat(gridChargingData.attributes.total_cost_czk);
        costElement.textContent = '~' + cost.toFixed(2) + ' Kč';
    }

    // Update start time - relativní čas
    const startElement = document.getElementById('grid-charging-start');
    if (startElement && gridChargingData.attributes) {
        if (gridChargingData.attributes.next_charging_start) {
            // Get first charging interval to calculate relative time
            const intervals = gridChargingData.attributes.charging_intervals || [];
            const firstChargingInterval = intervals.find(i => i.is_charging_battery);

            if (firstChargingInterval) {
                const startTime = new Date(firstChargingInterval.timestamp);
                const now = new Date();
                const diffMs = startTime - now;
                const diffMinutes = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMinutes / 60);
                const remainingMinutes = diffMinutes % 60;

                let relativeText = '';
                if (diffMinutes < 0) {
                    relativeText = 'Probíhá';
                } else if (diffMinutes < 60) {
                    relativeText = `za ${diffMinutes} min`;
                } else if (diffMinutes < 1440) { // méně než 24h
                    if (remainingMinutes > 0) {
                        relativeText = `za ${diffHours}h ${remainingMinutes}min`;
                    } else {
                        relativeText = `za ${diffHours}h`;
                    }
                } else {
                    const days = Math.floor(diffHours / 24);
                    relativeText = `za ${days}d`;
                }

                startElement.textContent = relativeText;
                startElement.setAttribute('title', gridChargingData.attributes.next_charging_start);
            } else {
                startElement.textContent = gridChargingData.attributes.next_charging_start;
            }
        } else {
            startElement.textContent = '--';
        }
    }

    // Update target warning indicator - načíst data z battery_forecast sensoru
    await updateTargetWarningIndicator();

    // Build tooltip HTML with intervals table - na IKONĚ indikátoru
    if (indicator && gridChargingData.attributes) {
        if (gridChargingData.attributes.charging_intervals && gridChargingData.attributes.charging_intervals.length > 0) {
            const intervals = gridChargingData.attributes.charging_intervals;
            const totalEnergy = gridChargingData.attributes.total_energy_kwh || 0;
            const totalCost = gridChargingData.attributes.total_cost_czk || 0;
            const startTimeFormatted = gridChargingData.attributes.next_charging_start || '';

            let tooltipHtml = `
                <div style="padding: 8px;">
                    <strong>Start:</strong> ${startTimeFormatted}<br>
                    <strong>Plánované dobití:</strong> ${totalEnergy.toFixed(1)} kWh<br>
                    <strong>Celková cena:</strong> ~${totalCost.toFixed(2)} Kč
                    <hr style="margin: 8px 0; border: none; border-top: 1px solid var(--border-secondary);">
                    <table style="width: 100%; font-size: 0.85em; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--border-primary);">
                                <th style="padding: 4px; text-align: left;">Čas</th>
                                <th style="padding: 4px; text-align: right;">kWh</th>
                                <th style="padding: 4px; text-align: right;">Kč</th>
                                <th style="padding: 4px; text-align: center;">⚡</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            intervals.forEach((interval, index) => {
                if (!interval.is_charging_battery) return; // Skip non-charging intervals

                const time = new Date(interval.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
                const energy = interval.energy_kwh ? interval.energy_kwh.toFixed(2) : '-';
                const cost = interval.cost_czk ? interval.cost_czk.toFixed(2) : '-';

                tooltipHtml += `
                    <tr style="border-bottom: 1px solid var(--border-tertiary);">
                        <td style="padding: 4px;">${time}</td>
                        <td style="padding: 4px; text-align: right;">${energy}</td>
                        <td style="padding: 4px; text-align: right;">${cost}</td>
                        <td style="padding: 4px; text-align: center;">⚡</td>
                    </tr>
                `;
            });

            tooltipHtml += `
                        </tbody>
                    </table>
                </div>
            `;

            indicator.setAttribute('data-tooltip-html', tooltipHtml);
        }
    }
}

function showGridChargingPopup() {
    getSensorString(getSensorId('grid_charging_planned')).then(gridChargingData => {
        if (!gridChargingData.attributes || !gridChargingData.attributes.charging_intervals) {
            showDialog('Plánované nabíjení ze sítě', 'Žádné intervaly nejsou naplánovány.');
            return;
        }

        const intervals = gridChargingData.attributes.charging_intervals;
        const totalEnergy = gridChargingData.attributes.total_energy_kwh || 0;
        const totalCost = gridChargingData.attributes.total_cost_czk || 0;

        // Build table HTML
        let tableHtml = `
            <div style="margin-bottom: 15px;">
                <strong>Celková energie:</strong> ${totalEnergy.toFixed(2)} kWh<br>
                <strong>Celková cena:</strong> ~${totalCost.toFixed(2)} Kč
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                <thead>
                    <tr style="background: var(--bg-secondary); border-bottom: 2px solid var(--border-primary);">
                        <th style="padding: 8px; text-align: left;">Čas</th>
                        <th style="padding: 8px; text-align: right;">Energie</th>
                        <th style="padding: 8px; text-align: right;">Cena</th>
                        <th style="padding: 8px; text-align: center;">Stav</th>
                    </tr>
                </thead>
                <tbody>
        `;

        intervals.forEach((interval, index) => {
            const rowBg = index % 2 === 0 ? 'var(--bg-tertiary)' : 'transparent';
            const isCharging = interval.is_charging_battery;
            const statusIcon = isCharging ? '⚡' : '🔋';
            const statusText = isCharging ? 'Nabíjí' : interval.note || 'Baterie plná';
            const energyText = interval.grid_charge_kwh ? interval.grid_charge_kwh.toFixed(2) + ' kWh' : '-';
            const costText = interval.grid_charge_cost ? '~' + interval.grid_charge_cost.toFixed(2) + ' Kč' : '-';

            tableHtml += `
                <tr style="background: ${rowBg}; border-bottom: 1px solid var(--border-tertiary);">
                    <td style="padding: 8px;">${interval.time_from} - ${interval.time_to}</td>
                    <td style="padding: 8px; text-align: right;">${energyText}</td>
                    <td style="padding: 8px; text-align: right;">${costText}</td>
                    <td style="padding: 8px; text-align: center;" title="${statusText}">${statusIcon}</td>
                </tr>
            `;
        });

        tableHtml += `
                </tbody>
            </table>
        `;

        showDialog('⚡ Plánované nabíjení ze sítě', tableHtml);
    });
}

// === INITIALIZATION ===

function init() {
    drawConnections();

    // Detekovat a aplikovat téma z Home Assistantu
    detectAndApplyTheme();

    // Auto-collapse control panel on mobile
    if (window.innerWidth <= 768) {
        const panel = document.getElementById('control-panel');
        const icon = document.getElementById('panel-toggle-icon');
        if (panel && icon) {
            panel.classList.add('minimized');
            icon.textContent = '+';
        }
    }

    // Initialize tooltip system
    initTooltips();

    // Initial full load
    forceFullRefresh();
    updateTime();

    // Subscribe to shield state changes for real-time updates
    subscribeToShield();

    // Initial shield UI update with retry logic (wait for sensors after HA restart)
    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = 2000; // 2s between retries

    function tryInitialShieldLoad() {
        console.log(`[Shield] Attempting initial load (attempt ${retryCount + 1}/${maxRetries})...`);

        // Check if shield sensors are available
        const hass = getHass();
        if (!hass || !hass.states) {
            console.warn('[Shield] HA connection not ready, will retry...');
            retryCount++;
            if (retryCount < maxRetries) {
                setTimeout(tryInitialShieldLoad, retryInterval);
            } else {
                console.error('[Shield] Failed to load after', maxRetries, 'attempts');
                console.warn('[Shield] Falling back to 20s polling as backup');
                // Fallback: Enable backup polling if initial load fails
                setInterval(() => {
                    console.log('[Shield] Backup polling triggered');
                    monitorShieldActivity();
                    updateShieldQueue();
                    updateShieldUI();
                    updateButtonStates();
                }, 20000);
            }
            return;
        }

        const activitySensorId = findShieldSensorId('service_shield_activity');
        if (!activitySensorId || !hass.states[activitySensorId]) {
            console.warn('[Shield] Shield sensors not ready yet, will retry...');
            retryCount++;
            if (retryCount < maxRetries) {
                setTimeout(tryInitialShieldLoad, retryInterval);
            } else {
                console.error('[Shield] Shield sensors not available after', maxRetries, 'attempts');
                console.warn('[Shield] Falling back to 20s polling as backup');
                // Fallback: Enable backup polling if sensors not available
                setInterval(() => {
                    console.log('[Shield] Backup polling triggered');
                    monitorShieldActivity();
                    updateShieldQueue();
                    updateShieldUI();
                    updateButtonStates();
                }, 20000);
            }
            return;
        }

        // Sensors are ready, load UI
        console.log('[Shield] Sensors ready, loading initial UI...');
        updateButtonStates(); // Set initial active states (green highlighting)
        updateShieldQueue();  // Load initial queue state
        updateShieldUI();     // Load initial shield status
        monitorShieldActivity(); // Start activity monitoring
    }

    // Start initial load with delay
    setTimeout(tryInitialShieldLoad, 1000);

    // === EVENT-DRIVEN ARCHITECTURE ===
    // Veškeré updates jsou řízeny přes WebSocket subscriptions v subscribeToShield()
    // - Data sensors -> debouncedLoadData() (200ms debounce)
    // - Detail sensors -> debouncedLoadNodeDetails() (500ms debounce)
    // - Pricing sensors -> debouncedLoadPricingData() (300ms debounce)
    // - Shield sensors -> debouncedShieldMonitor() (100ms debounce)

    // REMOVED: Polling-based updates (replaced by WebSocket events)
    // setInterval(loadData, 5000);  ❌ Nahrazeno event-driven
    // setInterval(loadNodeDetails, 30000);  ❌ Nahrazeno event-driven
    // setInterval(detectAndApplyTheme, 5000);  ❌ Nahrazeno event-driven

    // Theme detection - pouze event listeners (NO POLLING)
    // 1. Parent window theme changes
    try {
        if (parent && parent.addEventListener) {
            parent.addEventListener('theme-changed', () => {
                console.log('[Theme] Theme changed event detected');
                detectAndApplyTheme();
            });
        }
    } catch (e) {
        console.warn('[Theme] Cannot listen to parent events:', e);
    }

    // 2. System preference changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            console.log('[Theme] System preference changed');
            detectAndApplyTheme();
        });
    }

    // 3. Fallback: Check theme on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('[Theme] Tab became visible, checking theme');
            detectAndApplyTheme();
        }
    });

    // REMOVED: Backup shield monitoring - WebSocket events handle all updates in real-time
    // setInterval(() => {
    //     monitorShieldActivity();
    //     updateShieldQueue();
    // }, 10000);

    // Time update every second
    setInterval(updateTime, 1000);

    // Redraw lines on resize with debounce
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        // Clear cache on resize
        cachedNodeCenters = null;
        lastLayoutHash = null;
        resizeTimer = setTimeout(() => {
            drawConnections();
        }, 100);
    });

    // FIX: Force layout stabilization after initial render
    // Problém: Po restartu HA se někdy načítají CSS/HTML v jiném pořadí
    // Řešení: Opakované překreslení po různých intervalech
    // OPRAVA BUG #3: Inicializovat cache před prvním kreslením
    setTimeout(() => { getNodeCenters(); drawConnections(); }, 100);   // První pokus po 100ms
    setTimeout(() => { getNodeCenters(); drawConnections(); }, 500);   // Druhý pokus po 500ms
    setTimeout(() => { getNodeCenters(); drawConnections(); }, 1000);  // Třetí pokus po 1s
    setTimeout(() => { getNodeCenters(); drawConnections(); }, 2000);  // Finální po 2s

    // Mobile: Toggle node details on click (collapsed by default)
    if (window.innerWidth <= 768) {
        const nodes = document.querySelectorAll('.node');
        nodes.forEach(node => {
            node.addEventListener('click', function (e) {
                // Ignore clicks on buttons inside nodes
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                    return;
                }
                this.classList.toggle('expanded');
            });

            // Add cursor pointer to indicate clickability
            node.style.cursor = 'pointer';
        });
    }

    // === CUSTOM TILES INITIALIZATION ===
    initCustomTiles();
}

// Wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// === TAB SWITCHING ===
let pricingTabActive = false;
let needsFlowReinitialize = false; // Flag pro vynucené restartování flow animací

function switchTab(tabName) {
    // Remove active from all tabs and contents
    document.querySelectorAll('.dashboard-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active to clicked tab (find by checking which one was clicked via event)
    const clickedTab = event ? event.target : document.querySelector('.dashboard-tab');
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

    // OPRAVA: Při přepnutí na tab toky, překreslit connections a restartovat particles
    if (tabName === 'toky') {
        console.log('[Tab] ========== SWITCHING TO TOKY TAB ==========');
        console.log('[Tab] Event:', event);
        console.log('[Tab] Tab content element:', document.getElementById('toky-tab'));

        // 1. Zastavit všechny particle flows
        Object.keys(particleFlows).forEach(key => {
            particleFlows[key].active = false;
        });
        console.log('[Tab] ✓ Particle flows stopped');

        // 2. Odstranit všechny existující částice
        const particlesContainer = document.getElementById('particles');
        if (particlesContainer) {
            particlesContainer.innerHTML = '';
            console.log('[Tab] ✓ Particles cleared');
        } else {
            console.error('[Tab] ✗ Particles container NOT FOUND!');
        }

        // DŮLEŽITÉ: Počkat až se tab zobrazí a DOM se vykreslí
        setTimeout(() => {
            console.log('[Tab] --- Timeout fired, starting redraw ---');

            const flowTab = document.getElementById('toky-tab');
            console.log('[Tab] Flow tab visible?', flowTab && flowTab.classList.contains('active'));
            console.log('[Tab] Flow tab offsetHeight:', flowTab?.offsetHeight);

            // OPRAVA: Zkontrolovat jestli je tab skutečně viditelný
            if (!flowTab || !flowTab.classList.contains('active')) {
                console.warn('[Tab] ✗ Flow tab not visible yet, aborting redraw');
                return;
            }

            // 3. Invalidovat cache pozic
            cachedNodeCenters = null;
            lastLayoutHash = null;
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
                    cachedNodeCenters = null;
                    lastLayoutHash = null;
                    const retryCenters = getNodeCenters();
                    console.log('[Tab] Retry node centers result:', retryCenters);

                    if (!retryCenters || Object.keys(retryCenters).length === 0) {
                        console.error('[Tab] ✗ Retry also failed, giving up');
                        return;
                    }

                    console.log('[Tab] ✓ Node centers loaded on retry:', Object.keys(retryCenters).length);
                    drawConnections();
                    needsFlowReinitialize = true;
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
            needsFlowReinitialize = true;
            console.log('[Tab] Flag needsFlowReinitialize set to TRUE');

            // 8. Načíst aktuální data a restartovat particles
            console.log('[Tab] Loading fresh data for animations...');
            loadData(); // Načte data a zavolá animateFlow() s aktuálními hodnotami
            console.log('[Tab] ========== TOKY TAB SWITCH COMPLETE ==========');
        }, 150); // Delší timeout aby se DOM stihl vykreslit
    }

    // Load data when entering pricing tab
    if (tabName === 'pricing') {
        console.log('[Tab] ========== SWITCHING TO PRICING TAB ==========');
        // Počkat až se tab zobrazí a canvas bude viditelný
        setTimeout(() => {
            console.log('[Pricing] Tab visible, loading pricing data...');
            loadPricingData();
        }, 150); // Stejný timeout jako u Toky pro konzistenci
    }
}

// === PRICING CHARTS ===
let loadPricingDataTimer = null;
let priceCardHandlersAttached = false;  // Flag aby se handlery nastavily JEN JEDNOU
let currentPriceBlocks = {  // Aktuální bloky pro onClick handlery
    cheapest: null,
    expensive: null,
    bestExport: null,
    worstExport: null
};

// Debounced loadPricingData() - prevents excessive calls when multiple entities change
function debouncedLoadPricingData() {
    if (loadPricingDataTimer) clearTimeout(loadPricingDataTimer);
    loadPricingDataTimer = setTimeout(() => {
        if (pricingTabActive) {  // Only update if pricing tab is active
            loadPricingData();
        }
    }, 300); // Wait 300ms before executing (allow multiple changes to settle)
}
let combinedChart = null;

// Helper funkce pro detekci theme a barvy
function isLightTheme() {
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
    } catch (e) { }
    return false; // Default: dark theme
}

function getTextColor() {
    return isLightTheme() ? '#333333' : '#ffffff';
}

function getGridColor() {
    return isLightTheme() ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
}

// Convert Date to local ISO string (without timezone conversion to UTC)
function toLocalISOString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function getBoxId() {
    const hass = getHass();
    if (!hass || !hass.states) return null;
    for (const entityId in hass.states) {
        const match = entityId.match(/^sensor\.oig_(\d+)_/);
        if (match) return match[1];
    }
    return null;
}

// Reset zoom grafu na původní rozsah
function resetChartZoom() {
    if (combinedChart) {
        // Resetovat zoom pomocí odstranění scale limits
        delete combinedChart.options.scales.x.min;
        delete combinedChart.options.scales.x.max;
        combinedChart.update('none');

        currentZoomRange = null;  // Reset zoom state

        // Odebrat zoom-active z aktivní karty
        if (activeZoomCard) {
            activeZoomCard.classList.remove('zoom-active');
            activeZoomCard = null;
        }

        updateChartDetailLevel(combinedChart);
    }
}

// Přepínání režimu zobrazování datalabels
function toggleDatalabelMode() {
    const modes = ['auto', 'always', 'never'];
    const currentIndex = modes.indexOf(datalabelMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    datalabelMode = modes[nextIndex];

    // Aktualizovat UI
    const btnText = document.getElementById('datalabel-mode-text');
    const btn = document.getElementById('datalabel-toggle-btn');

    if (btnText) {
        const labels = { 'auto': 'Auto', 'always': 'Vždy', 'never': 'Nikdy' };
        btnText.textContent = labels[datalabelMode];
    }

    // Změnit barvu tlačítka podle módu
    if (btn) {
        if (datalabelMode === 'always') {
            btn.style.background = 'rgba(76,175,80,0.3)';
            btn.style.borderColor = 'rgba(76,175,80,0.7)';
        } else if (datalabelMode === 'never') {
            btn.style.background = 'rgba(244,67,54,0.2)';
            btn.style.borderColor = 'rgba(244,67,54,0.5)';
        } else {
            btn.style.background = 'rgba(76,175,80,0.2)';
            btn.style.borderColor = 'rgba(76,175,80,0.5)';
        }
    }

    // Aktualizovat graf
    if (combinedChart) {
        updateChartDetailLevel(combinedChart);
    }

    console.log('[Datalabels] Mode changed to:', datalabelMode);
}

// Sledování aktuálního zoom stavu
let currentZoomRange = null;
let activeZoomCard = null; // Reference na aktuálně aktivní kartu

// Datalabels režim: 'auto' (závislé na zoomu), 'always', 'never'
let datalabelMode = 'auto';

// Toggle zoom: pokud není zoom -> zoom IN, pokud je zoom -> zoom OUT
function zoomToTimeRange(startTime, endTime, cardElement = null) {
    if (!combinedChart) {
        console.log('[Zoom] Chart not available');
        return;
    }

    // Zkontrolovat jestli je už zazoomováno na tento rozsah
    const start = new Date(startTime);
    const end = new Date(endTime);
    const marginMs = 15 * 60 * 1000;
    const zoomStart = start.getTime() - marginMs;
    const zoomEnd = end.getTime() + marginMs;

    // Pokud už je zazoomováno na tento interval -> ZOOM OUT (reset)
    if (currentZoomRange &&
        Math.abs(currentZoomRange.start - zoomStart) < 60000 &&
        Math.abs(currentZoomRange.end - zoomEnd) < 60000) {
        console.log('[Zoom] Already zoomed to this range -> ZOOM OUT');

        // Reset zoom: odstranit scale limits
        delete combinedChart.options.scales.x.min;
        delete combinedChart.options.scales.x.max;
        combinedChart.update('none');

        currentZoomRange = null;

        // Odebrat zoom-active třídu z aktivní karty
        if (activeZoomCard) {
            activeZoomCard.classList.remove('zoom-active');
            activeZoomCard = null;
        }

        updateChartDetailLevel(combinedChart);
        return;
    }

    // ZOOM IN na nový interval
    console.log('[Zoom] ZOOM IN to range:', startTime, '->', endTime);
    console.log('[Zoom] Calculated zoom:', new Date(zoomStart), '->', new Date(zoomEnd));

    try {
        // OPRAVA: zoom() metoda nefunguje správně pro absolutní rozsah
        // Místo toho nastavíme přímo scale limits a zavoláme update()

        // Nastavit min/max na scale
        combinedChart.options.scales.x.min = zoomStart;
        combinedChart.options.scales.x.max = zoomEnd;

        // Aplikovat změny
        combinedChart.update('none'); // 'none' = bez animace, okamžitě

        console.log('[Zoom] Chart X scale after update - min:', combinedChart.scales.x.min, 'max:', combinedChart.scales.x.max);

        // Uložit aktuální zoom
        currentZoomRange = { start: zoomStart, end: zoomEnd };
        console.log('[Zoom] Zoom IN applied successfully');

        // Odebrat zoom-active ze všech karet
        document.querySelectorAll('.stat-card.zoom-active').forEach(card => {
            card.classList.remove('zoom-active');
        });

        // Přidat zoom-active na novou kartu
        if (cardElement) {
            cardElement.classList.add('zoom-active');
            activeZoomCard = cardElement;
        }

        // Aktualizovat detail level
        updateChartDetailLevel(combinedChart);
    } catch (error) {
        console.error('[Zoom] Error:', error);
    }
}

// Adaptivní úprava detailu grafu podle úrovně zoomu
function updateChartDetailLevel(chart) {
    if (!chart || !chart.scales || !chart.scales.x) return;

    const xScale = chart.scales.x;
    const visibleRange = xScale.max - xScale.min; // v milisekundách
    const hoursVisible = visibleRange / (1000 * 60 * 60);

    // Určit úroveň detailu
    let detailLevel = 'overview'; // celkový pohled (>24h)
    if (hoursVisible <= 24) detailLevel = 'day'; // denní pohled (6-24h)
    if (hoursVisible <= 6) detailLevel = 'detail'; // detailní pohled (<6h)

    // Adaptivní nastavení legend
    if (chart.options.plugins.legend) {
        // Overview: kompaktní legenda
        if (detailLevel === 'overview') {
            chart.options.plugins.legend.labels.padding = 10;
            chart.options.plugins.legend.labels.font.size = 11;
        }
        // Detail: větší legenda
        else if (detailLevel === 'detail') {
            chart.options.plugins.legend.labels.padding = 12;
            chart.options.plugins.legend.labels.font.size = 12;
        }
        // Day: střední
        else {
            chart.options.plugins.legend.labels.padding = 10;
            chart.options.plugins.legend.labels.font.size = 11;
        }
    }

    // Adaptivní nastavení os Y
    const yAxes = ['y-price', 'y-solar', 'y-power'];
    yAxes.forEach(axisId => {
        const axis = chart.options.scales[axisId];
        if (!axis) return;

        if (detailLevel === 'overview') {
            // Overview: menší titulky, skrýt některé
            axis.title.display = false; // Skrýt názvy os
            axis.ticks.font.size = 10;
            if (axisId === 'y-solar') axis.display = false; // Skrýt střední osu
        } else if (detailLevel === 'detail') {
            // Detail: plné titulky
            axis.title.display = true;
            axis.title.font.size = 12;
            axis.ticks.font.size = 11;
            axis.display = true;
        } else {
            // Day: střední velikost
            axis.title.display = true;
            axis.title.font.size = 11;
            axis.ticks.font.size = 10;
            axis.display = true;
        }
    });

    // Adaptivní nastavení X osy
    if (chart.options.scales.x) {
        if (detailLevel === 'overview') {
            chart.options.scales.x.ticks.maxTicksLimit = 12;
            chart.options.scales.x.ticks.font.size = 10;
        } else if (detailLevel === 'detail') {
            chart.options.scales.x.ticks.maxTicksLimit = 24;
            chart.options.scales.x.ticks.font.size = 11;
            // V detailu ukázat i minuty
            chart.options.scales.x.time.displayFormats.hour = 'HH:mm';
        } else {
            chart.options.scales.x.ticks.maxTicksLimit = 16;
            chart.options.scales.x.ticks.font.size = 10;
            chart.options.scales.x.time.displayFormats.hour = 'dd.MM HH:mm';
        }
    }

    // Adaptivní zobrazení datalabels podle zoom úrovně a módu
    const shouldShowLabels = (datalabelMode === 'always') ||
        (datalabelMode === 'auto' && hoursVisible <= 6);

    chart.data.datasets.forEach((dataset, idx) => {
        if (!dataset.datalabels) {
            dataset.datalabels = {};
        }

        // Vypnout labely pokud režim = 'never'
        if (datalabelMode === 'never') {
            dataset.datalabels.display = false;
            return;
        }

        // Zobrazit labely pro VŠECHNY datasety při zoomu
        if (shouldShowLabels) {
            // Určit hustotu zobrazování podle zoom úrovně
            let showEveryNth = 1;
            if (hoursVisible > 3 && hoursVisible <= 6) {
                showEveryNth = 2; // 3-6h: každý druhý bod
            } else if (hoursVisible > 6) {
                showEveryNth = 4; // >6h: každý čtvrtý bod
            }
            // <3h: všechny body (showEveryNth = 1)

            dataset.datalabels.display = (context) => {
                const value = context.dataset.data[context.dataIndex];
                if (value == null || value === 0) return false;
                return context.dataIndex % showEveryNth === 0;
            };

            // Nastavení podle typu dat
            const isPrice = dataset.yAxisID === 'y-price';
            const isSolar = dataset.label && (dataset.label.includes('Solární') || dataset.label.includes('String'));
            const isBattery = dataset.label && dataset.label.includes('kapacita');

            dataset.datalabels.align = 'top';
            dataset.datalabels.offset = 6;
            dataset.datalabels.color = '#fff';
            dataset.datalabels.font = { size: 9, weight: 'bold' };

            // Formátování podle typu
            if (isPrice) {
                dataset.datalabels.formatter = (value) => value != null ? value.toFixed(2) + ' Kč' : '';
                dataset.datalabels.backgroundColor = dataset.borderColor || 'rgba(33, 150, 243, 0.8)';
            } else if (isSolar) {
                dataset.datalabels.formatter = (value) => value != null ? value.toFixed(1) + ' kW' : '';
                dataset.datalabels.backgroundColor = dataset.borderColor || 'rgba(255, 193, 7, 0.8)';
            } else if (isBattery) {
                dataset.datalabels.formatter = (value) => value != null ? value.toFixed(1) + ' kWh' : '';
                dataset.datalabels.backgroundColor = dataset.borderColor || 'rgba(120, 144, 156, 0.8)';
            } else {
                // Ostatní datasety
                dataset.datalabels.formatter = (value) => value != null ? value.toFixed(1) : '';
                dataset.datalabels.backgroundColor = dataset.borderColor || 'rgba(33, 150, 243, 0.8)';
            }

            dataset.datalabels.borderRadius = 4;
            dataset.datalabels.padding = { top: 3, bottom: 3, left: 5, right: 5 };
        } else {
            dataset.datalabels.display = false;
        }
    });

    chart.update('none'); // Update bez animace
    console.log(`[Detail] Zoom level: ${hoursVisible.toFixed(1)}h, Labels: ${shouldShowLabels ? 'ON' : 'OFF'}, Mode: ${datalabelMode}`);
}

// Najít extrémní blok cen (nejlevnější/nejdražší 3h období)
function findExtremePriceBlock(prices, findLowest, blockHours = 3) {
    if (!prices || prices.length === 0) return null;

    const blockSize = Math.floor((blockHours * 60) / 15); // 3h = 12 intervalů po 15min
    if (prices.length < blockSize) return null;

    let extremeBlock = null;
    let extremeAvg = findLowest ? Infinity : -Infinity;

    // Sliding window přes všechny možné bloky
    for (let i = 0; i <= prices.length - blockSize; i++) {
        const block = prices.slice(i, i + blockSize);
        const blockValues = block.map(p => p.price);
        const blockAvg = blockValues.reduce((a, b) => a + b, 0) / blockValues.length;

        if ((findLowest && blockAvg < extremeAvg) || (!findLowest && blockAvg > extremeAvg)) {
            extremeAvg = blockAvg;
            extremeBlock = {
                avg: blockAvg,
                min: Math.min(...blockValues),
                max: Math.max(...blockValues),
                start: block[0].timestamp,
                end: block[block.length - 1].timestamp,
                values: blockValues
            };
        }
    }

    return extremeBlock;
}

// Vytvořit mini graf pro cenový blok
function createMiniPriceChart(canvasId, values, color, startTime, endTime) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Vypočítat statistiky pro detekci razantních změn (potřebujeme před optimalizací)
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const threshold = range * 0.25; // Razantní změna = >25% rozsahu

    // Detekovat body s razantní změnou
    const significantPoints = [];
    values.forEach((value, idx) => {
        // Porovnat s průměrem a sousedy
        const prevValue = idx > 0 ? values[idx - 1] : value;
        const nextValue = idx < values.length - 1 ? values[idx + 1] : value;
        const change = Math.max(Math.abs(value - prevValue), Math.abs(value - nextValue));

        // Nebo extrémy (top/bottom 20%)
        const isExtreme = value >= max - threshold || value <= min + threshold;
        const isBigChange = change > threshold;

        if (isExtreme || isBigChange) {
            significantPoints.push(idx);
        }
    });

    // OPTIMALIZACE: Kontrola jestli se data změnila
    const dataKey = JSON.stringify({ values, color, startTime, endTime });
    if (canvas.lastDataKey === dataKey && canvas.chart) {
        // Data se nezměnila, nepřekreslovat
        return;
    }
    canvas.lastDataKey = dataKey;

    // Pokud existuje graf a jen se změnila data (ne struktura), aktualizovat
    if (canvas.chart && canvas.chart.data.datasets[0]) {
        const dataset = canvas.chart.data.datasets[0];
        const labelsChanged = canvas.chart.data.labels.length !== values.length;

        if (!labelsChanged) {
            // Jen aktualizovat data bez destroy
            dataset.data = values;
            dataset.borderColor = color;
            dataset.backgroundColor = color.replace('1)', '0.2)');
            dataset.pointBackgroundColor = values.map((_, i) =>
                significantPoints.includes(i) ? color : 'transparent'
            );
            canvas.chart.update('none'); // Update bez animace
            return;
        }
    }

    // Pokud neexistuje graf nebo se změnila struktura, zničit a vytvořit nový
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    // Vytvořit absolutní časy pro X osu (ne relativní offsety)
    const start = new Date(startTime);
    const timeLabels = values.map((_, i) => {
        const time = new Date(start.getTime() + i * 15 * 60 * 1000);
        return time.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    });

    // Vytvořit nový interaktivní mini graf (bez svislých čar)
    canvas.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                data: values,
                borderColor: color,
                backgroundColor: color.replace('1)', '0.2)'),
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: (context) => {
                    // Větší body pro razantní změny
                    return significantPoints.includes(context.dataIndex) ? 4 : 0;
                },
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 1,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,  // OPRAVA: Používat fixní výšku z HTML (40px)
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 8,
                    displayColors: false,
                    callbacks: {
                        title: (items) => items[0].label,  // Zobrazit přesný čas místo "+Xmin"
                        label: (item) => `${item.parsed.y.toFixed(2)} Kč/kWh`
                    }
                },
                datalabels: {
                    display: (context) => {
                        // Ukázat labely jen pro razantní změny
                        return significantPoints.includes(context.dataIndex);
                    },
                    align: 'top',
                    offset: 4,
                    color: '#fff',
                    font: { size: 8, weight: 'bold' },
                    formatter: (value) => value.toFixed(2),
                    backgroundColor: color.replace('1)', '0.8)'),
                    borderRadius: 3,
                    padding: { top: 2, bottom: 2, left: 4, right: 4 }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x',
                        modifierKey: 'shift'
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                            speed: 0.1
                        },
                        drag: {
                            enabled: true,
                            backgroundColor: 'rgba(33, 150, 243, 0.3)'
                        },
                        mode: 'x'
                    }
                }
            },
            scales: {
                x: { display: false },
                y: {
                    display: true,
                    position: 'right',  // Y osa napravo
                    grace: '10%',  // Trochu prostoru kolem dat
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)',
                        font: { size: 8 },
                        callback: function (value) {
                            return value.toFixed(1);  // Zobrazit s 1 desetinným místem
                        },
                        maxTicksLimit: 3  // Max 3 hodnoty (min, střed, max)
                    },
                    grid: {
                        display: false  // Žádné horizontální čáry
                    }
                }
            },
            layout: {
                padding: 0
            },
            interaction: {
                mode: 'nearest',
                intersect: false
            }
        }
    });

    // Uložit časy pro zoom funkci
    canvas.dataset.startTime = startTime;
    canvas.dataset.endTime = endTime;
}

function loadPricingData() {
    const hass = getHass();
    if (!hass || !hass.states) return;
    const boxId = getBoxId();
    if (!boxId) return;

    const datasets = [];
    let allLabels = [];

    // Spot prices (15min) - this defines the time range for all charts
    const spotEntityId = 'sensor.oig_' + boxId + '_spot_price_current_15min';
    const spotSensor = hass.states[spotEntityId];
    if (spotSensor && spotSensor.attributes) {
        const prices = spotSensor.attributes.prices || [];
        const currentPrice = spotSensor.attributes.current_price;
        if (currentPrice != null) {
            const spotCard = document.getElementById('current-spot-price');
            if (spotCard) {  // ✅ NULL CHECK - element neexistuje ve nové verzi
                spotCard.innerHTML = currentPrice.toFixed(2) + ' <span class="stat-unit">Kč/kWh</span>';
                // Make card clickable
                spotCard.parentElement.style.cursor = 'pointer';
                spotCard.parentElement.onclick = () => openEntityDialog(spotEntityId);
            }
        }
        if (prices.length > 0) {
            const priceValues = prices.map(p => p.price);
            const avg = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
            const avgCard = document.getElementById('avg-spot-today');
            if (avgCard) {  // ✅ NULL CHECK - element neexistuje ve nové verzi
                avgCard.innerHTML = avg.toFixed(2) + ' <span class="stat-unit">Kč/kWh</span>';
                // Make card clickable (same entity as current spot)
                avgCard.parentElement.style.cursor = 'pointer';
                avgCard.parentElement.onclick = () => openEntityDialog(spotEntityId);
            }

            // Use spot price timestamps as master timeline (includes today + tomorrow)
            // OPRAVA: Parsovat ISO timestamps jako LOKÁLNÍ čas, ne UTC
            allLabels = prices.map(p => {
                const timeStr = p.timestamp;
                if (!timeStr) return new Date();

                // Parse as LOCAL time (not UTC)
                try {
                    const [datePart, timePart] = timeStr.split('T');
                    if (!datePart || !timePart) return new Date();

                    const [year, month, day] = datePart.split('-').map(Number);
                    const [hour, minute, second = 0] = timePart.split(':').map(Number);

                    return new Date(year, month - 1, day, hour, minute, second);
                } catch (error) {
                    console.error('[Pricing] Error parsing timestamp:', timeStr, error);
                    return new Date();
                }
            });

            // DEBUG: Zkontrolovat první a poslední timestamp
            // if (prices.length > 0) {
            //     console.log('[Pricing] Raw first timestamp:', prices[0].timestamp);
            //     console.log('[Pricing] Parsed first label:', allLabels[0]);
            //     console.log('[Pricing] Raw last timestamp:', prices[prices.length - 1].timestamp);
            //     console.log('[Pricing] Parsed last label:', allLabels[allLabels.length - 1]);
            // }

            // Uložit kompletní data pro výpočet extrémů (nezávisle na zoomu)
            const spotPriceData = prices.map(p => p.price);
            originalPriceData = spotPriceData;

            // Identifikace top/bottom 10% cen z CELÉHO datasetu
            const sortedPrices = [...priceValues].sort((a, b) => a - b);
            const tenPercentCount = Math.max(1, Math.ceil(sortedPrices.length * 0.1));
            const bottomThreshold = sortedPrices[tenPercentCount - 1];
            const topThreshold = sortedPrices[sortedPrices.length - tenPercentCount];

            // ODSTRANIT tečky u extrémů - čistý graf
            const pointRadii = spotPriceData.map(price => 0);  // Všechny body neviditelné
            const pointColors = spotPriceData.map(price => '#42a5f5');  // Jednotná barva

            // Detekce pozic extrémů pro chytré rozložení labelů
            const extremeIndices = [];
            spotPriceData.forEach((price, idx) => {
                if (price <= bottomThreshold || price >= topThreshold) {
                    extremeIndices.push(idx);
                }
            });

            datasets.push({
                label: '📊 Spotová cena nákupu',
                data: spotPriceData,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.15)',
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                type: 'line',
                yAxisID: 'y-price',
                pointRadius: pointRadii,
                pointHoverRadius: 7,
                pointBackgroundColor: pointColors,
                pointBorderColor: pointColors,
                pointBorderWidth: 2,
                order: 1,
                // Datalabels VYPNUTY - cenové labely ruší přehlednost grafu
                datalabels: {
                    display: false
                }
            });

            // === NOVÉ: Najít extrémní bloky pro karty ===
            // Nejlevnější 3h blok
            const cheapestBlock = findExtremePriceBlock(prices, true, 3);
            if (cheapestBlock) {
                // Uložit do globální proměnné pro onClick handler
                currentPriceBlocks.cheapest = cheapestBlock;

                const priceEl = document.getElementById('cheapest-buy-price');
                const timeEl = document.getElementById('cheapest-buy-time');

                if (priceEl && timeEl) {
                    // UPDATE DATA (tohle se děje při každém update)
                    priceEl.innerHTML = cheapestBlock.avg.toFixed(2) + ' <span class="stat-unit">Kč/kWh</span>';
                    const startTime = new Date(cheapestBlock.start);
                    const endTime = new Date(cheapestBlock.end);
                    timeEl.textContent = `${startTime.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })} ${startTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`;
                    createMiniPriceChart('cheapest-buy-chart', cheapestBlock.values, 'rgba(76, 175, 80, 1)', cheapestBlock.start, cheapestBlock.end);
                }
            }

            // Nejdražší 3h blok
            const expensiveBlock = findExtremePriceBlock(prices, false, 3);
            if (expensiveBlock) {
                // Uložit do globální proměnné
                currentPriceBlocks.expensive = expensiveBlock;

                const priceEl = document.getElementById('expensive-buy-price');
                const timeEl = document.getElementById('expensive-buy-time');

                if (priceEl && timeEl) {
                    // UPDATE DATA
                    priceEl.innerHTML = expensiveBlock.avg.toFixed(2) + ' <span class="stat-unit">Kč/kWh</span>';
                    const startTime = new Date(expensiveBlock.start);
                    const endTime = new Date(expensiveBlock.end);
                    timeEl.textContent = `${startTime.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })} ${startTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`;
                    createMiniPriceChart('expensive-buy-chart', expensiveBlock.values, 'rgba(244, 67, 54, 1)', expensiveBlock.start, expensiveBlock.end);
                }
            }
        }
    }

    // Export prices (15min)
    const exportEntityId = 'sensor.oig_' + boxId + '_export_price_current_15min';
    const exportSensor = hass.states[exportEntityId];
    if (exportSensor && exportSensor.attributes) {
        const prices = exportSensor.attributes.prices || [];
        const currentPrice = exportSensor.attributes.current_price;
        if (currentPrice != null) {
            const exportCard = document.getElementById('current-export-price');
            if (exportCard) {  // ✅ NULL CHECK - element neexistuje ve nové verzi
                exportCard.innerHTML = currentPrice.toFixed(2) + ' <span class="stat-unit">Kč/kWh</span>';
                // Make card clickable
                exportCard.parentElement.style.cursor = 'pointer';
                exportCard.parentElement.onclick = () => openEntityDialog(exportEntityId);
            }
        }
        if (prices.length > 0) {
            datasets.push({
                label: '💰 Výkupní cena',
                data: prices.map(p => p.price),
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 187, 106, 0.15)',
                borderWidth: 2,
                fill: false,
                type: 'line',
                tension: 0.4,
                yAxisID: 'y-price',
                pointRadius: 0,
                pointHoverRadius: 5,
                order: 1,
                borderDash: [5, 5]
            });

            // === NOVÉ: Extrémní bloky pro EXPORT (prodej) - OBRÁCENÁ LOGIKA ===
            // Nejlepší prodej = NEJVYŠŠÍ cena (findLowest = false)
            const bestExportBlock = findExtremePriceBlock(prices, false, 3);
            if (bestExportBlock) {
                currentPriceBlocks.bestExport = bestExportBlock;

                const priceEl = document.getElementById('best-export-price');
                const timeEl = document.getElementById('best-export-time');
                if (priceEl && timeEl) {
                    priceEl.innerHTML = bestExportBlock.avg.toFixed(2) + ' <span class="stat-unit">Kč/kWh</span>';
                    const startTime = new Date(bestExportBlock.start);
                    const endTime = new Date(bestExportBlock.end);
                    timeEl.textContent = `${startTime.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })} ${startTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`;
                    createMiniPriceChart('best-export-chart', bestExportBlock.values, 'rgba(76, 175, 80, 1)', bestExportBlock.start, bestExportBlock.end);
                }
            }

            // Nejhorší prodej = NEJNIŽŠÍ cena (findLowest = true)
            const worstExportBlock = findExtremePriceBlock(prices, true, 3);
            if (worstExportBlock) {
                currentPriceBlocks.worstExport = worstExportBlock;

                const priceEl = document.getElementById('worst-export-price');
                const timeEl = document.getElementById('worst-export-time');
                if (priceEl && timeEl) {
                    priceEl.innerHTML = worstExportBlock.avg.toFixed(2) + ' <span class="stat-unit">Kč/kWh</span>';
                    const startTime = new Date(worstExportBlock.start);
                    const endTime = new Date(worstExportBlock.end);
                    timeEl.textContent = `${startTime.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })} ${startTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`;
                    createMiniPriceChart('worst-export-chart', worstExportBlock.values, 'rgba(255, 167, 38, 1)', worstExportBlock.start, worstExportBlock.end);
                }
            }
        }
    }

    // Solar forecast (hourly) - interpolate to 15min grid
    const solarEntityId = 'sensor.oig_' + boxId + '_solar_forecast';
    const solarSensor = hass.states[solarEntityId];
    if (solarSensor && solarSensor.attributes) {
        const attrs = solarSensor.attributes;
        const todayTotal = attrs.today_total_kwh || 0;
        const solarCard = document.getElementById('today-forecast-total');
        if (solarCard) {  // ✅ NULL CHECK - element neexistuje ve nové verzi
            solarCard.innerHTML = todayTotal.toFixed(2) + ' <span class="stat-unit">kWh</span>';
            // Make card clickable
            solarCard.parentElement.style.cursor = 'pointer';
            solarCard.parentElement.onclick = () => openEntityDialog(solarEntityId);
        }

        const todayTotal_kw = attrs.today_hourly_total_kw || {};
        const tomorrowTotal_kw = attrs.tomorrow_hourly_total_kw || {};
        const todayString1_kw = attrs.today_hourly_string1_kw || {};
        const tomorrowString1_kw = attrs.tomorrow_hourly_string1_kw || {};
        const todayString2_kw = attrs.today_hourly_string2_kw || {};
        const tomorrowString2_kw = attrs.tomorrow_hourly_string2_kw || {};

        // Helper: Linear interpolation between two points
        function interpolate(v1, v2, ratio) {
            if (v1 == null || v2 == null) return v1 || v2 || null;
            return v1 + (v2 - v1) * ratio;
        }

        // Map hourly solar data to 15min price grid with interpolation
        // This now handles today + tomorrow seamlessly
        if (allLabels.length > 0) {
            const string1Data = [];
            const string2Data = [];

            // Merge today and tomorrow solar data into continuous timeline
            const allSolarData = {
                string1: { ...todayString1_kw, ...tomorrowString1_kw },
                string2: { ...todayString2_kw, ...tomorrowString2_kw }
            };

            for (let i = 0; i < allLabels.length; i++) {
                const timeLabel = allLabels[i]; // Now a Date object

                // Create ISO timestamp key for solar data lookup (LOCAL TIME!)
                const isoKey = toLocalISOString(timeLabel);

                // For solar data, we need to interpolate from hourly values
                const hour = timeLabel.getHours();
                const minute = timeLabel.getMinutes();

                // Create current and next hour timestamps for interpolation
                const currentHourDate = new Date(timeLabel);
                currentHourDate.setMinutes(0, 0, 0);
                const currentHourKey = toLocalISOString(currentHourDate);

                const nextHourDate = new Date(currentHourDate);
                nextHourDate.setHours(hour + 1);
                const nextHourKey = toLocalISOString(nextHourDate);

                // Get values for interpolation from merged data
                const s1_current = allSolarData.string1[currentHourKey] || 0;
                const s1_next = allSolarData.string1[nextHourKey] || 0;
                const s2_current = allSolarData.string2[currentHourKey] || 0;
                const s2_next = allSolarData.string2[nextHourKey] || 0;

                // Interpolation ratio (0.0 at :00, 0.25 at :15, 0.5 at :30, 0.75 at :45)
                const ratio = minute / 60;

                string1Data.push(interpolate(s1_current, s1_next, ratio));
                string2Data.push(interpolate(s2_current, s2_next, ratio));
            }

            // Determine solar visualization strategy
            const hasString1 = string1Data.some(v => v != null && v > 0);
            const hasString2 = string2Data.some(v => v != null && v > 0);
            const stringCount = (hasString1 ? 1 : 0) + (hasString2 ? 1 : 0);

            // Jasné sluneční barvy pro lepší viditelnost
            const solarColors = {
                string1: { border: 'rgba(255, 193, 7, 0.8)', bg: 'rgba(255, 193, 7, 0.2)' },  // zlatá žlutá
                string2: { border: 'rgba(255, 152, 0, 0.8)', bg: 'rgba(255, 152, 0, 0.2)' }   // oranžová
            };

            if (stringCount === 1) {
                // Pouze 1 string aktivní - zobrazit jen ten jeden (bez celkového součtu)
                if (hasString1) {
                    datasets.push({
                        label: '☀️ Solární předpověď',
                        data: string1Data,
                        borderColor: solarColors.string1.border,
                        backgroundColor: solarColors.string1.bg,
                        borderWidth: 2,
                        fill: 'origin',
                        tension: 0.4,
                        type: 'line',
                        yAxisID: 'y-power',
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        order: 2
                    });
                } else if (hasString2) {
                    datasets.push({
                        label: '☀️ Solární předpověď',
                        data: string2Data,
                        borderColor: solarColors.string2.border,
                        backgroundColor: solarColors.string2.bg,
                        borderWidth: 2,
                        fill: 'origin',
                        tension: 0.4,
                        type: 'line',
                        yAxisID: 'y-power',
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        order: 2
                    });
                }
            } else if (stringCount === 2) {
                // Oba stringy - zobrazit jako stacked area chart
                datasets.push({
                    label: '☀️ String 2',
                    data: string2Data,
                    borderColor: solarColors.string2.border,
                    backgroundColor: solarColors.string2.bg,
                    borderWidth: 1.5,
                    fill: 'origin',
                    tension: 0.4,
                    type: 'line',
                    yAxisID: 'y-power',
                    stack: 'solar',
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    order: 2
                });

                datasets.push({
                    label: '☀️ String 1',
                    data: string1Data,
                    borderColor: solarColors.string1.border,
                    backgroundColor: solarColors.string1.bg,
                    borderWidth: 1.5,
                    fill: '-1',  // stack on previous dataset
                    tension: 0.4,
                    type: 'line',
                    yAxisID: 'y-power',
                    stack: 'solar',
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    order: 2
                });
                // Bez celkového součtu - stacked area chart ukazuje celkovou výšku
            }
        }
    }

    // Battery forecast (timeline data) - using findShieldSensorId for dynamic suffix support
    const batteryForecastEntityId = findShieldSensorId('battery_forecast');
    const batteryForecastSensor = hass.states[batteryForecastEntityId];

    // console.log('[Pricing] Battery forecast sensor:', batteryForecastEntityId, batteryForecastSensor ? 'FOUND' : 'NOT FOUND');

    // Uchovej timeline rozsah pro výchozí zoom grafu
    let initialZoomStart = null;
    let initialZoomEnd = null;

    if (batteryForecastSensor && batteryForecastSensor.attributes && spotSensor && spotSensor.attributes) {
        const timelineData = batteryForecastSensor.attributes.timeline_data || [];
        // console.log('[Pricing] Timeline data length:', timelineData.length);
        const maxCapacityKwh = batteryForecastSensor.attributes.max_capacity_kwh || 10;
        const minCapacityKwh = batteryForecastSensor.attributes.min_capacity_kwh || 0;
        const prices = spotSensor.attributes.prices || []; // Original ISO timestamps

        if (timelineData.length > 0 && prices.length > 0) {
            // ULOŽIT ROZSAH TIMELINE PRO VÝCHOZÍ ZOOM
            const timelineTimestamps = timelineData.map(t => new Date(t.timestamp));
            initialZoomStart = timelineTimestamps[0].getTime();
            initialZoomEnd = timelineTimestamps[timelineTimestamps.length - 1].getTime();
            // console.log('[Pricing] Timeline range for initial zoom:', new Date(initialZoomStart), 'to', new Date(initialZoomEnd));

            // EXTEND allLabels with battery forecast timestamps (union)
            const batteryTimestamps = timelineTimestamps;
            const priceTimestamps = allLabels; // already Date objects

            // Merge and dedupe timestamps
            const allTimestamps = new Set([...priceTimestamps, ...batteryTimestamps].map(d => d.getTime()));
            allLabels = Array.from(allTimestamps).sort((a, b) => a - b).map(ts => new Date(ts));

            // ZOBRAZENÍ KAPACITY BATERIE:
            // battery_capacity_kwh = CÍLOVÁ kapacita (kam se dostaneme)
            // solar_charge_kwh = kolik přidal solar v tomto intervalu
            // grid_charge_kwh = kolik přidala síť v tomto intervalu
            // baseline = battery_capacity_kwh - solar - grid (odkud jsme vyšli)

            const batteryCapacityData = [];   // Cílová kapacita (linie navrch)
            const baselineData = [];          // Předchozí kapacita (baseline pro stack)
            const solarStackData = [];        // Solar přírůstek
            const gridStackData = [];         // Grid přírůstek

            for (let i = 0; i < allLabels.length; i++) {
                const timeLabel = allLabels[i];
                const isoKey = toLocalISOString(timeLabel);

                const timelineEntry = timelineData.find(t => t.timestamp === isoKey);

                if (timelineEntry) {
                    const targetCapacity = timelineEntry.battery_capacity_kwh || 0;
                    const solarCharge = timelineEntry.solar_charge_kwh || 0;
                    const gridCharge = timelineEntry.grid_charge_kwh || 0;

                    // Baseline = odkud vyšli (cílová - přírůstky)
                    const baseline = targetCapacity - solarCharge - gridCharge;

                    batteryCapacityData.push(targetCapacity);
                    baselineData.push(baseline);
                    solarStackData.push(solarCharge);
                    gridStackData.push(gridCharge);
                } else {
                    batteryCapacityData.push(null);
                    baselineData.push(null);
                    solarStackData.push(null);
                    gridStackData.push(null);
                }
            }

            // Vylepšené barvy pro viditelnost kapacity baterie
            const batteryColors = {
                baseline: { border: '#78909C', bg: 'rgba(120, 144, 156, 0.25)' }, // šedá - zbývající kapacita
                solar: { border: 'transparent', bg: 'rgba(255, 167, 38, 0.6)' },   // výrazná oranžová - solár
                grid: { border: 'transparent', bg: 'rgba(33, 150, 243, 0.6)' }    // výrazná modrá - síť
            };

            // POŘADÍ DATASETŮ určuje pořadí ve stacku (první = dole, poslední = nahoře)
            // 1. Grid area (dole) - nabíjení ze sítě, BEZ borderu
            if (gridStackData.some(v => v != null && v > 0)) {
                datasets.push({
                    label: '⚡ Nabíjení ze sítě',
                    data: gridStackData,
                    backgroundColor: batteryColors.grid.bg,
                    borderColor: batteryColors.grid.border,
                    borderWidth: 0,
                    type: 'line',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    yAxisID: 'y-solar',
                    stack: 'charging',
                    order: 3
                });
            }

            // 2. Solar area (uprostřed) - nabíjení ze solaru, BEZ borderu
            if (solarStackData.some(v => v != null && v > 0)) {
                datasets.push({
                    label: '☀️ Nabíjení ze solaru',
                    data: solarStackData,
                    backgroundColor: batteryColors.solar.bg,
                    borderColor: batteryColors.solar.border,
                    borderWidth: 0,
                    type: 'line',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    yAxisID: 'y-solar',
                    stack: 'charging',
                    order: 3
                });
            }

            // 3. Baseline area (nahoře) - zbývající kapacita s TLUSTOU ČÁROU
            datasets.push({
                label: '🔋 Zbývající kapacita',
                data: baselineData,
                backgroundColor: batteryColors.baseline.bg,
                borderColor: batteryColors.baseline.border,
                borderWidth: 3,  // TLUSTÁ ČÁRA
                type: 'line',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                yAxisID: 'y-solar',
                stack: 'charging',
                order: 3
            });
        }
    }

    // Create/update combined chart
    const ctx = document.getElementById('combined-chart');

    // OPRAVA: Kontrola jestli je canvas viditelný (pricing tab aktivní)
    // Pokud není, odložit vytvoření grafu
    if (!ctx) {
        console.warn('[Pricing] Canvas element not found, deferring chart creation');
        return;
    }

    const isVisible = ctx.offsetParent !== null;
    if (!isVisible && !combinedChart) {
        console.warn('[Pricing] Canvas not visible yet, deferring chart creation');
        // Zkusit znovu za chvíli
        setTimeout(() => {
            if (pricingTabActive) {
                console.log('[Pricing] Retrying chart creation after visibility delay');
                loadPricingData();
            }
        }, 200);
        return;
    }

    if (combinedChart) {
        // OPTIMALIZACE: Místo přenastavení celého datasetu aktualizujeme jen labely a data
        const labelsChanged = JSON.stringify(combinedChart.data.labels) !== JSON.stringify(allLabels);
        const datasetsChanged = combinedChart.data.datasets.length !== datasets.length;

        // console.log('[Pricing] Updating EXISTING chart - labelsChanged:', labelsChanged, 'datasetsChanged:', datasetsChanged);
        // if (allLabels.length > 0) {
        //     console.log('[Pricing] Update - First label:', allLabels[0], 'Last:', allLabels[allLabels.length - 1]);
        // }

        if (labelsChanged) {
            combinedChart.data.labels = allLabels;
        }

        if (datasetsChanged) {
            // Pokud se změnil počet datasetů, musíme je nahradit
            combinedChart.data.datasets = datasets;
            combinedChart.update();
        } else {
            // Jinak jen aktualizujeme data v existujících datasetech
            datasets.forEach((newDataset, idx) => {
                if (combinedChart.data.datasets[idx]) {
                    // Zachovat reference na dataset, jen aktualizovat data
                    combinedChart.data.datasets[idx].data = newDataset.data;
                    // Aktualizovat i další properties které se mohly změnit
                    combinedChart.data.datasets[idx].label = newDataset.label;
                    combinedChart.data.datasets[idx].backgroundColor = newDataset.backgroundColor;
                    combinedChart.data.datasets[idx].borderColor = newDataset.borderColor;
                }
            });
            combinedChart.update('none'); // Update bez animace, rychlejší
        }
    } else {
        // DETAILNÍ DEBUG PRO ANALÝZU PROBLÉMU S ČASOVOU OSOU
        // console.log('[Pricing] Creating NEW chart with', allLabels.length, 'labels');
        // if (allLabels.length > 0) {
        //     console.log('[Pricing] First label:', allLabels[0]);
        //     console.log('[Pricing] Last label:', allLabels[allLabels.length - 1]);
        //     console.log('[Pricing] Current time:', new Date());
        //     console.log('[Pricing] Time offset (hours):', (new Date() - allLabels[0]) / (1000 * 60 * 60));
        // }

        combinedChart = new Chart(ctx, {
            type: 'bar', // Changed to 'bar' to support mixed chart (bar + line)
            data: { labels: allLabels, datasets: datasets },
            plugins: [ChartDataLabels], // Registrace datalabels pluginu
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff',
                            font: { size: 11, weight: '500' },
                            padding: 10,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 12,
                            boxHeight: 12
                        },
                        position: 'top'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        titleFont: { size: 13, weight: 'bold' },
                        bodyFont: { size: 11 },
                        padding: 10,
                        cornerRadius: 6,
                        displayColors: true,
                        callbacks: {
                            title: function (tooltipItems) {
                                if (tooltipItems.length > 0) {
                                    const date = new Date(tooltipItems[0].parsed.x);
                                    return date.toLocaleString('cs-CZ', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });
                                }
                                return '';
                            },
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    // Formátování podle typu datasetu
                                    if (context.dataset.yAxisID === 'y-price') {
                                        label += context.parsed.y.toFixed(2) + ' Kč/kWh';
                                    } else if (context.dataset.yAxisID === 'y-solar') {
                                        label += context.parsed.y.toFixed(2) + ' kWh';
                                    } else if (context.dataset.yAxisID === 'y-power') {
                                        label += context.parsed.y.toFixed(2) + ' kW';
                                    } else {
                                        label += context.parsed.y;
                                    }
                                }
                                return label;
                            }
                        }
                    },
                    datalabels: {
                        display: false // Vypnout globálně, povolit jen pro specifické datasety
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                                modifierKey: null // Zoom kolečkem bez modifikátorů
                            },
                            drag: {
                                enabled: true, // Drag-to-zoom jako v Grafaně
                                backgroundColor: 'rgba(33, 150, 243, 0.3)',
                                borderColor: 'rgba(33, 150, 243, 0.8)',
                                borderWidth: 2
                            },
                            pinch: {
                                enabled: true // Touch zoom pro mobily
                            },
                            mode: 'x', // Zoom jen na X ose (časové ose)
                            onZoomComplete: function ({ chart }) {
                                // Při manuálním zoomu (kolečko/drag) resetovat currentZoomRange
                                // aby další klik na dlaždici fungoval správně
                                currentZoomRange = null;

                                // Odebrat zoom-active z aktivní karty
                                if (activeZoomCard) {
                                    activeZoomCard.classList.remove('zoom-active');
                                    activeZoomCard = null;
                                }

                                updateChartDetailLevel(chart);
                            }
                        },
                        pan: {
                            enabled: true,
                            mode: 'x',
                            modifierKey: 'shift', // Pan s Shift+drag
                            onPanComplete: function ({ chart }) {
                                // Při manuálním panu resetovat currentZoomRange
                                currentZoomRange = null;

                                // Odebrat zoom-active z aktivní karty
                                if (activeZoomCard) {
                                    activeZoomCard.classList.remove('zoom-active');
                                    activeZoomCard = null;
                                }

                                updateChartDetailLevel(chart);
                            }
                        },
                        limits: {
                            x: { minRange: 3600000 } // Min 1 hodina (v milisekundách)
                        }
                    }
                },
                scales: {
                    x: {
                        // KRITICKÁ ZMĚNA: 'timeseries' místo 'time' pro lepší timezone handling
                        // timeseries používá data.labels přímo bez UTC konverze
                        type: 'timeseries',
                        time: {
                            unit: 'hour',
                            displayFormats: {
                                hour: 'dd.MM HH:mm'
                            },
                            tooltipFormat: 'dd.MM.yyyy HH:mm'
                        },
                        ticks: {
                            color: getTextColor(),
                            maxRotation: 45,
                            minRotation: 45,
                            font: { size: 11 },
                            maxTicksLimit: 20
                        },
                        grid: { color: getGridColor(), lineWidth: 1 }
                    },
                    'y-price': {
                        type: 'linear',
                        position: 'left',
                        ticks: {
                            color: '#2196F3',
                            font: { size: 11, weight: '500' },
                            callback: function (value) { return value.toFixed(2) + ' Kč'; }
                        },
                        grid: { color: 'rgba(33, 150, 243, 0.15)', lineWidth: 1 },
                        title: {
                            display: true,
                            text: '💰 Cena (Kč/kWh)',
                            color: '#2196F3',
                            font: { size: 13, weight: 'bold' }
                        }
                    },
                    'y-solar': {
                        type: 'linear',
                        position: 'left',
                        stacked: true,  // POVOL STACKING pro grid + solar
                        ticks: {
                            color: '#78909C',
                            font: { size: 11, weight: '500' },
                            callback: function (value) { return value.toFixed(1) + ' kWh'; }
                        },
                        grid: { display: false },
                        title: {
                            display: true,
                            text: '🔋 Kapacita baterie (kWh)',
                            color: '#78909C',
                            font: { size: 13, weight: 'bold' }
                        }
                    },
                    'y-power': {
                        type: 'linear',
                        position: 'right',
                        stacked: true,
                        ticks: {
                            color: '#FFA726',
                            font: { size: 11, weight: '500' },
                            callback: function (value) { return value.toFixed(2) + ' kW'; }
                        },
                        grid: { display: false },
                        title: {
                            display: true,
                            text: '☀️ Výkon (kW)',
                            color: '#FFA726',
                            font: { size: 13, weight: 'bold' }
                        }
                    }
                }
            }
        });

        // Inicializace detailu pro nový graf
        updateChartDetailLevel(combinedChart);

        // OPRAVA: Nastavit zoom asynchronně PO dokončení inicializace Chart.js
        // Chart.js zoom plugin se inicializuje asynchronně a přepisuje naše nastavení
        // Použijeme requestAnimationFrame aby se zoom aplikoval až po prvním renderu
        if (initialZoomStart && initialZoomEnd) {
            requestAnimationFrame(() => {
                if (!combinedChart) return; // Safety check

                combinedChart.options.scales.x.min = initialZoomStart;
                combinedChart.options.scales.x.max = initialZoomEnd;
                combinedChart.update('none'); // Aplikovat okamžitě bez animace

                // console.log('[Pricing] Initial zoom applied after first render:', new Date(initialZoomStart), 'to', new Date(initialZoomEnd));
                updateChartDetailLevel(combinedChart);
            });
        }
    }

    // Attach card handlers only once
    setupPriceCardHandlers();
}

/**
 * Setup onClick handlers for price cards
 * OPRAVENO: Používá event delegation pro spolehlivost
 * Handlery přežijí innerHTML updates a fungují i když elementy ještě neexistují
 */
function setupPriceCardHandlers() {
    if (priceCardHandlersAttached) {
        return; // Už nastaveno
    }

    console.log('[Card] Setting up price card click handlers (event delegation)');

    // Event delegation: jeden handler na document, zachytí všechny kliky na karty
    // Výhoda: Funguje i když se elementy dynamicky mění/přidávají
    document.addEventListener('click', function (e) {
        // Najít nejbližší .stat-card parent
        const card = e.target.closest('.stat-card');
        if (!card) return;

        // Určit který typ karty to je podle ID uvnitř
        let blockData = null;
        let cardType = '';

        if (card.querySelector('#cheapest-buy-price')) {
            blockData = currentPriceBlocks.cheapest;
            cardType = 'Nejlevnější nákup';
        } else if (card.querySelector('#expensive-buy-price')) {
            blockData = currentPriceBlocks.expensive;
            cardType = 'Nejdražší nákup';
        } else if (card.querySelector('#best-export-price')) {
            blockData = currentPriceBlocks.bestExport;
            cardType = 'Nejlepší prodej';
        } else if (card.querySelector('#worst-export-price')) {
            blockData = currentPriceBlocks.worstExport;
            cardType = 'Nejhorší prodej';
        } else {
            return; // Není to jedna z našich cenových karet
        }

        // Pokud máme data o bloku, zoomuj
        if (blockData && blockData.start && blockData.end) {
            console.log(`[Card] ${cardType} clicked, zooming to:`, blockData.start, '->', blockData.end);
            e.stopPropagation();
            zoomToTimeRange(blockData.start, blockData.end, card);
        } else {
            console.warn(`[Card] ${cardType} clicked but no block data available`);
        }
    });

    // Nastavit cursor pointer na všechny cenové karty (pokud existují)
    const cardIds = [
        'cheapest-buy-price',
        'expensive-buy-price',
        'best-export-price',
        'worst-export-price'
    ];

    cardIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const card = element.closest('.stat-card');
            if (card) {
                card.style.cursor = 'pointer';
            }
        }
    });

    priceCardHandlersAttached = true;
    console.log('[Card] Event delegation handler attached successfully');
}

// === CUSTOM TILES RENDERING ===

let tileManager = null;
let tileDialog = null;

/**
 * Initialize custom tiles system
 */
async function initCustomTiles() {
    console.log('[Tiles] Initializing custom tiles system...');

    // Initialize tile dialog only if not already initialized
    const hass = getHass();
    if (!hass) {
        console.warn('[Tiles] Cannot initialize - no HA connection, retrying...');
        setTimeout(initCustomTiles, 1000); // Retry
        return;
    }

    // Initialize tile manager (only once)
    if (!tileManager) {
        tileManager = new DashboardTileManager(hass);
        window.tileManager = tileManager; // Export for dialog access

        // Listen for config changes
        tileManager.addChangeListener(() => {
            console.log('[Tiles] Config changed, re-rendering...');
            renderAllTiles();
            updateTileControlsUI();
        });

        // ASYNCHRONNĚ načíst konfiguraci z HA storage
        console.log('[Tiles] Loading configuration...');
        await tileManager.init();
        console.log('[Tiles] Configuration loaded');
    }

    // Initialize tile dialog (only once)
    if (!tileDialog) {
        tileDialog = new TileConfigDialog(hass, tileManager);
        window.tileDialog = tileDialog; // Export for onclick handlers
    }

    // Initial render
    renderAllTiles();
    updateTileControlsUI();

    console.log('[Tiles] Initialization complete');
}

/**
 * Update tile count from UI input
 */
function updateTileCount(side, value) {
    if (!tileManager) {
        console.error('[Tiles] Tile manager not initialized');
        return;
    }

    tileManager.setTileCount(side, value);
}

/**
 * Toggle tiles section visibility
 */
function toggleTilesVisibility() {
    if (!tileManager) {
        console.error('[Tiles] Tile manager not initialized');
        return;
    }

    tileManager.toggleVisibility();

    const section = document.querySelector('.custom-tiles-section');
    if (section) {
        section.style.display = tileManager.isVisible() ? 'block' : 'none';
    }
}

/**
 * Reset all tiles to default
 */
function resetAllTiles() {
    if (!tileManager) {
        console.error('[Tiles] Tile manager not initialized');
        return;
    }

    if (!confirm('Opravdu smazat všechny dlaždice a vrátit nastavení na výchozí?')) {
        return;
    }

    tileManager.reset();

    // Reset UI inputs
    document.getElementById('tiles-left-count').value = 6;
    document.getElementById('tiles-right-count').value = 6;
}

/**
 * Update tile controls UI (inputs visibility toggle button)
 */
function updateTileControlsUI() {
    if (!tileManager) return;

    // Update inputs
    const leftInput = document.getElementById('tiles-left-count');
    const rightInput = document.getElementById('tiles-right-count');

    if (leftInput) {
        leftInput.value = tileManager.getTileCount('left');
    }
    if (rightInput) {
        rightInput.value = tileManager.getTileCount('right');
    }

    // Update visibility
    const section = document.querySelector('.custom-tiles-section');
    if (section) {
        const isVisible = tileManager.isVisible();
        section.style.display = isVisible ? 'block' : 'none';
        console.log(`[Tiles] Section visibility updated: ${isVisible}`);
    }

    // Update toggle button text
    const toggleBtn = document.getElementById('btn-tiles-toggle');
    if (toggleBtn && tileManager.isVisible()) {
        toggleBtn.style.background = 'rgba(76, 175, 80, 0.2)';
        toggleBtn.style.borderColor = 'rgba(76, 175, 80, 0.5)';
    } else if (toggleBtn) {
        toggleBtn.style.background = 'var(--button-bg)';
        toggleBtn.style.borderColor = 'var(--button-border)';
    }
}

/**
 * Render all tiles (both blocks)
 */
function renderAllTiles() {
    renderTilesBlock('left');
    renderTilesBlock('right');
}

/**
 * Render one tiles block
 * @param {string} side - 'left' or 'right'
 */
function renderTilesBlock(side) {
    const blockElement = document.getElementById(`tiles-${side}`);
    if (!blockElement) {
        console.warn(`[Tiles] Block element not found: tiles-${side}`);
        return;
    }

    const gridElement = blockElement.querySelector('.tiles-grid');
    if (!gridElement) {
        console.warn(`[Tiles] Grid element not found in tiles-${side}`);
        return;
    }

    // Get tile count for this side
    const tileCount = tileManager.getTileCount(side);

    // Hide block if count is 0
    if (tileCount === 0) {
        blockElement.style.display = 'none';
        return;
    } else {
        blockElement.style.display = 'block';
    }

    // Get configuration
    const tiles = tileManager.getTiles(side);

    // Debug log pro diagnostiku
    // console.log(`[Tiles] DEBUG ${side} tiles:`, tiles, 'non-null:', tiles.filter(t => t !== null));

    // Render tiles up to count
    gridElement.innerHTML = '';
    for (let i = 0; i < tileCount; i++) {
        const tileConfig = tiles[i];
        const tileElement = renderTile(side, i, tileConfig);
        gridElement.appendChild(tileElement);
    }

    // console.log(`[Tiles] Rendered ${side} block with ${tileCount} slots (${tiles.filter(t => t !== null).length} configured)`);
}

/**
 * Render single tile
 * @param {string} side - 'left' or 'right'
 * @param {number} index - Tile index (0-5)
 * @param {object|null} config - Tile configuration
 * @returns {HTMLElement} - Tile element
 */
function renderTile(side, index, config) {
    const tile = document.createElement('div');
    tile.className = 'dashboard-tile';
    tile.dataset.side = side;
    tile.dataset.index = index.toString();

    if (!config) {
        // Placeholder tile
        tile.classList.add('tile-placeholder');
        tile.innerHTML = `
            <div class="tile-placeholder-content" onclick="window.tileDialog.open(${index}, '${side}')">
                <div class="tile-placeholder-icon">➕</div>
                <div class="tile-placeholder-text">Přidat dlaždici</div>
            </div>
        `;
    } else if (config.type === 'entity') {
        // Entity tile
        tile.classList.add('tile-entity');
        tile.innerHTML = renderEntityTile(config, side, index);
    } else if (config.type === 'button') {
        // Button tile
        tile.classList.add('tile-button');
        tile.innerHTML = renderButtonTile(config, side, index);
    }

    // Add edit button (visible on hover)
    if (config) {
        const editBtn = document.createElement('button');
        editBtn.className = 'tile-edit';
        editBtn.innerHTML = '⚙️';
        editBtn.title = 'Upravit dlaždici';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            window.tileDialog.open(index, side);
        };
        tile.appendChild(editBtn);
    }

    // Add remove button (visible on hover)
    if (config) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'tile-remove';
        removeBtn.innerHTML = '✕';
        removeBtn.title = 'Odstranit dlaždici';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Opravdu odstranit tuto dlaždici?')) {
                tileManager.removeTile(side, index);
            }
        };
        tile.appendChild(removeBtn);
    }

    return tile;
}

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
            'car': '🚗', 'car-electric': '🚗', 'car-battery': '🔋', 'ev-station': '🔌',
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
}/**
 * Render entity tile content
 * @param {object} config - Entity tile config
 * @param {string} side - Tile side (left/right)
 * @param {number} index - Tile index
 * @returns {string} - HTML string
 */
function renderEntityTile(config, side, index) {
    const hass = getHass();
    if (!hass || !hass.states) {
        return '<div class="tile-error">HA nedostupné</div>';
    }

    const state = hass.states[config.entity_id];
    if (!state) {
        return `<div class="tile-error">Entita nenalezena:<br>${config.entity_id}</div>`;
    }

    const label = config.label || state.attributes.friendly_name || config.entity_id;
    // Použij POUZE ikonu z config, pokud není nastavena, použij výchozí - nikdy ne z HA state
    const icon = config.icon || '📊';
    let value = state.state;
    let unit = state.attributes.unit_of_measurement || '';
    const color = config.color || '#03A9F4';

    // Konverze W/Wh na kW/kWh pokud >= 1000
    if (unit === 'W' || unit === 'Wh') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            if (Math.abs(numValue) >= 1000) {
                value = (numValue / 1000).toFixed(1);
                unit = unit === 'W' ? 'kW' : 'kWh';
            } else {
                value = Math.round(numValue);
            }
        }
    }

    // Podporné entity
    let supportHtml = '';
    if (config.support_entities) {
        // Top right
        if (config.support_entities.top_right) {
            const topRightState = hass.states[config.support_entities.top_right];
            if (topRightState) {
                let topRightValue = topRightState.state;
                let topRightUnit = topRightState.attributes.unit_of_measurement || '';
                const topRightIcon = topRightState.attributes.icon || '';

                // Konverze W/Wh na kW/kWh
                if (topRightUnit === 'W' || topRightUnit === 'Wh') {
                    const numValue = parseFloat(topRightValue);
                    if (!isNaN(numValue)) {
                        if (Math.abs(numValue) >= 1000) {
                            topRightValue = (numValue / 1000).toFixed(1);
                            topRightUnit = topRightUnit === 'W' ? 'kW' : 'kWh';
                        } else {
                            topRightValue = Math.round(numValue);
                        }
                    }
                }

                supportHtml += `
                    <div class="tile-support tile-support-top-right" onclick="event.stopPropagation(); openEntityDialog('${config.support_entities.top_right}')">
                        <span class="support-icon">${topRightIcon}</span>
                        <span class="support-value">${topRightValue}${topRightUnit}</span>
                    </div>
                `;
            }
        }

        // Bottom right
        if (config.support_entities.bottom_right) {
            const bottomRightState = hass.states[config.support_entities.bottom_right];
            if (bottomRightState) {
                let bottomRightValue = bottomRightState.state;
                let bottomRightUnit = bottomRightState.attributes.unit_of_measurement || '';
                const bottomRightIcon = bottomRightState.attributes.icon || '';

                // Konverze W/Wh na kW/kWh
                if (bottomRightUnit === 'W' || bottomRightUnit === 'Wh') {
                    const numValue = parseFloat(bottomRightValue);
                    if (!isNaN(numValue)) {
                        if (Math.abs(numValue) >= 1000) {
                            bottomRightValue = (numValue / 1000).toFixed(1);
                            bottomRightUnit = bottomRightUnit === 'W' ? 'kW' : 'kWh';
                        } else {
                            bottomRightValue = Math.round(numValue);
                        }
                    }
                }

                supportHtml += `
                    <div class="tile-support tile-support-bottom-right" onclick="event.stopPropagation(); openEntityDialog('${config.support_entities.bottom_right}')">
                        <span class="support-icon">${bottomRightIcon}</span>
                        <span class="support-value">${bottomRightValue}${bottomRightUnit}</span>
                    </div>
                `;
            }
        }
    }

    // Detekce neaktivního stavu (0 W nebo 0 hodnota)
    const numericValue = parseFloat(state.state);
    const isInactive = !isNaN(numericValue) && numericValue === 0;
    const inactiveClass = isInactive ? ' tile-inactive' : '';

    return `
        <div class="tile-content tile-content-horizontal${inactiveClass}" style="border-left: 3px solid ${color};">
            <div class="tile-main-content">
                <div class="tile-icon-large" style="color: ${color};">${renderIcon(icon, color)}</div>
                <div class="tile-value-large" onclick="openEntityDialog('${config.entity_id}')" style="cursor: pointer;">${value}<span class="tile-unit">${unit}</span></div>
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
    const hass = getHass();
    if (!hass || !hass.states) {
        return '<div class="tile-error">HA nedostupné</div>';
    }

    const state = hass.states[config.entity_id];
    if (!state) {
        return `<div class="tile-error">Entita nenalezena:<br>${config.entity_id}</div>`;
    }

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
    let supportHtml = '';
    if (config.support_entities) {
        // Top right
        if (config.support_entities.top_right) {
            const topRightState = hass.states[config.support_entities.top_right];
            if (topRightState) {
                let topRightValue = topRightState.state;
                let topRightUnit = topRightState.attributes.unit_of_measurement || '';
                const topRightIcon = topRightState.attributes.icon || '';

                // Konverze W/Wh na kW/kWh
                if (topRightUnit === 'W' || topRightUnit === 'Wh') {
                    const numValue = parseFloat(topRightValue);
                    if (!isNaN(numValue)) {
                        if (Math.abs(numValue) >= 1000) {
                            topRightValue = (numValue / 1000).toFixed(1);
                            topRightUnit = topRightUnit === 'W' ? 'kW' : 'kWh';
                        } else {
                            topRightValue = Math.round(numValue);
                        }
                    }
                }

                supportHtml += `
                    <div class="tile-support tile-support-top-right" onclick="event.stopPropagation(); openEntityDialog('${config.support_entities.top_right}')">
                        <span class="support-icon">${topRightIcon}</span>
                        <span class="support-value">${topRightValue}${topRightUnit}</span>
                    </div>
                `;
            }
        }

        // Bottom right
        if (config.support_entities.bottom_right) {
            const bottomRightState = hass.states[config.support_entities.bottom_right];
            if (bottomRightState) {
                let bottomRightValue = bottomRightState.state;
                let bottomRightUnit = bottomRightState.attributes.unit_of_measurement || '';
                const bottomRightIcon = bottomRightState.attributes.icon || '';

                // Konverze W/Wh na kW/kWh
                if (bottomRightUnit === 'W' || bottomRightUnit === 'Wh') {
                    const numValue = parseFloat(bottomRightValue);
                    if (!isNaN(numValue)) {
                        if (Math.abs(numValue) >= 1000) {
                            bottomRightValue = (numValue / 1000).toFixed(1);
                            bottomRightUnit = bottomRightUnit === 'W' ? 'kW' : 'kWh';
                        } else {
                            bottomRightValue = Math.round(numValue);
                        }
                    }
                }

                supportHtml += `
                    <div class="tile-support tile-support-bottom-right" onclick="event.stopPropagation(); openEntityDialog('${config.support_entities.bottom_right}')">
                        <span class="support-icon">${bottomRightIcon}</span>
                        <span class="support-value">${bottomRightValue}${bottomRightUnit}</span>
                    </div>
                `;
            }
        }
    }

    return `
        <div class="tile-content tile-content-horizontal ${buttonClass}"
             style="border-left: 3px solid ${color};"
             onclick="executeTileButtonAction('${config.entity_id}', '${action}')">
            <div class="tile-main-content">
                <div class="tile-icon-large" style="color: ${color};">${renderIcon(icon, color)}</div>
                <div class="tile-button-state">${isOn ? 'ON' : 'OFF'}</div>
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

// === ČHMÚ WEATHER WARNING FUNCTIONS ===

let chmuWarningData = null;

// Update ČHMÚ warning badge
function updateChmuWarningBadge() {
    const hass = getHass();
    if (!hass) return;

    const localSensorId = `sensor.oig_${INVERTER_SN}_chmu_warning_level`;
    const globalSensorId = `sensor.oig_${INVERTER_SN}_chmu_warning_level_global`;

    const localSensor = hass.states[localSensorId];
    const globalSensor = hass.states[globalSensorId];

    if (!localSensor) {
        console.log('[ČHMÚ] Local sensor not found:', localSensorId);
        return;
    }

    const badge = document.getElementById('chmu-warning-badge');
    const icon = document.getElementById('chmu-icon');
    const text = document.getElementById('chmu-text');

    if (!badge || !icon || !text) return;

    const severity = parseInt(localSensor.state) || 0;
    const attrs = localSensor.attributes || {};

    // Store data for modal
    chmuWarningData = {
        local: localSensor,
        global: globalSensor,
        severity: severity
    };

    // Remove all severity classes
    badge.className = 'chmu-warning-badge';
    badge.classList.add(`severity-${severity}`);

    // Update icon and text based on severity
    if (severity === 0) {
        icon.textContent = '✓';
        text.textContent = 'Bez výstrah';
    } else {
        const warningCount = attrs.warning_count || 1;

        if (severity >= 3) {
            icon.textContent = '🚨';
        } else {
            icon.textContent = '⚠️';
        }

        const severityNames = {
            1: 'Žluté varování',
            2: 'Oranžové varování',
            3: 'Červené varování',
            4: 'Fialové varování'
        };

        text.textContent = `${warningCount}× ${severityNames[severity]}`;
    }
}

// Toggle ČHMÚ warning modal
function toggleChmuWarningModal() {
    const modal = document.getElementById('chmu-modal');
    if (!modal) return;

    if (modal.classList.contains('active')) {
        closeChmuWarningModal();
    } else {
        openChmuWarningModal();
    }
}

// Open ČHMÚ warning modal
function openChmuWarningModal() {
    const modal = document.getElementById('chmu-modal');
    const modalBody = document.getElementById('chmu-modal-body');

    if (!modal || !modalBody || !chmuWarningData) return;

    modal.classList.add('active');

    // Render modal content
    renderChmuWarningModal(modalBody);
}

// Close ČHMÚ warning modal
function closeChmuWarningModal(event) {
    const modal = document.getElementById('chmu-modal');
    if (!modal) return;

    // If event is provided, check if we clicked outside the content
    if (event && event.target !== modal) return;

    modal.classList.remove('active');
}

// Render ČHMÚ warning modal content
function renderChmuWarningModal(container) {
    if (!chmuWarningData || !container) return;

    const { local, global } = chmuWarningData;
    const attrs = local.attributes || {};
    const severity = parseInt(local.state) || 0;

    // If no warnings
    if (severity === 0) {
        container.innerHTML = `
            <div class="chmu-no-warnings">
                <div class="chmu-no-warnings-icon">☀️</div>
                <h4>Žádná meteorologická výstraha</h4>
                <p>V současné době nejsou aktivní žádná varování pro váš region.</p>
            </div>
        `;
        return;
    }

    // Get warnings array
    const warnings = attrs.warnings || [];

    if (warnings.length === 0) {
        container.innerHTML = `
            <div class="chmu-no-warnings">
                <div class="chmu-no-warnings-icon">❓</div>
                <h4>Data nejsou k dispozici</h4>
                <p>Varování byla detekována, ale detaily nejsou dostupné.</p>
            </div>
        `;
        return;
    }

    // Render all warnings
    let html = '';

    warnings.forEach((warning, index) => {
        const wSeverity = warning.severity_level || 1;
        const eventType = warning.event_type || warning.event || 'Varování';
        const onset = warning.onset ? formatChmuDateTime(warning.onset) : '--';
        const expires = warning.expires ? formatChmuDateTime(warning.expires) : '--';
        const etaHours = warning.eta_hours !== undefined ? warning.eta_hours : null;
        const areas = warning.areas || [];
        const description = warning.description || '';
        const instruction = warning.instruction || '';
        const urgency = warning.urgency || '';
        const certainty = warning.certainty || '';

        const icon = getWarningIcon(eventType);
        const severityLabel = getSeverityLabel(wSeverity);
        const areaNames = areas.map(a => a.name || a).join(', ') || 'Není specifikováno';

        let etaText = '';
        if (etaHours !== null) {
            if (etaHours <= 0) {
                etaText = '<div class="chmu-info-item"><div class="chmu-info-icon">⏱️</div><div class="chmu-info-content"><div class="chmu-info-label">Status</div><div class="chmu-info-value" style="color: #ef4444; font-weight: 700;">PROBÍHÁ NYNÍ</div></div></div>';
            } else if (etaHours < 24) {
                etaText = `<div class="chmu-info-item"><div class="chmu-info-icon">⏱️</div><div class="chmu-info-content"><div class="chmu-info-label">Začátek za</div><div class="chmu-info-value">${Math.round(etaHours)} hodin</div></div></div>`;
            }
        }

        html += `
            <div class="chmu-warning-item severity-${wSeverity}">
                <div class="chmu-warning-header">
                    <div class="chmu-warning-icon">${icon}</div>
                    <div class="chmu-warning-title">
                        <h4>${eventType}</h4>
                        <span class="chmu-warning-severity severity-${wSeverity}">${severityLabel}</span>
                    </div>
                </div>

                <div class="chmu-warning-info">
                    <div class="chmu-info-item">
                        <div class="chmu-info-icon">📍</div>
                        <div class="chmu-info-content">
                            <div class="chmu-info-label">Oblast</div>
                            <div class="chmu-info-value">${areaNames}</div>
                        </div>
                    </div>
                    <div class="chmu-info-item">
                        <div class="chmu-info-icon">⏰</div>
                        <div class="chmu-info-content">
                            <div class="chmu-info-label">Začátek</div>
                            <div class="chmu-info-value">${onset}</div>
                        </div>
                    </div>
                    <div class="chmu-info-item">
                        <div class="chmu-info-icon">⏳</div>
                        <div class="chmu-info-content">
                            <div class="chmu-info-label">Konec</div>
                            <div class="chmu-info-value">${expires}</div>
                        </div>
                    </div>
                    ${etaText}
                </div>

                ${description ? `
                    <div class="chmu-warning-description">
                        <strong>📋 Popis</strong>
                        <p>${description}</p>
                    </div>
                ` : ''}

                ${instruction ? `
                    <div class="chmu-warning-description">
                        <strong>💡 Doporučení</strong>
                        <p>${instruction}</p>
                    </div>
                ` : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}

// Get icon for warning type
function getWarningIcon(eventType) {
    const icons = {
        'Vítr': '🌪️',
        'Silný vítr': '💨',
        'Déšť': '🌧️',
        'Silný déšť': '⛈️',
        'Sníh': '❄️',
        'Sněžení': '🌨️',
        'Bouřky': '⛈️',
        'Mráz': '🥶',
        'Vedro': '🌡️',
        'Mlha': '🌫️',
        'Náledí': '🧊',
        'Laviny': '⚠️'
    };

    for (const [key, icon] of Object.entries(icons)) {
        if (eventType.includes(key)) return icon;
    }

    return '⚠️';
}

// Get severity label
function getSeverityLabel(severity) {
    const labels = {
        1: 'Minor',
        2: 'Moderate',
        3: 'Severe',
        4: 'Extreme'
    };
    return labels[severity] || 'Unknown';
}

// Format ČHMÚ datetime
function formatChmuDateTime(isoString) {
    if (!isoString) return '--';

    try {
        const date = new Date(isoString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${day}.${month}. ${hours}:${minutes}`;
    } catch (e) {
        return isoString;
    }
}


