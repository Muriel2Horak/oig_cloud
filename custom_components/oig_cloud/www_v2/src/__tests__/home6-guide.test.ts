import { describe, expect, it } from 'vitest';
import { describeHome6Window } from '@/ui/features/onboarding/home6-guide';

const states = (start: string, end: string) => ({
  'sensor.oig_local_1_tbl_box_prm2_hgvi_s': { state: start },
  'sensor.oig_local_1_tbl_box_prm2_hgvi_e': { state: end },
});

describe('describeHome6Window', () => {
  it('shows nothing without the local proxy', () => {
    expect(describeHome6Window({})).toBeNull();
  });

  it('shows nothing while the sensors have no value', () => {
    expect(describeHome6Window(states('unknown', 'unknown'))).toBeNull();
  });

  it('says so when no window is set', () => {
    expect(describeHome6Window(states('0', '0'))).toContain('není nastavené');
  });

  it('shows the window from minutes since midnight', () => {
    expect(describeHome6Window(states('1320', '360'))).toContain('22:00–6:00');
  });
});
