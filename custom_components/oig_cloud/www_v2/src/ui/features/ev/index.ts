/**
 * Car tab: one page that answers "when does the car charge?" first, then lets
 * the user change the next drive (charge now / by a time), the next days
 * (holidays, home, trips, vacations) and, behind one button, the setup.
 */

import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import {
  addVacation,
  dayTitle,
  departureText,
  discoverEntities,
  DISCOVERY_ROLES,
  evHeadline,
  hhmm,
  initialChoices,
  preconditionText,
  profileRows,
  reasonText,
  removeVacation,
  saveEvSettings,
  setChargeMode,
  setDay,
  wizardValues,
  type DayKind,
  type Discovery,
  type EvData,
  type EvDay,
} from '@/data/ev-data';

const u = unsafeCSS;

const GROUPS: { title: string; roles: string[] }[] = [
  { title: 'Auto', roles: ['ev_soc_entity', 'ev_plugged_entity', 'ev_charge_limit_entity'] },
  { title: 'Nabíječka', roles: ['ev_charger_power_entity', 'ev_switch_entity', 'ev_current_entity'] },
  { title: 'Topení před odjezdem', roles: ['ev_climate_entity', 'ev_window_heating_entity', 'ev_outside_temp_entity'] },
];

const CONTROL_TEXT: Record<string, string> = {
  none: 'Nabíjení spíná vaše automatizace',
  wallbox: 'Nabíjení spíná nabíječka',
  car: 'Nabíjení spíná auto přes cloud',
};

const DAY_OPTIONS: { kind: DayKind | null; label: string; hint: string }[] = [
  { kind: null, label: 'Podle jízd', hint: 'odjezd a spotřeba z posledních 12 týdnů' },
  { kind: 'home', label: 'Jsem doma', hint: 'auto se nabije jen z levných přetoků' },
  { kind: 'workday', label: 'Jako pracovní den', hint: 'i o svátku nebo víkendu' },
  { kind: 'dayoff', label: 'Jako neděle', hint: 'pozdější odjezd, menší spotřeba' },
];

function dayChip(day: EvDay): { time: string; tag: string; tone: string } {
  if (day.source === 'vacation') return { time: 'doma', tag: 'dovolená', tone: 'green' };
  if (day.source === 'home') return { time: 'doma', tag: 'doma', tone: 'green' };
  const time = day.departure ? hhmm(day.departure) : '—';
  if (day.source === 'trip') return { time, tag: 'cesta', tone: 'blue' };
  if (day.source === 'holiday') return { time, tag: 'svátek', tone: 'orange' };
  if (day.source === 'workday') return { time, tag: 'pracovní', tone: 'blue' };
  if (day.source === 'dayoff') return { time, tag: 'volno', tone: 'blue' };
  return { time, tag: '', tone: '' };
}

@customElement('oig-ev-tab')
export class OigEvTab extends LitElement {
  @property({ type: Object }) data: EvData | null = null;
  @property({ type: Boolean }) loading = false;

  @state() private byTime = '05:00';
  @state() private busy = false;
  @state() private message = '';
  @state() private selectedDate: string | null = null;
  @state() private week = 0;
  @state() private tripTime = '07:00';
  @state() private addingVacation = false;
  @state() private vacStart = '';
  @state() private vacEnd = '';
  @state() private settingsOpen = false;
  @state() private discovery: Discovery | null = null;
  @state() private discovering = false;
  @state() private chosen: Record<string, string> = {};
  @state() private wizardControl = true;
  @state() private wizardHeating = true;
  @state() private targetLimit = 0;
  @state() private setCarLimit = false;

