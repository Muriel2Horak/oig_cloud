/**
 * OIG Cloud V2 — HA Client
 *
 * Central access layer for Home Assistant:
 * - hass object lookup (window, parent, customPanel)
 * - HA-owned authenticated transport with local security checks
 * - callService wrapper
 * - openEntityDialog (fire hass-more-info)
 * - fetchOIGAPI (REST API wrapper)
 * - PlannerState (cached planner settings)
 *
 * Port of V1 js/core/api.js + ha-client.ts
 */

import { AuthError } from '@/core/errors';
import { oigLog } from '@/core/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface Hass {
  auth: {
    expired: boolean;
  };
  fetchWithAuth: (path: string, init?: RequestInit) => Promise<Response>;
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

const MAX_ATTEMPTS = 4;
const RETRY_DELAY = 1000;

type OigWrapperKind = 'typed' | 'untyped';

interface OigDispatchPolicy {
  kind: OigWrapperKind;
  retrySafeReads: boolean;
}

interface OigDispatchSuccess {
  ok: true;
  response: Response;
}

interface OigDispatchFailure {
  ok: false;
  code: 'invalid_path' | 'auth' | 'aborted' | 'provider_unreachable' | 'redirect_blocked';
  error: string;
}

type OigDispatchResult = OigDispatchSuccess | OigDispatchFailure;

const AUTH_FAILURE: OigDispatchFailure = {
  ok: false,
  code: 'auth',
  error: 'Home Assistant authentication unavailable',
};

const ABORT_FAILURE: OigDispatchFailure = {
  ok: false,
  code: 'aborted',
  error: 'Request aborted',
};

const PROVIDER_FAILURE: OigDispatchFailure = {
  ok: false,
  code: 'provider_unreachable',
  error: 'Provider request failed',
};

const REDIRECT_FAILURE: OigDispatchFailure = {
  ok: false,
  code: 'redirect_blocked',
  error: 'Authenticated redirect blocked',
};

const INVALID_PATH_FAILURE: OigDispatchFailure = {
  ok: false,
  code: 'invalid_path',
  error: 'Invalid OIG API path',
};

function decodedVariants(value: string): string[] | null {
  const variants = [value];
  let current = value;
  for (let depth = 0; depth < 5; depth += 1) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return null;
    }
    if (decoded === current) return variants;
    variants.push(decoded);
    current = decoded;
  }
  try {
    if (decodeURIComponent(current) !== current) return null;
  } catch {
    return null;
  }
  return variants;
}

function hasTraversal(pathname: string): boolean {
  return pathname.split('/').some((segment) => segment === '.' || segment === '..');
}

function hasUnsafePathSyntax(value: string): boolean {
  if (value.includes('\\') || value.includes('#')) return true;
  if ([...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  })) return true;
  const pathname = value.split('?', 1)[0];
  return hasTraversal(pathname);
}

function hasAuthorityLikeFirstSegment(pathname: string): boolean {
  const firstSegment = pathname.split('/', 1)[0];
  if (!firstSegment) return false;
  if (firstSegment.includes('@') || firstSegment.startsWith('[')) return true;
  if (firstSegment.toLowerCase() === 'localhost') return true;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(firstSegment)) return true;
  return firstSegment.includes('.');
}

function publicEndpointPath(endpoint: string): string | null {
  if (!endpoint || endpoint.trim() !== endpoint) return null;
  if (endpoint.startsWith('//')) return null;

  const variants = decodedVariants(endpoint);
  if (!variants || variants.some(hasUnsafePathSyntax)) return null;
  for (const variant of variants) {
    const withoutLeadingSlash = variant.startsWith('/') ? variant.slice(1) : variant;
    const pathname = withoutLeadingSlash.split('?', 1)[0];
    if (!pathname || pathname.startsWith('/') || pathname.startsWith('api/oig_cloud')) {
      return null;
    }
    if (hasAuthorityLikeFirstSegment(pathname)) return null;
    if (/^[a-z][a-z\d+.-]*:/iu.test(pathname) || pathname.includes(':')) return null;
  }

  const suffix = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `/api/oig_cloud/${suffix}`;
}

function isCanonicalOigPath(path: string): boolean {
  if (!path || path.trim() !== path || !path.startsWith('/api/oig_cloud')) return false;
  if (path.startsWith('//')) return false;

  const variants = decodedVariants(path);
  if (!variants || variants.some(hasUnsafePathSyntax)) return false;
  return variants.every((variant) => {
    const pathname = variant.split('?', 1)[0];
    if (pathname !== '/api/oig_cloud' && !pathname.startsWith('/api/oig_cloud/')) return false;
    if (pathname.startsWith('/api/oig_cloud//')) return false;
    return !/^[a-z][a-z\d+.-]*:/iu.test(pathname);
  });
}

function normalizeHeaders(input?: HeadersInit): Record<string, string> {
  const normalized: Record<string, string> = {};
  const headers = new Headers(input);
  for (const [name, value] of headers.entries()) {
    if (name.toLowerCase() !== 'authorization') normalized[name.toLowerCase()] = value;
  }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'content-type')) {
    normalized['content-type'] = 'application/json';
  }
  return normalized;
}

