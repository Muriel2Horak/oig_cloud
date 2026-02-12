export function formatNumber(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}

export function formatPower(watts: number): string {
  if (Math.abs(watts) >= 1000) {
    return `${(watts / 1000).toFixed(2)} kW`;
  }
  return `${Math.round(watts)} W`;
}

export function formatEnergy(wattHours: number): string {
  if (Math.abs(wattHours) >= 1000) {
    return `${(wattHours / 1000).toFixed(2)} kWh`;
  }
  return `${Math.round(wattHours)} Wh`;
}

export function formatCurrency(value: number, currency: string = 'CZK'): string {
  return `${value.toFixed(2)} ${currency}`;
}

export function formatPercent(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('cs-CZ', { 
    day: '2-digit', 
    month: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
