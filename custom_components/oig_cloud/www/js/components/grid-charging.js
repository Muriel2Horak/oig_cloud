// === GRID CHARGING PLAN FUNCTIONS ===

function getDayLabel(day) {
    if (day === 'tomorrow') return 'zítra';
    if (day === 'today') return 'dnes';
    return '';
}

function getBlockEnergyKwh(block) {
    if (!block) return 0;
    // HYBRID API uses grid_import_kwh, legacy uses grid_charge_kwh
    const energy = Number(block.grid_import_kwh || block.grid_charge_kwh);
    if (Number.isFinite(energy) && energy > 0) {
        return energy;
    }
    const start = Number(block.battery_start_kwh);
    const end = Number(block.battery_end_kwh);
    if (Number.isFinite(start) && Number.isFinite(end)) {
        const delta = end - start;
        return Math.max(delta, 0);
    }
    return 0;
}

function sortChargingBlocks(blocks = []) {
    return [...blocks].sort((a, b) => {
        const dayScore = (a?.day === 'tomorrow' ? 1 : 0) - (b?.day === 'tomorrow' ? 1 : 0);
        if (dayScore !== 0) return dayScore;
        return (a?.time_from || '').localeCompare(b?.time_from || '');
    });
}

function formatPlanWindow(blocks) {
    if (!Array.isArray(blocks) || blocks.length === 0) return null;
    const sorted = sortChargingBlocks(blocks);
    const first = sorted[0];
    const last = sorted.at(-1);

    const startLabel = getDayLabel(first?.day);
    const endLabel = getDayLabel(last?.day);

    if (startLabel === endLabel) {
        const prefix = startLabel ? `${startLabel} ` : '';
        if (!first?.time_from || !last?.time_to) {
            return prefix.trim() || null;
        }
        return `${prefix}${first.time_from} – ${last.time_to}`;
    }

    const startPrefix = startLabel ? `${startLabel} ` : '';
    const endPrefix = endLabel ? `${endLabel} ` : '';
    const startTime = first?.time_from || '--';
    const endTime = last?.time_to || '--';
    const startText = first ? `${startPrefix}${startTime}` : '--';
    const endText = last ? `${endPrefix}${endTime}` : '--';
    return `${startText} → ${endText}`;
}

function formatBlockLabel(block) {
    if (!block) return '--';
    const label = getDayLabel(block.day);
    const prefix = label ? `${label} ` : '';
    const from = block.time_from || '--';
    const to = block.time_to || '--';
    return `${prefix}${from} - ${to}`;
}

function updateChargingRow(rowId, valueId, block, shouldShow) {
    const rowEl = document.getElementById(rowId);
    const valueEl = document.getElementById(valueId);
    if (!rowEl || !valueEl) return;

    if (block && shouldShow) {
        rowEl.style.display = 'flex';
        valueEl.textContent = formatBlockLabel(block);
    } else {
        rowEl.style.display = 'none';
        valueEl.textContent = '--';
    }
}

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
    let color, text, tooltipText;

    if (minAchieved) {
        // VAROVÁNÍ: Nedosáhne target, ale dosáhne minimum
        color = '#ff9800'; // oranžová
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
    } else {
        // KRITICKÉ: Nedosáhne ani minimum
        color = '#f44336'; // červená
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
    }

    // Nastavit text a barvu
    warningIndicator.textContent = text;
    warningIndicator.style.color = color;
    warningIndicator.dataset.tooltipHtml = tooltipText;

    // Přidat blikání (použít existující animaci)
    warningIndicator.style.animation = 'pulse-warning 2s ease-in-out infinite';
}

function parseHmToMinutes(hm) {
    if (!hm || typeof hm !== 'string') return null;
    const match = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
    if (!match) return null;
    const h = Number(match[1]);
    const min = Number(match[2]);
    if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
    return h * 60 + min;
}

function formatDurationMinutes(totalMinutes) {
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '0 h';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    if (hours <= 0) return `${minutes} min`;
    if (minutes <= 0) return `${hours} h`;
    return `${hours} h ${minutes} min`;
}

