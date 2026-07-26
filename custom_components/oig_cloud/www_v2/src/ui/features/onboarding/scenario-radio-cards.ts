/**
 * OIG Cloud V2 — scenario radio-card picker (supplier-step redesign).
 *
 * UX-SPEC-wizard-v2.md §step-5 is SUPERSEDED here (owner walkthrough: the
 * combined supplier step was "too dense", scenario enums leaked technical
 * values). Replaces the native `<select>` `spot_pricing_model`/
 * `export_pricing_model` control with 3 large selectable cards — human
 * names + a one-line explanation, never a raw enum value. No existing
 * "radio card" primitive exists anywhere under `ui/` (verified) — this is
 * new UI, reused by both the Nakup (`step-pricing-supplier.ts`) and Prodej
 * (`step-pricing-supplier-sell.ts`) steps rather than duplicated.
 */

import { html, css } from 'lit';
import type { TemplateResult } from 'lit';

export interface ScenarioCard {
  value: string;
  title: string;
  hint: string;
}

/**
 * Renders one radio-card per `cards` entry. `selected` is the current enum
 * value (possibly `undefined` before the user has chosen anything — no card
 * is marked selected, and progressive disclosure of the scenario's own
 * fields is the caller's job, driven by the same `selected` value).
 */
export function renderScenarioCards(
  cards: readonly ScenarioCard[],
  selected: string | undefined,
  onSelect: (value: string) => void,
  testidGroup: string,
): TemplateResult {
  return html`
    <div class="scenario-cards" data-testid=${testidGroup} role="radiogroup">
      ${cards.map((card) => html`
        <button
          type="button"
          class="scenario-card ${selected === card.value ? 'selected' : ''}"
          data-scenario-card=${card.value}
          role="radio"
          aria-checked=${selected === card.value}
          @click=${() => onSelect(card.value)}
        >
          <span class="scenario-card-title">${card.title}</span>
          <span class="scenario-card-hint">${card.hint}</span>
        </button>
      `)}
    </div>
  `;
}

export const scenarioCardStyles = css`
  .scenario-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 10px;
  }

  .scenario-card {
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: flex-start;
    text-align: left;
    padding: 10px 14px;
    border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.14));
    border-radius: 10px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .scenario-card:hover { border-color: var(--primary-color, #4f7cff); }

  .scenario-card.selected {
    border-color: var(--primary-color, #4f7cff);
    background: rgba(79, 124, 255, 0.1);
  }

  .scenario-card-title { font-weight: 700; font-size: 13px; }

  .scenario-card-hint { font-size: 11px; opacity: 0.75; }
`;
