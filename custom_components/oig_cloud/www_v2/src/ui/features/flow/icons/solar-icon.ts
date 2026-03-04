/**
 * Solar Icon — živé slunce / měsíc podle výkonu
 *
 * Design:
 * - Noc (percent < 2): měsíc — srpek, modrošedý
 * - Malý výkon (2-20%): slunce za mrakem — bledé, paprsky krátké
 * - Střední (20-70%): plné slunce, paprsky střední délky
 * - Vysoký (70-100%): jasné slunce, paprsky dlouhé, teplá žlutá
 *
 * Animace: paprsky se plynule mění délkou (transition), žádná rotace.
 */

import { LitElement, html, css, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('oig-solar-icon')
export class OigSolarIcon extends LitElement {
  @property({ type: Number }) power = 0;      // watts
  @property({ type: Number }) percent = 0;    // 0-100 % of rated capacity
  @property({ type: Number }) maxPower = 5400;

  static styles = css`
    :host { display: inline-block; width: 48px; height: 48px; }
    svg { width: 100%; height: 100%; overflow: visible; }

    .sun-core {
      transition: r 0.8s ease, fill 0.8s ease;
    }
    .ray {
      stroke-linecap: round;
      transition: stroke-dasharray 0.8s ease, stroke 0.8s ease, opacity 0.8s ease;
    }
    .moon-body {
      animation: moon-pulse 4s ease-in-out infinite;
    }
    @keyframes moon-pulse {
      0%, 100% { opacity: 0.85; }
      50% { opacity: 1; }
    }
    .star {
      animation: star-twinkle 3s ease-in-out infinite;
    }
    @keyframes star-twinkle {
      0%, 100% { opacity: 0.25; }
      50% { opacity: 1; }
    }
    .cloud {
      transition: opacity 0.6s ease;
    }

    /* Pomalá rotace paprsků při výkonu ≥ 20 % */
    :host(.solar-active) .rays-group {
      animation: solar-rotate 20s linear infinite;
      transform-origin: 24px 24px;
    }
    @keyframes solar-rotate {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
  `;

  private get isNight(): boolean { return this.percent < 2; }
  private get level(): 'night' | 'low' | 'mid' | 'high' {
    if (this.percent < 2) return 'night';
    if (this.percent < 20) return 'low';
    if (this.percent < 65) return 'mid';
    return 'high';
  }

  private get sunColor(): string {
    const l = this.level;
    if (l === 'low') return '#b0bec5';
    if (l === 'mid') return '#ffd54f';
    return '#ffb300';
  }

  private get rayLen(): number {
    const l = this.level;
    if (l === 'low') return 4;
    if (l === 'mid') return 7;
    return 10;
  }

  private get rayOpacity(): number {
    const l = this.level;
    if (l === 'low') return 0.5;
    if (l === 'mid') return 0.8;
    return 1;
  }

  private get coreRadius(): number {
    const l = this.level;
    if (l === 'low') return 7;
    if (l === 'mid') return 9;
    return 11;
  }

  private renderMoon() {
    return svg`
      <circle cx="24" cy="24" r="20" fill="#3949ab" opacity="0.28"/>
      <g class="moon-body">
        <path d="M24 6 A18 18 0 1 0 24 42 A13 13 0 1 1 24 6Z" fill="#cfd8dc" opacity="0.95"/>
      </g>
      <circle class="star" cx="7" cy="10" r="1.5" fill="#e8eaf6" style="animation-delay:0s"/>
      <circle class="star" cx="41" cy="7" r="1.8" fill="#e8eaf6" style="animation-delay:0.7s"/>
      <circle class="star" cx="5" cy="30" r="1.2" fill="#c5cae9" style="animation-delay:1.4s"/>
      <circle class="star" cx="6" cy="44" r="1.0" fill="#c5cae9" style="animation-delay:2.1s"/>
      <circle class="star" cx="42" cy="39" r="1.3" fill="#e8eaf6" style="animation-delay:2.8s"/>
    `;
  }

  private renderSun() {
    const cx = 24, cy = 24;
    const r = this.coreRadius;
    const rayStart = r + 3;
    const rayEnd = rayStart + this.rayLen;
    const color = this.sunColor;
    const op = this.rayOpacity;

    // 8 paprsků v rovnoměrném rozestupu
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    const rays = angles.map(deg => {
      const rad = (deg * Math.PI) / 180;
      const x1 = cx + Math.cos(rad) * rayStart;
      const y1 = cy + Math.sin(rad) * rayStart;
      const x2 = cx + Math.cos(rad) * rayEnd;
      const y2 = cy + Math.sin(rad) * rayEnd;
      return svg`
        <line class="ray"
          x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
          stroke="${color}" stroke-width="2.5" opacity="${op}"
        />
      `;
    });

    // Malý mrak při low výkonu
    const showCloud = this.level === 'low';

    return svg`
      <!-- Paprsky obaleny v <g> pro CSS rotaci -->
      <g class="rays-group">
        ${rays}
      </g>
      <circle class="sun-core" cx="${cx}" cy="${cy}" r="${r}" fill="${color}" />
      ${showCloud ? svg`
        <!-- Jednoduchý obláček -->
        <g class="cloud" opacity="0.85">
          <ellipse cx="30" cy="30" rx="9" ry="6" fill="#90a4ae"/>
          <ellipse cx="24" cy="32" rx="7" ry="5" fill="#90a4ae"/>
          <ellipse cx="36" cy="32" rx="6" ry="4.5" fill="#90a4ae"/>
        </g>
      ` : ''}
    `;
  }

  render() {
    // Nastav třídu solar-active na :host pro CSS animaci rotace
    if (this.percent >= 20) {
      this.classList.add('solar-active');
    } else {
      this.classList.remove('solar-active');
    }

    return html`
      <svg viewBox="0 0 48 48">
        ${this.isNight ? this.renderMoon() : this.renderSun()}
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'oig-solar-icon': OigSolarIcon; }
}
