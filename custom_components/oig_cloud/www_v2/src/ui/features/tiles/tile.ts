import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { getIconEmoji } from '@/utils/format';
import type { ResolvedTile } from './types';
import { haClient } from '@/data/ha-client';
import { executeTileAction } from '@/data/tiles-data';

const u = unsafeCSS;

@customElement('oig-tile')
export class OigTile extends LitElement {
  @property({ type: Object }) data: ResolvedTile | null = null;
  @property({ type: Boolean }) editMode = false;
  /** Reflected to DOM for CSS selectors: 'entity' | 'button' */
  @property({ type: String, reflect: true }) tileType: 'entity' | 'button' = 'entity';

  static styles = css`
    /* ===== BASE ===== */
    :host {
      display: flex;
      flex-direction: column;
      padding: 10px 12px;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 10px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
      min-width: 0;
      position: relative;
      transition: opacity 0.2s, transform 0.15s, box-shadow 0.15s;
      overflow: hidden;
      box-sizing: border-box;
      border: 1px solid transparent;
    }

    /* Barevný pruh vlevo (entity tiles) */
    :host([tiletype="entity"])::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--tile-color, transparent);
      border-radius: 10px 0 0 10px;
    }

    /* ===== ENTITY TILE HOVER ===== */
    :host([tiletype="entity"]:not([editmode]):hover) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.16);
      cursor: pointer;
    }

    :host([tiletype="entity"]:not([editmode]):active) {
      transform: translateY(0);
      opacity: 0.82;
    }

    /* Hint ikona — ukazuje, že klik otevírá entity detail */
    :host([tiletype="entity"]:not([editmode]):hover)::after {
      content: 'ℹ';
      position: absolute;
      bottom: 5px;
      right: 7px;
      font-size: 9px;
      color: ${u(CSS_VARS.textSecondary)};
      opacity: 0.45;
      font-style: normal;
    }

    /* ===== BUTTON TILE ===== */
    :host([tiletype="button"]) {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--tile-color, ${u(CSS_VARS.accent)}) 10%, ${u(CSS_VARS.cardBg)}),
        ${u(CSS_VARS.cardBg)}
      );
      border: 1px solid color-mix(in srgb, var(--tile-color, ${u(CSS_VARS.accent)}) 38%, transparent);
    }

    :host([tiletype="button"]:not([editmode]):hover) {
      transform: translateY(-2px);
      cursor: pointer;
      box-shadow:
        0 4px 14px color-mix(in srgb, var(--tile-color, ${u(CSS_VARS.accent)}) 28%, transparent),
        ${u(CSS_VARS.cardShadow)};
    }

    :host([tiletype="button"]:not([editmode]):active) {
      transform: translateY(0) scale(0.98);
      opacity: 0.85;
    }

    :host([tiletype="button"]) .tile-icon {
      background: color-mix(in srgb, var(--tile-color, ${u(CSS_VARS.accent)}) 18%, transparent);
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    :host([tiletype="button"]) .tile-label {
      font-weight: 600;
      letter-spacing: 0.1px;
    }

    /* Edit mode hover */
    :host([editmode]:hover) {
      transform: translateY(-1px);
    }

    /* Inactive / zero value */
    :host(.inactive) {
      opacity: 0.45;
    }

    /* ===== HEADER ROW ===== */
    .tile-top {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      margin-bottom: 3px;
    }

    .tile-icon {
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
      width: 24px;
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
      letter-spacing: 0.2px;
    }

    /* Support values (top-right, bottom-right) */
    .support-values {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      flex-shrink: 0;
    }

    .support-value {
      font-size: 11px;
      font-weight: 500;
      color: ${u(CSS_VARS.textSecondary)};
      white-space: nowrap;
      line-height: 1.2;
    }

    .support-value.clickable {
      cursor: pointer;
    }

    .support-value.clickable:hover {
      text-decoration: underline;
      color: ${u(CSS_VARS.textPrimary)};
    }

    /* ===== VALUE ROW ===== */
    .tile-main {
      display: flex;
      align-items: baseline;
      gap: 3px;
      min-width: 0;
      overflow: hidden;
      margin-top: 1px;
    }

    .tile-value {
      font-size: 20px;
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

    /* State dot for button tiles */
    .state-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-left: 4px;
      flex-shrink: 0;
      align-self: center;
      margin-bottom: 2px;
    }

    .state-dot.on {
      background: ${u(CSS_VARS.success)};
      box-shadow: 0 0 4px ${u(CSS_VARS.success)};
    }

    .state-dot.off {
      background: ${u(CSS_VARS.textSecondary)};
      opacity: 0.5;
    }

    /* ===== EDIT ACTIONS ===== */
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

  private onTileClick(): void {
    if (this.editMode) return;
    const cfg = this.data?.config;
    if (!cfg) return;

    if (cfg.type === 'button' && cfg.action) {
      executeTileAction(cfg.entity_id, cfg.action);
    } else {
      haClient.openEntityDialog(cfg.entity_id);
    }
  }

  private onSupportClick(e: Event, entityId: string): void {
    e.stopPropagation();
    if (this.editMode) return;
    haClient.openEntityDialog(entityId);
  }

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
    const isButton = cfg.type === 'button';

    // Keep tileType in sync with config
    if (this.tileType !== cfg.type) {
      this.tileType = cfg.type ?? 'entity';
    }

    const color = cfg.color || '';
    const rawIcon = cfg.icon || (isButton ? '⚡' : '📊');
    const icon = rawIcon.startsWith('mdi:') ? getIconEmoji(rawIcon) : rawIcon;

    const topRightEntityId = cfg.support_entities?.top_right;
    const bottomRightEntityId = cfg.support_entities?.bottom_right;
    const hasSupportValues = this.data.supportValues.topRight || this.data.supportValues.bottomRight;

    return html`
      ${color ? html`<style>:host { --tile-color: ${u(color)}; }</style>` : null}

      <div class="tile-top" @click=${this.onTileClick} title=${!this.editMode ? cfg.entity_id : ''}>
        <span class="tile-icon">${icon}</span>
        <span class="tile-label">${cfg.label || ''}</span>
        ${hasSupportValues ? html`
          <div class="support-values">
            ${this.data.supportValues.topRight ? html`
              <span
                class="support-value ${topRightEntityId && !this.editMode ? 'clickable' : ''}"
                @click=${topRightEntityId && !this.editMode
                  ? (e: Event) => this.onSupportClick(e, topRightEntityId)
                  : null}
              >${this.data.supportValues.topRight.value} ${this.data.supportValues.topRight.unit}</span>
            ` : null}
            ${this.data.supportValues.bottomRight ? html`
              <span
                class="support-value ${bottomRightEntityId && !this.editMode ? 'clickable' : ''}"
                @click=${bottomRightEntityId && !this.editMode
                  ? (e: Event) => this.onSupportClick(e, bottomRightEntityId)
                  : null}
              >${this.data.supportValues.bottomRight.value} ${this.data.supportValues.bottomRight.unit}</span>
            ` : null}
          </div>
        ` : null}
      </div>

      <div class="tile-main" @click=${this.onTileClick}>
        <span class="tile-value">${this.data.value}</span>
        ${this.data.unit ? html`<span class="tile-unit">${this.data.unit}</span>` : null}
        ${isButton ? html`
          <span class="state-dot ${this.data.isActive ? 'on' : 'off'}"></span>
        ` : null}
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
          .tileType=${tile.config.type ?? 'entity'}
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
