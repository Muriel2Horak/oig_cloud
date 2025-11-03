function updateBatteryEfficiencyBar(lastMonthEff, currentMonthEff) {
    const barLast = document.getElementById('battery-efficiency-bar-last');
    const barCurrent = document.getElementById('battery-efficiency-bar-current');
    const labelLast = document.getElementById('battery-efficiency-bar-last-label');
    const labelCurrent = document.getElementById('battery-efficiency-bar-current-label');

    if (!barLast || !barCurrent || !labelLast || !labelCurrent) return;

    // Pokud máme obě hodnoty, zobraz poměr
    if (lastMonthEff !== null && lastMonthEff !== undefined &&
        currentMonthEff !== null && currentMonthEff !== undefined) {

        const total = lastMonthEff + currentMonthEff;
        const lastPercent = (lastMonthEff / total) * 100;
        const currentPercent = (currentMonthEff / total) * 100;

        barLast.style.width = `${lastPercent}%`;
        barCurrent.style.width = `${currentPercent}%`;
        labelLast.textContent = `${lastMonthEff.toFixed(1)}%`;
        labelCurrent.textContent = `${currentMonthEff.toFixed(1)}%`;
    } else if (lastMonthEff !== null && lastMonthEff !== undefined) {
        // Jen minulý měsíc
        barLast.style.width = '100%';
        barCurrent.style.width = '0%';
        labelLast.textContent = `${lastMonthEff.toFixed(1)}%`;
        labelCurrent.textContent = '--';
    } else if (currentMonthEff !== null && currentMonthEff !== undefined) {
        // Jen tento měsíc
        barLast.style.width = '0%';
        barCurrent.style.width = '100%';
        labelLast.textContent = '--';
        labelCurrent.textContent = `${currentMonthEff.toFixed(1)}%`;
    } else {
        // Žádná data
        barLast.style.width = '0%';
        barCurrent.style.width = '0%';
        labelLast.textContent = '--';
        labelCurrent.textContent = '--';
    }
}

/**
 * Update planned consumption statistics on Pricing tab
 * Reads pre-calculated data from battery_forecast attributes
 */
