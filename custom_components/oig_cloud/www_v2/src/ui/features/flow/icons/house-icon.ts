/**
 * House Icon — domeček s výplní podle spotřeby
 *
 * Design:
 * - Jednoduchý domeček (střecha + tělo) SVG path
 * - Uvnitř vertikální výplň = % spotřeby z instalovaného výkonu
 * - Nízká spotřeba: tmavé okna, chladná barva
 * - Střední: okna svítí, teplá barva
 * - Vysoká: výrazná barva, silnější výplň
 * - Bojler aktivní: malá ikona plamene vlevo dole
 *
 * Žádné blikání, jen plynulé přechody barvy a výšky výplně.
 */

import { LitElement, html, css, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('oig-house-icon')
export class OigHouseIcon extends LitElement {
  @property({ type: Number }) power = 0;          // watts aktuální spotřeba
  @property({ type: Number }) maxPower = 10000;   // instalovaný výkon
  @property({ type: Boolean }) boilerActive = false;

  static styles = css`
    :host { display: inline-block; width: 48px; height: 48px; }
    svg { width: 100%; height: 100%; overflow: visible; }

    .roof {
      fill: var(--primary-text-color, #b0bec5);
      opacity: 0.25;
      transition: opacity 0.6s ease;
    }
    .roof.active { opacity: 0.55; }

    .walls {
      fill: none;
      stroke: var(--primary-text-color, #b0bec5);
      stroke-width: 1.8;
      opacity: 0.45;
      transition: opacity 0.6s ease;
    }
    .walls.active { opacity: 0.8; }

    .fill-bar {
      transition: height 0.8s ease, y 0.8s ease, fill 0.8s ease;
      rx: 1;
    }

    .window {
      transition: fill 0.6s ease, opacity 0.6s ease;
    }

    .boiler-dot {
      transition: opacity 0.4s ease;
    }
  `;

  private get percent(): number {
    return Math.min(100, (this.power / Math.max(1, this.maxPower)) * 100);
  }

  private get fillColor(): string {
    const p = this.percent;
    if (p < 15) return '#546e7a';
    if (p < 40) return '#f06292';
    if (p < 70) return '#e91e63';
    return '#c62828';
  }

  private get level(): 'low' | 'mid' | 'high' {
    const p = this.percent;
    if (p < 15) return 'low';
    if (p < 60) return 'mid';
    return 'high';
  }

  private get windowColor(): string {
    const l = this.level;
    if (l === 'low') return '#37474f';
    if (l === 'mid') return '#ffd54f';
    return '#ffb300';
  }

  render() {
    const pct = this.percent;
    const bodyH = 24; // výška těla domečku v SVG
    const bodyTop = 22;
    const fillH = Math.max(1, (pct / 100) * bodyH);
    const fillY = bodyTop + (bodyH - fillH);
    const level = this.level;

    return html`
      <svg viewBox="0 0 48 48">
        <defs>
          <clipPath id="house-clip">
            <rect x="8" y="${bodyTop}" width="32" height="${bodyH}" rx="1"/>
          </clipPath>
        </defs>

        <!-- Střecha (trojúhelník) -->
        <polygon
          class="roof ${level !== 'low' ? 'active' : ''}"
          points="4,24 24,6 44,24"
        />
        <!-- Obrys střechy -->
        <polyline
          points="4,24 24,6 44,24"
          fill="none"
          stroke="var(--primary-text-color, #b0bec5)"
          stroke-width="1.8"
          opacity="0.55"
          stroke-linejoin="round"
        />

        <!-- Tělo domečku -->
        <rect
          class="walls ${level !== 'low' ? 'active' : ''}"
          x="8" y="${bodyTop}" width="32" height="${bodyH}" rx="1"
        />

        <!-- Výplň spotřeby -->
        <rect
          class="fill-bar"
          x="8" y="${fillY}" width="32" height="${fillH}"
          fill="${this.fillColor}"
          clip-path="url(#house-clip)"
        />

        <!-- Dvě okna -->
        <rect class="window" x="12" y="27" width="8" height="7" rx="1" fill="${this.windowColor}" opacity="${level === 'low' ? 0.3 : 0.85}"/>
        <rect class="window" x="28" y="27" width="8" height="7" rx="1" fill="${this.windowColor}" opacity="${level === 'low' ? 0.3 : 0.85}"/>

        <!-- Dveře -->
        <rect x="20" y="33" width="8" height="13" rx="1"
          fill="none"
          stroke="var(--primary-text-color, #b0bec5)"
          stroke-width="1.2"
          opacity="0.35"
        />

        <!-- Bojler indikátor (malý plamen vlevo dole) -->
        ${this.boilerActive ? svg`
          <circle class="boiler-dot" cx="10" cy="43" r="3.5" fill="#ff5722" opacity="0.9"/>
          <text x="10" y="43" text-anchor="middle" dominant-baseline="middle" font-size="5" fill="white">🔥</text>
        ` : ''}
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'oig-house-icon': OigHouseIcon; }
}
