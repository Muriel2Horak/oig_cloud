import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryCache } from '@/data/query-cache';

describe('QueryCache', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  describe('query', () => {
    it('should fetch and cache data', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      const result = await cache.query('key1', fetcher);
      
      expect(result).toEqual({ data: 'test' });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should return cached data on second call', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      await cache.query('key1', fetcher);
      await cache.query('key1', fetcher);
      
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate concurrent requests', async () => {
      const fetcher = vi.fn().mockImplementation(() => 
        new Promise(r => setTimeout(() => r({ data: 'test' }), 100))
      );
      
      const promises = [
        cache.query('key1', fetcher),
        cache.query('key1', fetcher),
        cache.query('key1', fetcher),
      ];
      
      vi.advanceTimersByTime(100);
      await Promise.all(promises);
      
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should force refresh with forceRefresh option', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      await cache.query('key1', fetcher);
      await cache.query('key1', fetcher, { forceRefresh: true });
      
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should respect TTL', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      await cache.query('key1', fetcher, { ttl: 1000 });
      
      vi.advanceTimersByTime(500);
      await cache.query('key1', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(1);
      
      vi.advanceTimersByTime(600);
      await cache.query('key1', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('get/set', () => {
    it('should set and get data', () => {
      cache.set('key1', { data: 'test' });
      expect(cache.get('key1')).toEqual({ data: 'test' });
    });

    it('should return null for missing key', () => {
      expect(cache.get('missing')).toBeNull();
    });

    it('should return null for expired entry', () => {
      cache.set('key1', { data: 'test' }, 100);
      
      vi.advanceTimersByTime(101);
      
      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('invalidate', () => {
    it('should invalidate all entries', async () => {
      await cache.query('key1', () => Promise.resolve('a'));
      await cache.query('key2', () => Promise.resolve('b'));
      
      cache.invalidate();
      
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });

    it('should invalidate by pattern', async () => {
      await cache.query('api/prices', () => Promise.resolve('a'));
      await cache.query('api/flow', () => Promise.resolve('b'));
      await cache.query('other', () => Promise.resolve('c'));
      
      cache.invalidate('api/');
      
      expect(cache.has('api/prices')).toBe(false);
      expect(cache.has('api/flow')).toBe(false);
      expect(cache.has('other')).toBe(true);
    });
  });

  describe('has', () => {
    it('should return true for cached entry', () => {
      cache.set('key1', { data: 'test' });
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for missing entry', () => {
      expect(cache.has('missing')).toBe(false);
    });

    it('should return false for expired entry', () => {
      cache.set('key1', { data: 'test' }, 100);
      
      vi.advanceTimersByTime(101);
      
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'a');
      cache.set('key2', 'b');
      
      cache.clear();
      
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should cleanup expired entries periodically', () => {
      cache.set('key1', 'a', 100);
      cache.set('key2', 'b', 400000);
      
      vi.advanceTimersByTime(300000);
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toEqual('b');
    });
  });
});

import { afterEach } from 'vitest';
