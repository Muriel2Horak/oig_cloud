import { describe, it, expect } from 'vitest';
import {
  GridDeliveryStateModel,
  GridDeliveryRawValues,
  ShieldPendingData,
  isGridDeliveryTransition,
  resolveGridDeliveryLive,
  parsePendingGridMode,
  parsePendingGridLimit,
  isGridDeliveryPending,
  resolveGridDeliveryState,
  isGridDeliveryStable,
  hasPendingChanges,
  getGridDeliveryDisplayState,
} from '@/data/grid-delivery-model';
import { ShieldServiceType } from '@/ui/features/control-panel/types';

function createRawValues(overrides: Partial<GridDeliveryRawValues> = {}): GridDeliveryRawValues {
  return {
    gridModeRaw: 'Omezeno',
    gridLimit: 5400,
    ...overrides,
  };
}

function createShieldPending(overrides: Partial<ShieldPendingData> = {}): ShieldPendingData {
  return {
    pendingServices: new Map<ShieldServiceType, string>(),
    changingServices: new Set<ShieldServiceType>(),
    shieldStatus: 'idle',
    ...overrides,
  };
}

describe('isGridDeliveryTransition', () => {
  it('detects Czech "Probíhá změna" transition indicator', () => {
    expect(isGridDeliveryTransition('Probíhá změna')).toBe(true);
    expect(isGridDeliveryTransition('probíhá změna')).toBe(true);
    expect(isGridDeliveryTransition('  probíhá změna  ')).toBe(true);
  });

  it('detects "Probíhá změna režimu" variant', () => {
    expect(isGridDeliveryTransition('Probíhá změna režimu')).toBe(true);
    expect(isGridDeliveryTransition('probíhá změna režimu')).toBe(true);
  });

  it('returns false for stable state values', () => {
    expect(isGridDeliveryTransition('Vypnuto')).toBe(false);
    expect(isGridDeliveryTransition('Zapnuto')).toBe(false);
    expect(isGridDeliveryTransition('Omezeno')).toBe(false);
    expect(isGridDeliveryTransition('Off')).toBe(false);
    expect(isGridDeliveryTransition('On')).toBe(false);
    expect(isGridDeliveryTransition('Limited')).toBe(false);
  });

  it('returns false for unknown/unavailable states', () => {
    expect(isGridDeliveryTransition('unknown')).toBe(false);
    expect(isGridDeliveryTransition('unavailable')).toBe(false);
    expect(isGridDeliveryTransition('')).toBe(false);
  });
});

describe('resolveGridDeliveryLive', () => {
  it('resolves exact Czech sensor values to delivery states', () => {
    expect(resolveGridDeliveryLive('Vypnuto')).toBe('off');
    expect(resolveGridDeliveryLive('Zapnuto')).toBe('on');
    expect(resolveGridDeliveryLive('Omezeno')).toBe('limited');
  });

  it('resolves lowercase Czech values', () => {
    expect(resolveGridDeliveryLive('vypnuto')).toBe('off');
    expect(resolveGridDeliveryLive('zapnuto')).toBe('on');
    expect(resolveGridDeliveryLive('omezeno')).toBe('limited');
  });

  it('resolves English sensor values', () => {
    expect(resolveGridDeliveryLive('Off')).toBe('off');
    expect(resolveGridDeliveryLive('On')).toBe('on');
    expect(resolveGridDeliveryLive('Limited')).toBe('limited');
    expect(resolveGridDeliveryLive('off')).toBe('off');
    expect(resolveGridDeliveryLive('on')).toBe('on');
    expect(resolveGridDeliveryLive('limited')).toBe('limited');
  });

  it('resolves numeric sensor values', () => {
    expect(resolveGridDeliveryLive('0')).toBe('off');
    expect(resolveGridDeliveryLive('1')).toBe('on');
    expect(resolveGridDeliveryLive('2')).toBe('limited');
  });

  it('uses prefix matching for partial matches', () => {
    expect(resolveGridDeliveryLive('Omezení 500W')).toBe('limited');
    expect(resolveGridDeliveryLive('Omezeno (500W)')).toBe('limited');
    expect(resolveGridDeliveryLive('Limited 500W')).toBe('limited');
  });

  it('returns unknown for unavailable/empty/unknown states', () => {
    expect(resolveGridDeliveryLive('unavailable')).toBe('unknown');
    expect(resolveGridDeliveryLive('unknown')).toBe('unknown');
    expect(resolveGridDeliveryLive('')).toBe('unknown');
  });

  it('returns unknown for unresolvable values', () => {
    expect(resolveGridDeliveryLive('some random text')).toBe('unknown');
    expect(resolveGridDeliveryLive('invalid')).toBe('unknown');
    expect(resolveGridDeliveryLive('12345')).toBe('unknown');
  });

  it('handles whitespace trimming', () => {
    expect(resolveGridDeliveryLive('  Vypnuto  ')).toBe('off');
    expect(resolveGridDeliveryLive('  Zapnuto  ')).toBe('on');
    expect(resolveGridDeliveryLive('  Omezeno  ')).toBe('limited');
  });
});

