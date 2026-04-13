import type { ShieldServiceType } from '@/ui/features/control-panel/types';
import type { GridDeliveryStateModel } from '@/data/grid-delivery-model';

export interface FlowPendingIndicators {
  inverterModeChanging: boolean;
  inverterModeText: string | null;
  gridExportChanging: boolean;
  gridExportText: string | null;
}

export interface GridFlowState {
  currentText: string;
  currentUnavailable: boolean;
  pendingText: string | null;
  pendingKind: 'mode' | 'limit' | 'both' | null;
  isTransitioning: boolean;
}

const DELIVERY_LABELS: Record<string, string> = {
  off: 'Vypnuto',
  on: 'Zapnuto',
  limited: 'Omezeno',
  unknown: '?',
};

function deliveryLabel(value: string): string {
  return DELIVERY_LABELS[value] ?? value;
}

const ensureWattsSuffix = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('W') ? trimmed : `${trimmed}W`;
};

export function resolveGridFlowState(model: GridDeliveryStateModel): GridFlowState {
  const currentUnavailable = model.isUnavailable;
  let currentText: string;
  if (currentUnavailable || model.currentLiveDelivery === 'unknown') {
    currentText = '?';
  } else if (model.currentLiveDelivery === 'limited' && model.currentLiveLimit !== null) {
    currentText = `Omezeno ${model.currentLiveLimit}W`;
  } else {
    currentText = deliveryLabel(model.currentLiveDelivery);
  }

  const hasMode = model.pendingDeliveryTarget !== null;
  const hasLimit = model.pendingLimitTarget !== null;

  let pendingText: string | null = null;
  let pendingKind: GridFlowState['pendingKind'] = null;

  if (hasMode && hasLimit) {
    pendingText = `Ve frontě: ${deliveryLabel(model.pendingDeliveryTarget!)} / ${model.pendingLimitTarget}W`;
    pendingKind = 'both';
  } else if (hasLimit) {
    pendingText = `Ve frontě: limit ${ensureWattsSuffix(String(model.pendingLimitTarget))}`;
    pendingKind = 'limit';
  } else if (hasMode) {
    pendingText = `Ve frontě: ${deliveryLabel(model.pendingDeliveryTarget!)}`;
    pendingKind = 'mode';
  }

  return {
    currentText,
    currentUnavailable,
    pendingText,
    pendingKind,
    isTransitioning: model.isTransitioning,
  };
}

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
