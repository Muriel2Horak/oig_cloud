import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { aiEvalT, resolveAiEvalLang, type AiEvalLang } from '@/i18n/ai-eval';
import type { AiEvalData, AiReport } from '@/data/ai-eval-data';
import { EMPTY_AI_EVAL } from '@/data/ai-eval-data';
import { haClient } from '@/data/ha-client';

const u = unsafeCSS;

@customElement('oig-ai-eval-tile')
export class OigAiEvalTile extends LitElement {
  @property({ type: Object }) data: AiEvalData = EMPTY_AI_EVAL;
  @property({ type: Object }) hass: any = null;
  @state() private ledgerOpen = false;
  @state() private refreshing = false;
  @state() private refreshNote = '';
  private refreshBaseline: string | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  private get evalLang(): AiEvalLang {
    return resolveAiEvalLang(this.hass);
  }

  static styles = css`
    :host {
      display: block;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
    }

    .ai-eval-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 8px;
      margin-bottom: 12px;
    }

    .ai-eval-icon {
      font-size: 20px;
    }

    .ai-eval-title {
      font-size: 14px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
      flex: 1;
    }

    .ai-eval-last-run {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      white-space: nowrap;
    }

    .ai-eval-section {
      margin-bottom: 12px;
    }

    .ai-eval-section:last-child {
      margin-bottom: 0;
    }

    .ai-eval-section-heading {
      font-size: 12px;
      font-weight: 600;
      color: ${u(CSS_VARS.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .ai-eval-content {
      font-size: 13px;
      line-height: 1.5;
      color: ${u(CSS_VARS.textPrimary)};
      white-space: pre-wrap;
      word-break: break-word;
    }

    .ai-eval-ok {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      font-size: 14px;
      color: #2e7d32;
      font-weight: 500;
    }

    .ai-eval-unavailable {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      font-size: 13px;
      color: ${u(CSS_VARS.textSecondary)};
      text-align: center;
      opacity: 0.7;
    }

    .ai-situation {
      font-size: 14px;
      line-height: 1.5;
      color: ${u(CSS_VARS.textPrimary)};
      margin-bottom: 12px;
    }

    .ai-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ai-item {
      border-left: 3px solid ${u(CSS_VARS.divider)};
      padding: 6px 10px;
      border-radius: 6px;
      background: rgba(127, 127, 127, 0.06);
      font-size: 13px;
      line-height: 1.45;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .ai-risk { border-left-color: #e65100; }
    .ai-action.prio-vysoka { border-left-color: #2e7d32; }
    .ai-action.prio-stredni { border-left-color: ${u(CSS_VARS.accent)}; }
    .ai-anomaly { border-left-color: #8e24aa; }

    .ai-when {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
      margin-right: 6px;
      background: rgba(127, 127, 127, 0.15);
      white-space: nowrap;
    }

    .ai-what { font-weight: 600; }

    .ai-why {
      display: block;
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-top: 2px;
    }

    .ai-gain {
      font-size: 12px;
      font-weight: 600;
      color: #2e7d32;
      margin-left: 4px;
      white-space: nowrap;
    }

    .ai-no-actions {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .ai-refresh {
      font-size: 11px;
      border: 1px solid ${u(CSS_VARS.divider)};
      background: none;
      color: ${u(CSS_VARS.accent)};
      border-radius: 6px;
      padding: 2px 8px;
      cursor: pointer;
    }

    .ai-refresh:disabled { opacity: 0.6; cursor: default; }

    .ai-refresh-note {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin: -6px 0 10px;
    }

    .ai-eval-ledger-toggle {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: ${u(CSS_VARS.accent)};
      cursor: pointer;
      border: none;
      background: none;
      padding: 4px 0;
      margin-top: 8px;
    }

    .ai-eval-ledger-toggle:hover {
      opacity: 0.8;
    }

    .ai-eval-ledger-body {
      margin-top: 6px;
      font-size: 12px;
      line-height: 1.4;
      color: ${u(CSS_VARS.textSecondary)};
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
      border-top: 1px solid ${u(CSS_VARS.divider)};
      padding-top: 8px;
    }
  `;

