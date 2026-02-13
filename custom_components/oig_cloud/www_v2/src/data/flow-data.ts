import { FlowNode, FlowConnection, NODE_COLORS } from '@/ui/features/flow/types';

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

export interface FlowData {
  solarPower: number;
  solarP1: number;
  solarP2: number;
  solarPercent: number;
  solarToday: number;
  batterySoC: number;
  batteryPower: number;
  batteryVoltage: number;
  batteryCurrent: number;
  batteryTemp: number;
  gridPower: number;
  gridVoltage: number;
  housePower: number;
  inverterMode: string;
  isGridCharging: boolean;
  timeToEmpty: string;
  timeToFull: string;
}

export function extractFlowData(hass: any): FlowData {
  const states = hass?.states || {};
  
  const get = (sensor: string): HassState | null => states[getSensorId(sensor)] || null;
  
  const solarP1 = parseNumber(get('actual_fv_p1'));
  const solarP2 = parseNumber(get('actual_fv_p2'));
  
  return {
    solarPower: solarP1 + solarP2,
    solarP1,
    solarP2,
    solarPercent: parseNumber(get('dc_in_fv_proc')),
    solarToday: parseNumber(get('dc_in_fv_ad')),
    batterySoC: parseNumber(get('batt_bat_c')),
    batteryPower: parseNumber(get('batt_batt_comp_p')),
    batteryVoltage: parseNumber(get('extended_battery_voltage')),
    batteryCurrent: parseNumber(get('extended_battery_current')),
    batteryTemp: parseNumber(get('extended_battery_temperature')),
    gridPower: parseNumber(get('actual_aci_wtotal')),
    gridVoltage: parseNumber(get('extended_grid_voltage')),
    housePower: parseNumber(get('actual_aco_p')),
    inverterMode: parseString(get('box_prms_mode')),
    isGridCharging: parseString(get('grid_charging_planned')) === 'on',
    timeToEmpty: parseString(get('time_to_empty')),
    timeToFull: parseString(get('time_to_full')),
  };
}

export function buildFlowNodes(data: FlowData): FlowNode[] {
  return [
    {
      id: 'solar',
      type: 'solar',
      x: 20,
      y: 20,
      width: 140,
      height: 100,
      label: 'Solár',
      power: data.solarPower,
      data: {
        percent: data.solarPercent,
        today: data.solarToday / 1000,
      },
    },
    {
      id: 'battery',
      type: 'battery',
      x: 20,
      y: 150,
      width: 140,
      height: 100,
      label: 'Baterie',
      power: data.batteryPower,
      data: {
        soc: data.batterySoC,
        voltage: data.batteryVoltage,
        current: data.batteryCurrent,
        temp: data.batteryTemp,
        isCharging: data.batteryPower > 10,
        isGridCharging: data.isGridCharging,
        timeToEmpty: data.timeToEmpty,
        timeToFull: data.timeToFull,
      },
    },
    {
      id: 'inverter',
      type: 'inverter',
      x: 200,
      y: 85,
      width: 140,
      height: 100,
      label: 'Střídač',
      power: Math.abs(data.solarPower) + Math.abs(data.batteryPower) + Math.abs(data.gridPower),
      data: {
        mode: data.inverterMode,
      },
    },
    {
      id: 'grid',
      type: 'grid',
      x: 380,
      y: 20,
      width: 140,
      height: 100,
      label: 'Síť',
      power: data.gridPower,
      data: {
        voltage: data.gridVoltage,
        isImport: data.gridPower > 50,
        isExport: data.gridPower < -50,
      },
    },
    {
      id: 'house',
      type: 'house',
      x: 380,
      y: 150,
      width: 140,
      height: 100,
      label: 'Spotřeba',
      power: data.housePower,
      data: {},
    },
  ];
}

export function buildFlowConnections(data: FlowData): FlowConnection[] {
  const connections: FlowConnection[] = [];
  
  if (data.solarPower > 50) {
    connections.push({
      id: 'solar-inverter',
      from: 'solar',
      to: 'inverter',
      power: data.solarPower,
      direction: 'forward',
    });
  }
  
  if (Math.abs(data.batteryPower) > 50) {
    connections.push({
      id: 'battery-inverter',
      from: data.batteryPower > 0 ? 'inverter' : 'battery',
      to: data.batteryPower > 0 ? 'battery' : 'inverter',
      power: Math.abs(data.batteryPower),
      direction: 'bidirectional',
    });
  }
  
  if (Math.abs(data.gridPower) > 50) {
    connections.push({
      id: 'grid-inverter',
      from: data.gridPower > 0 ? 'grid' : 'inverter',
      to: data.gridPower > 0 ? 'inverter' : 'grid',
      power: Math.abs(data.gridPower),
      direction: 'bidirectional',
    });
  }
  
  if (data.housePower > 50) {
    connections.push({
      id: 'inverter-house',
      from: 'inverter',
      to: 'house',
      power: data.housePower,
      direction: 'forward',
    });
  }
  
  return connections;
}

export function getFlowDataColor(type: string, isExport = false): string {
  switch (type) {
    case 'solar': return '#ffd54f';
    case 'battery': return '#ff9800';
    case 'grid': return isExport ? '#4caf50' : '#f44336';
    case 'house': return '#f06292';
    default: return NODE_COLORS[type as keyof typeof NODE_COLORS] || '#9e9e9e';
  }
}
