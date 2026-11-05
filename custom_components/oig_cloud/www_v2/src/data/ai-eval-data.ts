export interface AiRisk { kdy: string; co: string; proc: string }
export interface AiAction {
  kdy: string;
  akce: string;
  duvod: string;
  prinos_kc: number | null;
  priorita: 'vysoka' | 'stredni' | 'nizka';
}
export interface AiAnomaly { kdy: string; co: string; vyznam: string }
export interface AiReport {
  situace: string;
  rizika: AiRisk[];
  doporuceni: AiAction[];
  anomalie: AiAnomaly[];
}

export interface AiEvalData {
  available: boolean;              // the sensor exists and has run
  // ok = quiet, nothing to act on; advice = calm recommendations;
  // attention = a risk, an anomaly or a high-priority action
  status: 'ok' | 'advice' | 'attention';
  reportFakta: string | null;
  reportLidsky: string | null;
  ledger: string | null;
  lastRun: string | null;
  entityId: string | null;
  report: AiReport | null;         // structured advice (situace/rizika/doporuceni/anomalie)
  generatedAt: string | null;      // when that report was produced (not the last tick)
}

export const EMPTY_AI_EVAL: AiEvalData = {
  available: false,
  status: 'ok',
  reportFakta: null,
  reportLidsky: null,
  ledger: null,
  lastRun: null,
  entityId: null,
  report: null,
  generatedAt: null,
};

export function extractAiEvalData(states: Record<string, any>, boxId: string): AiEvalData {
  if (!boxId) return EMPTY_AI_EVAL;

  const entityId = `sensor.oig_${boxId}_ai_eval`;
  const entity = states?.[entityId];

  if (!entity) return { ...EMPTY_AI_EVAL, entityId };

  const state = entity.state;
  if (state === 'unavailable' || state === 'unknown') {
    return { ...EMPTY_AI_EVAL, entityId };
  }

  const attrs = entity.attributes ?? {};
  const reportFakta = nonEmptyString(attrs.report_fakta);
  const reportLidsky = nonEmptyString(attrs.report_lidsky);
  const ledger = nonEmptyString(attrs.ledger);
  const lastRun = nonEmptyString(attrs.last_run);
  const report = parseReport(attrs.report);

  // The sensor exists and has run — it is AVAILABLE regardless of whether this
  // hour had anything worth reporting. No report means a quiet, healthy hour
  // (green), NOT "unavailable".
  const hasContent = report !== null || reportFakta !== null || reportLidsky !== null;
  let status: AiEvalData['status'] = 'ok';
  if (hasContent) {
    status = attrs.status === 'advice' ? 'advice' : 'attention';
  }

  return {
    available: true,
    status,
    reportFakta,
    reportLidsky,
    ledger,
    lastRun,
    entityId,
    report,
    generatedAt: nonEmptyString(attrs.report_generated_at),
  };
}

function nonEmptyString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function list<T>(raw: unknown, pick: (o: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const parsed = pick(item as Record<string, unknown>);
    if (parsed) out.push(parsed);
  }
  return out;
}

const PRIORITIES = new Set(['vysoka', 'stredni', 'nizka']);

/** Validate the sensor's `report` attribute; anything malformed -> null. */
export function parseReport(raw: unknown): AiReport | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const situace = str(r.situace);
  if (!situace) return null;
  return {
    situace,
    rizika: list(r.rizika, (o) => (str(o.co) ? { kdy: str(o.kdy), co: str(o.co), proc: str(o.proc) } : null)),
    doporuceni: list(r.doporuceni, (o) => {
      if (!str(o.kdy) || !str(o.akce)) return null;
      const prio = str(o.priorita);
      return {
        kdy: str(o.kdy),
        akce: str(o.akce),
        duvod: str(o.duvod),
        prinos_kc: typeof o.prinos_kc === 'number' && Number.isFinite(o.prinos_kc) ? o.prinos_kc : null,
        priorita: (PRIORITIES.has(prio) ? prio : 'stredni') as AiAction['priorita'],
      };
    }),
    anomalie: list(r.anomalie, (o) => (str(o.co) ? { kdy: str(o.kdy), co: str(o.co), vyznam: str(o.vyznam) } : null)),
  };
}
