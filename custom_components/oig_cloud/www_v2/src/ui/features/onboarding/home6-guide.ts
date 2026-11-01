/**
 * OIG Cloud V2 — how Home 5 and 6 work, and the Home 6 window the box reports.
 *
 * The window can only be set on the box display: the OIG portal refuses writes to
 * box_prm2.hgvi_s/e. Only the local proxy reports it, so without one no value shows.
 */

import { LitElement, css, html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { haClient } from '@/data/ha-client';

const WINDOW_START_SUFFIX = '_tbl_box_prm2_hgvi_s';
const WINDOW_END_SUFFIX = '_tbl_box_prm2_hgvi_e';

/** Minutes since midnight, the unit the box uses for its boiler and HDO times. */
function formatMinutes(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** The window as text, or `null` when the box does not report it. */
export function describeHome6Window(states: Record<string, { state: string }>): string | null {
  const read = (suffix: string): number | null => {
    const id = Object.keys(states).find((key) => key.endsWith(suffix));
    const value = id ? Number(states[id].state) : NaN;
    return Number.isFinite(value) ? value : null;
  };
  const start = read(WINDOW_START_SUFFIX);
  const end = read(WINDOW_END_SUFFIX);
  if (start === null || end === null) return null;
  if (start === end) return 'Pásmo není nastavené, box se v Home 6 chová jako v Home 1.';
  return `Pásmo na boxu: ${formatMinutes(start)}–${formatMinutes(end)}.`;
}

@customElement('oig-home6-guide')
export class OigHome6Guide extends LitElement {
  static styles = css`
    :host { display: block; font-size: 13px; line-height: 1.5; }
    p { margin: 0 0 8px; }
    .warning { color: var(--warning-color, #ffb74d); }
    .value { font-weight: 600; }
  `;

  render() {
    const windowText = describeHome6Window(haClient.getHassSync()?.states ?? {});
    return html`
      <p>Home 5 žádné časy nepotřebuje.</p>
      <p>
        Pásmo Home 6 se nastavuje přímo na displeji boxu: Uživatelské nastavení → Expertní
        nastavení → Home Grid VI Vypnutí/Zapnutí. Přes OIG Cloud ho nastavit nejde.
      </p>
      <p class="warning">
        V pásmu se vypne záložní výstup, FVE nevyrábí a zátěž jede ze sítě. Při výpadku sítě
        v té době nefunguje záloha.
      </p>
      ${windowText
        ? html`<p class="value" data-testid="home6-value">${windowText}</p>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-home6-guide': OigHome6Guide;
  }
}
