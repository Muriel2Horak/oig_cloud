// ============================================================================
// 🗓️ Plán ohřevu — actionable plan: status + summary + why + agenda
// ============================================================================
//
// Component: oig-boiler-plan
// Reads plan_slots / plan_summary / legionella / circulation from BoilerV2Data
// and renders WHAT the boiler will do and WHY. Reference: mockup-plan-v1.html
// ============================================================================

import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { t, type Lang } from '@/i18n/boiler';
import { altTypeLabel } from './boiler-energy-today';
import type {
  BoilerV2PlanSlot, PlanSummary, LegionellaStatus, CirculationRun, BoilerV2Status,
} from './types';

const u = unsafeCSS;

export interface PlanWindow {
  startIso: string;
  endIso: string;
  source: 'fve' | 'grid' | 'battery' | 'alternative';
  kwh: number;
  legionella: boolean;
}

function normSource(raw: string | null | undefined): PlanWindow['source'] | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s === 'fve' || s === 'overflow' || s === 'pv') return 'fve';
  if (s === 'grid') return 'grid';
  if (s === 'battery' || s === 'discharge') return 'battery';
  if (s === 'alternative' || s === 'alt') return 'alternative';
  return null;
}

/** Merge consecutive heating slots (kWh>0) of the same source into windows. */
export function buildPlanAgenda(slots: BoilerV2PlanSlot[]): PlanWindow[] {
  const wins: PlanWindow[] = [];
  let cur: PlanWindow | null = null;
  for (const s of slots) {
    const kwh = s.heatingKwh ?? 0;
    const src = normSource(s.recommendedSource);
    const heating = kwh > 0.001 && src !== null;
    if (heating) {
      const leg = s.purpose === 'legionella';
      if (cur && cur.source === src && cur.legionella === leg && cur.endIso === s.start) {
        cur.endIso = s.end;
        cur.kwh += kwh;
      } else {
        if (cur) wins.push(cur);
        cur = { startIso: s.start, endIso: s.end, source: src!, kwh, legionella: leg };
      }
    } else if (cur) {
      wins.push(cur);
      cur = null;
    }
  }
  if (cur) wins.push(cur);
  return wins;
}

