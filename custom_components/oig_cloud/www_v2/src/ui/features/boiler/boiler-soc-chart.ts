// ============================================================================
// 📊 SoC graf — připravená voda (L) + nabíjení po zdrojích + odběr + teplota
// ============================================================================
//
// Component: oig-boiler-soc-chart
// The "boiler as a battery" view: top band = SoC (ready ≥40 °C litres) curve
// over the plan horizon; bottom band = energy flow (charge stacked by source
// up, draws down); overlaid temperature line; overflow-forecast shading;
// NOW + deadline markers. Reference: mockup-v8 SoC chart.
// ============================================================================

import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { CSS_VARS } from '@/ui/theme';
import { t, type Lang } from '@/i18n/boiler';
import type { BoilerV2PlanSlot } from './types';

const u = unsafeCSS;

export interface SocSeries {
  times: number[];      // epoch ms per slot start
  liters: (number | null)[];
  fve: number[];
  grid: number[];
  battery: number[];
  alt: number[];
  draw: number[];
  temp: (number | null)[];
  overflow: boolean[];
}

const SRC = ['fve', 'grid', 'battery', 'alt'] as const;

export function buildSocSeries(slots: BoilerV2PlanSlot[]): SocSeries {
  const s: SocSeries = { times: [], liters: [], fve: [], grid: [], battery: [], alt: [], draw: [], temp: [], overflow: [] };
  for (const sl of slots) {
    const pv = sl.pvKwh ?? 0, gr = sl.gridKwh ?? 0, al = sl.altKwh ?? 0;
    const heat = sl.heatingKwh ?? 0;
    const batt = Math.max(0, heat - pv - gr - al);
    s.times.push(new Date(sl.start).getTime());
    s.liters.push(sl.readyLiters ?? null);
    s.fve.push(pv); s.grid.push(gr); s.battery.push(batt); s.alt.push(al);
    s.draw.push(sl.consumptionKwh ?? 0);
    s.temp.push(sl.expectedTempTopC ?? null);
    s.overflow.push(!!sl.overflowAvailable);
  }
  return s;
}

const COL = { fve: '#ffb300', grid: '#38a3ff', battery: '#a78bfa', alt: '#ff6a3d', draw: '#38bdf8', temp: '#ff7a45', soc: '#22d3ee', ov: '#ffd54f', ok: '#5eead4' };

@customElement('oig-boiler-soc-chart')
export class OigBoilerSocChart extends LitElement {
  @property({ attribute: false }) planSlots: BoilerV2PlanSlot[] = [];
  @property({ type: Number }) capacityLiters = 200;
  @property({ type: Number }) nowLiters: number | null = null;
  @property({ type: Boolean }) drivesPlan = true;
  @property({ type: String }) lang: Lang = 'cs';

  static styles = css`
    :host { display: block; }
    .card { background: ${u(CSS_VARS.cardBg)}; border-radius: 14px; box-shadow: ${u(CSS_VARS.cardShadow)}; padding: 16px 18px; }
    .hd { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
    .ttl { font-size: 14px; font-weight: 600; color: ${u(CSS_VARS.textPrimary)}; }
    .badge { font-size: 10.5px; padding: 2px 8px; border-radius: 7px; font-weight: 600; margin-left: auto; }
    .badge.ok { background: rgba(94,234,212,.16); color: #2e9c89; }
    .badge.learn { background: rgba(255,179,0,.18); color: #b7791f; }
    .svg-wrap { width: 100%; overflow-x: auto; }
    .svg-wrap svg { display: block; width: 100%; height: auto; min-width: 340px; }
    .legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; font-size: 11px; color: ${u(CSS_VARS.textSecondary)}; }
    .legend i { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
    .legend .soc { background: linear-gradient(90deg,#22d3ee,#0891b2); }
    .legend .ov { background: ${u(COL.ov)}; opacity: .6; }
    .legend .lnT { width: 16px; height: 0; border-top: 2px solid ${u(COL.temp)}; display: inline-block; margin-right: 5px; vertical-align: 3px; }
    .empty-state { text-align: center; padding: 24px 0; color: ${u(CSS_VARS.textSecondary)}; font-size: 13px; }
  `;

