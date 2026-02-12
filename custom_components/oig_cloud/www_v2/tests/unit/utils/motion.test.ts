import { describe, it, expect } from 'vitest';
import { ease, animate, interpolate, interpolateArray } from '@/utils/motion';

describe('motion utils', () => {
  describe('easing functions', () => {
    it('linear should return same value', () => {
      expect(ease.linear(0)).toBe(0);
      expect(ease.linear(0.5)).toBe(0.5);
      expect(ease.linear(1)).toBe(1);
    });

    it('easeInQuad should accelerate', () => {
      expect(ease.easeInQuad(0)).toBe(0);
      expect(ease.easeInQuad(0.5)).toBe(0.25);
      expect(ease.easeInQuad(1)).toBe(1);
    });

    it('easeOutQuad should decelerate', () => {
      expect(ease.easeOutQuad(0)).toBe(0);
      expect(ease.easeOutQuad(0.5)).toBe(0.75);
      expect(ease.easeOutQuad(1)).toBe(1);
    });

    it('easeInOutQuad should accelerate then decelerate', () => {
      expect(ease.easeInOutQuad(0)).toBe(0);
      expect(ease.easeInOutQuad(0.25)).toBeCloseTo(0.125);
      expect(ease.easeInOutQuad(0.5)).toBe(0.5);
      expect(ease.easeInOutQuad(0.75)).toBeCloseTo(0.875);
      expect(ease.easeInOutQuad(1)).toBe(1);
    });

    it('easeOutBounce should bounce at end', () => {
      expect(ease.easeOutBounce(0)).toBe(0);
      expect(ease.easeOutBounce(1)).toBe(1);
    });
  });

  describe('animate', () => {
    it('should call onUpdate with progress', async () => {
      const updates: number[] = [];
      
      await new Promise<void>(resolve => {
        animate({
          duration: 50,
          easing: ease.linear,
          onUpdate: (progress) => updates.push(progress),
          onComplete: resolve,
        });
      });

      expect(updates[0]).toBeGreaterThanOrEqual(0);
      expect(updates[updates.length - 1]).toBe(1);
    });

    it('should call onStart', async () => {
      let started = false;
      
      await new Promise<void>(resolve => {
        animate({
          duration: 10,
          onStart: () => { started = true; },
          onComplete: resolve,
        });
      });

      expect(started).toBe(true);
    });

    it('should be cancellable', () => {
      const onComplete = vi.fn();
      
      const cancel = animate({
        duration: 1000,
        onComplete,
      });

      cancel();

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('interpolate', () => {
    it('should interpolate between values', () => {
      expect(interpolate(0, 100, 0)).toBe(0);
      expect(interpolate(0, 100, 0.5)).toBe(50);
      expect(interpolate(0, 100, 1)).toBe(100);
    });

    it('should handle negative values', () => {
      expect(interpolate(-50, 50, 0.5)).toBe(0);
    });
  });

  describe('interpolateArray', () => {
    it('should interpolate arrays', () => {
      expect(interpolateArray([0, 0], [100, 200], 0.5)).toEqual([50, 100]);
    });
  });
});