  static styles = css`
    :host { display: block; font-family: ${u(CSS_VARS.fontFamily)}; color: ${u(CSS_VARS.textPrimary)}; --blue: #2f7df6; --orange: #f08c2e; --green: #3fb27f; }
    .card { background: ${u(CSS_VARS.cardBg)}; border-radius: 14px; padding: 18px 20px; box-shadow: ${u(CSS_VARS.cardShadow)}; margin-bottom: 14px; }
    .muted { color: ${u(CSS_VARS.textSecondary)}; }
    .small { font-size: 0.85rem; }
    h2 { margin: 0; font-size: 1.05rem; font-weight: 600; }
    button { font: inherit; cursor: pointer; border-radius: 10px; border: 1px solid ${u(CSS_VARS.divider)};
      background: transparent; color: ${u(CSS_VARS.textPrimary)}; padding: 8px 14px; min-height: 40px; }
    button:disabled { opacity: 0.5; cursor: default; }
    button.link { border: 0; padding: 4px 0; min-height: 0; color: var(--blue); }
    button.primary { background: var(--blue); border-color: var(--blue); color: #fff; }
    input, select { font: inherit; padding: 7px 10px; border-radius: 10px; border: 1px solid ${u(CSS_VARS.divider)};
      background: ${u(CSS_VARS.cardBg)}; color: ${u(CSS_VARS.textPrimary)}; min-height: 40px; box-sizing: border-box; }
    .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

    /* hero */
    .hero { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start; }
    .hero-main { flex: 1 1 360px; min-width: 0; }
    .pill { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
    .pill::before { content: ''; width: 8px; height: 8px; border-radius: 4px; background: currentColor; }
    .tone-charging { color: var(--green); background: rgba(63, 178, 127, 0.15); }
    .tone-waiting { color: var(--blue); background: rgba(47, 125, 246, 0.15); }
    .tone-ready { color: var(--green); background: rgba(63, 178, 127, 0.12); }
    .tone-warn { color: #e5534b; background: rgba(229, 83, 75, 0.15); }
    .tone-idle { color: ${u(CSS_VARS.textSecondary)}; background: rgba(150, 150, 150, 0.15); }
    .title { font-size: 1.6rem; font-weight: 650; margin: 8px 0 4px; line-height: 1.2; }
    .soc { margin-top: 16px; }
    .soc-track { position: relative; height: 12px; border-radius: 6px; background: rgba(150, 150, 150, 0.22); }
    .soc-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 6px; background: var(--green); }
    .soc-target { position: absolute; top: -4px; bottom: -4px; width: 3px; border-radius: 2px; background: ${u(CSS_VARS.textPrimary)}; }
    .soc-labels { display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.85rem; }
    .departure { flex: 0 0 auto; min-width: 200px; padding: 12px 16px; border-radius: 12px; background: rgba(150, 150, 150, 0.1); }
    .departure .big { font-size: 1.4rem; font-weight: 650; margin: 4px 0 2px; }
    .choice { margin-top: 18px; padding-top: 16px; border-top: 1px solid ${u(CSS_VARS.divider)}; }
    .seg { display: inline-flex; padding: 3px; gap: 3px; border-radius: 12px; background: rgba(150, 150, 150, 0.15); flex-wrap: wrap; }
    .seg button { border: 0; border-radius: 9px; min-height: 36px; }
    .seg button[aria-pressed='true'] { background: ${u(CSS_VARS.cardBgSolid)}; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25); font-weight: 600; }
    .msg { margin-top: 8px; font-size: 0.85rem; color: ${u(CSS_VARS.textSecondary)}; }

    /* timeline */
    .bars { display: flex; align-items: flex-end; gap: 3px; height: 120px; margin-top: 14px; }
    .bar { flex: 1 1 0; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; min-width: 0; }
    .bar .kwh { font-size: 0.7rem; color: var(--blue); font-weight: 600; white-space: nowrap; margin-bottom: 2px; }
    .bar .fill { width: 100%; border-radius: 4px 4px 0 0; background: rgba(150, 150, 150, 0.35); }
    .bar.charging .fill { background: var(--blue); }
    .bar.pv .fill { background: var(--orange); }
    .bar.pv .kwh { color: var(--orange); }
    .bar.estimated .fill { opacity: 0.55; }
    .hours { display: flex; gap: 3px; margin-top: 4px; }
    .bars.slots, .hours.slots { gap: 1px; }
    .bars.slots .bar .fill { border-radius: 1px 1px 0 0; }
    .hours span { flex: 1 1 0; text-align: center; font-size: 0.72rem; color: ${u(CSS_VARS.textSecondary)}; min-width: 0; overflow: visible; white-space: nowrap; }
    .legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; font-size: 0.8rem; color: ${u(CSS_VARS.textSecondary)}; }
    .sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }

    /* days */
    .days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
    .day { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 10px; text-align: left; min-height: 74px; }
    .day[aria-pressed='true'] { border-color: var(--blue); background: rgba(47, 125, 246, 0.12); }
    .day .d { font-size: 0.8rem; color: ${u(CSS_VARS.textSecondary)}; white-space: nowrap; }
    .day .t { font-size: 1.1rem; font-weight: 650; }
    .day .t.past { color: ${u(CSS_VARS.textSecondary)}; font-weight: 400; text-decoration: line-through; }
    .trip { grid-column: 1 / -1; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 8px 14px; border-radius: 10px; border: 1px solid ${u(CSS_VARS.divider)}; }
    .trip.on { border-color: var(--blue); background: rgba(47, 125, 246, 0.12); }
    .tag { font-size: 0.7rem; font-weight: 600; padding: 1px 7px; border-radius: 999px; }
    .tag.orange { color: var(--orange); background: rgba(240, 140, 46, 0.15); }
    .tag.green { color: var(--green); background: rgba(63, 178, 127, 0.15); }
    .tag.blue { color: var(--blue); background: rgba(47, 125, 246, 0.15); }
    .editor { margin-top: 14px; padding: 16px; border-radius: 12px; background: rgba(150, 150, 150, 0.08); }
    .options { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; margin-top: 10px; }
    .option { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: left; }
    .option[aria-pressed='true'] { border-color: var(--blue); background: rgba(47, 125, 246, 0.12); }
    .option .hint { font-size: 0.78rem; color: ${u(CSS_VARS.textSecondary)}; }
    .vacations { margin-top: 14px; padding-top: 12px; border-top: 1px solid ${u(CSS_VARS.divider)}; }
    .vac { display: inline-flex; align-items: center; gap: 8px; padding: 4px 6px 4px 12px; border-radius: 999px; background: rgba(63, 178, 127, 0.15); margin-right: 8px; }
    .vac button { min-height: 28px; padding: 2px 8px; border: 0; }

    /* footer + settings */
    .footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 0.88rem; color: ${u(CSS_VARS.textSecondary)}; padding: 0 4px 12px; }
    .group { margin-top: 16px; }
    .group h3 { margin: 0 0 6px; font-size: 0.95rem; }
    .field { display: grid; grid-template-columns: 170px 1fr; gap: 4px 14px; align-items: center; padding: 8px 0; border-top: 1px solid ${u(CSS_VARS.divider)}; }
    .field select { width: 100%; }
    .field .why { grid-column: 2; font-size: 0.78rem; color: ${u(CSS_VARS.textSecondary)}; }
    label.check { display: flex; gap: 10px; align-items: center; margin-top: 10px; }
    label.check input { min-height: auto; width: 18px; height: 18px; }
    details { margin-top: 16px; }
    summary { cursor: pointer; color: var(--blue); }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; margin-top: 8px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid ${u(CSS_VARS.divider)}; }
    th { color: ${u(CSS_VARS.textSecondary)}; font-weight: 500; }
    .empty { padding: 28px; text-align: center; color: ${u(CSS_VARS.textSecondary)}; }

    @media (max-width: 720px) {
      .departure { flex: 1 1 100%; }
      .days { grid-template-columns: repeat(7, minmax(84px, 1fr)); overflow-x: auto; }
      .field { grid-template-columns: 1fr; }
      .field .why { grid-column: 1; }
      .title { font-size: 1.35rem; }
    }
  `;

