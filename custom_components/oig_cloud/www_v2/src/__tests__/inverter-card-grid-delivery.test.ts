import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OigFlowNode } from '@/ui/features/flow/node';
import { EMPTY_FLOW_DATA, FlowData } from '@/ui/features/flow/types';
import type { GridDeliveryStateModel } from '@/data/grid-delivery-model';

/**
 * Inverter node uses the edge-gauge skin: grid delivery + limit live in
 * `.inv-rows` rows (`.inv-lab` label, `.inv-val` value button); pending
 * changes render as `.pending-overlay` elements at the node level.
 */
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

  function invRows(shadow: ShadowRoot) {
    const node = shadow.querySelector('.node-inverter');
    expect(node).not.toBeNull();
    return Array.from(node!.querySelectorAll('.inv-row'));
  }

  function rowByLabel(shadow: ShadowRoot, label: string) {
    return invRows(shadow).find(r =>
      r.querySelector('.inv-lab')?.textContent?.includes(label),
    );
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
    const deliveryRow = rowByLabel(shadow, 'Dodávka');
    expect(deliveryRow).not.toBeUndefined();
    const deliveryVal = deliveryRow!.querySelector('.inv-val');
    expect(deliveryVal!.textContent).toContain('Vypnuto');
    expect(deliveryVal!.textContent).not.toContain('Aktivní limit');

    const limitRow = rowByLabel(shadow, 'Nastavený limit');
    expect(limitRow).not.toBeUndefined();
    const limitButton = limitRow!.querySelector('.inv-val');
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
    const deliveryRow = rowByLabel(shadow, 'Dodávka');
    expect(deliveryRow).not.toBeUndefined();
    expect(deliveryRow!.querySelector('.inv-val')!.textContent).toContain('Omezeno 4200W');

    const limitRow = rowByLabel(shadow, 'Aktivní limit');
    expect(limitRow).not.toBeUndefined();
    const limitButton = limitRow!.querySelector('.inv-val');
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
    const inverterNode = shadow.querySelector('.node-inverter')!;

    const deliveryRow = rowByLabel(shadow, 'Dodávka');
    expect(deliveryRow!.querySelector('.inv-val')!.textContent).toContain('Vypnuto');

    const pendingOverlays = inverterNode.querySelectorAll('.pending-overlay');
    expect(pendingOverlays.length).toBeGreaterThanOrEqual(2);
    const modeOverlay = Array.from(pendingOverlays).find(o =>
      o.textContent!.includes('Ve frontě: Omezeno'),
    );
    expect(modeOverlay).not.toBeUndefined();
    const limitOverlay = Array.from(pendingOverlays).find(o =>
      o.textContent!.includes('Ve frontě: limit 2000W'),
    );
    expect(limitOverlay).not.toBeUndefined();

    const limitRow = rowByLabel(shadow, 'Nastavený limit');
    expect(limitRow!.querySelector('.inv-val')!.textContent).toContain('3500W');
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
    const deliveryRow = rowByLabel(shadow, 'Dodávka');
    expect(deliveryRow).not.toBeUndefined();
    const deliveryVal = deliveryRow!.querySelector('.inv-val');
    expect(deliveryVal!.textContent).toContain('?');
    expect(deliveryVal!.classList.contains('current-state-unknown')).toBe(true);

    // No limit row when no limit is known.
    expect(rowByLabel(shadow, 'limit')).toBeUndefined();
  });
});