function getLocalDateKey(dateObj) {
    if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return null;
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function normalizeChargingTimeline(rawTimeline) {
    const timeline = Array.isArray(rawTimeline?.timeline) ? rawTimeline.timeline : rawTimeline;
    if (!Array.isArray(timeline)) return [];
    return [...timeline]
        .filter(p => p && typeof p.timestamp === 'string')
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function parseChargingPoint(point, todayKey) {
    const gridKwh = Number(point.grid_import_kwh ?? point.grid_charge_kwh ?? 0);
    if (!Number.isFinite(gridKwh) || gridKwh <= 0) return null;

    const ts = point.timestamp;
    const [datePart, timePart] = ts.split('T');
    const hm = timePart ? timePart.slice(0, 5) : null;
    if (!datePart || !hm) return null;

    const day = datePart === todayKey ? 'today' : 'tomorrow';
    const spot = Number(point.spot_price_czk ?? 0);
    const cost = Number.isFinite(spot) && spot > 0 ? gridKwh * spot : 0;

    return { day, datePart, hm, ts, gridKwh, cost };
}

function createChargingBlock(parsed) {
    return {
        day: parsed.day,
        datePart: parsed.datePart,
        time_from: parsed.hm,
        time_to: parsed.hm,
        interval_count: 0,
        grid_import_kwh: 0,
        total_cost_czk: 0,
        last_ts: parsed.ts
    };
}

function finalizeChargingBlock(blocks, current) {
    if (!current) return;
    if (current.interval_count <= 0) return;
    const avg = current.grid_import_kwh > 0 ? (current.total_cost_czk / current.grid_import_kwh) : 0;
    blocks.push({
        day: current.day,
        time_from: current.time_from,
        time_to: current.time_to,
        interval_count: current.interval_count,
        grid_import_kwh: current.grid_import_kwh,
        total_cost_czk: current.total_cost_czk,
        avg_spot_price_czk: avg
    });
}

function applyChargingPoint(current, parsed) {
    current.interval_count += 1;
    current.grid_import_kwh += parsed.gridKwh;
    current.total_cost_czk += parsed.cost;
    current.last_ts = parsed.ts;
    current.time_to = parsed.hm;
}

function adjustBlockEndTimes(blocks) {
    blocks.forEach((b) => {
        const fromMin = parseHmToMinutes(b.time_from);
        const toMin = parseHmToMinutes(b.time_to);
        if (fromMin === null || toMin === null) return;
        const intervalMinutes = 15;
        const end = toMin + intervalMinutes;
        const endH = Math.floor(end / 60) % 24;
        const endM = end % 60;
        b.time_to = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    });
}

function buildChargingBlocksFromTimeline(rawTimeline) {
    const sorted = normalizeChargingTimeline(rawTimeline);
    if (!sorted.length) return [];

    const todayKey = getLocalDateKey(new Date());
    const blocks = [];
    let current = null;

    sorted.forEach((point) => {
        const parsed = parseChargingPoint(point, todayKey);
        if (!parsed) {
            finalizeChargingBlock(blocks, current);
            current = null;
            return;
        }

        const sameDay = current?.datePart === parsed.datePart;
        const contiguous = sameDay && typeof current?.last_ts === 'string';
        if (!current || !sameDay || !contiguous) {
            finalizeChargingBlock(blocks, current);
            current = createChargingBlock(parsed);
        }

        applyChargingPoint(current, parsed);
    });

    finalizeChargingBlock(blocks, current);
    adjustBlockEndTimes(blocks);
    return blocks;
}

function computeBlocksDurationMinutes(blocks) {
    if (!Array.isArray(blocks) || blocks.length === 0) return 0;
    let total = 0;
    blocks.forEach((b) => {
        const a = parseHmToMinutes(b.time_from);
        const z = parseHmToMinutes(b.time_to);
        if (a === null || z === null) return;
        const delta = z - a;
        if (delta > 0) total += delta;
    });
    return total;
}

async function updateGridChargingPlan() {
    const gridChargingData = await getSensorString(getSensorId('grid_charging_planned'));
    const isPlanned = gridChargingData.value === 'on';
    const context = await buildChargingPlanContext(gridChargingData);

    updateChargingRow('grid-charging-current-row', 'grid-charging-current', context.runningBlock, !!context.runningBlock);
    updateChargingRow('grid-charging-next-row', 'grid-charging-next', context.upcomingBlock, !!context.shouldShowNext);

    toggleGridChargingIndicator(isPlanned);
    updateChargingIndicatorTooltip(context, gridChargingData);
    updateChargingPlanSection(context.hasBlocks);
    updateChargingSummary(context, gridChargingData);

    await updateTargetWarningIndicator();
}

async function buildChargingPlanContext(gridChargingData) {
    const chargingBlocks = await resolveChargingBlocks(gridChargingData);
    const totals = calculateChargingTotals(gridChargingData, chargingBlocks);
    const planWindow = formatPlanWindow(chargingBlocks);
    const durationMinutes = computeBlocksDurationMinutes(chargingBlocks);
    const { runningBlock, upcomingBlock, shouldShowNext } = resolveUpcomingBlocks(chargingBlocks);
    return {
        chargingBlocks,
        planWindow,
        durationMinutes,
        runningBlock,
        upcomingBlock,
        shouldShowNext,
        hasBlocks: chargingBlocks.length > 0,
        totalEnergy: totals.totalEnergy,
        totalCost: totals.totalCost
    };
}

async function resolveChargingBlocks(gridChargingData) {
    let rawBlocks = gridChargingData.attributes?.charging_blocks || [];
    let chargingBlocks = sortChargingBlocks(rawBlocks);
    if (chargingBlocks.length > 0) {
        return chargingBlocks;
    }

    if (typeof loadBatteryTimeline !== 'function') {
        return chargingBlocks;
    }

    try {
        const timeline = await loadBatteryTimeline(typeof INVERTER_SN === 'string' ? INVERTER_SN : undefined);
        rawBlocks = buildChargingBlocksFromTimeline(timeline);
        chargingBlocks = sortChargingBlocks(rawBlocks);
    } catch (e) {
        console.warn('[GridCharging] Timeline fallback failed:', e);
    }
    return chargingBlocks;
}

function calculateChargingTotals(gridChargingData, chargingBlocks) {
    const totalEnergy = Number(gridChargingData.attributes?.total_energy_kwh)
        || chargingBlocks.reduce((sum, b) => sum + Number(b.grid_import_kwh || b.grid_charge_kwh || 0), 0);
    const totalCost = Number(gridChargingData.attributes?.total_cost_czk)
        || chargingBlocks.reduce((sum, b) => sum + Number(b.total_cost_czk || 0), 0);
    return { totalEnergy, totalCost };
}

function resolveUpcomingBlocks(chargingBlocks) {
    const runningBlock = chargingBlocks.find(block => {
        const status = (block.status || '').toLowerCase();
        return status === 'running' || status === 'active';
    });
    const upcomingBlock = runningBlock
        ? chargingBlocks[chargingBlocks.indexOf(runningBlock) + 1] || null
        : chargingBlocks[0] || null;
    const shouldShowNext = !!(upcomingBlock && (!runningBlock || upcomingBlock !== runningBlock));
    return { runningBlock, upcomingBlock, shouldShowNext };
}

function updateChargingIndicatorTooltip(context, gridChargingData) {
    const indicator = document.getElementById('battery-grid-charging-indicator');
    if (!indicator) return;

    if (context.hasBlocks) {
        const planSummary = context.planWindow || gridChargingData.attributes?.next_charging_time_range || '--';
        const tooltipHtml = buildChargingPlanTooltip(planSummary, context.chargingBlocks, context.totalEnergy, context.totalCost);
        indicator.dataset.tooltipHtml = tooltipHtml;
    } else {
        indicator.dataset.tooltip = 'Žádné plánované nabíjení';
    }

    initTooltips();
}

function buildChargingPlanTooltip(planSummary, chargingBlocks, totalEnergy, totalCost) {
    let tooltipHtml = `
        <div class="grid-charging-popup">
            <strong>Období:</strong> ${planSummary}<br>
            <strong>Plánované dobití:</strong> ${totalEnergy.toFixed(1)} kWh<br>
            <strong>Celková cena:</strong> ~${totalCost.toFixed(2)} Kč
            <hr style="margin: 8px 0; border: none; border-top: 1px solid var(--border-secondary);">
            <table>
                <thead>
                    <tr>
                        <th>Čas</th>
                        <th style="text-align: right;">kWh</th>
                        <th style="text-align: right;">Kč</th>
                    </tr>
                </thead>
                <tbody>
    `;

    chargingBlocks.forEach((block) => {
        const dayLabel = block.day === 'tomorrow' ? ' (zítra)' : '';
        const timeRange = `${block.time_from}-${block.time_to}${dayLabel}`;
        const energyValue = getBlockEnergyKwh(block);
        const costValue = Number(block.total_cost_czk) || 0;

        tooltipHtml += `
            <tr>
                <td>${timeRange}</td>
                <td style="text-align: right;">${energyValue.toFixed(2)}</td>
                <td style="text-align: right;">${costValue.toFixed(2)}</td>
            </tr>
        `;
    });

    tooltipHtml += `
                </tbody>
            </table>
        </div>
    `;
    return tooltipHtml;
}

function toggleGridChargingIndicator(isPlanned) {
    const indicator = document.getElementById('battery-grid-charging-indicator');
    if (!indicator) return;
    if (isPlanned) {
        indicator.classList.add('active');
    } else {
        indicator.classList.remove('active');
    }
}

function updateChargingPlanSection(hasBlocks) {
    const section = document.getElementById('grid-charging-plan-section');
    if (section) {
        section.style.display = hasBlocks ? 'block' : 'none';
    }
}

function updateChargingSummary(context, gridChargingData) {
    const windowElement = document.getElementById('grid-charging-window');
    const durationElement = document.getElementById('grid-charging-duration');
    const windowRow = document.getElementById('grid-charging-window-row');
    const durationRow = document.getElementById('grid-charging-duration-row');
    if (windowElement && windowRow) {
        windowRow.style.display = context.hasBlocks ? 'flex' : 'none';
        windowElement.textContent = context.hasBlocks
            ? (context.planWindow || gridChargingData.attributes?.next_charging_time_range || '--')
            : '--';
    }
    if (durationElement && durationRow) {
        durationRow.style.display = context.hasBlocks ? 'flex' : 'none';
        durationElement.textContent = context.hasBlocks ? formatDurationMinutes(context.durationMinutes) : '--';
    }

    const energyElement = document.getElementById('grid-charging-energy');
    if (energyElement) {
        energyElement.textContent = context.totalEnergy.toFixed(1) + ' kWh';
    }

    const costElement = document.getElementById('grid-charging-cost');
    if (costElement) {
        costElement.textContent = '~' + context.totalCost.toFixed(2) + ' Kč';
    }
}

async function updateBatteryBalancingCard() {
    try {
        const balancingData = await getSensorString(getSensorId('battery_balancing'));
        const context = buildBalancingContext(balancingData);
        if (!context) {
            console.warn('[Balancing] No balancing data available');
            return;
        }

        console.debug('[Balancing] Sensor data:', {
            state: context.status,
            daysSince: context.daysSince,
            intervalDays: context.intervalDays,
            lastBalancing: context.attrs.last_balancing,
            costImmediate: context.costImmediate,
            costSelected: context.costSelected,
            costSavings: context.costSavings,
            planned: !!context.planned
        });

        updateBalancingStatusLabel(context);
        updateBalancingCardTitle(context);
        updateBalancingDays(context);
        updateBalancingLastDate(context);
        updateBalancingPlannedRow(context);
        updateBalancingTimeline(context);

        if (typeof initTooltips === 'function') {
            initTooltips();
        }

        updateBatteryBalancingIndicator(context.currentState, context.timeRemaining, context.costSelected);
    } catch (error) {
        console.error('[Balancing] Error updating battery balancing card:', error);
    }
}

function buildBalancingContext(balancingData) {
    if (!balancingData?.attributes) return null;
    const attrs = balancingData.attributes;
    const rawState = balancingData.state;
    const status = resolveBalancingStatus(rawState, attrs.status);
    const daysSince = attrs.days_since_last ?? null;
    const intervalDays = attrs.cycle_days ?? 7;
    const holdingHours = attrs.holding_hours ?? 3;
    const socThreshold = attrs.soc_threshold ?? 80;
    const lastBalancing = attrs.last_balancing ? new Date(attrs.last_balancing) : null;
    const planned = attrs.planned;
    const currentState = resolveBalancingState(attrs.current_state);
    const timeRemaining = attrs.time_remaining;
    const costs = getBalancingCosts(attrs);
    const hasDaysSince = Number.isFinite(daysSince);
    const daysRemaining = hasDaysSince ? Math.max(0, intervalDays - daysSince) : null;
    const statusColor = getBalancingStatusColor(status);
    const stateText = getBalancingStateText(currentState);
    const stateColor = getBalancingStateColor(currentState);

    return {
        attrs,
        status,
        daysSince,
        intervalDays,
        holdingHours,
        socThreshold,
        lastBalancing,
        planned,
        currentState,
        timeRemaining,
        daysRemaining,
        statusColor,
        stateText,
        stateColor,
        costImmediate: costs.costImmediate,
        costSelected: costs.costSelected,
        costSavings: costs.costSavings
    };
}

function resolveBalancingStatus(rawState, fallbackStatus) {
    if (rawState && rawState !== 'unknown' && rawState !== 'unavailable') {
        return rawState;
    }
    return fallbackStatus || 'ok';
}

function resolveBalancingState(rawState = 'standby') {
    const state = rawState;
    if (state && state !== 'unknown' && state !== 'unavailable') {
        return state;
    }
    return 'standby';
}

function getBalancingCosts(attrs) {
    const costImmediate = Number.isFinite(Number(attrs.cost_immediate_czk))
        ? Number(attrs.cost_immediate_czk)
        : null;
    const costSelected = Number.isFinite(Number(attrs.cost_selected_czk))
        ? Number(attrs.cost_selected_czk)
        : null;
    const costSavings = Number.isFinite(Number(attrs.cost_savings_czk))
        ? Number(attrs.cost_savings_czk)
        : null;
    return { costImmediate, costSelected, costSavings };
}

function getBalancingStatusColor(status) {
    const statusColors = {
        ok: '#4CAF50',
        due_soon: '#FFC107',
        critical: '#FF9800',
        overdue: '#F44336',
        disabled: '#757575'
    };
    return statusColors[status] || '#757575';
}

function getBalancingStateText(state) {
    const stateTexts = {
        charging: 'Příprava na 100%',
        balancing: 'Vyrovnávání článků',
        completed: 'Vybalancováno',
        planned: 'Čeká na zahájení',
        standby: 'Standby'
    };
    return stateTexts[state] || state;
}

function getBalancingStateColor(state) {
    const stateColors = {
        charging: '#FFC107',
        balancing: '#FF9800',
        completed: '#4CAF50',
        planned: '#2196F3',
        standby: '#757575'
    };
    return stateColors[state] || '#757575';
}

function updateBalancingStatusLabel(context) {
    const statusLabel = document.getElementById('balancing-status-label');
    if (!statusLabel) return;

    const suffix = buildBalancingStatusSuffix(context.currentState, context.timeRemaining);
    statusLabel.textContent = suffix ? `${context.stateText} ${suffix}` : context.stateText;
    statusLabel.style.color = context.stateColor;
}

function buildBalancingStatusSuffix(state, timeRemaining) {
    if (!timeRemaining) return '';
    if (state === 'charging') return `(${timeRemaining} do balancování)`;
    if (state === 'balancing') return `(zbývá ${timeRemaining})`;
    if (state === 'planned') return `(start za ${timeRemaining})`;
    if (state === 'completed') return `${timeRemaining}`;
    return '';
}

function updateBalancingCardTitle(context) {
    const cardTitle = document.getElementById('balancing-card-title');
    if (!cardTitle) return;

    const titleMap = {
        balancing: { text: '⚡ Probíhá balancování', color: '#FF9800' },
        charging: { text: '🔋 Příprava na balancování', color: '#FFC107' },
        completed: { text: '✅ Balancování dokončeno', color: '#4CAF50' },
        planned: { text: '📅 Balancování naplánováno', color: '#2196F3' }
    };
    const fallback = { text: '🔋 Vyrovnání baterie', color: '#FF9800' };
    const title = titleMap[context.currentState] || fallback;
    cardTitle.textContent = title.text;
    cardTitle.style.color = title.color;
}

function updateBalancingDays(context) {
    const daysNumber = document.getElementById('balancing-days-number');
    const daysUnit = document.getElementById('balancing-days-unit');
    if (!daysNumber) return;

    if (context.daysRemaining === null) {
        daysNumber.textContent = '?';
        daysNumber.style.color = '#757575';
        if (daysUnit) daysUnit.textContent = 'dní';
        return;
    }

    daysNumber.textContent = context.daysRemaining;
    daysNumber.style.color = context.statusColor;
    if (!daysUnit) return;
    if (context.daysRemaining === 1) {
        daysUnit.textContent = 'den';
    } else if (context.daysRemaining >= 2 && context.daysRemaining <= 4) {
        daysUnit.textContent = 'dny';
    } else {
        daysUnit.textContent = 'dní';
    }
}

function updateBalancingLastDate(context) {
    const lastDateShort = document.getElementById('balancing-last-date-short');
    if (!lastDateShort) return;
    if (context.lastBalancing) {
        const dateStr = context.lastBalancing.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' });
        lastDateShort.textContent = `${dateStr} (${context.daysSince}d)`;
    } else {
        lastDateShort.textContent = 'Žádné';
    }
}

function updateBalancingPlannedRow(context) {
    const plannedShort = document.getElementById('balancing-planned-short');
    const plannedTimeShort = document.getElementById('balancing-planned-time-short');
    const costValueShort = document.getElementById('balancing-cost-value-short');

    if (!plannedShort) return;
    if (!context.planned || !plannedTimeShort || !costValueShort) {
        plannedShort.style.display = 'none';
        if (costValueShort) costValueShort.textContent = '--';
        return;
    }

    plannedShort.style.display = 'flex';
    const timeInfo = buildBalancingPlanTimes(context.planned);
    plannedTimeShort.textContent = `dnes ${timeInfo.startStr}`;
    plannedTimeShort.dataset.tooltipHtml = buildBalancingPlanTooltip(timeInfo, context);
    updateBalancingCostDisplay(costValueShort, context);
}

function buildBalancingPlanTimes(planned) {
    const startTime = new Date(planned.holding_start);
    const endTime = new Date(planned.holding_end);
    return {
        startStr: startTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
        endStr: endTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
        chargingIntervals: planned.charging_intervals || [],
        chargingAvgPrice: planned.charging_avg_price_czk || 0
    };
}

function buildBalancingPlanTooltip(timeInfo, context) {
    let tooltipHTML = '<div style="text-align: left; font-size: 11px; min-width: 200px; max-width: 250px;">';
    tooltipHTML += '<strong style="display: block; margin-bottom: 8px; font-size: 12px; color: #FFA726;">🔋 Plán balancování</strong>';
    tooltipHTML += buildChargingIntervalsSection(timeInfo.chargingIntervals, timeInfo.chargingAvgPrice);
    tooltipHTML += buildBalancingHoldSection(timeInfo.startStr, timeInfo.endStr, context.attrs.config?.hold_hours ?? 3);
    tooltipHTML += buildBalancingCostSection(context.costSelected, context.costImmediate, context.costSavings);
    tooltipHTML += '</div>';
    return tooltipHTML;
}

function buildChargingIntervalsSection(chargingIntervals, chargingAvgPrice) {
    if (!chargingIntervals.length) return '';
    let html = '<div style="margin-bottom: 10px;">';
    html += '<div style="font-weight: 600; margin-bottom: 4px; color: rgba(255,255,255,0.9);">📊 Příprava (nabíjení na 100%)</div>';
    html += '<table style="width: 100%; border-collapse: collapse; margin-left: 8px;">';

    const now = new Date();
    const todayDate = now.getDate();
    const chargingTimes = chargingIntervals.map(t => {
        const time = new Date(t);
        const timeStr = time.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        const isTomorrow = time.getDate() !== todayDate;
        return isTomorrow ? `zítra ${timeStr}` : timeStr;
    });

    html += '<tr><td style="padding: 2px 4px; color: rgba(255,255,255,0.7); vertical-align: top;">Intervaly:</td>';
    html += `<td style="padding: 2px 4px; text-align: right; line-height: 1.4;">${chargingTimes.join('<br>')}</td></tr>`;
    html += '<tr><td style="padding: 2px 4px; color: rgba(255,255,255,0.7);">Průměrná cena:</td>';
    html += `<td style="padding: 2px 4px; text-align: right;">${chargingAvgPrice.toFixed(2)} Kč/kWh</td></tr>`;
    html += '</table>';
    html += '</div>';
    return html;
}

function buildBalancingHoldSection(startStr, endStr, holdHours) {
    let html = '<div style="margin-bottom: 10px;">';
    html += '<div style="font-weight: 600; margin-bottom: 4px; color: rgba(255,255,255,0.9);">⚡ Balancování (držení na 100%)</div>';
    html += '<table style="width: 100%; border-collapse: collapse; margin-left: 8px;">';
    html += '<tr><td style="padding: 2px 4px; color: rgba(255,255,255,0.7);">Začátek:</td>';
    html += `<td style="padding: 2px 4px; text-align: right;">${startStr}</td></tr>`;
    html += '<tr><td style="padding: 2px 4px; color: rgba(255,255,255,0.7);">Konec:</td>';
    html += `<td style="padding: 2px 4px; text-align: right;">${endStr}</td></tr>`;
    html += '<tr><td style="padding: 2px 4px; color: rgba(255,255,255,0.7);">Délka:</td>';
    html += `<td style="padding: 2px 4px; text-align: right;">${holdHours} hodiny</td></tr>`;
    html += '</table>';
    html += '</div>';
    return html;
}

function buildBalancingCostSection(costSelected, costImmediate, costSavings) {
    if (costSelected === null || costSelected === undefined) return '';
    let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 8px;">';
    html += '<thead><tr style="border-bottom: 1px solid rgba(255,255,255,0.2);">';
    html += '<th style="padding: 4px; text-align: left; color: rgba(255,255,255,0.9);">💰 Náklady</th>';
    html += '<th style="padding: 4px; text-align: right;"></th>';
    html += '</tr></thead>';
    html += '<tbody>';
    html += '<tr><td style="padding: 2px 4px; color: rgba(255,255,255,0.7);">Vybraný plán:</td>';
    html += `<td style="padding: 2px 4px; text-align: right;">${costSelected.toFixed(2)} Kč</td></tr>`;
    if (costImmediate !== null) {
        html += '<tr><td style="padding: 2px 4px; color: rgba(255,255,255,0.7);">Okamžitě:</td>';
        html += `<td style="padding: 2px 4px; text-align: right;">${costImmediate.toFixed(2)} Kč</td></tr>`;
    }
    if (costSavings !== null && costSavings > 0) {
        html += '<tr style="color: #4CAF50;"><td style="padding: 2px 4px;">Úspora:</td>';
        html += `<td style="padding: 2px 4px; text-align: right;">${costSavings.toFixed(2)} Kč</td></tr>`;
    }
    html += '</tbody>';
    html += '</table>';
    return html;
}

function updateBalancingCostDisplay(costValueShort, context) {
    if (context.costSelected !== null) {
        costValueShort.textContent = `${context.costSelected.toFixed(1)} Kč`;
        if (context.costSavings !== null && context.costSavings > 0) {
            costValueShort.textContent += ` (-${context.costSavings.toFixed(1)} Kč)`;
            costValueShort.title = `Vybraná cena: ${context.costSelected.toFixed(2)} Kč\nÚspora oproti okamžitému: ${context.costSavings.toFixed(2)} Kč`;
            costValueShort.style.color = '#4CAF50';
        } else {
            costValueShort.title = `Odhadované náklady: ${context.costSelected.toFixed(2)} Kč`;
            costValueShort.style.color = 'var(--text-primary)';
        }
        return;
    }

    const avgPrice = context.planned?.avg_price_czk ?? 0;
    const estimatedCost = avgPrice * context.holdingHours * 0.7;
    costValueShort.textContent = `~${estimatedCost.toFixed(1)} Kč`;
    costValueShort.title = 'Odhad (přesné náklady nejsou k dispozici)';
    costValueShort.style.color = 'var(--text-primary)';
}

function updateBalancingTimeline(context) {
    const timelineBar = document.getElementById('balancing-timeline-bar');
    const timelineLabel = document.getElementById('balancing-timeline-label');
    if (!timelineBar || !timelineLabel || context.daysSince === null) return;

    const progressPercent = Math.min(100, (context.daysSince / context.intervalDays) * 100);
    timelineBar.style.width = `${progressPercent}%`;
    timelineBar.style.background = `linear-gradient(90deg, ${context.statusColor} 0%, ${context.statusColor}aa 100%)`;
    timelineLabel.textContent = `${context.daysSince}/${context.intervalDays} dní`;
}

/**
 * Aktualizuje indikátor balancování baterie v boxu baterie
 * @param {string} state - Aktuální stav: 'charging', 'balancing', 'planned', 'standby'
 * @param {string} timeRemaining - Zbývající čas ve formátu HH:MM
 * @param {number|null} costSelected - Celkové náklady balancování
 */
function updateBatteryBalancingIndicator(state, timeRemaining, costSelected) {
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
        tooltipHtml += '<strong>🔋 Balancování baterie</strong><br><br>';

        if (state === 'charging') {
            tooltipHtml += '<strong>Fáze:</strong> Nabíjení baterie<br>';
            tooltipHtml += '<em>Baterie se nabíjí před vyvažováním článků</em><br><br>';
        } else {
            tooltipHtml += '<strong>Fáze:</strong> Držení (balancování)<br>';
            tooltipHtml += '<em>Články baterie se vyvažují na stejnou úroveň</em><br><br>';
        }

        if (timeRemaining) {
            tooltipHtml += `⏱️ <strong>Zbývá:</strong> ${timeRemaining}<br>`;
        }

        if (costSelected !== null && costSelected !== undefined) {
            tooltipHtml += `<br><strong>💰 Náklady:</strong> ${costSelected.toFixed(2)} Kč<br>`;
        }

        tooltipHtml += '<br><small style="opacity: 0.7;">ℹ️ Balancování prodlužuje životnost baterie tím, že vyrovná napětí všech článků</small>';
        tooltipHtml += '</div>';

        indicator.dataset.tooltipHtml = tooltipHtml;

    } else {
        // Skrýt indikátor pokud není aktivní balancování
        indicator.style.display = 'none';
    }

    // Reinicializovat tooltips
    if (typeof initTooltips === 'function') {
        initTooltips();
    }
}

function showGridChargingPopup() {
    getSensorString(getSensorId('grid_charging_planned')).then(gridChargingData => {
        if (!gridChargingData.attributes?.charging_blocks) {
            showDialog('Plánované nabíjení ze sítě', 'Žádné bloky nejsou naplánovány.');
            return;
        }

        const blocks = sortChargingBlocks(gridChargingData.attributes.charging_blocks);
        const totalEnergy = gridChargingData.attributes?.total_energy_kwh || 0;
        const totalCost = gridChargingData.attributes?.total_cost_czk || 0;
        const planWindow = formatPlanWindow(blocks);

        // Build table HTML
        let tableHtml = `
            <div class="grid-charging-popup grid-charging-dialog">
                <div style="margin-bottom: 10px;">
                    <strong>Období:</strong> ${planWindow || '--'}<br>
                    <strong>Celková energie:</strong> ${totalEnergy.toFixed(2)} kWh<br>
                    <strong>Celková cena:</strong> ~${totalCost.toFixed(2)} Kč
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Čas</th>
                            <th style="text-align: right;">Energie</th>
                            <th style="text-align: right;">∅ Cena</th>
                            <th style="text-align: right;">Náklady</th>
                            <th style="text-align: center;">Baterie</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        blocks.forEach((block, index) => {
            const rowBg = index % 2 === 0 ? 'var(--bg-tertiary)' : 'transparent';
            const batteryStart = Number(block.battery_start_kwh);
            const batteryEnd = Number(block.battery_end_kwh);
            const batteryChange = Number.isFinite(batteryStart) && Number.isFinite(batteryEnd)
                ? `${batteryStart.toFixed(1)} → ${batteryEnd.toFixed(1)} kWh`
                : '--';
            const energyValue = getBlockEnergyKwh(block);
            const energyText = energyValue.toFixed(2) + ' kWh';
            const avgPriceValue = Number(block.avg_spot_price_czk) || 0;
            const avgPriceText = avgPriceValue > 0 ? avgPriceValue.toFixed(2) + ' Kč/kWh' : '—';
            const costValue = Number(block.total_cost_czk) || 0;
            const costText = costValue.toFixed(2) + ' Kč';
            const intervalCount = Number(block.interval_count) || 0;
            const intervalInfo = intervalCount > 0 ? `${intervalCount}× 15min` : ' ';
            const blockDay = getDayLabel(block.day);
            const daySuffix = blockDay ? ` (${blockDay})` : '';

            tableHtml += `
                <tr style="background: ${rowBg};">
                    <td>
                        <strong>${block.time_from} - ${block.time_to}${daySuffix}</strong><br>
                        <small style="opacity: 0.7;">${intervalInfo}</small>
                    </td>
                    <td style="text-align: right;">${energyText}</td>
                    <td style="text-align: right;">${avgPriceText}</td>
                    <td style="text-align: right;"><strong>${costText}</strong></td>
                    <td style="text-align: center; font-size: 0.85em;">
                        ${batteryChange}
                    </td>
                </tr>
            `;
        });

        tableHtml += `
                    </tbody>
                </table>
            </div>
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
globalThis.DashboardGridCharging = {
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
