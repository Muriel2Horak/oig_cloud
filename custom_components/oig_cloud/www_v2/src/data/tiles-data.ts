/**
 * OIG Cloud V2 — Tiles Data Layer
 *
 * Manages custom configurable tiles:
 * - Load/save tile config via HA WebSocket service calls
 * - Resolve entity states for tile values
 * - Default tile configuration
 *
 * Port of V1 js/components/tiles.js data logic.
 */

import { haClient } from '@/data/ha-client';
import { getEntityStore } from '@/data/entity-store';
import { oigLog } from '@/core/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface TileSupportEntities {
  top_right?: string;
  bottom_right?: string;
}

export interface TileConfig {
  type: 'entity' | 'button';
  entity_id: string;
  label?: string;
  icon?: string;
  color?: string;
  action?: 'toggle' | 'turn_on' | 'turn_off';
  support_entities?: TileSupportEntities;
}

export interface TilesConfig {
  tiles_left: Array<TileConfig | null>;
  tiles_right: Array<TileConfig | null>;
  left_count: number;
  right_count: number;
  visible: boolean;
  version: number;
}

export interface ResolvedTile {
  config: TileConfig;
  value: string;
  unit: string;
  isActive: boolean;
  isZero: boolean;
  formattedValue: string;
  supportValues: {
    topRight?: { value: string; unit: string };
    bottomRight?: { value: string; unit: string };
  };
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_TILES_CONFIG: TilesConfig = {
  tiles_left: [null, null, null, null, null, null],
  tiles_right: [null, null, null, null, null, null],
  left_count: 4,
  right_count: 4,
  visible: true,
  version: 1,
};

const STORAGE_KEY = 'oig_dashboard_tiles';

// ============================================================================
// POWER FORMAT HELPER (V1 formatPowerValue)
// ============================================================================

function formatPowerValue(value: number, unit: string): { value: string; unit: string } {
  if (unit === 'W' && Math.abs(value) >= 1000) {
    return { value: (value / 1000).toFixed(2), unit: 'kW' };
  }
  if (unit === 'Wh' && Math.abs(value) >= 1000) {
    return { value: (value / 1000).toFixed(2), unit: 'kWh' };
  }
  if (unit === 'W' || unit === 'Wh') {
    return { value: Math.round(value).toString(), unit };
  }
  return { value: value.toFixed(1), unit };
}

// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================

/**
 * Load tile configuration from HA (WS call), with localStorage fallback.
 */
export async function loadTilesConfig(): Promise<TilesConfig> {
  try {
    const response = await haClient.callWS({
      type: 'call_service',
      domain: 'oig_cloud',
      service: 'get_dashboard_tiles',
      service_data: {},
      return_response: true,
    });

    const config = response?.response?.config;
    if (config && typeof config === 'object') {
      oigLog.debug('Loaded tiles config from HA');
      return normalizeTilesConfig(config);
    }
  } catch (e) {
    oigLog.debug('WS tile config load failed, trying localStorage', { error: (e as Error).message });
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      oigLog.debug('Loaded tiles config from localStorage');
      return normalizeTilesConfig(config);
    }
  } catch {
    oigLog.debug('localStorage tile config load failed');
  }

  return DEFAULT_TILES_CONFIG;
}

/**
 * Save tile configuration to HA + localStorage.
 */
export async function saveTilesConfig(config: TilesConfig): Promise<boolean> {
  try {
    // Save to localStorage first (faster)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

    // Then save to HA
    await haClient.callService('oig_cloud', 'save_dashboard_tiles', {
      config: JSON.stringify(config),
    });

    oigLog.info('Tiles config saved');
    return true;
  } catch (e) {
    oigLog.error('Failed to save tiles config', e as Error);
    return false;
  }
}

