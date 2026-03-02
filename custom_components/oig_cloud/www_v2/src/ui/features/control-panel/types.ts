/**
 * OIG Cloud V2 — Control Panel Types
 *
 * Complete type system for shield integration, box/grid/boiler mode control,
 * queue management, and confirmation dialogs.
 *
 * Port of V1 shield.js type structures.
 */

// ============================================================================
// BOX MODE
// ============================================================================

export type BoxMode = 'home_1' | 'home_2' | 'home_3' | 'home_ups' | 'home_5' | 'home_6';

export const BOX_MODE_LABELS: Record<BoxMode, string> = {
  home_1: 'Home 1',
  home_2: 'Home 2',
  home_3: 'Home 3',
  home_ups: 'Home UPS',
  home_5: 'Home 5',
  home_6: 'Home 6',

/** V1 sensor value → BoxMode mapping */
export const BOX_MODE_SENSOR_MAP: Record<string, BoxMode> = {
  'Home 1': 'home_1',
  'Home 2': 'home_2',
  'Home 3': 'home_3',
  'Home UPS': 'home_ups',
  'Mode 0': 'home_1',
  'Mode 1': 'home_2',
  'Mode 2': 'home_3',
  'Mode 3': 'home_ups',
  'HOME I': 'home_1',
  'HOME II': 'home_2',
  'HOME III': 'home_3',
  'HOME UPS': 'home_ups',
  '0': 'home_1',
  '1': 'home_2',
  '2': 'home_3',
  '3': 'home_ups',
};

/** BoxMode → service call mode value */
export const BOX_MODE_SERVICE_MAP: Record<BoxMode, string> = {
  home_1: 'Home 1',
  home_2: 'Home 2',
  home_3: 'Home 3',
  home_ups: 'Home UPS',
  home_5: 'Home 5',
  home_6: 'Home 6',

// ============================================================================
// GRID DELIVERY
// ============================================================================

export type GridDelivery = 'off' | 'on' | 'limited';

export const GRID_DELIVERY_LABELS: Record<GridDelivery, string> = {
  off: 'Vypnuto',
  on: 'Zapnuto',
  limited: 'S omezením',
};

/** Service call mode labels */
export const GRID_DELIVERY_SERVICE_MAP: Record<GridDelivery, string> = {
  off: 'Vypnuto / Off',
  on: 'Zapnuto / On',
  limited: 'S omezením / Limited',
};

/** V1 sensor value → GridDelivery mapping */
export const GRID_DELIVERY_SENSOR_MAP: Record<string, GridDelivery> = {
  'Vypnuto': 'off',
  'Zapnuto': 'on',
  'Omezeno': 'limited',
  'Off': 'off',
  'On': 'on',
  'Limited': 'limited',
};

export const GRID_DELIVERY_ICONS: Record<GridDelivery, string> = {
  off: '\u{1F6AB}',   // 🚫
  on: '\u{1F4A7}',    // 💧
  limited: '\u{1F6B0}', // 🚰
};

// ============================================================================
// BOILER MODE
// ============================================================================

export type BoilerMode = 'cbb' | 'manual';

export const BOILER_MODE_LABELS: Record<BoilerMode, string> = {
  cbb: 'Inteligentní',
  manual: 'Manuální',
};

export const BOILER_MODE_ICONS: Record<BoilerMode, string> = {
  cbb: '\u{1F916}',    // 🤖
  manual: '\u{1F464}', // 👤
};

/** V1 sensor value → BoilerMode mapping */
export const BOILER_MODE_SENSOR_MAP: Record<string, BoilerMode> = {
  'CBB': 'cbb',
  'Manuální': 'manual',
  'Manual': 'manual',
  'Inteligentní': 'cbb',
};

/** BoilerMode → service call mode value */
export const BOILER_MODE_SERVICE_MAP: Record<BoilerMode, string> = {
  cbb: 'CBB',
  manual: 'Manual',
};

// ============================================================================
// BUTTON STATES
// ============================================================================

export type ButtonState = 'idle' | 'active' | 'pending' | 'processing' | 'disabled-by-service';

// ============================================================================
// SHIELD QUEUE
// ============================================================================

export interface ShieldQueueItem {
  id: string;
  type: 'mode_change' | 'grid_delivery' | 'grid_limit' | 'boiler_mode' | 'battery_formating';
  status: 'queued' | 'running';
  service: string;
  targetValue: string;
  changes: string[];
  createdAt: string;
  position: number;
}

export const QUEUE_STATUS_COLORS: Record<ShieldQueueItem['status'], string> = {
  queued: '#ff9800',
  running: '#2196f3',
};

export const QUEUE_SERVICE_MAP: Record<string, string> = {
  'set_box_mode': '\u{1F3E0} Změna režimu boxu',       // 🏠
  'set_grid_delivery': '\u{1F4A7} Změna nastavení přetoků', // 💧
  'set_grid_delivery_limit': '\u{1F522} Změna limitu přetoků', // 🔢
  'set_boiler_mode': '\u{1F525} Změna nastavení bojleru',   // 🔥
  'set_formating_mode': '\u{1F50B} Změna nabíjení baterie', // 🔋
  'set_battery_capacity': '\u26A1 Změna kapacity baterie',  // ⚡
};

export const QUEUE_VALUE_MAP: Record<string, string> = {
  'CBB': 'Inteligentní',
  'Manual': 'Manuální',
  'Manuální': 'Manuální',
};

// ============================================================================
// SHIELD STATE — reactive controller state
// ============================================================================

export type ShieldServiceType = 'box_mode' | 'boiler_mode' | 'grid_mode' | 'grid_limit';

export interface ShieldState {
  /** Current shield status: idle | running */
  status: 'idle' | 'running';
  /** Current shield activity text */
  activity: string;
  /** Queue count */
  queueCount: number;
  /** Running + queued requests parsed from sensor attributes */
  runningRequests: ShieldQueueItem[];
  queuedRequests: ShieldQueueItem[];
  /** All requests combined */
  allRequests: ShieldQueueItem[];
  /** Current actual sensor values */
  currentBoxMode: BoxMode;
  currentGridDelivery: GridDelivery;
  currentGridLimit: number;
  currentBoilerMode: BoilerMode;
  /** Per-service pending targets (from shield activity sensor attributes) */
  pendingServices: Map<ShieldServiceType, string>;
  /** Which service types are currently being changed */
  changingServices: Set<ShieldServiceType>;
}

export const EMPTY_SHIELD_STATE: ShieldState = {
  status: 'idle',
  activity: '',
  queueCount: 0,
  runningRequests: [],
  queuedRequests: [],
  allRequests: [],
  currentBoxMode: 'home_1',
  currentGridDelivery: 'off',
  currentGridLimit: 0,
  currentBoilerMode: 'cbb',
  pendingServices: new Map(),
  changingServices: new Set(),
};

// ============================================================================
// BATTERY CHARGE (kept from original)
// ============================================================================

export interface BatteryChargeParams {
  targetSoc: number;
  estimatedCost: number;
  estimatedTime: number;
}

// ============================================================================
// CONFIRM DIALOG
// ============================================================================

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  warning?: string;
  /** If true, shows checkbox that must be checked before confirm */
  requireAcknowledgement?: boolean;
  acknowledgementText?: string;
  confirmText?: string;
  cancelText?: string;
  /** Extra content (e.g. limit input) */
  showLimitInput?: boolean;
  limitValue?: number;
  limitMin?: number;
  limitMax?: number;
  limitStep?: number;
}

export interface ConfirmDialogResult {
  confirmed: boolean;
  limit?: number;
}
