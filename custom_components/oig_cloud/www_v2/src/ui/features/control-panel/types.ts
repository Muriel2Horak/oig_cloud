export type BoxMode = 'home_1' | 'home_2' | 'home_3' | 'home_ups';

export type GridDelivery = 'off' | 'on' | 'limited';

export interface ShieldQueueItem {
  id: string;
  type: 'mode_change' | 'grid_delivery' | 'battery_charge';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  params: Record<string, any>;
  error?: string;
}

export interface BatteryChargeParams {
  targetSoc: number;
  estimatedCost: number;
  estimatedTime: number;
}

export const BOX_MODE_LABELS: Record<BoxMode, string> = {
  home_1: 'Home 1',
  home_2: 'Home 2',
  home_3: 'Home 3',
  home_ups: 'Home UPS',
};

export const GRID_DELIVERY_LABELS: Record<GridDelivery, string> = {
  off: 'Vypnuto',
  on: 'Zapnuto',
  limited: 'S omezením',
};

export const QUEUE_STATUS_COLORS: Record<ShieldQueueItem['status'], string> = {
  pending: '#ff9800',
  running: '#2196f3',
  completed: '#4caf50',
  failed: '#f44336',
};
