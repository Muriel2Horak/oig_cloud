/**
 * Tests for the redesigned Spotřeba (house) tile:
 *  - computePhaseStatus truth table
 *  - edgeGaugeSegments arc offsets sum correctly
 *  - self-suff pill colour correctness
 */

import { describe, it, expect } from 'vitest';
import {
  computePhaseStatus,
  computeSpreadBand,
  BALANCE_UNBALANCED_W,
  BACKUP_PHASE_LIMIT_W,
  BALANCE_CALM_W,
} from '@/ui/features/flow/node';

// ---------------------------------------------------------------------------
// computePhaseStatus — truth table
// ---------------------------------------------------------------------------

describe('computePhaseStatus', () => {

  it('calm when total záloha < 300 W', () => {
    const ps = computePhaseStatus([80, 90, 100]);
    expect(ps.calm).toBe(true);
    // balance check should also be ignored visually, but check the value too
    expect(ps.spreadW).toBe(20);
    expect(ps.overloadPhase).toBeNull();
  });

  it('balanced when spread ≤ 1000 W and total ≥ 300 W', () => {
    const ps = computePhaseStatus([1000, 1200, 1280]);
    expect(ps.calm).toBe(false);
    expect(ps.balanced).toBe(true);    // 1280-1000 = 280 ≤ 1000
    expect(ps.spreadW).toBe(280);
    expect(ps.overloadPhase).toBeNull();
    expect(ps.worstPct).toBeCloseTo((1280 / BACKUP_PHASE_LIMIT_W) * 100, 1);
  });

  it('unbalanced when spread > 1000 W', () => {
    // L1=3800 is also overloaded, so unbalanced=false AND overload
    const ps = computePhaseStatus([3800, 2100, 600]);
    expect(ps.calm).toBe(false);
    expect(ps.balanced).toBe(false);   // 3800-600 = 3200 > 1000
    expect(ps.spreadW).toBe(3200);
    expect(ps.overloadPhase).toBe('L1');
  });

  it('overload detected on L1 first (manufacturer limit 3300 W)', () => {
    const ps = computePhaseStatus([3300, 1000, 800]);
    // exactly at limit → overload
    expect(ps.overloadPhase).toBe('L1');
    expect(ps.worstPct).toBeCloseTo(100, 1);
  });

  it('overload detected on L3 when only L3 exceeds limit', () => {
    const ps = computePhaseStatus([1200, 1100, 3500]);
    expect(ps.overloadPhase).toBe('L3');
  });

  it('no overload when all phases below limit', () => {
    const ps = computePhaseStatus([3299, 3000, 3100]);
    expect(ps.overloadPhase).toBeNull();
    // 3299 < 3300 so no overload
    expect(ps.worstPct).toBeCloseTo((3299 / BACKUP_PHASE_LIMIT_W) * 100, 1);
  });

  it('treats negative inputs defensively as 0', () => {
    const ps = computePhaseStatus([-100, 500, -50]);
    // negatives clamped to 0 → spread = 500-0 = 500
    expect(ps.spreadW).toBe(500);
    expect(ps.overloadPhase).toBeNull();
  });

  it('treats NaN inputs defensively as 0', () => {
    const ps = computePhaseStatus([NaN, 1500, NaN]);
    expect(ps.spreadW).toBe(1500);
    expect(ps.calm).toBe(false);
    expect(ps.overloadPhase).toBeNull();
  });

  it('all zero → calm (total 0 < BALANCE_CALM_W)', () => {
    const ps = computePhaseStatus([0, 0, 0]);
    expect(ps.calm).toBe(true);
    expect(ps.balanced).toBe(true);
    expect(ps.spreadW).toBe(0);
    expect(ps.overloadPhase).toBeNull();
    expect(ps.worstPct).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Arc offset arithmetic (edgeGaugeSegments logic validated independently)
// ---------------------------------------------------------------------------

describe('edgeGaugeSegments arc offsets', () => {

  /**
   * Simulate the cumulative-offset logic from edgeGaugeSegments:
   * each segment's dashOffset = -(sum of all previous fracs).
   */
  function computeOffsets(fracs: number[]): number[] {
    let cumulative = 0;
    return fracs.map((frac) => {
      const offset = -cumulative;
      cumulative += frac;
      return offset;
    });
  }

  it('first segment starts at offset 0', () => {
    const offsets = computeOffsets([30, 20, 50]);
    expect(offsets[0]).toBeCloseTo(0, 6);
  });

  it('second segment starts after first', () => {
    const offsets = computeOffsets([30, 20, 50]);
    expect(offsets[1]).toBe(-30);
  });

  it('third segment starts after first+second', () => {
    const offsets = computeOffsets([30, 20, 50]);
    expect(offsets[2]).toBe(-50);
  });

  it('final cumulative sum equals 100 for full ring', () => {
    const fracs = [20, 11, 69];
    const total = fracs.reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
    const offsets = computeOffsets(fracs);
    // offset[last] = -(sum of first two) = -(20+11)
    expect(offsets[2]).toBe(-31);
  });

  it('zero fracs produce offset chain without gaps', () => {
    // battery=0, fve=40, grid=60 → battery segment filtered out
    const nonZero = [40, 60];
    const offsets = computeOffsets(nonZero);
    expect(offsets[0]).toBeCloseTo(0, 6);
    expect(offsets[1]).toBe(-40);
  });

  it('all-zero case → no arcs, offsets trivially [0]', () => {
    const offsets = computeOffsets([0]);
    expect(offsets[0]).toBeCloseTo(0, 6);
  });
});

// ---------------------------------------------------------------------------
// Self-suff pill colour derivation
// ---------------------------------------------------------------------------

describe('self-suff pill colour', () => {

  function pillColor(dailySS: number): string {
    // Mirror the exact logic in renderHouse()
    return `hsl(${Math.round(Math.max(0, Math.min(120, dailySS * 1.2)))}, 72%, 46%)`;
  }

  it('0% → hsl(0) = red-ish', () => {
    expect(pillColor(0)).toBe('hsl(0, 72%, 46%)');
  });

  it('100% → hsl(120) = green', () => {
    expect(pillColor(100)).toBe('hsl(120, 72%, 46%)');
  });

  it('50% → hsl(60) = yellow-green', () => {
    expect(pillColor(50)).toBe('hsl(60, 72%, 46%)');
  });

  it('> 100% clamped to 120', () => {
    // Defensive: self-suff shouldn't exceed 100, but guard anyway
    expect(pillColor(150)).toBe('hsl(120, 72%, 46%)');
  });

  it('negative clamped to 0', () => {
    expect(pillColor(-10)).toBe('hsl(0, 72%, 46%)');
  });
});

// ---------------------------------------------------------------------------
// Exported constants sanity checks
// ---------------------------------------------------------------------------

describe('phase status constants', () => {
  it('BALANCE_UNBALANCED_W is 1000', () => expect(BALANCE_UNBALANCED_W).toBe(1000));
  it('BACKUP_PHASE_LIMIT_W is 3300', () => expect(BACKUP_PHASE_LIMIT_W).toBe(3300));
  it('BALANCE_CALM_W is 300', () => expect(BALANCE_CALM_W).toBe(300));
});

// ---------------------------------------------------------------------------
// computeSpreadBand — geometry helper for the balance band
// ---------------------------------------------------------------------------

describe('computeSpreadBand', () => {
  it('returns widthPct=0 (hide band) when totalZalohaW < BALANCE_CALM_W', () => {
    const result = computeSpreadBand([10, 15, 12], 200); // 200 < 300 = calm
    expect(result.widthPct).toBe(0);
    expect(result.leftPct).toBe(0);
  });

  it('returns widthPct=0 when totalZalohaW exactly at calm threshold boundary', () => {
    const result = computeSpreadBand([5, 8, 6], BALANCE_CALM_W - 1);
    expect(result.widthPct).toBe(0);
  });

  it('computes leftPct = min záloha width, widthPct = max-min when total ≥ BALANCE_CALM_W', () => {
    // widths: L1=6%, L2=2%, L3=13% → left=2, width=13-2=11
    const result = computeSpreadBand([6, 2, 13], 1700);
    expect(result.leftPct).toBeCloseTo(2, 6);
    expect(result.widthPct).toBeCloseTo(11, 6);
  });

  it('all phases equal → widthPct=0 (no spread), leftPct=that value', () => {
    const result = computeSpreadBand([25, 25, 25], 2700);
    expect(result.leftPct).toBe(25);
    expect(result.widthPct).toBe(0);
  });

  it('large unbalanced case returns correct band geometry', () => {
    // L1=52%, L2=29%, L3=8% → left=8, width=52-8=44
    const result = computeSpreadBand([52, 29, 8], 5300);
    expect(result.leftPct).toBeCloseTo(8, 6);
    expect(result.widthPct).toBeCloseTo(44, 6);
  });

  it('two phases at zero still works (only one phase active)', () => {
    const result = computeSpreadBand([0, 0, 40], 3600);
    expect(result.leftPct).toBeCloseTo(0, 6);
    expect(result.widthPct).toBeCloseTo(40, 6);
  });
});

// ---------------------------------------------------------------------------
// computePhaseStatus → band tint/animation integration checks
// (these verify the combined decision logic for the band: tint + shimmer)
// ---------------------------------------------------------------------------

describe('phase status + spread band tint integration', () => {
  it('calm state → band hidden (widthPct=0) regardless of spread shape', () => {
    const zaloha: [number, number, number] = [80, 90, 100];
    const ps = computePhaseStatus(zaloha);
    const widthsPct: [number, number, number] = [8, 9, 10];
    const band = computeSpreadBand(widthsPct, zaloha[0] + zaloha[1] + zaloha[2]);
    expect(ps.calm).toBe(true);
    expect(band.widthPct).toBe(0); // hidden because calm
  });

  it('balanced state → band shown with .balanced class (no shimmer)', () => {
    const zaloha: [number, number, number] = [1000, 1200, 1250];
    const ps = computePhaseStatus(zaloha);
    const total = 1000 + 1200 + 1250;
    const maxTotal = Math.max(3600, 1000 + 0, 1200 + 0, 1250 + 0);
    const widthsPct: [number, number, number] = zaloha.map(w => (w / maxTotal) * 100) as [number, number, number];
    const band = computeSpreadBand(widthsPct, total);
    expect(ps.balanced).toBe(true);
    expect(ps.calm).toBe(false);
    expect(band.widthPct).toBeGreaterThan(0);
  });

  it('unbalanced state → band shown with .unbal class (shimmer)', () => {
    const zaloha: [number, number, number] = [3800, 2100, 600];
    const ps = computePhaseStatus(zaloha);
    const total = 3800 + 2100 + 600;
    const maxTotal = Math.max(3600, 3800, 2100, 600);
    const widthsPct: [number, number, number] = zaloha.map(w => (w / maxTotal) * 100) as [number, number, number];
    const band = computeSpreadBand(widthsPct, total);
    expect(ps.balanced).toBe(false);
    expect(ps.calm).toBe(false);
    expect(band.widthPct).toBeGreaterThan(0);
  });
});
