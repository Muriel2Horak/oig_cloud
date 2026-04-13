import {
  GridDelivery,
  GRID_DELIVERY_SENSOR_MAP,
  ShieldServiceType,
} from '@/ui/features/control-panel/types';

export interface GridDeliveryStateModel {
  currentLiveDelivery: 'off' | 'on' | 'limited' | 'unknown';
  currentLiveLimit: number | null;
  pendingDeliveryTarget: 'off' | 'on' | 'limited' | null;
  pendingLimitTarget: number | null;
  isTransitioning: boolean;
  isUnavailable: boolean;
}

export interface GridDeliveryRawValues {
  gridModeRaw: string;
  gridLimit: number;
}

export interface ShieldPendingData {
  pendingServices: Map<ShieldServiceType, string>;
  changingServices: Set<ShieldServiceType>;
  shieldStatus: 'idle' | 'running';
}

const TRANSITION_INDICATOR_CZ = 'probíhá změna';

export function isGridDeliveryTransition(rawValue: string): boolean {
  return rawValue.trim().toLowerCase().includes(TRANSITION_INDICATOR_CZ);
}

export function resolveGridDeliveryLive(raw: string): GridDelivery | 'unknown' {
  const trimmed = raw.trim();

  if (trimmed in GRID_DELIVERY_SENSOR_MAP) {
    return GRID_DELIVERY_SENSOR_MAP[trimmed];
  }

  const lower = trimmed.toLowerCase();
  const ciEntry = Object.entries(GRID_DELIVERY_SENSOR_MAP).find(
    ([k]) => k.toLowerCase() === lower,
  );
  if (ciEntry) return ciEntry[1];

  if (lower.startsWith('omez') || lower.includes('limit')) return 'limited';
  if (lower.startsWith('zapn') || lower === 'on') return 'on';
  if (lower.startsWith('vypn') || lower === 'off') return 'off';
  if (lower === 'unknown' || lower === 'unavailable' || lower === '') {
    return 'unknown';
  }

  return 'unknown';
}

export function parsePendingGridMode(
  pendingServices: Map<ShieldServiceType, string>,
): GridDelivery | null {
  const pendingTarget = pendingServices.get('grid_mode');
  if (!pendingTarget) return null;

  const resolved = resolveGridDeliveryLive(pendingTarget);
  return resolved === 'unknown' ? null : resolved;
}

export function parsePendingGridLimit(
  pendingServices: Map<ShieldServiceType, string>,
): number | null {
  const pendingTarget = pendingServices.get('grid_limit');
  if (!pendingTarget) return null;

  const parsed = parseInt(pendingTarget, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function isGridDeliveryPending(
  pendingData: ShieldPendingData,
): boolean {
  return (
    pendingData.changingServices.has('grid_mode') ||
    pendingData.changingServices.has('grid_limit')
  );
}

export function resolveGridDeliveryState(
  rawValues: GridDeliveryRawValues,
  shieldPending: ShieldPendingData,
): GridDeliveryStateModel {
  const { gridModeRaw, gridLimit } = rawValues;

  const trimmedRaw = gridModeRaw.trim().toLowerCase();
  const isUnavailable =
    trimmedRaw === 'unavailable' ||
    trimmedRaw === 'unknown' ||
    trimmedRaw === '';

  const isTransitioningFromRaw = isGridDeliveryTransition(gridModeRaw);
  const isTransitioningFromShield = isGridDeliveryPending(shieldPending);
  const isTransitioning = isTransitioningFromRaw || isTransitioningFromShield;

  let currentLiveDelivery: GridDelivery | 'unknown';
  if (isUnavailable) {
    currentLiveDelivery = 'unknown';
  } else if (isTransitioningFromRaw) {
    currentLiveDelivery = 'unknown';
  } else {
    currentLiveDelivery = resolveGridDeliveryLive(gridModeRaw);
  }

  let currentLiveLimit: number | null = null;
  if (!isUnavailable && Number.isFinite(gridLimit) && gridLimit >= 0) {
    currentLiveLimit = gridLimit;
  }

  const pendingDeliveryTarget = parsePendingGridMode(shieldPending.pendingServices);
  const pendingLimitTarget = parsePendingGridLimit(shieldPending.pendingServices);

  return {
    currentLiveDelivery,
    currentLiveLimit,
    pendingDeliveryTarget,
    pendingLimitTarget,
    isTransitioning,
    isUnavailable,
  };
}

export function isGridDeliveryStable(state: GridDeliveryStateModel): boolean {
  return !state.isTransitioning && !state.isUnavailable;
}

export function hasPendingChanges(state: GridDeliveryStateModel): boolean {
  return state.pendingDeliveryTarget !== null || state.pendingLimitTarget !== null;
}

export function getGridDeliveryDisplayState(
  state: GridDeliveryStateModel,
): GridDelivery | 'unknown' {
  if (state.isTransitioning && state.pendingDeliveryTarget) {
    return state.pendingDeliveryTarget;
  }
  return state.currentLiveDelivery;
}