  // ── actions ───────────────────────────────────────────────────────────
  private refresh(): void {
    const fire = () => this.dispatchEvent(new CustomEvent('oig-ev-refresh', { bubbles: true, composed: true }));
    fire();
    // The plan is recomputed a moment after a change.
    window.setTimeout(fire, 4000);
  }

  private async run(action: () => Promise<unknown>, ok: string): Promise<boolean> {
    this.busy = true;
    this.message = '';
    try {
      const res = await action();
      this.message = res ? ok : 'Nepovedlo se uložit. Zkuste to znovu.';
      if (res) this.refresh();
      return Boolean(res);
    } finally {
      this.busy = false;
    }
  }

  private chargeMode(mode: 'plan' | 'now' | 'by'): void {
    const labels = { plan: 'Zpět na plán.', now: 'Nabíjí se hned.', by: `Nabito bude do ${this.byTime}.` };
    void this.run(() => setChargeMode(mode, mode === 'by' ? this.byTime : undefined), labels[mode]);
  }

  private changeDay(day: EvDay, kind: DayKind | null, extra: { departure?: string | null; precondition?: boolean | null } = {}): void {
    const precondition = 'precondition' in extra ? extra.precondition : day.precondition;
    void this.run(() => setDay({ date: day.date, kind, departure: extra.departure ?? null, precondition }), 'Uloženo.');
  }

