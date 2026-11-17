/**
 * OIG Cloud V2 — car charging plan (GET /api/oig_cloud/<sn>/ev).
 *
 * The backend plans the car's charging in the battery forecast cycle
 * (ev/planner.py); this layer reads the plan and turns it into what the
 * car tab shows.
 */

import { haClient } from '@/data/ha-client';
import { saveModuleConfig, type SaveResult } from '@/data/settings-data';

const params = new URLSearchParams(window.location.search);
const INVERTER_SN = params.get('sn') || params.get('inverter_sn') || '';

export interface EvSlot {
  start: string;
  energy_kwh: number;
  pv_kwh: number;
  grid_kwh: number;
  power_kw: number;
  price: number;
  cost_czk: number;
  estimated: boolean;
}

export interface EvPlan {
  status: 'planned' | 'shortfall' | 'no_need' | 'unplugged' | string;
  target_soc_pct: number;
  deadline: string | null;
  needed_kwh: number;
  planned_kwh: number;
  shortfall_kwh: number;
  opportunistic_kwh: number;
  cost_czk: number;
  soc_at_deadline_pct: number;
  charge_now: boolean;
  next_start: string | null;
  slots: EvSlot[];
  timeline?: EvSlot[];
}

export interface EvWeekday {
  need_pct: number;
  departure_hour: number | null;
  samples: number;
  drive_days: number;
}

export type DayKind = 'home' | 'trip' | 'workday' | 'dayoff';

export interface EvDay {
  date: string;
  source: 'profile' | 'holiday' | 'vacation' | DayKind | string;
  departure: string | null;
  need_pct: number;
  full_charge: boolean;
  holiday: string | null;
  precondition: boolean | null;
}

export interface EvChargeOverride {
  mode: 'now' | 'by';
  until: string;
  set_at: string;
}

export interface EvControl {
  mode: 'none' | 'wallbox' | 'car' | string;
  switch_entity: string | null;
  manual_hold_until: string | null;
  last_command: { on: boolean; at: string } | null;
  current_a: number | null;
  precondition: { start: boolean; reason: string; starts_at: string | null } | null;
  climate_entity: string | null;
  error: string | null;
}

export interface EvData {
  enabled: boolean;
  next_day?: EvDay | null;
  charge_override?: EvChargeOverride | null;
  vacations?: [string, string][];
  control?: EvControl | null;
  days?: EvDay[];
  car?: { soc_pct: number | null; plugged_in: boolean | null; capacity_kwh: number | null };
  next_departure?: string | null;
  need_pct?: number | null;
  issue?: string | null;
  profile?: Record<string, EvWeekday> | null;
  profile_updated_at?: string | null;
  plan?: EvPlan | null;
}

export async function loadEvData(): Promise<EvData | null> {
  return haClient.fetchOIGAPI<EvData>(`/${INVERTER_SN}/ev`);
}

async function post<T>(path: string, body: unknown, method = 'POST'): Promise<T | null> {
  return haClient.fetchOIGAPI<T>(`/${INVERTER_SN}/ev/${path}`, {
    method,
    body: JSON.stringify(body),
  });
}

/** Charge now, charge by HH:MM, or back to the plan (one drive only). */
export function setChargeMode(mode: 'plan' | 'now' | 'by', time?: string) {
  return post<{ charge_override: EvChargeOverride | null; error?: string }>('charge', { mode, time });
}

export interface DayChange {
  date: string;
  kind: DayKind | null;
  departure?: string | null;
  precondition?: boolean | null;
}

export function setDay(change: DayChange) {
  return post<{ days?: EvDay[]; error?: string }>('day', change);
}

export function addVacation(start: string, end: string) {
  return post<{ vacations?: [string, string][]; error?: string }>('vacation', { start, end });
}

export function removeVacation(start: string, end: string) {
  return post<{ vacations?: [string, string][]; error?: string }>('vacation', { start, end }, 'DELETE');
}

export interface DiscoveryCandidate {
  entity_id: string;
  name: string;
  device: string;
  score: number;
  reasons: string[];
}

