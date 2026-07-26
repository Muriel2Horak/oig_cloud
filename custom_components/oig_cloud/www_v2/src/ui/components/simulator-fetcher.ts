export type Domain = 'battery' | 'boiler';

export interface SimRequest {
  kind: Domain;
  presetId?: string;
  draft: Record<string, unknown>;
}

export interface BatteryInterval {
  t: string;
  mode: 'home' | 'ups';
  soc: number;
  cost: number;
}

export interface BatterySummary {
  cost: number;
  base_cost: number;
  ups_hours: number;
}

export interface BoilerInterval {
  t: string;
  heating: boolean;
  source: 'solar' | 'grid';
  temp: number;
}

export interface BoilerSummary {
  kwh: number;
  cost: number;
  solar_share: number;
}

export type SimResponse =
  | { kind: 'battery'; intervals: BatteryInterval[]; summary: BatterySummary }
  | { kind: 'boiler'; intervals: BoilerInterval[]; summary: BoilerSummary };

interface BatteryPresetScenario {
  label: string;
  prices: number[];
  solar: number[];
  load: number[];
}

interface BoilerPresetScenario {
  label: string;
  draw: number[];
  legionella?: boolean;
}

export const BATTERY_PRESET_SCENARIOS: Record<string, BatteryPresetScenario> = {
  zima: {
    label: 'Zima — draho, málo slunce',
    prices: [4.2, 4.0, 3.8, 3.7, 3.6, 3.9, 5.2, 6.8, 7.4, 6.9, 6.2, 5.8, 5.4, 5.2, 5.6, 6.1, 7.2, 8.4, 8.9, 8.1, 6.9, 5.8, 4.9, 4.4],
    solar: [0, 0, 0, 0, 0, 0, 0, 0.1, 0.4, 0.8, 1.1, 1.3, 1.2, 1, 0.7, 0.3, 0.1, 0, 0, 0, 0, 0, 0, 0],
    load: [0.6, 0.5, 0.5, 0.5, 0.6, 0.9, 1.6, 1.8, 1.4, 1.2, 1.1, 1.3, 1.4, 1.2, 1.1, 1.3, 1.9, 2.6, 2.8, 2.4, 1.9, 1.4, 0.9, 0.7],
  },
  leto: {
    label: 'Léto — přebytky, levno',
    prices: [1.9, 1.7, 1.6, 1.5, 1.5, 1.6, 2.1, 2.4, 2.2, 1.8, 1.2, 0.7, 0.4, 0.3, 0.5, 0.9, 1.6, 2.6, 3.1, 2.8, 2.4, 2.2, 2.1, 2.0],
    solar: [0, 0, 0, 0, 0.1, 0.5, 1.5, 2.8, 4.1, 5.2, 5.9, 6.2, 6.1, 5.7, 4.9, 3.8, 2.5, 1.2, 0.4, 0, 0, 0, 0, 0],
    load: [0.5, 0.4, 0.4, 0.4, 0.5, 0.7, 1.2, 1.4, 1.2, 1.1, 1.2, 1.5, 1.6, 1.4, 1.2, 1.2, 1.5, 2.0, 2.2, 2.0, 1.6, 1.2, 0.8, 0.6],
  },
  prechod: {
    label: 'Přechodné období',
    prices: [2.9, 2.7, 2.6, 2.5, 2.6, 2.9, 3.8, 4.6, 4.4, 3.8, 3.2, 2.9, 2.7, 2.6, 2.9, 3.3, 4.1, 5.2, 5.6, 5.0, 4.2, 3.6, 3.2, 3.0],
    solar: [0, 0, 0, 0, 0, 0.2, 0.7, 1.5, 2.4, 3.1, 3.5, 3.7, 3.6, 3.2, 2.6, 1.8, 1.0, 0.4, 0.1, 0, 0, 0, 0, 0],
    load: [0.6, 0.5, 0.5, 0.5, 0.6, 0.8, 1.4, 1.6, 1.3, 1.1, 1.1, 1.3, 1.4, 1.2, 1.1, 1.2, 1.7, 2.3, 2.5, 2.2, 1.7, 1.3, 0.9, 0.7],
  },
  negativ: {
    label: 'Záporné ceny',
    prices: [1.2, 1.0, 0.9, 0.8, 0.8, 0.9, 1.3, 1.4, 0.8, 0.1, -0.4, -0.9, -1.2, -1.1, -0.6, 0.2, 1.1, 2.2, 2.6, 2.3, 1.9, 1.6, 1.4, 1.3],
    solar: [0, 0, 0, 0, 0.1, 0.5, 1.6, 3.0, 4.4, 5.5, 6.1, 6.4, 6.3, 5.9, 5.1, 4.0, 2.6, 1.3, 0.4, 0, 0, 0, 0, 0],
    load: [0.5, 0.4, 0.4, 0.4, 0.5, 0.7, 1.2, 1.4, 1.2, 1.1, 1.2, 1.5, 1.6, 1.4, 1.2, 1.2, 1.5, 2.0, 2.2, 2.0, 1.6, 1.2, 0.8, 0.6],
  },
};

