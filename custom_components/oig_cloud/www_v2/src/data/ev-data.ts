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

/** Settings the wizard saves from the chosen entities. */
export function wizardValues(
  chosen: Record<string, string>,
  discovery: Pick<Discovery, 'control_mode' | 'switch_inverted'>,
  options: { control: boolean; heating: boolean },
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const role of DISCOVERY_ROLES) {
    if (chosen[role.key]) values[role.key] = chosen[role.key];
  }
  if (options.control && chosen.ev_switch_entity) {
    values.ev_control_mode = discovery.control_mode === 'none' ? 'wallbox' : discovery.control_mode;
    values.ev_switch_inverted = discovery.switch_inverted;
  } else {
    values.ev_control_mode = 'none';
  }
  if (chosen.ev_current_entity && options.control) values.ev_current_control = true;
  if (chosen.ev_climate_entity) values.ev_climate_when = options.heating ? 'cold' : 'off';
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
