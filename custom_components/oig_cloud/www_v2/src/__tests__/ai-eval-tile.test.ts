import { describe, it, expect } from 'vitest';
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
