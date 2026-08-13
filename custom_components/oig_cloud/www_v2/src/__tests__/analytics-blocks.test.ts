import { describe, it, expect } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type {
  BatteryEfficiencyData,
  BatteryHealthData,
  BatteryBalancingData,
  CostComparisonData,
} from '@/data/analytics-data';
import '@/ui/features/analytics/blocks';
import type {
  OigAnalyticsBlock,
  OigBatteryEfficiency,
  OigBatteryHealth,
  OigBatteryBalancing,
  OigCostComparison,
} from '@/ui/features/analytics/blocks';

type LitEl<T> = T & HTMLElement & { updateComplete: Promise<boolean> };

async function flush(el: LitEl<unknown>): Promise<void> {
  await el.updateComplete;
  await new Promise(r => setTimeout(r, 0));
  await el.updateComplete;
}

function shadowText(el: LitEl<unknown>): string {
  return el.shadowRoot!.textContent ?? '';
}

// ============================================================================
// OigAnalyticsBlock
// ============================================================================

describe('oig-analytics-block', () => {
  it('renders title and icon', async () => {
    const el = await fixture<LitEl<OigAnalyticsBlock>>(
      html`<oig-analytics-block title="Test Title" icon="X"></oig-analytics-block>`,
    );
    await flush(el);
    const text = shadowText(el);
    expect(text).toContain('Test Title');
    expect(text).toContain('X');
  });

  it('renders default icon when none provided', async () => {
    const el = await fixture<LitEl<OigAnalyticsBlock>>(
      html`<oig-analytics-block title="T"></oig-analytics-block>`,
    );
    await flush(el);
    expect(el.icon).toBe('\u{1F4CA}');
  });

  it('renders slotted content', async () => {
    const el = await fixture<LitEl<OigAnalyticsBlock>>(
      html`<oig-analytics-block title="T"><span class="inner">slot content</span></oig-analytics-block>`,
    );
    await flush(el);
    const slot = el.shadowRoot!.querySelector('slot');
    expect(slot).not.toBeNull();
    expect(el.querySelector('.inner')!.textContent).toBe('slot content');
  });

  it('has block-header and block-title elements', async () => {
    const el = await fixture<LitEl<OigAnalyticsBlock>>(
      html`<oig-analytics-block title="Header"></oig-analytics-block>`,
    );
    await flush(el);
    expect(el.shadowRoot!.querySelector('.block-header')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.block-title')!.textContent).toBe('Header');
    expect(el.shadowRoot!.querySelector('.block-icon')).not.toBeNull();
  });
});

// ============================================================================
// OigBatteryEfficiency
// ============================================================================

function makeEfficiency(overrides: Partial<BatteryEfficiencyData> = {}): BatteryEfficiencyData {
  return {
    efficiency: 92.5,
    charged: 120.5,
    discharged: 110.3,
    losses: 10.2,
    lossesPct: 8.5,
    trend: 2.3,
    period: 'last_month',
    currentMonthDays: 15,
    lastMonth: null,
    currentMonth: null,
    ...overrides,
  };
}

describe('oig-battery-efficiency', () => {
  it('renders loading state when data is null', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency></oig-battery-efficiency>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('Na\u010D\u00EDt\u00E1n\u00ED');
  });

  it('renders efficiency value formatted as percent', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency .data=${makeEfficiency({ efficiency: 92.5 })}></oig-battery-efficiency>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('92.5 %');
  });

  it('renders last_month period label', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency .data=${makeEfficiency({ period: 'last_month' })}></oig-battery-efficiency>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('Minul\u00FD m\u011Bs\u00EDc');
  });

  it('renders current_month period label with days', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency .data=${makeEfficiency({ period: 'current_month', currentMonthDays: 22 })}></oig-battery-efficiency>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('Aktu\u00E1ln\u00ED m\u011Bs\u00EDc');
    expect(shadowText(el)).toContain('22');
  });

  it('shows positive trend with + sign and positive class', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency .data=${makeEfficiency({ trend: 3.2 })}></oig-battery-efficiency>`,
    );
    await flush(el);
    const comp = el.shadowRoot!.querySelector('.comparison');
    expect(comp).not.toBeNull();
    expect(comp!.classList.contains('positive')).toBe(true);
    expect(comp!.textContent).toContain('+');
    expect(comp!.textContent).toContain('3 %');
  });

  it('shows negative trend with negative class and no + sign', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency .data=${makeEfficiency({ trend: -1.5 })}></oig-battery-efficiency>`,
    );
    await flush(el);
    const comp = el.shadowRoot!.querySelector('.comparison');
    expect(comp).not.toBeNull();
    expect(comp!.classList.contains('negative')).toBe(true);
    expect(comp!.textContent).not.toContain('+');
  });

  it('hides comparison when trend is zero', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency .data=${makeEfficiency({ trend: 0 })}></oig-battery-efficiency>`,
    );
    await flush(el);
    expect(el.shadowRoot!.querySelector('.comparison')).toBeNull();
  });

  it('renders charged, discharged, losses in stats grid', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency .data=${makeEfficiency({ charged: 120.5, discharged: 110.3, losses: 10.2 })}></oig-battery-efficiency>`,
    );
    await flush(el);
    const text = shadowText(el);
    expect(text).toContain('120.5 kWh');
    expect(text).toContain('110.3 kWh');
    expect(text).toContain('10.2 kWh');
  });

  it('formats kWh with 2 decimals for values < 10', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency .data=${makeEfficiency({ charged: 5.67 })}></oig-battery-efficiency>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('5.67 kWh');
  });

  it('formats kWh with 1 decimal for values >= 10', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency .data=${makeEfficiency({ charged: 120.567 })}></oig-battery-efficiency>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('120.6 kWh');
  });

  it('shows lossesPct when truthy', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency .data=${makeEfficiency({ lossesPct: 8.5 })}></oig-battery-efficiency>`,
    );
    await flush(el);
    const lossesPct = el.shadowRoot!.querySelector('.losses-pct');
    expect(lossesPct).not.toBeNull();
    expect(lossesPct!.textContent).toContain('8.5 %');
  });

  it('hides lossesPct when zero (falsy)', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency .data=${makeEfficiency({ lossesPct: 0 })}></oig-battery-efficiency>`,
    );
    await flush(el);
    expect(el.shadowRoot!.querySelector('.losses-pct')).toBeNull();
  });

  it('renders stat labels Nabito, Vybito, Ztr\u00E1ty', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency .data=${makeEfficiency()}></oig-battery-efficiency>`,
    );
    await flush(el);
    const text = shadowText(el);
    expect(text).toContain('Nabito');
    expect(text).toContain('Vybito');
    expect(text).toContain('Ztr\u00E1ty');
  });

  it('handles negative kWh values with correct decimal precision', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency .data=${makeEfficiency({ charged: -3.456 })}></oig-battery-efficiency>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('-3.46 kWh');
  });

  it('handles large negative kWh values', async () => {
    const el = await fixture<LitEl<OigBatteryEfficiency>>(
      html`<oig-battery-efficiency .data=${makeEfficiency({ charged: -15.789 })}></oig-battery-efficiency>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('-15.8 kWh');
  });
});

