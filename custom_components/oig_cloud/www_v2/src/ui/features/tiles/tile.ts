import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
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
      align-items: center;
      padding: 12px 16px;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
      min-width: 80px;
      position: relative;
      transition: opacity 0.2s;
    }

    :host(.inactive) {
      opacity: 0.5;
    }

    .tile-icon {
      font-size: 24px;
      margin-bottom: 4px;
    }

    .tile-value {
      font-size: 18px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .tile-label {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-top: 2px;
    }

    .support-values {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      margin-top: 4px;
    }

    .support-value {
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
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
    }));
  }

  private onDelete(): void {
    this.dispatchEvent(new CustomEvent('delete-tile', {
      detail: { entityId: this.data?.config.entity_id },
      bubbles: true,
    }));
  }

  render() {
    if (!this.data) return null;

    const cfg = this.data.config;
    const color = cfg.color || '';
    const icon = cfg.icon || '📊';

    return html`
      ${color ? html`<style>:host { border-left: 3px solid ${u(color)}; }</style>` : null}
      <span class="tile-icon">${icon}</span>
      <span class="tile-value">${this.data.formattedValue}</span>
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
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    :host([position='right']) {
      align-items: flex-end;
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
