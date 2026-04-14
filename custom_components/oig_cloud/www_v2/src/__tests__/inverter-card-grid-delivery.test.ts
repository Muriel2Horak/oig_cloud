import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OigFlowNode } from '@/ui/features/flow/node';
import { EMPTY_FLOW_DATA, FlowData } from '@/ui/features/flow/types';
import type { GridDeliveryStateModel } from '@/data/grid-delivery-model';

describe('inverter card grid delivery rendering', () => {
  let el: OigFlowNode;

  beforeEach(() => {
    void OigFlowNode;
    el = document.createElement('oig-flow-node') as OigFlowNode;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  async function updateElement(data: FlowData, gridDeliveryState: GridDeliveryStateModel) {
    el.data = data;
    (el as unknown as { gridDeliveryState: GridDeliveryStateModel }).gridDeliveryState = gridDeliveryState;
    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
  }

  it('shows "Nastavený limit" when live mode is off and a configured limit exists', async () => {
    const data: FlowData = {
      ...EMPTY_FLOW_DATA,
      inverterGridMode: 'off',
      inverterGridLimit: 3500,
    };
    const gridDeliveryState: GridDeliveryStateModel = {
      currentLiveDelivery: 'off',
      currentLiveLimit: 3500,
      pendingDeliveryTarget: null,
      pendingLimitTarget: null,
      isTransitioning: false,
      isUnavailable: false,
    };
    await updateElement(data, gridDeliveryState);

    const shadow = el.shadowRoot!;
    const inverterNode = shadow.querySelector('.node-inverter');
    expect(inverterNode).not.toBeNull();

    const indicators = inverterNode!.querySelectorAll('.battery-indicators');
    expect(indicators.length).toBeGreaterThanOrEqual(2);
    const gridDeliveryButton = indicators[1]!.querySelector('.indicator');
    expect(gridDeliveryButton).not.toBeNull();
    expect(gridDeliveryButton!.textContent).toContain('Vypnuto');
    expect(gridDeliveryButton!.textContent).not.toContain('Aktivní limit');

    const detailSection = inverterNode!.querySelector('.detail-section');
    expect(detailSection).not.toBeNull();
    const limitLabel = detailSection!.querySelector('.detail-label');
    expect(limitLabel).not.toBeNull();
    expect(limitLabel!.textContent).toBe('Nastavený limit');

    const limitButton = detailSection!.querySelector('.detail-row button.clickable');
    expect(limitButton).not.toBeNull();
    expect(limitButton!.textContent).toContain('3500W');
    expect(limitButton!.classList.contains('limit-active')).toBe(false);
  });

  it('shows "Aktivní limit" and the limit value when live mode is limited', async () => {
    const data: FlowData = {
      ...EMPTY_FLOW_DATA,
      inverterGridMode: 'limited',
      inverterGridLimit: 4200,
    };
    const gridDeliveryState: GridDeliveryStateModel = {
      currentLiveDelivery: 'limited',
      currentLiveLimit: 4200,
      pendingDeliveryTarget: null,
      pendingLimitTarget: null,
      isTransitioning: false,
      isUnavailable: false,
    };
    await updateElement(data, gridDeliveryState);

    const shadow = el.shadowRoot!;
    const inverterNode = shadow.querySelector('.node-inverter');
    expect(inverterNode).not.toBeNull();

    const indicators = inverterNode!.querySelectorAll('.battery-indicators');
    const gridDeliveryButton = indicators[1]!.querySelector('.indicator');
    expect(gridDeliveryButton).not.toBeNull();
    expect(gridDeliveryButton!.textContent).toContain('Omezeno 4200W');

    const detailSection = inverterNode!.querySelector('.detail-section');
    expect(detailSection).not.toBeNull();
    const limitLabel = detailSection!.querySelector('.detail-label');
    expect(limitLabel).not.toBeNull();
    expect(limitLabel!.textContent).toBe('Aktivní limit');

    const limitButton = detailSection!.querySelector('.detail-row button.clickable');
    expect(limitButton).not.toBeNull();
    expect(limitButton!.textContent).toContain('4200W');
    expect(limitButton!.classList.contains('limit-active')).toBe(true);
  });

  it('renders pending overlays distinctly without replacing current live mode text', async () => {
    const data: FlowData = {
      ...EMPTY_FLOW_DATA,
      inverterGridMode: 'off',
      inverterGridLimit: 3500,
    };
    const gridDeliveryState: GridDeliveryStateModel = {
      currentLiveDelivery: 'off',
      currentLiveLimit: 3500,
      pendingDeliveryTarget: 'limited',
      pendingLimitTarget: 2000,
      isTransitioning: false,
      isUnavailable: false,
    };
    await updateElement(data, gridDeliveryState);

    const shadow = el.shadowRoot!;
    const inverterNode = shadow.querySelector('.node-inverter');
    expect(inverterNode).not.toBeNull();

    const indicators = inverterNode!.querySelectorAll('.battery-indicators');
    const gridDeliveryButton = indicators[1]!.querySelector('.indicator');
    expect(gridDeliveryButton!.textContent).toContain('Vypnuto');

    const pendingOverlays = inverterNode!.querySelectorAll('.pending-overlay');
    expect(pendingOverlays.length).toBeGreaterThanOrEqual(1);
    const modeOverlay = Array.from(pendingOverlays).find(el =>
      el.textContent!.includes('Ve frontě: Omezeno'),
    );
    expect(modeOverlay).not.toBeUndefined();

    const detailSection = inverterNode!.querySelector('.detail-section');
    expect(detailSection).not.toBeNull();
    const limitOverlay = detailSection!.querySelector('.pending-overlay');
    expect(limitOverlay).not.toBeNull();
    expect(limitOverlay!.textContent).toContain('Ve frontě: limit 2000W');

    const limitLabel = detailSection!.querySelector('.detail-label');
    expect(limitLabel!.textContent).toBe('Nastavený limit');
    const limitButton = detailSection!.querySelector('.detail-row button.clickable');
    expect(limitButton!.textContent).toContain('3500W');
  });

  it('renders unknown/unavailable state correctly', async () => {
    const data: FlowData = {
      ...EMPTY_FLOW_DATA,
      inverterGridMode: 'unknown',
      inverterGridLimit: 0,
    };
    const gridDeliveryState: GridDeliveryStateModel = {
      currentLiveDelivery: 'unknown',
      currentLiveLimit: null,
      pendingDeliveryTarget: null,
      pendingLimitTarget: null,
      isTransitioning: false,
      isUnavailable: true,
    };
    await updateElement(data, gridDeliveryState);

    const shadow = el.shadowRoot!;
    const inverterNode = shadow.querySelector('.node-inverter');
    expect(inverterNode).not.toBeNull();

    const indicators = inverterNode!.querySelectorAll('.battery-indicators');
    const gridDeliveryButton = indicators[1]!.querySelector('.indicator');
    expect(gridDeliveryButton).not.toBeNull();
    expect(gridDeliveryButton!.textContent).toContain('?');
    expect(gridDeliveryButton!.classList.contains('current-state-unknown')).toBe(true);

    const detailSection = inverterNode!.querySelector('.detail-section');
    expect(detailSection).not.toBeNull();
    const detailRow = detailSection!.querySelector('.detail-row');
    expect(detailRow).toBeNull();
  });
});
