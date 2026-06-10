const DASH = '—';

export function formatTempC(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  return `${v.toFixed(1)} °C`;
}

export function formatKwh(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  return `${v.toFixed(2)} kWh`;
}

export function formatCzk(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  return `${v.toFixed(2)} Kč`;
}

export function formatPercent(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  return `${Math.round(v * 100)} %`;
}

export function formatTimeRange(startIso: string, endIso: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

export function formatDataAge(secs: number | null | undefined): string {
  if (secs == null || !Number.isFinite(secs)) return DASH;
  if (secs < 60) return `${Math.round(secs)} s`;
  if (secs < 3600) return `${Math.round(secs / 60)} min`;
  return `${Math.round(secs / 3600)} h`;
}

export function formatTempTrendCPerMin(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)} °C/min`;
}

export function formatLiters(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  return `${v.toFixed(0)} L`;
}

export function formatKw(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  return `${v.toFixed(2)} kW`;
}

export function formatCompactTime(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return DASH;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export interface EtaParams {
  targetTempC: number;
  topTempC: number | null;
  temperatureTrendCPerMin: number | null;
  volumeL: number | null;
  heaterPowerKw: number | null;
}

export function estimateTimeToTargetMinutes(p: EtaParams): number | null {
  const top = p.topTempC;
  if (top == null || !Number.isFinite(top)) return null;
  if (p.targetTempC <= top) return 0;
  const delta = p.targetTempC - top;
  if (p.temperatureTrendCPerMin != null && Number.isFinite(p.temperatureTrendCPerMin) && p.temperatureTrendCPerMin > 0) {
    return delta / p.temperatureTrendCPerMin;
  }
  if (p.heaterPowerKw !== null && Number.isFinite(p.heaterPowerKw) && p.volumeL != null && Number.isFinite(p.volumeL)) {
    if (p.heaterPowerKw === 0) return null;
    return (p.volumeL * 0.001163 * delta / p.heaterPowerKw) * 60;
  }
  return null;
}
