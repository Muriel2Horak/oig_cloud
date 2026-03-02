import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getCurrentBreakpoint, Breakpoint } from '@/ui/theme';
import { debounce } from '@/utils/dom';
import { oigLog } from '@/core/logger';

const STORAGE_KEY = 'oig_v2_theme';

export type ThemeMode = 'light' | 'dark' | 'auto';

@customElement('oig-theme-provider')
export class ThemeProvider extends LitElement {
  @property({ type: String }) mode: ThemeMode = 'auto';
  @state() private isDark = false;
  @state() private breakpoint: Breakpoint = 'desktop';
  @state() private width = 1280;

  private mediaQuery: MediaQueryList | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private debouncedResize = debounce(this.updateBreakpoint.bind(this), 100);

  static styles = css`
    :host {
      display: contents;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadTheme();
    this.setupMediaQuery();
    this.setupResizeObserver();
    this.detectTheme();
    
    window.addEventListener('oig-theme-change', this.onThemeChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    
    this.mediaQuery?.removeEventListener('change', this.onMediaChange);
    this.resizeObserver?.disconnect();
    window.removeEventListener('oig-theme-change', this.onThemeChange);
  }

  private loadTheme(): void {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (saved && ['light', 'dark', 'auto'].includes(saved)) {
      this.mode = saved;
    }
  }

  private saveTheme(): void {
    localStorage.setItem(STORAGE_KEY, this.mode);
  }

  private setupMediaQuery(): void {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', this.onMediaChange);
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(this.debouncedResize);
    this.resizeObserver.observe(document.documentElement);
    this.updateBreakpoint();
  }

  private onMediaChange = (e: MediaQueryListEvent): void => {
    if (this.mode === 'auto') {
      this.isDark = e.matches;
      this.dispatchEvent(new CustomEvent('theme-changed', { 
        detail: { isDark: this.isDark } 
      }));
    }
  };

  private onThemeChange = (): void => {
    this.detectTheme();
  };

  private updateBreakpoint(): void {
    this.width = window.innerWidth;
    this.breakpoint = getCurrentBreakpoint(this.width);
  }

  private detectTheme(): void {
    if (this.mode === 'auto') {
      this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      this.isDark = this.mode === 'dark';
    }
  }

  setTheme(mode: ThemeMode): void {
    this.mode = mode;
    this.saveTheme();
    this.detectTheme();
    
    this.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { mode, isDark: this.isDark }
    }));
    
    oigLog.info('Theme changed', { mode, isDark: this.isDark });
  }

  getThemeInfo() {
    return {
      mode: this.mode,
      isDark: this.isDark,
      breakpoint: this.breakpoint,
      width: this.width,
    };
  }

  render() {
    return html`
      <slot></slot>
    `;
  }
}

export function getThemeInfo(): { isDark: boolean; breakpoint: Breakpoint } {
  const provider = document.querySelector('oig-theme-provider') as ThemeProvider;
  if (provider) {
    const info = provider.getThemeInfo();
    return { isDark: info.isDark, breakpoint: info.breakpoint };
  }
  return { isDark: false, breakpoint: 'desktop' };
}

export function setTheme(mode: ThemeMode): void {
  const provider = document.querySelector('oig-theme-provider') as ThemeProvider;
  provider?.setTheme(mode);
}
