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
    'ai_eval.ledger_toggle': 'Zobrazit protokol',
    'ai_eval.ledger_hide': 'Skrýt protokol',
  },
  en: {
    'ai_eval.title': 'AI Evaluation',
    'ai_eval.fakta_heading': 'Facts',
    'ai_eval.lidsky_heading': 'Plain language',
    'ai_eval.last_run': 'Last run',
    'ai_eval.unavailable': 'AI evaluation unavailable',
    'ai_eval.ledger_toggle': 'Show ledger',
    'ai_eval.ledger_hide': 'Hide ledger',
  },
};

export type AiEvalKey = keyof typeof STRINGS['cs'];

export function aiEvalT(key: AiEvalKey | string, lang: AiEvalLang): string {
  const table = STRINGS[lang] ?? STRINGS.cs;
  if (key in table) return table[key as AiEvalKey];
  if (key in STRINGS.cs) return STRINGS.cs[key as AiEvalKey];
  return key as string;
}
