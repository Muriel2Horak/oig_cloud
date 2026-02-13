/**
 * OIG Cloud V2 — Shield Controller
 *
 * Reactive data layer for the shield integration:
 * - Reads service_shield_activity sensor for queue state
 * - Parses running_requests[] and queued_requests[] from sensor attributes
 * - Calls hass services (set_box_mode, set_grid_delivery, set_boiler_mode)
 * - Manages per-button states (active/pending/processing/disabled)
 * - Provides reactive ShieldState for UI components
 *
 * Port of V1 shield.js monitoring + service call logic.
 */

import { getEntityStore } from '@/data/entity-store';
import { haClient } from '@/data/ha-client';
import { stateWatcher } from '@/data/state-watcher';
import { oigLog } from '@/core/logger';
import {
  ShieldState,
  ShieldQueueItem,
  ShieldServiceType,
  BoxMode,
  GridDelivery,
  BoilerMode,
  BOX_MODE_SENSOR_MAP,
  BOX_MODE_SERVICE_MAP,
  GRID_DELIVERY_SENSOR_MAP,
  GRID_DELIVERY_SERVICE_MAP,
  BOILER_MODE_SENSOR_MAP,
  BOILER_MODE_SERVICE_MAP,
  EMPTY_SHIELD_STATE,
} from '@/ui/features/control-panel/types';

// ============================================================================
// TYPES
// ============================================================================

export type ShieldListener = (state: ShieldState) => void;

// ============================================================================
// SHIELD CONTROLLER
// ============================================================================

export class ShieldController {
  private state: ShieldState = { ...EMPTY_SHIELD_STATE, pendingServices: new Map(), changingServices: new Set() };
  private listeners = new Set<ShieldListener>();
  private watcherUnsub: (() => void) | null = null;
  private queueUpdateInterval: number | null = null;
  private started = false;

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  start(): void {
    if (this.started) return;
    this.started = true;

    // Subscribe to relevant sensor changes via the state watcher
    this.watcherUnsub = stateWatcher.onEntityChange((entityId, _newState) => {
      if (!entityId) return;
      if (this.shouldRefreshShield(entityId)) {
        this.refresh();
      }
    });

    // Initial read
    this.refresh();

    // Live queue duration updates every second
    this.queueUpdateInterval = window.setInterval(() => {
      if (this.state.allRequests.length > 0) {
        this.notify(); // triggers re-render with updated durations
      }
    }, 1000);

    oigLog.debug('ShieldController started');
  }

  stop(): void {
    this.watcherUnsub?.();
    this.watcherUnsub = null;

    if (this.queueUpdateInterval !== null) {
      clearInterval(this.queueUpdateInterval);
      this.queueUpdateInterval = null;
    }

    this.started = false;
    oigLog.debug('ShieldController stopped');
  }

  // --------------------------------------------------------------------------
  // Subscriptions
  // --------------------------------------------------------------------------

  subscribe(listener: ShieldListener): () => void {
    this.listeners.add(listener);
    // Fire immediately with current state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): ShieldState {
    return this.state;
  }

  // --------------------------------------------------------------------------
  // Sensor matching (from V1 shouldRefreshShield)
  // --------------------------------------------------------------------------

  private shouldRefreshShield(entityId: string): boolean {
    const fragments = [
      'service_shield_',
      'box_prms_mode',
      'boiler_manual_mode',
      'invertor_prms_to_grid',
      'invertor_prm1_p_max_feed_grid',
    ];
    return fragments.some((f) => entityId.includes(f));
  }

  // --------------------------------------------------------------------------
  // State refresh — reads all shield sensors
  // --------------------------------------------------------------------------

