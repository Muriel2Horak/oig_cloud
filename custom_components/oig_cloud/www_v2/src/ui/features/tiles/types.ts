export interface TileConfig {
  id: string;
  entityId: string;
  label: string;
  icon: string;
  unit?: string;
  decimals?: number;
  position: 'left' | 'right';
  order: number;
}

export interface TileData {
  id: string;
  config: TileConfig;
  value: number | string;
  state?: string;
  lastUpdated?: string;
}

export const DEFAULT_TILES: TileConfig[] = [
  { id: 'solar', entityId: 'sensor.solar_power', label: 'Solár', icon: '☀️', unit: 'W', position: 'left', order: 0 },
  { id: 'battery', entityId: 'sensor.battery_soc', label: 'Baterie', icon: '🔋', unit: '%', position: 'left', order: 1 },
  { id: 'grid', entityId: 'sensor.grid_power', label: 'Síť', icon: '🔌', unit: 'W', position: 'right', order: 0 },
  { id: 'consumption', entityId: 'sensor.house_power', label: 'Spotřeba', icon: '🏠', unit: 'W', position: 'right', order: 1 },
];