  render() {
    const d = this.data;

    if (!d.available) {
      return html`
        <div class="ai-eval-header">
          <span class="ai-eval-icon">🤖</span>
          <span class="ai-eval-title">${aiEvalT('ai_eval.title', this.evalLang)}</span>
        </div>
        <div class="ai-eval-unavailable">
          ${aiEvalT('ai_eval.unavailable', this.evalLang)}
        </div>
      `;
    }

    return html`
      <div class="ai-eval-header">
        <span class="ai-eval-icon">🤖</span>
        <span class="ai-eval-title">${aiEvalT('ai_eval.title', this.evalLang)}</span>
        ${d.generatedAt || d.lastRun ? html`
          <span class="ai-eval-last-run">${aiEvalT('ai_eval.last_run', this.evalLang)}: ${this.formatTimestamp((d.generatedAt || d.lastRun)!)}</span>
        ` : nothing}
        <button class="ai-refresh" data-testid="ai-refresh" ?disabled=${this.refreshing}
          @click=${() => void this.refresh()}>
          ${this.refreshing ? aiEvalT('ai_eval.refreshing', this.evalLang) : aiEvalT('ai_eval.refresh', this.evalLang)}
        </button>
      </div>
      ${this.refreshNote ? html`<div class="ai-refresh-note" data-testid="ai-refresh-note">${this.refreshNote}</div>` : nothing}

      ${d.report ? this.renderReport(d.report) : html`
        ${d.status === 'ok' ? html`
          <div class="ai-eval-ok">✓ ${aiEvalT('ai_eval.all_ok', this.evalLang)}</div>
        ` : nothing}

        ${d.reportFakta ? html`
          <div class="ai-eval-section">
            <div class="ai-eval-section-heading">${aiEvalT('ai_eval.fakta_heading', this.evalLang)}</div>
            <div class="ai-eval-content">${d.reportFakta}</div>
          </div>
        ` : nothing}

        ${d.reportLidsky ? html`
          <div class="ai-eval-section">
            <div class="ai-eval-section-heading">${aiEvalT('ai_eval.lidsky_heading', this.evalLang)}</div>
            <div class="ai-eval-content">${d.reportLidsky}</div>
          </div>
        ` : nothing}
      `}

      ${d.ledger ? html`
        <button class="ai-eval-ledger-toggle" @click=${this.toggleLedger}>
          ${this.ledgerOpen ? '▼' : '▶'}
          ${this.ledgerOpen ? aiEvalT('ai_eval.ledger_hide', this.evalLang) : aiEvalT('ai_eval.ledger_toggle', this.evalLang)}
        </button>
        ${this.ledgerOpen ? html`
          <div class="ai-eval-ledger-body">${d.ledger}</div>
        ` : nothing}
      ` : nothing}
    `;
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    // A new report arrived while a refresh was pending: the run is done.
    if (changed.has('data') && this.refreshing) {
      const now = this.data.generatedAt ?? this.data.lastRun;
      if (now && now !== this.refreshBaseline) this.stopRefreshing('');
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  }

  private get boxId(): string | null {
    const m = /^sensor\.oig_(.+)_ai_eval$/.exec(this.data.entityId ?? '');
    return m ? m[1] : null;
  }

  private async refresh(): Promise<void> {
    const box = this.boxId;
    if (!box || this.refreshing) return;
    this.refreshing = true;
    this.refreshNote = '';
    this.refreshBaseline = this.data.generatedAt ?? this.data.lastRun;
    const result = await haClient.fetchOIGAPITyped<{ ok: boolean }>(`/${box}/ai/eval/refresh`, { method: 'POST' });
    if (!result.ok) {
      const key = result.code === 'rate_limited' ? 'ai_eval.refresh_rate_limited' : 'ai_eval.refresh_failed';
      this.stopRefreshing(aiEvalT(key, this.evalLang));
      return;
    }
    // The run is in the background; give up waiting after two minutes.
    this.refreshTimer = setTimeout(() => this.stopRefreshing(aiEvalT('ai_eval.refresh_slow', this.evalLang)), 120_000);
  }

  private stopRefreshing(note: string): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
    this.refreshing = false;
    this.refreshNote = note;
  }

  private renderReport(r: AiReport) {
    const lang = this.evalLang;
    return html`
      <div class="ai-situation">${r.situace}</div>

      ${r.rizika.length ? html`
        <div class="ai-eval-section">
          <div class="ai-eval-section-heading">${aiEvalT('ai_eval.risks_heading', lang)}</div>
          <div class="ai-list">
            ${r.rizika.map((x) => html`
              <div class="ai-item ai-risk">
                ${x.kdy ? html`<span class="ai-when">${x.kdy}</span>` : nothing}
                <span class="ai-what">${x.co}</span>
                ${x.proc ? html`<span class="ai-why">${x.proc}</span>` : nothing}
              </div>`)}
          </div>
        </div>
      ` : nothing}

      <div class="ai-eval-section">
        <div class="ai-eval-section-heading">${aiEvalT('ai_eval.actions_heading', lang)}</div>
        ${r.doporuceni.length ? html`
          <div class="ai-list">
            ${r.doporuceni.map((x) => html`
              <div class="ai-item ai-action prio-${x.priorita}">
                <span class="ai-when">${x.kdy}</span>
                <span class="ai-what">${x.akce}</span>
                ${x.prinos_kc ? html`<span class="ai-gain">(~${this.formatCzk(x.prinos_kc)} Kč)</span>` : nothing}
                ${x.duvod ? html`<span class="ai-why">${x.duvod}</span>` : nothing}
              </div>`)}
          </div>
        ` : html`<div class="ai-no-actions">${aiEvalT('ai_eval.no_actions', lang)}</div>`}
      </div>

      ${r.anomalie.length ? html`
        <div class="ai-eval-section">
          <div class="ai-eval-section-heading">${aiEvalT('ai_eval.anomalies_heading', lang)}</div>
          <div class="ai-list">
            ${r.anomalie.map((x) => html`
              <div class="ai-item ai-anomaly">
                ${x.kdy ? html`<span class="ai-when">${x.kdy}</span>` : nothing}
                <span class="ai-what">${x.co}</span>
                ${x.vyznam ? html`<span class="ai-why">${x.vyznam}</span>` : nothing}
              </div>`)}
          </div>
        </div>
      ` : nothing}
    `;
  }

  private formatCzk(v: number): string {
    return Math.round(v).toLocaleString(this.evalLang === 'cs' ? 'cs-CZ' : 'en-US');
  }

  private toggleLedger(): void {
    this.ledgerOpen = !this.ledgerOpen;
  }

  private formatTimestamp(iso: string): string {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString(this.evalLang === 'cs' ? 'cs-CZ' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-ai-eval-tile': OigAiEvalTile;
  }
}
