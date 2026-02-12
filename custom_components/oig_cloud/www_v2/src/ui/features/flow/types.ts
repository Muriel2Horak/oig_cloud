export interface FlowNode {
  id: string;
  type: 'solar' | 'battery' | 'inverter' | 'grid' | 'house';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  power: number;
  data: Record<string, any>;
}

export interface FlowConnection {
  id: string;
  from: string;
  to: string;
  power: number;
  direction: 'forward' | 'backward' | 'bidirectional';
}

export interface ParticleConfig {
  color: string;
  speed: number;
  size: number;
  count: number;
}

export const NODE_COLORS = {
  solar: '#ff9800',
  battery: '#4caf50',
  inverter: '#2196f3',
  grid: '#9c27b0',
  house: '#f44336',
};

export const DEFAULT_NODES: FlowNode[] = [
  { id: 'solar', type: 'solar', x: 0, y: 0, width: 120, height: 80, label: 'Solár', power: 0, data: {} },
  { id: 'battery', type: 'battery', x: 0, y: 120, width: 120, height: 80, label: 'Baterie', power: 0, data: { soc: 0 } },
  { id: 'inverter', type: 'inverter', x: 200, y: 60, width: 120, height: 80, label: 'Střídač', power: 0, data: { mode: '' } },
  { id: 'grid', type: 'grid', x: 400, y: 0, width: 120, height: 80, label: 'Síť', power: 0, data: {} },
  { id: 'house', type: 'house', x: 400, y: 120, width: 120, height: 80, label: 'Spotřeba', power: 0, data: {} },
];

export const DEFAULT_CONNECTIONS: FlowConnection[] = [
  { id: 'solar-inverter', from: 'solar', to: 'inverter', power: 0, direction: 'forward' },
  { id: 'battery-inverter', from: 'battery', to: 'inverter', power: 0, direction: 'bidirectional' },
  { id: 'grid-inverter', from: 'grid', to: 'inverter', power: 0, direction: 'bidirectional' },
  { id: 'inverter-house', from: 'inverter', to: 'house', power: 0, direction: 'forward' },
];