async function updatePlannedConsumptionStats() {
    const hass = getHass();
    if (!hass) return;

    const forecastSensorId = `sensor.oig_${INVERTER_SN}_battery_forecast`;
    const forecastSensor = hass.states[forecastSensorId];

    // Check if sensor is available
    if (!forecastSensor || forecastSensor.state === 'unavailable' || forecastSensor.state === 'unknown') {
        console.log('[Planned Consumption] Battery forecast sensor not available:', forecastSensorId);
        updateElementIfChanged('planned-consumption-today', '--', 'planned-today');
        updateElementIfChanged('consumption-profile-today', 'Čekám na data...', 'profile-today');
        updateElementIfChanged('planned-consumption-tomorrow', '--', 'planned-tomorrow');
        updateElementIfChanged('consumption-profile-tomorrow', 'Čekám na data...', 'profile-tomorrow');
        return;
    }

    // Get pre-calculated consumption data from battery_forecast attributes
    const attrs = forecastSensor.attributes || {};

    // Display data (already calculated in Python) - načítáme přímo z root atributů
    const todayPlannedKwh = attrs.planned_consumption_today;
    const tomorrowKwh = attrs.planned_consumption_tomorrow;
    const profileToday = attrs.profile_today;
    const profileTomorrow = attrs.profile_tomorrow;

    // Získat již spotřebovanou energii dnes z ac_out_en_day (vrací Wh, převést na kWh)
    const todayConsumedSensorId = `sensor.oig_${INVERTER_SN}_ac_out_en_day`;
    const todayConsumedSensor = hass.states[todayConsumedSensorId];
    const todayConsumedWh = todayConsumedSensor && todayConsumedSensor.state !== 'unavailable'
        ? parseFloat(todayConsumedSensor.state) || 0
        : 0;
    const todayConsumedKwh = todayConsumedWh / 1000; // Převod Wh -> kWh

    // Celková spotřeba dnes (už spotřebováno + ještě plánováno)
    const todayTotalKwh = todayConsumedKwh + (todayPlannedKwh || 0);

    // Celková plánovaná spotřeba (dnes zbývá + zítřek celý)
    const totalPlannedKwh = (todayPlannedKwh || 0) + (tomorrowKwh || 0);

    // Update UI - Hlavní hodnota (plánovaná: dnes zbývá + zítřek)
    if (totalPlannedKwh > 0) {
        updateElementIfChanged('planned-consumption-main', `${totalPlannedKwh.toFixed(1)} kWh`, 'planned-main');
    } else {
        updateElementIfChanged('planned-consumption-main', '--', 'planned-main');
    }

    // Update trend text (porovnání celkem dnes vs zítřek)
    if (todayTotalKwh > 0 && tomorrowKwh !== null && tomorrowKwh !== undefined) {
        const diff = tomorrowKwh - todayTotalKwh;
        const diffPercent = todayTotalKwh > 0 ? ((diff / todayTotalKwh) * 100) : 0;
        let trendText = '';
        let trendIcon = '';

        if (Math.abs(diffPercent) < 5) {
            trendIcon = '➡️';
            trendText = `Zítra podobně`;
        } else if (diff > 0) {
            trendIcon = '📈';
            trendText = `Zítra více (+${Math.abs(diffPercent).toFixed(0)}%)`;
        } else {
            trendIcon = '📉';
            trendText = `Zítra méně (-${Math.abs(diffPercent).toFixed(0)}%)`;
        }

        updateElementIfChanged('planned-consumption-trend', `${trendIcon} ${trendText}`, 'planned-trend');
    } else {
        updateElementIfChanged('planned-consumption-trend', '--', 'planned-trend');
    }

    // Detail řádky - Dnes: spotřebováno + zbývá plán, Zítra: celý den
    if (todayConsumedKwh !== null && todayConsumedKwh !== undefined) {
        updateElementIfChanged('planned-today-consumed-kwh', `${todayConsumedKwh.toFixed(1)} kWh`, 'planned-today-consumed');
    } else {
        updateElementIfChanged('planned-today-consumed-kwh', '--', 'planned-today-consumed');
    }

    if (todayPlannedKwh !== null && todayPlannedKwh !== undefined) {
        updateElementIfChanged('planned-today-remaining-kwh', `${todayPlannedKwh.toFixed(1)} kWh`, 'planned-today-remaining');
    } else {
        updateElementIfChanged('planned-today-remaining-kwh', '--', 'planned-today-remaining');
    }

    if (tomorrowKwh !== null && tomorrowKwh !== undefined) {
        updateElementIfChanged('planned-tomorrow-kwh', `${tomorrowKwh.toFixed(1)} kWh`, 'planned-tomorrow-kwh');
    } else {
        updateElementIfChanged('planned-tomorrow-kwh', '--', 'planned-tomorrow-kwh');
    }

    // Profil display - bez emoji, čistý text (nahoru místo "Zbývá dnes + celý zítřek")
    let profileDisplay = '';
    if (profileToday && profileToday !== 'Žádný profil' && profileToday !== 'Neznámý profil') {
        // Zkrátit dlouhé názvy profilů
        const shortProfile = profileToday.length > 55 ? profileToday.substring(0, 52) + '...' : profileToday;
        profileDisplay = shortProfile;
    } else {
        profileDisplay = 'Žádný profil';
    }
    updateElementIfChanged('consumption-profile-display', profileDisplay, 'profile-display');

    // Update gradient bar (místo canvas grafu)
    const barToday = document.getElementById('planned-consumption-bar-today');
    const barTomorrow = document.getElementById('planned-consumption-bar-tomorrow');
    const labelToday = document.getElementById('planned-bar-today-label');
    const labelTomorrow = document.getElementById('planned-bar-tomorrow-label');

    if (barToday && barTomorrow && todayTotalKwh > 0 && tomorrowKwh !== null && tomorrowKwh !== undefined) {
        const total = todayTotalKwh + tomorrowKwh;
        const todayPercent = (todayTotalKwh / total) * 100;
        const tomorrowPercent = (tomorrowKwh / total) * 100;

        barToday.style.width = `${todayPercent}%`;
        barTomorrow.style.width = `${tomorrowPercent}%`;

        if (labelToday) labelToday.textContent = `${todayTotalKwh.toFixed(1)}`;
        if (labelTomorrow) labelTomorrow.textContent = `${tomorrowKwh.toFixed(1)}`;
    }
}