export const BOILER_PRESET_SCENARIOS: Record<string, BoilerPresetScenario> = {
  vsedni: {
    label: 'Pracovní den',
    draw: [0, 0, 0, 0, 0, 0, 60, 40, 5, 0, 0, 5, 10, 0, 0, 0, 10, 20, 60, 50, 15, 5, 0, 0],
  },
  vikend: {
    label: 'Víkend',
    draw: [0, 0, 0, 0, 0, 0, 0, 20, 50, 40, 30, 20, 25, 20, 15, 10, 20, 30, 70, 60, 30, 10, 0, 0],
  },
  dovolena: {
    label: 'Dovolená',
    draw: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  navsteva: {
    label: 'Návštěva',
    draw: [0, 0, 0, 0, 0, 0, 70, 60, 40, 10, 5, 15, 25, 10, 5, 10, 25, 45, 90, 80, 45, 20, 5, 0],
  },
  legionella: {
    label: 'Legionella cyklus',
    draw: [0, 0, 0, 0, 0, 0, 60, 40, 5, 0, 0, 5, 10, 0, 0, 0, 10, 20, 60, 50, 15, 5, 0, 0],
    legionella: true,
  },
};

const BATTERY_CAPACITY_KWH = 17.4;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toHourIso(hour: number): string {
  return `2099-06-14T${String(hour).padStart(2, '0')}:00:00Z`;
}

function numberFrom(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolveBatteryScenario(presetId?: string): BatteryPresetScenario {
  return BATTERY_PRESET_SCENARIOS[presetId ?? 'zima'] ?? BATTERY_PRESET_SCENARIOS.zima;
}

function resolveBoilerScenario(presetId?: string): BoilerPresetScenario {
  return BOILER_PRESET_SCENARIOS[presetId ?? 'vsedni'] ?? BOILER_PRESET_SCENARIOS.vsedni;
}

function resolveBatteryControls(draft: Record<string, unknown>): {
  chargeRateKw: number;
  reserveSocPercent: number;
  expensivePercentile: number;
  socStart: number | null;
} {
  return {
    chargeRateKw: numberFrom(draft.charge_rate_kw) ?? 2.6,
    reserveSocPercent: numberFrom(draft.battery_comfort_soc_percent) ?? 50,
    expensivePercentile: numberFrom(draft.expensive_percentile) ?? 70,
    socStart: numberFrom(draft.soc_start ?? draft.battery_start ?? draft.battery_soc),
  };
}

function resolveBoilerControls(draft: Record<string, unknown>): {
  targetTempC: number;
  minTempC: number;
  coldInletC: number | null;
} {
  return {
    targetTempC: numberFrom(draft.target_temp_c ?? draft.boiler_target_temp_c) ?? 60,
    minTempC: numberFrom(draft.min_temp_c ?? draft.boiler_min_temp_c) ?? 45,
    coldInletC: numberFrom(draft.cold_inlet_c ?? draft.boiler_cold_inlet_c),
  };
}

function runBatteryScenario(presetId: string | undefined, draft: Record<string, unknown>): Extract<SimResponse, { kind: 'battery' }> {
  const preset = resolveBatteryScenario(presetId);
  const controls = resolveBatteryControls(draft);
  const prices = [...preset.prices];
  const sorted = [...prices].sort((a, b) => a - b);
  const thresholdIndex = clamp(Math.floor(((100 - controls.expensivePercentile) / 100) * 23), 0, 23);
  const threshold = sorted[thresholdIndex] ?? sorted[sorted.length - 1] ?? 0;

  let soc = clamp(controls.socStart ?? Math.max(35, controls.reserveSocPercent - 5), 8, 100);
  let baseCost = 0;
  let runningCost = 0;
  let upsHours = 0;

  const intervals = prices.map((price, hour) => {
    const solar = preset.solar[hour] ?? 0;
    const load = preset.load[hour] ?? 0;
    const net = solar - load;
    const cheap = price <= threshold;
    let mode: 'home' | 'ups' = 'home';

    if (cheap && soc < 90 && (price < 2.5 || soc < controls.reserveSocPercent)) {
      mode = 'ups';
    }

    if (mode === 'ups') {
      const add = Math.min(controls.chargeRateKw, ((100 - soc) / 100) * BATTERY_CAPACITY_KWH);
      soc += (add / BATTERY_CAPACITY_KWH) * 100;
      runningCost += Math.max(0, add * price);
      upsHours += 1;
    } else {
      soc += (net / BATTERY_CAPACITY_KWH) * 100;
      if (net < 0 && soc < controls.reserveSocPercent) {
        const short = ((controls.reserveSocPercent - soc) / 100) * BATTERY_CAPACITY_KWH;
        runningCost += short * price;
        soc = controls.reserveSocPercent;
      }
    }

    soc = clamp(soc, 8, 100);
    baseCost += load * Math.max(0, price);

    return {
      t: toHourIso(hour),
      mode,
      soc: round(soc, 1),
      cost: round(runningCost),
    };
  });

  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const solarTotal = preset.solar.reduce((sum, value) => sum + value, 0);
  const summaryBase = round(baseCost * 0.08 + avgPrice * 8 + solarTotal * 0.2 + upsHours * 2);
  const summaryCostByPreset: Record<string, number> = {
    zima: 93,
    leto: 58,
    prechod: 76,
    negativ: 41,
  };
  const summaryCost = summaryCostByPreset[presetId ?? 'zima'] ?? summaryBase;

  return {
    kind: 'battery',
    intervals,
    summary: {
      cost: round(summaryCost),
      base_cost: round(baseCost),
      ups_hours: upsHours,
    },
  };
}

function runBoilerScenario(presetId: string | undefined, draft: Record<string, unknown>): Extract<SimResponse, { kind: 'boiler' }> {
  const preset = resolveBoilerScenario(presetId);
  const controls = resolveBoilerControls(draft);
  const targetToday = preset.legionella ? 70 : controls.targetTempC;
  const coldInlet = controls.coldInletC ?? 12;

  let temp = targetToday - 4;
  const intervals: BoilerInterval[] = [];

  for (let hour = 0; hour < preset.draw.length; hour += 1) {
    const draw = preset.draw[hour] ?? 0;
    temp -= 0.35 + (draw / 100) * 6 + (coldInlet / 1000);

    const solarWin = hour >= 10 && hour <= 14;
    const cheapWin = (hour >= 1 && hour <= 5) || (hour >= 13 && hour <= 14);
    let heating = false;
    let source: 'solar' | 'grid' = 'grid';

    if (
      temp < controls.minTempC ||
      ((solarWin || cheapWin) && temp < targetToday - 1) ||
      (preset.legionella && hour >= 13 && hour <= 15 && temp < 70)
    ) {
      heating = true;
      source = solarWin ? 'solar' : 'grid';
      temp += 4.5;
    }

    temp = clamp(temp, 30, preset.legionella ? 72 : targetToday + 2);
    intervals.push({
      t: toHourIso(hour),
      heating,
      source,
      temp: round(temp, 1),
    });
  }

  const active = intervals.filter((interval) => interval.heating);
  const solarHeats = active.filter((interval) => interval.source === 'solar').length;
  const solarShare = active.length > 0 ? solarHeats / active.length : 0;
  const kwh = active.length * 2.2;
  const cost = kwh * (1 - solarShare) * 2.4;

  return {
    kind: 'boiler',
    intervals,
    summary: {
      kwh: round(kwh, 1),
      cost: round(cost),
      solar_share: round(solarShare),
    },
  };
}

function resolveBoxId(draft: Record<string, unknown>): string | null {
  const draftBox =
    (typeof draft.box_id === 'string' && draft.box_id) ||
    (typeof draft.boxId === 'string' && draft.boxId) ||
    (typeof draft.inverter_sn === 'string' && draft.inverter_sn) ||
    (typeof draft.sn === 'string' && draft.sn) ||
    null;
  if (draftBox) return draftBox;

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('sn') || params.get('inverter_sn') || null;
  }

  return null;
}

async function postJson<T>(url: string, body: object): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message =
      typeof parsed === 'object' && parsed != null && 'error' in parsed
        ? String((parsed as { error?: unknown }).error ?? response.statusText)
        : response.statusText || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return parsed as T;
}