describe('parsePendingGridMode', () => {
  it('returns null when no grid_mode pending', () => {
    const pending = new Map<ShieldServiceType, string>();
    expect(parsePendingGridMode(pending)).toBeNull();
  });

  it('parses pending grid_mode with Czech values', () => {
    const pending = new Map<ShieldServiceType, string>([['grid_mode', 'Vypnuto']]);
    expect(parsePendingGridMode(pending)).toBe('off');

    pending.set('grid_mode', 'Zapnuto');
    expect(parsePendingGridMode(pending)).toBe('on');

    pending.set('grid_mode', 'Omezeno');
    expect(parsePendingGridMode(pending)).toBe('limited');
  });

  it('parses pending grid_mode with English values', () => {
    const pending = new Map<ShieldServiceType, string>([['grid_mode', 'off']]);
    expect(parsePendingGridMode(pending)).toBe('off');

    pending.set('grid_mode', 'on');
    expect(parsePendingGridMode(pending)).toBe('on');

    pending.set('grid_mode', 'limited');
    expect(parsePendingGridMode(pending)).toBe('limited');
  });

  it('returns null for unknown pending values', () => {
    const pending = new Map<ShieldServiceType, string>([['grid_mode', 'invalid']]);
    expect(parsePendingGridMode(pending)).toBeNull();
  });
});

describe('parsePendingGridLimit', () => {
  it('returns null when no grid_limit pending', () => {
    const pending = new Map<ShieldServiceType, string>();
    expect(parsePendingGridLimit(pending)).toBeNull();
  });

  it('parses valid numeric limit strings', () => {
    const pending = new Map<ShieldServiceType, string>([['grid_limit', '5400']]);
    expect(parsePendingGridLimit(pending)).toBe(5400);

    pending.set('grid_limit', '3000');
    expect(parsePendingGridLimit(pending)).toBe(3000);

    pending.set('grid_limit', '0');
    expect(parsePendingGridLimit(pending)).toBe(0);
  });

  it('returns null for invalid limit values', () => {
    const pending = new Map<ShieldServiceType, string>([['grid_limit', 'invalid']]);
    expect(parsePendingGridLimit(pending)).toBeNull();

    pending.set('grid_limit', '');
    expect(parsePendingGridLimit(pending)).toBeNull();

    pending.set('grid_limit', '-100');
    expect(parsePendingGridLimit(pending)).toBeNull();
  });
});

describe('isGridDeliveryPending', () => {
  it('returns true when grid_mode is changing', () => {
    const pending = createShieldPending({
      changingServices: new Set<ShieldServiceType>(['grid_mode']),
    });
    expect(isGridDeliveryPending(pending)).toBe(true);
  });

  it('returns true when grid_limit is changing', () => {
    const pending = createShieldPending({
      changingServices: new Set<ShieldServiceType>(['grid_limit']),
    });
    expect(isGridDeliveryPending(pending)).toBe(true);
  });

  it('returns true when both are changing', () => {
    const pending = createShieldPending({
      changingServices: new Set<ShieldServiceType>(['grid_mode', 'grid_limit']),
    });
    expect(isGridDeliveryPending(pending)).toBe(true);
  });

  it('returns false when neither is changing', () => {
    const pending = createShieldPending({
      changingServices: new Set<ShieldServiceType>(['box_mode']),
    });
    expect(isGridDeliveryPending(pending)).toBe(false);
  });

  it('returns false when changingServices is empty', () => {
    const pending = createShieldPending();
    expect(isGridDeliveryPending(pending)).toBe(false);
  });
});