/**
 * Update what-if analysis statistics on Pricing tab
 * Reads mode_optimization.alternatives from battery_forecast attributes
 */
async function updateWhatIfAnalysis() {
    const hass = getHass();
    if (!hass) return;

    const forecastSensorId = `sensor.oig_${INVERTER_SN}_battery_forecast`;
    const forecastSensor = hass.states[forecastSensorId];

    // Check if sensor is available
    if (!forecastSensor || forecastSensor.state === 'unavailable' || forecastSensor.state === 'unknown') {
        console.log('[What-if] Battery forecast sensor not available');
        updateElementIfChanged('whatif-optimized-cost', '--', 'whatif-main');
        updateElementIfChanged('whatif-savings-main', '--', 'whatif-savings');
        updateElementIfChanged('whatif-home-i-delta', '--', 'whatif-home-i');
        updateElementIfChanged('whatif-home-ii-delta', '--', 'whatif-home-ii');
        updateElementIfChanged('whatif-home-iii-delta', '--', 'whatif-home-iii');
        updateElementIfChanged('whatif-home-ups-delta', '--', 'whatif-home-ups');
        return;
    }

    // Get mode_optimization data (still in attributes)
    const attrs = forecastSensor.attributes || {};
    const modeOptData = attrs.mode_optimization || {};
    const alternatives = modeOptData.alternatives || {};

    console.log('[What-if Tile] modeOptData:', modeOptData);
    console.log('[What-if Tile] alternatives:', alternatives);

    // Phase 2.8: Use cached totals from mode_optimization instead of summing blocks
    // (mode_recommendations are per-interval, mode_optimization has pre-calculated totals for DNES+ZÍTRA)
    const totalCost = modeOptData.total_cost_czk || 0;
    const totalSavings = modeOptData.total_savings_vs_home_i_czk || 0;

    console.log('[What-if Tile] totalCost:', totalCost, 'totalSavings:', totalSavings);

    // Update optimized cost and savings
    updateElementIfChanged('whatif-optimized-cost', `${totalCost.toFixed(2)} Kč`, 'whatif-main');

    if (totalSavings > 0) {
        updateElementIfChanged('whatif-savings-main', `+${totalSavings.toFixed(2)} Kč`, 'whatif-savings');
    } else if (totalSavings < 0) {
        updateElementIfChanged('whatif-savings-main', `${totalSavings.toFixed(2)} Kč`, 'whatif-savings');
    } else {
        updateElementIfChanged('whatif-savings-main', '0 Kč', 'whatif-savings');
    }

    // Update what-if alternatives comparison - 4 modes only
    // Backend format: alternatives = { "HOME I": {...}, "HOME II": {...}, ... }
    const homeI = alternatives['HOME I'];
    const homeII = alternatives['HOME II'];
    const homeIII = alternatives['HOME III'];
    const homeUps = alternatives['HOME UPS'] || alternatives['FULL HOME UPS'];
    const doNothing = alternatives['DO NOTHING'];

    // Format deltas (delta_czk from backend - positive means alternative is more expensive)
    const formatDelta = (alt) => {
        if (!alt || alt.delta_czk === undefined) return '--';
        const delta = alt.delta_czk;
        if (delta > 0.01) {
            return `+${delta.toFixed(2)} Kč`;
        } else if (delta < -0.01) {
            return `${delta.toFixed(2)} Kč`;
        } else {
            return '~0 Kč';
        }
    };

    // Update values
    updateElementIfChanged('whatif-home-i-delta', formatDelta(homeI), 'whatif-home-i');
    updateElementIfChanged('whatif-home-ii-delta', formatDelta(homeII), 'whatif-home-ii');
    updateElementIfChanged('whatif-home-iii-delta', formatDelta(homeIII), 'whatif-home-iii');
    updateElementIfChanged('whatif-home-ups-delta', formatDelta(homeUps), 'whatif-home-ups');

    // Highlight active mode (DO NOTHING = current mode)
    // Reset all rows first
    const rows = ['whatif-home-i-row', 'whatif-home-ii-row', 'whatif-home-iii-row', 'whatif-home-ups-row'];
    rows.forEach(rowId => {
        const row = document.getElementById(rowId);
        if (row) {
            row.style.background = 'transparent';
            row.style.border = 'none';
        }
    });

    // Highlight the active one (if DO NOTHING exists, check which mode it represents)
    if (doNothing && doNothing.current_mode) {
        // Backend provides current_mode field in DO NOTHING
        const activeMode = doNothing.current_mode;
        let activeRowId = null;

        if (activeMode === 'HOME I') {
            activeRowId = 'whatif-home-i-row';
        } else if (activeMode === 'HOME II') {
            activeRowId = 'whatif-home-ii-row';
        } else if (activeMode === 'HOME III') {
            activeRowId = 'whatif-home-iii-row';
        } else if (activeMode === 'HOME UPS') {
            activeRowId = 'whatif-home-ups-row';
        }

        if (activeRowId) {
            const activeRow = document.getElementById(activeRowId);
            if (activeRow) {
                activeRow.style.background = 'rgba(76, 175, 80, 0.15)';
                activeRow.style.border = '1px solid rgba(76, 175, 80, 0.3)';
            }
        }
    }
}