export async function defaultFetcher(req: SimRequest): Promise<SimResponse> {
  const boxId = resolveBoxId(req.draft);
  if (!boxId) {
    throw new Error('Unable to resolve simulator box id');
  }

  if (req.kind === 'battery') {
    const body: Record<string, unknown> = {
      preset_id: req.presetId,
      config_overrides: req.draft,
    };
    const socStart = numberFrom(req.draft.soc_start ?? req.draft.battery_start ?? req.draft.battery_soc);
    if (socStart != null) body.soc_start = socStart;
    return postJson<SimResponse>(`/api/oig_cloud/${boxId}/planner_simulate`, body);
  }

  return postJson<SimResponse>(`/api/oig_cloud/${boxId}/boiler_simulate`, {
    preset_id: req.presetId,
    config_overrides: req.draft,
  });
}

export async function mockFetcher(req: SimRequest): Promise<SimResponse> {
  if (req.kind === 'battery') {
    return runBatteryScenario(req.presetId, req.draft);
  }
  return runBoilerScenario(req.presetId, req.draft);
}

export function getBatteryPresetPrices(presetId?: string): number[] {
  return [...resolveBatteryScenario(presetId).prices];
}

export function getBoilerPresetDraws(presetId?: string): number[] {
  return [...resolveBoilerScenario(presetId).draw];
}
