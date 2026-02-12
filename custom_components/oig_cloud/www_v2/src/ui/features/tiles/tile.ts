import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { TileData } from './types';

const u = unsafeCSS;

@customElement('oig-tile')
export class OigTile extends LitElement {
  @property({ type: Object }) data: TileData | null = null;
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
      detail: { id: this.data?.id },
      bubbles: true,
    }));
  }

  private onDelete(): void {
    this.dispatchEvent(new CustomEvent('delete-tile', {
      detail: { id: this.data?.id },
      bubbles: true,
    }));
  }

  private formatValue(): string {
    if (!this.data) return '-';
    
    const value = this.data.value;
    const unit = this.data.config.unit || '';
    const decimals = this.data.config.decimals ?? 0;

    if (typeof value === 'number') {
      const formatted = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
      return unit ? `${formatted} ${unit}` : formatted;
    }
    
    return String(value);
  }

  render() {
    return html`
      <span class="tile-icon">${this.data?.config.icon || '📊'}</span>
      <span class="tile-value">${this.formatValue()}</span>
      <span class="tile-label">${this.data?.config.label || ''}</span>
      
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
  @property({ type: Array }) tiles: TileData[] = [];
  @property({ type: Boolean }) editMode = false;
  @property({ type: String }) position: 'left' | 'right' = 'left';

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