// ============================================================================
// OigBatteryHealth
// ============================================================================

function makeHealth(overrides: Partial<BatteryHealthData> = {}): BatteryHealthData {
  return {
    soh: 94.5,
    capacity: 12.8,
    nominalCapacity: 13.5,
    minCapacity: 11.2,
    measurementCount: 42,
    lastAnalysis: '2026-08-01T10:00:00Z',
    qualityScore: 85,
    sohMethod: 'coulomb_counting',
    sohMethodDescription: null,
    measurementHistory: [
      { timestamp: '2026-01-01', soh_percent: 96, capacity_kwh: 13, delta_soc: 20, charge_wh: 2000, duration_hours: 2 },
      { timestamp: '2026-04-01', soh_percent: 95, capacity_kwh: 12.9, delta_soc: 20, charge_wh: 2000, duration_hours: 2 },
      { timestamp: '2026-07-01', soh_percent: 94, capacity_kwh: 12.8, delta_soc: 20, charge_wh: 2000, duration_hours: 2 },
    ],
    degradation3m: -0.5,
    degradation6m: -1.2,
    degradation12m: -2.5,
    degradationPerYear: -2.1,
    estimatedEolDate: '2038-06',
    yearsTo80Pct: 12.5,
    trendConfidence: 72,
    status: 'good',
    statusLabel: 'Dobr\u00FD',
    ...overrides,
  };
}