  refresh(): void {
    const store = getEntityStore();
    if (!store) return;

    try {
      // --- Shield activity sensor (handles _2, _3 suffixes) ---
      const activitySensorId = store.findSensorId('service_shield_activity');
      const activityEntity = store.get(activitySensorId);
      const attrs = (activityEntity?.attributes ?? {}) as Record<string, any>;
      const rawRunning: any[] = attrs.running_requests ?? [];
      const rawQueued: any[] = attrs.queued_requests ?? [];

      // --- Shield status/queue sensors ---
      const statusSensorId = store.findSensorId('service_shield_status');
      const queueSensorId = store.findSensorId('service_shield_queue');
      const statusStr = store.getString(statusSensorId).value;
      const queueCount = store.getNumeric(queueSensorId).value;

      // --- Current actual values ---
      const boxModeRaw = store.getString(store.getSensorId('box_prms_mode')).value;
      const gridModeRaw = store.getString(store.getSensorId('invertor_prms_to_grid')).value;
      const gridLimit = store.getNumeric(store.getSensorId('invertor_prm1_p_max_feed_grid')).value;
      const boilerModeRaw = store.getString(store.getSensorId('boiler_manual_mode')).value;

      // Normalize current values
      const currentBoxMode = BOX_MODE_SENSOR_MAP[boxModeRaw.trim()] ?? 'home_1';
      const currentGridDelivery = GRID_DELIVERY_SENSOR_MAP[gridModeRaw.trim()] ?? 'off';
      const currentBoilerMode = BOILER_MODE_SENSOR_MAP[boilerModeRaw.trim()] ?? 'cbb';

      // Parse requests
      const runningRequests = rawRunning.map((r, i) => this.parseRequest(r, i, true));
      const queuedRequests = rawQueued.map((r, i) => this.parseRequest(r, i + rawRunning.length, false));
      const allRequests = [...runningRequests, ...queuedRequests];

      // Compute pending services from active requests
      const pendingServices = new Map<ShieldServiceType, string>();
      const changingServices = new Set<ShieldServiceType>();

      for (const req of allRequests) {
        const parsed = this.parseServiceRequest(req);
        if (parsed && !pendingServices.has(parsed.type)) {
          pendingServices.set(parsed.type, parsed.targetValue);
          changingServices.add(parsed.type);
        }
      }

      // Check if grid mode is "Probíhá změna" (change in progress)
      if (gridModeRaw.trim() === 'Probíhá změna') {
        changingServices.add('grid_mode');
      }

      const isRunning = statusStr === 'Running' || statusStr === 'running';

      this.state = {
        status: isRunning ? 'running' : 'idle',
        activity: activityEntity?.state ?? '',
        queueCount,
        runningRequests,
        queuedRequests,
        allRequests,
        currentBoxMode,
        currentGridDelivery,
        currentGridLimit: gridLimit,
        currentBoilerMode,
        pendingServices,
        changingServices,
      };

      this.notify();
    } catch (e) {
      oigLog.error('ShieldController refresh failed', e as Error);
    }
  }

  // --------------------------------------------------------------------------
  // Request parsing (from V1 shield.js)
  // --------------------------------------------------------------------------

  private parseRequest(raw: any, index: number, isRunning: boolean): ShieldQueueItem {
    const service = raw.service ?? '';
    const changes = Array.isArray(raw.changes) ? raw.changes : [];
    const timestamp = raw.started_at ?? raw.queued_at ?? raw.created_at ?? raw.timestamp ?? raw.created ?? '';
    const targetValue = raw.target_value ?? raw.target_display ?? '';

    let type: ShieldQueueItem['type'] = 'mode_change';
    if (service.includes('set_box_mode')) type = 'mode_change';
    else if (service.includes('set_grid_delivery') && !service.includes('limit')) type = 'grid_delivery';
    else if (service.includes('grid_delivery_limit') || service.includes('set_grid_delivery')) type = 'grid_limit';
    else if (service.includes('set_boiler_mode')) type = 'boiler_mode';
    else if (service.includes('set_formating_mode')) type = 'battery_formating';

    return {
      id: `${service}_${index}_${timestamp}`,
      type,
      status: isRunning ? 'running' : 'queued',
      service,
      targetValue,
      changes,
      createdAt: timestamp,
      position: index + 1,
    };
  }

  private parseServiceRequest(req: ShieldQueueItem): { type: ShieldServiceType; targetValue: string } | null {
    // Try targets array from raw data
    const service = req.service;
    if (!service) return null;

    // Map from change strings (V1 pattern)
    const changeStr = req.changes.length > 0 ? req.changes[0] : '';

    if (service.includes('set_grid_delivery') && changeStr.includes('p_max_feed_grid')) {
      const match = changeStr.match(/→\s*(\d+)/);
      return match ? { type: 'grid_limit', targetValue: match[1] } : null;
    }

    const arrowMatch = changeStr.match(/→\s*'([^']+)'/);
    const target = arrowMatch ? arrowMatch[1] : req.targetValue;

