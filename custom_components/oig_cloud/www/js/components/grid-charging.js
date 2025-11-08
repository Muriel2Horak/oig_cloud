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

async function updateBatteryBalancingCard() {
    try {
        const balancingData = await getSensorString(getSensorId('battery_balancing'));
        const forecastData = await getSensorString(getSensorId('battery_forecast'));

        if (!balancingData || !balancingData.attributes) {
            console.warn('[Balancing] No balancing data available');
            return;
        }

        const attrs = balancingData.attributes;
        const status = balancingData.value; // ok, due_soon, critical, overdue, disabled
        const daysSince = attrs.days_since_last ?? null;
        const intervalDays = attrs.config?.interval_days ?? 7;
        const lastBalancing = attrs.last_balancing ? new Date(attrs.last_balancing) : null;
        const planned = attrs.planned;
        const currentState = attrs.current_state ?? 'standby'; // charging/balancing/planned/standby
        const timeRemaining = attrs.time_remaining; // HH:MM

        // Získat přesnou cenu z forecast sensoru
        const balancingCost = forecastData?.attributes?.balancing_cost;

        console.log('[Balancing] Forecast data:', {
            hasForecast: !!forecastData,
            hasAttributes: !!forecastData?.attributes,
            balancingCost: balancingCost,
            allAttributes: forecastData?.attributes ? Object.keys(forecastData.attributes) : []
        });

        // Vypočítat dny do dalšího balancingu
        let daysRemaining = null;
        if (daysSince !== null) {
            daysRemaining = Math.max(0, intervalDays - daysSince);
        }

        // Status barvy
        const statusColors = {
            ok: '#4CAF50',           // zelená
            due_soon: '#FFC107',     // žlutá
            critical: '#FF9800',     // oranžová
            overdue: '#F44336',      // červená
            disabled: '#757575'      // šedá
        };
        const statusColor = statusColors[status] || '#757575';

        // Current state texty a barvy
        const stateTexts = {
            charging: 'Příprava na 100%',
            balancing: 'Vyrovnávání článků',
            completed: 'Vybalancováno',
            planned: 'Čeká na zahájení',
            standby: 'Standby'
        };

        const stateColors = {
            charging: '#FFC107',    // žlutá
            balancing: '#FF9800',   // oranžová
            completed: '#4CAF50',   // zelená
            planned: '#2196F3',     // modrá
            standby: '#757575'      // šedá
        };

        // Update status label s detailním stavem
        const statusLabel = document.getElementById('balancing-status-label');
        if (statusLabel) {
            const stateText = stateTexts[currentState] || currentState;
            const stateColor = stateColors[currentState] || '#757575';

            if (currentState === 'charging' && timeRemaining) {
                statusLabel.textContent = `${stateText} (${timeRemaining} do balancování)`;
            } else if (currentState === 'balancing' && timeRemaining) {
                statusLabel.textContent = `${stateText} (zbývá ${timeRemaining})`;
            } else if (currentState === 'planned' && timeRemaining) {
                statusLabel.textContent = `${stateText} (start za ${timeRemaining})`;
            } else if (currentState === 'completed' && timeRemaining) {
                statusLabel.textContent = `${stateText} ${timeRemaining}`;
            } else {
                statusLabel.textContent = stateText;
            }

            statusLabel.style.color = stateColor;
        }

        // OPRAVA: Update nadpisu karty podle aktuálního stavu
        const cardTitle = document.getElementById('balancing-card-title');
        if (cardTitle) {
            if (currentState === 'balancing') {
                cardTitle.textContent = '⚡ Probíhá balancování';
                cardTitle.style.color = '#FF9800';
            } else if (currentState === 'charging') {
                cardTitle.textContent = '🔋 Příprava na balancování';
                cardTitle.style.color = '#FFC107';
            } else if (currentState === 'completed') {
                cardTitle.textContent = '✅ Balancování dokončeno';
                cardTitle.style.color = '#4CAF50';
            } else if (currentState === 'planned') {
                cardTitle.textContent = '📅 Balancování naplánováno';
                cardTitle.style.color = '#2196F3';
            } else {
                cardTitle.textContent = '🔋 Vyrovnání baterie';
                cardTitle.style.color = '#FF9800';
            }
        }

        // Update velké číslo - dny
        const daysNumber = document.getElementById('balancing-days-number');
        if (daysNumber) {
            if (daysRemaining !== null) {
                daysNumber.textContent = daysRemaining;
                daysNumber.style.color = statusColor;
            } else {
                daysNumber.textContent = '?';
                daysNumber.style.color = '#757575';
            }
        }

        // Update poslední balancing (krátký formát)
        const lastDateShort = document.getElementById('balancing-last-date-short');
        if (lastDateShort && lastBalancing) {
            const dateStr = lastBalancing.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' });
            lastDateShort.textContent = `${dateStr} (${daysSince}d)`;
        } else if (lastDateShort) {
            lastDateShort.textContent = 'Žádné';
        }

        // Update plánované balancing (krátký formát)
        const plannedShort = document.getElementById('balancing-planned-short');
        const plannedTimeShort = document.getElementById('balancing-planned-time-short');
        const costValueShort = document.getElementById('balancing-cost-value-short');

        if (planned && plannedTimeShort && costValueShort && plannedShort) {
            // Zobrazit plánovanou řádku
            plannedShort.style.display = 'flex';

            // Parsovat časy
            const startTime = new Date(planned.holding_start);
            const startStr = startTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

            // Zobrazit info o charging intervalech
            const chargingIntervals = planned.charging_intervals || [];
            const chargingAvgPrice = planned.charging_avg_price_czk || 0;
            const endTime = new Date(planned.holding_end);
            const endStr = endTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

            // Sestavit detailní tooltip s tabulkou (zmenšená šířka aby se vešla)
            let tooltipHTML = '<div style="text-align: left; font-size: 11px; min-width: 200px; max-width: 250px;">';
            tooltipHTML += '<strong style="display: block; margin-bottom: 8px; font-size: 12px; color: #FFA726;">🔋 Plán balancování</strong>';

            // Sekce: Příprava (nabíjení)
            if (chargingIntervals.length > 0) {
                tooltipHTML += '<div style="margin-bottom: 10px;">';
                tooltipHTML += '<div style="font-weight: 600; margin-bottom: 4px; color: rgba(255,255,255,0.9);">📊 Příprava (nabíjení na 100%)</div>';
                tooltipHTML += '<table style="width: 100%; border-collapse: collapse; margin-left: 8px;">';

                // Formátovat intervaly s datem (dnes/zítra)
                const now = new Date();
                const todayDate = now.getDate();
                const chargingTimes = chargingIntervals.map(t => {
                    const time = new Date(t);
                    const timeStr = time.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
                    const isTomorrow = time.getDate() !== todayDate;
                    return isTomorrow ? `zítra ${timeStr}` : timeStr;
                });

                // Rozdělit intervaly pod sebe pro lepší čitelnost
                tooltipHTML += '<tr><td style="padding: 2px 4px; color: rgba(255,255,255,0.7); vertical-align: top;">Intervaly:</td>';
                tooltipHTML += `<td style="padding: 2px 4px; text-align: right; line-height: 1.4;">${chargingTimes.join('<br>')}</td></tr>`;
                tooltipHTML += '<tr><td style="padding: 2px 4px; color: rgba(255,255,255,0.7);">Průměrná cena:</td>';
                tooltipHTML += `<td style="padding: 2px 4px; text-align: right;">${chargingAvgPrice.toFixed(2)} Kč/kWh</td></tr>`;
                tooltipHTML += '</table>';
                tooltipHTML += '</div>';
            }

            // Sekce: Balancování (držení)
            tooltipHTML += '<div style="margin-bottom: 10px;">';
            tooltipHTML += '<div style="font-weight: 600; margin-bottom: 4px; color: rgba(255,255,255,0.9);">⚡ Balancování (držení na 100%)</div>';
            tooltipHTML += '<table style="width: 100%; border-collapse: collapse; margin-left: 8px;">';
            tooltipHTML += '<tr><td style="padding: 2px 4px; color: rgba(255,255,255,0.7);">Začátek:</td>';
            tooltipHTML += `<td style="padding: 2px 4px; text-align: right;">${startStr}</td></tr>`;
            tooltipHTML += '<tr><td style="padding: 2px 4px; color: rgba(255,255,255,0.7);">Konec:</td>';
            tooltipHTML += `<td style="padding: 2px 4px; text-align: right;">${endStr}</td></tr>`;
            tooltipHTML += '<tr><td style="padding: 2px 4px; color: rgba(255,255,255,0.7);">Délka:</td>';
            tooltipHTML += `<td style="padding: 2px 4px; text-align: right;">${attrs.config?.hold_hours ?? 3} hodiny</td></tr>`;
            tooltipHTML += '</table>';
            tooltipHTML += '</div>';

            // Sekce: Náklady (pokud jsou k dispozici)
            if (balancingCost) {
                const chargingCostVal = balancingCost.charging_cost_czk ?? 0;
                const holdingCostVal = balancingCost.holding_cost_czk ?? 0;
                const totalCostVal = balancingCost.total_cost_czk ?? 0;

                tooltipHTML += '<table style="width: 100%; border-collapse: collapse; margin-top: 8px;">';
                tooltipHTML += '<thead><tr style="border-bottom: 1px solid rgba(255,255,255,0.2);">';
                tooltipHTML += '<th style="padding: 4px; text-align: left; color: rgba(255,255,255,0.9);">💰 Náklady</th>';
                tooltipHTML += '<th style="padding: 4px; text-align: right;"></th>';
                tooltipHTML += '</tr></thead>';
                tooltipHTML += '<tbody>';
                tooltipHTML += '<tr><td style="padding: 2px 4px; color: rgba(255,255,255,0.7);">Nabíjení:</td>';
                tooltipHTML += `<td style="padding: 2px 4px; text-align: right;">${chargingCostVal.toFixed(2)} Kč</td></tr>`;
                tooltipHTML += '<tr><td style="padding: 2px 4px; color: rgba(255,255,255,0.7);">Držení:</td>';
                tooltipHTML += `<td style="padding: 2px 4px; text-align: right;">${holdingCostVal.toFixed(2)} Kč</td></tr>`;
                tooltipHTML += '</tbody>';
                tooltipHTML += '<tfoot><tr style="border-top: 1px solid rgba(255,255,255,0.3); font-weight: bold;">';
                tooltipHTML += '<td style="padding: 4px;">Celkem:</td>';
                tooltipHTML += `<td style="padding: 4px; text-align: right;">${totalCostVal.toFixed(2)} Kč</td>`;
                tooltipHTML += '</tr></tfoot>';
                tooltipHTML += '</table>';
            }

            tooltipHTML += '</div>';

            plannedTimeShort.textContent = `dnes ${startStr}`;
            plannedTimeShort.setAttribute('data-tooltip-html', tooltipHTML);

            // Přesné náklady pokud jsou k dispozici
            if (balancingCost) {
                const totalCost = balancingCost.total_cost_czk ?? 0;
                const chargingCost = balancingCost.charging_cost_czk ?? 0;
                const holdingCost = balancingCost.holding_cost_czk ?? 0;

                console.log('[Balancing] Cost data:', { totalCost, chargingCost, holdingCost, balancingCost });

                costValueShort.textContent = `${totalCost.toFixed(1)} Kč`;
                costValueShort.title = `Nabíjení: ${chargingCost.toFixed(2)} Kč\nDržení: ${holdingCost.toFixed(2)} Kč\nCelkem: ${totalCost.toFixed(2)} Kč`;
            } else {
                // Fallback odhad
                console.warn('[Balancing] No balancing_cost in forecast, using estimate');
                const avgPrice = planned.avg_price_czk ?? 0;
                const holdHours = attrs.config?.hold_hours ?? 3;
                const estimatedCost = avgPrice * holdHours * 0.7;
                costValueShort.textContent = `~${estimatedCost.toFixed(1)} Kč`;
                costValueShort.title = `Odhad (přesné náklady nejsou k dispozici)`;
            }
        } else if (plannedShort) {
            // Skrýt plánovanou řádku
            plannedShort.style.display = 'none';
            if (costValueShort) costValueShort.textContent = '--';
        }

        // Update timeline bar
        const timelineBar = document.getElementById('balancing-timeline-bar');
        const timelineLabel = document.getElementById('balancing-timeline-label');

        if (timelineBar && timelineLabel && daysSince !== null) {
            const progressPercent = Math.min(100, (daysSince / intervalDays) * 100);

            timelineBar.style.width = `${progressPercent}%`;
            timelineBar.style.background = `linear-gradient(90deg, ${statusColor} 0%, ${statusColor}aa 100%)`;

            timelineLabel.textContent = `${daysSince}/${intervalDays} dní`;
        }

        // Re-inicializovat tooltips aby fungovaly na dynamicky přidaných elementech
        initTooltips();

        // NOVÉ: Aktualizovat baterie balancing indikátor
        updateBatteryBalancingIndicator(currentState, timeRemaining, balancingCost);

    } catch (error) {
        console.error('[Balancing] Error updating battery balancing card:', error);
    }
}

