/**
 * Car tab: what the planner does with the car's charging and why.
 */

import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import {
  evStatus,
  formatTime,
  priceLevel,
  profileRows,
  type EvData,
  type EvSlot,
} from '@/data/ev-data';

const u = unsafeCSS;

@customElement('oig-ev-tab')
export class OigEvTab extends LitElement {
  @property({ type: Object }) data: EvData | null = null;
  @property({ type: Boolean }) loading = false;

  static styles = css`
    :host { display: block; font-family: ${u(CSS_VARS.fontFamily)}; color: ${u(CSS_VARS.textPrimary)}; }
    .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
    .card { background: ${u(CSS_VARS.cardBg)}; border-radius: 12px; padding: 14px 16px; box-shadow: ${u(CSS_VARS.cardShadow)}; }
    .label { font-size: 0.78rem; color: ${u(CSS_VARS.textSecondary)}; text-transform: uppercase; letter-spacing: 0.04em; }
    .value { font-size: 1.6rem; font-weight: 600; margin-top: 4px; }
    .sub { font-size: 0.85rem; color: ${u(CSS_VARS.textSecondary)}; margin-top: 2px; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-weight: 600; font-size: 0.9rem; }
    .status.charging { background: rgba(76, 175, 80, 0.2); color: #4caf50; }
    .status.waiting { background: rgba(33, 150, 243, 0.18); color: #2196f3; }
    .status.done { background: rgba(76, 175, 80, 0.12); color: ${u(CSS_VARS.textPrimary)}; }
    .status.shortfall { background: rgba(244, 67, 54, 0.18); color: #f44336; }
    .status.unplugged, .status.unknown { background: rgba(158, 158, 158, 0.2); color: ${u(CSS_VARS.textSecondary)}; }
    section { margin-top: 14px; }
    h3 { margin: 0 0 8px; font-size: 1rem; }
    .strip { display: flex; height: 72px; align-items: flex-end; gap: 1px; }
    .slot { flex: 1 1 0; position: relative; height: 100%; border-radius: 2px; min-width: 2px; }
    .slot .bar { position: absolute; left: 0; right: 0; bottom: 0; background: #4caf50; border-radius: 2px; }
    .slot .bar.pv { background: #ff9800; }
    .axis { display: flex; justify-content: space-between; font-size: 0.75rem; color: ${u(CSS_VARS.textSecondary)}; margin-top: 4px; }
    .legend { display: flex; gap: 14px; font-size: 0.8rem; color: ${u(CSS_VARS.textSecondary)}; margin-top: 6px; flex-wrap: wrap; }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid ${u(CSS_VARS.divider)}; }
    th { color: ${u(CSS_VARS.textSecondary)}; font-weight: 500; }
    .empty { padding: 24px; text-align: center; color: ${u(CSS_VARS.textSecondary)}; }
  `;

