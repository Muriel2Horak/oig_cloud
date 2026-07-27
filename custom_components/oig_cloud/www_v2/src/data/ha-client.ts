/**
 * OIG Cloud V2 — HA Client
 *
 * Central access layer for Home Assistant:
 * - hass object lookup (window, parent, customPanel)
 * - fetchWithAuth (token injection, security checks)
 * - callService wrapper
 * - openEntityDialog (fire hass-more-info)
 * - fetchOIGAPI (REST API wrapper)
 * - PlannerState (cached planner settings)
 *
 * Port of V1 js/core/api.js + ha-client.ts
 */

import { AuthError, NetworkError } from '@/core/errors';
import { oigLog } from '@/core/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface Hass {
  auth: {
    data: {
      access_token: string;
    };
  };
  connection?: {
    subscribeEvents: (
      callback: (event: any) => void,
      eventType: string
    ) => Promise<() => void>;
  };
  states: Record<string, HassEntity>;
  user?: {
    name: string;
    id: string;
    is_admin: boolean;
  };
  callService: (domain: string, service: string, data?: object) => Promise<any>;
  callApi: (method: string, path: string, data?: object) => Promise<any>;
  callWS: (msg: object) => Promise<any>;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

/**
 * Classified error code surfaced by `fetchOIGAPITyped`. `aborted` and
 * `provider_unreachable` are client-classified (no HTTP response reached);
 * the rest come verbatim from the server's `{error, code}` body.
 */
export type OigApiErrorCode = 'aborted' | 'provider_unreachable' | string;

export interface OigApiSuccess<T> {
  ok: true;
  status: number;
  data: T;
}

export interface OigApiFailure {
  ok: false;
  status: number;
  code: OigApiErrorCode;
  error?: string;
}

export type OigApiResult<T> = OigApiSuccess<T> | OigApiFailure;