describe('grid-delivery state model - OFF state', () => {
  it('resolves OFF state with no pending changes', () => {
    const raw = createRawValues({ gridModeRaw: 'Vypnuto', gridLimit: 0 });
    const pending = createShieldPending();

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.currentLiveDelivery).toBe('off');
    expect(state.currentLiveLimit).toBe(0);
    expect(state.pendingDeliveryTarget).toBeNull();
    expect(state.pendingLimitTarget).toBeNull();
    expect(state.isTransitioning).toBe(false);
    expect(state.isUnavailable).toBe(false);
  });

  it('resolves OFF with pending transition to ON', () => {
    const raw = createRawValues({ gridModeRaw: 'Vypnuto', gridLimit: 0 });
    const pending = createShieldPending({
      pendingServices: new Map<ShieldServiceType, string>([['grid_mode', 'Zapnuto']]),
      changingServices: new Set<ShieldServiceType>(['grid_mode']),
    });

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.currentLiveDelivery).toBe('off');
    expect(state.pendingDeliveryTarget).toBe('on');
    expect(state.isTransitioning).toBe(true);
  });

  it('resolves OFF with pending transition to LIMITED', () => {
    const raw = createRawValues({ gridModeRaw: 'Vypnuto', gridLimit: 0 });
    const pending = createShieldPending({
      pendingServices: new Map<ShieldServiceType, string>([
        ['grid_mode', 'Omezeno'],
        ['grid_limit', '5400'],
      ]),
      changingServices: new Set<ShieldServiceType>(['grid_mode', 'grid_limit']),
    });

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.currentLiveDelivery).toBe('off');
    expect(state.pendingDeliveryTarget).toBe('limited');
    expect(state.pendingLimitTarget).toBe(5400);
    expect(state.isTransitioning).toBe(true);
  });
});

describe('grid-delivery state model - ON state', () => {
  it('resolves ON state with no pending changes', () => {
    const raw = createRawValues({ gridModeRaw: 'Zapnuto', gridLimit: 10000 });
    const pending = createShieldPending();

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.currentLiveDelivery).toBe('on');
    expect(state.currentLiveLimit).toBe(10000);
    expect(state.pendingDeliveryTarget).toBeNull();
    expect(state.isTransitioning).toBe(false);
  });

  it('resolves ON with pending transition to OFF', () => {
    const raw = createRawValues({ gridModeRaw: 'Zapnuto', gridLimit: 10000 });
    const pending = createShieldPending({
      pendingServices: new Map<ShieldServiceType, string>([['grid_mode', 'Vypnuto']]),
      changingServices: new Set<ShieldServiceType>(['grid_mode']),
    });

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.currentLiveDelivery).toBe('on');
    expect(state.pendingDeliveryTarget).toBe('off');
    expect(state.isTransitioning).toBe(true);
  });

  it('resolves ON with pending transition to LIMITED', () => {
    const raw = createRawValues({ gridModeRaw: 'Zapnuto', gridLimit: 10000 });
    const pending = createShieldPending({
      pendingServices: new Map<ShieldServiceType, string>([
        ['grid_mode', 'Omezeno'],
        ['grid_limit', '5000'],
      ]),
      changingServices: new Set<ShieldServiceType>(['grid_mode']),
    });

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.currentLiveDelivery).toBe('on');
    expect(state.pendingDeliveryTarget).toBe('limited');
    expect(state.pendingLimitTarget).toBe(5000);
    expect(state.isTransitioning).toBe(true);
  });
});

