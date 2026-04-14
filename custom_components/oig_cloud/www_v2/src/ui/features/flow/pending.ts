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

export interface InverterGridDeliveryDisplay {
  /** Human-readable text for the current live mode (e.g. "Vypnuto", "Omezeno 3500W", "?") */
  currentModeText: string;
  /**
   * Label for the limit row.
   * "Nastavený limit" when mode is off/on (limit is configured but inactive).
   * "Aktivní limit" when mode is limited (limit is live).
   * null when there is no limit value to show.
   */
  limitLabel: string | null;
  /**
   * The limit value to display (e.g. "3500W"), or null when no limit is available.
   */
  limitValue: string | null;
  /**
   * true only when the live delivery is actively limited – the limit value is
   * the real live cap.  false when mode is off/on/unknown (limit is just the
   * configured value, not currently enforced).
   */
  showLimitAsActive: boolean;
  /** true when the sensor data is unavailable / unknown */
  isUnavailable: boolean;
  /** true while a service call is in flight */
  isTransitioning: boolean;
  /**
   * When a mode change is pending, this carries the queued target label
   * (e.g. "Ve frontě: Omezeno"), otherwise null.
   */
  pendingModeText: string | null;
  /**
   * When a limit change is pending, this carries the queued value label
   * (e.g. "Ve frontě: limit 4500W"), otherwise null.
   */
  pendingLimitText: string | null;
}

export function resolveInverterGridDeliveryDisplay(
  model: GridDeliveryStateModel,
): InverterGridDeliveryDisplay {
  const isUnavailable = model.isUnavailable;

  let currentModeText: string;
  if (isUnavailable || model.currentLiveDelivery === 'unknown') {
    currentModeText = '?';
  } else if (model.currentLiveDelivery === 'limited' && model.currentLiveLimit !== null) {
    currentModeText = `Omezeno ${model.currentLiveLimit}W`;
  } else {
    currentModeText = deliveryLabel(model.currentLiveDelivery);
  }

  const isActiveLimited =
    !isUnavailable && model.currentLiveDelivery === 'limited';

  let limitLabel: string | null = null;
  let limitValue: string | null = null;

  if (!isUnavailable && model.currentLiveLimit !== null) {
    limitValue = `${model.currentLiveLimit}W`;
    limitLabel = isActiveLimited ? 'Aktivní limit' : 'Nastavený limit';
  }

  let pendingModeText: string | null = null;
  let pendingLimitText: string | null = null;

  if (model.pendingDeliveryTarget !== null) {
    pendingModeText = `Ve frontě: ${deliveryLabel(model.pendingDeliveryTarget)}`;
  }
  if (model.pendingLimitTarget !== null) {
    pendingLimitText = `Ve frontě: limit ${ensureWattsSuffix(String(model.pendingLimitTarget))}`;
  }

  return {
    currentModeText,
    limitLabel,
    limitValue,
    showLimitAsActive: isActiveLimited,
    isUnavailable,
    isTransitioning: model.isTransitioning,
    pendingModeText,
    pendingLimitText,
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