function normalizeTilesConfig(raw: any): TilesConfig {
  return {
    tiles_left: Array.isArray(raw.tiles_left) ? raw.tiles_left.slice(0, 6) : DEFAULT_TILES_CONFIG.tiles_left,
    tiles_right: Array.isArray(raw.tiles_right) ? raw.tiles_right.slice(0, 6) : DEFAULT_TILES_CONFIG.tiles_right,
    left_count: typeof raw.left_count === 'number' ? raw.left_count : 4,
    right_count: typeof raw.right_count === 'number' ? raw.right_count : 4,
    visible: raw.visible !== false,
    version: raw.version ?? 1,
  };
}

// ============================================================================
// ENTITY RESOLUTION
// ============================================================================

function resolveEntityValue(entityId: string): { value: string; unit: string; isActive: boolean; rawValue: number } {
  const store = getEntityStore();
  if (!store) return { value: '--', unit: '', isActive: false, rawValue: 0 };

  const entity = store.get(entityId);
  if (!entity || entity.state === 'unavailable' || entity.state === 'unknown') {
    return { value: '--', unit: '', isActive: false, rawValue: 0 };
  }

  const rawStr = entity.state;
  const unit = String(entity.attributes?.unit_of_measurement ?? '');
  const rawValue = parseFloat(rawStr) || 0;

  // For switches/binary sensors
  if (entity.entity_id.startsWith('switch.') || entity.entity_id.startsWith('binary_sensor.')) {
    return {
      value: rawStr === 'on' ? 'Zapnuto' : 'Vypnuto',
      unit: '',
      isActive: rawStr === 'on',
      rawValue: rawStr === 'on' ? 1 : 0,
    };
  }

  // For numeric sensors, format power values
  const formatted = formatPowerValue(rawValue, unit);
  return {
    value: formatted.value,
    unit: formatted.unit,
    isActive: rawValue !== 0,
    rawValue,
  };
}

/**
 * Resolve all tiles in a config to their current entity values.
 */
export function resolveTiles(config: TilesConfig): { left: ResolvedTile[]; right: ResolvedTile[] } {
  const resolveArray = (tiles: Array<TileConfig | null>, count: number): ResolvedTile[] => {
    const result: ResolvedTile[] = [];
    for (let i = 0; i < count; i++) {
      const tileConfig = tiles[i];
      if (!tileConfig) continue;

      const main = resolveEntityValue(tileConfig.entity_id);

      const supportValues: ResolvedTile['supportValues'] = {};
      if (tileConfig.support_entities?.top_right) {
        const sv = resolveEntityValue(tileConfig.support_entities.top_right);
        supportValues.topRight = { value: sv.value, unit: sv.unit };
      }
      if (tileConfig.support_entities?.bottom_right) {
        const sv = resolveEntityValue(tileConfig.support_entities.bottom_right);
        supportValues.bottomRight = { value: sv.value, unit: sv.unit };
      }

      result.push({
        config: tileConfig,
        value: main.value,
        unit: main.unit,
        isActive: main.isActive,
        isZero: main.rawValue === 0,
        formattedValue: main.unit ? `${main.value} ${main.unit}` : main.value,
        supportValues,
      });
    }
    return result;
  };

  return {
    left: resolveArray(config.tiles_left, config.left_count),
    right: resolveArray(config.tiles_right, config.right_count),
  };
}

/**
 * Execute a button tile action.
 */
export async function executeTileAction(entityId: string, action: string = 'toggle'): Promise<boolean> {
  const domain = entityId.split('.')[0];
  return haClient.callService(domain, action, { entity_id: entityId });
}

/**
 * Get all entity IDs referenced by the tile config (for state watching).
 */
export function getTileEntityIds(config: TilesConfig): string[] {
  const ids = new Set<string>();

  const collect = (tiles: Array<TileConfig | null>, count: number) => {
    for (let i = 0; i < count; i++) {
      const tile = tiles[i];
      if (!tile) continue;
      ids.add(tile.entity_id);
      if (tile.support_entities?.top_right) ids.add(tile.support_entities.top_right);
      if (tile.support_entities?.bottom_right) ids.add(tile.support_entities.bottom_right);
    }
  };

  collect(config.tiles_left, config.left_count);
  collect(config.tiles_right, config.right_count);
  return [...ids];
}
