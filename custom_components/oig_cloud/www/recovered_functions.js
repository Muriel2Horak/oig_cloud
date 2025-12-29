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

// === ČHMÚ (moved to dashboard-chmu.js) ===
const updateChmuWarningBadge = window.DashboardChmu.updateChmuWarningBadge;
const toggleChmuWarningModal = window.DashboardChmu.toggleChmuWarningModal;
const openChmuWarningModal = window.DashboardChmu.openChmuWarningModal;
const closeChmuWarningModal = window.DashboardChmu.closeChmuWarningModal;
    if (!hass) return;

    const sensorId = `sensor.oig_${INVERTER_SN}_battery_efficiency`;
    const sensor = hass.states[sensorId];

    if (!sensor || sensor.state === 'unavailable' || sensor.state === 'unknown') {
        console.log('[Battery Efficiency] Sensor not available:', sensorId);
        return;
    }

    const attrs = sensor.attributes || {};

    // Prefer last month (complete), fallback to current month (partial)
    let displayEff, displayLossesPct, displayLossesKwh, displayCharge, displayDischarge, displayLabel;

    const lastMonthEff = attrs.efficiency_last_month_pct;
    const lastMonthLossesPct = attrs.losses_last_month_pct;
    const lastMonthLossesKwh = attrs.losses_last_month_kwh;
    const lastMonthCharge = attrs.last_month_charge_kwh;
    const lastMonthDischarge = attrs.last_month_discharge_kwh;

    const currentMonthEff = attrs.efficiency_current_month_pct;
    const currentMonthLossesPct = attrs.losses_current_month_pct;
    const currentMonthLossesKwh = attrs.losses_current_month_kwh;
    const currentMonthCharge = attrs.current_month_charge_kwh;
    const currentMonthDischarge = attrs.current_month_discharge_kwh;
    const currentMonthDays = attrs.current_month_days;

    // Use last month if available (complete data), otherwise use current month (partial)
    if (lastMonthEff !== null && lastMonthEff !== undefined &&
        lastMonthCharge !== null && lastMonthDischarge !== null) {
        displayEff = lastMonthEff;
        displayLossesPct = lastMonthLossesPct;
        displayLossesKwh = lastMonthLossesKwh;
        displayCharge = lastMonthCharge;
        displayDischarge = lastMonthDischarge;
        displayLabel = 'Minulý měsíc';
    } else if (currentMonthEff !== null && currentMonthEff !== undefined) {
        displayEff = currentMonthEff;
        displayLossesPct = currentMonthLossesPct;
        displayLossesKwh = currentMonthLossesKwh;
        displayCharge = currentMonthCharge;
        displayDischarge = currentMonthDischarge;
        displayLabel = `Tento měsíc (${currentMonthDays} dní)`;
    }

    if (displayEff !== undefined) {
        // Main value
        updateElementIfChanged('battery-efficiency-main', `${displayEff.toFixed(1)}%`, 'batt-eff-main');

        // Trend comparison
        if (lastMonthEff !== null && currentMonthEff !== null &&
            lastMonthEff !== undefined && currentMonthEff !== undefined) {
            const diff = currentMonthEff - lastMonthEff;
            const diffAbs = Math.abs(diff);
            let trendText = '';
            let trendColor = '';

            if (diff > 0.5) {
                trendText = `↗️ Vs minulý měsíc +${diffAbs.toFixed(1)}%`;
                trendColor = '#4CAF50';
            } else if (diff < -0.5) {
                trendText = `↘️ Vs minulý měsíc -${diffAbs.toFixed(1)}%`;
                trendColor = '#FF5722';
            } else {
                trendText = `➡️ Podobně jako minulý měsíc`;
                trendColor = 'var(--text-secondary)';
            }

            const trendEl = document.getElementById('battery-efficiency-trend');
            if (trendEl) {
                trendEl.textContent = trendText;
                trendEl.style.color = trendColor;
            }
        } else {
            updateElementIfChanged('battery-efficiency-trend', displayLabel, 'batt-trend');
        }

        // Detail values
        updateElementIfChanged('battery-charge-value', `${displayCharge?.toFixed(1) || '--'} kWh`, 'batt-charge-val');
        updateElementIfChanged('battery-discharge-value', `${displayDischarge?.toFixed(1) || '--'} kWh`, 'batt-discharge-val');
        updateElementIfChanged('battery-losses-value', `${displayLossesKwh?.toFixed(1) || '--'} kWh (${displayLossesPct?.toFixed(1) || '--'}%)`, 'batt-loss-val');

        // Update period label
        updateElementIfChanged('battery-efficiency-period-label', displayLabel, 'batt-period-label');

        // Update gradient bar comparison
        updateBatteryEfficiencyBar(lastMonthEff, currentMonthEff);
    } else {
        updateElementIfChanged('battery-efficiency-main', '--', 'batt-eff-main');
        updateElementIfChanged('battery-efficiency-period-label', 'Čekám na data...', 'batt-period-label');
        updateElementIfChanged('battery-efficiency-trend', 'Čekám na data...', 'batt-trend');
        updateElementIfChanged('battery-charge-value', '--', 'batt-charge-val');
        updateElementIfChanged('battery-discharge-value', '--', 'batt-discharge-val');
        updateElementIfChanged('battery-losses-value', '--', 'batt-loss-val');
    }
