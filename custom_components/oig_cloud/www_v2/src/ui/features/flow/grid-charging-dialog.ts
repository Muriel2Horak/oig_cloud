/**
 * Grid Charging Dialog — popup zobrazující plán síťového nabíjení
 *
 * Otevírá se kliknutím na 🔌 badge v battery node.
 * Přijímá data typu GridChargingPlanData a zobrazuje tabulku bloků.
 */

import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import type { GridChargingPlanData, GridChargingBlock } from './types';

const u = unsafeCSS;

@customElement('oig-grid-charging-dialog')
export class OigGridChargingDialog extends LitElement {
  @property({ type: Object }) data: GridChargingPlanData | null = null;
  @state() private open = false;

  static styles = css`
    :host {
      display: contents;
    }

    /* ---- Overlay ---- */
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 9000;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.18s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* ---- Dialog box ---- */
    .dialog {
      position: relative;
      background: ${u(CSS_VARS.cardBg)};
      border: 1px solid rgba(33,150,243,0.3);
      border-radius: 16px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      max-width: 480px;
      width: 100%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.2s ease;
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* ---- Header ---- */
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 20px 14px;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
      flex-shrink: 0;
    }

    .dialog-header-icon {
      font-size: 22px;
      line-height: 1;
    }

    .dialog-header-title {
      flex: 1;
      font-size: 15px;
      font-weight: 700;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .dialog-header-subtitle {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-top: 2px;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: ${u(CSS_VARS.textSecondary)};
      font-size: 20px;
      line-height: 1;
      padding: 4px;
      border-radius: 6px;
      transition: background 0.15s, color 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: rgba(255,255,255,0.08);
      color: ${u(CSS_VARS.textPrimary)};
    }

    /* ---- Body ---- */
    .dialog-body {
      padding: 16px 20px 20px;
      overflow-y: auto;
      flex: 1;
    }

    /* ---- Summary chips ---- */
    .summary-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .summary-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(33,150,243,0.12);
      color: #42a5f5;
      border: 1px solid rgba(33,150,243,0.25);
    }

    .summary-chip.energy {
      background: rgba(76,175,80,0.12);
      color: #66bb6a;
      border-color: rgba(76,175,80,0.25);
    }

    .summary-chip.cost {
      background: rgba(255,152,0,0.12);
      color: #ffa726;
      border-color: rgba(255,152,0,0.25);
    }

    .summary-chip.time {
      background: rgba(149,117,205,0.12);
      color: #ab91d0;
      border-color: rgba(149,117,205,0.25);
    }

    /* ---- Section header ---- */
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 8px;
    }

    /* ---- Active block banner ---- */
    .active-block-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(76,175,80,0.12);
      border: 1px solid rgba(76,175,80,0.3);
      font-size: 13px;
      color: #81c784;
      margin-bottom: 14px;
    }

    .active-block-banner .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4caf50;
      flex-shrink: 0;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }

    /* ---- Blocks table ---- */
    .blocks-table {
      width: 100%;
      border-collapse: collapse;
    }

    .blocks-table th {
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${u(CSS_VARS.textSecondary)};
      padding: 0 6px 8px;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
    }

    .blocks-table th:last-child,
    .blocks-table td:last-child {
      text-align: right;
    }

    .blocks-table td {
      padding: 8px 6px;
      font-size: 12px;
      color: ${u(CSS_VARS.textPrimary)};
      border-bottom: 1px solid rgba(255,255,255,0.04);
      vertical-align: middle;
    }

    .blocks-table tr:last-child td {
      border-bottom: none;
    }

    .blocks-table tr.is-active td {
      color: #81c784;
      background: rgba(76,175,80,0.06);
    }

    .blocks-table tr.is-next td {
      color: #42a5f5;
    }

    .day-badge {
      display: inline-block;
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 999px;
      margin-left: 4px;
      font-weight: 600;
      vertical-align: middle;
    }

    .day-badge.today {
      background: rgba(33,150,243,0.15);
      color: #42a5f5;
    }

    .day-badge.tomorrow {
      background: rgba(149,117,205,0.15);
      color: #ab91d0;
    }

    /* ---- Empty state ---- */
    .empty-state {
      text-align: center;
      padding: 32px 16px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .empty-state .empty-icon {
      font-size: 40px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-state .empty-text {
      font-size: 14px;
      margin-bottom: 4px;
    }

    .empty-state .empty-sub {
      font-size: 12px;
      opacity: 0.6;
    }
  `;

  /** Volá se z battery node přes CustomEvent */
  show(): void {
    this.open = true;
  }

