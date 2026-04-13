/**
 * Flow Tab — Type definitions
 * Complete data model matching V1 flow.js feature set
 */

// ============================================================================
// FLOW DATA — extracted from HA sensors
// ============================================================================

/** Canonical grid delivery state - must match GridDelivery from control-panel/types.ts */
export type FlowGridDelivery = 'off' | 'on' | 'limited' | 'unknown';

export interface FlowData {
  // Solar
  solarPower: number;
  solarP1: number;
  solarP2: number;
  solarV1: number;
  solarV2: number;
  solarI1: number;
  solarI2: number;
  solarPercent: number;
  solarToday: number;      // Wh
  solarForecastToday: number;
  solarForecastTomorrow: number;

  // Battery
  batterySoC: number;
  batteryPower: number;
  batteryVoltage: number;
  batteryCurrent: number;
  batteryTemp: number;
  batteryChargeTotal: number;   // Wh today
  batteryDischargeTotal: number;
  batteryChargeSolar: number;
  batteryChargeGrid: number;
  isGridCharging: boolean;
  timeToEmpty: string;
  timeToFull: string;
  balancingState: BalancingState;
  balancingTimeRemaining: string;
  gridChargingPlan: GridChargingPlanData;

  // Grid
  gridPower: number;
  gridVoltage: number;
  gridFrequency: number;
  gridImportToday: number;   // Wh
  gridExportToday: number;   // Wh
  gridL1V: number;
  gridL2V: number;
  gridL3V: number;
  gridL1P: number;
  gridL2P: number;
  gridL3P: number;
  spotPrice: number;
  exportPrice: number;
  currentTariff: string;

  // House
  housePower: number;
  houseTodayWh: number;
  houseL1: number;
  houseL2: number;
  houseL3: number;

  // Inverter
  inverterMode: string;
  inverterGridMode: FlowGridDelivery;
  inverterGridLimit: number;
  inverterTemp: number;
  bypassStatus: string;
  notificationsUnread: number;
  notificationsError: number;

  // Boiler (in flow context)
  boilerIsUse: boolean;
  boilerPower: number;
  boilerDayEnergy: number;
  boilerManualMode: string;
  boilerInstallPower: number;

  // Planner
  plannerAutoMode: boolean | null;

  // Meta
  lastUpdate: string;
}

export type BalancingState = 'charging' | 'holding' | 'completed' | 'planned' | 'standby';

export interface GridChargingBlock {
  day?: 'today' | 'tomorrow';
  time_from?: string;
  time_to?: string;
  status?: string;
  grid_import_kwh?: number;
  grid_charge_kwh?: number;
  total_cost_czk?: number;
  battery_start_kwh?: number;
  battery_end_kwh?: number;
  interval_count?: number;
  avg_spot_price_czk?: number;
}

export interface GridChargingPlanData {
  hasBlocks: boolean;
  totalEnergyKwh: number;
  totalCostCzk: number;
  windowLabel: string | null;
  durationMinutes: number;
  currentBlockLabel: string | null;
  nextBlockLabel: string | null;
  blocks: GridChargingBlock[];
}

// ============================================================================
// FLOW NODE — visual node in flow canvas
// ============================================================================

export type FlowNodeType = 'solar' | 'battery' | 'inverter' | 'grid' | 'house';

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  power: number;
  data: Record<string, any>;
}

// ============================================================================
// FLOW CONNECTION
// ============================================================================

export interface FlowConnection {
  id: string;
  from: string;
  to: string;
  power: number;
  direction: 'forward' | 'backward' | 'bidirectional';
}

// ============================================================================
// PARTICLE SYSTEM
// ============================================================================

export interface ParticleConfig {
  color: string;
  speed: number;
  size: number;
  count: number;
  opacity: number;
}

export interface FlowParams {
  active: boolean;
  intensity: number;
  count: number;
  speed: number;
  size: number;
  opacity: number;
}

