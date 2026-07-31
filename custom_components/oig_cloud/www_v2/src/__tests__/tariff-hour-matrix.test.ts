// src/__tests__/tariff-hour-matrix.test.ts
//
// F1 dist-ux owner live-walk UX rev — pure-logic coverage for the NT/VT
// schedule grid <-> start-string port (schema.py `_parse_hour_starts` /
// `_fill_tariff_hours` / `validate_tariff_hours`). Mandatory round-trip test
// per the brief: grid -> strings -> (ported schema.py parse) -> grid must be
// identity for a set of patterns including the owner-like "22,2" and the
// weekend NT-all-day "0" default.

import { describe, expect, it } from 'vitest';
import {
  parseHourStarts,
  stringsToGrid,
  gridToStrings,
  summarizeNtIntervals,
  type Paint,
} from '@/ui/features/onboarding/tariff-hour-matrix';

function grid24(nt: number[]): Paint[] {
  const g: Paint[] = Array(24).fill('VT');
  nt.forEach((h) => { g[h] = 'NT'; });
  return g;
}

describe('parseHourStarts', () => {
  it('parses a comma list, trims whitespace', () => {
    expect(parseHourStarts('22, 2')).toEqual([22, 2]);
  });
  it('empty string -> empty list (not an error)', () => {
    expect(parseHourStarts('')).toEqual([]);
    expect(parseHourStarts('   ')).toEqual([]);
  });
  it('single value', () => {
    expect(parseHourStarts('6')).toEqual([6]);
  });
  it('rejects out-of-range hours', () => {
    expect(parseHourStarts('24')).toBeNull();
    expect(parseHourStarts('-1')).toBeNull();
  });
  it('rejects non-numeric input', () => {
    expect(parseHourStarts('abc')).toBeNull();
  });
});

describe('stringsToGrid — seed direction (matches schema.py hour_map semantics)', () => {
  it('owner-like weekday pattern vt="6" nt="22,2" — NT 22:00-06:00', () => {
    const grid = stringsToGrid('6', '22,2', false);
    expect(grid).not.toBeNull();
    expect(grid).toEqual(grid24([22, 23, 0, 1, 2, 3, 4, 5]));
  });

  it('two-block pattern vt="6,15" nt="22,13" — NT 22:00-06:00 + 13:00-15:00', () => {
    const grid = stringsToGrid('6,15', '22,13', false);
    expect(grid).toEqual(grid24([22, 23, 0, 1, 2, 3, 4, 5, 13, 14]));
  });

  it('weekend NT-all-day default vt="" nt="0" — allowSingleTariff=true -> all NT', () => {
    const grid = stringsToGrid('', '0', true);
    expect(grid).toEqual(Array(24).fill('NT'));
  });

  it('weekend NT-all-day is rejected without allowSingleTariff (weekday semantics)', () => {
    expect(stringsToGrid('', '0', false)).toBeNull();
  });

  it('both empty is always invalid (tariff_gaps, no tariff at all)', () => {
    expect(stringsToGrid('', '', true)).toBeNull();
    expect(stringsToGrid('', '', false)).toBeNull();
  });

  it('overlapping starts -> null (overlapping_tariffs)', () => {
    // vt starts at 6 and nt also starts at 6 -> same hour claimed twice.
    expect(stringsToGrid('6', '6', false)).toBeNull();
  });

  it('malformed hour string -> null', () => {
    expect(stringsToGrid('abc', '6', false)).toBeNull();
  });
});

describe('gridToStrings — persist direction + expressibility gate', () => {
  it('round-trips the owner-like pattern (weekday)', () => {
    const grid = grid24([22, 23, 0, 1, 2, 3, 4, 5]);
    const result = gridToStrings(grid, false);
    expect(result).not.toBeNull();
    const back = stringsToGrid(result!.vt, result!.nt, false);
    expect(back).toEqual(grid);
  });

  it('round-trips a 4-block pattern (NT 22:00-06:00, 13:00-15:00)', () => {
    const grid = grid24([22, 23, 0, 1, 2, 3, 4, 5, 13, 14]);
    const result = gridToStrings(grid, false);
    expect(result).not.toBeNull();
    expect(stringsToGrid(result!.vt, result!.nt, false)).toEqual(grid);
  });

  it('round-trips weekend NT-all-day (allowSingleTariff=true)', () => {
    const grid = Array(24).fill('NT') as Paint[];
    const result = gridToStrings(grid, true);
    expect(result).not.toBeNull();
    expect(result).toEqual({ vt: '', nt: '0' });
    expect(stringsToGrid(result!.vt, result!.nt, true)).toEqual(grid);
  });

  it('round-trips weekend VT-all-day (allowSingleTariff=true)', () => {
    const grid = Array(24).fill('VT') as Paint[];
    const result = gridToStrings(grid, true);
    expect(result).toEqual({ vt: '0', nt: '' });
    expect(stringsToGrid(result!.vt, result!.nt, true)).toEqual(grid);
  });

  it('blocks a monochrome WEEKDAY pattern — inexpressible without allowSingleTariff', () => {
    const grid = Array(24).fill('NT') as Paint[];
    expect(gridToStrings(grid, false)).toBeNull();
  });

  it('single-hour NT block round-trips (minimal expressible pattern)', () => {
    const grid = grid24([3]);
    const result = gridToStrings(grid, false);
    expect(result).not.toBeNull();
    expect(stringsToGrid(result!.vt, result!.nt, false)).toEqual(grid);
  });

  it('every rotation of a 2-block pattern round-trips (exhaustive sweep)', () => {
    for (let offset = 0; offset < 24; offset += 1) {
      const nt = [22, 23, 0, 1, 2, 3, 4, 5].map((h) => (h + offset) % 24);
      const grid = grid24(nt);
      const result = gridToStrings(grid, false);
      expect(result).not.toBeNull();
      expect(stringsToGrid(result!.vt, result!.nt, false)).toEqual(grid);
    }
  });
});

describe('summarizeNtIntervals — CZ live summary line', () => {
  it('matches the owner brief example: "NT: 22:00-06:00, 13:00-15:00"', () => {
    const grid = grid24([22, 23, 0, 1, 2, 3, 4, 5, 13, 14]);
    expect(summarizeNtIntervals(grid)).toBe('NT: 22:00-06:00, 13:00-15:00');
  });

  it('single NT block', () => {
    const grid = stringsToGrid('6', '22,2', false)!;
    expect(summarizeNtIntervals(grid)).toBe('NT: 22:00-06:00');
  });

  it('all-NT day', () => {
    expect(summarizeNtIntervals(Array(24).fill('NT') as Paint[])).toContain('celý den');
  });

  it('all-VT day', () => {
    expect(summarizeNtIntervals(Array(24).fill('VT') as Paint[])).toContain('žádné');
  });
});
