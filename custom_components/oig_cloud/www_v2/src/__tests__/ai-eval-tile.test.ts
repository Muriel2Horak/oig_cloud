import { describe, it, expect, vi, afterEach } from 'vitest';
import { haClient } from '@/data/ha-client';
import { extractAiEvalData, EMPTY_AI_EVAL } from '@/data/ai-eval-data';
import { aiEvalT, resolveAiEvalLang } from '@/i18n/ai-eval';
import { fixture } from '@open-wc/testing-helpers';
import { html } from 'lit';
import '@/ui/features/ai-eval';
import type { OigAiEvalTile } from '@/ui/features/ai-eval';
import type { AiEvalData } from '@/data/ai-eval-data';

const BOX = 'testbox01';

function mkEntity(attrs: Record<string, any>, state = 'ok') {
  return {
    [`sensor.oig_${BOX}_ai_eval`]: {
      state,
      attributes: attrs,
    },
  };
}

describe('extractAiEvalData', () => {
  it('returns EMPTY_AI_EVAL when states is empty', () => {
    const data = extractAiEvalData({}, BOX);
    expect(data.available).toBe(false);
    expect(data.reportFakta).toBeNull();
    expect(data.reportLidsky).toBeNull();
    expect(data.entityId).toBe(`sensor.oig_${BOX}_ai_eval`);
  });

  it('returns EMPTY_AI_EVAL when boxId is empty', () => {
    const data = extractAiEvalData({}, '');
    expect(data).toEqual(EMPTY_AI_EVAL);
  });

  it('returns unavailable when entity state is "unavailable"', () => {
    const states = mkEntity({ report_fakta: 'x' }, 'unavailable');
    const data = extractAiEvalData(states, BOX);
    expect(data.available).toBe(false);
    expect(data.reportFakta).toBeNull();
  });

  it('returns unavailable when entity state is "unknown"', () => {
    const states = mkEntity({ report_fakta: 'x' }, 'unknown');
    const data = extractAiEvalData(states, BOX);
    expect(data.available).toBe(false);
  });

  it('returns ok/quiet when the sensor ran but had nothing to report', () => {
    const states = mkEntity({ report_fakta: '', report_lidsky: '  ' });
    const data = extractAiEvalData(states, BOX);
    expect(data.available).toBe(true);
    expect(data.status).toBe('ok');
  });

  it('returns ok/quiet when attributes are empty but the sensor is present', () => {
    const states = {
      [`sensor.oig_${BOX}_ai_eval`]: {
        state: 'ok',
        attributes: {},
      },
    };
    const data = extractAiEvalData(states, BOX);
    expect(data.available).toBe(true);
    expect(data.status).toBe('ok');
  });

  it('extracts fakta and lidsky from attributes', () => {
    const states = mkEntity({
      report_fakta: '**Fakta** report content',
      report_lidsky: 'Lidsky text here',
      last_run: '2026-08-01T10:00:00Z',
    });
    const data = extractAiEvalData(states, BOX);
    expect(data.available).toBe(true);
    expect(data.reportFakta).toBe('**Fakta** report content');
    expect(data.reportLidsky).toBe('Lidsky text here');
    expect(data.lastRun).toBe('2026-08-01T10:00:00Z');
    expect(data.ledger).toBeNull();
  });

  it('extracts ledger when present', () => {
    const states = mkEntity({
      report_fakta: 'fakta',
      report_lidsky: 'lidsky',
      ledger: '10:00 - event A\n11:00 - event B',
    });
    const data = extractAiEvalData(states, BOX);
    expect(data.available).toBe(true);
    expect(data.ledger).toContain('event A');
    expect(data.ledger).toContain('event B');
  });

  it('trims whitespace from attribute values', () => {
    const states = mkEntity({
      report_fakta: '  trimmed fakta  ',
      report_lidsky: '\nlidsky\n',
    });
    const data = extractAiEvalData(states, BOX);
    expect(data.reportFakta).toBe('trimmed fakta');
    expect(data.reportLidsky).toBe('lidsky');
  });

  it('handles non-string attributes gracefully', () => {
    const states = mkEntity({
      report_fakta: 42,
      report_lidsky: null,
      ledger: undefined,
      last_run: true,
    });
    const data = extractAiEvalData(states, BOX);
    expect(data.available).toBe(true);
    expect(data.status).toBe('ok');
    expect(data.reportFakta).toBeNull();
    expect(data.reportLidsky).toBeNull();
    expect(data.ledger).toBeNull();
    expect(data.lastRun).toBeNull();
  });

  it('handles entity with no attributes key (present -> ok)', () => {
    const states = {
      [`sensor.oig_${BOX}_ai_eval`]: {
        state: 'ok',
      },
    };
    const data = extractAiEvalData(states, BOX);
    expect(data.available).toBe(true);
    expect(data.status).toBe('ok');
  });
});

