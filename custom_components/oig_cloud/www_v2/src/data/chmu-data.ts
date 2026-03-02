/**
 * OIG Cloud V2 — ČHMÚ Warning Data Layer
 *
 * Reads ČHMÚ weather warning data from HA sensor entities.
 * Sensors: sensor.oig_{SN}_chmu_warning_level (local)
 *          sensor.oig_{SN}_chmu_warning_level_global (national)
 *
 * Port of V1 js/features/chmu.js data logic.
 */

import { getEntityStore } from '@/data/entity-store';
import { oigLog } from '@/core/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ChmuWarningDetail {
  event_type: string;
  severity: number;
  description: string;
  instruction: string;
  onset: string;
  expires: string;
  eta_hours: number;
}

export interface ChmuData {
  severity: number;             // 0-4
  warningsCount: number;
  eventType: string;
  description: string;
  instruction: string;
  onset: string;
  expires: string;
  etaHours: number;
  allWarnings: ChmuWarningDetail[];
  /** Effective severity (overridden to 0 when no real warnings) */
  effectiveSeverity: number;
}

export const EMPTY_CHMU_DATA: ChmuData = {
  severity: 0,
  warningsCount: 0,
  eventType: '',
  description: '',
  instruction: '',
  onset: '',
  expires: '',
  etaHours: 0,
  allWarnings: [],
  effectiveSeverity: 0,
};

// ============================================================================
// ICON MAPPING (V1 chmu.js)
// ============================================================================

const CHMU_ICON_MAP: Record<string, string> = {
  'vítr': '💨',
  'déšť': '🌧️',
  'sníh': '❄️',
  'bouřky': '⛈️',
  'mráz': '🥶',
  'vedro': '🥵',
  'mlha': '🌫️',
  'náledí': '🧊',
  'laviny': '🏔️',
};

export function getChmuIcon(eventType: string): string {
  const lower = eventType.toLowerCase();
  for (const [key, icon] of Object.entries(CHMU_ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return '⚠️';
}

export const SEVERITY_LABELS: Record<number, string> = {
  0: 'Bez výstrahy',
  1: 'Nízká',
  2: 'Zvýšená',
  3: 'Vysoká',
  4: 'Extrémní',
};

export const SEVERITY_COLORS: Record<number, string> = {
  0: '#4CAF50',
  1: '#8BC34A',
  2: '#FF9800',
  3: '#f44336',
  4: '#9C27B0',
};

// ============================================================================
// DATA EXTRACTION
// ============================================================================

export function extractChmuData(inverterSn: string): ChmuData {
  const store = getEntityStore();
  if (!store) return EMPTY_CHMU_DATA;

  const localEntityId = `sensor.oig_${inverterSn}_chmu_warning_level`;
  const entity = store.get(localEntityId);

  if (!entity) {
    oigLog.debug('ČHMÚ sensor not found', { entityId: localEntityId });
    return EMPTY_CHMU_DATA;
  }

  const severity = parseInt(entity.state, 10) || 0;
  const attrs: any = entity.attributes || {};
  const warningsCount = Number(attrs.warnings_count ?? 0);
  const eventType = String(attrs.event_type ?? '');
  const description = String(attrs.description ?? '');
  const instruction = String(attrs.instruction ?? '');
  const onset = String(attrs.onset ?? '');
  const expires = String(attrs.expires ?? '');
  const etaHours = Number(attrs.eta_hours ?? 0);
  const allWarningsRaw = attrs.all_warnings_details ?? [];

  const allWarnings: ChmuWarningDetail[] = Array.isArray(allWarningsRaw)
    ? allWarningsRaw.map((w: any) => ({
        event_type: w.event_type ?? w.event ?? '',
        severity: w.severity ?? severity,
        description: w.description ?? '',
        instruction: w.instruction ?? '',
        onset: w.onset ?? '',
        expires: w.expires ?? '',
        eta_hours: w.eta_hours ?? 0,
      }))
    : [];

  // Effective severity: override to 0 if no actual warnings
  const noWarning = eventType.toLowerCase().includes('žádná výstraha');
  const effectiveSeverity = (warningsCount === 0 || noWarning) ? 0 : severity;

  return {
    severity,
    warningsCount,
    eventType,
    description,
    instruction,
    onset,
    expires,
    etaHours,
    allWarnings,
    effectiveSeverity,
  };
}