export interface Discovery {
  roles: Record<string, DiscoveryCandidate[]>;
  control_mode: 'none' | 'wallbox' | 'car';
  switch_inverted: boolean;
  /** Entities configured now, per role (the wizard starts from these). */
  current?: Record<string, string | null>;
  current_settings?: {
    ev_control_mode?: string | null;
    ev_switch_inverted?: boolean | null;
    ev_climate_when?: string | null;
    ev_target_limit_pct?: number | null;
    ev_set_car_limit?: boolean | null;
  };
}

const REASON_LABELS: Record<string, string> = {
  class_battery: 'typ baterie',
  name_soc: 'název jako nabití',
  device_car: 'patří autu',
  device_charger: 'patří nabíječce',
  class_plug: 'typ zástrčka',
  name_plug: 'název jako kabel',
  name_limit: 'název jako limit nabíjení',
  class_power: 'typ výkon',
  name_power: 'název jako nabíjecí výkon',
  name_charging: 'název jako nabíjení',
  name_pause: 'název jako pozastavit/pokračovat',
  device_charger_fast: 'patří nabíječce (reaguje rychle)',
  device_car_cloud: 'patří autu (přes cloud výrobce)',
  name_current: 'název jako nabíjecí proud',
  name_car: 'název jako auto',
  name_window: 'název jako vyhřívání oken',
  weather_temperature: 'teplota z předpovědi počasí',
  outdoor_temperature: 'venkovní teplota',
  unavailable: 'teď nedostupná',
};

const BOILER_REASON_LABELS: Record<string, string> = {
  class_temperature: 'teplotní čidlo',
  name_boiler: 'název jako bojler',
  device_boiler: 'patří bojleru',
  name_top: 'název jako horní',
  name_bottom: 'název jako dolní',
  name_heater: 'název jako ohřev',
  name_main: 'hlavní spínač zařízení',
  class_energy: 'energie v kWh',
  name_alt: 'název jako druhý zdroj (plyn, kotel)',
  name_circulation: 'název jako cirkulace',
  name_pump: 'název jako čerpadlo',
  name_socket: 'zásuvka nebo relé',
};
Object.assign(REASON_LABELS, BOILER_REASON_LABELS);

export interface BoilerDiscovery {
  roles: Record<string, DiscoveryCandidate[]>;
  current?: Record<string, string | null>;
}

export function discoverBoilerEntities() {
  return haClient.fetchOIGAPI<BoilerDiscovery>(`/${INVERTER_SN}/boiler/discover`);
}

export const BOILER_ROLES: { key: string; label: string }[] = [
  { key: 'boiler_temp_sensor_top', label: 'Horní teplota' },
  { key: 'boiler_temp_sensor_bottom', label: 'Dolní teplota' },
  { key: 'boiler_heater_switch_entity', label: 'Spínač ohřevu' },
  { key: 'boiler_current_power_entity', label: 'Výkon ohřevu' },
  { key: 'boiler_alt_heater_switch_entity', label: 'Spínač druhého zdroje' },
  { key: 'boiler_alt_energy_sensor', label: 'Energie z druhého zdroje' },
  { key: 'boiler_circulation_pump_switch_entity', label: 'Čerpadlo cirkulace' },
];

export interface BoilerSuggestion {
  key: string;
  label: string;
  current: string | null;
  candidate: DiscoveryCandidate;
  /** Configured entity is missing from Home Assistant. */
  currentMissing: boolean;
}

/**
 * What to offer: the best candidate per setting when it differs from what is
 * set, or when the setting is empty or points at an entity that no longer
 * exists.
 */
export function boilerSuggestions(found: BoilerDiscovery, exists: (entityId: string) => boolean): BoilerSuggestion[] {
  const out: BoilerSuggestion[] = [];
  for (const role of BOILER_ROLES) {
    const best = found.roles?.[role.key]?.[0];
    if (!best) continue;
    const current = found.current?.[role.key] ?? null;
    const currentMissing = Boolean(current) && !exists(current as string);
    if (current && !currentMissing) continue; // a working setting stays
    out.push({ key: role.key, label: role.label, current, candidate: best, currentMissing });
  }
  return out;
}

/** Czech text for the discovery reason codes. */
export function reasonText(reasons: string[]): string {
  return reasons.map((r) => REASON_LABELS[r] ?? r).join(', ');
}

