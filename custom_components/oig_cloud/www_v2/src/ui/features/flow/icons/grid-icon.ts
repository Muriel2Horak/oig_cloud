/**
 * Grid Icon — sinusoida znázorňující tok ze/do sítě
 *
 * Design:
 * - Idle: statická tenká sinusoida, šedá
 * - Import (gridPower > 0): vlnka animovaná zleva doprava, modrá, šipka ↓
 * - Export (gridPower < 0): vlnka zprava doleva, zelená, šipka ↑
 *
 * Animace: stroke-dashoffset pohyb — čistý, průmyslový look.
 * Bez blikání, bez efektů navíc.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('oig-grid-icon')
export class OigGridIcon extends LitElement {
  @property({ type: Number }) power = 0;   // kladné = import, záporné = export

  static styles = css`
    :host { display: inline-block; width: 48px; height: 48px; }
    svg { width: 100%; height: 100%; overflow: visible; }

    .sine {
      fill: none;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: stroke 0.6s ease;
    }
    .sine.idle {
      stroke: #607d8b;
      opacity: 0.5;
    }
    .sine.importing {
      stroke: #42a5f5;
      stroke-dasharray: 60;
      animation: flow-right 1s linear infinite;
    }
    .sine.exporting {
      stroke: #66bb6a;
      stroke-dasharray: 60;
      animation: flow-left 1s linear infinite;
    }

    .arrow {
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
      transition: stroke 0.6s ease, opacity 0.4s ease;
    }
    .arrow.import { stroke: #42a5f5; }
    .arrow.export { stroke: #66bb6a; }
    .arrow.hidden { opacity: 0; }

    /* Vertikální stožáry přenosové soustavy — ikonický motiv */
    .pylon {
      stroke: var(--primary-text-color, #90a4ae);
      stroke-width: 1.2;
      fill: none;
      opacity: 0.35;
    }

    @keyframes flow-right {
      from { stroke-dashoffset: 60; }
      to   { stroke-dashoffset: 0; }
    }
    @keyframes flow-left {
      from { stroke-dashoffset: 0; }
      to   { stroke-dashoffset: 60; }
    }
  `;

  private get mode(): 'idle' | 'importing' | 'exporting' {
    if (this.power > 50) return 'importing';
    if (this.power < -50) return 'exporting';
    return 'idle';
  }

  render() {
    const mode = this.mode;

    // SVG sinusoida jako path přes celou šířku (viewBox 0 0 48 48)
    // Středová osa y=28, amplituda=8
    const sinePath = `M 2,28 C 8,28 8,16 14,20 C 20,24 20,32 26,32 C 32,32 32,20 38,20 C 44,20 44,28 46,28`;

    // Šipka dolů (import) nebo nahoru (export)
    const showArrow = mode !== 'idle';
    const arrowDown = `M 24,10 L 24,4 M 24,4 L 20,8 M 24,4 L 28,8`;
    const arrowUp   = `M 24,4 L 24,10 M 24,10 L 20,6 M 24,10 L 28,6`;

    return html`
      <svg viewBox="0 0 48 48">
        <!-- Dva malé stožáry v pozadí — ikona sítě -->
        <line class="pylon" x1="8" y1="44" x2="8" y2="14"/>
        <line class="pylon" x1="4" y1="18" x2="12" y2="18"/>
        <line class="pylon" x1="5" y1="22" x2="11" y2="22"/>

        <line class="pylon" x1="40" y1="44" x2="40" y2="14"/>
        <line class="pylon" x1="36" y1="18" x2="44" y2="18"/>
        <line class="pylon" x1="37" y1="22" x2="43" y2="22"/>

        <!-- Dráty -->
        <line class="pylon" x1="8" y1="18" x2="40" y2="18" opacity="0.2"/>
        <line class="pylon" x1="8" y1="22" x2="40" y2="22" opacity="0.2"/>

        <!-- Sinusoida -->
        <path class="sine ${mode}" d="${sinePath}"/>

        <!-- Šipka směru -->
        ${showArrow ? html`
          <path
            class="arrow ${mode === 'importing' ? 'import' : 'export'}"
            d="${mode === 'importing' ? arrowDown : arrowUp}"
          />
        ` : ''}
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'oig-grid-icon': OigGridIcon; }
}
