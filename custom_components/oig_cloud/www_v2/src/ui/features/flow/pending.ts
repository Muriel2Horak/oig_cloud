import type { ShieldServiceType } from '@/ui/features/control-panel/types';

export interface FlowPendingIndicators {
  inverterModeChanging: boolean;
  inverterModeText: string | null;
  gridExportChanging: boolean;
  gridExportText: string | null;
}

const ensureWattsSuffix = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('W') ? trimmed : `${trimmed}W`;
};

export function mapShieldPendingToFlowIndicators(
  pendingServices: Map<ShieldServiceType, string>,
  changingServices: Set<ShieldServiceType>
): FlowPendingIndicators {
  const inverterModeChanging = changingServices.has('box_mode');
  const inverterTarget = pendingServices.get('box_mode');

  const gridExportChanging = changingServices.has('grid_mode') || changingServices.has('grid_limit');
  const gridLimitTarget = pendingServices.get('grid_limit');
  const gridModeTarget = pendingServices.get('grid_mode');

  let gridExportText: string | null = null;
  if (gridLimitTarget) {
    const normalized = ensureWattsSuffix(gridLimitTarget);
    gridExportText = normalized ? `→ ${normalized}` : null;
  } else if (gridModeTarget) {
    gridExportText = `→ ${gridModeTarget}`;
  }

  return {
    inverterModeChanging,
    inverterModeText: inverterTarget ? `→ ${inverterTarget}` : null,
    gridExportChanging,
    gridExportText,
  };
}
