// ============================================================================
// 🔥 Živý 3D model bojleru — stratifikace, patrona, alt zdroj, cirkulace
// ============================================================================
//
// Component: oig-boiler-model
// 3D cylinder tank with thermal stratification, glowing immersion element when
// heating electrically, a type-specific alternative source (gas/heat-pump/
// fireplace) connected by supply/return pipes, the two-way distribution pipe
// (draw + circulation return), driven by live state. Reference: mockup-v8.
// ============================================================================

import { LitElement, html, svg, css, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { CSS_VARS } from '@/ui/theme';
import { t, type Lang } from '@/i18n/boiler';
import { altTypeLabel } from './boiler-energy-today';

const u = unsafeCSS;

const ALT_ICON: Record<string, string> = { gas: '🔥', heat_pump: '♨️', fireplace: '🪵', other: '⚙️' };

function fmt1(v: number | null | undefined): string {
  return v == null ? '—' : v.toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Usable-water defaults (litres of ~38 °C mixed water).
export const USE_TEMP_C = 38;
export const SHOWER_L = 50;
export const BATH_L = 140;

/**
 * Litres of usable ~useTemp °C water the tank can deliver, mixing stored hot
 * water down with cold inlet. Linear stratification bottom→top; each layer above
 * useTemp contributes (T − cold)/(useTemp − cold) litres of mixed water.
 */
export function usableLiters(
  top: number | null,
  bottom: number | null | undefined,
  cold: number,
  volume: number,
  useTemp: number = USE_TEMP_C,
): number | null {
  if (top == null || volume <= 0) return null;
  const b = bottom == null ? top : bottom;
  const denom = useTemp - cold;
  if (denom <= 0) return null;
  const N = 40;
  let liters = 0;
  for (let i = 0; i < N; i++) {
    const h = (i + 0.5) / N;          // 0 = bottom, 1 = top
    const tLayer = b + h * (top - b);
    if (tLayer >= useTemp) liters += (volume / N) * (tLayer - cold) / denom;
  }
  return liters;
}

// Temperature → water colour anchors (°C). Interpolated for the tank gradient
// so the rendered water reflects the real stratification instead of a fixed
// rainbow (M18).
const TEMP_COLOR_STOPS: Array<[number, [number, number, number]]> = [
  [16, [21, 101, 192]],   // #1565c0 cold blue
  [30, [0, 172, 193]],    // #00acc1 cyan
  [42, [255, 213, 79]],   // #ffd54f yellow
  [52, [255, 122, 61]],   // #ff7a3d orange
  [62, [229, 57, 53]],    // #e53935 hot red
];

function rgbHex(c: [number, number, number]): string {
  const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
}

/** Map a water temperature (°C) to a hex colour. Null → neutral grey. */
export function tempColor(tempC: number | null | undefined): string {
  if (tempC == null) return '#3b4654';
  const stops = TEMP_COLOR_STOPS;
  if (tempC <= stops[0][0]) return rgbHex(stops[0][1]);
  const last = stops[stops.length - 1];
  if (tempC >= last[0]) return rgbHex(last[1]);
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i];
    if (tempC <= t1) {
      const [t0, c0] = stops[i - 1];
      const k = (tempC - t0) / (t1 - t0);
      return rgbHex([
        Math.round(c0[0] + (c1[0] - c0[0]) * k),
        Math.round(c0[1] + (c1[1] - c0[1]) * k),
        Math.round(c0[2] + (c1[2] - c0[2]) * k),
      ]);
    }
  }
  return rgbHex(last[1]);
}

/** Czech plural for "sprcha". */
function showerWord(n: number, lang: Lang): string {
  if (lang === 'en') return n === 1 ? 'shower' : 'showers';
  if (n === 1) return 'sprcha';
  if (n >= 2 && n <= 4) return 'sprchy';
  return 'sprch';
}

