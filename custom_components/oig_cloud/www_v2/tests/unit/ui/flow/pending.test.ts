import { describe, it, expect } from 'vitest';
import { mapShieldPendingToFlowIndicators } from '../../../../src/ui/features/flow/pending';
import type { ShieldServiceType } from '../../../../src/ui/features/control-panel/types';

const createPending = (entries: Array<[ShieldServiceType, string]>) => new Map(entries);
const createChanging = (entries: ShieldServiceType[]) => new Set(entries);

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
