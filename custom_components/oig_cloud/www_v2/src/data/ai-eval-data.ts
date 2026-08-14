export interface AiEvalData {
  available: boolean;              // the sensor exists and has run
  status: 'ok' | 'attention';      // ok = quiet, nothing to act on; attention = report present
  reportFakta: string | null;
  reportLidsky: string | null;
  ledger: string | null;
  lastRun: string | null;
  entityId: string | null;
}

export const EMPTY_AI_EVAL: AiEvalData = {
  available: false,
  status: 'ok',
  reportFakta: null,
  reportLidsky: null,
  ledger: null,
  lastRun: null,
  entityId: null,
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

  // The sensor exists and has run — it is AVAILABLE regardless of whether this
  // hour had anything worth reporting. A report means "attention"; no report
  // means a quiet, healthy hour (green), NOT "unavailable".
  const hasContent = reportFakta !== null || reportLidsky !== null;

  return {
    available: true,
    status: hasContent ? 'attention' : 'ok',
    reportFakta,
    reportLidsky,
    ledger,
    lastRun,
    entityId,
  };
}

function nonEmptyString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}
