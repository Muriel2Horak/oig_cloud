/**
 * Inverter Icon — střídač s indikací režimu
 *
 * Design:
 * - Základní tvar: čtverec se zaoblenými rohy (průmyslový box)
 * - Uvnitř: sinusoida = výstup AC (mění se podle režimu)
 * - Stavové indikátory:
 *   - Normální: fialová sinusoida, klidná
 *   - Bypass: oranžový trojúhelník výstrahy nahoře
 *   - Alarm/error: červený kroužek pulzující
 *   - UPS mode: blesk uvnitř
 *   - Planér aktivní: malá zelená tečka dole
 *
 * Žádná rotace, žádné složité efekty.
 */

import { LitElement, html, css, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('oig-inverter-icon')
export class OigInverterIcon extends LitElement {
  @property({ type: String }) mode = '';            // inverterMode string
  @property({ type: Boolean }) bypassActive = false;
  @property({ type: Boolean }) hasAlarm = false;    // notificationsError > 0
  @property({ type: Boolean }) plannerAuto = false;

  static styles = css`
    :host { display: inline-block; width: 48px; height: 48px; }
    svg { width: 100%; height: 100%; overflow: visible; }

    .box {
      fill: none;
      stroke: #9575cd;
      stroke-width: 2;
      rx: 5;
      opacity: 0.7;
      transition: stroke 0.5s ease;
    }
    .box.alarm { stroke: #f44336; }
    .box.bypass { stroke: #ff9800; }

    .sine-out {
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      transition: stroke 0.5s ease;
    }
    .sine-out.normal  { stroke: #9575cd; opacity: 0.9; }
    .sine-out.bypass  { stroke: #ff9800; opacity: 0.9; }
    .sine-out.alarm   { stroke: #f44336; }
    .sine-out.ups     { stroke: #42a5f5; }

    .warning-triangle {
      fill: #ff9800;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .warning-triangle.active { opacity: 1; }

    .alarm-ring {
      fill: none;
      stroke: #f44336;
      stroke-width: 2;
      opacity: 0;
    }
    .alarm-ring.active {
      opacity: 1;
      animation: alarm-pulse 1.4s ease-in-out infinite;
    }

    .planner-dot {
      fill: #4caf50;
      opacity: 0;
      transition: opacity 0.4s;
    }
    .planner-dot.active { opacity: 1; }

    .ups-bolt {
      fill: #42a5f5;
      opacity: 0;
    }
    .ups-bolt.active { opacity: 0.85; }

    @keyframes alarm-pulse {
      0%, 100% { opacity: 0.3; r: 6; }
      50%       { opacity: 1;   r: 8; }
    }
  `;

  private get modeType(): 'normal' | 'ups' | 'bypass' | 'alarm' {
    if (this.hasAlarm) return 'alarm';
    if (this.bypassActive) return 'bypass';
    if (this.mode.includes('UPS')) return 'ups';
    return 'normal';
  }

  render() {
    const mt = this.modeType;

    // Sinusoida uvnitř boxu — výstup střídače
    const sine = `M 10,28 C 14,28 14,20 18,22 C 22,24 22,32 26,32 C 30,32 30,20 34,22 C 38,24 38,28 38,28`;

    return html`
      <svg viewBox="0 0 48 48">
        <!-- Hlavní box střídače -->
        <rect
          class="box ${mt}"
          x="4" y="8" width="40" height="34" rx="5"
        />

        <!-- Sinusoida výstupu -->
        <path class="sine-out ${mt}" d="${sine}"/>

        <!-- UPS blesk -->
        ${mt === 'ups' ? svg`
          <path class="ups-bolt active"
            d="M 25,12 L 20,26 L 24,26 L 23,36 L 28,22 L 24,22 Z"
          />
        ` : ''}

        <!-- Bypass výstraha — trojúhelník nahoře -->
        ${mt === 'bypass' ? svg`
          <polygon
            class="warning-triangle active"
            points="24,6 18,16 30,16"
          />
          <text x="24" y="15" text-anchor="middle" dominant-baseline="middle"
            font-size="6" font-weight="bold" fill="#fff">!</text>
        ` : ''}

        <!-- Alarm kroužek -->
        ${mt === 'alarm' ? svg`
          <circle class="alarm-ring active" cx="24" cy="25" r="6"/>
          <text x="24" y="26" text-anchor="middle" dominant-baseline="middle"
            font-size="8" font-weight="bold" fill="#f44336">!</text>
        ` : ''}

        <!-- Plánovač aktivní — zelená tečka dole uprostřed -->
        <circle
          class="planner-dot ${this.plannerAuto ? 'active' : ''}"
          cx="24" cy="46" r="3"
        />

        <!-- Vstupní / výstupní konektory (dekorativní čárky) -->
        <line x1="4" y1="18" x2="0" y2="18"
          stroke="#9575cd" stroke-width="1.5" opacity="0.4"/>
        <line x1="44" y1="18" x2="48" y2="18"
          stroke="#9575cd" stroke-width="1.5" opacity="0.4"/>
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'oig-inverter-icon': OigInverterIcon; }
}