// ============================================================================
// HA CLIENT
// ============================================================================

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export class HaClient {
  private hass: Hass | null = null;
  private initPromise: Promise<Hass | null> | null = null;

  async getHass(): Promise<Hass | null> {
    if (this.hass) return this.hass;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initHass();
    return this.initPromise;
  }

  getHassSync(): Hass | null {
    return this.hass;
  }

  async refreshHass(): Promise<Hass | null> {
    const next = await this.findHass();
    if (next) {
      this.hass = next;
      oigLog.info('HASS client refreshed');
      return next;
    }
    return this.hass;
  }

  private async initHass(): Promise<Hass | null> {
    oigLog.debug('Initializing HASS client');

    const ha = await this.findHass();
    if (!ha) {
      oigLog.warn('HASS not found in parent context');
      return null;
    }

    this.hass = ha;
    oigLog.info('HASS client initialized');
    return ha;
  }

  private async findHass(): Promise<Hass | null> {
    if (typeof window === 'undefined') return null;

    if ((window as any).hass) {
      return (window as any).hass;
    }

    if (window.parent && window.parent !== window) {
      try {
        const parentHa = (window.parent as any).document
          ?.querySelector('home-assistant')?.hass;
        if (parentHa) return parentHa;
      } catch {
        oigLog.debug('Cannot access parent HASS (cross-origin)');
      }
    }

    if ((window as any).customPanel) {
      return (window as any).customPanel.hass;
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // fetchWithAuth — token injection with security checks
  // --------------------------------------------------------------------------

  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const hass = await this.getHass();
    if (!hass) {
      throw new AuthError('Cannot get HASS context');
    }

    // Security: block non-localhost absolute URLs to prevent token exfiltration
    try {
      const parsed = new URL(url, window.location.href);
      const hostname = parsed.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !url.startsWith('/api/')) {
        throw new Error(`fetchWithAuth rejected for non-localhost URL: ${url}`);
      }
    } catch (e) {
      if ((e as Error).message.includes('rejected')) throw e;
      // If URL parsing fails, it's likely a relative URL which is fine
    }

    const token = hass.auth?.data?.access_token;
    if (!token) {
      throw new AuthError('No access token available');
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return this.fetchWithRetry(url, { ...options, headers });
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = MAX_RETRIES
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthError('Token expired or invalid');
        }
        throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (retries > 0 && error instanceof NetworkError) {
        oigLog.warn(`Retrying fetch (${retries} left)`, { url });
        await this.delay(RETRY_DELAY);
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // callApi / callService — HA API wrappers
  // --------------------------------------------------------------------------

  async callApi<T = any>(method: string, path: string, data?: object): Promise<T> {
    const hass = await this.getHass();
    if (!hass) {
      throw new AuthError('Cannot get HASS context');
    }

    return hass.callApi(method, path, data);
  }

  async callService(domain: string, service: string, data?: object): Promise<boolean> {
    const hass = await this.getHass();
    if (!hass?.callService) {
      oigLog.error('Cannot call service — hass not available');
      return false;
    }

    try {
      await hass.callService(domain, service, data);
      return true;
    } catch (e) {
      oigLog.error(`Service call failed (${domain}.${service})`, e as Error);
      return false;
    }
  }

  async callWS<T = any>(msg: object): Promise<T> {
    const hass = await this.getHass();
    if (!hass?.callWS) {
      throw new AuthError('Cannot get HASS context for WS call');
    }
    return hass.callWS(msg);
  }

  // --------------------------------------------------------------------------
  // fetchOIGAPI — REST wrapper for /api/oig_cloud/*
  // --------------------------------------------------------------------------

  async fetchOIGAPI<T = any>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    try {
      const url = `/api/oig_cloud${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      const response = await this.fetchWithAuth(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(new Headers(options.headers).entries()),
        },
      });

      return (await response.json()) as T;
    } catch (e) {
      oigLog.error(`OIG API fetch error for ${endpoint}`, e as Error);
      return null;
    }
  }

  /**
   * Typed sibling of `fetchOIGAPI` — surfaces the parsed JSON body + status
   * on a non-2xx response instead of swallowing it to `null`, and
   * distinguishes a caller-initiated abort (`code: 'aborted'`) from a
   * generic network failure (`code: 'provider_unreachable'`). Bypasses the
   * retry-on-failure path deliberately: callers of this path (e.g. the
   * side-effect-free `/solar_test` probe) drive their own abort/timeout.
   */
  async fetchOIGAPITyped<T = any>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<OigApiResult<T>> {
    const url = `/api/oig_cloud${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const hass = await this.getHass();
    if (!hass) {
      return { ok: false, status: 0, code: 'provider_unreachable', error: 'Cannot get HASS context' };
    }
    const token = hass.auth?.data?.access_token;
    if (!token) {
      return { ok: false, status: 0, code: 'auth', error: 'No access token available' };
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (e) {
      const err = e as Error;
      if (err.name === 'AbortError') {
        return { ok: false, status: 0, code: 'aborted', error: err.message };
      }
      oigLog.error(`OIG API typed fetch error for ${endpoint}`, err);
      return { ok: false, status: 0, code: 'provider_unreachable', error: err.message };
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const parsed = (body ?? {}) as { code?: string; error?: string };
      return {
        ok: false,
        status: response.status,
        code: parsed.code ?? 'provider_unreachable',
        error: parsed.error ?? response.statusText,
      };
    }

    return { ok: true, status: response.status, data: body as T };
  }

  // --------------------------------------------------------------------------
  // Convenience loaders (mirror V1 api.js)
  // --------------------------------------------------------------------------

  async loadBatteryTimeline(inverterSn: string, type = 'active'): Promise<any> {
    return this.fetchOIGAPI(`/battery_forecast/${inverterSn}/timeline?type=${type}`);
  }

  async loadUnifiedCostTile(inverterSn: string): Promise<any> {
    return this.fetchOIGAPI(`/battery_forecast/${inverterSn}/unified_cost_tile`);
  }

  async loadSpotPrices(inverterSn: string): Promise<any> {
    return this.fetchOIGAPI(`/spot_prices/${inverterSn}/intervals`);
  }

  async loadAnalytics(inverterSn: string): Promise<any> {
    return this.fetchOIGAPI(`/analytics/${inverterSn}`);
  }

  async loadPlannerSettings(inverterSn: string): Promise<any> {
    return this.fetchOIGAPI(`/battery_forecast/${inverterSn}/planner_settings`);
  }

  async savePlannerSettings(inverterSn: string, settings: object): Promise<any> {
    return this.fetchOIGAPI(`/battery_forecast/${inverterSn}/planner_settings`, {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  async loadDetailTabs(inverterSn: string, tab: string, plan = 'hybrid'): Promise<any> {
    return this.fetchOIGAPI(`/battery_forecast/${inverterSn}/detail_tabs?tab=${tab}&plan=${plan}`);
  }

  async loadModules(entryId: string): Promise<any> {
    return this.fetchOIGAPI(`/${entryId}/modules`);
  }

  // --------------------------------------------------------------------------
  // openEntityDialog — fire hass-more-info event
  // --------------------------------------------------------------------------

  openEntityDialog(entityId: string): boolean {
    try {
      // Try parent document first (iframe scenario)
      const ha =
        (window.parent as any).document?.querySelector('home-assistant') ??
        document.querySelector('home-assistant');

      if (!ha) {
        oigLog.warn('Cannot open entity dialog — home-assistant element not found');
        return false;
      }

      const event = new CustomEvent('hass-more-info', {
        bubbles: true,
        composed: true,
        detail: { entityId },
      });
      ha.dispatchEvent(event);
      return true;
    } catch (e) {
      oigLog.error('Cannot open entity dialog', e as Error);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Notification helper
  // --------------------------------------------------------------------------

  async showNotification(title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): Promise<void> {
    const success = await this.callService('persistent_notification', 'create', {
      title,
      message,
      notification_id: `oig_dashboard_${Date.now()}`,
    });

    if (!success) {
      console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    }
  }

  // --------------------------------------------------------------------------
  // Token accessor
  // --------------------------------------------------------------------------

  getToken(): string | null {
    return this.hass?.auth?.data?.access_token ?? null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// PLANNER STATE — cached planner settings singleton
// ============================================================================

export const PLAN_LABELS: Record<string, { short: string; long: string }> = {
  hybrid: { short: 'Plán', long: 'Plánování' },
};

// Exported so tests can construct fresh instances; the `plannerState`
// singleton at the bottom of this module is what production code uses.
export class PlannerStateManager {
  private cache: any = null;
  private lastAttempt = 0;
  private inflight: Promise<any> | null = null;
  private readonly CACHE_TTL = 60_000; // 1 minute for a successful payload
  private readonly ERROR_TTL = 10_000; // suppress retries after a failed attempt

  async fetchSettings(client: HaClient, inverterSn: string, force = false): Promise<any> {
    // Single-flight de-dup: a pending fetch is shared by every caller. This
    // must precede the error-window gate below — a second call arriving
    // while the first is still in flight must join the inflight, not get
    // null back from the suppression window.
    if (this.inflight) {
      return this.inflight;
    }
    if (!force) {
      const now = Date.now();
      const elapsed = now - this.lastAttempt;
      if (this.cache && elapsed < this.CACHE_TTL) {
        return this.cache;
      }
      if (!this.cache && elapsed < this.ERROR_TTL) {
        // A recent attempt produced no payload (throw or null). Without this
        // gate, every caller re-hits the endpoint — together with app.ts's
        // ~500 ms refresh cadence, that becomes a request storm while the BE
        // is down / 401 / 404. See ha-client.test.ts case 2 / 3.
        return null;
      }
    }

    this.inflight = (async () => {
      this.lastAttempt = Date.now();
      try {
        const payload = await client.loadPlannerSettings(inverterSn);
        this.cache = payload;
        return payload;
      } catch (error) {
        oigLog.warn('Failed to fetch planner settings', { error });
        return null;
      } finally {
        this.inflight = null;
      }
    })();

    return this.inflight;
  }

  getDefaultPlan(): string {
    return 'hybrid';
  }

  getCachedSettings(): any {
    return this.cache;
  }

  getLabels(plan = 'hybrid'): { short: string; long: string } {
    return PLAN_LABELS[plan] ?? PLAN_LABELS.hybrid;
  }

  invalidate(): void {
    this.cache = null;
    this.lastAttempt = 0;
  }
}

// ============================================================================
// SINGLETONS
// ============================================================================

export const haClient = new HaClient();
export const plannerState = new PlannerStateManager();