describe('ai-eval i18n', () => {
  it('resolves cs by default', () => {
    expect(resolveAiEvalLang(undefined as any)).toBe('cs');
    expect(resolveAiEvalLang({ locale: { language: 'cs' } } as any)).toBe('cs');
  });

  it('resolves en when hass language starts with en', () => {
    expect(resolveAiEvalLang({ language: 'en' } as any)).toBe('en');
    expect(resolveAiEvalLang({ locale: { language: 'en-US' } } as any)).toBe('en');
  });

  it('returns cs string for known key', () => {
    expect(aiEvalT('ai_eval.title', 'cs')).toBe('AI hodnocení');
    expect(aiEvalT('ai_eval.fakta_heading', 'cs')).toBe('Fakta');
    expect(aiEvalT('ai_eval.lidsky_heading', 'cs')).toBe('Lidský');
    expect(aiEvalT('ai_eval.unavailable', 'cs')).toBe('AI hodnocení není k dispozici');
  });

  it('returns en string for known key', () => {
    expect(aiEvalT('ai_eval.title', 'en')).toBe('AI Evaluation');
    expect(aiEvalT('ai_eval.fakta_heading', 'en')).toBe('Facts');
    expect(aiEvalT('ai_eval.lidsky_heading', 'en')).toBe('Plain language');
    expect(aiEvalT('ai_eval.unavailable', 'en')).toBe('AI evaluation unavailable');
  });

  it('returns key when missing', () => {
    expect(aiEvalT('ai_eval.nonexistent' as any, 'cs')).toBe('ai_eval.nonexistent');
  });

  it('falls back to cs when lang is invalid', () => {
    expect(aiEvalT('ai_eval.title', 'xx' as any)).toBe('AI hodnocení');
  });

  it('all cs keys have en counterparts', () => {
    const csKeys = [
      'ai_eval.title',
      'ai_eval.fakta_heading',
      'ai_eval.lidsky_heading',
      'ai_eval.last_run',
      'ai_eval.unavailable',
      'ai_eval.ledger_toggle',
      'ai_eval.ledger_hide',
    ];
    for (const key of csKeys) {
      const csVal = aiEvalT(key, 'cs');
      const enVal = aiEvalT(key, 'en');
      expect(csVal).toBeTruthy();
      expect(enVal).toBeTruthy();
      expect(csVal).not.toBe(key);
      expect(enVal).not.toBe(key);
    }
  });
});

describe('EMPTY_AI_EVAL defaults', () => {
  it('has all fields null/false', () => {
    expect(EMPTY_AI_EVAL.available).toBe(false);
    expect(EMPTY_AI_EVAL.reportFakta).toBeNull();
    expect(EMPTY_AI_EVAL.reportLidsky).toBeNull();
    expect(EMPTY_AI_EVAL.ledger).toBeNull();
    expect(EMPTY_AI_EVAL.lastRun).toBeNull();
    expect(EMPTY_AI_EVAL.entityId).toBeNull();
  });
});

type TileEl = OigAiEvalTile & { updateComplete: Promise<boolean> };

async function flush(el: TileEl): Promise<void> {
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
}

const POPULATED_DATA: AiEvalData = {
  available: true,
  status: 'attention',
  reportFakta: 'Fakta report content',
  reportLidsky: 'Lidský text here',
  ledger: '10:00 - event A',
  lastRun: '2026-08-01T10:00:00Z',
  entityId: 'sensor.oig_testbox01_ai_eval',
  report: null,
  generatedAt: null,
};