/** Starting choice per role: what is configured, else the best candidate. */
export function initialChoices(found: Discovery): Record<string, string> {
  const chosen: Record<string, string> = {};
  for (const role of DISCOVERY_ROLES) {
    const current = found.current?.[role.key];
    const best = found.roles?.[role.key]?.[0]?.entity_id;
    const pick = current || best;
    if (pick) chosen[role.key] = pick;
  }
  return chosen;
}

export function discoverEntities() {
  return haClient.fetchOIGAPI<Discovery>(`/${INVERTER_SN}/ev/discover`);
}

/** The car's settings live in the battery section of the module config. */
export function saveEvSettings(values: Record<string, unknown>): Promise<SaveResult> {
  return saveModuleConfig('battery', values);
}

/** Wizard roles in the order the user confirms them, with Czech names. */
export const DISCOVERY_ROLES: { key: string; label: string; required?: boolean }[] = [
  { key: 'ev_soc_entity', label: 'Nabití auta', required: true },
  { key: 'ev_plugged_entity', label: 'Kabel připojen' },
  { key: 'ev_charge_limit_entity', label: 'Limit nabíjení' },
  { key: 'ev_charger_power_entity', label: 'Výkon nabíječky' },
  { key: 'ev_switch_entity', label: 'Spínač nabíjení' },
  { key: 'ev_current_entity', label: 'Nabíjecí proud' },
  { key: 'ev_climate_entity', label: 'Topení v autě' },
  { key: 'ev_window_heating_entity', label: 'Vyhřívání oken' },
  { key: 'ev_outside_temp_entity', label: 'Venkovní teplota' },
];

/**
 * Settings the wizard saves from the chosen entities.
 *
 * A mode already set (switching, heating rule) is kept; the wizard only
 * turns it on or off. Current control stays a setting of its own.
 */
export function wizardValues(
  chosen: Record<string, string>,
  discovery: Pick<Discovery, 'control_mode' | 'switch_inverted' | 'current' | 'current_settings'>,
  options: { control: boolean; heating: boolean; targetLimit?: number; setCarLimit?: boolean },
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const role of DISCOVERY_ROLES) {
    if (chosen[role.key]) values[role.key] = chosen[role.key];
  }
  const settings = discovery.current_settings ?? {};
  const switchChanged = chosen.ev_switch_entity !== (discovery.current?.ev_switch_entity ?? undefined);
  if (options.control && chosen.ev_switch_entity) {
    const keep = settings.ev_control_mode && settings.ev_control_mode !== 'none' && !switchChanged;
    values.ev_control_mode = keep
      ? settings.ev_control_mode
      : discovery.control_mode === 'none' ? 'wallbox' : discovery.control_mode;
    values.ev_switch_inverted = keep ? Boolean(settings.ev_switch_inverted) : discovery.switch_inverted;
  } else {
    values.ev_control_mode = 'none';
  }
  if (options.targetLimit !== undefined) values.ev_target_limit_pct = options.targetLimit;
  if (options.setCarLimit !== undefined) values.ev_set_car_limit = options.targetLimit ? options.setCarLimit : false;
  if (chosen.ev_climate_entity) {
    const when = settings.ev_climate_when;
    values.ev_climate_when = options.heating ? (when && when !== 'off' ? when : 'cold') : 'off';
  }
  return values;
}

const DAY_LABELS: Record<string, string> = {
  profile: 'pracovní den',
  holiday: 'státní svátek',
  vacation: 'dovolená',
  home: 'doma',
  trip: 'dlouhá cesta',
  workday: 'jako pracovní den',
  dayoff: 'jako neděle',
};

/** Czech tag for a day (weekend days of the profile say "víkend"). */
export function dayTag(day: EvDay): string {
  if (day.source === 'profile') {
    const wd = (new Date(`${day.date}T12:00:00`).getDay() + 6) % 7;
    return wd >= 5 ? 'víkend' : DAY_LABELS.profile;
  }
  return DAY_LABELS[day.source] ?? day.source;
}

