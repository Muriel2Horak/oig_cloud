import { oigLog } from '@/core/logger';
import { ApiError, NetworkError } from '@/core/errors';

interface RequestOptions {
  token?: string;
  method?: string;
  body?: object;
  signal?: AbortSignal;
  cache?: boolean;
  ttl?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const API_BASE = '/api/oig_cloud';

export class ApiClient {
  private baseUrl: string;
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  async get<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.fetch<T>(path, { ...options, method: 'GET' });
  }

  async post<T = any>(path: string, body: object, options: RequestOptions = {}): Promise<T> {
    return this.fetch<T>(path, { ...options, method: 'POST', body });
  }

  async fetch<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const { token, method = 'GET', body, signal, cache = true, ttl = 60000 } = options;
    const url = `${this.baseUrl}${path}`;
    const cacheKey = `${method}:${url}:${JSON.stringify(body || '')}`;

    if (cache && method === 'GET') {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        oigLog.debug('Cache hit', { path });
        return cached;
      }
    }

    if (this.pendingRequests.has(cacheKey)) {
      oigLog.debug('Dedup request', { path });
      return this.pendingRequests.get(cacheKey);
    }

    const promise = this.doFetch<T>(url, { token, method, body, signal })
      .then(data => {
        if (cache && method === 'GET') {
          this.setCache(cacheKey, data, ttl);
        }
        return data;
      })
      .finally(() => {
        this.pendingRequests.delete(cacheKey);
      });

    this.pendingRequests.set(cacheKey, promise);
    return promise;
  }

  private async doFetch<T>(
    url: string, 
    options: { token?: string; method: string; body?: object; signal?: AbortSignal }
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    try {
      const response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      });

      if (!response.ok) {
        throw new ApiError(
          `API request failed: ${response.statusText}`,
          response.status,
          response.statusText
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if ((error as Error).name === 'AbortError') {
        oigLog.debug('Request aborted', { url });
        throw error;
      }
      throw new NetworkError(`Network error: ${(error as Error).message}`, error as Error);
    }
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      oigLog.debug('Cache cleared');
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
    oigLog.debug('Cache cleared', { pattern });
  }

  abortPending(): void {
    this.pendingRequests.clear();
  }
}

export const apiClient = new ApiClient();