const SRC_META: Record<PlanWindow['source'], { icon: string; color: string }> = {
  fve: { icon: '☀️', color: '#ffb300' },
  grid: { icon: '🔌', color: '#38a3ff' },
  battery: { icon: '🔋', color: '#a78bfa' },
  alternative: { icon: '🔥', color: '#ff6a3d' },
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

@customElement('oig-boiler-plan')
export class OigBoilerPlan extends LitElement {
  @property({ attribute: false }) planSlots: BoilerV2PlanSlot[] = [];
  @property({ attribute: false }) planSummary: PlanSummary | null = null;
  @property({ attribute: false }) legionella: LegionellaStatus | null = null;
  @property({ attribute: false }) circulationRuns: CirculationRun[] = [];
  @property({ attribute: false }) status: BoilerV2Status | null = null;
  @property({ type: String }) altSourceType: string | null = null;
  @property({ type: String }) lang: Lang = 'cs';

  static styles = css`
    :host { display: block; }
    .card { background: ${u(CSS_VARS.cardBg)}; border-radius: 14px; box-shadow: ${u(CSS_VARS.cardShadow)}; padding: 16px 18px; }
    .hd { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .ttl { font-size: 15px; font-weight: 650; display: flex; align-items: center; gap: 8px; color: ${u(CSS_VARS.textPrimary)}; }
    .chip { font-size: 11px; padding: 3px 10px; border-radius: 999px; font-weight: 600; }
    .chip.ok { background: rgba(94,234,212,.16); color: #2e9c89; }
    .chip.heat { background: rgba(56,163,255,.18); color: #2b80d6; }
    .chip.warn { background: rgba(251,191,36,.18); color: #b7791f; }
    .sum { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin: 14px 0; }
    @media (max-width: 640px) { .sum { grid-template-columns: 1fr 1fr; } }
    .kv { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 10px 12px; }
    .kv .k { font-size: 11px; color: ${u(CSS_VARS.textSecondary)}; display: flex; gap: 6px; align-items: center; }
    .kv .v { font-size: 15px; font-weight: 650; margin-top: 3px; color: ${u(CSS_VARS.textPrimary)}; }
    .kv .v small { font-weight: 400; color: ${u(CSS_VARS.textSecondary)}; font-size: 11px; }
    .why { background: rgba(56,163,255,.08); border: 1px solid rgba(56,163,255,.18); border-radius: 12px; padding: 11px 14px; font-size: 13px; margin-bottom: 14px; color: ${u(CSS_VARS.textPrimary)}; }
    .agtitle { font-size: 12px; color: ${u(CSS_VARS.textSecondary)}; margin: 0 0 8px; font-weight: 600; }
    .ag { display: flex; flex-direction: column; gap: 8px; }
    .ai { display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); }
    .ai .dot { width: 10px; height: 30px; border-radius: 4px; flex: 0 0 auto; }
    .ai .t { font-weight: 700; font-size: 13px; min-width: 104px; color: ${u(CSS_VARS.textPrimary)}; }
    .ai .src { font-weight: 600; font-size: 13px; flex: 1; color: ${u(CSS_VARS.textPrimary)}; }
    .ai .amt { font-size: 12px; color: ${u(CSS_VARS.textSecondary)}; }
    .ai.deadline { background: rgba(41,182,246,.08); border-color: rgba(41,182,246,.3); }
    .empty { color: ${u(CSS_VARS.textSecondary)}; font-size: 13px; padding: 14px; text-align: center; }
  `;

  private _sourceLabel(src: PlanWindow['source']): string {
    if (src === 'alternative') return altTypeLabel(this.altSourceType, this.lang);
    return t(`boiler.plan.src_${src}` as any, this.lang);
  }

  render() {
    const lang = this.lang;
    const slots = this.planSlots ?? [];
    const agenda = buildPlanAgenda(slots).filter(w => new Date(w.endIso).getTime() > Date.now());
    const comfort = this.status?.comfortSatisfied ?? null;
    const heatingNow = this.status?.heating ?? false;

    const statusChip = heatingNow
      ? html`<span class="chip heat">${t('boiler.plan.status_heating', lang)}</span>`
      : comfort === false
        ? html`<span class="chip warn">${t('boiler.plan.status_waiting', lang)}</span>`
        : html`<span class="chip ok">${t('boiler.plan.status_satisfied', lang)}</span>`;

    const deadline = this.planSummary?.deadlineTime?.slice(0, 5) ?? '—';
    const next = agenda[0] ?? null;
    const cost = this.planSummary?.estimatedCostCzk;
    const costGrid = this.planSummary?.costIfAllGrid;
    const overflowSoon = slots.some(s => s.overflowAvailable && new Date(s.end).getTime() > Date.now());
    const legEnabled = this.legionella?.enabled ?? false;
    const circOn = (this.circulationRuns?.length ?? 0) > 0;

    const why = comfort !== false && agenda.length === 0
      ? t('boiler.plan.why_idle', lang)
      : next
        ? `${t('boiler.plan.why_next', lang)} ${this._sourceLabel(next.source)} (${fmtTime(next.startIso)})`
        : t('boiler.plan.why_generic', lang);

    return html`
      <div class="card" data-testid="boiler-plan">
        <div class="hd"><div class="ttl">🗓️ ${t('boiler.plan.heading', lang)}</div>${statusChip}</div>

        <div class="sum">
          <div class="kv"><div class="k">🎯 ${t('boiler.plan.deadline', lang)}</div><div class="v">${deadline}</div></div>
          <div class="kv"><div class="k">⏭ ${t('boiler.plan.next_action', lang)}</div>
            <div class="v">${next ? html`${fmtTime(next.startIso)} · ${SRC_META[next.source].icon} ${this._sourceLabel(next.source)}` : '—'}</div></div>
          <div class="kv"><div class="k">💰 ${t('boiler.plan.cost_today', lang)}</div>
            <div class="v">${cost != null ? `${cost.toFixed(2)} Kč` : '—'}${costGrid != null ? html` <small>${t('boiler.plan.vs_grid', lang)} ${costGrid.toFixed(2)}</small>` : nothing}</div></div>
          <div class="kv"><div class="k">☀️ ${t('boiler.plan.overflow', lang)}</div><div class="v">${overflowSoon ? t('boiler.plan.overflow_yes', lang) : t('boiler.plan.overflow_no', lang)}</div></div>
          <div class="kv"><div class="k">🦠 ${t('boiler.plan.legionella', lang)}</div><div class="v">${legEnabled ? t('boiler.plan.on', lang) : t('boiler.plan.off', lang)}</div></div>
          <div class="kv"><div class="k">🔁 ${t('boiler.plan.circulation', lang)}</div><div class="v">${circOn ? t('boiler.plan.on', lang) : t('boiler.plan.off', lang)}</div></div>
        </div>

        <div class="why">💡 ${why}</div>

        <p class="agtitle">⏱ ${t('boiler.plan.upcoming', lang)}</p>
        <div class="ag">
          ${agenda.length === 0
            ? html`<div class="empty">${t('boiler.plan.nothing', lang)} 👍</div>`
            : agenda.slice(0, 6).map(w => {
                const m = SRC_META[w.source];
                return html`<div class="ai">
                  <div class="dot" style="background:${m.color}"></div>
                  <div class="t">${fmtTime(w.startIso)}–${fmtTime(w.endIso)}</div>
                  <div class="src">${m.icon} ${this._sourceLabel(w.source)}${w.legionella ? ' 🦠' : ''}</div>
                  <div class="amt">${w.kwh.toFixed(1)} kWh</div>
                </div>`;
              })}
          ${this.planSummary?.deadlineTime ? html`<div class="ai deadline">
            <div class="dot" style="background:#29b6f6"></div>
            <div class="t">🛡 ${deadline}</div>
            <div class="src">${t('boiler.plan.safety', lang)}</div>
          </div>` : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-plan': OigBoilerPlan;
  }
}
