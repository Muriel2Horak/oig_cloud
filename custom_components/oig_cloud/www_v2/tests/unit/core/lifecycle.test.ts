import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Lifecycle } from '@/core/lifecycle';

describe('Lifecycle', () => {
  let lifecycle: Lifecycle;

  beforeEach(() => {
    lifecycle = new Lifecycle();
    vi.useFakeTimers();
  });

  afterEach(() => {
    lifecycle.unmount();
    vi.useRealTimers();
  });

  describe('onMount', () => {
    it('should call hooks on mount', async () => {
      const hook = vi.fn();
      lifecycle.onMount(hook);
      
      await lifecycle.mount();
      
      expect(hook).toHaveBeenCalledTimes(1);
    });

    it('should call hook immediately if already mounted', async () => {
      const hook1 = vi.fn();
      const hook2 = vi.fn();
      
      lifecycle.onMount(hook1);
      await lifecycle.mount();
      
      lifecycle.onMount(hook2);
      
      expect(hook1).toHaveBeenCalledTimes(1);
      expect(hook2).toHaveBeenCalledTimes(1);
    });
  });

  describe('onUnmount', () => {
    it('should call hooks on unmount', async () => {
      const hook = vi.fn();
      lifecycle.onUnmount(hook);
      
      await lifecycle.mount();
      await lifecycle.unmount();
      
      expect(hook).toHaveBeenCalledTimes(1);
    });

    it('should not call hooks twice', async () => {
      const hook = vi.fn();
      lifecycle.onUnmount(hook);
      
      await lifecycle.mount();
      await lifecycle.unmount();
      await lifecycle.unmount();
      
      expect(hook).toHaveBeenCalledTimes(1);
    });
  });

  describe('mount', () => {
    it('should only mount once', async () => {
      const hook = vi.fn();
      lifecycle.onMount(hook);
      
      await lifecycle.mount();
      await lifecycle.mount();
      
      expect(hook).toHaveBeenCalledTimes(1);
    });
  });

  describe('intervals', () => {
    it('should track and clear intervals', async () => {
      const callback = vi.fn();
      
      await lifecycle.mount();
      
      const id = lifecycle.setInterval(callback, 100);
      
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
      
      lifecycle.clearInterval(id);
      
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should clear all intervals on unmount', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      await lifecycle.mount();
      
      lifecycle.setInterval(callback1, 100);
      lifecycle.setInterval(callback2, 100);
      
      await lifecycle.unmount();
      
      vi.advanceTimersByTime(200);
      
      expect(callback1).toHaveBeenCalledTimes(0);
      expect(callback2).toHaveBeenCalledTimes(0);
    });
  });

  describe('timeouts', () => {
    it('should track and clear timeouts', async () => {
      const callback = vi.fn();
      
      await lifecycle.mount();
      
      const id = lifecycle.setTimeout(callback, 100);
      
      vi.advanceTimersByTime(50);
      lifecycle.clearTimeout(id);
      
      vi.advanceTimersByTime(100);
      
      expect(callback).toHaveBeenCalledTimes(0);
    });

    it('should auto-remove from tracking after fire', async () => {
      const callback = vi.fn();
      
      await lifecycle.mount();
      
      lifecycle.setTimeout(callback, 100);
      
      vi.advanceTimersByTime(100);
      
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('eventListeners', () => {
    it('should track and remove event listeners', async () => {
      const target = document.createElement('div');
      const handler = vi.fn();
      
      await lifecycle.mount();
      
      lifecycle.addEventListener(target, 'click', handler);
      
      target.click();
      expect(handler).toHaveBeenCalledTimes(1);
      
      lifecycle.removeEventListener(target, 'click', handler);
      
      target.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should remove all listeners on unmount', async () => {
      const target = document.createElement('div');
      const handler = vi.fn();
      
      await lifecycle.mount();
      
      lifecycle.addEventListener(target, 'click', handler);
      
      await lifecycle.unmount();
      
      target.click();
      expect(handler).toHaveBeenCalledTimes(0);
    });
  });
});

import { afterEach } from 'vitest';
