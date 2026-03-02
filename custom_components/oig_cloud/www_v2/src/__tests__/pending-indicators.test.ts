import { describe, it, expect } from 'vitest';
import { mapShieldPendingToFlowIndicators } from '@/ui/features/flow/pending';
import type { ShieldServiceType } from '@/ui/features/control-panel/types';

describe('Flow pending service indicators', () => {
  it('maps inverter mode pending target to text and changing flag', () => {
    const pending = new Map<ShieldServiceType, string>([['box_mode', 'Home 2']]);
    const changing = new Set<ShieldServiceType>(['box_mode']);

    const result = mapShieldPendingToFlowIndicators(pending, changing);

    expect(result.inverterModeChanging).toBe(true);
    expect(result.inverterModeText).toBe('→ Home 2');
    expect(result.gridExportChanging).toBe(false);
    expect(result.gridExportText).toBe(null);
  });

  it('formats grid export limit with watts suffix', () => {
    const pending = new Map<ShieldServiceType, string>([['grid_limit', '3500']]);
    const changing = new Set<ShieldServiceType>(['grid_limit']);

    const result = mapShieldPendingToFlowIndicators(pending, changing);

    expect(result.gridExportChanging).toBe(true);
    expect(result.gridExportText).toBe('→ 3500W');
  });

  it('preserves watts suffix when provided', () => {
    const pending = new Map<ShieldServiceType, string>([['grid_limit', '4200W']]);
    const changing = new Set<ShieldServiceType>(['grid_limit']);

    const result = mapShieldPendingToFlowIndicators(pending, changing);

    expect(result.gridExportText).toBe('→ 4200W');
  });

  it('maps grid mode pending target when limit is absent', () => {
    const pending = new Map<ShieldServiceType, string>([['grid_mode', 'Limited']]);
    const changing = new Set<ShieldServiceType>(['grid_mode']);

    const result = mapShieldPendingToFlowIndicators(pending, changing);

    expect(result.gridExportChanging).toBe(true);
    expect(result.gridExportText).toBe('→ Limited');
  });
});
