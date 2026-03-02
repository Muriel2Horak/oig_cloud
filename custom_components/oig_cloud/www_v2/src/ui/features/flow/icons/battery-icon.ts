/**
 * Battery Icon — kompaktní vertikální baterie
 *
 * Design:
 * - Tenký obrys baterie, hladina výplně odpovídá SoC
 * - Barva výplně: zelená (>50%) → oranžová (20-50%) → červená (<20%)
 * - Nabíjení (solar): pohyblivý animovaný pruh zezdola nahoru
 * - Síťové nabíjení: jiná barva pruhu (modrá)
 * - SoC text uvnitř (jen pokud > 30%)
 * - Bez zbytečných efektů
 */

import { LitElement, html, css, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('oig-battery-icon')
export class OigBatteryIcon extends LitElement {
  @property({ type: Number }) soc = 0;           // 0-100
  @property({ type: Boolean }) charging = false;
  @property({ type: Boolean }) gridCharging = false;
  @property({ type: Boolean }) discharging = false;

  private readonly _clipId = `batt-clip-${Math.random().toString(36).slice(2)}`;

  static styles = css`
    :host { display: inline-block; width: 32px; height: 52px; }
    svg { width: 100%; height: 100%; overflow: visible; }

    .outline {
      fill: none;
      stroke: var(--primary-text-color, #cfd8dc);
      stroke-width: 2;
      opacity: 0.7;
    }
    .terminal {
      fill: var(--primary-text-color, #cfd8dc);
      opacity: 0.7;
    }
    .fill-bar {
      transition: height 0.8s ease, y 0.8s ease, fill 0.8s ease;
    }
    .charge-stripe {
      opacity: 0;
    }
    .charge-stripe.active {
      opacity: 1;
      animation: stripe-move 1.2s linear infinite;
    }
    .soc-text {
      font-size: 8px;
      font-weight: 700;
      fill: rgba(255,255,255,0.9);
      dominant-baseline: middle;
      text-anchor: middle;
      pointer-events: none;
    }

    @keyframes stripe-move {
      0%   { transform: translateY(6px); opacity: 0.7; }
      80%  { opacity: 0.4; }
      100% { transform: translateY(-30px); opacity: 0; }
    }
  `;

  // Vnitřní prostor baterie: y=14..62, výška=48px, x=5..27 (šířka 22)
  private get fillColor(): string {
    if (this.gridCharging) return '#42a5f5';   // modrá — síťové nabíjení
    if (this.soc > 50) return '#4caf50';       // zelená
    if (this.soc > 20) return '#ff9800';       // oranžová
    return '#f44336';                           // červená
  }

  private get fillHeight(): number {
    const maxH = 48;
    return Math.max(1, (Math.min(100, this.soc) / 100) * maxH);
  }

  private get fillY(): number {
    return 14 + (48 - this.fillHeight);
  }

  private get stripeColor(): string {
    return this.gridCharging ? '#90caf9' : '#a5d6a7';
  }

  render() {
    const isCharging = this.charging || this.gridCharging;
    const showText = this.soc >= 25;

    return html`
      <svg viewBox="0 0 32 68">
        <!-- Terminal (horní pólík) -->
        <rect class="terminal" x="11" y="0" width="10" height="5" rx="1.5"/>

        <!-- Obrys baterie -->
        <rect class="outline" x="2" y="5" width="28" height="62" rx="4"/>

        <!-- Clippath pro výplň -->
        <defs>
          <clipPath id="${this._clipId}">
            <rect x="4" y="7" width="24" height="58" rx="3"/>
          </clipPath>
        </defs>

        <!-- Výplň podle SoC -->
        <rect
          class="fill-bar"
          x="4"
          y="${this.fillY}"
          width="24"
          height="${this.fillHeight}"
          rx="2"
          fill="${this.fillColor}"
          clip-path="url(#${this._clipId})"
        />

        <!-- Animovaný pruh při nabíjení -->
        ${isCharging ? svg`
          <rect
            class="charge-stripe active"
            x="4" y="52" width="24" height="8" rx="2"
            fill="${this.stripeColor}"
            clip-path="url(#${this._clipId})"
          />
        ` : ''}

        <!-- SoC text uvnitř -->
        ${showText ? svg`
          <text class="soc-text" x="16" y="${this.fillY + this.fillHeight / 2}">
            ${Math.round(this.soc)}%
          </text>
        ` : ''}
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'oig-battery-icon': OigBatteryIcon; }
}
