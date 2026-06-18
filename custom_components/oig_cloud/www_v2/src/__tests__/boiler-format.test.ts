import { describe, it, expect } from 'vitest';
import {
  formatTempC,
  formatKwh,
  formatCzk,
  formatPercent,
  formatTimeRange,
  formatDataAge,
} from '@/ui/features/boiler/format';

describe('boiler formatters', () => {
  it('formats temperature with 1 decimal and unit', () => {
    expect(formatTempC(45)).toBe('45.0 °C');
    expect(formatTempC(45.27)).toBe('45.3 °C');
    expect(formatTempC(null)).toBe('—');
  });
  it('formats kWh with 2 decimals', () => {
    expect(formatKwh(1.5)).toBe('1.50 kWh');
    expect(formatKwh(null)).toBe('—');
  });
  it('formats CZK with 2 decimals', () => {
    expect(formatCzk(2.123)).toBe('2.12 Kč');
    expect(formatCzk(null)).toBe('—');
  });
  it('formats percent with 0 decimals', () => {
    expect(formatPercent(0.42)).toBe('42 %');
    expect(formatPercent(null)).toBe('—');
  });
  it('formats time range hh:mm – hh:mm', () => {
    expect(formatTimeRange('2026-04-26T14:00:00Z', '2026-04-26T14:15:00Z')).toMatch(/\d{2}:\d{2}\s*–\s*\d{2}:\d{2}/);
  });
  it('formats data age in human form', () => {
    expect(formatDataAge(45)).toBe('45 s');
    expect(formatDataAge(125)).toBe('2 min');
    expect(formatDataAge(7200)).toBe('2 h');
    expect(formatDataAge(null)).toBe('—');
  });
});