  hide(): void {
    this.open = false;
  }

  private onOverlayClick(e: Event): void {
    if (e.target === e.currentTarget) {
      this.hide();
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.hide();
  };

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('oig-grid-charging-open', () => this.show());
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.onKeyDown);
  }

  private formatTime(block: GridChargingBlock): string {
    const from = block.time_from ?? '--:--';
    const to = block.time_to ?? '--:--';
    return `${from} – ${to}`;
  }

  private isBlockActive(block: GridChargingBlock): boolean {
    if (!block.time_from || !block.time_to) return false;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (block.day === 'tomorrow') return false;
    const fromStr = `${today}T${block.time_from}`;
    const toStr = `${today}T${block.time_to}`;
    const from = new Date(fromStr);
    const to = new Date(toStr);
    return now >= from && now < to;
  }

  private renderEmpty() {
    return html`
      <div class="empty-state">
        <div class="empty-icon">🔌</div>
        <div class="empty-text">Žádné plánované nabíjení</div>
        <div class="empty-sub">Plán nabíjení ze sítě není aktivní.</div>
      </div>
    `;
  }

  private renderContent() {
    const d = this.data;
    if (!d) return this.renderEmpty();

    const activeBlock = d.blocks.find(b => this.isBlockActive(b));

    return html`
      ${d.hasBlocks ? html`
        <!-- Summary chips -->
        <div class="summary-row">
          ${d.totalEnergyKwh > 0 ? html`
            <span class="summary-chip energy">⚡ ${d.totalEnergyKwh.toFixed(1)} kWh</span>
          ` : nothing}
          ${d.totalCostCzk > 0 ? html`
            <span class="summary-chip cost">💰 ~${d.totalCostCzk.toFixed(0)} Kč</span>
          ` : nothing}
          ${d.windowLabel ? html`
            <span class="summary-chip time">🪟 ${d.windowLabel}</span>
          ` : nothing}
          ${d.durationMinutes > 0 ? html`
            <span class="summary-chip time">⏱️ ${Math.round(d.durationMinutes)} min</span>
          ` : nothing}
        </div>

        <!-- Active block banner -->
        ${activeBlock ? html`
          <div class="active-block-banner">
            <div class="pulse-dot"></div>
            <span>Probíhá: ${this.formatTime(activeBlock)}
              ${activeBlock.grid_charge_kwh != null
                ? ` · ${activeBlock.grid_charge_kwh.toFixed(1)} kWh`
                : nothing}
            </span>
          </div>
        ` : nothing}

        <!-- Blocks table -->
        <div class="section-title">Bloky nabíjení</div>
        <table class="blocks-table">
          <thead>
            <tr>
              <th>Čas</th>
              <th>Den</th>
              <th>kWh</th>
              <th>Cena</th>
            </tr>
          </thead>
          <tbody>
            ${d.blocks.map((block, i) => {
              const active = this.isBlockActive(block);
              const isNext = !active && i === 0 && !activeBlock;
              return html`
                <tr class="${active ? 'is-active' : isNext ? 'is-next' : ''}">
                  <td>${this.formatTime(block)}</td>
                  <td>
                    ${block.day ? html`
                      <span class="day-badge ${block.day}">${block.day === 'today' ? 'dnes' : 'zítra'}</span>
                    ` : nothing}
                  </td>
                  <td>${block.grid_charge_kwh != null ? block.grid_charge_kwh.toFixed(1) : '--'}</td>
                  <td>${block.total_cost_czk != null ? `${block.total_cost_czk.toFixed(0)} Kč` : '--'}</td>
                </tr>
              `;
            })}
          </tbody>
        </table>
      ` : this.renderEmpty()}
    `;
  }

  override render() {
    if (!this.open) return nothing;

    return html`
      <div class="overlay" @click=${this.onOverlayClick}>
        <div class="dialog" role="dialog" aria-modal="true" aria-label="Plánované síťové nabíjení">
          <div class="dialog-header">
            <span class="dialog-header-icon">🔌</span>
            <div>
              <div class="dialog-header-title">Plánované síťové nabíjení</div>
              ${this.data?.hasBlocks ? html`
                <div class="dialog-header-subtitle">
                  ${this.data.blocks.length} blok${this.data.blocks.length > 1 ? 'ů' : ''}
                </div>
              ` : nothing}
            </div>
            <button class="close-btn" @click=${() => this.hide()} aria-label="Zavřít">✕</button>
          </div>
          <div class="dialog-body">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-grid-charging-dialog': OigGridChargingDialog;
  }
}