function isRedirectResponse(response: Response): boolean {
  return response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError';
}

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

  private async dispatchOigRequest(
    canonicalPath: string,
    init: RequestInit,
    policy: OigDispatchPolicy,
  ): Promise<OigDispatchResult> {
    if (!isCanonicalOigPath(canonicalPath)) return INVALID_PATH_FAILURE;
    if (init.signal?.aborted) return ABORT_FAILURE;

    const hass = await this.getHass();
    if (!hass?.fetchWithAuth) return AUTH_FAILURE;

    const method = (init.method ?? 'GET').toUpperCase();
    const mayRetry = policy.retrySafeReads && (method === 'GET' || method === 'HEAD');
    const headers = normalizeHeaders(init.headers);
    const requestInit: RequestInit = {
      ...init,
      method,
      redirect: 'manual',
    };

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      if (init.signal?.aborted) return ABORT_FAILURE;
      let response: Response;
      try {
        response = await hass.fetchWithAuth(canonicalPath, {
          ...requestInit,
          headers: { ...headers },
        });
      } catch (error) {
        if (isAbortError(error) || init.signal?.aborted) return ABORT_FAILURE;
        if (hass.auth.expired) {
          oigLog.warn('OIG API request failed', {
            wrapper: policy.kind,
            method,
            code: AUTH_FAILURE.code,
          });
          return AUTH_FAILURE;
        }
        if (error instanceof TypeError && mayRetry && attempt < MAX_ATTEMPTS) {
          oigLog.warn('OIG API request retry', {
            wrapper: policy.kind,
            method,
            code: PROVIDER_FAILURE.code,
          });
          await this.delay(RETRY_DELAY);
          if (init.signal?.aborted) return ABORT_FAILURE;
          continue;
        }
        oigLog.warn('OIG API request failed', {
          wrapper: policy.kind,
          method,
          code: PROVIDER_FAILURE.code,
        });
        return PROVIDER_FAILURE;
      }

      if (isRedirectResponse(response)) {
        oigLog.warn('OIG API request failed', {
          wrapper: policy.kind,
          method,
          code: REDIRECT_FAILURE.code,
        });
        return REDIRECT_FAILURE;
      }

      if (
        mayRetry
        && attempt < MAX_ATTEMPTS
        && (response.status === 502 || response.status === 503 || response.status === 504)
      ) {
        oigLog.warn('OIG API request retry', {
          wrapper: policy.kind,
          method,
          code: 'provider_http',
        });
        await this.delay(RETRY_DELAY);
        if (init.signal?.aborted) return ABORT_FAILURE;
        continue;
      }

      return { ok: true, response };
    }

    return PROVIDER_FAILURE;
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
    const path = publicEndpointPath(endpoint);
    if (!path) return null;

    const dispatched = await this.dispatchOigRequest(path, options, {
      kind: 'untyped',
      retrySafeReads: true,
    });
    if (!dispatched.ok || !dispatched.response.ok) return null;

    try {
      return (await dispatched.response.json()) as T;
    } catch {
      oigLog.warn('OIG API response parse failed', {
        wrapper: 'untyped',
        method: (options.method ?? 'GET').toUpperCase(),
        code: 'invalid_response',
      });
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
    const path = publicEndpointPath(endpoint);
    if (!path) {
      return { ok: false, status: 0, code: INVALID_PATH_FAILURE.code, error: INVALID_PATH_FAILURE.error };
    }

    const dispatched = await this.dispatchOigRequest(path, options, {
      kind: 'typed',
      retrySafeReads: false,
    });
    if (!dispatched.ok) {
      return { ok: false, status: 0, code: dispatched.code, error: dispatched.error };
    }
    const response = dispatched.response;

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const parsed = (body ?? {}) as { code?: unknown; error?: unknown };
      return {
        ok: false,
        status: response.status,
        code: typeof parsed.code === 'string' ? parsed.code : 'provider_unreachable',
        error: typeof parsed.error === 'string' ? parsed.error : response.statusText,
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

class PlannerStateManager {
  private cache: any = null;
  private lastFetch = 0;
  private inflight: Promise<any> | null = null;
  private readonly CACHE_TTL = 60_000; // 1 minute

  async fetchSettings(client: HaClient, inverterSn: string, force = false): Promise<any> {
    const now = Date.now();
    if (!force && this.cache && now - this.lastFetch < this.CACHE_TTL) {
      return this.cache;
    }
    if (this.inflight) {
      return this.inflight;
    }

    this.inflight = (async () => {
      try {
        const payload = await client.loadPlannerSettings(inverterSn);
        this.cache = payload;
        this.lastFetch = Date.now();
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
    this.lastFetch = 0;
  }
}

// ============================================================================
// SINGLETONS
// ============================================================================

export const haClient = new HaClient();
export const plannerState = new PlannerStateManager();
