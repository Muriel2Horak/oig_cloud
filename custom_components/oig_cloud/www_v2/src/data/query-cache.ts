import { oigLog } from '@/core/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface QueryOptions {
  ttl?: number;
  forceRefresh?: boolean;
}

const DEFAULT_TTL = 60000;
const CLEANUP_INTERVAL = 300000;

export class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingQueries = new Map<string, Promise<any>>();
  private cleanupTimer: number | null = null;

  constructor() {
    this.startCleanup();
  }

  async query<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const { ttl = DEFAULT_TTL, forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = this.get<T>(key);
      if (cached !== null) {
        oigLog.debug('QueryCache hit', { key });
        return cached;
      }
    }

    if (this.pendingQueries.has(key)) {
      oigLog.debug('QueryCache dedup', { key });
      return this.pendingQueries.get(key) as Promise<T>;
    }

    const promise = fetcher()
      .then(data => {
        this.set(key, data, ttl);
        return data;
      })
      .finally(() => {
        this.pendingQueries.delete(key);
      });

    this.pendingQueries.set(key, promise);
    return promise;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    oigLog.debug('QueryCache set', { key, ttl });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      const size = this.cache.size;
      this.cache.clear();
      oigLog.debug('QueryCache invalidated all', { count: size });
      return;
    }

    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    oigLog.debug('QueryCache invalidated', { pattern, count });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  clear(): void {
    this.cache.clear();
    this.pendingQueries.clear();
    oigLog.debug('QueryCache cleared');
  }

  destroy(): void {
    this.clear();
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private startCleanup(): void {
    this.cleanupTimer = window.setInterval(() => {
      let cleaned = 0;
      for (const [key, entry] of this.cache.entries()) {
        if (this.isExpired(entry)) {
          this.cache.delete(key);
          cleaned++;
        }
      }
      if (cleaned > 0) {
        oigLog.debug('QueryCache cleanup', { cleaned });
      }
    }, CLEANUP_INTERVAL);
  }
}

export const queryCache = new QueryCache();
