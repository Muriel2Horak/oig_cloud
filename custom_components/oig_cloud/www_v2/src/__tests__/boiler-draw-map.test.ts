import { describe, it, expect, beforeEach } from 'vitest';
import { OigBoilerDrawMap, pickProfile, drawWindows } from '@/ui/features/boiler/boiler-draw-map';
import type { DrawMapData } from '@/ui/features/boiler/types';

const z = (): number[] => new Array(96).fill(0);
function withSlots(pairs: Array<[number, number]>): number[] {
  const a = z();
  for (const [s, v] of pairs) a[s] = v;
  return a;
}

const SAMPLE: DrawMapData = {
  slotDurationMin: 15,
  weekly: [
    { date: '2026-06-11', category: 'workday_summer', dayType: 'workday', slotsLiters: withSlots([[28, 19], [76, 12]]), totalLiters: 31 },
    { date: '2026-06-13', category: 'weekend_summer', dayType: 'weekend', slotsLiters: withSlots([[36, 41]]), totalLiters: 41 },
  ],
  profiles: {
    workday_summer: { slotsLitersP90: withSlots([[25, 8], [26, 14], [27, 10]]), days: 6 },
    weekend_summer: { slotsLitersP90: withSlots([[36, 30]]), days: 2 },
  },
};

describe('drawWindows', () => {
  it('groups contiguous slots into one window with summed litres', () => {
    const prof = withSlots([[25, 8], [26, 14], [27, 10]]);
    const wins = drawWindows(prof);
    expect(wins).toHaveLength(1);
    expect(wins[0].sum).toBeCloseTo(32, 1);
    expect(wins[0].pk).toBe(26); // peak slot
  });

  it('separates non-adjacent draws', () => {
    const wins = drawWindows(withSlots([[10, 5], [40, 9]]));
    expect(wins).toHaveLength(2);
  });

  it('ignores sub-threshold noise', () => {
    expect(drawWindows(withSlots([[10, 0.1]]))).toHaveLength(0);
  });
});

describe('pickProfile', () => {
  const profs = SAMPLE.profiles;
  it('prefers the current season for a day type', () => {
    expect(pickProfile(profs, 'workday', 7)).toBe(profs.workday_summer); // July → summer
    expect(pickProfile(profs, 'weekend', 7)).toBe(profs.weekend_summer);
  });
  it('falls back to any season of the day type when current season absent', () => {
    expect(pickProfile(profs, 'workday', 1)).toBe(profs.workday_summer); // Jan → winter missing
  });
  it('returns null when no profile for the day type', () => {
    expect(pickProfile({}, 'workday', 7)).toBeNull();
  });
});

describe('OigBoilerDrawMap render', () => {
  let el: OigBoilerDrawMap;
  beforeEach(() => { el = document.createElement('oig-boiler-draw-map') as OigBoilerDrawMap; document.body.appendChild(el); });

  it('shows empty state without data', async () => {
    el.data = null;
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('boiler-draw-map');
    expect(html).toMatch(/Sbírám data|Collecting/i);
  });

  it('renders heatmap + profile with data', async () => {
    el.data = SAMPLE;
    el.month = 7;
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('<svg');
    expect(html).toMatch(/Pracovní den|Workday/i);
    // biggest-draw chip from workday profile (≥5 L window)
    expect(html).toMatch(/L<\/b>/);
  });

  it('toggles to weekend profile', async () => {
    el.data = SAMPLE;
    el.month = 7;
    await el.updateComplete;
    (el as any).dayType = 'weekend';
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('<svg');
  });
});
