/**
 * OIG Cloud V2 — State Watcher
 *
 * Subscribes to HA WebSocket `state_changed` events and dispatches
 * filtered callbacks for watched entities/prefixes.
 * Avoids per-entity subscriptions that could overwhelm Mobile Safari.
 *
 * Port of V1 js/core/state-watcher.js
 */

import { oigLog } from '@/core/logger';

export interface HassState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export type StateChangeCallback = (entityId: string, newState: HassState | null) => void;

interface HassConnection {
  subscribeEvents: (
    callback: (event: StateChangedEvent) => void,
    eventType: string
  ) => Promise<() => void>;
}

interface StateChangedEvent {
  event_type: string;
  data: {
    entity_id: string;
    new_state: HassState | null;
    old_state: HassState | null;
  };
}

interface Hass {
  connection?: HassConnection;
  states?: Record<string, HassState>;
}

class StateWatcher {
  private callbacks = new Set<StateChangeCallback>();
  private watched = new Set<string>();
  private watchedPrefixes = new Set<string>();
  private unsub: (() => void) | null = null;
  private running = false;
  private getHass: (() => Hass | null) | null = null;
  private activeConnection: HassConnection | null = null;

  /**
   * Register specific entity IDs to watch.
   */
  registerEntities(entityIds: string[]): void {
    for (const id of entityIds) {
      if (typeof id === 'string' && id.length > 0) {
        this.watched.add(id);
      }
    }
  }

  /**
   * Register a prefix — all entities starting with this prefix will be watched.
   * Also registers existing entities matching the prefix.
   */
  registerPrefix(prefix: string): void {
    if (typeof prefix !== 'string' || prefix.length === 0) return;
    this.watchedPrefixes.add(prefix);

    const hass = this.getHass?.();
    if (hass?.states) {
      const matching = Object.keys(hass.states).filter((eid) => eid.startsWith(prefix));
      this.registerEntities(matching);
    }
  }

  /**
   * Subscribe to entity changes. Returns an unsubscribe function.
   */
  onEntityChange(callback: StateChangeCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Start watching. Subscribes to HA WebSocket state_changed events.
   */
  async start(options: {
    getHass: () => Hass | null;
    prefixes?: string[];
  }): Promise<void> {
    this.getHass = options.getHass;
    const hass = this.getHass();

    if (!hass?.connection) {
      // Retry after delay if hass not ready
      oigLog.debug('StateWatcher: hass not ready, retrying in 500ms');
      setTimeout(() => this.start(options), 500);
      return;
    }

    if (this.running && this.activeConnection === hass.connection) {
      const prefixes = options.prefixes ?? [];
      for (const p of prefixes) {
        this.registerPrefix(p);
      }
      return;
    }

    if (this.running) {
      this.stop();
    }

    this.running = true;
    this.activeConnection = hass.connection;

    // Register initial prefixes
    const prefixes = options.prefixes ?? [];
    for (const p of prefixes) {
      this.registerPrefix(p);
    }

    // Subscribe to state_changed events
    try {
      this.unsub = await hass.connection.subscribeEvents(
        (event) => this.handleStateChanged(event),
        'state_changed'
      );
      oigLog.info('StateWatcher started', {
        prefixes,
        watchedCount: this.watched.size,
      });
    } catch (err) {
      this.running = false;
      this.activeConnection = null;
      oigLog.error('StateWatcher failed to subscribe', err as Error);
    }
  }

  /**
   * Stop watching. Unsubscribes from HA events.
   */
  stop(): void {
    this.running = false;
    this.activeConnection = null;
    if (this.unsub) {
      try {
        this.unsub();
      } catch {
        // ignore
      }
    }
    this.unsub = null;
    oigLog.info('StateWatcher stopped');
  }

  /**
   * Check if a given entity is currently watched.
   */
  isWatched(entityId: string): boolean {
    return this.matchesWatched(entityId);
  }

  /**
   * Destroy — stop and clear all subscriptions.
   */
  destroy(): void {
    this.stop();
    this.callbacks.clear();
    this.watched.clear();
    this.watchedPrefixes.clear();
    this.getHass = null;
  }

  // ---- internals ----

  private matchesWatched(entityId: string): boolean {
    if (this.watched.has(entityId)) return true;
    for (const prefix of this.watchedPrefixes) {
      if (entityId.startsWith(prefix)) return true;
    }
    return false;
  }

  private handleStateChanged(event: StateChangedEvent): void {
    const entityId = event?.data?.entity_id;
    if (!entityId || !this.matchesWatched(entityId)) return;

    const newState = event.data.new_state;
    for (const cb of this.callbacks) {
      try {
        cb(entityId, newState);
      } catch {
        // keep watcher resilient — never let a single callback break others
      }
    }
  }
}

// Singleton instance
export const stateWatcher = new StateWatcher();
