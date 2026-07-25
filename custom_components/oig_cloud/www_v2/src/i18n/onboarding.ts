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

    // Audit gap O2/P10 (DECISIONS.md) — per-provider data-use disclosure, shown
    // before the user enters a key. Derive edits strictly from O2/P10 text.
    'onboarding.ai.disclosure.ai_task': 'Zpracování probíhá u AI, kterou už máte nastavenou v Home Assistantu — nezavádíme žádnou novou třetí stranu.',
    'onboarding.ai.disclosure.groq': 'Dle smluvních podmínek Groq NETRÉNUJE na vstupech. Naše integrace posílá výhradně anonymní číselné hodnoty, žádné osobní údaje.',
    'onboarding.ai.disclosure.nvidia': 'Free tier NVIDIA je dle ToS „trial/evaluation, ne produkce" — trvalé použití je šedá zóna. Dle §3.3 smí NVIDIA deidentifikovaně používat vstupy ke zlepšování modelů; osobní údaje v promptech jsou zakázané. Naše integrace posílá výhradně anonymní číselné hodnoty.',

    // F1 Wizard v2 Stage S1 Task 5 — welcome (step 0) / summary (step 9),
    // spec-verbatim copy (UX-SPEC-wizard-v2.md §Step 0 / §Step 9).
    'onboarding.welcome.new_install': 'Vítejte v průvodci nastavením OIG Cloud. Projdeme spolu pár kroků — solární předpověď, ceny energie, volitelně AI a bojler. Nic nemusíte vyplnit najednou, průvodce si pamatuje, kde jste skončili.',
    'onboarding.welcome.review': 'Váš stávající nastavení zůstává beze změny, dokud ho výslovně nepotvrdíte. V každém kroku uvidíte svou aktuální hodnotu a můžete ji ověřit nebo upravit — nic se nesmaže, dokud nedáte Uložit.',
    'onboarding.summary.new_install_heading': 'Shrnutí nastavení — zkontrolujte prosím před uložením:',

    // F1 Wizard v2 Stage S2 Task 9 — review-mode diff table (UX-SPEC §3).
    'onboarding.summary.confirm_notice': 'Toto se změní. Dokud nekliknete na Uložit, nic se neuloží.',
    'onboarding.summary.diff_empty': 'Žádné změny oproti stávajícímu nastavení.',

    // F1 Wizard v2 Stage S2 Task 11 — recovered pricing_supplier note +
    // module-off-in-review-mode warning (UX-SPEC §3, spec-verbatim CZ).
    'onboarding.pricing_supplier.recovered_note': 'Tyto hodnoty jsme našli ve vašem stávajícím nastavení — dosud nebyly v průvodci vidět, teď je můžete zkontrolovat.',
    'onboarding.modules.off_warning': 'Vypnutím modulu se jeho nastavení skryje, ale zůstane uloženo — pokud modul znovu zapnete, hodnoty budou stále tady.',

    // F1 Wizard v2 Stage S4 Task 22 — AI step R5 "K čemu je tu AI" intro
    // block, spec-verbatim CZ copy (UX-SPEC-wizard-v2.md §5). CZ-only: this
    // copy ships in Czech per spec, no EN source text given.
    'onboarding.ai.intro_heading': '🤖 K čemu je tu AI',
    'onboarding.ai.intro_body': 'Když nastavíte AI, vaše instalace (OIG Cloud) získá vlastní „AI Task" entitu přímo ve vaší Home Assistant instanci. To znamená, že si ve svých automatizacích a skriptech můžete nechat od AI vygenerovat strukturovanou odpověď — založenou na pár anonymních číslech z vaší instalace (výkon a orientace panelů, kapacita a nastavení baterie), nikdy na vaší poloze, jménu nebo e-mailu. Tahle čísla nikam neodejdou bez vašeho souhlasu — a pokud zvolíte „moje vlastní AI v Home Assistantu", neodejdou vůbec, protože se použije AI, kterou už máte nastavenou u sebe doma.',
    'onboarding.ai.intro_why_it_matters': 'Nejde o žádnou skrytou magii navíc — je to stejná AI Task funkce, kterou Home Assistant nabízí pro cokoliv jiného, jen předpřipravená s čísly z vaší FVE a baterie, abyste je nemuseli do každé automatizace přepisovat ručně.',
    'onboarding.ai.intro_optionality': 'AI je volitelná — dashboard i všechny výpočty (predikce baterie, ceny, bojler) fungují úplně stejně bez ní. Nic se kvůli vynechání tohoto kroku nezhorší.',

    // Stage S3 Task 21 — Modules step group headers (UX-SPEC §Step 1, spec-verbatim CZ).
    'onboarding.modules.group_hlavni': 'Hlavní moduly',
    'onboarding.modules.group_doplnkove': 'Doplňkové',
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

    'onboarding.ai.disclosure.ai_task': 'Processing stays with whichever AI backend you already configured in Home Assistant — we don’t introduce any new third party.',
    'onboarding.ai.disclosure.groq': 'Per its terms of service, Groq contractually does not train on your inputs. Our integration sends only anonymous numeric values — no personal data.',
    'onboarding.ai.disclosure.nvidia': 'NVIDIA’s free tier is, per its ToS, "trial/evaluation, not production" — permanent use is a gray area. Under §3.3, NVIDIA may use deidentified inputs to improve its models; personal data in prompts is prohibited. Our integration sends only anonymous numeric values.',

    'onboarding.welcome.new_install': 'Welcome to the OIG Cloud setup wizard. We\'ll walk through a few steps together — solar forecast, energy prices, optionally AI and boiler. You don\'t need to fill everything in one go, the wizard remembers where you left off.',
    'onboarding.welcome.review': 'Your existing setup stays unchanged until you explicitly confirm it. On every step you\'ll see your current value and can verify or edit it — nothing is deleted until you click Save.',
    'onboarding.summary.new_install_heading': 'Setup summary — please review before saving:',

    'onboarding.summary.confirm_notice': 'This will change. Nothing is saved until you click Save.',
    'onboarding.summary.diff_empty': 'No changes from your existing configuration.',

    'onboarding.pricing_supplier.recovered_note': 'We found these values in your existing configuration — they weren\'t visible in the wizard until now, so you can review them.',
    'onboarding.modules.off_warning': 'Turning off a module hides its settings, but they stay saved — if you turn the module back on, the values will still be there.',

    'onboarding.modules.group_hlavni': 'Main modules',
    'onboarding.modules.group_doplnkove': 'Additional',
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