  private async toggleSettings(): Promise<void> {
    this.settingsOpen = !this.settingsOpen;
    this.message = '';
    if (!this.settingsOpen || this.discovery || this.discovering) return;
    this.discovering = true;
    try {
      const found = await discoverEntities();
      this.discovery = found;
      if (!found) return;
      this.chosen = initialChoices(found);
      const mode = found.current_settings?.ev_control_mode;
      const heating = found.current_settings?.ev_climate_when;
      this.wizardControl = mode ? mode !== 'none' : Boolean(this.chosen.ev_switch_entity);
      this.wizardHeating = heating ? heating !== 'off' : Boolean(this.chosen.ev_climate_entity);
      this.targetLimit = Number(found.current_settings?.ev_target_limit_pct ?? 0) || 0;
      this.setCarLimit = Boolean(found.current_settings?.ev_set_car_limit);
    } finally {
      this.discovering = false;
    }
  }

  private saveSettings(): void {
    if (!this.discovery) return;
    const values = wizardValues(this.chosen, this.discovery, {
      control: this.wizardControl,
      heating: this.wizardHeating,
      targetLimit: this.targetLimit,
      setCarLimit: this.setCarLimit,
    });
    void this.run(async () => {
      const res = await saveEvSettings(values);
      return res.ok ? res : null;
    }, 'Uloženo. Integrace se znovu načte a plán se přepočítá.');
  }

  // ── hero ──────────────────────────────────────────────────────────────
  private renderHero(data: EvData) {
    const head = evHeadline(data);
    const soc = data.car?.soc_pct;
    const target = data.plan?.target_soc_pct;
    const dep = departureText(data.next_day);
    const nextDay = data.next_day;
    const mode = data.charge_override?.mode ?? 'plan';
    return html`
      <section class="card" data-testid="ev-hero">
        <div class="hero">
          <div class="hero-main">
            <span class="pill tone-${head.tone}">${data.car?.plugged_in === false ? 'odpojeno' : data.car?.plugged_in ? 'připojeno' : 'auto'}</span>
            <div class="title" data-testid="ev-status">${head.title}</div>
            <div class="muted">${head.detail}</div>
            ${soc != null ? html`
              <div class="soc" aria-label="Nabití ${Math.round(soc)} %, cíl ${target != null ? Math.round(target) : '—'} %">
                <div class="soc-track">
                  <div class="soc-fill" style="width:${Math.max(0, Math.min(100, soc))}%"></div>
                  ${target != null ? html`<div class="soc-target" style="left:calc(${Math.max(0, Math.min(100, target))}% - 1px)"></div>` : nothing}
                </div>
                <div class="soc-labels"><span><strong>${Math.round(soc)} %</strong> teď</span>${target != null ? html`<span class="muted">${soc >= target ? 'limit nabíjení' : 'cíl'} ${Math.round(target)} %</span>` : nothing}</div>
              </div>` : nothing}
          </div>
          <div class="departure">
            <div class="muted small">Odjezd</div>
            <div class="big">${dep.when}</div>
            <div class="muted small">${dep.why}</div>
            ${nextDay?.source === 'holiday' ? html`
              <button class="link small" data-testid="ev-holiday" ?disabled=${this.busy}
                @click=${() => this.changeDay(nextDay, 'workday')}>Jedu jako v pracovní den</button>` : nothing}
          </div>
        </div>
        <div class="choice" data-testid="ev-charge-choice">
          <div class="row">
            <div class="seg" role="group" aria-label="Kdy nabíjet">
              <button aria-pressed=${mode === 'plan'} ?disabled=${this.busy} @click=${() => this.chargeMode('plan')}>Podle plánu</button>
              <button aria-pressed=${mode === 'now'} ?disabled=${this.busy} @click=${() => this.chargeMode('now')} data-testid="ev-charge-now">Nabít ihned</button>
              <button aria-pressed=${mode === 'by'} ?disabled=${this.busy || !this.byTime} @click=${() => this.chargeMode('by')} data-testid="ev-charge-by">Mít nabito do</button>
            </div>
            <label class="muted small" for="ev-by" style="position:absolute;left:-9999px">Čas</label>
            <input id="ev-by" type="time" .value=${mode === 'by' ? hhmm(data.charge_override?.until) || this.byTime : this.byTime}
              @change=${(e: Event) => { this.byTime = (e.target as HTMLInputElement).value; }}>
          </div>
          <div class="msg" role="status">${this.message || (data.charge_override
            ? `Platí jen pro tuto jízdu, pak zase podle plánu.`
            : 'Plán vybírá nejlevnější hodiny před odjezdem.')}</div>
        </div>
      </section>
    `;
  }

