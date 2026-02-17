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
      display: flex;
      flex-direction: column;
      padding: 8px 10px;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 10px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
      min-width: 0;
      position: relative;
      transition: opacity 0.2s, transform 0.15s;
      overflow: hidden;
      box-sizing: border-box;
    }

    :host(:hover) {
      transform: translateY(-1px);
    }

    :host(.inactive) {
      opacity: 0.45;
    }

    /* Barevný pruh vlevo */
    :host::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--tile-color, transparent);
      border-radius: 10px 0 0 10px;
    }

    /* Horní řádek: ikona + label + support values */
    .tile-top {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      margin-bottom: 2px;
    }

    .tile-icon {
      font-size: 18px;
      line-height: 1;
      flex-shrink: 0;
      width: 22px;
      text-align: center;
    }

    .tile-label {
      flex: 1;
      font-size: 10px;
      font-weight: 500;
      color: ${u(CSS_VARS.textSecondary)};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
      line-height: 1.2;
    }

    .support-values {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1px;
      flex-shrink: 0;
    }

    .support-value {
      font-size: 9px;
      color: ${u(CSS_VARS.textSecondary)};
      white-space: nowrap;
      line-height: 1.2;
    }

    /* Spodní řádek: hlavní hodnota */
    .tile-main {
      display: flex;
      align-items: baseline;
      gap: 3px;
      min-width: 0;
      overflow: hidden;
    }

    .tile-value {
      font-size: 19px;
      font-weight: 700;
      color: ${u(CSS_VARS.textPrimary)};
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .tile-unit {
      font-size: 11px;
      font-weight: 400;
      color: ${u(CSS_VARS.textSecondary)};
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* Edit actions */
    .edit-actions {
      position: absolute;
      top: 4px;
      right: 4px;
      display: flex;
      gap: 3px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    :host(:hover) .edit-actions {
      opacity: 1;
    }

    .edit-btn,
    .delete-btn {
      width: 18px;
      height: 18px;
      border: none;
      background: ${u(CSS_VARS.bgSecondary)};
      border-radius: 50%;
      font-size: 9px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
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

    const hasSupportValues = this.data.supportValues.topRight || this.data.supportValues.bottomRight;

    return html`
      ${color ? html`<style>:host { --tile-color: ${u(color)}; }</style>` : null}

      <div class="tile-top">
        <span class="tile-icon">${icon}</span>
        <span class="tile-label">${cfg.label || ''}</span>
        ${hasSupportValues ? html`
          <div class="support-values">
            ${this.data.supportValues.topRight ? html`
              <span class="support-value">${this.data.supportValues.topRight.value} ${this.data.supportValues.topRight.unit}</span>
            ` : null}
            ${this.data.supportValues.bottomRight ? html`
              <span class="support-value">${this.data.supportValues.bottomRight.value} ${this.data.supportValues.bottomRight.unit}</span>
            ` : null}
          </div>
        ` : null}
      </div>

      <div class="tile-main">
        <span class="tile-value">${this.data.value}</span>
        ${this.data.unit ? html`<span class="tile-unit">${this.data.unit}</span>` : null}
      </div>

      ${this.editMode ? html`
        <div class="edit-actions">
          <button class="edit-btn" @click=${this.onEdit}>⚙</button>
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
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }

    .empty-state {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      padding: 8px;
      text-align: center;
      opacity: 0.6;
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