/** "HH:MM" of an ISO time in local time. */
export function hhmm(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "Po 16. 11." for a YYYY-MM-DD date. */
export function dayTitle(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return `${WEEKDAYS_SHORT[(d.getDay() + 6) % 7]} ${d.getDate()}. ${d.getMonth() + 1}.`;
}

const WEEKDAYS_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

const PRECONDITION_REASONS: Record<string, string> = {
  start: 'topí se',
  done: 'už topilo',
  waiting: 'začne',
  warm: 'venku je teplo, netopí se',
  no_temperature: 'chybí venkovní teplota',
  unplugged: 'auto není u nabíječky',
  not_wanted: 'vypnuto',
  day_off: 'tento den ne',
  no_departure: 'žádný odjezd',
  departed: 'po odjezdu',
};

export function preconditionText(control: EvControl | null | undefined): string {
  const p = control?.precondition;
  if (!control?.climate_entity) return 'Topení v autě není nastavené.';
  if (!p) return 'Čeká na plán.';
  const reason = PRECONDITION_REASONS[p.reason] ?? p.reason;
  if (p.reason === 'waiting' && p.starts_at) return `Začne topit ${formatTime(p.starts_at)}.`;
  return `${reason.charAt(0).toUpperCase()}${reason.slice(1)}.`;
}

export interface EvStatus {
  key: 'charging' | 'waiting' | 'done' | 'unplugged' | 'shortfall' | 'unknown';
  label: string;
}

/** What the car is doing, in Czech, from the plan. */
export function evStatus(data: EvData | null): EvStatus {
  const plan = data?.plan;
  if (data?.issue === 'soc_unavailable') return { key: 'unknown', label: 'Nabití auta není k dispozici' };
  if (data?.issue === 'capacity_unknown') return { key: 'unknown', label: 'Chybí kapacita baterie auta' };
  if (!plan) return { key: 'unknown', label: 'Plán se počítá' };
  if (plan.status === 'unplugged') return { key: 'unplugged', label: 'Auto není připojené' };
  if (plan.charge_now) return { key: 'charging', label: 'Nabíjet teď' };
  if (plan.status === 'shortfall') return { key: 'shortfall', label: 'Do odjezdu se nestihne nabít' };
  if (plan.status === 'planned') return { key: 'waiting', label: 'Čeká na levný čas' };
  if (plan.next_start) return { key: 'waiting', label: 'Nabije se z levného přetoku' };
  return { key: 'done', label: 'Nabito na odjezd' };
}

const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export interface ProfileRow {
  day: string;
  departure: string;
  needPct: number;
  samples: number;
}

/** Weekday rows Monday..Sunday from the backend profile ({"0": {...}}). */
export function profileRows(profile: EvData['profile']): ProfileRow[] {
  return WEEKDAYS.map((day, i) => {
    const row = profile?.[String(i)];
    return {
      day,
      departure: row?.departure_hour != null ? `${String(row.departure_hour).padStart(2, '0')}:00` : '—',
      needPct: row ? Math.round(row.need_pct) : 0,
      samples: row?.samples ?? 0,
    };
  });
}

/** 0..1 position of a price between the cheapest and dearest slot. */
export function priceLevel(price: number, min: number, max: number): number {
  if (!Number.isFinite(price) || max <= min) return 0.5;
  return Math.min(1, Math.max(0, (price - min) / (max - min)));
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === today.toDateString()) return `dnes ${hm}`;
  if (d.toDateString() === tomorrow.toDateString()) return `zítra ${hm}`;
  return `${WEEKDAYS[(d.getDay() + 6) % 7]} ${d.getDate()}. ${d.getMonth() + 1}. ${hm}`;
}

// ── car tab, plain-language summary ────────────────────────────────────

export interface HourBar {
  start: string;
  hour: number;
  price: number;
  energyKwh: number;
  pvKwh: number;
  estimated: boolean;
}

/** Quarter-hour slots summed per hour (price = mean) for a readable axis. */
export function hourlyTimeline(slots: EvSlot[]): HourBar[] {
  const bars: HourBar[] = [];
  let current: (HourBar & { n: number }) | null = null;
  for (const s of slots) {
    const d = new Date(s.start);
    const key = `${d.toDateString()} ${d.getHours()}`;
    if (!current || current.start !== key) {
      current = { start: key, hour: d.getHours(), price: 0, energyKwh: 0, pvKwh: 0, estimated: false, n: 0 };
      bars.push(current);
    }
    current.price += s.price;
    current.energyKwh += s.energy_kwh;
    current.pvKwh += s.pv_kwh;
    current.estimated = current.estimated || s.estimated;
    current.n += 1;
  }
  return bars.map((b) => {
    const { n, ...bar } = b as HourBar & { n: number };
    return { ...bar, price: n ? bar.price / n : 0 };
  });
}