    if (service.includes('set_box_mode')) {
      return { type: 'box_mode', targetValue: target };
    }
    if (service.includes('set_boiler_mode')) {
      return { type: 'boiler_mode', targetValue: target };
    }
    if (service.includes('set_grid_delivery') && changeStr.includes('prms_to_grid')) {
      return { type: 'grid_mode', targetValue: target };
    }
    if (service.includes('set_grid_delivery')) {
      // Fallback: if changeStr doesn't specify, infer from service name
      const limitMatch = changeStr.match(/→\s*(\d+)/);
      if (limitMatch) {
        return { type: 'grid_limit', targetValue: limitMatch[1] };
      }
      return { type: 'grid_mode', targetValue: target };
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // Button state helpers (for use by selector components)
  // --------------------------------------------------------------------------

  getBoxModeButtonState(mode: BoxMode): 'active' | 'pending' | 'processing' | 'disabled-by-service' | 'idle' {
    const pendingTarget = this.state.pendingServices.get('box_mode');
    if (pendingTarget) {
      const pendingMode = BOX_MODE_SENSOR_MAP[pendingTarget];
      if (pendingMode === mode) {
        return this.state.status === 'running' ? 'processing' : 'pending';
      }
      return 'disabled-by-service';
    }
    return this.state.currentBoxMode === mode ? 'active' : 'idle';
  }

  getGridDeliveryButtonState(delivery: GridDelivery): 'active' | 'pending' | 'processing' | 'disabled-by-service' | 'idle' {
    // Grid mode changing
    if (this.state.changingServices.has('grid_mode')) {
      const pendingTarget = this.state.pendingServices.get('grid_mode');
      if (pendingTarget) {
        const pendingDelivery = GRID_DELIVERY_SENSOR_MAP[pendingTarget];
        if (pendingDelivery === delivery) {
          return this.state.status === 'running' ? 'processing' : 'pending';
        }
      }
      // If limit is pending and delivery is 'limited', highlight it
      if (this.state.pendingServices.has('grid_limit') && delivery === 'limited') {
        return this.state.status === 'running' ? 'processing' : 'pending';
      }
      return 'disabled-by-service';
    }
    // Only limit is changing
    if (this.state.changingServices.has('grid_limit')) {
      if (delivery === 'limited') {
        return this.state.status === 'running' ? 'processing' : 'pending';
      }
      return 'disabled-by-service';
    }
    return this.state.currentGridDelivery === delivery ? 'active' : 'idle';
  }

  getBoilerModeButtonState(mode: BoilerMode): 'active' | 'pending' | 'processing' | 'disabled-by-service' | 'idle' {
    const pendingTarget = this.state.pendingServices.get('boiler_mode');
    if (pendingTarget) {
      const pendingMode = BOILER_MODE_SENSOR_MAP[pendingTarget];
      if (pendingMode === mode) {
        return this.state.status === 'running' ? 'processing' : 'pending';
      }
      return 'disabled-by-service';
    }
    return this.state.currentBoilerMode === mode ? 'active' : 'idle';
  }

  isAnyServiceChanging(): boolean {
    return this.state.changingServices.size > 0;
  }

  // --------------------------------------------------------------------------
  // Service calls — with queue warning check
  // --------------------------------------------------------------------------

  /**
   * Check if queue has >=3 items and optionally warn the user.
   * Returns true if we should proceed.
   */
  shouldProceedWithQueue(): boolean {
    if (this.state.queueCount < 3) return true;
    return window.confirm(
      `\u26A0\uFE0F VAROV\u00C1N\u00CD: Fronta ji\u017E obsahuje ${this.state.queueCount} \u00FAkol\u016F!\n\n` +
      `Ka\u017Ed\u00E1 zm\u011Bna m\u016F\u017Ee trvat a\u017E 10 minut.\n` +
      `Opravdu chcete p\u0159idat dal\u0161\u00ED \u00FAkol?`
    );
  }

  /** Set box mode via HA service */
  async setBoxMode(mode: BoxMode): Promise<boolean> {
    const serviceMode = BOX_MODE_SERVICE_MAP[mode];

    // Check if already active
    if (this.state.currentBoxMode === mode && !this.state.changingServices.has('box_mode')) {
      return false;
    }

    const success = await haClient.callService('oig_cloud', 'set_box_mode', {
      mode: serviceMode,
      acknowledgement: true,
    });

    if (success) {
      this.refresh();
    }
    return success;
  }

  /** Set grid delivery via HA service */
  async setGridDelivery(delivery: GridDelivery, limit?: number): Promise<boolean> {
    const serviceMode = GRID_DELIVERY_SERVICE_MAP[delivery];

    const data: Record<string, any> = {
      acknowledgement: true,
      warning: true,
    };

    // If limited with a limit value, send both mode + limit
    if (delivery === 'limited' && limit != null) {
      // If already in limited mode, just change the limit
      if (this.state.currentGridDelivery === 'limited') {
        data.limit = limit;
      } else {
        data.mode = serviceMode;
        data.limit = limit;
      }
    } else if (limit != null) {
      // Only changing limit (grid delivery is already limited)
      data.limit = limit;
    } else {
      data.mode = serviceMode;
    }

    const success = await haClient.callService('oig_cloud', 'set_grid_delivery', data);

    if (success) {
      this.refresh();
    }
    return success;
  }

  /** Set boiler mode via HA service */
  async setBoilerMode(mode: BoilerMode): Promise<boolean> {
    const serviceMode = BOILER_MODE_SERVICE_MAP[mode];

    // Check if already active
    if (this.state.currentBoilerMode === mode && !this.state.changingServices.has('boiler_mode')) {
      return false;
    }

    const success = await haClient.callService('oig_cloud', 'set_boiler_mode', {
      mode: serviceMode,
      acknowledgement: true,
    });

    if (success) {
      this.refresh();
    }
    return success;
  }

  /** Remove item from shield queue by position */
  async removeFromQueue(position: number): Promise<boolean> {
    const success = await haClient.callService('oig_cloud', 'shield_remove_from_queue', {
      position,
    });

    if (success) {
      this.refresh();
    }
    return success;
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (e) {
        oigLog.error('ShieldController listener error', e as Error);
      }
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const shieldController = new ShieldController();