/**
 * Update mode recommendations timeline on Pricing tab
 * Reads mode_recommendations from battery_forecast attributes
 */
async function updateModeRecommendations() {
    const hass = getHass();
    if (!hass) return;

    const forecastSensorId = `sensor.oig_${INVERTER_SN}_battery_forecast`;
    const forecastSensor = hass.states[forecastSensorId];

    const container = document.getElementById('mode-recommendations-timeline');
    if (!container) return;

    // Check if sensor is available
    if (!forecastSensor || forecastSensor.state === 'unavailable' || forecastSensor.state === 'unknown') {
        console.log('[Mode Recommendations] Battery forecast sensor not available');
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">Čekám na data...</div>';
        return;
    }

    // Get mode_recommendations data
    const attrs = forecastSensor.attributes || {};
    const recommendations = attrs.mode_recommendations || [];

    if (!recommendations || recommendations.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">Žádná doporučení k dispozici</div>';
        return;
    }

    // Build timeline HTML
    const modeIcons = {
        'HOME I': '🏠',
        'HOME II': '🏡',
        'HOME III': '🏘️',
        'HOME UPS': '⚡'
    };

    const modeColors = {
        'HOME I': '#4CAF50',
        'HOME II': '#2196F3',
        'HOME III': '#FF9800',
        'HOME UPS': '#9C27B0'
    };

    let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';

    recommendations.forEach((rec, index) => {
        const icon = modeIcons[rec.mode_name] || '📍';
        const color = modeColors[rec.mode_name] || '#757575';
        const fromTime = rec.from_time ? new Date(rec.from_time).toLocaleTimeString('cs-CZ', {hour: '2-digit', minute: '2-digit'}) : '--';
        const toTime = rec.to_time ? new Date(rec.to_time).toLocaleTimeString('cs-CZ', {hour: '2-digit', minute: '2-digit'}) : '--';
        const duration = rec.duration_hours || 0;

        html += `
            <div style="display: flex; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.02); border-left: 3px solid ${color}; border-radius: 4px;">
                <div style="font-size: 1.5em; margin-right: 10px;">${icon}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: ${color};">${rec.mode_name}</div>
                    <div style="font-size: 0.85em; color: var(--text-secondary);">${fromTime} - ${toTime} (${duration.toFixed(1)}h)</div>
                </div>
                <div style="text-align: right; font-size: 0.85em; color: var(--text-secondary);">
                    ${rec.intervals_count || 0} intervalů
                </div>
            </div>
        `;
    });

    html += '</div>';

    container.innerHTML = html;
}
