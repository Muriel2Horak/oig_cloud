/**
 * Flow Data — Extract all flow-related sensor data from HA state
 *
 * Complete port of V1 flow.js loadData + loadNodeDetails sensor extraction.
 * Returns a flat FlowData object with all values needed for the flow canvas.
 */

import {
  FlowData,
  FlowNode,
  FlowConnection,
  FLOW_COLORS,
  type FlowParams,
  type BalancingState,
  type GridChargingBlock,
  type GridChargingPlanData,
} from '@/ui/features/flow/types';

const params = new URLSearchParams(window.location.search);
const INVERTER_SN = params.get('sn') || params.get('inverter_sn') || '2206237016';

export function getSensorId(sensor: string): string {
  return `sensor.oig_${INVERTER_SN}_${sensor}`;
}

interface HassState {
  state: string;
  attributes?: Record<string, any>;
  last_updated?: string;
}

function parseNumber(state: HassState | null | undefined): number {
  if (!state?.state) return 0;
  const val = parseFloat(state.state);
  return isNaN(val) ? 0 : val;
}

function parseString(state: HassState | null | undefined): string {
  if (!state?.state || state.state === 'unknown' || state.state === 'unavailable') return '';
  return state.state;
}

function parseBool(state: HassState | null | undefined, onValue = 'on'): boolean {
  if (!state?.state) return false;
  const v = state.state.toLowerCase();
  return v === onValue || v === '1' || v === 'zapnuto';
}

export function parseBalancingState(raw?: string): BalancingState {
  const normalized = (raw || '').toLowerCase();
  if (normalized === 'charging') return 'charging';
  if (normalized === 'balancing') return 'holding';
  if (normalized === 'holding') return 'holding';
  if (normalized === 'completed') return 'completed';
  if (normalized === 'planned') return 'planned';
  return 'standby';
}

function getDayLabel(day?: string): string {
  if (day === 'tomorrow') return 'zítra';
  if (day === 'today') return 'dnes';
  return '';
}

