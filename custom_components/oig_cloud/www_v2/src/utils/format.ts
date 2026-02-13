/**
 * OIG Cloud V2 — Format & Utility Functions
 *
 * Port of V1 js/core/utils.js formatting, validation, debounce, throttle,
 * and icon emoji mapping — all typed in TypeScript.
 */

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

export function formatNumber(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return value.toFixed(decimals);
}

export function formatPower(watts: number | null | undefined): string {
  if (watts === null || watts === undefined || Number.isNaN(watts)) return '-- W';
  const absWatts = Math.abs(watts);
  if (absWatts >= 1000) {
    return `${(watts / 1000).toFixed(2)} kW`;
  }
  return `${Math.round(watts)} W`;
}

export function formatEnergy(wattHours: number | null | undefined): string {
  if (wattHours === null || wattHours === undefined || Number.isNaN(wattHours)) return '-- Wh';
  const absWh = Math.abs(wattHours);
  if (absWh >= 1000) {
    return `${(wattHours / 1000).toFixed(2)} kWh`;
  }
  return `${Math.round(wattHours)} Wh`;
}

export function formatCurrency(value: number | null | undefined, currency: string = 'CZK'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return `-- ${currency}`;
  return `${value.toFixed(2)} ${currency}`;
}

export function formatPercent(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-- %';
  return `${value.toFixed(decimals)} %`;
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

// ============================================================================
// TIME / DATE FORMATTING
// ============================================================================

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
    minute: '2-digit',
  });
}

/**
 * Relativní čas (před X minutami/hodinami/dny) — Czech locale.
 * Port of V1 formatRelativeTime.
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return 'právě teď';
  if (diffSec < 60) return `před ${diffSec} sekundami`;
  if (diffMin === 1) return 'před minutou';
  if (diffMin < 60) return `před ${diffMin} minutami`;
  if (diffHour === 1) return 'před hodinou';
  if (diffHour < 24) return `před ${diffHour} hodinami`;
  if (diffDay === 1) return 'včera';
  if (diffDay < 7) return `před ${diffDay} dny`;

  return d.toLocaleDateString('cs-CZ');
}

/**
 * Převede sekundy na lidsky čitelný formát (1h 23m 45s).
 * Port of V1 formatDuration.
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Formátuje ČHMÚ datetime (ISO string → lidsky čitelný formát).
 * Port of V1 formatChmuDateTime.
 */
export function formatChmuDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * Vrátí aktuální čas ve formátu HH:MM:SS.
 */
export function getCurrentTimeString(): string {
  return new Date().toLocaleTimeString('cs-CZ');
}

// ============================================================================
// ICON EMOJI MAP
// ============================================================================

const ICON_EMOJI_MAP: Record<string, string> = {
  // Spotřebiče
  'fridge': '❄️', 'fridge-outline': '❄️', 'dishwasher': '🍽️', 'washing-machine': '🧺',
  'tumble-dryer': '🌪️', 'stove': '🔥', 'microwave': '📦', 'coffee-maker': '☕',
  'kettle': '🫖', 'toaster': '🍞',
  // Osvětlení
  'lightbulb': '💡', 'lightbulb-outline': '💡', 'lamp': '🪔', 'ceiling-light': '💡',
  'floor-lamp': '🪔', 'led-strip': '✨', 'led-strip-variant': '✨', 'wall-sconce': '💡',
  'chandelier': '💡',
  // Vytápění
  'thermometer': '🌡️', 'thermostat': '🌡️', 'radiator': '♨️', 'radiator-disabled': '❄️',
  'heat-pump': '♨️', 'air-conditioner': '❄️', 'fan': '🌀', 'hvac': '♨️', 'fire': '🔥',
  'snowflake': '❄️',
  // Energie
  'lightning-bolt': '⚡', 'flash': '⚡', 'battery': '🔋', 'battery-charging': '🔋',
  'battery-50': '🔋', 'solar-panel': '☀️', 'solar-power': '☀️', 'meter-electric': '⚡',
  'power-plug': '🔌', 'power-socket': '🔌',
  // Auto
  'car': '🚗', 'car-electric': '🚘', 'car-battery': '🔋', 'ev-station': '🔌',
  'ev-plug-type2': '🔌', 'garage': '🏠', 'garage-open': '🏠',
  // Zabezpečení
  'door': '🚪', 'door-open': '🚪', 'lock': '🔒', 'lock-open': '🔓', 'shield-home': '🛡️',
  'cctv': '📹', 'camera': '📹', 'motion-sensor': '👁️', 'alarm-light': '🚨', 'bell': '🔔',
  // Okna
  'window-closed': '🪟', 'window-open': '🪟', 'blinds': '🪟', 'blinds-open': '🪟',
  'curtains': '🪟', 'roller-shade': '🪟',
  // Média
  'television': '📺', 'speaker': '🔊', 'speaker-wireless': '🔊', 'music': '🎵',
  'volume-high': '🔊', 'cast': '📡', 'chromecast': '📡',
  // Síť
  'router-wireless': '📡', 'wifi': '📶', 'access-point': '📡', 'lan': '🌐',
  'network': '🌐', 'home-assistant': '🏠',
  // Voda
  'water': '💧', 'water-percent': '💧', 'water-boiler': '♨️', 'water-pump': '💧',
  'shower': '🚿', 'toilet': '🚽', 'faucet': '🚰', 'pipe': '🔧',
  // Počasí
  'weather-sunny': '☀️', 'weather-cloudy': '☁️', 'weather-night': '🌙',
  'weather-rainy': '🌧️', 'weather-snowy': '❄️', 'weather-windy': '💨',
  // Ostatní
  'information': 'ℹ️', 'help-circle': '❓', 'alert-circle': '⚠️',
  'checkbox-marked-circle': '✅', 'toggle-switch': '🔘', 'power': '⚡', 'sync': '🔄',
};

/**
 * Get emoji for an MDI icon name (without "mdi:" prefix).
 * Falls back to gear emoji.
 */
export function getIconEmoji(iconName: string): string {
  // Strip "mdi:" prefix if present
  const key = iconName.replace(/^mdi:/, '');
  return ICON_EMOJI_MAP[key] || '⚙️';
}

// ============================================================================
// DEBOUNCE / THROTTLE
// ============================================================================

/**
 * Creates a debounced version of a function.
 */
export function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  }) as unknown as T;
}

/**
 * Creates a throttled version of a function.
 */
export function throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
  let inThrottle = false;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as unknown as T;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates that a value is a number within a given range.
 */
export function isNumberInRange(value: unknown, min: number, max: number): boolean {
  const num = Number.parseFloat(String(value));
  return !Number.isNaN(num) && num >= min && num <= max;
}

/**
 * Validates entity ID format (sensor.xxx_yyy).
 */
export function isValidEntityId(entityId: unknown): boolean {
  if (typeof entityId !== 'string') return false;
  return /^[a-z_]+\.[a-z0-9_]+$/.test(entityId);
}

// ============================================================================
// RETRY WITH EXPONENTIAL BACKOFF
// ============================================================================

/**
 * Retries an async function with exponential backoff.
 * Matches V1's fetchCostComparisonTileData retry pattern.
 *
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retries (default 3)
 * @param baseDelayMs - Base delay in ms (default 1000). Doubles each retry, caps at 5000.
 * @returns The result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Don't retry auth errors (401/403)
      if (err instanceof Error && (err.message.includes('401') || err.message.includes('403'))) {
        throw err;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