describe('grid-delivery state model - LIMITED state', () => {
  it('resolves LIMITED state with no pending changes', () => {
    const raw = createRawValues({ gridModeRaw: 'Omezeno', gridLimit: 5400 });
    const pending = createShieldPending();

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.currentLiveDelivery).toBe('limited');
    expect(state.currentLiveLimit).toBe(5400);
    expect(state.pendingDeliveryTarget).toBeNull();
    expect(state.pendingLimitTarget).toBeNull();
    expect(state.isTransitioning).toBe(false);
  });

  it('resolves LIMITED with pending limit change only', () => {
    const raw = createRawValues({ gridModeRaw: 'Omezeno', gridLimit: 5400 });
    const pending = createShieldPending({
      pendingServices: new Map<ShieldServiceType, string>([['grid_limit', '3000']]),
      changingServices: new Set<ShieldServiceType>(['grid_limit']),
    });

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.currentLiveDelivery).toBe('limited');
    expect(state.currentLiveLimit).toBe(5400);
    expect(state.pendingDeliveryTarget).toBeNull();
    expect(state.pendingLimitTarget).toBe(3000);
    expect(state.isTransitioning).toBe(true);
  });

  it('resolves LIMITED with pending transition to OFF', () => {
    const raw = createRawValues({ gridModeRaw: 'Omezeno', gridLimit: 5400 });
    const pending = createShieldPending({
      pendingServices: new Map<ShieldServiceType, string>([['grid_mode', 'Vypnuto']]),
      changingServices: new Set<ShieldServiceType>(['grid_mode']),
    });

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.currentLiveDelivery).toBe('limited');
    expect(state.pendingDeliveryTarget).toBe('off');
    expect(state.isTransitioning).toBe(true);
  });
});

describe('grid-delivery state model - Transition state', () => {
  it('detects transition from raw value containing "Probíhá změna"', () => {
    const raw = createRawValues({ gridModeRaw: 'Probíhá změna', gridLimit: 5400 });
    const pending = createShieldPending({
      pendingServices: new Map<ShieldServiceType, string>([['grid_mode', 'Omezeno']]),
      changingServices: new Set<ShieldServiceType>(['grid_mode']),
      shieldStatus: 'running',
    });

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.isTransitioning).toBe(true);
    expect(state.currentLiveDelivery).toBe('unknown');
    expect(state.pendingDeliveryTarget).toBe('limited');
  });

  it('detects transition from shield changingServices', () => {
    const raw = createRawValues({ gridModeRaw: 'Vypnuto', gridLimit: 0 });
    const pending = createShieldPending({
      pendingServices: new Map<ShieldServiceType, string>([['grid_mode', 'Zapnuto']]),
      changingServices: new Set<ShieldServiceType>(['grid_mode']),
      shieldStatus: 'running',
    });

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.isTransitioning).toBe(true);
    expect(state.currentLiveDelivery).toBe('off');
    expect(state.pendingDeliveryTarget).toBe('on');
  });

  it('handles transition from LIMITED to ON', () => {
    const raw = createRawValues({ gridModeRaw: 'Probíhá změna režimu', gridLimit: 5400 });
    const pending = createShieldPending({
      pendingServices: new Map<ShieldServiceType, string>([['grid_mode', 'Zapnuto']]),
      changingServices: new Set<ShieldServiceType>(['grid_mode']),
      shieldStatus: 'running',
    });

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.isTransitioning).toBe(true);
    expect(state.currentLiveDelivery).toBe('unknown');
    expect(state.pendingDeliveryTarget).toBe('on');
  });
});

describe('grid-delivery state model - Unavailable state', () => {
  it('marks unavailable when raw value is "unavailable"', () => {
    const raw = createRawValues({ gridModeRaw: 'unavailable', gridLimit: 0 });
    const pending = createShieldPending();

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.isUnavailable).toBe(true);
    expect(state.currentLiveDelivery).toBe('unknown');
    expect(state.currentLiveLimit).toBeNull();
  });

  it('marks unavailable when raw value is "unknown"', () => {
    const raw = createRawValues({ gridModeRaw: 'unknown', gridLimit: 0 });
    const pending = createShieldPending();

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.isUnavailable).toBe(true);
    expect(state.currentLiveDelivery).toBe('unknown');
  });

  it('marks unavailable when raw value is empty', () => {
    const raw = createRawValues({ gridModeRaw: '', gridLimit: 0 });
    const pending = createShieldPending();

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.isUnavailable).toBe(true);
    expect(state.currentLiveDelivery).toBe('unknown');
  });

  it('still reports pending changes even when unavailable', () => {
    const raw = createRawValues({ gridModeRaw: 'unavailable', gridLimit: 0 });
    const pending = createShieldPending({
      pendingServices: new Map<ShieldServiceType, string>([['grid_mode', 'Zapnuto']]),
      changingServices: new Set<ShieldServiceType>(['grid_mode']),
    });

    const state = resolveGridDeliveryState(raw, pending);

    expect(state.isUnavailable).toBe(true);
    expect(state.isTransitioning).toBe(true);
    expect(state.pendingDeliveryTarget).toBe('on');
  });
});

