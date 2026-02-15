import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { getIconEmoji } from '@/utils/format';
import type { ResolvedTile } from './types';

const u = unsafeCSS;

@customElement('oig-tile')
export class OigTile extends LitElement {
  @property({ type: Object }) data: ResolvedTile | null = null;
  @property({ type: Boolean }) editMode = false;

  static styles = css`
    :host {
      display: grid;
      grid-template-columns: auto 1fr auto;
      grid-template-rows: 1fr auto;
      align-items: center;
      padding: 6px 10px;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 8px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
      min-width: 0;
      position: relative;
      transition: opacity 0.2s;
      font-size: 11px;
      height: 50px;
      gap: 0 8px;
    }

    :host(.inactive) {
      opacity: 0.5;
    }

    .tile-icon {
      grid-row: 1 / -1;
      font-size: 20px;
      line-height: 1;
    }

    .tile-main {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 3px;
      min-width: 0;
    }

    .tile-value {
      font-size: 20px;
      font-weight: 700;
      color: ${u(CSS_VARS.textPrimary)};
      line-height: 1.1;
    }

    .tile-unit {
      font-size: 12px;
      font-weight: 400;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .tile-label {
      grid-column: 2;
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    .support-values {
      grid-row: 1 / -1;
      grid-column: 3;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      gap: 2px;
    }

    .support-value {
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
      white-space: nowrap;
    }

    .edit-actions {
      position: absolute;
      top: 4px;
      right: 4px;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    :host(:hover) .edit-actions {
      opacity: 1;
    }

    .edit-btn, .delete-btn {
      width: 20px;
      height: 20px;
      border: none;
      background: ${u(CSS_VARS.bgSecondary)};
      border-radius: 50%;
      font-size: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .delete-btn:hover {
      background: ${u(CSS_VARS.error)};
      color: #fff;
    }
  `;

  private onEdit(): void {
    this.dispatchEvent(new CustomEvent('edit-tile', {
      detail: { entityId: this.data?.config.entity_id },
      bubbles: true,
      composed: true,
    }));
  }

  private onDelete(): void {
    this.dispatchEvent(new CustomEvent('delete-tile', {
      detail: { entityId: this.data?.config.entity_id },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    if (!this.data) return null;

    const cfg = this.data.config;
    const color = cfg.color || '';
    const rawIcon = cfg.icon || '📊';
    const icon = rawIcon.startsWith('mdi:') ? getIconEmoji(rawIcon) : rawIcon;

    return html`
      ${color ? html`<style>:host { border-left: 3px solid ${u(color)}; }</style>` : null}
      <span class="tile-icon">${icon}</span>
      <div class="tile-main">
    <span class="tile-value">${this.data.value}</span>
    ${this.data.unit ? html`<span class="tile-unit">${this.data.unit}</span>` : null}
  </div>
      <span class="tile-label">${cfg.label || ''}</span>

      ${(this.data.supportValues.topRight || this.data.supportValues.bottomRight) ? html`
        <div class="support-values">
          ${this.data.supportValues.topRight ? html`
            <span class="support-value">${this.data.supportValues.topRight.value} ${this.data.supportValues.topRight.unit}</span>
          ` : null}
          ${this.data.supportValues.bottomRight ? html`
            <span class="support-value">${this.data.supportValues.bottomRight.value} ${this.data.supportValues.bottomRight.unit}</span>
          ` : null}
        </div>
      ` : null}

      ${this.editMode ? html`
        <div class="edit-actions">
          <button class="edit-btn" @click=${this.onEdit}>⚙️</button>
          <button class="delete-btn" @click=${this.onDelete}>✕</button>
        </div>
      ` : null}
    `;
  }
}

@customElement('oig-tiles-container')
export class OigTilesContainer extends LitElement {
  @property({ type: Array }) tiles: ResolvedTile[] = [];
  @property({ type: Boolean }) editMode = false;
  @property({ type: String, reflect: true }) position: 'left' | 'right' = 'left';

  static styles = css`
    :host {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      align-items: stretch;
    }

    @media (max-width: 768px) {
      :host {
        grid-template-columns: 1fr;
      }
    }

    .empty-state {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      padding: 8px;
    }
  `;

  render() {
    if (this.tiles.length === 0) {
      return html`<div class="empty-state">Žádné dlaždice</div>`;
    }

    return html`
      ${this.tiles.map(tile => html`
        <oig-tile
          .data=${tile}
          .editMode=${this.editMode}
          class="${tile.isZero ? 'inactive' : ''}"
        ></oig-tile>
      `)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-tile': OigTile;
    'oig-tiles-container': OigTilesContainer;
  }
}
