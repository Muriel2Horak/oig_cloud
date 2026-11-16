/**
 * Car tab: when and from where the car charges, one-off choices, the
 * departure calendar (holidays, vacations, single days), heating before
 * departure and the setup wizard that finds the car's entities.
 */

import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import {
  addVacation,
  dayTag,
  dayTitle,
  discoverEntities,
  DISCOVERY_ROLES,
  evStatus,
  formatTime,
  hhmm,
  initialChoices,
  preconditionText,
  priceLevel,
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
  type EvSlot,
} from '@/data/ev-data';

const u = unsafeCSS;

type View = 'plan' | 'calendar' | 'setup';

const CONTROL_LABELS: Record<string, string> = {
  none: 'Jen plán, spíná vaše automatizace',
  wallbox: 'Spíná nabíječka',
  car: 'Spíná auto přes cloud',
};

@customElement('oig-ev-tab')
export class OigEvTab extends LitElement {
  @property({ type: Object }) data: EvData | null = null;
  @property({ type: Boolean }) loading = false;

  @state() private view: View = 'plan';
  @state() private byTime = '05:00';
  @state() private busy = false;
  @state() private message = '';
  @state() private selectedDate: string | null = null;
  @state() private tripTime = '07:00';
  @state() private vacStart = '';
  @state() private vacEnd = '';
  @state() private discovery: Discovery | null = null;
  @state() private discovering = false;
  @state() private chosen: Record<string, string> = {};
  @state() private wizardControl = true;
  @state() private wizardHeating = true;

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
    .tabs, .seg { display: flex; gap: 4px; flex-wrap: wrap; }
    .tabs { margin-bottom: 12px; }
    button { font: inherit; cursor: pointer; border-radius: 8px; border: 1px solid ${u(CSS_VARS.divider)};
      background: ${u(CSS_VARS.cardBg)}; color: ${u(CSS_VARS.textPrimary)}; padding: 8px 12px; min-height: 40px; }
    button[aria-pressed='true'] { border-color: #2196f3; background: rgba(33, 150, 243, 0.15); }
    button.primary { background: #2196f3; border-color: #2196f3; color: #fff; }
    button:disabled { opacity: 0.5; cursor: default; }
    input, select { font: inherit; padding: 7px 9px; border-radius: 8px; border: 1px solid ${u(CSS_VARS.divider)};
      background: ${u(CSS_VARS.cardBg)}; color: ${u(CSS_VARS.textPrimary)}; min-height: 40px; box-sizing: border-box; }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .between { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; }
    .notice { background: rgba(255, 152, 0, 0.15); border-radius: 10px; padding: 10px 12px; }
    .msg { margin-top: 8px; font-size: 0.85rem; color: ${u(CSS_VARS.textSecondary)}; }
    .days { display: grid; gap: 8px; grid-template-columns: repeat(7, minmax(0, 1fr)); }
    .day { text-align: left; display: flex; flex-direction: column; gap: 4px; min-height: 96px; align-items: flex-start; }
    .day .date { font-weight: 600; }
    .day .tag { font-size: 0.72rem; padding: 2px 6px; border-radius: 999px; background: rgba(158, 158, 158, 0.18); }
    .day .tag.holiday { background: rgba(255, 152, 0, 0.2); }
    .day .tag.vacation, .day .tag.home { background: rgba(76, 175, 80, 0.2); }
    .day .tag.trip { background: rgba(33, 150, 243, 0.2); }
    .day .small { font-size: 0.78rem; color: ${u(CSS_VARS.textSecondary)}; }
    .role { display: grid; grid-template-columns: minmax(120px, 180px) 1fr; gap: 8px 12px; align-items: center;
      padding: 8px 0; border-bottom: 1px solid ${u(CSS_VARS.divider)}; }
    .role select { width: 100%; }
    .reasons { grid-column: 2; font-size: 0.78rem; color: ${u(CSS_VARS.textSecondary)}; }
    label.check { display: flex; gap: 8px; align-items: center; }
    label.check input { min-height: auto; }
    @media (max-width: 700px) { .days { grid-template-columns: repeat(2, minmax(0, 1fr)); } .role { grid-template-columns: 1fr; } .reasons { grid-column: 1; } }
  `;

  // ── actions ───────────────────────────────────────────────────────────
  private refresh(): void {
    this.dispatchEvent(new CustomEvent('oig-ev-refresh', { bubbles: true, composed: true }));
    // The replan runs a second after a change; read the new plan once it is in.
    window.setTimeout(
      () => this.dispatchEvent(new CustomEvent('oig-ev-refresh', { bubbles: true, composed: true })),
      4000,
    );
  }

  private async run(action: () => Promise<unknown>, ok: string): Promise<void> {
    this.busy = true;
    this.message = '';
    try {
      const res = await action();
      this.message = res ? ok : 'Nepovedlo se uložit. Zkuste to znovu.';
      if (res) this.refresh();
    } finally {
      this.busy = false;
    }
  }

  private chargeMode(mode: 'plan' | 'now' | 'by'): void {
    const labels = { plan: 'Vráceno na plán.', now: 'Nabíjí se hned.', by: `Nabito bude do ${this.byTime}.` };
    void this.run(() => setChargeMode(mode, mode === 'by' ? this.byTime : undefined), labels[mode]);
  }

  private changeDay(day: EvDay, kind: DayKind | null, extra: { departure?: string | null; precondition?: boolean | null } = {}): void {
    void this.run(
      () => setDay({ date: day.date, kind, departure: extra.departure ?? null, precondition: extra.precondition ?? day.precondition }),
      'Den uložen.',
    );
  }

  private async openSetup(): Promise<void> {
    this.view = 'setup';
    if (this.discovery || this.discovering) return;
    this.discovering = true;
    try {
      const found = await discoverEntities();
      this.discovery = found;
      if (!found) return;
      const chosen = initialChoices(found);
      this.chosen = chosen;
      const mode = found.current_settings?.ev_control_mode;
      const heating = found.current_settings?.ev_climate_when;
      // Configured before: show what is set. New: suggest what was found.
      this.wizardControl = mode ? mode !== 'none' : Boolean(chosen.ev_switch_entity);
      this.wizardHeating = heating ? heating !== 'off' : Boolean(chosen.ev_climate_entity);
    } finally {
      this.discovering = false;
    }
  }

  private saveWizard(): void {
    if (!this.discovery) return;
    const values = wizardValues(this.chosen, this.discovery, {
      control: this.wizardControl,
      heating: this.wizardHeating,
    });
    void this.run(async () => {
      const res = await saveEvSettings(values);
      return res.ok ? res : null;
    }, 'Uloženo. Integrace se znovu načte a plán se přepočítá.');
  }

  // ── plan view ─────────────────────────────────────────────────────────
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

  private renderChargeChoice(data: EvData) {
    const override = data.charge_override;
    const mode = override?.mode ?? 'plan';
    return html`
      <section class="card" data-testid="ev-charge-choice">
        <div class="between">
          <div>
            <h3>Kdy nabíjet</h3>
            <div class="sub">
              ${override
                ? html`Platí do ${formatTime(override.until)}, pak zase podle plánu.`
                : 'Volba platí jen pro nejbližší jízdu.'}
            </div>
          </div>
          <div class="seg">
            <button aria-pressed=${mode === 'plan'} ?disabled=${this.busy} @click=${() => this.chargeMode('plan')}>Podle plánu</button>
            <button aria-pressed=${mode === 'now'} ?disabled=${this.busy} @click=${() => this.chargeMode('now')} data-testid="ev-charge-now">Nabít ihned</button>
          </div>
        </div>
        <div class="row" style="margin-top:10px">
          <label for="ev-by">Mít nabito do</label>
          <input id="ev-by" type="time" .value=${mode === 'by' ? hhmm(override?.until) || this.byTime : this.byTime}
            @change=${(e: Event) => { this.byTime = (e.target as HTMLInputElement).value; }}>
          <button aria-pressed=${mode === 'by'} ?disabled=${this.busy || !this.byTime} @click=${() => this.chargeMode('by')} data-testid="ev-charge-by">Nabít do tohoto času</button>
        </div>
        ${this.message ? html`<div class="msg" role="status">${this.message}</div>` : nothing}
      </section>
    `;
  }

  private renderHolidayNotice(data: EvData) {
    const day = data.next_day;
    if (!day || day.source !== 'holiday' || data.charge_override) return nothing;
    return html`
      <section class="notice between" data-testid="ev-holiday">
        <div><strong>${dayTitle(day.date)} je ${day.holiday ?? 'státní svátek'}.</strong> Plán čeká odjezd jako v neděli${day.departure ? `, v ${hhmm(day.departure)}` : ''}.</div>
        <div class="seg">
          <button aria-pressed="true" disabled>Ano, jako neděle</button>
          <button ?disabled=${this.busy} @click=${() => this.changeDay(day, 'workday')}>Ne, jedu jako v pracovní den</button>
        </div>
      </section>
    `;
  }

  private renderPlan(data: EvData) {
    const plan = data.plan;
    const status = evStatus(data);
    const soc = data.car?.soc_pct;
    const timeline = plan?.timeline ?? [];
    const control = data.control;
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
          <div class="value">${formatTime(data.next_day?.departure ?? plan?.deadline ?? data.next_departure)}</div>
          <div class="sub">${data.next_day ? dayTag(data.next_day) : ''}${data.need_pct != null ? ` · obvykle ${Math.round(data.need_pct)} %` : ''}</div>
        </div>
        <div class="card">
          <div class="label">Nabíjení</div>
          <div class="value">${plan ? `${plan.planned_kwh.toFixed(1)} kWh` : '—'}</div>
          <div class="sub">${plan?.next_start ? `od ${formatTime(plan.next_start)}` : 'nic naplánováno'}${plan && plan.cost_czk > 0 ? ` · ${plan.cost_czk.toFixed(0)} Kč` : ''}</div>
        </div>
      </div>

      ${this.renderHolidayNotice(data)}
      ${this.renderChargeChoice(data)}

      ${plan && plan.shortfall_kwh > 0 ? html`<section class="card">Do odjezdu se nestihne ${plan.shortfall_kwh.toFixed(1)} kWh (jistič nebo čas). Auto pojede část na benzín.</section>` : nothing}

      <section class="card">
        <h3>Plán do odjezdu</h3>
        ${this.renderStrip(timeline)}
      </section>

      <section class="grid">
        <div class="card" data-testid="ev-control">
          <h3>Řízení</h3>
          <div>${CONTROL_LABELS[control?.mode ?? 'none'] ?? control?.mode}</div>
          ${control?.switch_entity ? html`<div class="sub">${control.switch_entity}</div>` : nothing}
          ${control?.manual_hold_until ? html`<div class="sub">Ručně změněno, integrace nesahá do ${formatTime(control.manual_hold_until)}.</div>` : nothing}
          ${control?.current_a ? html`<div class="sub">Proud ${control.current_a} A</div>` : nothing}
          ${control?.error ? html`<div class="sub">Chyba: ${control.error}</div>` : nothing}
        </div>
        <div class="card" data-testid="ev-heating">
          <h3>Topení před odjezdem</h3>
          <div>${preconditionText(control)}</div>
        </div>
      </section>
    `;
  }

  // ── calendar view ─────────────────────────────────────────────────────
  private renderDayEditor(day: EvDay) {
    const kind = (['home', 'trip', 'workday', 'dayoff'] as const).find((k) => k === day.source) ?? null;
    return html`
      <section class="card" data-testid="ev-day-editor">
        <h3>${dayTitle(day.date)}${day.holiday ? html` · ${day.holiday}` : nothing}</h3>
        <div class="sub">${day.departure ? `Odjezd ${hhmm(day.departure)}` : 'Bez odjezdu'}${day.full_charge ? ' · nabít na 100 %' : ''}</div>
        <div class="seg" style="margin-top:10px">
          <button aria-pressed=${kind === null} ?disabled=${this.busy} @click=${() => this.changeDay(day, null)}>Podle profilu</button>
          <button aria-pressed=${kind === 'home'} ?disabled=${this.busy} @click=${() => this.changeDay(day, 'home')}>Jsem doma</button>
          <button aria-pressed=${kind === 'workday'} ?disabled=${this.busy} @click=${() => this.changeDay(day, 'workday')}>Jako pracovní den</button>
          <button aria-pressed=${kind === 'dayoff'} ?disabled=${this.busy} @click=${() => this.changeDay(day, 'dayoff')}>Jako neděle</button>
        </div>
        <div class="row" style="margin-top:10px">
          <label for="ev-trip">Dlouhá cesta, odjezd</label>
          <input id="ev-trip" type="time" .value=${kind === 'trip' ? hhmm(day.departure) : this.tripTime}
            @change=${(e: Event) => { this.tripTime = (e.target as HTMLInputElement).value; }}>
          <button aria-pressed=${kind === 'trip'} ?disabled=${this.busy} @click=${() => this.changeDay(day, 'trip', { departure: this.tripTime })}>Nabít na cestu</button>
        </div>
        <div class="row" style="margin-top:10px">
          <span>Topit před odjezdem:</span>
          <button aria-pressed=${day.precondition === null} ?disabled=${this.busy} @click=${() => this.changeDay(day, kind, { departure: kind === 'trip' ? hhmm(day.departure) : null, precondition: null })}>Podle nastavení</button>
          <button aria-pressed=${day.precondition === true} ?disabled=${this.busy} @click=${() => this.changeDay(day, kind, { departure: kind === 'trip' ? hhmm(day.departure) : null, precondition: true })}>Ano</button>
          <button aria-pressed=${day.precondition === false} ?disabled=${this.busy} @click=${() => this.changeDay(day, kind, { departure: kind === 'trip' ? hhmm(day.departure) : null, precondition: false })}>Ne</button>
        </div>
        ${this.message ? html`<div class="msg" role="status">${this.message}</div>` : nothing}
      </section>
    `;
  }

  private renderCalendar(data: EvData) {
    const days = data.days ?? [];
    const selected = days.find((d) => d.date === this.selectedDate) ?? null;
    const vacations = data.vacations ?? [];
    return html`
      <section class="card">
        <h3>Odjezdy na 14 dní</h3>
        <div class="days" data-testid="ev-days">
          ${days.map((d) => html`
            <button class="day" aria-pressed=${d.date === this.selectedDate} @click=${() => { this.selectedDate = d.date; this.message = ''; }}>
              <span class="date">${dayTitle(d.date)}</span>
              <span class="tag ${d.source}">${dayTag(d)}</span>
              <span>${d.departure ? `odjezd ${hhmm(d.departure)}` : 'bez odjezdu'}</span>
              ${d.full_charge ? html`<span class="small">na 100 %</span>` : nothing}
              ${d.precondition === true ? html`<span class="small">topit</span>` : d.precondition === false ? html`<span class="small">netopit</span>` : nothing}
            </button>
          `)}
        </div>
        <div class="sub" style="margin-top:8px">Kliknutím na den ho upravíte. Státní svátky plán bere jako neděli.</div>
      </section>
      ${selected ? this.renderDayEditor(selected) : nothing}
      <section class="card" data-testid="ev-vacations">
        <h3>Dovolená</h3>
        ${vacations.length
          ? vacations.map(([a, b]) => html`<div class="between"><span>${dayTitle(a)} – ${dayTitle(b)}</span>
              <button ?disabled=${this.busy} @click=${() => this.run(() => removeVacation(a, b), 'Dovolená odebrána.')}>Odebrat</button></div>`)
          : html`<div class="sub">Žádná dovolená. Ve dnech dovolené se auto nabíjí jen z levných přetoků.</div>`}
        <div class="row" style="margin-top:10px">
          <label for="ev-vac-start">Od</label>
          <input id="ev-vac-start" type="date" .value=${this.vacStart} @change=${(e: Event) => { this.vacStart = (e.target as HTMLInputElement).value; }}>
          <label for="ev-vac-end">do</label>
          <input id="ev-vac-end" type="date" .value=${this.vacEnd} @change=${(e: Event) => { this.vacEnd = (e.target as HTMLInputElement).value; }}>
          <button ?disabled=${this.busy || !this.vacStart || !this.vacEnd}
            @click=${() => this.run(() => addVacation(this.vacStart, this.vacEnd), 'Dovolená přidána.')}>Přidat</button>
        </div>
      </section>
      <section class="card">
        <h3>Profil jízd (posledních 12 týdnů)</h3>
        <table data-testid="ev-profile">
          <tr><th>Den</th><th>Odjezd</th><th>Potřeba</th><th>Dní</th></tr>
          ${profileRows(data.profile).map((r) => html`<tr><td>${r.day}</td><td>${r.departure}</td><td>${r.needPct} %</td><td>${r.samples}</td></tr>`)}
        </table>
        <div class="sub">Odjezd je nejčasnější desetina prvních jízd daného dne, potřeba je spotřeba, která stačí na 4 dny z 5. Aktualizováno ${formatTime(data.profile_updated_at)}.</div>
      </section>
    `;
  }

  // ── setup view ────────────────────────────────────────────────────────
  private renderSetup() {
    if (this.discovering) return html`<div class="empty">Hledám entity auta a nabíječky…</div>`;
    const found = this.discovery;
    if (!found) return html`<div class="empty">Entity se nepodařilo načíst.</div>`;
    return html`
      <section class="card" data-testid="ev-setup">
        <h3>Napojení auta a nabíječky</h3>
        <div class="sub">Návrh podle typu entity, jednotky, rozsahu, názvu a zařízení, ke kterému patří. Funguje s jakoukoli integrací. Zkontrolujte a uložte.</div>
        ${DISCOVERY_ROLES.map((role) => {
          const found_ = found.roles[role.key] ?? [];
          const configured = found.current?.[role.key];
          // A configured entity the search did not rank stays selectable.
          const candidates = configured && !found_.some((c) => c.entity_id === configured)
            ? [{ entity_id: configured, name: configured, device: '', score: 0, reasons: [] }, ...found_]
            : found_;
          const current = this.chosen[role.key] ?? '';
          const pick = candidates.find((c) => c.entity_id === current);
          const note = current && current === configured ? 'nastaveno teď' : '';
          return html`
            <div class="role">
              <label for="role-${role.key}">${role.label}</label>
              <select id="role-${role.key}" .value=${current}
                @change=${(e: Event) => { this.chosen = { ...this.chosen, [role.key]: (e.target as HTMLSelectElement).value }; }}>
                <option value="" ?selected=${!current}>${candidates.length ? 'Nepoužít' : 'Nic nenalezeno'}</option>
                ${candidates.map((c) => html`<option value=${c.entity_id} ?selected=${c.entity_id === current}>${c.name} (${c.entity_id})</option>`)}
              </select>
              ${pick ? html`<div class="reasons">${[note, pick.device, reasonText(pick.reasons)].filter(Boolean).join(' · ')}</div>` : nothing}
            </div>`;
        })}
        <div style="margin-top:12px; display:flex; flex-direction:column; gap:8px">
          <label class="check"><input type="checkbox" .checked=${this.wizardControl} ?disabled=${!this.chosen.ev_switch_entity}
            @change=${(e: Event) => { this.wizardControl = (e.target as HTMLInputElement).checked; }}>
            Integrace spíná nabíjení podle plánu${found.control_mode === 'car' ? ' (přes cloud auta)' : ''}${found.switch_inverted ? ', spínač znamená pozastavit' : ''}</label>
          <label class="check"><input type="checkbox" .checked=${this.wizardHeating} ?disabled=${!this.chosen.ev_climate_entity}
            @change=${(e: Event) => { this.wizardHeating = (e.target as HTMLInputElement).checked; }}>
            V zimě pustit topení před odjezdem</label>
        </div>
        <div class="row" style="margin-top:12px">
          <button class="primary" ?disabled=${this.busy || !this.chosen.ev_soc_entity} @click=${() => this.saveWizard()} data-testid="ev-setup-save">Uložit</button>
          <span class="sub">Podrobnosti (proud, teplota, minuty, jistič) jsou v Nastavení → Baterie a plánovač.</span>
        </div>
        ${this.message ? html`<div class="msg" role="status">${this.message}</div>` : nothing}
      </section>
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
    return html`
      <div class="tabs" role="tablist">
        <button role="tab" aria-pressed=${this.view === 'plan'} @click=${() => { this.view = 'plan'; this.message = ''; }}>Plán</button>
        <button role="tab" aria-pressed=${this.view === 'calendar'} @click=${() => { this.view = 'calendar'; this.message = ''; }} data-testid="ev-tab-calendar">Odjezdy</button>
        <button role="tab" aria-pressed=${this.view === 'setup'} @click=${() => { this.message = ''; void this.openSetup(); }} data-testid="ev-tab-setup">Napojení</button>
      </div>
      ${this.view === 'plan' ? this.renderPlan(data) : this.view === 'calendar' ? this.renderCalendar(data) : this.renderSetup()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-ev-tab': OigEvTab;
  }
}
