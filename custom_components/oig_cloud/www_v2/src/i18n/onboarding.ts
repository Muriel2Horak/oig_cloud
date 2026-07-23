/**
 * OIG Cloud V2 — Onboarding wizard string catalog (F1 Plan 3.6 Task 12).
 *
 * Routes the classified-error, stale/retry, and Finish-retry copy Tasks
 * 6/7/8/9 embedded as literal Czech strings in `onboarding/index.ts`
 * through a lookup — mirrors the `field.<key>.label` catalog pattern
 * (`i18n/fields.ts`) and the cs/en table shape of `i18n/boiler.ts`.
 *
 * The wizard does not receive `hass` yet, so callers default to `lang: 'cs'`
 * (unchanged rendered output) — the `en` table exists so wiring a real
 * `hass.locale` through later is a `t(key, lang)` call, not a re-write.
 */
import type { Lang } from './boiler';

const STRINGS: Record<Lang, Record<string, string>> = {
  cs: {
    'onboarding.solar_test.error.timeout': 'Test vypršel — zkuste to znovu.',
    'onboarding.solar_test.error.auth': 'Neplatný přístupový klíč.',
    'onboarding.solar_test.error.provider_unreachable': 'Poskytovatel je nedostupný.',
    'onboarding.solar_test.error.rate_limited': 'Příliš mnoho pokusů — zkuste to za chvíli.',
    'onboarding.solar_test.error.invalid_response': 'Neočekávaná odpověď poskytovatele.',
    'onboarding.solar_test.error.aborted': 'Test byl přerušen.',
    'onboarding.solar_test.error.generic': 'Test selhal.',

    'onboarding.bootstrap.load_failed': 'Načtení dat selhalo.',
    'onboarding.bootstrap.state_load_failed': 'Stav průvodce se nepodařilo načíst.',
    'onboarding.bootstrap.retry_button': 'Zkusit znovu',

    'onboarding.pricing.save_error': 'Uložení se nezdařilo.',
    'onboarding.pricing.stale_warning': 'Ceny jsou z předchozího roku.',

    'onboarding.finish.error.in_progress': 'Dokončení už probíhá.',
    'onboarding.finish.error.save_failed': 'Dokončení se nepodařilo uložit.',
    'onboarding.finish.error.generic': 'Dokončení se nepodařilo.',
  },
  en: {
    'onboarding.solar_test.error.timeout': 'Test timed out — try again.',
    'onboarding.solar_test.error.auth': 'Invalid access key.',
    'onboarding.solar_test.error.provider_unreachable': 'Provider is unreachable.',
    'onboarding.solar_test.error.rate_limited': 'Too many attempts — try again shortly.',
    'onboarding.solar_test.error.invalid_response': 'Unexpected response from provider.',
    'onboarding.solar_test.error.aborted': 'Test was aborted.',
    'onboarding.solar_test.error.generic': 'Test failed.',

    'onboarding.bootstrap.load_failed': 'Failed to load data.',
    'onboarding.bootstrap.state_load_failed': 'Failed to load wizard state.',
    'onboarding.bootstrap.retry_button': 'Try again',

    'onboarding.pricing.save_error': 'Save failed.',
    'onboarding.pricing.stale_warning': 'Prices are from a previous year.',

    'onboarding.finish.error.in_progress': 'Finish is already in progress.',
    'onboarding.finish.error.save_failed': 'Failed to save on finish.',
    'onboarding.finish.error.generic': 'Finish failed.',
  },
};

export type OnboardingKey = keyof typeof STRINGS['cs'];

/** Falls back to the Czech table, then to the raw key — never throws on a miss. */
export function t(key: OnboardingKey, lang: Lang = 'cs'): string {
  const table = STRINGS[lang] ?? STRINGS.cs;
  if (key in table) return table[key];
  if (key in STRINGS.cs) return STRINGS.cs[key];
  return key;
}