describe('oig-ai-eval-tile component', () => {
  it('renders FAKTA and LIDSKY sections when data is populated', async () => {
    const el = await fixture<TileEl>(html`<oig-ai-eval-tile .data=${POPULATED_DATA}></oig-ai-eval-tile>`);
    await flush(el);

    const headings = Array.from(el.shadowRoot!.querySelectorAll('.ai-eval-section-heading')).map(
      (h) => h.textContent?.trim()
    );
    expect(headings).toContain('Fakta');
    expect(headings).toContain('Lidský');

    const contents = Array.from(el.shadowRoot!.querySelectorAll('.ai-eval-content')).map(
      (c) => c.textContent?.trim()
    );
    expect(contents).toContain('Fakta report content');
    expect(contents).toContain('Lidský text here');
  });

  it('renders neutral unavailable state when sensor is absent (available:false), no throw', async () => {
    const el = await fixture<TileEl>(html`<oig-ai-eval-tile .data=${EMPTY_AI_EVAL}></oig-ai-eval-tile>`);
    await flush(el);

    const unavailable = el.shadowRoot!.querySelector('.ai-eval-unavailable');
    expect(unavailable).toBeTruthy();
    expect(unavailable!.textContent).toContain('není k dispozici');

    const sections = el.shadowRoot!.querySelectorAll('.ai-eval-section');
    expect(sections.length).toBe(0);
  });

  it('renders unavailable state with default data prop (no explicit data set)', async () => {
    const el = await fixture<TileEl>(html`<oig-ai-eval-tile></oig-ai-eval-tile>`);
    await flush(el);

    const unavailable = el.shadowRoot!.querySelector('.ai-eval-unavailable');
    expect(unavailable).toBeTruthy();
  });
});


const REPORT = {
  situace: 'Baterie 83 %, zítra FVE 18 kWh a poledne 0,80 Kč.',
  rizika: [{ kdy: 'dnes 16:00–22:00', co: 'ČHMÚ: silné bouřky', proc: 'drž rezervu nad 50 %' }],
  doporuceni: [
    { kdy: 'zítra 11:00–14:00', akce: 'Ohřej bojler ze slunce', duvod: 'FVE 7,5 kWh, nákup 0,80 Kč',
      prinos_kc: 85, priorita: 'vysoka' },
    { kdy: 'dnes 21:00', akce: 'Pusť myčku', duvod: 'NT a 9 Kč místo 13 Kč', prinos_kc: null,
      priorita: 'nizka' },
  ],
  anomalie: [],
};