  private renderStrip(slots: EvSlot[]) {
    if (!slots.length) return html`<div class="empty">Do odjezdu nejsou žádné sloty s cenou.</div>`;
    const prices = slots.map((s) => s.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const maxKwh = Math.max(...slots.map((s) => s.energy_kwh), 0.01);
    return html`
      <div class="strip" data-testid="ev-strip">
        ${slots.map((s) => {
          const level = priceLevel(s.price, min, max);
          const bg = `rgba(${Math.round(60 + 190 * level)}, ${Math.round(185 - 125 * level)}, 80, 0.6)`;
          const h = (s.energy_kwh / maxKwh) * 100;
          const title = `${formatTime(s.start)} · ${s.price.toFixed(2)} Kč/kWh${s.energy_kwh > 0 ? ` · ${s.energy_kwh.toFixed(2)} kWh` : ''}${s.estimated ? ' · odhad ceny' : ''}`;
          return html`<div class="slot" style="background:${bg}" title=${title}>
            ${s.energy_kwh > 0 ? html`<div class="bar ${s.pv_kwh > s.grid_kwh ? 'pv' : ''}" style="height:${h}%"></div>` : nothing}
          </div>`;
        })}
      </div>
      <div class="axis">
        <span>${formatTime(slots[0].start)}</span>
        <span data-testid="ev-price-range">${min.toFixed(2)}–${max.toFixed(2)} Kč/kWh</span>
        <span>${formatTime(slots[slots.length - 1].start)}</span>
      </div>
      <div class="legend">
        <span><span class="dot" style="background:rgba(60,185,80,0.6)"></span>levná elektřina</span>
        <span><span class="dot" style="background:rgba(250,60,80,0.6)"></span>drahá elektřina</span>
        <span><span class="dot" style="background:#4caf50"></span>nabíjení ze sítě</span>
        <span><span class="dot" style="background:#ff9800"></span>nabíjení z přetoku</span>
      </div>
    `;
  }

  render() {
    const data = this.data;
    if (!data) {
      return html`<div class="empty">${this.loading ? 'Načítání plánu auta…' : 'Plán auta není k dispozici.'}</div>`;
    }
    if (!data.enabled) {
      return html`<div class="empty">Auto není zapnuté. Zapnete ho v Nastavení → Moduly → Elektroauto.</div>`;
    }
    const plan = data.plan;
    const status = evStatus(data);
    const soc = data.car?.soc_pct;
    const timeline = plan?.timeline ?? [];
    return html`
      <div class="grid">
        <div class="card">
          <div class="label">Stav</div>
          <div class="value"><span class="status ${status.key}" data-testid="ev-status">${status.label}</span></div>
          <div class="sub">${data.car?.plugged_in === false ? 'nepřipojeno' : data.car?.plugged_in ? 'připojeno' : ''}</div>
        </div>
        <div class="card">
          <div class="label">Nabití</div>
          <div class="value">${soc != null ? `${Math.round(soc)} %` : '—'}</div>
          <div class="sub">cíl ${plan ? `${Math.round(plan.target_soc_pct)} %` : '—'}${data.car?.capacity_kwh ? ` · ${data.car.capacity_kwh} kWh na 100 %` : ''}</div>
        </div>
        <div class="card">
          <div class="label">Odjezd</div>
          <div class="value">${formatTime(plan?.deadline ?? data.next_departure)}</div>
          <div class="sub">potřeba ${data.need_pct != null ? `${Math.round(data.need_pct)} %` : '—'}</div>
        </div>
        <div class="card">
          <div class="label">Nabíjení</div>
          <div class="value">${plan ? `${plan.planned_kwh.toFixed(1)} kWh` : '—'}</div>
          <div class="sub">${plan?.next_start ? `od ${formatTime(plan.next_start)}` : 'nic naplánováno'}${plan && plan.cost_czk > 0 ? ` · ${plan.cost_czk.toFixed(0)} Kč` : ''}</div>
        </div>
      </div>

      ${plan && plan.shortfall_kwh > 0 ? html`<section class="card">Do odjezdu se nestihne ${plan.shortfall_kwh.toFixed(1)} kWh (jistič nebo čas). Auto pojede část na benzín.</section>` : nothing}

      <section class="card">
        <h3>Plán do odjezdu</h3>
        ${this.renderStrip(timeline)}
      </section>

      <section class="card">
        <h3>Profil jízd (posledních 8 týdnů)</h3>
        <table data-testid="ev-profile">
          <tr><th>Den</th><th>Odjezd</th><th>Potřeba</th><th>Dní</th></tr>
          ${profileRows(data.profile).map((r) => html`<tr><td>${r.day}</td><td>${r.departure}</td><td>${r.needPct} %</td><td>${r.samples}</td></tr>`)}
        </table>
        <div class="sub">Odjezd je ranní kvartil prvních jízd, potřeba pokryje 4 dny z 5. Aktualizováno ${formatTime(data.profile_updated_at)}.</div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-ev-tab': OigEvTab;
  }
}
