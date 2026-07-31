import { fieldsFromRegistry, isVisible } from '@/data/registry-data';
import type { FieldRegistry } from '@/data/registry-data';
import type { FieldDef } from '@/ui/features/settings';

/** The shape every wizard step shares. STEP_AI (step-ai.ts) is the same contract. */
export interface WizardStep {
  id: string;
  /** #6: NO step may gate the dashboard. Pinned to false, asserted in tests. */
  blocksDashboard: false;
  /** #5/#6: every step may be skipped. */
  skippable: boolean;
}

export interface RegistryStep extends WizardStep {
  section: string;
  fields(reg: FieldRegistry): FieldDef[];
  visibleFields(reg: FieldRegistry, values: Record<string, unknown>): FieldDef[];
}

export const STEP_SOLAR: RegistryStep = {
  id: 'solar',
  section: 'solar',
  blocksDashboard: false,   // [Otestovat] gates the STEP, never the dashboard (#6)
  skippable: true,
  // P5: the SAME derivation the settings tab uses (Tasks 3-4). Not a copy.
  fields: (reg) => fieldsFromRegistry(reg, 'solar'),
  // U1: the SAME predicate as the settings card. Not a second implementation.
  visibleFields: (reg, values) =>
    fieldsFromRegistry(reg, 'solar').filter((f) => isVisible(f, (k) => values[k])),
};

/**
 * Live-walk defect 3 — solar step had no acquisition guide, unlike the AI
 * step's `PROVIDER_GUIDES` (step-ai.ts:37+). URLs verified live (WebFetch,
 * 2026-07-26): forecast.solar's key is a paid-subscription perk (PayPal
 * checkout, config_registry.py:326-327 `optional=True` — the free/public
 * tier needs no key at all, only `daily_optimized` mode does not need one);
 * Solcast requires a Toolkit account for both the API key and the Site ID,
 * both live in the same dashboard.
 */
export interface SolarProviderGuide {
  label: string;
  registerUrl: string;
  keysUrl?: string;
  /** Why a key, and how to get it (or: why none is needed). */
  steps: string[];
  /** Solcast only — `solcast_site_id` is a second required field with no
   *  forecast.solar equivalent, so it gets its own numbered steps. */
  siteIdSteps?: string[];
}

export const SOLAR_PROVIDER_GUIDES: Record<string, SolarProviderGuide> = {
  forecast_solar: {
    label: 'Forecast.Solar',
    registerUrl: 'https://forecast.solar/en/pricing.html',
    keysUrl: 'https://account.forecast.solar',
    steps: [
      'Zdarma funguje i bez klíče — ale jen v režimu "Denně, optimalizovaně". Klíč je potřeba jen pro rychlejší aktualizace (každou hodinu / každé 4 hodiny).',
      'Otevři forecast.solar/en/pricing.html a vyber si placený tarif (Personal apod.) — platba probíhá přes PayPal.',
      'Po zaplacení přijdou na tvůj PayPal e-mail dva e-maily: jeden od PayPal, druhý od Forecast.Solar s API klíčem.',
      'Klíč kdykoliv najdeš nebo obnovíš na account.forecast.solar (přihlášení přes PayPal subscription ID + e-mail).',
    ],
  },
  solcast: {
    label: 'Solcast',
    registerUrl: 'https://toolkit.solcast.com.au',
    keysUrl: 'https://toolkit.solcast.com.au',
    steps: [
      'Solcast vyžaduje bezplatnou registraci — API klíč i Site ID najdete ve svém Toolkit účtu.',
      'Otevřete toolkit.solcast.com.au a zaregistrujte se (e-mail).',
      'API klíč najdete v nastavení účtu (API Key) — zkopírujte ho do pole níže.',
    ],
    siteIdSteps: [
      'V Toolkitu přidejte svou střechu jako Rooftop Site (adresa, výkon a orientace panelů).',
      'Otevřete vytvořenou instalaci — v jejím detailu (případně v adrese URL) najdete Site ID.',
      'Zkopírujte Site ID do pole níže — je to jiná hodnota než API klíč, potřebujete obě.',
    ],
  },
};