describe('isGridDeliveryStable', () => {
  it('returns true when not transitioning and not unavailable', () => {
    const state: GridDeliveryStateModel = {
      currentLiveDelivery: 'off',
      currentLiveLimit: 0,
      pendingDeliveryTarget: null,
      pendingLimitTarget: null,
      isTransitioning: false,
      isUnavailable: false,
    };
    expect(isGridDeliveryStable(state)).toBe(true);
  });

  it('returns false when transitioning', () => {
    const state: GridDeliveryStateModel = {
      currentLiveDelivery: 'off',
      currentLiveLimit: 0,
      pendingDeliveryTarget: 'on',
      pendingLimitTarget: null,
      isTransitioning: true,
      isUnavailable: false,
    };
    expect(isGridDeliveryStable(state)).toBe(false);
  });

  it('returns false when unavailable', () => {
    const state: GridDeliveryStateModel = {
      currentLiveDelivery: 'unknown',
      currentLiveLimit: null,
      pendingDeliveryTarget: null,
      pendingLimitTarget: null,
      isTransitioning: false,
      isUnavailable: true,
    };
    expect(isGridDeliveryStable(state)).toBe(false);
  });
});

describe('hasPendingChanges', () => {
  it('returns false when no pending targets', () => {
    const state: GridDeliveryStateModel = {
      currentLiveDelivery: 'off',
      currentLiveLimit: 0,
      pendingDeliveryTarget: null,
      pendingLimitTarget: null,
      isTransitioning: false,
      isUnavailable: false,
    };
    expect(hasPendingChanges(state)).toBe(false);
  });

  it('returns true when pending delivery target exists', () => {
    const state: GridDeliveryStateModel = {
      currentLiveDelivery: 'off',
      currentLiveLimit: 0,
      pendingDeliveryTarget: 'on',
      pendingLimitTarget: null,
      isTransitioning: true,
      isUnavailable: false,
    };
    expect(hasPendingChanges(state)).toBe(true);
  });

  it('returns true when pending limit target exists', () => {
    const state: GridDeliveryStateModel = {
      currentLiveDelivery: 'limited',
      currentLiveLimit: 5400,
      pendingDeliveryTarget: null,
      pendingLimitTarget: 3000,
      isTransitioning: true,
      isUnavailable: false,
    };
    expect(hasPendingChanges(state)).toBe(true);
  });

  it('returns true when both pending targets exist', () => {
    const state: GridDeliveryStateModel = {
      currentLiveDelivery: 'off',
      currentLiveLimit: 0,
      pendingDeliveryTarget: 'limited',
      pendingLimitTarget: 5400,
      isTransitioning: true,
      isUnavailable: false,
    };
    expect(hasPendingChanges(state)).toBe(true);
  });
});

describe('getGridDeliveryDisplayState', () => {
  it('returns current live state when not transitioning', () => {
    const state: GridDeliveryStateModel = {
      currentLiveDelivery: 'off',
      currentLiveLimit: 0,
      pendingDeliveryTarget: null,
      pendingLimitTarget: null,
      isTransitioning: false,
      isUnavailable: false,
    };
    expect(getGridDeliveryDisplayState(state)).toBe('off');
  });

  it('returns pending target when transitioning', () => {
    const state: GridDeliveryStateModel = {
      currentLiveDelivery: 'off',
      currentLiveLimit: 0,
      pendingDeliveryTarget: 'on',
      pendingLimitTarget: null,
      isTransitioning: true,
      isUnavailable: false,
    };
    expect(getGridDeliveryDisplayState(state)).toBe('on');
  });

  it('returns current live when transitioning but no pending target', () => {
    const state: GridDeliveryStateModel = {
      currentLiveDelivery: 'limited',
      currentLiveLimit: 5400,
      pendingDeliveryTarget: null,
      pendingLimitTarget: 3000,
      isTransitioning: true,
      isUnavailable: false,
    };
    expect(getGridDeliveryDisplayState(state)).toBe('limited');
  });

  it('returns unknown when unavailable', () => {
    const state: GridDeliveryStateModel = {
      currentLiveDelivery: 'unknown',
      currentLiveLimit: null,
      pendingDeliveryTarget: null,
      pendingLimitTarget: null,
      isTransitioning: false,
      isUnavailable: true,
    };
    expect(getGridDeliveryDisplayState(state)).toBe('unknown');
  });
});
