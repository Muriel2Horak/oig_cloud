import { describe, it, expect } from 'vitest';
import { mapShieldPendingToFlowIndicators, resolveGridFlowState } from '../../../../src/ui/features/flow/pending';
import type { ShieldServiceType } from '../../../../src/ui/features/control-panel/types';
import type { GridDeliveryStateModel } from '../../../../src/data/grid-delivery-model';

const createPending = (entries: Array<[ShieldServiceType, string]>) => new Map(entries);
const createChanging = (entries: ShieldServiceType[]) => new Set(entries);

const baseModel: GridDeliveryStateModel = {
  currentLiveDelivery: 'off',
  currentLiveLimit: null,
  pendingDeliveryTarget: null,
  pendingLimitTarget: null,
  isTransitioning: false,
  isUnavailable: false,
};

describe('Flow pending indicators', () => {
  it('maps box mode pending to inverter indicator', () => {
    const pendingServices = createPending([['box_mode', 'Home 2']]);
    const changingServices = createChanging(['box_mode']);

    const result = mapShieldPendingToFlowIndicators(pendingServices, changingServices);

    expect(result.inverterModeChanging).toBe(true);
    expect(result.inverterModeText).toBe('→ Home 2');
  });

  it('maps grid limit pending to export text with watts', () => {
    const pendingServices = createPending([['grid_limit', '3500']]);
    const changingServices = createChanging(['grid_limit']);

    const result = mapShieldPendingToFlowIndicators(pendingServices, changingServices);

    expect(result.gridExportChanging).toBe(true);
    expect(result.gridExportText).toBe('→ 3500W');
  });

  it('keeps watts suffix when already provided', () => {
    const pendingServices = createPending([['grid_limit', '4200W']]);
    const changingServices = createChanging(['grid_limit']);

    const result = mapShieldPendingToFlowIndicators(pendingServices, changingServices);

    expect(result.gridExportText).toBe('→ 4200W');
  });

  it('maps grid mode pending to export text', () => {
    const pendingServices = createPending([['grid_mode', 'Zapnuto']]);
    const changingServices = createChanging(['grid_mode']);

    const result = mapShieldPendingToFlowIndicators(pendingServices, changingServices);

    expect(result.gridExportChanging).toBe(true);
    expect(result.gridExportText).toBe('→ Zapnuto');
  });
});

describe('grid export flow state - current+pending contract', () => {
  it('shows current live delivery when stable', () => {
    const model: GridDeliveryStateModel = { ...baseModel, currentLiveDelivery: 'on' };
    const state = resolveGridFlowState(model);

    expect(state.currentText).toBe('Zapnuto');
    expect(state.currentUnavailable).toBe(false);
    expect(state.pendingText).toBeNull();
    expect(state.pendingKind).toBeNull();
  });

  it('shows current off state with no pending', () => {
    const state = resolveGridFlowState(baseModel);

    expect(state.currentText).toBe('Vypnuto');
    expect(state.pendingText).toBeNull();
  });

  it('shows limited with watt value when live is limited', () => {
    const model: GridDeliveryStateModel = { ...baseModel, currentLiveDelivery: 'limited', currentLiveLimit: 3500 };
    const state = resolveGridFlowState(model);

    expect(state.currentText).toBe('Omezeno 3500W');
    expect(state.pendingText).toBeNull();
  });

  it('shows unknown marker when sensor is unavailable', () => {
    const model: GridDeliveryStateModel = { ...baseModel, currentLiveDelivery: 'unknown', isUnavailable: true };
    const state = resolveGridFlowState(model);

    expect(state.currentText).toBe('?');
    expect(state.currentUnavailable).toBe(true);
  });

  it('shows unknown marker when live delivery is unknown even if not marked unavailable', () => {
    const model: GridDeliveryStateModel = { ...baseModel, currentLiveDelivery: 'unknown', isUnavailable: false };
    const state = resolveGridFlowState(model);

    expect(state.currentText).toBe('?');
  });

  it('shows mode-pending overlay alongside current state (mode-changing)', () => {
    const model: GridDeliveryStateModel = {
      ...baseModel,
      currentLiveDelivery: 'off',
      pendingDeliveryTarget: 'on',
      isTransitioning: true,
    };
    const state = resolveGridFlowState(model);

    expect(state.currentText).toBe('Vypnuto');
    expect(state.pendingText).toBe('Ve frontě: Zapnuto');
    expect(state.pendingKind).toBe('mode');
    expect(state.isTransitioning).toBe(true);
  });

  it('shows limit-pending overlay with watts suffix', () => {
    const model: GridDeliveryStateModel = {
      ...baseModel,
      currentLiveDelivery: 'limited',
      currentLiveLimit: 2000,
      pendingLimitTarget: 4500,
      isTransitioning: true,
    };
    const state = resolveGridFlowState(model);

    expect(state.currentText).toBe('Omezeno 2000W');
    expect(state.pendingText).toBe('Ve frontě: limit 4500W');
    expect(state.pendingKind).toBe('limit');
  });

  it('shows both mode and limit in pending when both are queued', () => {
    const model: GridDeliveryStateModel = {
      ...baseModel,
      currentLiveDelivery: 'off',
      pendingDeliveryTarget: 'limited',
      pendingLimitTarget: 3000,
      isTransitioning: true,
    };
    const state = resolveGridFlowState(model);

    expect(state.currentText).toBe('Vypnuto');
    expect(state.pendingText).toBe('Ve frontě: Omezeno / 3000W');
    expect(state.pendingKind).toBe('both');
  });

  it('does not show pending while live is unknown - current stays as ?', () => {
    const model: GridDeliveryStateModel = {
      ...baseModel,
      currentLiveDelivery: 'unknown',
      isUnavailable: true,
      pendingDeliveryTarget: 'on',
      isTransitioning: true,
    };
    const state = resolveGridFlowState(model);

    expect(state.currentText).toBe('?');
    expect(state.currentUnavailable).toBe(true);
    expect(state.pendingText).toBe('Ve frontě: Zapnuto');
    expect(state.pendingKind).toBe('mode');
  });
});
