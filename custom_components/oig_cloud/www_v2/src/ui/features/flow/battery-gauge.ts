/**
 * Battery SVG Gauge — Port of V1 battery-icon-svg
 *
 * SVG battery with gradient fill (red→orange→yellow→green),
 * charging pulse animation, and grid-charging lightning bolt.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('oig-battery-gauge')
export class OigBatteryGauge extends LitElement {
  @property({ type: Number }) soc = 0;
  @property({ type: Boolean }) charging = false;
  @property({ type: Boolean }) gridCharging = false;

  static styles = css`
    :host {
      display: inline-block;
      width: 35px;
      height: 56px;
    }

    svg {
      width: 100%;
      height: 100%;
    }

    .battery-outline {
      fill: none;
      stroke: var(--primary-text-color, #212121);
      stroke-width: 2;
    }

    .battery-terminal {
      fill: var(--primary-text-color, #212121);
    }

    .battery-fill {
      transition: height 0.6s ease, y 0.6s ease;
    }

    .battery-fill.charging {
      animation: pulse-fill 1.5s ease-in-out infinite;
    }

    .battery-lightning {
      font-size: 22px;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }

    .battery-lightning.active {
      opacity: 1;
      animation: lightning-pulse 1s ease-in-out infinite;
    }

    @keyframes pulse-fill {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    @keyframes lightning-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
  `;

  private get fillHeight(): number {
    const maxHeight = 54;
    return (Math.max(0, Math.min(100, this.soc)) / 100) * maxHeight;
  }

  private get fillY(): number {
    return 13 + (54 - this.fillHeight);
  }

  render() {
    return html`
      <svg viewBox="0 0 50 80">
        <defs>
          <linearGradient id="bg" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#f44336" />
            <stop offset="25%" stop-color="#ff9800" />
            <stop offset="50%" stop-color="#ffeb3b" />
            <stop offset="75%" stop-color="#8bc34a" />
            <stop offset="100%" stop-color="#4caf50" />
          </linearGradient>
        </defs>
        <!-- Outline -->
        <rect x="5" y="10" width="40" height="60" rx="4" ry="4" class="battery-outline" />
        <!-- Terminal -->
        <rect x="18" y="2" width="14" height="8" rx="2" ry="2" class="battery-terminal" />
        <!-- Fill -->
        <rect
          x="8"
          y="${this.fillY}"
          width="34"
          height="${this.fillHeight}"
          rx="2"
          ry="2"
          class="battery-fill ${this.charging ? 'charging' : ''}"
          fill="url(#bg)"
        />
        <!-- Grid charging lightning -->
        <text
          x="25" y="45"
          class="battery-lightning ${this.gridCharging ? 'active' : ''}"
          text-anchor="middle"
          dominant-baseline="middle"
        >⚡</text>
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-battery-gauge': OigBatteryGauge;
  }
}
