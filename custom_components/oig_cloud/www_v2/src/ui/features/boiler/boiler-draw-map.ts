// ============================================================================
// 💧 Mapa odběrů vody — weekly heatmap (7×96) + P90 typical-day profile
// ============================================================================
//
// Component: oig-boiler-draw-map
// Consumes BoilerV2Data.drawMap (weekly days + per-category P90 profiles).
// Two views: weekly heatmap (when + how big, by day) and a typical-day P90
// profile (toggle workday/weekend) with draw-window totals + biggest draws.
// Reference mockup: .sisyphus/evidence/boiler-redesign/mockup-drawmap-v2.html
// ============================================================================

import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { CSS_VARS } from '@/ui/theme';
import { t, type Lang } from '@/i18n/boiler';
import type { DrawMapData } from './types';

const u = unsafeCSS;

const MOCK = {
  water: '#4dd0e1', grid: '#3b82f6', fve: '#f0b429',
  battery: '#a78bfa', alt: '#ff8a50', idle: '#39415f',
  card: '#1b2340', card2: '#1f2848', line: '#2a3355',
  muted: '#8b93ad', dim: '#5c6480', text: '#e8ecf7',
} as const;

const SLOTS = 96;
const WD_CS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const WD_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function seasonOf(month: number): string {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/** Pick the P90 profile for a day-type, preferring the current season. */
export function pickProfile(
  profiles: Record<string, { slotsLitersP90: number[]; days: number }>,
  dayType: string,
  month: number,
): { slotsLitersP90: number[]; days: number } | null {
  if (!profiles) return null;
  const exact = `${dayType}_${seasonOf(month)}`;
  if (profiles[exact]) return profiles[exact];
  const fallbackKey = Object.keys(profiles).find(k => k.startsWith(dayType + '_'));
  return fallbackKey ? profiles[fallbackKey] : null;
}

/** Contiguous draw windows from a per-slot profile → [{startSlot, peakSlot, sumL}]. */
export function drawWindows(prof: number[]): Array<{ s: number; pk: number; sum: number }> {
  const wins: Array<{ s: number; pk: number; sum: number }> = [];
  let i = 0;
  while (i < prof.length) {
    if (prof[i] > 0.3) {
      let j = i, sum = 0, pk = i;
      while (j < prof.length && prof[j] > 0.3) { sum += prof[j]; if (prof[j] > prof[pk]) pk = j; j++; }
      wins.push({ s: i, pk, sum });
      i = j;
    } else i++;
  }
  return wins;
}

/** Classify a draw window by its volume → bath / shower / small symbol. */
export function drawTypeSymbol(liters: number): string {
  if (liters >= 100) return '🛁';
  if (liters >= 30) return '🚿';
  return '🚰';
}

function slotLabel(slot: number): string {
  const h = Math.floor(slot / 4), m = (slot % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function dayLabel(ds: string, lang: Lang): string {
  // ds = YYYY-MM-DD; weekday index Mon=0
  const d = new Date(ds + 'T00:00:00');
  const idx = (d.getDay() + 6) % 7;
  const names = lang === 'cs' ? WD_CS : WD_EN;
  return `${names[idx]} ${ds.slice(8)}.${ds.slice(5, 7)}.`;
}

@customElement('oig-boiler-draw-map')
export class OigBoilerDrawMap extends LitElement {
  @property({ attribute: false }) data: DrawMapData | null = null;
  @property({ type: String }) lang: Lang = 'cs';
  /** Injectable for tests; defaults to current month (1-12). */
  @property({ type: Number }) month: number = new Date().getMonth() + 1;
  /** Half-width column mode (mock rev3 §4): smaller SVGs, capped chips. */
  @property({ type: Boolean }) compact = false;
  @state() private dayType: 'workday' | 'weekend' = 'workday';

  static styles = css`
    :host { display: block; font-family: ${u(CSS_VARS.fontFamily)}; }
    .card {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
    }
    .heading { font-size: 13px; font-weight: 600; margin: 0 0 4px; color: ${u(CSS_VARS.textPrimary)}; }
    .cap { font-size: 10px; color: ${u(MOCK.muted)}; margin: 2px 0 8px; }
    .empty-state { text-align: center; padding: 18px 0; color: ${u(MOCK.muted)}; font-size: 12px; }
    .svg-wrap { width: 100%; overflow-x: auto; }
    .svg-wrap svg { display: block; width: 100%; height: auto; min-width: 240px; }
    .scalebar { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 10px; color: ${u(MOCK.muted)}; }
    .scalebar .grad { height: 7px; width: 100px; border-radius: 4px; background: linear-gradient(90deg,#173a54,#2a7d95,${u(MOCK.water)},#9be7ff); }
    .divider { height: 1px; background: ${u(MOCK.line)}; margin: 10px 0; }
    .prof-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .toggle { display: flex; gap: 6px; margin-left: auto; }
    .toggle button { font: 600 10px system-ui; padding: 3px 10px; border-radius: 999px;
      border: 1px solid ${u(MOCK.line)}; background: rgba(255,255,255,0.05);
      color: ${u(MOCK.muted)}; cursor: pointer; }
    .toggle button.on { background: rgba(77,208,225,0.15); color: ${u(MOCK.water)}; border-color: rgba(77,208,225,0.5); }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center; }
    .chips .lbl { font-size: 10px; color: ${u(MOCK.muted)}; }
    .chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 999px;
      background: rgba(77,208,225,0.12); font-size: 11px; font-weight: 600; color: ${u(MOCK.text)}; }
    .chip b { color: ${u(MOCK.water)}; }
  `;

  private _heatmapSvg(): string {
    const dm = this.data!;
    const days = dm.weekly;
    const max = Math.max(1, ...days.flatMap(d => d.slotsLiters));
    const c = this.compact;
    // Compact shrinks the viewBox itself (not just CSS scale) so that the
    // fixed-size text below stays legible once rendered at a half-width column.
    const W = c ? 480 : 940, padL = c ? 36 : 70, padR = c ? 30 : 52, rowH = c ? 13 : 20, gap = c ? 2 : 4, padT = c ? 6 : 8;
    const hourFont = c ? 8 : 9, dayFont = c ? 9 : 10, totalFont = c ? 9.5 : 11;
    const plotW = W - padL - padR, bw = plotW / SLOTS;
    const H = padT + days.length * (rowH + gap) + (c ? 10 : 14);
    const col = (v: number) => {
      const t2 = Math.min(1, v / max);
      if (t2 < 0.04) return 'rgba(255,255,255,.03)';
      const r = Math.round(25 + 30 * t2), g = Math.round(125 + 100 * t2), b = Math.round(160 + 95 * t2);
      return `rgba(${r},${g},${b},${(0.3 + 0.7 * t2).toFixed(2)})`;
    };
    let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
    for (let h = 0; h <= 24; h += 3) {
      const xx = padL + h * 4 * bw;
      s += `<text x="${xx}" y="${H - 2}" fill="#6b7785" font-size="${hourFont}" text-anchor="middle">${String(h).padStart(2, '0')}</text>`;
    }
    days.forEach((d, r) => {
      const y = padT + r * (rowH + gap);
      s += `<text x="${padL - 6}" y="${y + rowH / 2 + 4}" fill="#9fb0c0" font-size="${dayFont}" text-anchor="end">${dayLabel(d.date, this.lang)}</text>`;
      for (let i = 0; i < SLOTS; i++) {
        const v = d.slotsLiters[i] ?? 0;
        s += `<rect x="${(padL + i * bw).toFixed(1)}" y="${y}" width="${(bw - 0.3).toFixed(1)}" height="${rowH}" rx="1.5" fill="${col(v)}"><title>${dayLabel(d.date, this.lang)} ${slotLabel(i)} — ${v.toFixed(1)} L</title></rect>`;
      }
      s += `<text x="${padL + plotW + 6}" y="${y + rowH / 2 + 4}" fill="#cfe0ee" font-size="${totalFont}" font-weight="600">${Math.round(d.totalLiters)} L</text>`;
    });
    s += '</svg>';
    return s;
  }

  private _profileSvg(prof: number[]): string {
    const c = this.compact;
    const W = c ? 480 : 940, H = c ? 140 : 214, padL = c ? 22 : 30, padR = c ? 10 : 14, padT = c ? 18 : 32, padB = c ? 16 : 24;
    const hourFont = c ? 8 : 9, peakFont = c ? 9 : 11, axisFont = c ? 7 : 8;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const max = Math.max(1, ...prof), bw = plotW / SLOTS;
    const x = (i: number) => padL + i * bw, y = (v: number) => padT + plotH - (v / max) * plotH;
    let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
    for (let h = 0; h <= 24; h += 3) {
      const xx = x(h * 4);
      s += `<line x1="${xx}" y1="${padT}" x2="${xx}" y2="${padT + plotH}" stroke="rgba(255,255,255,.05)"/><text x="${xx}" y="${H - 7}" fill="#6b7785" font-size="${hourFont}" text-anchor="middle">${String(h).padStart(2, '0')}</text>`;
    }
    for (let i = 0; i < SLOTS; i++) {
      if (prof[i] > 0.05) s += `<rect x="${(x(i) + 0.4).toFixed(1)}" y="${y(prof[i]).toFixed(1)}" width="${(bw - 0.8).toFixed(1)}" height="${(padT + plotH - y(prof[i])).toFixed(1)}" fill="#38bdf8" opacity=".85" rx="1"/>`;
    }
    for (const w of drawWindows(prof)) {
      if (w.sum >= 5) s += `<text x="${x(w.pk) + bw / 2}" y="${Math.max(12, y(prof[w.pk]) - 6).toFixed(1)}" fill="#9bdcff" font-size="${peakFont}" font-weight="700" text-anchor="middle">${drawTypeSymbol(w.sum)} ${Math.round(w.sum)} L</text>`;
    }
    s += `<text x="${padL - 4}" y="${padT + 8}" fill="#6b7785" font-size="${axisFont}" text-anchor="end">L</text>`;
    s += '</svg>';
    return s;
  }

  render() {
    const lang = this.lang;
    const compact = this.compact;
    const heading = t('boiler.draw_map.heading', lang);
    if (!this.data || this.data.weekly.length === 0) {
      return html`<div class="card" data-testid="boiler-draw-map">
        <div class="heading">${heading}</div>
        <div class="empty-state">${t('boiler.draw_map.empty', lang)}</div>
      </div>`;
    }

    const prof = pickProfile(this.data.profiles, this.dayType, this.month);
    const profArr = prof?.slotsLitersP90 ?? [];
    const wins = drawWindows(profArr).filter(w => w.sum >= 5).sort((a, b) => b.sum - a.sum);
    const chipCap = compact ? 2 : 4;

    return html`
      <div class="card" data-testid="boiler-draw-map">
        <div class="heading">${heading}</div>
        <div class="cap">${t('boiler.draw_map.heatmap_cap', lang)}</div>
        <div class="svg-wrap">${unsafeHTML(this._heatmapSvg())}</div>
        <div class="scalebar"><span>${t('boiler.draw_map.scale_low', lang)}</span><div class="grad"></div><span>${t('boiler.draw_map.scale_high', lang)}</span></div>

        <div class="divider"></div>

        <div class="prof-head">
          <div class="heading" style="margin:0">${t('boiler.draw_map.profile_heading', lang)}</div>
          <div class="toggle">
            <button class=${this.dayType === 'workday' ? 'on' : ''} @click=${() => { this.dayType = 'workday'; }}>${t('boiler.draw_map.workday', lang)}</button>
            <button class=${this.dayType === 'weekend' ? 'on' : ''} @click=${() => { this.dayType = 'weekend'; }}>${t('boiler.draw_map.weekend', lang)}</button>
          </div>
        </div>
        <div class="cap">${t('boiler.draw_map.profile_cap', lang)}</div>
        ${profArr.length
          ? html`<div class="svg-wrap">${unsafeHTML(this._profileSvg(profArr))}</div>`
          : html`<div class="empty-state">${t('boiler.draw_map.no_profile', lang)}</div>`}
        ${wins.length ? html`
          <div class="chips">
            <span class="lbl">${t('boiler.draw_map.biggest', lang)}</span>
            ${wins.slice(0, chipCap).map(w => html`<span class="chip">${drawTypeSymbol(w.sum)} ${slotLabel(w.s)} · <b>${Math.round(w.sum)} L</b></span>`)}
          </div>` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-draw-map': OigBoilerDrawMap;
  }
}
