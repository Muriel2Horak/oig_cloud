import { describe, expect, it } from 'vitest';
import { estimatedSegment } from '@/ui/features/pricing/estimated';

describe('estimatedSegment', () => {
  it('dashes only segments ending on an estimated point', () => {
    const segment = estimatedSegment([{}, {}, { estimated: true }], [6, 4]);
    expect(segment.borderDash({ p1DataIndex: 1 })).toBeUndefined();
    expect(segment.borderDash({ p1DataIndex: 2 })).toEqual([6, 4]);
    expect(segment.borderDash({ p1DataIndex: 9 })).toBeUndefined();
  });
});