  // ── timeline ──────────────────────────────────────────────────────────
  private renderTimeline(data: EvData) {
    // The plan's own 15-minute slots: the final price (spot, supplier fee,
    // distribution, VAT) the battery planner and the flow use, not recomputed.
    const slots = data.plan?.timeline ?? [];
    if (!slots.length) return nothing;
    const prices = slots.map((s) => s.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const hours = slots.length / 4;
    const every = hours > 48 ? 12 : hours > 24 ? 6 : hours > 12 ? 3 : 1;
    const estimated = slots.some((s) => s.estimated);
    const height = (price: number) => (max > min ? 25 + ((price - min) / (max - min)) * 75 : 60);
    // kWh of each charging block, written over its first slot.
    const blockKwh: Record<number, number> = {};
    let blockStart = -1;
    slots.forEach((s, i) => {
      if (s.energy_kwh > 0.01) {
        if (blockStart < 0) blockStart = i;
        blockKwh[blockStart] = (blockKwh[blockStart] ?? 0) + s.energy_kwh;
      } else {
        blockStart = -1;
      }
    });
    return html`
      <section class="card">
        <div class="row" style="justify-content:space-between">
          <h2>Do odjezdu</h2>
          <span class="muted small" data-testid="ev-price-range">cena ${min.toFixed(2)}–${max.toFixed(2)} Kč/kWh</span>
        </div>
        <div class="bars slots" data-testid="ev-strip">
          ${slots.map((s, i) => {
            const charging = s.energy_kwh > 0.01;
            const pv = charging && s.pv_kwh > s.grid_kwh;
            return html`<div class="bar ${charging ? 'charging' : ''} ${pv ? 'pv' : ''} ${s.estimated ? 'estimated' : ''}"
              title="${hhmm(s.start)} · ${s.price.toFixed(2)} Kč/kWh${charging ? ` · ${s.energy_kwh.toFixed(2)} kWh` : ''}${s.estimated ? ' · odhad ceny' : ''}">
              ${blockKwh[i] !== undefined ? html`<span class="kwh">${blockKwh[i].toFixed(1)}</span>` : nothing}
              <div class="fill" style="height:${height(s.price)}%"></div>
            </div>`;
          })}
        </div>
        <div class="hours slots">${slots.map((s) => {
          const d = new Date(s.start);
          const show = d.getMinutes() === 0 && d.getHours() % every === 0;
          return html`<span>${show ? String(d.getHours()).padStart(2, '0') : ''}</span>`;
        })}</div>
        <div class="legend">
          <span><span class="sw" style="background:var(--blue)"></span>nabíjení ze sítě (kWh za blok)</span>
          <span><span class="sw" style="background:var(--orange)"></span>z přetoků FVE</span>
          <span>sloupec = čtvrthodina, výška = cena včetně distribuce a DPH</span>
          ${estimated ? html`<span>světlé sloupce: ceny ještě nejsou vyhlášené, počítá se s odhadem</span>` : nothing}
        </div>
      </section>
    `;
  }

  // ── days ──────────────────────────────────────────────────────────────
  private renderDayEditor(day: EvDay) {
    const kind = (['home', 'trip', 'workday', 'dayoff'] as const).find((k) => k === day.source) ?? null;
    const keepTrip = kind === 'trip' ? hhmm(day.departure) : null;
    return html`
      <div class="editor" data-testid="ev-day-editor">
        <div class="row" style="justify-content:space-between">
          <strong>${dayTitle(day.date)}${day.holiday ? html` · <span class="muted">${day.holiday}</span>` : nothing}</strong>
          <span class="muted small">${day.departure ? `odjezd ${hhmm(day.departure)}` : 'bez odjezdu'}${day.full_charge ? ', nabít naplno' : ''}</span>
        </div>
        <div class="options">
          ${DAY_OPTIONS.map((o) => html`
            <button class="option" aria-pressed=${kind === o.kind} ?disabled=${this.busy} @click=${() => this.changeDay(day, o.kind)}>
              <span>${o.label}</span><span class="hint">${o.hint}</span>
            </button>`)}
          <div class="trip ${kind === 'trip' ? 'on' : ''}">
            <span>Dlouhá cesta, odjezd</span>
            <input aria-label="Odjezd na cestu" type="time" .value=${keepTrip ?? this.tripTime}
              @change=${(e: Event) => { this.tripTime = (e.target as HTMLInputElement).value; }}>
            <button ?disabled=${this.busy} @click=${() => this.changeDay(day, 'trip', { departure: this.tripTime })}>Nabít naplno</button>
          </div>
        </div>
        <div class="row" style="margin-top:12px">
          <label for="ev-pre" class="small">Topit v autě před odjezdem</label>
          <select id="ev-pre" .value=${day.precondition === true ? 'yes' : day.precondition === false ? 'no' : 'auto'}
            @change=${(e: Event) => {
              const v = (e.target as HTMLSelectElement).value;
              this.changeDay(day, kind, { departure: keepTrip, precondition: v === 'yes' ? true : v === 'no' ? false : null });
            }}>
            <option value="auto">podle nastavení</option>
            <option value="yes">ano</option>
            <option value="no">ne</option>
          </select>
        </div>
      </div>
    `;
  }

  private renderDays(data: EvData) {
    const all = data.days ?? [];
    const days = all.slice(this.week * 7, this.week * 7 + 7);
    const selected = all.find((d) => d.date === this.selectedDate) ?? null;
    const vacations = data.vacations ?? [];
    return html`
      <section class="card">
        <div class="row" style="justify-content:space-between">
          <h2>Příští dny</h2>
          <div class="row">
            <button class="link small" ?disabled=${this.week === 0} @click=${() => { this.week = 0; }}>Tento týden</button>
            <button class="link small" ?disabled=${this.week === 1 || all.length <= 7} @click=${() => { this.week = 1; }}>Další týden</button>
          </div>
        </div>
        <div class="days" data-testid="ev-days">
          ${days.map((d, i) => {
            const chip = dayChip(d);
            const index = this.week * 7 + i;
            const label = index === 0 ? 'Dnes' : index === 1 ? 'Zítra' : dayTitle(d.date);
            const past = Boolean(d.departure) && new Date(d.departure as string).getTime() < Date.now();
            return html`<button class="day" aria-pressed=${d.date === this.selectedDate}
              @click=${() => { this.selectedDate = this.selectedDate === d.date ? null : d.date; this.message = ''; }}>
              <span class="d">${label}</span>
              <span class="t ${past ? 'past' : ''}">${chip.time}</span>
              ${chip.tag ? html`<span class="tag ${chip.tone}">${chip.tag}</span>` : nothing}
            </button>`;
          })}
        </div>
        ${selected ? this.renderDayEditor(selected) : html`<div class="muted small" style="margin-top:10px">Klikněte na den, když pojedete jinak než obvykle. Státní svátky plán bere jako neděli.</div>`}
        <div class="vacations" data-testid="ev-vacations">
          <div class="row">
            <span class="small">Dovolená:</span>
            ${vacations.length
              ? vacations.map(([a, b]) => html`<span class="vac">${dayTitle(a)} – ${dayTitle(b)}
                  <button aria-label="Odebrat dovolenou" ?disabled=${this.busy} @click=${() => this.run(() => removeVacation(a, b), 'Dovolená odebrána.')}>✕</button></span>`)
              : html`<span class="muted small">žádná</span>`}
            ${this.addingVacation ? nothing : html`<button class="link small" @click=${() => { this.addingVacation = true; }}>+ Přidat</button>`}
          </div>
          ${this.addingVacation ? html`
            <div class="row" style="margin-top:8px">
              <input aria-label="Dovolená od" type="date" .value=${this.vacStart} @change=${(e: Event) => { this.vacStart = (e.target as HTMLInputElement).value; }}>
              <span class="muted">až</span>
              <input aria-label="Dovolená do" type="date" .value=${this.vacEnd} @change=${(e: Event) => { this.vacEnd = (e.target as HTMLInputElement).value; }}>
              <button class="primary" ?disabled=${this.busy || !this.vacStart || !this.vacEnd}
                @click=${async () => { if (await this.run(() => addVacation(this.vacStart, this.vacEnd), 'Dovolená přidána.')) this.addingVacation = false; }}>Uložit</button>
              <button @click=${() => { this.addingVacation = false; }}>Zrušit</button>
            </div>
            <div class="muted small" style="margin-top:6px">Ve dnech dovolené se auto nabíjí jen z levných přetoků.</div>` : nothing}
        </div>
      </section>
    `;
  }

  // ── settings ──────────────────────────────────────────────────────────
  private renderSettings(data: EvData) {
    if (this.discovering) return html`<section class="card"><div class="empty">Hledám entity auta a nabíječky…</div></section>`;
    const found = this.discovery;
    if (!found) return html`<section class="card"><div class="empty">Entity se nepodařilo načíst.</div></section>`;
    return html`
      <section class="card" data-testid="ev-setup">
        <h2>Nastavení auta</h2>
        <div class="muted small" style="margin-top:4px">Předvyplněno tím, co je nastavené. Prázdná pole doplňuje návrh podle entit v Home Assistantu. Funguje s jakoukoli integrací.</div>
        ${GROUPS.map((g) => html`
          <div class="group">
            <h3>${g.title}</h3>
            ${g.roles.map((key) => {
              const role = DISCOVERY_ROLES.find((r) => r.key === key)!;
              const ranked = found.roles[key] ?? [];
              const configured = found.current?.[key];
              const candidates = configured && !ranked.some((c) => c.entity_id === configured)
                ? [{ entity_id: configured, name: configured, device: '', score: 0, reasons: [] }, ...ranked]
                : ranked;
              const value = this.chosen[key] ?? '';
              const pick = candidates.find((c) => c.entity_id === value);
              const why = value && value === configured ? 'nastaveno' : pick ? `návrh: ${reasonText(pick.reasons)}` : '';
              return html`<div class="field">
                <label for="role-${key}">${role.label}</label>
                <select id="role-${key}" .value=${value}
                  @change=${(e: Event) => { this.chosen = { ...this.chosen, [key]: (e.target as HTMLSelectElement).value }; }}>
                  <option value="" ?selected=${!value}>${candidates.length ? 'nepoužívat' : 'nic nenalezeno'}</option>
                  ${candidates.map((c) => html`<option value=${c.entity_id} ?selected=${c.entity_id === value}>${c.name || c.entity_id}</option>`)}
                </select>
                <div class="why">${value}${why ? ` · ${why}` : ''}</div>
              </div>`;
            })}
          </div>`)}
        <div class="group" data-testid="ev-target-limit">
          <h3>Kam nabíjet</h3>
          <div class="field">
            <label for="ev-target">Nabíjet do</label>
            <select id="ev-target" .value=${String(this.targetLimit)}
              @change=${(e: Event) => { this.targetLimit = Number((e.target as HTMLSelectElement).value); }}>
              <option value="0" ?selected=${this.targetLimit === 0}>podle limitu v autě</option>
              ${[50, 60, 70, 80, 90, 100].map((v) => html`<option value=${String(v)} ?selected=${this.targetLimit === v}>${v} %</option>`)}
            </select>
            <div class="why">Plán počítá s tímto cílem místo limitu nastaveného v autě.</div>
          </div>
          <label class="check"><input type="checkbox" .checked=${this.setCarLimit} ?disabled=${!this.targetLimit || !this.chosen.ev_charge_limit_entity}
            @change=${(e: Event) => { this.setCarLimit = (e.target as HTMLInputElement).checked; }}>
            Před každým nabíjením nastavit tento limit i v autě (auto si ho po nabití vrací)</label>
          ${this.targetLimit && !this.setCarLimit ? html`<div class="muted small" style="margin-top:6px">Bez přepínače auto skončí na svém limitu, plán s tím počítá.</div>` : nothing}
        </div>
        <label class="check"><input type="checkbox" .checked=${this.wizardControl} ?disabled=${!this.chosen.ev_switch_entity}
          @change=${(e: Event) => { this.wizardControl = (e.target as HTMLInputElement).checked; }}>
          Integrace sama spíná nabíjení podle plánu</label>
        <label class="check"><input type="checkbox" .checked=${this.wizardHeating} ?disabled=${!this.chosen.ev_climate_entity}
          @change=${(e: Event) => { this.wizardHeating = (e.target as HTMLInputElement).checked; }}>
          V zimě pustit topení před odjezdem</label>
        <div class="row" style="margin-top:16px">
          <button class="primary" ?disabled=${this.busy || !this.chosen.ev_soc_entity} @click=${() => this.saveSettings()} data-testid="ev-setup-save">Uložit</button>
          <button @click=${() => { this.settingsOpen = false; }}>Zavřít</button>
          <span class="muted small">Proud, teplota, minuty předem a jistič: Nastavení → Baterie a plánovač.</span>
        </div>
        ${this.message ? html`<div class="msg" role="status">${this.message}</div>` : nothing}
        <details>
          <summary>Jak auto jezdí (posledních 12 týdnů)</summary>
          <table data-testid="ev-profile">
            <tr><th>Den</th><th>Odjezd</th><th>Spotřeba</th><th>Dní</th></tr>
            ${profileRows(data.profile).map((r) => html`<tr><td>${r.day}</td><td>${r.departure}</td><td>${r.needPct} %</td><td>${r.samples}</td></tr>`)}
          </table>
          <div class="muted small" style="margin-top:6px">Odjezd je nejčasnější desetina prvních jízd, spotřeba stačí na 4 dny z 5.</div>
        </details>
      </section>
    `;
  }

  render() {
    const data = this.data;
    if (!data) return html`<div class="empty">${this.loading ? 'Načítání plánu auta…' : 'Plán auta není k dispozici.'}</div>`;
    if (!data.enabled) return html`<div class="empty">Auto není zapnuté. Zapnete ho v Nastavení → Moduly → Elektroauto.</div>`;
    const control = data.control;
    return html`
      ${this.renderHero(data)}
      ${this.renderTimeline(data)}
      ${this.renderDays(data)}
      <div class="footer" data-testid="ev-control">
        <span>${CONTROL_TEXT[control?.mode ?? 'none'] ?? ''}${control?.manual_hold_until ? ` · ručně změněno, integrace nesahá do ${hhmm(control.manual_hold_until)}` : ''}
          · Topení: ${preconditionText(control).replace(/\.$/, '').toLowerCase()}${control?.error ? ` · chyba: ${control.error}` : ''}</span>
        <button data-testid="ev-tab-setup" aria-expanded=${this.settingsOpen} @click=${() => void this.toggleSettings()}>${this.settingsOpen ? 'Skrýt nastavení' : 'Nastavení auta'}</button>
      </div>
      ${this.settingsOpen ? this.renderSettings(data) : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-ev-tab': OigEvTab;
  }
}