  private _svg(series: SocSeries): string {
    const N = series.times.length;
    const CAP = Math.max(1, this.capacityLiters);
    const W = 960, padL = 40, padR = 38, padT = 14, gap = 10, socH = 150, flowH = 120, axisH = 22;
    const H = padT + socH + gap + flowH + axisH, plotW = W - padL - padR;
    const socBot = padT + socH, flowTop = socBot + gap;
    const zeroY = flowTop + flowH * 0.6, flowBot = flowTop + flowH;
    const bw = plotW / N, x = (i: number) => padL + i * bw;
    const yL = (v: number) => socBot - (v / CAP) * socH;
    const maxUp = Math.max(0.4, ...SRC.map(k => Math.max(...series[k]))) * 1.05;
    const maxDn = Math.max(0.3, ...series.draw) * 1.05;
    const upH = zeroY - flowTop, dnH = flowBot - zeroY;
    const yUp = (v: number) => zeroY - (v / maxUp) * upH;
    const yDn = (v: number) => zeroY + (v / maxDn) * dnH;
    const temps = series.temp.filter((v): v is number => v != null);
    const tMin = 20, tMax = Math.max(72, ...temps);
    const yT = (v: number) => socBot - ((v - tMin) / (tMax - tMin)) * socH;

    const t0 = series.times[0] ?? 0;
    const hourOf = (i: number) => new Date(series.times[i] ?? t0).getHours();

    let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="bsocg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity=".55"/><stop offset="1" stop-color="#0891b2" stop-opacity=".06"/></linearGradient></defs>`;

    // overflow shading (contiguous true runs)
    let oi = 0;
    while (oi < N) {
      if (series.overflow[oi]) {
        let j = oi; while (j < N && series.overflow[j]) j++;
        s += `<rect x="${x(oi)}" y="${padT}" width="${x(j) - x(oi)}" height="${socH + gap + flowH}" fill="${COL.ov}" opacity=".1"/>`;
        oi = j;
      } else oi++;
    }

    // hour gridlines + labels (every 3h boundary)
    for (let i = 0; i < N; i++) {
      if (hourOf(i) % 3 === 0 && (i === 0 || hourOf(i) !== hourOf(i - 1))) {
        const xx = x(i);
        s += `<line x1="${xx}" y1="${padT}" x2="${xx}" y2="${flowBot}" stroke="rgba(255,255,255,.05)"/><text x="${xx}" y="${H - 6}" fill="#6b7785" font-size="10" text-anchor="middle">${String(hourOf(i)).padStart(2, '0')}:00</text>`;
      }
    }
    // SoC y-axis labels
    [0, Math.round(CAP / 2), CAP].forEach(v => { s += `<text x="${padL - 4}" y="${yL(v) + 3}" fill="#6b7785" font-size="9" text-anchor="end">${v}L</text>`; });

    // SoC area + line
    const pts: Array<[number, number]> = [];
    series.liters.forEach((v, i) => { if (v != null) pts.push([x(i) + bw / 2, yL(v)]); });
    if (pts.length) {
      let area = `M${pts[0][0].toFixed(1)} ${socBot}`;
      for (const [px, py] of pts) area += ` L${px.toFixed(1)} ${py.toFixed(1)}`;
      area += ` L${pts[pts.length - 1][0].toFixed(1)} ${socBot} Z`;
      s += `<path d="${area}" fill="url(#bsocg)"/>`;
      let line = '';
      pts.forEach(([px, py], i) => { line += (i ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1) + ' '; });
      s += `<path d="${line}" fill="none" stroke="${COL.soc}" stroke-width="2.6"/>`;
    }
    // now anchor dot
    if (this.nowLiters != null) {
      s += `<circle cx="${x(0) + bw / 2}" cy="${yL(this.nowLiters)}" r="3.5" fill="#fff"/>`;
    }

    // temperature line
    let dT = '', started = false;
    series.temp.forEach((v, i) => { if (v != null) { dT += (started ? 'L' : 'M') + (x(i) + bw / 2).toFixed(1) + ' ' + yT(v).toFixed(1) + ' '; started = true; } });
    if (started) s += `<path d="${dT}" fill="none" stroke="${COL.temp}" stroke-width="1.3" opacity=".75"/>`;
    [40, 60].forEach(v => { if (v >= tMin && v <= tMax) s += `<text x="${padL + plotW + 4}" y="${yT(v) + 3}" fill="${COL.temp}" font-size="8" opacity=".6">${v}°</text>`; });

    // flow band: zero line + stacked charge up + draw down
    s += `<line x1="${padL}" y1="${zeroY}" x2="${padL + plotW}" y2="${zeroY}" stroke="rgba(255,255,255,.12)"/>`;
    for (let i = 0; i < N; i++) {
      let acc = 0;
      for (const k of SRC) {
        const v = series[k][i];
        if (v > 0.001) { const y0 = yUp(acc), y1 = yUp(acc + v); s += `<rect x="${(x(i) + 0.3).toFixed(1)}" y="${y1.toFixed(1)}" width="${(bw - 0.6).toFixed(1)}" height="${(y0 - y1).toFixed(1)}" fill="${COL[k]}" opacity=".9"/>`; acc += v; }
      }
      if (series.draw[i] > 0.001) { const y1 = yDn(series.draw[i]); s += `<rect x="${(x(i) + 0.3).toFixed(1)}" y="${zeroY}" width="${(bw - 0.6).toFixed(1)}" height="${(y1 - zeroY).toFixed(1)}" fill="${COL.draw}" opacity=".8"/>`; }
    }
    s += `<text x="${padL - 4}" y="${flowTop + 10}" fill="#6b7785" font-size="8" text-anchor="end">${t('boiler.soc.charging', this.lang)}</text>`;
    s += `<text x="${padL - 4}" y="${flowBot - 2}" fill="#6b7785" font-size="8" text-anchor="end">${t('boiler.soc.draw', this.lang)}</text>`;

    // NOW marker (left edge — plan is forward-only)
    s += `<line x1="${x(0)}" y1="${padT}" x2="${x(0)}" y2="${flowBot}" stroke="#fff" stroke-width="1.5"/><text x="${x(0) + 12}" y="${padT + 10}" fill="#fff" font-size="9">${t('boiler.soc.now', this.lang)}</text>`;
    s += '</svg>';
    return s;
  }

