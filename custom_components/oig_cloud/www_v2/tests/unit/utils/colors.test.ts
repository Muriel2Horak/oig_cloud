import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  rgbToString,
  mixColors,
  lighten,
  darken,
  isDarkMode,
} from '@/utils/colors';

describe('color utils', () => {
  describe('hexToRgb', () => {
    it('should convert hex to rgb', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should handle hex without #', () => {
      expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should return black for invalid hex', () => {
      expect(hexToRgb('invalid')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('')).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('rgbToHex', () => {
    it('should convert rgb to hex', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
    });

    it('should pad single digit values', () => {
      expect(rgbToHex(15, 15, 15)).toBe('#0f0f0f');
    });
  });

  describe('rgbToString', () => {
    it('should convert to rgb string', () => {
      expect(rgbToString({ r: 255, g: 128, b: 0 })).toBe('rgb(255, 128, 0)');
    });

    it('should convert to rgba string with alpha', () => {
      expect(rgbToString({ r: 255, g: 128, b: 0 }, 0.5)).toBe('rgba(255, 128, 0, 0.5)');
    });
  });

  describe('mixColors', () => {
    it('should mix two colors', () => {
      const red = { r: 255, g: 0, b: 0 };
      const blue = { r: 0, g: 0, b: 255 };
      
      expect(mixColors(red, blue, 0)).toEqual(red);
      expect(mixColors(red, blue, 1)).toEqual(blue);
      expect(mixColors(red, blue, 0.5)).toEqual({ r: 128, g: 0, b: 128 });
    });
  });

  describe('lighten', () => {
    it('should lighten color', () => {
      const result = lighten('#ff0000', 0.5);
      expect(result).toBe('#ff8080');
    });

    it('should not change color with 0 amount', () => {
      expect(lighten('#ff0000', 0)).toBe('#ff0000');
    });

    it('should return white with 1 amount', () => {
      expect(lighten('#ff0000', 1)).toBe('#ffffff');
    });
  });

  describe('darken', () => {
    it('should darken color', () => {
      const result = darken('#ff0000', 0.5);
      expect(result).toBe('#800000');
    });

    it('should not change color with 0 amount', () => {
      expect(darken('#ff0000', 0)).toBe('#ff0000');
    });

    it('should return black with 1 amount', () => {
      expect(darken('#ff0000', 1)).toBe('#000000');
    });
  });

  describe('isDarkMode', () => {
    beforeEach(() => {
      vi.stubGlobal('getComputedStyle', () => ({
        getPropertyValue: (name: string) => {
          if (name === '--primary-background-color') return '#1a1a1a';
          return '';
        },
      }));
    });

    it('should detect dark mode based on background luminance', () => {
      expect(isDarkMode()).toBe(true);
    });
  });
});
