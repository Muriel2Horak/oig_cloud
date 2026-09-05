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

    const activeConnector = el.shadowRoot!.querySelector('path.connector.active');
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

    const activeConnector = el.shadowRoot!.querySelector('path.connector.active');
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

  // FIX-H3: drawMap node tests
  it('renders the Odbery-dnes node when drawMap is provided', async () => {
    const drawMapData = {
      slotDurationMin: 15,
      weekly: [{
        date: '2026-07-28',
        totalLiters: 147,
        slotsLiters: Array(96).fill(0).map((_, i) => i === 24 ? 114 : 0), // peak at 06:00
      }],
      profiles: {},
    };
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${ACTIVITY}
        .planSlots=${[]}
        .drawMap=${drawMapData}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    expect(el.shadowRoot!.querySelector('[data-testid="hero-node-draws-today"]')).not.toBeNull();
  });

  it('omits the Odbery-dnes node when drawMap is null', async () => {
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${ACTIVITY}
        .planSlots=${[]}
        .drawMap=${null}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    expect(el.shadowRoot!.querySelector('[data-testid="hero-node-draws-today"]')).toBeNull();
  });

  // FIX-H4: tank arc and hot-layer tests
  it('renders the heater arc element', async () => {
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${ACTIVITY}
        .planSlots=${[]}
        .config=${{ volumeL: 200, heaterPowerW: 2000 }}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    expect(el.shadowRoot!.querySelector('[data-testid="hero-heater-arc"]')).not.toBeNull();
  });

  // FIX-H1: source-colored connectors
  it('applies source-specific stroke colors to connectors', async () => {
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${ACTIVITY}
        .planSlots=${[]}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    const svg = el.shadowRoot!.querySelector('svg');
    const paths = svg!.querySelectorAll('path');
    const byStroke = (stroke: string) => Array.from(paths).find(p => p.getAttribute('stroke') === stroke);

    expect(byStroke('#f0b429'), 'fve').not.toBeNull();
    expect(byStroke('#3b82f6'), 'grid').not.toBeNull();
    expect(byStroke('#a78bfa'), 'battery').not.toBeNull();

    const altEl = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${{ ...ACTIVITY, state: 'standby', source: null }}
        .planSlots=${[futureSlot({ recommendedSource: 'alternative' })]}
        .altSourceType=${'gas'}
      ></oig-boiler-hero-flow>
    `);
    await flush(altEl);
    const altSvg = altEl.shadowRoot!.querySelector('svg');
    const altPaths = altSvg!.querySelectorAll('path');
    expect(Array.from(altPaths).find(p => p.getAttribute('stroke') === '#ff8a50'), 'alt').not.toBeNull();
  });

  it('grades grid connector opacity active > planned > idle', async () => {
    const activeEl = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${ACTIVITY}
        .planSlots=${[]}
      ></oig-boiler-hero-flow>
    `);
    await flush(activeEl);
    const activeGrid = Array.from(activeEl.shadowRoot!.querySelectorAll('path'))
      .find(p => p.getAttribute('stroke') === '#3b82f6');
    expect(activeGrid?.getAttribute('opacity')).toBe('0.9');

    const plannedEl = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${{ ...ACTIVITY, state: 'standby', source: null }}
        .planSlots=${[futureSlot({ recommendedSource: 'grid' })]}
      ></oig-boiler-hero-flow>
    `);
    await flush(plannedEl);
    const plannedGrid = Array.from(plannedEl.shadowRoot!.querySelectorAll('path'))
      .find(p => p.getAttribute('stroke') === '#3b82f6');
    expect(plannedGrid?.getAttribute('opacity')).toBe('0.6');

    const idleEl = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${{ ...ACTIVITY, state: 'standby', source: null }}
        .planSlots=${[]}
      ></oig-boiler-hero-flow>
    `);
    await flush(idleEl);
    const idleGrid = Array.from(idleEl.shadowRoot!.querySelectorAll('path'))
      .find(p => p.getAttribute('stroke') === '#3b82f6');
    expect(idleGrid?.getAttribute('opacity')).toBe('0.35');
  });

  it('sets an explicit opacity on the circulation connector', async () => {
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${{ ...ACTIVITY, state: 'standby', source: null }}
        .planSlots=${[]}
        .circulationRuns=${[{ start: new Date(NOW_MS + 30 * 60_000).toISOString(), end: new Date(NOW_MS + 60 * 60_000).toISOString(), label: 'rano' }]}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    const circNode = el.shadowRoot!.querySelector('[data-testid="hero-node-circulation"]');
    expect(circNode).not.toBeNull();
    const circPath = Array.from(el.shadowRoot!.querySelectorAll('path'))
      .find(p => p.getAttribute('stroke') === '#39415f');
    expect(circPath).not.toBeNull();
    expect(circPath?.hasAttribute('opacity')).toBe(true);
    expect(circPath?.getAttribute('opacity')).toBe('0.6');
  });

  it('renders the Odbery-dnes node with mock width 170', async () => {
    const drawMapData = {
      slotDurationMin: 15,
      weekly: [{
        date: '2026-07-28',
        totalLiters: 147,
        slotsLiters: Array(96).fill(0).map((_, i) => i === 24 ? 114 : 0),
      }],
      profiles: {},
    };
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${ACTIVITY}
        .planSlots=${[]}
        .drawMap=${drawMapData}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    const node = el.shadowRoot!.querySelector('[data-testid="hero-node-draws-today"]');
    expect(node).not.toBeNull();
    const rect = node!.querySelector('rect');
    expect(rect?.getAttribute('width')).toBe('170');
    expect(rect?.getAttribute('height')).toBe('50');
  });

  it('translates subtitle fragments via t() in EN locale', async () => {
    const el = await fixture<HeroEl>(html`
      <oig-boiler-hero-flow
        .status=${STATUS}
        .activity=${{ ...ACTIVITY, state: 'standby', source: null }}
        .planSlots=${[]}
        .energyToday=${{ totalKwh: 5, fveKwh: 0, gridKwh: 0, altKwh: 0, batteryKwh: 2.5, unattributedKwh: 0, sourceInvalid: false }}
        .lang=${'en'}
      ></oig-boiler-hero-flow>
    `);
    await flush(el);

    const batteryNode = el.shadowRoot!.querySelector('[data-testid="hero-node-battery"]');
    expect(batteryNode).not.toBeNull();
    expect(batteryNode!.textContent).toMatch(/today\s*2,50\s*kWh/i);
    expect(batteryNode!.textContent).not.toMatch(/dnes/i);
  });
});
