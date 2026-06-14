import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OigFlowNode } from '@/ui/features/flow/node';
import { EMPTY_FLOW_DATA, FlowData } from '@/ui/features/flow/types';
import type { GridDeliveryStateModel } from '@/data/grid-delivery-model';

/**
 * Inverter tile (redesigned, .iv-* namespace): grid delivery is shown as a
 * status-strip pill (`.iv-sp` with `.iv-spl` label "Dodávka" + `.iv-spv` value):
 *   off → "Vyp", on → "Zap", limited → the limit (kW), unknown → "—".
 * Pending changes still render as `.pending-overlay` elements at the node level.
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

  function deliveryPill(shadow: ShadowRoot): Element | undefined {
    const node = shadow.querySelector('.node-inverter');
    expect(node).not.toBeNull();
    return Array.from(node!.querySelectorAll('.iv-sp')).find(p =>
      p.querySelector('.iv-spl')?.textContent?.includes('Dodávka'),
    );
  }

  function deliveryValue(shadow: ShadowRoot): string {
    return deliveryPill(shadow)?.querySelector('.iv-spv')?.textContent?.trim() ?? '';
  }

  it('shows "Vyp" when delivery is off', async () => {
    const data: FlowData = { ...EMPTY_FLOW_DATA, inverterGridMode: 'off', inverterGridLimit: 3500 };
    const gridDeliveryState: GridDeliveryStateModel = {
      currentLiveDelivery: 'off', currentLiveLimit: 3500,
      pendingDeliveryTarget: null, pendingLimitTarget: null,
      isTransitioning: false, isUnavailable: false,
    };
    await updateElement(data, gridDeliveryState);
    const shadow = el.shadowRoot!;
    expect(deliveryPill(shadow)).not.toBeUndefined();
    expect(deliveryValue(shadow)).toContain('Vyp');
  });

  it('shows the limit (kW) when delivery is limited', async () => {
    const data: FlowData = { ...EMPTY_FLOW_DATA, inverterGridMode: 'limited', inverterGridLimit: 4200 };
    const gridDeliveryState: GridDeliveryStateModel = {
      currentLiveDelivery: 'limited', currentLiveLimit: 4200,
      pendingDeliveryTarget: null, pendingLimitTarget: null,
      isTransitioning: false, isUnavailable: false,
    };
    await updateElement(data, gridDeliveryState);
    const shadow = el.shadowRoot!;
    // fmtKwGrid(4200) → "4,2 kW"
    expect(deliveryValue(shadow)).toContain('4,2');
    expect(deliveryValue(shadow)).toContain('kW');
  });

  it('renders pending overlays without replacing the current pill value', async () => {
    const data: FlowData = { ...EMPTY_FLOW_DATA, inverterGridMode: 'off', inverterGridLimit: 3500 };
    const gridDeliveryState: GridDeliveryStateModel = {
      currentLiveDelivery: 'off', currentLiveLimit: 3500,
      pendingDeliveryTarget: 'limited', pendingLimitTarget: 2000,
      isTransitioning: false, isUnavailable: false,
    };
    await updateElement(data, gridDeliveryState);
    const shadow = el.shadowRoot!;
    const inverterNode = shadow.querySelector('.node-inverter')!;

    // current pill still shows the live state
    expect(deliveryValue(shadow)).toContain('Vyp');

    const pendingOverlays = inverterNode.querySelectorAll('.pending-overlay');
    expect(pendingOverlays.length).toBeGreaterThanOrEqual(2);
    expect(Array.from(pendingOverlays).some(o => o.textContent!.includes('Ve frontě: Omezeno'))).toBe(true);
    expect(Array.from(pendingOverlays).some(o => o.textContent!.includes('Ve frontě: limit 2000W'))).toBe(true);
  });

  it('renders unknown/unavailable state correctly', async () => {
    const data: FlowData = { ...EMPTY_FLOW_DATA, inverterGridMode: 'unknown', inverterGridLimit: 0 };
    const gridDeliveryState: GridDeliveryStateModel = {
      currentLiveDelivery: 'unknown', currentLiveLimit: null,
      pendingDeliveryTarget: null, pendingLimitTarget: null,
      isTransitioning: false, isUnavailable: true,
    };
    await updateElement(data, gridDeliveryState);
    const shadow = el.shadowRoot!;
    expect(deliveryPill(shadow)).not.toBeUndefined();
    expect(deliveryValue(shadow)).toContain('—');
  });
});
