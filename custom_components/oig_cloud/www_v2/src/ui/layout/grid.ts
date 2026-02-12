import { LitElement, html, css, unsafeCSS, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS, Breakpoint, getCurrentBreakpoint } from '@/ui/theme';
import { debounce } from '@/utils/dom';

const STORAGE_KEY_PREFIX = 'oig_v2_layout_';
const u = unsafeCSS;

@customElement('oig-grid')
export class OigGrid extends LitElement {
  @property({ type: Boolean }) editable = false;
  @state() private breakpoint: Breakpoint = 'desktop';

  static styles = css`
    :host {
      display: grid;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      background: ${u(CSS_VARS.bgSecondary)};
    }

    :host([breakpoint='mobile']) { grid-template-columns: 1fr; }
    :host([breakpoint='tablet']) { grid-template-columns: repeat(2, 1fr); }
    :host([breakpoint='desktop']) { grid-template-columns: repeat(3, 1fr); }

    .grid-item {
      position: relative;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 8px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .grid-item.editable { cursor: move; }
    .grid-item.editable:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .grid-item.dragging { opacity: 0.8; transform: scale(1.02); z-index: 100; }

    @media (max-width: 768px) {
      :host { gap: 12px; padding: 12px; }
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('resize', this.onResize);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.onResize);
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has('breakpoint')) {
      this.setAttribute('breakpoint', this.breakpoint);
    }
  }

  private onResize = debounce((): void => {
    this.breakpoint = getCurrentBreakpoint(window.innerWidth);
  }, 100);

  resetLayout(): void {
    const key = `${STORAGE_KEY_PREFIX}${this.breakpoint}`;
    localStorage.removeItem(key);
    this.requestUpdate();
  }

  render() {
    return html`<slot></slot>`;
  }
}

export function resetLayout(breakpoint: Breakpoint): void {
  const key = `${STORAGE_KEY_PREFIX}${breakpoint}`;
  localStorage.removeItem(key);
}