@customElement('oig-boiler-model')
export class OigBoilerModel extends LitElement {
  @property({ type: Number }) topTempC: number | null = null;
  @property({ type: Number }) bottomTempC: number | null = null;
  @property({ type: Number }) readyLiters: number | null = null;
  /** 0..1 fraction of the tank that is ≥40 °C (drives the ready line). */
  @property({ type: Number }) readyFraction: number | null = null;
  /** Tank volume (L) + cold-inlet temp (°C) — for usable-water (38 °C) maths. */
  @property({ type: Number }) volumeL: number | null = null;
  @property({ type: Number }) coldInletTempC: number | null = null;
  /** 'ele' (electric element), 'alt' (alternative source), or 'idle'. */
  @property({ type: String }) heatMode: 'ele' | 'alt' | 'idle' = 'idle';
  /** Electric charge source for the badge: 'fve' | 'grid' | 'battery'. */
  @property({ type: String }) electricSource: 'fve' | 'grid' | 'battery' = 'grid';
  @property({ type: String }) altSourceType: string | null = 'gas';
  @property({ type: Number }) elementKwhToday: number | null = null;
  @property({ type: Number }) altKwhToday: number | null = null;
  @property({ type: Number }) altPowerKw: number | null = null;
  @property({ type: Boolean }) circulationEnabled = false;
  @property({ type: Boolean }) circulationActive = false;
  @property({ type: Number }) trendCPerMin: number | null = null;
  @property({ type: String }) lang: Lang = 'cs';

  static styles = css`
    :host { display: block; }
    .wrap { width: 100%; }
    svg { display: block; width: 100%; height: auto; filter: drop-shadow(0 14px 22px rgba(0,0,0,.4)); }
    .ready-readout { display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
      gap: 8px; margin-top: 6px; font-size: 13px; font-weight: 650; color: ${u(CSS_VARS.textPrimary)}; }
    .ready-readout .rr-main { color: #7fd0f5; }
    .ready-readout .rr-sep { color: ${u(CSS_VARS.textSecondary)}; opacity: .5; }
    .ready-readout .rr-eq.ok { color: #5ec98a; }
    .ready-readout .rr-eq.no { color: ${u(CSS_VARS.textSecondary)}; }
    .kpi-row { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
    .kpi { flex: 1; min-width: 80px; text-align: center; padding: 7px 6px; border-radius: 10px;
      background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
      font-size: 10.5px; color: ${u(CSS_VARS.textSecondary)}; }
    .kpi b { display: block; color: ${u(CSS_VARS.textPrimary)}; font-size: 14px; margin-top: 2px; }

    .flow-pipe { fill: none; stroke-width: 6; stroke-linecap: round; stroke-dasharray: 9 9; opacity: .3; }
    .pipe-supply { stroke: #ff5a4d; } .pipe-return { stroke: #4aa8ff; }
    .pipe-dist { stroke: #ff9a6a; } .pipe-circ-ret { stroke: #4aa8ff; }
    .element-glow { opacity: 0; }
    .charge-in { opacity: 0; }
    .altg { display: none; }
    .circ-group { opacity: 0; }
    .water-gloss { animation: bm-shimmer 4s ease-in-out infinite; }
    .hp-fan { transform-box: fill-box; transform-origin: center; animation: bm-spin 7s linear infinite; }
    .circ-pump { transform-box: fill-box; transform-origin: center; }

    @keyframes bm-flow { to { stroke-dashoffset: -36; } }
    @keyframes bm-flowrev { to { stroke-dashoffset: 36; } }
    @keyframes bm-glow { 0%,100% { opacity: .35; } 50% { opacity: 1; } }
    @keyframes bm-shimmer { 0%,100% { opacity: .5; } 50% { opacity: .85; } }
    @keyframes bm-spin { to { transform: rotate(360deg); } }
    @keyframes bm-flick { from { transform: scaleY(.9); opacity: .7; } to { transform: scaleY(1.08); opacity: 1; } }

    /* electric element heating */
    .mode-ele .element-core { filter: drop-shadow(0 0 6px #ff3b30); }
    .mode-ele .element-core .el-hot { stroke: #ff5a4d; }
    .mode-ele .element-glow { opacity: 1; animation: bm-glow 1.4s ease-in-out infinite; }
    .mode-ele .charge-in.active { opacity: 1; }
    /* alt source heating */
    .mode-alt .pipe-supply { opacity: 1; animation: bm-flow 1s linear infinite; }
    .mode-alt .pipe-return { opacity: 1; animation: bm-flowrev 1s linear infinite; }
    .mode-alt .gas-box { filter: drop-shadow(0 0 10px rgba(255,106,61,.6)); }
    .mode-alt .charge-in.active { opacity: 1; }
    .mode-alt .hp-fan { animation: bm-spin 1.1s linear infinite; }
    .flame-flick { transform-box: fill-box; transform-origin: bottom center; opacity: .35; }
    .mode-alt .flame-flick { opacity: 1; animation: bm-flick .5s ease-in-out infinite alternate; }
    .alt-fireplace .flame-flick { opacity: .8; }
    /* alt type selection */
    .alt-gas .altg.gas { display: block; }
    .alt-heat_pump .altg.hp { display: block; }
    .alt-fireplace .altg.fire { display: block; }
    .alt-other .altg.other { display: block; }
    /* circulation */
    .circ-shown .circ-group { opacity: 1; }
    .circ-on .pipe-dist { opacity: .9; animation: bm-flow .9s linear infinite; }
    .circ-on .pipe-circ-ret { opacity: 1; animation: bm-flow .9s linear infinite; }
    .circ-on .circ-pump { animation: bm-spin 2.4s linear infinite; }
  `;

