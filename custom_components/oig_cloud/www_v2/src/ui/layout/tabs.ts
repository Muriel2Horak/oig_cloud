import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
}

@customElement('oig-tabs')
export class OigTabs extends LitElement {
  @property({ type: Array }) tabs: Tab[] = [];
  @property({ type: String }) activeTab = '';

  static styles = css`
    :host {
      display: flex;
      gap: 8px;
      padding: 0 16px;
      background: ${unsafeCSS(CSS_VARS.bgPrimary)};
      border-bottom: 1px solid ${unsafeCSS(CSS_VARS.divider)};
    }

    .tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 12px 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: ${unsafeCSS(CSS_VARS.textSecondary)};
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab:hover {
      color: ${unsafeCSS(CSS_VARS.textPrimary)};
      background: ${unsafeCSS(CSS_VARS.bgSecondary)};
    }

    .tab.active {
      color: ${unsafeCSS(CSS_VARS.accent)};
      border-bottom-color: ${unsafeCSS(CSS_VARS.accent)};
    }

    .tab-icon {
      font-size: 16px;
    }

    @media (max-width: 768px) {
      :host {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .tab {
        padding: 10px 12px;
        font-size: 13px;
      }

      .tab-icon {
        display: none;
      }
    }
  `;

  private onTabClick(tabId: string): void {
    if (tabId !== this.activeTab) {
      this.activeTab = tabId;
      this.dispatchEvent(new CustomEvent('tab-change', {
        detail: { tabId },
        bubbles: true,
      }));
    }
  }

  isActive(tabId: string): boolean {
    return this.activeTab === tabId;
  }

  render() {
    return html`
      ${this.tabs.map(tab => html`
        <button 
          class="tab ${this.isActive(tab.id) ? 'active' : ''}"
          @click=${() => this.onTabClick(tab.id)}
        >
          ${tab.icon ? html`<span class="tab-icon">${tab.icon}</span>` : null}
          <span>${tab.label}</span>
        </button>
      `)}
    `;
  }
}