/**
 * Aktualizuje indikátor balancování baterie v boxu baterie
 * @param {string} state - Aktuální stav: 'charging', 'balancing', 'planned', 'standby'
 * @param {string} timeRemaining - Zbývající čas ve formátu HH:MM
 * @param {object} balancingCost - Objekt s náklady na balancování
 */
function updateBatteryBalancingIndicator(state, timeRemaining, balancingCost) {
    const indicator = document.getElementById('battery-balancing-indicator');
    const icon = document.getElementById('balancing-icon');
    const text = document.getElementById('balancing-text');

    if (!indicator || !icon || !text) return;

    // Zobrazit indikátor jen během aktivního balancování
    if (state === 'charging' || state === 'balancing') {
        indicator.style.display = 'flex';

        // Ikona podle stavu
        if (state === 'charging') {
            icon.textContent = '⚡';
            text.textContent = 'Nabíjení...';
            indicator.className = 'battery-balancing-indicator charging';
        } else if (state === 'balancing') {
            icon.textContent = '⏸️';
            text.textContent = 'Balancuje...';
            indicator.className = 'battery-balancing-indicator holding';
        }

        // Sestavit tooltip s detaily
        let tooltipHtml = '<div style="text-align: left; min-width: 200px;">';
        tooltipHtml += `<strong>🔋 Balancování baterie</strong><br><br>`;

        if (state === 'charging') {
            tooltipHtml += `<strong>Fáze:</strong> Nabíjení baterie<br>`;
            tooltipHtml += `<em>Baterie se nabíjí před vyvažováním článků</em><br><br>`;
        } else {
            tooltipHtml += `<strong>Fáze:</strong> Držení (balancování)<br>`;
            tooltipHtml += `<em>Články baterie se vyvažují na stejnou úroveň</em><br><br>`;
        }

        if (timeRemaining) {
            tooltipHtml += `⏱️ <strong>Zbývá:</strong> ${timeRemaining}<br>`;
        }

        if (balancingCost) {
            const totalCost = balancingCost.total_cost_czk ?? 0;
            const chargingCost = balancingCost.charging_cost_czk ?? 0;
            const holdingCost = balancingCost.holding_cost_czk ?? 0;

            tooltipHtml += `<br><strong>💰 Náklady:</strong><br>`;
            tooltipHtml += `• Nabíjení: ${chargingCost.toFixed(2)} Kč<br>`;
            tooltipHtml += `• Držení: ${holdingCost.toFixed(2)} Kč<br>`;
            tooltipHtml += `• <strong>Celkem: ${totalCost.toFixed(2)} Kč</strong><br>`;
        }

        tooltipHtml += `<br><small style="opacity: 0.7;">ℹ️ Balancování prodlužuje životnost baterie tím, že vyrovná napětí všech článků</small>`;
        tooltipHtml += `</div>`;

        indicator.setAttribute('data-tooltip-html', tooltipHtml);

    } else {
        // Skrýt indikátor pokud není aktivní balancování
        indicator.style.display = 'none';
    }

    // Reinicializovat tooltips
    initTooltips();
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

// Dialog functions (stubs - to be implemented or removed)
function openGridChargingDialog() {
    console.log('[GridCharging] openGridChargingDialog - not implemented');
}

function closeGridChargingDialog() {
    console.log('[GridCharging] closeGridChargingDialog - not implemented');
}

function renderGridChargingDialog() {
    console.log('[GridCharging] renderGridChargingDialog - not implemented');
    return '';
}

function selectTimeBlock() {
    console.log('[GridCharging] selectTimeBlock - not implemented');
}

function deselectTimeBlock() {
    console.log('[GridCharging] deselectTimeBlock - not implemented');
}

function clearAllBlocks() {
    console.log('[GridCharging] clearAllBlocks - not implemented');
}

function saveGridChargingPlan() {
    console.log('[GridCharging] saveGridChargingPlan - not implemented');
}


// Export grid charging functions
window.DashboardGridCharging = {
    openGridChargingDialog,
    closeGridChargingDialog,
    renderGridChargingDialog,
    selectTimeBlock,
    deselectTimeBlock,
    clearAllBlocks,
    saveGridChargingPlan,
    init: function() {
        console.log('[DashboardGridCharging] Initialized');
    }
};

console.log('[DashboardGridCharging] Module loaded');
