import { AuthError, NetworkError } from '@/core/errors';
import { oigLog } from '@/core/logger';

interface Hass {
  auth: {
    data: {
      access_token: string;
    };
  };
  states: Record<string, HassEntity>;
  user?: {
    name: string;
    id: string;
    is_admin: boolean;
  };
  callService: (domain: string, service: string, data?: object) => Promise<any>;
  callApi: (method: string, path: string, data?: object) => Promise<any>;
}

interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

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

  async fetchWithAuth(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const hass = await this.getHass();
    if (!hass) {
      throw new AuthError('Cannot get HASS context');
    }

    const token = hass.auth?.data?.access_token;
    if (!token) {
      throw new AuthError('No access token available');
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

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

  async callApi<T = any>(method: string, path: string, data?: object): Promise<T> {
    const hass = await this.getHass();
    if (!hass) {
      throw new AuthError('Cannot get HASS context');
    }
    
    return hass.callApi(method, path, data);
  }

  async callService(domain: string, service: string, data?: object): Promise<any> {
    const hass = await this.getHass();
    if (!hass) {
      throw new AuthError('Cannot get HASS context');
    }
    
    return hass.callService(domain, service, data);
  }

  getToken(): string | null {
    return this.hass?.auth?.data?.access_token || null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const haClient = new HaClient();