describe('structured advice', () => {
  it('extracts a valid report object and the generation time', () => {
    const data = extractAiEvalData(mkEntity({
      report: REPORT, status: 'attention', report_generated_at: '2026-11-05T13:00:00+00:00',
      report_lidsky: 'legacy', last_run: '2026-11-05T14:00:00+00:00',
    }), BOX);
    expect(data.report?.situace).toContain('Baterie 83 %');
    expect(data.report?.doporuceni).toHaveLength(2);
    expect(data.generatedAt).toBe('2026-11-05T13:00:00+00:00');
    expect(data.status).toBe('attention');
  });

  it('marks a calm advice run as advice, not as an alarm', () => {
    const calm = { ...REPORT, rizika: [], doporuceni: [REPORT.doporuceni[1]] };
    const data = extractAiEvalData(mkEntity({ report: calm, status: 'advice' }), BOX);
    expect(data.status).toBe('advice');
  });

  it('drops a malformed report instead of crashing', () => {
    const data = extractAiEvalData(mkEntity({
      report: { rizika: 'nope' }, report_lidsky: 'text',
    }), BOX);
    expect(data.report).toBeNull();
    expect(data.reportLidsky).toBe('text');
  });

  it('keeps only well-formed list items', () => {
    const data = extractAiEvalData(mkEntity({
      report: { ...REPORT, doporuceni: [REPORT.doporuceni[0], 'junk', { akce: 'bez času' }] },
    }), BOX);
    expect(data.report?.doporuceni).toHaveLength(1);
  });

  it('renders situation, risks and timed recommendations', async () => {
    const data: AiEvalData = { ...POPULATED_DATA, report: REPORT as any, generatedAt: '2026-11-05T13:00:00Z' };
    const el = await fixture<TileEl>(html`<oig-ai-eval-tile .data=${data}></oig-ai-eval-tile>`);
    await flush(el);
    const root = el.shadowRoot!;
    expect(root.querySelector('.ai-situation')!.textContent).toContain('Baterie 83 %');
    const risk = root.querySelector('.ai-risk')!;
    expect(risk.textContent).toContain('dnes 16:00–22:00');
    expect(risk.textContent).toContain('ČHMÚ: silné bouřky');
    const actions = Array.from(root.querySelectorAll('.ai-action'));
    expect(actions).toHaveLength(2);
    expect(actions[0].querySelector('.ai-when')!.textContent).toContain('zítra 11:00–14:00');
    expect(actions[0].textContent).toContain('Ohřej bojler ze slunce');
    expect(actions[0].textContent).toContain('85 Kč');
    expect(actions[0].classList.contains('prio-vysoka')).toBe(true);
    expect(actions[1].textContent).not.toContain('Kč)');
    // the legacy text sections are not repeated when the structure is present
    const headings = Array.from(root.querySelectorAll('.ai-eval-section-heading')).map((h) => h.textContent?.trim());
    expect(headings).not.toContain('Fakta');
    expect(headings).not.toContain('Lidský');
    expect(root.querySelector('.ai-eval-ok')).toBeNull();
  });

  it('shows an explicit line when there is nothing worth doing', async () => {
    const data: AiEvalData = { ...POPULATED_DATA, status: 'advice',
      report: { ...REPORT, rizika: [], doporuceni: [] } as any };
    const el = await fixture<TileEl>(html`<oig-ai-eval-tile .data=${data}></oig-ai-eval-tile>`);
    await flush(el);
    expect(el.shadowRoot!.querySelector('.ai-no-actions')).toBeTruthy();
  });
});


describe('refresh button', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('posts a refresh for this box and shows progress until a new report lands', async () => {
    const spy = vi.spyOn(haClient, 'fetchOIGAPITyped').mockResolvedValue({ ok: true, status: 202, data: { ok: true } } as any);
    const data: AiEvalData = { ...POPULATED_DATA, report: REPORT as any, generatedAt: '2026-11-05T13:00:00Z' };
    const el = await fixture<TileEl>(html`<oig-ai-eval-tile .data=${data}></oig-ai-eval-tile>`);
    await flush(el);
    const btn = el.shadowRoot!.querySelector('[data-testid="ai-refresh"]') as HTMLButtonElement;
    btn.click();
    await flush(el);
    expect(spy).toHaveBeenCalledWith('/testbox01/ai/eval/refresh', { method: 'POST' });
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Počítám');

    el.data = { ...data, generatedAt: '2026-11-05T14:00:00Z' };
    await flush(el);
    const after = el.shadowRoot!.querySelector('[data-testid="ai-refresh"]') as HTMLButtonElement;
    expect(after.disabled).toBe(false);
    expect(after.textContent).toContain('Obnovit');
  });

  it('says so when the refresh is rate limited', async () => {
    vi.spyOn(haClient, 'fetchOIGAPITyped').mockResolvedValue({ ok: false, status: 429, code: 'rate_limited', error: 'x' } as any);
    const data: AiEvalData = { ...POPULATED_DATA, report: REPORT as any };
    const el = await fixture<TileEl>(html`<oig-ai-eval-tile .data=${data}></oig-ai-eval-tile>`);
    await flush(el);
    (el.shadowRoot!.querySelector('[data-testid="ai-refresh"]') as HTMLButtonElement).click();
    await flush(el);
    expect(el.shadowRoot!.querySelector('[data-testid="ai-refresh-note"]')!.textContent).toContain('5 minut');
  });

  it('is not offered when the sensor is unavailable', async () => {
    const el = await fixture<TileEl>(html`<oig-ai-eval-tile .data=${EMPTY_AI_EVAL}></oig-ai-eval-tile>`);
    await flush(el);
    expect(el.shadowRoot!.querySelector('[data-testid="ai-refresh"]')).toBeNull();
  });
});
