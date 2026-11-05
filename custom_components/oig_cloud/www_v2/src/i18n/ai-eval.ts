export type AiEvalLang = 'cs' | 'en';

export function resolveAiEvalLang(hass: any): AiEvalLang {
  const raw = (hass?.locale?.language ?? hass?.language ?? 'cs') as string;
  return /^en/i.test(raw) ? 'en' : 'cs';
}

const STRINGS: Record<AiEvalLang, Record<string, string>> = {
  cs: {
    'ai_eval.title': 'AI hodnocení',
    'ai_eval.fakta_heading': 'Fakta',
    'ai_eval.lidsky_heading': 'Lidský',
    'ai_eval.last_run': 'Poslední běh',
    'ai_eval.unavailable': 'AI hodnocení není k dispozici',
    'ai_eval.all_ok': 'Vše v normě — nic k řešení.',
    'ai_eval.ledger_toggle': 'Zobrazit protokol',
    'ai_eval.ledger_hide': 'Skrýt protokol',
    'ai_eval.risks_heading': 'Rizika',
    'ai_eval.actions_heading': 'Co udělat',
    'ai_eval.anomalies_heading': 'Co se stalo',
    'ai_eval.no_actions': 'Teď není co měnit, plán to zvládá sám.',
  },
  en: {
    'ai_eval.title': 'AI Evaluation',
    'ai_eval.all_ok': 'All normal — nothing to act on.',
    'ai_eval.fakta_heading': 'Facts',
    'ai_eval.lidsky_heading': 'Plain language',
    'ai_eval.last_run': 'Last run',
    'ai_eval.unavailable': 'AI evaluation unavailable',
    'ai_eval.ledger_toggle': 'Show ledger',
    'ai_eval.ledger_hide': 'Hide ledger',
    'ai_eval.risks_heading': 'Risks',
    'ai_eval.actions_heading': 'What to do',
    'ai_eval.anomalies_heading': 'What happened',
    'ai_eval.no_actions': 'Nothing to change right now, the plan handles it.',
  },
};

export type AiEvalKey = keyof typeof STRINGS['cs'];

export function aiEvalT(key: AiEvalKey | string, lang: AiEvalLang): string {
  const table = STRINGS[lang] ?? STRINGS.cs;
  if (key in table) return table[key as AiEvalKey];
  if (key in STRINGS.cs) return STRINGS.cs[key as AiEvalKey];
  return key as string;
}