/** Charging blocks as "02:00–03:15" (contiguous charging quarter-hours). */
export function chargingWindows(slots: EvSlot[]): string[] {
  const windows: string[] = [];
  let start: string | null = null;
  let end: Date | null = null;
  for (const s of slots) {
    if (s.energy_kwh > 0.01) {
      if (!start) start = s.start;
      end = new Date(new Date(s.start).getTime() + 15 * 60_000);
    } else if (start && end) {
      windows.push(`${hhmm(start)}–${hhmm(end.toISOString())}`);
      start = null;
    }
  }
  if (start && end) windows.push(`${hhmm(start)}–${hhmm(end.toISOString())}`);
  return windows;
}

export interface EvHeadline {
  tone: 'charging' | 'waiting' | 'ready' | 'warn' | 'idle';
  title: string;
  detail: string;
}

function dayWord(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'dnes';
  if (d.toDateString() === tomorrow.toDateString()) return 'zítra';
  return dayTitle(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
}

/** One sentence that says what happens with the car, and one with numbers. */
export function evHeadline(data: EvData): EvHeadline {
  const plan = data.plan;
  if (data.issue === 'soc_unavailable') return { tone: 'idle', title: 'Nabití auta není známé', detail: 'Senzor nabití auta teď nehlásí hodnotu.' };
  if (data.issue === 'capacity_unknown') return { tone: 'idle', title: 'Chybí kapacita baterie auta', detail: 'Doplňte ji v nastavení auta nebo počkejte na první nabíjení.' };
  if (!plan) return { tone: 'idle', title: 'Plán se počítá', detail: 'Do pár minut tu bude.' };
  const kwh = `${plan.planned_kwh.toFixed(1)} kWh`;
  const cost = plan.cost_czk > 0.5 ? ` za ${plan.cost_czk.toFixed(0)} Kč` : '';
  const timeline = plan.timeline ?? plan.slots;
  const windows = chargingWindows(timeline);
  const source = timeline.some((s) => s.pv_kwh > s.grid_kwh && s.energy_kwh > 0) ? ', část z přetoků FVE' : '';
  if (plan.status === 'unplugged') return { tone: 'idle', title: 'Auto není připojené', detail: 'Po připojení se plán hned přepočítá.' };
  if (data.charge_override?.mode === 'now') return { tone: 'charging', title: 'Nabíjí se hned', detail: `${kwh}${cost}. Po odjezdu zase podle plánu.` };
  if (plan.charge_now) return { tone: 'charging', title: windows[0] ? `Nabíjí se, do ${windows[0].split('–')[1]}` : 'Nabíjí se', detail: `${kwh}${cost}${source}.` };
  if (plan.status === 'shortfall') return { tone: 'warn', title: 'Do odjezdu se nenabije celé', detail: `Chybí ${plan.shortfall_kwh.toFixed(1)} kWh. Zkuste „Nabít ihned“ nebo pozdější čas.` };
  if (plan.next_start && windows.length) {
    const when = `${dayWord(plan.next_start)} ${windows[0]}`;
    const more = windows.length > 1 ? ` a ještě ${windows.length - 1}× později` : '';
    return { tone: 'waiting', title: `Nabije se ${when}`, detail: `${kwh}${cost}${source}${more}, v nejlevnějších hodinách.` };
  }
  return { tone: 'ready', title: 'Připraveno na odjezd', detail: 'Auto má dost, do odjezdu se nabíjet nemusí.' };
}

/** "zítra 9:00 · svátek, jako neděle" for the next departure. */
export function departureText(day: EvDay | null | undefined): { when: string; why: string } {
  if (!day?.departure) return { when: 'bez odjezdu', why: '' };
  const why: Record<string, string> = {
    profile: 'podle jízd',
    holiday: `${day.holiday ?? 'svátek'}, jako neděle`,
    trip: 'dlouhá cesta',
    workday: 'jako pracovní den',
    dayoff: 'jako neděle',
  };
  return { when: `${dayWord(day.departure)} ${hhmm(day.departure)}`, why: why[day.source] ?? '' };
}
