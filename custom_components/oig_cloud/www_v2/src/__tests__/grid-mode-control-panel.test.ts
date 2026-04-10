import { describe, it, expect } from 'vitest';
import {
  resolveGridDelivery,
  GRID_DELIVERY_SENSOR_MAP,
  GRID_DELIVERY_LABELS,
  GridDelivery,
} from '@/ui/features/control-panel/types';

describe('resolveGridDelivery — robustness against sensor value variants', () => {
  it('resolves canonical Czech exact matches', () => {
    expect(resolveGridDelivery('Vypnuto')).toBe('off');
    expect(resolveGridDelivery('Zapnuto')).toBe('on');
    expect(resolveGridDelivery('Omezeno')).toBe('limited');
  });

  it('resolves lowercase Czech variants', () => {
    expect(resolveGridDelivery('vypnuto')).toBe('off');
    expect(resolveGridDelivery('zapnuto')).toBe('on');
    expect(resolveGridDelivery('omezeno')).toBe('limited');
  });

  it('resolves canonical English exact matches', () => {
    expect(resolveGridDelivery('Off')).toBe('off');
    expect(resolveGridDelivery('On')).toBe('on');
    expect(resolveGridDelivery('Limited')).toBe('limited');
  });

  it('resolves lowercase English variants', () => {
    expect(resolveGridDelivery('off')).toBe('off');
    expect(resolveGridDelivery('on')).toBe('on');
    expect(resolveGridDelivery('limited')).toBe('limited');
  });

  it('resolves numeric string variants', () => {
    expect(resolveGridDelivery('0')).toBe('off');
    expect(resolveGridDelivery('1')).toBe('on');
    expect(resolveGridDelivery('2')).toBe('limited');
  });

  it('resolves all-caps variants via case-insensitive fallback', () => {
    expect(resolveGridDelivery('OFF')).toBe('off');
    expect(resolveGridDelivery('ON')).toBe('on');
    expect(resolveGridDelivery('LIMITED')).toBe('limited');
    expect(resolveGridDelivery('OMEZENO')).toBe('limited');
    expect(resolveGridDelivery('ZAPNUTO')).toBe('on');
    expect(resolveGridDelivery('VYPNUTO')).toBe('off');
  });

  it('resolves compound values like "Omezeno (5000 W)" via prefix matching', () => {
    expect(resolveGridDelivery('Omezeno (5000 W)')).toBe('limited');
    expect(resolveGridDelivery('Omezení')).toBe('limited');
  });

  it('resolves values with leading/trailing whitespace', () => {
    expect(resolveGridDelivery('  Omezeno  ')).toBe('limited');
    expect(resolveGridDelivery(' Zapnuto ')).toBe('on');
    expect(resolveGridDelivery(' Vypnuto ')).toBe('off');
  });

  it('returns "off" for unknown/transition values instead of crashing', () => {
    expect(resolveGridDelivery('Probíhá změna')).toBe('off');
    expect(resolveGridDelivery('')).toBe('off');
    expect(resolveGridDelivery('unknown_state')).toBe('off');
  });
});

describe('GRID_DELIVERY_SENSOR_MAP — covers both Czech and English keys', () => {
  it('has entries for all three GridDelivery states in multiple forms', () => {
    const values = Object.values(GRID_DELIVERY_SENSOR_MAP);
    expect(values).toContain('off');
    expect(values).toContain('on');
    expect(values).toContain('limited');
  });

  it('maps "Omezeno" to limited (Czech backend canonical)', () => {
    expect(GRID_DELIVERY_SENSOR_MAP['Omezeno']).toBe('limited');
  });
});

describe('GRID_DELIVERY_LABELS — nice user-facing labels preserved', () => {
  it('keeps Czech user-facing labels for all three modes', () => {
    expect(GRID_DELIVERY_LABELS['off']).toBe('Vypnuto');
    expect(GRID_DELIVERY_LABELS['on']).toBe('Zapnuto');
    expect(GRID_DELIVERY_LABELS['limited']).toBe('S omezením');
  });
});

describe('Grid mode + limit ordered split flow', () => {
  it('resolveGridDelivery preserves existing limited state during "Probíhá změna" transition', () => {
    const transitionRaw = 'Probíhá změna';
    expect(resolveGridDelivery(transitionRaw)).toBe('off');
  });

  it('resolves to limited consistently regardless of casing variation', () => {
    const variants = ['Omezeno', 'omezeno', 'OMEZENO', 'Limited', 'limited', 'LIMITED', '2'];
    for (const v of variants) {
      expect(resolveGridDelivery(v)).toBe('limited' as GridDelivery);
    }
  });

  it('resolves to on consistently regardless of casing variation', () => {
    const variants = ['Zapnuto', 'zapnuto', 'ZAPNUTO', 'On', 'on', 'ON', '1'];
    for (const v of variants) {
      expect(resolveGridDelivery(v)).toBe('on' as GridDelivery);
    }
  });

  it('resolves to off consistently regardless of casing variation', () => {
    const variants = ['Vypnuto', 'vypnuto', 'VYPNUTO', 'Off', 'off', 'OFF', '0'];
    for (const v of variants) {
      expect(resolveGridDelivery(v)).toBe('off' as GridDelivery);
    }
  });
});