  render() {
    const lang = this.lang;
    const altType = this.altSourceType && ALT_ICON[this.altSourceType] ? this.altSourceType : 'gas';
    const cls = {
      wrap: true,
      [`mode-${this.heatMode}`]: true,
      [`alt-${altType}`]: true,
      'circ-shown': this.circulationEnabled,
      'circ-on': this.circulationEnabled && this.circulationActive,
    };
    const altLabel = altTypeLabel(this.altSourceType, lang);
    const altIcon = ALT_ICON[altType];
    const trend = this.trendCPerMin;
    const trendStr = trend != null && Math.abs(trend) >= 0.05
      ? `${trend > 0 ? '↑' : '↓'} ${fmt1(Math.abs(trend))} °C/min` : '';

    // A/B: usable ~38 °C water + shower/bath equivalents.
    const usable = usableLiters(
      this.topTempC,
      this.bottomTempC,
      this.coldInletTempC ?? 16,
      this.volumeL ?? 200,
    );
    const showers = usable != null ? Math.floor(usable / SHOWER_L) : 0;
    const bathOk = usable != null && usable >= BATH_L;
    const showerText = showers >= 1
      ? `🚿 ${showers} ${showerWord(showers, lang)}`
      : (lang === 'en' ? '🚿 not even a shower' : '🚿 ani sprcha');
    const bathText = bathOk
      ? (lang === 'en' ? '🛁 bath ✓' : '🛁 vana ✓')
      : (lang === 'en' ? '🛁 no bath' : '🛁 na vanu nestačí');

    // M18: drive the water colour from the real top/bottom temps and the
    // "ready" waterline from readyFraction (battery-SoC analogy). Inner tank:
    // x=166, y=64, w=88, h=172 (bottom edge y=236).
    const botCol = tempColor(this.bottomTempC ?? this.topTempC);
    const topCol = tempColor(this.topTempC ?? this.bottomTempC);
    const midTemp = this.topTempC != null && this.bottomTempC != null
      ? (this.topTempC + this.bottomTempC) / 2
      : (this.topTempC ?? this.bottomTempC ?? null);
    const midCol = tempColor(midTemp);
    const INNER_TOP = 64;
    const INNER_H = 172;
    const frac = this.readyFraction != null
      ? Math.max(0, Math.min(1, this.readyFraction))
      : 1;
    const readyH = frac * INNER_H;          // hot/ready band height (top of tank)
    const waterlineY = INNER_TOP + readyH;  // boundary between ready and cooler
    const coldHeight = INNER_H - readyH;    // cooler reservoir below the line
    const showWaterline = this.readyFraction != null && frac > 0 && frac < 1;

    return html`
      <div class=${classMap(cls)}>
        <svg viewBox="0 0 430 290" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="bmwater" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stop-color=${botCol}/>
              <stop offset=".5" stop-color=${midCol}/>
              <stop offset="1" stop-color=${topCol}/>
            </linearGradient>
            <linearGradient id="bmround" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".22" stop-color="#000" stop-opacity=".12"/>
              <stop offset=".5" stop-color="#fff" stop-opacity=".10"/><stop offset=".78" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".55"/>
            </linearGradient>
            <linearGradient id="bmcasing" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#2c3644"/><stop offset=".5" stop-color="#586676"/><stop offset="1" stop-color="#2c3644"/>
            </linearGradient>
            <linearGradient id="bmcap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b7989"/><stop offset="1" stop-color="#39434f"/></linearGradient>
            <linearGradient id="bmtube" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a2129"/><stop offset=".45" stop-color="#3b4654"/><stop offset="1" stop-color="#1a2129"/></linearGradient>
            <radialGradient id="bmehot" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff7a45" stop-opacity=".95"/><stop offset=".5" stop-color="#ff3b30" stop-opacity=".5"/><stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient>
            <clipPath id="bmclip"><rect x="166" y="64" width="88" height="172" rx="20"/></clipPath>
            <filter id="bmsoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
          </defs>

          <!-- ALT pipes (left) -->
          <path d="M162 210 L106 210 L106 196" stroke="url(#bmtube)" stroke-width="9" fill="none" stroke-linecap="round" opacity=".5"/>
          <path d="M106 176 L106 78 L162 78" stroke="url(#bmtube)" stroke-width="9" fill="none" stroke-linecap="round" opacity=".5"/>
          <path class="flow-pipe pipe-return" d="M162 210 L106 210 L106 196"/>
          <path class="flow-pipe pipe-supply" d="M106 176 L106 78 L162 78"/>

          <!-- ALT source — type-specific -->
          <g class="gas-box">
            <g class="altg gas">
              <rect x="62" y="166" width="76" height="62" rx="10" fill="url(#bmcasing)" stroke="rgba(255,255,255,.16)"/>
              <rect x="70" y="174" width="60" height="18" rx="4" fill="#0b0f14" opacity=".6"/>
              <path class="flame-flick" d="M100 222 q-9 -10 -3 -20 q4 7 7 4 q5 -5 1 -13 q12 8 9 22 q-2 9 -14 7 z" fill="#ff8a3d"/>
            </g>
            <g class="altg hp">
              <rect x="58" y="170" width="84" height="56" rx="9" fill="url(#bmcasing)" stroke="rgba(255,255,255,.16)"/>
              <line x1="66" y1="178" x2="134" y2="178" stroke="#10161d" stroke-width="2"/>
              <line x1="66" y1="184" x2="134" y2="184" stroke="#10161d" stroke-width="2"/>
              <circle cx="112" cy="200" r="20" fill="#0b0f14" stroke="rgba(255,255,255,.12)"/>
              <g class="hp-fan">
                <path d="M112 200 q3 -15 11 -13 q-2 9 -11 13 z" fill="#4aa8ff" opacity=".85"/>
                <path d="M112 200 q15 3 13 11 q-9 -2 -13 -11 z" fill="#4aa8ff" opacity=".85"/>
                <path d="M112 200 q-3 15 -11 13 q2 -9 11 -13 z" fill="#4aa8ff" opacity=".85"/>
                <path d="M112 200 q-15 -3 -13 -11 q9 2 13 11 z" fill="#4aa8ff" opacity=".85"/>
              </g>
            </g>
            <g class="altg fire">
              <rect x="98" y="156" width="8" height="14" fill="#3b4654"/>
              <rect x="68" y="170" width="64" height="58" rx="6" fill="url(#bmcasing)" stroke="rgba(255,255,255,.16)"/>
              <rect x="78" y="182" width="44" height="36" rx="4" fill="#160a06"/>
              <path class="flame-flick" d="M100 216 q-11 -12 -4 -26 q5 9 9 5 q6 -7 1 -17 q16 10 12 28 q-3 12 -18 10 z" fill="#ff6a2c"/>
            </g>
            <g class="altg other">
              <rect x="62" y="166" width="76" height="62" rx="10" fill="url(#bmcasing)" stroke="rgba(255,255,255,.16)"/>
              <text x="100" y="206" font-size="22" text-anchor="middle">⚙️</text>
            </g>
          </g>
          <text x="100" y="244" font-size="10" text-anchor="middle" font-weight="700" fill="#fff">${altLabel}</text>
          <text x="100" y="256" fill="#cdd8e3" font-size="9" text-anchor="middle">${this.altPowerKw != null ? `${fmt1(this.altPowerKw)} kW · ` : ''}${t('boiler.model.today', lang)} ${fmt1(this.altKwhToday)} kWh</text>

          <!-- distribution + circulation (right) -->
          <g class="circ-group">
            <path d="M254 108 L330 108 L330 206 L262 206" stroke="url(#bmtube)" stroke-width="9" fill="none" stroke-linecap="round" opacity=".5"/>
            <path class="flow-pipe pipe-circ-ret" d="M254 108 L330 108 L330 206 L262 206"/>
            <g class="circ-pump"><circle cx="330" cy="157" r="12" fill="#11331f" stroke="#5eead4" stroke-width="1.5"/><path d="M330 149 l5 6 -10 0 z M330 165 l-5 -6 10 0 z" fill="#5eead4"/></g>
          </g>

          <!-- bottom shadow + casing + water -->
          <ellipse cx="210" cy="240" rx="52" ry="11" fill="#000" opacity=".4" filter="url(#bmsoft)"/>
          <rect x="158" y="50" width="104" height="192" rx="26" fill="url(#bmcasing)" stroke="rgba(255,255,255,.12)"/>
          <g clip-path="url(#bmclip)">
            <rect x="166" y="64" width="88" height="172" fill="url(#bmwater)"/>
            <rect x="166" y="64" width="88" height="172" fill="url(#bmround)"/>
            <!-- M18: cooler (not-yet-ready) reservoir below the ready waterline -->
            ${coldHeight > 0.5 ? svg`<rect x="166" y=${waterlineY} width="88" height=${coldHeight} fill="#0a0e13" opacity=".4"/>` : ''}
            ${showWaterline ? svg`<rect x="166" y=${waterlineY - 1} width="88" height="2" fill="#fff" opacity=".5"/>` : ''}
            <ellipse class="water-gloss" cx="188" cy="150" rx="11" ry="78" fill="#fff" opacity=".5" filter="url(#bmsoft)"/>
          </g>

          <ellipse cx="210" cy="60" rx="48" ry="13" fill="url(#bmcap)" stroke="rgba(255,255,255,.18)"/>
          <ellipse cx="210" cy="57" rx="30" ry="6" fill="#fff" opacity=".18"/>

          <!-- temps -->
          <rect x="258" y="64" width="42" height="20" rx="6" fill="rgba(10,14,19,.7)" stroke="rgba(255,255,255,.12)"/>
          <text x="279" y="58" fill="#9fb0c0" font-size="8" text-anchor="middle">${t('boiler.model.top', lang)}</text>
          <text x="279" y="78" fill="#ffd9b0" font-size="12" font-weight="800" text-anchor="middle">${this.topTempC != null ? Math.round(this.topTempC) : '–'} °C</text>
          <rect x="258" y="214" width="42" height="20" rx="6" fill="rgba(10,14,19,.7)" stroke="rgba(255,255,255,.12)"/>
          <text x="279" y="228" fill="#aad4ff" font-size="12" font-weight="800" text-anchor="middle">${this.bottomTempC != null ? Math.round(this.bottomTempC) : '–'} °C</text>
          <text x="279" y="246" fill="#9fb0c0" font-size="8" text-anchor="middle">${t('boiler.model.bottom', lang)}</text>

          <!-- element -->
          <ellipse class="element-glow" cx="210" cy="186" rx="40" ry="34" fill="url(#bmehot)"/>
          <g class="element-core" stroke-linecap="round" fill="none">
            <path class="el-hot" d="M198 232 L198 168 a12 12 0 0 1 24 0 L222 232" stroke="#9aa6b2" stroke-width="5"/>
          </g>
          <rect x="194" y="230" width="32" height="8" rx="2" fill="#475160"/>
          <text x="210" y="252" fill="#ffd1cb" font-size="9" text-anchor="middle" font-weight="600">${t('boiler.model.element', lang)} · ${t('boiler.model.today', lang)} ${fmt1(this.elementKwhToday)} kWh</text>

          <!-- charge-in badge (electric source / alt) -->
          ${this.heatMode === 'ele' ? html`
            <g class="charge-in active">
              <circle cx="210" cy="40" r="13" fill="${this.electricSource === 'fve' ? '#ffb300' : this.electricSource === 'battery' ? '#7e57c2' : '#1b6fd6'}"/>
              <text x="210" y="45" font-size="13" text-anchor="middle">${this.electricSource === 'fve' ? '☀️' : this.electricSource === 'battery' ? '🔋' : '🔌'}</text>
            </g>` : nothing}
          ${this.heatMode === 'alt' ? html`
            <g class="charge-in active"><circle cx="210" cy="40" r="13" fill="#e64a19"/><text x="210" y="45" font-size="13" text-anchor="middle">${altIcon}</text></g>` : nothing}
        </svg>

        <div class="ready-readout" data-testid="boiler-ready-readout">
          <span class="rr-main">💧 ~${usable != null ? Math.round(usable) : '—'} ${t('boiler.model.usable', lang)}</span>
          <span class="rr-sep">·</span>
          <span class="rr-eq">${showerText}</span>
          <span class="rr-sep">·</span>
          <span class="rr-eq ${bathOk ? 'ok' : 'no'}">${bathText}</span>
        </div>

        <div class="kpi-row">
          <div class="kpi">${t('boiler.model.element', lang)}<b>${fmt1(this.elementKwhToday)} kWh</b></div>
          <div class="kpi">${altLabel}<b>${fmt1(this.altKwhToday)} kWh</b></div>
          <div class="kpi">${t('boiler.model.trend', lang)}<b>${trendStr || '—'}</b></div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-model': OigBoilerModel;
  }
}
