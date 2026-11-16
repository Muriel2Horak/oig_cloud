/**
 * OIG Cloud V2 — car charging plan (GET /api/oig_cloud/<sn>/ev).
 *
 * The backend plans the car's charging in the battery forecast cycle
 * (ev/planner.py); this layer reads the plan and turns it into what the
 * car tab shows.
 */

import { haClient } from '@/data/ha-client';

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

export interface EvData {
  enabled: boolean;
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
