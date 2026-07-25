/**
 * OIG Cloud V2 — Onboarding wizard string catalog (F1 Plan 3.6 Task 12).
 *
 * Routes the classified-error, stale/retry, and Finish-retry copy Tasks
 * 6/7/8/9 embedded as literal Czech strings in `onboarding/index.ts`
 * through a lookup — mirrors the `field.<key>.label` catalog pattern
 * (`i18n/fields.ts`) and the cs/en table shape of `i18n/boiler.ts`.
 *
 * The wizard resolves its language from `hass` via `resolveLang` (re-exported
 * here from `i18n/boiler.ts` so callers only need one import) and passes it
 * to every `t(key, lang)` call. Callers that omit `lang` still get `'cs'`.
 */
import { resolveLang, type Lang } from './boiler';
export { resolveLang };
export type { Lang };

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

    'onboarding.banner.title': 'Průvodce nastavením je připraven',
    'onboarding.banner.body': 'Nastavení můžete doplnit teď nebo se k němu kdykoli vrátit později.',
    'onboarding.banner.launch': 'Spustit průvodce',
    'onboarding.banner.close_label': 'Skrýt průvodce nastavením',
    'onboarding.banner.grandfathered_title': 'Zkontrolujte svou stávající konfiguraci',
    'onboarding.banner.grandfathered_body': 'Váš box je už nastavený. Průvodcem můžete kdykoli projít a zkontrolovat svou stávající konfiguraci — nic se tím neztratí.',
    'onboarding.banner.grandfathered_close_label': 'Skrýt tuto nabídku',
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

    'onboarding.banner.title': 'Setup wizard is ready',
    'onboarding.banner.body': 'You can finish setup now or come back to it anytime.',
    'onboarding.banner.launch': 'Launch wizard',
    'onboarding.banner.close_label': 'Hide setup wizard',
    'onboarding.banner.grandfathered_title': 'Review your existing configuration',
    'onboarding.banner.grandfathered_body': 'Your box is already set up. You can walk through the wizard anytime to review your existing configuration — nothing will be lost.',
    'onboarding.banner.grandfathered_close_label': 'Hide this prompt',
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