  render() {
    const lang = this.lang;
    const heading = `📊 ${t('boiler.soc.heading', lang)}`;
    const slots = this.planSlots ?? [];
    if (slots.length === 0) {
      return html`<div class="card" data-testid="boiler-soc-chart"><div class="hd"><span class="ttl">${heading}</span></div><div class="empty-state">${t('boiler.soc.empty', lang)}</div></div>`;
    }
    const series = buildSocSeries(slots);
    return html`
      <div class="card" data-testid="boiler-soc-chart">
        <div class="hd">
          <span class="ttl">${heading}</span>
          ${this.drivesPlan
            ? html`<span class="badge ok">${t('boiler.demand_map.drives_plan', lang)}</span>`
            : html`<span class="badge learn">${t('boiler.demand_map.learning', lang)}</span>`}
        </div>
        <div class="svg-wrap">${unsafeHTML(this._svg(series))}</div>
        <div class="legend">
          <span><i class="soc"></i>${t('boiler.soc.legend_soc', lang)}</span>
          <span><i style="background:${u(COL.fve)}"></i>${t('boiler.plan.src_fve', lang)}</span>
          <span><i style="background:${u(COL.grid)}"></i>${t('boiler.plan.src_grid', lang)}</span>
          <span><i style="background:${u(COL.battery)}"></i>${t('boiler.plan.src_battery', lang)}</span>
          <span><i style="background:${u(COL.alt)}"></i>${t('boiler.soc.legend_draw', lang)}</span>
          <span><i class="ov"></i>${t('boiler.soc.legend_overflow', lang)}</span>
          <span><span class="lnT"></span>${t('boiler.soc.legend_temp', lang)}</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-soc-chart': OigBoilerSocChart;
  }
}
