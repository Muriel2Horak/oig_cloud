import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatPower,
  formatEnergy,
  formatCurrency,
  formatPercent,
  formatTime,
  formatDate,
  formatDateTime,
  parseNumber,
  clamp,
} from '@/utils/format';

describe('format utils', () => {
  describe('formatNumber', () => {
    it('should format with default decimals', () => {
      expect(formatNumber(3.14159)).toBe('3.1');
      expect(formatNumber(3.14159, 2)).toBe('3.14');
      expect(formatNumber(3.14159, 4)).toBe('3.1416');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-5.678, 2)).toBe('-5.68');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0.0');
    });
  });

  describe('formatPower', () => {
    it('should format watts', () => {
      expect(formatPower(500)).toBe('500 W');
      expect(formatPower(999)).toBe('999 W');
    });

    it('should format kilowatts', () => {
      expect(formatPower(1000)).toBe('1.00 kW');
      expect(formatPower(1500)).toBe('1.50 kW');
      expect(formatPower(5000)).toBe('5.00 kW');
    });

    it('should handle negative power (export)', () => {
      expect(formatPower(-1200)).toBe('-1.20 kW');
    });
  });

  describe('formatEnergy', () => {
    it('should format watt-hours', () => {
      expect(formatEnergy(500)).toBe('500 Wh');
    });

    it('should format kilowatt-hours', () => {
      expect(formatEnergy(1000)).toBe('1.00 kWh');
      expect(formatEnergy(15000)).toBe('15.00 kWh');
    });

    it('should handle negative energy', () => {
      expect(formatEnergy(-5000)).toBe('-5.00 kWh');
    });
  });

  describe('formatCurrency', () => {
    it('should format with default currency', () => {
      expect(formatCurrency(123.45)).toBe('123.45 CZK');
    });

    it('should format with custom currency', () => {
      expect(formatCurrency(99.99, 'EUR')).toBe('99.99 EUR');
    });
  });

  describe('formatPercent', () => {
    it('should format with default decimals', () => {
      expect(formatPercent(75)).toBe('75 %');
      expect(formatPercent(75.5)).toBe('76 %');
    });

    it('should format with custom decimals', () => {
      expect(formatPercent(75.567, 2)).toBe('75.57 %');
    });
  });

  describe('formatTime', () => {
    it('should format date object', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatTime(date);
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should format string date', () => {
      const result = formatTime('2024-01-15T14:30:00');
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('formatDate', () => {
    it('should format date object', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDate(date);
      expect(result).toMatch(/^\d{1,2}\.\s*\d{1,2}\.$/);
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDateTime(date);
      expect(result).toMatch(/\d{1,2}\.\s*\d{1,2}\./);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('parseNumber', () => {
    it('should parse number', () => {
      expect(parseNumber(42)).toBe(42);
      expect(parseNumber(3.14)).toBe(3.14);
    });

    it('should parse string', () => {
      expect(parseNumber('42')).toBe(42);
      expect(parseNumber('3.14')).toBe(3.14);
    });

    it('should return 0 for invalid values', () => {
      expect(parseNumber(null)).toBe(0);
      expect(parseNumber(undefined)).toBe(0);
      expect(parseNumber('invalid')).toBe(0);
      expect(parseNumber('')).toBe(0);
    });
  });

  describe('clamp', () => {
    it('should clamp to range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle equal min and max', () => {
      expect(clamp(5, 10, 10)).toBe(10);
    });
  });
});
