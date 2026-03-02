import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { $, $$, on, debounce, throttle, isVisible, isPageVisible } from '@/utils/dom';

describe('dom utils', () => {
  describe('$', () => {
    it('should query single element', () => {
      document.body.innerHTML = '<div id="test"></div>';
      const el = $('#test');
      expect(el).toBeTruthy();
      expect(el?.id).toBe('test');
    });

    it('should return null for non-existent element', () => {
      const el = $('#nonexistent');
      expect(el).toBeNull();
    });
  });

  describe('$$', () => {
    it('should query multiple elements', () => {
      document.body.innerHTML = '<div class="item"></div><div class="item"></div>';
      const els = $$('.item');
      expect(els).toHaveLength(2);
    });

    it('should return empty array for no matches', () => {
      const els = $$('.nonexistent');
      expect(els).toHaveLength(0);
    });
  });

  describe('on', () => {
    it('should add event listener and return unsubscribe', () => {
      const target = document.createElement('button');
      const handler = vi.fn();
      
      const unsubscribe = on(target, 'click', handler);
      
      target.click();
      expect(handler).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      target.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should throttle function calls', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('isVisible', () => {
    it('should check if element is in viewport', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      
      el.getBoundingClientRect = () => ({
        top: 100,
        bottom: 200,
        left: 0,
        right: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      });

      expect(isVisible(el)).toBe(true);
    });
  });

  describe('isPageVisible', () => {
    it('should return true when page is visible', () => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      expect(isPageVisible()).toBe(true);
    });

    it('should return false when page is hidden', () => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      expect(isPageVisible()).toBe(false);
    });
  });
});
