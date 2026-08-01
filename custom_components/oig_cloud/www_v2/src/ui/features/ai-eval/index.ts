import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { aiEvalT, resolveAiEvalLang, type AiEvalLang } from '@/i18n/ai-eval';
import type { AiEvalData } from '@/data/ai-eval-data';
import { EMPTY_AI_EVAL } from '@/data/ai-eval-data';

const u = unsafeCSS;

@customElement('oig-ai-eval-tile')
export class OigAiEvalTile extends LitElement {
  @property({ type: Object }) data: AiEvalData = EMPTY_AI_EVAL;
  @property({ type: Object }) hass: any = null;
  @state() private ledgerOpen = false;

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
      align-items: center;
      gap: 8px;
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
        ${d.lastRun ? html`
          <span class="ai-eval-last-run">${aiEvalT('ai_eval.last_run', this.evalLang)}: ${this.formatTimestamp(d.lastRun)}</span>
        ` : nothing}
      </div>

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