export interface ParticleSource {
  type: string;
  power: number;
  color: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const NODE_COLORS: Record<string, string> = {
  solar: '#ffd54f',
  battery: '#4caf50',
  inverter: '#9575cd',
  grid: '#42a5f5',
  house: '#f06292',
};

export const NODE_GRADIENTS: Record<string, string> = {
  solar: 'linear-gradient(135deg, rgba(255,213,79,0.15) 0%, rgba(255,179,0,0.08) 100%)',
  battery: 'linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(56,142,60,0.08) 100%)',
  grid: 'linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(33,150,243,0.08) 100%)',
  house: 'linear-gradient(135deg, rgba(240,98,146,0.15) 0%, rgba(233,30,99,0.08) 100%)',
  inverter: 'linear-gradient(135deg, rgba(149,117,205,0.15) 0%, rgba(126,87,194,0.08) 100%)',
};

export const NODE_BORDERS: Record<string, string> = {
  solar: 'rgba(255,213,79,0.4)',
  battery: 'rgba(76,175,80,0.4)',
  grid: 'rgba(66,165,245,0.4)',
  house: 'rgba(240,98,146,0.4)',
  inverter: 'rgba(149,117,205,0.4)',
};

export const FLOW_COLORS = {
  solar: '#ffd54f',
  battery: '#ff9800',
  grid_import: '#f44336',
  grid_export: '#4caf50',
  house: '#f06292',
} as const;

export const FLOW_MAXIMUMS = {
  solar: 5400,
  battery: 7000,
  grid: 17000,
  house: 10000,
} as const;

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_NODES: FlowNode[] = [
  { id: 'solar', type: 'solar', x: 20, y: 20, width: 140, height: 100, label: 'Solar', power: 0, data: {} },
  { id: 'battery', type: 'battery', x: 20, y: 150, width: 140, height: 100, label: 'Baterie', power: 0, data: { soc: 0 } },
  { id: 'inverter', type: 'inverter', x: 200, y: 85, width: 140, height: 100, label: 'Střídač', power: 0, data: { mode: '' } },
  { id: 'grid', type: 'grid', x: 380, y: 20, width: 140, height: 100, label: 'Síť', power: 0, data: {} },
  { id: 'house', type: 'house', x: 380, y: 150, width: 140, height: 100, label: 'Spotřeba', power: 0, data: {} },
];

export const DEFAULT_CONNECTIONS: FlowConnection[] = [
  { id: 'solar-inverter', from: 'solar', to: 'inverter', power: 0, direction: 'forward' },
  { id: 'battery-inverter', from: 'battery', to: 'inverter', power: 0, direction: 'bidirectional' },
  { id: 'grid-inverter', from: 'grid', to: 'inverter', power: 0, direction: 'bidirectional' },
  { id: 'inverter-house', from: 'inverter', to: 'house', power: 0, direction: 'forward' },
];

export const EMPTY_FLOW_DATA: FlowData = {
  solarPower: 0, solarP1: 0, solarP2: 0, solarV1: 0, solarV2: 0, solarI1: 0, solarI2: 0,
  solarPercent: 0, solarToday: 0, solarForecastToday: 0, solarForecastTomorrow: 0,
  batterySoC: 0, batteryPower: 0, batteryVoltage: 0, batteryCurrent: 0, batteryTemp: 0,
  batteryChargeTotal: 0, batteryDischargeTotal: 0, batteryChargeSolar: 0, batteryChargeGrid: 0,
  isGridCharging: false, timeToEmpty: '', timeToFull: '',
  balancingState: 'standby', balancingTimeRemaining: '',
  gridChargingPlan: {
    hasBlocks: false,
    totalEnergyKwh: 0,
    totalCostCzk: 0,
    windowLabel: null,
    durationMinutes: 0,
    currentBlockLabel: null,
    nextBlockLabel: null,
    blocks: [],
  },
  gridPower: 0, gridVoltage: 0, gridFrequency: 0, gridImportToday: 0, gridExportToday: 0,
  gridL1V: 0, gridL2V: 0, gridL3V: 0, gridL1P: 0, gridL2P: 0, gridL3P: 0,
  spotPrice: 0, exportPrice: 0, currentTariff: '',
  housePower: 0, houseTodayWh: 0, houseL1: 0, houseL2: 0, houseL3: 0,
  inverterMode: '', inverterGridMode: 'unknown' as FlowGridDelivery, inverterGridLimit: 0, inverterTemp: 0,
  bypassStatus: 'off', notificationsUnread: 0, notificationsError: 0,
  boilerIsUse: false, boilerPower: 0, boilerDayEnergy: 0, boilerManualMode: '', boilerInstallPower: 3000,
  plannerAutoMode: null,
  lastUpdate: '',
};