function parseHmToMinutes(value?: string): number | null {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export function getBlockEnergyKwh(block: GridChargingBlock): number {
  const energy = Number(block.grid_import_kwh ?? block.grid_charge_kwh ?? 0);
  if (Number.isFinite(energy) && energy > 0) return energy;
  const start = Number(block.battery_start_kwh ?? 0);
  const end = Number(block.battery_end_kwh ?? 0);
  if (Number.isFinite(start) && Number.isFinite(end)) {
    return Math.max(0, end - start);
  }
  return 0;
}

function sortChargingBlocks(blocks: GridChargingBlock[] = []): GridChargingBlock[] {
  return [...blocks].sort((a, b) => {
    const dayScore = (a.day === 'tomorrow' ? 1 : 0) - (b.day === 'tomorrow' ? 1 : 0);
    if (dayScore !== 0) return dayScore;
    return (a.time_from || '').localeCompare(b.time_from || '');
  });
}

export function formatPlanWindow(blocks: GridChargingBlock[]): string | null {
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

export function computeBlocksDurationMinutes(blocks: GridChargingBlock[]): number {
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

function formatBlockLabel(block: GridChargingBlock): string {
  const label = getDayLabel(block.day);
  const prefix = label ? `${label} ` : '';
  const from = block.time_from || '--';
  const to = block.time_to || '--';
  return `${prefix}${from} - ${to}`;
}

function resolveUpcomingBlocks(blocks: GridChargingBlock[]): {
  runningBlock: GridChargingBlock | null;
  upcomingBlock: GridChargingBlock | null;
  shouldShowNext: boolean;
} {
  const runningBlock = blocks.find((block) => {
    const status = (block.status || '').toLowerCase();
    return status === 'running' || status === 'active';
  }) || null;
  const upcomingBlock = runningBlock
    ? blocks[blocks.indexOf(runningBlock) + 1] || null
    : blocks[0] || null;
  const shouldShowNext = !!(upcomingBlock && (!runningBlock || upcomingBlock !== runningBlock));
  return { runningBlock, upcomingBlock, shouldShowNext };
}

export function buildGridChargingPlan(gridCharging: HassState | null): GridChargingPlanData {
  const attrs = gridCharging?.attributes || {};
  const rawBlocks = Array.isArray(attrs.charging_blocks) ? attrs.charging_blocks : [];
  const blocks = sortChargingBlocks(rawBlocks as GridChargingBlock[]);
  const totalsFromAttrs = Number(attrs.total_energy_kwh) || 0;
  const totalEnergyKwh = totalsFromAttrs > 0
    ? totalsFromAttrs
    : blocks.reduce((sum, b) => sum + getBlockEnergyKwh(b), 0);
  const totalsCostAttrs = Number(attrs.total_cost_czk) || 0;
  const totalCostCzk = totalsCostAttrs > 0
    ? totalsCostAttrs
    : blocks.reduce((sum, b) => sum + Number(b.total_cost_czk || 0), 0);
  const windowLabel = formatPlanWindow(blocks);
  const durationMinutes = computeBlocksDurationMinutes(blocks);
  const { runningBlock, upcomingBlock, shouldShowNext } = resolveUpcomingBlocks(blocks);

  return {
    hasBlocks: blocks.length > 0,
    totalEnergyKwh,
    totalCostCzk,
    windowLabel,
    durationMinutes,
    currentBlockLabel: runningBlock ? formatBlockLabel(runningBlock) : null,
    nextBlockLabel: shouldShowNext && upcomingBlock ? formatBlockLabel(upcomingBlock) : null,
    blocks,
  };
}

/**
 * Extract ALL flow data from hass.states — covers both loadData() and loadNodeDetails() from V1
 */
export function extractFlowData(hass: any): FlowData {
  const states = hass?.states || {};
  const get = (sensor: string): HassState | null => states[getSensorId(sensor)] || null;

  // Solar — main
  const solarP1 = parseNumber(get('actual_fv_p1'));
  const solarP2 = parseNumber(get('actual_fv_p2'));
  // Solar — details
  const solarV1 = parseNumber(get('extended_fve_voltage_1'));
  const solarV2 = parseNumber(get('extended_fve_voltage_2'));
  const solarI1 = parseNumber(get('extended_fve_current_1'));
  const solarI2 = parseNumber(get('extended_fve_current_2'));
  const solarForecast = get('solar_forecast');
  const forecastToday = solarForecast?.attributes?.today_total_kwh
    ? parseFloat(solarForecast.attributes.today_total_kwh) || 0
    : (solarForecast?.attributes?.today_total_sum_kw
      ? parseFloat(solarForecast.attributes.today_total_sum_kw) || 0
      : parseNumber(solarForecast));
  const forecastTomorrow = solarForecast?.attributes?.tomorrow_total_sum_kw
    ? parseFloat(solarForecast.attributes.tomorrow_total_sum_kw) || 0
    : (solarForecast?.attributes?.total_tomorrow_kwh
      ? parseFloat(solarForecast.attributes.total_tomorrow_kwh) || 0
      : 0);

  // Battery — main
  const batterySoC = parseNumber(get('batt_bat_c'));
  const batteryPower = parseNumber(get('batt_batt_comp_p'));
  // Battery — details
  const batteryVoltage = parseNumber(get('extended_battery_voltage'));
  const batteryCurrent = parseNumber(get('extended_battery_current'));
  const batteryTemp = parseNumber(get('extended_battery_temperature'));
  const batteryChargeTotal = parseNumber(get('computed_batt_charge_energy_today'));
  const batteryDischargeTotal = parseNumber(get('computed_batt_discharge_energy_today'));
  const batteryChargeSolar = parseNumber(get('computed_batt_charge_fve_energy_today'));
  const batteryChargeGrid = parseNumber(get('computed_batt_charge_grid_energy_today'));
  const gridCharging = get('grid_charging_planned');
  const isGridCharging = parseBool(gridCharging);
  const timeToEmpty = parseString(get('time_to_empty'));
  const timeToFull = parseString(get('time_to_full'));
  const balancing = get('battery_balancing');
  const balancingState = parseBalancingState(balancing?.attributes?.current_state);
  const balancingTimeRemaining = parseString({ state: balancing?.attributes?.time_remaining } as HassState);
  const gridChargingPlan = buildGridChargingPlan(gridCharging);

  // Grid — main
  const gridPower = parseNumber(get('actual_aci_wtotal'));
  // Grid — details
  const gridVoltage = parseNumber(get('extended_grid_voltage'));
  const gridFrequency = parseNumber(get('ac_in_aci_f'));
  const gridImportToday = parseNumber(get('ac_in_ac_ad'));
  const gridExportToday = parseNumber(get('ac_in_ac_pd'));
  const gridL1V = parseNumber(get('ac_in_aci_vr'));
  const gridL2V = parseNumber(get('ac_in_aci_vs'));
  const gridL3V = parseNumber(get('ac_in_aci_vt'));
  const gridL1P = parseNumber(get('actual_aci_wr'));
  const gridL2P = parseNumber(get('actual_aci_ws'));
  const gridL3P = parseNumber(get('actual_aci_wt'));
  const spotPrice = parseNumber(get('spot_price_current_15min'));
  const exportPrice = parseNumber(get('export_price_current_15min'));
  const currentTariff = parseString(get('current_tariff'));

  // House — main
  const housePower = parseNumber(get('actual_aco_p'));
  const houseTodayWh = parseNumber(get('ac_out_en_day'));
  // House — phases
  const houseL1 = parseNumber(get('ac_out_aco_pr'));
  const houseL2 = parseNumber(get('ac_out_aco_ps'));
  const houseL3 = parseNumber(get('ac_out_aco_pt'));

  // Inverter
  const inverterMode = parseString(get('box_prms_mode'));
  const inverterGridMode = parseString(get('invertor_prms_to_grid'));
  const inverterGridLimit = parseNumber(get('invertor_prm1_p_max_feed_grid'));
  const inverterTemp = parseNumber(get('box_temp'));
  const bypassStatus = parseString(get('bypass_status')) || 'off';
  const notificationsUnread = parseNumber(get('notification_count_unread'));
  const notificationsError = parseNumber(get('notification_count_error'));

  // Boiler
  const boilerIsUseState = get('boiler_is_use');
  const boilerIsUse = boilerIsUseState
    ? parseBool(boilerIsUseState) || parseString(boilerIsUseState) === 'Zapnuto'
    : false;
  const boilerPower = parseNumber(get('boiler_current_cbb_w'));
  const boilerDayEnergy = parseNumber(get('boiler_day_w'));
  const boilerManualMode = parseString(get('boiler_manual_mode'));
  const boilerInstallPower = parseNumber(get('boiler_install_power')) || 3000;

  // Last update
  const realDataUpdate = get('real_data_update');
  const lastUpdate = parseString(realDataUpdate);

  return {
    solarPower: solarP1 + solarP2,
    solarP1, solarP2, solarV1, solarV2, solarI1, solarI2,
    solarPercent: parseNumber(get('dc_in_fv_proc')),
    solarToday: parseNumber(get('dc_in_fv_ad')),
    solarForecastToday: forecastToday,
    solarForecastTomorrow: forecastTomorrow,

    batterySoC, batteryPower, batteryVoltage, batteryCurrent, batteryTemp,
    batteryChargeTotal, batteryDischargeTotal, batteryChargeSolar, batteryChargeGrid,
    isGridCharging, timeToEmpty, timeToFull, balancingState, balancingTimeRemaining, gridChargingPlan,

    gridPower, gridVoltage, gridFrequency, gridImportToday, gridExportToday,
    gridL1V, gridL2V, gridL3V, gridL1P, gridL2P, gridL3P,
    spotPrice, exportPrice, currentTariff,

    housePower, houseTodayWh, houseL1, houseL2, houseL3,

    inverterMode, inverterGridMode, inverterGridLimit, inverterTemp,
    bypassStatus, notificationsUnread, notificationsError,

    boilerIsUse, boilerPower, boilerDayEnergy, boilerManualMode, boilerInstallPower,

    plannerAutoMode: null, // Loaded async via PlannerState
    lastUpdate,
  };
}

// ============================================================================
// Build flow nodes for canvas (preserves old API for connection drawing)
// ============================================================================

export function buildFlowNodes(data: FlowData): FlowNode[] {
  return [
    {
      id: 'solar', type: 'solar', x: 20, y: 20, width: 140, height: 100,
      label: 'Solar', power: data.solarPower,
      data: {
        percent: data.solarPercent,
        today: data.solarToday / 1000,
        p1: data.solarP1, p2: data.solarP2,
        v1: data.solarV1, v2: data.solarV2,
        i1: data.solarI1, i2: data.solarI2,
        forecastToday: data.solarForecastToday,
        forecastTomorrow: data.solarForecastTomorrow,
      },
    },
    {
      id: 'battery', type: 'battery', x: 20, y: 150, width: 140, height: 100,
      label: 'Baterie', power: data.batteryPower,
      data: {
        soc: data.batterySoC,
        voltage: data.batteryVoltage,
        current: data.batteryCurrent,
        temp: data.batteryTemp,
        isCharging: data.batteryPower > 10,
        isGridCharging: data.isGridCharging,
        timeToEmpty: data.timeToEmpty,
        timeToFull: data.timeToFull,
        chargeTotal: data.batteryChargeTotal,
        dischargeTotal: data.batteryDischargeTotal,
        chargeSolar: data.batteryChargeSolar,
        chargeGrid: data.batteryChargeGrid,
      },
    },
    {
      id: 'inverter', type: 'inverter', x: 200, y: 85, width: 140, height: 100,
      label: 'Střídač', power: Math.abs(data.solarPower) + Math.abs(data.batteryPower) + Math.abs(data.gridPower),
      data: {
        mode: data.inverterMode,
        gridMode: data.inverterGridMode,
        gridLimit: data.inverterGridLimit,
        temp: data.inverterTemp,
        bypassStatus: data.bypassStatus,
        notificationsUnread: data.notificationsUnread,
        notificationsError: data.notificationsError,
      },
    },
    {
      id: 'grid', type: 'grid', x: 380, y: 20, width: 140, height: 100,
      label: 'Síť', power: data.gridPower,
      data: {
        voltage: data.gridVoltage,
        frequency: data.gridFrequency,
        isImport: data.gridPower > 50,
        isExport: data.gridPower < -50,
        importToday: data.gridImportToday,
        exportToday: data.gridExportToday,
        l1v: data.gridL1V, l2v: data.gridL2V, l3v: data.gridL3V,
        l1p: data.gridL1P, l2p: data.gridL2P, l3p: data.gridL3P,
        spotPrice: data.spotPrice,
        exportPrice: data.exportPrice,
        tariff: data.currentTariff,
      },
    },
    {
      id: 'house', type: 'house', x: 380, y: 150, width: 140, height: 100,
      label: 'Spotřeba', power: data.housePower,
      data: {
        todayKWh: data.houseTodayWh / 1000,
        l1: data.houseL1, l2: data.houseL2, l3: data.houseL3,
        boilerIsUse: data.boilerIsUse,
        boilerPower: data.boilerPower,
        boilerDayEnergy: data.boilerDayEnergy,
        boilerManualMode: data.boilerManualMode,
      },
    },
  ];
}

export function buildFlowConnections(data: FlowData): FlowConnection[] {
  const connections: FlowConnection[] = [];

  if (data.solarPower > 50) {
    connections.push({
      id: 'solar-inverter', from: 'solar', to: 'inverter',
      power: data.solarPower, direction: 'forward',
    });
  }

  if (Math.abs(data.batteryPower) > 50) {
    connections.push({
      id: 'battery-inverter',
      from: data.batteryPower > 0 ? 'inverter' : 'battery',
      to: data.batteryPower > 0 ? 'battery' : 'inverter',
      power: Math.abs(data.batteryPower), direction: 'bidirectional',
    });
  }

  if (Math.abs(data.gridPower) > 50) {
    connections.push({
      id: 'grid-inverter',
      from: data.gridPower > 0 ? 'grid' : 'inverter',
      to: data.gridPower > 0 ? 'inverter' : 'grid',
      power: Math.abs(data.gridPower), direction: 'bidirectional',
    });
  }

  if (data.housePower > 50) {
    connections.push({
      id: 'inverter-house', from: 'inverter', to: 'house',
      power: data.housePower, direction: 'forward',
    });
  }

  return connections;
}

// ============================================================================
// Particle flow calculations — port of V1 calculateFlowParams + source builders
// ============================================================================

const speedCache: Record<string, number> = {};

export function calculateFlowParams(power: number, maximum: number, flowKey?: string): FlowParams {
  const absPower = Math.abs(power);
  const intensity = Math.min(100, (absPower / maximum) * 100);
  const targetSpeed = Math.max(500, Math.round(3500 - intensity * 30));

  let finalSpeed = targetSpeed;
  if (flowKey && speedCache[flowKey] !== undefined) {
    const alpha = 0.3;
    finalSpeed = Math.round(alpha * targetSpeed + (1 - alpha) * speedCache[flowKey]);
    if (Math.abs(finalSpeed - speedCache[flowKey]) < 100) {
      finalSpeed = speedCache[flowKey];
    }
  }
  if (flowKey) speedCache[flowKey] = finalSpeed;

  return {
    active: absPower >= 50,
    intensity,
    count: Math.max(1, Math.min(4, Math.ceil(1 + intensity / 33))),
    speed: finalSpeed,
    size: Math.round(6 + intensity / 10),
    opacity: Math.min(1, 0.3 + intensity / 150),
  };
}

// ============================================================================
// Color helpers
// ============================================================================

export function getFlowDataColor(type: string, isExport = false): string {
  switch (type) {
    case 'solar': return FLOW_COLORS.solar;
    case 'battery': return FLOW_COLORS.battery;
    case 'grid': return isExport ? FLOW_COLORS.grid_export : FLOW_COLORS.grid_import;
    case 'house': return FLOW_COLORS.house;
    default: return '#9e9e9e';
  }
}

// ============================================================================
// Format helpers (flow-specific)
// ============================================================================

export function formatPower(watts: number): string {
  const abs = Math.abs(watts);
  if (abs >= 1000) return `${(watts / 1000).toFixed(1)} kW`;
  return `${Math.round(watts)} W`;
}

export function formatEnergy(wh: number): string {
  if (wh >= 1000) return `${(wh / 1000).toFixed(2)} kWh`;
  return `${Math.round(wh)} Wh`;
}

export function getTariffDisplay(tariff: string): string {
  if (tariff === 'VT' || tariff.includes('vysoký')) return '⚡ VT';
  if (tariff === 'NT' || tariff.includes('nízký')) return '🌙 NT';
  return tariff ? `⏰ ${tariff}` : '--';
}

export function getHouseModeInfo(boxMode: string): { icon: string; text: string } {
  if (boxMode.includes('Home 1')) return { icon: '🏠', text: 'Home 1' };
  if (boxMode.includes('Home 2')) return { icon: '🔋', text: 'Home 2' };
  if (boxMode.includes('Home 3')) return { icon: '☀️', text: 'Home 3' };
  if (boxMode.includes('UPS')) return { icon: '⚡', text: 'Home UPS' };
  return { icon: '⚙️', text: boxMode || '--' };
}

export function getGridExportDisplay(raw: string): { display: string; icon: string } {
  if (raw === 'Vypnuto / Off') return { display: 'Vypnuto', icon: '🚫' };
  if (raw === 'Zapnuto / On') return { display: 'Zapnuto', icon: '💧' };
  if (raw.includes('Limited') || raw.includes('omezením')) return { display: 'Omezeno', icon: '🚰' };
  return { display: raw || '--', icon: '💧' };
}
