// ============================================================================
// "Bojler: hero flow" card unit tests
// Covers:
//   - node with real data source renders; node with none is absent from DOM
//     (not a dash/placeholder) — Alt node, gated on charging_alt/alt plan slot
//   - a value derived via a silent-fallback default carries the "odhad" marker
//     — ready-liters KPI when config.volumeL is missing
//   - prefers-reduced-motion disables the animated connector class
//   - "příští ohřev" KPI absent (not shown as dash) when no future plan slot
// ============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
// Side-effect import: `OigBoilerHeroFlow` below is used only as a type, and a
// type-only usage of the sole named import would let the compiler elide the
// whole declaration — which would skip `@customElement` registration.
import '@/ui/features/boiler/boiler-hero-flow';
import type { OigBoilerHeroFlow } from '@/ui/features/boiler/boiler-hero-flow';
import type {
  BoilerV2Status,
  BoilerV2Activity,
  BoilerV2PlanSlot,
} from '@/ui/features/boiler/types';

type HeroEl = OigBoilerHeroFlow & { updateComplete: Promise<boolean> };

const NOW_MS = Date.parse('2026-07-28T10:00:00Z');

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const STATUS: BoilerV2Status = {
  currentState: 'heating',
  comfortSatisfied: true,
  comfortStatusCode: null,
  selectedSource: 'grid',
  actuatedSource: 'grid',
  temperatureTop: 52,
  temperatureBottom: 41,
  energyNeededKwh: 1.2,
  heating: true,
  lastUpdate: null,
  degraded: false,
  degradedFlags: [],
};

const ACTIVITY: BoilerV2Activity = {
  state: 'charging_grid',
  source: 'grid',
  temperatureTrendCPerMin: 0.1,
  fillLevelPct: 0.6,
  auraMaxTempC: 60,
  heaterStates: {},
  staleFlags: [],
};

function futureSlot(overrides: Partial<BoilerV2PlanSlot> = {}): BoilerV2PlanSlot {
  return {
    start: new Date(NOW_MS + 30 * 60_000).toISOString(),
    end: new Date(NOW_MS + 60 * 60_000).toISOString(),
    consumptionKwh: 1,
    confidence: 0.9,
    recommendedSource: 'grid',
    spotPrice: 2.5,
    altPrice: null,
    overflowAvailable: false,
    heatingKwh: 1.1,
    estimatedCostCzk: 3.2,
    ...overrides,
  };
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW_MS);
  mockMatchMedia(false);
});

afterEach(() => {
  fixtureCleanup();
  vi.restoreAllMocks();
});

async function flush(el: HeroEl): Promise<void> {
  await el.updateComplete;
}

describe('oig-boiler-hero-flow', () => {
  it('drops the Alt node from the DOM when no alt source is active or planned', async () => {
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${ACTIVITY}
        .planSlots=${[futureSlot()]}
        .config=${{
          volumeL: 200, heaterPowerW: 2000, heaterPowerKw: 2, targetTempC: 55,
          deadlineTime: '18:00', stratificationMode: 'linear', kCoefficient: '1',
          coldInletTempC: 16, auraMaxTempC: 60,
        }}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    expect(el.shadowRoot!.querySelector('[data-testid="hero-node-alt"]')).toBeNull();
  });

  it('renders the Alt node when activity is charging_alt', async () => {
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${{ ...ACTIVITY, state: 'charging_alt', source: 'alternative' }}
        .planSlots=${[futureSlot()]}
        .altSourceType=${'gas'}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    expect(el.shadowRoot!.querySelector('[data-testid="hero-node-alt"]')).not.toBeNull();
  });

  it('renders the Alt node when a future alt-sourced plan slot exists (even while idle)', async () => {
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${{ ...ACTIVITY, state: 'standby', source: null }}
        .planSlots=${[futureSlot({ recommendedSource: 'alternative' })]}
        .altSourceType=${'gas'}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    expect(el.shadowRoot!.querySelector('[data-testid="hero-node-alt"]')).not.toBeNull();
  });

  it('flags the ready-liters KPI with the odhad marker when config.volumeL is missing (silent-fallback default)', async () => {
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${ACTIVITY}
        .planSlots=${[]}
        .config=${null}
        .lang=${'cs'}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    const readyKpi = el.shadowRoot!.querySelector('[data-testid="hero-kpi-ready"]');
    expect(readyKpi).not.toBeNull();
    const badge = readyKpi!.querySelector('[data-testid="hero-est-ready"]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toMatch(/odhad/i);
  });

  it('does NOT flag the ready-liters KPI when config.volumeL is a real measured value', async () => {
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${ACTIVITY}
        .planSlots=${[]}
        .config=${{
          volumeL: 150, heaterPowerW: 2000, heaterPowerKw: 2, targetTempC: 55,
          deadlineTime: '18:00', stratificationMode: 'linear', kCoefficient: '1',
          coldInletTempC: 16, auraMaxTempC: 60,
        }}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    const readyKpi = el.shadowRoot!.querySelector('[data-testid="hero-kpi-ready"]');
    expect(readyKpi).not.toBeNull();
    expect(readyKpi!.querySelector('[data-testid="hero-est-ready"]')).toBeNull();
  });

  it('disables the animated connector class under prefers-reduced-motion', async () => {
    mockMatchMedia(true);
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${ACTIVITY}
        .planSlots=${[futureSlot()]}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    const activeConnector = el.shadowRoot!.querySelector('path.connector-active');
    expect(activeConnector).not.toBeNull();
    expect(activeConnector!.classList.contains('connector-anim')).toBe(false);
  });

  it('animates the active connector when reduced motion is not requested', async () => {
    mockMatchMedia(false);
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${ACTIVITY}
        .planSlots=${[futureSlot()]}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    const activeConnector = el.shadowRoot!.querySelector('path.connector-active');
    expect(activeConnector).not.toBeNull();
    expect(activeConnector!.classList.contains('connector-anim')).toBe(true);
  });

  it('drops the "příští ohřev" KPI (no dash) when no future plan slot exists', async () => {
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${ACTIVITY}
        .planSlots=${[]}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    expect(el.shadowRoot!.querySelector('[data-testid="hero-kpi-next-heating"]')).toBeNull();
  });

  it('renders the "příští ohřev" KPI when a future plan slot exists', async () => {
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${ACTIVITY}
        .planSlots=${[futureSlot()]}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    expect(el.shadowRoot!.querySelector('[data-testid="hero-kpi-next-heating"]')).not.toBeNull();
  });
});