describe('oig-battery-health', () => {
  it('renders loading state when data is null', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health></oig-battery-health>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('Na\u010D\u00EDt\u00E1n\u00ED');
  });

  it('renders status badge with correct class and label', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ status: 'excellent', statusLabel: 'Vynikaj\u00EDc\u00ED' })}></oig-battery-health>`,
    );
    await flush(el);
    const badge = el.shadowRoot!.querySelector('.status-badge');
    expect(badge).not.toBeNull();
    expect(badge!.classList.contains('excellent')).toBe(true);
    expect(badge!.textContent).toContain('Vynikaj\u00EDc\u00ED');
  });

  it('renders SoH value', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ soh: 94.5 })}></oig-battery-health>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('94.5 %');
  });

  it('renders capacity metrics', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ capacity: 12.8, minCapacity: 11.2, nominalCapacity: 13.5 })}></oig-battery-health>`,
    );
    await flush(el);
    const text = shadowText(el);
    expect(text).toContain('12.8 kWh');
    expect(text).toContain('11.2 kWh');
    expect(text).toContain('13.5 kWh');
  });

  it('renders measurement count', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ measurementCount: 42 })}></oig-battery-health>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('42');
  });

  it('renders quality score when present', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ qualityScore: 85 })}></oig-battery-health>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('85 %');
    expect(shadowText(el)).toContain('Kvalita dat');
  });

  it('hides quality score when null', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ qualityScore: null })}></oig-battery-health>`,
    );
    await flush(el);
    expect(shadowText(el)).not.toContain('Kvalita dat');
  });

  it('renders sparkline SVG when history has >= 2 points', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth()}></oig-battery-health>`,
    );
    await flush(el);
    const svg = el.shadowRoot!.querySelector('.sparkline-container svg');
    expect(svg).not.toBeNull();
    const polyline = el.shadowRoot!.querySelector('polyline');
    expect(polyline).not.toBeNull();
    expect(polyline!.getAttribute('points')).toBeTruthy();
  });

  it('hides sparkline when history has < 2 points', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ measurementHistory: [{ timestamp: '2026-01-01', soh_percent: 96, capacity_kwh: 13, delta_soc: 20, charge_wh: 2000, duration_hours: 2 }] })}></oig-battery-health>`,
    );
    await flush(el);
    expect(el.shadowRoot!.querySelector('.sparkline-container')).toBeNull();
  });

  it('hides sparkline when history is empty', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ measurementHistory: [] })}></oig-battery-health>`,
    );
    await flush(el);
    expect(el.shadowRoot!.querySelector('.sparkline-container')).toBeNull();
  });

  it('renders degradation section when degradation values present', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ degradation3m: -0.5, degradation6m: -1.2, degradation12m: -2.5 })}></oig-battery-health>`,
    );
    await flush(el);
    const text = shadowText(el);
    expect(text).toContain('Degradace');
    expect(text).toContain('3 m\u011Bs\u00EDce');
    expect(text).toContain('6 m\u011Bs\u00EDc\u016F');
    expect(text).toContain('12 m\u011Bs\u00EDc\u016F');
    expect(text).toContain('-0.50 %');
    expect(text).toContain('-1.20 %');
    expect(text).toContain('-2.50 %');
  });

  it('hides degradation section when all degradation values are null', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ degradation3m: null, degradation6m: null, degradation12m: null })}></oig-battery-health>`,
    );
    await flush(el);
    const sections = el.shadowRoot!.querySelectorAll('.degradation-section');
    const hasDegradation = Array.from(sections).some(s => s.textContent!.includes('3 m\u011Bs\u00EDce'));
    expect(hasDegradation).toBe(false);
  });

  it('applies negative class for positive degradation values', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ degradation3m: 0.5, degradation6m: null, degradation12m: null })}></oig-battery-health>`,
    );
    await flush(el);
    const metrics = el.shadowRoot!.querySelectorAll('.metric-value');
    const degMetric = Array.from(metrics).find(m => m.textContent!.includes('0.50'));
    expect(degMetric).toBeTruthy();
    expect(degMetric!.classList.contains('negative')).toBe(true);
  });

  it('does not apply negative class for negative degradation values', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ degradation3m: -0.5, degradation6m: null, degradation12m: null })}></oig-battery-health>`,
    );
    await flush(el);
    const metrics = el.shadowRoot!.querySelectorAll('.metric-value');
    const degMetric = Array.from(metrics).find(m => m.textContent!.includes('-0.50'));
    expect(degMetric).toBeTruthy();
    expect(degMetric!.classList.contains('negative')).toBe(false);
  });

  it('renders prediction section when prediction values present', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ degradationPerYear: -2.1, yearsTo80Pct: 12.5, estimatedEolDate: '2038-06', trendConfidence: 72 })}></oig-battery-health>`,
    );
    await flush(el);
    const text = shadowText(el);
    expect(text).toContain('Predikce');
    expect(text).toContain('-2.10 %/rok');
    expect(text).toContain('12.5 let');
    expect(text).toContain('2038-06');
    expect(text).toContain('72 %');
  });

  it('hides prediction section when all prediction values are null/empty', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ degradationPerYear: null, yearsTo80Pct: null, estimatedEolDate: null, trendConfidence: null })}></oig-battery-health>`,
    );
    await flush(el);
    const sections = el.shadowRoot!.querySelectorAll('.degradation-section');
    const hasPrediction = Array.from(sections).some(s => s.textContent!.includes('Predikce'));
    expect(hasPrediction).toBe(false);
  });

  it('renders partial degradation (only 6m)', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ degradation3m: null, degradation6m: -1.0, degradation12m: null })}></oig-battery-health>`,
    );
    await flush(el);
    const text = shadowText(el);
    expect(text).toContain('6 m\u011Bs\u00EDc\u016F');
    expect(text).toContain('-1.00 %');
    expect(text).not.toContain('3 m\u011Bs\u00EDce');
  });

  it('renders partial prediction (only degradationPerYear)', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ degradationPerYear: -1.5, yearsTo80Pct: null, estimatedEolDate: null, trendConfidence: null })}></oig-battery-health>`,
    );
    await flush(el);
    const text = shadowText(el);
    expect(text).toContain('-1.50 %/rok');
    expect(text).not.toContain('80% SoH');
    expect(text).not.toContain('Odhad EOL');
    expect(text).not.toContain('Spolehlivost');
  });

  it('renders fair status badge', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ status: 'fair', statusLabel: 'Uspokojiv\u00FD' })}></oig-battery-health>`,
    );
    await flush(el);
    const badge = el.shadowRoot!.querySelector('.status-badge');
    expect(badge!.classList.contains('fair')).toBe(true);
  });

  it('renders poor status badge', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ status: 'poor', statusLabel: '\u0160patn\u00FD' })}></oig-battery-health>`,
    );
    await flush(el);
    const badge = el.shadowRoot!.querySelector('.status-badge');
    expect(badge!.classList.contains('poor')).toBe(true);
  });

  it('sparkline handles identical soh values (range=0 fallback)', async () => {
    const history = [
      { timestamp: '2026-01-01', soh_percent: 95, capacity_kwh: 13, delta_soc: 20, charge_wh: 2000, duration_hours: 2 },
      { timestamp: '2026-04-01', soh_percent: 95, capacity_kwh: 13, delta_soc: 20, charge_wh: 2000, duration_hours: 2 },
    ];
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth({ measurementHistory: history })}></oig-battery-health>`,
    );
    await flush(el);
    const svg = el.shadowRoot!.querySelector('.sparkline-container svg');
    expect(svg).not.toBeNull();
  });

  it('renders metric labels correctly', async () => {
    const el = await fixture<LitEl<OigBatteryHealth>>(
      html`<oig-battery-health .data=${makeHealth()}></oig-battery-health>`,
    );
    await flush(el);
    const text = shadowText(el);
    expect(text).toContain('State of Health');
    expect(text).toContain('Kapacita (P80)');
    expect(text).toContain('Min. kapacita (P20)');
    expect(text).toContain('Nomin\u00E1ln\u00ED kapacita');
    expect(text).toContain('Po\u010Det m\u011B\u0159en\u00ED');
  });
});

// ============================================================================
// OigBatteryBalancing
// ============================================================================

function makeBalancing(overrides: Partial<BatteryBalancingData> = {}): BatteryBalancingData {
  return {
    status: 'completed',
    lastBalancing: '2026-07-15',
    cost: 250.50,
    nextScheduled: '2026-10-15',
    daysRemaining: 63,
    progressPercent: 45,
    intervalDays: 90,
    estimatedNextCost: 300,
    ...overrides,
  };
}

describe('oig-battery-balancing', () => {
  it('renders loading state when data is null', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('Na\u010D\u00EDt\u00E1n\u00ED');
  });

  it('renders no-info state when status is unknown and no data', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({
        status: 'unknown',
        lastBalancing: '',
        cost: 0,
        nextScheduled: null,
        daysRemaining: null,
        progressPercent: null,
        intervalDays: null,
        estimatedNextCost: null,
      })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('\u017D\u00E1dn\u00E9 balancov\u00E1n\u00ED zaznamen\u00E1no');
  });

  it('renders no-info for unknown status with em-dash lastBalancing', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({
        status: 'unknown',
        lastBalancing: '\u2014',
        cost: 0,
        nextScheduled: null,
        daysRemaining: null,
        progressPercent: null,
        intervalDays: null,
        estimatedNextCost: null,
      })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('\u017D\u00E1dn\u00E9 balancov\u00E1n\u00ED zaznamen\u00E1no');
  });

  it('maps status labels correctly: completed', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ status: 'completed' })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('Dokon\u010Deno');
  });

  it('maps status labels correctly: idle', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ status: 'idle' })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('Ne\u010Dinn\u00E9');
  });

  it('maps status labels correctly: charging', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ status: 'charging' })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('Nab\u00EDjen\u00ED');
  });

  it('maps status labels correctly: holding', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ status: 'holding' })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('Dr\u017Een\u00ED 100 %');
  });

  it('falls through to raw status for unknown values', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ status: 'custom_state' })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('custom_state');
  });

  it('renders last balancing date when present and not em-dash', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ lastBalancing: '2026-07-15' })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('2026-07-15');
    expect(shadowText(el)).toContain('Posledn\u00ED');
  });

  it('hides last balancing when em-dash', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ lastBalancing: '\u2014', status: 'idle' })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).not.toContain('Posledn\u00ED');
  });

  it('renders cost when > 0', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ cost: 250.50 })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('250.50 CZK');
    expect(shadowText(el)).toContain('N\u00E1klady');
  });

  it('hides cost when 0', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ cost: 0 })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).not.toContain('N\u00E1klady');
  });

  it('renders next scheduled date', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ nextScheduled: '2026-10-15' })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('2026-10-15');
    expect(shadowText(el)).toContain('Pl\u00E1nov\u00E1no');
  });

  it('hides next scheduled when null', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ nextScheduled: null })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).not.toContain('Pl\u00E1nov\u00E1no');
  });

  it('renders progress bar with days remaining when present', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ progressPercent: 45, daysRemaining: 63 })}></oig-battery-balancing>`,
    );
    await flush(el);
    const progressContainer = el.shadowRoot!.querySelector('.progress-container');
    expect(progressContainer).not.toBeNull();
    expect(shadowText(el)).toContain('63 dn\u00ED zb\u00FDv\u00E1');
    const fill = el.shadowRoot!.querySelector('.progress-fill') as HTMLElement;
    expect(fill).not.toBeNull();
    expect(fill.style.width).toBe('45%');
  });

  it('renders progress bar with percentage when daysRemaining is null', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ progressPercent: 75, daysRemaining: null })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('75%');
  });

  it('hides progress bar when progressPercent is null', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ progressPercent: null })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(el.shadowRoot!.querySelector('.progress-container')).toBeNull();
  });

  it('progress fill class ok for < 80', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ progressPercent: 50 })}></oig-battery-balancing>`,
    );
    await flush(el);
    const fill = el.shadowRoot!.querySelector('.progress-fill');
    expect(fill!.classList.contains('ok')).toBe(true);
  });

  it('progress fill class due-soon for >= 80 and < 95', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ progressPercent: 85 })}></oig-battery-balancing>`,
    );
    await flush(el);
    const fill = el.shadowRoot!.querySelector('.progress-fill');
    expect(fill!.classList.contains('due-soon')).toBe(true);
  });

  it('progress fill class overdue for >= 95', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ progressPercent: 98 })}></oig-battery-balancing>`,
    );
    await flush(el);
    const fill = el.shadowRoot!.querySelector('.progress-fill');
    expect(fill!.classList.contains('overdue')).toBe(true);
  });

  it('progress fill class ok for null percent (boundary)', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ progressPercent: 0 })}></oig-battery-balancing>`,
    );
    await flush(el);
    const fill = el.shadowRoot!.querySelector('.progress-fill');
    expect(fill!.classList.contains('ok')).toBe(true);
  });

  it('renders interval days', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ intervalDays: 90 })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('90 dn\u00ED');
    expect(shadowText(el)).toContain('Interval');
  });

  it('hides interval when null', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ intervalDays: null })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).not.toContain('Interval');
  });

  it('renders estimated next cost', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ estimatedNextCost: 300 })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('300.00 CZK');
    expect(shadowText(el)).toContain('Odhad dal\u0161\u00EDch n\u00E1klad\u016F');
  });

  it('hides estimated next cost when null', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({ estimatedNextCost: null })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).not.toContain('Odhad dal\u0161\u00EDch');
  });

  it('does not show no-info when status is known even with no dates', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({
        status: 'idle',
        lastBalancing: '',
        cost: 0,
        nextScheduled: null,
        daysRemaining: null,
        progressPercent: null,
        intervalDays: null,
        estimatedNextCost: null,
      })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).not.toContain('\u017D\u00E1dn\u00E9 balancov\u00E1n\u00ED zaznamen\u00E1no');
    expect(shadowText(el)).toContain('Ne\u010Dinn\u00E9');
  });

  it('shows progress when only progressPercent is set (noInfo=false)', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({
        status: 'unknown',
        lastBalancing: '',
        cost: 0,
        nextScheduled: null,
        daysRemaining: null,
        progressPercent: 50,
        intervalDays: null,
        estimatedNextCost: null,
      })}></oig-battery-balancing>`,
    );
    await flush(el);
    expect(shadowText(el)).not.toContain('\u017D\u00E1dn\u00E9 balancov\u00E1n\u00ED zaznamen\u00E1no');
    expect(el.shadowRoot!.querySelector('.progress-container')).not.toBeNull();
  });

  it('statusLabel handles null/undefined status gracefully', async () => {
    const el = await fixture<LitEl<OigBatteryBalancing>>(
      html`<oig-battery-balancing .data=${makeBalancing({
        status: undefined as unknown as string,
        lastBalancing: '2026-07-15',
      })}></oig-battery-balancing>`,
    );
    await flush(el);
    const text = shadowText(el);
    expect(text).toContain('Stav');
  });
});

// ============================================================================
// OigCostComparison
// ============================================================================

function makeCost(overrides: Partial<CostComparisonData> = {}): CostComparisonData {
  return {
    activePlan: 'hybrid',
    actualSpent: 125.50,
    planTotalCost: 180.00,
    futurePlanCost: 54.50,
    tomorrowCost: 160.00,
    yesterdayPlannedCost: 170.00,
    yesterdayActualCost: 165.00,
    yesterdayDelta: -5.00,
    yesterdayAccuracy: 97,
    ...overrides,
  };
}

describe('oig-cost-comparison', () => {
  it('renders loading state when data is null', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison></oig-cost-comparison>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('Na\u010D\u00EDt\u00E1n\u00ED');
  });

  it('renders actual spent, plan total, and future plan cost', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost()}></oig-cost-comparison>`,
    );
    await flush(el);
    const text = shadowText(el);
    expect(text).toContain('125.50 CZK');
    expect(text).toContain('180.00 CZK');
    expect(text).toContain('54.50 CZK');
  });

  it('renders cost row labels', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost()}></oig-cost-comparison>`,
    );
    await flush(el);
    const text = shadowText(el);
    expect(text).toContain('Skute\u010Dn\u00E9 n\u00E1klady');
    expect(text).toContain('Odhad dnes celkem');
    expect(text).toContain('Zb\u00FDvaj\u00EDc\u00ED pl\u00E1n');
  });

  it('renders tomorrow cost when present', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost({ tomorrowCost: 160 })}></oig-cost-comparison>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('160.00 CZK');
    expect(shadowText(el)).toContain('Z\u00EDtra odhad');
  });

  it('hides tomorrow cost when null', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost({ tomorrowCost: null })}></oig-cost-comparison>`,
    );
    await flush(el);
    expect(shadowText(el)).not.toContain('Z\u00EDtra odhad');
  });

  it('renders yesterday section when yesterdayActualCost is present', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost()}></oig-cost-comparison>`,
    );
    await flush(el);
    const text = shadowText(el);
    expect(text).toContain('V\u010Dera');
    expect(text).toContain('170.00 CZK');
    expect(text).toContain('165.00 CZK');
  });

  it('hides yesterday section when yesterdayActualCost is null', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost({ yesterdayActualCost: null })}></oig-cost-comparison>`,
    );
    await flush(el);
    expect(shadowText(el)).not.toContain('V\u010Dera');
  });

  it('renders yesterday planned cost when present', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost({ yesterdayPlannedCost: 170 })}></oig-cost-comparison>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('170.00 CZK');
  });

  it('renders em-dash for yesterday planned cost when null', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost({ yesterdayPlannedCost: null })}></oig-cost-comparison>`,
    );
    await flush(el);
    const yesterdaySection = el.shadowRoot!.querySelector('.yesterday-section');
    expect(yesterdaySection).not.toBeNull();
    expect(yesterdaySection!.textContent).toContain('\u2014');
  });

  it('renders yesterday delta with positive sign and delta-positive class when delta <= 0', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost({ yesterdayDelta: -5 })}></oig-cost-comparison>`,
    );
    await flush(el);
    const deltaEl = el.shadowRoot!.querySelector('.delta-positive');
    expect(deltaEl).not.toBeNull();
    expect(deltaEl!.textContent).toContain('-5.00 CZK');
  });

  it('renders yesterday delta with + sign and delta-negative class when delta > 0', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost({ yesterdayDelta: 10 })}></oig-cost-comparison>`,
    );
    await flush(el);
    const deltaEl = el.shadowRoot!.querySelector('.delta-negative');
    expect(deltaEl).not.toBeNull();
    expect(deltaEl!.textContent).toContain('+');
    expect(deltaEl!.textContent).toContain('10.00 CZK');
  });

  it('renders yesterday delta as delta-positive when exactly zero', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost({ yesterdayDelta: 0 })}></oig-cost-comparison>`,
    );
    await flush(el);
    const deltaEl = el.shadowRoot!.querySelector('.delta-positive');
    expect(deltaEl).not.toBeNull();
  });

  it('hides yesterday delta when null', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost({ yesterdayDelta: null })}></oig-cost-comparison>`,
    );
    await flush(el);
    expect(shadowText(el)).not.toContain('Rozd\u00EDl');
  });

  it('renders yesterday accuracy when present', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost({ yesterdayAccuracy: 97 })}></oig-cost-comparison>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('97%');
    expect(shadowText(el)).toContain('P\u0159esnost');
  });

  it('hides yesterday accuracy when null', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost({ yesterdayAccuracy: null })}></oig-cost-comparison>`,
    );
    await flush(el);
    expect(shadowText(el)).not.toContain('P\u0159esnost');
  });

  it('renders zero actualSpent correctly', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost({ actualSpent: 0 })}></oig-cost-comparison>`,
    );
    await flush(el);
    expect(shadowText(el)).toContain('0.00 CZK');
  });

  it('renders negative delta with correct formatting', async () => {
    const el = await fixture<LitEl<OigCostComparison>>(
      html`<oig-cost-comparison .data=${makeCost({ yesterdayDelta: -12.34 })}></oig-cost-comparison>`,
    );
    await flush(el);
    const deltaEl = el.shadowRoot!.querySelector('.delta-positive');
    expect(deltaEl!.textContent).toContain('-12.34 CZK');
  });
});
