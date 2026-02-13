/**
 * OIG Cloud V2 — Entity Store
 *
 * Reactive entity state cache with per-entity subscriptions.
 * Integrates with StateWatcher for automatic updates from HA state_changed events.
 */

import { oigLog } from '@/core/logger';
import { stateWatcher, HassState } from '@/data/state-watcher';

export type EntityCallback = (entity: HassState | null) => void;

export class EntityStore {
  private hass: any;
  private subscriptions = new Map<string, Set<EntityCallback>>();
  private cache = new Map<string, HassState>();
  private stateWatcherUnsub: (() => void) | null = null;
  private inverterSn: string;

  constructor(hass: any, inverterSn: string = '2206237016') {
    this.hass = hass;
    this.inverterSn = inverterSn;
    this.init();
  }

  private init(): void {
    // Populate cache from hass.states snapshot
    if (this.hass?.states) {
      for (const [id, entity] of Object.entries(this.hass.states)) {
        this.cache.set(id, entity as HassState);
      }
    }

    // Connect to state watcher for live updates
    this.stateWatcherUnsub = stateWatcher.onEntityChange(
      (entityId: string, newState: HassState | null) => {
        if (newState) {
          this.cache.set(entityId, newState);
        } else {
          this.cache.delete(entityId);
        }
        this.notifySubscribers(entityId, newState);
      }
    );

    oigLog.debug('EntityStore initialized', {
      entities: this.cache.size,
      inverterSn: this.inverterSn,
    });
  }

  /**
   * Get the sensor entity ID for a given sensor name.
   * e.g. getSensorId('actual_fv_p1') → 'sensor.oig_2206237016_actual_fv_p1'
   */
  getSensorId(sensorName: string): string {
    return `sensor.oig_${this.inverterSn}_${sensorName}`;
  }

  /**
   * Find a shield sensor with possible numeric suffix (_2, _3, ...).
   */
  findSensorId(sensorName: string): string {
    const prefix = this.getSensorId(sensorName);

    // Search for exact match or match with numeric suffix
    for (const id of this.cache.keys()) {
      if (id === prefix) return id;
      if (id.startsWith(prefix + '_')) {
        const suffix = id.substring(prefix.length + 1);
        if (/^\d+$/.test(suffix)) return id;
      }
    }

    return prefix; // fallback to basic pattern
  }

  /**
   * Subscribe to changes of a specific entity. Fires immediately with current value.
   * Returns an unsubscribe function.
   */
  subscribe(entityId: string, callback: EntityCallback): () => void {
    if (!this.subscriptions.has(entityId)) {
      this.subscriptions.set(entityId, new Set());
    }

    this.subscriptions.get(entityId)!.add(callback);

    // Register entity with the state watcher
    stateWatcher.registerEntities([entityId]);

    // Fire immediately with current value
    const entity = this.cache.get(entityId) ?? null;
    callback(entity);

    return () => {
      this.subscriptions.get(entityId)?.delete(callback);
      if (this.subscriptions.get(entityId)?.size === 0) {
        this.subscriptions.delete(entityId);
      }
    };
  }

  /**
   * Get a numeric sensor value (with safe fallback).
   */
  getNumeric(entityId: string): { value: number; lastUpdated: Date | null; attributes: Record<string, unknown>; exists: boolean } {
    const state = this.cache.get(entityId);
    if (!state) {
      return { value: 0, lastUpdated: null, attributes: {}, exists: false };
    }

    const value = state.state !== 'unavailable' && state.state !== 'unknown'
      ? parseFloat(state.state) || 0
      : 0;

    return {
      value,
      lastUpdated: state.last_updated ? new Date(state.last_updated) : null,
      attributes: state.attributes ?? {},
      exists: true,
    };
  }

  /**
   * Get a string sensor value (with safe fallback).
   */
  getString(entityId: string): { value: string; lastUpdated: Date | null; attributes: Record<string, unknown>; exists: boolean } {
    const state = this.cache.get(entityId);
    if (!state) {
      return { value: '', lastUpdated: null, attributes: {}, exists: false };
    }

    const value = state.state !== 'unavailable' && state.state !== 'unknown'
      ? state.state
      : '';

    return {
      value,
      lastUpdated: state.last_updated ? new Date(state.last_updated) : null,
      attributes: state.attributes ?? {},
      exists: true,
    };
  }

  /**
   * Get raw entity state.
   */
  get(entityId: string): HassState | null {
    return this.cache.get(entityId) ?? null;
  }

  /**
   * Get all cached entities.
   */
  getAll(): Record<string, HassState> {
    return Object.fromEntries(this.cache);
  }

  /**
   * Batch-load multiple sensors at once.
   */
  batchLoad(entityIds: string[]): Record<string, { value: number; lastUpdated: Date | null; attributes: Record<string, unknown>; exists: boolean }> {
    const result: Record<string, { value: number; lastUpdated: Date | null; attributes: Record<string, unknown>; exists: boolean }> = {};
    for (const id of entityIds) {
      result[id] = this.getNumeric(id);
    }
    return result;
  }

  /**
   * Update the hass reference (e.g. when HA reconnects).
   */
  updateHass(hass: any): void {
    this.hass = hass;
    if (hass?.states) {
      for (const [id, entity] of Object.entries(hass.states)) {
        const oldState = this.cache.get(id);
        const newState = entity as HassState;
        this.cache.set(id, newState);

        // Only notify if state actually changed
        if (oldState?.state !== newState.state || oldState?.last_updated !== newState.last_updated) {
          this.notifySubscribers(id, newState);
        }
      }
    }
  }

  private notifySubscribers(entityId: string, entity: HassState | null): void {
    const callbacks = this.subscriptions.get(entityId);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(entity);
        } catch (e) {
          oigLog.error('Entity callback error', e as Error, { entityId });
        }
      }
    }
  }

  destroy(): void {
    this.stateWatcherUnsub?.();
    this.subscriptions.clear();
    this.cache.clear();
    oigLog.debug('EntityStore destroyed');
  }
}

// Singleton factory — one store per app
let _instance: EntityStore | null = null;

export function createEntityStore(hass: any, inverterSn?: string): EntityStore {
  if (_instance) {
    _instance.destroy();
  }
  _instance = new EntityStore(hass, inverterSn);
  return _instance;
}

export function getEntityStore(): EntityStore | null {
  return _instance;
}
